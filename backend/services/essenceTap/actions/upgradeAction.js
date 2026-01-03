/**
 * Upgrade Action
 *
 * Unified upgrade purchase handling for REST and WebSocket.
 * Handles both regular upgrades and prestige upgrades.
 */

const stateService = require('../stateService');
const calculations = require('../calculations');

/**
 * Upgrade purchase result
 * @typedef {Object} UpgradePurchaseResult
 * @property {boolean} success - Whether purchase succeeded
 * @property {Object} [newState] - Updated state
 * @property {number} [cost] - Cost paid
 * @property {Object} [upgrade] - Upgrade definition
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Purchase an upgrade
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.upgradeId - Upgrade ID to purchase
 * @returns {UpgradePurchaseResult} Purchase result
 */
function purchaseUpgrade({ state, upgradeId }) {
  if (!upgradeId) {
    return {
      success: false,
      error: 'Upgrade ID required',
      code: 'INVALID_REQUEST'
    };
  }

  // Reset daily if needed
  let workingState = stateService.resetDaily(state);

  // Get upgrade definition
  const upgrade = calculations.getUpgradeById(upgradeId);
  if (!upgrade) {
    return {
      success: false,
      error: 'Invalid upgrade',
      code: 'INVALID_UPGRADE'
    };
  }

  // Check if already purchased
  if (calculations.isUpgradePurchased(upgradeId, workingState.purchasedUpgrades)) {
    return {
      success: false,
      error: 'Upgrade already purchased',
      code: 'ALREADY_PURCHASED'
    };
  }

  // Check if unlocked (pass lifetimeEssence, not the whole state object)
  if (!calculations.isUpgradeUnlocked(upgradeId, workingState.lifetimeEssence || 0)) {
    return {
      success: false,
      error: 'Upgrade not unlocked yet',
      code: 'UPGRADE_LOCKED'
    };
  }

  // Check if can afford
  if (!calculations.canAffordUpgrade(upgradeId, workingState.essence)) {
    return {
      success: false,
      error: 'Not enough essence',
      code: 'INSUFFICIENT_ESSENCE'
    };
  }

  // Apply purchase
  const cost = upgrade.cost;
  const newState = { ...workingState };
  newState.essence = workingState.essence - cost;
  newState.purchasedUpgrades = [...(workingState.purchasedUpgrades || []), upgradeId];

  // Update stats
  newState.stats = { ...workingState.stats };
  newState.stats.totalUpgradesPurchased = (workingState.stats?.totalUpgradesPurchased || 0) + 1;

  newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState,
    cost,
    upgrade
  };
}

/**
 * Purchase a prestige upgrade
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.upgradeId - Prestige upgrade ID
 * @returns {UpgradePurchaseResult} Purchase result
 */
function purchasePrestigeUpgrade({ state, upgradeId }) {
  if (!upgradeId) {
    return {
      success: false,
      error: 'Upgrade ID required',
      code: 'INVALID_REQUEST'
    };
  }

  // Get prestige upgrade definition
  const upgrade = calculations.getPrestigeUpgradeById(upgradeId);
  if (!upgrade) {
    return {
      success: false,
      error: 'Invalid prestige upgrade',
      code: 'INVALID_UPGRADE'
    };
  }

  // Check if maxed
  const currentLevel = state.prestigeUpgrades?.[upgradeId] || 0;
  if (calculations.isPrestigeUpgradeMaxed(upgradeId, currentLevel)) {
    return {
      success: false,
      error: 'Upgrade already at max level',
      code: 'UPGRADE_MAXED'
    };
  }

  // Calculate cost
  const cost = calculations.calculatePrestigeUpgradeCost(upgradeId, currentLevel);

  // Check if can afford
  if ((state.prestigeShards || 0) < cost) {
    return {
      success: false,
      error: 'Not enough prestige shards',
      code: 'INSUFFICIENT_SHARDS'
    };
  }

  // Apply purchase
  const newState = { ...state };
  newState.prestigeShards = state.prestigeShards - cost;
  newState.prestigeUpgrades = { ...state.prestigeUpgrades };
  newState.prestigeUpgrades[upgradeId] = currentLevel + 1;
  newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState,
    cost,
    upgrade,
    newLevel: currentLevel + 1
  };
}

/**
 * Get all available upgrades with status
 * @param {Object} state - Current state
 * @returns {Array} Upgrade info array
 */
function getAvailableUpgrades(state) {
  return calculations.getAvailableUpgrades(state);
}

module.exports = {
  purchaseUpgrade,
  purchasePrestigeUpgrade,
  getAvailableUpgrades
};
