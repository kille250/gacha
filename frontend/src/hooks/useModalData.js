/**
 * Modal Data Hook
 * 
 * Generic hook for managing modal data fetching patterns.
 * Handles loading state, cache invalidation, and data fetching.
 * 
 * USAGE:
 * const { data, loading, refetch } = useModalData(
 *   isOpen,
 *   () => getFishingLeaderboard(),
 *   CACHE_ACTIONS.MODAL_LEADERBOARD_OPEN
 * );
 */

import { useState, useEffect, useCallback } from 'react';
import { invalidateFor } from '../cache';

/**
 * Hook for managing modal data fetching
 * @param {boolean} isOpen - Whether the modal is currently open
 * @param {Function} fetchFn - Async function to fetch data
 * @param {string} [cacheAction] - Cache action to invalidate on open
 * @returns {Object} Data state and controls
 */
export function useModalData(isOpen, fetchFn, cacheAction = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Modal data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    if (cacheAction) {
      invalidateFor(cacheAction);
    }
    
    fetchData();
  }, [isOpen, cacheAction, fetchData]);
  
  const refetch = useCallback(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);
  
  return {
    data,
    setData,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for managing multiple related data fetches for a modal
 * @param {boolean} isOpen - Whether the modal is currently open
 * @param {Object} fetchers - Object mapping keys to fetch functions
 * @param {string} [cacheAction] - Cache action to invalidate on open
 * @returns {Object} Combined data state
 */
export function useMultiModalData(isOpen, fetchers, cacheAction = null) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = Object.entries(fetchers);
      const results = await Promise.all(entries.map(([, fn]) => fn()));
      const newData = {};
      entries.forEach(([key], index) => {
        newData[key] = results[index];
      });
      setData(newData);
    } catch (err) {
      setError(err);
      console.error('Multi-modal data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchers]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    if (cacheAction) {
      invalidateFor(cacheAction);
    }
    
    fetchAll();
  }, [isOpen, cacheAction, fetchAll]);
  
  return { data, loading, error, refetch: fetchAll };
}

export default useModalData;

