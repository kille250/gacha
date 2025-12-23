/**
 * Fishing Session Hook
 * 
 * Handles cast/catch API calls and coordinates with the state machine.
 * Isolates API logic from the main component.
 * 
 * The entire timing chain (cast animation -> wait -> fish appears -> miss timeout)
 * is fully encapsulated here. The component just needs to call startCast().
 * 
 * USAGE:
 * const { startCast, attemptCatch, cancelSession } = useFishingSession({
 *   dispatch,
 *   timers,
 *   setUser,
 *   onCastSuccess,
 *   onCatchSuccess,
 *   onError
 * });
 */

import { useCallback } from 'react';
import { castLine, catchFish, reportMiss } from '../actions/fishingActions';
import { FISHING_ACTIONS } from './useFishingState';
import { FISHING_TIMING } from '../constants/fishingConstants';
import { TIMER_IDS } from './useFishingTimers';

/**
 * Set up result dismiss timer (unified handler)
 * @param {Object} timers - Timer control from useFishingTimers
 * @param {Function} dispatch - State machine dispatch function
 */
function scheduleResultDismiss(timers, dispatch) {
  timers.setTimer(
    TIMER_IDS.RESULT_DISPLAY,
    () => dispatch({ type: FISHING_ACTIONS.RESULT_DISMISSED }),
    FISHING_TIMING.resultDisplayDuration
  );
}

/**
 * Creates the timing chain for a fishing session.
 * 
 * Timeline:
 * 1. Cast animation (600ms) → CAST_ANIMATION_COMPLETE
 * 2. Wait for fish (waitTime) → FISH_APPEARED
 * 3. Miss timeout (missTimeout) → MISS_TIMEOUT → report miss
 * 
 * @param {Object} timers - Timer control from useFishingTimers
 * @param {Function} dispatch - State machine dispatch function
 * @param {string} sessionId - Current session ID
 * @param {number} waitTime - Time until fish appears (from server)
 * @param {number} missTimeout - Time window to catch (from server)
 * @param {Function} handleMissTimeout - Callback for miss timeout
 */
function createTimingChain(timers, dispatch, sessionId, waitTime, missTimeout, handleMissTimeout) {
  // Step 3: Miss timeout handler (player failed to catch in time)
  const handleMissTimeoutTrigger = () => {
    dispatch({ type: FISHING_ACTIONS.MISS_TIMEOUT });
    handleMissTimeout(sessionId);
  };
  
  // Step 2: Fish bite handler (fish appears, start miss timer)
  const handleFishBite = () => {
    dispatch({ type: FISHING_ACTIONS.FISH_APPEARED });
    timers.setTimer(TIMER_IDS.MISS_TIMEOUT, handleMissTimeoutTrigger, missTimeout);
  };
  
  // Step 1: Cast animation complete handler (start waiting for fish)
  const handleCastAnimationComplete = () => {
    dispatch({ type: FISHING_ACTIONS.CAST_ANIMATION_COMPLETE });
    timers.setTimer(TIMER_IDS.FISH_BITE, handleFishBite, waitTime);
  };
  
  // Start the chain with cast animation
  timers.setTimer(TIMER_IDS.CAST_ANIMATION, handleCastAnimationComplete, FISHING_TIMING.castAnimationDelay);
}

/**
 * Hook for managing fishing session API calls
 * 
 * Handles cast/catch API coordination with the state machine.
 * The timing chain (cast animation → wait → fish appears → miss timeout)
 * is fully encapsulated here using named handler functions for clarity.
 * 
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
  /**
   * Handle miss timeout - called when player fails to catch in time
   * Uses explicit reportMiss action for clear API contract
   */
  const handleMissTimeout = useCallback(async (missSessionId) => {
    try {
      const result = await reportMiss(missSessionId, setUser);
      
      dispatch({
        type: FISHING_ACTIONS.CATCH_FAILURE,
        fish: result.fish,
        message: result.message,
        missStreak: result.missStreak,
        mercyBonus: result.mercyBonus,
      });
      
      // Schedule result dismiss (unified)
      scheduleResultDismiss(timers, dispatch);
    } catch {
      dispatch({ type: FISHING_ACTIONS.RESULT_DISMISSED });
    }
  }, [dispatch, timers, setUser]);

  /**
   * Start a fishing cast
   * Sends cast request to server and sets up the timing chain.
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
      } = result;
      
      // Dispatch cast started to state machine
      dispatch({
        type: FISHING_ACTIONS.CAST_STARTED,
        sessionId,
        waitTime,
        missTimeout,
        pityTriggered,
        mercyBonus,
      });
      
      // Set up the timing chain (cast animation → wait → fish → miss timeout)
      createTimingChain(timers, dispatch, sessionId, waitTime, missTimeout, handleMissTimeout);
      
      // Call success callback
      onCastSuccess?.(result);
      
      return result;
    } catch (err) {
      dispatch({ type: FISHING_ACTIONS.CAST_FAILED });
      onError?.(err.response?.data?.error || err.message);
      throw err;
    }
  }, [dispatch, timers, setUser, onCastSuccess, onError, handleMissTimeout]);
  
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
      
      // Schedule result dismiss (unified)
      scheduleResultDismiss(timers, dispatch);
      
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
    dispatch({ type: FISHING_ACTIONS.RESET });
  }, [timers, dispatch]);
  
  return {
    startCast,
    attemptCatch,
    cancelSession,
  };
}

export default useFishingSession;
