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
  GACHA_PITY_CONFIG,
  GACHA_MILESTONE_REWARDS,
  GACHA_FATE_POINTS,
  GACHA_ALTERNATIVE_PATHS
} = require('../config/gameDesign');

// ===========================================
// DEFENSIVE VALIDATION HELPERS
// ===========================================

/**
 * Validate and sanitize fate points value
 * Ensures FP values are always non-negative integers
 * @param {number} value - Value to validate
 * @returns {number} - Validated value (0 if invalid)
 */
function validateFatePointsValue(value) {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

/**
 * Validate user's fate points data structure
 * Repairs any corrupted data and returns sanitized object
 * @param {Object} user - User object
 * @returns {Object} - Validated fatePoints object
 */
function validateFatePointsData(user) {
  if (!user.fatePoints || typeof user.fatePoints !== 'object') {
    user.fatePoints = {};
  }

  // Validate each banner's fate points
  for (const bannerId of Object.keys(user.fatePoints)) {
    const bannerData = user.fatePoints[bannerId];
    if (!bannerData || typeof bannerData !== 'object') {
      user.fatePoints[bannerId] = { points: 0, lastUpdate: null };
    } else {
      bannerData.points = validateFatePointsValue(bannerData.points);
    }
  }

  return user.fatePoints;
}

/**
 * Validate weekly fate points data
 * @param {Object} user - User object
 * @returns {Object} - Validated fatePointsWeekly object
 */
function validateWeeklyFatePointsData(user) {
  if (!user.fatePointsWeekly || typeof user.fatePointsWeekly !== 'object') {
    user.fatePointsWeekly = { weekStart: null, pointsEarned: 0 };
  } else {
    user.fatePointsWeekly.pointsEarned = validateFatePointsValue(
      user.fatePointsWeekly.pointsEarned
    );
  }
  return user.fatePointsWeekly;
}

// ===========================================
// PITY VISIBILITY SYSTEM
// ===========================================

/**
 * Calculate soft pity boost information for a given rarity
 * @param {number} currentPulls - Current pulls since last hit
 * @param {Object} rarityConfig - Config for this rarity tier
 * @returns {Object} - Soft pity details including boost percentage
 */
function calculateSoftPityBoost(currentPulls, rarityConfig) {
  const { softPity, softPityBoostPerPull } = rarityConfig;
  const isActive = currentPulls >= softPity;

  if (!isActive) {
    return {
      active: false,
      pullsInSoftPity: 0,
      currentBoost: 0,
      boostPerPull: softPityBoostPerPull || 0,
      softPityThreshold: softPity,
      description: `Soft pity activates at ${softPity} pulls`
    };
  }

  const pullsInSoftPity = currentPulls - softPity;
  const currentBoost = pullsInSoftPity * (softPityBoostPerPull || 0.06);
  const boostPercent = Math.round(currentBoost * 100);
  const perPullPercent = Math.round((softPityBoostPerPull || 0.06) * 100);

  return {
    active: true,
    pullsInSoftPity,
    currentBoost,
    boostPerPull: softPityBoostPerPull || 0.06,
    softPityThreshold: softPity,
    description: `Soft Pity Active: +${boostPercent}% boost (+${perPullPercent}% per pull above ${softPity})`
  };
}

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

  // Get pity thresholds from config
  const pityConfig = GACHA_PITY_CONFIG.standard;
  const rareMax = pityConfig.rare.hardPity;
  const epicMax = pityConfig.epic.hardPity;
  const legendaryMax = pityConfig.legendary.hardPity;

  // Calculate progress percentages
  const rareProgress = Math.min(100, (standardPity.pullsSinceRare / rareMax) * 100);
  const epicProgress = Math.min(100, (standardPity.pullsSinceEpic / epicMax) * 100);
  const legendaryProgress = Math.min(100, (standardPity.pullsSinceLegendary / legendaryMax) * 100);

  // Calculate detailed soft pity information with boost percentages
  const legendarySoftPity = calculateSoftPityBoost(standardPity.pullsSinceLegendary, pityConfig.legendary);
  const epicSoftPity = calculateSoftPityBoost(standardPity.pullsSinceEpic, pityConfig.epic);
  const rareSoftPity = calculateSoftPityBoost(standardPity.pullsSinceRare, pityConfig.rare);

  // Get 50/50 configuration
  const fiftyFiftyConfig = GACHA_PITY_CONFIG.banner?.fiftyFifty || {
    featuredChance: 0.5,
    guaranteedAfterLoss: true
  };

  // Build banner pity message with 50/50 terminology
  let bannerMessage = null;
  let bannerFiftyFiftyStatus = null;
  if (bannerPity) {
    if (bannerPity.guaranteedFeatured) {
      bannerMessage = 'Next 5-star is GUARANTEED to be the featured character!';
      bannerFiftyFiftyStatus = 'guaranteed';
    } else {
      const chancePercent = Math.round(fiftyFiftyConfig.featuredChance * 100);
      bannerMessage = `Next 5-star has ${chancePercent}/${100 - chancePercent} chance to be featured (guaranteed after loss)`;
      bannerFiftyFiftyStatus = 'fifty_fifty';
    }
  }

  return {
    standard: {
      pullsSinceRare: standardPity.pullsSinceRare,
      pullsSinceEpic: standardPity.pullsSinceEpic,
      pullsSinceLegendary: standardPity.pullsSinceLegendary,
      totalPulls: standardPity.totalPulls,
      progress: {
        rare: { current: standardPity.pullsSinceRare, max: rareMax, percent: rareProgress },
        epic: { current: standardPity.pullsSinceEpic, max: epicMax, percent: epicProgress },
        legendary: { current: standardPity.pullsSinceLegendary, max: legendaryMax, percent: legendaryProgress }
      },
      softPity: {
        legendary: legendarySoftPity,
        epic: epicSoftPity,
        rare: rareSoftPity
      },
      // Estimated pulls until guaranteed
      untilGuaranteed: {
        rare: Math.max(0, rareMax - standardPity.pullsSinceRare),
        epic: Math.max(0, epicMax - standardPity.pullsSinceEpic),
        legendary: Math.max(0, legendaryMax - standardPity.pullsSinceLegendary)
      }
    },
    banner: bannerPity ? {
      pullsSinceFeatured: bannerPity.pullsSinceFeatured,
      guaranteedFeatured: bannerPity.guaranteedFeatured,
      totalBannerPulls: bannerPity.totalBannerPulls,
      fiftyFiftyStatus: bannerFiftyFiftyStatus,
      fiftyFiftyChance: fiftyFiftyConfig.featuredChance,
      message: bannerMessage
    } : null,
    // Configuration for frontend to use
    config: {
      standard: {
        rare: { hardPity: rareMax, softPity: pityConfig.rare.softPity, boostPerPull: pityConfig.rare.softPityBoostPerPull },
        epic: { hardPity: epicMax, softPity: pityConfig.epic.softPity, boostPerPull: pityConfig.epic.softPityBoostPerPull },
        legendary: { hardPity: legendaryMax, softPity: pityConfig.legendary.softPity, boostPerPull: pityConfig.legendary.softPityBoostPerPull }
      },
      banner: GACHA_PITY_CONFIG.banner
    }
  };
}

