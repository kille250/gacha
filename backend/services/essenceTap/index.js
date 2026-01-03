/**
 * Essence Tap Service - Main Entry Point
 *
 * Re-exports all domain services for backward compatibility.
 * New code should import from specific domain modules.
 *
 * Module Structure:
 *   - calculations/  - Pure calculation functions (no side effects)
 *   - core/          - Core services (state, stats, tap)
 *   - *Service.js    - Domain-specific services
 */

// Pure calculation functions
const calculations = require('./calculations');

// Core services
const stateService = require('./core/state.service');
const statsService = require('./core/stats.service');
const tapService = require('./core/tap.service');

// Domain services
const clickService = require('./clickService');
const generatorService = require('./generatorService');
const upgradeService = require('./upgradeService');
const prestigeService = require('./prestigeService');
const characterService = require('./characterService');

// Re-export from legacy service for backward compatibility
// This allows gradual migration without breaking existing code
const legacyService = require('../essenceTapService');

module.exports = {
  // Core state management
  getInitialState: stateService.getInitialState,
  resetDaily: stateService.resetDaily,
  getCurrentISOWeek: stateService.getCurrentISOWeek,
  resetWeeklyFPIfNeeded: stateService.resetWeeklyFPIfNeeded,
  applyFPWithCap: stateService.applyFPWithCap,
  getWeeklyFPBudget: stateService.getWeeklyFPBudget,
  calculateOfflineProgress: stateService.calculateOfflineProgress,

  // Stats
  calculateProductionPerSecond: statsService.calculateProductionPerSecond,
  calculateClickPower: statsService.calculateClickPower,
  calculateCritChance: statsService.calculateCritChance,
  calculateCritMultiplier: statsService.calculateCritMultiplier,
  recalculateStats: statsService.recalculateStats,
  getSessionStats: statsService.getSessionStats,

  // Taps
  processTap: tapService.processTap,
  processMultipleTaps: tapService.processMultipleTaps,
  checkTapChallenges: tapService.checkTapChallenges,

  // Forward all other functions to legacy service
  // These will be migrated to domain modules over time
  purchaseGenerator: legacyService.purchaseGenerator,
  getGeneratorInfo: legacyService.getGeneratorInfo,
  getAvailableGenerators: legacyService.getAvailableGenerators,

  purchaseUpgrade: legacyService.purchaseUpgrade,
  getUpgradeCost: legacyService.getUpgradeCost,
  getAvailableUpgrades: legacyService.getAvailableUpgrades,

  activateAbility: legacyService.activateAbility,
  processActiveAbilities: legacyService.processActiveAbilities,
  getAbilityInfo: legacyService.getAbilityInfo,

  prestige: legacyService.prestige,
  getPrestigeInfo: legacyService.getPrestigeInfo,
  purchasePrestigeUpgrade: legacyService.purchasePrestigeUpgrade,
  calculatePrestigeRewards: legacyService.calculatePrestigeRewards,

  gamble: legacyService.gamble,
  checkJackpot: legacyService.checkJackpot,
  resetJackpot: legacyService.resetJackpot,
  getGambleInfo: legacyService.getGambleInfo,

  performInfusion: legacyService.performInfusion,
  getInfusionInfo: legacyService.getInfusionInfo,

  spawnBoss: legacyService.spawnBoss,
  attackBoss: legacyService.attackBoss,
  claimBossReward: legacyService.claimBossReward,
  getBossInfo: legacyService.getBossInfo,

  checkDailyChallenges: legacyService.checkDailyChallenges,
  claimDailyChallenge: legacyService.claimDailyChallenge,
  getDailyChallengesWithProgress: legacyService.getDailyChallengesWithProgress,

  checkMilestones: legacyService.checkMilestones,
  claimMilestone: legacyService.claimMilestone,
  checkRepeatableMilestones: legacyService.checkRepeatableMilestones,
  claimRepeatableMilestone: legacyService.claimRepeatableMilestone,

  updateWeeklyProgress: legacyService.updateWeeklyProgress,
  getWeeklyTournamentInfo: legacyService.getWeeklyTournamentInfo,
  claimWeeklyRewards: legacyService.claimWeeklyRewards,
  claimTournamentCheckpoint: legacyService.claimTournamentCheckpoint,

  assignCharacter: legacyService.assignCharacter,
  unassignCharacter: legacyService.unassignCharacter,
  calculateCharacterBonuses: legacyService.calculateCharacterBonuses,
  getSynergyInfo: legacyService.getSynergyInfo,

  checkDailyStreakTickets: legacyService.checkDailyStreakTickets,
  exchangeFatePointsForTickets: legacyService.exchangeFatePointsForTickets,

  getGameConfig: legacyService.getGameConfig,

  // New modular services - prefer these for new code
  calculations,
  clickService,
  generatorService,
  upgradeService,
  prestigeService,
  characterService,

  // Re-export key calculation functions at top level
  formatNumber: calculations.formatNumber,
  formatPerSecond: calculations.formatPerSecond,
  calculatePrestigeShards: calculations.calculatePrestigeShards,
  getGeneratorCost: calculations.getGeneratorCost,
  getBulkGeneratorCost: calculations.getBulkGeneratorCost,
  getMaxPurchasable: calculations.getMaxPurchasable,
  calculateGlobalMultiplier: calculations.calculateGlobalMultiplier,
  calculateShardBonus: calculations.calculateShardBonus,
  calculateCharacterBonus: calculations.calculateCharacterBonus,
  calculateElementBonuses: calculations.calculateElementBonuses,
  calculateElementSynergy: calculations.calculateElementSynergy,
  calculateSeriesSynergy: calculations.calculateSeriesSynergy,
  calculateComboMultiplier: calculations.calculateComboMultiplier
};
