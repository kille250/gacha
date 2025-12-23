/**
 * Fishing State Machine Hook
 * 
 * Centralizes all fishing game state transitions into an explicit state machine.
 * This replaces scattered setState calls with a single dispatch mechanism.
 * 
 * STATE DIAGRAM:
 * 
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                                                             │
 *   │  ┌─────────┐    CAST_STARTED    ┌─────────┐                │
 *   │  │ WALKING │ ─────────────────► │ CASTING │                │
 *   │  └─────────┘                    └────┬────┘                │
 *   │       ▲                              │                      │
 *   │       │                   CAST_ANIMATION_COMPLETE           │
 *   │       │                              │                      │
 *   │       │                              ▼                      │
 *   │       │                        ┌─────────┐                  │
 *   │  RESULT_DISMISSED              │ WAITING │                  │
 *   │       │                        └────┬────┘                  │
 *   │       │                             │                       │
 *   │       │                      FISH_APPEARED                  │
 *   │       │                             │                       │
 *   │       │                             ▼                       │
 *   │  ┌────┴────┐                ┌──────────────┐               │
 *   │  │ SUCCESS │◄───────────────│ FISH_APPEARED │               │
 *   │  └─────────┘  CATCH_SUCCESS └───────┬──────┘               │
 *   │       ▲                             │                       │
 *   │       │                    CATCH_STARTED /                  │
 *   │       │                    MISS_TIMEOUT                     │
 *   │       │                             │                       │
 *   │       │                             ▼                       │
 *   │       │                       ┌──────────┐                  │
 *   │       └───────────────────────│ CATCHING │                  │
 *   │                               └────┬─────┘                  │
 *   │  ┌─────────┐                       │                       │
 *   │  │ FAILURE │◄──────────────────────┘                       │
 *   │  └────┬────┘    CATCH_FAILURE                              │
 *   │       │                                                     │
 *   │       └──────── RESULT_DISMISSED ───────────────────────────┘
 *   │                                                             │
 *   └─────────────────────────────────────────────────────────────┘
 * 
 * @module useFishingState
 */

import { useReducer, useCallback, useMemo } from 'react';
import { GAME_STATES } from '../constants/fishingConstants';

// ===========================================
// TYPE DEFINITIONS (JSDoc)
// ===========================================

/**
 * @typedef {Object} FishResult
 * @property {string} id - Fish identifier
 * @property {string} name - Fish display name
 * @property {string} emoji - Fish emoji
 * @property {string} rarity - Rarity level
 */

/**
 * @typedef {Object} CatchResult
 * @property {boolean} success - Whether catch was successful
 * @property {FishResult} fish - The fish that was caught/missed
 * @property {string} [catchQuality] - Quality of catch (perfect, good, ok)
 * @property {number} [fishQuantity] - Number of fish caught
 * @property {number} [reactionTime] - Player reaction time in ms
 * @property {number} [streak] - Current catch streak
 * @property {Object} [streakBonus] - Streak bonus info
 * @property {boolean} [pityTriggered] - Whether pity system triggered
 * @property {Array} [challengesCompleted] - Completed challenges
 * @property {number} [timingWindow] - Allowed timing window
 * @property {number} [missStreak] - Current miss streak
 * @property {number} [mercyBonus] - Mercy timer bonus
 * @property {string} [message] - Result message
 */

/**
 * @typedef {Object} FishingState
 * @property {string} type - Current game state from GAME_STATES
 * @property {string|null} sessionId - Active fishing session ID
 * @property {number|null} waitTime - Wait time until fish appears
 * @property {number|null} missTimeout - Time window to catch fish
 * @property {number|null} castStartTime - Timestamp when cast started
 * @property {number|null} fishAppearedTime - Timestamp when fish appeared
 * @property {CatchResult|null} lastResult - Last catch/miss result
 * @property {boolean} pityTriggered - Whether pity triggered on this cast
 * @property {number|null} mercyBonus - Mercy bonus for next cast
 */

/**
 * @typedef {Object} FishingStateHook
 * @property {FishingState} state - Current state object
 * @property {Function} dispatch - Raw dispatch function
 * @property {Object} actions - Action creator functions
 * @property {boolean} canCast - Whether player can start casting
 * @property {boolean} canCatch - Whether player can attempt catch
 * @property {boolean} isFishing - Whether fishing is active
 * @property {boolean} isShowingResult - Whether result is displayed
 * @property {boolean} showBiteAlert - Whether fish appeared alert shows
 * @property {boolean} canMove - Whether player can move
 * @property {Function} getReactionTime - Get current reaction time
 * @property {string} gameState - Current game state type
 * @property {string|null} sessionId - Current session ID
 * @property {CatchResult|null} lastResult - Last result data
 */

// ===========================================
// INITIAL STATE
// ===========================================

/** @type {FishingState} */
const initialState = {
  type: GAME_STATES.WALKING,
  sessionId: null,
  waitTime: null,
  missTimeout: null,
  castStartTime: null,
  fishAppearedTime: null,
  lastResult: null,
  pityTriggered: false,
  mercyBonus: null,
};

// ===========================================
// ACTION TYPES
// ===========================================

/**
 * Action types for the fishing state machine
 * @readonly
 * @enum {string}
 */
export const FISHING_ACTIONS = {
  CAST_STARTED: 'CAST_STARTED',
  CAST_ANIMATION_COMPLETE: 'CAST_ANIMATION_COMPLETE',
  FISH_APPEARED: 'FISH_APPEARED',
  CATCH_STARTED: 'CATCH_STARTED',
  CATCH_SUCCESS: 'CATCH_SUCCESS',
  CATCH_FAILURE: 'CATCH_FAILURE',
  MISS_TIMEOUT: 'MISS_TIMEOUT',
  RESULT_DISMISSED: 'RESULT_DISMISSED',
  RESET: 'RESET',
  CAST_FAILED: 'CAST_FAILED',
};

