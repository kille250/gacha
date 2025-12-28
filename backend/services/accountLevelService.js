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
 * BALANCE UPDATE (v3.0 - Cross-Mode Economy Balancing)
 * ============================================================================
 * Added fishing XP functions and daily variety bonus tracking.
 * All game modes now contribute to profile progression.
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
  // Fishing XP (NEW in v3.0)
  addFishingCatchXP,
  addFishingTradeXP,
  addNewFishXP,
  addFishStarMilestoneXP,
  addFishingChallengeXP,
  // Variety bonus (NEW in v3.0)
  checkDailyVarietyBonus,
  // Re-exported config functions
  getLevelReward,
  getRewardsForLevelRange,
  getCumulativeBonuses
};
