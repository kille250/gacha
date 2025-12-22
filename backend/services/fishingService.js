/**
 * Fishing Service
 * 
 * Core fishing logic extracted from routes for better maintainability.
 * Handles pity calculations, daily data management, and challenge tracking.
 */

const {
  FISHING_CONFIG,
  FISH_TYPES,
  FISHING_AREAS,
  FISHING_RODS,
  DAILY_CHALLENGES,
  selectRandomFish,
  selectRandomFishWithBonuses,
  getCatchThresholds,
  getTodayString,
  needsDailyReset,
  generateDailyChallenges
} = require('../config/fishing');

const { getPrestigeBonuses } = require('../config/fishing/prestige');
const { buildCollectionData, getCollectionBonuses } = require('../config/fishing/collection');

/**
 * Update pity counters based on catch result
 * Epic counter correctly resets on legendary catches too
 * @param {Object} currentPity - Current pity data { legendary, epic }
 * @param {Array} resetPity - Array of rarities to reset ['legendary', 'epic']
 * @param {number} timestamp - Current timestamp
 * @returns {Object} - Updated pity data
 */
function updatePityCounters(currentPity, resetPity, timestamp) {
  const newPityData = { ...currentPity };
  
  // Legendary catch resets both counters
  if (resetPity.includes('legendary')) {
    newPityData.legendary = 0;
    newPityData.epic = 0; // Legendary also resets epic pity
  } else {
    // No legendary - increment legendary counter
    newPityData.legendary = (newPityData.legendary || 0) + 1;
    
    // Epic catch resets epic counter
    if (resetPity.includes('epic')) {
      newPityData.epic = 0;
    } else {
      // No epic - increment epic counter
      newPityData.epic = (newPityData.epic || 0) + 1;
    }
  }
  
  newPityData.lastCast = timestamp;
  return newPityData;
}

/**
 * Get or reset daily fishing data
 * @param {Object} user - User model instance
 * @returns {Object} - Current daily data (reset if new day)
 */
function getOrResetDailyData(user) {
  const today = getTodayString();
  let daily = user.fishingDaily || {};
  
  if (needsDailyReset(daily.date)) {
    daily = {
      date: today,
      manualCasts: 0,
      autofishCasts: 0,
      catches: 0,
      perfectCatches: 0,
      rareCatches: 0,
      tradesCompleted: 0,
      pointsFromTrades: 0,
      ticketsEarned: { roll: 0, premium: 0 },
      ticketsUsed: { roll: 0, premium: 0 },  // NEW: Track tickets consumed today
      // Streak tracking
      currentStreak: 0,
      bestStreak: 0,
      missStreak: 0
    };
  }
  
  // Ensure ticketsUsed exists for backwards compatibility
  if (!daily.ticketsUsed) {
    daily.ticketsUsed = { roll: 0, premium: 0 };
  }
  
  return daily;
}

/**
 * Get or reset daily challenges
 * @param {Object} user - User model instance
 * @returns {Object} - Current challenges data (reset if new day)
 */
function getOrResetChallenges(user) {
  const today = getTodayString();
  let challenges = user.fishingChallenges || {};
  
  if (needsDailyReset(challenges.date)) {
    challenges = {
      date: today,
      active: generateDailyChallenges(),
      completed: [],
      progress: {}
    };
  }
  
  return challenges;
}

/**
 * Update challenge progress based on action
 * @param {Object} challenges - Current challenges data
 * @param {string} type - Challenge type ('catch', 'perfect', 'rarity', 'trade', 'streak')
 * @param {Object} data - Action data { rarity, isCollection, streakCount }
 * @returns {Object} - { challenges, newlyCompleted: [] }
 */
