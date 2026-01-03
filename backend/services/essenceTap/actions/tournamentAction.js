/**
 * Tournament Action
 *
 * Unified tournament handling for REST and WebSocket.
 * Handles weekly tournament, checkpoints, burning hours, and cosmetics.
 */

const tournamentService = require('../domains/tournament.service');

/**
 * Tournament action result
 * @typedef {Object} TournamentResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {Object} [rewards] - Rewards earned
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Update weekly tournament progress (called during essence earning)
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {number} params.essenceEarned - Essence earned
 * @param {Object} [params.options] - Options like burningHourActive
 * @returns {TournamentResult} Update result
 */
function updateWeeklyProgress({ state, essenceEarned, options = {} }) {
  const result = tournamentService.updateWeeklyProgress(state, essenceEarned, options);

  result.newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState: result.newState,
    adjustedEssence: result.adjustedEssence,
    multiplier: result.multiplier,
    bonuses: result.bonuses
  };
}

/**
 * Get tournament information
 * @param {Object} state - Current state
 * @returns {Object} Tournament info
 */
function getWeeklyTournamentInfo(state) {
  return tournamentService.getWeeklyTournamentInfo(state);
}

/**
 * Claim weekly tournament rewards
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @returns {TournamentResult} Claim result
 */
function claimWeeklyRewards({ state }) {
  const result = tournamentService.claimWeeklyRewards(state);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState: result.newState,
    tier: result.tier,
    rewards: result.rewards,
    breakdown: result.breakdown,
    bracketRank: result.bracketRank,
    streak: result.streak
  };
}

/**
 * Claim a tournament checkpoint
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {number} params.day - Checkpoint day (1-7)
 * @returns {TournamentResult} Claim result
 */
function claimTournamentCheckpoint({ state, day }) {
  if (!day || day < 1 || day > 7) {
    return {
      success: false,
      error: 'Invalid checkpoint day',
      code: 'INVALID_REQUEST'
    };
  }

  const result = tournamentService.claimTournamentCheckpoint(state, day);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState: result.newState,
    rewards: result.rewards,
    checkpointName: result.checkpointName,
    day: result.day
  };
}

/**
 * Get burning hour status
 * @returns {Object} Burning hour status
 */
function getBurningHourStatus() {
  return tournamentService.getBurningHourStatus();
}

/**
 * Equip a cosmetic
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.cosmeticId - Cosmetic ID to equip
 * @returns {TournamentResult} Equip result
 */
function equipCosmetic({ state, cosmeticId }) {
  if (!cosmeticId) {
    return {
      success: false,
      error: 'Cosmetic ID required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = tournamentService.equipCosmetic(state.tournament || {}, cosmeticId);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  const newState = { ...state };
  newState.tournament = {
    ...state.tournament,
    cosmetics: result.cosmetics
  };
  newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState,
    cosmetics: result.cosmetics,
    equippedSlot: result.equippedSlot
  };
}

/**
 * Unequip a cosmetic
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.slot - Slot to unequip
 * @returns {TournamentResult} Unequip result
 */
function unequipCosmetic({ state, slot }) {
  if (!slot) {
    return {
      success: false,
      error: 'Slot required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = tournamentService.unequipCosmetic(state.tournament || {}, slot);

  const newState = { ...state };
  newState.tournament = {
    ...state.tournament,
    cosmetics: result.cosmetics
  };
  newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState,
    cosmetics: result.cosmetics
  };
}

/**
 * Get tournament rank
 * @param {Object} state - Current state
 * @returns {Object} Rank information
 */
function getTournamentRank(state) {
  return tournamentService.getTournamentRank(state);
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  if (error.includes('current week')) return 'CANNOT_CLAIM_CURRENT_WEEK';
  if (error.includes('No weekly data')) return 'NO_TOURNAMENT_DATA';
  if (error.includes('already claimed')) return 'ALREADY_CLAIMED';
  if (error.includes('No tier achieved')) return 'NO_TIER_ACHIEVED';
  if (error.includes('No active tournament')) return 'NO_ACTIVE_TOURNAMENT';
  if (error.includes('Checkpoint not reached')) return 'CHECKPOINT_NOT_REACHED';
  if (error.includes('not owned')) return 'COSMETIC_NOT_OWNED';
  if (error.includes('Invalid')) return 'INVALID_REQUEST';
  return 'TOURNAMENT_ACTION_FAILED';
}

module.exports = {
  updateWeeklyProgress,
  getWeeklyTournamentInfo,
  claimWeeklyRewards,
  claimTournamentCheckpoint,
  getBurningHourStatus,
  equipCosmetic,
  unequipCosmetic,
  getTournamentRank
};
