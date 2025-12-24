/**
 * useFilterState - Shared hook for filter state management
 *
 * Consolidates filter, search, and pagination logic used across
 * Collection, Admin panels, and other filterable lists.
 *
 * @example
 * const filters = useFilterState({
 *   rarity: 'all',
 *   series: 'all',
 *   search: '',
 * }, {
 *   perPage: 24,
 *   resetPageOnFilterChange: true,
 * });
 *
 * // In component
 * <Select value={filters.values.rarity} onChange={(e) => filters.setFilter('rarity', e.target.value)} />
 * <SearchInput value={filters.values.search} onChange={(e) => filters.setSearch(e.target.value)} />
 * <Pagination page={filters.page} onPageChange={filters.setPage} total={filters.totalPages} />
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * @typedef {Object} UseFilterStateOptions
 * @property {number} [perPage=24] - Items per page
 * @property {number} [initialPage=1] - Starting page
 * @property {boolean} [resetPageOnFilterChange=true] - Reset to page 1 when filters change
 */

/**
 * @typedef {Object} UseFilterStateReturn
 * @property {Object} values - Current filter values
 * @property {number} page - Current page number
 * @property {number} perPage - Items per page
 * @property {boolean} hasActiveFilters - Whether any filters differ from initial
 * @property {Function} setFilter - Set a single filter value
 * @property {Function} setFilters - Set multiple filter values
 * @property {Function} setSearch - Set search value (convenience method)
 * @property {Function} setPage - Set current page
 * @property {Function} setPerPage - Set items per page
 * @property {Function} clearFilters - Reset all filters to initial values
 * @property {Function} reset - Reset everything including pagination
 */

/**
 * Hook for managing filter state with pagination
 * @param {Object} initialFilters - Initial filter values
 * @param {UseFilterStateOptions} [options] - Configuration options
 * @returns {UseFilterStateReturn}
 */
export function useFilterState(initialFilters = {}, options = {}) {
  const {
    perPage: initialPerPage = 24,
    initialPage = 1,
    resetPageOnFilterChange = true,
  } = options;

  const [filters, setFiltersState] = useState(initialFilters);
  const [page, setPageState] = useState(initialPage);
  const [perPage, setPerPageState] = useState(initialPerPage);

  // Check if any filters differ from initial values
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      const initial = initialFilters[key];
      // Handle string comparison (most common)
      if (typeof value === 'string' && typeof initial === 'string') {
        return value.trim() !== initial.trim();
      }
      return value !== initial;
    });
  }, [filters, initialFilters]);

  // Set a single filter value
  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
    if (resetPageOnFilterChange) {
      setPageState(1);
    }
  }, [resetPageOnFilterChange]);

  // Set multiple filter values at once
  const setFilters = useCallback((updates) => {
    setFiltersState(prev => ({ ...prev, ...updates }));
    if (resetPageOnFilterChange) {
      setPageState(1);
    }
  }, [resetPageOnFilterChange]);

  // Convenience method for search (common pattern)
  const setSearch = useCallback((value) => {
    setFilter('search', value);
  }, [setFilter]);

  // Set page with bounds checking
  const setPage = useCallback((newPage, totalPages) => {
    if (totalPages !== undefined) {
      setPageState(Math.max(1, Math.min(newPage, totalPages)));
    } else {
      setPageState(Math.max(1, newPage));
    }
  }, []);

  // Set items per page
  const setPerPage = useCallback((newPerPage) => {
    setPerPageState(newPerPage);
    setPageState(1); // Always reset to page 1 when changing page size
  }, []);

  // Clear all filters to initial values
  const clearFilters = useCallback(() => {
    setFiltersState(initialFilters);
    if (resetPageOnFilterChange) {
      setPageState(1);
    }
  }, [initialFilters, resetPageOnFilterChange]);

  // Reset everything
  const reset = useCallback(() => {
    setFiltersState(initialFilters);
    setPageState(initialPage);
    setPerPageState(initialPerPage);
  }, [initialFilters, initialPage, initialPerPage]);

  return {
    values: filters,
    page,
    perPage,
    hasActiveFilters,
    setFilter,
    setFilters,
    setSearch,
    setPage,
    setPerPage,
    clearFilters,
    reset,
  };
}

/**
 * useFilteredData - Combines filter state with data filtering and pagination
 *
 * @example
 * const { filtered, paginated, ...filters } = useFilteredData(
 *   characters,
 *   { rarity: 'all', search: '' },
 *   (item, filters) => {
 *     if (filters.rarity !== 'all' && item.rarity !== filters.rarity) return false;
 *     if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
 *     return true;
 *   }
 * );
 */
export function useFilteredData(data, initialFilters, filterFn, options = {}) {
  const filterState = useFilterState(initialFilters, options);

  // Apply filters to data
  const filtered = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(item => filterFn(item, filterState.values));
  }, [data, filterState.values, filterFn]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / filterState.perPage));

  // Ensure current page is valid
  const validPage = Math.min(filterState.page, totalPages);

  // Get paginated slice
  const paginated = useMemo(() => {
    const start = (validPage - 1) * filterState.perPage;
    const end = start + filterState.perPage;
    return filtered.slice(start, end);
  }, [filtered, validPage, filterState.perPage]);

  return {
    ...filterState,
    filtered,
    paginated,
    totalPages,
    totalItems: filtered.length,
    currentPage: validPage,
  };
}

export default useFilterState;
