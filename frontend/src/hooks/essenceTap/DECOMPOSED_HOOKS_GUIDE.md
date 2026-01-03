# Decomposed Essence Tap Hooks Guide

This guide explains the new decomposed hooks architecture for the Essence Tap game, designed to improve testability and maintainability.

## Overview

The main `useEssenceTap` hook has been decomposed into focused, single-responsibility hooks:

1. **useComboMultiplier** - Combo system management
2. **usePassiveIncome** - Passive essence generation
3. **useAchievements** - Achievement tracking and notifications
4. **useAutoSave** - Periodic game state persistence

## Hooks Reference

### 1. useComboMultiplier

Manages the combo multiplier state with automatic decay.

```javascript
import { useComboMultiplier } from '@/hooks/essenceTap';

const {
  comboMultiplier,      // Current multiplier (1 to maxMultiplier)
  incrementCombo,       // Call on each click
  resetCombo,           // Manually reset combo
  comboTimeoutRef       // Ref for cleanup
} = useComboMultiplier();
```

**Config**: Uses `COMBO_CONFIG` from `essenceTapConfig.js`
- `decayTime`: 1500ms (1.5 seconds)
- `maxMultiplier`: 2.5x
- `growthRate`: 0.08 per click

**Usage**:
```javascript
// On click
incrementCombo(); // Increases multiplier and resets decay timer

// Manual reset (on prestige, etc.)
resetCombo();

// Cleanup in parent
useEffect(() => {
  return () => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
  };
}, []);
```

### 2. usePassiveIncome

Handles passive essence accumulation from generators.

```javascript
import { usePassiveIncome } from '@/hooks/essenceTap';

const {
  pendingEssence,       // Accumulated essence since last save
  clearPending,         // Reset pending essence (after save)
  pendingEssenceRef     // Ref for synchronous access
} = usePassiveIncome(productionPerSecond, isWaitingForSyncRef);
```

**Parameters**:
- `productionPerSecond` (number): Current production rate from gameState
- `isWaitingForSync` (ref): Flag to pause ticking during server sync

**Features**:
- Auto-pauses when waiting for server sync to prevent double-counting
- Uses 100ms tick rate for smooth UI updates
- Properly cleans up intervals on unmount

**Usage**:
```javascript
const isWaitingForSyncRef = useRef(false);
const { pendingEssence, clearPending } = usePassiveIncome(
  gameState?.productionPerSecond || 0,
  isWaitingForSyncRef
);

// After server sync
clearPending();
```

### 3. useAchievements

Manages achievement tracking, checking, and notifications.

```javascript
import { useAchievements } from '@/hooks/essenceTap';

const {
  unlockedAchievement,    // Currently shown achievement (or null)
  achievementTrackingRef, // Ref with all tracking stats
  checkAchievements,      // Check stats and unlock achievements
  dismissAchievement,     // Dismiss notification
  initializeTracking      // Initialize from gameState (prevent re-triggers)
} = useAchievements(playSoundCallback);
```

**Parameters**:
- `playSoundEffect` (function): Optional callback to play sound on unlock

**Achievement Thresholds** (defined internally):
- `firstClick`: 1 click
- `thousandClicks`: 1,000 clicks
- `tenThousandClicks`: 10,000 clicks
- `firstGolden`: 1 golden click
- `hundredGolden`: 100 golden clicks
- `comboMaster`: 100 max combo
- `critStreak`: 10 crit streak
- `firstGenerator`: 1 generator purchased
- `firstPrestige`: 1 prestige completed

**Usage**:
```javascript
// Initialize on game load
useEffect(() => {
  if (gameState) {
    initializeTracking(gameState);
  }
}, [gameState, initializeTracking]);

// Check on click
const handleClick = () => {
  // ... click logic ...

  checkAchievements({
    totalClicks: newTotalClicks,
    totalGolden: newTotalGolden,
    maxCombo: newMaxCombo,
    // ... other stats
  });
};

// Display achievement
{unlockedAchievement && (
  <AchievementToast
    achievement={unlockedAchievement}
    onDismiss={dismissAchievement}
  />
)}
```

### 4. useAutoSave

Manages periodic auto-save of game state.

```javascript
import { useAutoSave } from '@/hooks/essenceTap';

const {
  lastSaveTime,     // Timestamp of last successful save
  lastSaveRef       // Ref for synchronous access
} = useAutoSave(saveInterval, getPendingEssence, onSave);
```

