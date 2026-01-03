/**
 * Essence Tap Calculations Module
 *
 * This module exports all pure calculation functions for the Essence Tap minigame.
 * These functions can be imported by the service layer, routes, and websocket handlers
 * to ensure consistent calculations across the codebase.
 *
 * IMPORTANT: All functions in this module should be pure (no side effects).
 * They should not modify state, access databases, or make network calls.
 */

// Generator calculations
const generators = require('./generators');

// Multiplier calculations
const multipliers = require('./multipliers');

// Prestige calculations
const prestige = require('./prestige');

// Upgrade calculations
const upgrades = require('./upgrades');

// Click calculations
const clicks = require('./clicks');

// Production calculations
const production = require('./production');

// Utility functions
const utils = require('./utils');

module.exports = {
  // Generator functions
  getGeneratorCost: generators.getGeneratorCost,
  getBulkGeneratorCost: generators.getBulkGeneratorCost,
  getMaxPurchasable: generators.getMaxPurchasable,
  calculateGeneratorBaseProduction: generators.calculateGeneratorBaseProduction,
  calculateTotalBaseProduction: generators.calculateTotalBaseProduction,
  getGeneratorById: generators.getGeneratorById,
  isGeneratorUnlocked: generators.isGeneratorUnlocked,

  // Multiplier functions
  calculateGlobalMultiplier: multipliers.calculateGlobalMultiplier,
  calculateShardBonus: multipliers.calculateShardBonus,
  calculateCharacterBonus: multipliers.calculateCharacterBonus,
  calculateElementBonuses: multipliers.calculateElementBonuses,
  calculateElementSynergy: multipliers.calculateElementSynergy,
  calculateSeriesSynergy: multipliers.calculateSeriesSynergy,
  calculateCharacterMastery: multipliers.calculateCharacterMastery,
  calculateTotalMasteryBonus: multipliers.calculateTotalMasteryBonus,
  calculateClickGeneratorScaling: multipliers.calculateClickGeneratorScaling,
  calculateUnderdogBonus: multipliers.calculateUnderdogBonus,
  getCurrentDailyModifier: multipliers.getCurrentDailyModifier,
  getTimeUntilNextModifier: multipliers.getTimeUntilNextModifier,

  // Prestige functions
  calculatePrestigeShards: prestige.calculatePrestigeShards,
  canPrestige: prestige.canPrestige,
  calculatePrestigeUpgradeCost: prestige.calculatePrestigeUpgradeCost,
  isPrestigeUpgradeMaxed: prestige.isPrestigeUpgradeMaxed,
  getPrestigeUpgradeById: prestige.getPrestigeUpgradeById,
  calculatePrestigeUpgradeBonus: prestige.calculatePrestigeUpgradeBonus,
  calculateStartingEssence: prestige.calculateStartingEssence,
  checkPrestigeCooldown: prestige.checkPrestigeCooldown,
  getPrestigeInfo: prestige.getPrestigeInfo,

  // Upgrade functions
  getAllUpgrades: upgrades.getAllUpgrades,
  getUpgradeById: upgrades.getUpgradeById,
  isUpgradePurchased: upgrades.isUpgradePurchased,
  isUpgradeUnlocked: upgrades.isUpgradeUnlocked,
  meetsGeneratorRequirement: upgrades.meetsGeneratorRequirement,
  canAffordUpgrade: upgrades.canAffordUpgrade,
  getUpgradeStatus: upgrades.getUpgradeStatus,
  calculateClickPowerFromUpgrades: upgrades.calculateClickPowerFromUpgrades,
  calculateCritChanceFromUpgrades: upgrades.calculateCritChanceFromUpgrades,
  calculateCritMultiplierFromUpgrades: upgrades.calculateCritMultiplierFromUpgrades,
  getAvailableUpgrades: upgrades.getAvailableUpgrades,

  // Click functions
  calculateClickPower: clicks.calculateClickPower,
  calculateCritChance: clicks.calculateCritChance,
  calculateCritMultiplier: clicks.calculateCritMultiplier,
  calculateGoldenChance: clicks.calculateGoldenChance,
  calculateComboDecayTime: clicks.calculateComboDecayTime,
  calculateComboMultiplier: clicks.calculateComboMultiplier,
  calculateClickResult: clicks.calculateClickResult,

  // Production functions
  calculateProductionPerSecond: production.calculateProductionPerSecond,
  calculateOfflineEfficiency: production.calculateOfflineEfficiency,
  calculateOfflineProgress: production.calculateOfflineProgress,
  calculateEssenceForTimePeriod: production.calculateEssenceForTimePeriod,

  // Utility functions
  formatNumber: utils.formatNumber,
  formatPerSecond: utils.formatPerSecond,
  formatSessionDuration: utils.formatSessionDuration,
  formatTimeRemaining: utils.formatTimeRemaining,
  getCurrentWeekId: utils.getCurrentWeekId,
  getTodayDateString: utils.getTodayDateString,
  clamp: utils.clamp,
  safeParseNumber: utils.safeParseNumber,
  safeParsePositiveInt: utils.safeParsePositiveInt,
  calculatePercentage: utils.calculatePercentage,
  deepClone: utils.deepClone,
  mergeWithDefaults: utils.mergeWithDefaults,

  // Re-export config constants for convenience
  GENERATORS: generators.GENERATORS,
  PRESTIGE_CONFIG: prestige.PRESTIGE_CONFIG,
  GAME_CONFIG: clicks.GAME_CONFIG,
  CLICK_UPGRADES: upgrades.CLICK_UPGRADES,
  GENERATOR_UPGRADES: upgrades.GENERATOR_UPGRADES,
  GLOBAL_UPGRADES: upgrades.GLOBAL_UPGRADES,
  SYNERGY_UPGRADES: upgrades.SYNERGY_UPGRADES,

  // Sub-modules for more specific imports
  generators,
  multipliers,
  prestige,
  upgrades,
  clicks,
  production,
  utils
};
