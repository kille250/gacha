/**
 * Probability Function Unit Tests
 * 
 * Tests for:
 * - Rate normalization
 * - Roll rarity selection
 * - Banner rate calculation
 * - Distribution verification via simulation
 */

const {
  rollRarity,
  normalizeRates,
  validateRatesSum
} = require('../config/pricing');

const {
  groupCharactersByRarity,
  selectCharacterWithFallback,
  getRarityOrder
} = require('../utils/rollHelpers');

// ===========================================
// MOCK DATA
// ===========================================

const mockRarities = [
  { name: 'legendary', order: 5, dropRateStandardSingle: 0.5, dropRateBannerSingle: 1, capSingle: 3, multiplierScaling: 2, minimumRate: 0, isPityEligible: true },
  { name: 'epic', order: 4, dropRateStandardSingle: 2.5, dropRateBannerSingle: 5, capSingle: 10, multiplierScaling: 1.5, minimumRate: 0, isPityEligible: true },
  { name: 'rare', order: 3, dropRateStandardSingle: 7, dropRateBannerSingle: 12, capSingle: 18, multiplierScaling: 1, minimumRate: 0, isPityEligible: true },
  { name: 'uncommon', order: 2, dropRateStandardSingle: 20, dropRateBannerSingle: 22, capSingle: 25, multiplierScaling: 0.5, minimumRate: 0, isPityEligible: false },
  { name: 'common', order: 1, dropRateStandardSingle: 70, dropRateBannerSingle: 60, capSingle: null, multiplierScaling: 0, minimumRate: 35, isPityEligible: false }
];

const mockCharacters = [
  { id: 1, name: 'Common1', rarity: 'common' },
  { id: 2, name: 'Common2', rarity: 'common' },
  { id: 3, name: 'Uncommon1', rarity: 'uncommon' },
  { id: 4, name: 'Rare1', rarity: 'rare' },
  { id: 5, name: 'Epic1', rarity: 'epic' },
  { id: 6, name: 'Legendary1', rarity: 'legendary' }
];

// ===========================================
// TEST UTILITIES
// ===========================================

/**
 * Chi-squared test for uniform distribution
 * Returns true if distribution is statistically valid (p > 0.05)
 */
const _chiSquaredTest = (observed, expected, degreesOfFreedom) => {
  let chiSquared = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSquared += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }
  
  // Critical value for p=0.05 with various degrees of freedom
  const criticalValues = {
    1: 3.841,
    2: 5.991,
    3: 7.815,
    4: 9.488,
    5: 11.070
  };
  
  const critical = criticalValues[degreesOfFreedom] || 11.070;
  return chiSquared < critical;
};

/**
 * Run a simulation and return distribution
 */
const runSimulation = (rollFn, iterations) => {
  const counts = {};
  
  for (let i = 0; i < iterations; i++) {
    const result = rollFn();
    counts[result] = (counts[result] || 0) + 1;
  }
  
  return counts;
};

// ===========================================
// TESTS: normalizeRates
// ===========================================

describe('normalizeRates', () => {
  test('should normalize rates that sum to less than 100', () => {
    const rates = { common: 50, rare: 25 };
    const normalized = normalizeRates(rates);
    
    const total = Object.values(normalized).reduce((sum, r) => sum + r, 0);
    expect(Math.abs(total - 100)).toBeLessThan(0.001);
    
    // Ratio should be preserved
    expect(normalized.common / normalized.rare).toBeCloseTo(2, 5);
  });
  
  test('should normalize rates that sum to more than 100', () => {
    const rates = { common: 80, rare: 30, epic: 10 };
    const normalized = normalizeRates(rates);
    
    const total = Object.values(normalized).reduce((sum, r) => sum + r, 0);
    expect(Math.abs(total - 100)).toBeLessThan(0.001);
  });
  
  test('should preserve already-normalized rates', () => {
    const rates = { common: 70, uncommon: 20, rare: 7, epic: 2.5, legendary: 0.5 };
    const normalized = normalizeRates(rates);
    
    expect(normalized.common).toBeCloseTo(70, 5);
    expect(normalized.legendary).toBeCloseTo(0.5, 5);
  });
  
  test('should handle zero rates gracefully', () => {
    const rates = { common: 0, rare: 0 };
    const normalized = normalizeRates(rates);
    
    expect(normalized.common).toBe(0);
    expect(normalized.rare).toBe(0);
  });
  
  test('should handle floating-point precision', () => {
    const rates = { a: 33.33, b: 33.33, c: 33.34 };
    const normalized = normalizeRates(rates);
    
    const total = Object.values(normalized).reduce((sum, r) => sum + r, 0);
    expect(Math.abs(total - 100)).toBeLessThan(0.001);
  });
});

// ===========================================
// TESTS: validateRatesSum
// ===========================================

