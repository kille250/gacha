/**
 * Character Leveling Configuration
 * 
 * Centralized configuration for the character leveling system.
 * Used by both characterLeveling.js (acquisition/leveling logic)
 * and dojo.js (passive income calculations).
 * 
 * Single source of truth for level-related constants.
 * 
 * DESIGN PHILOSOPHY:
 * - Early levels are easy to achieve (1 shard each) for quick satisfaction
 * - Later levels require more investment (2 shards each) for meaningful progression
 * - Multiplier curve accelerates at higher levels to reward dedication
 * - Max level bonus (+75%) is impactful but not game-breaking
 */

// ===========================================
// LEVEL CONFIGURATION
// ===========================================

const LEVEL_CONFIG = {
  maxLevel: 5,
  
  /**
   * Power multiplier bonus per level
   * 
   * Formula rationale: Accelerating curve with diminishing cost-efficiency
   * - Lv1→2: +15% for 1 shard (15% per shard)
   * - Lv2→3: +15% for 1 shard (15% per shard)  
   * - Lv3→4: +20% for 2 shards (10% per shard)
   * - Lv4→5: +25% for 2 shards (12.5% per shard)
   * 
   * This creates a "value sweet spot" at early levels while
   * making max level feel like a prestigious achievement.
   */
  levelMultipliers: {
    1: 1.00,  // Base power
    2: 1.15,  // +15% - First duplicate feels rewarding
    3: 1.30,  // +30% - Noticeable improvement
    4: 1.50,  // +50% - Significant power spike
    5: 1.75   // +75% - Max level prestige
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

// ===========================================
// CONFIG VALIDATION (runs at server start)
// ===========================================

/**
 * Validates leveling configuration for consistency
 * Throws an error if configuration is invalid
 */
function validateLevelConfig() {
  // Check that all levels 1 to maxLevel have multipliers
  for (let level = 1; level <= LEVEL_CONFIG.maxLevel; level++) {
    if (LEVEL_CONFIG.levelMultipliers[level] === undefined) {
      throw new Error(`Leveling Config Error: Missing multiplier for level ${level}`);
    }
  }
  
  // Check that multipliers are monotonically increasing
  for (let level = 2; level <= LEVEL_CONFIG.maxLevel; level++) {
    if (LEVEL_CONFIG.levelMultipliers[level] <= LEVEL_CONFIG.levelMultipliers[level - 1]) {
      throw new Error(`Leveling Config Error: Multiplier for level ${level} must be greater than level ${level - 1}`);
    }
  }
  
  // Check that all levels 1 to maxLevel-1 have shard requirements
  for (let level = 1; level < LEVEL_CONFIG.maxLevel; level++) {
    if (LEVEL_CONFIG.shardsToLevel[level] === undefined) {
      throw new Error(`Leveling Config Error: Missing shard requirement for level ${level}`);
    }
    if (LEVEL_CONFIG.shardsToLevel[level] < 1) {
      throw new Error(`Leveling Config Error: Shard requirement for level ${level} must be >= 1`);
    }
  }
  
  // Validate total shards calculation
  const totalShards = getTotalShardsToLevel(LEVEL_CONFIG.maxLevel);
  console.log(`✅ Leveling configuration validated (${totalShards} total shards to max level)`);
}

// Run validation when module is loaded
validateLevelConfig();

module.exports = {
  LEVEL_CONFIG,
  getLevelMultiplier,
  getShardsToLevel,
  isMaxLevel,
  getMaxLevelDuplicatePoints,
  getTotalShardsToLevel,
  validateLevelConfig  // Export for testing
};

