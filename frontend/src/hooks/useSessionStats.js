/**
 * Session Stats Hook
 * 
 * Manages fishing session statistics with persistence to sessionStorage.
 * Extracted from FishingPage.js for reusability and cleaner component code.
 * 
 * USAGE:
 * const { sessionStats, incrementCasts, updateFromCatch, updateFromAutofish, resetStats } = useSessionStats();
 */

import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS, SESSION_STATS_VALIDITY, isBetterFish } from '../constants/fishingConstants';

/**
 * Initial session stats state
 */
const getInitialStats = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEYS.sessionStats);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.timestamp && Date.now() - parsed.timestamp < SESSION_STATS_VALIDITY) {
        return { 
          casts: parsed.casts || 0, 
          catches: parsed.catches || 0, 
          bestCatch: parsed.bestCatch || null 
        };
      }
    }
  } catch { 
    /* ignore parse errors */ 
  }
  return { casts: 0, catches: 0, bestCatch: null };
};

/**
 * Hook for managing session statistics with persistence
 * @returns {Object} Session stats state and update functions
 */
export function useSessionStats() {
  const [sessionStats, setSessionStats] = useState(getInitialStats);

  // Persist to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.sessionStats, JSON.stringify({
        ...sessionStats,
        timestamp: Date.now()
      }));
    } catch { 
      /* ignore storage errors */ 
    }
  }, [sessionStats]);

  /**
   * Increment cast count
   */
  const incrementCasts = useCallback(() => {
    setSessionStats(prev => ({ ...prev, casts: prev.casts + 1 }));
  }, []);

  /**
   * Update stats after a successful catch
   * @param {Object} result - Catch result from API
   */
  const updateFromCatch = useCallback((result) => {
    const caughtQty = result.fishQuantity || 1;
    setSessionStats(prev => ({
      ...prev,
      catches: prev.catches + caughtQty,
      bestCatch: isBetterFish(result.fish, prev.bestCatch)
        ? { fish: result.fish, quality: result.catchQuality }
        : prev.bestCatch
    }));
  }, []);

  /**
   * Update stats after autofish result
   * @param {Object} result - Autofish result from API
   */
  const updateFromAutofish = useCallback((result) => {
    setSessionStats(prev => ({
      ...prev,
      casts: prev.casts + 1,
      catches: result.success ? prev.catches + 1 : prev.catches,
      bestCatch: result.success && isBetterFish(result.fish, prev.bestCatch)
        ? { fish: result.fish }
        : prev.bestCatch
    }));
  }, []);

  /**
   * Reset all session stats
   */
  const resetStats = useCallback(() => {
    setSessionStats({ casts: 0, catches: 0, bestCatch: null });
  }, []);

  return {
    sessionStats,
    setSessionStats, // For direct updates if needed
    incrementCasts,
    updateFromCatch,
    updateFromAutofish,
    resetStats,
  };
}

export default useSessionStats;

