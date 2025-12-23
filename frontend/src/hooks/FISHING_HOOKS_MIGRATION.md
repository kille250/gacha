# Fishing Hooks Migration Guide

This document explains how to migrate `FishingPage.js` to use the new centralized fishing hooks.

## New Hooks Overview

| Hook | Purpose |
|------|---------|
| `useFishingTimers` | Centralized timeout management with automatic cleanup |
| `useFishingState` | Explicit state machine for game states |
| `useFishingSession` | Cast/catch API calls with state coordination |
| `useFishingAutofish` | Autofish loop with daily limits |
| `useFishingMultiplayer` | WebSocket connection for multiplayer |

## Migration Example

### Before (scattered state)

```jsx
// FishingPage.js - Original pattern
const [gameState, setGameState] = useState(GAME_STATES.WALKING);
const [sessionId, setSessionId] = useState(null);
const [lastResult, setLastResult] = useState(null);
const fishAppearedTime = useRef(null);
const waitTimeoutRef = useRef(null);
const missTimeoutRef = useRef(null);

const startFishing = useCallback(async () => {
  setLastResult(null);
  setGameState(GAME_STATES.CASTING);
  
  try {
    const result = await castLine(setUser);
    setSessionId(result.sessionId);
    
    setTimeout(() => {
      setGameState(GAME_STATES.WAITING);
      
      waitTimeoutRef.current = setTimeout(() => {
        fishAppearedTime.current = Date.now();
        setGameState(GAME_STATES.FISH_APPEARED);
        
        missTimeoutRef.current = setTimeout(() => {
          handleMiss(result.sessionId);
        }, result.missTimeout);
      }, result.waitTime);
    }, 600);
  } catch (err) {
    setGameState(GAME_STATES.WALKING);
  }
}, [/* ... */]);
```

### After (centralized hooks)

```jsx
// FishingPage.js - New pattern
import { 
  useFishingTimers, 
  useFishingState, 
  useFishingSession 
} from '../hooks';

const FishingPage = () => {
  const timers = useFishingTimers();
  const { 
    state, 
    dispatch, 
    canCast, 
    canCatch, 
    gameState,
    sessionId,
    lastResult,
    getReactionTime 
  } = useFishingState();
  
  const { startCast, attemptCatch, setupMissTimeout } = useFishingSession({
    dispatch,
    timers,
    setUser,
    onCastSuccess: (result) => {
      // Update session stats, etc.
    },
    onCatchSuccess: (result) => {
      // Show notifications, update pity, etc.
    },
    onError: (message) => showNotification(message, 'error'),
  });
  
  // Set up miss timeout when fish appears
  useEffect(() => {
    if (gameState === GAME_STATES.FISH_APPEARED && sessionId && state.missTimeout) {
      setupMissTimeout(sessionId, state.missTimeout);
    }
  }, [gameState, sessionId, state.missTimeout, setupMissTimeout]);
  
  // Handle cast button click
  const handleCast = useCallback(() => {
    if (canCast && canFish) {
      startCast();
    }
  }, [canCast, canFish, startCast]);
  
  // Handle catch button click
  const handleCatch = useCallback(() => {
    if (canCatch) {
      attemptCatch(sessionId, getReactionTime());
    }
  }, [canCatch, sessionId, attemptCatch, getReactionTime]);
  
  // ... rest of component
};
```

## Benefits

1. **Explicit State Machine**: All valid state transitions are documented in `useFishingState.js`
2. **Automatic Timer Cleanup**: No more manual `clearTimeout` in cleanup effects
3. **Isolated Side Effects**: API calls are separated from state management
4. **Testable**: Each hook can be unit tested in isolation
5. **Reduced Cognitive Load**: 5500 lines → smaller focused modules

## File Structure

```
src/
├── constants/
│   └── fishingConstants.js    # Shared constants (timing, states, etc.)
├── hooks/
│   ├── useFishingTimers.js    # Timer management
│   ├── useFishingState.js     # State machine
│   ├── useFishingSession.js   # Cast/catch API
│   ├── useFishingAutofish.js  # Autofish loop
│   └── useFishingMultiplayer.js # WebSocket
├── components/
│   └── Fishing/
│       ├── FishingEngine.js   # PixiJS rendering
│       ├── FishingStyles.js   # Shared styled components
│       └── index.js           # Exports
└── pages/
    └── FishingPage.js         # Main page component
```

## Incremental Migration Strategy

1. **Phase 1**: Import new hooks alongside existing code
2. **Phase 2**: Replace timer logic with `useFishingTimers`
3. **Phase 3**: Replace state management with `useFishingState`
4. **Phase 4**: Replace API calls with `useFishingSession`
5. **Phase 5**: Extract autofish logic to `useFishingAutofish`
6. **Phase 6**: Extract multiplayer logic to `useFishingMultiplayer`
7. **Phase 7**: Split modal components into separate files

Each phase can be shipped independently without breaking the game.

