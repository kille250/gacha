/**
 * useActionLock - Prevents rapid double-click race conditions
 * 
 * Uses a ref-based lock that persists across re-renders to prevent
 * multiple simultaneous executions of async actions.
 * 
 * The lock is held for the ENTIRE duration of the action, plus an optional
 * cooldown period after completion. This prevents race conditions where
 * slow network requests could allow re-entry.
 * 
 * Usage:
 * ```
 * const { isLocked, withLock } = useActionLock(300);
 * 
 * const handleClick = async () => {
 *   await withLock(async () => {
 *     // Your async action here - lock held until this completes + cooldown
 *   });
 * };
 * ```
 */
import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Custom hook for preventing rapid double-click race conditions
 * @param {number} cooldownMs - Optional cooldown AFTER action completes (default 0)
 * @returns {Object} Lock utilities
 */
export const useActionLock = (cooldownMs = 0) => {
  const lockRef = useRef(false);
  const cooldownTimerRef = useRef(null);
  
  // State version of lock for triggering re-renders (useful for disabled states)
  const [lockedState, setLockedState] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  /**
   * Check if currently locked (returns current value, doesn't trigger re-render)
   */
  const isLocked = useCallback(() => lockRef.current, []);

  /**
   * Manually acquire the lock
   */
  const lock = useCallback(() => {
    lockRef.current = true;
    setLockedState(true);
  }, []);

  /**
   * Manually release the lock
   */
  const unlock = useCallback(() => {
    lockRef.current = false;
    setLockedState(false);
  }, []);

  /**
   * Execute an async action with automatic locking
   * Lock is held for entire action duration + cooldown
   * @param {Function} action - Async function to execute
   * @returns {Promise<any>} Result of the action, or undefined if locked
   */
  const withLock = useCallback(async (action) => {
    if (lockRef.current) {
      console.debug('[useActionLock] Action blocked - already locked');
      return undefined;
    }

    // Clear any pending cooldown timer
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    lockRef.current = true;
    setLockedState(true);
    
    try {
      const result = await action();
      return result;
    } finally {
      // Action complete - apply cooldown AFTER action finishes
      if (cooldownMs > 0) {
        cooldownTimerRef.current = setTimeout(() => {
          lockRef.current = false;
          setLockedState(false);
          cooldownTimerRef.current = null;
        }, cooldownMs);
      } else {
        lockRef.current = false;
        setLockedState(false);
      }
    }
  }, [cooldownMs]);

  /**
   * Check lock status and execute only if not locked (sync check)
   * Useful for early returns before async operations
   * @returns {boolean} true if action should proceed, false if locked
   */
  const tryLock = useCallback(() => {
    if (lockRef.current) {
      return false;
    }
    lockRef.current = true;
    setLockedState(true);
    return true;
  }, []);

  return {
    isLocked,
    locked: lockedState, // State-based version for UI binding
    lock,
    unlock,
    withLock,
    tryLock,
  };
};

export default useActionLock;

