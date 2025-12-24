/**
 * useFilterParams - URL-based filter state management
 *
 * Syncs filter state with URL search params for shareable links
 * and browser back/forward navigation support.
 *
 * @example
 * const { filters, setFilter, clearFilters, hasActiveFilters } = useFilterParams({
 *   rarity: 'all',
 *   series: 'all',
 *   search: '',
 *   page: 1,
 *   perPage: 24
 * });
 */

import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * @typedef {Object} FilterParamsOptions
 * @property {Object} defaults - Default filter values
 * @property {Object} paramMapping - Map filter keys to URL param names (optional)
 * @property {Array<string>} numericParams - List of params that should be parsed as numbers
 */

/**
 * Hook for managing filter state in URL search params
 *
 * @param {Object} defaults - Default filter values
 * @param {Object} options - Configuration options
 * @returns {Object} Filter state and handlers
 */
export function useFilterParams(defaults = {}, options = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    paramMapping = {},
    numericParams = ['page', 'perPage', 'limit', 'offset']
  } = options;

  // Get param name (allows mapping 'search' to 'q', etc.)
  const getParamName = useCallback((key) => {
    return paramMapping[key] || key;
  }, [paramMapping]);

  // Parse a value from URL params
  const parseValue = useCallback((key, value) => {
    if (value === null || value === undefined) {
      return defaults[key];
    }
    if (numericParams.includes(key)) {
      const num = Number(value);
      return isNaN(num) ? defaults[key] : num;
    }
    return value;
  }, [defaults, numericParams]);

  // Build current filters from URL params
  const filters = useMemo(() => {
    const result = { ...defaults };

    Object.keys(defaults).forEach(key => {
      const paramName = getParamName(key);
      const value = searchParams.get(paramName);
      result[key] = parseValue(key, value);
    });

    return result;
  }, [searchParams, defaults, getParamName, parseValue]);

  // Set a single filter value
  const setFilter = useCallback((key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      const paramName = getParamName(key);

      // If value equals default, remove from URL
      if (value === defaults[key] || value === '' || value === null) {
        newParams.delete(paramName);
      } else {
        newParams.set(paramName, String(value));
      }

      // Reset page when changing other filters
      if (key !== 'page' && key !== 'perPage') {
        newParams.delete(getParamName('page'));
      }

      return newParams;
    }, { replace: true });
  }, [setSearchParams, defaults, getParamName]);

  // Set multiple filters at once
  const setFilters = useCallback((updates) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);

      Object.entries(updates).forEach(([key, value]) => {
        const paramName = getParamName(key);
        if (value === defaults[key] || value === '' || value === null) {
          newParams.delete(paramName);
        } else {
          newParams.set(paramName, String(value));
        }
      });

      return newParams;
    }, { replace: true });
  }, [setSearchParams, defaults, getParamName]);

  // Clear all filters (reset to defaults)
  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Check if any non-default filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(defaults).some(key => {
      // Skip pagination params
      if (key === 'page' || key === 'perPage') return false;
      return filters[key] !== defaults[key];
    });
  }, [filters, defaults]);

  // Get filter count (for badges)
  const activeFilterCount = useMemo(() => {
    return Object.keys(defaults).filter(key => {
      if (key === 'page' || key === 'perPage') return false;
      return filters[key] !== defaults[key];
    }).length;
  }, [filters, defaults]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    // Expose raw params for advanced use
    searchParams,
    setSearchParams
  };
}

export default useFilterParams;
