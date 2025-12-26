/**
 * HTTP Response Helpers
 *
 * Centralized utilities for consistent API response formatting.
 * Reduces code duplication across route handlers.
 */

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} [extra] - Additional data to include
 */
const sendError = (res, statusCode, message, extra = {}) => {
  return res.status(statusCode).json({ error: message, ...extra });
};

/**
 * Send a 400 Bad Request error
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} [extra] - Additional data to include
 */
const send400 = (res, message, extra = {}) => {
  return sendError(res, 400, message, extra);
};

/**
 * Send a 401 Unauthorized error
 * @param {Object} res - Express response object
 * @param {string} [message='Unauthorized'] - Error message
 */
const send401 = (res, message = 'Unauthorized') => {
  return sendError(res, 401, message);
};

/**
 * Send a 403 Forbidden error
 * @param {Object} res - Express response object
 * @param {string} [message='Forbidden'] - Error message
 */
const send403 = (res, message = 'Forbidden') => {
  return sendError(res, 403, message);
};

/**
 * Send a 404 Not Found error
 * @param {Object} res - Express response object
 * @param {string} [message='Not found'] - Error message
 */
const send404 = (res, message = 'Not found') => {
  return sendError(res, 404, message);
};

/**
 * Send a 429 Too Many Requests error
 * @param {Object} res - Express response object
 * @param {string} [message='Too many requests'] - Error message
 * @param {Object} [extra] - Additional data (e.g., retryAfter)
 */
const send429 = (res, message = 'Too many requests', extra = {}) => {
  return sendError(res, 429, message, extra);
};

/**
 * Send a 500 Internal Server Error
 * @param {Object} res - Express response object
 * @param {string} [message='Internal server error'] - Error message
 * @param {Error} [error] - Original error (for logging, not sent to client)
 */
const send500 = (res, message = 'Internal server error', error = null) => {
  if (error) {
    console.error('[HTTP 500]', message, error);
  }
  return sendError(res, 500, message);
};

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {number} [statusCode=200] - HTTP status code
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json(data);
};

/**
 * Send a 201 Created response
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 */
const sendCreated = (res, data) => {
  return sendSuccess(res, data, 201);
};

module.exports = {
  sendError,
  send400,
  send401,
  send403,
  send404,
  send429,
  send500,
  sendSuccess,
  sendCreated
};
