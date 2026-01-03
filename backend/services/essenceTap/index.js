/**
 * Essence Tap Service - Main Entry Point
 *
 * Re-exports all domain services for backward compatibility.
 * New code should import from specific domain modules or the domains index.
 *
 * Module Structure:
 *   - calculations/  - Pure calculation functions (no side effects)
 *   - core/          - Core services (state, stats, tap)
 *   - domains/       - Domain services organized by feature
 *   - actions/       - Unified action handlers for REST + WebSocket (RECOMMENDED)
 *   - *Service.js    - Legacy domain-specific services (for backward compatibility)
 *
 * Recommended Import Patterns:
 *   // New code - use actions (unified handlers for routes + websocket)
 *   const { actions } = require('./services/essenceTap');
 *   const result = actions.purchaseGenerator({ state, generatorId });
 *
 *   // Domain services - for feature-specific logic
 *   const { click, generator, prestige } = require('./services/essenceTap/domains');
 *
 *   // Legacy code - direct imports still work
 *   const essenceTap = require('./services/essenceTap');
 */

// Pure calculation functions
const calculations = require('./calculations');

// Type definitions (for JSDoc)
require('./types');

// Validation utilities
const validation = require('./validation');

// Core services
const stateService = require('./core/state.service');
const statsService = require('./core/stats.service');
const tapService = require('./core/tap.service');

// Domain services (organized by feature)
const domains = require('./domains');

// Unified action handlers (for REST + WebSocket)
const actions = require('./actions');

// Individual domain services (for backward compatibility)
const clickService = require('./clickService');
const generatorService = require('./generatorService');
const upgradeService = require('./upgradeService');
const prestigeService = require('./prestigeService');
const characterService = require('./characterService');

// Re-export from legacy service for backward compatibility
// This allows gradual migration without breaking existing code
const legacyService = require('../essenceTapService');

module.exports = {
  // ========================================
  // RECOMMENDED: Unified Action Handlers
  // ========================================
  // Use these for new routes and WebSocket handlers
  // Each action handles validation, business logic, and returns new state
  actions,

  // ========================================
  // Domain Services
  // ========================================
  // Use these for new code - organized by game feature
  domains,

  // Quick access to domain services (same as domains.click, domains.generator, etc.)
  click: domains.click,
  generator: domains.generator,
  upgrade: domains.upgrade,
  prestige: domains.prestige,
  character: domains.character,

  // ========================================
  // CORE SERVICES
  // ========================================
  // State management
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

  // ========================================
  // LEGACY API (Backward Compatibility)
  // ========================================
  // These forward to the legacy service for features not yet refactored
  // Will be migrated to domain modules over time
  purchaseGenerator: legacyService.purchaseGenerator,
  getGeneratorInfo: legacyService.getGeneratorInfo,
  getAvailableGenerators: legacyService.getAvailableGenerators,

  purchaseUpgrade: legacyService.purchaseUpgrade,
  getUpgradeCost: legacyService.getUpgradeCost,
  getAvailableUpgrades: legacyService.getAvailableUpgrades,

  activateAbility: legacyService.activateAbility,
  processActiveAbilities: legacyService.processActiveAbilities,
  getAbilityInfo: legacyService.getAbilityInfo,

  // Note: prestige domain exposed above via domains.prestige
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

  // ========================================
  // UTILITIES & CALCULATIONS
  // ========================================
  // Calculation modules
  calculations,

  // Legacy service modules (still available for backward compatibility)
  clickService,
  generatorService,
  upgradeService,
  prestigeService,
  characterService,

  // Common calculation functions re-exported at top level
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
  calculateComboMultiplier: calculations.calculateComboMultiplier,

  // ========================================
  // VALIDATION UTILITIES
  // ========================================
  validation,
  validateGeneratorPurchase: validation.validateGeneratorPurchase,
  validateUpgradePurchase: validation.validateUpgradePurchase,
  validateGamble: validation.validateGamble,
  validateCharacterAssign: validation.validateCharacterAssign,
  validateBossAttack: validation.validateBossAttack,
  validateClicks: validation.validateClicks
};
