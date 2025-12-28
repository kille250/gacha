/**
 * Account Level Service
 *
 * Manages account XP and level progression.
 * Provides functions for:
 * - Adding XP from various sources
 * - Recalculating total XP from user data
 * - Checking and applying level ups
 * - Getting account level status
 *
 * ============================================================================
 * BALANCE UPDATE (v6.0 - Comprehensive Mode Harmony)
 * ============================================================================
 * New in v6.0:
 * - Character Mastery XP: 15 XP per level, 50 XP bonus at max
 * - First-time Achievement XP: One-time bonuses for milestones
 * - Fishing Excellence XP: Rewards for perfect catch streaks
 * - Extended Login Streak: Day 60/90/180/365 milestones
 * - Extended Dojo Streak: 14 days max (was 7)
 * - Extended Fishing Streak: Added 30/40 milestones
 * - Dedicated Mode Bonus: +35 XP for 5+ activities in one mode
 *
 * Previous v4.0 features (preserved):
 * - Dojo XP: 18 XP per claim, +10 efficiency, +3/hr passive
 * - Breakthrough XP: 40-180 XP based on breakthrough type
 * - Gacha Milestone XP: 30-600 XP at pull milestones
 * - Rest-and-Return XP: 100-3000 XP for returning players
 * - Mode variety bonuses: +15% XP for mode switching
 * - Weekly all-mode bonus: 600 XP + 6 roll tickets
 *
 * Previous v3.0 features (preserved):
 * - Fishing XP functions and daily variety bonus tracking
 * - All game modes contribute to profile progression
 * ============================================================================
 */

const {
  XP_SOURCES,
  LEVEL_CONFIG,
  getLevelFromXP,
  getLevelProgress,
  checkLevelUp,
  getUnlocksAtLevel,
  getLevelReward,
  getRewardsForLevelRange,
  getCumulativeBonuses
} = require('../config/accountLevel');

/**
 * Add XP to user account and check for level up
 *
 * @param {Object} user - Sequelize User instance
 * @param {number} xpAmount - Amount of XP to add
 * @param {string} source - Source of XP (for logging)
 * @returns {Object} - { xpAdded, levelUp (null or level up info) }
 */
function addXP(user, xpAmount, source = 'unknown') {
  const oldXP = user.accountXP || 0;
  const newXP = oldXP + xpAmount;

  user.accountXP = newXP;

  // Check for level up
  const levelUpInfo = checkLevelUp(oldXP, newXP);

  if (levelUpInfo) {
    // Update account level
    user.accountLevel = levelUpInfo.newLevel;

    console.log(
      `[LEVEL UP] User ${user.id} (${user.username}): Level ${levelUpInfo.oldLevel} -> ${levelUpInfo.newLevel} (+${xpAmount} XP from ${source})`
    );

    // Check for facility unlocks
    const unlocks = [];
    for (let lvl = levelUpInfo.oldLevel + 1; lvl <= levelUpInfo.newLevel; lvl++) {
      const levelUnlocks = getUnlocksAtLevel(lvl);
      if (levelUnlocks.facilities.length > 0) {
        unlocks.push(...levelUnlocks.facilities);
      }
    }

    return {
      xpAdded: xpAmount,
      levelUp: {
        ...levelUpInfo,
        unlocks
      }
    };
  }

  return {
    xpAdded: xpAmount,
    levelUp: null
  };
}

/**
 * Add XP for a gacha pull
 * @param {Object} user - Sequelize User instance
 * @param {number} pullCount - Number of pulls (default 1)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addGachaPullXP(user, pullCount = 1) {
  const xp = pullCount * XP_SOURCES.gachaPull;
  return addXP(user, xp, 'gacha_pull');
}

/**
 * Add XP for acquiring a new character
 * @param {Object} user - Sequelize User instance
 * @param {string} rarity - Character rarity
 * @returns {Object} - { xpAdded, levelUp }
 */
function addNewCharacterXP(user, rarity) {
  const xp = XP_SOURCES.collectionWarrior[rarity] || XP_SOURCES.collectionWarrior.common;
  return addXP(user, xp, `new_character_${rarity}`);
}

/**
 * Add XP for leveling up a character
 * @param {Object} user - Sequelize User instance
 * @returns {Object} - { xpAdded, levelUp }
 */
function addCharacterLevelXP(user) {
  const xp = XP_SOURCES.characterLevel;
  return addXP(user, xp, 'character_level');
}

