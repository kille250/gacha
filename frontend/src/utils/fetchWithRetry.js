/**
 * Fetch With Retry Utility
 *
 * Provides a centralized, cache-aware retry mechanism for data fetching.
 * Replaces scattered refreshWithRetry patterns throughout the codebase.
 *
 * USAGE:
 * import { fetchWithRetry } from '../utils/fetchWithRetry';
 *
 * // Basic usage
 * await fetchWithRetry(() => fetchUserCollection());
 *
 * // With cache invalidation before fetch
 * await fetchWithRetry(() => api.get('/auth/me'), {
 *   cacheAction: CACHE_ACTIONS.PRE_ROLL
 * });
 *
 * // With concurrency guard
 * const guard = createFetchGuard();
 * await fetchWithRetry(() => fetchData(), { guard });
 */

import { invalidateFor } from '../cache';

/**
 * Creates a concurrency guard to prevent duplicate fetches.
 * Use one guard per logical operation (e.g., one per component instance).
 *
 * @returns {{ isRunning: () => boolean, run: (fn: Function) => Promise<any> }}
 */
export const createFetchGuard = () => {
  let inFlight = false;

  return {
    isRunning: () => inFlight,
    run: async (fn) => {
      if (inFlight) {
        return null; // Skip if already running
      }
      inFlight = true;
      try {
        return await fn();
      } finally {
        inFlight = false;
      }
    }
  };
};

/**
 * Fetch data with automatic retry on failure.
 *
 * Features:
 * - Configurable retry count and delay
 * - Optional cache invalidation before fetch
 * - Optional concurrency guard to prevent race conditions
 * - Silent failure mode (returns null instead of throwing)
 *
 * @param {Function} fetcher - Async function that fetches data
 * @param {Object} [options]
 * @param {number} [options.retries=2] - Number of retry attempts
 * @param {number} [options.delay=1000] - Delay between retries in ms
 * @param {string} [options.cacheAction] - Cache action to invalidate before fetch
 * @param {Object} [options.guard] - Concurrency guard from createFetchGuard()
 * @param {boolean} [options.silent=true] - If true, returns null on failure instead of throwing
 * @returns {Promise<any>} Fetch result or null on failure (if silent)
 */
export const fetchWithRetry = async (
  fetcher,
  { retries = 2, delay = 1000, cacheAction = null, guard = null, silent = true } = {}
) => {
  const execute = async (remainingRetries) => {
    // Invalidate cache if action specified
    if (cacheAction) {
      try {
        invalidateFor(cacheAction);
      } catch (err) {
        console.warn('[fetchWithRetry] Cache invalidation failed:', err);
      }
    }

    try {
      return await fetcher();
    } catch (err) {
      if (remainingRetries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return execute(remainingRetries - 1);
      }

      if (silent) {
        console.warn('[fetchWithRetry] All retries exhausted:', err);
        return null;
      }
      throw err;
    }
  };

  // Use guard if provided
  if (guard) {
    return guard.run(() => execute(retries));
  }

  return execute(retries);
};

/**
 * Fetch tickets with proper cache invalidation.
 * Convenience wrapper for the common ticket fetch pattern.
 *
 * @param {Object} api - The API instance
 * @param {Object} [options] - Options passed to fetchWithRetry
 * @returns {Promise<Object|null>} Tickets object or null on failure
 */
export const fetchTicketsWithRetry = async (api, options = {}) => {
  return fetchWithRetry(
    () => api.get('/banners/user/tickets').then(res => res.data),
    {
      cacheAction: 'pre:roll', // Ensure fresh data
      ...options
    }
  );
};
