/**
 * useAutoDismissError - Shared error state management with auto-dismiss
 * 
 * Provides consistent error handling across all pages with:
 * - Automatic dismissal after a timeout
 * - Longer timeout for critical errors
 * - Manual dismiss capability
 * 
 * Usage:
 * ```
 * const [error, setError, clearError] = useAutoDismissError();
 * 
 * // In error handler:
 * setError('Something went wrong');
 * 
 * // In JSX:
 * {error && <ErrorBanner>{error}</ErrorBanner>}
 * ```
 */
import { useState, useEffect, useCallback } from 'react';

// Patterns that indicate critical errors requiring longer display
const CRITICAL_ERROR_PATTERNS = [
  'Not enough',
  'Insufficient',
  'Server',
  '500',
  'interrupted',
  'failed',
  'offline',
  'connection',
  'disconnected',
  'Network'
];

// Timing constants
const TRANSIENT_ERROR_TIMEOUT = 5000; // 5 seconds for minor errors
const CRITICAL_ERROR_TIMEOUT = 10000; // 10 seconds for critical errors

/**
 * Determines if an error message is critical based on content
 * @param {string} error - The error message
 * @returns {boolean} True if the error is critical
 */
const isCriticalError = (error) => {
  if (!error || typeof error !== 'string') return false;
  return CRITICAL_ERROR_PATTERNS.some(pattern => 
    error.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Custom hook for managing auto-dismissing error state
 * @param {Object} options - Hook options
 * @param {number} [options.transientTimeout=5000] - Timeout for transient errors
 * @param {number} [options.criticalTimeout=10000] - Timeout for critical errors
 * @returns {[string|null, Function, Function]} [error, setError, clearError]
 */
export const useAutoDismissError = (options = {}) => {
  const {
    transientTimeout = TRANSIENT_ERROR_TIMEOUT,
    criticalTimeout = CRITICAL_ERROR_TIMEOUT
  } = options;

  const [error, setErrorState] = useState(null);

  // Clear error manually
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  // Set error with auto-dismiss
  const setError = useCallback((newError) => {
    setErrorState(newError);
  }, []);

  // Auto-dismiss effect
  useEffect(() => {
    if (!error) return;

    const timeout = isCriticalError(error) ? criticalTimeout : transientTimeout;
    const timer = setTimeout(() => {
      setErrorState(null);
    }, timeout);

    return () => clearTimeout(timer);
  }, [error, transientTimeout, criticalTimeout]);

  return [error, setError, clearError];
};

/**
 * Utility to check if error is critical (exported for external use)
 */
export { isCriticalError };

export default useAutoDismissError;

