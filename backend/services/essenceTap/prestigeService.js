/**
 * Essence Tap Prestige Service
 *
 * Handles prestige (awakening) mechanics for the Essence Tap minigame.
 */

const { PRESTIGE_CONFIG, PRESTIGE_FATE_REWARDS, XP_REWARDS } = require('../../config/essenceTap');
const calculations = require('./calculations');
const stateService = require('./stateService');

/**
 * Perform prestige (awakening)
 * @param {Object} state - Current state
 * @param {Object} _user - User object for rewards (reserved for future use)
 * @returns {Object} Prestige result
 */
function performPrestige(state, _user) {
  if (!calculations.canPrestige(state.lifetimeEssence || 0)) {
    return { success: false, error: 'Not enough lifetime essence to prestige' };
  }

  // Check prestige cooldown
  const cooldownStatus = calculations.checkPrestigeCooldown(state.lastPrestigeTimestamp || 0);
  if (cooldownStatus.onCooldown) {
    return {
      success: false,
      error: `Prestige on cooldown. Please wait ${cooldownStatus.remainingMinutes} minute(s).`,
      cooldownRemaining: cooldownStatus.remainingMs
    };
  }

  const shardsEarned = calculations.calculatePrestigeShards(state.lifetimeEssence);
  if (shardsEarned <= 0) {
    return { success: false, error: 'Would not earn any shards' };
  }

  // Calculate starting essence from prestige upgrade
  const startingEssence = calculations.calculateStartingEssence(state.prestigeUpgrades);

  // Create new state (reset with bonuses kept)
  const initialState = stateService.getInitialState();
  const now = Date.now();

  const newState = {
    ...initialState,
    essence: startingEssence,
    lifetimeEssence: state.lifetimeEssence || 0, // Preserve lifetime essence for upgrade unlock requirements
    prestigeLevel: (state.prestigeLevel || 0) + 1,
    prestigeShards: (state.prestigeShards || 0) + shardsEarned,
    lifetimeShards: (state.lifetimeShards || 0) + shardsEarned,
    prestigeUpgrades: { ...state.prestigeUpgrades },
    assignedCharacters: state.assignedCharacters,
    claimedMilestones: state.claimedMilestones,
    // Preserve tournament state
    weekly: state.weekly,
    tournament: state.tournament,
    weeklyFP: state.weeklyFP,
    ticketGeneration: state.ticketGeneration,
    stats: {
      ...state.stats,
      totalPrestigeCount: (state.stats?.totalPrestigeCount || 0) + 1
    },
    lastOnlineTimestamp: now,
    lastPrestigeTimestamp: now,
    createdAt: state.createdAt
  };

  // Calculate Fate Points reward
  let fatePointsReward = 0;
  if (newState.prestigeLevel === 1) {
    fatePointsReward = PRESTIGE_FATE_REWARDS.firstPrestige;
  } else if (newState.prestigeLevel <= PRESTIGE_FATE_REWARDS.maxPrestigeRewards) {
    fatePointsReward = PRESTIGE_FATE_REWARDS.perPrestige;
  }

  // Calculate XP reward
  const xpReward = XP_REWARDS.perPrestige;

  return {
    success: true,
    newState,
    shardsEarned,
    totalShards: newState.prestigeShards,
    prestigeLevel: newState.prestigeLevel,
    fatePointsReward,
    xpReward,
    startingEssence
  };
}

/**
 * Purchase a prestige upgrade
 * @param {Object} state - Current state
 * @param {string} upgradeId - Prestige upgrade ID
 * @returns {Object} Result
 */
function purchasePrestigeUpgrade(state, upgradeId) {
  const upgrade = calculations.getPrestigeUpgradeById(upgradeId);
  if (!upgrade) {
    return { success: false, error: 'Invalid prestige upgrade' };
  }

  const currentLevel = state.prestigeUpgrades?.[upgradeId] || 0;
  if (calculations.isPrestigeUpgradeMaxed(upgradeId, currentLevel)) {
    return { success: false, error: 'Upgrade is at max level' };
  }

  const cost = calculations.calculatePrestigeUpgradeCost(upgradeId, currentLevel);

  if ((state.prestigeShards || 0) < cost) {
    return { success: false, error: 'Not enough awakening shards' };
  }

  const newState = { ...state };
  newState.prestigeShards = (state.prestigeShards || 0) - cost;
  newState.prestigeUpgrades = {
    ...state.prestigeUpgrades,
    [upgradeId]: currentLevel + 1
  };

  return {
    success: true,
    newState,
    upgrade,
    newLevel: currentLevel + 1,
    cost
  };
}

/**
 * Get prestige preview info
 * @param {Object} state - Current state
 * @returns {Object} Preview of what prestige would give
 */
function getPrestigePreview(state) {
  return calculations.getPrestigeInfo(state);
}

/**
 * Check if player can prestige
 * @param {Object} state - Current state
 * @returns {Object} Prestige availability status
 */
function canPlayerPrestige(state) {
  const canPrestigeEssence = calculations.canPrestige(state.lifetimeEssence || 0);
  const cooldownStatus = calculations.checkPrestigeCooldown(state.lastPrestigeTimestamp || 0);
  const shardsWouldEarn = calculations.calculatePrestigeShards(state.lifetimeEssence || 0);

  return {
    canPrestige: canPrestigeEssence && !cooldownStatus.onCooldown && shardsWouldEarn > 0,
    hasEnoughEssence: canPrestigeEssence,
    onCooldown: cooldownStatus.onCooldown,
    cooldownRemaining: cooldownStatus.remainingMs,
    cooldownMinutes: cooldownStatus.remainingMinutes,
    shardsWouldEarn,
    minimumEssence: PRESTIGE_CONFIG.minimumEssence
  };
}

module.exports = {
  performPrestige,
  purchasePrestigeUpgrade,
  getPrestigePreview,
  canPlayerPrestige
};