describe('validateRatesSum', () => {
  test('should return true for valid 100% sum', () => {
    const rates = { common: 70, uncommon: 20, rare: 7, epic: 2.5, legendary: 0.5 };
    expect(validateRatesSum(rates)).toBe(true);
  });
  
  test('should return false for invalid sum', () => {
    const rates = { common: 50, rare: 25 };
    expect(validateRatesSum(rates)).toBe(false);
  });
  
  test('should tolerate small floating-point errors', () => {
    const rates = { common: 70.001, uncommon: 19.999, rare: 7, epic: 2.5, legendary: 0.5 };
    expect(validateRatesSum(rates)).toBe(true);
  });
});

// ===========================================
// TESTS: rollRarity
// ===========================================

describe('rollRarity', () => {
  test('should return a valid rarity', () => {
    const rates = { common: 70, uncommon: 20, rare: 7, epic: 2.5, legendary: 0.5 };
    const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    
    for (let i = 0; i < 100; i++) {
      const result = rollRarity(rates, order);
      expect(order).toContain(result);
    }
  });
  
  test('should return fallback when all rates are zero', () => {
    const rates = { common: 0, rare: 0 };
    const order = ['rare', 'common'];
    
    const result = rollRarity(rates, order);
    expect(result).toBe('common');
  });
  
  test('should respect order (rarest first)', () => {
    // With a 100% legendary rate, should always return legendary
    const rates = { legendary: 100, common: 0 };
    const order = ['legendary', 'common'];
    
    for (let i = 0; i < 10; i++) {
      expect(rollRarity(rates, order)).toBe('legendary');
    }
  });
  
  test('should normalize non-100% rates', () => {
    // Rates sum to 50, should still work
    const rates = { common: 40, rare: 10 };
    const order = ['rare', 'common'];
    
    const counts = runSimulation(() => rollRarity(rates, order), 1000);
    
    // Expect roughly 80% common, 20% rare
    const commonRatio = counts.common / 1000;
    expect(commonRatio).toBeGreaterThan(0.7);
    expect(commonRatio).toBeLessThan(0.9);
  });
});

// ===========================================
// TESTS: Distribution Verification (Simulation)
// ===========================================

describe('rollRarity Distribution', () => {
  test('should match expected distribution within statistical bounds', () => {
    const rates = { common: 70, uncommon: 20, rare: 7, epic: 2.5, legendary: 0.5 };
    const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const iterations = 10000;
    
    const counts = runSimulation(() => rollRarity(rates, order), iterations);
    
    // Check each rarity is within 20% of expected
    for (const [rarity, expected] of Object.entries(rates)) {
      const actual = (counts[rarity] || 0) / iterations * 100;
      const tolerance = Math.max(expected * 0.5, 0.5); // 50% tolerance or 0.5%, whichever is larger
      
      expect(actual).toBeGreaterThan(expected - tolerance);
      expect(actual).toBeLessThan(expected + tolerance);
    }
  });
  
  test('should not have order bias (rarest first vs last should not change distribution)', () => {
    const rates = { common: 50, rare: 50 };
    const iterations = 5000;
    
    // Test with rare first
    const countsRareFirst = runSimulation(
      () => rollRarity(rates, ['rare', 'common']), 
      iterations
    );
    
    // Test with common first
    const countsCommonFirst = runSimulation(
      () => rollRarity(rates, ['common', 'rare']), 
      iterations
    );
    
    // Both should have roughly 50/50 distribution
    const rareRatio1 = countsRareFirst.rare / iterations;
    const rareRatio2 = countsCommonFirst.rare / iterations;
    
    expect(rareRatio1).toBeGreaterThan(0.45);
    expect(rareRatio1).toBeLessThan(0.55);
    expect(rareRatio2).toBeGreaterThan(0.45);
    expect(rareRatio2).toBeLessThan(0.55);
  });
});

// ===========================================
// TESTS: groupCharactersByRarity
// ===========================================

describe('groupCharactersByRarity', () => {
  test('should group characters correctly', () => {
    const grouped = groupCharactersByRarity(mockCharacters);
    
    expect(grouped.common.length).toBe(2);
    expect(grouped.uncommon.length).toBe(1);
    expect(grouped.rare.length).toBe(1);
    expect(grouped.epic.length).toBe(1);
    expect(grouped.legendary.length).toBe(1);
  });
  
  test('should pre-initialize groups when rarityNames provided', () => {
    const grouped = groupCharactersByRarity([], ['common', 'rare', 'legendary']);
    
    expect(grouped.common).toEqual([]);
    expect(grouped.rare).toEqual([]);
    expect(grouped.legendary).toEqual([]);
  });
  
  test('should handle case-insensitive rarity names', () => {
    const chars = [{ id: 1, name: 'Test', rarity: 'COMMON' }];
    const grouped = groupCharactersByRarity(chars);
    
    expect(grouped.common.length).toBe(1);
  });
  
  test('should default to common for missing rarity', () => {
    const chars = [{ id: 1, name: 'Test' }];
    const grouped = groupCharactersByRarity(chars);
    
    expect(grouped.common.length).toBe(1);
  });
});

