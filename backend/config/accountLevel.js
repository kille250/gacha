/**
 * Account Level Configuration
 *
 * Defines the XP system for account-wide progression.
 * Account level unlocks facility upgrades (Warriors Hall, etc.)
 *
 * ============================================================================
 * BALANCE UPDATE (v5.0 - Ultimate Mode Balancing)
 * ============================================================================
 * Key changes in v5.0:
 *
 * 1. DOJO XP FURTHER BUFFED: Better alignment with fishing
 *    - Base claim: 18 XP (up from 15)
 *    - Efficiency bonus: 10 XP (up from 8)
 *    - Hourly passive: 3 XP/hr (up from 2)
 *    - Training streak bonus: +2 XP per consecutive day (max +14)
 *    - Rationale: Dojo now contributes ~20-25% of daily XP
 *
 * 2. FISHING XP REBALANCED: Slightly reduced to match dojo better
 *    - Perfect catch multiplier: 1.4 (down from 1.5)
 *    - Great catch multiplier: 1.2 (down from 1.25)
 *    - Autofish XP penalty: 0.75x (new - encourages active play)
 *
 * 3. GACHA XP BUFFED: More rewarding pulls
 *    - Base XP per pull: 12 (up from 10)
 *    - Character mastery XP: New system contributing to profile
 *    - Milestone XP increased by ~20%
 *
 * 4. PRESTIGE SYSTEM ADDED: Post-level-100 progression
 *    - Prestige levels 1-10 after hitting max
 *    - Each prestige grants permanent 2% XP bonus
 *    - Prestige resets to level 50, keeps all unlocks
 *
 * 5. STREAK SYSTEM ADDED: Daily engagement rewards
 *    - Login streak XP: 5-50 XP scaling with streak length
 *    - Activity streak: Bonus XP for consecutive active days
 *
 * 6. CATCH-UP MECHANICS IMPROVED:
 *    - Rested XP: +50% XP for first 500 XP after 24+ hours away
 *    - Double XP weekends for lower-level players (under 50)
 * ============================================================================
 *
 * Previous v4.0 changes (preserved):
 * - Breakthrough XP: 30-150 XP based on type
 * - Gacha Milestone XP: 25-500 XP
 * - Rest-and-Return XP: 100-3000 XP
 * - Mode variety system with switch bonus
 *
 * Previous v3.0 changes (preserved):
 * - Fishing XP: 2-20 XP per catch
 * - Trade XP: 1-10 XP per trade
 * - Collection milestones: 25-500 XP
 * - Daily variety bonus: +15 XP first activity, +50 XP all modes
 * - Fishing prestige XP bonus: +5% per prestige level
 * ============================================================================
 *
 * XP is earned from:
 * - Gacha pulls (total pulls tracked in gachaPity.totalPulls)
 * - Collection size (unique warriors owned)
 * - Dojo training (claims completed)
 * - Fishing catches and activities
 * - Daily variety bonus
 * - Streaks and engagement bonuses
 *
 * Formula uses a smooth curve where early levels are fast
 * and later levels require more investment.
 */

// ===========================================
// XP SOURCES
// ===========================================

