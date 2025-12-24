/**
 * useToastFeedback - Standardized toast feedback for async operations
 *
 * Provides consistent success/error feedback patterns across the app.
 * Replaces local success message state with centralized toast notifications.
 *
 * @example
 * const { withFeedback, showSuccess, showError } = useToastFeedback();
 *
 * // Wrap async operations for automatic feedback
 * const handleSave = () => withFeedback(
 *   async () => await saveData(),
 *   { success: 'Saved successfully!', error: 'Failed to save' }
 * );
 *
 * // Or use manual feedback
 * showSuccess('Item created!');
 * showError('Something went wrong');
 */

import { useCallback, useContext } from 'react';
import ToastContext from '../context/ToastContext';

/**
 * @typedef {Object} FeedbackOptions
 * @property {string} [success] - Success message to show
 * @property {string} [error] - Error message to show (or extract from error)
 * @property {string} [loading] - Loading message (for future use)
 * @property {boolean} [showSuccessToast=true] - Whether to show success toast
 * @property {boolean} [showErrorToast=true] - Whether to show error toast
 */

export function useToastFeedback() {
  // Get toast context - may be null if not wrapped in provider
  const toast = useContext(ToastContext);

  /**
   * Show a success toast
   */
  const showSuccess = useCallback((message) => {
    toast?.success?.(message);
  }, [toast]);

  /**
   * Show an error toast
   */
  const showError = useCallback((message) => {
    toast?.error?.(message);
  }, [toast]);

  /**
   * Show a warning toast
   */
  const showWarning = useCallback((message) => {
    toast?.warning?.(message);
  }, [toast]);

  /**
   * Show an info toast
   */
  const showInfo = useCallback((message) => {
    toast?.info?.(message);
  }, [toast]);

  /**
   * Extract error message from various error formats
   */
  const extractErrorMessage = useCallback((error, fallback = 'An error occurred') => {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.message) return error.message;
    return fallback;
  }, []);

  /**
   * Wrap an async operation with automatic success/error feedback
   *
   * @param {Function} operation - Async function to execute
   * @param {FeedbackOptions} options - Feedback configuration
   * @returns {Promise<any>} - Result of the operation
   */
  const withFeedback = useCallback(async (operation, options = {}) => {
    const {
      success,
      error: errorMessage,
      showSuccessToast = true,
      showErrorToast = true,
    } = options;

    try {
      const result = await operation();

      if (success && showSuccessToast) {
        showSuccess(success);
      }

      return result;
    } catch (error) {
      if (showErrorToast) {
        const message = extractErrorMessage(error, errorMessage || 'Operation failed');
        showError(message);
      }
      throw error;
    }
  }, [showSuccess, showError, extractErrorMessage]);

  /**
   * Create a feedback-wrapped version of an async function
   *
   * @param {Function} operation - Async function to wrap
   * @param {FeedbackOptions} options - Feedback configuration
   * @returns {Function} - Wrapped function
   */
  const wrapWithFeedback = useCallback((operation, options = {}) => {
    return async (...args) => {
      return withFeedback(() => operation(...args), options);
    };
  }, [withFeedback]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    withFeedback,
    wrapWithFeedback,
    extractErrorMessage,
  };
}

export default useToastFeedback;
