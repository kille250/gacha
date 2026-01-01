/**
 * Currency Adapter Tests
 *
 * Tests for currency conversion and transaction handling
 * between your game economy and OpenHotel credits.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CurrencyAdapter, CURRENCY_TYPE } from '../adapters/currencyAdapter';

// Mock API
vi.mock('../../../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

import api from '../../../utils/api';

describe('CurrencyAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new CurrencyAdapter();
    vi.clearAllMocks();
  });

  describe('Currency Conversion', () => {
    it('should convert points to credits', () => {
      // 100 points = 1 credit
      expect(adapter.convertToCredits(CURRENCY_TYPE.POINTS, 100)).toBe(1);
      expect(adapter.convertToCredits(CURRENCY_TYPE.POINTS, 500)).toBe(5);
      expect(adapter.convertToCredits(CURRENCY_TYPE.POINTS, 99)).toBe(0);
    });

    it('should convert fate points to credits', () => {
      // 5 fate points = 1 credit (premium rate)
      expect(adapter.convertToCredits(CURRENCY_TYPE.FATE_POINTS, 5)).toBe(1);
      expect(adapter.convertToCredits(CURRENCY_TYPE.FATE_POINTS, 25)).toBe(5);
      expect(adapter.convertToCredits(CURRENCY_TYPE.FATE_POINTS, 4)).toBe(0);
    });

    it('should convert credits to points', () => {
      // 1 credit = 100 points
      expect(adapter.convertFromCredits(CURRENCY_TYPE.POINTS, 1)).toBe(100);
      expect(adapter.convertFromCredits(CURRENCY_TYPE.POINTS, 10)).toBe(1000);
    });

    it('should convert credits to fate points', () => {
      // 1 credit = 5 fate points
      expect(adapter.convertFromCredits(CURRENCY_TYPE.FATE_POINTS, 1)).toBe(5);
      expect(adapter.convertFromCredits(CURRENCY_TYPE.FATE_POINTS, 10)).toBe(50);
    });

    it('should throw for unknown currency type', () => {
      expect(() => adapter.convertToCredits('invalid', 100)).toThrow();
      expect(() => adapter.convertFromCredits('invalid', 100)).toThrow();
    });
  });

  describe('Balance Calculation', () => {
    it('should calculate hotel credits from user data', () => {
      const user = {
        points: 1000, // 10 credits
        fatePoints: {
          banner1: { points: 50 }, // 10 credits
          banner2: { points: 25 }  // 5 credits
        }
      };

      const credits = adapter.calculateHotelCredits(user);
      expect(credits).toBe(25); // 10 + 10 + 5
    });

    it('should handle missing fate points', () => {
      const user = { points: 500 };
      const credits = adapter.calculateHotelCredits(user);
      expect(credits).toBe(5);
    });

    it('should sum fate points across banners', () => {
      const fatePoints = {
        banner1: { points: 10 },
        banner2: { points: 20 },
        banner3: { points: 30 }
      };

      expect(adapter.sumFatePoints(fatePoints)).toBe(60);
    });
  });

  describe('Purchase Processing', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({
        data: {
          points: 1000,
          fatePoints: { test: { points: 50 } },
          rollTickets: 5,
          premiumTickets: 2
        }
      });
    });

    it('should check affordability', async () => {
      const canAfford5 = await adapter.canAfford(5);
      expect(canAfford5).toBe(true);

      const canAfford100 = await adapter.canAfford(100);
      expect(canAfford100).toBe(false);
    });

    it('should process purchase with mixed currencies', async () => {
      // User has: 1000 points (10 credits) + 50 fate points (10 credits) = 20 credits
      const result = await adapter.processPurchase(15);

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.deductions).toBeDefined();
    });

    it('should prefer fate points over regular points', async () => {
      // Purchase 5 credits - should use fate points first
      const result = await adapter.processPurchase(5);

      expect(result.deductions.fatePoints).toBeGreaterThan(0);
    });

    it('should reject if insufficient funds', async () => {
      await expect(adapter.processPurchase(100)).rejects.toThrow('Insufficient credits');
    });
  });

  describe('Gacha to Furniture Mapping', () => {
    it('should map gacha pull to furniture unlock', () => {
      const pullResult = {
        character: {
          id: 123,
          name: 'Test Character',
          rarity: { name: 'Legendary' }
        }
      };

      const furniture = adapter.mapGachaToFurniture(pullResult);

      expect(furniture).toBeDefined();
      expect(furniture.furnitureId).toBe('char_123_poster');
      expect(furniture.tier).toBe('legendary');
      expect(furniture.name).toBe('Test Character Poster');
    });

    it('should return null for invalid pull', () => {
      const result = adapter.mapGachaToFurniture({});
      expect(result).toBeNull();
    });

    it('should map rarity to correct tier', () => {
      const rarities = [
        { name: 'Common', expected: 'basic' },
        { name: 'Rare', expected: 'uncommon' },
        { name: 'Epic', expected: 'rare' },
        { name: 'Legendary', expected: 'legendary' },
        { name: 'Mythic', expected: 'mythic' }
      ];

      rarities.forEach(({ name, expected }) => {
        const furniture = adapter.mapGachaToFurniture({
          character: { id: 1, name: 'Test', rarity: { name } }
        });
        expect(furniture.tier).toBe(expected);
      });
    });
  });

  describe('Transaction Management', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({
        data: { points: 1000, fatePoints: { test: { points: 50 } } }
      });
    });

    it('should track pending transactions', async () => {
      await adapter.processPurchase(5);
      expect(adapter.pendingTransactions.length).toBe(1);
    });

    it('should rollback pending transactions', async () => {
      await adapter.processPurchase(5);
      adapter.rollbackTransactions();
      expect(adapter.pendingTransactions.length).toBe(0);
    });

    it('should clear cache on request', () => {
      adapter.cachedBalance = { points: 100 };
      adapter.lastSync = Date.now();

      adapter.clearCache();

      expect(adapter.cachedBalance).toBeNull();
      expect(adapter.lastSync).toBeNull();
    });
  });
});
