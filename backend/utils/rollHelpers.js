/**
 * Roll Helper Functions
 * 
 * Centralized helpers for gacha roll operations
 * Eliminates code duplication between characters.js and banners.js
 */

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
 * Groups an array of characters by their rarity
 * @param {Array} characters - Array of character objects
 * @returns {Object} - Object with rarity keys and character arrays
 */
const groupCharactersByRarity = (characters) => {
  return {
    common: characters.filter(char => char.rarity === 'common'),
    uncommon: characters.filter(char => char.rarity === 'uncommon'),
    rare: characters.filter(char => char.rarity === 'rare'),
    epic: characters.filter(char => char.rarity === 'epic'),
    legendary: characters.filter(char => char.rarity === 'legendary')
  };
};

/**
 * Order of rarities from highest to lowest (for fallback logic)
 */
const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

/**
 * Selects a character from the appropriate pool with fallback logic
 * If no characters exist at the selected rarity, falls back to lower rarities
 * 
 * @param {Object} primaryPool - Primary character pool grouped by rarity (e.g., banner characters)
 * @param {Object} fallbackPool - Fallback pool grouped by rarity (e.g., all characters)
 * @param {string} selectedRarity - The initially selected rarity
 * @param {Array} allCharacters - All available characters (final fallback)
 * @returns {{ character: Object, actualRarity: string }} - Selected character and actual rarity used
 */
const selectCharacterWithFallback = (primaryPool, fallbackPool, selectedRarity, allCharacters) => {
  let characterPool = null;
  let actualRarity = selectedRarity;

  // First try primary pool at selected rarity
  if (primaryPool && primaryPool[selectedRarity]?.length > 0) {
    characterPool = primaryPool[selectedRarity];
  } 
  // Then try fallback pool at selected rarity
  else if (fallbackPool && fallbackPool[selectedRarity]?.length > 0) {
    characterPool = fallbackPool[selectedRarity];
  }
  // If no characters at selected rarity, find next available rarity
  else {
    const startIndex = RARITY_ORDER.indexOf(selectedRarity);
    for (let i = startIndex + 1; i < RARITY_ORDER.length; i++) {
      const fallbackRarity = RARITY_ORDER[i];
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
 * Checks if a rarity is "rare or better"
 * Used for pity system tracking
 * @param {string} rarity - The rarity to check
 * @returns {boolean} - True if rare, epic, or legendary
 */
const isRarePlus = (rarity) => {
  return ['rare', 'epic', 'legendary'].includes(rarity);
};

module.exports = {
  acquireRollLock,
  releaseRollLock,
  groupCharactersByRarity,
  selectCharacterWithFallback,
  filterR18Characters,
  isRarePlus,
  RARITY_ORDER
};
