/**
 * Route Factory for Essence Tap
 *
 * Creates standardized Express route handlers that eliminate boilerplate code.
 * Each route follows the same pattern:
 * 1. Validate input
 * 2. Start transaction with row lock
 * 3. Load user and state
 * 4. Execute business logic
 * 5. Save and commit
 * 6. Return response
 *
 * @module createRoute
 */

const { sequelize } = require('../../models');
const { User } = require('../../models');
const essenceTapService = require('../../services/essenceTapService');

/**
 * @typedef {Object} RouteOptions
 * @property {function} [validate] - Validation function (body) => error string or null
 * @property {function} execute - Execution function (ctx) => result
 * @property {boolean} [lockUser=true] - Whether to use row lock
 * @property {boolean} [resetDaily=false] - Whether to reset daily state
 * @property {boolean} [resetWeeklyFP=false] - Whether to reset weekly FP
 */

/**
 * @typedef {Object} RouteContext
 * @property {Object} user - User model instance
 * @property {Object} state - Current essence tap state
 * @property {Object} body - Request body
 * @property {Object} [transaction] - Sequelize transaction
 */

/**
 * Create an Express route handler with standard transaction and error handling
 *
 * @param {RouteOptions} options - Route configuration
 * @returns {function} Express route handler
 *
 * @example
 * const purchaseGenerator = createRoute({
 *   validate: (body) => body.generatorId ? null : 'Generator ID required',
 *   execute: async (ctx) => {
 *     const result = essenceTapService.purchaseGenerator(ctx.state, ctx.body.generatorId);
 *     if (!result.success) return { success: false, error: result.error };
 *     return { success: true, newState: result.newState, data: result };
 *   }
 * });
 */
function createRoute(options) {
  const {
    validate,
    execute,
    lockUser = true,
    resetDaily = false,
    resetWeeklyFP = false
  } = options;

  return async (req, res) => {
    const userId = req.user.id;

    // Step 1: Validate input
    if (validate) {
      const validationError = validate(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
    }

    // Step 2: Start transaction
    const transaction = lockUser ? await sequelize.transaction() : null;

    try {
      // Step 3: Load user with optional row lock
      const findOptions = { where: { id: userId } };
      if (transaction) {
        findOptions.transaction = transaction;
        findOptions.lock = true;
      }

      const user = await User.findOne(findOptions);

      if (!user) {
        if (transaction) await transaction.rollback();
        return res.status(404).json({ error: 'User not found' });
      }

      // Step 4: Prepare state with optional resets
      let state = user.essenceTap || essenceTapService.getInitialState();

      if (resetDaily) {
        state = essenceTapService.resetDaily(state);
      }

      if (resetWeeklyFP) {
        state = essenceTapService.resetWeeklyFPIfNeeded(state);
      }

      // Step 5: Execute business logic
      /** @type {RouteContext} */
      const ctx = {
        user,
        state,
        body: req.body,
        transaction
      };

      const result = await execute(ctx);

      // Step 6: Handle failure
      if (!result.success) {
        if (transaction) await transaction.rollback();
        return res.status(400).json({
          error: result.error || 'Operation failed',
          code: result.code,
          ...result.errorData
        });
      }

      // Step 7: Save state
      const now = Date.now();
      if (result.newState) {
        result.newState.lastOnlineTimestamp = now;
        user.essenceTap = result.newState;
      }
      user.lastEssenceTapRequest = now;

      // Handle fate points if provided
      if (result.fatePointsToAward && result.fatePointsToAward > 0) {
        const fatePoints = user.fatePoints || {};
        fatePoints.global = fatePoints.global || { points: 0 };
        fatePoints.global.points = (fatePoints.global.points || 0) + result.fatePointsToAward;
        user.fatePoints = fatePoints;
      }

      // Handle roll tickets if provided
      if (result.rollTicketsToAward && result.rollTicketsToAward > 0) {
        user.rollTickets = (user.rollTickets || 0) + result.rollTicketsToAward;
      }

      await user.save({ transaction });

      if (transaction) {
        await transaction.commit();
      }

      // Step 8: Return response
      return res.json({
        success: true,
        ...result.data
      });

    } catch (err) {
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackErr) {
          console.error('[EssenceTap API] Rollback error:', rollbackErr);
        }
      }
      console.error('[EssenceTap API] Route error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Create a simple GET route that returns state or computed info
 *
 * @param {function} getData - Function to get data from state
 * @returns {function} Express route handler
 */
function createGetRoute(getData) {
  return async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const state = user.essenceTap || essenceTapService.getInitialState();
      const data = getData(state, user, req);

      return res.json(data);
    } catch (err) {
      console.error('[EssenceTap API] Get route error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to ensure user has essence tap state
 */
function ensureEssenceTapState(req, res, next) {
  // This is handled by the route handlers
  next();
}

module.exports = {
  createRoute,
  createGetRoute,
  ensureEssenceTapState
};
