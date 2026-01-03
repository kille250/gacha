/**
 * Essence Tap Error Handling
 *
 * Standardized error types and error handling utilities.
 * Used across routes, WebSocket handlers, and services.
 */

/**
 * Error codes for Essence Tap
 * @enum {string}
 */
const ErrorCodes = {
  // General errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'SERVER_ERROR',

  // Essence/currency errors
  INSUFFICIENT_ESSENCE: 'INSUFFICIENT_ESSENCE',
  INSUFFICIENT_SHARDS: 'INSUFFICIENT_SHARDS',
  INSUFFICIENT_FP: 'INSUFFICIENT_FATE_POINTS',

  // Generator errors
  INVALID_GENERATOR: 'INVALID_GENERATOR',
  GENERATOR_LOCKED: 'GENERATOR_LOCKED',

  // Upgrade errors
  INVALID_UPGRADE: 'INVALID_UPGRADE',
  UPGRADE_LOCKED: 'UPGRADE_LOCKED',
  ALREADY_PURCHASED: 'ALREADY_PURCHASED',
  UPGRADE_MAXED: 'UPGRADE_MAXED',

  // Character errors
  CHARACTER_NOT_OWNED: 'CHARACTER_NOT_OWNED',
  ALREADY_ASSIGNED: 'ALREADY_ASSIGNED',
  NOT_ASSIGNED: 'NOT_ASSIGNED',
  MAX_CHARACTERS_ASSIGNED: 'MAX_CHARACTERS_ASSIGNED',

  // Prestige errors
  CANNOT_PRESTIGE: 'CANNOT_PRESTIGE',
  PRESTIGE_COOLDOWN: 'PRESTIGE_COOLDOWN',

  // Gamble errors
  GAMBLE_COOLDOWN: 'GAMBLE_COOLDOWN',
  INSUFFICIENT_BET: 'INSUFFICIENT_BET',
  INVALID_BET_TYPE: 'INVALID_BET_TYPE',

  // Boss errors
  BOSS_NOT_ACTIVE: 'BOSS_NOT_ACTIVE',
  BOSS_EXPIRED: 'BOSS_EXPIRED',
  BOSS_COOLDOWN: 'BOSS_COOLDOWN',
  BOSS_SPAWN_FAILED: 'BOSS_SPAWN_FAILED',

  // Challenge/milestone errors
  CHALLENGE_NOT_COMPLETED: 'CHALLENGE_NOT_COMPLETED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',
  MILESTONE_NOT_REACHED: 'MILESTONE_NOT_REACHED',
  INVALID_MILESTONE: 'INVALID_MILESTONE',
  INVALID_CHALLENGE: 'INVALID_CHALLENGE',

  // Tournament errors
  NO_REWARDS: 'NO_REWARDS',
  INVALID_TIER: 'INVALID_TIER',
  INVALID_CHECKPOINT: 'INVALID_CHECKPOINT',
  REQUIREMENTS_NOT_MET: 'REQUIREMENTS_NOT_MET',

  // Infusion errors
  INFUSION_LIMIT_REACHED: 'INFUSION_LIMIT_REACHED',
  INFUSION_FAILED: 'INFUSION_FAILED'
};

/**
 * HTTP status codes for errors
 */
const ErrorStatusCodes = {
  [ErrorCodes.INVALID_REQUEST]: 400,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.SERVER_ERROR]: 500,
  [ErrorCodes.INSUFFICIENT_ESSENCE]: 400,
  [ErrorCodes.INSUFFICIENT_SHARDS]: 400,
  [ErrorCodes.INSUFFICIENT_FP]: 400,
  [ErrorCodes.INVALID_GENERATOR]: 400,
  [ErrorCodes.GENERATOR_LOCKED]: 403,
  [ErrorCodes.INVALID_UPGRADE]: 400,
  [ErrorCodes.UPGRADE_LOCKED]: 403,
  [ErrorCodes.ALREADY_PURCHASED]: 409,
  [ErrorCodes.UPGRADE_MAXED]: 409,
  [ErrorCodes.CHARACTER_NOT_OWNED]: 403,
  [ErrorCodes.ALREADY_ASSIGNED]: 409,
  [ErrorCodes.NOT_ASSIGNED]: 400,
  [ErrorCodes.MAX_CHARACTERS_ASSIGNED]: 400,
  [ErrorCodes.CANNOT_PRESTIGE]: 400,
  [ErrorCodes.PRESTIGE_COOLDOWN]: 429,
  [ErrorCodes.GAMBLE_COOLDOWN]: 429,
  [ErrorCodes.INSUFFICIENT_BET]: 400,
  [ErrorCodes.INVALID_BET_TYPE]: 400,
  [ErrorCodes.BOSS_NOT_ACTIVE]: 400,
  [ErrorCodes.BOSS_EXPIRED]: 400,
  [ErrorCodes.BOSS_COOLDOWN]: 429,
  [ErrorCodes.BOSS_SPAWN_FAILED]: 400,
  [ErrorCodes.CHALLENGE_NOT_COMPLETED]: 400,
  [ErrorCodes.ALREADY_CLAIMED]: 409,
  [ErrorCodes.MILESTONE_NOT_REACHED]: 400,
  [ErrorCodes.INVALID_MILESTONE]: 400,
  [ErrorCodes.INVALID_CHALLENGE]: 400,
  [ErrorCodes.NO_REWARDS]: 400,
  [ErrorCodes.INVALID_TIER]: 400,
  [ErrorCodes.INVALID_CHECKPOINT]: 400,
  [ErrorCodes.REQUIREMENTS_NOT_MET]: 400,
  [ErrorCodes.INFUSION_LIMIT_REACHED]: 400,
  [ErrorCodes.INFUSION_FAILED]: 400
};

