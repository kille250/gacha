/**
 * Upgrade Calculation Functions
 *
 * Pure functions for upgrade-related calculations.
 * These can be used by service, routes, and websocket handler.
 */

const {
  CLICK_UPGRADES,
  GENERATOR_UPGRADES,
  GLOBAL_UPGRADES,
  SYNERGY_UPGRADES
} = require('../../../config/essenceTap');

/**
 * Get all upgrades combined
 * @returns {Array} All upgrade definitions
 */
function getAllUpgrades() {
  return [...CLICK_UPGRADES, ...GENERATOR_UPGRADES, ...GLOBAL_UPGRADES, ...SYNERGY_UPGRADES];
}

/**
 * Find an upgrade by ID across all upgrade types
 * @param {string} upgradeId - Upgrade ID
 * @returns {Object|null} Upgrade definition or null
 */
function getUpgradeById(upgradeId) {
  return getAllUpgrades().find(u => u.id === upgradeId) || null;
}

/**
 * Check if an upgrade is purchased
 * @param {string} upgradeId - Upgrade ID
 * @param {Array} purchasedUpgrades - List of purchased upgrade IDs
 * @returns {boolean} Whether upgrade is purchased
 */
function isUpgradePurchased(upgradeId, purchasedUpgrades = []) {
  return purchasedUpgrades.includes(upgradeId);
}

/**
 * Check if an upgrade is unlocked based on lifetime essence
 * @param {string} upgradeId - Upgrade ID
 * @param {number} lifetimeEssence - Player's lifetime essence
 * @returns {boolean} Whether upgrade is unlocked
 */
function isUpgradeUnlocked(upgradeId, lifetimeEssence) {
  const upgrade = getUpgradeById(upgradeId);
  if (!upgrade) return false;

  if (!upgrade.unlockEssence) return true;
  return lifetimeEssence >= upgrade.unlockEssence;
}

/**
 * Check if a generator upgrade meets its ownership requirement
 * @param {string} upgradeId - Upgrade ID
 * @param {Object} generators - Generators owned { generatorId: count }
 * @returns {boolean} Whether requirement is met
 */
function meetsGeneratorRequirement(upgradeId, generators = {}) {
  const upgrade = getUpgradeById(upgradeId);
  if (!upgrade) return false;

  if (!upgrade.requiredOwned) return true;

  const owned = generators[upgrade.generatorId] || 0;
  return owned >= upgrade.requiredOwned;
}

/**
 * Check if player can afford an upgrade
 * @param {string} upgradeId - Upgrade ID
 * @param {number} essence - Player's current essence
 * @returns {boolean} Whether player can afford
 */
function canAffordUpgrade(upgradeId, essence) {
  const upgrade = getUpgradeById(upgradeId);
  if (!upgrade) return false;

  return essence >= upgrade.cost;
}

/**
 * Get upgrade availability status
 * @param {string} upgradeId - Upgrade ID
 * @param {Object} state - Player state
 * @returns {Object} Availability status
 */
function getUpgradeStatus(upgradeId, state) {
  const upgrade = getUpgradeById(upgradeId);
  if (!upgrade) {
    return { exists: false };
  }

  const purchased = isUpgradePurchased(upgradeId, state.purchasedUpgrades);
  const unlocked = isUpgradeUnlocked(upgradeId, state.lifetimeEssence || 0);
  const meetsRequirements = meetsGeneratorRequirement(upgradeId, state.generators);
  const canAfford = canAffordUpgrade(upgradeId, state.essence || 0);

  return {
    exists: true,
    purchased,
    unlocked,
    meetsRequirements,
    canAfford,
    canPurchase: !purchased && unlocked && meetsRequirements && canAfford
  };
}

/**
 * Calculate click power bonus from upgrades
 * @param {Array} purchasedUpgrades - List of purchased upgrade IDs
 * @returns {number} Total click power bonus
 */
function calculateClickPowerFromUpgrades(purchasedUpgrades = []) {
  let power = 0;

  for (const upgradeId of purchasedUpgrades) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'click_power') {
      power += upgrade.bonus;
    }
  }

  return power;
}

/**
 * Calculate crit chance bonus from upgrades
 * @param {Array} purchasedUpgrades - List of purchased upgrade IDs
 * @returns {number} Total crit chance bonus (0-1 scale)
 */
function calculateCritChanceFromUpgrades(purchasedUpgrades = []) {
  let chance = 0;

  for (const upgradeId of purchasedUpgrades) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'crit_chance') {
      chance += upgrade.bonus;
    }
  }

  return chance;
}

/**
 * Calculate crit multiplier bonus from upgrades
 * @param {Array} purchasedUpgrades - List of purchased upgrade IDs
 * @returns {number} Total crit multiplier bonus
 */
function calculateCritMultiplierFromUpgrades(purchasedUpgrades = []) {
  let mult = 0;

  for (const upgradeId of purchasedUpgrades) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'crit_multiplier') {
      mult += upgrade.bonus;
    }
  }

  return mult;
}

/**
 * Get formatted upgrades for UI display
 * @param {Object} state - Player state
 * @returns {Object} Categorized upgrades with status
 */
function getAvailableUpgrades(state) {
  const formatUpgrade = (upgrade) => {
    const status = getUpgradeStatus(upgrade.id, state);
    return {
      ...upgrade,
      purchased: status.purchased,
      canAfford: status.canAfford,
      unlocked: status.unlocked,
      meetsRequirements: status.meetsRequirements
    };
  };

  return {
    click: CLICK_UPGRADES.map(formatUpgrade),
    generator: GENERATOR_UPGRADES.map(formatUpgrade),
    global: GLOBAL_UPGRADES.map(formatUpgrade),
    synergy: SYNERGY_UPGRADES.map(formatUpgrade)
  };
}

module.exports = {
  getAllUpgrades,
  getUpgradeById,
  isUpgradePurchased,
  isUpgradeUnlocked,
  meetsGeneratorRequirement,
  canAffordUpgrade,
  getUpgradeStatus,
  calculateClickPowerFromUpgrades,
  calculateCritChanceFromUpgrades,
  calculateCritMultiplierFromUpgrades,
  getAvailableUpgrades,
  CLICK_UPGRADES,
  GENERATOR_UPGRADES,
  GLOBAL_UPGRADES,
  SYNERGY_UPGRADES
};
