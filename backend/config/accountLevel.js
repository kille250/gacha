/**
 * Account Level Configuration
 *
 * Defines the XP system for account-wide progression.
 * Account level unlocks facility upgrades (Warriors Hall, etc.)
 *
 * XP is earned from:
 * - Gacha pulls (total pulls tracked in gachaPity.totalPulls)
 * - Collection size (unique warriors owned)
 * - Dojo training (claims completed)
 *
 * Formula uses a smooth curve where early levels are fast
 * and later levels require more investment.
 */

// ===========================================
// XP SOURCES
// ===========================================

const XP_SOURCES = {
  // XP per gacha pull
  gachaPull: 10,

  // XP per unique warrior in collection
  collectionWarrior: {
    common: 5,
    uncommon: 10,
    rare: 25,
    epic: 50,
    legendary: 100
  },

  // XP per character level beyond 1
  characterLevel: 15,

  // XP per dojo claim (tracked via dojoDailyStats)
  dojoClaim: 5
};

// ===========================================
// LEVEL THRESHOLDS
// ===========================================

/**
 * XP required to reach each level
 * Uses a smooth curve: XP = baseXP * level^exponent
 *
 * Level 1: 0 XP (starting level)
 * Level 10: ~1,500 XP (Warriors Hall unlock)
 * Level 25: ~7,000 XP (Master's Temple unlock)
 * Level 50: ~23,000 XP (Grandmaster's Sanctum unlock)
 *
 * This creates achievable early milestones while giving
 * long-term players goals to work toward.
 */
const LEVEL_CONFIG = {
  maxLevel: 100,
  baseXP: 50,      // XP for level 2
  exponent: 1.5,   // Growth rate (1.5 = moderate curve)

  // Milestone levels (for UI display and achievements)
  milestones: [5, 10, 15, 20, 25, 30, 40, 50, 75, 100]
};

/**
 * Calculate XP required to reach a specific level
 * @param {number} level - Target level (1-100)
 * @returns {number} - Total XP required
 */
function getXPForLevel(level) {
  if (level <= 1) return 0;
  if (level > LEVEL_CONFIG.maxLevel) level = LEVEL_CONFIG.maxLevel;

  // Sum of XP for all levels from 2 to target
  let totalXP = 0;
  for (let lvl = 2; lvl <= level; lvl++) {
    totalXP += Math.floor(LEVEL_CONFIG.baseXP * Math.pow(lvl - 1, LEVEL_CONFIG.exponent));
  }
  return totalXP;
}

/**
 * Calculate level from total XP
 * @param {number} xp - Total accumulated XP
 * @returns {number} - Current level (1-100)
 */
function getLevelFromXP(xp) {
  if (xp <= 0) return 1;

  let level = 1;
  let accumulatedXP = 0;

  while (level < LEVEL_CONFIG.maxLevel) {
    const xpForNextLevel = Math.floor(
      LEVEL_CONFIG.baseXP * Math.pow(level, LEVEL_CONFIG.exponent)
    );

    if (accumulatedXP + xpForNextLevel > xp) {
      break;
    }

    accumulatedXP += xpForNextLevel;
    level++;
  }

  return level;
}

/**
 * Get progress toward next level
 * @param {number} xp - Total accumulated XP
 * @returns {Object} - { currentLevel, currentXP, nextLevelXP, progress (0-1), xpToNext }
 */
function getLevelProgress(xp) {
  const currentLevel = getLevelFromXP(xp);

  if (currentLevel >= LEVEL_CONFIG.maxLevel) {
    return {
      currentLevel: LEVEL_CONFIG.maxLevel,
      currentXP: xp,
      nextLevelXP: null,
      progress: 1,
      xpToNext: 0,
      isMaxLevel: true
    };
  }

  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForNext = nextLevelXP - currentLevelXP;

  return {
    currentLevel,
    currentXP: xp,
    nextLevelXP,
    progress: xpInCurrentLevel / xpNeededForNext,
    xpToNext: xpNeededForNext - xpInCurrentLevel,
    xpInLevel: xpInCurrentLevel,
    xpNeededForLevel: xpNeededForNext,
    isMaxLevel: false
  };
}

/**
 * Calculate total account XP from user data
 * This is the main function that computes XP based on progression metrics.
 *
 * @param {Object} userData - Object containing user progression data
 * @param {number} userData.totalPulls - Total gacha pulls
 * @param {Array} userData.collection - Array of owned characters with rarity and level
 * @param {number} userData.dojoClaimsTotal - Total dojo claims (optional, calculated from dailyStats)
 * @returns {number} - Total XP
 */
