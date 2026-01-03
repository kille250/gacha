/**
 * State Action
 *
 * Unified state retrieval and passive gain handling for REST and WebSocket.
 * Provides getGameState and passive gain utilities.
 */

const stateService = require('../stateService');
const calculations = require('../calculations');
const shared = require('../shared');
const abilityService = require('../domains/ability.service');
const tournamentService = require('../domains/tournament.service');
const { WEEKLY_FP_CAP } = require('../../../config/essenceTap');

/**
 * Get full game state for UI
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} [params.characters=[]] - User's character collection
 * @returns {Object} Full game state
 */
function getGameState({ state, characters = [] }) {
  return stateService.getGameState(state, characters);
}

/**
 * Apply passive gains to state based on time elapsed
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} [params.characters=[]] - User's character collection
 * @param {number} [params.maxSeconds=300] - Maximum seconds to apply (default 5 min)
 * @returns {Object} { state, gainsApplied } Updated state and gains
 */
function applyPassiveGains({ state, characters = [], maxSeconds = 300 }) {
  return shared.applyPassiveGains(state, characters, maxSeconds, {
    getActiveAbilityEffects: (s) => abilityService.getActiveAbilityEffects(s),
    updateWeeklyProgress: (s, essence, opts) => tournamentService.updateWeeklyProgress(s, essence, opts),
    getBurningHourStatus: () => tournamentService.getBurningHourStatus()
  });
}

/**
 * Get production per second for a state
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} [params.characters=[]] - User's character collection
 * @returns {number} Production per second
 */
function getProductionPerSecond({ state, characters = [] }) {
  return calculations.calculateProductionPerSecond(state, characters);
}

/**
 * Get click power for a state
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} [params.characters=[]] - User's character collection
 * @returns {number} Click power
 */
function getClickPower({ state, characters = [] }) {
  return calculations.calculateClickPower(state, characters);
}

/**
 * Get crit chance for a state
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} [params.characters=[]] - User's character collection
 * @returns {number} Crit chance (0-1)
 */
function getCritChance({ state, characters = [] }) {
  return calculations.calculateCritChance(state, characters);
}

/**
 * Get crit multiplier for a state
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @returns {number} Crit multiplier
 */
function getCritMultiplier({ state }) {
  return calculations.calculateCritMultiplier(state);
}

/**
 * Get status result
 * @typedef {Object} StatusResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [state] - Updated player state
 * @property {Object} [gameState] - Full game state for UI
 * @property {Object} [offlineProgress] - Offline progress details
 * @property {Object} [weeklyFPBudget] - Weekly FP budget info
 * @property {Object} [sessionStats] - Session statistics
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Get game status with offline progress
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} params.characters - User's character collection
 * @param {number} [params.lastApiRequestTime] - Last API request timestamp
 * @param {number} [params.maxOfflineMs=28800000] - Max offline time in ms (default 8 hours)
 * @returns {StatusResult} Status result
 */
function getStatus({
  state,
  characters = [],
  lastApiRequestTime = null,
  maxOfflineMs = 8 * 60 * 60 * 1000 // 8 hours
}) {
  try {
    // Get or initialize state
    let workingState = state || stateService.getInitialState();

    // Reset daily if needed
    workingState = stateService.resetDaily(workingState);

    // Reset weekly FP tracking if new week
    workingState = resetWeeklyFPIfNeeded(workingState);

    // Reset session stats for new session
    workingState = stateService.resetSessionStats(workingState);

    // Validate offline progress with server-side timestamp check
    const now = Date.now();
    const lastRequest = lastApiRequestTime || workingState.lastOnlineTimestamp || now;

    // Only award offline progress if the time since last API request is reasonable
    const timeSinceLastRequest = Math.min(now - lastRequest, maxOfflineMs);

    // Calculate offline progress with validated time
    const offlineProgress = calculations.calculateOfflineProgress(
      { ...workingState, lastOnlineTimestamp: now - timeSinceLastRequest },
      characters
    );

    if (offlineProgress.essenceEarned > 0) {
      workingState.essence = (workingState.essence || 0) + offlineProgress.essenceEarned;
      workingState.lifetimeEssence = (workingState.lifetimeEssence || 0) + offlineProgress.essenceEarned;
    }

    // Update timestamp
    workingState.lastOnlineTimestamp = now;

    // Get full game state for response
    const gameState = stateService.getGameState(workingState, characters);

    // Add weekly FP budget info
    const weeklyFPBudget = getWeeklyFPBudget(workingState);

    // Get session stats
    const sessionStats = getSessionStats(workingState);

    return {
      success: true,
      state: workingState,
      gameState,
      offlineProgress: offlineProgress.essenceEarned > 0 ? offlineProgress : null,
      weeklyFPBudget,
      sessionStats
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to get status',
      code: 'STATUS_ERROR'
    };
  }
}