/**
 * Add XP for a dojo claim
 * @param {Object} user - Sequelize User instance
 * @param {boolean} isEfficient - Whether the claim was near cap (not overcapped)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addDojoClaimXP(user, isEfficient = false) {
  // Increment total claims counter
  user.dojoClaimsTotal = (user.dojoClaimsTotal || 0) + 1;

  // Base XP + efficiency bonus
  let xp = XP_SOURCES.dojoClaim;
  if (isEfficient && XP_SOURCES.dojoEfficiencyBonus) {
    xp += XP_SOURCES.dojoEfficiencyBonus;
  }

  return addXP(user, xp, isEfficient ? 'dojo_claim_efficient' : 'dojo_claim');
}

/**
 * Add XP for passive dojo training hours
 * NEW in v4.0: Rewards players for keeping characters training
 * @param {Object} user - Sequelize User instance
 * @param {number} hours - Hours of training time
 * @returns {Object} - { xpAdded, levelUp }
 */
function addDojoPassiveXP(user, hours) {
  if (!XP_SOURCES.dojoHourlyPassive || hours <= 0) {
    return { xpAdded: 0, levelUp: null };
  }

  const xp = Math.floor(hours * XP_SOURCES.dojoHourlyPassive);
  if (xp === 0) return { xpAdded: 0, levelUp: null };

  return addXP(user, xp, 'dojo_passive');
}

// ===========================================
// BREAKTHROUGH XP FUNCTIONS (NEW in v4.0)
// ===========================================

/**
 * Add XP for a dojo breakthrough discovery
 * @param {Object} user - Sequelize User instance
 * @param {string} breakthroughType - Type of breakthrough (skill_discovery, hidden_treasure, etc.)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addBreakthroughXP(user, breakthroughType) {
  if (!XP_SOURCES.breakthrough) {
    return { xpAdded: 0, levelUp: null };
  }

  const xp = XP_SOURCES.breakthrough[breakthroughType] || 0;
  if (xp === 0) return { xpAdded: 0, levelUp: null };

  console.log(`[BREAKTHROUGH XP] User ${user.id} earned ${xp} XP from ${breakthroughType}`);
  return addXP(user, xp, `breakthrough_${breakthroughType}`);
}

// ===========================================
// GACHA MILESTONE XP FUNCTIONS (NEW in v4.0)
// ===========================================

/**
 * Add XP for reaching a gacha pull milestone
 * @param {Object} user - Sequelize User instance
 * @param {number} milestone - Milestone reached (10, 30, 50, etc.)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addGachaMilestoneXP(user, milestone) {
  if (!XP_SOURCES.gachaMilestone) {
    return { xpAdded: 0, levelUp: null };
  }

  const xp = XP_SOURCES.gachaMilestone[milestone] || 0;
  if (xp === 0) return { xpAdded: 0, levelUp: null };

  console.log(`[MILESTONE XP] User ${user.id} earned ${xp} XP for reaching ${milestone} pulls`);
  return addXP(user, xp, `gacha_milestone_${milestone}`);
}

/**
 * Check if a pull count triggers a milestone and award XP
 * @param {Object} user - Sequelize User instance
 * @param {number} previousPulls - Pull count before this action
 * @param {number} newPulls - Pull count after this action
 * @returns {Object} - { xpAdded, milestonesReached, levelUp }
 */
function checkAndAwardMilestoneXP(user, previousPulls, newPulls) {
  if (!XP_SOURCES.gachaMilestone) {
    return { xpAdded: 0, milestonesReached: [], levelUp: null };
  }

  const milestones = Object.keys(XP_SOURCES.gachaMilestone).map(Number).sort((a, b) => a - b);
  const milestonesReached = [];
  let totalXP = 0;
  let lastLevelUp = null;

  for (const milestone of milestones) {
    if (previousPulls < milestone && newPulls >= milestone) {
      const result = addGachaMilestoneXP(user, milestone);
      totalXP += result.xpAdded;
      milestonesReached.push(milestone);
      if (result.levelUp) lastLevelUp = result.levelUp;
    }
  }

  return { xpAdded: totalXP, milestonesReached, levelUp: lastLevelUp };
}

// ===========================================
// REST-AND-RETURN XP FUNCTIONS (NEW in v4.0)
// ===========================================

/**
 * Add XP for returning after absence
 * @param {Object} user - Sequelize User instance
 * @param {number} daysAway - Number of days since last login
 * @returns {Object} - { xpAdded, levelUp, tier }
 */
