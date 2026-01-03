/**
 * Essence Tap Error Standardization Module
 *
 * Provides standardized error handling with:
 * - Error code constants
 * - EssenceTapError class with code and status properties
 * - Factory functions for common error scenarios
 * - Error formatting and HTTP status mapping utilities
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
  INSUFFICIENT_TICKETS: 'INSUFFICIENT_TICKETS',
  INSUFFICIENT_BET: 'INSUFFICIENT_BET',

  // ID validation errors
  INVALID_GENERATOR_ID: 'INVALID_GENERATOR_ID',
  INVALID_UPGRADE_ID: 'INVALID_UPGRADE_ID',
  INVALID_CHARACTER_ID: 'INVALID_CHARACTER_ID',
  INVALID_ABILITY_ID: 'INVALID_ABILITY_ID',
  INVALID_MILESTONE_ID: 'INVALID_MILESTONE_ID',
  INVALID_CHALLENGE_ID: 'INVALID_CHALLENGE_ID',
  INVALID_BOSS_ID: 'INVALID_BOSS_ID',

  // Generator errors
  GENERATOR_LOCKED: 'GENERATOR_LOCKED',

  // Upgrade errors
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
  INVALID_BET_TYPE: 'INVALID_BET_TYPE',

  // Boss errors
  BOSS_NOT_ACTIVE: 'BOSS_NOT_ACTIVE',
  BOSS_EXPIRED: 'BOSS_EXPIRED',
  BOSS_COOLDOWN: 'BOSS_COOLDOWN',
  BOSS_SPAWN_FAILED: 'BOSS_SPAWN_FAILED',
  NO_ACTIVE_BOSS: 'NO_ACTIVE_BOSS',

  // Challenge/milestone errors
  CHALLENGE_NOT_COMPLETED: 'CHALLENGE_NOT_COMPLETED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',
  MILESTONE_NOT_REACHED: 'MILESTONE_NOT_REACHED',
  ALREADY_CLAIMED_THIS_WEEK: 'ALREADY_CLAIMED_THIS_WEEK',

  // Tournament errors
  NO_REWARDS: 'NO_REWARDS',
  INVALID_TIER: 'INVALID_TIER',
  INVALID_CHECKPOINT: 'INVALID_CHECKPOINT',
  REQUIREMENTS_NOT_MET: 'REQUIREMENTS_NOT_MET',

  // Infusion errors
  INFUSION_LIMIT_REACHED: 'INFUSION_LIMIT_REACHED',
  INFUSION_FAILED: 'INFUSION_FAILED',

  // Ability errors
  ABILITY_LOCKED: 'ABILITY_LOCKED',
  ABILITY_COOLDOWN: 'ABILITY_COOLDOWN',

  // Generic not found errors
  GENERATOR_NOT_FOUND: 'GENERATOR_NOT_FOUND',
  UPGRADE_NOT_FOUND: 'UPGRADE_NOT_FOUND',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',
  BOSS_NOT_FOUND: 'BOSS_NOT_FOUND',
  MILESTONE_NOT_FOUND: 'MILESTONE_NOT_FOUND',

  // Limit/availability errors
  WEEKLY_FP_CAP_REACHED: 'WEEKLY_FP_CAP_REACHED',
  EXCHANGE_LIMIT_REACHED: 'EXCHANGE_LIMIT_REACHED',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  ON_COOLDOWN: 'ON_COOLDOWN'
};

/**
 * HTTP status codes for errors
 */
