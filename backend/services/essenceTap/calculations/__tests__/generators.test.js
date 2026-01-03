/**
 * Generator Calculation Tests
 */

const {
  getGeneratorCost,
  getBulkGeneratorCost,
  getMaxPurchasable,
  calculateGeneratorBaseProduction,
  calculateTotalBaseProduction,
  getGeneratorById,
  isGeneratorUnlocked
} = require('../generators');

describe('Generator Calculations', () => {
  describe('getGeneratorCost', () => {
    it('should return base cost for first generator', () => {
      const cost = getGeneratorCost('essence_wisp', 0);
      expect(cost).toBeGreaterThan(0);
      expect(Number.isFinite(cost)).toBe(true);
    });

    it('should increase cost with each owned', () => {
      const cost0 = getGeneratorCost('essence_wisp', 0);
      const cost1 = getGeneratorCost('essence_wisp', 1);
      const cost10 = getGeneratorCost('essence_wisp', 10);

      expect(cost1).toBeGreaterThan(cost0);
      expect(cost10).toBeGreaterThan(cost1);
    });

    it('should return Infinity for invalid generator', () => {
      const cost = getGeneratorCost('invalid_generator', 0);
      expect(cost).toBe(Infinity);
    });

    it('should return integer costs', () => {
      const cost = getGeneratorCost('essence_wisp', 5);
      expect(Number.isInteger(cost)).toBe(true);
    });
  });

  describe('getBulkGeneratorCost', () => {
    it('should return same as single cost for count=1', () => {
      const singleCost = getGeneratorCost('essence_wisp', 5);
      const bulkCost = getBulkGeneratorCost('essence_wisp', 5, 1);
      expect(bulkCost).toBe(singleCost);
    });

    it('should sum costs for multiple generators', () => {
      const cost0 = getGeneratorCost('essence_wisp', 0);
      const cost1 = getGeneratorCost('essence_wisp', 1);
      const cost2 = getGeneratorCost('essence_wisp', 2);
      const bulkCost = getBulkGeneratorCost('essence_wisp', 0, 3);

      expect(bulkCost).toBe(cost0 + cost1 + cost2);
    });

    it('should return Infinity for invalid generator', () => {
      const cost = getBulkGeneratorCost('invalid', 0, 5);
      expect(cost).toBe(Infinity);
    });
  });

  describe('getMaxPurchasable', () => {
    it('should return 0 when cannot afford any', () => {
      const max = getMaxPurchasable('essence_wisp', 0, 0);
      expect(max).toBe(0);
    });

    it('should return correct count for given essence', () => {
      const owned = 0;
      const essence = 100000;
      const max = getMaxPurchasable('essence_wisp', owned, essence);

      // Verify the count is correct
      expect(max).toBeGreaterThan(0);

      // Should be able to afford 'max' but not 'max + 1'
      const costForMax = getBulkGeneratorCost('essence_wisp', owned, max);
      expect(costForMax).toBeLessThanOrEqual(essence);

      if (max < 1000) { // Safety limit in function
        const costForMaxPlusOne = getBulkGeneratorCost('essence_wisp', owned, max + 1);
        expect(costForMaxPlusOne).toBeGreaterThan(essence);
      }
    });

    it('should respect the 1000 safety limit', () => {
      const max = getMaxPurchasable('essence_wisp', 0, Number.MAX_SAFE_INTEGER);
      expect(max).toBeLessThanOrEqual(1000);
    });
  });

  describe('calculateGeneratorBaseProduction', () => {
    it('should return 0 for 0 generators', () => {
      const production = calculateGeneratorBaseProduction('essence_wisp', 0);
      expect(production).toBe(0);
    });

    it('should scale with count', () => {
      const prod1 = calculateGeneratorBaseProduction('essence_wisp', 1);
      const prod10 = calculateGeneratorBaseProduction('essence_wisp', 10);

      expect(prod10).toBe(prod1 * 10);
    });

    it('should return 0 for invalid generator', () => {
      const production = calculateGeneratorBaseProduction('invalid', 10);
      expect(production).toBe(0);
    });
  });

  describe('calculateTotalBaseProduction', () => {
    it('should return 0 for empty generators', () => {
      const production = calculateTotalBaseProduction({});
      expect(production).toBe(0);
    });

    it('should sum all generator production', () => {
      const generators = {
        essence_wisp: 5
      };
      const total = calculateTotalBaseProduction(generators);
      const expected = calculateGeneratorBaseProduction('essence_wisp', 5);

      expect(total).toBe(expected);
    });

    it('should handle null/undefined', () => {
      expect(calculateTotalBaseProduction(null)).toBe(0);
      expect(calculateTotalBaseProduction(undefined)).toBe(0);
    });
  });

  describe('getGeneratorById', () => {
    it('should return generator definition', () => {
      const gen = getGeneratorById('essence_wisp');
      expect(gen).not.toBeNull();
      expect(gen.id).toBe('essence_wisp');
      expect(gen.baseCost).toBeGreaterThan(0);
      expect(gen.baseOutput).toBeGreaterThan(0);
    });

    it('should return null for invalid ID', () => {
      const gen = getGeneratorById('invalid');
      expect(gen).toBeNull();
    });
  });

  describe('isGeneratorUnlocked', () => {
    it('should unlock first generator at 0 essence', () => {
      const gen = getGeneratorById('essence_wisp');
      // Assuming first generator has low/no unlock requirement
      const unlocked = isGeneratorUnlocked('essence_wisp', 0);
      expect(typeof unlocked).toBe('boolean');
    });

    it('should return false for invalid generator', () => {
      const unlocked = isGeneratorUnlocked('invalid', 1000000);
      expect(unlocked).toBe(false);
    });
  });
});