function addRestAndReturnXP(user, daysAway) {
  if (!XP_SOURCES.restAndReturn || daysAway < 2) {
    return { xpAdded: 0, levelUp: null, tier: null };
  }

  // Find applicable tier
  const tiers = Object.values(XP_SOURCES.restAndReturn);
  let applicableTier = null;

  for (const tier of tiers) {
    if (daysAway >= tier.minDays && daysAway <= tier.maxDays) {
      applicableTier = tier;
      break;
    }
  }

  if (!applicableTier) {
    return { xpAdded: 0, levelUp: null, tier: null };
  }

  const xp = applicableTier.xp;
  console.log(`[RETURN BONUS] User ${user.id} earned ${xp} XP for returning after ${daysAway} days`);

  const result = addXP(user, xp, `rest_return_${daysAway}d`);
  return { ...result, tier: applicableTier };
}

// ===========================================
// MODE VARIETY XP FUNCTIONS (NEW in v4.0)
// ===========================================

/**
 * Apply mode switch bonus if user is switching modes
 * @param {Object} user - Sequelize User instance
 * @param {string} currentMode - Current mode being played (dojo, fishing, gacha)
 * @param {number} baseXP - Base XP being awarded
 * @returns {Object} - { xpAdded, bonusApplied, levelUp }
 */
function applyModeSwitchBonus(user, currentMode, baseXP) {
  if (!XP_SOURCES.modeVariety || !XP_SOURCES.modeVariety.modeSwitchMultiplier) {
    return { xpAdded: baseXP, bonusApplied: false, levelUp: null };
  }

  const lastMode = user.lastPlayedMode || null;
  const isSwitch = lastMode && lastMode !== currentMode;

  // Update last played mode
  user.lastPlayedMode = currentMode;

  if (isSwitch) {
    const multiplier = XP_SOURCES.modeVariety.modeSwitchMultiplier;
    const bonusXP = Math.floor(baseXP * (multiplier - 1));
    const totalXP = baseXP + bonusXP;

    console.log(`[MODE SWITCH] User ${user.id} earned +${bonusXP} XP bonus for switching from ${lastMode} to ${currentMode}`);
    return { xpAdded: totalXP, bonusApplied: true, bonusXP, levelUp: null };
  }

  return { xpAdded: baseXP, bonusApplied: false, levelUp: null };
}

/**
 * Check and award weekly all-mode bonus
 * @param {Object} user - Sequelize User instance
 * @returns {Object} - { xpAwarded, ticketsAwarded, bonusGranted }
 */
function checkWeeklyAllModeBonus(user) {
  if (!XP_SOURCES.modeVariety || !XP_SOURCES.modeVariety.weeklyAllModeBonus) {
    return { xpAwarded: 0, ticketsAwarded: 0, bonusGranted: false };
  }

  const config = XP_SOURCES.modeVariety.weeklyAllModeBonus;
  const req = config.requirements;

  // Check weekly stats
  const weekly = user.weeklyModeStats || { dojoClaims: 0, fishCatches: 0, gachaPulls: 0, bonusClaimed: false };

  // Check if already claimed this week
  if (weekly.bonusClaimed) {
    return { xpAwarded: 0, ticketsAwarded: 0, bonusGranted: false, alreadyClaimed: true };
  }

  // Check requirements
  const meetsRequirements =
    (weekly.dojoClaims || 0) >= req.dojoClaims &&
    (weekly.fishCatches || 0) >= req.fishCatches &&
    (weekly.gachaPulls || 0) >= req.gachaPulls;

  if (!meetsRequirements) {
    return {
      xpAwarded: 0,
      ticketsAwarded: 0,
      bonusGranted: false,
      progress: {
        dojoClaims: { current: weekly.dojoClaims || 0, required: req.dojoClaims },
        fishCatches: { current: weekly.fishCatches || 0, required: req.fishCatches },
        gachaPulls: { current: weekly.gachaPulls || 0, required: req.gachaPulls }
      }
    };
  }

  // Award bonus
  weekly.bonusClaimed = true;
  user.weeklyModeStats = weekly;

  const xp = config.rewards.xp;
  const tickets = config.rewards.rollTickets;

  console.log(`[WEEKLY BONUS] User ${user.id} earned ${xp} XP and ${tickets} roll tickets for weekly all-mode bonus`);

  const xpResult = addXP(user, xp, 'weekly_all_mode_bonus');

  return {
    xpAwarded: xp,
    ticketsAwarded: tickets,
    bonusGranted: true,
    levelUp: xpResult.levelUp
  };
}

