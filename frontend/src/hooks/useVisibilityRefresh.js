/**
 * useVisibilityRefresh - Hook for visibility-based data refresh
 * 
 * Provides a React-friendly wrapper around the cacheManager's onVisibilityChange.
 * Use this to automatically refresh data when the user returns to a backgrounded tab.
 * 
 * USAGE:
 * useVisibilityRefresh('my-page-data', fetchData, { threshold: 'normal' });
 */
import { useEffect, useCallback, useRef } from 'react';
import { onVisibilityChange, STALE_THRESHOLDS } from '../cache';

/**
 * Register a component for visibility-based data refresh.
 * Automatically cleans up on unmount.
 * 
 * @param {string} id - Unique identifier for this callback (e.g., 'collection-page')
 * @param {Function} refreshFn - Called when data may be stale after tab becomes visible
 * @param {Object} [options]
 * @param {'critical'|'normal'|'static'} [options.threshold='normal'] - Staleness threshold
 * @param {boolean} [options.refreshOnAnyVisibility=false] - Call refreshFn on any visibility change
 * 
 * @example
 * // Refresh collection when tab has been hidden for >2 minutes
 * useVisibilityRefresh('collection-page', fetchCollection, { threshold: 'normal' });
 * 
 * @example
 * // Refresh tickets aggressively (30s threshold)
 * useVisibilityRefresh('banner-tickets', fetchTickets, { threshold: 'critical' });
 */
export const useVisibilityRefresh = (id, refreshFn, options = {}) => {
  const { threshold = 'normal', refreshOnAnyVisibility = false } = options;
  
  // Use ref to avoid re-registering when refreshFn changes identity
  const refreshFnRef = useRef(refreshFn);
  refreshFnRef.current = refreshFn;
  
  const handleVisibilityChange = useCallback((staleLevel, elapsed) => {
    // If refreshOnAnyVisibility is true, always call refreshFn
    if (refreshOnAnyVisibility && staleLevel !== null) {
      refreshFnRef.current();
      return;
    }
    
    // Otherwise, check if elapsed time exceeds our threshold
    const thresholdMs = STALE_THRESHOLDS[threshold];
    if (elapsed > thresholdMs) {
      refreshFnRef.current();
    }
  }, [threshold, refreshOnAnyVisibility]);
  
  useEffect(() => {
    return onVisibilityChange(id, handleVisibilityChange);
  }, [id, handleVisibilityChange]);
};

export default useVisibilityRefresh;

