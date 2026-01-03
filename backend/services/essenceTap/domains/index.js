/**
 * Essence Tap Domain Services Index
 *
 * This module provides a clean public API for all Essence Tap domain services.
 * Domain services encapsulate business logic for specific game features.
 *
 * Architecture:
 *   - Each domain service handles a specific game feature
 *   - Services are pure business logic with no HTTP/route knowledge
 *   - All services operate on game state objects
 *   - Services can call calculations but not other services (to prevent coupling)
 *
 * Available Domains:
 *   - click: Click mechanics, combos, critical hits
 *   - generator: Passive essence generators
 *   - upgrade: Upgrade purchasing and management
 *   - prestige: Prestige/awakening system
 *   - character: Character assignment and bonuses
 *   - gamble: Risk/reward gambling mechanics
 *   - boss: Boss encounter system
 *   - ability: Active ability system
 *   - milestone: Achievement milestones
 *   - tournament: Weekly tournament system
 *   - ticket: Ticket generation and exchange
 *   - infusion: Essence infusion mechanics
 */

const clickService = require('../clickService');
const generatorService = require('../generatorService');
const upgradeService = require('../upgradeService');
const prestigeService = require('../prestigeService');
const characterService = require('../characterService');
const gambleService = require('./gamble.service');
const bossService = require('./boss.service');
const abilityService = require('./ability.service');
const milestoneService = require('./milestone.service');
const tournamentService = require('./tournament.service');
const ticketService = require('./ticket.service');
const infusionService = require('./infusion.service');

/**
 * Click Domain
 * Handles all clicking mechanics including taps, combos, and critical hits
 */
const click = {
  // Core tap mechanics
  processTap: clickService.processTap,
  processMultipleTaps: clickService.processMultipleTaps,

  // Stats calculations
  calculateClickPower: clickService.calculateClickPower,
  calculateCritChance: clickService.calculateCritChance,
  calculateCritMultiplier: clickService.calculateCritMultiplier,

  // Combo system
  updateCombo: clickService.updateCombo,
  resetCombo: clickService.resetCombo,
  getComboMultiplier: clickService.getComboMultiplier,

  // Challenge checking
  checkTapChallenges: clickService.checkTapChallenges
};

/**
 * Generator Domain
 * Handles passive essence generation from purchased generators
 */
const generator = {
  // Purchase mechanics
  purchaseGenerator: generatorService.purchaseGenerator,
  purchaseGeneratorBulk: generatorService.purchaseGeneratorBulk,

  // Generator info
  getGeneratorInfo: generatorService.getGeneratorInfo,
  getAvailableGenerators: generatorService.getAvailableGenerators,
  getAllGeneratorsInfo: generatorService.getAllGeneratorsInfo,

  // Production calculations
  calculateGeneratorOutput: generatorService.calculateGeneratorOutput,
  calculateTotalProduction: generatorService.calculateTotalProduction,

  // Cost calculations
  getGeneratorCost: generatorService.getGeneratorCost,
  getBulkCost: generatorService.getBulkCost
};

/**
 * Upgrade Domain
 * Handles all upgrade types (click, generator, global, synergy)
 */
const upgrade = {
  // Purchase mechanics
  purchaseUpgrade: upgradeService.purchaseUpgrade,
  canPurchaseUpgrade: upgradeService.canPurchaseUpgrade,

  // Upgrade info
  getUpgradeCost: upgradeService.getUpgradeCost,
  getAvailableUpgrades: upgradeService.getAvailableUpgrades,
  getAllUpgrades: upgradeService.getAllUpgrades,

  // Upgrade effects
  applyUpgradeEffects: upgradeService.applyUpgradeEffects,
  calculateUpgradeBonus: upgradeService.calculateUpgradeBonus
};

/**
 * Prestige Domain
 * Handles prestige/awakening mechanics and permanent upgrades
 */
const prestige = {
  // Prestige mechanics
  prestige: prestigeService.prestige,
  canPrestige: prestigeService.canPrestige,

  // Prestige info
  getPrestigeInfo: prestigeService.getPrestigeInfo,
  calculatePrestigeRewards: prestigeService.calculatePrestigeRewards,

  // Prestige upgrades
  purchasePrestigeUpgrade: prestigeService.purchasePrestigeUpgrade,
  getPrestigeUpgradeCost: prestigeService.getPrestigeUpgradeCost,

  // Shard calculations
  calculateShards: prestigeService.calculateShards,
  calculateShardBonus: prestigeService.calculateShardBonus
};

/**
 * Character Domain
 * Handles character assignment and bonus calculations
 */
