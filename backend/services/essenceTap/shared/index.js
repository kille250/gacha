/**
 * Shared Utilities for Essence Tap
 *
 * Common utilities used by both REST routes and WebSocket handlers
 * to eliminate code duplication.
 */

const { UserCharacter } = require('../../../models');
const calculations = require('../calculations');

/**
 * Minimum interval between passive gain applications to prevent double-counting
 */
const MIN_PASSIVE_GAIN_INTERVAL_MS = 1000;

/**
 * Load user's characters with formatted data for essence tap calculations
 * @param {number} userId - User ID
 * @param {Object} [options] - Query options
 * @param {Object} [options.transaction] - Sequelize transaction
 * @returns {Promise<Array>} Formatted character array
 */
async function loadUserCharacters(userId, options = {}) {
  const userCharacters = await UserCharacter.findAll({
    where: { UserId: userId },
    include: ['Character'],
    ...(options.transaction && { transaction: options.transaction })
  });

  return userCharacters.map(uc => ({
    id: uc.CharacterId,
    characterId: uc.CharacterId,
    rarity: uc.Character?.rarity || 'common',
    element: uc.Character?.element || 'neutral',
    series: uc.Character?.series || 'Unknown',
    name: uc.Character?.name || 'Unknown',
    imageUrl: uc.Character?.imageUrl
  }));
}

/**
 * Apply passive gains to user state based on time elapsed
 * This is a core function that handles offline/passive essence generation.
 *
 * @param {Object} state - Current essence tap state
 * @param {Array} characters - User's characters
 * @param {number} [maxSeconds=300] - Maximum seconds to apply (default 5 min)
 * @param {Object} [options] - Additional options
 * @param {Function} [options.getActiveAbilityEffects] - Function to get active ability effects
 * @param {Function} [options.updateWeeklyProgress] - Function to update weekly tournament progress
 * @param {Function} [options.getBurningHourStatus] - Function to get burning hour status
 * @returns {Object} { state, gainsApplied } Updated state and amount gained
 */
function applyPassiveGains(state, characters = [], maxSeconds = 300, options = {}) {
  const now = Date.now();
  const lastUpdate = state.lastOnlineTimestamp || state.lastSaveTimestamp || now;
  const elapsedMs = now - lastUpdate;
  const elapsedSeconds = Math.min(elapsedMs / 1000, maxSeconds);

  // Guard: If gains were applied very recently, skip to prevent double-counting
  if (elapsedMs < MIN_PASSIVE_GAIN_INTERVAL_MS) {
    return { state, gainsApplied: 0 };
  }

  if (elapsedSeconds <= 0) {
    return { state, gainsApplied: 0 };
  }

  // Calculate production per second
  let productionPerSecond = calculations.calculateProductionPerSecond(state, characters);

  // Apply active ability effects if function provided
  if (options.getActiveAbilityEffects) {
    const activeAbilityEffects = options.getActiveAbilityEffects(state);
    if (activeAbilityEffects.productionMultiplier) {
      productionPerSecond *= activeAbilityEffects.productionMultiplier;
    }
  }

  const passiveGain = Math.floor(productionPerSecond * elapsedSeconds);

  if (passiveGain <= 0) {
    // Still update timestamp even if no gains
    const newState = { ...state, lastOnlineTimestamp: now };
    return { state: newState, gainsApplied: 0 };
  }

  let newState = { ...state };
  newState.essence = (state.essence || 0) + passiveGain;
  newState.lifetimeEssence = (state.lifetimeEssence || 0) + passiveGain;

  // Update weekly tournament progress if function provided
  if (options.updateWeeklyProgress && options.getBurningHourStatus) {
    const burningHourStatus = options.getBurningHourStatus();
    const weeklyResult = options.updateWeeklyProgress(newState, passiveGain, {
      burningHourActive: burningHourStatus.active
    });
    newState = weeklyResult.newState;
  }

  // Update timestamp to mark when gains were last applied
  newState.lastOnlineTimestamp = now;

  return { state: newState, gainsApplied: passiveGain };
}

/**
 * Weekly FP cap configuration
 */
const WEEKLY_FP_CAP = 500;

/**
 * Apply FP reward with weekly cap enforcement
 * @param {Object} state - Current essence tap state
 * @param {number} fpAmount - FP amount to award
 * @param {string} source - Source of FP (for tracking)
 * @returns {Object} Result with newState and actualFP awarded
 */
