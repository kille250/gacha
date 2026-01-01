/**
 * useEssenceTap - Custom hook for Essence Tap clicker game state and logic
 *
 * Manages the clicker game state, click processing, passive income calculation,
 * and API synchronization.
 */

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

// Constants
const COMBO_DECAY_TIME = 1000; // ms before combo resets
const MAX_COMBO_MULTIPLIER = 2.0;
const COMBO_GROWTH_RATE = 0.1;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const PASSIVE_TICK_RATE = 100; // ms between passive ticks

/**
 * Format large numbers with suffixes (K, M, B, T, etc.)
 */
export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum < 1000) return sign + Math.floor(absNum).toLocaleString();
  if (absNum < 1000000) return sign + (absNum / 1000).toFixed(1) + 'K';
  if (absNum < 1000000000) return sign + (absNum / 1000000).toFixed(2) + 'M';
  if (absNum < 1000000000000) return sign + (absNum / 1000000000).toFixed(2) + 'B';
  if (absNum < 1000000000000000) return sign + (absNum / 1000000000000).toFixed(2) + 'T';
  return sign + (absNum / 1000000000000000).toFixed(2) + 'Qa';
}

/**
 * Format essence per second with appropriate suffix
 */
export function formatPerSecond(num) {
  if (num === 0) return '+0/sec';
  return '+' + formatNumber(num) + '/sec';
}

