/**
 * useOptimisticUI - Optimistic UI state management
 *
 * Provides instant UI feedback while async operations complete in the background.
 * Automatically handles rollback on failure and provides smooth state transitions.
 *
 * This creates a much more responsive feel by showing the expected result
 * immediately while the actual operation happens asynchronously.
 *
 * @example
 * const { optimisticValue, execute, isPending, error, reset } = useOptimisticUI(
 *   currentValue,
 *   async (newValue) => await api.updateValue(newValue)
 * );
 *
 * // Show optimisticValue in the UI (updates instantly on execute)
 * <span>{optimisticValue}</span>
 *
 * // Execute with expected new value
 * <button onClick={() => execute(newValue)}>Update</button>
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { haptic } from '../design-system/utilities/microInteractions';

/**
 * Hook for optimistic state updates with automatic rollback
 *
 * @param {any} serverValue - The current server-side value
 * @param {Function} asyncAction - Async function to execute (receives optimistic value)
 * @param {Object} options - Configuration options
 * @param {number} options.rollbackDelay - Delay before showing rollback (ms)
 * @param {boolean} options.hapticOnSuccess - Enable haptic on success
 * @param {boolean} options.hapticOnError - Enable haptic on error
 * @param {Function} options.onSuccess - Callback on successful completion
 * @param {Function} options.onError - Callback on error (receives error)
 * @param {Function} options.onRollback - Callback when rolling back
 * @returns {Object} Optimistic state and controls
 */
