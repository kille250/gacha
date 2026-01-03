/**
 * useEssenceTapActions - All action callbacks for Essence Tap
 *
 * Manages all user actions including:
 * - Click/tap processing
 * - Generator purchases
 * - Upgrade purchases
 * - Prestige actions
 * - Character management
 * - Gambling
 * - Infusion
 * - Abilities
 * - Boss battles
 * - Milestones
 * - Daily challenges
 * - Tournament actions
 * - And more...
 *
 * Each action:
 * - Accepts necessary state/socket dependencies
 * - Handles optimistic updates
 * - Handles error cases
 * - Returns success/failure result
 */

import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../../cache/manager';
import { GOLDEN_CONFIG, COMBO_CONFIG } from '../../config/essenceTapConfig';
import { formatNumber } from './../../utils/essenceTap/calculations';

/**
 * Custom hook for all Essence Tap action callbacks
 */
export const useEssenceTapActions = ({
  gameState,
  localEssenceRef,
  localLifetimeEssenceRef,
  lastSyncEssenceRef,
  lastSyncTimeRef,
  isMountedRef,
  setLocalEssence,
  setLocalLifetimeEssence,
  setLocalTotalClicks,
  fetchGameState,
  updateCombo,
  setClickResult,
  checkAchievements,
  achievementTrackingRef,
  comboMultiplier,
  checkClickRateLimit,
  sounds,
  useWebSocket,
  flushTapBatch,
  wsSendTap,
  wsRequestSync,
}) => {
  const { t } = useTranslation();
  const { refreshUser } = useContext(AuthContext);
  const toast = useToast();

  // Track pending click request to wait for it before purchases
  const pendingClickRef = useRef(null);

  // ===========================================
  // CLICK/TAP PROCESSING
  // ===========================================

  /**
   * Handle click - uses WebSocket when available, REST as fallback
   */
  const handleClick = useCallback(async () => {
    if (!gameState) return;

    // Rate limit clicks
    if (!checkClickRateLimit()) return;

    // Update combo
    updateCombo();

    // Calculate local click result (optimistic)
    const clickPower = gameState.clickPower || 1;
    const critChance = gameState.critChance || 0.01;
    const critMultiplier = gameState.critMultiplier || 10;

    const isCrit = Math.random() < critChance;
    const isGolden = Math.random() < GOLDEN_CONFIG.chance;

    let essenceGained = Math.floor(clickPower * comboMultiplier);
    if (isCrit) essenceGained = Math.floor(essenceGained * critMultiplier);
    if (isGolden) essenceGained = Math.floor(essenceGained * GOLDEN_CONFIG.multiplier);

    // Play sound effect
    sounds.playClick(isCrit, isGolden);

    // Track for achievements
    const tracking = achievementTrackingRef.current;
    const newTotalClicks = tracking.totalClicks + 1;
    const newTotalGolden = isGolden ? tracking.totalGolden + 1 : tracking.totalGolden;
    const newCritStreak = isCrit ? tracking.critStreak + 1 : 0;
    const newMaxCritStreak = Math.max(tracking.maxCritStreak, newCritStreak);
    const newMaxCombo = Math.max(tracking.maxCombo, Math.floor(comboMultiplier * 10));

    checkAchievements({
      totalClicks: newTotalClicks,
      totalGolden: newTotalGolden,
      critStreak: newCritStreak,
      maxCritStreak: newMaxCritStreak,
      maxCombo: newMaxCombo
    });

    // Set click result for visual feedback
    setClickResult({
      essenceGained,
      isCrit,
      isGolden,
      comboMultiplier
    });

    // WebSocket path (primary)
    if (useWebSocket) {
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
      setLocalTotalClicks(prev => prev + 1);

      wsSendTap(1, comboMultiplier);
      return;
    }

    // REST API path (fallback)
    const clickTimestamp = Date.now();
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
    setLocalTotalClicks(prev => prev + 1);

    const preClickEssence = localEssenceRef.current - essenceGained;
    const preClickLifetime = localLifetimeEssenceRef.current - essenceGained;

    const clickPromise = (async () => {
      try {
        const response = await api.post('/essence-tap/click', {
          count: 1,
          comboMultiplier
        });

        if (!isMountedRef.current) return;

        const serverEssence = response.data.essence;
        const serverLifetime = response.data.lifetimeEssence;
        setLocalEssence(prev => {
          if (serverEssence >= prev) {
            localEssenceRef.current = serverEssence;
            return serverEssence;
          }
          return prev;
        });
        setLocalLifetimeEssence(prev => {
          if (serverLifetime >= prev) {
            localLifetimeEssenceRef.current = serverLifetime;
            return serverLifetime;
          }
          return prev;
        });
        lastSyncEssenceRef.current = serverEssence;
        lastSyncTimeRef.current = Date.now();

        if (response.data.completedChallenges?.length > 0) {
          response.data.completedChallenges.forEach(challenge => {
            toast.success(
              t('essenceTap.challengeComplete', { name: challenge.name, defaultValue: `Challenge Complete: ${challenge.name}!` })
            );
          });
        }
      } catch (err) {
        console.error('Click sync failed:', err);
        // Rollback optimistic update
        setLocalEssence(prev => {
          const timeSinceClick = Date.now() - clickTimestamp;
          const passiveDuringApiMs = Math.min(timeSinceClick, 5000);
          const productionRate = gameState?.productionPerSecond || 0;
          const passiveGainedDuringApi = (productionRate * passiveDuringApiMs) / 1000;
          const targetEssence = Math.max(0, preClickEssence + passiveGainedDuringApi);
          const expectedWithOptimistic = preClickEssence + essenceGained + passiveGainedDuringApi;
          if (Math.abs(prev - expectedWithOptimistic) < essenceGained * 2) {
            localEssenceRef.current = targetEssence;
            return targetEssence;
          }
          return prev;
        });
        setLocalLifetimeEssence(prev => {
          const timeSinceClick = Date.now() - clickTimestamp;
          const passiveDuringApiMs = Math.min(timeSinceClick, 5000);
          const productionRate = gameState?.productionPerSecond || 0;
          const passiveGainedDuringApi = (productionRate * passiveDuringApiMs) / 1000;
          const targetLifetime = Math.max(0, preClickLifetime + passiveGainedDuringApi);
          const expectedWithOptimistic = preClickLifetime + essenceGained + passiveGainedDuringApi;
          if (Math.abs(prev - expectedWithOptimistic) < essenceGained * 2) {
            localLifetimeEssenceRef.current = targetLifetime;
            return targetLifetime;
          }
          return prev;
        });
        setLocalTotalClicks(prev => Math.max(0, prev - 1));
      } finally {
        pendingClickRef.current = null;
      }
    })();

    pendingClickRef.current = clickPromise;
  }, [gameState, comboMultiplier, checkClickRateLimit, updateCombo, setClickResult, sounds, achievementTrackingRef, checkAchievements, useWebSocket, wsSendTap, setLocalEssence, setLocalLifetimeEssence, setLocalTotalClicks, localEssenceRef, localLifetimeEssenceRef, lastSyncEssenceRef, lastSyncTimeRef, isMountedRef, t, toast]);

  // ===========================================
  // GENERATOR PURCHASE
  // ===========================================

  /**
   * Purchase generator
   */
  const purchaseGenerator = useCallback(async (generatorId, count = 1) => {
    if (!gameState) return { success: false };

    if (pendingClickRef.current) {
      await pendingClickRef.current;
    }

    if (useWebSocket) {
      flushTapBatch();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const response = await api.post('/essence-tap/generator/buy', {
        generatorId,
        count
      });

      if (!isMountedRef.current) return { success: false };

      sounds.playPurchase();

      const serverEssence = response.data.essence;
      setLocalEssence(() => {
        localEssenceRef.current = serverEssence;
        return serverEssence;
      });
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();

      const tracking = achievementTrackingRef.current;
      if (tracking.totalGenerators === 0) {
        checkAchievements({
          ...tracking,
          totalGenerators: 1
        });
      }

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_GENERATOR_PURCHASE);
      await fetchGameState(false);

      if (useWebSocket) {
        wsRequestSync();
      }

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
  }, [gameState, fetchGameState, t, toast, sounds, checkAchievements, achievementTrackingRef, useWebSocket, flushTapBatch, wsRequestSync, setLocalEssence, localEssenceRef, lastSyncEssenceRef, lastSyncTimeRef, isMountedRef]);

  // ===========================================
  // UPGRADE PURCHASE
  // ===========================================

  /**
   * Purchase upgrade
   */
  const purchaseUpgrade = useCallback(async (upgradeId) => {
    if (!gameState) return { success: false };

    if (pendingClickRef.current) {
      await pendingClickRef.current;
    }

    if (useWebSocket) {
      flushTapBatch();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const response = await api.post('/essence-tap/upgrade/buy', {
        upgradeId
      });

      if (!isMountedRef.current) return { success: false };

      const serverEssence = response.data.essence;
      setLocalEssence(() => {
        localEssenceRef.current = serverEssence;
        return serverEssence;
      });
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_UPGRADE_PURCHASE);
      await fetchGameState(false);

      if (useWebSocket) {
        wsRequestSync();
      }

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
  }, [gameState, fetchGameState, t, toast, useWebSocket, flushTapBatch, wsRequestSync, setLocalEssence, localEssenceRef, lastSyncEssenceRef, lastSyncTimeRef, isMountedRef]);

  // ===========================================
  // PRESTIGE
  // ===========================================

  /**
   * Perform prestige
   */
  const performPrestige = useCallback(async () => {
    if (!gameState?.prestige?.canPrestige) return { success: false };

    if (useWebSocket) {
      flushTapBatch();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const response = await api.post('/essence-tap/prestige');

      if (!isMountedRef.current) return { success: false };

      sounds.playPrestige();

      const tracking = achievementTrackingRef.current;
      const newPrestigeLevel = response.data.prestigeLevel || 1;
      checkAchievements({
        ...tracking,
        prestigeLevel: newPrestigeLevel
      });

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_PRESTIGE);
      await fetchGameState(false);
      await refreshUser();

      if (useWebSocket) {
        wsRequestSync();
      }

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
  }, [gameState, fetchGameState, refreshUser, t, toast, sounds, checkAchievements, achievementTrackingRef, useWebSocket, flushTapBatch, wsRequestSync, isMountedRef]);

  // ===========================================
  // PRESTIGE UPGRADE
  // ===========================================

  /**
   * Purchase prestige upgrade
   */
  const purchasePrestigeUpgrade = useCallback(async (upgradeId) => {
    try {
      const response = await api.post('/essence-tap/prestige/upgrade', {
        upgradeId
      });

      if (!isMountedRef.current) return { success: false };

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
  }, [fetchGameState, t, toast, isMountedRef]);

  // ===========================================
  // CHARACTER MANAGEMENT
  // ===========================================

  /**
   * Assign character
   */
  const assignCharacter = useCallback(async (characterId) => {
    try {
      const response = await api.post('/essence-tap/character/assign', {
        characterId
      });

      if (!isMountedRef.current) return { success: false };

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_CHARACTER_ASSIGN);
      await fetchGameState(false);

      toast.success(t('essenceTap.characterAssigned', { defaultValue: 'Character assigned!' }));

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to assign character:', err);
      toast.error(err.response?.data?.error || t('essenceTap.assignFailed', { defaultValue: 'Failed to assign' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast, isMountedRef]);

  /**
   * Unassign character
   */
  const unassignCharacter = useCallback(async (characterId) => {
    try {
      const response = await api.post('/essence-tap/character/unassign', {
        characterId
      });

      if (!isMountedRef.current) return { success: false };

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_CHARACTER_UNASSIGN);
      await fetchGameState(false);

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to unassign character:', err);
      toast.error(err.response?.data?.error || t('essenceTap.unassignFailed', { defaultValue: 'Failed to unassign' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast, isMountedRef]);

  // ===========================================
  // GAMBLING
  // ===========================================

  /**
   * Gamble with essence
   */
  const performGamble = useCallback(async (betType, betAmount) => {
    if (pendingClickRef.current) {
      await pendingClickRef.current;
    }
    if (useWebSocket) {
      flushTapBatch();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    try {
      const response = await api.post('/essence-tap/gamble', {
        betType,
        betAmount
      });

      if (!isMountedRef.current) return { success: false };

      const serverEssence = response.data.newEssence;
      setLocalEssence(prev => {
        const passiveGainsDuringCall = Math.max(0, prev - lastSyncEssenceRef.current);
        const finalValue = serverEssence + passiveGainsDuringCall;
        localEssenceRef.current = finalValue;
        return finalValue;
      });
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();

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
        await refreshUser();
      }

      await fetchGameState(false);

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to gamble:', err);
      toast.error(err.response?.data?.error || t('essenceTap.gambleFailed', { defaultValue: 'Gamble failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [t, toast, refreshUser, fetchGameState, useWebSocket, flushTapBatch, setLocalEssence, localEssenceRef, lastSyncEssenceRef, lastSyncTimeRef, isMountedRef]);

  // ===========================================
  // INFUSION
  // ===========================================

  /**
   * Perform infusion for permanent bonus
   */
  const performInfusion = useCallback(async () => {
    if (pendingClickRef.current) {
      await pendingClickRef.current;
    }
    if (useWebSocket) {
      flushTapBatch();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    try {
      const response = await api.post('/essence-tap/infusion');

      if (!isMountedRef.current) return { success: false };

      const serverEssence = response.data.essence;
      setLocalEssence(() => {
        localEssenceRef.current = serverEssence;
        return serverEssence;
      });
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();

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
  }, [fetchGameState, t, toast, useWebSocket, flushTapBatch, setLocalEssence, localEssenceRef, lastSyncEssenceRef, lastSyncTimeRef, isMountedRef]);

  // ===========================================
  // ABILITIES
  // ===========================================

  /**
   * Activate ability
   */
  const activateAbility = useCallback(async (abilityId) => {
    try {
      const response = await api.post('/essence-tap/ability/activate', {
        abilityId
      });

      if (!isMountedRef.current) return { success: false };

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_ABILITY_ACTIVATE);

      if (response.data.bonusEssence > 0) {
        const serverEssence = response.data.essence;
        setLocalEssence(prev => {
          if (serverEssence >= prev) {
            localEssenceRef.current = serverEssence;
            return serverEssence;
          }
          return prev;
        });
        lastSyncEssenceRef.current = serverEssence;
        lastSyncTimeRef.current = Date.now();

        await fetchGameState(false);
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
  }, [t, toast, fetchGameState, setLocalEssence, localEssenceRef, lastSyncEssenceRef, lastSyncTimeRef, isMountedRef]);

  // ===========================================
  // BOSS BATTLES
  // ===========================================

  /**
   * Spawn boss
   */
  const spawnBoss = useCallback(async () => {
    try {
      const response = await api.post('/essence-tap/boss/spawn');

      if (!isMountedRef.current) return { success: false };

      await fetchGameState(false);

      toast.success(t('essenceTap.bossSpawned', { defaultValue: 'Boss spawned!' }));

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to spawn boss:', err);
      toast.error(err.response?.data?.error || t('essenceTap.bossSpawnFailed', { defaultValue: 'Failed to spawn boss' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast, isMountedRef]);

  /**
   * Attack boss
   */
  const attackBoss = useCallback(async () => {
    try {
      const response = await api.post('/essence-tap/boss/attack');

      if (!isMountedRef.current) return { success: false };

      await fetchGameState(false);

      if (response.data.defeated) {
        toast.success(t('essenceTap.bossDefeated', { defaultValue: 'Boss defeated!' }));
        sounds.playMilestone();
      }

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to attack boss:', err);
      toast.error(err.response?.data?.error || t('essenceTap.attackFailed', { defaultValue: 'Attack failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, t, toast, sounds, isMountedRef]);

  // ===========================================
  // MILESTONES
  // ===========================================

  /**
   * Claim milestone
   */
  const claimMilestone = useCallback(async (milestoneKey) => {
    try {
      const response = await api.post('/essence-tap/milestone/claim', {
        milestoneKey
      });

      if (!isMountedRef.current) return { success: false };

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
  }, [fetchGameState, refreshUser, t, toast, isMountedRef]);

  /**
   * Claim repeatable milestones
   */
  const claimRepeatableMilestone = useCallback(async (milestoneType) => {
    try {
      const response = await api.post('/essence-tap/milestones/repeatable/claim', {
        milestoneType
      });

      if (!isMountedRef.current) return { success: false };

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
  }, [fetchGameState, refreshUser, t, toast, isMountedRef]);

  // ===========================================
  // DAILY CHALLENGES
  // ===========================================

  /**
   * Claim daily streak
   */
  const claimDailyStreak = useCallback(async () => {
    try {
      const response = await api.post('/essence-tap/tickets/streak/claim');

      if (!isMountedRef.current) return { success: false };

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

      await Promise.all([fetchGameState(false), refreshUser()]);

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to claim streak:', err);
      toast.error(err.response?.data?.error || t('essenceTap.claimFailed', { defaultValue: 'Claim failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [refreshUser, fetchGameState, t, toast, isMountedRef]);

  // ===========================================
  // TOURNAMENT ACTIONS
  // ===========================================

  /**
   * Claim weekly tournament rewards
   */
  const claimTournamentRewards = useCallback(async () => {
    try {
      const response = await api.post('/essence-tap/tournament/weekly/claim');

      if (!isMountedRef.current) return { success: false };

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_TOURNAMENT_CLAIM);
      await Promise.all([fetchGameState(false), refreshUser()]);

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
  }, [fetchGameState, refreshUser, t, toast, isMountedRef]);

  /**
   * Claim tournament checkpoint (v4.0)
   */
  const claimTournamentCheckpoint = useCallback(async (day) => {
    try {
      const response = await api.post('/essence-tap/tournament/checkpoint/claim', { day });

      if (!isMountedRef.current) return { success: false };

      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_TOURNAMENT_CLAIM);
      await Promise.all([fetchGameState(false), refreshUser()]);

      toast.success(
        t('essenceTap.checkpointClaimed', {
          checkpoint: response.data.checkpointName,
          defaultValue: `${response.data.checkpointName} checkpoint claimed!`
        })
      );

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to claim checkpoint:', err);
      toast.error(err.response?.data?.error || t('essenceTap.claimFailed', { defaultValue: 'Claim failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchGameState, refreshUser, t, toast, isMountedRef]);

  /**
   * Equip tournament cosmetic (v4.0)
   */
  const equipTournamentCosmetic = useCallback(async (cosmeticId) => {
    try {
      const response = await api.post('/essence-tap/tournament/cosmetics/equip', { cosmeticId });
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to equip cosmetic:', err);
      toast.error(err.response?.data?.error || 'Failed to equip cosmetic');
      return { success: false, error: err.response?.data?.error };
    }
  }, [toast]);

  /**
   * Unequip tournament cosmetic (v4.0)
   */
  const unequipTournamentCosmetic = useCallback(async (slot) => {
    try {
      const response = await api.post('/essence-tap/tournament/cosmetics/unequip', { slot });
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to unequip cosmetic:', err);
      toast.error(err.response?.data?.error || 'Failed to unequip cosmetic');
      return { success: false, error: err.response?.data?.error };
    }
  }, [toast]);

  // ===========================================
  // DATA FETCHERS
  // ===========================================

  /**
   * Get gamble info
   */
  const getGambleInfo = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/jackpot');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get gamble info:', err);
      return { success: false };
    }
  }, []);

  /**
   * Get weekly tournament info
   */
  const getTournamentInfo = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/tournament/weekly');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get tournament info:', err);
      return { success: false };
    }
  }, []);

  /**
   * Get bracket leaderboard (v4.0)
   */
  const getBracketLeaderboard = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/tournament/bracket-leaderboard');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get bracket leaderboard:', err);
      return { success: false };
    }
  }, []);

  /**
   * Get burning hour status (v4.0)
   */
  const getBurningHourStatus = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/tournament/burning-hour');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get burning hour status:', err);
      return { success: false };
    }
  }, []);

  /**
   * Get tournament cosmetics (v4.0)
   */
  const getTournamentCosmetics = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/tournament/cosmetics');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get tournament cosmetics:', err);
      return { success: false };
    }
  }, []);

  /**
   * Get character mastery info
   */
  const getMasteryInfo = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/mastery');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get mastery info:', err);
      return { success: false };
    }
  }, []);

  /**
   * Get essence types breakdown
   */
  const getEssenceTypes = useCallback(async () => {
    try {
      const response = await api.get('/essence-tap/essence-types');
      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to get essence types:', err);
      return { success: false };
    }
  }, []);

  /**
   * Get daily modifier
   */
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
    // Click/Tap
    handleClick,

    // Purchases
    purchaseGenerator,
    purchaseUpgrade,

    // Prestige
    performPrestige,
    purchasePrestigeUpgrade,

    // Character management
    assignCharacter,
    unassignCharacter,

    // Gambling & Infusion
    performGamble,
    performInfusion,

    // Abilities
    activateAbility,

    // Boss battles
    spawnBoss,
    attackBoss,

    // Milestones
    claimMilestone,
    claimRepeatableMilestone,

    // Daily challenges
    claimDailyStreak,

    // Tournament
    claimTournamentRewards,
    claimTournamentCheckpoint,
    equipTournamentCosmetic,
    unequipTournamentCosmetic,

    // Data fetchers
    getGambleInfo,
    getTournamentInfo,
    getBracketLeaderboard,
    getBurningHourStatus,
    getTournamentCosmetics,
    getMasteryInfo,
    getEssenceTypes,
    getDailyModifier,
  };
};

export default useEssenceTapActions;
