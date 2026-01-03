/**
 * useEssenceTapState - Core state management hook
 *
 * Manages the core game state including essence, generators, upgrades,
 * and provides utilities for state updates.
 *
 * Features:
 * - Core game state (essence, generators, upgrades, etc.)
 * - Local state for smooth optimistic UI updates
 * - Loading and error states
 * - State synchronization with server
 * - Delta update application
 * - Full state reset
 *
 * State Refs:
 * - localEssenceRef: Current local essence value (without re-renders)
 * - localLifetimeEssenceRef: Current lifetime essence value
 * - lastSyncEssenceRef: Last synced server essence value
 * - lastSyncTimeRef: Timestamp of last sync
 * - pendingEssenceRef: Pending essence not yet saved to server
 *
 * @returns {Object} State values, refs, setters, and utility functions
 */

import { useState, useCallback, useRef } from 'react';

/**
 * Core state hook for Essence Tap
 * @returns {Object} State and state update functions
 */
export function useEssenceTapState() {
  // Core state
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local state for smooth UI updates (optimistic)
  const [localEssence, setLocalEssence] = useState(0);
  const [localLifetimeEssence, setLocalLifetimeEssence] = useState(0);
  const [localTotalClicks, setLocalTotalClicks] = useState(0);

  // Refs for tracking values without re-renders
  const localEssenceRef = useRef(0);
  const localLifetimeEssenceRef = useRef(0);
  const lastSyncEssenceRef = useRef(0);
  const lastSyncTimeRef = useRef(Date.now());
  const pendingEssenceRef = useRef(0);

  /**
   * Update local essence with optimistic value
   * @param {number} amount - Amount to add
   */
  const addLocalEssence = useCallback((amount) => {
    setLocalEssence(prev => {
      const newVal = prev + amount;
      localEssenceRef.current = newVal;
      return newVal;
    });
    setLocalLifetimeEssence(prev => {
      const newVal = prev + amount;
      localLifetimeEssenceRef.current = newVal;
      return newVal;
    });
  }, []);

  /**
   * Sync local state with server state
   * @param {Object} serverState - Server state to sync with
   * @param {number} [remainingOptimistic=0] - Remaining optimistic essence
   */
  const syncWithServer = useCallback((serverState, remainingOptimistic = 0) => {
    const serverEssence = serverState.essence || 0;
    const serverLifetime = serverState.lifetimeEssence || 0;

    setLocalEssence(() => {
      const reconciledEssence = serverEssence + remainingOptimistic;
      localEssenceRef.current = reconciledEssence;
      return reconciledEssence;
    });

    setLocalLifetimeEssence(() => {
      const reconciledLifetime = serverLifetime + remainingOptimistic;
      localLifetimeEssenceRef.current = reconciledLifetime;
      return reconciledLifetime;
    });

    if (serverState.totalClicks !== undefined) {
      setLocalTotalClicks(serverState.totalClicks);
    }

    lastSyncEssenceRef.current = serverEssence;
    lastSyncTimeRef.current = Date.now();
  }, []);

  /**
   * Set full game state from server
   * @param {Object} state - Full game state
   */
  const setFullState = useCallback((state) => {
    setGameState(state);
    const serverEssence = state.essence || 0;
    const serverLifetime = state.lifetimeEssence || 0;

    setLocalEssence(serverEssence);
    setLocalLifetimeEssence(serverLifetime);
    setLocalTotalClicks(state.totalClicks || 0);

    localEssenceRef.current = serverEssence;
    localLifetimeEssenceRef.current = serverLifetime;
    lastSyncEssenceRef.current = serverEssence;
    lastSyncTimeRef.current = Date.now();
    pendingEssenceRef.current = 0;
  }, []);

  /**
   * Apply delta update to game state
   * @param {Object} delta - Delta state changes
   */
  const applyDelta = useCallback((delta) => {
    setGameState(prev => {
      if (!prev) return delta;
      const updated = { ...prev };

      if (delta.essence !== undefined) updated.essence = delta.essence;
      if (delta.lifetimeEssence !== undefined) updated.lifetimeEssence = delta.lifetimeEssence;
      if (delta.generators !== undefined) updated.generators = delta.generators;
      if (delta.purchasedUpgrades !== undefined) updated.purchasedUpgrades = delta.purchasedUpgrades;
      if (delta.productionPerSecond !== undefined) updated.productionPerSecond = delta.productionPerSecond;
      if (delta.clickPower !== undefined) updated.clickPower = delta.clickPower;
      if (delta.critChance !== undefined) updated.critChance = delta.critChance;
      if (delta.critMultiplier !== undefined) updated.critMultiplier = delta.critMultiplier;
      if (delta.totalClicks !== undefined) updated.totalClicks = delta.totalClicks;

      return updated;
    });
  }, []);

  /**
   * Reset all state
   */
  const resetState = useCallback(() => {
    setGameState(null);
    setLocalEssence(0);
    setLocalLifetimeEssence(0);
    setLocalTotalClicks(0);
    localEssenceRef.current = 0;
    localLifetimeEssenceRef.current = 0;
    lastSyncEssenceRef.current = 0;
    pendingEssenceRef.current = 0;
  }, []);

  return {
    // State
    gameState,
    loading,
    error,
    localEssence,
    localLifetimeEssence,
    localTotalClicks,

    // Refs (for external access)
    localEssenceRef,
    localLifetimeEssenceRef,
    lastSyncEssenceRef,
    lastSyncTimeRef,
    pendingEssenceRef,

    // Setters
    setGameState,
    setLoading,
    setError,
    setLocalEssence,
    setLocalLifetimeEssence,
    setLocalTotalClicks,

    // Utilities
    addLocalEssence,
    syncWithServer,
    setFullState,
    applyDelta,
    resetState
  };
}

export default useEssenceTapState;
