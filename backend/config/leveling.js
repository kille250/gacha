/**
 * Character Leveling Configuration
 * 
 * Centralized configuration for the character leveling system.
 * Used by both characterLeveling.js (acquisition/leveling logic)
 * and dojo.js (passive income calculations).
 * 
 * Single source of truth for level-related constants.
 */

// ===========================================
// LEVEL CONFIGURATION
// ===========================================

const LEVEL_CONFIG = {
  maxLevel: 5,
  
  // Power multiplier bonus per level above 1
  // Level 1: 1.0x, Level 2: 1.2x, Level 3: 1.35x, Level 4: 1.45x, Level 5: 1.5x
  // Using diminishing returns instead of linear scaling
  levelMultipliers: {
    1: 1.0,
    2: 1.2,
    3: 1.35,
    4: 1.45,
    5: 1.5
  },
  
  // Shards required to level up (from current level)
  // Level 1 -> 2: 1 shard
  // Level 2 -> 3: 1 shard
  // Level 3 -> 4: 2 shards
  // Level 4 -> 5: 2 shards
  // Total: 6 shards to max
  shardsToLevel: {
    1: 1,
    2: 1,
    3: 2,
    4: 2
  },
  
  // Points awarded when rolling a duplicate of a max-level character
  // Scaled by rarity for better balance
  maxLevelDuplicatePoints: {
    common: 25,
    uncommon: 50,
    rare: 100,
    epic: 250,
    legendary: 500
  },
  
  // Fallback for unknown rarities
  defaultDuplicatePoints: 50
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get power multiplier for a given level
 * Uses pre-defined multipliers with diminishing returns
 * @param {number} level - Character level (1-5)
 * @returns {number} - Power multiplier (1.0 to 1.5)
 */
function getLevelMultiplier(level) {
  const safeLevel = Math.min(Math.max(level || 1, 1), LEVEL_CONFIG.maxLevel);
  return LEVEL_CONFIG.levelMultipliers[safeLevel] || 1.0;
}

/**
 * Get shards required to level up from current level
 * @param {number} currentLevel - Current level (1-4)
 * @returns {number|null} - Shards needed, or null if at max level
 */
function getShardsToLevel(currentLevel) {
  if (currentLevel >= LEVEL_CONFIG.maxLevel) return null;
  return LEVEL_CONFIG.shardsToLevel[currentLevel] || 1;
}

/**
 * Check if a character is at max level
 * @param {number} level - Current level
 * @returns {boolean}
 */
function isMaxLevel(level) {
  return level >= LEVEL_CONFIG.maxLevel;
}

/**
 * Get bonus points for max-level duplicate based on rarity
 * @param {string} rarity - Character rarity
 * @returns {number} - Bonus points
 */
function getMaxLevelDuplicatePoints(rarity) {
  const normalizedRarity = (rarity || 'common').toLowerCase();
  return LEVEL_CONFIG.maxLevelDuplicatePoints[normalizedRarity] 
    || LEVEL_CONFIG.defaultDuplicatePoints;
}

/**
 * Get total shards needed to reach a target level from level 1
 * @param {number} targetLevel - Target level (2-5)
 * @returns {number} - Total shards needed
 */
function getTotalShardsToLevel(targetLevel) {
  let total = 0;
  for (let lvl = 1; lvl < targetLevel; lvl++) {
    total += LEVEL_CONFIG.shardsToLevel[lvl] || 0;
  }
  return total;
}

module.exports = {
  LEVEL_CONFIG,
  getLevelMultiplier,
  getShardsToLevel,
  isMaxLevel,
  getMaxLevelDuplicatePoints,
  getTotalShardsToLevel
};