function updateChallengeProgress(challenges, type, data = {}) {
  const newlyCompleted = [];
  
  for (const challengeId of challenges.active) {
    if (challenges.completed.includes(challengeId)) continue;
    
    const challenge = DAILY_CHALLENGES[challengeId];
    if (!challenge) continue;
    
    let shouldIncrement = false;
    
    switch (challenge.type) {
      case 'catch':
        if (type === 'catch') shouldIncrement = true;
        break;
      case 'perfect':
        if (type === 'perfect') shouldIncrement = true;
        break;
      case 'rarity':
        if (type === 'catch' && data.rarity && 
            challenge.targetRarity.includes(data.rarity)) {
          shouldIncrement = true;
        }
        break;
      case 'trade':
        if (type === 'trade') shouldIncrement = true;
        break;
      case 'collection_trade':
        if (type === 'trade' && data.isCollection) shouldIncrement = true;
        break;
      case 'streak':
        if (type === 'streak') {
          // Streak challenges set progress directly
          challenges.progress[challengeId] = Math.max(
            challenges.progress[challengeId] || 0,
            data.streakCount || 0
          );
        }
        break;
    }
    
    if (shouldIncrement) {
      challenges.progress[challengeId] = (challenges.progress[challengeId] || 0) + 1;
    }
    
    // Check if challenge is now completed
    if ((challenges.progress[challengeId] || 0) >= challenge.target) {
      if (!challenges.completed.includes(challengeId)) {
        challenges.completed.push(challengeId);
        newlyCompleted.push({ id: challengeId, reward: challenge.reward });
      }
    }
  }
  
  return { challenges, newlyCompleted };
}

/**
 * Apply challenge rewards to user
 * @param {Object} user - User model instance
 * @param {Array} rewards - Array of { id, reward } objects
 */
function applyChallengeRewards(user, rewards) {
  for (const { reward } of rewards) {
    if (reward.points) {
      user.points = (user.points || 0) + reward.points;
    }
    if (reward.rollTickets) {
      user.rollTickets = (user.rollTickets || 0) + reward.rollTickets;
    }
    if (reward.premiumTickets) {
      user.premiumTickets = (user.premiumTickets || 0) + reward.premiumTickets;
    }
  }
  
  // Update achievements
  const achievements = user.fishingAchievements || {};
  achievements.challengesCompleted = (achievements.challengesCompleted || 0) + rewards.length;
  user.fishingAchievements = achievements;
}

/**
 * Calculate catch quality and bonus multiplier
 * @param {number} reactionTime - Validated reaction time in ms
 * @param {Object} fish - Fish object with rarity and timingWindow
 * @param {Object} rod - Current fishing rod
 * @returns {Object} - { quality, multiplier, message }
 */
function calculateCatchQuality(reactionTime, fish, rod = null) {
  const catchConfig = getCatchThresholds(fish.rarity);
  const rodPerfectBonus = rod?.perfectBonus || 0;
  
  // Apply rod's perfect catch bonus to threshold
  const adjustedPerfectThreshold = catchConfig.perfectThreshold + rodPerfectBonus;
  const adjustedGreatThreshold = catchConfig.greatThreshold + rodPerfectBonus;
  
  const reactionRatio = reactionTime / fish.timingWindow;
  
  let quality = 'normal';
  let multiplier = 1.0;
  let message = `You caught a ${fish.name}!`;
  
  if (reactionRatio <= adjustedPerfectThreshold) {
    quality = 'perfect';
    multiplier = catchConfig.perfectMultiplier;
    message = `⭐ PERFECT! You caught a ${fish.name}!`;
  } else if (reactionRatio <= adjustedGreatThreshold) {
    quality = 'great';
    multiplier = catchConfig.greatMultiplier;
    message = `✨ Great catch! You caught a ${fish.name}!`;
  }
  
  return { quality, multiplier, message };
}

/**
 * Calculate fish quantity based on catch quality multiplier
 * @param {number} multiplier - Catch quality multiplier
 * @returns {number} - Number of fish to award
 */
