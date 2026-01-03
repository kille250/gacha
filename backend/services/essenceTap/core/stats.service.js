/**
 * Stats Service - Stat calculations and recalculation
 */

const {
  GAME_CONFIG,
  GENERATORS,
  UPGRADES,
  PRESTIGE_UPGRADES
} = require('../../../config/essenceTap');

/**
 * Calculate total production per second
 * @param {Object} state - Current state
 * @returns {number} Production per second
 */
function calculateProductionPerSecond(state) {
  let production = 0;

  // Sum generator production
  for (const [generatorId, count] of Object.entries(state.generators || {})) {
    const generator = GENERATORS.find(g => g.id === generatorId);
    if (generator && count > 0) {
      production += generator.baseProduction * count;
    }
  }

  // Apply upgrade multipliers
  for (const upgradeId of (state.purchasedUpgrades || [])) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (upgrade?.effect === 'production_multiplier') {
      production *= upgrade.value;
    } else if (upgrade?.effect === 'production_bonus') {
      production += upgrade.value;
    }
  }

  // Apply prestige upgrades
  const productionPrestige = state.prestigeUpgrades?.production_boost || 0;
  if (productionPrestige > 0) {
    const prestigeUpgrade = PRESTIGE_UPGRADES.find(u => u.id === 'production_boost');
    if (prestigeUpgrade) {
      production *= 1 + (productionPrestige * prestigeUpgrade.valuePerLevel);
    }
  }

  // Apply character bonuses
  if (state.characterBonus?.production) {
    production *= 1 + state.characterBonus.production;
  }

  // Apply infusion bonus
  if (state.infusion?.totalBonus) {
    production *= 1 + state.infusion.totalBonus;
  }

  return production;
}

/**
 * Calculate click power
 * @param {Object} state - Current state
 * @returns {number} Click power
 */
function calculateClickPower(state) {
  let clickPower = GAME_CONFIG.baseClickPower || 1;

  // Apply upgrade effects
  for (const upgradeId of (state.purchasedUpgrades || [])) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (upgrade?.effect === 'click_power') {
      clickPower += upgrade.value;
    } else if (upgrade?.effect === 'click_multiplier') {
      clickPower *= upgrade.value;
    }
  }

  // Apply prestige upgrades
  const clickPrestige = state.prestigeUpgrades?.click_power || 0;
  if (clickPrestige > 0) {
    const prestigeUpgrade = PRESTIGE_UPGRADES.find(u => u.id === 'click_power');
    if (prestigeUpgrade) {
      clickPower *= 1 + (clickPrestige * prestigeUpgrade.valuePerLevel);
    }
  }

  // Apply character bonuses
  if (state.characterBonus?.clickPower) {
    clickPower *= 1 + state.characterBonus.clickPower;
  }

  return clickPower;
}

/**
 * Calculate crit chance
 * @param {Object} state - Current state
 * @returns {number} Crit chance (0-1)
 */
function calculateCritChance(state) {
  let critChance = GAME_CONFIG.baseCritChance || 0.01;

  // Apply upgrade effects
  for (const upgradeId of (state.purchasedUpgrades || [])) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (upgrade?.effect === 'crit_chance') {
      critChance += upgrade.value;
    }
  }

  // Apply prestige upgrades
  const critPrestige = state.prestigeUpgrades?.crit_chance || 0;
  if (critPrestige > 0) {
    const prestigeUpgrade = PRESTIGE_UPGRADES.find(u => u.id === 'crit_chance');
    if (prestigeUpgrade) {
      critChance += critPrestige * prestigeUpgrade.valuePerLevel;
    }
  }

  // Apply character bonuses
  if (state.characterBonus?.critChance) {
    critChance += state.characterBonus.critChance;
  }

  // Cap at 100%
  return Math.min(critChance, 1);
}

/**
 * Calculate crit multiplier
 * @param {Object} state - Current state
 * @returns {number} Crit multiplier
 */
function calculateCritMultiplier(state) {
  let critMultiplier = GAME_CONFIG.baseCritMultiplier || 10;

  // Apply upgrade effects
  for (const upgradeId of (state.purchasedUpgrades || [])) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (upgrade?.effect === 'crit_multiplier') {
      critMultiplier += upgrade.value;
    }
  }

  // Apply prestige upgrades
  const critMultPrestige = state.prestigeUpgrades?.crit_multiplier || 0;
  if (critMultPrestige > 0) {
    const prestigeUpgrade = PRESTIGE_UPGRADES.find(u => u.id === 'crit_multiplier');
    if (prestigeUpgrade) {
      critMultiplier += critMultPrestige * prestigeUpgrade.valuePerLevel;
    }
  }

  // Apply character bonuses
  if (state.characterBonus?.critMultiplier) {
    critMultiplier += state.characterBonus.critMultiplier;
  }

  return critMultiplier;
}

/**
 * Recalculate all stats
 * @param {Object} state - Current state
 * @returns {Object} State with recalculated stats
 */
function recalculateStats(state) {
  return {
    ...state,
    clickPower: calculateClickPower(state),
    productionPerSecond: calculateProductionPerSecond(state),
    critChance: calculateCritChance(state),
    critMultiplier: calculateCritMultiplier(state)
  };
}

/**
 * Get session stats
 * @param {Object} state - Current state
 * @returns {Object} Session stats
 */
function getSessionStats(state) {
  return {
    clicks: state.sessionStats?.clicks || 0,
    essence: state.sessionStats?.essence || 0,
    maxCombo: state.sessionStats?.maxCombo || 0,
    critStreak: state.sessionStats?.critStreak || 0,
    maxCritStreak: state.sessionStats?.maxCritStreak || 0,
    claimedSessionMilestones: state.sessionStats?.claimedSessionMilestones || [],
    claimedComboMilestones: state.sessionStats?.claimedComboMilestones || [],
    claimedCritMilestones: state.sessionStats?.claimedCritMilestones || []
  };
}

module.exports = {
  calculateProductionPerSecond,
  calculateClickPower,
  calculateCritChance,
  calculateCritMultiplier,
  recalculateStats,
  getSessionStats
};