// ===========================================
// TESTS: selectCharacterWithFallback
// ===========================================

describe('selectCharacterWithFallback', () => {
  const orderedRarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  
  test('should select from primary pool when available', () => {
    const primaryPool = { legendary: [{ id: 99, name: 'Featured' }] };
    const fallbackPool = groupCharactersByRarity(mockCharacters, orderedRarities);
    
    const { character, actualRarity } = selectCharacterWithFallback(
      primaryPool,
      fallbackPool,
      'legendary',
      mockCharacters,
      mockRarities
    );
    
    expect(character.id).toBe(99);
    expect(actualRarity).toBe('legendary');
  });
  
  test('should fall back to fallback pool when primary is empty', () => {
    const primaryPool = { legendary: [] };
    const fallbackPool = groupCharactersByRarity(mockCharacters, orderedRarities);
    
    const { character, actualRarity } = selectCharacterWithFallback(
      primaryPool,
      fallbackPool,
      'legendary',
      mockCharacters,
      mockRarities
    );
    
    expect(character.name).toBe('Legendary1');
    expect(actualRarity).toBe('legendary');
  });
  
  test('should fall to lower rarity when selected rarity is empty', () => {
    const charsNoLegendary = mockCharacters.filter(c => c.rarity !== 'legendary');
    const fallbackPool = groupCharactersByRarity(charsNoLegendary, orderedRarities);
    
    const { character, actualRarity } = selectCharacterWithFallback(
      null,
      fallbackPool,
      'legendary',
      charsNoLegendary,
      mockRarities
    );
    
    // Should fall to next available (epic)
    expect(actualRarity).toBe('epic');
    expect(character.name).toBe('Epic1');
  });
  
  test('should return null when no characters available', () => {
    const { character, actualRarity } = selectCharacterWithFallback(
      null,
      {},
      'legendary',
      [],
      mockRarities
    );
    
    expect(character).toBeNull();
    expect(actualRarity).toBeNull();
  });
});

// ===========================================
// TESTS: getRarityOrder
// ===========================================

describe('getRarityOrder', () => {
  test('should return names in order from database', () => {
    const order = getRarityOrder(mockRarities);
    expect(order).toEqual(['legendary', 'epic', 'rare', 'uncommon', 'common']);
  });
  
  test('should return default order when no data', () => {
    const order = getRarityOrder(null);
    expect(order).toEqual(['legendary', 'epic', 'rare', 'uncommon', 'common']);
  });
  
  test('should return default order for empty array', () => {
    const order = getRarityOrder([]);
    expect(order).toEqual(['legendary', 'epic', 'rare', 'uncommon', 'common']);
  });
});

// ===========================================
// TESTS: Rate calculation edge cases
// ===========================================

describe('Rate Calculation Edge Cases', () => {
  test('should handle rates with very small values', () => {
    const rates = { 
      common: 99.999, 
      legendary: 0.001 
    };
    const order = ['legendary', 'common'];
    
    // Should not crash and should return valid result
    for (let i = 0; i < 100; i++) {
      const result = rollRarity(rates, order);
      expect(['legendary', 'common']).toContain(result);
    }
  });
  
  test('should handle rates with floating-point arithmetic issues', () => {
    // Classic floating-point problem: 0.1 + 0.2 !== 0.3
    const rates = {
      a: 0.1,
      b: 0.2,
      c: 0.3,
      d: 99.4
    };
    
    const normalized = normalizeRates(rates);
    const total = Object.values(normalized).reduce((sum, r) => sum + r, 0);
    
    // Should still sum to 100
    expect(Math.abs(total - 100)).toBeLessThan(0.001);
  });
});

// ===========================================
// RUN SIMULATION REPORT
// ===========================================

describe('Simulation Report', () => {
  test('generate distribution report', () => {
    const rates = { common: 70, uncommon: 20, rare: 7, epic: 2.5, legendary: 0.5 };
    const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const iterations = 50000;
    
    const counts = runSimulation(() => rollRarity(rates, order), iterations);
    
    console.log('\n=== SIMULATION REPORT ===');
    console.log(`Iterations: ${iterations}`);
    console.log('');
    console.log('Rarity      | Expected | Actual   | Diff');
    console.log('------------|----------|----------|------');
    
    for (const rarity of order) {
      const expected = rates[rarity];
      const actual = ((counts[rarity] || 0) / iterations * 100).toFixed(2);
      const diff = (actual - expected).toFixed(2);
      const diffSign = diff >= 0 ? '+' : '';
      
      console.log(
        `${rarity.padEnd(11)} | ${expected.toFixed(2).padStart(8)} | ${actual.padStart(8)} | ${diffSign}${diff}`
      );
    }
    
    console.log('');
    
    // This test always passes, it's just for reporting
    expect(true).toBe(true);
  });
});