export const useEssenceTap = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useContext(AuthContext);
  const toast = useToast();

  // Core state
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local state for smooth UI updates
  const [localEssence, setLocalEssence] = useState(0);
  const [localLifetimeEssence, setLocalLifetimeEssence] = useState(0);

  // Combo state
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboTimeoutRef = useRef(null);

  // Click feedback
  const [lastClickResult, setLastClickResult] = useState(null);
  const [clicksThisSecond, setClicksThisSecond] = useState(0);

  // Offline progress modal
  const [offlineProgress, setOfflineProgress] = useState(null);

  // Auto-save tracking
  const lastSaveRef = useRef(Date.now());
  const pendingEssenceRef = useRef(0);

  // Refs for intervals
  const passiveTickRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      if (passiveTickRef.current) clearInterval(passiveTickRef.current);
    };
  }, []);

  // Fetch initial game state
  const fetchGameState = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/essence-tap/status');

      if (!isMountedRef.current) return;

      setGameState(response.data);
      setLocalEssence(response.data.essence || 0);
      setLocalLifetimeEssence(response.data.lifetimeEssence || 0);

      // Show offline progress modal if applicable
      if (response.data.offlineProgress && response.data.offlineProgress.essenceEarned > 0) {
        setOfflineProgress(response.data.offlineProgress);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch essence tap status:', err);
      if (isMountedRef.current) {
        setError(err.response?.data?.error || t('essenceTap.failedToLoad', { defaultValue: 'Failed to load game' }));
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [t]);

  // Initial fetch
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Passive income tick
  useEffect(() => {
    if (!gameState || gameState.productionPerSecond <= 0) {
      if (passiveTickRef.current) {
        clearInterval(passiveTickRef.current);
        passiveTickRef.current = null;
      }
      return;
    }

    const essencePerTick = (gameState.productionPerSecond * PASSIVE_TICK_RATE) / 1000;

    passiveTickRef.current = setInterval(() => {
      setLocalEssence(prev => prev + essencePerTick);
      setLocalLifetimeEssence(prev => prev + essencePerTick);
      pendingEssenceRef.current += essencePerTick;
    }, PASSIVE_TICK_RATE);

    return () => {
      if (passiveTickRef.current) {
        clearInterval(passiveTickRef.current);
        passiveTickRef.current = null;
      }
    };
  }, [gameState?.productionPerSecond]);

  // Auto-save
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      if (pendingEssenceRef.current > 0) {
        try {
          await api.post('/essence-tap/save', {
            essence: Math.floor(localEssence),
            lifetimeEssence: Math.floor(localLifetimeEssence)
          });
          pendingEssenceRef.current = 0;
          lastSaveRef.current = Date.now();
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(saveInterval);
  }, [localEssence, localLifetimeEssence]);

  // Handle click
  const handleClick = useCallback(async () => {
    if (!gameState) return;

    // Rate limit clicks
    if (clicksThisSecond >= 20) return;
    setClicksThisSecond(prev => prev + 1);
    setTimeout(() => setClicksThisSecond(prev => Math.max(0, prev - 1)), 1000);

    // Reset combo timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    // Update combo
    setComboMultiplier(prev => Math.min(prev + COMBO_GROWTH_RATE, MAX_COMBO_MULTIPLIER));

    // Set decay timeout
    comboTimeoutRef.current = setTimeout(() => {
      setComboMultiplier(1);
    }, COMBO_DECAY_TIME);

    // Calculate local click result (optimistic)
    const clickPower = gameState.clickPower || 1;
    const critChance = gameState.critChance || 0.01;
    const critMultiplier = gameState.critMultiplier || 10;

    const isCrit = Math.random() < critChance;
    const isGolden = Math.random() < 0.001;

    let essenceGained = Math.floor(clickPower * comboMultiplier);
    if (isCrit) essenceGained = Math.floor(essenceGained * critMultiplier);
    if (isGolden) essenceGained = Math.floor(essenceGained * 100);

    // Optimistic update
    setLocalEssence(prev => prev + essenceGained);
    setLocalLifetimeEssence(prev => prev + essenceGained);

    // Set click result for visual feedback
    setLastClickResult({
      essenceGained,
      isCrit,
      isGolden,
      comboMultiplier,
      timestamp: Date.now()
    });

    // Clear click result after animation
    setTimeout(() => {
      setLastClickResult(prev =>
        prev?.timestamp === lastClickResult?.timestamp ? null : prev
      );
    }, 500);

    // Sync with server (batched)
    try {
      const response = await api.post('/essence-tap/click', {
        count: 1,
        comboMultiplier
      });

      if (!isMountedRef.current) return;

      // Update with server values
      setLocalEssence(response.data.essence);
      setLocalLifetimeEssence(response.data.lifetimeEssence);

      // Handle completed challenges
      if (response.data.completedChallenges?.length > 0) {
        response.data.completedChallenges.forEach(challenge => {
          toast.success(
            t('essenceTap.challengeComplete', { name: challenge.name, defaultValue: `Challenge Complete: ${challenge.name}!` })
          );
        });
      }
    } catch (err) {
      console.error('Click sync failed:', err);
    }
  }, [gameState, comboMultiplier, clicksThisSecond, lastClickResult, t, toast]);

  // Purchase generator
  const purchaseGenerator = useCallback(async (generatorId, count = 1) => {
    if (!gameState) return { success: false };

    try {
      const response = await api.post('/essence-tap/generator/buy', {
        generatorId,
        count
      });

      if (!isMountedRef.current) return { success: false };

      // Update local essence
      setLocalEssence(response.data.essence);

      // Refresh full state to get updated generators
      await fetchGameState();

      toast.success(
        t('essenceTap.generatorPurchased', {
          name: response.data.generator.name,
          count: response.data.newCount,
          defaultValue: `Purchased ${response.data.generator.name}!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to purchase generator:', err);
      toast.error(err.response?.data?.error || t('essenceTap.purchaseFailed', { defaultValue: 'Purchase failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [gameState, fetchGameState, t, toast]);

  // Purchase upgrade
  const purchaseUpgrade = useCallback(async (upgradeId) => {
    if (!gameState) return { success: false };

    try {
      const response = await api.post('/essence-tap/upgrade/buy', {
        upgradeId
      });

      if (!isMountedRef.current) return { success: false };

      setLocalEssence(response.data.essence);
      await fetchGameState();

      toast.success(
        t('essenceTap.upgradePurchased', {
          name: response.data.upgrade.name,
          defaultValue: `Purchased ${response.data.upgrade.name}!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to purchase upgrade:', err);
      toast.error(err.response?.data?.error || t('essenceTap.purchaseFailed', { defaultValue: 'Purchase failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [gameState, fetchGameState, t, toast]);

  // Perform prestige
  const performPrestige = useCallback(async () => {
    if (!gameState?.prestige?.canPrestige) return { success: false };

    try {
      const response = await api.post('/essence-tap/prestige');

      if (!isMountedRef.current) return { success: false };

      await fetchGameState();
      await refreshUser();

      toast.success(
        t('essenceTap.prestigeComplete', {
          shards: response.data.shardsEarned,
          level: response.data.prestigeLevel,
          defaultValue: `Awakening complete! Earned ${response.data.shardsEarned} shards.`
        })
      );

      if (response.data.fatePointsReward > 0) {
        toast.info(
          t('essenceTap.fatePointsEarned', {
            points: response.data.fatePointsReward,
            defaultValue: `+${response.data.fatePointsReward} Fate Points!`
          })
        );
      }

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to prestige:', err);
      toast.error(err.response?.data?.error || t('essenceTap.prestigeFailed', { defaultValue: 'Prestige failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [gameState, fetchGameState, refreshUser, t, toast]);

  // Purchase prestige upgrade
  const purchasePrestigeUpgrade = useCallback(async (upgradeId) => {
    try {
      const response = await api.post('/essence-tap/prestige/upgrade', {
        upgradeId
      });

      if (!isMountedRef.current) return { success: false };

      await fetchGameState();

      toast.success(
        t('essenceTap.prestigeUpgradePurchased', {
          name: response.data.upgrade.name,
          level: response.data.newLevel,
          defaultValue: `${response.data.upgrade.name} upgraded to level ${response.data.newLevel}!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to purchase prestige upgrade:', err);
      toast.error(err.response?.data?.error || t('essenceTap.purchaseFailed', { defaultValue: 'Purchase failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast]);

  // Claim milestone
  const claimMilestone = useCallback(async (milestoneKey) => {
    try {
      const response = await api.post('/essence-tap/milestone/claim', {
        milestoneKey
      });

      if (!isMountedRef.current) return { success: false };

      await fetchGameState();
      await refreshUser();

      toast.success(
        t('essenceTap.milestoneClaimed', {
          points: response.data.fatePoints,
          defaultValue: `Milestone claimed! +${response.data.fatePoints} Fate Points!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to claim milestone:', err);
      toast.error(err.response?.data?.error || t('essenceTap.claimFailed', { defaultValue: 'Claim failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, refreshUser, t, toast]);

  // Assign character
  const assignCharacter = useCallback(async (characterId) => {
    try {
      const response = await api.post('/essence-tap/character/assign', {
        characterId
      });

      if (!isMountedRef.current) return { success: false };

      await fetchGameState();

      toast.success(t('essenceTap.characterAssigned', { defaultValue: 'Character assigned!' }));

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to assign character:', err);
      toast.error(err.response?.data?.error || t('essenceTap.assignFailed', { defaultValue: 'Failed to assign' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast]);

  // Unassign character
  const unassignCharacter = useCallback(async (characterId) => {
    try {
      const response = await api.post('/essence-tap/character/unassign', {
        characterId
      });

      if (!isMountedRef.current) return { success: false };

      await fetchGameState();

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to unassign character:', err);
      toast.error(err.response?.data?.error || t('essenceTap.unassignFailed', { defaultValue: 'Failed to unassign' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast]);

  // Dismiss offline progress modal
  const dismissOfflineProgress = useCallback(() => {
    setOfflineProgress(null);
  }, []);

  return {
    // State
    gameState,
    loading,
    error,

    // Local essence (smoothly updated)
    essence: localEssence,
    lifetimeEssence: localLifetimeEssence,

    // Combo
    comboMultiplier,

    // Click feedback
    lastClickResult,

    // Offline progress
    offlineProgress,
    dismissOfflineProgress,

    // Actions
    handleClick,
    purchaseGenerator,
    purchaseUpgrade,
    performPrestige,
    purchasePrestigeUpgrade,
    claimMilestone,
    assignCharacter,
    unassignCharacter,

    // Refresh
    refresh: fetchGameState,

    // Utilities
    formatNumber,
    formatPerSecond
  };
};

export default useEssenceTap;
