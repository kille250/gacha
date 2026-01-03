# Essence Tap Custom Hooks

This directory contains modular hooks extracted from the main `useEssenceTap` hook to improve code organization, reusability, and maintainability.

## Granular Hooks

### `useComboSystem.js`

Manages combo multiplier state for Essence Tap.

**Features:**
- Combo multiplier growth on clicks
- Combo decay after inactivity (configurable timeout)
- Rate limiting for click spam protection
- Automatic cleanup on unmount

**Usage:**
```javascript
import { useComboSystem } from './hooks/essenceTap';

const MyComponent = () => {
  const {
    comboMultiplier,
    clicksThisSecond,
    updateCombo,
    resetCombo,
    canClick,
    registerClick,
  } = useComboSystem({
    growthRate: 0.1,      // Combo grows by 0.1 per click
    maxMultiplier: 5,     // Maximum 5x combo
    decayTime: 1500,      // Reset after 1.5 seconds
  });

  const handleClick = () => {
    if (!canClick(20)) return; // Max 20 clicks/second

    registerClick();
    updateCombo();
    // ... perform click action
  };

  return (
    <div>
      <p>Combo: {comboMultiplier.toFixed(1)}x</p>
      <button onClick={handleClick}>Click</button>
    </div>
  );
};
```

### `usePassiveProduction.js`

Manages passive essence production with 100ms tick intervals.

**Features:**
- Smooth essence accumulation with configurable tick rate
- Local essence tracking with refs for accurate calculations
- Production per second tracking
- Sync pausing during server updates
- Automatic interval cleanup

**Usage:**
```javascript
import { usePassiveProduction } from './hooks/essenceTap';
import { useRef, useState } from 'react';

const MyComponent = () => {
  const [essence, setEssence] = useState(0);
  const [lifetimeEssence, setLifetimeEssence] = useState(0);
  const isWaitingForSyncRef = useRef(false);

  const {
    pendingEssenceRef,
    localEssenceRef,
    localLifetimeEssenceRef,
    resetTracking,
    clearPending,
  } = usePassiveProduction({
    productionPerSecond: 10,
    tickRate: 100, // 100ms ticks
    isWaitingForSyncRef,
    onEssenceUpdate: ({ essence, lifetimeEssence, pending }) => {
      setEssence(essence);
      setLifetimeEssence(lifetimeEssence);
    },
  });

  const handleServerSync = (serverEssence) => {
    // Reset tracking after server sync
    resetTracking(serverEssence, serverEssence);
    clearPending();
  };

  return (
    <div>
      <p>Essence: {essence.toFixed(0)}</p>
      <p>Pending: {pendingEssenceRef.current.toFixed(0)}</p>
    </div>
  );
};
```

### `useOptimisticEssence.js`

Manages optimistic updates with server reconciliation and rollback.

**Features:**
- Local state for immediate UI feedback
- Refs for tracking pending updates
- Reconciliation with server state
- Intelligent rollback accounting for passive gains
- Support for both earning and spending actions

**Usage:**
```javascript
import { useOptimisticEssence } from './hooks/essenceTap';

const MyComponent = ({ gameState }) => {
  const {
    localEssence,
    localLifetimeEssence,
    localTotalClicks,
    applyOptimisticClick,
    reconcileWithServer,
    rollbackOptimisticUpdate,
  } = useOptimisticEssence({
    initialEssence: 100,
    initialLifetime: 100,
    initialTotalClicks: 0,
    gameState,
  });

  const handleClick = async () => {
    const essenceGained = 10;
    const clickTimestamp = Date.now();

    // Apply optimistic update
    applyOptimisticClick(essenceGained, {
      localEssenceRef,
      localLifetimeEssenceRef,
    });

    try {
      // Send to server
      const response = await api.post('/click');

      // Reconcile with server response
      reconcileWithServer({
        essence: response.data.essence,
        lifetimeEssence: response.data.lifetimeEssence,
        totalClicks: response.data.totalClicks,
      }, 0, { /* refs */ });

    } catch (error) {
      // Rollback on failure
      rollbackOptimisticUpdate({
        essenceGained,
        clickTimestamp,
        refs: { /* refs */ },
      });
    }
  };

  return (
    <div>
      <p>Essence: {localEssence.toFixed(0)}</p>
      <p>Total Clicks: {localTotalClicks}</p>
    </div>
  );
};
```

