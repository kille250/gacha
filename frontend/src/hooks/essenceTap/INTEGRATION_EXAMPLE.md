# Integration Example

This file shows how the extracted hooks can be integrated into the main `useEssenceTap` hook.

## Before: Monolithic Hook

The original `useEssenceTap` hook contained all logic in one file:
- 1,687 lines of code
- Multiple concerns mixed together
- Difficult to test individual features
- Hard to reuse specific functionality

## After: Modular Hooks

The new structure separates concerns into focused hooks:

```javascript
import { useCallback, useRef, useState } from 'react';
import { useComboSystem } from './essenceTap/useComboSystem';
import { usePassiveProduction } from './essenceTap/usePassiveProduction';
import { useOptimisticEssence } from './essenceTap/useOptimisticEssence';
import { useEssenceTapSounds } from './essenceTap/useEssenceTapSounds';
import { COMBO_CONFIG, UI_TIMING } from '../config/essenceTapConfig';

export const useEssenceTap = () => {
  // Core game state
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ref to pause production during server sync
  const isWaitingForSyncRef = useRef(false);

  // === MODULAR HOOKS ===

  // 1. Combo System
  const {
    comboMultiplier,
    updateCombo,
    resetCombo,
    canClick,
    registerClick,
  } = useComboSystem({
    growthRate: COMBO_CONFIG.growthRate,
    maxMultiplier: COMBO_CONFIG.maxMultiplier,
    decayTime: COMBO_CONFIG.decayTime,
  });

  // 2. Passive Production
  const passiveProduction = usePassiveProduction({
    productionPerSecond: gameState?.productionPerSecond || 0,
    tickRate: UI_TIMING.passiveTickRate,
    isWaitingForSyncRef,
    onEssenceUpdate: ({ essence, lifetimeEssence, pending }) => {
      // Update optimistic essence state
      optimisticEssence.setLocalEssence(essence);
      optimisticEssence.setLocalLifetimeEssence(lifetimeEssence);
    },
  });

  // 3. Optimistic Essence
  const optimisticEssence = useOptimisticEssence({
    initialEssence: gameState?.essence || 0,
    initialLifetime: gameState?.lifetimeEssence || 0,
    initialTotalClicks: gameState?.totalClicks || 0,
    gameState,
  });

  // 4. Sound Effects
  const sounds = useEssenceTapSounds();

  // === CLICK HANDLER ===

  const handleClick = useCallback(async () => {
    if (!gameState) return;

    // Rate limit check
    if (!canClick(20)) return;
    registerClick();

    // Update combo
    updateCombo();

    // Calculate click result
    const clickPower = gameState.clickPower || 1;
    const critChance = gameState.critChance || 0.01;
    const critMultiplier = gameState.critMultiplier || 10;

    const isCrit = Math.random() < critChance;
    const isGolden = Math.random() < 0.001; // 0.1% chance

    let essenceGained = Math.floor(clickPower * comboMultiplier);
    if (isCrit) essenceGained = Math.floor(essenceGained * critMultiplier);
    if (isGolden) essenceGained = Math.floor(essenceGained * 10);

    // Play sound
    sounds.playClickSound(isCrit, isGolden);

    // Apply optimistic update
    const clickTimestamp = Date.now();
    optimisticEssence.applyOptimisticClick(essenceGained, {
      localEssenceRef: passiveProduction.localEssenceRef,
      localLifetimeEssenceRef: passiveProduction.localLifetimeEssenceRef,
    });

    try {
      // Send to server
      const response = await api.post('/essence-tap/click', {
        count: 1,
        comboMultiplier,
      });

      // Reconcile with server
      optimisticEssence.reconcileWithServer({
        essence: response.data.essence,
        lifetimeEssence: response.data.lifetimeEssence,
        totalClicks: response.data.totalClicks,
      }, 0, {
        localEssenceRef: passiveProduction.localEssenceRef,
        localLifetimeEssenceRef: passiveProduction.localLifetimeEssenceRef,
        lastSyncEssenceRef: passiveProduction.lastSyncEssenceRef,
        lastSyncTimeRef: passiveProduction.lastSyncTimeRef,
      });

    } catch (error) {
      console.error('Click failed:', error);

      // Rollback optimistic update
      optimisticEssence.rollbackOptimisticUpdate({
        essenceGained,
        clickTimestamp,
        refs: {
          localEssenceRef: passiveProduction.localEssenceRef,
          localLifetimeEssenceRef: passiveProduction.localLifetimeEssenceRef,
        },
      });
    }
  }, [
    gameState,
    comboMultiplier,
    canClick,
    registerClick,
    updateCombo,
    sounds,
    optimisticEssence,
    passiveProduction,
  ]);

  // === PURCHASE HANDLER ===

  const purchaseGenerator = useCallback(async (generatorId, count = 1) => {
    if (!gameState) return { success: false };

    try {
      const response = await api.post('/essence-tap/generator/buy', {
        generatorId,
        count,
      });

      // Play purchase sound
      sounds.playPurchaseSound();

      // Update essence (spending action - server is authoritative)
      optimisticEssence.setEssenceValues(
        response.data.essence,
        response.data.essence, // Lifetime doesn't change on spend
        optimisticEssence.localTotalClicks,
        {
          localEssenceRef: passiveProduction.localEssenceRef,
          localLifetimeEssenceRef: passiveProduction.localLifetimeEssenceRef,
        }
      );

      // Update sync tracking
      passiveProduction.updateSyncTracking(response.data.essence);

      // Refresh game state
      await fetchGameState(false);

      return { success: true, ...response.data };
    } catch (error) {
      console.error('Purchase failed:', error);
      return { success: false, error: error.response?.data?.error };
    }
  }, [gameState, sounds, optimisticEssence, passiveProduction]);

  // Return unified interface
  return {
    // State
    gameState,
    loading,
    essence: optimisticEssence.localEssence,
    lifetimeEssence: optimisticEssence.localLifetimeEssence,
    totalClicks: optimisticEssence.localTotalClicks,

    // Combo
    comboMultiplier,
    resetCombo,

    // Actions
    handleClick,
    purchaseGenerator,

    // Sound controls
    sounds,

    // Utilities
    formatNumber,
    formatPerSecond,
  };
};
```

