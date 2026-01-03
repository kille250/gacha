/**
 * Essence Tap Generator Service
 *
 * Handles generator purchases and production for the Essence Tap minigame.
 */

const calculations = require('./calculations');

/**
 * Purchase a generator
 * @param {Object} state - Current state
 * @param {string} generatorId - Generator to purchase
 * @param {number} count - Number to purchase (default 1)
 * @returns {Object} Updated state and result
 */
function purchaseGenerator(state, generatorId, count = 1) {
  // Validate count is a positive integer to prevent negative/zero exploits
  const purchaseCount = Math.max(1, Math.floor(Number(count) || 1));

  const generator = calculations.getGeneratorById(generatorId);
  if (!generator) {
    return { success: false, error: 'Invalid generator' };
  }

  // Check unlock requirement
  if (!calculations.isGeneratorUnlocked(generatorId, state.lifetimeEssence || 0)) {
    return { success: false, error: 'Generator not unlocked yet' };
  }

  // Ensure generators object exists
  const generators = state.generators || {};
  const owned = generators[generatorId] || 0;
  const cost = calculations.getBulkGeneratorCost(generatorId, owned, purchaseCount);

  if ((state.essence || 0) < cost) {
    return { success: false, error: 'Not enough essence' };
  }

  // Apply purchase
  const newState = { ...state };
  newState.essence = state.essence - cost;
  newState.generators = { ...generators };
  newState.generators[generatorId] = owned + purchaseCount;

  // Update stats
  newState.stats = { ...state.stats };
  newState.stats.totalGeneratorsBought = (state.stats?.totalGeneratorsBought || 0) + purchaseCount;

  // Update daily
  newState.daily = { ...state.daily };
  newState.daily.generatorsBought = (state.daily?.generatorsBought || 0) + purchaseCount;

  return {
    success: true,
    newState,
    cost,
    generator,
    newCount: owned + purchaseCount
  };
}

/**
 * Purchase maximum affordable generators
 * @param {Object} state - Current state
 * @param {string} generatorId - Generator to purchase
 * @returns {Object} Updated state and result
 */
function purchaseMaxGenerators(state, generatorId) {
  const generator = calculations.getGeneratorById(generatorId);
  if (!generator) {
    return { success: false, error: 'Invalid generator' };
  }

  // Check unlock requirement
  if (!calculations.isGeneratorUnlocked(generatorId, state.lifetimeEssence || 0)) {
    return { success: false, error: 'Generator not unlocked yet' };
  }

  const generators = state.generators || {};
  const owned = generators[generatorId] || 0;
  const maxPurchasable = calculations.getMaxPurchasable(generatorId, owned, state.essence || 0);

  if (maxPurchasable <= 0) {
    return { success: false, error: 'Cannot afford any generators' };
  }

  return purchaseGenerator(state, generatorId, maxPurchasable);
}

/**
 * Calculate production tick (essence earned over time period)
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @param {number} seconds - Time period in seconds
 * @param {Object} activeAbilityEffects - Currently active ability effects
 * @returns {Object} Production result
 */
function calculateProductionTick(state, characters = [], seconds = 1, activeAbilityEffects = {}) {
  const essenceEarned = calculations.calculateEssenceForTimePeriod({
    state,
    characters,
    seconds,
    activeAbilityEffects
  });

  return {
    essenceEarned,
    seconds,
    productionPerSecond: calculations.calculateProductionPerSecond(state, characters)
  };
}

/**
 * Apply production tick to state
 * @param {Object} state - Current state
 * @param {number} essenceEarned - Essence to add
 * @returns {Object} Updated state
 */
function applyProductionTick(state, essenceEarned) {
  if (essenceEarned <= 0) return state;

  const newState = { ...state };
  newState.essence = (state.essence || 0) + essenceEarned;
  newState.lifetimeEssence = (state.lifetimeEssence || 0) + essenceEarned;

  // Update daily stats
  newState.daily = { ...state.daily };
  newState.daily.essenceEarned = (state.daily?.essenceEarned || 0) + essenceEarned;

  // Update session stats
  if (state.sessionStats) {
    newState.sessionStats = { ...state.sessionStats };
    newState.sessionStats.sessionEssence = (state.sessionStats.sessionEssence || 0) + essenceEarned;
  }

  return newState;
}

/**
 * Process offline progress
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {Object} Offline progress result and updated state
 */
function processOfflineProgress(state, characters = []) {
  const progress = calculations.calculateOfflineProgress(state, characters);

  if (progress.essenceEarned <= 0) {
    return {
      ...progress,
      newState: state
    };
  }

  const newState = applyProductionTick(state, progress.essenceEarned);
  newState.lastOnlineTimestamp = Date.now();

  return {
    ...progress,
    newState
  };
}

module.exports = {
  purchaseGenerator,
  purchaseMaxGenerators,
  calculateProductionTick,
  applyProductionTick,
  processOfflineProgress
};
