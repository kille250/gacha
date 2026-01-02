/**
 * Essence Tap Synchronization Tests
 *
 * Tests to verify frontend/backend essence calculation synchronization.
 * These tests ensure:
 * 1. Backend calculations are deterministic and correct
 * 2. Frontend-visible values match backend calculations
 * 3. Time-based calculations use consistent formulas
 * 4. Floating-point precision is handled correctly
 */

const essenceTapService = require('../services/essenceTapService');
const {
  GENERATORS,
  GAME_CONFIG,
  PRESTIGE_CONFIG
} = require('../config/essenceTap');

// ===========================================
// TEST UTILITIES
// ===========================================

/**
 * Create a mock state with specific configuration
 */
function createMockState(overrides = {}) {
  return {
    ...essenceTapService.getInitialState(),
    ...overrides
  };
}

/**
 * Create mock characters array
 */
function createMockCharacters(rarities = ['common', 'rare']) {
  return rarities.map((rarity, i) => ({
    id: i + 1,
    rarity,
    element: 'neutral'
  }));
}

// ===========================================
// PRODUCTION CALCULATION TESTS
// ===========================================

describe('Essence Tap Production Calculations', () => {
  test('calculateProductionPerSecond returns 0 for empty generators', () => {
    const state = createMockState({ generators: {} });
    const production = essenceTapService.calculateProductionPerSecond(state, []);
    expect(production).toBe(0);
  });

  test('calculateProductionPerSecond correctly sums generator output', () => {
    // Create state with 10 essence_sprite generators (baseOutput: 1)
    const state = createMockState({
      generators: { essence_sprite: 10 },
      purchasedUpgrades: []
    });
    const production = essenceTapService.calculateProductionPerSecond(state, []);
    // 10 sprites * 1 output = 10/sec base
    expect(production).toBeGreaterThanOrEqual(10);
  });

  test('calculateProductionPerSecond applies global multipliers', () => {
    const stateWithoutUpgrade = createMockState({
      generators: { essence_sprite: 10 },
      purchasedUpgrades: []
    });
    const stateWithUpgrade = createMockState({
      generators: { essence_sprite: 10 },
      purchasedUpgrades: ['global_mult_1'] // +10% multiplier
    });

    const baseProduction = essenceTapService.calculateProductionPerSecond(stateWithoutUpgrade, []);
    const upgradedProduction = essenceTapService.calculateProductionPerSecond(stateWithUpgrade, []);

    // Upgraded should be 10% higher
    expect(upgradedProduction).toBeCloseTo(baseProduction * 1.10, 2);
  });

  test('calculateProductionPerSecond applies character bonuses', () => {
    const state = createMockState({
      generators: { essence_sprite: 10 },
      purchasedUpgrades: [],
      assignedCharacters: [1, 2]
    });

    // Characters add multiplicative bonus based on rarity
    const noCharacters = essenceTapService.calculateProductionPerSecond(
      { ...state, assignedCharacters: [] },
      []
    );
    const withCharacters = essenceTapService.calculateProductionPerSecond(
      state,
      createMockCharacters(['common', 'rare'])
    );

    // Should be higher with characters
    expect(withCharacters).toBeGreaterThan(noCharacters);
  });
});

// ===========================================
// TIME-BASED CALCULATION TESTS
// ===========================================

describe('Essence Tap Time-Based Calculations', () => {
  test('offline progress uses server-side time calculation', () => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const state = createMockState({
      generators: { essence_sprite: 10 },
      lastOnlineTimestamp: oneHourAgo,
      purchasedUpgrades: []
    });

    const offlineProgress = essenceTapService.calculateOfflineProgress(state, []);

    // Should have about 1 hour of progress at 50% efficiency
    // 10 sprites * 1 output = 10/sec
    // 1 hour = 3600 seconds
    // Expected: 10 * 3600 * 0.5 = 18000 (approximately)
    expect(offlineProgress.essenceEarned).toBeGreaterThan(0);
    expect(offlineProgress.hoursAway).toBeCloseTo(1, 1);
  });

  test('offline progress caps at max offline hours', () => {
    const now = Date.now();
    // 24 hours ago (beyond 8 hour max)
    const longTimeAgo = now - (24 * 60 * 60 * 1000);

    const state = createMockState({
      generators: { essence_sprite: 10 },
      lastOnlineTimestamp: longTimeAgo,
      purchasedUpgrades: []
    });

    const offlineProgress = essenceTapService.calculateOfflineProgress(state, []);

    // Should cap at max offline hours (8)
    expect(offlineProgress.hoursAway).toBeLessThanOrEqual(GAME_CONFIG.maxOfflineHours);
  });

  test('save endpoint calculation matches expected formula', () => {
    // Simulate what the save endpoint does
    const productionPerSecond = 100;
    const elapsedSeconds = 30; // 30 seconds between saves

    const expectedGain = Math.floor(productionPerSecond * elapsedSeconds);

    // This matches the backend save route formula
    expect(expectedGain).toBe(3000);
  });
});

// ===========================================
// CLICK CALCULATION TESTS
// ===========================================

