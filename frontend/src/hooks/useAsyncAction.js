/**
 * useAsyncAction - Unified hook for async operations with loading, error, and action lock
 *
 * Combines loading state, error handling, and action locking into a single hook.
 * Replaces the need for separate useState for loading/error and useActionLock.
 *
 * @example
 * const { execute, loading, error, data } = useAsyncAction(
 *   async (id) => await api.deleteItem(id),
 *   {
 *     onSuccess: (result) => showToast({ variant: 'success', title: 'Deleted!' }),
 *     onError: (err) => console.error(err),
 *     cooldown: 300
 *   }
 * );
 *
 * // In handler
 * await execute(itemId);
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useAsyncAction Hook
 *
 * @param {Function} actionFn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Called with result on success
 * @param {Function} options.onError - Called with error on failure
 * @param {number} options.cooldown - Cooldown period after action completes (default: 0)
 * @param {boolean} options.resetErrorOnExecute - Clear error when executing (default: true)
 * @returns {Object} Action state and execute function
 */
export const useAsyncAction = (actionFn, options = {}) => {
  const {
    onSuccess,
    onError,
    cooldown = 0,
    resetErrorOnExecute = true
  } = options;

  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null
  });

  const lockRef = useRef(false);
  const cooldownTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  /**
   * Execute the async action
   * Returns the result on success, undefined if locked, throws on error
   */
  const execute = useCallback(async (...args) => {
    // Check if already locked
    if (lockRef.current) {
      console.debug('[useAsyncAction] Action blocked - already locked');
      return undefined;
    }

    // Clear any pending cooldown timer
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    // Acquire lock
    lockRef.current = true;

    // Update state
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        loading: true,
        error: resetErrorOnExecute ? null : prev.error
      }));
    }

    try {
      const result = await actionFn(...args);

      if (mountedRef.current) {
        setState({
          loading: false,
          error: null,
          data: result
        });
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred';

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
      }

      // Call error callback
      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      // Release lock after cooldown
      if (cooldown > 0) {
        cooldownTimerRef.current = setTimeout(() => {
          lockRef.current = false;
          cooldownTimerRef.current = null;
        }, cooldown);
      } else {
        lockRef.current = false;
      }
    }
  }, [actionFn, onSuccess, onError, cooldown, resetErrorOnExecute]);

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState({
        loading: false,
        error: null,
        data: null
      });
    }
  }, []);

  /**
   * Clear error only
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, error: null }));
    }
  }, []);

  /**
   * Check if currently locked (for UI binding)
   */
  const isLocked = useCallback(() => lockRef.current, []);

  return {
    ...state,
    execute,
    reset,
    clearError,
    isLocked
  };
};

/**
 * useAsyncActionWithConfirm - Like useAsyncAction but requires confirmation
 *
 * @param {Function} actionFn - Async function to execute
 * @param {Object} options - Same as useAsyncAction plus confirm options
 * @returns {Object} Action state with confirm dialog controls
 */
export const useAsyncActionWithConfirm = (actionFn, options = {}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingArgs, setPendingArgs] = useState(null);

  const action = useAsyncAction(actionFn, options);

  const requestConfirm = useCallback((...args) => {
    setPendingArgs(args);
    setConfirmOpen(true);
  }, []);

  const confirm = useCallback(async () => {
    if (pendingArgs) {
      try {
        await action.execute(...pendingArgs);
      } finally {
        setConfirmOpen(false);
        setPendingArgs(null);
      }
    }
  }, [pendingArgs, action]);

  const cancel = useCallback(() => {
    setConfirmOpen(false);
    setPendingArgs(null);
  }, []);

  return {
    ...action,
    requestConfirm,
    confirm,
    cancel,
    confirmOpen
  };
};

export default useAsyncAction;
