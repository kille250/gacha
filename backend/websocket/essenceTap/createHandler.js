/**
 * WebSocket Handler Factory for Essence Tap
 *
 * Creates standardized WebSocket handlers that eliminate boilerplate code.
 * Each handler follows the same pattern:
 * 1. Validate input
 * 2. Start transaction with row lock
 * 3. Load user and state
 * 4. Execute business logic
 * 5. Save and commit
 * 6. Broadcast result
 *
 * @module createHandler
 */

const { sequelize } = require('../../models');
const { User } = require('../../models');
const essenceTapService = require('../../services/essenceTapService');
const { broadcastToUser } = require('./utils/broadcast');
const { getNextSequence } = require('./utils/sequence');

/**
 * @typedef {import('../../../shared/types/essenceTap').HandlerOptions} HandlerOptions
 * @typedef {import('../../../shared/types/essenceTap').HandlerContext} HandlerContext
 * @typedef {import('../../../shared/types/essenceTap').HandlerResult} HandlerResult
 */

/**
 * Create a WebSocket event handler with standard transaction and error handling
 *
 * @param {HandlerOptions} options - Handler configuration
 * @returns {function} Socket event handler function
 *
 * @example
 * // Simple handler
 * const claimMilestone = createHandler({
 *   eventName: 'milestone_claimed',
 *   errorCode: 'MILESTONE_ERROR',
 *   validate: (data) => data.milestoneKey ? null : 'Milestone key required',
 *   execute: async (ctx, data) => {
 *     const result = essenceTapService.claimMilestone(ctx.state, data.milestoneKey);
 *     if (!result.success) return { success: false, error: result.error };
 *     return {
 *       success: true,
 *       newState: result.newState,
 *       data: { milestoneKey: data.milestoneKey, fatePoints: result.fatePoints }
 *     };
 *   }
 * });
 */
function createHandler(options) {
  const {
    eventName,
    errorCode,
    validate,
    execute,
    requiresLock = true,
    resetDaily = false,
    resetWeeklyFP = false,
    skipBroadcast = false
  } = options;

  /**
   * The actual socket event handler
   * @param {Object} socket - Socket.io socket instance
   * @param {number} userId - Authenticated user ID
   * @param {Object} namespace - Socket.io namespace for broadcasting
   * @param {Object} data - Event data from client
   */
  return async function handler(socket, userId, namespace, data = {}) {
    const { clientSeq } = data;

    // Step 1: Validate input
    if (validate) {
      const validationError = validate(data);
      if (validationError) {
        socket.emit('error', {
          code: 'INVALID_REQUEST',
          message: validationError
        });
        return;
      }
    }

    // Step 2: Start transaction
    const transaction = requiresLock ? await sequelize.transaction() : null;

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
        socket.emit('action_rejected', {
          clientSeq,
          reason: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
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
      /** @type {HandlerContext} */
      const ctx = {
        socket,
        userId,
        user,
        state,
        transaction,
        clientSeq
      };

      /** @type {HandlerResult} */
      const result = await execute(ctx, data);

      // Step 6: Handle failure
      if (!result.success) {
        if (transaction) await transaction.rollback();
        socket.emit('action_rejected', {
          clientSeq,
          reason: result.error || 'Operation failed',
          code: result.code || errorCode,
          ...result.rejectData
        });
        return;
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

      // Step 8: Broadcast result
      if (!skipBroadcast) {
        const seq = getNextSequence(userId);
        broadcastToUser(namespace, userId, eventName, {
          ...result.data,
          seq,
          confirmedClientSeq: clientSeq,
          serverTimestamp: now
        });
      }

    } catch (err) {
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackErr) {
          console.error('[EssenceTap WS] Rollback error:', rollbackErr);
        }
      }
      console.error(`[EssenceTap WS] ${eventName} error:`, err);
      socket.emit('error', {
        code: errorCode,
        message: 'Operation failed'
      });
    }
  };
}

/**
 * Create a simple handler that just calls a service function
 * Reduces boilerplate even further for common patterns
 *
 * @param {Object} options - Simple handler options
 * @param {string} options.eventName - Output event name
 * @param {string} options.errorCode - Error code for failures
 * @param {string} options.paramName - Required parameter name
 * @param {function} options.serviceMethod - Service method to call
 * @param {function} [options.buildResponse] - Function to build response data
 * @returns {function} Socket event handler
 */
function createSimpleHandler(options) {
  const {
    eventName,
    errorCode,
    paramName,
    serviceMethod,
    buildResponse,
    resetDaily = false,
    resetWeeklyFP = false
  } = options;

  return createHandler({
    eventName,
    errorCode,
    resetDaily,
    resetWeeklyFP,
    validate: paramName ? (data) => data[paramName] ? null : `${paramName} required` : null,
    execute: async (ctx, data) => {
      const result = serviceMethod(ctx.state, data[paramName], data);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code
        };
      }

      const responseData = buildResponse
        ? buildResponse(result, data, ctx)
        : { ...result };

      // Remove internal fields from response
      delete responseData.success;
      delete responseData.newState;

      return {
        success: true,
        newState: result.newState,
        fatePointsToAward: result.fatePoints || result.fatePointsAwarded,
        rollTicketsToAward: result.rollTickets,
        data: responseData
      };
    }
  });
}

/**
 * Register multiple handlers on a socket
 * @param {Object} socket - Socket.io socket
 * @param {number} userId - User ID
 * @param {Object} namespace - Socket.io namespace
 * @param {Object.<string, function>} handlers - Map of event names to handlers
 */
function registerHandlers(socket, userId, namespace, handlers) {
  for (const [eventName, handler] of Object.entries(handlers)) {
    socket.on(eventName, (data) => handler(socket, userId, namespace, data));
  }
}

module.exports = {
  createHandler,
  createSimpleHandler,
  registerHandlers
};
