/**
 * Enhanced Gacha Service
 *
 * Handles the enhanced gacha features including:
 * - Visible pity progress
 * - Milestone rewards
 * - Fate points system
 * - Alternative character acquisition paths
 */

const {
  GACHA_MILESTONE_REWARDS,
  GACHA_FATE_POINTS,
  GACHA_ALTERNATIVE_PATHS
} = require('../config/gameDesign');

// ===========================================
// PITY VISIBILITY SYSTEM
// ===========================================

/**
 * Get detailed pity information for display
 * @param {Object} user - User object
 * @param {Object} banner - Banner object (optional, for banner-specific pity)
 * @returns {Object} - Comprehensive pity state
 */
function getPityState(user, banner = null) {
  // Standard pity (applies to all banners)
  const standardPity = user.gachaPity || {
    pullsSinceRare: 0,
    pullsSinceEpic: 0,
    pullsSinceLegendary: 0,
    totalPulls: 0
  };

  // Banner-specific pity
  let bannerPity = null;
  if (banner) {
    const bannerPities = user.bannerPity || {};
    bannerPity = bannerPities[banner.id] || {
      pullsSinceFeatured: 0,
      guaranteedFeatured: false,
      totalBannerPulls: 0
    };
  }

  // Calculate progress percentages
  const rareProgress = Math.min(100, (standardPity.pullsSinceRare / 10) * 100);
  const epicProgress = Math.min(100, (standardPity.pullsSinceEpic / 50) * 100);
  const legendaryProgress = Math.min(100, (standardPity.pullsSinceLegendary / 90) * 100);

  // Determine if in soft pity (increased rates)
  const inSoftPityLegendary = standardPity.pullsSinceLegendary >= 75;
  const inSoftPityEpic = standardPity.pullsSinceEpic >= 40;

  return {
    standard: {
      pullsSinceRare: standardPity.pullsSinceRare,
      pullsSinceEpic: standardPity.pullsSinceEpic,
      pullsSinceLegendary: standardPity.pullsSinceLegendary,
      totalPulls: standardPity.totalPulls,
      progress: {
        rare: { current: standardPity.pullsSinceRare, max: 10, percent: rareProgress },
        epic: { current: standardPity.pullsSinceEpic, max: 50, percent: epicProgress },
        legendary: { current: standardPity.pullsSinceLegendary, max: 90, percent: legendaryProgress }
      },
      softPity: {
        legendary: inSoftPityLegendary,
        epic: inSoftPityEpic
      },
      // Estimated pulls until guaranteed
      untilGuaranteed: {
        rare: Math.max(0, 10 - standardPity.pullsSinceRare),
        epic: Math.max(0, 50 - standardPity.pullsSinceEpic),
        legendary: Math.max(0, 90 - standardPity.pullsSinceLegendary)
      }
    },
    banner: bannerPity ? {
      pullsSinceFeatured: bannerPity.pullsSinceFeatured,
      guaranteedFeatured: bannerPity.guaranteedFeatured,
      totalBannerPulls: bannerPity.totalBannerPulls,
      message: bannerPity.guaranteedFeatured
        ? 'Next 5-star is guaranteed to be the featured character!'
        : 'Standard rates apply'
    } : null
  };
}

/**
 * Update pity counters after a pull
 * @param {Object} user - User object
 * @param {string} rarity - Pulled character's rarity
 * @param {Object} banner - Banner pulled from (optional)
 * @param {boolean} isFeatured - Whether pulled character was featured
 * @returns {Object} - Updated pity state
 */
