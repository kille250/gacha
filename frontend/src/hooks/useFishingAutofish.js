/**
 * Fishing Autofish Hook
 * 
 * Handles the autofish loop with daily limits, in-flight protection,
 * and proper cleanup.
 * 
 * USAGE:
 * const { isAutofishing, toggleAutofish, autofishLog, dailyStats } = useFishingAutofish({
 *   setUser,
 *   onResult,
 *   onChallengeComplete,
 *   onError
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { runAutofish, getFishingInfo, getFishingRank, getFishingChallenges } from '../actions/fishingActions';
import { FISHING_TIMING, UI_CONSTANTS } from '../constants/fishingConstants';
import { STALE_THRESHOLDS } from '../cache';

/**
 * Hook for managing autofish functionality
 * @param {Object} options - Configuration options
 * @param {Function} options.setUser - React state setter for user
 * @param {Function} options.onResult - Callback for each autofish result
 * @param {Function} options.onChallengeComplete - Callback when challenge completes
 * @param {Function} options.onError - Error handler callback
 * @param {Function} options.onDailyLimitReached - Callback when daily limit reached
 * @param {Function} options.onDataRefresh - Callback with refreshed data (fishInfo, rankData, challenges)
 * @returns {Object} Autofish state and controls
 */
export function useFishingAutofish({
  setUser,
  onResult,
  onChallengeComplete,
  onError,
  onDailyLimitReached,
  onDataRefresh,
}) {
  const [isAutofishing, setIsAutofishing] = useState(false);
  const [autofishLog, setAutofishLog] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);
  const [inFlight, setInFlight] = useState(false);
  
  // Refs for interval and timeout management
  const intervalRef = useRef(null);
  const inFlightRef = useRef(false);
  const failsafeTimeoutRef = useRef(null);
  const lastRefreshRef = useRef(Date.now());
  
  /**
   * Process a single autofish attempt
   */
  const processAutofish = useCallback(async () => {
    // Skip if previous request still in flight
    if (inFlightRef.current) {
      console.debug('[Autofish] Skipping - previous request in flight');
      return;
    }
    
    inFlightRef.current = true;
    setInFlight(true);
    
    // Set failsafe timeout
    failsafeTimeoutRef.current = setTimeout(() => {
      if (inFlightRef.current) {
        console.warn('[Autofish] Request timeout - resetting in-flight guard');
        inFlightRef.current = false;
        setInFlight(false);
      }
    }, FISHING_TIMING.autofishFailsafeTimeout);
    
    try {
      const result = await runAutofish(setUser);
      
      // Update daily stats from response
      if (result.daily) {
        setDailyStats({
          used: result.daily.used,
          limit: result.daily.limit,
          remaining: result.daily.remaining,
        });
        
        // Auto-stop if limit reached
        if (result.daily.remaining <= 0) {
          setIsAutofishing(false);
          onDailyLimitReached?.();
        }
      }
      
      // Add to log
      const now = Date.now();
      const maxBubbles = window.innerWidth < 768 
        ? UI_CONSTANTS.maxAutofishBubblesMobile 
        : UI_CONSTANTS.maxAutofishBubblesDesktop;
      
      setAutofishLog(prev => {
        const newEntry = {
          fish: result.fish,
          success: result.success,
          timestamp: now,
        };
        return [
          newEntry,
          ...prev.filter(e => now - e.timestamp < UI_CONSTANTS.autofishBubbleLifetime)
        ].slice(0, maxBubbles);
      });
      
      // Notify parent
      onResult?.(result);
      
      // Handle challenge completions
      if (result.challengesCompleted?.length > 0) {
        result.challengesCompleted.forEach(ch => onChallengeComplete?.(ch));
      }
      
      // Periodic data refresh during long sessions
      const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
      if (timeSinceLastRefresh > (STALE_THRESHOLDS?.normal || 120000)) {
        lastRefreshRef.current = Date.now();
        try {
          const [fishInfo, rankData, challenges] = await Promise.all([
            getFishingInfo(),
            getFishingRank(),
            getFishingChallenges(),
          ]);
          onDataRefresh?.({ fishInfo, rankData, challenges });
        } catch {
          // Silent fail - non-critical periodic refresh
        }
      }
      
      return result;
    } catch (err) {
      if (err.response?.status === 429 && err.response?.data?.error === 'Daily limit reached') {
        setIsAutofishing(false);
        onDailyLimitReached?.();
      } else if (err.response?.status === 403) {
        setIsAutofishing(false);
        onError?.(err.response?.data?.message || 'Autofish error');
      }
    } finally {
      // Clear failsafe and reset in-flight guard
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
        failsafeTimeoutRef.current = null;
      }
      inFlightRef.current = false;
      setInFlight(false);
    }
  }, [setUser, onResult, onChallengeComplete, onError, onDailyLimitReached, onDataRefresh]);
  
  /**
   * Toggle autofish on/off
   */
  const toggleAutofish = useCallback(() => {
    // Check if daily limit already reached
    if (dailyStats && dailyStats.remaining <= 0) {
      onDailyLimitReached?.();
      return;
    }
    
    setIsAutofishing(prev => !prev);
    setAutofishLog([]);
  }, [dailyStats, onDailyLimitReached]);
  
  /**
   * Stop autofish
   */
  const stopAutofish = useCallback(() => {
    setIsAutofishing(false);
  }, []);
  
  // Autofish interval effect
  useEffect(() => {
    if (!isAutofishing) {
      lastRefreshRef.current = Date.now();
      return;
    }
    
    intervalRef.current = setInterval(processAutofish, FISHING_TIMING.autofishInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
        failsafeTimeoutRef.current = null;
      }
      inFlightRef.current = false;
      setInFlight(false);
    };
  }, [isAutofishing, processAutofish]);
  
  /**
   * Update daily stats (called from parent when data is fetched)
   */
  const updateDailyStats = useCallback((stats) => {
    setDailyStats(stats);
  }, []);
  
  return {
    isAutofishing,
    toggleAutofish,
    stopAutofish,
    autofishLog,
    dailyStats,
    updateDailyStats,
    inFlight,
  };
}

export default useFishingAutofish;

