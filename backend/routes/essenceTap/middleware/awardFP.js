/**
 * Award Fate Points Middleware
 *
 * Centralizes the repeated FP awarding pattern found across many endpoints.
 * Handles weekly cap, tracking, and user fatePoints update.
 *
 * Usage:
 *   // In route handler, set req.pendingFP before this middleware
 *   req.pendingFP = { amount: 10, source: 'milestone_claim' };
 *   // Then use awardPendingFP middleware
 */

const { applyFPWithCap } = require('../../essenceTap');

/**
 * Award pending FP middleware
 * Awards FP set in req.pendingFP to user
 * Updates both game state and user.fatePoints
 */
async function awardPendingFP(req, res, next) {
  try {
    const pendingFP = req.pendingFP;
    if (!pendingFP || !pendingFP.amount || pendingFP.amount <= 0) {
      req.fpAwarded = { requested: 0, actual: 0, capped: false };
      return next();
    }

    const user = req.gameUser;
    const state = req.gameState;

    if (!user || !state) {
      req.fpAwarded = { requested: pendingFP.amount, actual: 0, error: 'No user/state' };
      return next();
    }

    // Apply FP with weekly cap
    const fpResult = applyFPWithCap(state, pendingFP.amount, pendingFP.source || 'unknown');

    // Update game state
    req.gameState = fpResult.newState;
    req.gameStateChanged = true;

    // Update user's global fate points
    const fatePoints = user.fatePoints || {};
    fatePoints.global = fatePoints.global || { points: 0 };
    fatePoints.global.points = (fatePoints.global.points || 0) + fpResult.actualFP;
    user.fatePoints = fatePoints;

    req.fpAwarded = {
      requested: pendingFP.amount,
      actual: fpResult.actualFP,
      capped: fpResult.capped,
      weeklyRemaining: fpResult.weeklyRemaining,
      source: pendingFP.source
    };

    next();
  } catch (error) {
    console.error('Error in awardPendingFP middleware:', error);
    req.fpAwarded = { requested: req.pendingFP?.amount || 0, actual: 0, error: error.message };
    next();
  }
}

/**
 * Helper to award FP directly in a route handler
 * @param {Object} params - Parameters
 * @param {Object} params.user - User model instance
 * @param {Object} params.state - Current game state
 * @param {number} params.amount - FP amount to award
 * @param {string} params.source - Source of FP
 * @returns {Object} { newState, actualFP, capped, fatePoints }
 */
function awardFP({ user, state, amount, source }) {
  if (!amount || amount <= 0) {
    return { newState: state, actualFP: 0, capped: false };
  }

  // Apply FP with weekly cap
  const fpResult = applyFPWithCap(state, amount, source);

  // Update user's global fate points
  const fatePoints = user.fatePoints || {};
  fatePoints.global = fatePoints.global || { points: 0 };
  fatePoints.global.points = (fatePoints.global.points || 0) + fpResult.actualFP;

  return {
    newState: fpResult.newState,
    actualFP: fpResult.actualFP,
    capped: fpResult.capped,
    weeklyRemaining: fpResult.weeklyRemaining,
    fatePoints
  };
}

/**
 * Helper to award roll tickets to a user
 * @param {Object} params - Parameters
 * @param {Object} params.user - User model instance
 * @param {number} params.rollTickets - Regular roll tickets to award
 * @param {number} params.premiumTickets - Premium tickets to award
 * @returns {Object} Updated ticket counts
 */
function awardTickets({ user, rollTickets = 0, premiumTickets = 0 }) {
  const updatedTickets = {
    rollTickets: (user.rollTickets || 0) + rollTickets,
    premiumTickets: (user.premiumTickets || 0) + premiumTickets
  };

  user.rollTickets = updatedTickets.rollTickets;
  user.premiumTickets = updatedTickets.premiumTickets;

  return {
    awarded: { rollTickets, premiumTickets },
    total: updatedTickets
  };
}

/**
 * Combined reward awarding helper
 * @param {Object} params - Parameters
 * @param {Object} params.user - User model instance
 * @param {Object} params.state - Current game state
 * @param {Object} params.rewards - Rewards object { fatePoints, rollTickets, premiumTickets, essence }
 * @param {string} params.source - Source of rewards
 * @returns {Object} { newState, awarded, fatePoints }
 */
function awardRewards({ user, state, rewards, source }) {
  let newState = { ...state };
  const awarded = {
    fatePoints: 0,
    rollTickets: 0,
    premiumTickets: 0,
    essence: 0
  };

  // Award FP
  if (rewards.fatePoints) {
    const fpResult = awardFP({ user, state: newState, amount: rewards.fatePoints, source });
    newState = fpResult.newState;
    awarded.fatePoints = fpResult.actualFP;
    user.fatePoints = fpResult.fatePoints;
  }

  // Award tickets
  if (rewards.rollTickets || rewards.premiumTickets) {
    awardTickets({
      user,
      rollTickets: rewards.rollTickets || 0,
      premiumTickets: rewards.premiumTickets || 0
    });
    awarded.rollTickets = rewards.rollTickets || 0;
    awarded.premiumTickets = rewards.premiumTickets || 0;
  }

  // Award essence
  if (rewards.essence) {
    newState.essence = (newState.essence || 0) + rewards.essence;
    newState.lifetimeEssence = (newState.lifetimeEssence || 0) + rewards.essence;
    awarded.essence = rewards.essence;
  }

  return { newState, awarded };
}

module.exports = {
  awardPendingFP,
  awardFP,
  awardTickets,
  awardRewards
};
