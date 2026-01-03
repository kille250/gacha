/**
 * usePassiveProduction - Manages passive essence production for Essence Tap
 *
 * Handles:
 * - 100ms tick interval for smooth essence accumulation
 * - Local essence tracking with refs
 * - Production per second calculations
 * - Sync pausing during server updates
 *
 * @param {Object} params
 * @param {number} params.productionPerSecond - Production rate from game state
 * @param {number} params.tickRate - Tick interval in ms (default: 100)
 * @param {React.RefObject} params.isWaitingForSyncRef - Ref to pause production during sync
 * @param {Function} params.onEssenceUpdate - Callback when essence updates
 * @returns {Object} Production state and refs
 */

import { useEffect, useRef } from 'react';

export const usePassiveProduction = ({
  productionPerSecond,
  tickRate = 100,
  isWaitingForSyncRef,
  onEssenceUpdate,
}) => {
  const passiveTickRef = useRef(null);
  const pendingEssenceRef = useRef(0);
  const localEssenceRef = useRef(0);
  const localLifetimeEssenceRef = useRef(0);
  const lastSyncTimeRef = useRef(Date.now());
  const lastSyncEssenceRef = useRef(0);

  // Passive income tick
  useEffect(() => {
    // Always clear existing interval before setting up new one to prevent memory leaks
    if (passiveTickRef.current) {
      clearInterval(passiveTickRef.current);
      passiveTickRef.current = null;
    }

    if (!productionPerSecond || productionPerSecond <= 0) {
      return;
    }

    const essencePerTick = (productionPerSecond * tickRate) / 1000;

    passiveTickRef.current = setInterval(() => {
      // Skip tick if we're waiting for server sync
      // This prevents double-counting passive gains when server also calculates them
      if (isWaitingForSyncRef?.current) {
        return;
      }

      // Update local essence values
      const newEssence = localEssenceRef.current + essencePerTick;
      const newLifetime = localLifetimeEssenceRef.current + essencePerTick;

      localEssenceRef.current = newEssence;
      localLifetimeEssenceRef.current = newLifetime;
      pendingEssenceRef.current += essencePerTick;

      // Notify parent component of update
      if (onEssenceUpdate) {
        onEssenceUpdate({
          essence: newEssence,
          lifetimeEssence: newLifetime,
          pending: pendingEssenceRef.current,
        });
      }
    }, tickRate);

    return () => {
      if (passiveTickRef.current) {
        clearInterval(passiveTickRef.current);
        passiveTickRef.current = null;
      }
    };
  }, [productionPerSecond, tickRate, isWaitingForSyncRef, onEssenceUpdate]);

  /**
   * Reset all tracking refs to initial values
   */
  const resetTracking = (essence = 0, lifetimeEssence = 0) => {
    localEssenceRef.current = essence;
    localLifetimeEssenceRef.current = lifetimeEssence;
    lastSyncEssenceRef.current = essence;
    lastSyncTimeRef.current = Date.now();
    pendingEssenceRef.current = 0;
  };

  /**
   * Update sync tracking refs
   */
  const updateSyncTracking = (essence) => {
    lastSyncEssenceRef.current = essence;
    lastSyncTimeRef.current = Date.now();
  };

  /**
   * Clear pending essence counter
   */
  const clearPending = () => {
    pendingEssenceRef.current = 0;
  };

  return {
    // Refs for direct access
    pendingEssenceRef,
    localEssenceRef,
    localLifetimeEssenceRef,
    lastSyncTimeRef,
    lastSyncEssenceRef,
    passiveTickRef,

    // Helper functions
    resetTracking,
    updateSyncTracking,
    clearPending,
  };
};
