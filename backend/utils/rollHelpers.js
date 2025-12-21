/**
 * Roll Helper Functions
 * 
 * Centralized helpers for gacha roll operations
 * - Race condition protection via per-user locking
 * - Character pool selection with fallback logic
 * - R18 content filtering
 * - Pity system eligibility checks
 */

const { getRarities, isRarePlusSync, PRICING_CONFIG } = require('../config/pricing');

// ===========================================
// CONSTANTS
// ===========================================

/**
 * Default rarity order fallback when database is unavailable
 * Ordered from rarest to most common
 */
const DEFAULT_RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

// ===========================================
// SECURITY: Race condition protection
// ===========================================

/**
 * In-memory lock set to prevent concurrent roll requests per user
 * Prevents double-spending attacks where multiple requests could
 * deduct points/tickets before the first completes
 */
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
 * Must be called in finally blocks to prevent deadlocks
 * @param {number} userId - The user's ID
 */
const releaseRollLock = (userId) => {
  rollInProgress.delete(userId);
};

// ===========================================
// PURE FUNCTIONS: Character Grouping & Selection
// ===========================================

/**
 * Groups an array of characters by their rarity
 * Pure function - no side effects
 * 
 * @param {Array} characters - Array of character objects with rarity field
 * @param {Array<string>} rarityNames - Optional array of rarity names to pre-initialize groups
 * @returns {Object} - Object with rarity keys and character arrays { common: [...], rare: [...] }
 */
const groupCharactersByRarity = (characters, rarityNames = null) => {
  const grouped = {};
  
  // Pre-initialize all rarity groups if names provided
  // Ensures consistent object shape even for empty groups
  if (rarityNames) {
    for (const name of rarityNames) {
      grouped[name] = [];
    }
  }
  
  // Group characters by their rarity
  for (const char of characters) {
    const rarity = char.rarity?.toLowerCase() || 'common';
    if (!grouped[rarity]) {
      grouped[rarity] = [];
    }
    grouped[rarity].push(char);
  }
  
  return grouped;
};

/**
 * Get rarity order (highest to lowest) from database records
 * Uses database order field, falls back to hardcoded order
 * 
 * @param {Array} raritiesData - Pre-loaded rarities from database (ordered by order DESC)
 * @returns {Array<string>} - Ordered rarity names (rarest first)
 */
const getRarityOrder = (raritiesData) => {
  if (!raritiesData || raritiesData.length === 0) {
    return DEFAULT_RARITY_ORDER;
  }
  return raritiesData.map(r => r.name);
};

/**
 * Selects a character from the appropriate pool with fallback logic
 * 
 * Selection priority:
 * 1. Primary pool at selected rarity (e.g., banner characters)
 * 2. Fallback pool at selected rarity (e.g., all characters)
 * 3. Fallback pool at lower rarities (walks down rarity order)
 * 4. Any character from allCharacters
 * 
 * @param {Object|null} primaryPool - Primary character pool grouped by rarity (e.g., banner characters)
 * @param {Object} fallbackPool - Fallback pool grouped by rarity (e.g., all characters)
 * @param {string} selectedRarity - The initially selected rarity from the roll
 * @param {Array} allCharacters - All available characters (final fallback)
 * @param {Array} raritiesData - Pre-loaded rarities from database
 * @returns {{ character: Object|null, actualRarity: string|null }} - Selected character and actual rarity used
 */
const selectCharacterWithFallback = (primaryPool, fallbackPool, selectedRarity, allCharacters, raritiesData = null) => {
  let characterPool = null;
  let actualRarity = selectedRarity;
  
  const rarityOrder = getRarityOrder(raritiesData);

  // Step 1: Try primary pool at selected rarity
  if (primaryPool && primaryPool[selectedRarity]?.length > 0) {
    characterPool = primaryPool[selectedRarity];
  } 
  // Step 2: Try fallback pool at selected rarity
  else if (fallbackPool && fallbackPool[selectedRarity]?.length > 0) {
    characterPool = fallbackPool[selectedRarity];
  }
  // Step 3: Walk down rarity order to find available characters
  else {
    const startIndex = rarityOrder.indexOf(selectedRarity);
    
    // If selected rarity not in order, start from beginning
    const searchStart = startIndex >= 0 ? startIndex + 1 : 0;
    
    for (let i = searchStart; i < rarityOrder.length; i++) {
      const fallbackRarity = rarityOrder[i];
      if (fallbackPool && fallbackPool[fallbackRarity]?.length > 0) {
        characterPool = fallbackPool[fallbackRarity];
        actualRarity = fallbackRarity;
        break;
      }
    }
  }

  // Step 4: Final fallback to any available character
  if (!characterPool || characterPool.length === 0) {
    characterPool = allCharacters;
  }

  // Safety check: no characters available at all
  if (!characterPool || characterPool.length === 0) {
    return { character: null, actualRarity: null };
  }

  // Select random character from pool using uniform distribution
  const randomIndex = Math.floor(Math.random() * characterPool.length);
  const character = characterPool[randomIndex];
  
  return { character, actualRarity };
};

/**
 * Select a random character from a pool
 * Pure function for character selection within a rarity
 * 
 * @param {Array} pool - Array of characters
 * @returns {Object|null} - Selected character or null if pool is empty
 */
const selectRandomCharacter = (pool) => {
  if (!pool || pool.length === 0) {
    return null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

// ===========================================
// R18 FILTERING
// ===========================================

/**
 * Filters characters based on R18 preference
 * Pure function - returns new array
 * 
 * @param {Array} characters - Array of character objects
 * @param {boolean} allowR18 - Whether R18 content is allowed
 * @returns {Array} - Filtered character array
 */
const filterR18Characters = (characters, allowR18) => {
  if (allowR18) return characters;
  return characters.filter(char => !char.isR18);
};

// ===========================================
// PITY SYSTEM HELPERS
// ===========================================

/**
 * Checks if a rarity is "rare or better" (pity eligible)
 * Uses pre-loaded rarities for sync operation
 * 
 * @param {string} rarity - The rarity name to check
 * @param {Array} raritiesData - Pre-loaded rarities from database
 * @returns {boolean} - True if pity eligible
 */
const isRarePlus = (rarity, raritiesData = null) => {
  if (raritiesData) {
    return isRarePlusSync(rarity, raritiesData);
  }
  // Fallback to hardcoded check when no data available
  return ['rare', 'epic', 'legendary'].includes(rarity);
};

/**
 * Check if pity guarantee should apply
 * @param {number} pullCount - Number of pulls in this batch
 * @returns {boolean} - True if pity threshold met
 */
const isPityEligible = (pullCount) => {
  return pullCount >= PRICING_CONFIG.pityThreshold;
};

module.exports = {
  // Lock management
  acquireRollLock,
  releaseRollLock,
  
  // Character selection
  groupCharactersByRarity,
  selectCharacterWithFallback,
  selectRandomCharacter,
  getRarityOrder,
  
  // Filtering
  filterR18Characters,
  
  // Pity helpers
  isRarePlus,
  isPityEligible,
  
  // Constants
  DEFAULT_RARITY_ORDER
};
