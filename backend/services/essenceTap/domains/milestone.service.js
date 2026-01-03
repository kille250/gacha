/**
 * Milestone Service
 *
 * Handles milestone checking and claiming logic for Essence Tap.
 * Includes both one-time and repeatable milestones.
 */

const {
  FATE_POINT_MILESTONES,
  REPEATABLE_MILESTONES
} = require('../../../config/essenceTap');

/**
 * Get current ISO week string (YYYY-WW)
 * @returns {string} ISO week identifier
 */
function getCurrentISOWeek() {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Check and return claimable milestones
 * @param {Object} state - Current state
 * @returns {Array} Array of claimable milestone objects
 */
function checkMilestones(state) {
  const claimable = [];

  for (const milestone of FATE_POINT_MILESTONES) {
    const milestoneKey = `fp_${milestone.lifetimeEssence}`;
    if (state.lifetimeEssence >= milestone.lifetimeEssence &&
        !state.claimedMilestones?.includes(milestoneKey)) {
      claimable.push({
        ...milestone,
        key: milestoneKey
      });
    }
  }

  return claimable;
}

/**
 * Claim a milestone
 * @param {Object} state - Current state
 * @param {string} milestoneKey - Milestone key
 * @returns {Object} Result { success, newState?, error?, fatePoints? }
 */
function claimMilestone(state, milestoneKey) {
  if (state.claimedMilestones?.includes(milestoneKey)) {
    return { success: false, error: 'Milestone already claimed' };
  }

  const milestone = FATE_POINT_MILESTONES.find(m => `fp_${m.lifetimeEssence}` === milestoneKey);
  if (!milestone) {
    return { success: false, error: 'Invalid milestone' };
  }

  if (state.lifetimeEssence < milestone.lifetimeEssence) {
    return { success: false, error: 'Milestone not reached' };
  }

  const newState = { ...state };
  newState.claimedMilestones = [...(state.claimedMilestones || []), milestoneKey];

  return {
    success: true,
    newState,
    fatePoints: milestone.fatePoints
  };
}

/**
 * Check and return claimable repeatable milestones
 * @param {Object} state - Current state
 * @returns {Array} Array of claimable repeatable milestones
 */
function checkRepeatableMilestones(state) {
  const claimable = [];
  const currentWeek = getCurrentISOWeek();

  // Check weekly essence milestone
  const weeklyMilestone = REPEATABLE_MILESTONES?.weeklyEssence;
  if (weeklyMilestone && state.weekly?.essenceEarned >= weeklyMilestone.threshold &&
      state.repeatableMilestones?.weeklyEssenceLastClaimed !== currentWeek) {
    claimable.push({
      type: 'weeklyEssence',
      fatePoints: weeklyMilestone.fatePoints,
      threshold: weeklyMilestone.threshold,
      currentProgress: state.weekly?.essenceEarned || 0
    });
  }

  // Check per-1T milestone (v3.0: renamed from essencePer100B, now uses essencePer1T)
  const per1TMilestone = REPEATABLE_MILESTONES?.essencePer1T || REPEATABLE_MILESTONES?.essencePer100B;
  if (per1TMilestone) {
    const claimedCount = state.repeatableMilestones?.per100BCount || 0;  // Keep state field for backwards compatibility
    const eligibleCount = Math.floor((state.lifetimeEssence || 0) / per1TMilestone.threshold);
    if (eligibleCount > claimedCount) {
      claimable.push({
        type: 'essencePer1T',
        fatePoints: per1TMilestone.fatePoints,
        count: eligibleCount - claimedCount,
        totalFatePoints: (eligibleCount - claimedCount) * per1TMilestone.fatePoints
      });
    }
  }

  return claimable;
}

/**
 * Claim a repeatable milestone
 * @param {Object} state - Current state
 * @param {string} milestoneType - Type of milestone to claim
 * @returns {Object} Result { success, newState?, error?, fatePoints?, count? }
 */
function claimRepeatableMilestone(state, milestoneType) {
  const currentWeek = getCurrentISOWeek();
  const newState = { ...state };
  newState.repeatableMilestones = { ...state.repeatableMilestones };

  if (milestoneType === 'weeklyEssence') {
    const weeklyMilestone = REPEATABLE_MILESTONES.weeklyEssence;
    if (state.weekly?.essenceEarned < weeklyMilestone.threshold) {
      return { success: false, error: 'Weekly essence milestone not reached' };
    }
    if (state.repeatableMilestones?.weeklyEssenceLastClaimed === currentWeek) {
      return { success: false, error: 'Already claimed this week' };
    }

    newState.repeatableMilestones.weeklyEssenceLastClaimed = currentWeek;
    return {
      success: true,
      newState,
      fatePoints: weeklyMilestone.fatePoints
    };
  }

  // v3.0: Support both old (essencePer100B) and new (essencePer1T) milestone types
  if (milestoneType === 'essencePer1T' || milestoneType === 'essencePer100B') {
    const per1TMilestone = REPEATABLE_MILESTONES?.essencePer1T || REPEATABLE_MILESTONES?.essencePer100B;
    if (!per1TMilestone) {
      return { success: false, error: 'Milestone config not found' };
    }
    const claimedCount = state.repeatableMilestones?.per100BCount || 0;
    const eligibleCount = Math.floor((state.lifetimeEssence || 0) / per1TMilestone.threshold);

    if (eligibleCount <= claimedCount) {
      return { success: false, error: 'No new 1T milestones to claim' };
    }

    const countToClaim = eligibleCount - claimedCount;
    newState.repeatableMilestones.per100BCount = eligibleCount;  // Keep field name for backwards compatibility

    return {
      success: true,
      newState,
      fatePoints: countToClaim * per1TMilestone.fatePoints,
      count: countToClaim
    };
  }

  return { success: false, error: 'Invalid milestone type' };
}

/**
 * Get milestone progress information
 * @param {Object} state - Current state
 * @returns {Object} Progress info including next milestones and claim status
 */
function getMilestoneProgress(state) {
  const currentWeek = getCurrentISOWeek();
  const lifetimeEssence = state.lifetimeEssence || 0;
  const claimedMilestones = state.claimedMilestones || [];

  // Find next one-time milestone
  let nextOnTimeMilestone = null;
  let completedOnTimeMilestones = 0;
  for (const milestone of FATE_POINT_MILESTONES) {
    const milestoneKey = `fp_${milestone.lifetimeEssence}`;
    if (claimedMilestones.includes(milestoneKey)) {
      completedOnTimeMilestones++;
    } else if (!nextOnTimeMilestone && lifetimeEssence < milestone.lifetimeEssence) {
      nextOnTimeMilestone = {
        ...milestone,
        key: milestoneKey,
        progress: lifetimeEssence / milestone.lifetimeEssence,
        remaining: milestone.lifetimeEssence - lifetimeEssence
      };
    }
  }

  // Check repeatable milestones
  const weeklyEssence = state.weekly?.essenceEarned || 0;
  const weeklyMilestone = REPEATABLE_MILESTONES?.weeklyEssence;
  const weeklyProgress = weeklyMilestone ? {
    threshold: weeklyMilestone.threshold,
    current: weeklyEssence,
    progress: weeklyEssence / weeklyMilestone.threshold,
    claimable: weeklyEssence >= weeklyMilestone.threshold &&
               state.repeatableMilestones?.weeklyEssenceLastClaimed !== currentWeek,
    claimedThisWeek: state.repeatableMilestones?.weeklyEssenceLastClaimed === currentWeek
  } : null;

  // Per-1T milestone progress
  const per1TMilestone = REPEATABLE_MILESTONES?.essencePer1T || REPEATABLE_MILESTONES?.essencePer100B;
  const per1TProgress = per1TMilestone ? {
    threshold: per1TMilestone.threshold,
    claimedCount: state.repeatableMilestones?.per100BCount || 0,
    eligibleCount: Math.floor(lifetimeEssence / per1TMilestone.threshold),
    claimableCount: Math.floor(lifetimeEssence / per1TMilestone.threshold) -
                   (state.repeatableMilestones?.per100BCount || 0),
    nextThreshold: ((state.repeatableMilestones?.per100BCount || 0) + 1) * per1TMilestone.threshold,
    progress: (lifetimeEssence % per1TMilestone.threshold) / per1TMilestone.threshold
  } : null;

  return {
    oneTime: {
      completed: completedOnTimeMilestones,
      total: FATE_POINT_MILESTONES.length,
      next: nextOnTimeMilestone,
      claimable: checkMilestones(state)
    },
    repeatable: {
      weekly: weeklyProgress,
      per1T: per1TProgress,
      claimable: checkRepeatableMilestones(state)
    }
  };
}

module.exports = {
  checkMilestones,
  claimMilestone,
  checkRepeatableMilestones,
  claimRepeatableMilestone,
  getMilestoneProgress
};
