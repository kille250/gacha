# Migration Example: Converting Actions to Use Error Module

This document shows how to convert existing action files to use the new error standardization module.

## Example 1: Generator Action

### Before (Current Implementation)

```javascript
// backend/services/essenceTap/actions/generatorAction.js
function purchaseGenerator({ state, generatorId, count = 1 }) {
  if (!generatorId) {
    return {
      success: false,
      error: 'Generator ID required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = generatorService.purchaseGenerator(workingState, generatorId, count);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();
  return result;
}

function mapErrorToCode(error) {
  switch (error) {
    case 'Invalid generator':
      return 'INVALID_GENERATOR';
    case 'Generator not unlocked yet':
      return 'GENERATOR_LOCKED';
    case 'Not enough essence':
      return 'INSUFFICIENT_ESSENCE';
    case 'Cannot afford any generators':
      return 'INSUFFICIENT_ESSENCE';
    default:
      return 'PURCHASE_FAILED';
  }
}
```

### After (Using Error Module)

```javascript
// backend/services/essenceTap/actions/generatorAction.js
const { invalidId, insufficientEssence, notAvailable, fromActionResult } = require('../errors');

function purchaseGenerator({ state, generatorId, count = 1 }) {
  if (!generatorId) {
    const error = invalidId('generator', null);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }

  const result = generatorService.purchaseGenerator(workingState, generatorId, count);

  if (!result.success) {
    // Convert old-style result to new error
    const error = fromActionResult(result);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();
  return result;
}

// No more mapErrorToCode needed!
```

## Example 2: Upgrade Action

### Before

```javascript
// backend/services/essenceTap/actions/upgradeAction.js
function purchaseUpgrade({ state, upgradeId }) {
  if (!upgradeId) {
    return {
      success: false,
      error: 'Upgrade ID required',
      code: 'INVALID_REQUEST'
    };
  }

  const upgrade = calculations.getUpgradeById(upgradeId);
  if (!upgrade) {
    return {
      success: false,
      error: 'Invalid upgrade',
      code: 'INVALID_UPGRADE'
    };
  }

  if (calculations.isUpgradePurchased(upgradeId, workingState.purchasedUpgrades)) {
    return {
      success: false,
      error: 'Upgrade already purchased',
      code: 'ALREADY_PURCHASED'
    };
  }

  if (!calculations.isUpgradeUnlocked(upgradeId, workingState)) {
    return {
      success: false,
      error: 'Upgrade not unlocked yet',
      code: 'UPGRADE_LOCKED'
    };
  }

  if (!calculations.canAffordUpgrade(upgradeId, workingState.essence)) {
    return {
      success: false,
      error: 'Not enough essence',
      code: 'INSUFFICIENT_ESSENCE'
    };
  }

  // ... purchase logic
}
```

### After

```javascript
// backend/services/essenceTap/actions/upgradeAction.js
const { invalidId, alreadyClaimed, notAvailable, insufficientEssence } = require('../errors');

function purchaseUpgrade({ state, upgradeId }) {
  if (!upgradeId) {
    const error = invalidId('upgrade', null);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }

  const upgrade = calculations.getUpgradeById(upgradeId);
  if (!upgrade) {
    const error = invalidId('upgrade', upgradeId);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  if (calculations.isUpgradePurchased(upgradeId, workingState.purchasedUpgrades)) {
    const error = alreadyClaimed('upgrade', upgradeId);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  if (!calculations.isUpgradeUnlocked(upgradeId, workingState)) {
    const error = notAvailable('upgrade', 'Requirements not met');
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  const cost = upgrade.cost;
  if (!calculations.canAffordUpgrade(upgradeId, workingState.essence)) {
    const error = insufficientEssence(cost, workingState.essence);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  // ... purchase logic
}
```

## Example 3: Milestone Action

### Before

```javascript
// backend/services/essenceTap/actions/milestoneAction.js
function claimMilestone({ state, milestoneKey }) {
  if (!milestoneKey) {
    return {
      success: false,
      error: 'Milestone key required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = milestoneService.claimMilestone(state, milestoneKey);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  // ... success logic
}

function mapErrorToCode(error) {
  if (error.includes('already claimed')) return 'ALREADY_CLAIMED';
  if (error.includes('Invalid')) return 'INVALID_MILESTONE';
  if (error.includes('not reached')) return 'MILESTONE_NOT_REACHED';
  if (error.includes('Already claimed this week')) return 'ALREADY_CLAIMED_THIS_WEEK';
  return 'CLAIM_FAILED';
}
```

### After

```javascript
// backend/services/essenceTap/actions/milestoneAction.js
const { invalidId, alreadyClaimed, fromActionResult } = require('../errors');

function claimMilestone({ state, milestoneKey }) {
  if (!milestoneKey) {
    const error = invalidId('milestone', null);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }

  const result = milestoneService.claimMilestone(state, milestoneKey);

  if (!result.success) {
    // Smart conversion - handles all the error mapping automatically
    const error = fromActionResult(result);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  // ... success logic
}

// No more mapErrorToCode needed!
```

## Example 4: Boss Action with Cooldown

### Before

