/**
 * FishingModalsContext - Context provider for fishing modal state
 *
 * Eliminates prop drilling of modal state through FishingPage.
 * Modals are rendered at the provider level, not in the page component.
 *
 * @example
 * // In FishingPage
 * <FishingModalsProvider user={user} setUser={setUser} ...>
 *   <FishingHeader />
 *   <FishingGameCanvas />
 *   ...
 * </FishingModalsProvider>
 *
 * // In any child component
 * const { openModal, closeModal } = useFishingModalsContext();
 * <Button onClick={() => openModal('help')}>Help</Button>
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useFishingModals, MODAL_TYPES } from '../hooks/useFishingModals';

// Modals
import {
  HelpModal,
  LeaderboardModal,
  TradingPostModal,
  ChallengesModal,
  EquipmentModal,
  PrestigeModal,
} from '../components/Fishing';

const FishingModalsContext = createContext(null);

/**
 * Hook to access fishing modals context
 * @returns {Object} Modal controls and state
 * @throws {Error} If used outside FishingModalsProvider
 */
export function useFishingModalsContext() {
  const context = useContext(FishingModalsContext);
  if (!context) {
    throw new Error('useFishingModalsContext must be used within FishingModalsProvider');
  }
  return context;
}

/**
 * FishingModalsProvider - Provides modal state and renders modals
 *
 * @param {Object} props
 * @param {Object} props.user - Current user object
 * @param {Function} props.setUser - User state setter
 * @param {Function} props.refreshUser - User refresh function
 * @param {Function} props.showNotification - Notification function
 * @param {Function} props.notifyChallengesCompleted - Challenge notification callback
 * @param {Function} props.onFishInfoUpdate - Fish info update callback
 * @param {Object} props.fishInfo - Current fish info (for HelpModal)
 * @param {React.ReactNode} props.children - Child components
 */
export function FishingModalsProvider({
  user,
  setUser,
  refreshUser,
  showNotification,
  notifyChallengesCompleted,
  onFishInfoUpdate,
  fishInfo,
  children,
}) {
  const modals = useFishingModals({
    user,
    setUser,
    refreshUser,
    showNotification,
    notifyChallengesCompleted,
    onFishInfoUpdate,
  });

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Core controls
    activeModal: modals.activeModal,
    openModal: modals.open,
    closeModal: modals.close,
    isModalOpen: modals.isOpen,

    // Individual modal interfaces (for components that need specific modal data)
    help: modals.help,
    leaderboard: modals.leaderboard,
    trading: modals.trading,
    challenges: modals.challenges,
    equipment: modals.equipment,
    prestige: modals.prestige,
    moreMenu: modals.moreMenu,

    // Shared data
    rankData: modals.rankData,
    setRankData: modals.setRankData,

    // Modal type constants
    MODAL_TYPES,
  }), [modals]);

  return (
    <FishingModalsContext.Provider value={contextValue}>
      {children}

      {/* Render all modals at provider level */}
      <HelpModal
        show={modals.help.isOpen}
        onClose={modals.help.close}
        fishInfo={fishInfo}
      />

      <LeaderboardModal
        show={modals.leaderboard.isOpen}
        onClose={modals.leaderboard.close}
        rankData={modals.leaderboard.rankData}
        leaderboard={modals.leaderboard.data}
      />

      <TradingPostModal
        show={modals.trading.isOpen}
        onClose={modals.trading.close}
        tradingOptions={modals.trading.options}
        tradingLoading={modals.trading.loading}
        tradeResult={modals.trading.result}
        onTrade={modals.trading.onTrade}
      />

      <ChallengesModal
        show={modals.challenges.isOpen}
        onClose={modals.challenges.close}
        challenges={modals.challenges.data}
        challengesLoading={modals.challenges.loading}
        claimingChallenges={modals.challenges.claiming}
        onClaimChallenge={modals.challenges.onClaim}
      />

      <EquipmentModal
        show={modals.equipment.isOpen}
        onClose={modals.equipment.close}
        areas={modals.equipment.areas}
        rods={modals.equipment.rods}
        equipmentTab={modals.equipment.tab}
        setEquipmentTab={modals.equipment.setTab}
        equipmentActionLoading={modals.equipment.loading}
        userPoints={user?.points || 0}
        onSelectArea={modals.equipment.onSelectArea}
        onUnlockArea={modals.equipment.onUnlockArea}
        onEquipRod={modals.equipment.onEquipRod}
        onBuyRod={modals.equipment.onBuyRod}
      />

      <PrestigeModal
        show={modals.prestige.isOpen}
        onClose={modals.prestige.close}
        prestigeData={modals.prestige.data}
        claimingPrestige={modals.prestige.claiming}
        onClaimPrestige={modals.prestige.onClaim}
      />
    </FishingModalsContext.Provider>
  );
}

export { MODAL_TYPES };
export default FishingModalsContext;