const ErrorStatusCodes = {
  [ErrorCodes.INVALID_REQUEST]: 400,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.SERVER_ERROR]: 500,

  // Currency errors (400 - Bad Request)
  [ErrorCodes.INSUFFICIENT_ESSENCE]: 400,
  [ErrorCodes.INSUFFICIENT_SHARDS]: 400,
  [ErrorCodes.INSUFFICIENT_FP]: 400,
  [ErrorCodes.INSUFFICIENT_TICKETS]: 400,
  [ErrorCodes.INSUFFICIENT_BET]: 400,

  // Invalid ID errors (400 - Bad Request)
  [ErrorCodes.INVALID_GENERATOR_ID]: 400,
  [ErrorCodes.INVALID_UPGRADE_ID]: 400,
  [ErrorCodes.INVALID_CHARACTER_ID]: 400,
  [ErrorCodes.INVALID_ABILITY_ID]: 400,
  [ErrorCodes.INVALID_MILESTONE_ID]: 400,
  [ErrorCodes.INVALID_CHALLENGE_ID]: 400,
  [ErrorCodes.INVALID_BOSS_ID]: 400,

  // Locked/Forbidden errors (403 - Forbidden)
  [ErrorCodes.GENERATOR_LOCKED]: 403,
  [ErrorCodes.UPGRADE_LOCKED]: 403,
  [ErrorCodes.CHARACTER_NOT_OWNED]: 403,
  [ErrorCodes.ABILITY_LOCKED]: 403,

  // Conflict errors (409 - Conflict)
  [ErrorCodes.ALREADY_PURCHASED]: 409,
  [ErrorCodes.UPGRADE_MAXED]: 409,
  [ErrorCodes.ALREADY_ASSIGNED]: 409,
  [ErrorCodes.ALREADY_CLAIMED]: 409,
  [ErrorCodes.ALREADY_CLAIMED_THIS_WEEK]: 409,

  // State errors (400 - Bad Request)
  [ErrorCodes.NOT_ASSIGNED]: 400,
  [ErrorCodes.MAX_CHARACTERS_ASSIGNED]: 400,
  [ErrorCodes.CANNOT_PRESTIGE]: 400,
  [ErrorCodes.BOSS_NOT_ACTIVE]: 400,
  [ErrorCodes.BOSS_EXPIRED]: 400,
  [ErrorCodes.BOSS_SPAWN_FAILED]: 400,
  [ErrorCodes.CHALLENGE_NOT_COMPLETED]: 400,
  [ErrorCodes.MILESTONE_NOT_REACHED]: 400,
  [ErrorCodes.NO_REWARDS]: 400,
  [ErrorCodes.INVALID_TIER]: 400,
  [ErrorCodes.INVALID_CHECKPOINT]: 400,
  [ErrorCodes.REQUIREMENTS_NOT_MET]: 400,
  [ErrorCodes.INFUSION_LIMIT_REACHED]: 400,
  [ErrorCodes.INFUSION_FAILED]: 400,
  [ErrorCodes.NO_ACTIVE_BOSS]: 400,
  [ErrorCodes.INVALID_BET_TYPE]: 400,

  // Cooldown/Rate limit errors (429 - Too Many Requests)
  [ErrorCodes.PRESTIGE_COOLDOWN]: 429,
  [ErrorCodes.GAMBLE_COOLDOWN]: 429,
  [ErrorCodes.BOSS_COOLDOWN]: 429,
  [ErrorCodes.ABILITY_COOLDOWN]: 429,
  [ErrorCodes.ON_COOLDOWN]: 429,

  // Not found errors (404 - Not Found)
  [ErrorCodes.GENERATOR_NOT_FOUND]: 404,
  [ErrorCodes.UPGRADE_NOT_FOUND]: 404,
  [ErrorCodes.CHARACTER_NOT_FOUND]: 404,
  [ErrorCodes.BOSS_NOT_FOUND]: 404,
  [ErrorCodes.MILESTONE_NOT_FOUND]: 404,

  // Limit errors (400 - Bad Request)
  [ErrorCodes.WEEKLY_FP_CAP_REACHED]: 400,
  [ErrorCodes.EXCHANGE_LIMIT_REACHED]: 400,
  [ErrorCodes.NOT_AVAILABLE]: 400
};

/**
 * Essence Tap Error class
 * Extends Error with code and status properties for standardized error handling
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
    this.status = ErrorStatusCodes[code] || 400;
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
 * Factory function: Insufficient essence error
 * @param {number} required - Amount required
 * @param {number} available - Amount available
 * @returns {EssenceTapError}
 */
function insufficientEssence(required, available) {
  return new EssenceTapError(
    ErrorCodes.INSUFFICIENT_ESSENCE,
    `Insufficient essence. Required: ${required}, Available: ${available}`,
    { required, available }
  );
}