const character = {
  // Assignment mechanics
  assignCharacter: characterService.assignCharacter,
  unassignCharacter: characterService.unassignCharacter,
  canAssignCharacter: characterService.canAssignCharacter,

  // Bonus calculations
  calculateCharacterBonuses: characterService.calculateCharacterBonuses,
  calculateElementBonuses: characterService.calculateElementBonuses,
  calculateSeriesSynergy: characterService.calculateSeriesSynergy,

  // Character info
  getAssignedCharacters: characterService.getAssignedCharacters,
  getSynergyInfo: characterService.getSynergyInfo,

  // Mastery system
  updateMastery: characterService.updateMastery,
  getMasteryLevel: characterService.getMasteryLevel,
  getMasteryBonus: characterService.getMasteryBonus
};

/**
 * Gamble Domain
 * Handles risk/reward gambling mechanics and jackpot system
 */
const gamble = {
  // Gamble mechanics
  gamble: gambleService.gamble,
  getGambleInfo: gambleService.getGambleInfo,
  calculateGambleOutcome: gambleService.calculateGambleOutcome,

  // Jackpot system
  checkJackpot: gambleService.checkJackpot,
  resetJackpot: gambleService.resetJackpot
};

/**
 * Boss Domain
 * Handles boss encounter mechanics
 */
const boss = {
  // Boss spawning and combat
  spawnBoss: bossService.spawnBoss,
  attackBoss: bossService.attackBoss,
  claimBossReward: bossService.claimBossReward,

  // Boss info
  getBossInfo: bossService.getBossInfo,
  isBossActive: bossService.isBossActive,

  // Boss calculations
  calculateBossHealth: bossService.calculateBossHealth,
  getBossForPrestigeLevel: bossService.getBossForPrestigeLevel
};

/**
 * Ability Domain
 * Handles active ability system with cooldowns and effects
 */
const ability = {
  // Ability activation
  activateAbility: abilityService.activateAbility,
  processActiveAbilities: abilityService.processActiveAbilities,

  // Ability info
  getAbilityInfo: abilityService.getAbilityInfo,
  getActiveAbilityEffects: abilityService.getActiveAbilityEffects,
  isAbilityOnCooldown: abilityService.isAbilityOnCooldown
};

/**
 * Milestone Domain
 * Handles achievement milestones (one-time and repeatable)
 */
const milestone = {
  // One-time milestones
  checkMilestones: milestoneService.checkMilestones,
  claimMilestone: milestoneService.claimMilestone,

  // Repeatable milestones
  checkRepeatableMilestones: milestoneService.checkRepeatableMilestones,
  claimRepeatableMilestone: milestoneService.claimRepeatableMilestone,

  // Progress info
  getMilestoneProgress: milestoneService.getMilestoneProgress
};

/**
 * Tournament Domain
 * Handles weekly tournament system, leaderboards, and checkpoints
 */
const tournament = {
  // Weekly tournament
  updateWeeklyProgress: tournamentService.updateWeeklyProgress,
  getWeeklyTournamentInfo: tournamentService.getWeeklyTournamentInfo,
  claimWeeklyRewards: tournamentService.claimWeeklyRewards,

  // Checkpoints
  claimTournamentCheckpoint: tournamentService.claimTournamentCheckpoint,

  // Burning hour
  getBurningHourStatus: tournamentService.getBurningHourStatus,

  // Streak management
  checkDailyStreak: tournamentService.checkDailyStreak,
  updateStreak: tournamentService.updateStreak,

  // Cosmetics
  purchaseCosmetic: tournamentService.purchaseCosmetic,
  equipCosmetic: tournamentService.equipCosmetic
};

/**
 * Ticket Domain
 * Handles ticket generation, daily streak claiming, and fate point exchange
 */
const ticket = {
  // Daily streak
  checkDailyStreakTickets: ticketService.checkDailyStreakTickets,
  claimDailyStreak: ticketService.claimDailyStreak,

  // Fate points exchange
  exchangeFatePointsForTickets: ticketService.exchangeFatePointsForTickets,

  // Info
  getTicketGenerationInfo: ticketService.getTicketGenerationInfo
};

/**
 * Infusion Domain
 * Handles essence infusion mechanics for bonus effects
 */
const infusion = {
  // Infusion mechanics
  performInfusion: infusionService.performInfusion,
  getInfusionInfo: infusionService.getInfusionInfo,

  // Calculations
  calculateInfusionCost: infusionService.calculateInfusionCost,
  calculateInfusionBonus: infusionService.calculateInfusionBonus
};

/**
 * Export all domain services
 *
 * Usage:
 *   const { click, generator, upgrade } = require('./domains');
 *   const result = click.processTap(state, power);
 */
module.exports = {
  click,
  generator,
  upgrade,
  prestige,
  character,
  gamble,
  boss,
  ability,
  milestone,
  tournament,
  ticket,
  infusion
};
