# Essence Tap Error Standardization Module

This module provides a comprehensive error handling system for the Essence Tap backend, with standardized error codes, factory functions, and HTTP status code mapping.

## Usage

### Basic Import

```javascript
const {
  ErrorCodes,
  EssenceTapError,
  insufficientEssence,
  invalidId,
  notFound,
  alreadyClaimed,
  limitReached,
  notAvailable,
  onCooldown,
  formatErrorResponse,
  handleActionError
} = require('./errors');
```

## Factory Functions

### 1. `insufficientEssence(required, available)`

Use when a player doesn't have enough essence for an action.

```javascript
// Example: Generator purchase
if (state.essence < cost) {
  return insufficientEssence(cost, state.essence);
}

// Returns:
// {
//   code: 'INSUFFICIENT_ESSENCE',
//   message: 'Insufficient essence. Required: 1000, Available: 500',
//   details: { required: 1000, available: 500 },
//   status: 400
// }
```

### 2. `insufficientShards(required, available)`

Use when a player doesn't have enough prestige shards.

```javascript
// Example: Prestige upgrade purchase
const cost = calculatePrestigeUpgradeCost(upgradeId, currentLevel);
if (state.prestigeShards < cost) {
  return insufficientShards(cost, state.prestigeShards);
}
```

### 3. `insufficientFP(required, available)`

Use when a player doesn't have enough fate points.

```javascript
// Example: FP exchange
if (state.fatePoints < fpCost) {
  return insufficientFP(fpCost, state.fatePoints);
}
```

### 4. `invalidId(type, id)`

Use when an invalid ID is provided for any entity.

```javascript
// Example: Invalid generator ID
const generator = getGeneratorById(generatorId);
if (!generator) {
  throw invalidId('generator', generatorId);
}

// Example: Invalid upgrade ID
const upgrade = getUpgradeById(upgradeId);
if (!upgrade) {
  throw invalidId('upgrade', upgradeId);
}

// Types supported: generator, upgrade, character, ability, milestone, challenge, boss
// Automatically maps to correct error code (e.g., INVALID_GENERATOR_ID)
```

### 5. `notFound(type, id)`

Use when an entity is not found.

```javascript
// Example: User not found
const user = await User.findById(userId);
if (!user) {
  throw notFound('user', userId);
}

// Example: Boss not found
const boss = getBossById(bossId);
if (!boss) {
  throw notFound('boss', bossId);
}

// Example: Generic not found
if (!state.bossEncounter) {
  throw notFound('boss encounter');
}
```

### 6. `alreadyClaimed(type, id)`

Use when something has already been claimed.

```javascript
// Example: Milestone already claimed
if (state.claimedMilestones.includes(milestoneKey)) {
  throw alreadyClaimed('milestone', milestoneKey);
}

// Example: Challenge already claimed
if (state.weekly.claimedChallenges[challengeId]) {
  throw alreadyClaimed('challenge', challengeId);
}

// Returns:
// {
//   code: 'ALREADY_CLAIMED',
//   message: 'Milestone already claimed: lifetime_100k',
//   details: { type: 'milestone', id: 'lifetime_100k' },
//   status: 409
// }
```

### 7. `limitReached(type, limit, current)`

Use when a limit has been reached.

```javascript
// Example: Weekly FP cap
const weeklyFP = getWeeklyFP(state);
const maxFP = getWeeklyFPCap(state);
if (weeklyFP >= maxFP) {
  throw limitReached('weekly FP', maxFP, weeklyFP);
}

// Example: Infusion limit
if (state.infusionCount >= INFUSION_CONFIG.maxPerPrestige) {
  throw limitReached('infusion', INFUSION_CONFIG.maxPerPrestige, state.infusionCount);
}

// Example: Exchange limit
if (exchangeCount >= MAX_EXCHANGES) {
  throw limitReached('exchange', MAX_EXCHANGES, exchangeCount);
}

// Automatically maps to specific codes:
// - 'weekly FP' -> WEEKLY_FP_CAP_REACHED
// - 'exchange' -> EXCHANGE_LIMIT_REACHED
// - 'infusion' -> INFUSION_LIMIT_REACHED
```

### 8. `notAvailable(type, reason)`

Use when something is locked, on cooldown, or otherwise unavailable.

```javascript
// Example: Upgrade not unlocked
if (!isUpgradeUnlocked(upgradeId, state)) {
  throw notAvailable('upgrade', 'Requires 10 generators');
}

// Example: Ability on cooldown
if (isAbilityOnCooldown(state, abilityId)) {
  throw notAvailable('ability', 'Cooldown active');
}

// Example: Character not owned
if (!state.ownedCharacters.includes(characterId)) {
  throw notAvailable('character', 'Not owned');
}

// Automatically maps to specific codes:
// - 'upgrade' -> UPGRADE_LOCKED
// - 'generator' -> GENERATOR_LOCKED
// - 'ability' -> ON_COOLDOWN
// - 'character' -> CHARACTER_NOT_OWNED
```

