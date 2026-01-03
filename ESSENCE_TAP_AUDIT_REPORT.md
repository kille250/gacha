# Essence Tap Minigame - Comprehensive Code Audit Report

**Date:** 2026-01-03
**Auditor:** Claude Code
**Branch:** claude/audit-essence-tap-AUvXl

---

## Executive Summary

The Essence Tap minigame is a complex clicker game with ~15,000 lines of code across 4 backend files, 2 frontend hooks, and 27 frontend components. The codebase is **functional but suffers from significant maintainability issues** due to monolithic file structures, heavy code duplication, and lack of type safety.

### Key Metrics
| File | Lines | Complexity |
|------|-------|------------|
| backend/services/essenceTapService.js | 3,633 | Very High |
| backend/routes/essenceTap.js | 2,941 | High |
| backend/websocket/essenceTapHandler.js | 2,841 | High |
| backend/config/essenceTap.js | 1,950 | Medium |
| frontend/hooks/useEssenceTap.js | 1,686 | High |
| frontend/hooks/useEssenceTapSocket.js | 1,874 | High |
| frontend/components/EssenceTap/* (27 files) | ~3,500 | Medium |

---

## 1. Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌───────────────────────┐                 │
│  │  27 Components   │────▶│   useEssenceTap.js    │                 │
│  │  (TapTarget,     │     │   - Game state        │                 │
│  │   GeneratorList, │     │   - Click handling    │                 │
│  │   PrestigePanel, │     │   - Achievement track │                 │
│  │   etc.)          │     └───────────┬───────────┘                 │
│  └──────────────────┘                 │                              │
│                                       ▼                              │
│                         ┌───────────────────────────┐               │
│                         │ useEssenceTapSocket.js    │               │
│                         │ - WebSocket connection    │               │
│                         │ - Tap batching            │               │
│                         │ - localStorage backup     │               │
│                         │ - sendBeacon sync         │               │
│                         └───────────┬───────────────┘               │
│                                     │                                │
└─────────────────────────────────────┼────────────────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │              TRANSPORT LAYER                       │
            │  ┌─────────────────┐    ┌───────────────────────┐ │
            │  │   WebSocket     │    │     REST API          │ │
            │  │   (Primary)     │    │     (Fallback)        │ │
            │  └────────┬────────┘    └───────────┬───────────┘ │
            └───────────┼─────────────────────────┼─────────────┘
                        │                         │
┌───────────────────────┼─────────────────────────┼───────────────────┐
│                       ▼          BACKEND        ▼                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────┐    ┌────────────────────────┐           │
│  │ essenceTapHandler.js   │    │   essenceTap.js        │           │
│  │ (WebSocket handlers)   │    │   (REST routes)        │           │
│  │ - 20+ event handlers   │    │   - 25+ endpoints      │           │
│  │ - Transaction mgmt     │    │   - Transaction mgmt   │           │
│  └───────────┬────────────┘    └───────────┬────────────┘           │
│              │                              │                        │
│              └──────────────┬───────────────┘                        │
│                             ▼                                        │
│              ┌────────────────────────────┐                         │
│              │ essenceTapService.js       │                         │
│              │ (Core game logic)          │                         │
│              │ - 60+ exported functions   │                         │
│              │ - State transformations    │                         │
│              │ - Business rules           │                         │
│              └──────────────┬─────────────┘                         │
│                             │                                        │
│                             ▼                                        │
│              ┌────────────────────────────┐                         │
│              │ config/essenceTap.js       │                         │
│              │ (Game configuration)       │                         │
│              │ - Balance values           │                         │
│              │ - Generator/Upgrade defs   │                         │
│              │ - Challenge/Milestone defs │                         │
│              └────────────────────────────┘                         │
│                                                                      │
│  External Dependencies:                                              │
│  ┌────────────┐ ┌────────────────┐ ┌──────────────────┐            │
│  │ Sequelize  │ │ User Model     │ │ SharedJackpot    │            │
│  │ (DB layer) │ │ (essenceTap)   │ │ Model            │            │
│  └────────────┘ └────────────────┘ └──────────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Feature Domains in essenceTapService.js

```
essenceTapService.js
├── Core Mechanics
│   ├── processTap() - Click handling
│   ├── calculateProductionPerSecond() - Passive income
│   └── recalculateStats() - Stat aggregation
├── Generators
│   ├── purchaseGenerator()
│   ├── getGeneratorCost()
│   └── getGeneratorProduction()
├── Upgrades
│   ├── purchaseUpgrade()
│   ├── getUpgradeCost()
│   └── applyUpgradeEffects()
├── Abilities
│   ├── activateAbility()
│   ├── processActiveAbilities()
│   └── getAbilityCooldowns()
├── Prestige System
│   ├── prestige()
│   ├── calculatePrestigeRewards()
│   ├── purchasePrestigeUpgrade()
│   └── getPrestigeInfo()
├── Gambling System
│   ├── gamble()
│   ├── checkJackpot()
│   └── resetJackpot()
├── Infusion System
│   ├── performInfusion()
│   └── calculateInfusionBonus()
├── Boss Encounters
│   ├── spawnBoss()
│   ├── attackBoss()
│   └── claimBossReward()
├── Daily Challenges
│   ├── resetDaily()
│   ├── checkDailyChallenges()
│   └── claimDailyChallenge()
├── Milestones
│   ├── checkMilestones()
│   ├── claimMilestone()
│   └── claimRepeatableMilestone()
├── Weekly Tournament
│   ├── updateWeeklyProgress()
│   ├── getWeeklyTournamentInfo()
│   ├── claimWeeklyRewards()
│   └── claimTournamentCheckpoint()
├── Character System
│   ├── assignCharacter()
│   ├── unassignCharacter()
│   ├── calculateCharacterBonuses()
│   └── getAssignedCharacterElements()
├── Ticket Generation
│   ├── checkDailyStreakTickets()
│   └── exchangeFatePointsForTickets()
└── Utility Functions
    ├── getInitialState()
    ├── resetWeeklyFPIfNeeded()
    ├── applyFPWithCap()
    └── getGameConfig()
```

---

## 2. Problem Areas (Ranked by Severity)

### Critical (Must Fix)

#### 2.1 Single Responsibility Principle Violations
**Severity: Critical** | **Files: All**

The entire codebase violates SRP fundamentally:

- **essenceTapService.js** handles 15+ distinct game features in one file
- **essenceTapHandler.js** has 20+ event handlers with identical boilerplate
- **useEssenceTap.js** manages state, WebSocket, REST fallback, achievements, and lifecycle

**Evidence:**
```javascript
// essenceTapService.js exports 60+ functions covering unrelated domains
module.exports = {
  // Core
  getInitialState, processTap, calculateProductionPerSecond,
  // Generators (different domain)
  purchaseGenerator, getGeneratorCost,
  // Upgrades (different domain)
  purchaseUpgrade,
  // Prestige (different domain)
  prestige, purchasePrestigeUpgrade,
  // Gambling (different domain)
  gamble, checkJackpot,
  // Boss (different domain)
  spawnBoss, attackBoss,
  // ... 50+ more
};
```

**Impact:** Changes to one feature risk breaking others. Testing is nearly impossible.

---

#### 2.2 Massive Code Duplication (DRY Violations)
**Severity: Critical** | **Files: essenceTapHandler.js, routes/essenceTap.js**

Every WebSocket handler and REST endpoint follows the exact same pattern:

**WebSocket Pattern (repeated 20+ times):**
```javascript
socket.on('EVENT_NAME', async (data) => {
  const { param1, clientSeq } = data;

  if (!param1) {
    socket.emit('error', { code: 'INVALID_REQUEST', message: 'Param required' });
    return;
  }

  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId, { transaction, lock: true });
    if (!user) {
      await transaction.rollback();
      socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
      return;
    }

    let state = user.essenceTap || essenceTapService.getInitialState();
    // ... feature-specific logic ...

    user.essenceTap = newState;
    user.lastEssenceTapRequest = now;
    await user.save({ transaction });
    await transaction.commit();

    const seq = getNextSequence(userId);
    broadcastToUser(namespace, userId, 'EVENT_RESULT', { ... });
  } catch (err) {
    await transaction.rollback();
    console.error('[EssenceTap WS] Error:', err);
    socket.emit('error', { code: 'ERROR_CODE', message: 'Error message' });
  }
});
```

**Line Count Impact:**
- ~100 lines of boilerplate per handler × 20 handlers = ~2,000 lines of duplicate code
- Same pattern in REST routes adds another ~1,500 lines

---

#### 2.3 No Type Safety
**Severity: Critical** | **Files: All**

The entire codebase uses plain JavaScript with no type annotations:

```javascript
// State shape is implicit and scattered across functions
function getInitialState() {
  return {
    essence: 0,
    lifetimeEssence: 0,
    totalClicks: 0,
    generators: {},
    purchasedUpgrades: [],
    // ... 30+ more properties across different features
  };
}
```

**Risks:**
- No IDE autocompletion or error detection
- Typos cause silent failures
- State shape inconsistencies between frontend/backend
- Impossible to safely refactor

---

### High (Should Fix)

#### 2.4 Tight Coupling / No Dependency Injection
**Severity: High** | **Files: essenceTapService.js, essenceTapHandler.js**

Services import dependencies directly, making testing and mocking difficult:

```javascript
// essenceTapService.js - Direct requires inside functions
async function checkJackpot(state, betType) {
  const { SharedJackpot } = require('../models'); // Hard-coded dependency
  const jackpotConfig = GAMBLE_CONFIG.jackpot;
  // ...
}

// essenceTapHandler.js
const essenceTapService = require('../services/essenceTapService'); // Direct import
```

---

#### 2.5 Mixed Abstraction Levels
**Severity: High** | **Files: essenceTapService.js**

High-level game logic mixed with low-level implementation:

```javascript
// updateWeeklyProgress mixes tournament logic with state management
function updateWeeklyProgress(state, essenceEarned, options = {}) {
  const currentWeek = getCurrentISOWeek(); // Time calculation
  const newState = { ...state }; // State mutation

  // Low-level property initialization
  if (!newState.generators) newState.generators = state.generators || {};
  if (!newState.purchasedUpgrades) newState.purchasedUpgrades = state.purchasedUpgrades || [];
  if (!newState.daily) newState.daily = state.daily || {};

  // Tournament service call (different abstraction)
  newState.tournament = tournamentService.initializeTournamentState(state.tournament);

  // Streak calculation (business logic)
  const streakBonus = tournamentService.getStreakBonus(newState.tournament?.streak || 0);
  // ...
}
```

---

#### 2.6 Inconsistent Error Handling
**Severity: High** | **Files: All**

Error handling is inconsistent across the codebase:

```javascript
// Some functions return error objects
function claimWeeklyRewards(state) {
  if (condition) {
    return { success: false, error: 'Error message' };
  }
}

// Some throw exceptions
async function processTapsInTransaction(userId, taps) {
  if (!taps) {
    throw new Error('No taps provided');
  }
}

// Some return null/undefined silently
function getCharacterElement(character) {
  if (!character) return null; // Silent failure
}
```

---

### Medium (Consider Fixing)

#### 2.7 Frontend State Duplication
**Severity: Medium** | **Files: useEssenceTap.js, useEssenceTapSocket.js**

The same state is tracked in multiple places:

```javascript
// useEssenceTap.js
const [localEssence, setLocalEssence] = useState(0);
const localEssenceRef = useRef(0);
const lastSyncEssenceRef = useRef(0);
const pendingEssenceRef = useRef(0);

// useEssenceTapSocket.js
const optimisticEssenceRef = useRef(0);
const confirmedSeqRef = useRef(0);
```

---

#### 2.8 Magic Numbers and Strings
**Severity: Medium** | **Files: Various**

While most config is centralized, some magic values are scattered:

```javascript
// useEssenceTapSocket.js
if (Date.now() - backup.timestamp > 3600000) { // Magic: 1 hour in ms
  localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
}

// routes/essenceTap.js
if (Math.abs(now - timestamp) > 10000) { // Magic: 10 second window
  return res.status(400).json({ error: 'Invalid timestamp' });
}
```

---

#### 2.9 Large Component Files
**Severity: Medium** | **Files: Various frontend components**

Some components are doing too much:

```javascript
// TapTarget.js (~500 lines) handles:
// - Rendering the tap button
// - Pixi.js particle system
// - Click animations
// - Combo visualization
// - Prestige-based styling
// - Achievement effects
```

---

### Low (Nice to Fix)

#### 2.10 Inconsistent Naming Conventions
**Severity: Low** | **Files: All**

```javascript
// Mixed naming styles
state.ticketGeneration  // camelCase
state.weekly           // shortened
state.bossEncounter    // camelCase
state.daily            // shortened

// Function prefixes inconsistent
getInitialState()      // get prefix
calculateProductionPerSecond()  // calculate prefix
checkMilestones()      // check prefix
processTap()           // process prefix
resetDaily()           // reset prefix
claimMilestone()       // claim prefix
```

---

## 3. Best Practices Evaluation

| Principle | Current State | Score |
|-----------|--------------|-------|
| **Single Responsibility (SRP)** | Massive files handle multiple domains | 2/10 |
| **Don't Repeat Yourself (DRY)** | ~3,500 lines of duplicate boilerplate | 3/10 |
| **Separation of Concerns** | Transport/business logic mixed | 4/10 |
| **Dependency Injection** | Hard-coded requires everywhere | 2/10 |
| **Pure Functions** | Service uses mostly pure functions | 7/10 |
| **Consistent Error Handling** | Mixed patterns | 4/10 |
| **Type Safety** | No types anywhere | 1/10 |
| **Testability** | Very difficult to test | 2/10 |

**Overall Score: 3.1/10**

---

## 4. Refactoring Plan (Prioritized)

### Phase 1: Type Safety Foundation (Low Risk, High Impact)
**Estimated Effort: 1 week**

1. Add TypeScript types for state shapes
2. Create shared type definitions for frontend/backend
3. Add JSDoc annotations as stepping stone

**Files to Create:**
```
shared/
  types/
    essenceTap.types.ts    # Core state types
    generators.types.ts     # Generator types
    upgrades.types.ts       # Upgrade types
    prestige.types.ts       # Prestige types
    tournament.types.ts     # Tournament types
    characters.types.ts     # Character types
```

---

### Phase 2: Extract Handler Boilerplate (Medium Risk, High Impact)
**Estimated Effort: 3-5 days**

Create a generic handler factory to eliminate duplication:

```javascript
// Proposed: createHandler.js
function createHandler(options) {
  const { validate, execute, eventName, errorCode } = options;

  return async function(socket, userId, data) {
    const { clientSeq } = data;

    const validationError = validate?.(data);
    if (validationError) {
      socket.emit('error', { code: 'INVALID_REQUEST', message: validationError });
      return;
    }

    const transaction = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction, lock: true });
      if (!user) {
        await transaction.rollback();
        socket.emit('action_rejected', { clientSeq, reason: 'User not found' });
        return;
      }

      const result = await execute(user, data, transaction);

      if (!result.success) {
        await transaction.rollback();
        socket.emit('action_rejected', { clientSeq, ...result });
        return;
      }

      await user.save({ transaction });
      await transaction.commit();

      broadcastToUser(namespace, userId, eventName, { ...result.data, clientSeq });
    } catch (err) {
      await transaction.rollback();
      socket.emit('error', { code: errorCode, message: 'Operation failed' });
    }
  };
}
```

**Impact:** Reduce essenceTapHandler.js from ~2,841 to ~800 lines.

---

### Phase 3: Domain Separation (High Risk, High Impact)
**Estimated Effort: 2-3 weeks**

Split essenceTapService.js into domain modules:

```
backend/services/essenceTap/
  index.js                    # Re-exports all
  core/
    state.js                  # Initial state, state helpers
    taps.js                   # Tap processing
    stats.js                  # Stat calculations
  generators/
    service.js                # Generator logic
    calculations.js           # Cost/production formulas
  upgrades/
    service.js                # Upgrade logic
  prestige/
    service.js                # Prestige logic
    upgrades.js               # Prestige upgrade logic
  abilities/
    service.js                # Ability logic
  gambling/
    service.js                # Gambling logic
    jackpot.js                # Jackpot logic
  boss/
    service.js                # Boss encounter logic
  challenges/
    daily.js                  # Daily challenges
    milestones.js             # Milestone logic
  tournament/
    service.js                # Tournament logic
  characters/
    service.js                # Character assignment
    synergies.js              # Synergy calculations
  tickets/
    service.js                # Ticket generation
```

---

### Phase 4: Frontend Hook Refactoring (Medium Risk, Medium Impact)
**Estimated Effort: 1 week**

Split useEssenceTap.js into focused hooks:

```
frontend/src/hooks/essenceTap/
  useEssenceTapState.js       # Core state management
  useEssenceTapSocket.js      # WebSocket (already exists)
  useEssenceTapClick.js       # Click handling, combo
  useEssenceTapAchievements.js # Achievement tracking
  useEssenceTapLifecycle.js   # Page lifecycle handling
  useEssenceTap.js            # Composition hook
```

---

### Phase 5: Route Deduplication (Medium Risk, Medium Impact)
**Estimated Effort: 3-5 days**

Create route factories similar to WebSocket handlers:

```javascript
// Proposed: createRoute.js
const createRoute = (options) => {
  const { validate, execute, lockUser = true } = options;

  return async (req, res) => {
    const userId = req.user.id;
    const transaction = lockUser ? await sequelize.transaction() : null;

    try {
      const validationError = validate?.(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const user = lockUser
        ? await User.findByPk(userId, { transaction, lock: true })
        : await User.findByPk(userId);

      if (!user) {
        transaction?.rollback();
        return res.status(404).json({ error: 'User not found' });
      }

      const result = await execute(user, req.body, transaction);

      if (!result.success) {
        transaction?.rollback();
        return res.status(400).json({ error: result.error });
      }

      if (lockUser) {
        await user.save({ transaction });
        await transaction.commit();
      }

      res.json(result.data);
    } catch (err) {
      transaction?.rollback();
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
```

---

## 5. Risk Assessment

### Refactoring Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking WebSocket messages | High | Critical | Version API, test all events |
| State shape changes | Medium | High | Use type guards, migration |
| Race condition bugs | Medium | High | Keep transaction logic identical |
| Performance regression | Low | Medium | Benchmark before/after |
| Feature regression | Medium | High | Comprehensive test suite first |

### API Contract Preservation

**Critical WebSocket Events (Do Not Change):**
- `state_full`, `state_delta`, `tap_confirmed`
- `prestige_complete`, `ability_activated`
- `gamble_result`, `infusion_complete`
- `character_assigned`, `character_unassigned`
- All `*_claimed` events

**Critical REST Endpoints (Do Not Change):**
- `POST /essence-tap/tap`
- `POST /essence-tap/prestige`
- `POST /essence-tap/sync-on-leave`
- `POST /essence-tap/initialize`
- `GET /essence-tap/status`

---

## 6. Proposed Architecture

```
backend/
├── config/
│   └── essenceTap/
│       ├── index.js              # Re-exports all config
│       ├── generators.config.js   # Generator definitions
│       ├── upgrades.config.js     # Upgrade definitions
│       ├── prestige.config.js     # Prestige settings
│       ├── abilities.config.js    # Ability definitions
│       ├── boss.config.js         # Boss encounter settings
│       ├── challenges.config.js   # Daily challenges
│       ├── milestones.config.js   # Milestone definitions
│       ├── tournament.config.js   # Tournament settings
│       └── game.config.js         # Core game settings
│
├── services/essenceTap/
│   ├── index.js                   # Facade pattern re-export
│   ├── core/
│   │   ├── state.service.js       # State management
│   │   ├── tap.service.js         # Tap processing
│   │   └── stats.service.js       # Stat calculations
│   ├── generators/
│   │   └── generator.service.js
│   ├── upgrades/
│   │   └── upgrade.service.js
│   ├── prestige/
│   │   └── prestige.service.js
│   ├── abilities/
│   │   └── ability.service.js
│   ├── gambling/
│   │   └── gambling.service.js
│   ├── boss/
│   │   └── boss.service.js
│   ├── challenges/
│   │   ├── daily.service.js
│   │   └── milestone.service.js
│   ├── tournament/
│   │   └── tournament.service.js
│   ├── characters/
│   │   └── character.service.js
│   └── tickets/
│       └── ticket.service.js
│
├── websocket/
│   └── essenceTap/
│       ├── index.js               # Handler registration
│       ├── createHandler.js       # Handler factory
│       ├── handlers/
│       │   ├── tap.handler.js
│       │   ├── generator.handler.js
│       │   ├── upgrade.handler.js
│       │   ├── prestige.handler.js
│       │   ├── ability.handler.js
│       │   ├── gambling.handler.js
│       │   ├── boss.handler.js
│       │   ├── challenge.handler.js
│       │   ├── tournament.handler.js
│       │   └── character.handler.js
│       └── utils/
│           ├── broadcast.js
│           └── sequence.js
│
└── routes/
    └── essenceTap/
        ├── index.js               # Route registration
        ├── createRoute.js         # Route factory
        └── routes/
            ├── tap.routes.js
            ├── generator.routes.js
            └── ... (mirrors handlers)

frontend/src/
├── hooks/essenceTap/
│   ├── index.js                   # Re-exports
│   ├── useEssenceTapState.js      # Core state
│   ├── useEssenceTapSocket.js     # WebSocket
│   ├── useEssenceTapClick.js      # Click handling
│   ├── useEssenceTapAchievements.js
│   └── useEssenceTap.js           # Composition
│
├── components/EssenceTap/
│   └── (existing structure OK)
│
└── types/
    └── essenceTap.types.ts        # Shared types

shared/
└── types/
    ├── essenceTap.types.ts        # Core types
    ├── events.types.ts            # WebSocket events
    └── api.types.ts               # REST contracts
```

---

## 7. Implementation Order

### Recommended Order (Incremental & Testable)

1. **Types First** (Phase 1)
   - Add types without changing runtime behavior
   - Enables better tooling immediately
   - Zero risk to existing functionality

2. **Handler Factory** (Phase 2)
   - Create factory alongside existing handlers
   - Migrate one handler at a time
   - Test each migration individually

3. **Service Split** (Phase 3)
   - Create new modules with forwarding from old service
   - Migrate functions incrementally
   - Keep old file as facade

4. **Frontend Hooks** (Phase 4)
   - Create new hooks alongside existing
   - Migrate component by component
   - Old hook can compose new ones

5. **Route Cleanup** (Phase 5)
   - Same strategy as WebSocket handlers

---

## 8. Testing Strategy

Before any refactoring, establish baseline tests:

```javascript
// Essential test cases
describe('EssenceTap Core', () => {
  // State initialization
  test('getInitialState returns valid state shape');

  // Tap processing
  test('processTap increases essence correctly');
  test('processTap respects click power and crit');

  // Generator purchase
  test('purchaseGenerator deducts cost');
  test('purchaseGenerator increases production');

  // Prestige
  test('prestige resets essence but keeps shards');
  test('prestige calculates rewards correctly');
});

describe('WebSocket Events', () => {
  // Verify message formats don't change
  test('tap_confirmed contains required fields');
  test('state_full contains complete state');
});
```

---

## 9. Conclusion

The Essence Tap codebase is functional but has significant technical debt. The main issues are:

1. **Monolithic files** making changes risky
2. **Massive duplication** wasting developer time
3. **No type safety** causing bugs and hindering refactoring
4. **Tight coupling** preventing unit testing

The recommended approach is incremental refactoring starting with low-risk, high-impact changes (types and handler factories) before tackling the larger domain separation.

**Estimated Total Effort:** 4-6 weeks for full refactoring
**Recommended Approach:** Incremental, one phase at a time, with comprehensive testing

---

## Appendix A: File Line Counts

| File | Lines |
|------|-------|
| backend/services/essenceTapService.js | 3,633 |
| backend/routes/essenceTap.js | 2,941 |
| backend/websocket/essenceTapHandler.js | 2,841 |
| backend/config/essenceTap.js | 1,950 |
| frontend/hooks/useEssenceTap.js | 1,686 |
| frontend/hooks/useEssenceTapSocket.js | 1,874 |
| **Total** | **14,925** |

## Appendix B: Exported Functions from essenceTapService.js

```
Core: getInitialState, processTap, processMultipleTaps, calculateProductionPerSecond
Generators: purchaseGenerator, getGeneratorCost, getGeneratorInfo, getAvailableGenerators
Upgrades: purchaseUpgrade, getUpgradeCost, getAvailableUpgrades
Abilities: activateAbility, processActiveAbilities, getAbilityInfo
Prestige: prestige, getPrestigeInfo, purchasePrestigeUpgrade, calculatePrestigeRewards
Gambling: gamble, checkJackpot, resetJackpot, getGambleInfo
Infusion: performInfusion, getInfusionInfo
Boss: spawnBoss, attackBoss, claimBossReward, getBossInfo
Challenges: resetDaily, checkDailyChallenges, claimDailyChallenge, getDailyChallengesWithProgress
Milestones: checkMilestones, claimMilestone, claimRepeatableMilestone, checkRepeatableMilestones
Tournament: updateWeeklyProgress, getWeeklyTournamentInfo, claimWeeklyRewards, claimTournamentCheckpoint
Characters: assignCharacter, unassignCharacter, calculateCharacterBonuses, getSynergyInfo
Tickets: checkDailyStreakTickets, exchangeFatePointsForTickets
Utility: resetWeeklyFPIfNeeded, applyFPWithCap, getWeeklyFPBudget, getGameConfig
```

---

**END OF AUDIT REPORT**

*Awaiting approval to proceed with implementation.*