### `useEssenceTapSounds.js`

Manages sound effects for Essence Tap game actions.

**Features:**
- Sound triggers for clicks, crits, golden clicks
- Purchase and prestige sound effects
- Milestone and achievement sounds
- Volume controls
- Mute functionality

**Usage:**
```javascript
import { useEssenceTapSounds } from './hooks/essenceTap';

const MyComponent = () => {
  const {
    playClickSound,
    playPurchaseSound,
    playPrestigeSound,
    playMilestoneSound,
    toggleMute,
    setVolume,
    isMuted,
  } = useEssenceTapSounds();

  const handleClick = (isCrit, isGolden) => {
    playClickSound(isCrit, isGolden);
    // ... perform click action
  };

  const handlePurchase = () => {
    playPurchaseSound();
    // ... perform purchase
  };

  return (
    <div>
      <button onClick={() => handleClick(false, false)}>Normal Click</button>
      <button onClick={() => handleClick(true, false)}>Crit Click</button>
      <button onClick={() => handleClick(false, true)}>Golden Click</button>
      <button onClick={handlePurchase}>Purchase</button>
      <button onClick={toggleMute}>
        {isMuted() ? 'Unmute' : 'Mute'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        onChange={(e) => setVolume(parseFloat(e.target.value))}
      />
    </div>
  );
};
```

## Architecture

These hooks are designed to be:

1. **Self-contained**: Each hook manages its own state and side effects
2. **Reusable**: Can be used independently or combined
3. **Testable**: Clear inputs and outputs make testing easier
4. **Maintainable**: Separation of concerns improves code clarity

## Integration with Main Hook

The main `useEssenceTap` hook can utilize these granular hooks to reduce complexity:

```javascript
// Example integration
const useEssenceTap = () => {
  const comboSystem = useComboSystem({
    growthRate: COMBO_CONFIG.growthRate,
    maxMultiplier: COMBO_CONFIG.maxMultiplier,
    decayTime: COMBO_CONFIG.decayTime,
  });

  const passiveProduction = usePassiveProduction({
    productionPerSecond: gameState?.productionPerSecond || 0,
    tickRate: UI_TIMING.passiveTickRate,
    isWaitingForSyncRef,
    onEssenceUpdate: handlePassiveUpdate,
  });

  const optimisticEssence = useOptimisticEssence({
    initialEssence: gameState?.essence || 0,
    initialLifetime: gameState?.lifetimeEssence || 0,
    initialTotalClicks: gameState?.totalClicks || 0,
    gameState,
  });

  const sounds = useEssenceTapSounds();

  // ... combine all hooks and return unified interface
};
```

## Benefits

- **Reduced Complexity**: Main hook becomes easier to understand
- **Better Testing**: Each hook can be tested in isolation
- **Code Reuse**: Hooks can be used in other contexts
- **Easier Maintenance**: Changes are isolated to specific concerns
- **Type Safety**: Smaller hooks are easier to type correctly
- **Performance**: Easier to optimize individual concerns

## Core Modular Hooks

### `useEssenceTapActions.js` (NEW!)

Comprehensive hook containing all 23+ action callbacks for user interactions in Essence Tap.

**Features:**
- All user actions in one place
- Handles optimistic updates for responsive UI
- Manages error cases with proper rollback
- Returns success/failure results for all actions
- Waits for pending actions to prevent race conditions
- Works with both WebSocket and REST API

**Actions Included:**

**Click/Tap Processing:**
- `handleClick()` - Process tap/click with combo, crit, and golden essence

**Purchases:**
- `purchaseGenerator(generatorId, count)` - Buy essence generators
- `purchaseUpgrade(upgradeId)` - Purchase upgrades