function calculateFishQuantity(multiplier) {
  if (multiplier >= 2.0) {
    return 2;
  } else if (multiplier > 1.0) {
    // Probabilistic bonus: 1.5x = 50% chance for extra fish
    const bonusChance = multiplier - 1.0;
    return Math.random() < bonusChance ? 2 : 1;
  }
  return 1;
}

/**
 * Update streak counters based on catch result
 * @param {Object} daily - Daily fishing data
 * @param {boolean} success - Whether the catch was successful
 * @param {Object} achievements - User's fishing achievements
 * @returns {Object} - { daily, achievements, streakBonus }
 */
function updateStreakCounters(daily, success, achievements) {
  const streakConfig = FISHING_CONFIG.streakBonuses || {};
  let streakBonus = null;
  
  if (success) {
    // Reset miss streak, increment catch streak
    daily.missStreak = 0;
    daily.currentStreak = (daily.currentStreak || 0) + 1;
    
    // Update best streak
    if (daily.currentStreak > (daily.bestStreak || 0)) {
      daily.bestStreak = daily.currentStreak;
    }
    
    // Update all-time best streak in achievements
    if (daily.currentStreak > (achievements.longestStreak || 0)) {
      achievements.longestStreak = daily.currentStreak;
    }
    achievements.currentStreak = daily.currentStreak;
    
    // Check for streak bonuses
    const streakMilestones = Object.keys(streakConfig)
      .map(Number)
      .sort((a, b) => b - a); // Sort descending
    
    for (const milestone of streakMilestones) {
      if (daily.currentStreak >= milestone) {
        streakBonus = {
          milestone,
          ...streakConfig[milestone]
        };
        break;
      }
    }
  } else {
    // Reset catch streak, increment miss streak
    daily.currentStreak = 0;
    daily.missStreak = (daily.missStreak || 0) + 1;
    achievements.currentStreak = 0;
  }
  
  return { daily, achievements, streakBonus };
}

/**
 * Calculate mercy timer bonus for consecutive misses
 * @param {number} missStreak - Number of consecutive misses
 * @returns {number} - Bonus timing window in ms
 */
function calculateMercyBonus(missStreak) {
  const mercyConfig = FISHING_CONFIG.mercyTimer || {};
  const threshold = mercyConfig.missThreshold || 5;
  const bonusPerMiss = mercyConfig.timingBonusPerMiss || 100;
  const maxBonus = mercyConfig.maxTimingBonus || 500;
  
  if (missStreak >= threshold) {
    const missesOverThreshold = missStreak - threshold + 1;
    return Math.min(missesOverThreshold * bonusPerMiss, maxBonus);
  }
  
  return 0;
}

/**
 * Apply streak bonus to points reward
 * @param {number} basePoints - Base points earned
 * @param {Object} streakBonus - Streak bonus object
 * @returns {number} - Modified points
 */
function applyStreakBonus(basePoints, streakBonus) {
  if (!streakBonus) return basePoints;
  
  if (streakBonus.pointsMultiplier) {
    return Math.floor(basePoints * streakBonus.pointsMultiplier);
  }
  
  return basePoints;
}

/**
 * Get random wait time for fish to bite
 * @returns {number} - Wait time in ms
 */
function getRandomWaitTime() {
  const config = FISHING_CONFIG.casting || {};
  const minWait = config.minWaitTime || 1500;
  const maxWait = config.maxWaitTime || 6000;
  
  return Math.floor(Math.random() * (maxWait - minWait)) + minWait;
}

/**
 * Get miss timeout for a fish rarity
 * @param {string} rarity - Fish rarity
 * @returns {number} - Miss timeout in ms
 */
function getMissTimeout(rarity) {
  return FISHING_CONFIG.missTimeout?.[rarity] || 2500;
}

/**
 * Check if user can perform action based on fishing mode
 * @param {Map} userFishingMode - Mode tracking map
 * @param {number} userId - User ID
 * @param {string} requestedMode - 'manual' or 'autofish'
 * @param {number} conflictWindow - Time window for conflict detection in ms
 * @returns {boolean|string} - false if OK, or error message
 */
