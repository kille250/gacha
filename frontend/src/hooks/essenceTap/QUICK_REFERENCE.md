# Quick Reference - Essence Tap Hooks

## Import Statements

```javascript
// Import individual hooks
import {
  useComboSystem,
  usePassiveProduction,
  useOptimisticEssence,
  useEssenceTapSounds
} from './hooks/essenceTap';

// Or import main hook (backward compatible)
import { useEssenceTap } from './hooks/essenceTap';
```

## useComboSystem

**Purpose**: Combo multiplier management

```javascript
const {
  comboMultiplier,    // Current combo value (1 to maxMultiplier)
  clicksThisSecond,   // Rate limit counter
  updateCombo,        // Call on each click
  resetCombo,         // Manual reset
  canClick,           // Check rate limit: canClick(20)
  registerClick,      // Register click for rate limiting
} = useComboSystem({
  growthRate: 0.1,      // +0.1 per click
  maxMultiplier: 5,     // Max 5x
  decayTime: 1500,      // Reset after 1.5s
});
```

**Common Pattern**:
```javascript
const handleClick = () => {
  if (!canClick(20)) return; // Max 20/sec
  registerClick();
  updateCombo();
  // ... perform click
};
```

## usePassiveProduction

**Purpose**: Passive essence generation

```javascript
const {
  pendingEssenceRef,       // Ref: accumulated essence
  localEssenceRef,         // Ref: current essence
  localLifetimeEssenceRef, // Ref: lifetime total
  lastSyncTimeRef,         // Ref: last server sync
  lastSyncEssenceRef,      // Ref: last server value
  passiveTickRef,          // Ref: interval timer
  resetTracking,           // Fn: reset(essence, lifetime)
  updateSyncTracking,      // Fn: update(essence)
  clearPending,            // Fn: clear pending counter
} = usePassiveProduction({
  productionPerSecond: 10,
  tickRate: 100,              // 100ms ticks
  isWaitingForSyncRef,        // Pause during sync
  onEssenceUpdate: (update) => {
    // update.essence, update.lifetimeEssence, update.pending
  },
});
```

**Common Pattern**:
```javascript
// On server sync
const handleSync = (serverEssence) => {
  resetTracking(serverEssence, serverEssence);
  clearPending();
};
```

## useOptimisticEssence

**Purpose**: Optimistic UI updates with server reconciliation

```javascript
const {
  localEssence,              // State: displayed essence
  localLifetimeEssence,      // State: displayed lifetime
  localTotalClicks,          // State: displayed clicks
  setLocalEssence,           // Fn: direct setter
  setLocalLifetimeEssence,   // Fn: direct setter
  setLocalTotalClicks,       // Fn: direct setter
  applyOptimisticClick,      // Fn: apply(gained, refs)
  reconcileWithServer,       // Fn: reconcile(serverData, optimistic, refs)
  rollbackOptimisticUpdate,  // Fn: rollback({gained, timestamp, refs})
  setEssenceValues,          // Fn: set(essence, lifetime, clicks, refs)
} = useOptimisticEssence({
  initialEssence: 0,
  initialLifetime: 0,
  initialTotalClicks: 0,
  gameState,                 // For rollback calculations
});
```

**Common Patterns**:

```javascript
// Pattern 1: Optimistic Click
const handleClick = async () => {
  const essenceGained = 10;
  const timestamp = Date.now();

  // Optimistic update
  applyOptimisticClick(essenceGained, { localEssenceRef, localLifetimeEssenceRef });

  try {
    const response = await api.post('/click');
    reconcileWithServer(response.data, 0, refs);
  } catch (error) {
    rollbackOptimisticUpdate({ essenceGained, clickTimestamp: timestamp, refs });
  }
};

// Pattern 2: Purchase (spending)
const handlePurchase = async () => {
  const response = await api.post('/buy');
  setEssenceValues(response.data.essence, response.data.essence, localTotalClicks, refs);
};

// Pattern 3: Full Sync
const handleFullSync = (serverData) => {
  setEssenceValues(serverData.essence, serverData.lifetimeEssence, serverData.totalClicks, refs);
};
```

## useEssenceTapSounds

**Purpose**: Game sound effects

```javascript
const {
  playClickSound,      // Fn: (isCrit, isGolden) => void
  playPurchaseSound,   // Fn: () => void
  playPrestigeSound,   // Fn: () => void
  playMilestoneSound,  // Fn: () => void
  playAbilitySound,    // Fn: () => void
  playGambleWinSound,  // Fn: () => void
  playGambleLossSound, // Fn: () => void
  toggleMute,          // Fn: () => void
  setVolume,           // Fn: (0-1) => void
  isMuted,             // Fn: () => boolean
  getVolume,           // Fn: () => number
  sounds,              // Object: underlying useSoundEffects
} = useEssenceTapSounds();
```

