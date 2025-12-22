/**
 * Custom Error Classes for Fishing System
 * 
 * Provides structured error handling with proper HTTP status codes
 * and machine-readable error codes for frontend handling.
 */

class FishingError extends Error {
  constructor(message, code, statusCode = 400, details = {}) {
    super(message);
    this.name = 'FishingError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...this.details
    };
  }
}

class UserNotFoundError extends FishingError {
  constructor(userId = null) {
    super('User not found', 'USER_NOT_FOUND', 404, userId ? { userId } : {});
    this.name = 'UserNotFoundError';
  }
}

class InsufficientPointsError extends FishingError {
  constructor(required, current) {
    super('Not enough points', 'INSUFFICIENT_POINTS', 400, { required, current });
    this.name = 'InsufficientPointsError';
  }
}

class DailyLimitError extends FishingError {
  constructor(limitType, used, limit) {
    super(
      `Daily ${limitType} limit reached`,
      'DAILY_LIMIT_REACHED',
      429,
      { limitType, used, limit, remaining: 0 }
    );
    this.name = 'DailyLimitError';
  }
}

class CooldownError extends FishingError {
  constructor(remainingMs, actionType = 'action') {
    super(
      `Please wait ${Math.ceil(remainingMs / 1000)} seconds`,
      'COOLDOWN_ACTIVE',
      429,
      { retryAfter: remainingMs, actionType }
    );
    this.name = 'CooldownError';
  }
}

class ModeConflictError extends FishingError {
  constructor(currentMode, requestedMode) {
    super(
      `Cannot ${requestedMode} while ${currentMode} is active`,
      'MODE_CONFLICT',
      409,
      { currentMode, requestedMode }
    );
    this.name = 'ModeConflictError';
  }
}

class SessionError extends FishingError {
  constructor(type = 'invalid') {
    const messages = {
      invalid: 'Fishing session expired or invalid',
      expired: 'Fishing session has expired',
      not_owner: 'Not your fishing session',
      too_many: 'Too many active sessions'
    };
    super(messages[type] || messages.invalid, `SESSION_${type.toUpperCase()}`, type === 'not_owner' ? 403 : 400);
    this.name = 'SessionError';
  }
}

class TradeError extends FishingError {
  constructor(type, details = {}) {
    const config = {
      not_found: { message: 'Trade option not found', status: 404 },
      not_enough_fish: { message: 'Not enough fish for this trade', status: 400 },
      in_progress: { message: 'Another trade is being processed', status: 429 },
      invalid_quantity: { message: 'Invalid trade quantity', status: 400 }
    };
    const { message, status } = config[type] || { message: 'Trade error', status: 400 };
    super(message, `TRADE_${type.toUpperCase()}`, status, details);
    this.name = 'TradeError';
  }
}

class AreaError extends FishingError {
  constructor(type, details = {}) {
    const config = {
      not_found: { message: 'Area not found', status: 404 },
      already_unlocked: { message: 'Area already unlocked', status: 400 },
      not_unlocked: { message: 'Area not unlocked', status: 403 },
      rank_required: { message: 'Higher rank required', status: 403 }
    };
    const { message, status } = config[type] || { message: 'Area error', status: 400 };
    super(message, `AREA_${type.toUpperCase()}`, status, details);
    this.name = 'AreaError';
  }
}

class RodError extends FishingError {
  constructor(type, details = {}) {
    const config = {
      not_found: { message: 'Rod not found', status: 404 },
      already_owned: { message: 'You already own this rod', status: 400 },
      not_owned: { message: 'You need to purchase this rod first', status: 403 },
      prestige_required: { message: 'Higher prestige level required', status: 403 }
    };
    const { message, status } = config[type] || { message: 'Rod error', status: 400 };
    super(message, `ROD_${type.toUpperCase()}`, status, details);
    this.name = 'RodError';
  }
}

class ChallengeError extends FishingError {
  constructor(type, details = {}) {
    const config = {
      not_found: { message: 'Challenge not found', status: 404 },
      not_active: { message: 'Challenge not active today', status: 400 },
      not_completed: { message: 'Challenge not completed yet', status: 400 },
      already_claimed: { message: 'Challenge reward already claimed', status: 400 }
    };
    const { message, status } = config[type] || { message: 'Challenge error', status: 400 };
    super(message, `CHALLENGE_${type.toUpperCase()}`, status, details);
    this.name = 'ChallengeError';
  }
}

/**
 * Error handler middleware for fishing routes
 * Converts FishingError instances to proper HTTP responses
 */
function fishingErrorHandler(err, req, res, _next) {
  if (err instanceof FishingError) {
    return res.status(err.statusCode).json(err.toJSON());
  }
  
  // Log unexpected errors
  console.error('Unexpected fishing error:', err);
  return res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred' });
}

module.exports = {
  FishingError,
  UserNotFoundError,
  InsufficientPointsError,
  DailyLimitError,
  CooldownError,
  ModeConflictError,
  SessionError,
  TradeError,
  AreaError,
  RodError,
  ChallengeError,
  fishingErrorHandler
};

