/**
 * errorHandler.js - Centralized error handling utilities for API calls
 * 
 * Provides consistent error extraction, formatting, and handling patterns
 * across the application.
 * 
 * Key Concepts:
 * - CAPTCHA errors: Security verification issues (require re-verification)
 * - Business errors: Application logic errors (invalid input, insufficient funds, etc.)
 * - Auth errors: Session/authentication issues (require re-login)
 * - System errors: Server/network issues (retry later)
 */

/**
 * Error types for categorizing API errors
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  FORBIDDEN: 'FORBIDDEN',  // Policy denials, bans, etc. (403 but not auth failure)
  RATE_LIMITED: 'RATE_LIMITED',  // 429 errors
  CAPTCHA: 'CAPTCHA',  // CAPTCHA verification required/failed
  DUPLICATE: 'DUPLICATE',  // Duplicate content detected (409 with duplicate info)
  UNKNOWN: 'UNKNOWN',
};

/**
 * Duplicate detection status types from backend
 */
export const DUPLICATE_STATUS = {
  ACCEPTED: 'accepted',
  POSSIBLE_DUPLICATE: 'possible_duplicate',
  CONFIRMED_DUPLICATE: 'confirmed_duplicate',
};

/**
 * CAPTCHA-specific error codes
 * These indicate the CAPTCHA verification process itself had an issue
 */
export const CAPTCHA_ERROR_CODES = [
  'CAPTCHA_REQUIRED',   // Need to complete CAPTCHA
  'CAPTCHA_FAILED',     // CAPTCHA verification failed
  'CAPTCHA_EXPIRED',    // CAPTCHA token expired
  'CAPTCHA_INVALID',    // Invalid CAPTCHA response
];

/**
 * Terminal error codes - user cannot recover by retrying
 * These should show "contact support" rather than "try again"
 */
export const TERMINAL_ERROR_CODES = [
  'ACCOUNT_BANNED',
  'ACCOUNT_LOCKED',
  'IP_BANNED',
  'DEVICE_BANNED',
];

// Error codes that indicate policy/enforcement blocks, NOT auth failures
const NON_AUTH_403_CODES = [
  'POLICY_DENIED',
  'POLICY_ERROR', 
  'ACCOUNT_BANNED',
  'ACCOUNT_TEMP_BANNED',
  'ENFORCEMENT_ERROR',
  'ACCOUNT_LOCKED',
  'CAPTCHA_REQUIRED',
  'CAPTCHA_FAILED'
];

/**
 * Extract a user-friendly error message from an Axios error response
 * @param {Error} error - The error object (typically from Axios)
 * @param {string} fallback - Fallback message if no specific error is found
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  // Handle Axios response errors
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Handle network errors
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  
  if (error?.message === 'Network Error') {
    return 'Unable to connect to server. Please check your internet connection.';
  }
  
  // Handle specific HTTP status codes
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return error?.response?.data?.error || 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.';
      default:
        break;
    }
  }
  
  // Use error message if available
  if (error?.message) {
    return error.message;
  }
  
  return fallback;
};

/**
 * Categorize an error by type for different handling strategies
 * @param {Error} error - The error object
 * @returns {string} Error type from ERROR_TYPES
 */
export const getErrorType = (error) => {
  if (!error?.response) {
    return ERROR_TYPES.NETWORK;
  }
  
  const status = error.response.status;
  const errorCode = error.response?.data?.code;
  
  // 401 is always an auth error (token expired/invalid)
  if (status === 401) {
    return ERROR_TYPES.AUTH;
  }
  
  // 403 could be auth OR policy denial - check the error code
  if (status === 403) {
    // If it has a known non-auth code, it's a FORBIDDEN (policy) error, not AUTH
    if (NON_AUTH_403_CODES.includes(errorCode)) {
      return ERROR_TYPES.FORBIDDEN;
    }
    // Unknown 403 - treat as auth to be safe
    return ERROR_TYPES.AUTH;
  }
  
  if (status === 429) {
    return ERROR_TYPES.RATE_LIMITED;
  }
  
  if (status === 400 || status === 422) {
    return ERROR_TYPES.VALIDATION;
  }
  
  if (status === 404) {
    return ERROR_TYPES.NOT_FOUND;
  }
  
  if (status >= 500) {
    return ERROR_TYPES.SERVER;
  }
  
  return ERROR_TYPES.UNKNOWN;
};

