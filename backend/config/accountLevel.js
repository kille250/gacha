/**
 * Account Level Configuration
 *
 * Defines the XP system for account-wide progression.
 * Account level unlocks facility upgrades (Warriors Hall, etc.)
 *
 * ============================================================================
 * BALANCE UPDATE (v4.0 - Comprehensive Mode Balancing)
 * ============================================================================
 * Key changes in v4.0:
 *
 * 1. DOJO XP SIGNIFICANTLY BUFFED: Increased from 8 to 15 XP per claim
 *    - Efficiency bonus increased from 5 to 8 XP
 *    - NEW: Hourly passive XP (2 XP per hour of training)
 *    - Rationale: Dojo was contributing only ~6% of daily XP. Now ~15-20%
 *
 * 2. LEVEL CURVE EASED: Exponent reduced from 1.5 to 1.35
 *    - Level 100 now requires ~80,000 XP instead of ~160,000 XP
 *    - Makes endgame achievable in ~2.5 months vs 5+ months
 *
 * 3. BREAKTHROUGH XP ADDED: Dojo breakthroughs now award XP
 *    - skill_discovery: 50 XP
 *    - hidden_treasure: 30 XP
 *    - moment_of_clarity: 75 XP
 *    - legendary_insight: 150 XP
 *
 * 4. GACHA MILESTONE XP ADDED: Pull milestones now award XP
 *    - Ranges from 25 XP (10 pulls) to 500 XP (300 pulls)
 *
 * 5. REST-AND-RETURN XP ADDED: Returning players get XP bonus
 *    - Scales from 100 XP (2-3 days) to 3000 XP (31+ days)
 *
 * 6. MODE VARIETY SYSTEM ENHANCED: Better rewards for diverse play
 *    - Mode switch bonus: +15% XP when switching modes
 *    - Weekly all-mode bonus: 500 XP for engaging all modes
 * ============================================================================
 *
 * Previous v3.0 changes (preserved):
 * - Fishing XP: 2-20 XP per catch, +50% perfect, +25% great
 * - Trade XP: 1-10 XP per trade
 * - Collection milestones: 25-500 XP
 * - Daily variety bonus: +15 XP first activity, +50 XP all modes
 * - Prestige XP bonus: +5% per prestige level
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

  // XP per dojo claim - BALANCE UPDATE v4.0: Increased from 8 to 15
  // Rationale: Dojo was contributing only ~6% of daily XP (54-80 XP/day).
  // At 15 XP with efficiency bonus, active dojo players earn 70-115 XP/day,
  // bringing dojo contribution to ~15-20% of daily XP.
  dojoClaim: 15,

  // Bonus XP for efficient dojo claims (claiming near cap, not overcapped)
  // BALANCE UPDATE v4.0: Increased from 5 to 8
  dojoEfficiencyBonus: 8,

  // NEW in v4.0: Passive XP per hour of dojo training
  // Rewards players for keeping characters training even between claims
  dojoHourlyPassive: 2,

  // ===========================================
  // BREAKTHROUGH XP (NEW in v4.0)
  // ===========================================
  // Dojo breakthroughs are rare events that now contribute to profile XP.
  // This makes them feel more significant and rewarding.
  breakthrough: {
    skill_discovery: 50,      // Common breakthrough
    hidden_treasure: 30,      // Points-focused breakthrough
    moment_of_clarity: 75,    // Roll ticket breakthrough
    legendary_insight: 150    // Rare breakthrough (premium + XP)
  },

  // ===========================================
  // GACHA MILESTONE XP (NEW in v4.0)
  // ===========================================
  // Reaching pull milestones now awards XP in addition to regular rewards.
  // Encourages engagement and rewards persistence.
  gachaMilestone: {
    10: 25,
    30: 50,
    50: 75,
    75: 100,
    100: 150,
    125: 175,
    150: 200,
    175: 225,
    200: 300,
    250: 400,
    300: 500
  },

  // ===========================================
  // REST-AND-RETURN XP (NEW in v4.0)
  // ===========================================
  // Returning players get XP to help them catch up with progression.
  // Scaled by absence duration to reward longer returns appropriately.
  restAndReturn: {
    tier1: { minDays: 2, maxDays: 3, xp: 100 },
    tier2: { minDays: 4, maxDays: 7, xp: 300 },
    tier3: { minDays: 8, maxDays: 14, xp: 750 },
    tier4: { minDays: 15, maxDays: 30, xp: 1500 },
    tier5: { minDays: 31, maxDays: Infinity, xp: 3000 }
  },

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
  // DAILY VARIETY BONUS (Enhanced in v4.0)
  // ===========================================
  // Encourages players to engage with multiple game modes each day.
  // First activity in each mode grants bonus XP.
  dailyVarietyBonus: {
    firstDojoClaim: 15,      // First dojo claim of the day
    firstFishingCatch: 15,   // First fishing catch of the day
    firstGachaPull: 15,      // First gacha pull of the day
    allModesBonus: 50        // Bonus for engaging all 3 modes in one day
  },

  // ===========================================
  // MODE VARIETY SYSTEM (NEW in v4.0)
  // ===========================================
  // Rewards players for switching between modes and diverse engagement.
  modeVariety: {
    // Bonus multiplier when switching to a different mode than last action
    // e.g., Fish then Dojo = 1.15x XP on dojo action
    modeSwitchMultiplier: 1.15,

    // Weekly bonus for engaging all modes substantially
    weeklyAllModeBonus: {
      requirements: {
        dojoClaims: 5,      // At least 5 dojo claims in the week
        fishCatches: 20,    // At least 20 fish caught
        gachaPulls: 10      // At least 10 gacha pulls
      },
      rewards: {
        xp: 500,
        rollTickets: 5
      }
    }
  }
};

// ===========================================
// LEVEL THRESHOLDS
// ===========================================

/**
 * XP required to reach each level
 * Uses a smooth curve: XP = sum of (baseXP * (level-1)^exponent) for each level
 *
 * BALANCE UPDATE v4.0: Major reduction to make progression achievable
 * - Old baseXP=50, exponent=1.5 made level 100 require ~2,000,000 XP (years!)
 * - New baseXP=10, exponent=1.12 requires ~81,000 XP (~2 months at 1200 XP/day)
 * - This makes endgame achievable while still being a significant goal
 *
 * Actual milestones (v4.0 with improved XP rates of ~1200 XP/day):
 * Level 1: 0 XP (starting level)
 * Level 5: ~110 XP (Novice Trainer) - Same day
 * Level 10: ~550 XP (Warriors Hall unlock) - ~1 day
 * Level 25: ~4,100 XP (Master's Temple unlock) - ~3-4 days
 * Level 50: ~18,400 XP (Grandmaster's Sanctum unlock) - ~15 days
 * Level 75: ~44,000 XP (Mythic Champion) - ~37 days (~1 month)
 * Level 100: ~81,000 XP (Ultimate Master) - ~68 days (~2 months)
 *
 * Progression feels:
 * - Early levels (1-25): Fast, hook players quickly
 * - Mid levels (25-50): Steady, rewarding investment
 * - Late levels (50-100): Longer but achievable, prestige goal
 */
const LEVEL_CONFIG = {
  maxLevel: 100,
  baseXP: 10,       // Reduced from 50 for achievable progression
  exponent: 1.12,   // Reduced from 1.5 for gentler curve

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
  console.log(`[OK] Account level configuration validated (v4.0 - baseXP=${LEVEL_CONFIG.baseXP}, exponent=${LEVEL_CONFIG.exponent})`);
  console.log(`     Level 10 (Warriors Hall): ${getXPForLevel(10)} XP`);
  console.log(`     Level 25 (Master's Temple): ${getXPForLevel(25)} XP`);
  console.log(`     Level 50 (Grandmaster's Sanctum): ${getXPForLevel(50)} XP`);
  console.log(`     Level 75 (Mythic Champion): ${getXPForLevel(75)} XP`);
  console.log(`     Level 100 (Ultimate Master): ${getXPForLevel(100)} XP`);
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