/**
 * Essence Tap Error class
 */
class EssenceTapError extends Error {
  /**
   * Create an Essence Tap error
   * @param {string} code - Error code from ErrorCodes
   * @param {string} message - Human-readable error message
   * @param {Object} details - Additional error details
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'EssenceTapError';
    this.code = code;
    this.details = details;
    this.statusCode = ErrorStatusCodes[code] || 400;
  }

  /**
   * Convert to JSON for API response
   * @returns {Object} Error response object
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: Object.keys(this.details).length > 0 ? this.details : undefined
    };
  }

  /**
   * Convert to WebSocket rejection format
   * @param {number} clientSeq - Client sequence number
   * @returns {Object} WebSocket rejection object
   */
  toWSRejection(clientSeq) {
    return {
      clientSeq,
      reason: this.message,
      code: this.code,
      ...this.details
    };
  }
}

/**
 * Create a standardized error response for Express
 * @param {Response} res - Express response object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 */
function sendError(res, code, message, details = {}) {
  const statusCode = ErrorStatusCodes[code] || 400;
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...details
  });
}

/**
 * Create a standardized success response
 * @param {Response} res - Express response object
 * @param {Object} data - Response data
 */
function sendSuccess(res, data = {}) {
  res.json({
    success: true,
    ...data
  });
}

/**
 * Handle action result (from unified actions)
 * @param {Response} res - Express response object
 * @param {Object} result - Action result
 * @param {Object} additionalData - Additional data to include in success response
 */
function handleActionResult(res, result, additionalData = {}) {
  if (!result.success) {
    return sendError(res, result.code || ErrorCodes.SERVER_ERROR, result.error, result.details);
  }

  const { success: _success, newState: _newState, error: _error, code: _code, ...data } = result;
  sendSuccess(res, { ...data, ...additionalData });
}

/**
 * Wrap async route handler with error handling
 * @param {Function} handler - Async route handler
 * @returns {Function} Wrapped handler
 */
function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('[EssenceTap] Route error:', error);

      if (error instanceof EssenceTapError) {
        return sendError(res, error.code, error.message, error.details);
      }

      sendError(res, ErrorCodes.SERVER_ERROR, 'An unexpected error occurred');
    }
  };
}

/**
 * WebSocket error emitter
 * @param {Object} socket - Socket.io socket
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 */
function emitWSError(socket, code, message, details = {}) {
  socket.emit('error', {
    code,
    message,
    ...details
  });
}

/**
 * WebSocket action rejection emitter
 * @param {Object} socket - Socket.io socket
 * @param {number} clientSeq - Client sequence number
 * @param {string} code - Error code
 * @param {string} reason - Rejection reason
 * @param {Object} details - Additional details
 */
function emitWSRejection(socket, clientSeq, code, reason, details = {}) {
  socket.emit('action_rejected', {
    clientSeq,
    code,
    reason,
    ...details
  });
}

/**
 * Handle WebSocket action result
 * @param {Object} socket - Socket.io socket
 * @param {number} clientSeq - Client sequence number
 * @param {Object} result - Action result
 * @param {string} successEvent - Event name for success
 * @param {Object} additionalData - Additional data to include
 */
function handleWSActionResult(socket, clientSeq, result, successEvent, additionalData = {}) {
  if (!result.success) {
    return emitWSRejection(socket, clientSeq, result.code || ErrorCodes.SERVER_ERROR, result.error, result.details);
  }

  const { success: _success, newState: _newState, error: _error, code: _code, ...data } = result;
  socket.emit(successEvent, {
    ...data,
    ...additionalData,
    confirmedClientSeq: clientSeq,
    serverTimestamp: Date.now()
  });
}

module.exports = {
  ErrorCodes,
  ErrorStatusCodes,
  EssenceTapError,
  sendError,
  sendSuccess,
  handleActionResult,
  asyncHandler,
  emitWSError,
  emitWSRejection,
  handleWSActionResult
};
