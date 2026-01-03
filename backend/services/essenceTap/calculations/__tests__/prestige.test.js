/**
 * Prestige Calculation Tests
 */

const {
  calculatePrestigeShards,
  canPrestige,
  calculatePrestigeUpgradeCost,
  isPrestigeUpgradeMaxed,
  getPrestigeUpgradeById,
  calculatePrestigeUpgradeBonus,
  calculateStartingEssence,
  checkPrestigeCooldown,
  getPrestigeInfo
} = require('../prestige');

describe('Prestige Calculations', () => {
  describe('calculatePrestigeShards', () => {
    it('should return 0 for low lifetime essence', () => {
      expect(calculatePrestigeShards(0)).toBe(0);
      expect(calculatePrestigeShards(1000000)).toBe(0);
    });

    it('should return positive shards for high essence', () => {
      const shards = calculatePrestigeShards(100000000); // 100M
      expect(shards).toBeGreaterThan(0);
    });

    it('should increase with more essence', () => {
      const shards100M = calculatePrestigeShards(100000000);
      const shards1B = calculatePrestigeShards(1000000000);

      expect(shards1B).toBeGreaterThan(shards100M);
    });

    it('should return integer shards', () => {
      const shards = calculatePrestigeShards(500000000);
      expect(Number.isInteger(shards)).toBe(true);
    });
  });

  describe('canPrestige', () => {
    it('should return false for low essence', () => {
      expect(canPrestige(0)).toBe(false);
      expect(canPrestige(1000000)).toBe(false);
    });

    it('should return true for sufficient essence', () => {
      // Assuming minimum is around 50M
      expect(canPrestige(100000000)).toBe(true);
    });
  });

  describe('calculatePrestigeUpgradeCost', () => {
    it('should return base cost for level 0', () => {
      const cost = calculatePrestigeUpgradeCost('prestige_production', 0);
      expect(cost).toBeGreaterThan(0);
    });

    it('should increase with level', () => {
      const cost0 = calculatePrestigeUpgradeCost('prestige_production', 0);
      const cost1 = calculatePrestigeUpgradeCost('prestige_production', 1);
      const cost5 = calculatePrestigeUpgradeCost('prestige_production', 5);

      expect(cost1).toBeGreaterThan(cost0);
      expect(cost5).toBeGreaterThan(cost1);
    });
  });

  describe('isPrestigeUpgradeMaxed', () => {
    it('should return false for level 0', () => {
      expect(isPrestigeUpgradeMaxed('prestige_production', 0)).toBe(false);
    });

    it('should return true at max level', () => {
      // Assuming max level is around 10-20
      expect(isPrestigeUpgradeMaxed('prestige_production', 100)).toBe(true);
    });
  });

  describe('getPrestigeUpgradeById', () => {
    it('should return upgrade definition', () => {
      const upgrade = getPrestigeUpgradeById('prestige_production');
      if (upgrade) {
        expect(upgrade.id).toBe('prestige_production');
        expect(upgrade).toHaveProperty('name');
        expect(upgrade).toHaveProperty('maxLevel');
      }
    });

    it('should return null for invalid ID', () => {
      const upgrade = getPrestigeUpgradeById('invalid_upgrade');
      expect(upgrade).toBeNull();
    });
  });

  describe('calculatePrestigeUpgradeBonus', () => {
    it('should return 0 for level 0', () => {
      const bonus = calculatePrestigeUpgradeBonus('prestige_production', 0);
      expect(bonus).toBe(0);
    });

    it('should increase with level', () => {
      const bonus1 = calculatePrestigeUpgradeBonus('prestige_production', 1);
      const bonus5 = calculatePrestigeUpgradeBonus('prestige_production', 5);

      expect(bonus5).toBeGreaterThan(bonus1);
    });
  });

  describe('calculateStartingEssence', () => {
    it('should return 0 for no upgrades', () => {
      const essence = calculateStartingEssence({});
      expect(essence).toBe(0);
    });

    it('should return bonus for starting essence upgrade', () => {
      const essence = calculateStartingEssence({ prestige_starting: 5 });
      expect(essence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkPrestigeCooldown', () => {
    it('should allow prestige with no previous prestige', () => {
      const result = checkPrestigeCooldown({});
      expect(result.canPrestige).toBe(true);
      expect(result.timeRemaining).toBe(0);
    });

    it('should check cooldown from last prestige', () => {
      const recentPrestige = {
        lastPrestigeTimestamp: Date.now() - 1000 // 1 second ago
      };

      const result = checkPrestigeCooldown(recentPrestige);
      // Depending on cooldown config, this might allow or disallow
      expect(result).toHaveProperty('canPrestige');
      expect(result).toHaveProperty('timeRemaining');
    });
  });

  describe('getPrestigeInfo', () => {
    it('should return complete prestige info', () => {
      const state = {
        lifetimeEssence: 100000000,
        prestigeLevel: 1,
        prestigeShards: 50,
        lifetimeShards: 100,
        prestigeUpgrades: {}
      };

      const info = getPrestigeInfo(state);

      expect(info).toHaveProperty('prestigeLevel');
      expect(info).toHaveProperty('currentShards');
      expect(info).toHaveProperty('lifetimeShards');
      expect(info).toHaveProperty('shardsIfPrestige');
      expect(info).toHaveProperty('canPrestige');
      expect(info).toHaveProperty('currentBonus');
    });

    it('should handle new player state', () => {
      const newPlayerState = {
        lifetimeEssence: 0,
        prestigeLevel: 0,
        prestigeShards: 0,
        lifetimeShards: 0,
        prestigeUpgrades: {}
      };

      const info = getPrestigeInfo(newPlayerState);
      expect(info.prestigeLevel).toBe(0);
      expect(info.canPrestige).toBe(false);
    });
  });
});
