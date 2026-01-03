/**
 * EssenceTapContext - Centralized context provider for Essence Tap game
 *
 * This context eliminates prop drilling by providing all game state and actions
 * through React Context. It wraps the useEssenceTap hook and provides:
 *
 * 1. Full game state (essence, generators, upgrades, prestige, etc.)
 * 2. All game actions (click, purchase, prestige, etc.)
 * 3. WebSocket connection state
 * 4. Optimized selector hooks for specific slices of state
 *
 * Usage:
 *   <EssenceTapProvider>
 *     <YourComponents />
 *   </EssenceTapProvider>
 *
 * Then in components:
 *   const { essence, handleClick } = useEssenceTapContext();
 *   // Or use selector hooks:
 *   const { essence, lifetimeEssence } = useEssence();
 *   const { generators, purchaseGenerator } = useGenerators();
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useEssenceTap } from '../hooks/useEssenceTap';

// Create the context
const EssenceTapContext = createContext(null);

/**
 * EssenceTapProvider - Provider component that wraps the game
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function EssenceTapProvider({ children }) {
  // Get all game state and actions from the hook
  const essenceTapState = useEssenceTap();

  // Memoize the context value to prevent unnecessary re-renders
  // Only re-create when the essenceTapState reference changes
  const contextValue = useMemo(() => essenceTapState, [essenceTapState]);

  return (
    <EssenceTapContext.Provider value={contextValue}>
      {children}
    </EssenceTapContext.Provider>
  );
}

/**
 * useEssenceTapContext - Main hook to consume the context
 * @returns {Object} Full game state and actions
 * @throws {Error} If used outside of EssenceTapProvider
 */
export function useEssenceTapContext() {
  const context = useContext(EssenceTapContext);

  if (context === null) {
    throw new Error(
      'useEssenceTapContext must be used within an EssenceTapProvider. ' +
      'Wrap your component tree with <EssenceTapProvider>.'
    );
  }

  return context;
}

// ============================================================================
// SELECTOR HOOKS - Optimized hooks for specific slices of state
// ============================================================================

/**
 * useEssence - Hook for essence-related state
 * @returns {Object} Essence state
 */
export function useEssence() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    essence: context.essence,
    lifetimeEssence: context.lifetimeEssence,
    totalClicks: context.totalClicks
  }), [context.essence, context.lifetimeEssence, context.totalClicks]);
}

/**
 * useGenerators - Hook for generator-related state and actions
 * @returns {Object} Generator state and purchase function
 */
export function useGenerators() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    generators: context.gameState?.generators || {},
    productionPerSecond: context.gameState?.productionPerSecond || 0,
    purchaseGenerator: context.purchaseGenerator
  }), [
    context.gameState?.generators,
    context.gameState?.productionPerSecond,
    context.purchaseGenerator
  ]);
}

/**
 * useUpgrades - Hook for upgrade-related state and actions
 * @returns {Object} Upgrade state and purchase function
 */
export function useUpgrades() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    purchasedUpgrades: context.gameState?.purchasedUpgrades || [],
    clickPower: context.gameState?.clickPower || 1,
    critChance: context.gameState?.critChance || 0.01,
    critMultiplier: context.gameState?.critMultiplier || 10,
    purchaseUpgrade: context.purchaseUpgrade
  }), [
    context.gameState?.purchasedUpgrades,
    context.gameState?.clickPower,
    context.gameState?.critChance,
    context.gameState?.critMultiplier,
    context.purchaseUpgrade
  ]);
}

/**
 * usePrestige - Hook for prestige-related state and actions
 * @returns {Object} Prestige state and actions
 */
export function usePrestige() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    prestige: context.gameState?.prestige || {},
    prestigeUpgrades: context.gameState?.prestigeUpgrades || {},
    performPrestige: context.performPrestige,
    purchasePrestigeUpgrade: context.purchasePrestigeUpgrade
  }), [
    context.gameState?.prestige,
    context.gameState?.prestigeUpgrades,
    context.performPrestige,
    context.purchasePrestigeUpgrade
  ]);
}

/**
 * useCharacters - Hook for character-related state and actions
 * @returns {Object} Character state and actions
 */
export function useCharacters() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    assignedCharacters: context.gameState?.assignedCharacters || [],
    maxCharacterSlots: context.gameState?.maxCharacterSlots || 0,
    assignCharacter: context.assignCharacter,
    unassignCharacter: context.unassignCharacter
  }), [
    context.gameState?.assignedCharacters,
    context.gameState?.maxCharacterSlots,
    context.assignCharacter,
    context.unassignCharacter
  ]);
}

/**
 * useTournament - Hook for tournament-related state and actions
 * @returns {Object} Tournament state and actions
 */
export function useTournament() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    tournament: context.gameState?.tournament || {},
    getTournamentInfo: context.getTournamentInfo,
    claimTournamentRewards: context.claimTournamentRewards,
    getBracketLeaderboard: context.getBracketLeaderboard,
    getBurningHourStatus: context.getBurningHourStatus,
    claimTournamentCheckpoint: context.claimTournamentCheckpoint,
    getTournamentCosmetics: context.getTournamentCosmetics,
    equipTournamentCosmetic: context.equipTournamentCosmetic,
    unequipTournamentCosmetic: context.unequipTournamentCosmetic
  }), [
    context.gameState?.tournament,
    context.getTournamentInfo,
    context.claimTournamentRewards,
    context.getBracketLeaderboard,
    context.getBurningHourStatus,
    context.claimTournamentCheckpoint,
    context.getTournamentCosmetics,
    context.equipTournamentCosmetic,
    context.unequipTournamentCosmetic
  ]);
}

