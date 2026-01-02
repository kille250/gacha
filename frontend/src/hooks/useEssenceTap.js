/**
 * useEssenceTap - Custom hook for Essence Tap clicker game state and logic
 *
 * Manages the clicker game state, click processing, passive income calculation,
 * and API/WebSocket synchronization.
 *
 * SYNCHRONIZATION STRATEGY:
 * 1. WebSocket is the primary sync method when available
 * 2. REST API is used as fallback when WebSocket is disconnected
 * 3. Optimistic updates are applied immediately for responsive UI
 * 4. Server state is authoritative - client reconciles on confirmation
 * 5. Actions wait for pending clicks to prevent race conditions
 */

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { invalidateFor, CACHE_ACTIONS, onVisibilityChange } from '../cache/manager';
import {
  COMBO_CONFIG,
  GOLDEN_CONFIG,
  UI_TIMING,
  ACHIEVEMENTS
} from '../config/essenceTapConfig';
import { useSoundEffects } from './useSoundEffects';
import { useEssenceTapSocket, CONNECTION_STATES, loadStateFromLocalStorage, clearLocalStorageBackup } from './useEssenceTapSocket';

// Re-export config for convenience
export { COMBO_CONFIG, GOLDEN_CONFIG } from '../config/essenceTapConfig';

/**
 * Format large numbers with suffixes (K, M, B, T, etc.)
 */