function updatePityCounters(user, rarity, banner = null, isFeatured = false) {
  const pity = user.gachaPity || {
    pullsSinceRare: 0,
    pullsSinceEpic: 0,
    pullsSinceLegendary: 0,
    totalPulls: 0
  };

  pity.totalPulls += 1;

  // Update counters based on rarity pulled
  if (rarity === 'legendary') {
    pity.pullsSinceLegendary = 0;
    pity.pullsSinceEpic = 0;
    pity.pullsSinceRare = 0;
  } else if (rarity === 'epic') {
    pity.pullsSinceLegendary += 1;
    pity.pullsSinceEpic = 0;
    pity.pullsSinceRare = 0;
  } else if (rarity === 'rare') {
    pity.pullsSinceLegendary += 1;
    pity.pullsSinceEpic += 1;
    pity.pullsSinceRare = 0;
  } else {
    pity.pullsSinceLegendary += 1;
    pity.pullsSinceEpic += 1;
    pity.pullsSinceRare += 1;
  }

  user.gachaPity = pity;

  // Update banner-specific pity
  if (banner) {
    const bannerPities = user.bannerPity || {};
    let bannerPity = bannerPities[banner.id] || {
      pullsSinceFeatured: 0,
      guaranteedFeatured: false,
      totalBannerPulls: 0
    };

    bannerPity.totalBannerPulls += 1;

    if (rarity === 'legendary') {
      if (isFeatured) {
        bannerPity.pullsSinceFeatured = 0;
        bannerPity.guaranteedFeatured = false;
      } else {
        // Lost 50/50 - next is guaranteed
        bannerPity.pullsSinceFeatured += 1;
        bannerPity.guaranteedFeatured = true;
      }
    } else {
      bannerPity.pullsSinceFeatured += 1;
    }

    bannerPities[banner.id] = bannerPity;
    user.bannerPity = bannerPities;
  }

  return getPityState(user, banner);
}

// ===========================================
// MILESTONE REWARDS SYSTEM
// ===========================================

/**
 * Get milestone rewards status for a banner
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID (or 'standard' for standard banner)
 * @returns {Object} - Milestone status and available claims
 */
function getMilestoneStatus(user, bannerId = 'standard') {
  const pullHistory = user.pullHistory || {};
  const bannerPulls = pullHistory[bannerId] || { total: 0, claimed: [] };

  const milestones = GACHA_MILESTONE_REWARDS.milestones.map(milestone => {
    const canClaim = bannerPulls.total >= milestone.pulls &&
      !bannerPulls.claimed.includes(milestone.pulls);

    return {
      pulls: milestone.pulls,
      reward: milestone.reward,
      claimed: bannerPulls.claimed.includes(milestone.pulls),
      canClaim,
      progress: Math.min(100, (bannerPulls.total / milestone.pulls) * 100),
      remaining: Math.max(0, milestone.pulls - bannerPulls.total)
    };
  });

  // Find next unclaimed milestone
  const nextMilestone = milestones.find(m => !m.claimed);

  return {
    totalPulls: bannerPulls.total,
    milestones,
    nextMilestone,
    claimable: milestones.filter(m => m.canClaim)
  };
}

/**
 * Claim a milestone reward
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID
 * @param {number} milestonePulls - Milestone pull count to claim
 * @returns {Object} - Claim result
 */
function claimMilestoneReward(user, bannerId, milestonePulls) {
  const pullHistory = user.pullHistory || {};
  const bannerPulls = pullHistory[bannerId] || { total: 0, claimed: [] };

  // Find milestone
  const milestone = GACHA_MILESTONE_REWARDS.milestones.find(m => m.pulls === milestonePulls);
  if (!milestone) {
    return { success: false, error: 'Invalid milestone' };
  }

  // Check eligibility
  if (bannerPulls.total < milestonePulls) {
    return { success: false, error: `Need ${milestonePulls} pulls (have ${bannerPulls.total})` };
  }

  if (bannerPulls.claimed.includes(milestonePulls)) {
    return { success: false, error: 'Already claimed' };
  }

  // Mark as claimed
  bannerPulls.claimed.push(milestonePulls);
  pullHistory[bannerId] = bannerPulls;
  user.pullHistory = pullHistory;

  // Apply rewards (caller is responsible for saving)
  const rewards = applyMilestoneReward(user, milestone.reward);

  return {
    success: true,
    milestone: milestonePulls,
    reward: milestone.reward,
    appliedRewards: rewards,
    message: `Claimed ${milestonePulls}-pull milestone reward!`
  };
}

/**
 * Apply milestone reward to user
 * @param {Object} user - User object
 * @param {Object} reward - Reward to apply
 * @returns {Object} - Applied rewards
 */
