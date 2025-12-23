/**
 * Fishing State Machine Hook
 * 
 * Centralizes all fishing game state transitions into an explicit state machine.
 * This replaces scattered setState calls with a single dispatch mechanism.
 * 
 * STATES:
 * - walking: Player can move and cast
 * - casting: Animation playing after cast
 * - waiting: Waiting for fish to bite
 * - fish_appeared: Fish is available to catch (time-limited)
 * - catching: API call in progress
 * - success: Showing successful catch result
 * - failure: Showing failed catch result
 * 
 * USAGE:
 * const { state, dispatch, canCast, canCatch } = useFishingState();
 * dispatch({ type: 'CAST_STARTED', sessionId, waitTime, missTimeout });
 */

import { useReducer, useCallback, useMemo } from 'react';
import { GAME_STATES } from '../constants/fishingConstants';

// ===========================================
// INITIAL STATE
// ===========================================

const initialState = {
  // Current game state
  type: GAME_STATES.WALKING,
  
  // Session data (set during fishing)
  sessionId: null,
  waitTime: null,
  missTimeout: null,
  
  // Timing data
  castStartTime: null,
  fishAppearedTime: null,
  
  // Result data
  lastResult: null,
  
  // Additional context
  pityTriggered: false,
  mercyBonus: null,
};

// ===========================================
// ACTION TYPES
// ===========================================

export const FISHING_ACTIONS = {
  // Cast flow
  CAST_STARTED: 'CAST_STARTED',
  CAST_ANIMATION_COMPLETE: 'CAST_ANIMATION_COMPLETE',
  FISH_APPEARED: 'FISH_APPEARED',
  
  // Catch flow
  CATCH_STARTED: 'CATCH_STARTED',
  CATCH_SUCCESS: 'CATCH_SUCCESS',
  CATCH_FAILURE: 'CATCH_FAILURE',
  
  // Miss flow
  MISS_TIMEOUT: 'MISS_TIMEOUT',
  
  // Reset
  RESULT_DISMISSED: 'RESULT_DISMISSED',
  RESET: 'RESET',
  
  // Error handling
  CAST_FAILED: 'CAST_FAILED',
};

// ===========================================
// REDUCER
// ===========================================