/**
 * Increment weekly mode stats
 * @param {Object} user - Sequelize User instance
 * @param {string} mode - Mode to increment (dojoClaims, fishCatches, gachaPulls)
 * @param {number} count - Amount to increment (default 1)
 */
function incrementWeeklyModeStat(user, mode, count = 1) {
  const currentWeek = getWeekNumber();

  // Initialize or reset weekly stats
  if (!user.weeklyModeStats || user.weeklyModeStats.weekNumber !== currentWeek) {
    user.weeklyModeStats = {
      weekNumber: currentWeek,
      dojoClaims: 0,
      fishCatches: 0,
      gachaPulls: 0,
      bonusClaimed: false
    };
  }

  // Increment the stat
  if (user.weeklyModeStats[mode] !== undefined) {
    user.weeklyModeStats[mode] += count;
  }
}

/**
 * Get current week number (ISO week)
 */
function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  const oneWeek = 604800000; // 1 week in ms
  return Math.floor(diff / oneWeek);
}

// ===========================================
// FISHING XP FUNCTIONS (NEW in v3.0)
// ===========================================

/**
 * Add XP for catching a fish
 * @param {Object} user - Sequelize User instance
 * @param {string} rarity - Fish rarity
 * @param {string} catchQuality - 'perfect', 'great', or 'normal'
 * @param {number} prestigeLevel - User's fishing prestige level (for bonus)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addFishingCatchXP(user, rarity, catchQuality = 'normal', prestigeLevel = 0) {
  if (!XP_SOURCES.fishing) {
    return { xpAdded: 0, levelUp: null };
  }

  const baseXP = XP_SOURCES.fishing.catchXP[rarity] || XP_SOURCES.fishing.catchXP.common;
  let multiplier = 1.0;

  // Apply catch quality bonus
  if (catchQuality === 'perfect') {
    multiplier *= XP_SOURCES.fishing.perfectCatchMultiplier || 1.5;
  } else if (catchQuality === 'great') {
    multiplier *= XP_SOURCES.fishing.greatCatchMultiplier || 1.25;
  }

  // Apply prestige bonus
  if (prestigeLevel > 0 && XP_SOURCES.fishing.prestigeXPBonus) {
    multiplier *= 1 + (prestigeLevel * XP_SOURCES.fishing.prestigeXPBonus);
  }

  const xp = Math.floor(baseXP * multiplier);
  return addXP(user, xp, `fishing_catch_${rarity}_${catchQuality}`);
}

/**
 * Add XP for completing a fish trade
 * @param {Object} user - Sequelize User instance
 * @param {string} rarity - Traded fish rarity (or 'collection' for collection trades)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addFishingTradeXP(user, rarity) {
  if (!XP_SOURCES.fishing || !XP_SOURCES.fishing.tradeXP) {
    return { xpAdded: 0, levelUp: null };
  }

  const xp = XP_SOURCES.fishing.tradeXP[rarity] || XP_SOURCES.fishing.tradeXP.common || 1;
  return addXP(user, xp, `fishing_trade_${rarity}`);
}

/**
 * Add XP for catching a new fish species (first catch)
 * @param {Object} user - Sequelize User instance
 * @returns {Object} - { xpAdded, levelUp }
 */
function addNewFishXP(user) {
  if (!XP_SOURCES.fishing || !XP_SOURCES.fishing.newFishXP) {
    return { xpAdded: 0, levelUp: null };
  }

  const xp = XP_SOURCES.fishing.newFishXP;
  return addXP(user, xp, 'fishing_new_fish');
}

/**
 * Add XP for reaching a star milestone on a fish
 * @param {Object} user - Sequelize User instance
 * @param {number} starLevel - Star level achieved (1-5)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addFishStarMilestoneXP(user, starLevel) {
  if (!XP_SOURCES.fishing || !XP_SOURCES.fishing.starMilestoneXP) {
    return { xpAdded: 0, levelUp: null };
  }

  const xp = XP_SOURCES.fishing.starMilestoneXP[starLevel] || 0;
  if (xp === 0) return { xpAdded: 0, levelUp: null };

  return addXP(user, xp, `fishing_star_${starLevel}`);
}

/**
 * Add XP for completing a fishing challenge
 * @param {Object} user - Sequelize User instance
 * @param {string} difficulty - Challenge difficulty (easy, medium, hard, legendary)
 * @returns {Object} - { xpAdded, levelUp }
 */
