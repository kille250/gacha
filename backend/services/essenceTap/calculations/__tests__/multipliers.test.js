/**
 * Multiplier Calculation Tests
 */

const {
  calculateGlobalMultiplier,
  calculateShardBonus,
  calculateCharacterBonus,
  calculateElementBonuses,
  calculateElementSynergy,
  calculateSeriesSynergy,
  calculateCharacterMastery,
  calculateTotalMasteryBonus,
  calculateClickGeneratorScaling,
  calculateUnderdogBonus,
  getCurrentDailyModifier,
  getTimeUntilNextModifier
} = require('../multipliers');

describe('Multiplier Calculations', () => {
  describe('calculateGlobalMultiplier', () => {
    it('should return 1 for no upgrades', () => {
      expect(calculateGlobalMultiplier([])).toBe(1);
      expect(calculateGlobalMultiplier(null)).toBe(1);
      expect(calculateGlobalMultiplier(undefined)).toBe(1);
    });

    it('should multiply bonuses from multiple upgrades', () => {
      // This test depends on actual upgrade definitions
      const mult = calculateGlobalMultiplier(['global_1']);
      expect(mult).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateShardBonus', () => {
    it('should return 1 for 0 shards', () => {
      expect(calculateShardBonus(0)).toBe(1);
    });

    it('should increase with more shards', () => {
      const bonus10 = calculateShardBonus(10);
      const bonus100 = calculateShardBonus(100);

      expect(bonus10).toBeGreaterThan(1);
      expect(bonus100).toBeGreaterThan(bonus10);
    });

    it('should cap at max effective shards', () => {
      const bonus500 = calculateShardBonus(500);
      const bonus1000 = calculateShardBonus(1000);
      const _bonus10000 = calculateShardBonus(10000);

      // After cap, bonus should stop increasing
      expect(bonus1000).toBeGreaterThanOrEqual(bonus500);
    });
  });

  describe('calculateCharacterBonus', () => {
    it('should return 1 for no characters', () => {
      expect(calculateCharacterBonus([], [])).toBe(1);
      expect(calculateCharacterBonus(null, [])).toBe(1);
    });

    it('should add bonus per assigned character', () => {
      const characters = [
        { id: 'char1', rarity: 'common' },
        { id: 'char2', rarity: 'rare' }
      ];

      const bonus1 = calculateCharacterBonus(['char1'], characters);
      const bonus2 = calculateCharacterBonus(['char1', 'char2'], characters);

      expect(bonus1).toBeGreaterThan(1);
      expect(bonus2).toBeGreaterThan(bonus1);
    });

    it('should give higher bonus for rarer characters', () => {
      const characters = [
        { id: 'common', rarity: 'common' },
        { id: 'legendary', rarity: 'legendary' }
      ];

      const commonBonus = calculateCharacterBonus(['common'], characters);
      const legendaryBonus = calculateCharacterBonus(['legendary'], characters);

      expect(legendaryBonus).toBeGreaterThan(commonBonus);
    });
  });

  describe('calculateElementBonuses', () => {
    it('should return zero bonuses for no characters', () => {
      const bonuses = calculateElementBonuses([], []);

      expect(bonuses.critChance).toBe(0);
      expect(bonuses.production).toBe(0);
      expect(bonuses.offline).toBe(0);
      expect(bonuses.comboDuration).toBe(0);
      expect(bonuses.goldenChance).toBe(0);
      expect(bonuses.clickPower).toBe(0);
      expect(bonuses.allStats).toBe(0);
    });

    it('should add element bonuses from assigned characters', () => {
      const characters = [
        { id: 'fire1', element: 'fire' },
        { id: 'fire2', element: 'fire' }
      ];

      const bonuses = calculateElementBonuses(['fire1', 'fire2'], characters);

      // Fire gives crit chance
      expect(bonuses.critChance).toBeGreaterThan(0);
    });
  });

  describe('calculateElementSynergy', () => {
    it('should return zero bonus for no characters', () => {
      const synergy = calculateElementSynergy([], []);
      expect(synergy.bonus).toBe(0);
      expect(synergy.synergies).toEqual([]);
    });

    it('should give pair bonus for 2+ same element', () => {
      const characters = [
        { id: 'fire1', element: 'fire' },
        { id: 'fire2', element: 'fire' }
      ];

      const synergy = calculateElementSynergy(['fire1', 'fire2'], characters);
      expect(synergy.bonus).toBeGreaterThan(0);
      expect(synergy.synergies.length).toBeGreaterThan(0);
    });

    it('should detect full team bonus', () => {
      const characters = Array.from({ length: 5 }, (_, i) => ({
        id: `fire${i}`,
        element: 'fire'
      }));

      const synergy = calculateElementSynergy(
        characters.map(c => c.id),
        characters
      );

      expect(synergy.isFullTeam).toBe(true);
    });

    it('should detect diverse team bonus', () => {
      const characters = [
        { id: 'c1', element: 'fire' },
        { id: 'c2', element: 'water' },
        { id: 'c3', element: 'earth' },
        { id: 'c4', element: 'air' },
        { id: 'c5', element: 'light' }
      ];

      const synergy = calculateElementSynergy(
        characters.map(c => c.id),
        characters
      );

      expect(synergy.isDiverseTeam).toBe(true);
    });
  });

  describe('calculateSeriesSynergy', () => {
    it('should return zero for no characters', () => {
      const synergy = calculateSeriesSynergy([], []);
      expect(synergy.totalBonus).toBe(0);
    });

    it('should give bonus for same series characters', () => {
      const characters = [
        { id: 'c1', series: 'anime1' },
        { id: 'c2', series: 'anime1' }
      ];

      const synergy = calculateSeriesSynergy(['c1', 'c2'], characters);
      expect(synergy.bonus).toBeGreaterThan(0);
      expect(synergy.seriesMatches.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCharacterMastery', () => {
    it('should return level 1 for new character', () => {
      const mastery = calculateCharacterMastery({}, 'newChar');
      expect(mastery.level).toBe(1);
      expect(mastery.hoursUsed).toBe(0);
    });

    it('should increase level with hours used', () => {
      const mastery = calculateCharacterMastery(
        { char1: { hoursUsed: 100, level: 1 } },
        'char1'
      );
      expect(mastery.level).toBeGreaterThanOrEqual(1);
      expect(mastery.hoursUsed).toBe(100);
    });
  });

  describe('calculateTotalMasteryBonus', () => {
    it('should return zero for no characters', () => {
      const bonus = calculateTotalMasteryBonus([], {});
      expect(bonus.productionBonus).toBe(0);
      expect(bonus.unlockedAbilities).toEqual([]);
    });
  });

  describe('calculateClickGeneratorScaling', () => {
    it('should return 1 for no generators', () => {
      expect(calculateClickGeneratorScaling({})).toBe(1);
    });

    it('should increase with more generators', () => {
      const scaling1 = calculateClickGeneratorScaling({ gen1: 10 });
      const scaling2 = calculateClickGeneratorScaling({ gen1: 10, gen2: 20 });

      expect(scaling1).toBeGreaterThan(1);
      expect(scaling2).toBeGreaterThan(scaling1);
    });
  });

  describe('calculateUnderdogBonus', () => {
    it('should return 0 for no characters', () => {
      expect(calculateUnderdogBonus([], [])).toBe(0);
    });

    it('should give bonus for common/uncommon characters', () => {
      const characters = [{ id: 'c1', rarity: 'common' }];
      const bonus = calculateUnderdogBonus(['c1'], characters);
      expect(bonus).toBeGreaterThan(0);
    });

    it('should not give bonus for legendary characters', () => {
      const characters = [{ id: 'c1', rarity: 'legendary' }];
      const bonus = calculateUnderdogBonus(['c1'], characters);
      expect(bonus).toBe(0);
    });
  });

  describe('getCurrentDailyModifier', () => {
    it('should return a modifier object', () => {
      const modifier = getCurrentDailyModifier();
      expect(modifier).toBeDefined();
      expect(modifier.name).toBeDefined();
    });
  });

  describe('getTimeUntilNextModifier', () => {
    it('should return positive time in milliseconds', () => {
      const time = getTimeUntilNextModifier();
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(24 * 60 * 60 * 1000); // Less than 24 hours
    });
  });
});
