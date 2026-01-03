/**
 * Milestone Routes
 *
 * Handles milestone claiming, repeatable milestones, and daily challenges.
 * Uses unified action handlers and middleware.
 */

const express = require('express');
const router = express.Router();

const { actions, getWeeklyFPBudget } = require('../../../services/essenceTap');
const {
  loadGameState,
  saveGameState,
  asyncHandler,
  awardFP,
  awardRewards
} = require('../middleware');

// ===========================================
// ONE-TIME MILESTONES
// ===========================================

/**
 * GET /milestones
 * Get milestone progress and claimable milestones
 */
router.get('/',
  loadGameState,
  asyncHandler(async (req, res) => {
    const progress = actions.getMilestoneProgress(req.gameState);
    return res.json(progress);
  })
);

/**
 * POST /milestone/claim
 * Claim a one-time Fate Points milestone
 */
router.post('/claim',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const { milestoneKey } = req.body;

    if (!milestoneKey) {
      return res.status(400).json({ error: 'Milestone key required' });
    }

    // Use unified action handler
    const result = actions.claimMilestone({
      state: req.gameState,
      milestoneKey
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    // Apply FP with cap (one-time milestones are often exempt from cap)
    let actualFP = 0;
    let fpCapped = false;
    if (result.fatePoints > 0) {
      const fpResult = awardFP({
        user: req.gameUser,
        state: result.newState,
        amount: result.fatePoints,
        source: 'one_time_milestone'
      });
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
      req.gameUser.fatePoints = fpResult.fatePoints;
    }

    // Update state for saving
    req.gameState = result.newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      milestoneKey,
      fatePoints: actualFP,
      capped: fpCapped,
      claimedMilestones: result.claimedMilestones,
      claimableMilestones: actions.checkMilestones(result.newState).oneTime
    };

    next();
  }),
  saveGameState
);

// ===========================================
// REPEATABLE MILESTONES
// ===========================================

/**
 * POST /milestones/repeatable/claim
 * Claim a repeatable milestone
 */
router.post('/repeatable/claim',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const { milestoneType } = req.body;

    if (!milestoneType) {
      return res.status(400).json({ error: 'Milestone type required' });
    }

    // Use unified action handler
    const result = actions.claimRepeatableMilestone({
      state: req.gameState,
      milestoneType
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    // Apply FP with cap (repeatable milestones count toward weekly cap)
    let actualFP = 0;
    let fpCapped = false;
    if (result.fatePoints > 0) {
      const fpResult = awardFP({
        user: req.gameUser,
        state: result.newState,
        amount: result.fatePoints,
        source: 'repeatable_milestone'
      });
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
      req.gameUser.fatePoints = fpResult.fatePoints;
    }

    // Update state for saving
    req.gameState = result.newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      milestoneType,
      fatePoints: actualFP,
      count: result.count,
      capped: fpCapped,
      repeatableMilestones: result.newState.repeatableMilestones,
      claimableRepeatableMilestones: actions.checkMilestones(result.newState).repeatable,
      weeklyFP: getWeeklyFPBudget(result.newState)
    };

    next();
  }),
  saveGameState
);

// ===========================================
// DAILY CHALLENGES
// ===========================================

/**
 * GET /daily-challenges
 * Get daily challenges with progress
 */
router.get('/daily-challenges',
  loadGameState,
  asyncHandler(async (req, res) => {
    const challengeInfo = actions.checkDailyChallenges(req.gameState);

    return res.json({
      ...challengeInfo,
      dailyStats: req.gameState.daily || {}
    });
  })
);

/**
 * POST /daily-challenge/claim
 * Claim a daily challenge reward
 */
router.post('/daily-challenge/claim',
  loadGameState,
  asyncHandler(async (req, res, next) => {
    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ error: 'Challenge ID required' });
    }

    // Use unified action handler
    const result = actions.claimDailyChallenge({
      state: req.gameState,
      challengeId
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code
      });
    }

    let newState = result.newState;
    let actualFP = 0;

    // Award rewards if present
    if (result.rewards) {
      const rewardResult = awardRewards({
        user: req.gameUser,
        state: newState,
        rewards: result.rewards,
        source: 'daily_challenge'
      });
      newState = rewardResult.newState;
      actualFP = rewardResult.awarded.fatePoints;
    }

    // Update state for saving
    req.gameState = newState;
    req.gameStateChanged = true;

    // Set response
    res.locals.response = {
      success: true,
      challengeId,
      challenge: result.challenge,
      rewards: result.rewards,
      fatePointsAwarded: actualFP,
      essence: newState.essence
    };

    next();
  }),
  saveGameState
);

module.exports = router;