/**
 * Factory function: Insufficient shards error
 * @param {number} required - Amount required
 * @param {number} available - Amount available
 * @returns {EssenceTapError}
 */
function insufficientShards(required, available) {
  return new EssenceTapError(
    ErrorCodes.INSUFFICIENT_SHARDS,
    `Insufficient prestige shards. Required: ${required}, Available: ${available}`,
    { required, available }
  );
}

/**
 * Factory function: Insufficient fate points error
 * @param {number} required - Amount required
 * @param {number} available - Amount available
 * @returns {EssenceTapError}
 */
function insufficientFP(required, available) {
  return new EssenceTapError(
    ErrorCodes.INSUFFICIENT_FP,
    `Insufficient fate points. Required: ${required}, Available: ${available}`,
    { required, available }
  );
}

/**
 * Factory function: Invalid ID error
 * @param {string} type - Type of entity (generator, upgrade, character, etc.)
 * @param {string} id - The invalid ID
 * @returns {EssenceTapError}
 */
function invalidId(type, id) {
  const typeUpper = type.toUpperCase();
  const codeKey = `INVALID_${typeUpper}_ID`;
  const code = ErrorCodes[codeKey] || ErrorCodes.INVALID_REQUEST;

  return new EssenceTapError(
    code,
    `Invalid ${type} ID: ${id}`,
    { type, id }
  );
}

/**
 * Factory function: Entity not found error
 * @param {string} type - Type of entity (user, boss, generator, etc.)
 * @param {string} [id] - Optional ID of the entity
 * @returns {EssenceTapError}
 */
function notFound(type, id = null) {
  const typeUpper = type.toUpperCase();
  const codeKey = `${typeUpper}_NOT_FOUND`;
  const code = ErrorCodes[codeKey] || ErrorCodes.USER_NOT_FOUND;

  const message = id
    ? `${type.charAt(0).toUpperCase() + type.slice(1)} not found: ${id}`
    : `${type.charAt(0).toUpperCase() + type.slice(1)} not found`;

  return new EssenceTapError(
    code,
    message,
    id ? { type, id } : { type }
  );
}

/**
 * Factory function: Already claimed error
 * @param {string} type - Type of claimable (milestone, challenge, reward, etc.)
 * @param {string} [id] - Optional ID of the claimable
 * @returns {EssenceTapError}
 */
function alreadyClaimed(type, id = null) {
  const message = id
    ? `${type.charAt(0).toUpperCase() + type.slice(1)} already claimed: ${id}`
    : `${type.charAt(0).toUpperCase() + type.slice(1)} already claimed`;

  return new EssenceTapError(
    ErrorCodes.ALREADY_CLAIMED,
    message,
    id ? { type, id } : { type }
  );
}

/**
 * Factory function: Limit reached error
 * @param {string} type - Type of limit (weekly FP, exchange, infusion, etc.)
 * @param {number} [limit] - Optional limit value
 * @param {number} [current] - Optional current value
 * @returns {EssenceTapError}
 */
function limitReached(type, limit = null, current = null) {
  const typeUpper = type.toUpperCase().replace(/\s+/g, '_');
  let code;

  // Map common limit types to specific error codes
  if (typeUpper.includes('WEEKLY_FP') || typeUpper.includes('FP_CAP')) {
    code = ErrorCodes.WEEKLY_FP_CAP_REACHED;
  } else if (typeUpper.includes('EXCHANGE')) {
    code = ErrorCodes.EXCHANGE_LIMIT_REACHED;
  } else if (typeUpper.includes('INFUSION')) {
    code = ErrorCodes.INFUSION_LIMIT_REACHED;
  } else {
    code = ErrorCodes.RATE_LIMIT_EXCEEDED;
  }

  const details = {};
  if (limit !== null) details.limit = limit;
  if (current !== null) details.current = current;
  if (Object.keys(details).length > 0) details.type = type;

  let message = `${type.charAt(0).toUpperCase() + type.slice(1)} limit reached`;
  if (limit !== null && current !== null) {
    message += `. Current: ${current}, Limit: ${limit}`;
  }

  return new EssenceTapError(code, message, details);
}

