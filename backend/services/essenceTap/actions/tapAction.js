/**
 * Tap Action
 *
 * Unified tap/click processing for REST and WebSocket.
 * Handles batch taps, combo tracking, and stat updates.
 */

const clickService = require('../clickService');
const stateService = require('../stateService');
const calculations = require('../calculations');

/**
 * Process tap action result
 * @typedef {Object} TapResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {number} [essenceEarned] - Total essence earned
 * @property {number} [critCount] - Number of crits
 * @property {number} [goldenCount] - Number of golden clicks
 * @property {number} [clickCount] - Number of clicks processed
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Process taps (works for both single and batch)
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Array} params.characters - User's character collection
 * @param {number} [params.count=1] - Number of taps
 * @param {number} [params.comboMultiplier=1] - Current combo multiplier
 * @param {Object} [params.activeAbilityEffects={}] - Active ability effects
 * @param {Object} [params.essenceTypeBonuses=null] - Essence type bonuses
 * @returns {TapResult} Tap result
 */
function processTaps({
  state,
  characters = [],
  count = 1,
  comboMultiplier = 1,
  activeAbilityEffects = {},
  essenceTypeBonuses = null
}) {
  // Validate count
  const clickCount = Math.max(1, Math.min(Math.floor(Number(count) || 1), 100));

  // Reset daily if needed
  let workingState = stateService.resetDaily(state);

  // Process the batch
  const batchResult = clickService.processBatchClicks(
    workingState,
    characters,
    clickCount,
    comboMultiplier,
    activeAbilityEffects,
    essenceTypeBonuses
  );

  // Apply results to state
  const newState = clickService.applyBatchClicksToState(workingState, batchResult);

  // Update timestamp
  newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState,
    essenceEarned: batchResult.totalEssence,
    critCount: batchResult.totalCrits,
    goldenCount: batchResult.totalGoldens,
    clickCount: batchResult.clickCount,
    averageEssence: batchResult.averageEssence
  };
}

/**
 * Update combo in state
 * @param {Object} state - Current state
 * @param {number} newCombo - New combo count
 * @returns {Object} Updated state
 */
function updateCombo(state, newCombo) {
  return clickService.updateComboState(state, newCombo);
}

/**
 * Update crit streak in state
 * @param {Object} state - Current state
 * @param {boolean} wasCrit - Whether last click was a crit
 * @returns {Object} Updated state
 */
function updateCritStreak(state, wasCrit) {
  return clickService.updateCritStreakState(state, wasCrit);
}

/**
 * Calculate combo multiplier from count
 * @param {number} comboCount - Current combo count
 * @returns {number} Combo multiplier
 */
function getComboMultiplier(comboCount) {
  return calculations.calculateComboMultiplier(comboCount);
}

module.exports = {
  processTaps,
  updateCombo,
  updateCritStreak,
  getComboMultiplier
};
