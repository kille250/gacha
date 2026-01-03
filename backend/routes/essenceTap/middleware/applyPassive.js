/**
 * Apply Passive Gains Middleware
 *
 * Applies passive essence gains based on time elapsed since last update.
 * Should be used after loadGameState middleware.
 *
 * Usage:
 *   router.post('/endpoint',
 *     loadGameState,
 *     applyPassiveGains,
 *     async (req, res) => { ... }
 *   );
 */

const { calculateOfflineProgress, calculateProductionPerSecond } = require('../../essenceTap');

/**
 * Apply passive gains middleware
 * Updates req.gameState with passive essence earned
 * Sets req.passiveGains with details about what was earned
 */
function applyPassiveGains(req, res, next) {
  try {
    const state = req.gameState;
    const characters = req.gameCharacters || [];

    if (!state) {
      return next(); // No state to update
    }

    const now = Date.now();
    const lastOnline = state.lastOnlineTimestamp || now;
    const timeSinceLastUpdate = now - lastOnline;

    // Only apply if more than 1 second has passed
    if (timeSinceLastUpdate < 1000) {
      req.passiveGains = { essence: 0, time: 0 };
      return next();
    }

    // Calculate production rate
    const productionPerSecond = calculateProductionPerSecond(state, characters);

    // Calculate offline progress (with efficiency cap)
    const offlineResult = calculateOfflineProgress(state, characters, timeSinceLastUpdate);

    // Apply gains
    const newState = { ...state };
    newState.essence = (state.essence || 0) + offlineResult.essenceGained;
    newState.lifetimeEssence = (state.lifetimeEssence || 0) + offlineResult.essenceGained;
    newState.lastOnlineTimestamp = now;

    // Update weekly progress if applicable
    if (newState.weekly && offlineResult.essenceGained > 0) {
      newState.weekly = {
        ...newState.weekly,
        essenceEarned: (newState.weekly.essenceEarned || 0) + offlineResult.essenceGained
      };
    }

    req.gameState = newState;
    req.gameStateChanged = true;
    req.passiveGains = {
      essence: offlineResult.essenceGained,
      time: timeSinceLastUpdate,
      productionPerSecond,
      efficiency: offlineResult.efficiency
    };

    next();
  } catch (error) {
    console.error('Error in applyPassiveGains middleware:', error);
    // Don't fail the request, just skip passive gains
    req.passiveGains = { essence: 0, error: error.message };
    next();
  }
}

/**
 * Lightweight version that just updates timestamp without full calculation
 * Use for endpoints that handle their own production (like clicks)
 */
function updateTimestamp(req, res, next) {
  if (req.gameState) {
    req.gameState = {
      ...req.gameState,
      lastOnlineTimestamp: Date.now()
    };
    req.gameStateChanged = true;
  }
  next();
}

module.exports = {
  applyPassiveGains,
  updateTimestamp
};