/**
 * Update pity counters after a pull
 * @param {Object} user - User object
 * @param {string} rarity - Pulled character's rarity
 * @param {Object} banner - Banner pulled from (optional)
 * @param {boolean} isFeatured - Whether pulled character was featured
 * @returns {Object} - Updated pity state with reset notifications
 */
function updatePityCounters(user, rarity, banner = null, isFeatured = false) {
  const pity = user.gachaPity || {
    pullsSinceRare: 0,
    pullsSinceEpic: 0,
    pullsSinceLegendary: 0,
    totalPulls: 0
  };

  // Capture previous values for cascading reset notification
  const previousState = {
    pullsSinceRare: pity.pullsSinceRare,
    pullsSinceEpic: pity.pullsSinceEpic,
    pullsSinceLegendary: pity.pullsSinceLegendary
  };

  pity.totalPulls += 1;

  // Track which counters were reset for notification
  const resetNotifications = [];

  // Update counters based on rarity pulled
  if (rarity === 'legendary') {
    // Cascading reset - legendary resets all lower tiers
    if (previousState.pullsSinceEpic > 0) {
      resetNotifications.push({
        tier: 'epic',
        previousValue: previousState.pullsSinceEpic,
        message: `Epic pity reset (was ${previousState.pullsSinceEpic}/${GACHA_PITY_CONFIG.standard.epic.hardPity})`
      });
    }
    if (previousState.pullsSinceRare > 0) {
      resetNotifications.push({
        tier: 'rare',
        previousValue: previousState.pullsSinceRare,
        message: `Rare pity reset (was ${previousState.pullsSinceRare}/${GACHA_PITY_CONFIG.standard.rare.hardPity})`
      });
    }
    pity.pullsSinceLegendary = 0;
    pity.pullsSinceEpic = 0;
    pity.pullsSinceRare = 0;
  } else if (rarity === 'epic') {
    // Epic resets rare counter
    if (previousState.pullsSinceRare > 0) {
      resetNotifications.push({
        tier: 'rare',
        previousValue: previousState.pullsSinceRare,
        message: `Rare pity reset (was ${previousState.pullsSinceRare}/${GACHA_PITY_CONFIG.standard.rare.hardPity})`
      });
    }
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
  let fiftyFiftyResult = null;
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
        fiftyFiftyResult = bannerPity.guaranteedFeatured ? 'guaranteed_win' : 'fifty_fifty_win';
        bannerPity.guaranteedFeatured = false;
      } else {
        // Lost 50/50 - next is guaranteed
        bannerPity.pullsSinceFeatured += 1;
        fiftyFiftyResult = 'fifty_fifty_loss';
        bannerPity.guaranteedFeatured = true;
      }
    } else {
      bannerPity.pullsSinceFeatured += 1;
    }

    bannerPities[banner.id] = bannerPity;
    user.bannerPity = bannerPities;
  }

  const pityState = getPityState(user, banner);

  // Add reset notifications and 50/50 result to response
  return {
    ...pityState,
    pullResult: {
      rarity,
      isFeatured,
      fiftyFiftyResult,
      cascadingResets: resetNotifications,
      // User-friendly summary message
      resetMessage: resetNotifications.length > 0
        ? `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} acquired! All pity counters reset.`
        : null
    }
  };
}

/**
 * Calculate carryover pity for a new banner based on previous banner
 * @param {Object} user - User object
 * @param {string} previousBannerId - ID of the previous/ended banner
 * @param {string} newBannerId - ID of the new banner
 * @returns {Object} - Carryover result
 */
