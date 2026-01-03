/**
 * Essence Tap Upgrade Service
 *
 * Handles upgrade purchases for the Essence Tap minigame.
 */

const calculations = require('./calculations');

/**
 * Purchase an upgrade
 * @param {Object} state - Current state
 * @param {string} upgradeId - Upgrade to purchase
 * @returns {Object} Updated state and result
 */
function purchaseUpgrade(state, upgradeId) {
  const purchasedUpgrades = state.purchasedUpgrades || [];

  // Check if already purchased
  if (purchasedUpgrades.includes(upgradeId)) {
    return { success: false, error: 'Upgrade already purchased' };
  }

  // Find upgrade
  const upgrade = calculations.getUpgradeById(upgradeId);
  if (!upgrade) {
    return { success: false, error: 'Invalid upgrade' };
  }

  // Check unlock requirement
  if (!calculations.isUpgradeUnlocked(upgradeId, state.lifetimeEssence || 0)) {
    return { success: false, error: 'Upgrade not unlocked yet' };
  }

  // Check generator requirement for generator upgrades
  if (!calculations.meetsGeneratorRequirement(upgradeId, state.generators)) {
    return { success: false, error: `Need ${upgrade.requiredOwned} ${upgrade.generatorId}` };
  }

  // Check affordability
  if (!calculations.canAffordUpgrade(upgradeId, state.essence || 0)) {
    return { success: false, error: 'Not enough essence' };
  }

  // Apply purchase
  const newState = { ...state };
  newState.essence = state.essence - upgrade.cost;
  newState.purchasedUpgrades = [...purchasedUpgrades, upgradeId];

  // Update stats
  newState.stats = { ...state.stats };
  newState.stats.totalUpgradesPurchased = (state.stats?.totalUpgradesPurchased || 0) + 1;

  return {
    success: true,
    newState,
    upgrade
  };
}

/**
 * Get upgrade availability for UI
 * @param {Object} state - Current state
 * @returns {Object} Categorized upgrades with availability info
 */
function getUpgradeAvailability(state) {
  return calculations.getAvailableUpgrades(state);
}

/**
 * Check if a specific upgrade can be purchased
 * @param {Object} state - Current state
 * @param {string} upgradeId - Upgrade to check
 * @returns {Object} Availability status
 */
function canPurchaseUpgrade(state, upgradeId) {
  return calculations.getUpgradeStatus(upgradeId, state);
}

/**
 * Get next affordable upgrades (for auto-purchase or suggestions)
 * @param {Object} state - Current state
 * @param {number} limit - Maximum number to return
 * @returns {Array} List of purchasable upgrades sorted by cost
 */
function getAffordableUpgrades(state, limit = 5) {
  const allUpgrades = calculations.getAllUpgrades();
  const affordable = [];

  for (const upgrade of allUpgrades) {
    const status = calculations.getUpgradeStatus(upgrade.id, state);
    if (status.canPurchase) {
      affordable.push({
        ...upgrade,
        ...status
      });
    }
  }

  // Sort by cost (cheapest first)
  affordable.sort((a, b) => a.cost - b.cost);

  return affordable.slice(0, limit);
}

module.exports = {
  purchaseUpgrade,
  getUpgradeAvailability,
  canPurchaseUpgrade,
  getAffordableUpgrades
};