export const useOptimisticUI = (serverValue, asyncAction, options = {}) => {
  const {
    rollbackDelay = 200,
    hapticOnSuccess = true,
    hapticOnError = true,
    onSuccess,
    onError,
    onRollback,
  } = options;

  // State
  const [optimisticValue, setOptimisticValue] = useState(serverValue);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const [hasOptimisticUpdate, setHasOptimisticUpdate] = useState(false);

  // Refs for cleanup and tracking
  const abortControllerRef = useRef(null);
  const previousValueRef = useRef(serverValue);
  const timeoutRef = useRef(null);

  // Sync with server value when it changes (and no pending optimistic update)
  useEffect(() => {
    if (!hasOptimisticUpdate) {
      setOptimisticValue(serverValue);
      previousValueRef.current = serverValue;
    }
  }, [serverValue, hasOptimisticUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Execute the optimistic update
   */
  const execute = useCallback(async (newValue) => {
    // Store previous value for potential rollback
    const previousValue = optimisticValue;
    previousValueRef.current = previousValue;

    // Cancel any pending operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Clear any pending rollback
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Optimistically update the UI immediately
    setOptimisticValue(newValue);
    setHasOptimisticUpdate(true);
    setIsPending(true);
    setError(null);

    try {
      // Execute the async action
      const result = await asyncAction(newValue, abortControllerRef.current.signal);

      // Success - update is confirmed
      setHasOptimisticUpdate(false);
      setIsPending(false);

      if (hapticOnSuccess) {
        haptic.success();
      }

      onSuccess?.(result, newValue);

      return { success: true, result };
    } catch (err) {
      // Check if it was aborted
      if (err.name === 'AbortError') {
        return { success: false, aborted: true };
      }

      // Error - need to rollback
      setError(err);
      setIsPending(false);

      // Delay rollback slightly for better UX (shows error state first)
      timeoutRef.current = setTimeout(() => {
        setOptimisticValue(previousValue);
        setHasOptimisticUpdate(false);
        onRollback?.(previousValue, newValue, err);
      }, rollbackDelay);

      if (hapticOnError) {
        haptic.error();
      }

      onError?.(err, newValue);

      return { success: false, error: err };
    }
  }, [optimisticValue, asyncAction, rollbackDelay, hapticOnSuccess, hapticOnError, onSuccess, onError, onRollback]);

  /**
   * Cancel the current operation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOptimisticValue(previousValueRef.current);
    setHasOptimisticUpdate(false);
    setIsPending(false);
    setError(null);
  }, []);

  /**
   * Reset error state
   */
  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Current value (optimistic or server)
    optimisticValue,
    // Server value (for reference)
    serverValue,
    // Whether we have an unconfirmed optimistic update
    hasOptimisticUpdate,
    // Whether an operation is in progress
    isPending,
    // Error from last failed operation
    error,
    // Execute optimistic update
    execute,
    // Cancel current operation
    cancel,
    // Reset error state
    reset,
    // Direct setter for edge cases
    setOptimisticValue,
  };
};

/**
 * Hook for optimistic list operations (add, remove, update)
 *
 * @param {Array} serverList - The current server-side list
 * @param {Function} asyncAction - Async function for mutations
 * @param {Object} options - Configuration options
 * @returns {Object} Optimistic list state and controls
 */
export const useOptimisticList = (serverList, asyncAction, options = {}) => {
  const {
    keyExtractor = (item) => item.id,
  } = options;

  const [optimisticList, setOptimisticList] = useState(serverList);
  const [pendingOperations, setPendingOperations] = useState(new Map());

  // Sync with server list when it changes
  useEffect(() => {
    if (pendingOperations.size === 0) {
      setOptimisticList(serverList);
    }
  }, [serverList, pendingOperations.size]);

  /**
   * Optimistically add an item
   */
  const addItem = useCallback(async (item, options = {}) => {
    const { position = 'end' } = options;
    const key = keyExtractor(item);

    // Optimistically add
    setOptimisticList(prev =>
      position === 'start' ? [item, ...prev] : [...prev, item]
    );
    setPendingOperations(prev => new Map(prev).set(key, 'add'));

    try {
      const result = await asyncAction({ type: 'add', item });
      setPendingOperations(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return { success: true, result };
    } catch (err) {
      // Rollback
      setOptimisticList(prev => prev.filter(i => keyExtractor(i) !== key));
      setPendingOperations(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return { success: false, error: err };
    }
  }, [asyncAction, keyExtractor]);

  /**
   * Optimistically remove an item
   */
  const removeItem = useCallback(async (itemOrKey) => {
    const key = typeof itemOrKey === 'object' ? keyExtractor(itemOrKey) : itemOrKey;
    const removedItem = optimisticList.find(i => keyExtractor(i) === key);
    const removedIndex = optimisticList.findIndex(i => keyExtractor(i) === key);

    if (!removedItem) return { success: false, error: new Error('Item not found') };

    // Optimistically remove
    setOptimisticList(prev => prev.filter(i => keyExtractor(i) !== key));
    setPendingOperations(prev => new Map(prev).set(key, 'remove'));

    try {
      const result = await asyncAction({ type: 'remove', item: removedItem });
      setPendingOperations(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return { success: true, result };
    } catch (err) {
      // Rollback - restore item at original position
      setOptimisticList(prev => {
        const next = [...prev];
        next.splice(removedIndex, 0, removedItem);
        return next;
      });
      setPendingOperations(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return { success: false, error: err };
    }
  }, [asyncAction, keyExtractor, optimisticList]);

  /**
   * Optimistically update an item
   */
  const updateItem = useCallback(async (key, updates) => {
    const itemIndex = optimisticList.findIndex(i => keyExtractor(i) === key);
    if (itemIndex === -1) return { success: false, error: new Error('Item not found') };

    const originalItem = optimisticList[itemIndex];
    const updatedItem = { ...originalItem, ...updates };

    // Optimistically update
    setOptimisticList(prev => {
      const next = [...prev];
      next[itemIndex] = updatedItem;
      return next;
    });
    setPendingOperations(prev => new Map(prev).set(key, 'update'));

    try {
      const result = await asyncAction({ type: 'update', item: updatedItem, original: originalItem });
      setPendingOperations(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return { success: true, result };
    } catch (err) {
      // Rollback
      setOptimisticList(prev => {
        const next = [...prev];
        next[itemIndex] = originalItem;
        return next;
      });
      setPendingOperations(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return { success: false, error: err };
    }
  }, [asyncAction, keyExtractor, optimisticList]);

  /**
   * Check if a specific item has a pending operation
   */
  const isPending = useCallback((itemOrKey) => {
    const key = typeof itemOrKey === 'object' ? keyExtractor(itemOrKey) : itemOrKey;
    return pendingOperations.has(key);
  }, [keyExtractor, pendingOperations]);

  return {
    optimisticList,
    serverList,
    hasPendingOperations: pendingOperations.size > 0,
    pendingCount: pendingOperations.size,
    addItem,
    removeItem,
    updateItem,
    isPending,
    setOptimisticList,
  };
};

/**
 * Hook for optimistic toggle state (like/unlike, follow/unfollow)
 *
 * @param {boolean} serverValue - Current server state
 * @param {Function} asyncToggle - Async function to toggle
 * @param {Object} options - Configuration
 * @returns {Object} Optimistic toggle state and controls
 */
export const useOptimisticToggle = (serverValue, asyncToggle, options = {}) => {
  const {
    hapticOnToggle = true,
    onToggle,
    onError,
  } = options;

  const [optimisticValue, setOptimisticValue] = useState(serverValue);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  // Sync with server
  useEffect(() => {
    if (!isPending) {
      setOptimisticValue(serverValue);
    }
  }, [serverValue, isPending]);

  const toggle = useCallback(async () => {
    const previousValue = optimisticValue;
    const newValue = !optimisticValue;

    // Optimistic update
    setOptimisticValue(newValue);
    setIsPending(true);
    setError(null);

    if (hapticOnToggle) {
      haptic.light();
    }

    try {
      const result = await asyncToggle(newValue);
      setIsPending(false);

      if (hapticOnToggle) {
        haptic.success();
      }

      onToggle?.(newValue, result);
      return { success: true, result };
    } catch (err) {
      // Rollback
      setOptimisticValue(previousValue);
      setIsPending(false);
      setError(err);

      if (hapticOnToggle) {
        haptic.error();
      }

      onError?.(err);
      return { success: false, error: err };
    }
  }, [optimisticValue, asyncToggle, hapticOnToggle, onToggle, onError]);

  return {
    value: optimisticValue,
    serverValue,
    isPending,
    error,
    toggle,
    reset: () => setError(null),
  };
};

export default useOptimisticUI;
