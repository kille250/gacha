/**
 * useCivitaiSearch - Hook for searching Civitai images API
 *
 * Provides debounced search, pagination, and NSFW filtering
 * for the Prompt Browser feature.
 *
 * @example
 * const {
 *   images, loading, error, hasMore,
 *   search, loadMore, setFilters
 * } = useCivitaiSearch();
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  CIVITAI_IMAGES_ENDPOINT,
  DEFAULTS,
  STORAGE_KEYS,
  RATE_LIMIT
} from '../constants/civitai';

/**
 * Debounce helper
 */
const debounce = (fn, ms) => {
  let timeoutId;
  const debouncedFn = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
  debouncedFn.cancel = () => clearTimeout(timeoutId);
  return debouncedFn;
};

/**
 * Build query string from params
 */
const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  return searchParams.toString();
};

/**
 * Fetch with retry logic for rate limiting
 */
const fetchWithRetry = async (url, retries = RATE_LIMIT.MAX_RETRIES) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        // Rate limited - wait and retry
        if (attempt < retries) {
          await new Promise(resolve =>
            setTimeout(resolve, RATE_LIMIT.RETRY_DELAY_MS * (attempt + 1))
          );
          continue;
        }
        throw new Error('Rate limited. Please wait a moment and try again.');
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
    }
  }
};

/**
 * Get saved NSFW preference from localStorage
 */
const getSavedNsfwPreference = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.NSFW_PREFERENCE);
    return saved || DEFAULTS.NSFW;
  } catch {
    return DEFAULTS.NSFW;
  }
};

/**
 * Check if age has been verified
 */
export const isAgeVerified = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.AGE_VERIFIED) === 'true';
  } catch {
    return false;
  }
};

/**
 * Set age verification status
 */
export const setAgeVerified = (verified) => {
  try {
    if (verified) {
      localStorage.setItem(STORAGE_KEYS.AGE_VERIFIED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.AGE_VERIFIED);
    }
  } catch {
    // Ignore storage errors
  }
};

/**
 * Main hook for Civitai search
 */
export function useCivitaiSearch(options = {}) {
  const {
    initialQuery = '',
    initialLimit = DEFAULTS.LIMIT,
    debounceMs = DEFAULTS.DEBOUNCE_MS
  } = options;

  // State
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);

  // Filters
  const [query, setQuery] = useState(initialQuery);
  const [nsfw, setNsfw] = useState(getSavedNsfwPreference);
  const [sort, setSort] = useState(DEFAULTS.SORT);
  const [period, setPeriod] = useState(DEFAULTS.PERIOD);
  const [baseModel, setBaseModel] = useState(DEFAULTS.BASE_MODEL);

  // Refs for cleanup and request tracking
  const abortControllerRef = useRef(null);
  const lastRequestTimeRef = useRef(0);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Save NSFW preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NSFW_PREFERENCE, nsfw);
    } catch {
      // Ignore storage errors
    }
  }, [nsfw]);

  /**
   * Perform the actual search
   */
  const performSearch = useCallback(async (isLoadMore = false) => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < RATE_LIMIT.MIN_INTERVAL_MS) {
      await new Promise(resolve =>
        setTimeout(resolve, RATE_LIMIT.MIN_INTERVAL_MS - timeSinceLastRequest)
      );
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const params = {
        limit: initialLimit,
        nsfw,
        sort,
        period,
        ...(query && { query }),
        ...(baseModel && { baseModels: baseModel }),
        ...(isLoadMore && cursor && { cursor })
      };

      const queryString = buildQueryString(params);
      const url = `${CIVITAI_IMAGES_ENDPOINT}?${queryString}`;

      lastRequestTimeRef.current = Date.now();
      const data = await fetchWithRetry(url);

      if (!mountedRef.current) return;

      const newImages = data.items || [];

      if (isLoadMore) {
        setImages(prev => [...prev, ...newImages]);
      } else {
        setImages(newImages);
      }

      // Handle pagination
      if (data.metadata?.nextCursor) {
        setCursor(data.metadata.nextCursor);
        setHasMore(true);
      } else {
        setCursor(null);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err.name === 'AbortError') return;

      setError(err.message || 'Failed to fetch images');
      if (!isLoadMore) {
        setImages([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [query, nsfw, sort, period, baseModel, cursor, initialLimit]);

  /**
   * Debounced search for query changes
   */
  const debouncedSearchRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    debouncedSearchRef.current = debounce(() => {
      setCursor(null);
      performSearch(false);
    }, debounceMs);

    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [performSearch, debounceMs]);

  /**
   * Initial search on mount
   */
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      performSearch(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Trigger search when filters change (after initial mount)
   */
  useEffect(() => {
    if (!isInitialMount.current && debouncedSearchRef.current) {
      debouncedSearchRef.current();
    }
  }, [query, nsfw, sort, period, baseModel]);

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore && cursor) {
      performSearch(true);
    }
  }, [loading, loadingMore, hasMore, cursor, performSearch]);

  /**
   * Force refresh
   */
  const refresh = useCallback(() => {
    setCursor(null);
    performSearch(false);
  }, [performSearch]);

  /**
   * Update query with debouncing
   */
  const search = useCallback((newQuery) => {
    setQuery(newQuery);
  }, []);

  /**
   * Update NSFW filter
   */
  const updateNsfw = useCallback((newNsfw) => {
    setNsfw(newNsfw);
    setCursor(null);
  }, []);

  /**
   * Update sort option
   */
  const updateSort = useCallback((newSort) => {
    setSort(newSort);
    setCursor(null);
  }, []);

  /**
   * Update period filter
   */
  const updatePeriod = useCallback((newPeriod) => {
    setPeriod(newPeriod);
    setCursor(null);
  }, []);

  /**
   * Update base model filter
   */
  const updateBaseModel = useCallback((newBaseModel) => {
    setBaseModel(newBaseModel);
    setCursor(null);
  }, []);

  // Extract unique base models from loaded images for dynamic filter options
  const availableModels = useMemo(() => {
    const models = new Set();
    images.forEach(img => {
      if (img.baseModel) {
        models.add(img.baseModel);
      }
    });
    return Array.from(models).sort();
  }, [images]);

  return {
    // Data
    images,
    loading,
    loadingMore,
    error,
    hasMore,

    // Filter state
    query,
    nsfw,
    sort,
    period,
    baseModel,

    // Dynamic options
    availableModels,

    // Actions
    search,
    loadMore,
    refresh,
    setNsfw: updateNsfw,
    setSort: updateSort,
    setPeriod: updatePeriod,
    setBaseModel: updateBaseModel
  };
}

export default useCivitaiSearch;