**Common Patterns**:
```javascript
// Play click sound
const handleClick = (isCrit, isGolden) => {
  playClickSound(isCrit, isGolden);
  // ...
};

// Play purchase sound
const handlePurchase = () => {
  playPurchaseSound();
  // ...
};

// Volume control
<input
  type="range"
  min="0"
  max="1"
  step="0.1"
  value={getVolume()}
  onChange={(e) => setVolume(parseFloat(e.target.value))}
/>

// Mute toggle
<button onClick={toggleMute}>
  {isMuted() ? 'Unmute' : 'Mute'}
</button>
```

## Complete Integration Example

```javascript
import { useRef } from 'react';
import {
  useComboSystem,
  usePassiveProduction,
  useOptimisticEssence,
  useEssenceTapSounds
} from './hooks/essenceTap';

const EssenceTapGame = () => {
  const isWaitingForSyncRef = useRef(false);

  // Setup hooks
  const combo = useComboSystem({
    growthRate: 0.1,
    maxMultiplier: 5,
    decayTime: 1500,
  });

  const optimistic = useOptimisticEssence({
    initialEssence: 0,
    initialLifetime: 0,
    initialTotalClicks: 0,
    gameState: null,
  });

  const passive = usePassiveProduction({
    productionPerSecond: 10,
    tickRate: 100,
    isWaitingForSyncRef,
    onEssenceUpdate: ({ essence, lifetimeEssence }) => {
      optimistic.setLocalEssence(essence);
      optimistic.setLocalLifetimeEssence(lifetimeEssence);
    },
  });

  const sounds = useEssenceTapSounds();

  // Click handler
  const handleClick = async () => {
    if (!combo.canClick(20)) return;

    combo.registerClick();
    combo.updateCombo();

    const isCrit = Math.random() < 0.1;
    const isGolden = Math.random() < 0.01;
    const essenceGained = Math.floor(10 * combo.comboMultiplier);

    sounds.playClickSound(isCrit, isGolden);

    optimistic.applyOptimisticClick(essenceGained, {
      localEssenceRef: passive.localEssenceRef,
      localLifetimeEssenceRef: passive.localLifetimeEssenceRef,
    });

    try {
      const response = await api.post('/click');
      optimistic.reconcileWithServer(response.data, 0, {
        localEssenceRef: passive.localEssenceRef,
        localLifetimeEssenceRef: passive.localLifetimeEssenceRef,
        lastSyncEssenceRef: passive.lastSyncEssenceRef,
        lastSyncTimeRef: passive.lastSyncTimeRef,
      });
    } catch (error) {
      optimistic.rollbackOptimisticUpdate({
        essenceGained,
        clickTimestamp: Date.now(),
        refs: {
          localEssenceRef: passive.localEssenceRef,
          localLifetimeEssenceRef: passive.localLifetimeEssenceRef,
        },
      });
    }
  };

  return (
    <div>
      <h1>Essence: {optimistic.localEssence.toFixed(0)}</h1>
      <p>Combo: {combo.comboMultiplier.toFixed(1)}x</p>
      <button onClick={handleClick}>Tap</button>
      <button onClick={sounds.toggleMute}>
        {sounds.isMuted() ? 'Unmute' : 'Mute'}
      </button>
    </div>
  );
};
```

## Configuration Constants

From `config/essenceTapConfig.js`:

```javascript
COMBO_CONFIG = {
  growthRate: 0.1,
  maxMultiplier: 5,
  decayTime: 1500,
}

UI_TIMING = {
  passiveTickRate: 100,
  autoSaveInterval: 30000,
}
```

## File Locations

```
frontend/src/hooks/essenceTap/
├── useComboSystem.js           (Combo logic)
├── usePassiveProduction.js     (Passive income)
├── useOptimisticEssence.js     (Optimistic updates)
└── useEssenceTapSounds.js      (Sound effects)
```

## Tips

1. **Refs vs State**: Use refs from `usePassiveProduction` for accurate tracking, state from `useOptimisticEssence` for rendering
2. **Sync Pausing**: Set `isWaitingForSyncRef.current = true` before server sync to pause passive production
3. **Rollback**: Always provide `clickTimestamp` for accurate passive gain calculation during rollback
4. **Sound Timing**: Play sounds before optimistic updates for better UX
5. **Rate Limiting**: Always check `canClick()` before processing clicks
