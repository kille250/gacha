/**
 * Fishing Autofish Hook
 * 
 * Handles the autofish loop with daily limits, in-flight protection,
 * and proper cleanup. Uses reducer pattern for state management.
 * 
 * USAGE:
 * const { isAutofishing, toggleAutofish, autofishLog, dailyStats } = useFishingAutofish({
 *   setUser,
 *   onResult,
 *   onChallengeComplete,
 *   onError
 * });
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { runAutofish, getFishingInfo, getFishingRank, getFishingChallenges } from '../actions/fishingActions';
import { FISHING_TIMING, UI_CONSTANTS } from '../constants/fishingConstants';
import { STALE_THRESHOLDS } from '../cache';

// ===========================================
// REDUCER STATE & ACTIONS
// ===========================================

const initialState = {
  isAutofishing: false,
  autofishLog: [],
  dailyStats: null,
  inFlight: false,
};

const AUTOFISH_ACTIONS = {
  START: 'START',
  STOP: 'STOP',
  TOGGLE: 'TOGGLE',
  SET_IN_FLIGHT: 'SET_IN_FLIGHT',
  CLEAR_IN_FLIGHT: 'CLEAR_IN_FLIGHT',
  ADD_LOG_ENTRY: 'ADD_LOG_ENTRY',
  UPDATE_DAILY_STATS: 'UPDATE_DAILY_STATS',
  CLEAR_LOG: 'CLEAR_LOG',
};

function autofishReducer(state, action) {
  switch (action.type) {
    case AUTOFISH_ACTIONS.START:
      return { ...state, isAutofishing: true, autofishLog: [] };
      
    case AUTOFISH_ACTIONS.STOP:
      return { ...state, isAutofishing: false };
      
    case AUTOFISH_ACTIONS.TOGGLE:
      return { 
        ...state, 
        isAutofishing: !state.isAutofishing,
        autofishLog: !state.isAutofishing ? [] : state.autofishLog,
      };
      
    case AUTOFISH_ACTIONS.SET_IN_FLIGHT:
      return { ...state, inFlight: true };
      
    case AUTOFISH_ACTIONS.CLEAR_IN_FLIGHT:
      return { ...state, inFlight: false };
      
    case AUTOFISH_ACTIONS.ADD_LOG_ENTRY: {
      const { entry, maxBubbles } = action;
      const now = Date.now();
      const filteredLog = state.autofishLog.filter(
        e => now - e.timestamp < UI_CONSTANTS.autofishBubbleLifetime
      );
      return {
        ...state,
        autofishLog: [entry, ...filteredLog].slice(0, maxBubbles),
      };
    }
      
    case AUTOFISH_ACTIONS.UPDATE_DAILY_STATS:
      return { ...state, dailyStats: action.stats };
      
    case AUTOFISH_ACTIONS.CLEAR_LOG:
      return { ...state, autofishLog: [] };
      
    default:
      return state;
  }
}

// ===========================================
// HOOK
// ===========================================

/**
 * Hook for managing autofish functionality
 * @param {Object} options - Configuration options
 * @param {Function} options.setUser - React state setter for user
 * @param {Function} options.onResult - Callback for each autofish result
 * @param {Function} options.onChallengeComplete - Callback when challenge completes
 * @param {Function} options.onError - Error handler callback
 * @param {Function} options.onDailyLimitReached - Callback when daily limit reached
 * @param {Function} options.onDataRefresh - Callback with refreshed data
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
  const [state, dispatch] = useReducer(autofishReducer, initialState);
  
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
      return;
    }
    
    inFlightRef.current = true;
    dispatch({ type: AUTOFISH_ACTIONS.SET_IN_FLIGHT });
    
    // Set failsafe timeout
    failsafeTimeoutRef.current = setTimeout(() => {
      if (inFlightRef.current) {
        console.warn('[Autofish] Request timeout - resetting guard');
        inFlightRef.current = false;
        dispatch({ type: AUTOFISH_ACTIONS.CLEAR_IN_FLIGHT });
      }
    }, FISHING_TIMING.autofishFailsafeTimeout);
    
    try {
      const result = await runAutofish(setUser);
      
      // Update daily stats from response
      if (result.daily) {
        dispatch({
          type: AUTOFISH_ACTIONS.UPDATE_DAILY_STATS,
          stats: {
            used: result.daily.used,
            limit: result.daily.limit,
            remaining: result.daily.remaining,
          },
        });
        
        // Auto-stop if limit reached
        if (result.daily.remaining <= 0) {
          dispatch({ type: AUTOFISH_ACTIONS.STOP });
          onDailyLimitReached?.();
        }
      }
      
      // Add to log
      const maxBubbles = window.innerWidth < 768 
        ? UI_CONSTANTS.maxAutofishBubblesMobile 
        : UI_CONSTANTS.maxAutofishBubblesDesktop;
      
      dispatch({
        type: AUTOFISH_ACTIONS.ADD_LOG_ENTRY,
        entry: {
          fish: result.fish,
          success: result.success,
          timestamp: Date.now(),
        },
        maxBubbles,
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
        dispatch({ type: AUTOFISH_ACTIONS.STOP });
        onDailyLimitReached?.();
      } else if (err.response?.status === 403) {
        dispatch({ type: AUTOFISH_ACTIONS.STOP });
        onError?.(err.response?.data?.message || 'Autofish error');
      }
    } finally {
      // Clear failsafe and reset in-flight guard
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
        failsafeTimeoutRef.current = null;
      }
      inFlightRef.current = false;
      dispatch({ type: AUTOFISH_ACTIONS.CLEAR_IN_FLIGHT });
    }
  }, [setUser, onResult, onChallengeComplete, onError, onDailyLimitReached, onDataRefresh]);
  
  /**
   * Toggle autofish on/off
   */
  const toggleAutofish = useCallback(() => {
    // Check if daily limit already reached
    if (state.dailyStats && state.dailyStats.remaining <= 0) {
      onDailyLimitReached?.();
      return;
    }
    
    dispatch({ type: AUTOFISH_ACTIONS.TOGGLE });
  }, [state.dailyStats, onDailyLimitReached]);
  
  /**
   * Stop autofish
   */
  const stopAutofish = useCallback(() => {
    dispatch({ type: AUTOFISH_ACTIONS.STOP });
  }, []);
  
  /**
   * Update daily stats (called from parent when data is fetched)
   */
  const updateDailyStats = useCallback((stats) => {
    dispatch({ type: AUTOFISH_ACTIONS.UPDATE_DAILY_STATS, stats });
  }, []);
  
  // Autofish interval effect
  useEffect(() => {
    if (!state.isAutofishing) {
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
    };
  }, [state.isAutofishing, processAutofish]);
  
  return {
    isAutofishing: state.isAutofishing,
    toggleAutofish,
    stopAutofish,
    autofishLog: state.autofishLog,
    dailyStats: state.dailyStats,
    updateDailyStats,
    inFlight: state.inFlight,
  };
}

export default useFishingAutofish;