/**
 * Check if an error is an authentication error (401/403)
 * @param {Error} error - The error object
 * @returns {boolean} True if auth error
 */
export const isAuthError = (error) => {
  return getErrorType(error) === ERROR_TYPES.AUTH;
};

/**
 * Check if an error is a network/connectivity error
 * @param {Error} error - The error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
  return getErrorType(error) === ERROR_TYPES.NETWORK;
};

/**
 * Check if an error is a forbidden/policy error (403 but NOT auth failure)
 * @param {Error} error - The error object
 * @returns {boolean} True if forbidden/policy error
 */
export const isForbiddenError = (error) => {
  return getErrorType(error) === ERROR_TYPES.FORBIDDEN;
};

/**
 * Check if an error is a rate limit error (429)
 * @param {Error} error - The error object
 * @returns {boolean} True if rate limited
 */
export const isRateLimitError = (error) => {
  return getErrorType(error) === ERROR_TYPES.RATE_LIMITED;
};

/**
 * Check if an error is a CAPTCHA-related error
 * These errors require the user to complete a CAPTCHA verification
 * @param {Error} error - The error object
 * @returns {boolean} True if CAPTCHA error
 */
export const isCaptchaError = (error) => {
  const code = error?.response?.data?.code;
  return CAPTCHA_ERROR_CODES.includes(code);
};

/**
 * Check if an error is a terminal error (user cannot recover)
 * These should show "contact support" messaging instead of "try again"
 * @param {Error} error - The error object
 * @returns {boolean} True if terminal/unrecoverable error
 */
export const isTerminalError = (error) => {
  const code = error?.response?.data?.code;
  return TERMINAL_ERROR_CODES.includes(code);
};

/**
 * Check if an error is a business logic error (not CAPTCHA-related)
 * Business errors occur when CAPTCHA succeeds but the actual action fails
 * Examples: invalid coupon, insufficient funds, item not found
 * @param {Error} error - The error object
 * @returns {boolean} True if business logic error
 */
export const isBusinessError = (error) => {
  // Not a CAPTCHA error and not a terminal system error
  return !isCaptchaError(error) &&
         !isAuthError(error) &&
         !isNetworkError(error) &&
         !isDuplicateError(error) &&
         error?.response?.status !== 500;
};

/**
 * Check if an error is a duplicate detection error (409 with duplicate info)
 * These errors are recoverable - user can choose different media
 * @param {Error} error - The error object
 * @returns {boolean} True if duplicate error
 */
export const isDuplicateError = (error) => {
  return error?.response?.status === 409 &&
         (error?.response?.data?.duplicateType ||
          error?.response?.data?.status === DUPLICATE_STATUS.CONFIRMED_DUPLICATE);
};

/**
 * Extract duplicate detection info from an error response
 * @param {Error} error - The error object
 * @returns {Object|null} Duplicate info or null if not a duplicate error
 */
export const getDuplicateInfo = (error) => {
  if (!isDuplicateError(error)) return null;

  const data = error.response.data;
  return {
    status: data.status || DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
    explanation: data.error || data.explanation || 'Duplicate content detected',
    similarity: data.similarity || data.existingCharacter?.similarity,
    existingMatch: data.existingCharacter || data.existingMatch || null,
    duplicateType: data.duplicateType || 'similar',
    suggestedActions: data.suggestedActions || ['change_media', 'cancel'],
  };
};

/**
 * Parse duplicate warning from a successful response (200/201)
 * Used when backend allows upload but flags as possible duplicate
 * @param {Object} responseData - The API response data
 * @returns {Object|null} Warning info or null if no warning
 */
export const parseDuplicateWarning = (responseData) => {
  // Check for warning in response
  if (responseData?.warning || responseData?.duplicateWarning) {
    const warning = responseData.duplicateWarning || {};
    return {
      status: warning.status || DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
      explanation: responseData.warning || warning.explanation || 'Possible duplicate detected',
      similarity: warning.similarity,
      existingMatch: warning.existingMatch || responseData.similarCharacters?.[0] || null,
      suggestedActions: warning.suggestedActions || ['continue', 'change_media'],
    };
  }

  // Check for similarCharacters array (legacy format)
  if (responseData?.similarCharacters?.length > 0) {
    const match = responseData.similarCharacters[0];
    return {
      status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
      explanation: responseData.warning || `Similar to existing character "${match.name}"`,
      similarity: match.similarity,
      existingMatch: match,
      suggestedActions: ['continue', 'change_media'],
    };
  }

  return null;
};

