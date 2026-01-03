/**
 * Production Calculation Functions
 *
 * Pure functions for calculating generator production and offline progress.
 * These can be used by service, routes, and websocket handler.
 */

const { GAME_CONFIG } = require('../../../config/essenceTap');
const { calculateTotalBaseProduction } = require('./generators');
const { calculatePrestigeUpgradeBonus } = require('./prestige');
const {
  calculateGlobalMultiplier,
  calculateShardBonus,
  calculateCharacterBonus,
  calculateElementBonuses,
  calculateElementSynergy,
  calculateSeriesSynergy,
  calculateTotalMasteryBonus,
  calculateUnderdogBonus,
  getCurrentDailyModifier
} = require('./multipliers');

/**
 * Calculate production per second from generators with all multipliers
 * @param {Object} state - Player state
 * @param {Array} characters - User's character collection
 * @param {Object} essenceTypeBonuses - Bonuses from essence types (optional)
 * @returns {number} Essence per second
 */
function calculateProductionPerSecond(state, characters = [], essenceTypeBonuses = null) {
  // Calculate base production from generators
  let total = calculateTotalBaseProduction(state.generators, state.purchasedUpgrades);

  // Apply global multipliers
  const globalMult = calculateGlobalMultiplier(state.purchasedUpgrades);
  total *= globalMult;

  // Apply character rarity bonuses
  const characterMultiplier = calculateCharacterBonus(state.assignedCharacters, characters);
  total *= characterMultiplier;

  // Apply element-based production bonus (Water element)
  const elementBonuses = calculateElementBonuses(state.assignedCharacters, characters);
  total *= (1 + elementBonuses.production + elementBonuses.allStats);

  // Apply element synergy bonus
  const synergy = calculateElementSynergy(state.assignedCharacters, characters);
  total *= (1 + synergy.bonus);

  // Apply series synergy bonus
  const seriesSynergy = calculateSeriesSynergy(state.assignedCharacters, characters);
  total *= (1 + seriesSynergy.totalBonus);

  // Apply character mastery bonus
  const masteryBonus = calculateTotalMasteryBonus(state.assignedCharacters, state.characterMastery);
  total *= (1 + masteryBonus.productionBonus);

  // Apply underdog bonus for using common/uncommon characters
  const underdogBonus = calculateUnderdogBonus(state.assignedCharacters, characters);
  total *= (1 + underdogBonus);

  // Apply prestige shard bonus
  const shardBonus = calculateShardBonus(state.lifetimeShards);
  total *= shardBonus;

  // Apply prestige production upgrade
  const prestigeProdBonus = calculatePrestigeUpgradeBonus('prestige_production', state.prestigeUpgrades?.prestige_production || 0);
  total *= (1 + prestigeProdBonus);

  // Apply infusion bonus
  const infusionBonus = state.infusionBonus || 0;
  total *= (1 + infusionBonus);

  // Apply daily modifier generator/production bonuses
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.generatorOutputBonus) {
    total *= (1 + dailyMod.effects.generatorOutputBonus);
  }
  if (dailyMod.effects?.allProductionBonus) {
    total *= (1 + dailyMod.effects.allProductionBonus);
  }

  // Apply essence type bonuses if provided
  if (essenceTypeBonuses && essenceTypeBonuses.productionBonus) {
    total *= (1 + essenceTypeBonuses.productionBonus);
  }

  return total;
}

/**
 * Calculate offline efficiency including all bonuses
 * @param {Object} state - Player state
 * @param {Array} characters - User's character collection
 * @returns {number} Offline efficiency (0-1)
 */
function calculateOfflineEfficiency(state, characters = []) {
  // Base offline efficiency
  let offlineEfficiency = GAME_CONFIG.offlineEfficiency;

  // Add prestige offline bonus
  const prestigeOfflineBonus = calculatePrestigeUpgradeBonus('prestige_offline', state.prestigeUpgrades?.prestige_offline || 0);
  offlineEfficiency += prestigeOfflineBonus;

  // Add element-based offline bonus (Earth element)
  const elementBonuses = calculateElementBonuses(state.assignedCharacters, characters);
  offlineEfficiency += elementBonuses.offline + elementBonuses.allStats;

  // Cap at 100%
  return Math.min(offlineEfficiency, 1.0);
}

/**
 * Calculate offline progress
 * @param {Object} state - Player state
 * @param {Array} characters - User's character collection
 * @param {number} currentTime - Current timestamp (default: now)
 * @returns {Object} Offline progress data
 */
function calculateOfflineProgress(state, characters = [], currentTime = Date.now()) {
  const lastOnline = state.lastOnlineTimestamp || currentTime;
  const elapsedMs = Math.max(0, currentTime - lastOnline);
  const elapsedHours = Math.min(elapsedMs / (1000 * 60 * 60), GAME_CONFIG.maxOfflineHours);

  if (elapsedHours < 0.01) { // Less than ~36 seconds
    return { essenceEarned: 0, hoursAway: 0 };
  }

  const productionPerSecond = calculateProductionPerSecond(state, characters);
  const offlineEfficiency = calculateOfflineEfficiency(state, characters);

  const essenceEarned = Math.floor(productionPerSecond * elapsedHours * 3600 * offlineEfficiency);

  return {
    essenceEarned,
    hoursAway: elapsedHours,
    productionRate: productionPerSecond,
    efficiency: offlineEfficiency
  };
}

/**
 * Calculate essence earned over a time period with active abilities
 * @param {Object} params - Parameters
 * @param {Object} params.state - Player state
 * @param {Array} params.characters - User's character collection
 * @param {number} params.seconds - Time period in seconds
 * @param {Object} params.activeAbilityEffects - Currently active ability effects
 * @returns {number} Essence earned
 */
function calculateEssenceForTimePeriod({ state, characters = [], seconds, activeAbilityEffects = {} }) {
  let productionPerSecond = calculateProductionPerSecond(state, characters);

  // Apply active ability production multiplier
  if (activeAbilityEffects.productionMultiplier) {
    productionPerSecond *= activeAbilityEffects.productionMultiplier;
  }

  return Math.floor(productionPerSecond * seconds);
}

module.exports = {
  calculateProductionPerSecond,
  calculateOfflineEfficiency,
  calculateOfflineProgress,
  calculateEssenceForTimePeriod
};