function applyFPWithCap(state, fpAmount, source = 'unknown') {
  const weeklyFP = state.weeklyFP || { earned: 0, weekStart: getWeekStart() };

  // Check if we need to reset for new week
  const currentWeekStart = getWeekStart();
  if (weeklyFP.weekStart !== currentWeekStart) {
    weeklyFP.earned = 0;
    weeklyFP.weekStart = currentWeekStart;
  }

  const remaining = Math.max(0, WEEKLY_FP_CAP - weeklyFP.earned);
  const actualFP = Math.min(fpAmount, remaining);

  const newState = { ...state };
  newState.weeklyFP = {
    earned: weeklyFP.earned + actualFP,
    weekStart: currentWeekStart
  };

  return {
    newState,
    actualFP,
    requestedFP: fpAmount,
    capped: actualFP < fpAmount,
    weeklyRemaining: remaining - actualFP,
    source
  };
}

/**
 * Get the start of the current week (Sunday midnight UTC)
 * @returns {string} ISO date string of week start
 */
function getWeekStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

/**
 * Check and reset daily/weekly state if needed
 * @param {Object} state - Current state
 * @returns {Object} State with resets applied if needed
 */
function checkAndResetPeriods(state) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentWeek = getWeekStart();

  let newState = { ...state };
  let resetPerformed = false;

  // Check daily reset
  if (state.daily?.date !== today) {
    newState.daily = {
      date: today,
      essenceEarned: 0,
      clicks: 0,
      crits: 0,
      goldens: 0,
      generatorsBought: 0,
      upgradesBought: 0,
      gamblesUsed: 0,
      gambleWins: 0,
      bossesDefeated: 0,
      highestCombo: 0,
      abilitiesUsed: 0
    };
    newState.dailyChallengesClaimed = {};
    resetPerformed = true;
  }

  // Check weekly reset
  if (state.weekly?.weekStart !== currentWeek) {
    newState.weekly = {
      weekStart: currentWeek,
      essenceEarned: 0,
      claimedCheckpoints: [],
      tournamentClaimed: false
    };
    newState.weeklyFP = {
      earned: 0,
      weekStart: currentWeek
    };
    // Reset repeatable milestones for the week
    newState.repeatableMilestones = {};
    resetPerformed = true;
  }

  return { newState, resetPerformed };
}

/**
 * Standard error response format
 * @param {string} error - Error message
 * @param {string} code - Error code
 * @param {Object} [extra] - Additional data
 * @returns {Object} Formatted error response
 */
function errorResponse(error, code, extra = {}) {
  return {
    success: false,
    error,
    code,
    ...extra
  };
}

/**
 * Standard success response format
 * @param {Object} data - Response data
 * @returns {Object} Formatted success response
 */
function successResponse(data) {
  return {
    success: true,
    ...data
  };
}

/**
 * Apply rewards from a successful action (essence, FP, tickets, etc.)
 * @param {Object} state - Current state
 * @param {Object} rewards - Rewards to apply
 * @param {Object} user - User model instance (for FP)
 * @returns {Object} Result with updated state and user changes
 */
function applyRewards(state, rewards, user) {
  let newState = { ...state };
  const userChanges = {};

  if (rewards.essence) {
    newState.essence = (newState.essence || 0) + rewards.essence;
    newState.lifetimeEssence = (newState.lifetimeEssence || 0) + rewards.essence;
  }

  if (rewards.fatePoints && rewards.fatePoints > 0) {
    const fpResult = applyFPWithCap(newState, rewards.fatePoints, rewards.source || 'reward');
    newState = fpResult.newState;

    if (fpResult.actualFP > 0) {
      // Track changes to apply to user
      userChanges.fatePoints = fpResult.actualFP;
    }
  }

  if (rewards.rollTickets) {
    newState.rollTickets = (newState.rollTickets || 0) + rewards.rollTickets;
    if (user) {
      userChanges.rollTickets = rewards.rollTickets;
    }
  }

  if (rewards.prestigeShards) {
    newState.prestigeShards = (newState.prestigeShards || 0) + rewards.prestigeShards;
  }

  return { newState, userChanges };
}

/**
 * Apply user changes to user model
 * @param {Object} user - User model instance
 * @param {Object} changes - Changes to apply (fatePoints, rollTickets, xp)
 */
function applyUserChanges(user, changes) {
  if (changes.fatePoints) {
    const fatePoints = user.fatePoints || {};
    fatePoints.global = fatePoints.global || { points: 0 };
    fatePoints.global.points = (fatePoints.global.points || 0) + changes.fatePoints;
    user.fatePoints = fatePoints;
  }

  if (changes.rollTickets) {
    user.rollTickets = (user.rollTickets || 0) + changes.rollTickets;
  }

  if (changes.xp) {
    user.accountXP = (user.accountXP || 0) + changes.xp;
  }
}

module.exports = {
  loadUserCharacters,
  applyPassiveGains,
  applyFPWithCap,
  getWeekStart,
  checkAndResetPeriods,
  errorResponse,
  successResponse,
  applyRewards,
  applyUserChanges,
  WEEKLY_FP_CAP,
  MIN_PASSIVE_GAIN_INTERVAL_MS
};