function addFishingChallengeXP(user, difficulty) {
  if (!XP_SOURCES.fishing || !XP_SOURCES.fishing.challengeXP) {
    return { xpAdded: 0, levelUp: null };
  }

  const xp = XP_SOURCES.fishing.challengeXP[difficulty] || XP_SOURCES.fishing.challengeXP.easy || 10;
  return addXP(user, xp, `fishing_challenge_${difficulty}`);
}

// ===========================================
// DAILY VARIETY BONUS (NEW in v3.0)
// ===========================================

/**
 * Check and award daily variety bonus
 * Tracks which modes the user has engaged with today
 *
 * @param {Object} user - Sequelize User instance
 * @param {string} mode - Mode being engaged ('dojo', 'fishing', 'gacha')
 * @returns {Object} - { xpAdded, levelUp, varietyBonus, allModesBonus }
 */
function checkDailyVarietyBonus(user, mode) {
  if (!XP_SOURCES.dailyVarietyBonus) {
    return { xpAdded: 0, levelUp: null, varietyBonus: false, allModesBonus: false };
  }

  // Initialize daily variety tracker if needed
  const today = new Date().toISOString().split('T')[0];
  if (!user.dailyVariety || user.dailyVariety.date !== today) {
    user.dailyVariety = {
      date: today,
      dojo: false,
      fishing: false,
      gacha: false
    };
  }

  let xpAdded = 0;
  let varietyBonus = false;
  let allModesBonus = false;

  // Check if this is first activity in this mode today
  if (!user.dailyVariety[mode]) {
    user.dailyVariety[mode] = true;

    // Award mode-specific variety bonus
    const bonusMap = {
      dojo: XP_SOURCES.dailyVarietyBonus.firstDojoClaim,
      fishing: XP_SOURCES.dailyVarietyBonus.firstFishingCatch,
      gacha: XP_SOURCES.dailyVarietyBonus.firstGachaPull
    };

    if (bonusMap[mode]) {
      xpAdded = bonusMap[mode];
      varietyBonus = true;

      console.log(`[VARIETY BONUS] User ${user.id} earned ${xpAdded} XP for first ${mode} activity today`);
    }

    // Check if all modes completed for extra bonus
    if (user.dailyVariety.dojo && user.dailyVariety.fishing && user.dailyVariety.gacha) {
      const allModesXP = XP_SOURCES.dailyVarietyBonus.allModesBonus || 0;
      if (allModesXP > 0) {
        xpAdded += allModesXP;
        allModesBonus = true;

        console.log(`[ALL MODES BONUS] User ${user.id} earned ${allModesXP} XP for engaging all modes today`);
      }
    }
  }

  // Apply XP if any bonus earned
  let levelUp = null;
  if (xpAdded > 0) {
    const result = addXP(user, xpAdded, `variety_bonus_${mode}`);
    levelUp = result.levelUp;
  }

  return { xpAdded, levelUp, varietyBonus, allModesBonus };
}

/**
 * Recalculate total account XP from user data
 * Useful for fixing inconsistencies or migrating existing users
 *
 * @param {Object} user - Sequelize User instance
 * @param {Array} collection - User's character collection with rarity and level
 * @returns {Object} - { oldXP, newXP, oldLevel, newLevel, changed }
 */
function recalculateXP(user, collection = []) {
  const oldXP = user.accountXP || 0;
  const oldLevel = user.accountLevel || 1;

  let totalXP = 0;

  // XP from gacha pulls
  const gachaPity = user.gachaPity || {};
  const totalPulls = gachaPity.totalPulls || 0;
  totalXP += totalPulls * XP_SOURCES.gachaPull;

  // XP from collection
  for (const char of collection) {
    // Base XP for owning the character (by rarity)
    const rarityXP = XP_SOURCES.collectionWarrior[char.rarity] || XP_SOURCES.collectionWarrior.common;
    totalXP += rarityXP;

    // Bonus XP for character levels beyond 1
    const charLevel = char.level || 1;
    if (charLevel > 1) {
      totalXP += (charLevel - 1) * XP_SOURCES.characterLevel;
    }
  }

  // XP from dojo claims
  const dojoClaimsTotal = user.dojoClaimsTotal || 0;
  totalXP += dojoClaimsTotal * XP_SOURCES.dojoClaim;

  // Update user
  user.accountXP = totalXP;
  user.accountLevel = getLevelFromXP(totalXP);

  const changed = totalXP !== oldXP;

  if (changed) {
    console.log(
      `[XP RECALC] User ${user.id} (${user.username}): XP ${oldXP} -> ${totalXP}, Level ${oldLevel} -> ${user.accountLevel}`
    );
  }

  return {
    oldXP,
    newXP: totalXP,
    oldLevel,
    newLevel: user.accountLevel,
    changed
  };
}