function applyMilestoneReward(user, reward) {
  const applied = {};

  if (reward.type === 'points') {
    user.points = (user.points || 0) + reward.quantity;
    applied.points = reward.quantity;
  }

  if (reward.type === 'roll_tickets') {
    user.rollTickets = (user.rollTickets || 0) + reward.quantity;
    applied.rollTickets = reward.quantity;
  }

  if (reward.type === 'premium_tickets') {
    user.premiumTickets = (user.premiumTickets || 0) + reward.quantity;
    applied.premiumTickets = reward.quantity;
  }

  if (reward.type === 'character_selector') {
    // Add to user's selectors
    const selectors = user.characterSelectors || [];
    selectors.push({
      rarity: reward.rarity,
      obtained: new Date().toISOString(),
      used: false
    });
    user.characterSelectors = selectors;
    applied.characterSelector = reward.rarity;
  }

  if (reward.type === 'rod_skin') {
    const skins = user.rodSkins || [];
    if (!skins.includes(reward.id)) {
      skins.push(reward.id);
      user.rodSkins = skins;
      applied.rodSkin = reward.id;
    }
  }

  return applied;
}

/**
 * Record a pull for milestone tracking
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID
 * @param {number} count - Number of pulls (default 1)
 */
function recordPull(user, bannerId, count = 1) {
  const pullHistory = user.pullHistory || {};
  const bannerPulls = pullHistory[bannerId] || { total: 0, claimed: [] };

  bannerPulls.total += count;
  pullHistory[bannerId] = bannerPulls;
  user.pullHistory = pullHistory;
}

// ===========================================
// FATE POINTS SYSTEM
// ===========================================

/**
 * Get the start of the current week (Monday 00:00:00 UTC)
 * @returns {Date} - Start of current week
 */
function getWeekStart() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  // Adjust so Monday is day 0
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get weekly fate points tracking data
 * Resets automatically if week has changed
 * @param {Object} user - User object
 * @returns {Object} - { pointsThisWeek, weeklyMax, weekStart }
 */
function getWeeklyFatePoints(user) {
  const weeklyMax = GACHA_FATE_POINTS.weeklyMax || 500;
  const currentWeekStart = getWeekStart().toISOString();

  const weeklyData = user.fatePointsWeekly || {};

  // Check if we're in a new week
  if (weeklyData.weekStart !== currentWeekStart) {
    // New week - reset tracking
    return {
      pointsThisWeek: 0,
      weeklyMax,
      weekStart: currentWeekStart,
      isNewWeek: true
    };
  }

  return {
    pointsThisWeek: weeklyData.pointsEarned || 0,
    weeklyMax,
    weekStart: currentWeekStart,
    isNewWeek: false
  };
}

/**
 * Update weekly fate points tracking
 * @param {Object} user - User object
 * @param {number} pointsEarned - Points earned this transaction
 * @returns {number} - Actual points added (may be capped)
 */
function updateWeeklyFatePoints(user, pointsEarned) {
  if (!GACHA_FATE_POINTS.weeklyCapEnabled) {
    return pointsEarned;
  }

  const weekly = getWeeklyFatePoints(user);
  const weeklyMax = weekly.weeklyMax;

  // Calculate how many points can actually be added
  const remainingCap = Math.max(0, weeklyMax - weekly.pointsThisWeek);
  const actualPoints = Math.min(pointsEarned, remainingCap);

  // Update weekly tracking
  user.fatePointsWeekly = {
    weekStart: weekly.weekStart,
    pointsEarned: weekly.pointsThisWeek + actualPoints
  };

  return actualPoints;
}

/**
 * Get total fate points across all banners (global pool)
 * @param {Object} user - User object
 * @returns {number} - Total fate points
 */
function getTotalFatePoints(user) {
  const fatePoints = user.fatePoints || {};
  let total = 0;
  for (const bannerId of Object.keys(fatePoints)) {
    total += fatePoints[bannerId]?.points || 0;
  }
  return total;
}

/**
 * Get fate points status for a user
 * Returns global fate points pool with weekly tracking
 * @param {Object} user - User object
 * @param {string} _bannerId - Banner ID (unused - FP are global, kept for API compatibility)
 * @returns {Object} - Fate points status
 */
function getFatePointsStatus(user, _bannerId) {
  if (!GACHA_FATE_POINTS.enabled) {
    return { enabled: false };
  }

  // Get total points across all banners (global pool)
  const totalPoints = getTotalFatePoints(user);

  // Get weekly tracking
  const weekly = getWeeklyFatePoints(user);

  // Get exchange options from config
  const exchangeOptions = GACHA_FATE_POINTS.exchangeOptions || {};

  return {
    enabled: true,
    points: totalPoints,
    pointsThisWeek: weekly.pointsThisWeek,
    weeklyMax: weekly.weeklyMax,
    weekStart: weekly.weekStart,
    exchangeOptions: Object.values(exchangeOptions).map(opt => ({
      id: opt.id,
      name: opt.name,
      description: opt.description,
      cost: opt.cost,
      affordable: totalPoints >= opt.cost
    })),
    // Legacy fields for backwards compatibility
    pointsNeeded: GACHA_FATE_POINTS.rateUpBanner?.pointsForGuaranteed || 300,
    canGuarantee: totalPoints >= (GACHA_FATE_POINTS.rateUpBanner?.pointsForGuaranteed || 300),
    progress: Math.min(100, (totalPoints / (GACHA_FATE_POINTS.rateUpBanner?.pointsForGuaranteed || 300)) * 100)
  };
}

