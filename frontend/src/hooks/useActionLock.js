/**
 * useActionLock - Prevents rapid double-click race conditions
 * 
 * Uses a ref-based lock that persists across re-renders to prevent
 * multiple simultaneous executions of async actions.
 * 
 * Usage:
 * ```
 * const { isLocked, withLock } = useActionLock();
 * 
 * const handleClick = async () => {
 *   await withLock(async () => {
 *     // Your async action here
 *   });
 * };
 * ```
 */
import { useRef, useCallback } from 'react';

/**
 * Custom hook for preventing rapid double-click race conditions
 * @param {number} cooldownMs - Optional cooldown after action completes (default 0)
 * @returns {Object} Lock utilities
 */
export const useActionLock = (cooldownMs = 0) => {
  const lockRef = useRef(false);

  /**
   * Check if currently locked
   */
  const isLocked = useCallback(() => lockRef.current, []);

  /**
   * Manually acquire the lock
   */
  const lock = useCallback(() => {
    lockRef.current = true;
  }, []);

  /**
   * Manually release the lock
   */
  const unlock = useCallback(() => {
    lockRef.current = false;
  }, []);

  /**
   * Execute an async action with automatic locking
   * @param {Function} action - Async function to execute
   * @returns {Promise<any>} Result of the action, or undefined if locked
   */
  const withLock = useCallback(async (action) => {
    if (lockRef.current) {
      console.debug('[useActionLock] Action blocked - already locked');
      return undefined;
    }

    lockRef.current = true;
    
    try {
      const result = await action();
      return result;
    } finally {
      if (cooldownMs > 0) {
        setTimeout(() => {
          lockRef.current = false;
        }, cooldownMs);
      } else {
        lockRef.current = false;
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
    return true;
  }, []);

  return {
    isLocked,
    lock,
    unlock,
    withLock,
    tryLock,
  };
};

export default useActionLock;

