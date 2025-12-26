/**
 * Account Level Service
 *
 * Manages account XP and level progression.
 * Provides functions for:
 * - Adding XP from various sources
 * - Recalculating total XP from user data
 * - Checking and applying level ups
 * - Getting account level status
 */

const {
  XP_SOURCES,
  LEVEL_CONFIG,
  getLevelFromXP,
  getLevelProgress,
  checkLevelUp,
  getUnlocksAtLevel
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
 * @returns {Object} - { xpAdded, levelUp }
 */
function addDojoClaimXP(user) {
  // Increment total claims counter
  user.dojoClaimsTotal = (user.dojoClaimsTotal || 0) + 1;

  const xp = XP_SOURCES.dojoClaim;
  return addXP(user, xp, 'dojo_claim');
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
  initializeUserXP
};