/**
 * Award fate points after a pull
 * Points are added to a specific banner but weekly cap is global
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID
 * @param {string} pullType - 'standard', 'banner', 'premium'
 * @param {boolean} gotNonFeaturedFiveStar - Whether user got non-featured 5*
 * @param {number} pullCount - Number of pulls (for multi-rolls)
 * @returns {Object} - Fate points awarded
 */
function awardFatePoints(user, bannerId, pullType, gotNonFeaturedFiveStar = false, pullCount = 1) {
  if (!GACHA_FATE_POINTS.enabled) {
    return { awarded: 0, capped: false };
  }

  const fatePoints = user.fatePoints || {};
  const bannerFate = fatePoints[bannerId] || { points: 0, lastUpdate: null };

  // Base points per pull multiplied by pull count
  const basePointsPerPull = GACHA_FATE_POINTS.pointsPerPull[pullType] || 1;
  let pointsToAdd = basePointsPerPull * pullCount;

  // Bonus for non-featured 5-star (only once per multi-roll, not multiplied)
  if (gotNonFeaturedFiveStar) {
    pointsToAdd += GACHA_FATE_POINTS.rateUpBanner?.nonFeaturedFiveStarPoints || 0;
  }

  // Apply weekly cap
  const actualPoints = updateWeeklyFatePoints(user, pointsToAdd);
  const wasCapped = actualPoints < pointsToAdd;

  bannerFate.points += actualPoints;
  bannerFate.lastUpdate = new Date().toISOString();

  fatePoints[bannerId] = bannerFate;
  user.fatePoints = fatePoints;

  return {
    awarded: actualPoints,
    requested: pointsToAdd,
    capped: wasCapped,
    total: getTotalFatePoints(user),
    message: wasCapped
      ? `+${actualPoints} Fate Points (weekly cap reached)`
      : `+${actualPoints} Fate Points`
  };
}

/**
 * Deduct fate points from user's global pool
 * Deducts from banners in order of most points first
 * @param {Object} user - User object
 * @param {number} amount - Amount to deduct
 * @returns {boolean} - Success
 */
function deductFatePoints(user, amount) {
  const fatePoints = user.fatePoints || {};
  const totalPoints = getTotalFatePoints(user);

  if (totalPoints < amount) {
    return false;
  }

  let remaining = amount;

  // Sort banners by points descending
  const bannerIds = Object.keys(fatePoints).sort((a, b) => {
    return (fatePoints[b]?.points || 0) - (fatePoints[a]?.points || 0);
  });

  for (const bannerId of bannerIds) {
    if (remaining <= 0) break;

    const bannerPoints = fatePoints[bannerId]?.points || 0;
    const deduct = Math.min(bannerPoints, remaining);

    fatePoints[bannerId].points -= deduct;
    remaining -= deduct;
  }

  user.fatePoints = fatePoints;
  return true;
}

/**
 * Exchange fate points for a reward
 * @param {Object} user - User object
 * @param {string} exchangeType - Type of exchange (rare_selector, epic_selector, legendary_selector, banner_pity_reset)
 * @param {string} bannerId - Banner ID (required for pity reset)
 * @returns {Object} - Exchange result
 */
function exchangeFatePoints(user, exchangeType, bannerId = null) {
  if (!GACHA_FATE_POINTS.enabled) {
    return { success: false, error: 'Fate points not enabled' };
  }

  // Validate exchange type
  const exchangeOptions = GACHA_FATE_POINTS.exchangeOptions || {};
  const option = exchangeOptions[exchangeType];

  if (!option) {
    return {
      success: false,
      error: `Invalid exchange type: ${exchangeType}`
    };
  }

  const totalPoints = getTotalFatePoints(user);
  const cost = option.cost;

  if (totalPoints < cost) {
    return {
      success: false,
      error: `Need ${cost} Fate Points (have ${totalPoints})`
    };
  }

  // Deduct points from global pool
  if (!deductFatePoints(user, cost)) {
    return {
      success: false,
      error: 'Failed to deduct fate points'
    };
  }

  // Handle the reward based on exchange type
  const reward = applyFatePointsExchangeReward(user, exchangeType, bannerId);

  return {
    success: true,
    exchangeType,
    pointsSpent: cost,
    remainingPoints: getTotalFatePoints(user),
    reward,
    message: `Exchanged ${cost} Fate Points for ${option.name}!`
  };
}

