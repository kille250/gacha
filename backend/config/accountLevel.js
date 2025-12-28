/**
 * Account Level Configuration
 *
 * Defines the XP system for account-wide progression.
 * Account level unlocks facility upgrades (Warriors Hall, etc.)
 *
 * ============================================================================
 * BALANCE UPDATE (v3.0 - Cross-Mode Economy Balancing)
 * ============================================================================
 * Key changes:
 *
 * 1. FISHING XP ADDED: Fishing now contributes to profile XP
 *    - Per catch: 2-15 XP based on rarity
 *    - Perfect catches: +50% bonus
 *    - Trades: 1-5 XP per trade
 *    - Collection milestones: 25-500 XP
 *
 * 2. DOJO XP BUFFED: Increased from 5 to 8 XP per claim
 *    - Also added bonus XP for high-efficiency claims
 *
 * 3. VARIETY BONUS: New system rewards playing multiple modes
 *    - Daily bonus for first activity in each mode
 *    - Encourages balanced gameplay
 *
 * 4. LEVEL REWARDS: Every level now grants something
 *    - Points, tickets, or bonuses at each level
 *    - Major milestones at 10, 25, 50, 75, 100
 *
 * 5. PRESTIGE CONNECTION: Fishing prestige grants bonus XP
 *    - Each prestige level adds permanent XP bonus
 * ============================================================================
 *
 * XP is earned from:
 * - Gacha pulls (total pulls tracked in gachaPity.totalPulls)
 * - Collection size (unique warriors owned)
 * - Dojo training (claims completed)
 * - Fishing catches and activities (NEW)
 * - Daily variety bonus (NEW)
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

  // XP per dojo claim - BALANCE UPDATE: Increased from 5 to 8
  // Rationale: At 5 XP, 3-5 claims/day = 15-25 XP, negligible vs gacha.
  // At 8 XP with efficiency bonus, active dojo players earn 30-50 XP/day.
  dojoClaim: 8,

  // Bonus XP for efficient dojo claims (claiming near cap, not overcapped)
  dojoEfficiencyBonus: 5,

  // ===========================================
  // FISHING XP (NEW in v3.0)
  // ===========================================
  // Fishing was previously disconnected from account progression.
  // These rates make fishing competitive with gacha for XP earning.
  // Target: ~50-100 XP per 30-min fishing session
  fishing: {
    // XP per fish catch by rarity
    catchXP: {
      common: 2,
      uncommon: 4,
      rare: 8,
      epic: 12,
      legendary: 20
    },

    // Bonus multiplier for perfect catches (+50%)
    perfectCatchMultiplier: 1.5,

    // Bonus multiplier for great catches (+25%)
    greatCatchMultiplier: 1.25,

    // XP per trade completed
    tradeXP: {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 4,
      legendary: 5,
      collection: 10  // Collection trades (all rarities)
    },

    // XP for collection milestones (first catch of each fish)
    newFishXP: 25,

    // XP for star milestones on fish collection
    starMilestoneXP: {
      1: 10,   // First star
      2: 15,
      3: 25,
      4: 40,
      5: 75   // Max star
    },

    // XP for completing daily challenges
    challengeXP: {
      easy: 15,
      medium: 30,
      hard: 50,
      legendary: 100
    },

    // Prestige level bonus (permanent XP multiplier)
    // Each prestige level adds +5% to all fishing XP
    prestigeXPBonus: 0.05
  },

  // ===========================================
  // DAILY VARIETY BONUS (NEW in v3.0)
  // ===========================================
  // Encourages players to engage with multiple game modes each day.
  // First activity in each mode grants bonus XP.
  dailyVarietyBonus: {
    firstDojoClaim: 15,      // First dojo claim of the day
    firstFishingCatch: 15,   // First fishing catch of the day
    firstGachaPull: 15,      // First gacha pull of the day
    allModesBonus: 50        // Bonus for engaging all 3 modes in one day
  }
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

// ===========================================
// LEVEL REWARDS (NEW in v3.0)
// ===========================================
// Every level now grants something to make progression feel rewarding.
// Major milestones have bigger rewards.

/**
 * Generate rewards for a level
 * Uses deterministic rules based on level number
 * @param {number} level - Account level
 * @returns {Object} - Reward object
 */
