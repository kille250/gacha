/**
 * useOptimisticEssence - Manages optimistic updates for Essence Tap
 *
 * Handles:
 * - Local state for immediate UI feedback
 * - Refs for tracking pending updates
 * - Reconciliation with server state
 * - Rollback on rejection
 *
 * @param {Object} params
 * @param {number} params.initialEssence - Initial essence value
 * @param {number} params.initialLifetime - Initial lifetime essence value
 * @param {number} params.initialTotalClicks - Initial total clicks value
 * @param {Object} params.gameState - Current game state for rollback calculations
 * @returns {Object} Optimistic state and update functions
 */

import { useState, useCallback } from 'react';

export const useOptimisticEssence = ({
  initialEssence = 0,
  initialLifetime = 0,
  initialTotalClicks = 0,
  gameState = null,
}) => {
  // Local state for smooth UI updates
  const [localEssence, setLocalEssence] = useState(initialEssence);
  const [localLifetimeEssence, setLocalLifetimeEssence] = useState(initialLifetime);
  const [localTotalClicks, setLocalTotalClicks] = useState(initialTotalClicks);

  /**
   * Apply optimistic update for a click
   * @param {number} essenceGained - Amount of essence gained from click
   * @param {Object} refs - Refs object with localEssenceRef and localLifetimeEssenceRef
   */
  const applyOptimisticClick = useCallback((essenceGained, refs) => {
    setLocalEssence(prev => {
      const newVal = prev + essenceGained;
      if (refs?.localEssenceRef) {
        refs.localEssenceRef.current = newVal;
      }
      return newVal;
    });

    setLocalLifetimeEssence(prev => {
      const newVal = prev + essenceGained;
      if (refs?.localLifetimeEssenceRef) {
        refs.localLifetimeEssenceRef.current = newVal;
      }
      return newVal;
    });

    setLocalTotalClicks(prev => prev + 1);
  }, []);

  /**
   * Reconcile local state with server state
   * Handles both earning actions (clicks) and spending actions (purchases)
   *
   * @param {Object} serverData
   * @param {number} serverData.essence - Server's essence value
   * @param {number} serverData.lifetimeEssence - Server's lifetime essence value
   * @param {number} serverData.totalClicks - Server's total clicks value
   * @param {number} remainingOptimistic - Unconfirmed optimistic essence to preserve
   * @param {Object} refs - Refs object for updating
   */
  const reconcileWithServer = useCallback((serverData, remainingOptimistic = 0, refs = {}) => {
    const { essence, lifetimeEssence, totalClicks } = serverData;

    if (essence !== undefined) {
      setLocalEssence(() => {
        // For earning actions: Server value + unconfirmed optimistic updates
        // For spending actions: Server value is authoritative
        const reconciledEssence = essence + remainingOptimistic;

        if (refs.localEssenceRef) {
          refs.localEssenceRef.current = reconciledEssence;
        }
        if (refs.lastSyncEssenceRef) {
          refs.lastSyncEssenceRef.current = essence;
        }
        if (refs.lastSyncTimeRef) {
          refs.lastSyncTimeRef.current = Date.now();
        }

        return reconciledEssence;
      });
    }

    if (lifetimeEssence !== undefined) {
      setLocalLifetimeEssence(() => {
        const reconciledLifetime = lifetimeEssence + remainingOptimistic;

        if (refs.localLifetimeEssenceRef) {
          refs.localLifetimeEssenceRef.current = reconciledLifetime;
        }

        return reconciledLifetime;
      });
    }

    if (totalClicks !== undefined) {
      setLocalTotalClicks(totalClicks);
    }
  }, []);

  /**
   * Rollback a failed optimistic update
   * Accounts for passive gains that occurred during the API call
   *
   * @param {Object} params
   * @param {number} params.essenceGained - Amount that was optimistically added
   * @param {number} params.clickTimestamp - When the click occurred
   * @param {Object} refs - Refs for rollback calculation
   */
  const rollbackOptimisticUpdate = useCallback(({
    essenceGained,
    clickTimestamp,
    refs,
  }) => {
    const preClickEssence = refs?.localEssenceRef?.current - essenceGained || 0;
    const preClickLifetime = refs?.localLifetimeEssenceRef?.current - essenceGained || 0;

    setLocalEssence(prev => {
      // Calculate passive gains during API call
      const timeSinceClick = Date.now() - clickTimestamp;
      const passiveDuringApiMs = Math.min(timeSinceClick, 5000); // Cap at 5 seconds
      const productionRate = gameState?.productionPerSecond || 0;
      const passiveGainedDuringApi = (productionRate * passiveDuringApiMs) / 1000;

      // Roll back to: pre-click essence + passive that accumulated
      const targetEssence = Math.max(0, preClickEssence + passiveGainedDuringApi);

      // Only apply rollback if it makes sense (we're still at roughly what we expected)
      const expectedWithOptimistic = preClickEssence + essenceGained + passiveGainedDuringApi;
      if (Math.abs(prev - expectedWithOptimistic) < essenceGained * 2) {
        if (refs?.localEssenceRef) {
          refs.localEssenceRef.current = targetEssence;
        }
        return targetEssence;
      }

      // If the values diverged significantly, a server update probably came in - keep current
      return prev;
    });

    setLocalLifetimeEssence(prev => {
      const timeSinceClick = Date.now() - clickTimestamp;
      const passiveDuringApiMs = Math.min(timeSinceClick, 5000);
      const productionRate = gameState?.productionPerSecond || 0;
      const passiveGainedDuringApi = (productionRate * passiveDuringApiMs) / 1000;

      const targetLifetime = Math.max(0, preClickLifetime + passiveGainedDuringApi);
      const expectedWithOptimistic = preClickLifetime + essenceGained + passiveGainedDuringApi;

      if (Math.abs(prev - expectedWithOptimistic) < essenceGained * 2) {
        if (refs?.localLifetimeEssenceRef) {
          refs.localLifetimeEssenceRef.current = targetLifetime;
        }
        return targetLifetime;
      }

      return prev;
    });

    setLocalTotalClicks(prev => Math.max(0, prev - 1));
  }, [gameState]);

  /**
   * Set essence values directly (for full sync)
   * @param {number} essence - Essence value
   * @param {number} lifetimeEssence - Lifetime essence value
   * @param {number} totalClicks - Total clicks value
   * @param {Object} refs - Refs to update
   */
  const setEssenceValues = useCallback((essence, lifetimeEssence, totalClicks, refs = {}) => {
    setLocalEssence(() => {
      if (refs.localEssenceRef) {
        refs.localEssenceRef.current = essence;
      }
      return essence;
    });

    setLocalLifetimeEssence(() => {
      if (refs.localLifetimeEssenceRef) {
        refs.localLifetimeEssenceRef.current = lifetimeEssence;
      }
      return lifetimeEssence;
    });

    setLocalTotalClicks(totalClicks);
  }, []);

  return {
    // State
    localEssence,
    localLifetimeEssence,
    localTotalClicks,

    // Setters for direct access
    setLocalEssence,
    setLocalLifetimeEssence,
    setLocalTotalClicks,

    // Operations
    applyOptimisticClick,
    reconcileWithServer,
    rollbackOptimisticUpdate,
    setEssenceValues,
  };
};