## Benefits of This Approach

### 1. Separation of Concerns
Each hook handles one specific aspect:
- `useComboSystem` - Combo logic only
- `usePassiveProduction` - Passive income only
- `useOptimisticEssence` - UI state only
- `useEssenceTapSounds` - Sound effects only

### 2. Easier Testing
```javascript
// Test combo system in isolation
describe('useComboSystem', () => {
  it('should increase combo on click', () => {
    const { result } = renderHook(() => useComboSystem({
      growthRate: 0.1,
      maxMultiplier: 5,
      decayTime: 1500,
    }));

    expect(result.current.comboMultiplier).toBe(1);

    act(() => {
      result.current.updateCombo();
    });

    expect(result.current.comboMultiplier).toBe(1.1);
  });
});
```

### 3. Code Reuse
```javascript
// Use combo system in a different game mode
const BossMode = () => {
  const combo = useComboSystem({
    growthRate: 0.2,  // Faster combo growth in boss mode
    maxMultiplier: 10, // Higher max combo
    decayTime: 1000,   // Faster decay
  });

  return <div>Boss Combo: {combo.comboMultiplier}x</div>;
};
```

### 4. Maintainability
```javascript
// Easy to modify one concern without affecting others
// Example: Change combo decay algorithm
const useComboSystem = ({ growthRate, maxMultiplier, decayTime }) => {
  // New implementation - only this hook needs to change
  const calculateComboMultiplier = useCallback((currentCombo) => {
    // New exponential growth instead of linear
    return Math.min(currentCombo * (1 + growthRate), maxMultiplier);
  }, [growthRate, maxMultiplier]);

  // Rest of hook unchanged...
};
```

### 5. Performance Optimization
```javascript
// Optimize individual hooks without affecting others
const usePassiveProduction = ({ productionPerSecond, tickRate }) => {
  // Only re-run when production changes
  const memoizedProduction = useMemo(() => {
    return (productionPerSecond * tickRate) / 1000;
  }, [productionPerSecond, tickRate]);

  // More granular control over re-renders
};
```

## Migration Strategy

To migrate from the monolithic hook to modular hooks:

1. **Phase 1**: Create new hooks (DONE)
2. **Phase 2**: Update `useEssenceTap` to use new hooks internally
3. **Phase 3**: Export new hooks for external use
4. **Phase 4**: Update components to use specific hooks when needed
5. **Phase 5**: Remove old implementations from main hook

This gradual approach ensures backward compatibility while gaining the benefits of modularity.