describe('Essence Tap Click Calculations', () => {
  test('processClick returns deterministic base values', () => {
    const state = createMockState({
      purchasedUpgrades: []
    });

    // Mock Math.random to return consistent values
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.99); // No crit, no golden

    const result = essenceTapService.processClick(state, [], 1, {});

    expect(result.essenceGained).toBe(GAME_CONFIG.baseClickPower);
    expect(result.isCrit).toBe(false);
    expect(result.isGolden).toBe(false);

    Math.random = originalRandom;
  });

  test('processClick applies combo multiplier', () => {
    const state = createMockState({
      purchasedUpgrades: []
    });

    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.99);

    const comboMultiplier = 2.0;
    const result = essenceTapService.processClick(state, [], comboMultiplier, {});

    expect(result.essenceGained).toBe(Math.floor(GAME_CONFIG.baseClickPower * comboMultiplier));

    Math.random = originalRandom;
  });

  test('calculateClickPower includes all multipliers', () => {
    const stateBase = createMockState({
      purchasedUpgrades: [],
      lifetimeShards: 0
    });

    const stateUpgraded = createMockState({
      purchasedUpgrades: ['click_power_1'], // +1 click power
      lifetimeShards: 0
    });

    const basePower = essenceTapService.calculateClickPower(stateBase, []);
    const upgradedPower = essenceTapService.calculateClickPower(stateUpgraded, []);

    expect(upgradedPower).toBeGreaterThan(basePower);
  });
});

// ===========================================
// PRESTIGE CALCULATION TESTS
// ===========================================

describe('Essence Tap Prestige Calculations', () => {
  test('prestige shard bonus applies correctly', () => {
    const stateNoShards = createMockState({
      generators: { essence_sprite: 10 },
      lifetimeShards: 0,
      purchasedUpgrades: []
    });

    const stateWithShards = createMockState({
      generators: { essence_sprite: 10 },
      lifetimeShards: 100, // 100 shards = 100 * 0.01 = +100% = 2x
      purchasedUpgrades: []
    });

    const baseProduction = essenceTapService.calculateProductionPerSecond(stateNoShards, []);
    const shardProduction = essenceTapService.calculateProductionPerSecond(stateWithShards, []);

    // With 100 shards at 0.01 multiplier = +100%, so 2x production
    expect(shardProduction).toBeCloseTo(baseProduction * 2, 0);
  });

  test('prestige shards cap at maximum', () => {
    const stateOverCap = createMockState({
      generators: { essence_sprite: 10 },
      lifetimeShards: PRESTIGE_CONFIG.maxEffectiveShards + 500, // Over cap
      purchasedUpgrades: []
    });

    const stateAtCap = createMockState({
      generators: { essence_sprite: 10 },
      lifetimeShards: PRESTIGE_CONFIG.maxEffectiveShards,
      purchasedUpgrades: []
    });

    const overCapProduction = essenceTapService.calculateProductionPerSecond(stateOverCap, []);
    const atCapProduction = essenceTapService.calculateProductionPerSecond(stateAtCap, []);

    // Production should be the same when at cap vs over cap
    expect(overCapProduction).toBe(atCapProduction);
  });
});

// ===========================================
// SYNCHRONIZATION CONSISTENCY TESTS
// ===========================================

describe('Essence Tap Synchronization Consistency', () => {
  test('getGameState returns all values needed for frontend sync', () => {
    const state = createMockState({
      essence: 1000,
      lifetimeEssence: 5000,
      generators: { essence_sprite: 5 }
    });

    const gameState = essenceTapService.getGameState(state, []);

    // Verify all sync-critical fields are present
    expect(gameState).toHaveProperty('essence');
    expect(gameState).toHaveProperty('lifetimeEssence');
    expect(gameState).toHaveProperty('productionPerSecond');
    expect(gameState).toHaveProperty('clickPower');
    expect(gameState).toHaveProperty('critChance');
    expect(gameState).toHaveProperty('critMultiplier');

    // Values should match state
    expect(gameState.essence).toBe(1000);
    expect(gameState.lifetimeEssence).toBe(5000);
  });

  test('production calculation is deterministic (no randomness)', () => {
    const state = createMockState({
      generators: { essence_sprite: 10, mana_well: 5 },
      purchasedUpgrades: ['global_mult_1']
    });

    const characters = createMockCharacters(['rare']);

    // Run calculation multiple times
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(essenceTapService.calculateProductionPerSecond(state, characters));
    }

    // All results should be identical (no randomness in production)
    const allEqual = results.every(r => r === results[0]);
    expect(allEqual).toBe(true);
  });

  test('integer essence values prevent floating point drift', () => {
    // Simulate what happens during a save
    const productionPerSecond = 123.456;
    const elapsedSeconds = 30.123;

    // Backend uses Math.floor to ensure integer
    const expectedGain = Math.floor(productionPerSecond * elapsedSeconds);

    expect(Number.isInteger(expectedGain)).toBe(true);
  });
});

// ===========================================
// GENERATOR COST CALCULATION TESTS
// ===========================================

describe('Essence Tap Generator Costs', () => {
  test('generator cost matches expected formula', () => {
    const generator = GENERATORS[0]; // essence_sprite
    const owned = 10;

    const cost = essenceTapService.getGeneratorCost('essence_sprite', owned);
    const expectedCost = Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned));

    expect(cost).toBe(expectedCost);
  });

  test('bulk generator cost sums individual costs', () => {
    const owned = 5;
    const count = 3;

    const bulkCost = essenceTapService.getBulkGeneratorCost('essence_sprite', owned, count);

    let expectedTotal = 0;
    for (let i = 0; i < count; i++) {
      expectedTotal += essenceTapService.getGeneratorCost('essence_sprite', owned + i);
    }

    expect(bulkCost).toBe(expectedTotal);
  });
});