**Prestige:**
- `performPrestige()` - Prestige/Awaken to earn shards
- `purchasePrestigeUpgrade(upgradeId)` - Buy prestige upgrades

**Character Management:**
- `assignCharacter(characterId)` - Assign character to Essence Tap
- `unassignCharacter(characterId)` - Unassign character

**Gambling & Infusion:**
- `performGamble(betType, betAmount)` - Gamble essence for rewards
- `performInfusion()` - Infuse essence for permanent bonus

**Abilities:**
- `activateAbility(abilityId)` - Activate character ability

**Boss Battles:**
- `spawnBoss()` - Spawn a boss encounter
- `attackBoss()` - Attack the current boss

**Milestones:**
- `claimMilestone(milestoneKey)` - Claim milestone rewards
- `claimRepeatableMilestone(milestoneType)` - Claim repeatable milestones

**Daily Challenges:**
- `claimDailyStreak()` - Claim daily login streak rewards

**Tournament Actions:**
- `claimTournamentRewards()` - Claim weekly tournament rewards
- `claimTournamentCheckpoint(day)` - Claim daily checkpoint (v4.0)
- `equipTournamentCosmetic(cosmeticId)` - Equip tournament cosmetic (v4.0)
- `unequipTournamentCosmetic(slot)` - Unequip tournament cosmetic (v4.0)

**Data Fetchers:**
- `getGambleInfo()` - Get jackpot/gamble information
- `getTournamentInfo()` - Get weekly tournament data
- `getBracketLeaderboard()` - Get bracket leaderboard (v4.0)
- `getBurningHourStatus()` - Get burning hour status (v4.0)
- `getTournamentCosmetics()` - Get available cosmetics (v4.0)
- `getMasteryInfo()` - Get character mastery information
- `getEssenceTypes()` - Get essence types breakdown
- `getDailyModifier()` - Get daily modifier information

**Usage:**
```javascript
import { useEssenceTapActions } from './hooks/essenceTap';

const MyComponent = ({
  gameState,
  localEssenceRef,
  localLifetimeEssenceRef,
  // ... other dependencies
}) => {
  const {
    handleClick,
    purchaseGenerator,
    performPrestige,
    performGamble,
    claimMilestone,
    // ... all other actions
  } = useEssenceTapActions({
    gameState,
    localEssenceRef,
    localLifetimeEssenceRef,
    lastSyncEssenceRef,
    lastSyncTimeRef,
    isMountedRef,
    setLocalEssence,
    setLocalLifetimeEssence,
    setLocalTotalClicks,
    fetchGameState,
    updateCombo,
    setClickResult,
    checkAchievements,
    achievementTrackingRef,
    comboMultiplier,
    checkClickRateLimit,
    sounds,
    useWebSocket,
    flushTapBatch,
    wsSendTap,
    wsRequestSync,
  });

  const handleTap = async () => {
    await handleClick();
  };

  const handleBuyGenerator = async () => {
    const result = await purchaseGenerator('essence_fountain', 1);
    if (result.success) {
      console.log('Purchase successful!');
    } else {
      console.error('Purchase failed:', result.error);
    }
  };

  return (
    <div>
      <button onClick={handleTap}>Tap</button>
      <button onClick={handleBuyGenerator}>Buy Generator</button>
      <button onClick={() => performPrestige()}>Prestige</button>
    </div>
  );
};
```

**Return Values:**
All action functions return an object with:
```javascript
{
  success: boolean,
  error?: string,
  // ... additional response data from server
}
```

## Future Enhancements

Completed extractions:
- ✅ `useEssenceTapActions` - All action callbacks
- ✅ `useEssenceTapAchievements` - Achievement tracking and notifications
- ✅ `useComboSystem` - Combo multiplier logic
- ✅ `usePassiveProduction` - Passive essence generation
- ✅ `useOptimisticEssence` - Optimistic UI updates
- ✅ `useEssenceTapSounds` - Sound effects management

Potential additional improvements:
- Add TypeScript definitions for all hooks
- Create integration tests for hook composition
- Add performance benchmarks
- Create visual documentation with diagrams