/**
 * Get account level status for API response
 * @param {Object} user - Sequelize User instance
 * @returns {Object} - Account level status
 */
function getAccountLevelStatus(user) {
  const xp = user.accountXP || 0;
  const progress = getLevelProgress(xp);

  // Get upcoming unlocks
  const upcomingUnlocks = [];
  for (let lvl = progress.currentLevel + 1; lvl <= Math.min(progress.currentLevel + 10, LEVEL_CONFIG.maxLevel); lvl++) {
    const unlocks = getUnlocksAtLevel(lvl);
    if (unlocks.facilities.length > 0) {
      upcomingUnlocks.push({
        level: lvl,
        facilities: unlocks.facilities
      });
    }
  }

  // Get next milestone
  const nextMilestone = LEVEL_CONFIG.milestones.find(m => m > progress.currentLevel) || null;

  return {
    level: progress.currentLevel,
    xp: progress.currentXP,
    xpToNext: progress.xpToNext,
    xpInLevel: progress.xpInLevel,
    xpNeededForLevel: progress.xpNeededForLevel,
    progress: Math.round(progress.progress * 100) / 100,
    progressPercent: Math.round(progress.progress * 100),
    isMaxLevel: progress.isMaxLevel,
    maxLevel: LEVEL_CONFIG.maxLevel,
    nextMilestone,
    upcomingUnlocks
  };
}

/**
 * Check if user meets level requirement for a facility
 * @param {Object} user - Sequelize User instance
 * @param {number} requiredLevel - Required account level
 * @returns {Object} - { meetsRequirement, currentLevel, requiredLevel, levelsNeeded }
 */
function checkFacilityRequirement(user, requiredLevel) {
  const currentLevel = user.accountLevel || 1;
  const meetsRequirement = currentLevel >= requiredLevel;

  return {
    meetsRequirement,
    currentLevel,
    requiredLevel,
    levelsNeeded: meetsRequirement ? 0 : requiredLevel - currentLevel
  };
}

/**
 * Initialize XP for a new user based on existing progression
 * Called when migrating existing users to the XP system
 *
 * @param {Object} user - Sequelize User instance
 * @param {Array} collection - User's character collection
 * @returns {Object} - Initialization result
 */
async function initializeUserXP(user, collection = []) {
  // Only initialize if XP hasn't been set
  if (user.accountXP > 0) {
    return {
      initialized: false,
      reason: 'XP already set'
    };
  }

  const result = recalculateXP(user, collection);

  return {
    initialized: true,
    ...result
  };
}

// ===========================================
// CHARACTER MASTERY XP (NEW in v6.0)
// ===========================================

/**
 * Add XP for gaining a character mastery level
 * @param {Object} user - Sequelize User instance
 * @param {number} newLevel - The mastery level achieved (1-10)
 * @returns {Object} - { xpAdded, levelUp, isMaxMastery }
 */
function addCharacterMasteryXP(user, newLevel) {
  if (!XP_SOURCES.characterMastery) {
    return { xpAdded: 0, levelUp: null, isMaxMastery: false };
  }

  let xp = XP_SOURCES.characterMastery.xpPerLevel || 15;
  const isMaxMastery = newLevel >= 10;

  // Bonus XP for reaching max mastery
  if (isMaxMastery && XP_SOURCES.characterMastery.maxMasteryBonus) {
    xp += XP_SOURCES.characterMastery.maxMasteryBonus;
  }

  console.log(`[MASTERY XP] User ${user.id} earned ${xp} XP for mastery level ${newLevel}${isMaxMastery ? ' (MAX!)' : ''}`);
  const result = addXP(user, xp, `mastery_level_${newLevel}`);

  return { ...result, isMaxMastery };
}

// ===========================================
// FIRST-TIME ACHIEVEMENT XP (NEW in v6.0)
// ===========================================

