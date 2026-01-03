/**
 * Essence Tap Click Service
 *
 * Handles click/tap processing for the Essence Tap minigame.
 */

// Config reserved for future enhancements
// const { GAME_CONFIG } = require('../../config/essenceTap');
const calculations = require('./calculations');

/**
 * Process a click action
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @param {number} comboMultiplier - Current combo multiplier
 * @param {Object} activeAbilityEffects - Currently active ability effects
 * @param {Object} essenceTypeBonuses - Bonuses from essence types
 * @returns {Object} Click result
 */
function processClick(state, characters = [], comboMultiplier = 1, activeAbilityEffects = {}, essenceTypeBonuses = null) {
  const result = calculations.calculateClickResult({
    state,
    characters,
    comboMultiplier,
    activeAbilityEffects,
    essenceTypeBonuses
  });

  return result;
}

/**
 * Apply click results to state
 * @param {Object} state - Current state
 * @param {Object} clickResult - Result from processClick
 * @returns {Object} Updated state
 */
function applyClickToState(state, clickResult) {
  const newState = { ...state };

  // Update essence
  newState.essence = (state.essence || 0) + clickResult.essenceGained;
  newState.lifetimeEssence = (state.lifetimeEssence || 0) + clickResult.essenceGained;

  // Update click stats
  newState.totalClicks = (state.totalClicks || 0) + 1;
  if (clickResult.isCrit) {
    newState.totalCrits = (state.totalCrits || 0) + 1;
  }

  // Update daily stats
  newState.daily = { ...state.daily };
  newState.daily.clicks = (state.daily?.clicks || 0) + 1;
  newState.daily.essenceEarned = (state.daily?.essenceEarned || 0) + clickResult.essenceGained;
  if (clickResult.isCrit) {
    newState.daily.crits = (state.daily?.crits || 0) + 1;
  }

  // Update golden essence stats
  if (clickResult.isGolden) {
    newState.stats = { ...state.stats };
    newState.stats.goldenEssenceClicks = (state.stats?.goldenEssenceClicks || 0) + 1;
  }

  // Update session stats
  if (state.sessionStats) {
    newState.sessionStats = { ...state.sessionStats };
    newState.sessionStats.sessionEssence = (state.sessionStats.sessionEssence || 0) + clickResult.essenceGained;
  }

  return newState;
}

/**
 * Process batch of clicks (for batched tap submissions)
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @param {number} count - Number of clicks
 * @param {number} comboMultiplier - Current combo multiplier
 * @param {Object} activeAbilityEffects - Currently active ability effects
 * @param {Object} essenceTypeBonuses - Bonuses from essence types
 * @returns {Object} Batch click result
 */
function processBatchClicks(state, characters = [], count = 1, comboMultiplier = 1, activeAbilityEffects = {}, essenceTypeBonuses = null) {
  // Validate count
  const clickCount = Math.max(1, Math.min(Math.floor(Number(count) || 1), 100)); // Cap at 100 per batch

  let totalEssence = 0;
  let totalCrits = 0;
  let totalGoldens = 0;

  // Process each click individually for proper crit/golden rolls
  for (let i = 0; i < clickCount; i++) {
    const result = calculations.calculateClickResult({
      state,
      characters,
      comboMultiplier,
      activeAbilityEffects,
      essenceTypeBonuses
    });

    totalEssence += result.essenceGained;
    if (result.isCrit) totalCrits++;
    if (result.isGolden) totalGoldens++;
  }

  return {
    clickCount,
    totalEssence,
    totalCrits,
    totalGoldens,
    averageEssence: Math.floor(totalEssence / clickCount)
  };
}

/**
 * Apply batch click results to state
 * @param {Object} state - Current state
 * @param {Object} batchResult - Result from processBatchClicks
 * @returns {Object} Updated state
 */
function applyBatchClicksToState(state, batchResult) {
  const newState = { ...state };

  // Update essence
  newState.essence = (state.essence || 0) + batchResult.totalEssence;
  newState.lifetimeEssence = (state.lifetimeEssence || 0) + batchResult.totalEssence;

  // Update click stats
  newState.totalClicks = (state.totalClicks || 0) + batchResult.clickCount;
  newState.totalCrits = (state.totalCrits || 0) + batchResult.totalCrits;

  // Update daily stats
  newState.daily = { ...state.daily };
  newState.daily.clicks = (state.daily?.clicks || 0) + batchResult.clickCount;
  newState.daily.essenceEarned = (state.daily?.essenceEarned || 0) + batchResult.totalEssence;
  newState.daily.crits = (state.daily?.crits || 0) + batchResult.totalCrits;

  // Update golden essence stats
  if (batchResult.totalGoldens > 0) {
    newState.stats = { ...state.stats };
    newState.stats.goldenEssenceClicks = (state.stats?.goldenEssenceClicks || 0) + batchResult.totalGoldens;
  }

  // Update session stats
  if (state.sessionStats) {
    newState.sessionStats = { ...state.sessionStats };
    newState.sessionStats.sessionEssence = (state.sessionStats.sessionEssence || 0) + batchResult.totalEssence;
  }

  return newState;
}

/**
 * Update combo state
 * @param {Object} state - Current state
 * @param {number} newCombo - New combo count
 * @returns {Object} Updated state
 */
function updateComboState(state, newCombo) {
  const newState = { ...state };

  // Update session stats if tracking
  if (state.sessionStats) {
    newState.sessionStats = { ...state.sessionStats };
    newState.sessionStats.currentCombo = newCombo;
    if (newCombo > (state.sessionStats.maxCombo || 0)) {
      newState.sessionStats.maxCombo = newCombo;
    }
  }

  // Update stats for highest combo ever
  if (state.stats && newCombo > (state.stats.highestCombo || 0)) {
    newState.stats = { ...state.stats };
    newState.stats.highestCombo = newCombo;
  }

  return newState;
}

/**
 * Update crit streak state
 * @param {Object} state - Current state
 * @param {boolean} wasCrit - Whether the last click was a crit
 * @returns {Object} Updated state with crit streak info
 */
function updateCritStreakState(state, wasCrit) {
  const newState = { ...state };

  if (!state.sessionStats) {
    newState.sessionStats = {
      sessionStartTime: Date.now(),
      sessionEssence: 0,
      currentCombo: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    };
  } else {
    newState.sessionStats = { ...state.sessionStats };
  }

  if (wasCrit) {
    newState.sessionStats.critStreak = (state.sessionStats?.critStreak || 0) + 1;
    if (newState.sessionStats.critStreak > (state.sessionStats?.maxCritStreak || 0)) {
      newState.sessionStats.maxCritStreak = newState.sessionStats.critStreak;
    }
  } else {
    newState.sessionStats.critStreak = 0;
  }

  return newState;
}

module.exports = {
  processClick,
  applyClickToState,
  processBatchClicks,
  applyBatchClicksToState,
  updateComboState,
  updateCritStreakState
};