const XP_SOURCES = {
  // XP per gacha pull - BALANCE UPDATE v5.0: Increased from 10 to 12
  // Rationale: Gacha should feel rewarding even without rare pulls
  gachaPull: 12,

  // XP per unique warrior in collection - BALANCE UPDATE v5.0: Buffed rare+ values
  collectionWarrior: {
    common: 5,
    uncommon: 12,     // Buffed from 10
    rare: 30,         // Buffed from 25
    epic: 60,         // Buffed from 50
    legendary: 125    // Buffed from 100
  },

  // XP per character level beyond 1 - BALANCE UPDATE v5.0: Increased from 15 to 20
  characterLevel: 20,

  // XP per dojo claim - BALANCE UPDATE v5.0: Increased from 15 to 18
  // Rationale: Dojo was still ~15-20% of daily XP. Now ~20-25%.
  // With streak bonuses, dedicated dojo players can earn 80-140 XP/day.
  dojoClaim: 18,

  // Bonus XP for efficient dojo claims (claiming near cap, not overcapped)
  // BALANCE UPDATE v5.0: Increased from 8 to 10
  dojoEfficiencyBonus: 10,

  // Passive XP per hour of dojo training - BALANCE UPDATE v5.0: Increased from 2 to 3
  // Rewards players for keeping characters training even between claims
  dojoHourlyPassive: 3,

  // NEW in v5.0: Training streak bonus (consecutive days with dojo claims)
  // +2 XP per consecutive day, capped at +14 (7 day streak)
  dojoStreakBonus: {
    perDay: 2,
    maxDays: 7,
    maxBonus: 14
  },

  // ===========================================
  // BREAKTHROUGH XP (NEW in v4.0, BUFFED in v5.0)
  // ===========================================
  // Dojo breakthroughs are rare events that now contribute to profile XP.
  // BALANCE UPDATE v5.0: Increased all values by ~20% to make breakthroughs exciting
  breakthrough: {
    skill_discovery: 60,      // Common breakthrough (was 50)
    hidden_treasure: 40,      // Points-focused breakthrough (was 30)
    moment_of_clarity: 90,    // Roll ticket breakthrough (was 75)
    legendary_insight: 180    // Rare breakthrough (was 150)
  },

  // ===========================================
  // GACHA MILESTONE XP (NEW in v4.0, BUFFED in v5.0)
  // ===========================================
  // Reaching pull milestones now awards XP in addition to regular rewards.
  // BALANCE UPDATE v5.0: Increased all values by ~20% for better pull engagement
  gachaMilestone: {
    10: 30,       // Was 25
    30: 60,       // Was 50
    50: 90,       // Was 75
    75: 120,      // Was 100
    100: 180,     // Was 150
    125: 210,     // Was 175
    150: 240,     // Was 200
    175: 270,     // Was 225
    200: 360,     // Was 300
    250: 480,     // Was 400
    300: 600      // Was 500
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
  // FISHING XP (NEW in v3.0, REBALANCED in v5.0)
  // ===========================================
  // BALANCE UPDATE v5.0: Slight reduction to quality bonuses for mode parity.
  // Active fishing still very rewarding, but autofish reduced to encourage engagement.
  // Target: ~80-120 XP per 30-min manual fishing session
  fishing: {
    // XP per fish catch by rarity - unchanged, solid base values
    catchXP: {
      common: 2,
      uncommon: 4,
      rare: 8,
      epic: 12,
      legendary: 20
    },

    // Bonus multiplier for perfect catches - BALANCE UPDATE v5.0: Reduced from 1.5 to 1.4
    // Rationale: 50% bonus was too strong vs other modes; 40% still rewarding
    perfectCatchMultiplier: 1.4,

    // Bonus multiplier for great catches - BALANCE UPDATE v5.0: Reduced from 1.25 to 1.2
    greatCatchMultiplier: 1.2,

    // NEW in v5.0: Autofish XP multiplier (passive fishing earns less XP)
    // Rationale: Active play should be more rewarding than passive
    autofishXPMultiplier: 0.75,

    // XP per trade completed - BALANCE UPDATE v5.0: Slight buff to epic/legendary
    tradeXP: {
      common: 1,
      uncommon: 2,
      rare: 4,        // Was 3
      epic: 6,        // Was 4
      legendary: 8,   // Was 5
      collection: 12  // Was 10 - Collection trades (all rarities)
    },

    // XP for collection milestones (first catch of each fish) - BALANCE UPDATE v5.0: Buffed
    newFishXP: 30,  // Was 25

    // XP for star milestones on fish collection - BALANCE UPDATE v5.0: Buffed higher stars
    starMilestoneXP: {
      1: 10,    // First star
      2: 18,    // Was 15
      3: 30,    // Was 25
      4: 50,    // Was 40
      5: 100    // Was 75 - Max star now feels more special
    },

    // XP for completing daily challenges - BALANCE UPDATE v5.0: Buffed all tiers
    challengeXP: {
      easy: 20,       // Was 15
      medium: 40,     // Was 30
      hard: 65,       // Was 50
      legendary: 125  // Was 100
    },

    // Prestige level bonus (permanent XP multiplier)
    // Each prestige level adds +5% to all fishing XP
    prestigeXPBonus: 0.05,

    // NEW in v5.0: Fishing streak bonus for consecutive catches without miss
    streakXP: {
      5: 5,    // 5 streak: +5 XP
      10: 12,  // 10 streak: +12 XP
      20: 25,  // 20 streak: +25 XP
      50: 75   // 50 streak: +75 XP
    }
  },

  // ===========================================
  // DAILY VARIETY BONUS (Enhanced in v4.0, BUFFED in v5.0)
  // ===========================================
  // Encourages players to engage with multiple game modes each day.
  // First activity in each mode grants bonus XP.
  // BALANCE UPDATE v5.0: Increased all values to make variety more rewarding
  dailyVarietyBonus: {
    firstDojoClaim: 20,      // Was 15 - First dojo claim of the day
    firstFishingCatch: 20,   // Was 15 - First fishing catch of the day
    firstGachaPull: 20,      // Was 15 - First gacha pull of the day
    allModesBonus: 75        // Was 50 - Bonus for engaging all 3 modes in one day
  },

  // ===========================================
  // MODE VARIETY SYSTEM (NEW in v4.0, ENHANCED in v5.0)
  // ===========================================
  // Rewards players for switching between modes and diverse engagement.
  // BALANCE UPDATE v5.0: Added daily goal system and improved weekly rewards
  modeVariety: {
    // Bonus multiplier when switching to a different mode than last action
    // e.g., Fish then Dojo = 1.15x XP on dojo action
    modeSwitchMultiplier: 1.15,

    // Weekly bonus for engaging all modes substantially
    // BALANCE UPDATE v5.0: Reduced requirements, increased rewards
    weeklyAllModeBonus: {
      requirements: {
        dojoClaims: 4,      // Was 5 - More achievable for casual players
        fishCatches: 15,    // Was 20 - More achievable
        gachaPulls: 5       // Was 10 - Most limited by resources, reduced
      },
      rewards: {
        xp: 600,            // Was 500
        rollTickets: 6      // Was 5
      }
    },

    // NEW in v5.0: Daily engagement goals (smaller, more frequent rewards)
    dailyEngagementGoals: {
      // Complete any 2 of 3 modes for bonus
      twoModesBonus: {
        xp: 25
      },
      // 3+ activities in a single mode
      focusBonus: {
        xp: 15
      }
    }
  },

  // ===========================================
  // LOGIN STREAK SYSTEM (NEW in v5.0)
  // ===========================================
  // Rewards consecutive daily logins with XP bonuses.
  // Encourages daily engagement without being punishing for missed days.
  loginStreak: {
    // XP awarded per day based on streak length
    streakXP: {
      1: 5,     // Day 1
      2: 8,     // Day 2
      3: 12,    // Day 3
      4: 16,    // Day 4
      5: 20,    // Day 5
      6: 25,    // Day 6
      7: 35,    // Day 7 (weekly milestone)
      14: 50,   // Day 14 (bi-weekly milestone)
      30: 100   // Day 30 (monthly milestone)
    },
    // Maximum streak XP per day (prevents infinite scaling)
    maxDailyStreakXP: 100,
    // Grace period: 36 hours to maintain streak (accounts for time zones)
    gracePeriodHours: 36
  },

  // ===========================================
  // RESTED XP SYSTEM (NEW in v5.0)
  // ===========================================
  // Players returning after 24+ hours get bonus XP for first activities.
  // Helps casual players catch up without punishing breaks.
  restedXP: {
    // Hours away before rested XP activates
    minimumHoursAway: 24,
    // Rested XP bonus multiplier (1.5 = 50% more XP)
    bonusMultiplier: 1.5,
    // Maximum bonus XP that can be earned with rested bonus
    maxBonusXP: 500,
    // Bonus applies to first N XP earned
    bonusAppliesTo: 500
  },

  // ===========================================
  // ACCOUNT PRESTIGE SYSTEM (NEW in v5.0)
  // ===========================================
  // Post-level-100 progression for dedicated players.
  // Provides long-term goals and meaningful rewards.
  accountPrestige: {
    // Must be at max level to prestige
    requiredLevel: 100,
    // Level to reset to after prestige
    resetToLevel: 50,
    // Maximum prestige level
    maxPrestige: 10,
    // Permanent bonuses per prestige level
    bonusesPerLevel: {
      xpMultiplier: 0.02,      // +2% XP per prestige level
      dojoEfficiency: 0.01,    // +1% dojo efficiency per prestige
      fishingRarity: 0.005     // +0.5% rare fish chance per prestige
    },
    // Prestige rewards (one-time per prestige level)
    levelRewards: {
      1: { points: 25000, rollTickets: 10, premiumTickets: 5, title: 'Prestige Warrior' },
      2: { points: 30000, rollTickets: 12, premiumTickets: 6 },
      3: { points: 35000, rollTickets: 15, premiumTickets: 8, title: 'Elite Veteran' },
      4: { points: 40000, rollTickets: 18, premiumTickets: 10 },
      5: { points: 50000, rollTickets: 20, premiumTickets: 12, title: 'Legendary Master' },
      6: { points: 60000, rollTickets: 22, premiumTickets: 14 },
      7: { points: 70000, rollTickets: 25, premiumTickets: 16, title: 'Mythic Champion' },
      8: { points: 80000, rollTickets: 28, premiumTickets: 18 },
      9: { points: 90000, rollTickets: 30, premiumTickets: 20, title: 'Immortal Legend' },
      10: { points: 150000, rollTickets: 50, premiumTickets: 30, title: 'Ultimate Transcendent', exclusiveReward: true }
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
