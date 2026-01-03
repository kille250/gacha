/**
 * Challenge Handlers - Daily challenges and milestones
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle claiming a daily challenge
 */
const handleClaimDailyChallenge = createHandler({
  eventName: 'daily_challenge_claimed',
  errorCode: 'CHALLENGE_ERROR',
  resetDaily: true,
  validate: (data) => data.challengeId ? null : 'Challenge ID required',
  execute: async (ctx, data) => {
    const { challengeId } = data;
    const { DAILY_CHALLENGES } = require('../../../config/essenceTap');

    // Check if challenge is completed but not claimed
    const completedChallenges = ctx.state.daily?.completedChallenges || [];
    const claimedChallenges = ctx.state.daily?.claimedChallenges || [];

    if (!completedChallenges.includes(challengeId)) {
      return {
        success: false,
        error: 'Challenge not completed',
        code: 'CHALLENGE_NOT_COMPLETED'
      };
    }

    if (claimedChallenges.includes(challengeId)) {
      return {
        success: false,
        error: 'Challenge already claimed',
        code: 'ALREADY_CLAIMED'
      };
    }

    const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId);
    if (!challenge) {
      return {
        success: false,
        error: 'Invalid challenge',
        code: 'INVALID_CHALLENGE'
      };
    }

    // Apply reward
    const newState = { ...ctx.state };
    newState.daily = { ...ctx.state.daily };
    newState.daily.claimedChallenges = [...claimedChallenges, challengeId];

    if (challenge.reward?.essence) {
      newState.essence = (ctx.state.essence || 0) + challenge.reward.essence;
      newState.lifetimeEssence = (ctx.state.lifetimeEssence || 0) + challenge.reward.essence;
    }

    // Handle FP with cap
    let fatePointsAwarded = 0;
    if (challenge.reward?.fatePoints) {
      const fpResult = essenceTapService.applyFPWithCap(
        newState,
        challenge.reward.fatePoints,
        'daily_challenge'
      );
      Object.assign(newState, fpResult.newState);
      fatePointsAwarded = fpResult.actualFP;
    }

    return {
      success: true,
      newState,
      fatePointsToAward: fatePointsAwarded,
      data: {
        challengeId,
        challenge: {
          id: challenge.id,
          name: challenge.name,
          type: challenge.type
        },
        reward: challenge.reward,
        fatePointsAwarded,
        essence: newState.essence,
        claimedChallenges: newState.daily.claimedChallenges
      }
    };
  }
});

/**
 * Handle claiming a one-time milestone
 */
const handleClaimMilestone = createHandler({
  eventName: 'milestone_claimed',
  errorCode: 'MILESTONE_ERROR',
  validate: (data) => data.milestoneKey ? null : 'Milestone key required',
  execute: async (ctx, data) => {
    const { milestoneKey } = data;

    const result = essenceTapService.claimMilestone(ctx.state, milestoneKey);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      fatePointsToAward: result.fatePoints,
      data: {
        milestoneKey,
        fatePoints: result.fatePoints,
        claimedMilestones: result.newState.claimedMilestones,
        claimableMilestones: essenceTapService.checkMilestones(result.newState)
      }
    };
  }
});

/**
 * Handle claiming a repeatable milestone
 */
const handleClaimRepeatableMilestone = createHandler({
  eventName: 'repeatable_milestone_claimed',
  errorCode: 'REPEATABLE_MILESTONE_ERROR',
  resetWeeklyFP: true,
  validate: (data) => data.milestoneType ? null : 'Milestone type required',
  execute: async (ctx, data) => {
    const { milestoneType } = data;

    const result = essenceTapService.claimRepeatableMilestone(ctx.state, milestoneType);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Apply FP with cap
    const fpResult = essenceTapService.applyFPWithCap(
      result.newState,
      result.fatePoints,
      'repeatable_milestone'
    );

    return {
      success: true,
      newState: fpResult.newState,
      fatePointsToAward: fpResult.actualFP,
      data: {
        milestoneType,
        fatePoints: fpResult.actualFP,
        count: result.count || 1,
        capped: fpResult.capped,
        repeatableMilestones: fpResult.newState.repeatableMilestones,
        claimableRepeatableMilestones: essenceTapService.checkRepeatableMilestones(fpResult.newState),
        weeklyFP: essenceTapService.getWeeklyFPBudget(fpResult.newState)
      }
    };
  }
});

/**
 * Handle claiming a session milestone
 */
const handleClaimSessionMilestone = createHandler({
  eventName: 'session_milestone_claimed',
  errorCode: 'SESSION_MILESTONE_ERROR',
  validate: (data) => {
    if (!data.milestoneType) return 'Milestone type required';
    if (!data.milestoneName) return 'Milestone name required';
    return null;
  },
  execute: async (ctx, data) => {
    const { milestoneType, milestoneName } = data;
    const { MINI_MILESTONES } = require('../../../config/essenceTap');

    const sessionStats = ctx.state.sessionStats || {};
    let claimedList;
    let milestoneConfig;

    switch (milestoneType) {
      case 'session':
        claimedList = sessionStats.claimedSessionMilestones || [];
        milestoneConfig = MINI_MILESTONES.sessionMilestones?.find(m => m.name === milestoneName);
        break;
      case 'combo':
        claimedList = sessionStats.claimedComboMilestones || [];
        milestoneConfig = MINI_MILESTONES.comboMilestones?.find(m => m.name === milestoneName);
        break;
      case 'critStreak':
        claimedList = sessionStats.claimedCritMilestones || [];
        milestoneConfig = MINI_MILESTONES.critStreakMilestones?.find(m => m.name === milestoneName);
        break;
      default:
        return {
          success: false,
          error: 'Invalid milestone type',
          code: 'INVALID_TYPE'
        };
    }

    if (!milestoneConfig) {
      return {
        success: false,
        error: 'Invalid milestone',
        code: 'INVALID_MILESTONE'
      };
    }

    if (claimedList.includes(milestoneName)) {
      return {
        success: false,
        error: 'Milestone already claimed',
        code: 'ALREADY_CLAIMED'
      };
    }

    // Apply reward
    const newState = { ...ctx.state };
    newState.sessionStats = { ...sessionStats };

    switch (milestoneType) {
      case 'session':
        newState.sessionStats.claimedSessionMilestones = [...claimedList, milestoneName];
        break;
      case 'combo':
        newState.sessionStats.claimedComboMilestones = [...claimedList, milestoneName];
        break;
      case 'critStreak':
        newState.sessionStats.claimedCritMilestones = [...claimedList, milestoneName];
        break;
    }

    if (milestoneConfig.reward?.essence) {
      newState.essence = (ctx.state.essence || 0) + milestoneConfig.reward.essence;
      newState.lifetimeEssence = (ctx.state.lifetimeEssence || 0) + milestoneConfig.reward.essence;
    }

    return {
      success: true,
      newState,
      data: {
        milestoneType,
        milestoneName,
        reward: milestoneConfig.reward,
        essence: newState.essence,
        sessionStats: essenceTapService.getSessionStats(newState)
      }
    };
  }
});

module.exports = {
  handleClaimDailyChallenge,
  handleClaimMilestone,
  handleClaimRepeatableMilestone,
  handleClaimSessionMilestone
};
