/**
 * Milestone Routes
 *
 * Handles milestone claiming, repeatable milestones, and daily challenges.
 */

const express = require('express');
const router = express.Router();
const essenceTapService = require('../../../services/essenceTapService');
const { createRoute, createGetRoute } = require('../createRoute');

// ===========================================
// ONE-TIME MILESTONES
// ===========================================

/**
 * POST /milestone/claim
 * Claim a one-time Fate Points milestone
 */
router.post('/claim', createRoute({
  validate: (body) => body.milestoneKey ? null : 'Milestone key required',
  execute: async (ctx) => {
    const { milestoneKey } = ctx.body;

    const result = essenceTapService.claimMilestone(ctx.state, milestoneKey);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Apply FP with cap enforcement (one-time milestones exempt from cap)
    const fpResult = essenceTapService.applyFPWithCap(
      result.newState,
      result.fatePoints,
      'one_time_milestone'
    );

    return {
      success: true,
      newState: fpResult.newState,
      fatePointsToAward: fpResult.actualFP,
      data: {
        milestoneKey,
        fatePoints: fpResult.actualFP,
        claimedMilestones: fpResult.newState.claimedMilestones,
        claimableMilestones: essenceTapService.checkMilestones(fpResult.newState)
      }
    };
  }
}));

// ===========================================
// REPEATABLE MILESTONES
// ===========================================

/**
 * POST /milestones/repeatable/claim
 * Claim a repeatable milestone
 */
router.post('/repeatable/claim', createRoute({
  resetWeeklyFP: true,
  validate: (body) => body.milestoneType ? null : 'Milestone type required',
  execute: async (ctx) => {
    const { milestoneType } = ctx.body;

    const result = essenceTapService.claimRepeatableMilestone(ctx.state, milestoneType);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Apply FP with cap (repeatable milestones count toward weekly cap)
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
}));

// ===========================================
// DAILY CHALLENGES
// ===========================================

/**
 * GET /daily-challenges
 * Get daily challenges with progress
 */
router.get('/daily-challenges', createGetRoute((state) => {
  const challenges = essenceTapService.getDailyChallengesWithProgress(state);

  return {
    challenges,
    dailyStats: state.daily || {}
  };
}));

/**
 * POST /daily-challenge/claim
 * Claim a daily challenge reward
 */
router.post('/daily-challenge/claim', createRoute({
  resetDaily: true,
  validate: (body) => body.challengeId ? null : 'Challenge ID required',
  execute: async (ctx) => {
    const { challengeId } = ctx.body;
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
}));

module.exports = router;
