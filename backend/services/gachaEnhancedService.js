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

  if (reward.type === 'bait') {
    const inventory = user.baitInventory || {};
    inventory[reward.id] = (inventory[reward.id] || 0) + reward.quantity;
    user.baitInventory = inventory;
    applied.bait = { id: reward.id, quantity: reward.quantity };
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
 * Get fate points status for a user
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID
 * @returns {Object} - Fate points status
 */
function getFatePointsStatus(user, bannerId) {
  if (!GACHA_FATE_POINTS.enabled) {
    return { enabled: false };
  }

  const fatePoints = user.fatePoints || {};
  const bannerFate = fatePoints[bannerId] || { points: 0, lastUpdate: null };

  const pointsNeeded = GACHA_FATE_POINTS.rateUpBanner.pointsForGuaranteed;
  const canGuarantee = bannerFate.points >= pointsNeeded;

  return {
    enabled: true,
    points: bannerFate.points,
    pointsNeeded: pointsNeeded,
    canGuarantee,
    progress: Math.min(100, (bannerFate.points / pointsNeeded) * 100),
    message: canGuarantee
      ? 'You can exchange Fate Points for the featured character!'
      : `${pointsNeeded - bannerFate.points} more Fate Points needed`
  };
}

/**
 * Award fate points after a pull
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID
 * @param {string} pullType - 'standard', 'banner', 'premium'
 * @param {boolean} gotNonFeaturedFiveStar - Whether user got non-featured 5*
 * @returns {Object} - Fate points awarded
 */
function awardFatePoints(user, bannerId, pullType, gotNonFeaturedFiveStar = false) {
  if (!GACHA_FATE_POINTS.enabled) {
    return { awarded: 0 };
  }

  const fatePoints = user.fatePoints || {};
  const bannerFate = fatePoints[bannerId] || { points: 0, lastUpdate: null };

  let pointsToAdd = GACHA_FATE_POINTS.pointsPerPull[pullType] || 1;

  // Bonus for non-featured 5-star
  if (gotNonFeaturedFiveStar) {
    pointsToAdd += GACHA_FATE_POINTS.rateUpBanner.nonFeaturedFiveStarPoints;
  }

  bannerFate.points += pointsToAdd;
  bannerFate.lastUpdate = new Date().toISOString();

  fatePoints[bannerId] = bannerFate;
  user.fatePoints = fatePoints;

  return {
    awarded: pointsToAdd,
    total: bannerFate.points,
    message: `+${pointsToAdd} Fate Points`
  };
}

/**
 * Exchange fate points for guaranteed featured character
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID
 * @returns {Object} - Exchange result
 */
function exchangeFatePoints(user, bannerId) {
  if (!GACHA_FATE_POINTS.enabled) {
    return { success: false, error: 'Fate points not enabled' };
  }

  const fatePoints = user.fatePoints || {};
  const bannerFate = fatePoints[bannerId] || { points: 0 };

  const pointsNeeded = GACHA_FATE_POINTS.rateUpBanner.pointsForGuaranteed;
  if (bannerFate.points < pointsNeeded) {
    return {
      success: false,
      error: `Need ${pointsNeeded} Fate Points (have ${bannerFate.points})`
    };
  }

  // Deduct points
  bannerFate.points -= pointsNeeded;
  fatePoints[bannerId] = bannerFate;
  user.fatePoints = fatePoints;

  return {
    success: true,
    pointsSpent: pointsNeeded,
    remainingPoints: bannerFate.points,
    message: 'Fate Points exchanged! You will receive the featured character.'
  };
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

  // Alternative Paths
  checkFishingPathUnlock,
  checkWanderingWarrior,
  recruitWanderingWarrior,

  // Enhancement
  enhancePullResult
};
