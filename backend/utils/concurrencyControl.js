/**
 * Concurrency Control Utilities
 *
 * Centralized helpers for managing concurrent operations:
 * - Lock management (Set-based mutex)
 * - Cooldown tracking (Map-based rate limiting)
 * - Promise-based mutex (for async operations)
 */

/**
 * Creates a lock manager for exclusive access control
 * Prevents concurrent operations for the same key (e.g., userId)
 *
 * @param {string} [name='default'] - Name for logging
 * @returns {Object} Lock manager with acquire, release, isLocked methods
 *
 * @example
 * const rollLock = createLockManager('roll');
 * if (!rollLock.acquire(userId)) {
 *   return res.status(429).json({ error: 'Roll in progress' });
 * }
 * try {
 *   // ... perform roll
 * } finally {
 *   rollLock.release(userId);
 * }
 */
const createLockManager = (name = 'default') => {
  const locks = new Set();

  return {
    /**
     * Attempt to acquire lock for a key
     * @param {string|number} key - Lock key (e.g., userId)
     * @returns {boolean} True if lock acquired, false if already locked
     */
    acquire(key) {
      if (locks.has(key)) {
        return false;
      }
      locks.add(key);
      return true;
    },

    /**
     * Release lock for a key
     * @param {string|number} key - Lock key
     */
    release(key) {
      locks.delete(key);
    },

    /**
     * Check if key is currently locked
     * @param {string|number} key - Lock key
     * @returns {boolean} True if locked
     */
    isLocked(key) {
      return locks.has(key);
    },

    /**
     * Get current lock count (for monitoring)
     * @returns {number} Number of active locks
     */
    size() {
      return locks.size;
    },

    /**
     * Clear all locks (use with caution, mainly for testing)
     */
    clear() {
      locks.clear();
    },

    /** Name of this lock manager */
    name
  };
};

/**
 * Creates a cooldown manager for rate limiting
 * Tracks last action time per key with automatic cleanup
 *
 * @param {number} cooldownMs - Cooldown period in milliseconds
 * @param {string} [name='default'] - Name for logging
 * @returns {Object} Cooldown manager
 *
 * @example
 * const castCooldown = createCooldownManager(3000, 'cast');
 * const remaining = castCooldown.check(userId);
 * if (remaining > 0) {
 *   return res.status(429).json({ error: 'Cooldown', remaining });
 * }
 * castCooldown.set(userId);
 */
const createCooldownManager = (cooldownMs, name = 'default') => {
  const cooldowns = new Map();

  return {
    /**
     * Check cooldown status for a key
     * @param {string|number} key - Cooldown key
     * @returns {number} Remaining cooldown in ms, 0 if ready
     */
    check(key) {
      const lastTime = cooldowns.get(key);
      if (!lastTime) return 0;

      const elapsed = Date.now() - lastTime;
      const remaining = cooldownMs - elapsed;
      return remaining > 0 ? remaining : 0;
    },

    /**
     * Set cooldown for a key (starts now)
     * @param {string|number} key - Cooldown key
     */
    set(key) {
      cooldowns.set(key, Date.now());
    },

    /**
     * Reset/clear cooldown for a key
     * @param {string|number} key - Cooldown key
     */
    reset(key) {
      cooldowns.delete(key);
    },

    /**
     * Check if key is on cooldown
     * @param {string|number} key - Cooldown key
     * @returns {boolean} True if on cooldown
     */
    isOnCooldown(key) {
      return this.check(key) > 0;
    },

    /**
     * Cleanup expired cooldowns (call periodically)
     * @returns {number} Number of entries cleaned
     */
    cleanup() {
      const now = Date.now();
      let cleaned = 0;
      for (const [key, timestamp] of cooldowns.entries()) {
        if (now - timestamp > cooldownMs) {
          cooldowns.delete(key);
          cleaned++;
        }
      }
      return cleaned;
    },

    /**
     * Get current cooldown count (for monitoring)
     * @returns {number} Number of active cooldowns
     */
    size() {
      return cooldowns.size;
    },

    /** Cooldown period in ms */
    cooldownMs,

    /** Name of this cooldown manager */
    name
  };
};

/**
 * Creates a mutex for async operations with promise-based waiting
 * Allows concurrent callers to wait for an in-progress operation
 *
 * @param {string} [name='default'] - Name for logging
 * @returns {Object} Mutex with lock, isLocked, waitFor methods
 *
 * @example
 * const refreshMutex = createAsyncMutex('rank-refresh');
 *
 * async function refreshRanks() {
 *   if (refreshMutex.isLocked()) {
 *     return refreshMutex.waitFor(); // Wait for existing refresh
 *   }
 *
 *   const release = refreshMutex.lock();
 *   try {
 *     // ... perform refresh
 *     release(result);
 *     return result;
 *   } catch (err) {
 *     release(null, err);
 *     throw err;
 *   }
 * }
 */
const createAsyncMutex = (name = 'default') => {
  let locked = false;
  let currentPromise = null;
  let resolvePromise = null;
  let rejectPromise = null;

  return {
    /**
     * Acquire the mutex lock
     * @returns {Function} Release function - call with (result, error) when done
     */
    lock() {
      if (locked) {
        throw new Error(`Mutex ${name} already locked`);
      }

      locked = true;
      currentPromise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });

      return (result, error) => {
        locked = false;
        if (error) {
          rejectPromise(error);
        } else {
          resolvePromise(result);
        }
        currentPromise = null;
        resolvePromise = null;
        rejectPromise = null;
      };
    },

    /**
     * Check if mutex is currently locked
     * @returns {boolean} True if locked
     */
    isLocked() {
      return locked;
    },

    /**
     * Wait for current operation to complete
     * @returns {Promise} Resolves with result of locked operation
     */
    waitFor() {
      if (!currentPromise) {
        return Promise.resolve(null);
      }
      return currentPromise;
    },

    /** Name of this mutex */
    name
  };
};

module.exports = {
  createLockManager,
  createCooldownManager,
  createAsyncMutex
};
