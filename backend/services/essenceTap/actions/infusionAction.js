/**
 * Infusion Action
 *
 * Unified infusion handling for REST and WebSocket.
 * Delegates to infusion.service.js for business logic.
 */

const infusionService = require('../domains/infusion.service');

/**
 * Infusion action result
 * @typedef {Object} InfusionResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {number} [cost] - Essence cost paid
 * @property {number} [bonusGained] - Bonus percentage gained
 * @property {number} [totalBonus] - Total bonus after infusion
 * @property {number} [infusionCount] - New infusion count
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Perform an infusion
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @returns {InfusionResult} Infusion result
 */
function performInfusion({ state }) {
  const result = infusionService.performInfusion(state);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState: result.newState,
    cost: result.cost,
    costPercent: result.costPercent,
    bonusGained: result.bonusGained,
    totalBonus: result.totalBonus,
    infusionCount: result.infusionCount,
    essence: result.newState.essence
  };
}

/**
 * Get infusion information and availability
 * @param {Object} state - Current state
 * @returns {Object} Infusion info
 */
function getInfusionInfo(state) {
  return infusionService.getInfusionInfo(state);
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  if (error.includes('Maximum')) return 'MAX_INFUSIONS_REACHED';
  if (error.includes('Need at least')) return 'MINIMUM_ESSENCE_REQUIRED';
  if (error.includes('Not enough essence')) return 'INSUFFICIENT_ESSENCE';
  return 'INFUSION_FAILED';
}

module.exports = {
  performInfusion,
  getInfusionInfo
};
