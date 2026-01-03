/**
 * Prestige Calculation Functions
 *
 * Pure functions for prestige-related calculations.
 * These can be used by service, routes, and websocket handler.
 */

const { PRESTIGE_CONFIG } = require('../../../config/essenceTap');

/**
 * Calculate prestige shards earned from lifetime essence
 * @param {number} lifetimeEssence - Lifetime essence
 * @returns {number} Shards earned
 */
function calculatePrestigeShards(lifetimeEssence) {
  if (lifetimeEssence < PRESTIGE_CONFIG.minimumEssence) {
    return 0;
  }
  return Math.floor(Math.sqrt(lifetimeEssence / PRESTIGE_CONFIG.shardDivisor));
}

/**
 * Check if player can prestige
 * @param {number} lifetimeEssence - Player's lifetime essence
 * @returns {boolean} Whether player can prestige
 */
function canPrestige(lifetimeEssence) {
  return lifetimeEssence >= PRESTIGE_CONFIG.minimumEssence;
}

/**
 * Calculate prestige upgrade cost
 * @param {string} upgradeId - Prestige upgrade ID
 * @param {number} currentLevel - Current level of the upgrade
 * @returns {number} Cost in shards
 */
function calculatePrestigeUpgradeCost(upgradeId, currentLevel = 0) {
  const upgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return Infinity;

  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

/**
 * Check if prestige upgrade is at max level
 * @param {string} upgradeId - Prestige upgrade ID
 * @param {number} currentLevel - Current level of the upgrade
 * @returns {boolean} Whether at max level
 */
function isPrestigeUpgradeMaxed(upgradeId, currentLevel = 0) {
  const upgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return true;

  return currentLevel >= upgrade.maxLevel;
}

/**
 * Get prestige upgrade by ID
 * @param {string} upgradeId - Prestige upgrade ID
 * @returns {Object|null} Upgrade definition or null
 */
function getPrestigeUpgradeById(upgradeId) {
  return PRESTIGE_CONFIG.upgrades.find(u => u.id === upgradeId) || null;
}

/**
 * Calculate total bonus from a prestige upgrade
 * @param {string} upgradeId - Prestige upgrade ID
 * @param {number} level - Current level
 * @returns {number} Total bonus value
 */
function calculatePrestigeUpgradeBonus(upgradeId, level = 0) {
  const upgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || level <= 0) return 0;

  return level * upgrade.bonusPerLevel;
}

/**
 * Calculate starting essence from prestige upgrade
 * @param {Object} prestigeUpgrades - Player's prestige upgrades { upgradeId: level }
 * @returns {number} Starting essence after prestige
 */
function calculateStartingEssence(prestigeUpgrades = {}) {
  const startingLevel = prestigeUpgrades.prestige_starting || 0;
  const upgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_starting');

  if (!upgrade || startingLevel <= 0) return 0;

  return startingLevel * upgrade.bonusPerLevel;
}

/**
 * Check prestige cooldown status
 * @param {number} lastPrestigeTimestamp - Timestamp of last prestige
 * @returns {Object} Cooldown status { onCooldown, remainingMs, remainingMinutes }
 */
function checkPrestigeCooldown(lastPrestigeTimestamp = 0) {
  const now = Date.now();
  const cooldownMs = PRESTIGE_CONFIG.cooldownMs || 3600000;
  const timeRemaining = Math.max(0, (lastPrestigeTimestamp + cooldownMs) - now);

  return {
    onCooldown: timeRemaining > 0,
    remainingMs: timeRemaining,
    remainingMinutes: Math.ceil(timeRemaining / 60000)
  };
}

/**
 * Get prestige info for UI display
 * @param {Object} state - Player state
 * @returns {Object} Prestige information
 */
function getPrestigeInfo(state) {
  const shardsIfPrestige = calculatePrestigeShards(state.lifetimeEssence || 0);
  const currentShards = state.prestigeShards || 0;
  const lifetimeShards = state.lifetimeShards || 0;

  const currentPrestigeBonus = 1 + Math.min(lifetimeShards, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;
  const bonusAfterPrestige = 1 + Math.min(lifetimeShards + shardsIfPrestige, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;

  const upgrades = PRESTIGE_CONFIG.upgrades.map(upgrade => {
    const level = state.prestigeUpgrades?.[upgrade.id] || 0;
    const cost = calculatePrestigeUpgradeCost(upgrade.id, level);
    const canAfford = currentShards >= cost;
    const maxed = level >= upgrade.maxLevel;

    return {
      ...upgrade,
      level,
      cost,
      canAfford,
      maxed
    };
  });

  const cooldownStatus = checkPrestigeCooldown(state.lastPrestigeTimestamp || 0);

  return {
    canPrestige: canPrestige(state.lifetimeEssence || 0) && !cooldownStatus.onCooldown,
    minimumEssence: PRESTIGE_CONFIG.minimumEssence,
    shardsIfPrestige,
    currentShards,
    lifetimeShards,
    prestigeLevel: state.prestigeLevel || 0,
    currentBonus: currentPrestigeBonus,
    bonusAfterPrestige,
    upgrades,
    cooldown: cooldownStatus
  };
}

module.exports = {
  calculatePrestigeShards,
  canPrestige,
  calculatePrestigeUpgradeCost,
  isPrestigeUpgradeMaxed,
  getPrestigeUpgradeById,
  calculatePrestigeUpgradeBonus,
  calculateStartingEssence,
  checkPrestigeCooldown,
  getPrestigeInfo,
  PRESTIGE_CONFIG
};
