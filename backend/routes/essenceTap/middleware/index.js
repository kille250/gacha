/**
 * Essence Tap Middleware Index
 *
 * Exports all middleware for essence tap routes.
 * These middleware extract common patterns to reduce code duplication.
 *
 * Typical usage pattern:
 *
 *   const {
 *     loadGameState,
 *     applyPassiveGains,
 *     saveGameState,
 *     awardRewards
 *   } = require('./middleware');
 *
 *   router.post('/some-action',
 *     loadGameState,
 *     applyPassiveGains,
 *     async (req, res, next) => {
 *       const result = actions.someAction({ state: req.gameState, ... });
 *       if (!result.success) {
 *         return res.status(400).json({ error: result.error });
 *       }
 *       req.gameState = result.newState;
 *       req.gameStateChanged = true;
 *       res.locals.response = result;
 *       next();
 *     },
 *     saveGameState
 *   );
 */

const { loadGameState, loadGameStateLight } = require('./loadGameState');
const { applyPassiveGains, updateTimestamp } = require('./applyPassive');
const { saveGameState, saveAndRespond, asyncHandler } = require('./saveGameState');
const { awardPendingFP, awardFP, awardTickets, awardRewards } = require('./awardFP');

// Re-export from parent middleware.js for compatibility
const {
  checkClickRateLimit,
  clickRateLimitMiddleware,
  withEssenceLock,
  essenceLockMiddleware,
  getCachedInitialization,
  cacheInitialization,
  RATE_LIMIT_WINDOW_MS,
  MAX_CLICKS_PER_WINDOW,
  INITIALIZATION_DEDUP_WINDOW_MS
} = require('../middleware');

// Route factory
const { createRoute, createGetRoute, ensureEssenceTapState } = require('../createRoute');

module.exports = {
  // Game state loading
  loadGameState,
  loadGameStateLight,

  // Passive gains
  applyPassiveGains,
  updateTimestamp,

  // State saving
  saveGameState,
  saveAndRespond,
  asyncHandler,

  // FP and rewards
  awardPendingFP,
  awardFP,
  awardTickets,
  awardRewards,

  // Rate limiting (from parent)
  checkClickRateLimit,
  clickRateLimitMiddleware,
  RATE_LIMIT_WINDOW_MS,
  MAX_CLICKS_PER_WINDOW,

  // Essence lock (from parent)
  withEssenceLock,
  essenceLockMiddleware,

  // Initialization cache (from parent)
  getCachedInitialization,
  cacheInitialization,
  INITIALIZATION_DEDUP_WINDOW_MS,

  // Route factory
  createRoute,
  createGetRoute,
  ensureEssenceTapState
};