/**
 * Apply the reward from a fate points exchange
 * @param {Object} user - User object
 * @param {string} exchangeType - Type of exchange
 * @param {string} bannerId - Banner ID (for pity reset)
 * @returns {Object} - Reward details
 */
function applyFatePointsExchangeReward(user, exchangeType, bannerId) {
  const reward = { type: exchangeType };

  switch (exchangeType) {
    case 'rare_selector': {
      // Add rare selector to user's inventory
      const rareSelectors = user.characterSelectors || [];
      rareSelectors.push({
        rarity: 'rare',
        source: 'fate_points_exchange',
        bannerId: bannerId || null, // Store bannerId for banner-specific character pool
        obtained: new Date().toISOString(),
        used: false
      });
      user.characterSelectors = rareSelectors;
      reward.selector = { rarity: 'rare', bannerId };
      break;
    }

    case 'epic_selector': {
      // Add epic selector to user's inventory
      const epicSelectors = user.characterSelectors || [];
      epicSelectors.push({
        rarity: 'epic',
        source: 'fate_points_exchange',
        bannerId: bannerId || null, // Store bannerId for banner-specific character pool
        obtained: new Date().toISOString(),
        used: false
      });
      user.characterSelectors = epicSelectors;
      reward.selector = { rarity: 'epic', bannerId };
      break;
    }

    case 'legendary_selector': {
      // Add legendary selector to user's inventory
      const legendarySelectors = user.characterSelectors || [];
      legendarySelectors.push({
        rarity: 'legendary',
        source: 'fate_points_exchange',
        bannerId: bannerId || null, // Store bannerId for banner-specific character pool
        obtained: new Date().toISOString(),
        used: false
      });
      user.characterSelectors = legendarySelectors;
      reward.selector = { rarity: 'legendary', bannerId };
      break;
    }

    case 'banner_pity_reset': {
      // Reset banner pity to 50% of max
      if (bannerId) {
        const bannerPities = user.bannerPity || {};
        const currentPity = bannerPities[bannerId] || {
          pullsSinceFeatured: 0,
          guaranteedFeatured: false,
          totalBannerPulls: 0
        };

        // Reset pity counter to 50% of the way to guaranteed (45 out of 90)
        const halfPity = 45;
        currentPity.pullsSinceFeatured = halfPity;

        bannerPities[bannerId] = currentPity;
        user.bannerPity = bannerPities;

        reward.pityReset = {
          bannerId,
          newPityValue: halfPity,
          message: 'Pity reset to 50% (45/90 pulls)'
        };
      } else {
        // Also reset standard pity if no banner specified
        const gachaPity = user.gachaPity || {
          pullsSinceRare: 0,
          pullsSinceEpic: 0,
          pullsSinceLegendary: 0,
          totalPulls: 0
        };

        // Set legendary pity to 50% (45 out of 90)
        gachaPity.pullsSinceLegendary = 45;
        gachaPity.pullsSinceEpic = 25; // 50% of 50

        user.gachaPity = gachaPity;

        reward.pityReset = {
          standardPity: true,
          newLegendaryPity: 45,
          newEpicPity: 25,
          message: 'Standard pity reset to 50%'
        };
      }
      break;
    }

    default:
      reward.error = 'Unknown reward type';
  }

  return reward;
}

/**
 * Get available exchange options with affordability
 * @param {Object} user - User object
 * @returns {Array} - Available exchange options
 */
function getExchangeOptions(user) {
  const totalPoints = getTotalFatePoints(user);
  const options = GACHA_FATE_POINTS.exchangeOptions || {};

  return Object.values(options).map(opt => ({
    ...opt,
    affordable: totalPoints >= opt.cost
  }));
}

// ===========================================
// ALTERNATIVE PATHS
// ===========================================