/**
 * Factory function: Not available error
 * @param {string} type - Type of unavailable entity (upgrade, ability, feature, etc.)
 * @param {string} [reason] - Optional reason why it's not available
 * @returns {EssenceTapError}
 */
function notAvailable(type, reason = null) {
  const typeUpper = type.toUpperCase();
  let code;
  let message;

  // Map specific types to error codes
  if (typeUpper.includes('UPGRADE')) {
    code = ErrorCodes.UPGRADE_LOCKED;
    message = reason || `${type} not unlocked yet`;
  } else if (typeUpper.includes('GENERATOR')) {
    code = ErrorCodes.GENERATOR_LOCKED;
    message = reason || `${type} not unlocked yet`;
  } else if (typeUpper.includes('ABILITY') || typeUpper.includes('COOLDOWN')) {
    code = ErrorCodes.ON_COOLDOWN;
    message = reason || `${type} on cooldown`;
  } else if (typeUpper.includes('CHARACTER')) {
    code = ErrorCodes.CHARACTER_NOT_OWNED;
    message = reason || `${type} not owned`;
  } else {
    code = ErrorCodes.NOT_AVAILABLE;
    message = reason || `${type} not available`;
  }

  return new EssenceTapError(
    code,
    message,
    reason ? { type, reason } : { type }
  );
}

/**
 * Factory function: On cooldown error
 * @param {string} type - Type of action on cooldown
 * @param {number} [remainingMs] - Optional remaining cooldown in milliseconds
 * @returns {EssenceTapError}
 */
function onCooldown(type, remainingMs = null) {
  const typeUpper = type.toUpperCase();
  let code;

  // Map specific types to cooldown error codes
  if (typeUpper.includes('PRESTIGE')) {
    code = ErrorCodes.PRESTIGE_COOLDOWN;
  } else if (typeUpper.includes('GAMBLE')) {
    code = ErrorCodes.GAMBLE_COOLDOWN;
  } else if (typeUpper.includes('BOSS')) {
    code = ErrorCodes.BOSS_COOLDOWN;
  } else if (typeUpper.includes('ABILITY')) {
    code = ErrorCodes.ABILITY_COOLDOWN;
  } else {
    code = ErrorCodes.ON_COOLDOWN;
  }

  const message = remainingMs
    ? `${type} on cooldown. ${Math.ceil(remainingMs / 1000)}s remaining`
    : `${type} on cooldown`;

  return new EssenceTapError(
    code,
    message,
    remainingMs ? { type, remainingMs } : { type }
  );
}

/**
 * Format an error into a standardized response object
 * @param {Error|EssenceTapError} error - Error to format
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error) {
  if (error instanceof EssenceTapError) {
    return error.toJSON();
  }

  // Handle generic errors
  return {
    success: false,
    error: error.message || 'An unexpected error occurred',
    code: ErrorCodes.SERVER_ERROR
  };
}

/**
 * Handle action errors and map to appropriate HTTP status codes
 * @param {Error|EssenceTapError} error - Error to handle
 * @returns {Object} Object with status code and formatted response
 */
function handleActionError(error) {
  if (error instanceof EssenceTapError) {
    return {
      status: error.status,
      response: error.toJSON()
    };
  }

  // Handle generic errors
  return {
    status: 500,
    response: {
      success: false,
      error: error.message || 'An unexpected error occurred',
      code: ErrorCodes.SERVER_ERROR
    }
  };
}

/**
 * Create error from action result (for backward compatibility)
 * @param {Object} result - Action result with error and code
 * @returns {EssenceTapError}
 */
function fromActionResult(result) {
  const code = result.code || ErrorCodes.SERVER_ERROR;
  const message = result.error || 'Action failed';
  const details = result.details || {};

  return new EssenceTapError(code, message, details);
}

module.exports = {
  // Error codes and classes
  ErrorCodes,
  ErrorStatusCodes,
  EssenceTapError,

  // Factory functions for common errors
  insufficientEssence,
  insufficientShards,
  insufficientFP,
  invalidId,
  notFound,
  alreadyClaimed,
  limitReached,
  notAvailable,
  onCooldown,

  // Utility functions
  formatErrorResponse,
  handleActionError,
  fromActionResult
};
