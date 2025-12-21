/**
 * errorHandler.js - Centralized error handling utilities for API calls
 * 
 * Provides consistent error extraction, formatting, and handling patterns
 * across the application.
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
  UNKNOWN: 'UNKNOWN',
};

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
  
  if (status === 401 || status === 403) {
    return ERROR_TYPES.AUTH;
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

export default {
  getErrorMessage,
  getErrorType,
  isAuthError,
  isNetworkError,
  createErrorHandler,
  safeApiCall,
  ERROR_TYPES,
};

