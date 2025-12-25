/**
 * Explicit Banner Assignment Unit Tests
 *
 * Tests for:
 * - Standard Banner character pool construction
 * - Banner pool construction with explicit assignment only
 * - Limited character exclusivity (not in standard pool)
 * - Roll context building with explicit pools
 */

const {
  groupCharactersByRarity,
  selectCharacterWithFallback,
  getRarityOrder,
  filterR18Characters
} = require('../utils/rollHelpers');

// ===========================================
// MOCK DATA
// ===========================================

const mockRarities = [
  { name: 'legendary', order: 5 },
  { name: 'epic', order: 4 },
  { name: 'rare', order: 3 },
  { name: 'uncommon', order: 2 },
  { name: 'common', order: 1 }
];

// Standard Banner characters (explicitly assigned)
const standardBannerCharacters = [
  { id: 1, name: 'StandardCommon1', rarity: 'common', isR18: false },
  { id: 2, name: 'StandardCommon2', rarity: 'common', isR18: false },
  { id: 3, name: 'StandardUncommon1', rarity: 'uncommon', isR18: false },
  { id: 4, name: 'StandardRare1', rarity: 'rare', isR18: false },
  { id: 5, name: 'StandardEpic1', rarity: 'epic', isR18: false },
  { id: 6, name: 'StandardLegendary1', rarity: 'legendary', isR18: false }
];

// Limited Banner characters (NOT in standard)
const limitedBannerCharacters = [
  { id: 101, name: 'LimitedEpic1', rarity: 'epic', isR18: false },
  { id: 102, name: 'LimitedLegendary1', rarity: 'legendary', isR18: false }
];

// Characters not assigned to any banner (should NOT be pullable)
const unassignedCharacters = [
  { id: 201, name: 'OrphanCommon1', rarity: 'common', isR18: false },
  { id: 202, name: 'OrphanRare1', rarity: 'rare', isR18: false }
];

// All characters (this should NOT be used as fallback anymore)
const allCharacters = [
  ...standardBannerCharacters,
  ...limitedBannerCharacters,
  ...unassignedCharacters
];

const orderedRarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

// ===========================================
// TESTS: Explicit Pool Construction
// ===========================================

describe('Explicit Banner Assignment', () => {
  describe('Standard Banner Pool', () => {
    test('should only include explicitly assigned characters', () => {
      const pool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

      // Should have characters at each rarity
      expect(pool.common.length).toBe(2);
      expect(pool.uncommon.length).toBe(1);
      expect(pool.rare.length).toBe(1);
      expect(pool.epic.length).toBe(1);
      expect(pool.legendary.length).toBe(1);

      // Should NOT include limited or unassigned characters
      const allPoolIds = Object.values(pool).flat().map(c => c.id);
      expect(allPoolIds).not.toContain(101); // Limited epic
      expect(allPoolIds).not.toContain(102); // Limited legendary
      expect(allPoolIds).not.toContain(201); // Orphan common
      expect(allPoolIds).not.toContain(202); // Orphan rare
    });

    test('should NOT include unassigned characters in standard pool', () => {
      const pool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);
      const allPoolIds = Object.values(pool).flat().map(c => c.id);

      // Verify orphan characters are excluded
      for (const orphan of unassignedCharacters) {
        expect(allPoolIds).not.toContain(orphan.id);
      }
    });
  });

  describe('Limited Banner Pool', () => {
    test('should only include limited banner characters', () => {
      const pool = groupCharactersByRarity(limitedBannerCharacters, orderedRarities);

      // Limited banner only has epic and legendary
      expect(pool.common.length).toBe(0);
      expect(pool.uncommon.length).toBe(0);
      expect(pool.rare.length).toBe(0);
      expect(pool.epic.length).toBe(1);
      expect(pool.legendary.length).toBe(1);
    });

    test('limited characters should NOT appear in standard pool', () => {
      const standardPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);
      const standardIds = Object.values(standardPool).flat().map(c => c.id);

      for (const limited of limitedBannerCharacters) {
        expect(standardIds).not.toContain(limited.id);
      }
    });
  });

  describe('Character Selection with Fallback', () => {
    test('should select from primary pool (banner) when available', () => {
      const bannerPool = groupCharactersByRarity(limitedBannerCharacters, orderedRarities);
      const fallbackPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

      // Roll epic - should get limited epic from banner pool
      const { character } = selectCharacterWithFallback(
        bannerPool,
        fallbackPool,
        'epic',
        standardBannerCharacters, // Only standard as final fallback
        mockRarities
      );

      expect(character.id).toBe(101); // Limited epic
    });

    test('should fallback to standard pool when banner pool lacks rarity', () => {
      const bannerPool = groupCharactersByRarity(limitedBannerCharacters, orderedRarities);
      const fallbackPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

      // Roll common - banner has no common, should fall to standard
      const { character } = selectCharacterWithFallback(
        bannerPool,
        fallbackPool,
        'common',
        standardBannerCharacters,
        mockRarities
      );

      // Should be a standard common
      expect([1, 2]).toContain(character.id);
    });

    test('should NOT fallback to unassigned characters', () => {
      // Create a pool with only limited characters (no common)
      const bannerPool = groupCharactersByRarity(limitedBannerCharacters, orderedRarities);
      // Standard pool has common
      const fallbackPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

      // Roll common - should get standard common, NOT orphan common
      const { character } = selectCharacterWithFallback(
        bannerPool,
        fallbackPool,
        'common',
        standardBannerCharacters, // Only standard characters as final fallback
        mockRarities
      );

      expect(character.id).not.toBe(201); // NOT orphan
      expect([1, 2]).toContain(character.id); // Standard common
    });

    test('should return null when no characters available at any rarity', () => {
      const emptyPool = groupCharactersByRarity([], orderedRarities);

      const { character, actualRarity } = selectCharacterWithFallback(
        null, // No primary pool
        emptyPool, // Empty fallback pool
        'legendary',
        [], // No final fallback
        mockRarities
      );

      expect(character).toBeNull();
      expect(actualRarity).toBeNull();
    });
  });

  describe('Limited Character Exclusivity', () => {
    test('limited characters should only be obtainable from their banner', () => {
      const standardPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

      // Simulate many rolls on standard banner
      const rolledIds = new Set();
      for (let i = 0; i < 100; i++) {
        for (const rarity of orderedRarities) {
          const { character } = selectCharacterWithFallback(
            null, // No primary pool for standard rolls
            standardPool,
            rarity,
            standardBannerCharacters,
            mockRarities
          );
          if (character) {
            rolledIds.add(character.id);
          }
        }
      }

      // Limited characters should NEVER appear
      expect(rolledIds).not.toContain(101);
      expect(rolledIds).not.toContain(102);
    });

    test('limited characters ARE obtainable from their own banner', () => {
      const bannerPool = groupCharactersByRarity(limitedBannerCharacters, orderedRarities);
      const fallbackPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

      // Roll legendary on limited banner
      const { character } = selectCharacterWithFallback(
        bannerPool,
        fallbackPool,
        'legendary',
        standardBannerCharacters,
        mockRarities
      );

      expect(character.id).toBe(102); // Limited legendary
    });
  });

  describe('R18 Filtering', () => {
    test('should filter R18 characters when not allowed', () => {
      const charsWithR18 = [
        ...standardBannerCharacters,
        { id: 301, name: 'R18Epic', rarity: 'epic', isR18: true }
      ];

      const filtered = filterR18Characters(charsWithR18, false);

      expect(filtered.length).toBe(standardBannerCharacters.length);
      expect(filtered.find(c => c.id === 301)).toBeUndefined();
    });

    test('should include R18 characters when allowed', () => {
      const charsWithR18 = [
        ...standardBannerCharacters,
        { id: 301, name: 'R18Epic', rarity: 'epic', isR18: true }
      ];

      const filtered = filterR18Characters(charsWithR18, true);

      expect(filtered.length).toBe(standardBannerCharacters.length + 1);
      expect(filtered.find(c => c.id === 301)).toBeDefined();
    });
  });

  describe('Rarity Order', () => {
    test('should return correct order from rarities data', () => {
      const order = getRarityOrder(mockRarities);
      expect(order).toEqual(orderedRarities);
    });

    test('should return default order when no data provided', () => {
      const order = getRarityOrder(null);
      expect(order).toEqual(['legendary', 'epic', 'rare', 'uncommon', 'common']);
    });
  });
});

