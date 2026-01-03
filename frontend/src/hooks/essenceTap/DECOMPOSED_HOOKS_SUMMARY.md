# Decomposed Hooks Summary

## Created Files

The following focused, single-responsibility hooks have been created to decompose the main `useEssenceTap` hook:

### 1. `useComboMultiplier.js` (1.7 KB)
**Purpose**: Manages combo multiplier state with automatic decay

**State**:
- `comboMultiplier` - Current multiplier value (1 to maxMultiplier)
- `comboTimeoutRef` - Ref for decay timeout

**Functions**:
- `incrementCombo()` - Increment multiplier and reset decay timer
- `resetCombo()` - Manually reset combo to 1

**Config**:
- Imports `COMBO_CONFIG` from `essenceTapConfig.js`
- `decayTime`: 1500ms
- `maxMultiplier`: 2.5x
- `growthRate`: 0.08 per click

**Extracted from**: Lines 79-80, 696-707 of `useEssenceTap.js`

---

### 2. `usePassiveIncome.js` (2.2 KB)
**Purpose**: Manages passive essence accumulation from generators

**Parameters**:
- `productionPerSecond` - Production rate from gameState
- `isWaitingForSync` - Ref to pause during server sync

**Returns**:
- `pendingEssence` - Accumulated essence since last save
- `clearPending()` - Reset pending essence
- `pendingEssenceRef` - Ref for synchronous access

**Features**:
- Auto-pauses when `isWaitingForSync.current` is true
- Uses 100ms tick rate (`UI_TIMING.passiveTickRate`)
- Proper cleanup of intervals

**Extracted from**: Lines 108-109, 114-115, 304-305, 586-627 of `useEssenceTap.js`

---

### 3. `useAchievements.js` (6.5 KB)
**Purpose**: Manages achievement tracking and notifications

**State**:
- `unlockedAchievement` - Currently displayed achievement
- `achievementTrackingRef` - Tracking stats (clicks, golden, combo, etc.)

**Functions**:
- `checkAchievements(stats)` - Check stats and unlock achievements
- `dismissAchievement()` - Dismiss achievement notification
- `initializeTracking(gameState)` - Initialize from game state

**Achievement Thresholds** (defined internally):
- Click achievements: 1, 1,000, 10,000 clicks
- Golden achievements: 1, 100 golden clicks
- Combo achievement: 100 max combo
- Crit streak: 10 in a row
- Generator achievement: 1 purchased
- Prestige achievement: 1 completed

**Features**:
- Prevents duplicate notifications via `shownAchievements` Set
- Optional sound effect callback
- Pre-populates shown achievements on init

**Extracted from**: Lines 89-104, 334-376, 498-530 of `useEssenceTap.js`

---

### 4. `useAutoSave.js` (1.6 KB)
**Purpose**: Manages periodic auto-save of game state

**Parameters**:
- `saveInterval` - Interval in ms (default: 30000 = 30 seconds)
- `getPendingEssence` - Function returning pending essence amount
- `onSave` - Async callback to execute save

**Returns**:
- `lastSaveTime` - Timestamp of last successful save
- `lastSaveRef` - Ref for synchronous access

**Features**:
- Only saves when `pendingEssence > 0`
- Error handling (doesn't update lastSaveTime on failure)
- Clean interval cleanup

**Extracted from**: Lines 107, 629-684 of `useEssenceTap.js`

---

### 5. `index.js` (Updated)
Re-exports all hooks including the new decomposed hooks:

```javascript
// Decomposed focused hooks (new architecture)
export { useComboMultiplier } from './useComboMultiplier';
export { usePassiveIncome } from './usePassiveIncome';
export { useAchievements } from './useAchievements';
export { useAutoSave } from './useAutoSave';
```

---

### 6. `DECOMPOSED_HOOKS_GUIDE.md` (8.9 KB)
Comprehensive guide covering:
- Hook usage and API reference
- Configuration details
- Integration examples
- Testing examples
- Migration guide from monolithic `useEssenceTap`

---

## Key Improvements

### Testability
Each hook can be tested in isolation:
```javascript
const { result } = renderHook(() => useComboMultiplier());
act(() => result.current.incrementCombo());
expect(result.current.comboMultiplier).toBeGreaterThan(1);
```

### Reusability
Hooks can be used independently:
```javascript
// Only need combo system
const { comboMultiplier, incrementCombo } = useComboMultiplier();
```

### Clarity
Single responsibility makes code easier to understand:
- `useComboMultiplier` - Only handles combo state
- `usePassiveIncome` - Only handles passive ticking
- `useAchievements` - Only handles achievement tracking
- `useAutoSave` - Only handles periodic saves

### Maintainability
Changes to one system don't affect others:
- Adjusting combo decay time? Only edit `useComboMultiplier`
- Changing save interval? Only edit `useAutoSave`
- Adding new achievements? Only edit `useAchievements`

### Performance
Components can subscribe to specific state:
```javascript
// Only re-renders when combo changes
const { comboMultiplier } = useComboMultiplier();

// Only re-renders when achievements unlock
const { unlockedAchievement } = useAchievements();
```

---

## Integration with Main Hook

The main `useEssenceTap` hook can be refactored to use these decomposed hooks internally:

```javascript
export const useEssenceTap = () => {
  // Use decomposed hooks
  const { comboMultiplier, incrementCombo, resetCombo } = useComboMultiplier();
  const { pendingEssence, clearPending, pendingEssenceRef } = usePassiveIncome(
    gameState?.productionPerSecond || 0,
    isWaitingForSyncRef
  );
  const { checkAchievements, dismissAchievement, ... } = useAchievements(sounds.playMilestone);
  const { lastSaveTime } = useAutoSave(
    UI_TIMING.autoSaveInterval,
    () => pendingEssenceRef.current,
    handleAutoSave
  );

  // Combine and expose unified API for backward compatibility
  return {
    comboMultiplier,
    // ... rest of API
  };
};
```

This approach:
- Maintains backward compatibility
- Reduces main hook from ~1680 lines to much smaller
- Makes each piece testable independently
- Allows gradual migration

---

## File Locations

All files are located in:
```
C:\Users\Dio\Documents\gacha\frontend\src\hooks\essenceTap\
```

Files created:
1. `useComboMultiplier.js` - Combo system
2. `usePassiveIncome.js` - Passive income ticker
3. `useAchievements.js` - Achievement tracking
4. `useAutoSave.js` - Auto-save system
5. `DECOMPOSED_HOOKS_GUIDE.md` - Usage guide
6. `DECOMPOSED_HOOKS_SUMMARY.md` - This file

Files updated:
1. `index.js` - Added re-exports for new hooks

---

## Next Steps

To fully integrate these decomposed hooks:

1. **Update `useEssenceTap.js`** to use the new hooks internally
2. **Write unit tests** for each decomposed hook
3. **Update documentation** to reference the new architecture
4. **Gradually migrate** components to use specific hooks when appropriate

The decomposed hooks are ready to use and can be imported from:
```javascript
import {
  useComboMultiplier,
  usePassiveIncome,
  useAchievements,
  useAutoSave
} from '@/hooks/essenceTap';
```
