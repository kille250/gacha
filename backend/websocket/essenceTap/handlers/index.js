/**
 * Handler Index - Exports all Essence Tap WebSocket handlers
 */

const { handleTap } = require('./tap.handler');
const { handlePurchaseGenerator } = require('./generator.handler');
const { handlePurchaseUpgrade } = require('./upgrade.handler');
const { handlePrestige, handlePurchasePrestigeUpgrade } = require('./prestige.handler');
const { handleActivateAbility } = require('./ability.handler');
const { handleGamble } = require('./gambling.handler');
const { handleInfusion } = require('./infusion.handler');
const { handleSpawnBoss, handleAttackBoss, handleClaimBossReward } = require('./boss.handler');
const {
  handleClaimDailyChallenge,
  handleClaimMilestone,
  handleClaimRepeatableMilestone,
  handleClaimSessionMilestone
} = require('./challenge.handler');
const {
  handleClaimTournamentRewards,
  handleClaimTournamentCheckpoint,
  handleClaimDailyStreak
} = require('./tournament.handler');
const { handleAssignCharacter, handleUnassignCharacter } = require('./character.handler');
const { handleSyncRequest, handlePing } = require('./sync.handler');

module.exports = {
  // Core
  handleTap,
  handleSyncRequest,
  handlePing,

  // Purchases
  handlePurchaseGenerator,
  handlePurchaseUpgrade,

  // Prestige
  handlePrestige,
  handlePurchasePrestigeUpgrade,

  // Abilities
  handleActivateAbility,

  // Gambling & Infusion
  handleGamble,
  handleInfusion,

  // Boss
  handleSpawnBoss,
  handleAttackBoss,
  handleClaimBossReward,

  // Challenges & Milestones
  handleClaimDailyChallenge,
  handleClaimMilestone,
  handleClaimRepeatableMilestone,
  handleClaimSessionMilestone,

  // Tournament
  handleClaimTournamentRewards,
  handleClaimTournamentCheckpoint,
  handleClaimDailyStreak,

  // Characters
  handleAssignCharacter,
  handleUnassignCharacter
};