/**
 * Add XP for a first-time achievement
 * @param {Object} user - Sequelize User instance
 * @param {string} achievementType - Type of achievement (e.g., 'firstLegendaryFish')
 * @returns {Object} - { xpAdded, levelUp, alreadyAchieved }
 */
function addFirstTimeAchievementXP(user, achievementType) {
  if (!XP_SOURCES.firstTimeAchievements) {
    return { xpAdded: 0, levelUp: null, alreadyAchieved: false };
  }

  const xp = XP_SOURCES.firstTimeAchievements[achievementType];
  if (!xp) {
    return { xpAdded: 0, levelUp: null, alreadyAchieved: false };
  }

  // Check if already achieved (stored in user's achievements)
  const achievements = user.firstTimeAchievements || {};
  if (achievements[achievementType]) {
    return { xpAdded: 0, levelUp: null, alreadyAchieved: true };
  }

  // Mark as achieved
  achievements[achievementType] = { date: new Date().toISOString(), xp };
  user.firstTimeAchievements = achievements;

  console.log(`[FIRST-TIME XP] User ${user.id} earned ${xp} XP for achievement: ${achievementType}`);
  const result = addXP(user, xp, `first_time_${achievementType}`);

  return { ...result, alreadyAchieved: false };
}

// ===========================================
// FISHING EXCELLENCE XP (NEW in v6.0)
// ===========================================

/**
 * Check and award fishing excellence bonuses
 * @param {Object} user - Sequelize User instance
 * @param {boolean} isPerfect - Whether the catch was perfect
 * @returns {Object} - { xpAdded, levelUp, bonusType }
 */
function checkFishingExcellenceBonus(user, isPerfect) {
  if (!isPerfect || !XP_SOURCES.fishing || !XP_SOURCES.fishing.manualExcellence) {
    return { xpAdded: 0, levelUp: null, bonusType: null };
  }

  const today = new Date().toISOString().split('T')[0];

  // Initialize daily fishing stats
  if (!user.dailyFishingStats || user.dailyFishingStats.date !== today) {
    user.dailyFishingStats = {
      date: today,
      perfectCatches: 0,
      perfectStreak: 0,
      dailyPerfect10Claimed: false,
      dailyPerfect25Claimed: false
    };
  }

  const stats = user.dailyFishingStats;
  stats.perfectCatches++;
  stats.perfectStreak++;

  let totalXP = 0;
  let bonusType = null;

  const excellence = XP_SOURCES.fishing.manualExcellence;

  // Check for 5-catch perfect streak bonus
  if (stats.perfectStreak === 5 && excellence.perfectStreak5) {
    totalXP += excellence.perfectStreak5;
    bonusType = 'perfectStreak5';
    console.log(`[FISHING EXCELLENCE] User ${user.id} earned ${excellence.perfectStreak5} XP for 5 perfect streak!`);
  }

  // Check for 10 perfect catches daily bonus
  if (stats.perfectCatches === 10 && !stats.dailyPerfect10Claimed && excellence.perfectDaily10) {
    totalXP += excellence.perfectDaily10;
    stats.dailyPerfect10Claimed = true;
    bonusType = bonusType ? 'multiple' : 'perfectDaily10';
    console.log(`[FISHING EXCELLENCE] User ${user.id} earned ${excellence.perfectDaily10} XP for 10 daily perfects!`);
  }

  // Check for 25 perfect catches daily bonus
  if (stats.perfectCatches === 25 && !stats.dailyPerfect25Claimed && excellence.perfectDaily25) {
    totalXP += excellence.perfectDaily25;
    stats.dailyPerfect25Claimed = true;
    bonusType = bonusType ? 'multiple' : 'perfectDaily25';
    console.log(`[FISHING EXCELLENCE] User ${user.id} earned ${excellence.perfectDaily25} XP for 25 daily perfects (MASTERY)!`);
  }

  user.dailyFishingStats = stats;

  if (totalXP === 0) {
    return { xpAdded: 0, levelUp: null, bonusType: null };
  }

  const result = addXP(user, totalXP, `fishing_excellence_${bonusType}`);
  return { ...result, bonusType };
}

/**
 * Reset fishing excellence streak (called on miss)
 * @param {Object} user - Sequelize User instance
 */
function resetFishingPerfectStreak(user) {
  if (user.dailyFishingStats) {
    user.dailyFishingStats.perfectStreak = 0;
  }
}

// ===========================================
// EXTENDED DOJO STREAK XP (NEW in v6.0)
// ===========================================