function calculateAccountXP(userData) {
  let totalXP = 0;

  // XP from gacha pulls
  const pulls = userData.totalPulls || 0;
  totalXP += pulls * XP_SOURCES.gachaPull;

  // XP from collection
  if (userData.collection && Array.isArray(userData.collection)) {
    for (const char of userData.collection) {
      // Base XP for owning the character (by rarity)
      const rarityXP = XP_SOURCES.collectionWarrior[char.rarity] || XP_SOURCES.collectionWarrior.common;
      totalXP += rarityXP;

      // Bonus XP for character levels beyond 1
      const charLevel = char.level || 1;
      if (charLevel > 1) {
        totalXP += (charLevel - 1) * XP_SOURCES.characterLevel;
      }
    }
  }

  // XP from dojo claims (if tracked)
  const dojoClaimsTotal = userData.dojoClaimsTotal || 0;
  totalXP += dojoClaimsTotal * XP_SOURCES.dojoClaim;

  return totalXP;
}

/**
 * Check if a level-up occurred and return details
 * @param {number} oldXP - Previous XP amount
 * @param {number} newXP - New XP amount
 * @returns {Object|null} - Level up info or null if no level up
 */
function checkLevelUp(oldXP, newXP) {
  const oldLevel = getLevelFromXP(oldXP);
  const newLevel = getLevelFromXP(newXP);

  if (newLevel > oldLevel) {
    const levelsGained = newLevel - oldLevel;
    const progress = getLevelProgress(newXP);

    // Check for milestone achievements
    const milestoneReached = LEVEL_CONFIG.milestones.find(
      m => m > oldLevel && m <= newLevel
    );

    return {
      leveledUp: true,
      oldLevel,
      newLevel,
      levelsGained,
      progress,
      milestoneReached: milestoneReached || null
    };
  }

  return null;
}

/**
 * Get unlock information for a specific level
 * Returns what features are unlocked at this level
 * @param {number} level - Account level to check
 * @returns {Object} - Unlock info
 */
function getUnlocksAtLevel(level) {
  // Import facility tiers for unlock checking
  const { DOJO_FACILITY_TIERS } = require('./gameDesign');

  const unlocks = {
    facilities: [],
    features: []
  };

  // Check facility unlocks
  for (const [tierId, tier] of Object.entries(DOJO_FACILITY_TIERS)) {
    if (tier.requiredLevel === level) {
      unlocks.facilities.push({
        id: tierId,
        name: tier.name,
        features: tier.features
      });
    }
  }

  return unlocks;
}

/**
 * Generate level thresholds table for debugging/balancing
 * @param {number} maxLevel - Max level to generate
 * @returns {Array} - Array of { level, totalXP, xpForLevel }
 */
function generateLevelTable(maxLevel = 50) {
  const table = [];
  let prevXP = 0;

  for (let level = 1; level <= maxLevel; level++) {
    const totalXP = getXPForLevel(level);
    table.push({
      level,
      totalXP,
      xpForLevel: totalXP - prevXP
    });
    prevXP = totalXP;
  }

  return table;
}

// ===========================================
// CONFIG VALIDATION
// ===========================================

/**
 * Validate account level configuration
 */
function validateAccountLevelConfig() {
  // Ensure XP curve is monotonically increasing
  let prevXP = 0;
  for (let level = 1; level <= 10; level++) {
    const xp = getXPForLevel(level);
    if (xp < prevXP) {
      throw new Error(`Account Level Config Error: XP must increase with level (level ${level})`);
    }
    prevXP = xp;
  }

  // Log key milestones for verification
  console.log('[OK] Account level configuration validated');
  console.log(`     Level 10 (Warriors Hall): ${getXPForLevel(10)} XP`);
  console.log(`     Level 25 (Master's Temple): ${getXPForLevel(25)} XP`);
  console.log(`     Level 50 (Grandmaster's Sanctum): ${getXPForLevel(50)} XP`);
}

// Run validation when module is loaded
validateAccountLevelConfig();

module.exports = {
  XP_SOURCES,
  LEVEL_CONFIG,
  getXPForLevel,
  getLevelFromXP,
  getLevelProgress,
  calculateAccountXP,
  checkLevelUp,
  getUnlocksAtLevel,
  generateLevelTable,
  validateAccountLevelConfig
};
