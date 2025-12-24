/**
 * useDataQuery - Standardized data fetching hook
 *
 * Provides consistent patterns for:
 * - Loading states
 * - Error handling
 * - Caching (basic)
 * - Refetching
 * - Stale-while-revalidate
 *
 * @example
 * const { data, isLoading, error, refetch } = useDataQuery({
 *   key: 'banners',
 *   fetcher: getActiveBanners,
 *   staleTime: 60000,
 * });
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Simple in-memory cache
const cache = new Map();

/**
 * @typedef {Object} UseDataQueryOptions
 * @property {string} key - Unique cache key
 * @property {Function} fetcher - Async function that fetches data
 * @property {number} [staleTime=0] - Time in ms before data is considered stale
 * @property {boolean} [enabled=true] - Whether to fetch on mount
 * @property {Function} [onSuccess] - Callback on successful fetch
 * @property {Function} [onError] - Callback on error
 * @property {*} [initialData] - Initial data before fetch
 * @property {boolean} [refetchOnWindowFocus=false] - Refetch when window regains focus
 * @property {number} [retryCount=0] - Number of retries on failure
 * @property {number} [retryDelay=1000] - Delay between retries in ms
 */

/**
 * @typedef {Object} UseDataQueryResult
 * @property {*} data - The fetched data
 * @property {boolean} isLoading - True during initial load
 * @property {boolean} isFetching - True during any fetch (including refetch)
 * @property {string|null} error - Error message if fetch failed
 * @property {boolean} isError - True if there's an error
 * @property {boolean} isSuccess - True if fetch succeeded
 * @property {boolean} isStale - True if data is stale
 * @property {Function} refetch - Manually trigger refetch
 * @property {Function} invalidate - Invalidate cache and refetch
 */

/**
 * Custom hook for data fetching with caching and error handling
 *
 * @param {UseDataQueryOptions} options
 * @returns {UseDataQueryResult}
 */
export function useDataQuery({
  key,
  fetcher,
  staleTime = 0,
  enabled = true,
  onSuccess,
  onError,
  initialData,
  refetchOnWindowFocus = false,
  retryCount = 0,
  retryDelay = 1000,
}) {
  const { t } = useTranslation();
  const [state, setState] = useState(() => {
    const cached = cache.get(key);
    return {
      data: cached?.data ?? initialData ?? null,
      error: null,
      isLoading: !cached && enabled,
      isFetching: !cached && enabled,
      isSuccess: !!cached,
      fetchedAt: cached?.fetchedAt ?? null,
    };
  });

  const retriesRef = useRef(0);
  const abortControllerRef = useRef(null);

  // Check if data is stale
  const isStale = useMemo(() => {
    if (!state.fetchedAt || staleTime === 0) return true;
    return Date.now() - state.fetchedAt > staleTime;
  }, [state.fetchedAt, staleTime]);

  // Execute fetch
  const executeFetch = useCallback(async (options = {}) => {
    const { force = false, background = false } = options;

    // Don't fetch if not enabled
    if (!enabled && !force) return;

    // Check cache
    const cached = cache.get(key);
    if (cached && !force) {
      const isCacheStale = Date.now() - cached.fetchedAt > staleTime;
      if (!isCacheStale) {
        setState(prev => ({
          ...prev,
          data: cached.data,
          isLoading: false,
          isFetching: false,
          isSuccess: true,
          fetchedAt: cached.fetchedAt,
        }));
        return cached.data;
      }
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Update loading state
    setState(prev => ({
      ...prev,
      isLoading: !prev.data && !background,
      isFetching: true,
      error: null,
    }));

    try {
      const data = await fetcher({ signal: abortControllerRef.current.signal });

      // Update cache
      const fetchedAt = Date.now();
      cache.set(key, { data, fetchedAt });

      // Update state
      setState({
        data,
        error: null,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        fetchedAt,
      });

      // Reset retry count on success
      retriesRef.current = 0;

      // Call success callback
      onSuccess?.(data);

      return data;
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;

      const errorMessage = err.response?.data?.error ||
        err.message ||
        t('common.fetchError', 'Failed to fetch data');

      // Retry logic
      if (retriesRef.current < retryCount) {
        retriesRef.current++;
        setTimeout(() => {
          executeFetch({ force: true, background: true });
        }, retryDelay);
        return;
      }

      // Update state with error
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
      }));

      // Call error callback
      onError?.(err);

      throw err;
    }
  }, [key, fetcher, staleTime, enabled, onSuccess, onError, t, retryCount, retryDelay]);

  // Refetch function
  const refetch = useCallback(() => {
    retriesRef.current = 0;
    return executeFetch({ force: true });
  }, [executeFetch]);

  // Invalidate and refetch
  const invalidate = useCallback(() => {
    cache.delete(key);
    return refetch();
  }, [key, refetch]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      executeFetch();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- executeFetch is stable but adding it causes refetch loops
  }, [key, enabled]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale) {
        executeFetch({ background: true });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, executeFetch]);

  // Handle network reconnection
  useEffect(() => {
    const handleOnline = () => {
      if (state.error) {
        refetch();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [state.error, refetch]);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    isError: !!state.error,
    isSuccess: state.isSuccess,
    isStale,
    refetch,
    invalidate,
  };
}

/**
 * Invalidate cache for a specific key
 * Useful for cache invalidation after mutations
 *
 * @param {string} key - Cache key to invalidate
 */
export function invalidateQuery(key) {
  cache.delete(key);
}

/**
 * Invalidate all cached data
 */
export function invalidateAllQueries() {
  cache.clear();
}

/**
 * Prefetch data and store in cache
 *
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function that fetches data
 */
export async function prefetchQuery(key, fetcher) {
  try {
    const data = await fetcher();
    cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    // Silently fail for prefetch
    return null;
  }
}

/**
 * Get cached data without triggering a fetch
 *
 * @param {string} key - Cache key
 * @returns {*} Cached data or undefined
 */
export function getQueryData(key) {
  return cache.get(key)?.data;
}

/**
 * Set cached data manually
 *
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 */
export function setQueryData(key, data) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export default useDataQuery;