function fishingReducer(state, action) {
  switch (action.type) {
    // ===== CAST FLOW =====
    case FISHING_ACTIONS.CAST_STARTED:
      // Only valid from walking state
      if (state.type !== GAME_STATES.WALKING) {
        console.warn(`[FishingState] Invalid transition: ${state.type} -> CAST_STARTED`);
        return state;
      }
      return {
        ...state,
        type: GAME_STATES.CASTING,
        sessionId: action.sessionId,
        waitTime: action.waitTime,
        missTimeout: action.missTimeout,
        castStartTime: Date.now(),
        pityTriggered: action.pityTriggered || false,
        mercyBonus: action.mercyBonus || null,
        lastResult: null,
      };
    
    case FISHING_ACTIONS.CAST_ANIMATION_COMPLETE:
      // Only valid from casting state
      if (state.type !== GAME_STATES.CASTING) {
        return state;
      }
      return {
        ...state,
        type: GAME_STATES.WAITING,
      };
    
    case FISHING_ACTIONS.FISH_APPEARED:
      // Only valid from waiting state
      if (state.type !== GAME_STATES.WAITING) {
        return state;
      }
      return {
        ...state,
        type: GAME_STATES.FISH_APPEARED,
        fishAppearedTime: Date.now(),
      };
    
    // ===== CATCH FLOW =====
    case FISHING_ACTIONS.CATCH_STARTED:
      // Only valid from fish_appeared state
      if (state.type !== GAME_STATES.FISH_APPEARED) {
        return state;
      }
      return {
        ...state,
        type: GAME_STATES.CATCHING,
      };
    
    case FISHING_ACTIONS.CATCH_SUCCESS:
      // Valid from catching state
      if (state.type !== GAME_STATES.CATCHING) {
        return state;
      }
      return {
        ...state,
        type: GAME_STATES.SUCCESS,
        lastResult: {
          success: true,
          fish: action.fish,
          catchQuality: action.catchQuality,
          fishQuantity: action.fishQuantity,
          reactionTime: action.reactionTime,
          streak: action.streak,
          streakBonus: action.streakBonus,
          pityTriggered: action.pityTriggered,
          challengesCompleted: action.challengesCompleted,
        },
      };
    
    case FISHING_ACTIONS.CATCH_FAILURE:
      // Valid from catching state
      if (state.type !== GAME_STATES.CATCHING) {
        return state;
      }
      return {
        ...state,
        type: GAME_STATES.FAILURE,
        lastResult: {
          success: false,
          fish: action.fish,
          reactionTime: action.reactionTime,
          timingWindow: action.timingWindow,
          missStreak: action.missStreak,
          mercyBonus: action.mercyBonus,
          message: action.message,
        },
      };
    
    // ===== MISS FLOW =====
    case FISHING_ACTIONS.MISS_TIMEOUT:
      // Only valid from fish_appeared state
      if (state.type !== GAME_STATES.FISH_APPEARED) {
        return state;
      }
      // Transition to catching (miss is processed by catch endpoint)
      return {
        ...state,
        type: GAME_STATES.CATCHING,
      };
    
    // ===== RESET =====
    case FISHING_ACTIONS.RESULT_DISMISSED:
      // Only valid from success or failure state
      if (state.type !== GAME_STATES.SUCCESS && state.type !== GAME_STATES.FAILURE) {
        return state;
      }
      return {
        ...state,
        type: GAME_STATES.WALKING,
        sessionId: null,
        waitTime: null,
        missTimeout: null,
        castStartTime: null,
        fishAppearedTime: null,
        pityTriggered: false,
        mercyBonus: null,
        // Keep lastResult for UI reference
      };
    
    case FISHING_ACTIONS.RESET:
      return {
        ...initialState,
        lastResult: state.lastResult, // Preserve for display
      };
    
    case FISHING_ACTIONS.CAST_FAILED:
      // Reset to walking on cast failure
      return {
        ...state,
        type: GAME_STATES.WALKING,
        sessionId: null,
        waitTime: null,
        missTimeout: null,
        castStartTime: null,
      };
    
    default:
      console.warn(`[FishingState] Unknown action: ${action.type}`);
      return state;
  }
}

// ===========================================
// HOOK
// ===========================================

/**
 * Hook for managing fishing game state with explicit state machine
 * @returns {Object} State and dispatch functions
 */
export function useFishingState() {
  const [state, dispatch] = useReducer(fishingReducer, initialState);
  
  // Derived state: can player cast?
  const canCast = useMemo(() => {
    return state.type === GAME_STATES.WALKING;
  }, [state.type]);
  
  // Derived state: can player attempt catch?
  const canCatch = useMemo(() => {
    return state.type === GAME_STATES.FISH_APPEARED && state.sessionId;
  }, [state.type, state.sessionId]);
  
  // Derived state: is fishing active?
  const isFishing = useMemo(() => {
    return state.type !== GAME_STATES.WALKING;
  }, [state.type]);
  
  // Derived state: is showing result?
  const isShowingResult = useMemo(() => {
    return state.type === GAME_STATES.SUCCESS || state.type === GAME_STATES.FAILURE;
  }, [state.type]);
  
  // Helper to get reaction time
  const getReactionTime = useCallback(() => {
    if (!state.fishAppearedTime) return 0;
    return Date.now() - state.fishAppearedTime;
  }, [state.fishAppearedTime]);
  
  return {
    state,
    dispatch,
    canCast,
    canCatch,
    isFishing,
    isShowingResult,
    getReactionTime,
    
    // Expose state type for backward compatibility
    gameState: state.type,
    sessionId: state.sessionId,
    lastResult: state.lastResult,
  };
}

export default useFishingState;

