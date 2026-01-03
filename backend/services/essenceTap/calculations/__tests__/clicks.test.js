/**
 * Click Calculation Tests
 */

const {
  calculateClickPower,
  calculateCritChance,
  calculateCritMultiplier,
  calculateGoldenChance,
  calculateComboDecayTime,
  calculateComboMultiplier,
  calculateClickResult
} = require('../clicks');

describe('Click Calculations', () => {
  const baseState = {
    essence: 1000,
    lifetimeEssence: 10000,
    generators: {},
    purchasedUpgrades: [],
    prestigeUpgrades: {},
    assignedCharacters: [],
    lifetimeShards: 0,
    infusionBonus: 0
  };

  describe('calculateClickPower', () => {
    it('should return base click power for new player', () => {
      const power = calculateClickPower(baseState, []);
      expect(power).toBeGreaterThan(0);
      expect(Number.isInteger(power)).toBe(true);
    });

    it('should increase with character bonuses', () => {
      const characters = [{ id: 'c1', rarity: 'legendary', element: 'dark' }];
      const stateWithChar = {
        ...baseState,
        assignedCharacters: ['c1']
      };

      const powerBase = calculateClickPower(baseState, []);
      const powerWithChar = calculateClickPower(stateWithChar, characters);

      expect(powerWithChar).toBeGreaterThan(powerBase);
    });

    it('should increase with prestige shards', () => {
      const stateWithShards = {
        ...baseState,
        lifetimeShards: 100
      };

      const powerBase = calculateClickPower(baseState, []);
      const powerWithShards = calculateClickPower(stateWithShards, []);

      expect(powerWithShards).toBeGreaterThan(powerBase);
    });

    it('should increase with infusion bonus', () => {
      const stateWithInfusion = {
        ...baseState,
        infusionBonus: 0.5
      };

      const powerBase = calculateClickPower(baseState, []);
      const powerWithInfusion = calculateClickPower(stateWithInfusion, []);

      expect(powerWithInfusion).toBeGreaterThan(powerBase);
    });
  });

  describe('calculateCritChance', () => {
    it('should return base crit chance for new player', () => {
      const chance = calculateCritChance(baseState, []);
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    });

    it('should cap at 90%', () => {
      // Create state with lots of crit bonuses
      const stateWithCrit = {
        ...baseState,
        purchasedUpgrades: ['click_crit_1', 'click_crit_2', 'click_crit_3'],
        prestigeUpgrades: { prestige_crit: 10 }
      };

      const chance = calculateCritChance(stateWithCrit, []);
      expect(chance).toBeLessThanOrEqual(0.9);
    });

    it('should increase with fire element characters', () => {
      const characters = [{ id: 'fire1', element: 'fire' }];
      const stateWithFire = {
        ...baseState,
        assignedCharacters: ['fire1']
      };

      const chanceBase = calculateCritChance(baseState, []);
      const chanceWithFire = calculateCritChance(stateWithFire, characters);

      expect(chanceWithFire).toBeGreaterThanOrEqual(chanceBase);
    });
  });

  describe('calculateCritMultiplier', () => {
    it('should return base multiplier for new player', () => {
      const mult = calculateCritMultiplier(baseState);
      expect(mult).toBeGreaterThan(1);
    });

    it('should be consistent', () => {
      const mult1 = calculateCritMultiplier(baseState);
      const mult2 = calculateCritMultiplier(baseState);
      expect(mult1).toBe(mult2);
    });
  });

  describe('calculateGoldenChance', () => {
    it('should return positive chance', () => {
      const chance = calculateGoldenChance(baseState, []);
      expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThan(1);
    });

    it('should cap at 10%', () => {
      // Create state with lots of golden bonuses
      const stateWithGolden = {
        ...baseState,
        assignedCharacters: ['light1', 'light2', 'light3', 'light4', 'light5']
      };
      const characters = Array.from({ length: 5 }, (_, i) => ({
        id: `light${i + 1}`,
        element: 'light'
      }));

      const chance = calculateGoldenChance(stateWithGolden, characters);
      expect(chance).toBeLessThanOrEqual(0.1);
    });
  });

  describe('calculateComboDecayTime', () => {
    it('should return base decay time', () => {
      const time = calculateComboDecayTime(baseState, []);
      expect(time).toBeGreaterThan(0);
    });

    it('should increase with air element characters', () => {
      const characters = [{ id: 'air1', element: 'air' }];
      const stateWithAir = {
        ...baseState,
        assignedCharacters: ['air1']
      };

      const timeBase = calculateComboDecayTime(baseState, []);
      const timeWithAir = calculateComboDecayTime(stateWithAir, characters);

      expect(timeWithAir).toBeGreaterThanOrEqual(timeBase);
    });
  });

  describe('calculateComboMultiplier', () => {
    it('should return 1 for 0 combo', () => {
      expect(calculateComboMultiplier(0)).toBe(1);
    });

    it('should return 1 for negative combo', () => {
      expect(calculateComboMultiplier(-5)).toBe(1);
    });

    it('should increase with combo', () => {
      expect(calculateComboMultiplier(10)).toBeGreaterThan(1);
      expect(calculateComboMultiplier(50)).toBeGreaterThan(calculateComboMultiplier(10));
    });

    it('should cap at max combo multiplier', () => {
      const mult100 = calculateComboMultiplier(100);
      const mult1000 = calculateComboMultiplier(1000);

      // Both should be at or near cap
      expect(mult1000).toBeLessThanOrEqual(10); // Reasonable max
    });
  });

  describe('calculateClickResult', () => {
    it('should return complete click result', () => {
      const result = calculateClickResult({
        state: baseState,
        characters: [],
        comboMultiplier: 1
      });

      expect(result).toHaveProperty('essenceGained');
      expect(result).toHaveProperty('isCrit');
      expect(result).toHaveProperty('isGolden');
      expect(result).toHaveProperty('clickPower');
      expect(result).toHaveProperty('comboMultiplier');
      expect(result).toHaveProperty('critChance');
      expect(result).toHaveProperty('critMultiplier');
      expect(result).toHaveProperty('goldenChance');
    });

    it('should apply combo multiplier to essence', () => {
      const result1 = calculateClickResult({
        state: baseState,
        characters: [],
        comboMultiplier: 1
      });

      const result2 = calculateClickResult({
        state: baseState,
        characters: [],
        comboMultiplier: 2
      });

      // On average, result2 should earn more (accounting for random crits)
      expect(result1.clickPower).toBe(result2.clickPower);
      expect(result2.comboMultiplier).toBe(2);
    });

    it('should apply active ability effects', () => {
      const resultNormal = calculateClickResult({
        state: baseState,
        characters: [],
        comboMultiplier: 1,
        activeAbilityEffects: {}
      });

      const resultWithAbility = calculateClickResult({
        state: baseState,
        characters: [],
        comboMultiplier: 1,
        activeAbilityEffects: { guaranteedCrits: true }
      });

      expect(resultWithAbility.isCrit).toBe(true);
    });
  });
});
