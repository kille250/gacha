import { useCallback } from 'react';

/**
 * Hook for managing pending operation recovery via sessionStorage.
 * 
 * Useful for recovering from page reloads during async operations like gacha rolls.
 * Provides save/clear/recover functions with automatic error handling.
 * 
 * USAGE:
 * const { save, clear, recover } = usePendingOperation('gacha_pendingRoll', 60000);
 * 
 * // Before starting operation
 * save({ bannerId, timestamp: Date.now() });
 * 
 * // After operation completes
 * clear();
 * 
 * // On page load, check for interrupted operations
 * const pending = recover();
 * if (pending) handleRecovery(pending);
 * 
 * @param {string} key - SessionStorage key
 * @param {number} [maxAge=60000] - Maximum age in ms before data is considered stale
 * @returns {{ save: Function, clear: Function, recover: Function }}
 */
export const usePendingOperation = (key, maxAge = 60000) => {
  /**
   * Save pending operation data
   * @param {Object} data - Data to persist
   */
  const save = useCallback((data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ 
        data, 
        timestamp: Date.now() 
      }));
    } catch {
      // Silent fail - sessionStorage may be unavailable (private browsing, etc.)
    }
  }, [key]);

  /**
   * Clear pending operation data
   */
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Silent fail
    }
  }, [key]);

  /**
   * Recover pending operation data if not stale
   * @returns {Object|null} Recovered data or null if not found/stale
   */
  const recover = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return null;
      
      const { data, timestamp } = JSON.parse(stored);
      
      // Check if data is still fresh
      if (Date.now() - timestamp > maxAge) {
        // Data is stale, clean it up
        sessionStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch {
      // Parse error or other issue - clean up and return null
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Silent fail
      }
      return null;
    }
  }, [key, maxAge]);

  /**
   * Check if there's any pending operation (without consuming it)
   * @returns {boolean}
   */
  const hasPending = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return false;
      
      const { timestamp } = JSON.parse(stored);
      return Date.now() - timestamp <= maxAge;
    } catch {
      return false;
    }
  }, [key, maxAge]);

  return { save, clear, recover, hasPending };
};

/**
 * Storage keys for common pending operations
 * Use these instead of string literals for type safety
 */
export const PENDING_OPERATION_KEYS = {
  GACHA_ROLL_STANDARD: 'gacha_pendingRoll_standard',
  GACHA_ROLL_BANNER: 'gacha_pendingRoll',
  GACHA_UNVIEWED_STANDARD: 'gacha_unviewedRoll_standard',
  GACHA_UNVIEWED_BANNER: 'gacha_unviewedRoll',
  FISHING_SESSION_STATS: 'fishing_sessionStats'
};

export default usePendingOperation;


