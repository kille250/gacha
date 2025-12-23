/**
 * Fishing Session Hook
 * 
 * Handles cast/catch API calls and coordinates with the state machine.
 * Isolates API logic from the main component.
 * 
 * USAGE:
 * const { startCast, attemptCatch, handleMiss } = useFishingSession({
 *   dispatch,
 *   timers,
 *   setUser,
 *   onCastSuccess,
 *   onCatchSuccess,
 *   onError
 * });
 */

import { useCallback, useRef } from 'react';
import { castLine, catchFish } from '../actions/fishingActions';
import { FISHING_ACTIONS } from './useFishingState';
import { FISHING_TIMING } from '../constants/fishingConstants';
import { TIMER_IDS } from './useFishingTimers';

/**
 * Hook for managing fishing session API calls
 * @param {Object} options - Configuration options
 * @param {Function} options.dispatch - State machine dispatch function
 * @param {Object} options.timers - Timer control from useFishingTimers
 * @param {Function} options.setUser - React state setter for user
 * @param {Function} options.onCastSuccess - Callback after successful cast
 * @param {Function} options.onCatchSuccess - Callback after successful catch
 * @param {Function} options.onError - Error handler callback
 * @returns {Object} Session control functions
 */
export function useFishingSession({
  dispatch,
  timers,
  setUser,
  onCastSuccess,
  onCatchSuccess,
  onError,
}) {
  // Ref to track current session for async operations
  const sessionRef = useRef(null);
  
  /**
   * Start a fishing cast
   * Sends cast request to server and sets up timing chain
   */
  const startCast = useCallback(async () => {
    try {
      const result = await castLine(setUser);
      const { 
        sessionId, 
        waitTime, 
        missTimeout = 2500, 
        pityTriggered,
        mercyBonus,
        // daily is available in result but not used here
      } = result;
      
      // Store session for reference
      sessionRef.current = sessionId;
      
      // Dispatch cast started
      dispatch({
        type: FISHING_ACTIONS.CAST_STARTED,
        sessionId,
        waitTime,
        missTimeout,
        pityTriggered,
        mercyBonus,
      });
      
      // Set up timing chain
      // 1. Cast animation complete -> waiting
      timers.setTimer(
        TIMER_IDS.CAST_ANIMATION,
        () => {
          dispatch({ type: FISHING_ACTIONS.CAST_ANIMATION_COMPLETE });
          
          // 2. Wait for fish to appear
          timers.setTimer(
            TIMER_IDS.FISH_BITE,
            () => dispatch({ type: FISHING_ACTIONS.FISH_APPEARED }),
            waitTime
          );
        },
        FISHING_TIMING.castAnimationDelay
      );
      
      // Call success callback
      onCastSuccess?.(result);
      
      return result;
    } catch (err) {
      dispatch({ type: FISHING_ACTIONS.CAST_FAILED });
      onError?.(err.response?.data?.error || err.message);
      throw err;
    }
  }, [dispatch, timers, setUser, onCastSuccess, onError]);
  
  /**
   * Internal miss handler (called by miss timeout)
   */
  const handleMissInternal = useCallback(async (missSessionId) => {
    try {
      // Call catch endpoint without reaction time to signal miss
      const result = await catchFish(missSessionId, undefined, setUser);
      
      dispatch({
        type: FISHING_ACTIONS.CATCH_FAILURE,
        fish: result.fish,
        message: result.message,
        missStreak: result.missStreak,
        mercyBonus: result.mercyBonus,
      });
      
      // Set up result dismiss timer
      timers.setTimer(
        TIMER_IDS.RESULT_DISPLAY,
        () => dispatch({ type: FISHING_ACTIONS.RESULT_DISMISSED }),
        FISHING_TIMING.resultDisplayDuration
      );
    } catch (err) {
      dispatch({ type: FISHING_ACTIONS.RESULT_DISMISSED });
    }
  }, [dispatch, timers, setUser]);

  /**
   * Set up miss timeout when fish appears
   * Called when transitioning to FISH_APPEARED state
   * @param {string} sessionId - Current session ID
   * @param {number} missTimeout - Timeout duration in ms
   */
  const setupMissTimeout = useCallback((currentSessionId, missTimeoutDuration) => {
    timers.setTimer(
      TIMER_IDS.MISS_TIMEOUT,
      () => {
        dispatch({ type: FISHING_ACTIONS.MISS_TIMEOUT });
        // Miss is processed as a catch attempt without reaction time
        handleMissInternal(currentSessionId);
      },
      missTimeoutDuration
    );
  }, [timers, dispatch, handleMissInternal]);
  
  /**
   * Attempt to catch the fish
   * @param {string} sessionId - Current session ID
   * @param {number} reactionTime - Reaction time in ms
   */
  const attemptCatch = useCallback(async (sessionId, reactionTime) => {
    // Clear miss timeout
    timers.clearTimer(TIMER_IDS.MISS_TIMEOUT);
    
    // Dispatch catch started
    dispatch({ type: FISHING_ACTIONS.CATCH_STARTED });
    
    try {
      const result = await catchFish(sessionId, reactionTime, setUser);
      
      if (result.success) {
        dispatch({
          type: FISHING_ACTIONS.CATCH_SUCCESS,
          fish: result.fish,
          catchQuality: result.catchQuality,
          fishQuantity: result.fishQuantity,
          reactionTime: result.reactionTime,
          streak: result.streak,
          streakBonus: result.streakBonus,
          pityTriggered: result.pityTriggered,
          challengesCompleted: result.challengesCompleted,
        });
        
        onCatchSuccess?.(result);
      } else {
        dispatch({
          type: FISHING_ACTIONS.CATCH_FAILURE,
          fish: result.fish,
          reactionTime: result.reactionTime,
          timingWindow: result.timingWindow,
          missStreak: result.missStreak,
          mercyBonus: result.mercyBonus,
          message: result.message,
        });
      }
      
      // Set up result dismiss timer
      timers.setTimer(
        TIMER_IDS.RESULT_DISPLAY,
        () => dispatch({ type: FISHING_ACTIONS.RESULT_DISMISSED }),
        FISHING_TIMING.resultDisplayDuration
      );
      
      return result;
    } catch (err) {
      dispatch({ type: FISHING_ACTIONS.RESULT_DISMISSED });
      onError?.(err.response?.data?.error || err.message);
      throw err;
    }
  }, [dispatch, timers, setUser, onCatchSuccess, onError]);
  
  /**
   * Cancel current fishing session (cleanup)
   */
  const cancelSession = useCallback(() => {
    timers.clearTimer(TIMER_IDS.CAST_ANIMATION);
    timers.clearTimer(TIMER_IDS.FISH_BITE);
    timers.clearTimer(TIMER_IDS.MISS_TIMEOUT);
    timers.clearTimer(TIMER_IDS.RESULT_DISPLAY);
    sessionRef.current = null;
    dispatch({ type: FISHING_ACTIONS.RESET });
  }, [timers, dispatch]);
  
  return {
    startCast,
    attemptCatch,
    setupMissTimeout,
    cancelSession,
    currentSessionId: sessionRef.current,
  };
}

export default useFishingSession;

