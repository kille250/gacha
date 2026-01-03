/**
 * Essence Tap Actions Module
 *
 * Unified action handlers for both REST and WebSocket endpoints.
 * Each action:
 *   1. Validates input
 *   2. Executes business logic (delegates to domain services)
 *   3. Returns result with new state
 *
 * This removes duplication between routes and WebSocket handlers.
 * Routes and WebSocket handlers become thin wrappers that:
 *   1. Load user/state (via middleware)
 *   2. Call action handler
 *   3. Save state (via middleware)
 *   4. Return response
 *
 * Usage:
 *   const { actions } = require('./services/essenceTap');
 *   const result = actions.purchaseGenerator({ state, generatorId, count });
 *   if (result.success) {
 *     // Save result.newState and return response
 *   }
 */

// Core actions
const tapAction = require('./tapAction');
const generatorAction = require('./generatorAction');
const upgradeAction = require('./upgradeAction');
const prestigeAction = require('./prestigeAction');
const characterAction = require('./characterAction');

// Feature actions
const gambleAction = require('./gambleAction');
const infusionAction = require('./infusionAction');
const milestoneAction = require('./milestoneAction');
const bossAction = require('./bossAction');
const abilityAction = require('./abilityAction');
const tournamentAction = require('./tournamentAction');
const ticketAction = require('./ticketAction');
const dailyChallengeAction = require('./dailyChallengeAction');

module.exports = {
  // ==========================================
  // TAP ACTIONS
  // ==========================================
  processTaps: tapAction.processTaps,
  updateCombo: tapAction.updateCombo,
  updateCritStreak: tapAction.updateCritStreak,
  getComboMultiplier: tapAction.getComboMultiplier,

  // ==========================================
  // GENERATOR ACTIONS
  // ==========================================
  purchaseGenerator: generatorAction.purchaseGenerator,
  getGeneratorInfo: generatorAction.getGeneratorInfo,
  getAllGenerators: generatorAction.getAllGenerators,

  // ==========================================
  // UPGRADE ACTIONS
  // ==========================================
  purchaseUpgrade: upgradeAction.purchaseUpgrade,
  purchasePrestigeUpgrade: upgradeAction.purchasePrestigeUpgrade,
  getAvailableUpgrades: upgradeAction.getAvailableUpgrades,

  // ==========================================
  // PRESTIGE ACTIONS
  // ==========================================
  performPrestige: prestigeAction.performPrestige,
  getPrestigePreview: prestigeAction.getPrestigePreview,
  canPrestige: prestigeAction.canPrestige,

  // ==========================================
  // CHARACTER ACTIONS
  // ==========================================
  assignCharacter: characterAction.assignCharacter,
  unassignCharacter: characterAction.unassignCharacter,
  swapCharacter: characterAction.swapCharacter,
  calculateCharacterBonuses: characterAction.calculateCharacterBonuses,
  getSynergyPreview: characterAction.getSynergyPreview,

  // ==========================================
  // GAMBLE ACTIONS
  // ==========================================
  performGamble: gambleAction.performGamble,
  getGambleInfo: gambleAction.getGambleInfo,
  getSharedJackpotInfo: gambleAction.getSharedJackpotInfo,
  contributeToJackpot: gambleAction.contributeToJackpot,

  // ==========================================
  // INFUSION ACTIONS
  // ==========================================
  performInfusion: infusionAction.performInfusion,
  getInfusionInfo: infusionAction.getInfusionInfo,

  // ==========================================
  // MILESTONE ACTIONS
  // ==========================================
  claimMilestone: milestoneAction.claimMilestone,
  claimRepeatableMilestone: milestoneAction.claimRepeatableMilestone,
  checkMilestones: milestoneAction.checkMilestones,
  getMilestoneProgress: milestoneAction.getMilestoneProgress,

  // ==========================================
  // BOSS ACTIONS
  // ==========================================
  spawnBoss: bossAction.spawnBoss,
  attackBoss: bossAction.attackBoss,
  getBossInfo: bossAction.getBossInfo,
  isBossActive: bossAction.isBossActive,

  // ==========================================
  // ABILITY ACTIONS
  // ==========================================
  activateAbility: abilityAction.activateAbility,
  getAbilityInfo: abilityAction.getAbilityInfo,
  getActiveAbilityEffects: abilityAction.getActiveAbilityEffects,
  isAbilityOnCooldown: abilityAction.isAbilityOnCooldown,

  // ==========================================
  // TOURNAMENT ACTIONS
  // ==========================================
  updateWeeklyProgress: tournamentAction.updateWeeklyProgress,
  getWeeklyTournamentInfo: tournamentAction.getWeeklyTournamentInfo,
  claimWeeklyRewards: tournamentAction.claimWeeklyRewards,
  claimTournamentCheckpoint: tournamentAction.claimTournamentCheckpoint,
  getBurningHourStatus: tournamentAction.getBurningHourStatus,
  equipCosmetic: tournamentAction.equipCosmetic,
  unequipCosmetic: tournamentAction.unequipCosmetic,
  getTournamentRank: tournamentAction.getTournamentRank,

  // ==========================================
  // TICKET ACTIONS
  // ==========================================
  claimDailyStreak: ticketAction.claimDailyStreak,
  checkDailyStreak: ticketAction.checkDailyStreak,
  exchangeFatePointsForTickets: ticketAction.exchangeFatePointsForTickets,
  getTicketGenerationInfo: ticketAction.getTicketGenerationInfo,

  // ==========================================
  // DAILY CHALLENGE ACTIONS
  // ==========================================
  getDailyChallengesWithProgress: dailyChallengeAction.getDailyChallengesWithProgress,
  checkDailyChallenges: dailyChallengeAction.checkDailyChallenges,
  claimDailyChallenge: dailyChallengeAction.claimDailyChallenge,
  updateChallengeProgress: dailyChallengeAction.updateChallengeProgress,

  // ==========================================
  // RE-EXPORT MODULES (for specific imports)
  // ==========================================
  tapAction,
  generatorAction,
  upgradeAction,
  prestigeAction,
  characterAction,
  gambleAction,
  infusionAction,
  milestoneAction,
  bossAction,
  abilityAction,
  tournamentAction,
  ticketAction,
  dailyChallengeAction
};
