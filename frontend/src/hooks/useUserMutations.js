/**
 * useUserMutations - Centralized user state updates
 *
 * Eliminates prop drilling of setUser by providing a hook that
 * handles all user-related mutations through the AuthContext.
 *
 * Patterns supported:
 * - Optimistic updates (update immediately, rollback on error)
 * - Server response updates (replace with server data)
 * - Refresh from server (invalidate cache and re-fetch)
 *
 * @example
 * const { updatePoints, updateUser, refreshUser, applyOptimistic } = useUserMutations();
 *
 * // Update points optimistically
 * const handlePurchase = async (cost) => {
 *   const rollback = applyOptimistic({ points: user.points - cost });
 *   try {
 *     const result = await api.purchase();
 *     updateUser(result.user);
 *   } catch (error) {
 *     rollback();
 *     throw error;
 *   }
 * };
 */

import { useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';

export function useUserMutations() {
  const { user, setUser } = useContext(AuthContext);
  const snapshotRef = useRef(null);

  /**
   * Update user with partial data (merge)
   */
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, [setUser]);

  /**
   * Replace user entirely with new data
   */
  const replaceUser = useCallback((newUser) => {
    setUser(newUser);
  }, [setUser]);

  /**
   * Update points specifically (common operation)
   */
  const updatePoints = useCallback((newPoints) => {
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, points: newPoints };
    });
  }, [setUser]);

  /**
   * Add points (convenience method)
   */
  const addPoints = useCallback((amount) => {
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, points: (prev.points || 0) + amount };
    });
  }, [setUser]);

  /**
   * Subtract points (convenience method)
   */
  const subtractPoints = useCallback((amount) => {
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, points: Math.max(0, (prev.points || 0) - amount) };
    });
  }, [setUser]);

  /**
   * Apply optimistic update and return rollback function
   * @param {Object} updates - Partial user updates to apply
   * @returns {Function} - Call to rollback the optimistic update
   */
  const applyOptimistic = useCallback((updates) => {
    // Save current state for rollback
    snapshotRef.current = user;

    // Apply updates
    updateUser(updates);

    // Return rollback function
    return () => {
      if (snapshotRef.current) {
        setUser(snapshotRef.current);
        snapshotRef.current = null;
      }
    };
  }, [user, updateUser, setUser]);

  /**
   * Refresh user from server
   * Use when you need fresh data and don't trust local state
   */
  const refreshUser = useCallback(async () => {
    try {
      invalidateFor(CACHE_ACTIONS.AUTH_REFRESH);
      const response = await api.get('/auth/me');
      if (response.data) {
        setUser(response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  }, [setUser]);

  /**
   * Update user from API response
   * Common pattern: API returns updated user in response
   */
  const updateFromResponse = useCallback((response) => {
    if (response?.user) {
      replaceUser(response.user);
    } else if (response?.data?.user) {
      replaceUser(response.data.user);
    } else if (response?.points !== undefined) {
      updatePoints(response.points);
    }
  }, [replaceUser, updatePoints]);

  /**
   * Toggle R18 content setting
   */
  const toggleR18 = useCallback(async () => {
    const currentValue = user?.showR18 || false;
    const optimisticRollback = applyOptimistic({ showR18: !currentValue });

    try {
      const response = await api.patch('/auth/settings', { showR18: !currentValue });
      if (response.data) {
        replaceUser(response.data);
      }
      return !currentValue;
    } catch (error) {
      optimisticRollback();
      throw error;
    }
  }, [user?.showR18, applyOptimistic, replaceUser]);

  return {
    // Current user
    user,

    // Basic mutations
    updateUser,
    replaceUser,
    setUser, // Escape hatch for complex cases

    // Points-specific helpers
    updatePoints,
    addPoints,
    subtractPoints,

    // Advanced patterns
    applyOptimistic,
    refreshUser,
    updateFromResponse,

    // Common operations
    toggleR18,
  };
}

export default useUserMutations;