function checkFishingModeConflict(userFishingMode, userId, requestedMode, conflictWindow = 15000) {
  const current = userFishingMode.get(userId);
  if (!current) return false;
  
  const isRecent = Date.now() - current.lastActivity < conflictWindow;
  
  if (isRecent && current.mode !== requestedMode) {
    return `Cannot ${requestedMode} while ${current.mode} is active`;
  }
  
  return false;
}

/**
 * Set user's current fishing mode
 * @param {Map} userFishingMode - Mode tracking map
 * @param {number} userId - User ID
 * @param {string} mode - 'manual' or 'autofish'
 */
function setFishingMode(userFishingMode, userId, mode) {
  userFishingMode.set(userId, { mode, lastActivity: Date.now() });
}

/**
 * Get user's prestige autofish limit bonus
 * Reduces redundant code across routes
 * @param {Object} user - User model instance
 * @returns {number} - Bonus autofish limit from prestige
 */
function getUserPrestigeAutofishBonus(user) {
  const prestige = user?.fishingAchievements?.prestige;
  return prestige ? getPrestigeBonuses(prestige).autofishLimit : 0;
}

/**
 * Get all cumulative bonuses for a user (prestige + collection)
 * Single source of truth for bonus calculations
 * @param {Object} user - User model instance
 * @returns {Object} - Combined bonuses { timing, rarity, autofish, pity, premium, autofishPerfect, pityReduction, unlocks }
 */
function getUserBonuses(user) {
  const achievements = user?.fishingAchievements || {};
  const stats = user?.fishingStats || {};
  const prestige = achievements.prestige || 0;
  
  // Get prestige bonuses
  const prestigeBonuses = getPrestigeBonuses(prestige);
  
  // Get collection bonuses
  const collection = buildCollectionData(stats.fishCaught || {}, FISH_TYPES);
  const collectionBonuses = getCollectionBonuses(collection);
  
  return {
    timing: prestigeBonuses.timingBonus + collectionBonuses.timingBonus,
    rarity: prestigeBonuses.rarityBonus + collectionBonuses.rarityBonus,
    autofish: prestigeBonuses.autofishLimit + (collectionBonuses.autofishBonus || 0),
    pity: collectionBonuses.pityBonus || 0,
    premium: prestigeBonuses.premiumTicketBonus || 0,
    autofishPerfect: prestigeBonuses.autofishPerfectChance || 0,
    pityReduction: prestigeBonuses.pityReduction || 0,
    unlocks: prestigeBonuses.unlocks || [],
    // Include source breakdown for transparency
    _prestige: prestigeBonuses,
    _collection: collectionBonuses
  };
}

/**
 * Build premium status object for autofish limit calculation
 * @param {Object} user - User model instance
 * @param {Object} daily - Daily data from getOrResetDailyData
 * @returns {Object} - { tickets, usedToday }
 */
function buildPremiumStatus(user, daily) {
  return {
    tickets: user?.premiumTickets || 0,
    usedToday: daily?.ticketsUsed?.premium || 0
  };
}

module.exports = {
  // Pity & Daily
  updatePityCounters,
  getOrResetDailyData,
  getOrResetChallenges,
  
  // Challenges
  updateChallengeProgress,
  applyChallengeRewards,
  
  // Catch mechanics
  calculateCatchQuality,
  calculateFishQuantity,
  getRandomWaitTime,
  getMissTimeout,
  
  // Streak system
  updateStreakCounters,
  calculateMercyBonus,
  applyStreakBonus,
  
  // Mode management
  checkFishingModeConflict,
  setFishingMode,
  
  // Bonus helpers (reduces code redundancy)
  getUserPrestigeAutofishBonus,
  getUserBonuses,
  buildPremiumStatus
};