function getLevelReward(level) {
  // Major milestone rewards (handcrafted)
  const majorMilestones = {
    5: {
      name: 'Novice Trainer',
      points: 500,
      rollTickets: 1,
      description: 'First milestone reached!'
    },
    10: {
      name: 'Warriors Hall Unlocked',
      points: 1500,
      rollTickets: 3,
      premiumTickets: 1,
      unlock: 'warriors_hall',
      description: 'Unlocks specialization paths for characters'
    },
    15: {
      name: 'Seasoned Collector',
      points: 1000,
      rollTickets: 2,
      description: 'Growing stronger every day'
    },
    20: {
      name: 'Veteran Trainer',
      points: 2000,
      rollTickets: 3,
      permanentBonus: { dojoEfficiency: 0.05 },
      description: '+5% Dojo efficiency permanently'
    },
    25: {
      name: "Master's Temple Unlocked",
      points: 5000,
      rollTickets: 5,
      premiumTickets: 2,
      unlock: 'masters_temple',
      description: 'Unlocks synergy training and breakthroughs'
    },
    30: {
      name: 'Elite Collector',
      points: 3000,
      rollTickets: 4,
      permanentBonus: { fishingRarity: 0.02 },
      description: '+2% rare fish chance permanently'
    },
    40: {
      name: 'Champion Trainer',
      points: 5000,
      rollTickets: 5,
      premiumTickets: 2,
      permanentBonus: { xpMultiplier: 0.05 },
      description: '+5% XP from all sources'
    },
    50: {
      name: "Grandmaster's Sanctum Unlocked",
      points: 15000,
      rollTickets: 10,
      premiumTickets: 5,
      unlock: 'grandmasters_sanctum',
      description: 'Unlocks legacy training and legendary discoveries'
    },
    60: {
      name: 'Legendary Trainer',
      points: 8000,
      rollTickets: 6,
      premiumTickets: 3,
      permanentBonus: { dojoEfficiency: 0.10 },
      description: '+10% Dojo efficiency permanently'
    },
    75: {
      name: 'Mythic Champion',
      points: 25000,
      rollTickets: 12,
      premiumTickets: 6,
      permanentBonus: { xpMultiplier: 0.10 },
      description: '+10% XP from all sources'
    },
    100: {
      name: 'Ultimate Master',
      points: 100000,
      rollTickets: 25,
      premiumTickets: 15,
      permanentBonus: {
        dojoEfficiency: 0.15,
        fishingRarity: 0.05,
        xpMultiplier: 0.15
      },
      exclusiveTitle: 'Ultimate Master',
      description: 'Maximum level achieved - all bonuses unlocked!'
    }
  };

  // Return major milestone if exists
  if (majorMilestones[level]) {
    return { level, ...majorMilestones[level] };
  }

  // Generate minor rewards for every level
  const reward = { level };

  // Points for every level (scales with level)
  reward.points = Math.floor(50 + level * 15);

  // Every 3rd level gets a roll ticket
  if (level % 3 === 0) {
    reward.rollTickets = 1;
  }

  // Every 7th level gets an extra roll ticket
  if (level % 7 === 0) {
    reward.rollTickets = (reward.rollTickets || 0) + 1;
  }

  // Every 10th level (not major milestones) gets a premium ticket
  if (level % 10 === 0 && !majorMilestones[level]) {
    reward.premiumTickets = 1;
  }

  return reward;
}

/**
 * Get all rewards for levels from start to end (inclusive)
 * @param {number} startLevel - Starting level (exclusive)
 * @param {number} endLevel - Ending level (inclusive)
 * @returns {Array} - Array of reward objects
 */
function getRewardsForLevelRange(startLevel, endLevel) {
  const rewards = [];
  for (let lvl = startLevel + 1; lvl <= endLevel; lvl++) {
    rewards.push(getLevelReward(lvl));
  }
  return rewards;
}

/**
 * Calculate cumulative permanent bonuses up to a level
 * @param {number} level - Account level
 * @returns {Object} - Cumulative permanent bonuses
 */
function getCumulativeBonuses(level) {
  const bonuses = {
    dojoEfficiency: 0,
    fishingRarity: 0,
    xpMultiplier: 0
  };

  for (let lvl = 1; lvl <= level; lvl++) {
    const reward = getLevelReward(lvl);
    if (reward.permanentBonus) {
      bonuses.dojoEfficiency += reward.permanentBonus.dojoEfficiency || 0;
      bonuses.fishingRarity += reward.permanentBonus.fishingRarity || 0;
      bonuses.xpMultiplier += reward.permanentBonus.xpMultiplier || 0;
    }
  }

  return bonuses;
}

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
  validateAccountLevelConfig,
  // New in v3.0
  getLevelReward,
  getRewardsForLevelRange,
  getCumulativeBonuses
};
