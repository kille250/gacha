/**
 * Essence Tap Error Classes
 * Standardized error handling for all Essence Tap operations
 */

class EssenceTapError extends Error {
  constructor(message, code = 'ESSENCE_TAP_ERROR', statusCode = 400) {
    super(message);
    this.name = 'EssenceTapError';
    this.code = code;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code
    };
  }
}

class ValidationError extends EssenceTapError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class InsufficientResourcesError extends EssenceTapError {
  constructor(resource, required, available) {
    super(`Insufficient ${resource}: need ${required}, have ${available}`, 'INSUFFICIENT_RESOURCES', 400);
    this.name = 'InsufficientResourcesError';
    this.resource = resource;
    this.required = required;
    this.available = available;
  }
}

class CooldownError extends EssenceTapError {
  constructor(action, remainingMs) {
    const remainingSec = Math.ceil(remainingMs / 1000);
    super(`${action} on cooldown. ${remainingSec}s remaining.`, 'COOLDOWN_ACTIVE', 400);
    this.name = 'CooldownError';
    this.action = action;
    this.remainingMs = remainingMs;
  }
}

class LimitReachedError extends EssenceTapError {
  constructor(limit, current, max) {
    super(`${limit} limit reached: ${current}/${max}`, 'LIMIT_REACHED', 400);
    this.name = 'LimitReachedError';
    this.limit = limit;
    this.current = current;
    this.max = max;
  }
}

class NotFoundError extends EssenceTapError {
  constructor(entity, id) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    this.entity = entity;
    this.entityId = id;
  }
}

class StateError extends EssenceTapError {
  constructor(message) {
    super(message, 'STATE_ERROR', 400);
    this.name = 'StateError';
  }
}

class UnlockRequiredError extends EssenceTapError {
  constructor(item, requirement) {
    super(`${item} requires: ${requirement}`, 'UNLOCK_REQUIRED', 400);
    this.name = 'UnlockRequiredError';
    this.item = item;
    this.requirement = requirement;
  }
}

/**
 * Format error for API response
 */
function formatError(error) {
  if (error instanceof EssenceTapError) {
    return error.toJSON();
  }
  console.error('Unexpected error:', error);
  return {
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  };
}

/**
 * Create result object for operations
 */
function createResult(success, data = {}) {
  return { success, ...data };
}

function successResult(data = {}) {
  return createResult(true, data);
}

function errorResult(error) {
  if (typeof error === 'string') {
    return createResult(false, { error });
  }
  if (error instanceof EssenceTapError) {
    return createResult(false, error.toJSON());
  }
  return createResult(false, { error: error.message || 'Unknown error' });
}

module.exports = {
  EssenceTapError,
  ValidationError,
  InsufficientResourcesError,
  CooldownError,
  LimitReachedError,
  NotFoundError,
  StateError,
  UnlockRequiredError,
  formatError,
  createResult,
  successResult,
  errorResult
};
