/**
 * Milestone Action
 *
 * Unified milestone handling for REST and WebSocket.
 * Handles both one-time and repeatable milestones.
 */

const milestoneService = require('../domains/milestone.service');
const { applyFPWithCap } = require('../shared');

/**
 * Milestone action result
 * @typedef {Object} MilestoneResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {number} [fatePoints] - FP awarded (after cap)
 * @property {number} [requestedFP] - FP before cap
 * @property {boolean} [capped] - Whether FP was capped
 * @property {Object} [userChanges] - Changes to apply to user model
 * @property {Object} [rollTickets] - Tickets awarded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Claim a one-time milestone
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.milestoneKey - Milestone key to claim
 * @returns {MilestoneResult} Claim result
 */
function claimMilestone({ state, milestoneKey }) {
  if (!milestoneKey) {
    return {
      success: false,
      error: 'Milestone key required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = milestoneService.claimMilestone(state, milestoneKey);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  let newState = result.newState;
  newState.lastOnlineTimestamp = Date.now();

  // Apply FP with cap (one-time milestones exempt from cap, but we track it)
  const userChanges = {};
  let actualFP = result.fatePoints;
  let capped = false;

  if (result.fatePoints > 0) {
    const fpResult = applyFPWithCap(newState, result.fatePoints, 'one_time_milestone');
    newState = fpResult.newState;
    actualFP = fpResult.actualFP;
    capped = fpResult.capped;

    if (fpResult.actualFP > 0) {
      userChanges.fatePoints = fpResult.actualFP;
    }
  }

  return {
    success: true,
    newState,
    milestoneKey,
    fatePoints: actualFP,
    requestedFP: result.fatePoints,
    capped,
    userChanges,
    claimedMilestones: newState.claimedMilestones
  };
}

/**
 * Claim a repeatable milestone
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.milestoneType - Milestone type to claim
 * @returns {MilestoneResult} Claim result
 */
function claimRepeatableMilestone({ state, milestoneType }) {
  if (!milestoneType) {
    return {
      success: false,
      error: 'Milestone type required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = milestoneService.claimRepeatableMilestone(state, milestoneType);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  let newState = result.newState;
  newState.lastOnlineTimestamp = Date.now();

  // Apply FP with cap for repeatable milestones
  const userChanges = {};
  let actualFP = result.fatePoints;
  let capped = false;

  if (result.fatePoints > 0) {
    const fpResult = applyFPWithCap(newState, result.fatePoints, 'repeatable_milestone');
    newState = fpResult.newState;
    actualFP = fpResult.actualFP;
    capped = fpResult.capped;

    if (fpResult.actualFP > 0) {
      userChanges.fatePoints = fpResult.actualFP;
    }
  }

  return {
    success: true,
    newState,
    milestoneType,
    fatePoints: actualFP,
    requestedFP: result.fatePoints,
    capped,
    userChanges,
    count: result.count || 1
  };
}

/**
 * Check for claimable milestones
 * @param {Object} state - Current state
 * @returns {Object} Claimable milestones
 */
function checkMilestones(state) {
  return {
    oneTime: milestoneService.checkMilestones(state),
    repeatable: milestoneService.checkRepeatableMilestones(state)
  };
}

/**
 * Get milestone progress info
 * @param {Object} state - Current state
 * @returns {Object} Progress info
 */
function getMilestoneProgress(state) {
  return milestoneService.getMilestoneProgress(state);
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  if (error.includes('already claimed')) return 'ALREADY_CLAIMED';
  if (error.includes('Invalid')) return 'INVALID_MILESTONE';
  if (error.includes('not reached')) return 'MILESTONE_NOT_REACHED';
  if (error.includes('Already claimed this week')) return 'ALREADY_CLAIMED_THIS_WEEK';
  return 'CLAIM_FAILED';
}

module.exports = {
  claimMilestone,
  claimRepeatableMilestone,
  checkMilestones,
  getMilestoneProgress
};
