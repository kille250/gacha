/**
 * Save Action
 *
 * Unified save/sync handling for REST and WebSocket.
 * Handles character mastery updates and state persistence.
 */

const characterService = require('../characterService');
const shared = require('../shared');
const abilityService = require('../domains/ability.service');
const tournamentService = require('../domains/tournament.service');

/**
 * Save result
 * @typedef {Object} SaveResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [state] - Updated player state
 * @property {Object} [sessionStats] - Session statistics
 * @property {Array} [levelUps] - Character mastery level ups
 * @property {number} [savedAt] - Save timestamp
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Save player state with passive gains and mastery updates
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} params.characters - User's character collection
 * @returns {SaveResult} Save result
 */
function saveState({ state, characters = [] }) {
  try {
    let workingState = state;

    // Apply passive gains since lastOnlineTimestamp
    const passiveResult = shared.applyPassiveGains(workingState, characters, 300, {
      getActiveAbilityEffects: (s) => abilityService.getActiveAbilityEffects(s),
      updateWeeklyProgress: (s, essence, opts) => tournamentService.updateWeeklyProgress(s, essence, opts),
      getBurningHourStatus: () => tournamentService.getBurningHourStatus()
    });
    workingState = passiveResult.state;

    const now = Date.now();

    // Update character mastery (time-based tracking for assigned characters)
    const lastUpdate = workingState.lastOnlineTimestamp || workingState.lastSaveTimestamp || now;
    const elapsedSeconds = Math.min((now - lastUpdate) / 1000, 300);
    const elapsedHours = elapsedSeconds / 3600;

    let levelUps = [];
    if (elapsedHours > 0) {
      const masteryResult = characterService.updateCharacterMastery(workingState, elapsedHours);
      workingState = masteryResult.newState;
      levelUps = masteryResult.levelUps || [];
    }

    // Update timestamps
    workingState.lastOnlineTimestamp = now;
    workingState.lastSaveTimestamp = now;

    // Get session stats
    const sessionStats = getSessionStats(workingState);

    return {
      success: true,
      state: workingState,
      sessionStats,
      levelUps,
      savedAt: now
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to save state',
      code: 'SAVE_ERROR'
    };
  }
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
  saveState,
  getSessionStats
};