/**
 * useGambling - Hook for gambling-related state and actions
 * @returns {Object} Gambling state and actions
 */
export function useGambling() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    gambling: context.gameState?.gambling || {},
    jackpot: context.gameState?.jackpot || {},
    performGamble: context.performGamble,
    getGambleInfo: context.getGambleInfo
  }), [
    context.gameState?.gambling,
    context.gameState?.jackpot,
    context.performGamble,
    context.getGambleInfo
  ]);
}

/**
 * useClicking - Hook for clicking/tapping state and actions
 * @returns {Object} Click state and actions
 */
export function useClicking() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    clickPower: context.gameState?.clickPower || 1,
    critChance: context.gameState?.critChance || 0.01,
    critMultiplier: context.gameState?.critMultiplier || 10,
    comboMultiplier: context.comboMultiplier,
    lastClickResult: context.lastClickResult,
    handleClick: context.handleClick
  }), [
    context.gameState?.clickPower,
    context.gameState?.critChance,
    context.gameState?.critMultiplier,
    context.comboMultiplier,
    context.lastClickResult,
    context.handleClick
  ]);
}

/**
 * useMilestones - Hook for milestone-related state and actions
 * @returns {Object} Milestone state and actions
 */
export function useMilestones() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    milestones: context.gameState?.milestones || {},
    repeatableMilestones: context.gameState?.repeatableMilestones || {},
    claimMilestone: context.claimMilestone,
    claimRepeatableMilestone: context.claimRepeatableMilestone
  }), [
    context.gameState?.milestones,
    context.gameState?.repeatableMilestones,
    context.claimMilestone,
    context.claimRepeatableMilestone
  ]);
}

/**
 * useAbilities - Hook for ability-related state and actions
 * @returns {Object} Ability state and actions
 */
export function useAbilities() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    abilities: context.gameState?.abilities || [],
    activeAbilities: context.gameState?.activeAbilities || [],
    activateAbility: context.activateAbility
  }), [
    context.gameState?.abilities,
    context.gameState?.activeAbilities,
    context.activateAbility
  ]);
}

/**
 * useInfusion - Hook for infusion-related state and actions
 * @returns {Object} Infusion state and actions
 */
export function useInfusion() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    infusion: context.gameState?.infusion || {},
    performInfusion: context.performInfusion
  }), [
    context.gameState?.infusion,
    context.performInfusion
  ]);
}

/**
 * useDailyStreak - Hook for daily streak state and actions
 * @returns {Object} Streak state and actions
 */
export function useDailyStreak() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    streak: context.gameState?.streak || {},
    claimDailyStreak: context.claimDailyStreak
  }), [
    context.gameState?.streak,
    context.claimDailyStreak
  ]);
}

/**
 * useAchievements - Hook for achievement state
 * @returns {Object} Achievement state and actions
 */
export function useAchievements() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    unlockedAchievement: context.unlockedAchievement,
    dismissAchievement: context.dismissAchievement
  }), [
    context.unlockedAchievement,
    context.dismissAchievement
  ]);
}

/**
 * useOfflineProgress - Hook for offline progress state
 * @returns {Object} Offline progress state and actions
 */
export function useOfflineProgress() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    offlineProgress: context.offlineProgress,
    dismissOfflineProgress: context.dismissOfflineProgress
  }), [
    context.offlineProgress,
    context.dismissOfflineProgress
  ]);
}

/**
 * useConnectionState - Hook for WebSocket connection state
 * @returns {Object} Connection state
 */
export function useConnectionState() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    wsConnected: context.wsConnected,
    wsConnectionState: context.wsConnectionState,
    requestSync: context.requestSync,
    flushPendingActions: context.flushPendingActions
  }), [
    context.wsConnected,
    context.wsConnectionState,
    context.requestSync,
    context.flushPendingActions
  ]);
}

/**
 * useLoadingState - Hook for loading/error state
 * @returns {Object} Loading state
 */
export function useLoadingState() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    loading: context.loading,
    error: context.error,
    refresh: context.refresh
  }), [
    context.loading,
    context.error,
    context.refresh
  ]);
}

/**
 * useSounds - Hook for sound effects
 * @returns {Object} Sound control functions
 */
export function useSounds() {
  const context = useEssenceTapContext();

  return context.sounds;
}

/**
 * useUtilities - Hook for utility functions
 * @returns {Object} Utility functions
 */
export function useUtilities() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    formatNumber: context.formatNumber,
    formatPerSecond: context.formatPerSecond,
    getMasteryInfo: context.getMasteryInfo,
    getEssenceTypes: context.getEssenceTypes,
    getDailyModifier: context.getDailyModifier
  }), [
    context.formatNumber,
    context.formatPerSecond,
    context.getMasteryInfo,
    context.getEssenceTypes,
    context.getDailyModifier
  ]);
}

/**
 * useBossEncounter - Hook for boss encounter state
 * @returns {Object} Boss encounter state
 */
export function useBossEncounter() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    bossEncounter: context.gameState?.bossEncounter || {},
    totalClicks: context.totalClicks
  }), [
    context.gameState?.bossEncounter,
    context.totalClicks
  ]);
}

/**
 * useStats - Hook for game statistics
 * @returns {Object} Game statistics
 */
export function useStats() {
  const context = useEssenceTapContext();

  return useMemo(() => ({
    stats: context.gameState?.stats || {},
    totalClicks: context.totalClicks,
    lifetimeEssence: context.lifetimeEssence
  }), [
    context.gameState?.stats,
    context.totalClicks,
    context.lifetimeEssence
  ]);
}

// Default export
export default EssenceTapContext;
