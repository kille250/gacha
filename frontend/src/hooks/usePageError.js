/**
 * usePageError - Standardized error handling hook for pages
 *
 * Provides consistent error handling with:
 * - Toast notifications for user feedback
 * - Inline error state for persistent display
 * - Auto-dismiss for non-critical errors
 * - Proper error message extraction from API responses
 *
 * @example
 * const { error, handleError, clearError } = usePageError();
 *
 * try {
 *   await fetchData();
 * } catch (err) {
 *   handleError(err, { toast: true, inline: true });
 * }
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { theme } from '../styles/DesignSystem';

/**
 * Extracts a user-friendly error message from various error formats
 *
 * @param {Error|Object|string} err - The error to extract message from
 * @param {string} fallback - Fallback message if extraction fails
 * @returns {string} User-friendly error message
 */
export const extractErrorMessage = (err, fallback = 'An unexpected error occurred') => {
  if (!err) return fallback;

  // String error
  if (typeof err === 'string') return err;

  // Axios error with response
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.message) return err.response.data.message;

  // Standard Error object
  if (err.message) return err.message;

  // Object with error property
  if (err.error) return err.error;

  return fallback;
};

/**
 * Determines if an error is critical (should not auto-dismiss)
 *
 * @param {Error|Object} err - The error to check
 * @returns {boolean} True if error is critical
 */
export const isCriticalError = (err) => {
  if (!err) return false;

  const status = err.response?.status;

  // Auth errors are critical
  if (status === 401 || status === 403) return true;

  // Server errors are critical
  if (status >= 500) return true;

  // Network errors are critical
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') return true;

  return false;
};

/**
 * usePageError Hook
 *
 * @param {Object} options
 * @param {number} options.autoDismissDelay - Delay before auto-clearing non-critical errors (ms)
 * @param {string} options.defaultMessage - Default error message
 * @returns {Object} Error state and handlers
 */
export function usePageError(options = {}) {
  const {
    autoDismissDelay = theme.timing?.errorMessageDismiss || 6000,
    defaultMessage = 'An unexpected error occurred. Please try again.'
  } = options;

  const { error: showErrorToast, warning: showWarningToast } = useToast();
  const [error, setError] = useState(null);
  const dismissTimerRef = useRef(null);

  // Clear any pending timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  /**
   * Handle an error with consistent behavior
   *
   * @param {Error|Object|string} err - The error to handle
   * @param {Object} handlerOptions
   * @param {boolean} handlerOptions.toast - Show toast notification (default: true)
   * @param {boolean} handlerOptions.inline - Set inline error state (default: true)
   * @param {boolean} handlerOptions.autoDismiss - Auto-dismiss non-critical errors (default: true)
   * @param {string} handlerOptions.fallbackMessage - Custom fallback message
   * @param {boolean} handlerOptions.log - Log error to console (default: true in dev)
   */
  const handleError = useCallback((err, handlerOptions = {}) => {
    const {
      toast = true,
      inline = true,
      autoDismiss = true,
      fallbackMessage = defaultMessage,
      log = process.env.NODE_ENV === 'development'
    } = handlerOptions;

    const message = extractErrorMessage(err, fallbackMessage);
    const critical = isCriticalError(err);

    // Log to console in development
    if (log) {
      console.error('[usePageError]', err);
    }

    // Show toast notification
    if (toast) {
      if (critical) {
        showErrorToast(message);
      } else {
        showWarningToast(message);
      }
    }

    // Set inline error state
    if (inline) {
      setError(message);

      // Auto-dismiss non-critical errors
      if (autoDismiss && !critical) {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }
        dismissTimerRef.current = setTimeout(() => {
          setError(null);
          dismissTimerRef.current = null;
        }, autoDismissDelay);
      }
    }
  }, [defaultMessage, showErrorToast, showWarningToast, autoDismissDelay]);

  /**
   * Set error directly (for manual error setting)
   */
  const setErrorMessage = useCallback((message) => {
    setError(message);
  }, []);

  return {
    error,
    handleError,
    clearError,
    setError: setErrorMessage,
    hasError: !!error
  };
}

export default usePageError;