/**
 * Check if a legendary fish catch should unlock a character
 * @param {Object} fish - Caught fish
 * @param {Object} user - User object
 * @returns {Object|null} - Character unlock or null
 */
function checkFishingPathUnlock(fish, _user) {
  if (!GACHA_ALTERNATIVE_PATHS.fishingPath.enabled) {
    return null;
  }

  if (fish.rarity !== 'legendary') {
    return null;
  }

  if (!GACHA_ALTERNATIVE_PATHS.fishingPath.eligibleFish.includes(fish.id)) {
    return null;
  }

  const roll = Math.random();
  if (roll > GACHA_ALTERNATIVE_PATHS.fishingPath.catchToCharacterChance) {
    return null;
  }

  // This fish unlocks a character!
  // In a real implementation, this would select from available characters
  return {
    triggered: true,
    fish: fish,
    message: `The ${fish.name} reveals itself as a spirit! A new character joins you!`,
    // Character selection would be handled by caller
    characterType: 'water', // Or match fish element
    minRarity: 'rare'
  };
}

/**
 * Check if user qualifies for wandering warrior visit
 * @param {Object} user - User object
 * @returns {Object|null} - Wandering warrior info or null
 */
function checkWanderingWarrior(user) {
  if (!GACHA_ALTERNATIVE_PATHS.dojoPath.enabled) {
    return null;
  }

  const lastVisit = user.lastWanderingWarrior;
  const daysSinceVisit = lastVisit
    ? (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    : GACHA_ALTERNATIVE_PATHS.dojoPath.wanderingWarriorDays + 1;

  if (daysSinceVisit < GACHA_ALTERNATIVE_PATHS.dojoPath.wanderingWarriorDays) {
    return {
      available: false,
      daysUntilNext: Math.ceil(GACHA_ALTERNATIVE_PATHS.dojoPath.wanderingWarriorDays - daysSinceVisit)
    };
  }

  // Wandering warrior is available!
  return {
    available: true,
    choicesOffered: GACHA_ALTERNATIVE_PATHS.dojoPath.choicesOffered,
    recruitCost: GACHA_ALTERNATIVE_PATHS.dojoPath.recruitCostMultiplier,
    message: 'A wandering warrior has arrived at your dojo!'
  };
}

/**
 * Recruit a wandering warrior
 * @param {Object} user - User object
 * @param {string} characterId - Character to recruit
 * @returns {Object} - Recruitment result
 */
function recruitWanderingWarrior(user, characterId) {
  const cost = GACHA_ALTERNATIVE_PATHS.dojoPath.recruitCostMultiplier;

  if ((user.points || 0) < cost) {
    return {
      success: false,
      error: `Need ${cost} points to recruit (have ${user.points})`
    };
  }

  user.points -= cost;
  user.lastWanderingWarrior = new Date().toISOString();

  return {
    success: true,
    characterId,
    cost,
    message: 'The wandering warrior joins your dojo!'
  };
}

// ===========================================
// PULL RESULT ENHANCEMENT
// ===========================================

/**
 * Enhance a pull result with all additional information
 * @param {Object} pullResult - Basic pull result
 * @param {Object} user - User object
 * @param {Object} banner - Banner (optional)
 * @returns {Object} - Enhanced pull result
 */
function enhancePullResult(pullResult, user, banner = null) {
  return {
    ...pullResult,

    // Pity state after this pull
    pityState: getPityState(user, banner),

    // Milestone progress
    milestones: getMilestoneStatus(user, banner?.id || 'standard'),

    // Fate points (if banner pull)
    fatePoints: banner ? getFatePointsStatus(user, banner.id) : null,

    // Visual suggestions based on rarity
    visualConfig: {
      ...require('./fishingEnhancedService').getVisualConfig(pullResult.character?.rarity || 'common'),
      isNewCharacter: pullResult.isNew || false,
      isDuplicate: pullResult.isDuplicate || false
    }
  };
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  // Pity System
  getPityState,
  updatePityCounters,

  // Milestones
  getMilestoneStatus,
  claimMilestoneReward,
  applyMilestoneReward,
  recordPull,

  // Fate Points
  getFatePointsStatus,
  awardFatePoints,
  exchangeFatePoints,
  getTotalFatePoints,
  getWeeklyFatePoints,
  getExchangeOptions,

  // Alternative Paths
  checkFishingPathUnlock,
  checkWanderingWarrior,
  recruitWanderingWarrior,

  // Enhancement
  enhancePullResult
};