function calculateBannerPityCarryover(user, previousBannerId, newBannerId) {
  const carryoverConfig = GACHA_PITY_CONFIG.bannerCarryover;

  if (!carryoverConfig?.enabled) {
    return {
      applied: false,
      reason: 'Banner pity carryover is disabled'
    };
  }

  const bannerPities = user.bannerPity || {};
  const previousPity = bannerPities[previousBannerId];

  if (!previousPity || previousPity.pullsSinceFeatured === 0) {
    return {
      applied: false,
      reason: 'No pity to carry over from previous banner'
    };
  }

  // Calculate carryover amount
  const carryoverAmount = Math.floor(previousPity.pullsSinceFeatured * carryoverConfig.carryoverPercentage);

  if (carryoverAmount === 0) {
    return {
      applied: false,
      reason: 'Carryover amount too small',
      previousPity: previousPity.pullsSinceFeatured
    };
  }

  // Initialize or update new banner pity with carryover
  const newPity = bannerPities[newBannerId] || {
    pullsSinceFeatured: 0,
    guaranteedFeatured: false,
    totalBannerPulls: 0
  };

  // Add carryover (don't reduce if already higher)
  const previousNewPity = newPity.pullsSinceFeatured;
  newPity.pullsSinceFeatured = Math.max(newPity.pullsSinceFeatured, carryoverAmount);

  // Optionally carry over guaranteed flag
  if (carryoverConfig.guaranteedFlagCarries && previousPity.guaranteedFeatured) {
    newPity.guaranteedFeatured = true;
  }

  // Mark carryover metadata
  newPity.carryoverFrom = previousBannerId;
  newPity.carryoverAmount = carryoverAmount;
  newPity.carryoverAppliedAt = new Date().toISOString();

  bannerPities[newBannerId] = newPity;
  user.bannerPity = bannerPities;

  return {
    applied: true,
    previousBannerId,
    newBannerId,
    previousPity: previousPity.pullsSinceFeatured,
    carryoverAmount,
    newPityValue: newPity.pullsSinceFeatured,
    previousNewPity,
    guaranteedCarried: carryoverConfig.guaranteedFlagCarries && previousPity.guaranteedFeatured,
    message: `${carryoverAmount} pulls of pity carried over from previous banner (${Math.round(carryoverConfig.carryoverPercentage * 100)}% of ${previousPity.pullsSinceFeatured})`
  };
}

// ===========================================
// MILESTONE REWARDS SYSTEM
// ===========================================

/**
 * Get milestone rewards status for a banner
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID (or 'standard' for standard banner)
 * @param {Object} banner - Optional banner object (to check grace period status)
 * @returns {Object} - Milestone status and available claims
 */
function getMilestoneStatus(user, bannerId = 'standard', banner = null) {
  const pullHistory = user.pullHistory || {};
  const bannerPulls = pullHistory[bannerId] || { total: 0, claimed: [] };

  // Check grace period status
  let graceStatus = null;
  if (banner && banner.endDate && GACHA_MILESTONE_REWARDS.gracePeriod?.enabled) {
    const endDate = new Date(banner.endDate);
    const now = new Date();
    const daysSinceEnd = (now - endDate) / (1000 * 60 * 60 * 24);

    if (daysSinceEnd > 0) {
      const graceDays = GACHA_MILESTONE_REWARDS.gracePeriod.daysAfterEnd;
      const daysRemaining = Math.max(0, graceDays - daysSinceEnd);
      graceStatus = {
        bannerEnded: true,
        inGracePeriod: daysRemaining > 0,
        gracePeriodExpired: daysRemaining <= 0,
        daysRemaining: Math.ceil(daysRemaining),
        expiresAt: new Date(endDate.getTime() + (graceDays * 24 * 60 * 60 * 1000)).toISOString(),
        message: daysRemaining > 0
          ? `Banner ended! You have ${Math.ceil(daysRemaining)} day(s) to claim unclaimed milestones.`
          : 'Grace period expired. Unclaimed milestones are no longer available.'
      };
    }
  }

  const milestones = GACHA_MILESTONE_REWARDS.milestones.map(milestone => {
    const hasEnoughPulls = bannerPulls.total >= milestone.pulls;
    const alreadyClaimed = bannerPulls.claimed.includes(milestone.pulls);

    // Can only claim if: enough pulls, not claimed, and (no grace status OR still in grace period)
    const canClaim = hasEnoughPulls &&
      !alreadyClaimed &&
      (!graceStatus || graceStatus.inGracePeriod);

    return {
      pulls: milestone.pulls,
      reward: milestone.reward,
      claimed: alreadyClaimed,
      canClaim,
      progress: Math.min(100, (bannerPulls.total / milestone.pulls) * 100),
      remaining: Math.max(0, milestone.pulls - bannerPulls.total),
      // Mark as expired if grace period ended and not claimed
      expired: graceStatus?.gracePeriodExpired && hasEnoughPulls && !alreadyClaimed
    };
  });

  // Find next unclaimed milestone
  const nextMilestone = milestones.find(m => !m.claimed && !m.expired);

  return {
    totalPulls: bannerPulls.total,
    milestones,
    nextMilestone,
    claimable: milestones.filter(m => m.canClaim),
    graceStatus
  };
}

/**
 * Claim a milestone reward
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID
 * @param {number} milestonePulls - Milestone pull count to claim
 * @param {Object} banner - Optional banner object (to check grace period)
 * @returns {Object} - Claim result
 */