/**
 * Calculate dojo training streak XP with extended v6.0 formula
 * @param {number} streakDays - Consecutive days with dojo claims
 * @returns {number} - XP bonus for this streak level
 */
function calculateDojoStreakXP(streakDays) {
  if (!XP_SOURCES.dojoStreakBonus || streakDays <= 0) {
    return 0;
  }

  const config = XP_SOURCES.dojoStreakBonus;
  let xp = 0;

  // Days 1-7: perDay XP each
  const daysInFirstWeek = Math.min(streakDays, 7);
  xp += daysInFirstWeek * (config.perDay || 2);

  // Days 8-14: perDayExtended XP each (NEW in v6.0)
  if (streakDays > 7 && config.perDayExtended) {
    const daysInSecondWeek = Math.min(streakDays - 7, 7);
    xp += daysInSecondWeek * config.perDayExtended;
  }

  // Cap at maxBonus
  return Math.min(xp, config.maxBonus || 35);
}

// ===========================================
// EXTENDED LOGIN STREAK XP (NEW in v6.0)
// ===========================================

/**
 * Add XP for login streak with v6.0 extended milestones
 * @param {Object} user - Sequelize User instance
 * @param {number} streakDays - Current login streak length
 * @returns {Object} - { xpAdded, levelUp, milestone, title }
 */
function addLoginStreakXP(user, streakDays) {
  if (!XP_SOURCES.loginStreak || !XP_SOURCES.loginStreak.streakXP) {
    return { xpAdded: 0, levelUp: null, milestone: null, title: null };
  }

  const streakXP = XP_SOURCES.loginStreak.streakXP;

  // Find the highest applicable milestone
  let xp = 0;
  let milestone = null;

  const milestones = Object.keys(streakXP).map(Number).sort((a, b) => b - a);
  for (const m of milestones) {
    if (streakDays >= m) {
      xp = streakXP[m];
      milestone = m;
      break;
    }
  }

  if (xp === 0) {
    return { xpAdded: 0, levelUp: null, milestone: null, title: null };
  }

  // Cap at maxDailyStreakXP
  xp = Math.min(xp, XP_SOURCES.loginStreak.maxDailyStreakXP || 1000);

  // Check for title unlock
  let title = null;
  if (XP_SOURCES.loginStreak.titles && XP_SOURCES.loginStreak.titles[streakDays]) {
    title = XP_SOURCES.loginStreak.titles[streakDays];
  }

  console.log(`[LOGIN STREAK] User ${user.id} earned ${xp} XP for ${streakDays}-day streak${title ? ` + title: ${title}` : ''}`);
  const result = addXP(user, xp, `login_streak_${streakDays}`);

  return { ...result, milestone, title };
}

module.exports = {
  addXP,
  addGachaPullXP,
  addNewCharacterXP,
  addCharacterLevelXP,
  addDojoClaimXP,
  recalculateXP,
  getAccountLevelStatus,
  checkFacilityRequirement,
  initializeUserXP,
  // Dojo XP (NEW in v4.0)
  addDojoPassiveXP,
  // Breakthrough XP (NEW in v4.0)
  addBreakthroughXP,
  // Gacha Milestone XP (NEW in v4.0)
  addGachaMilestoneXP,
  checkAndAwardMilestoneXP,
  // Rest-and-Return XP (NEW in v4.0)
  addRestAndReturnXP,
  // Mode Variety XP (NEW in v4.0)
  applyModeSwitchBonus,
  checkWeeklyAllModeBonus,
  incrementWeeklyModeStat,
  // Fishing XP (NEW in v3.0)
  addFishingCatchXP,
  addFishingTradeXP,
  addNewFishXP,
  addFishStarMilestoneXP,
  addFishingChallengeXP,
  // Variety bonus (NEW in v3.0)
  checkDailyVarietyBonus,
  // Character Mastery XP (NEW in v6.0)
  addCharacterMasteryXP,
  // First-time Achievement XP (NEW in v6.0)
  addFirstTimeAchievementXP,
  // Fishing Excellence XP (NEW in v6.0)
  checkFishingExcellenceBonus,
  resetFishingPerfectStreak,
  // Extended Streak XP (NEW in v6.0)
  calculateDojoStreakXP,
  addLoginStreakXP,
  // Re-exported config functions
  getLevelReward,
  getRewardsForLevelRange,
  getCumulativeBonuses
};