/**
 * Get a user-friendly error message for CAPTCHA-related states
 * @param {string} code - Error code from response
 * @returns {string} User-friendly message
 */
export const getCaptchaFriendlyMessage = (code) => {
  const messages = {
    'CAPTCHA_REQUIRED': 'Please complete the security verification to continue.',
    'CAPTCHA_FAILED': 'The security verification didn\'t pass. Please try again.',
    'CAPTCHA_EXPIRED': 'The verification expired. Please complete a new one.',
    'CAPTCHA_INVALID': 'There was an issue with the verification. Please try again.',
  };
  return messages[code] || 'Please complete the security verification.';
};

/**
 * Get a user-friendly, actionable error message
 * This function attempts to provide helpful context instead of technical errors
 * @param {Error} error - The error object
 * @param {Object} options - Options for message generation
 * @param {string} options.context - Action context (e.g., 'coupon', 'trade', 'login')
 * @returns {Object} { message: string, canRetry: boolean, suggestion?: string }
 */
export const getUserFriendlyError = (error, options = {}) => {
  const { context = 'action' } = options;
  const code = error?.response?.data?.code;
  const status = error?.response?.status;
  const rawMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message;
  
  // CAPTCHA errors
  if (isCaptchaError(error)) {
    return {
      message: getCaptchaFriendlyMessage(code),
      canRetry: true,
      suggestion: 'Complete the verification to proceed.',
    };
  }
  
  // Terminal errors
  if (isTerminalError(error)) {
    return {
      message: rawMessage || 'Your account has been restricted.',
      canRetry: false,
      suggestion: 'Please contact support for assistance.',
    };
  }
  
  // Rate limiting
  if (status === 429 || code === 'RATE_LIMITED') {
    return {
      message: 'Too many attempts. Please wait a moment.',
      canRetry: true,
      suggestion: 'Wait a few seconds before trying again.',
    };
  }
  
  // Validation errors - usually user can fix and retry
  if (status === 400 || status === 422) {
    return {
      message: rawMessage || `Please check your ${context} and try again.`,
      canRetry: true,
      suggestion: 'Review your input and make corrections.',
    };
  }
  
  // Not found
  if (status === 404) {
    return {
      message: rawMessage || 'The requested item could not be found.',
      canRetry: false,
    };
  }
  
  // Server errors
  if (status >= 500) {
    return {
      message: 'Something went wrong on our end.',
      canRetry: true,
      suggestion: 'Please try again in a few moments.',
    };
  }
  
  // Network errors
  if (isNetworkError(error)) {
    return {
      message: 'Unable to connect. Please check your internet connection.',
      canRetry: true,
      suggestion: 'Check your connection and try again.',
    };
  }
  
  // Default fallback
  return {
    message: rawMessage || 'Something went wrong.',
    canRetry: true,
  };
};

/**
 * Create a standardized error handler for async operations
 * @param {Object} options - Handler options
 * @param {Function} options.onError - Callback for setting error state
 * @param {string} options.fallbackMessage - Default error message
 * @param {Function} options.onAuthError - Optional callback for auth errors (e.g., redirect to login)
 * @returns {Function} Error handler function
 */
export const createErrorHandler = ({ 
  onError, 
  fallbackMessage = 'Operation failed', 
  onAuthError 
}) => {
  return (error) => {
    console.error('API Error:', error);
    
    const errorType = getErrorType(error);
    const message = getErrorMessage(error, fallbackMessage);
    
    // Handle auth errors specially if handler provided
    if (errorType === ERROR_TYPES.AUTH && onAuthError) {
      onAuthError(error);
      return;
    }
    
    // Set error state
    if (onError) {
      onError(message);
    }
    
    return { errorType, message };
  };
};

/**
 * Wrapper for async API calls with standardized error handling
 * @param {Function} apiCall - Async function to call
 * @param {Object} options - Error handling options
 * @param {Function} options.onError - Error state setter
 * @param {string} options.fallbackMessage - Fallback error message
 * @returns {Promise<{data: any, error: string|null}>} Result object
 */
export const safeApiCall = async (apiCall, { onError, fallbackMessage } = {}) => {
  try {
    const result = await apiCall();
    return { data: result, error: null };
  } catch (error) {
    const message = getErrorMessage(error, fallbackMessage);
    if (onError) {
      onError(message);
    }
    return { data: null, error: message };
  }
};

// NOTE: Default export removed - use named exports instead for better tree-shaking

