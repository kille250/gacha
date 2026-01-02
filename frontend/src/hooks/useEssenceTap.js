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
import { invalidateFor, CACHE_ACTIONS } from '../cache/manager';
import {
  COMBO_CONFIG,
  GOLDEN_CONFIG,
  UI_TIMING,
  ACHIEVEMENTS
} from '../config/essenceTapConfig';
import { useSoundEffects } from './useSoundEffects';

// Re-export config for convenience
export { COMBO_CONFIG, GOLDEN_CONFIG } from '../config/essenceTapConfig';

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
  const { refreshUser } = useContext(AuthContext);
  const toast = useToast();

  // Sound effects
  const sounds = useSoundEffects();

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

  // Achievement state
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);
  const achievementTrackingRef = useRef({
    totalClicks: 0,
    totalCrits: 0,
    totalGolden: 0,
    maxCombo: 0,
    critStreak: 0,
    maxCritStreak: 0,
    totalGenerators: 0,
    prestigeLevel: 0,
    assignedCharacters: 0,
    bossesDefeated: [],
    // Track which achievements have been shown to prevent re-triggering
    shownAchievements: new Set()
  });

  // Auto-save tracking
  const lastSaveRef = useRef(Date.now());
  const pendingEssenceRef = useRef(0);
  const localEssenceRef = useRef(0);
  const localLifetimeEssenceRef = useRef(0);
  // Track last sync time for accurate time-based calculation
  const lastSyncTimeRef = useRef(Date.now());
  const lastSyncEssenceRef = useRef(0);

  // Refs for intervals
  const passiveTickRef = useRef(null);
  const isMountedRef = useRef(true);

  // Check and trigger achievements
  const checkAchievements = useCallback((stats) => {
    const tracking = achievementTrackingRef.current;
    const shown = tracking.shownAchievements;

    // Helper to unlock achievement - only shows if not already shown
    const unlock = (achievementId) => {
      if (!shown.has(achievementId) && ACHIEVEMENTS[achievementId]) {
        shown.add(achievementId);
        setUnlockedAchievement({
          id: achievementId,
          ...ACHIEVEMENTS[achievementId],
          timestamp: Date.now()
        });
        sounds.playMilestone();
        return true;
      }
      return false;
    };

    // Check click-based achievements
    if (stats.totalClicks >= 1) unlock('firstClick');
    if (stats.totalClicks >= 1000) unlock('thousandClicks');
    if (stats.totalClicks >= 10000) unlock('tenThousandClicks');

    // Check golden essence achievements
    if (stats.totalGolden >= 1) unlock('firstGolden');
    if (stats.totalGolden >= 100) unlock('hundredGolden');

    // Check combo achievements
    if (stats.maxCombo >= 100) unlock('comboMaster');

    // Check crit streak achievements
    if (stats.maxCritStreak >= 10) unlock('critStreak');

    // Update tracking stats (shownAchievements is already updated via reference)
    achievementTrackingRef.current = { ...tracking, ...stats, shownAchievements: shown };
  }, [sounds]);

  // Dismiss achievement toast
  const dismissAchievement = useCallback(() => {
    setUnlockedAchievement(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      if (passiveTickRef.current) clearInterval(passiveTickRef.current);
    };
  }, []);

  // Fetch initial game state
  const fetchGameState = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/essence-tap/status');

      if (!isMountedRef.current) return;

      setGameState(response.data);
      const essenceVal = response.data.essence || 0;
      const lifetimeVal = response.data.lifetimeEssence || 0;
      setLocalEssence(essenceVal);
      setLocalLifetimeEssence(lifetimeVal);
      localEssenceRef.current = essenceVal;
      localLifetimeEssenceRef.current = lifetimeVal;
      // Reset sync tracking on full state fetch
      lastSyncTimeRef.current = Date.now();
      lastSyncEssenceRef.current = essenceVal;
      pendingEssenceRef.current = 0;

      // Initialize achievement tracking from backend state to prevent re-triggering
      // achievements that should have already been earned
      if (showLoading) {
        const totalClicks = response.data.totalClicks || 0;
        const totalGolden = response.data.stats?.goldenEssenceClicks || 0;
        const totalGenerators = Object.values(response.data.generators || {}).reduce((a, b) => a + b, 0);
        const prestigeLevel = response.data.prestige?.level || 0;

        // Pre-populate shownAchievements based on current stats
        // This prevents showing achievements the user has already earned
        const shownAchievements = new Set();
        if (totalClicks >= 1) shownAchievements.add('firstClick');
        if (totalClicks >= 1000) shownAchievements.add('thousandClicks');
        if (totalClicks >= 10000) shownAchievements.add('tenThousandClicks');
        if (totalGolden >= 1) shownAchievements.add('firstGolden');
        if (totalGolden >= 100) shownAchievements.add('hundredGolden');
        if (totalGenerators >= 1) shownAchievements.add('firstGenerator');
        if (prestigeLevel >= 1) shownAchievements.add('firstPrestige');

        achievementTrackingRef.current = {
          totalClicks,
          totalCrits: response.data.totalCrits || 0,
          totalGolden,
          maxCombo: achievementTrackingRef.current.maxCombo || 0,
          critStreak: 0,
          maxCritStreak: achievementTrackingRef.current.maxCritStreak || 0,
          totalGenerators,
          prestigeLevel,
          assignedCharacters: response.data.assignedCharacters?.length || 0,
          bossesDefeated: response.data.bossEncounter?.totalDefeated || 0,
          shownAchievements
        };
      }

      // Show offline progress modal if applicable (only on initial load)
      if (showLoading && response.data.offlineProgress && response.data.offlineProgress.essenceEarned > 0) {
        setOfflineProgress(response.data.offlineProgress);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch essence tap status:', err);
      if (isMountedRef.current) {
        setError(err.response?.data?.error || t('essenceTap.failedToLoad', { defaultValue: 'Failed to load game' }));
      }
    } finally {
      if (isMountedRef.current && showLoading) setLoading(false);
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

    const essencePerTick = (gameState.productionPerSecond * UI_TIMING.passiveTickRate) / 1000;

    passiveTickRef.current = setInterval(() => {
      setLocalEssence(prev => {
        const newVal = prev + essencePerTick;
        localEssenceRef.current = newVal;
        return newVal;
      });
      setLocalLifetimeEssence(prev => {
        const newVal = prev + essencePerTick;
        localLifetimeEssenceRef.current = newVal;
        return newVal;
      });
      pendingEssenceRef.current += essencePerTick;
    }, UI_TIMING.passiveTickRate);

    return () => {
      if (passiveTickRef.current) {
        clearInterval(passiveTickRef.current);
        passiveTickRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run when production rate changes, not all gameState changes
  }, [gameState?.productionPerSecond]);

  // Auto-save (runs every 30 seconds, uses refs to avoid dependency issues)
  // IMPORTANT: Backend is the source of truth for essence calculations.
  // Frontend predictions are for smooth UI only; we always reconcile with backend values.
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      if (pendingEssenceRef.current > 0) {
        try {
          const response = await api.post('/essence-tap/save', {
            // Note: Backend ignores these values and recalculates from production rate
            // We send them for logging/debugging purposes only
            essence: Math.floor(localEssenceRef.current),
            lifetimeEssence: Math.floor(localLifetimeEssenceRef.current)
          });

          // CRITICAL: Reconcile with backend's authoritative values
          // This ensures frontend stays in sync even if predictions drifted
          if (response.data.essence !== undefined) {
            setLocalEssence(response.data.essence);
            localEssenceRef.current = response.data.essence;
            lastSyncEssenceRef.current = response.data.essence;
          }
          if (response.data.lifetimeEssence !== undefined) {
            setLocalLifetimeEssence(response.data.lifetimeEssence);
            localLifetimeEssenceRef.current = response.data.lifetimeEssence;
          }

          pendingEssenceRef.current = 0;
          lastSaveRef.current = Date.now();
          lastSyncTimeRef.current = Date.now();
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }
    }, UI_TIMING.autoSaveInterval);

    return () => clearInterval(saveInterval);
  }, []);

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
    setComboMultiplier(prev => Math.min(prev + COMBO_CONFIG.growthRate, COMBO_CONFIG.maxMultiplier));

    // Set decay timeout
    comboTimeoutRef.current = setTimeout(() => {
      setComboMultiplier(1);
    }, COMBO_CONFIG.decayTime);

    // Calculate local click result (optimistic)
    const clickPower = gameState.clickPower || 1;
    const critChance = gameState.critChance || 0.01;
    const critMultiplier = gameState.critMultiplier || 10;

    const isCrit = Math.random() < critChance;
    const isGolden = Math.random() < GOLDEN_CONFIG.chance;

    let essenceGained = Math.floor(clickPower * comboMultiplier);
    if (isCrit) essenceGained = Math.floor(essenceGained * critMultiplier);
    if (isGolden) essenceGained = Math.floor(essenceGained * GOLDEN_CONFIG.multiplier);

    // Play sound effect based on click type
    sounds.playClick(isCrit, isGolden);

    // Track for achievements
    const tracking = achievementTrackingRef.current;
    const newTotalClicks = tracking.totalClicks + 1;
    const newTotalGolden = isGolden ? tracking.totalGolden + 1 : tracking.totalGolden;
    const newCritStreak = isCrit ? tracking.critStreak + 1 : 0;
    const newMaxCritStreak = Math.max(tracking.maxCritStreak, newCritStreak);
    const newMaxCombo = Math.max(tracking.maxCombo, Math.floor(comboMultiplier * 10)); // Combo as hit count

    checkAchievements({
      totalClicks: newTotalClicks,
      totalGolden: newTotalGolden,
      critStreak: newCritStreak,
      maxCritStreak: newMaxCritStreak,
      maxCombo: newMaxCombo
    });

    // Optimistic update
    setLocalEssence(prev => {
      const newVal = prev + essenceGained;
      localEssenceRef.current = newVal;
      return newVal;
    });
    setLocalLifetimeEssence(prev => {
      const newVal = prev + essenceGained;
      localLifetimeEssenceRef.current = newVal;
      return newVal;
    });

    // Set click result for visual feedback
    const clickTimestamp = Date.now();
    setLastClickResult({
      essenceGained,
      isCrit,
      isGolden,
      comboMultiplier,
      timestamp: clickTimestamp
    });

    // Clear click result after animation (using the captured timestamp)
    setTimeout(() => {
      setLastClickResult(prev =>
        prev?.timestamp === clickTimestamp ? null : prev
      );
    }, 500);

    // Sync with server (batched)
    try {
      const response = await api.post('/essence-tap/click', {
        count: 1,
        comboMultiplier
      });

      if (!isMountedRef.current) return;

      // Update with server values (backend is source of truth)
      setLocalEssence(response.data.essence);
      setLocalLifetimeEssence(response.data.lifetimeEssence);
      localEssenceRef.current = response.data.essence;
      localLifetimeEssenceRef.current = response.data.lifetimeEssence;
      lastSyncEssenceRef.current = response.data.essence;
      lastSyncTimeRef.current = Date.now();
      // Note: We don't reset pendingEssenceRef here because passive essence
      // may have accumulated since our last save

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
  }, [gameState, comboMultiplier, clicksThisSecond, t, toast, sounds, checkAchievements]);

  // Purchase generator
  const purchaseGenerator = useCallback(async (generatorId, count = 1) => {
    if (!gameState) return { success: false };

    try {
      const response = await api.post('/essence-tap/generator/buy', {
        generatorId,
        count
      });

      if (!isMountedRef.current) return { success: false };

      // Play purchase sound
      sounds.playPurchase();

      // Update local essence
      setLocalEssence(response.data.essence);
      localEssenceRef.current = response.data.essence;

      // Check for first generator achievement
      const tracking = achievementTrackingRef.current;
      if (tracking.totalGenerators === 0) {
        checkAchievements({
          ...tracking,
          totalGenerators: 1
        });
      }

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_GENERATOR_PURCHASE);
      await fetchGameState(false);

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
  }, [gameState, fetchGameState, t, toast, sounds, checkAchievements]);

  // Purchase upgrade
  const purchaseUpgrade = useCallback(async (upgradeId) => {
    if (!gameState) return { success: false };

    try {
      const response = await api.post('/essence-tap/upgrade/buy', {
        upgradeId
      });

      if (!isMountedRef.current) return { success: false };

      setLocalEssence(response.data.essence);
      localEssenceRef.current = response.data.essence;

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_UPGRADE_PURCHASE);
      await fetchGameState(false);

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

      // Play prestige sound
      sounds.playPrestige();

      // Check for first prestige achievement
      const tracking = achievementTrackingRef.current;
      const newPrestigeLevel = response.data.prestigeLevel || 1;
      checkAchievements({
        ...tracking,
        prestigeLevel: newPrestigeLevel
      });

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_PRESTIGE);
      await fetchGameState(false);
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
  }, [gameState, fetchGameState, refreshUser, t, toast, sounds, checkAchievements]);

  // Purchase prestige upgrade
  const purchasePrestigeUpgrade = useCallback(async (upgradeId) => {
    try {
      const response = await api.post('/essence-tap/prestige/upgrade', {
        upgradeId
      });

      if (!isMountedRef.current) return { success: false };

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_PRESTIGE_UPGRADE);
      await fetchGameState(false);

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

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_MILESTONE_CLAIM);
      await fetchGameState(false);
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

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_CHARACTER_ASSIGN);
      await fetchGameState(false);

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

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_CHARACTER_UNASSIGN);
      await fetchGameState(false);

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

  // Gamble with essence
  const performGamble = useCallback(async (betType, betAmount) => {
    try {
      const response = await api.post('/essence-tap/gamble', {
        betType,
        betAmount
      });

      if (!isMountedRef.current) return { success: false };

      // Update local essence (backend is source of truth)
      setLocalEssence(response.data.newEssence);
      localEssenceRef.current = response.data.newEssence;
      lastSyncEssenceRef.current = response.data.newEssence;
      lastSyncTimeRef.current = Date.now();

      // Invalidate cache - gamble may award jackpot which gives FP/tickets
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_GAMBLE);

      if (response.data.won) {
        toast.success(
          t('essenceTap.gambleWon', {
            amount: formatNumber(response.data.essenceChange),
            defaultValue: `You won! +${formatNumber(response.data.essenceChange)} essence!`
          })
        );
      } else {
        toast.info(
          t('essenceTap.gambleLost', {
            amount: formatNumber(Math.abs(response.data.essenceChange)),
            defaultValue: `You lost ${formatNumber(Math.abs(response.data.essenceChange))} essence`
          })
        );
      }

      if (response.data.jackpotWin) {
        toast.success(
          t('essenceTap.jackpotWon', {
            amount: formatNumber(response.data.jackpotWin),
            defaultValue: `JACKPOT! +${formatNumber(response.data.jackpotWin)} essence!`
          })
        );
        // Refresh user data to show updated FP/tickets from jackpot
        await refreshUser();
      }

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to gamble:', err);
      toast.error(err.response?.data?.error || t('essenceTap.gambleFailed', { defaultValue: 'Gamble failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [t, toast, refreshUser]);

  // Perform infusion for permanent bonus
  const performInfusion = useCallback(async () => {
    try {
      const response = await api.post('/essence-tap/infusion');

      if (!isMountedRef.current) return { success: false };

      setLocalEssence(response.data.essence);
      localEssenceRef.current = response.data.essence;

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_INFUSION);

      toast.success(
        t('essenceTap.infusionComplete', {
          bonus: (response.data.bonusGained * 100).toFixed(1),
          total: (response.data.totalBonus * 100).toFixed(1),
          defaultValue: `Infusion complete! +${(response.data.bonusGained * 100).toFixed(1)}% (Total: +${(response.data.totalBonus * 100).toFixed(1)}%)`
        })
      );

      await fetchGameState(false);

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to infuse:', err);
      toast.error(err.response?.data?.error || t('essenceTap.infusionFailed', { defaultValue: 'Infusion failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast]);

  // Get gamble info
  const getGambleInfo = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/jackpot');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get gamble info:', err);
      return { success: false };
    }
  }, []);

  // Get weekly tournament info
  const getTournamentInfo = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/tournament/weekly');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get tournament info:', err);
      return { success: false };
    }
  }, []);

  // Claim weekly tournament rewards
  const claimTournamentRewards = useCallback(async () => {
    try {
      const response = await api.post('/essence-tap/tournament/weekly/claim');

      if (!isMountedRef.current) return { success: false };

      // Invalidate cache - tournament gives FP and roll tickets
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_TOURNAMENT_CLAIM);
      await refreshUser();

      toast.success(
        t('essenceTap.tournamentRewardsClaimed', {
          tier: response.data.tier,
          fatePoints: response.data.rewards.fatePoints,
          defaultValue: `${response.data.tier} rewards claimed! +${response.data.rewards.fatePoints} Fate Points!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to claim tournament rewards:', err);
      toast.error(err.response?.data?.error || t('essenceTap.claimFailed', { defaultValue: 'Claim failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [refreshUser, t, toast]);

  // Get character mastery info
  const getMasteryInfo = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/mastery');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get mastery info:', err);
      return { success: false };
    }
  }, []);

  // Get essence types breakdown
  const getEssenceTypes = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/essence-types');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get essence types:', err);
      return { success: false };
    }
  }, []);

  // Claim daily streak
  const claimDailyStreak = useCallback(async () => {
    try {
      const response = await api.post('/essence-tap/tickets/streak/claim');

      if (!isMountedRef.current) return { success: false };

      // Invalidate cache - streak claim awards roll tickets
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_STREAK_CLAIM);

      if (response.data.awarded && response.data.tickets > 0) {
        toast.success(
          t('essenceTap.streakReward', {
            tickets: response.data.tickets,
            days: response.data.streakDays,
            defaultValue: `${response.data.streakDays} day streak! +${response.data.tickets} roll tickets!`
          })
        );
      } else {
        toast.info(
          t('essenceTap.streakContinued', {
            days: response.data.streakDays,
            defaultValue: `Streak continued! ${response.data.streakDays} days`
          })
        );
      }

      await refreshUser();

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to claim streak:', err);
      toast.error(err.response?.data?.error || t('essenceTap.claimFailed', { defaultValue: 'Claim failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [refreshUser, t, toast]);

  // Claim repeatable milestones
  const claimRepeatableMilestone = useCallback(async (milestoneType) => {
    try {
      const response = await api.post('/essence-tap/milestones/repeatable/claim', {
        milestoneType
      });

      if (!isMountedRef.current) return { success: false };

      // Invalidate cache - repeatable milestones award FP
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_REPEATABLE_MILESTONE_CLAIM);
      await fetchGameState(false);
      await refreshUser();

      toast.success(
        t('essenceTap.repeatableMilestoneClaimed', {
          points: response.data.fatePoints,
          defaultValue: `Milestone claimed! +${response.data.fatePoints} Fate Points!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to claim repeatable milestone:', err);
      toast.error(err.response?.data?.error || t('essenceTap.claimFailed', { defaultValue: 'Claim failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, refreshUser, t, toast]);

  // Activate ability
  const activateAbility = useCallback(async (abilityId) => {
    try {
      const response = await api.post('/essence-tap/ability/activate', {
        abilityId
      });

      if (!isMountedRef.current) return { success: false };

      // Invalidate cache - ability activation may grant bonus essence
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_ABILITY_ACTIVATE);

      if (response.data.bonusEssence > 0) {
        setLocalEssence(response.data.essence);
        localEssenceRef.current = response.data.essence;
        lastSyncEssenceRef.current = response.data.essence;
        lastSyncTimeRef.current = Date.now();
      }

      toast.success(
        t('essenceTap.abilityActivated', {
          name: response.data.ability?.name || abilityId,
          defaultValue: `${response.data.ability?.name || abilityId} activated!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to activate ability:', err);
      toast.error(err.response?.data?.error || t('essenceTap.abilityFailed', { defaultValue: 'Ability activation failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [t, toast]);

  // Get daily modifier
  const getDailyModifier = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/daily-modifier');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get daily modifier:', err);
      return { success: false };
    }
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

    // Achievements
    unlockedAchievement,
    dismissAchievement,

    // Sound controls
    sounds,

    // Actions
    handleClick,
    purchaseGenerator,
    purchaseUpgrade,
    performPrestige,
    purchasePrestigeUpgrade,
    claimMilestone,
    assignCharacter,
    unassignCharacter,

    // New actions
    performGamble,
    performInfusion,
    claimTournamentRewards,
    claimDailyStreak,
    claimRepeatableMilestone,
    activateAbility,

    // Data fetchers
    getGambleInfo,
    getTournamentInfo,
    getMasteryInfo,
    getEssenceTypes,
    getDailyModifier,

    // Refresh
    refresh: fetchGameState,

    // Utilities
    formatNumber,
    formatPerSecond
  };
};

export default useEssenceTap;
