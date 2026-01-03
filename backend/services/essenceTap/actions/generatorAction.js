/**
 * Generator Action
 *
 * Unified generator purchase handling for REST and WebSocket.
 */

const generatorService = require('../generatorService');
const stateService = require('../stateService');
const calculations = require('../calculations');

/**
 * Generator purchase result
 * @typedef {Object} GeneratorPurchaseResult
 * @property {boolean} success - Whether purchase succeeded
 * @property {Object} [newState] - Updated state
 * @property {number} [cost] - Total cost paid
 * @property {Object} [generator] - Generator definition
 * @property {number} [newCount] - New total owned
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Purchase generator(s)
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.generatorId - Generator ID to purchase
 * @param {number} [params.count=1] - Number to purchase (use 'max' for maximum)
 * @returns {GeneratorPurchaseResult} Purchase result
 */
function purchaseGenerator({ state, generatorId, count = 1 }) {
  if (!generatorId) {
    return {
      success: false,
      error: 'Generator ID required',
      code: 'INVALID_REQUEST'
    };
  }

  // Reset daily if needed
  let workingState = stateService.resetDaily(state);

  // Handle 'max' purchase
  if (count === 'max') {
    const result = generatorService.purchaseMaxGenerators(workingState, generatorId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: mapErrorToCode(result.error)
      };
    }

    result.newState.lastOnlineTimestamp = Date.now();
    return result;
  }

  // Regular purchase
  const result = generatorService.purchaseGenerator(workingState, generatorId, count);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();
  return result;
}

/**
 * Get generator information for UI
 * @param {Object} state - Current state
 * @param {string} generatorId - Generator ID
 * @returns {Object} Generator info
 */
function getGeneratorInfo(state, generatorId) {
  const generator = calculations.getGeneratorById(generatorId);
  if (!generator) return null;

  const owned = state.generators?.[generatorId] || 0;
  const cost = calculations.getGeneratorCost(generatorId, owned);
  const unlocked = calculations.isGeneratorUnlocked(generatorId, state.lifetimeEssence || 0);

  return {
    ...generator,
    owned,
    cost,
    unlocked,
    canAfford: (state.essence || 0) >= cost,
    maxPurchasable: calculations.getMaxPurchasable(generatorId, owned, state.essence || 0),
    production: calculations.calculateGeneratorBaseProduction(
      generatorId,
      owned,
      state.purchasedUpgrades || [],
      state.generators || {}
    )
  };
}

/**
 * Get all generators with UI state
 * @param {Object} state - Current state
 * @returns {Array} Generator info array
 */
function getAllGenerators(state) {
  return stateService.getAvailableGenerators(state);
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  switch (error) {
    case 'Invalid generator':
      return 'INVALID_GENERATOR';
    case 'Generator not unlocked yet':
      return 'GENERATOR_LOCKED';
    case 'Not enough essence':
      return 'INSUFFICIENT_ESSENCE';
    case 'Cannot afford any generators':
      return 'INSUFFICIENT_ESSENCE';
    default:
      return 'PURCHASE_FAILED';
  }
}

module.exports = {
  purchaseGenerator,
  getGeneratorInfo,
  getAllGenerators
};