// ===========================================
// REDUCER
// ===========================================

/**
 * State machine reducer for fishing game
 * @param {FishingState} state - Current state
 * @param {Object} action - Dispatched action
 * @returns {FishingState} New state
 */
function fishingReducer(state, action) {
  switch (action.type) {
    case FISHING_ACTIONS.CAST_STARTED:
      if (state.type !== GAME_STATES.WALKING) return state;
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
      if (state.type !== GAME_STATES.CASTING) return state;
      return { ...state, type: GAME_STATES.WAITING };
    
    case FISHING_ACTIONS.FISH_APPEARED:
      if (state.type !== GAME_STATES.WAITING) return state;
      return {
        ...state,
        type: GAME_STATES.FISH_APPEARED,
        fishAppearedTime: Date.now(),
      };
    
    case FISHING_ACTIONS.CATCH_STARTED:
      if (state.type !== GAME_STATES.FISH_APPEARED) return state;
      return { ...state, type: GAME_STATES.CATCHING };
    
    case FISHING_ACTIONS.CATCH_SUCCESS:
      if (state.type !== GAME_STATES.CATCHING) return state;
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
      if (state.type !== GAME_STATES.CATCHING) return state;
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
    
    case FISHING_ACTIONS.MISS_TIMEOUT:
      if (state.type !== GAME_STATES.FISH_APPEARED) return state;
      return { ...state, type: GAME_STATES.CATCHING };
    
    case FISHING_ACTIONS.RESULT_DISMISSED:
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
      };
    
    case FISHING_ACTIONS.RESET:
      return { ...initialState, lastResult: state.lastResult };
    
    case FISHING_ACTIONS.CAST_FAILED:
      return {
        ...state,
        type: GAME_STATES.WALKING,
        sessionId: null,
        waitTime: null,
        missTimeout: null,
        castStartTime: null,
      };
    
    default:
      return state;
  }
}

// ===========================================
// HOOK
// ===========================================

/**
 * Hook for managing fishing game state with explicit state machine
 * @returns {FishingStateHook} State and dispatch functions
 */
export function useFishingState() {
  const [state, dispatch] = useReducer(fishingReducer, initialState);
  
  // ===========================================
  // DERIVED STATE
  // ===========================================
  
  const canCast = useMemo(() => state.type === GAME_STATES.WALKING, [state.type]);
  const canCatch = useMemo(() => state.type === GAME_STATES.FISH_APPEARED && state.sessionId, [state.type, state.sessionId]);
  const isFishing = useMemo(() => state.type !== GAME_STATES.WALKING, [state.type]);
  const isShowingResult = useMemo(() => state.type === GAME_STATES.SUCCESS || state.type === GAME_STATES.FAILURE, [state.type]);
  const showBiteAlert = useMemo(() => state.type === GAME_STATES.FISH_APPEARED, [state.type]);
  const canMove = useMemo(() => state.type === GAME_STATES.WALKING, [state.type]);
  
  // ===========================================
  // ACTION CREATORS
  // ===========================================
  
  const actions = useMemo(() => ({
    startCast: ({ sessionId, waitTime, missTimeout, pityTriggered, mercyBonus }) => 
      dispatch({
        type: FISHING_ACTIONS.CAST_STARTED,
        sessionId,
        waitTime,
        missTimeout,
        pityTriggered,
        mercyBonus,
      }),
    
    castAnimationComplete: () => dispatch({ type: FISHING_ACTIONS.CAST_ANIMATION_COMPLETE }),
    fishAppeared: () => dispatch({ type: FISHING_ACTIONS.FISH_APPEARED }),
    catchStarted: () => dispatch({ type: FISHING_ACTIONS.CATCH_STARTED }),
    
    catchSuccess: ({ fish, catchQuality, fishQuantity, reactionTime, streak, streakBonus, pityTriggered, challengesCompleted }) => 
      dispatch({
        type: FISHING_ACTIONS.CATCH_SUCCESS,
        fish,
        catchQuality,
        fishQuantity,
        reactionTime,
        streak,
        streakBonus,
        pityTriggered,
        challengesCompleted,
      }),
    
    catchFailure: ({ fish, reactionTime, timingWindow, missStreak, mercyBonus, message }) => 
      dispatch({
        type: FISHING_ACTIONS.CATCH_FAILURE,
        fish,
        reactionTime,
        timingWindow,
        missStreak,
        mercyBonus,
        message,
      }),
    
    missTimeout: () => dispatch({ type: FISHING_ACTIONS.MISS_TIMEOUT }),
    resultDismissed: () => dispatch({ type: FISHING_ACTIONS.RESULT_DISMISSED }),
    reset: () => dispatch({ type: FISHING_ACTIONS.RESET }),
    castFailed: () => dispatch({ type: FISHING_ACTIONS.CAST_FAILED }),
  }), []);
  
  // ===========================================
  // HELPERS
  // ===========================================
  
  const getReactionTime = useCallback(() => {
    if (!state.fishAppearedTime) return 0;
    return Date.now() - state.fishAppearedTime;
  }, [state.fishAppearedTime]);
  
  return {
    state,
    dispatch,
    actions,
    canCast,
    canCatch,
    isFishing,
    isShowingResult,
    showBiteAlert,
    canMove,
    getReactionTime,
    gameState: state.type,
    sessionId: state.sessionId,
    lastResult: state.lastResult,
  };
}

export default useFishingState;