// ===========================================
// TESTS: Edge Cases
// ===========================================

describe('Edge Cases', () => {
  test('should handle character on multiple banners', () => {
    // Character can be on both Standard and a Limited banner
    const sharedCharacter = { id: 999, name: 'SharedEpic', rarity: 'epic', isR18: false };

    const standardPool = groupCharactersByRarity([...standardBannerCharacters, sharedCharacter], orderedRarities);
    const limitedPool = groupCharactersByRarity([...limitedBannerCharacters, sharedCharacter], orderedRarities);

    // Character should be in both pools
    expect(standardPool.epic.find(c => c.id === 999)).toBeDefined();
    expect(limitedPool.epic.find(c => c.id === 999)).toBeDefined();
  });

  test('should handle empty banner (no characters assigned)', () => {
    const emptyBannerPool = groupCharactersByRarity([], orderedRarities);
    const fallbackPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

    // Roll on empty banner - should always use fallback
    const { character } = selectCharacterWithFallback(
      emptyBannerPool,
      fallbackPool,
      'common',
      standardBannerCharacters,
      mockRarities
    );

    expect(character).not.toBeNull();
    expect([1, 2]).toContain(character.id);
  });

  test('should handle banner with only one rarity', () => {
    const singleRarityBanner = [
      { id: 401, name: 'OnlyLegendary1', rarity: 'legendary', isR18: false }
    ];
    const bannerPool = groupCharactersByRarity(singleRarityBanner, orderedRarities);
    const fallbackPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);

    // Roll legendary - should get banner character
    const result1 = selectCharacterWithFallback(
      bannerPool,
      fallbackPool,
      'legendary',
      standardBannerCharacters,
      mockRarities
    );
    expect(result1.character.id).toBe(401);

    // Roll common - should fall to standard
    const result2 = selectCharacterWithFallback(
      bannerPool,
      fallbackPool,
      'common',
      standardBannerCharacters,
      mockRarities
    );
    expect([1, 2]).toContain(result2.character.id);
  });
});

// ===========================================
// SIMULATION: Verify Limited Exclusivity Over Many Rolls
// ===========================================

describe('Simulation: Limited Character Exclusivity', () => {
  test('1000 standard rolls should never produce limited characters', () => {
    const standardPool = groupCharactersByRarity(standardBannerCharacters, orderedRarities);
    const limitedIds = limitedBannerCharacters.map(c => c.id);

    for (let i = 0; i < 1000; i++) {
      // Random rarity
      const rarity = orderedRarities[Math.floor(Math.random() * orderedRarities.length)];

      const { character } = selectCharacterWithFallback(
        null, // Standard roll - no primary pool
        standardPool,
        rarity,
        standardBannerCharacters,
        mockRarities
      );

      if (character) {
        expect(limitedIds).not.toContain(character.id);
      }
    }
  });
});
