/**
 * Prestige Action
 *
 * Unified prestige handling for REST and WebSocket.
 */

const stateService = require('../stateService');
const calculations = require('../calculations');
const { PRESTIGE_CONFIG } = require('../../../config/essenceTap');

/**
 * Prestige result
 * @typedef {Object} PrestigeResult
 * @property {boolean} success - Whether prestige succeeded
 * @property {Object} [newState] - Updated state
 * @property {number} [shardsGained] - Shards earned
 * @property {number} [newPrestigeLevel] - New prestige level
 * @property {number} [newBonus] - New prestige bonus multiplier
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Perform prestige (awakening)
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @returns {PrestigeResult} Prestige result
 */
function performPrestige({ state }) {
  // Check if can prestige
  if (!calculations.canPrestige(state.lifetimeEssence || 0)) {
    return {
      success: false,
      error: `Need at least ${calculations.formatNumber(PRESTIGE_CONFIG.minimumEssence)} lifetime essence`,
      code: 'CANNOT_PRESTIGE'
    };
  }

  // Check cooldown (optional)
  const cooldownResult = calculations.checkPrestigeCooldown(state);
  if (!cooldownResult.canPrestige) {
    return {
      success: false,
      error: `Prestige on cooldown. ${cooldownResult.timeRemaining}ms remaining`,
      code: 'PRESTIGE_COOLDOWN'
    };
  }

  // Calculate shards earned
  const shardsGained = calculations.calculatePrestigeShards(state.lifetimeEssence);
  if (shardsGained <= 0) {
    return {
      success: false,
      error: 'Not enough lifetime essence for shards',
      code: 'INSUFFICIENT_ESSENCE'
    };
  }

  // Calculate starting essence bonus from prestige upgrades
  const startingEssence = calculations.calculateStartingEssence(state.prestigeUpgrades);

  // Create new state (reset most progress but keep prestige-related things)
  const newState = stateService.getInitialState();

  // Preserve prestige-specific data
  newState.prestigeLevel = (state.prestigeLevel || 0) + 1;
  newState.prestigeShards = (state.prestigeShards || 0) + shardsGained;
  newState.lifetimeShards = (state.lifetimeShards || 0) + shardsGained;
  newState.prestigeUpgrades = { ...state.prestigeUpgrades };

  // Preserve lifetime essence (used for upgrade unlock requirements)
  newState.lifetimeEssence = state.lifetimeEssence || 0;

  // Preserve character assignments and mastery
  newState.assignedCharacters = [...(state.assignedCharacters || [])];
  newState.characterMastery = { ...state.characterMastery };
  newState.characterXP = { ...state.characterXP };

  // Preserve claimed milestones (one-time)
  newState.claimedMilestones = [...(state.claimedMilestones || [])];

  // Preserve weekly and repeatable milestone tracking
  newState.repeatableMilestones = { ...state.repeatableMilestones };
  newState.weekly = { ...state.weekly };
  newState.weeklyFP = { ...state.weeklyFP };
  newState.ticketGeneration = { ...state.ticketGeneration };

  // Preserve essence types (don't reset prismatic)
  newState.essenceTypes = {
    pure: 0,
    ambient: 0,
    golden: 0,
    prismatic: state.essenceTypes?.prismatic || 0
  };

  // Preserve lifetime stats
  newState.stats = {
    totalGeneratorsBought: state.stats?.totalGeneratorsBought || 0,
    totalUpgradesPurchased: state.stats?.totalUpgradesPurchased || 0,
    highestCombo: state.stats?.highestCombo || 0,
    goldenEssenceClicks: state.stats?.goldenEssenceClicks || 0,
    totalGambleWins: state.stats?.totalGambleWins || 0,
    totalGambleLosses: state.stats?.totalGambleLosses || 0,
    totalInfusions: state.stats?.totalInfusions || 0,
    jackpotsWon: state.stats?.jackpotsWon || 0,
    totalJackpotWinnings: state.stats?.totalJackpotWinnings || 0
  };

  // Apply starting essence bonus
  newState.essence = startingEssence;

  // Reset infusion (per prestige cycle)
  newState.infusionCount = 0;
  newState.infusionBonus = 0;

  // Preserve timestamps
  newState.createdAt = state.createdAt || Date.now();
  newState.lastOnlineTimestamp = Date.now();
  newState.lastSaveTimestamp = Date.now();

  // Calculate new bonus
  const newBonus = calculations.calculateShardBonus(newState.lifetimeShards);

  return {
    success: true,
    newState,
    shardsGained,
    newPrestigeLevel: newState.prestigeLevel,
    totalShards: newState.prestigeShards,
    lifetimeShards: newState.lifetimeShards,
    newBonus,
    startingEssence
  };
}

/**
 * Get prestige preview information
 * @param {Object} state - Current state
 * @returns {Object} Prestige preview info
 */
function getPrestigePreview(state) {
  return calculations.getPrestigeInfo(state);
}

/**
 * Check if player can prestige
 * @param {Object} state - Current state
 * @returns {Object} Prestige eligibility info
 */
function canPrestige(state) {
  const canDo = calculations.canPrestige(state.lifetimeEssence || 0);
  const shardsIfPrestige = calculations.calculatePrestigeShards(state.lifetimeEssence || 0);
  const cooldown = calculations.checkPrestigeCooldown(state);

  return {
    canPrestige: canDo && cooldown.canPrestige,
    shardsIfPrestige,
    minimumEssence: PRESTIGE_CONFIG.minimumEssence,
    currentLifetimeEssence: state.lifetimeEssence || 0,
    cooldownRemaining: cooldown.timeRemaining,
    reason: !canDo
      ? 'Insufficient lifetime essence'
      : !cooldown.canPrestige
        ? 'Prestige on cooldown'
        : null
  };
}

module.exports = {
  performPrestige,
  getPrestigePreview,
  canPrestige
};