function claimMilestoneReward(user, bannerId, milestonePulls, banner = null) {
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

  // Check grace period if banner has ended
  if (banner && banner.endDate && GACHA_MILESTONE_REWARDS.gracePeriod?.enabled) {
    const endDate = new Date(banner.endDate);
    const now = new Date();
    const daysSinceEnd = (now - endDate) / (1000 * 60 * 60 * 24);

    if (daysSinceEnd > 0) {
      const graceDays = GACHA_MILESTONE_REWARDS.gracePeriod.daysAfterEnd;
      if (daysSinceEnd > graceDays) {
        return {
          success: false,
          error: 'Grace period expired',
          code: 'GRACE_PERIOD_EXPIRED',
          details: {
            bannerEndedAt: endDate.toISOString(),
            gracePeriodDays: graceDays,
            expiredDaysAgo: Math.floor(daysSinceEnd - graceDays)
          }
        };
      }
    }
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
function getWeeklyFatePoints(user, persistReset = false) {
  const weeklyMax = GACHA_FATE_POINTS.weeklyMax || 500;
  const currentWeekStart = getWeekStart().toISOString();

  // Validate weekly data structure
  const weeklyData = validateWeeklyFatePointsData(user);

  // Check if we're in a new week
  if (weeklyData.weekStart !== currentWeekStart) {
    // New week - reset tracking
    // If persistReset is true, save the reset to user object
    if (persistReset) {
      user.fatePointsWeekly = {
        weekStart: currentWeekStart,
        pointsEarned: 0
      };
    }
    return {
      pointsThisWeek: 0,
      weeklyMax,
      weekStart: currentWeekStart,
      isNewWeek: true
    };
  }

  return {
    pointsThisWeek: validateFatePointsValue(weeklyData.pointsEarned),
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
  // Validate and repair FP data structure
  const fatePoints = validateFatePointsData(user);
  let total = 0;
  for (const bannerId of Object.keys(fatePoints)) {
    total += fatePoints[bannerId]?.points || 0;
  }
  return validateFatePointsValue(total);
}

/**
 * Get fate points status for a user
 * Returns global fate points pool with weekly tracking
 *
 * Note: Fate Points are a GLOBAL pool shared across all banners.
 * The bannerId parameter is kept for API consistency but the returned
 * data represents the user's total fate points across all banners.
 *
 * @param {Object} user - User object
 * @param {string} [bannerId] - Banner ID (unused - FP are global, kept for API compatibility)
 * @returns {Object} - Fate points status
 */
function getFatePointsStatus(user, bannerId = null) {
  // bannerId is intentionally unused - fate points are global across all banners
  // Keeping parameter for API consistency with other gacha functions
  void bannerId;

  if (!GACHA_FATE_POINTS.enabled) {
    return { enabled: false };
  }

  // Get total points across all banners (global pool)
  const totalPoints = getTotalFatePoints(user);

  // Get weekly tracking - persist reset to ensure consistent data
  // This fixes the bug where weekly reset wasn't persisted until the next award
  const weekly = getWeeklyFatePoints(user, true);

  // Get exchange options from config
  const exchangeOptions = GACHA_FATE_POINTS.exchangeOptions || {};

  // Find the cheapest affordable exchange option for progress display
  const sortedOptions = Object.values(exchangeOptions).sort((a, b) => a.cost - b.cost);
  const nextAffordable = sortedOptions.find(opt => opt.cost > totalPoints) || sortedOptions[sortedOptions.length - 1];
  const nextAffordableCost = nextAffordable?.cost || 100;

  // Calculate canGuarantee based on legendary selector (highest tier)
  const legendarySelector = exchangeOptions.legendary_selector;
  const guaranteeCost = legendarySelector?.cost || 600;
  const canGuarantee = totalPoints >= guaranteeCost;
  const progress = Math.min(100, Math.round((totalPoints / guaranteeCost) * 100));

  return {
    enabled: true,
    points: totalPoints,
    pointsThisWeek: weekly.pointsThisWeek,
    weeklyMax: weekly.weeklyMax,
    weekStart: weekly.weekStart,
    // Legacy fields for backwards compatibility
    canGuarantee,
    progress,
    guaranteeCost,
    exchangeOptions: Object.values(exchangeOptions).map(opt => ({
      id: opt.id,
      name: opt.name,
      description: opt.description,
      cost: opt.cost,
      affordable: totalPoints >= opt.cost
    })),
    // Progress toward next affordable exchange
    nextExchange: {
      id: nextAffordable?.id,
      name: nextAffordable?.name,
      cost: nextAffordableCost,
      progress: Math.min(100, (totalPoints / nextAffordableCost) * 100)
    }
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

  // Record transaction history (after updating points)
  if (actualPoints > 0) {
    recordFatePointsTransaction(user, 'earned', actualPoints, {
      source: 'gacha_pull',
      pullType,
      pullCount,
      bannerId,
      gotNonFeaturedFiveStar,
      wasCapped
    });
  }

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
 * Check if pity boost would be effective (pre-purchase validation)
 * @param {Object} user - User object
 * @param {string} bannerId - Banner ID (optional, for banner-specific boost)
 * @returns {Object} - { wouldBeEffective, currentProgress, boostTarget, message }
 */
function checkPityBoostEffectiveness(user, bannerId = null) {
  const boostPercentage = GACHA_PITY_CONFIG.pityReset.percentage;

  if (bannerId) {
    const bannerHardPity = GACHA_PITY_CONFIG.banner.featured.hardPity;
    const bannerPities = user.bannerPity || {};
    const currentPity = bannerPities[bannerId] || { pullsSinceFeatured: 0 };
    const boostValue = Math.floor(bannerHardPity * boostPercentage);
    const currentProgress = (currentPity.pullsSinceFeatured / bannerHardPity) * 100;

    return {
      wouldBeEffective: currentPity.pullsSinceFeatured < boostValue,
      currentProgress: Math.round(currentProgress),
      boostTarget: Math.round(boostPercentage * 100),
      currentPulls: currentPity.pullsSinceFeatured,
      boostValue,
      maxPity: bannerHardPity,
      message: currentPity.pullsSinceFeatured >= boostValue
        ? `Your pity is already at ${currentPity.pullsSinceFeatured}/${bannerHardPity} (${Math.round(currentProgress)}%). Boost would have no effect.`
        : `Boost will advance pity from ${currentPity.pullsSinceFeatured} to ${boostValue} pulls.`
    };
  } else {
    const standardPityConfig = GACHA_PITY_CONFIG.standard;
    const gachaPity = user.gachaPity || { pullsSinceLegendary: 0, pullsSinceEpic: 0 };
    const legendaryBoost = Math.floor(standardPityConfig.legendary.hardPity * boostPercentage);
    const epicBoost = Math.floor(standardPityConfig.epic.hardPity * boostPercentage);

    const legendaryWouldBoost = gachaPity.pullsSinceLegendary < legendaryBoost;
    const epicWouldBoost = gachaPity.pullsSinceEpic < epicBoost;

    return {
      wouldBeEffective: legendaryWouldBoost || epicWouldBoost,
      legendary: {
        current: gachaPity.pullsSinceLegendary,
        boostValue: legendaryBoost,
        max: standardPityConfig.legendary.hardPity,
        wouldBoost: legendaryWouldBoost
      },
      epic: {
        current: gachaPity.pullsSinceEpic,
        boostValue: epicBoost,
        max: standardPityConfig.epic.hardPity,
        wouldBoost: epicWouldBoost
      },
      boostTarget: Math.round(boostPercentage * 100),
      message: !legendaryWouldBoost && !epicWouldBoost
        ? `Your pity is already at or above ${Math.round(boostPercentage * 100)}%. Boost would have no effect.`
        : `Boost will advance pity to ${Math.round(boostPercentage * 100)}% of guaranteed.`
    };
  }
}

/**
 * Exchange fate points for a reward
 * @param {Object} user - User object
 * @param {string} exchangeType - Type of exchange (rare_selector, epic_selector, legendary_selector, banner_pity_reset)
 * @param {string} bannerId - Banner ID (required for pity reset)
 * @param {Object} options - Additional options
 * @param {boolean} options.force - Force exchange even if ineffective (for pity_boost)
 * @returns {Object} - Exchange result
 */
function exchangeFatePoints(user, exchangeType, bannerId = null, options = {}) {
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

  // Pre-validation for pity boost - check if it would be effective
  if ((exchangeType === 'pity_boost' || exchangeType === 'banner_pity_reset') && !options.force) {
    const effectiveness = checkPityBoostEffectiveness(user, bannerId);
    if (!effectiveness.wouldBeEffective) {
      return {
        success: false,
        error: effectiveness.message,
        code: 'PITY_BOOST_INEFFECTIVE',
        effectiveness,
        hint: 'Set force=true to proceed anyway, or save your Fate Points for other rewards.'
      };
    }
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

  // Record transaction history
  recordFatePointsTransaction(user, 'spent', cost, {
    source: 'exchange',
    exchangeType,
    bannerId,
    rewardType: reward.type,
    itemName: option.name
  });

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
    case 'roll_tickets': {
      // Add 6 roll tickets to user's inventory
      const ticketAmount = 6;
      user.rollTickets = (user.rollTickets || 0) + ticketAmount;
      reward.tickets = { type: 'roll', amount: ticketAmount };
      break;
    }

    case 'premium_tickets': {
      // Add 2 premium tickets to user's inventory
      const ticketAmount = 2;
      user.premiumTickets = (user.premiumTickets || 0) + ticketAmount;
      reward.tickets = { type: 'premium', amount: ticketAmount };
      break;
    }

    case 'xp_boost': {
      // Add 500 account XP instantly
      const xpAmount = 500;
      user.accountXP = (user.accountXP || 0) + xpAmount;
      reward.xp = { amount: xpAmount };
      break;
    }

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

    case 'pity_boost':
    case 'banner_pity_reset': {  // Legacy support for old exchange type
      // Boost pity progress to configured percentage of max (advances progress, doesn't reset it)
      const boostPercentage = GACHA_PITY_CONFIG.pityReset.percentage;
      const bannerHardPity = GACHA_PITY_CONFIG.banner.featured.hardPity;
      const standardPityConfig = GACHA_PITY_CONFIG.standard;

      if (bannerId) {
        const bannerPities = user.bannerPity || {};
        const currentPity = bannerPities[bannerId] || {
          pullsSinceFeatured: 0,
          guaranteedFeatured: false,
          totalBannerPulls: 0
        };

        // Boost pity counter to configured percentage (only if current is lower)
        const boostValue = Math.floor(bannerHardPity * boostPercentage);
        const previousValue = currentPity.pullsSinceFeatured;
        const newValue = Math.max(previousValue, boostValue);
        currentPity.pullsSinceFeatured = newValue;

        bannerPities[bannerId] = currentPity;
        user.bannerPity = bannerPities;

        reward.pityBoost = {
          bannerId,
          previousValue,
          newPityValue: newValue,
          wasEffective: newValue > previousValue,
          message: newValue > previousValue
            ? `Pity boosted to ${Math.round(boostPercentage * 100)}% (${newValue}/${bannerHardPity} pulls)`
            : `Pity already at ${previousValue}/${bannerHardPity} - no change needed`
        };
      } else {
        // Boost standard pity if no banner specified
        const gachaPity = user.gachaPity || {
          pullsSinceRare: 0,
          pullsSinceEpic: 0,
          pullsSinceLegendary: 0,
          totalPulls: 0
        };

        // Boost legendary and epic pity to configured percentage (only if current is lower)
        const legendaryBoost = Math.floor(standardPityConfig.legendary.hardPity * boostPercentage);
        const epicBoost = Math.floor(standardPityConfig.epic.hardPity * boostPercentage);

        const prevLegendary = gachaPity.pullsSinceLegendary;
        const prevEpic = gachaPity.pullsSinceEpic;

        gachaPity.pullsSinceLegendary = Math.max(prevLegendary, legendaryBoost);
        gachaPity.pullsSinceEpic = Math.max(prevEpic, epicBoost);

        user.gachaPity = gachaPity;

        const wasEffective = gachaPity.pullsSinceLegendary > prevLegendary ||
                            gachaPity.pullsSinceEpic > prevEpic;

        reward.pityBoost = {
          standardPity: true,
          previousLegendary: prevLegendary,
          previousEpic: prevEpic,
          newLegendaryPity: gachaPity.pullsSinceLegendary,
          newEpicPity: gachaPity.pullsSinceEpic,
          wasEffective,
          message: wasEffective
            ? `Standard pity boosted to ${Math.round(boostPercentage * 100)}%`
            : `Pity already at or above ${Math.round(boostPercentage * 100)}% - no change needed`
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
// FATE POINTS TRANSACTION HISTORY
// ===========================================

const FP_HISTORY_MAX_ENTRIES = 50;

/**
 * Record a fate points transaction
 * @param {Object} user - User object
 * @param {string} type - 'earned' or 'spent'
 * @param {number} amount - Points amount (positive for earned, positive for spent)
 * @param {Object} details - Additional details about the transaction
 */
function recordFatePointsTransaction(user, type, amount, details = {}) {
  const history = user.fatePointsHistory || [];

  const transaction = {
    id: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount: type === 'spent' ? -Math.abs(amount) : Math.abs(amount),
    balance: getTotalFatePoints(user),
    timestamp: new Date().toISOString(),
    ...details
  };

  // Add to beginning and limit size
  history.unshift(transaction);
  if (history.length > FP_HISTORY_MAX_ENTRIES) {
    history.length = FP_HISTORY_MAX_ENTRIES;
  }

  user.fatePointsHistory = history;
  return transaction;
}

/**
 * Get fate points transaction history
 * @param {Object} user - User object
 * @param {Object} options - Filter options
 * @param {number} options.limit - Max entries to return
 * @param {string} options.type - Filter by type ('earned' or 'spent')
 * @returns {Array} - Transaction history
 */
function getFatePointsHistory(user, options = {}) {
  const history = user.fatePointsHistory || [];
  let filtered = [...history];

  if (options.type) {
    filtered = filtered.filter(t => t.type === options.type);
  }

  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get weekly FP cap warning for upcoming pulls
 * Call this BEFORE a purchase to warn players they're near the cap
 *
 * @param {Object} user - User object
 * @param {number} plannedPulls - Number of pulls player is about to do
 * @param {string} pullType - 'standard', 'banner', or 'premium'
 * @returns {Object} - { atCap, nearCap, wouldEarn, actualEarn, wasted, message }
 */
function getWeeklyCapWarning(user, plannedPulls = 1, pullType = 'banner') {
  if (!GACHA_FATE_POINTS.weeklyCapEnabled) {
    return { atCap: false, nearCap: false, message: null };
  }

  const weekly = getWeeklyFatePoints(user);
  const pointsPerPull = GACHA_FATE_POINTS.pointsPerPull[pullType] || 1;
  const wouldEarn = plannedPulls * pointsPerPull;
  const remainingCap = Math.max(0, weekly.weeklyMax - weekly.pointsThisWeek);
  const actualEarn = Math.min(wouldEarn, remainingCap);
  const wasted = wouldEarn - actualEarn;

  const atCap = remainingCap === 0;
  const nearCap = !atCap && wasted > 0;
  const willReachCap = !atCap && (weekly.pointsThisWeek + wouldEarn) >= weekly.weeklyMax;

  let message = null;
  if (atCap) {
    message = `Weekly Fate Points cap reached (${weekly.weeklyMax}/${weekly.weeklyMax}). Pulls will not earn additional FP until next week.`;
  } else if (wasted > 0) {
    message = `Near weekly cap: This ${plannedPulls}-pull will only earn ${actualEarn} FP (${wasted} would exceed cap).`;
  } else if (willReachCap) {
    message = `This pull will reach the weekly FP cap (${weekly.pointsThisWeek + wouldEarn}/${weekly.weeklyMax}).`;
  }

  return {
    atCap,
    nearCap,
    willReachCap,
    currentWeeklyProgress: weekly.pointsThisWeek,
    weeklyMax: weekly.weeklyMax,
    remainingCap,
    wouldEarn,
    actualEarn,
    wasted,
    message
  };
}

/**
 * Award fate points for a gacha roll (centralized helper)
 *
 * This is the SINGLE entry point for awarding fate points from rolls.
 * It handles both standard and banner rolls, single and multi-pulls,
 * and correctly calculates bonuses for legendary pulls.
 *
 * @param {Object} user - User object (will be mutated)
 * @param {Object} options - Roll options
 * @param {string} options.bannerId - Banner ID ('standard' for standard banner)
 * @param {string} options.pullType - 'standard', 'banner', or 'premium'
 * @param {Array} options.results - Array of roll results [{actualRarity, isFeatured?, ...}]
 * @param {number} [options.pullCount] - Override pull count (defaults to results.length)
 * @returns {Object} - Fate points award result
 */
function awardFatePointsForRoll(user, options) {
  const { bannerId, pullType, results, pullCount } = options;
  const count = pullCount ?? results.length;

  // Determine if any legendary was non-featured
  // For standard banner, all legendaries are considered "non-featured" for bonus
  // For other banners, only legendaries that aren't featured get the bonus
  const isStandardBanner = bannerId === 'standard';
  const gotNonFeaturedLegendary = results.some(r => {
    if (r.actualRarity !== 'legendary') return false;
    // Standard banner: all legendaries give bonus
    if (isStandardBanner) return true;
    // Other banners: only non-featured legendaries give bonus
    return r.isFeatured === false || r.isBannerCharacter === false;
  });

  return awardFatePoints(user, bannerId, pullType, gotNonFeaturedLegendary, count);
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
// TRANSACTIONAL GACHA STATE UPDATE
// ===========================================

/**
 * Apply all gacha state updates atomically
 * This function captures state before modifications and can rollback on failure
 *
 * @param {Object} user - User object (will be modified in place)
 * @param {Object} updates - Update configuration
 * @param {Object} updates.pity - Pity update params { rarity, banner, isFeatured }
 * @param {Object} updates.milestone - Milestone params { bannerId, pullCount }
 * @param {Object} updates.fatePoints - Fate points params { bannerId, pullType, results }
 * @returns {Object} - { success, snapshot, error }
 */
function applyGachaStateUpdates(user, updates = {}) {
  // Capture snapshot of current state for rollback
  const snapshot = {
    gachaPity: JSON.parse(JSON.stringify(user.gachaPity || {})),
    bannerPity: JSON.parse(JSON.stringify(user.bannerPity || {})),
    pullHistory: JSON.parse(JSON.stringify(user.pullHistory || {})),
    fatePoints: JSON.parse(JSON.stringify(user.fatePoints || {})),
    fatePointsWeekly: JSON.parse(JSON.stringify(user.fatePointsWeekly || {})),
    fatePointsHistory: JSON.parse(JSON.stringify(user.fatePointsHistory || []))
  };

  try {
    const results = {};

    // Update pity counters
    if (updates.pity) {
      results.pity = updatePityCounters(
        user,
        updates.pity.rarity,
        updates.pity.banner,
        updates.pity.isFeatured
      );
    }

    // Record pull for milestones
    if (updates.milestone) {
      recordPull(user, updates.milestone.bannerId, updates.milestone.pullCount);
      results.milestone = getMilestoneStatus(user, updates.milestone.bannerId);
    }

    // Award fate points
    if (updates.fatePoints) {
      results.fatePoints = awardFatePointsForRoll(user, updates.fatePoints);
    }

    return {
      success: true,
      snapshot,
      results
    };
  } catch (error) {
    // Rollback on any error
    user.gachaPity = snapshot.gachaPity;
    user.bannerPity = snapshot.bannerPity;
    user.pullHistory = snapshot.pullHistory;
    user.fatePoints = snapshot.fatePoints;
    user.fatePointsWeekly = snapshot.fatePointsWeekly;
    user.fatePointsHistory = snapshot.fatePointsHistory;

    return {
      success: false,
      snapshot,
      error: error.message
    };
  }
}

/**
 * Rollback gacha state to a previous snapshot
 * @param {Object} user - User object
 * @param {Object} snapshot - State snapshot from applyGachaStateUpdates
 */
function rollbackGachaState(user, snapshot) {
  if (!snapshot) return;

  user.gachaPity = snapshot.gachaPity;
  user.bannerPity = snapshot.bannerPity;
  user.pullHistory = snapshot.pullHistory;
  user.fatePoints = snapshot.fatePoints;
  user.fatePointsWeekly = snapshot.fatePointsWeekly;
  user.fatePointsHistory = snapshot.fatePointsHistory;
}

// ===========================================
// EXCHANGE OPTION REGISTRY
// ===========================================

/**
 * Exchange Option Registry
 * Centralized registry for all exchange options with validation
 * This ensures consistency between config, backend handlers, and frontend
 */
const EXCHANGE_REGISTRY = {
  rare_selector: {
    id: 'rare_selector',
    handler: 'handleRareSelector',
    category: 'selector',
    i18nKey: 'fatePoints.exchangeOptions.rare_selector',
    icon: 'FaTicketAlt',
    validate: () => true  // Always valid
  },
  epic_selector: {
    id: 'epic_selector',
    handler: 'handleEpicSelector',
    category: 'selector',
    i18nKey: 'fatePoints.exchangeOptions.epic_selector',
    icon: 'FaHeart',
    validate: () => true
  },
  legendary_selector: {
    id: 'legendary_selector',
    handler: 'handleLegendarySelector',
    category: 'selector',
    i18nKey: 'fatePoints.exchangeOptions.legendary_selector',
    icon: 'FaCrown',
    validate: () => true
  },
  pity_boost: {
    id: 'pity_boost',
    handler: 'handlePityBoost',
    category: 'utility',
    i18nKey: 'fatePoints.exchangeOptions.pity_boost',
    icon: 'FaSync',
    validate: (user, bannerId) => checkPityBoostEffectiveness(user, bannerId).wouldBeEffective
  },
  // Legacy support
  banner_pity_reset: {
    id: 'banner_pity_reset',
    handler: 'handlePityBoost',
    category: 'utility',
    i18nKey: 'fatePoints.exchangeOptions.pity_boost',
    icon: 'FaSync',
    validate: (user, bannerId) => checkPityBoostEffectiveness(user, bannerId).wouldBeEffective,
    deprecated: true,
    replacedBy: 'pity_boost'
  }
};

/**
 * Get validated exchange options with registry metadata
 * @param {Object} user - User object (for validation)
 * @param {string} bannerId - Banner ID (for context-aware validation)
 * @returns {Array} - Exchange options with validation status
 */
function getValidatedExchangeOptions(user, bannerId = null) {
  const configOptions = GACHA_FATE_POINTS.exchangeOptions || {};
  const totalPoints = getTotalFatePoints(user);

  return Object.entries(configOptions)
    .filter(([id]) => !EXCHANGE_REGISTRY[id]?.deprecated)
    .map(([id, config]) => {
      const registry = EXCHANGE_REGISTRY[id] || {};
      const isValid = registry.validate ? registry.validate(user, bannerId) : true;

      return {
        ...config,
        id,
        affordable: totalPoints >= config.cost,
        valid: isValid,
        category: registry.category || 'unknown',
        icon: registry.icon || 'FaMagic',
        i18nKey: registry.i18nKey,
        // Include validation message for invalid options
        validationMessage: !isValid && id === 'pity_boost'
          ? checkPityBoostEffectiveness(user, bannerId).message
          : null
      };
    });
}

/**
 * Validate an exchange type exists in registry
 * @param {string} exchangeType - Exchange type ID
 * @returns {Object} - { valid, error, registry }
 */
function validateExchangeType(exchangeType) {
  const registry = EXCHANGE_REGISTRY[exchangeType];

  if (!registry) {
    return {
      valid: false,
      error: `Unknown exchange type: ${exchangeType}`,
      availableTypes: Object.keys(EXCHANGE_REGISTRY).filter(k => !EXCHANGE_REGISTRY[k].deprecated)
    };
  }

  if (registry.deprecated) {
    return {
      valid: true,
      warning: `Exchange type '${exchangeType}' is deprecated. Use '${registry.replacedBy}' instead.`,
      registry
    };
  }

  return { valid: true, registry };
}

// ===========================================
// BANNER RERUN LINKAGE
// ===========================================

/**
 * Banner rerun/linkage tracking for explicit progress carryover
 * Instead of relying on ID matching, this provides explicit linkage
 */

/**
 * Link a new banner to a previous banner for pity carryover
 * @param {Object} banner - New banner object
 * @param {Object} previousBanner - Previous banner to link from
 * @returns {Object} - Banner with linkage metadata
 */
function createBannerRerunLink(banner, previousBanner) {
  return {
    ...banner,
    rerunInfo: {
      isRerun: true,
      previousBannerId: previousBanner.id,
      previousBannerName: previousBanner.name,
      linkedAt: new Date().toISOString(),
      progressCarryover: GACHA_PITY_CONFIG.bannerCarryover?.enabled || false,
      carryoverPercentage: GACHA_PITY_CONFIG.bannerCarryover?.carryoverPercentage || 0
    }
  };
}

/**
 * Check if a banner is a rerun and get linkage info
 * @param {Object} banner - Banner to check
 * @returns {Object} - Rerun status and linkage info
 */
function getBannerRerunStatus(banner) {
  if (!banner) {
    return { isRerun: false };
  }

  // Check explicit rerun info first
  if (banner.rerunInfo) {
    return {
      isRerun: true,
      explicit: true,
      ...banner.rerunInfo
    };
  }

  // Check for implicit rerun (same featured characters, different ID)
  // This would require access to banner history - return basic status for now
  return {
    isRerun: false,
    explicit: false,
    hint: 'Use createBannerRerunLink() to explicitly link banners for pity carryover'
  };
}

/**
 * Apply pity carryover when a player first pulls on a rerun banner
 * @param {Object} user - User object
 * @param {Object} banner - Banner with rerunInfo
 * @returns {Object} - Carryover result
 */
function applyRerunPityCarryover(user, banner) {
  if (!banner?.rerunInfo?.isRerun || !banner.rerunInfo.previousBannerId) {
    return {
      applied: false,
      reason: 'Banner is not a linked rerun'
    };
  }

  // Check if carryover was already applied
  const bannerPities = user.bannerPity || {};
  const currentPity = bannerPities[banner.id];

  if (currentPity?.carryoverFrom === banner.rerunInfo.previousBannerId) {
    return {
      applied: false,
      reason: 'Carryover already applied for this banner',
      existingCarryover: currentPity.carryoverAmount
    };
  }

  // Apply carryover
  return calculateBannerPityCarryover(
    user,
    banner.rerunInfo.previousBannerId,
    banner.id
  );
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
  calculateSoftPityBoost,
  calculateBannerPityCarryover,

  // Milestones
  getMilestoneStatus,
  claimMilestoneReward,
  applyMilestoneReward,
  recordPull,

  // Fate Points
  getFatePointsStatus,
  awardFatePoints,
  awardFatePointsForRoll,
  exchangeFatePoints,
  checkPityBoostEffectiveness,
  getWeeklyCapWarning,
  getTotalFatePoints,
  getWeeklyFatePoints,
  getExchangeOptions,
  getValidatedExchangeOptions,
  recordFatePointsTransaction,
  getFatePointsHistory,

  // Exchange Registry
  EXCHANGE_REGISTRY,
  validateExchangeType,

  // Validation helpers (for external use if needed)
  validateFatePointsData,
  validateWeeklyFatePointsData,

  // Alternative Paths
  checkFishingPathUnlock,
  checkWanderingWarrior,
  recruitWanderingWarrior,

  // Banner Rerun Linkage
  createBannerRerunLink,
  getBannerRerunStatus,
  applyRerunPityCarryover,

  // Transactional helpers
  applyGachaStateUpdates,
  rollbackGachaState,

  // Enhancement
  enhancePullResult
};