/**
 * Reset weekly FP tracking if needed
 * @param {Object} state - Current state
 * @returns {Object} Updated state
 */
function resetWeeklyFPIfNeeded(state) {
  const currentWeek = getCurrentWeekId();

  if (!state.weeklyFPTracking) {
    state.weeklyFPTracking = {
      weekId: currentWeek,
      fpEarned: 0,
      sources: {}
    };
  } else if (state.weeklyFPTracking.weekId !== currentWeek) {
    // New week - reset tracking
    state.weeklyFPTracking = {
      weekId: currentWeek,
      fpEarned: 0,
      sources: {}
    };
  }

  return state;
}

/**
 * Get current ISO week ID (YYYY-Www)
 * @returns {string} Week ID
 */
function getCurrentWeekId() {
  const now = new Date();
  const year = now.getFullYear();
  const week = getISOWeek(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get ISO week number for a date
 * @param {Date} date - Date to get week for
 * @returns {number} Week number
 */
function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

/**
 * Get weekly FP budget info
 * @param {Object} state - Current state
 * @returns {Object} FP budget info
 */
function getWeeklyFPBudget(state) {
  const weeklyTracking = state.weeklyFPTracking || { fpEarned: 0, sources: {} };
  const cap = WEEKLY_FP_CAP.cap;
  const remaining = Math.max(0, cap - weeklyTracking.fpEarned);

  return {
    cap,
    earned: weeklyTracking.fpEarned,
    remaining,
    sources: weeklyTracking.sources || {},
    weekId: weeklyTracking.weekId || getCurrentWeekId()
  };
}

/**
 * Apply FP with weekly cap enforcement
 * @param {Object} state - Current state
 * @param {number} fpAmount - FP to award
 * @param {string} source - Source of FP (for tracking)
 * @returns {Object} Result with newState, actualFP, and capped flag
 */
function applyFPWithCap(state, fpAmount, source = 'unknown') {
  const workingState = resetWeeklyFPIfNeeded(state);
  const weeklyTracking = workingState.weeklyFPTracking;

  const cap = WEEKLY_FP_CAP.cap;
  const currentTotal = weeklyTracking.fpEarned || 0;
  const remaining = Math.max(0, cap - currentTotal);

  const actualFP = Math.min(fpAmount, remaining);
  const capped = actualFP < fpAmount;

  if (actualFP > 0) {
    weeklyTracking.fpEarned = currentTotal + actualFP;
    weeklyTracking.sources[source] = (weeklyTracking.sources[source] || 0) + actualFP;
  }

  return {
    newState: workingState,
    actualFP,
    capped
  };
}

/**
 * Get session stats
 * @param {Object} state - Current state
 * @returns {Object} Session stats
 */
function getSessionStats(state) {
  const sessionStats = state.sessionStats || {};

  return {
    sessionEssence: sessionStats.sessionEssence || 0,
    sessionStartTime: sessionStats.sessionStartTime || Date.now(),
    maxCombo: sessionStats.maxCombo || 0,
    maxCritStreak: sessionStats.maxCritStreak || 0,
    claimedSessionMilestones: sessionStats.claimedSessionMilestones || [],
    claimedComboMilestones: sessionStats.claimedComboMilestones || [],
    claimedCritMilestones: sessionStats.claimedCritMilestones || []
  };
}

module.exports = {
  getGameState,
  applyPassiveGains,
  getProductionPerSecond,
  getClickPower,
  getCritChance,
  getCritMultiplier,
  getStatus,
  resetWeeklyFPIfNeeded,
  getCurrentWeekId,
  getWeeklyFPBudget,
  applyFPWithCap,
  getSessionStats
};