### 9. `onCooldown(type, remainingMs)`

Use for cooldown-specific errors with time remaining.

```javascript
// Example: Prestige cooldown
const cooldown = checkPrestigeCooldown(state);
if (!cooldown.canPrestige) {
  throw onCooldown('prestige', cooldown.timeRemaining);
}

// Example: Gamble cooldown
const gambleCooldown = getGambleCooldown(state);
if (gambleCooldown > 0) {
  throw onCooldown('gamble', gambleCooldown);
}

// Returns:
// {
//   code: 'PRESTIGE_COOLDOWN',
//   message: 'Prestige on cooldown. 45s remaining',
//   details: { type: 'prestige', remainingMs: 45000 },
//   status: 429
// }

// Automatically maps to specific codes:
// - 'prestige' -> PRESTIGE_COOLDOWN
// - 'gamble' -> GAMBLE_COOLDOWN
// - 'boss' -> BOSS_COOLDOWN
// - 'ability' -> ABILITY_COOLDOWN
```

## Using in Actions

### Pattern 1: Return Error Object

```javascript
function purchaseGenerator({ state, generatorId, count = 1 }) {
  const generator = getGeneratorById(generatorId);
  if (!generator) {
    const error = invalidId('generator', generatorId);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  const cost = getGeneratorCost(generatorId, state.generators[generatorId]);
  if (state.essence < cost) {
    const error = insufficientEssence(cost, state.essence);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  // ... purchase logic
  return { success: true, newState, cost };
}
```

### Pattern 2: Throw Error (for async handlers with try/catch)

```javascript
async function handlePurchase(req, res) {
  try {
    const { generatorId, count } = req.body;
    const state = await getPlayerState(req.userId);

    const generator = getGeneratorById(generatorId);
    if (!generator) {
      throw invalidId('generator', generatorId);
    }

    const cost = getGeneratorCost(generatorId, state.generators[generatorId]);
    if (state.essence < cost) {
      throw insufficientEssence(cost, state.essence);
    }

    // ... purchase logic
    res.json({ success: true, newState, cost });
  } catch (error) {
    const { status, response } = handleActionError(error);
    res.status(status).json(response);
  }
}
```

## Utility Functions

### `formatErrorResponse(error)`

Converts any error to a standardized response format.

```javascript
const error = new Error('Something went wrong');
const response = formatErrorResponse(error);
// { success: false, error: 'Something went wrong', code: 'SERVER_ERROR' }

const essenceError = insufficientEssence(1000, 500);
const response2 = formatErrorResponse(essenceError);
// { success: false, error: 'Insufficient essence...', code: 'INSUFFICIENT_ESSENCE', details: {...} }
```

### `handleActionError(error)`

Returns both status code and formatted response.

```javascript
try {
  // ... action logic
} catch (error) {
  const { status, response } = handleActionError(error);
  res.status(status).json(response);
}

// EssenceTapError: { status: 400, response: { success: false, error: '...', code: '...' } }
// Generic Error: { status: 500, response: { success: false, error: '...', code: 'SERVER_ERROR' } }
```

### `fromActionResult(result)`

Convert legacy action results to EssenceTapError.

```javascript
const result = someOldAction();
if (!result.success) {
  const error = fromActionResult(result);
  throw error; // Now a proper EssenceTapError
}
```

## Migration from Existing Code

### Before (using mapErrorToCode)

```javascript
function purchaseGenerator({ state, generatorId }) {
  const generator = getGeneratorById(generatorId);
  if (!generator) {
    return {
      success: false,
      error: 'Invalid generator',
      code: 'INVALID_GENERATOR'
    };
  }

  if (state.essence < cost) {
    return {
      success: false,
      error: 'Not enough essence',
      code: 'INSUFFICIENT_ESSENCE'
    };
  }
}

function mapErrorToCode(error) {
  switch (error) {
    case 'Invalid generator':
      return 'INVALID_GENERATOR';
    case 'Not enough essence':
      return 'INSUFFICIENT_ESSENCE';
    default:
      return 'PURCHASE_FAILED';
  }
}
```

### After (using factory functions)

```javascript
const { invalidId, insufficientEssence } = require('../errors');

function purchaseGenerator({ state, generatorId }) {
  const generator = getGeneratorById(generatorId);
  if (!generator) {
    const error = invalidId('generator', generatorId);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  if (state.essence < cost) {
    const error = insufficientEssence(cost, state.essence);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }
}

// No more mapErrorToCode needed!
```

## Benefits

1. **Consistency**: All errors follow the same structure
2. **Type Safety**: Factory functions ensure correct code-to-status mapping
3. **Better Details**: Automatically includes relevant context (amounts, IDs, etc.)
4. **Less Boilerplate**: No more manual mapErrorToCode functions
5. **Easier Testing**: Standardized error objects are easier to assert against
6. **Better DX**: Clear, semantic factory function names

## Error Code Reference

See the `ErrorCodes` constant in `index.js` for the complete list of error codes and their HTTP status mappings.