**Parameters**:
- `saveInterval` (number): Interval in ms (default: 30000 = 30 seconds)
- `getPendingEssence` (function): Returns current pending essence amount
- `onSave` (function): Async callback to execute the save

**Usage**:
```javascript
const { lastSaveTime } = useAutoSave(
  30000, // Save every 30 seconds
  () => pendingEssenceRef.current,
  async (pendingEssence) => {
    const response = await api.post('/essence-tap/save', {
      essence: Math.floor(localEssenceRef.current),
      lifetimeEssence: Math.floor(localLifetimeEssenceRef.current)
    });
    // Handle response...
    clearPending();
  }
);
```

## Integration Example

Here's how these hooks can work together:

```javascript
import {
  useComboMultiplier,
  usePassiveIncome,
  useAchievements,
  useAutoSave
} from '@/hooks/essenceTap';

const MyEssenceTapGame = () => {
  const [gameState, setGameState] = useState(null);
  const isWaitingForSyncRef = useRef(false);

  // Combo system
  const { comboMultiplier, incrementCombo, resetCombo } = useComboMultiplier();

  // Passive income
  const { pendingEssence, clearPending, pendingEssenceRef } = usePassiveIncome(
    gameState?.productionPerSecond || 0,
    isWaitingForSyncRef
  );

  // Achievements
  const {
    unlockedAchievement,
    checkAchievements,
    dismissAchievement,
    initializeTracking
  } = useAchievements(sounds.playMilestone);

  // Auto-save
  const { lastSaveTime } = useAutoSave(
    30000,
    () => pendingEssenceRef.current,
    async () => {
      // Save logic
      await api.post('/essence-tap/save', { ... });
      clearPending();
    }
  );

  // Click handler
  const handleClick = () => {
    incrementCombo();
    // Calculate essence...
    checkAchievements({
      totalClicks: newTotalClicks,
      // ... other stats
    });
  };

  // Prestige handler
  const handlePrestige = () => {
    resetCombo();
    // ... prestige logic
  };

  return (
    <div>
      <div>Combo: {comboMultiplier.toFixed(1)}x</div>
      <div>Pending: {pendingEssence}</div>
      <button onClick={handleClick}>Click</button>
      {unlockedAchievement && (
        <AchievementToast
          achievement={unlockedAchievement}
          onDismiss={dismissAchievement}
        />
      )}
    </div>
  );
};
```

## Benefits

1. **Testability**: Each hook can be tested in isolation
2. **Reusability**: Hooks can be used independently or combined
3. **Clarity**: Single responsibility makes code easier to understand
4. **Maintainability**: Changes to one system don't affect others
5. **Performance**: Only re-render when specific state changes

## Migration from useEssenceTap

The main `useEssenceTap` hook can be refactored to use these decomposed hooks internally:

```javascript
// Before (monolithic)
const useEssenceTap = () => {
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboTimeoutRef = useRef(null);
  // ... hundreds of lines ...
};

// After (decomposed)
const useEssenceTap = () => {
  const { comboMultiplier, incrementCombo, resetCombo } = useComboMultiplier();
  const { pendingEssence, clearPending } = usePassiveIncome(...);
  const { checkAchievements, ... } = useAchievements(...);
  const { lastSaveTime } = useAutoSave(...);

  // Combine and expose unified API
  return { comboMultiplier, ... };
};
```

## Testing Example

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useComboMultiplier } from './useComboMultiplier';

describe('useComboMultiplier', () => {
  it('should increment combo multiplier', () => {
    const { result } = renderHook(() => useComboMultiplier());

    expect(result.current.comboMultiplier).toBe(1);

    act(() => {
      result.current.incrementCombo();
    });

    expect(result.current.comboMultiplier).toBeGreaterThan(1);
  });

  it('should reset combo after decay time', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useComboMultiplier());

    act(() => {
      result.current.incrementCombo();
    });

    expect(result.current.comboMultiplier).toBeGreaterThan(1);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.comboMultiplier).toBe(1);
    jest.useRealTimers();
  });
});
```

## Notes

- All hooks properly clean up their effects (intervals, timeouts)
- Refs are exposed when synchronous access is needed
- Config values are imported from `essenceTapConfig.js`
- Hooks follow React hooks best practices (ESLint rules)
- Sound effects and toast notifications are handled via callbacks
