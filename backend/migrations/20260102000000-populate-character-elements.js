'use strict';

/**
 * Migration: Populate element field for existing characters
 *
 * Uses the deriveElement algorithm to assign elements based on character ID and rarity.
 * This ensures all existing characters have elements for the Essence Tap feature.
 */

// Inline the derivation logic to avoid import issues in migrations
const ELEMENT_WEIGHTS = {
  common: { neutral: 0.40, fire: 0.12, water: 0.12, earth: 0.12, air: 0.12, light: 0.06, dark: 0.06 },
  uncommon: { neutral: 0.30, fire: 0.14, water: 0.14, earth: 0.14, air: 0.14, light: 0.07, dark: 0.07 },
  rare: { neutral: 0.20, fire: 0.16, water: 0.16, earth: 0.16, air: 0.16, light: 0.08, dark: 0.08 },
  epic: { neutral: 0.15, fire: 0.15, water: 0.15, earth: 0.15, air: 0.15, light: 0.125, dark: 0.125 },
  legendary: { neutral: 0.10, fire: 0.15, water: 0.15, earth: 0.15, air: 0.15, light: 0.15, dark: 0.15 }
};

function deriveElement(characterId, rarity = 'common') {
  const elements = ['fire', 'water', 'earth', 'air', 'light', 'dark', 'neutral'];
  const weights = ELEMENT_WEIGHTS[rarity] || ELEMENT_WEIGHTS.common;

  // Use character ID as seed for deterministic element
  const seed = characterId * 2654435761 % 4294967296;
  const normalized = seed / 4294967296;

  let cumulative = 0;
  for (const element of elements) {
    cumulative += weights[element];
    if (normalized < cumulative) {
      return element;
    }
  }

  return 'neutral';
}

module.exports = {
  async up(queryInterface) {
    // Get all characters without an element
    const [characters] = await queryInterface.sequelize.query(
      `SELECT id, rarity FROM "Characters" WHERE element IS NULL`
    );

    console.log(`Found ${characters.length} characters without elements`);

    // Update each character with a derived element
    for (const char of characters) {
      const element = deriveElement(char.id, char.rarity || 'common');
      await queryInterface.sequelize.query(
        `UPDATE "Characters" SET element = :element WHERE id = :id`,
        {
          replacements: { element, id: char.id }
        }
      );
    }

    console.log(`Updated ${characters.length} characters with derived elements`);
  },

  async down(queryInterface) {
    // Revert all elements to null
    await queryInterface.sequelize.query(
      `UPDATE "Characters" SET element = NULL`
    );
  }
};