```javascript
// backend/services/essenceTap/actions/bossAction.js
function spawnBoss({ state }) {
  const result = bossService.spawnBoss(state);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error),
      cooldownRemaining: result.cooldownRemaining,
      clicksUntilSpawn: result.clicksUntilSpawn
    };
  }

  // ... success logic
}

function mapErrorToCode(error) {
  if (error.includes('cooldown')) return 'BOSS_COOLDOWN';
  if (error.includes('Not enough clicks')) return 'INSUFFICIENT_CLICKS';
  if (error.includes('No active boss')) return 'NO_ACTIVE_BOSS';
  if (error.includes('Invalid boss')) return 'INVALID_BOSS';
  return 'BOSS_ACTION_FAILED';
}
```

### After

```javascript
// backend/services/essenceTap/actions/bossAction.js
const { onCooldown, notFound, fromActionResult } = require('../errors');

function spawnBoss({ state }) {
  const result = bossService.spawnBoss(state);

  if (!result.success) {
    // If cooldown info is available, use onCooldown factory
    if (result.cooldownRemaining && result.cooldownRemaining > 0) {
      const error = onCooldown('boss', result.cooldownRemaining);
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: { ...error.details, clicksUntilSpawn: result.clicksUntilSpawn }
      };
    }

    // Otherwise convert from result
    const error = fromActionResult(result);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  // ... success logic
}

// No more mapErrorToCode needed!
```

## Example 5: Prestige Action

### Before

```javascript
// backend/services/essenceTap/actions/prestigeAction.js
function performPrestige({ state }) {
  if (!calculations.canPrestige(state.lifetimeEssence || 0)) {
    return {
      success: false,
      error: `Need at least ${formatNumber(PRESTIGE_CONFIG.minimumEssence)} lifetime essence`,
      code: 'CANNOT_PRESTIGE'
    };
  }

  const cooldownResult = calculations.checkPrestigeCooldown(state);
  if (!cooldownResult.canPrestige) {
    return {
      success: false,
      error: `Prestige on cooldown. ${cooldownResult.timeRemaining}ms remaining`,
      code: 'PRESTIGE_COOLDOWN'
    };
  }

  // ... prestige logic
}
```

### After

```javascript
// backend/services/essenceTap/actions/prestigeAction.js
const { insufficientEssence, onCooldown } = require('../errors');

function performPrestige({ state }) {
  const minEssence = PRESTIGE_CONFIG.minimumEssence;
  if (!calculations.canPrestige(state.lifetimeEssence || 0)) {
    const error = insufficientEssence(minEssence, state.lifetimeEssence || 0);
    return {
      success: false,
      error: error.message,
      code: 'CANNOT_PRESTIGE', // Override if needed
      details: error.details
    };
  }

  const cooldownResult = calculations.checkPrestigeCooldown(state);
  if (!cooldownResult.canPrestige) {
    const error = onCooldown('prestige', cooldownResult.timeRemaining);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  // ... prestige logic
}
```

## Benefits of Migration

1. **Consistency**: All errors follow the same structure
2. **Less Code**: No need for `mapErrorToCode` functions
3. **Better Details**: Automatically includes relevant context
4. **Type Safety**: Factory functions ensure correct codes
5. **Easier Maintenance**: Centralized error definitions

## Migration Strategy

### Phase 1: Add Error Module (DONE)
- Create `backend/services/essenceTap/errors/index.js`

### Phase 2: Optional - Update Actions Gradually
- Start with high-traffic actions (tap, generator, upgrade)
- Use `fromActionResult()` for quick conversion
- Use specific factory functions for better details

### Phase 3: Update Services (Optional)
- Services can throw EssenceTapError directly
- Actions catch and return formatted responses

### Backward Compatibility

The new error module is 100% backward compatible. You can:

1. Use `fromActionResult()` to convert old-style errors
2. Keep existing error codes (they're all in ErrorCodes)
3. Migrate gradually - old and new styles work together
4. No breaking changes to API responses

## Quick Reference: Error Factory Functions

| Factory Function | Use Case | Example |
|-----------------|----------|---------|
| `insufficientEssence(req, avail)` | Not enough essence | `insufficientEssence(1000, 500)` |
| `insufficientShards(req, avail)` | Not enough shards | `insufficientShards(50, 20)` |
| `insufficientFP(req, avail)` | Not enough FP | `insufficientFP(10, 3)` |
| `invalidId(type, id)` | Invalid entity ID | `invalidId('generator', 'gen_999')` |
| `notFound(type, id)` | Entity not found | `notFound('boss', 'boss_dragon')` |
| `alreadyClaimed(type, id)` | Already claimed | `alreadyClaimed('milestone', 'lifetime_100k')` |
| `limitReached(type, limit, current)` | Limit reached | `limitReached('weekly FP', 500, 500)` |
| `notAvailable(type, reason)` | Locked/unavailable | `notAvailable('upgrade', 'Requires prestige')` |
| `onCooldown(type, remainingMs)` | Action on cooldown | `onCooldown('gamble', 60000)` |
| `fromActionResult(result)` | Convert old errors | `fromActionResult(serviceResult)` |
