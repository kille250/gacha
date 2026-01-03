/**
 * Click Calculation Functions
 *
 * Pure functions for click/tap-related calculations.
 * These can be used by service, routes, and websocket handler.
 */

const { GAME_CONFIG } = require('../../../config/essenceTap');
const { calculateClickPowerFromUpgrades, calculateCritChanceFromUpgrades, calculateCritMultiplierFromUpgrades } = require('./upgrades');
const { calculatePrestigeUpgradeBonus } = require('./prestige');
const {
  calculateGlobalMultiplier,
  calculateShardBonus,
  calculateCharacterBonus,
  calculateElementBonuses,
  calculateElementSynergy,
  calculateSeriesSynergy,
  calculateTotalMasteryBonus,
  calculateClickGeneratorScaling,
  calculateUnderdogBonus,
  getCurrentDailyModifier
} = require('./multipliers');

/**
 * Calculate total click power for a state
 * @param {Object} state - Player state
 * @param {Array} characters - User's character collection
 * @returns {number} Total click power
 */
function calculateClickPower(state, characters = []) {
  let power = GAME_CONFIG.baseClickPower;

  // Add from purchased click upgrades
  power += calculateClickPowerFromUpgrades(state.purchasedUpgrades);

  // Add from prestige upgrades
  const prestigeClickBonus = calculatePrestigeUpgradeBonus('prestige_click', state.prestigeUpgrades?.prestige_click || 0);
  power += prestigeClickBonus;

  // Apply character rarity bonuses
  const characterMultiplier = calculateCharacterBonus(state.assignedCharacters, characters);
  power *= characterMultiplier;

  // Apply element-based click power bonus (Dark element)
  const elementBonuses = calculateElementBonuses(state.assignedCharacters, characters);
  power *= (1 + elementBonuses.clickPower + elementBonuses.allStats);

  // Apply element synergy bonus
  const synergy = calculateElementSynergy(state.assignedCharacters, characters);
  power *= (1 + synergy.bonus);

  // Apply series synergy bonus
  const seriesSynergy = calculateSeriesSynergy(state.assignedCharacters, characters);
  power *= (1 + seriesSynergy.totalBonus);

  // Apply character mastery bonus
  const masteryBonus = calculateTotalMasteryBonus(state.assignedCharacters, state.characterMastery);
  power *= (1 + masteryBonus.productionBonus);

  // Apply click power scaling from generators (keeps clicking relevant)
  const generatorScaling = calculateClickGeneratorScaling(state.generators);
  power *= generatorScaling;

  // Apply underdog bonus for using common/uncommon characters
  const underdogBonus = calculateUnderdogBonus(state.assignedCharacters, characters);
  power *= (1 + underdogBonus);

  // Apply global multipliers
  const globalMult = calculateGlobalMultiplier(state.purchasedUpgrades);
  power *= globalMult;

  // Apply prestige shard bonus
  const shardBonus = calculateShardBonus(state.lifetimeShards);
  power *= shardBonus;

  // Apply infusion bonus
  const infusionBonus = state.infusionBonus || 0;
  power *= (1 + infusionBonus);

  // Apply daily modifier click power bonus
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.clickPowerBonus) {
    power *= (1 + dailyMod.effects.clickPowerBonus);
  }

  return Math.floor(power);
}

/**
 * Calculate critical hit chance
 * @param {Object} state - Player state
 * @param {Array} characters - User's character collection
 * @param {Object} essenceTypeBonuses - Bonuses from essence types (optional)
 * @returns {number} Crit chance (0-1)
 */
function calculateCritChance(state, characters = [], essenceTypeBonuses = null) {
  let chance = GAME_CONFIG.baseCritChance;

  // Add from purchased crit upgrades
  chance += calculateCritChanceFromUpgrades(state.purchasedUpgrades);

  // Add from prestige upgrades
  const prestigeCritBonus = calculatePrestigeUpgradeBonus('prestige_crit', state.prestigeUpgrades?.prestige_crit || 0);
  chance += prestigeCritBonus;

  // Add element-based crit bonus (Fire element)
  const elementBonuses = calculateElementBonuses(state.assignedCharacters, characters);
  chance += elementBonuses.critChance + elementBonuses.allStats;

  // Apply daily modifier crit bonus
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.critChanceBonus) {
    chance += dailyMod.effects.critChanceBonus;
  }

  // Apply essence type bonuses if provided
  if (essenceTypeBonuses && essenceTypeBonuses.critBonus) {
    chance += essenceTypeBonuses.critBonus;
  }

  return Math.min(chance, 0.9); // Cap at 90%
}

/**
 * Calculate critical hit multiplier
 * @param {Object} state - Player state
 * @returns {number} Crit multiplier
 */