export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // Handle small decimals (like 0.5/sec production rates)
  if (absNum < 1 && absNum > 0) return sign + absNum.toFixed(1);
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
  const [localTotalClicks, setLocalTotalClicks] = useState(0);

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

  // ===========================================
  // WEBSOCKET INTEGRATION
  // ===========================================

  // Get auth token for WebSocket
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

  // WebSocket callbacks
  const handleWsStateUpdate = useCallback((data, type) => {
    if (type === 'full') {
      // Full state sync from WebSocket - server state is authoritative
      // CRITICAL: This handles reconnection sync properly
      setGameState(data);
      const serverEssence = data.essence || 0;
      const serverLifetime = data.lifetimeEssence || 0;

      // Server state is fully authoritative on full sync
      setLocalEssence(serverEssence);
      setLocalLifetimeEssence(serverLifetime);
      setLocalTotalClicks(data.totalClicks || 0);
      localEssenceRef.current = serverEssence;
      localLifetimeEssenceRef.current = serverLifetime;
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();
      // Reset pending essence tracking since server state is authoritative
      // This prevents double-counting passive gains
      pendingEssenceRef.current = 0;

      // FIX B1: Invalidate user data cache on full sync if FP rewards were included
      // This ensures fresh user FP/tickets after reconnection where offline rewards may have been granted
      if (data.offlineProgress?.fatePointsEarned > 0 || data.pendingRewards) {
        invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_PRESTIGE); // Covers /auth/me invalidation
      }

      console.log('[EssenceTap] Full state sync received, essence:', serverEssence);
    } else if (type === 'tap_confirmed') {
      // Tap confirmation - reconcile with server using optimistic essence tracking
      const serverEssence = data.essence;
      const serverLifetime = data.lifetimeEssence;

      // FIX A1: Get remaining optimistic essence that hasn't been confirmed yet
      // This prevents the inflation bug where local > server causes us to keep
      // the inflated local value during rapid tapping
      const remainingOptimistic = getOptimisticEssence();

      setLocalEssence(() => {
        // Server state includes all confirmed taps. Add back any optimistic
        // essence from taps that haven't been confirmed yet to maintain smooth UI
        const reconciledEssence = serverEssence + remainingOptimistic;
        localEssenceRef.current = reconciledEssence;
        return reconciledEssence;
      });

      setLocalLifetimeEssence(() => {
        const reconciledLifetime = serverLifetime + remainingOptimistic;
        localLifetimeEssenceRef.current = reconciledLifetime;
        return reconciledLifetime;
      });

      setLocalTotalClicks(data.totalClicks);
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();
    } else if (type === 'delta') {
      // Delta update - apply changes to gameState
      // This handles multi-tab synchronization properly
      setGameState(prev => {
        if (!prev) return data;
        const updated = { ...prev };

        // Apply all delta fields that are present
        if (data.essence !== undefined) updated.essence = data.essence;
        if (data.lifetimeEssence !== undefined) updated.lifetimeEssence = data.lifetimeEssence;
        if (data.generators !== undefined) updated.generators = data.generators;
        if (data.purchasedUpgrades !== undefined) updated.purchasedUpgrades = data.purchasedUpgrades;
        if (data.productionPerSecond !== undefined) updated.productionPerSecond = data.productionPerSecond;
        if (data.clickPower !== undefined) updated.clickPower = data.clickPower;
        if (data.critChance !== undefined) updated.critChance = data.critChance;
        if (data.critMultiplier !== undefined) updated.critMultiplier = data.critMultiplier;
        if (data.totalClicks !== undefined) updated.totalClicks = data.totalClicks;

        return updated;
      });

      // FIX A4: Update local display values while preserving pending optimistic updates
      // When delta comes from another tab, we should use server values but add back
      // any unconfirmed optimistic essence from this tab's pending taps
      const remainingOptimistic = getOptimisticEssence();

      if (data.essence !== undefined) {
        const reconciledEssence = data.essence + remainingOptimistic;
        setLocalEssence(reconciledEssence);
        localEssenceRef.current = reconciledEssence;
        lastSyncEssenceRef.current = data.essence; // Track server value separately
      }
      if (data.lifetimeEssence !== undefined) {
        const reconciledLifetime = data.lifetimeEssence + remainingOptimistic;
        setLocalLifetimeEssence(reconciledLifetime);
        localLifetimeEssenceRef.current = reconciledLifetime;
      }
      if (data.totalClicks !== undefined) {
        setLocalTotalClicks(data.totalClicks);
      }
      lastSyncTimeRef.current = Date.now();

      // Invalidate cache when generators or upgrades change (multi-tab sync)
      if (data.generators !== undefined) {
        invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_GENERATOR_PURCHASE);
      }
      if (data.purchasedUpgrades !== undefined) {
        invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_UPGRADE_PURCHASE);
      }
    } else if (type === 'prestige_complete') {
      // Prestige completed via WebSocket - full state replacement
      setGameState(data);
      setLocalEssence(data.essence || 0);
      setLocalLifetimeEssence(data.lifetimeEssence || 0);
      setLocalTotalClicks(data.totalClicks || 0);
      localEssenceRef.current = data.essence || 0;
      localLifetimeEssenceRef.current = data.lifetimeEssence || 0;
      lastSyncEssenceRef.current = data.essence || 0;
      lastSyncTimeRef.current = Date.now();
      pendingEssenceRef.current = 0;
      // Invalidate user data cache since prestige awards FP
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_PRESTIGE);
    } else if (type === 'ability_activated') {
      // Ability activated via WebSocket - update relevant fields
      setGameState(prev => {
        if (!prev) return data;
        return {
          ...prev,
          essence: data.essence,
          activeAbilities: data.activeAbilities,
        };
      });
      if (data.essence !== undefined) {
        setLocalEssence(data.essence);
        localEssenceRef.current = data.essence;
        lastSyncEssenceRef.current = data.essence;
      }
      lastSyncTimeRef.current = Date.now();
      // Invalidate ability cache for consistency
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_ABILITY_ACTIVATE);
    }
  }, []);

  const handleWsError = useCallback((err) => {
    console.error('[EssenceTap] WebSocket error:', err);
    // Don't show toast for every error - let connection state handle it
  }, []);

  const handleWsChallengeComplete = useCallback((challenge) => {
    toast.success(
      t('essenceTap.challengeComplete', {
        name: challenge.name,
        defaultValue: `Challenge Complete: ${challenge.name}!`
      })
    );
  }, [toast, t]);

  // Initialize WebSocket connection
  const {
    isConnected: wsConnected,
    connectionState: wsConnectionState,
    essenceState: _wsEssenceState,  // State managed locally, WebSocket updates via callback
    sendTap: wsSendTap,
    purchaseGenerator: _wsPurchaseGenerator,  // Reserved for future WebSocket-first purchases
    purchaseUpgrade: _wsPurchaseUpgrade,      // Reserved for future WebSocket-first purchases
    requestSync: wsRequestSync,
    flushTapBatch,
    flushPendingActions,  // For SPA navigation - ensures state is saved before leaving page
    getPendingTapCount: _getPendingTapCount,  // Available for debugging
    getOptimisticEssence,  // Track unconfirmed essence for proper reconciliation
  } = useEssenceTapSocket({
    token,
    autoConnect: !!token,
    onStateUpdate: handleWsStateUpdate,
    onError: handleWsError,
    onChallengeComplete: handleWsChallengeComplete,
  });

  // Track whether to use WebSocket or REST
  const useWebSocket = wsConnected && wsConnectionState === CONNECTION_STATES.CONNECTED;

  // Refs for intervals
  const passiveTickRef = useRef(null);
  const isMountedRef = useRef(true);
  // Track pending click request to wait for it before purchases
  const pendingClickRef = useRef(null);
  // Track previous connection state for reconnection detection
  const prevConnectionStateRef = useRef(wsConnectionState);

  // Handle WebSocket connection state changes
  useEffect(() => {
    const prevState = prevConnectionStateRef.current;
    prevConnectionStateRef.current = wsConnectionState;

    // If we just reconnected (was disconnected/reconnecting, now connected)
    if (wsConnectionState === CONNECTION_STATES.CONNECTED &&
        (prevState === CONNECTION_STATES.DISCONNECTED ||
         prevState === CONNECTION_STATES.RECONNECTING ||
         prevState === CONNECTION_STATES.ERROR)) {
      console.log('[EssenceTap] WebSocket reconnected, syncing state...');
      // Stop passive tick to prevent race with incoming sync
      if (passiveTickRef.current) {
        clearInterval(passiveTickRef.current);
        passiveTickRef.current = null;
      }
      // Reset pending essence tracking - server will be authoritative
      pendingEssenceRef.current = 0;
      // Note: The WebSocket hook will automatically request a sync on reconnect
      // and the full state sync callback will update all our state
    }
  }, [wsConnectionState]);

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

  // CRITICAL: Ensure pending taps are flushed before page unload/reload
  // The useEssenceTapSocket hook handles this, but we also need to ensure
  // the flushTapBatch function is called from this hook's context
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush any pending WebSocket taps before the page unloads
      if (flushTapBatch) {
        flushTapBatch();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [flushTapBatch]);

  // Track if we've done initial load with localStorage recovery
  const hasInitializedRef = useRef(false);

  // Fetch initial game state
  // On initial load (showLoading=true), uses /initialize endpoint with localStorage backup recovery
  // On refresh (showLoading=false), uses regular /status endpoint
  const fetchGameState = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      let response;

      // Use /initialize endpoint on first load to handle:
      // 1. localStorage backup recovery (pending actions from page close)
      // 2. Proper offline earnings calculation
      // 3. Multi-tab deduplication of offline rewards
      if (showLoading && !hasInitializedRef.current) {
        hasInitializedRef.current = true;

        // Check for localStorage backup from previous session (F5/close/navigation)
        const backup = loadStateFromLocalStorage();
        const initializePayload = {
          clientTimestamp: Date.now(),
        };

        if (backup) {
          console.log('[EssenceTap] Found localStorage backup, including in initialize request');
          initializePayload.pendingActions = backup.pendingActions || [];
          initializePayload.lastKnownEssence = backup.essence;
          initializePayload.lastKnownTimestamp = backup.timestamp;
        }

        response = await api.post('/essence-tap/initialize', initializePayload);

        // Clear localStorage backup after successful initialization
        clearLocalStorageBackup();

        // Handle offline earnings display if applicable
        if (response.data.offlineEarnings > 0) {
          setOfflineProgress({
            essenceEarned: response.data.offlineEarnings,
            hoursAway: response.data.offlineDuration / 3600,
            productionRate: response.data.productionPerSecond,
            efficiency: response.data.offlineEfficiency || 0.5,
          });
        }

        // If pending actions were applied from localStorage backup, log it
        if (response.data.pendingActionsApplied > 0) {
          console.log(`[EssenceTap] Applied ${response.data.pendingActionsApplied} pending actions from localStorage backup`);
        }

        // Extract currentState from initialize response
        response.data = response.data.currentState;
      } else {
        // Regular status fetch for refreshes
        response = await api.get('/essence-tap/status');

        // Show offline progress modal if applicable (for non-initialize refreshes)
        if (response.data.offlineProgress && response.data.offlineProgress.essenceEarned > 0) {
          setOfflineProgress(response.data.offlineProgress);
        }
      }

      if (!isMountedRef.current) return;

      setGameState(response.data);
      const essenceVal = response.data.essence || 0;
      const lifetimeVal = response.data.lifetimeEssence || 0;
      const totalClicksVal = response.data.totalClicks || 0;

      // Use functional updates even for full state fetch to ensure consistency
      // fetchGameState is called after visibility change when passive timer is stopped,
      // so server value should be authoritative
      setLocalEssence(() => {
        localEssenceRef.current = essenceVal;
        return essenceVal;
      });
      setLocalLifetimeEssence(() => {
        localLifetimeEssenceRef.current = lifetimeVal;
        return lifetimeVal;
      });
      setLocalTotalClicks(totalClicksVal);

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

      // Note: Offline progress modal is handled above based on the endpoint used

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

  // Visibility change handler - refresh data when user returns to tab
  // CRITICAL: Must stop passive accumulation before fetching to prevent double-counting
  useEffect(() => {
    const cleanup = onVisibilityChange('essence-tap-game-state', (staleLevel) => {
      if (!isMountedRef.current) return;

      // Only refresh if stale enough (normal threshold = 2 min)
      if (staleLevel && staleLevel !== 'static') {
        // CRITICAL FIX: Stop passive tick to prevent race condition with server sync
        // The server will calculate all accumulated passive gains - we must not
        // continue accumulating locally during the API call
        if (passiveTickRef.current) {
          clearInterval(passiveTickRef.current);
          passiveTickRef.current = null;
        }

        // Clear pending essence since server state will be authoritative
        // This prevents double-counting: server calculates offline progress,
        // and we don't want to add our locally accumulated pending essence on top
        pendingEssenceRef.current = 0;

        // If using WebSocket, request sync via WebSocket for faster response
        // Otherwise, fall back to REST fetch
        if (wsConnected && wsConnectionState === CONNECTION_STATES.CONNECTED) {
          // Flush any pending taps before requesting sync
          flushTapBatch();
          wsRequestSync();
        } else {
          // Refresh game state to sync with server (handles offline progress)
          // Note: passive tick will restart when gameState updates via the useEffect
          // that watches gameState.productionPerSecond
          fetchGameState(false);
        }
      }
    });

    return cleanup;
  }, [fetchGameState, wsConnected, wsConnectionState, flushTapBatch, wsRequestSync]);

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
          // Use functional update to avoid race conditions with passive income/clicks
          // Only accept server value if it's higher (we shouldn't lose essence)
          // or if it's a purchase/spend that legitimately reduces essence
          if (response.data.essence !== undefined) {
            const serverEssence = response.data.essence;
            setLocalEssence(prev => {
              // Accept server value if it's higher or if local hasn't changed much
              // This prevents overwriting taps that happened during the API call
              const localGainsSinceSync = prev - lastSyncEssenceRef.current;
              if (serverEssence >= prev || localGainsSinceSync < 1) {
                localEssenceRef.current = serverEssence;
                return serverEssence;
              }
              // Server is lower but we have local gains - keep the higher value
              // The next sync will reconcile properly
              return prev;
            });
            lastSyncEssenceRef.current = response.data.essence;
          }
          if (response.data.lifetimeEssence !== undefined) {
            const serverLifetime = response.data.lifetimeEssence;
            setLocalLifetimeEssence(prev => {
              if (serverLifetime >= prev) {
                localLifetimeEssenceRef.current = serverLifetime;
                return serverLifetime;
              }
              return prev;
            });
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

  // Handle click - uses WebSocket when available, REST as fallback
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

    // ===========================================
    // WEBSOCKET PATH (Primary)
    // ===========================================
    if (useWebSocket) {
      // WebSocket handles optimistic updates and batching internally
      // We still apply local optimistic update for instant feedback
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

      // Send via WebSocket - batching handled by the socket hook
      wsSendTap(1, comboMultiplier);
      return;
    }

    // ===========================================
    // REST API PATH (Fallback)
    // ===========================================

    // Optimistic update for REST path
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
    // Update total clicks for real-time boss counter tracking
    setLocalTotalClicks(prev => prev + 1);

    // Store pre-click values for potential rollback
    const preClickEssence = localEssenceRef.current - essenceGained;
    const preClickLifetime = localLifetimeEssenceRef.current - essenceGained;

    // Sync with server (batched)
    const clickPromise = (async () => {
      try {
        const response = await api.post('/essence-tap/click', {
          count: 1,
          comboMultiplier
        });

        if (!isMountedRef.current) return;

        // Update with server values using functional updates to avoid race conditions
        // The server value should be authoritative, but we need to preserve any
        // taps/passive income that occurred during the API call
        const serverEssence = response.data.essence;
        const serverLifetime = response.data.lifetimeEssence;
        setLocalEssence(prev => {
          // Server value accounts for this click, so it should be >= our optimistic value
          // Only use server value if it's higher to avoid losing concurrent taps
          if (serverEssence >= prev) {
            localEssenceRef.current = serverEssence;
            return serverEssence;
          }
          // If local is higher, taps/passive accumulated during API call - keep local
          // The ref stays at our local value; next sync will reconcile
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
        // CRITICAL FIX: Roll back optimistic update on failure
        // Use careful rollback that accounts for passive gains during the API call
        setLocalEssence(prev => {
          // Only roll back if we haven't received a server update since
          // Calculate what the essence should be: pre-click + passive gains during API
          const timeSinceClick = Date.now() - clickTimestamp;
          const passiveDuringApiMs = Math.min(timeSinceClick, 5000); // Cap at 5 seconds
          const productionRate = gameState?.productionPerSecond || 0;
          const passiveGainedDuringApi = (productionRate * passiveDuringApiMs) / 1000;

          // Roll back to: pre-click essence + passive that accumulated
          // This prevents the jarring drop while still correcting for the failed click
          const targetEssence = Math.max(0, preClickEssence + passiveGainedDuringApi);

          // Only apply rollback if it makes sense (we're still at roughly what we expected)
          const expectedWithOptimistic = preClickEssence + essenceGained + passiveGainedDuringApi;
          if (Math.abs(prev - expectedWithOptimistic) < essenceGained * 2) {
            localEssenceRef.current = targetEssence;
            return targetEssence;
          }
          // If the values diverged significantly, a server update probably came in - keep current
          return prev;
        });
        setLocalLifetimeEssence(prev => {
          // Same logic for lifetime essence
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
        // Clear the pending click ref when done
        pendingClickRef.current = null;
      }
    })();

    // Store the promise so purchases can wait for it
    pendingClickRef.current = clickPromise;
  }, [gameState, comboMultiplier, clicksThisSecond, t, toast, sounds, checkAchievements, useWebSocket, wsSendTap]);

  // Purchase generator
  const purchaseGenerator = useCallback(async (generatorId, count = 1) => {
    if (!gameState) return { success: false };

    // Wait for any pending click to complete first
    // This ensures the server has the latest essence from recent taps
    if (pendingClickRef.current) {
      await pendingClickRef.current;
    }

    // If using WebSocket, flush any pending taps first
    if (useWebSocket) {
      flushTapBatch();
      // Small delay to allow batch to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const response = await api.post('/essence-tap/generator/buy', {
        generatorId,
        count
      });

      if (!isMountedRef.current) return { success: false };

      // Play purchase sound
      sounds.playPurchase();

      // Update local essence - purchases reduce essence, so always use server value
      // This is a spending action, not an earning action
      const serverEssence = response.data.essence;
      setLocalEssence(() => {
        localEssenceRef.current = serverEssence;
        return serverEssence;
      });
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();

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

      // If using WebSocket, request a sync to ensure both paths are in agreement
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
  }, [gameState, fetchGameState, t, toast, sounds, checkAchievements, useWebSocket, flushTapBatch, wsRequestSync]);

  // Purchase upgrade
  const purchaseUpgrade = useCallback(async (upgradeId) => {
    if (!gameState) return { success: false };

    // Wait for any pending click to complete first
    // This ensures the server has the latest essence from recent taps
    if (pendingClickRef.current) {
      await pendingClickRef.current;
    }

    // If using WebSocket, flush any pending taps first
    if (useWebSocket) {
      flushTapBatch();
      // Small delay to allow batch to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const response = await api.post('/essence-tap/upgrade/buy', {
        upgradeId
      });

      if (!isMountedRef.current) return { success: false };

      // Update local essence - purchases reduce essence, so always use server value
      const serverEssence = response.data.essence;
      setLocalEssence(() => {
        localEssenceRef.current = serverEssence;
        return serverEssence;
      });
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();

      // Invalidate cache before fetching to ensure fresh data
      invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_UPGRADE_PURCHASE);
      await fetchGameState(false);

      // If using WebSocket, request a sync to ensure both paths are in agreement
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
  }, [gameState, fetchGameState, t, toast, useWebSocket, flushTapBatch, wsRequestSync]);

  // Perform prestige
  const performPrestige = useCallback(async () => {
    if (!gameState?.prestige?.canPrestige) return { success: false };

    // If using WebSocket, flush any pending taps first
    if (useWebSocket) {
      flushTapBatch();
      // Small delay to allow batch to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

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

      // If using WebSocket, request a sync to ensure both paths are in agreement
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
  }, [gameState, fetchGameState, refreshUser, t, toast, sounds, checkAchievements, useWebSocket, flushTapBatch, wsRequestSync]);

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
    // CRITICAL FIX: Wait for pending clicks before gambling
    // This ensures server has accurate essence count
    if (pendingClickRef.current) {
      await pendingClickRef.current;
    }
    // Also flush WebSocket batch if connected
    if (useWebSocket) {
      flushTapBatch();
      // Small delay to allow batch to process
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    try {
      const response = await api.post('/essence-tap/gamble', {
        betType,
        betAmount
      });

      if (!isMountedRef.current) return { success: false };

      // Update local essence - gambling can win or lose, so use functional update
      // but since we're betting, server value is authoritative after the bet resolves
      const serverEssence = response.data.newEssence;
      setLocalEssence(prev => {
        // If we won, server should be higher; if we lost, server is lower
        // Either way, use server value but preserve any passive gains during API call
        const passiveGainsDuringCall = Math.max(0, prev - lastSyncEssenceRef.current);
        // For gambling, server is authoritative for the bet result
        // Add back any passive that accumulated during the API call
        const finalValue = serverEssence + passiveGainsDuringCall;
        localEssenceRef.current = finalValue;
        return finalValue;
      });
      lastSyncEssenceRef.current = serverEssence;
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

      // Refresh game state to ensure all UI components are updated
      await fetchGameState(false);

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to gamble:', err);
      toast.error(err.response?.data?.error || t('essenceTap.gambleFailed', { defaultValue: 'Gamble failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [t, toast, refreshUser, fetchGameState, useWebSocket, flushTapBatch]);

  // Perform infusion for permanent bonus
  const performInfusion = useCallback(async () => {
    // CRITICAL FIX: Wait for pending clicks before infusion
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

      // Update local essence - infusion spends essence, so server is authoritative
      const serverEssence = response.data.essence;
      setLocalEssence(() => {
        localEssenceRef.current = serverEssence;
        return serverEssence;
      });
      lastSyncEssenceRef.current = serverEssence;
      lastSyncTimeRef.current = Date.now();

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
  }, [fetchGameState, t, toast, useWebSocket, flushTapBatch]);

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

      // Refresh both game state and user data in parallel
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
  }, [fetchGameState, refreshUser, t, toast]);

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

      // Refresh both game state and user data to ensure all UI is in sync
      await Promise.all([fetchGameState(false), refreshUser()]);

      return { success: true, ...response.data };
    } catch (err) {
      console.error('Failed to claim streak:', err);
      toast.error(err.response?.data?.error || t('essenceTap.claimFailed', { defaultValue: 'Claim failed' }));
      return { success: false, error: err.response?.data?.error };
    }
  }, [refreshUser, fetchGameState, t, toast]);

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
        // Ability granted bonus essence - use functional update to preserve passive gains
        const serverEssence = response.data.essence;
        setLocalEssence(prev => {
          // Server value includes bonus, should be higher than before
          if (serverEssence >= prev) {
            localEssenceRef.current = serverEssence;
            return serverEssence;
          }
          // Preserve any passive/taps that happened during API call
          return prev;
        });
        lastSyncEssenceRef.current = serverEssence;
        lastSyncTimeRef.current = Date.now();

        // Refresh game state if essence was awarded
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
  }, [t, toast, fetchGameState]);

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
    // Total clicks (updated in real-time for boss counter)
    totalClicks: localTotalClicks,

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

    // ===========================================
    // WEBSOCKET STATUS
    // ===========================================
    // Connection status for UI indicators
    wsConnected,
    wsConnectionState,
    // Request a full sync from server (useful after connection restored)
    requestSync: wsRequestSync,
    // Flush pending actions before SPA navigation
    flushPendingActions,

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
