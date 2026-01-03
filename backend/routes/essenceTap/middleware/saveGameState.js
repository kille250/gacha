/**
 * Save Game State Middleware
 *
 * Saves the game state after route handler completes.
 * Should be the last middleware in the chain.
 *
 * Usage:
 *   router.post('/endpoint',
 *     loadGameState,
 *     applyPassiveGains,
 *     async (req, res, next) => {
 *       const result = someAction({ state: req.gameState });
 *       req.gameState = result.newState;
 *       req.gameStateChanged = true;
 *       res.locals.response = { success: true, ...result };
 *       next();
 *     },
 *     saveGameState
 *   );
 */

/**
 * Save game state middleware
 * Saves req.gameState to req.gameUser.essenceTap if changed
 * Sends res.locals.response as JSON response
 */
async function saveGameState(req, res) {
  try {
    const user = req.gameUser;
    const state = req.gameState;

    // Save state if changed
    if (req.gameStateChanged && user && state) {
      user.essenceTap = state;
      user.lastEssenceTapRequest = Date.now();
      await user.save();
    }

    // Send response
    const response = res.locals.response || { success: true };
    return res.json(response);
  } catch (error) {
    console.error('Error in saveGameState middleware:', error);
    return res.status(500).json({ error: 'Failed to save game state' });
  }
}

/**
 * Error handling wrapper for async route handlers
 * Catches errors and passes to next middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Combined save and respond - convenience for simple endpoints
 * @param {Object} options - Options
 * @param {Function} options.getResponse - Function to build response from state
 */
function saveAndRespond(options = {}) {
  return async (req, res) => {
    try {
      const user = req.gameUser;
      const state = req.gameState;

      // Save state if changed
      if (req.gameStateChanged && user && state) {
        user.essenceTap = state;
        user.lastEssenceTapRequest = Date.now();
        await user.save();
      }

      // Build response
      let response = res.locals.response;
      if (!response && options.getResponse) {
        response = options.getResponse(req);
      }
      response = response || { success: true, state };

      return res.json(response);
    } catch (error) {
      console.error('Error in saveAndRespond middleware:', error);
      return res.status(500).json({ error: 'Failed to save game state' });
    }
  };
}

module.exports = {
  saveGameState,
  saveAndRespond,
  asyncHandler
};