function calculateCritMultiplier(state) {
  let mult = GAME_CONFIG.baseCritMultiplier;

  // Add from purchased crit multiplier upgrades
  mult += calculateCritMultiplierFromUpgrades(state.purchasedUpgrades);

  // Apply daily modifier crit multiplier bonus
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.critMultiplierBonus) {
    mult *= dailyMod.effects.critMultiplierBonus;
  }

  return mult;
}

/**
 * Calculate golden essence chance including all bonuses
 * @param {Object} state - Player state
 * @param {Array} characters - User's character collection
 * @param {Object} essenceTypeBonuses - Bonuses from essence types (optional)
 * @returns {number} Golden essence chance (0-1)
 */
function calculateGoldenChance(state, characters = [], essenceTypeBonuses = null) {
  let chance = GAME_CONFIG.goldenEssenceChance;

  // Add element-based golden chance bonus (Light element)
  const elementBonuses = calculateElementBonuses(state.assignedCharacters, characters);
  chance += elementBonuses.goldenChance + (elementBonuses.allStats * 0.001);

  // Apply daily modifier golden chance multiplier
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.goldenChanceMultiplier) {
    chance *= dailyMod.effects.goldenChanceMultiplier;
  }

  // Apply essence type bonuses if provided
  if (essenceTypeBonuses && essenceTypeBonuses.goldenBonus) {
    chance += essenceTypeBonuses.goldenBonus;
  }

  return Math.min(chance, 0.1); // Cap at 10%
}

/**
 * Calculate combo decay time including all bonuses
 * @param {Object} state - Player state
 * @param {Array} characters - User's character collection
 * @returns {number} Combo decay time in ms
 */
function calculateComboDecayTime(state, characters = []) {
  let decayTime = GAME_CONFIG.comboDecayTime;

  // Add element-based combo duration bonus (Air element)
  const elementBonuses = calculateElementBonuses(state.assignedCharacters, characters);
  decayTime += elementBonuses.comboDuration;

  // Apply daily modifier combo growth multiplier (affects decay inversely)
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.comboGrowthMultiplier) {
    decayTime *= dailyMod.effects.comboGrowthMultiplier;
  }

  return decayTime;
}

/**
 * Calculate combo multiplier from combo count
 * @param {number} comboCount - Current combo count
 * @returns {number} Combo multiplier
 */
function calculateComboMultiplier(comboCount) {
  if (comboCount <= 0) return 1;

  const multiplierPerCombo = GAME_CONFIG.comboMultiplierPerClick || 0.01;
  const maxComboMultiplier = GAME_CONFIG.maxComboMultiplier || 5;

  return Math.min(1 + (comboCount * multiplierPerCombo), maxComboMultiplier);
}

/**
 * Process a click/tap action (pure calculation, no side effects)
 * @param {Object} params - Click parameters
 * @param {Object} params.state - Player state
 * @param {Array} params.characters - User's character collection
 * @param {number} params.comboMultiplier - Current combo multiplier
 * @param {Object} params.activeAbilityEffects - Currently active ability effects
 * @param {Object} params.essenceTypeBonuses - Bonuses from essence types
 * @returns {Object} Click result
 */
function calculateClickResult({ state, characters = [], comboMultiplier = 1, activeAbilityEffects = {}, essenceTypeBonuses = null }) {
  const clickPower = calculateClickPower(state, characters);
  const critChance = calculateCritChance(state, characters, essenceTypeBonuses);
  const critMultiplier = calculateCritMultiplier(state);
  const goldenChance = calculateGoldenChance(state, characters, essenceTypeBonuses);

  // Check for guaranteed crits from active ability
  const isCrit = activeAbilityEffects.guaranteedCrits || Math.random() < critChance;

  // Calculate golden chance with ability boost
  let effectiveGoldenChance = goldenChance;
  if (activeAbilityEffects.goldenChanceMultiplier) {
    effectiveGoldenChance *= activeAbilityEffects.goldenChanceMultiplier;
  }
  const isGolden = Math.random() < effectiveGoldenChance;

  let essenceGained = clickPower * comboMultiplier;

  // Apply active ability production multiplier
  if (activeAbilityEffects.productionMultiplier) {
    essenceGained *= activeAbilityEffects.productionMultiplier;
  }

  if (isCrit) {
    essenceGained *= critMultiplier;
  }

  if (isGolden) {
    essenceGained *= GAME_CONFIG.goldenEssenceMultiplier;
  }

  essenceGained = Math.floor(essenceGained);

  return {
    essenceGained,
    isCrit,
    isGolden,
    clickPower,
    comboMultiplier,
    critChance,
    critMultiplier,
    goldenChance: effectiveGoldenChance
  };
}

module.exports = {
  calculateClickPower,
  calculateCritChance,
  calculateCritMultiplier,
  calculateGoldenChance,
  calculateComboDecayTime,
  calculateComboMultiplier,
  calculateClickResult,
  GAME_CONFIG
};
