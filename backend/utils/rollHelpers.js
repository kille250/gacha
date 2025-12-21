/**
 * Roll Helper Functions
 * 
 * Centralized helpers for gacha roll operations
 * Eliminates code duplication between characters.js and banners.js
 * Supports dynamic rarities from database
 */

const { getRarities, getOrderedRarities, isRarePlusSync } = require('../config/pricing');

// ===========================================
// SECURITY: Race condition protection
// ===========================================
// Prevent concurrent roll requests per user (could cause double-spending)
// Shared across all routes to ensure global protection
const rollInProgress = new Set();

/**
 * Acquire roll lock for a user
 * @param {number} userId - The user's ID
 * @returns {boolean} - True if lock acquired, false if already in progress
 */
const acquireRollLock = (userId) => {
  if (rollInProgress.has(userId)) {
    return false;
  }
  rollInProgress.add(userId);
  return true;
};

/**
 * Release roll lock for a user
 * @param {number} userId - The user's ID
 */
const releaseRollLock = (userId) => {
  rollInProgress.delete(userId);
};

/**
 * Groups an array of characters by their rarity (dynamic, uses provided rarity names)
 * @param {Array} characters - Array of character objects
 * @param {Array} rarityNames - Optional array of rarity names to group by
 * @returns {Object} - Object with rarity keys and character arrays
 */
const groupCharactersByRarity = (characters, rarityNames = null) => {
  const grouped = {};
  
  // If rarityNames provided, pre-initialize all rarity groups
  if (rarityNames) {
    rarityNames.forEach(name => {
      grouped[name] = [];
    });
  }
  
  // Group characters by their rarity
  characters.forEach(char => {
    const rarity = char.rarity?.toLowerCase() || 'common';
    if (!grouped[rarity]) {
      grouped[rarity] = [];
    }
    grouped[rarity].push(char);
  });
  
  return grouped;
};

/**
 * Get rarity order (highest to lowest) from database
 * Returns cached order for synchronous use after initial load
 * @param {Array} raritiesData - Pre-loaded rarities from database
 * @returns {Array<string>} - Ordered rarity names
 */
const getRarityOrder = (raritiesData) => {
  if (!raritiesData || raritiesData.length === 0) {
    // Fallback to hardcoded order
    return ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  }
  return raritiesData.map(r => r.name);
};

/**
 * Selects a character from the appropriate pool with fallback logic
 * If no characters exist at the selected rarity, falls back to lower rarities
 * 
 * @param {Object} primaryPool - Primary character pool grouped by rarity (e.g., banner characters)
 * @param {Object} fallbackPool - Fallback pool grouped by rarity (e.g., all characters)
 * @param {string} selectedRarity - The initially selected rarity
 * @param {Array} allCharacters - All available characters (final fallback)
 * @param {Array} raritiesData - Pre-loaded rarities from database
 * @returns {{ character: Object, actualRarity: string }} - Selected character and actual rarity used
 */
const selectCharacterWithFallback = (primaryPool, fallbackPool, selectedRarity, allCharacters, raritiesData = null) => {
  let characterPool = null;
  let actualRarity = selectedRarity;
  
  const rarityOrder = getRarityOrder(raritiesData);

  // First try primary pool at selected rarity
  if (primaryPool && primaryPool[selectedRarity]?.length > 0) {
    characterPool = primaryPool[selectedRarity];
  } 
  // Then try fallback pool at selected rarity
  else if (fallbackPool && fallbackPool[selectedRarity]?.length > 0) {
    characterPool = fallbackPool[selectedRarity];
  }
  // If no characters at selected rarity, find next available rarity (lower rarity)
  else {
    const startIndex = rarityOrder.indexOf(selectedRarity);
    for (let i = startIndex + 1; i < rarityOrder.length; i++) {
      const fallbackRarity = rarityOrder[i];
      if (fallbackPool && fallbackPool[fallbackRarity]?.length > 0) {
        characterPool = fallbackPool[fallbackRarity];
        actualRarity = fallbackRarity;
        break;
      }
    }
  }

  // Final fallback: pick random from all characters
  if (!characterPool || characterPool.length === 0) {
    characterPool = allCharacters;
  }

  // Safety check: if still no characters available, return null
  if (!characterPool || characterPool.length === 0) {
    return { character: null, actualRarity: null };
  }

  // Select random character from pool
  const character = characterPool[Math.floor(Math.random() * characterPool.length)];
  
  return { character, actualRarity };
};

/**
 * Filters characters based on R18 preference
 * @param {Array} characters - Array of character objects
 * @param {boolean} allowR18 - Whether R18 content is allowed
 * @returns {Array} - Filtered character array
 */
const filterR18Characters = (characters, allowR18) => {
  if (allowR18) return characters;
  return characters.filter(char => !char.isR18);
};

/**
 * Checks if a rarity is "rare or better" (pity eligible)
 * Uses pre-loaded rarities for sync operation
 * @param {string} rarity - The rarity to check
 * @param {Array} raritiesData - Pre-loaded rarities from database
 * @returns {boolean} - True if pity eligible
 */
const isRarePlus = (rarity, raritiesData = null) => {
  if (raritiesData) {
    return isRarePlusSync(rarity, raritiesData);
  }
  // Fallback to hardcoded check
  return ['rare', 'epic', 'legendary'].includes(rarity);
};

module.exports = {
  acquireRollLock,
  releaseRollLock,
  groupCharactersByRarity,
  selectCharacterWithFallback,
  filterR18Characters,
  isRarePlus,
  getRarityOrder
};
