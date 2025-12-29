/**
 * Fishing Modals Hook
 * 
 * Thin coordinator for modal visibility and data.
 * Composes smaller hooks for specific modal functionality:
 * - useFishingTrade: Trading post logic
 * - useFishingChallengesModal: Challenges logic
 * - useFishingEquipment: Areas and rods logic
 * - useFishingPrestige: Prestige logic
 * 
 * USAGE:
 * const modals = useFishingModals({ user, setUser, refreshUser, showNotification });
 * modals.open('leaderboard');
 * modals.close();
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { invalidateFor, CACHE_ACTIONS, onVisibilityChange, VISIBILITY_CALLBACK_IDS } from '../cache';
import { getFishingLeaderboard, getFishingRank } from '../actions/fishingActions';
import { getTradingPostOptions } from '../utils/api';

// Composed hooks
import { useFishingTrade } from './useFishingTrade';
import { useFishingChallengesModal } from './useFishingChallengesModal';
import { useFishingEquipment } from './useFishingEquipment';
import { useFishingPrestige } from './useFishingPrestige';

// ===========================================
// MODAL TYPES
// ===========================================

export const MODAL_TYPES = {
  HELP: 'help',
  LEADERBOARD: 'leaderboard',
  TRADING: 'trading',
  CHALLENGES: 'challenges',
  EQUIPMENT: 'equipment',
  PRESTIGE: 'prestige',
};

/**
 * Hook for managing all fishing modal state and logic
 * 
 * This is now a thin coordinator that delegates to focused hooks.
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.user - Current user object
 * @param {Function} options.setUser - React state setter for user
 * @param {Function} options.refreshUser - Refresh user data function
 * @param {Function} options.showNotification - Notification display function
 * @param {Function} options.notifyChallengesCompleted - Callback for challenge completions
 * @param {Function} options.onFishInfoUpdate - Callback when fish info updates
 * @returns {Object} Modal controls and state
 */
export function useFishingModals({
  user: _user,
  setUser,
  refreshUser,
  showNotification,
  notifyChallengesCompleted,
  onFishInfoUpdate,
}) {
  // ===========================================
  // UNIFIED MODAL VISIBILITY STATE
  // ===========================================
  
  const [activeModal, setActiveModal] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // More menu ref for outside click detection
  const moreMenuRef = useRef(null);
  
  // Modal open/close helpers
  const openModal = useCallback((type) => setActiveModal(type), []);
  const closeModal = useCallback(() => setActiveModal(null), []);
  const isModalOpen = useCallback((type) => activeModal === type, [activeModal]);
  
  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMoreMenu]);
  
  // ===========================================
  // COMPOSED HOOKS (focused responsibilities)
  // ===========================================
  
  // Challenges - need early init for callback reference
  const challenges = useFishingChallengesModal({
    setUser,
    showNotification,
    onUpdate: undefined, // Will be set via modal interface
  });
  
  // Trading - handles trade execution and result display
  const trading = useFishingTrade({
    setUser,
    showNotification,
    refreshUser,
    onChallengesCompleted: (completed) => {
      notifyChallengesCompleted?.(completed);
      challenges.fetchData(); // Refresh challenges after trade
    },
  });
  
  // Equipment - areas and rods
  const equipment = useFishingEquipment({
    setUser,
    showNotification,
    refreshUser,
    onFishInfoUpdate,
  });
  
  // Prestige
  const prestige = useFishingPrestige({
    showNotification,
    refreshUser,
  });
  
  // ===========================================
  // LEADERBOARD STATE (simple, no dedicated hook needed)
  // ===========================================
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [rankData, setRankData] = useState(null);
  
  // ===========================================
  // DATA FETCHING ON MODAL OPEN
  // ===========================================
  
  useEffect(() => {
    if (!activeModal) return;
    
    const fetchModalData = async () => {
      switch (activeModal) {
        case MODAL_TYPES.PRESTIGE:
          invalidateFor(CACHE_ACTIONS.MODAL_PRESTIGE_OPEN);
          prestige.fetchData();
          break;
          
        case MODAL_TYPES.LEADERBOARD:
          invalidateFor(CACHE_ACTIONS.MODAL_LEADERBOARD_OPEN);
          try {
            const [lb, rank] = await Promise.all([
              getFishingLeaderboard(),
              getFishingRank()
            ]);
            setLeaderboard(lb.leaderboard);
            setRankData(rank);
          } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
          }
          break;
          
        case MODAL_TYPES.TRADING:
          invalidateFor(CACHE_ACTIONS.MODAL_TRADING_OPEN);
          trading.fetchOptions();
          break;

        case MODAL_TYPES.CHALLENGES:
          invalidateFor(CACHE_ACTIONS.MODAL_CHALLENGES_OPEN);
          challenges.fetchData();
          break;
          
        case MODAL_TYPES.EQUIPMENT:
          invalidateFor(CACHE_ACTIONS.MODAL_EQUIPMENT_OPEN);
          equipment.fetchData();
          break;
          
        default:
          break;
      }
    };
    
    fetchModalData();
  }, [activeModal]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Trading visibility refresh
  useEffect(() => {
    if (activeModal !== MODAL_TYPES.TRADING) return;
    
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.TRADING_POST, async (staleLevel) => {
      if (staleLevel) {
        try {
          const newOptions = await getTradingPostOptions();
          trading.setOptions(newOptions);
        } catch {
          // Ignore
        }
      }
    });
  }, [activeModal, trading]);
  
  // ===========================================
  // MEMOIZED MODAL INTERFACES (backward compatible)
  // ===========================================
  
  const helpModal = useMemo(() => ({
    isOpen: activeModal === MODAL_TYPES.HELP,
    open: () => openModal(MODAL_TYPES.HELP),
    close: closeModal,
  }), [activeModal, openModal, closeModal]);
  
  const leaderboardModal = useMemo(() => ({
    isOpen: activeModal === MODAL_TYPES.LEADERBOARD,
    open: () => openModal(MODAL_TYPES.LEADERBOARD),
    close: closeModal,
    data: leaderboard,
    rankData,
  }), [activeModal, openModal, closeModal, leaderboard, rankData]);
  
  const tradingModal = useMemo(() => ({
    isOpen: activeModal === MODAL_TYPES.TRADING,
    open: () => openModal(MODAL_TYPES.TRADING),
    close: closeModal,
    options: trading.options,
    loading: trading.loading,
    result: trading.result,
    onTrade: trading.execute,
  }), [activeModal, openModal, closeModal, trading]);
  
  const challengesModal = useMemo(() => ({
    isOpen: activeModal === MODAL_TYPES.CHALLENGES,
    open: () => openModal(MODAL_TYPES.CHALLENGES),
    close: closeModal,
    data: challenges.data,
    setData: challenges.setData,
    loading: challenges.loading,
    claiming: challenges.claiming,
    onClaim: challenges.claim,
  }), [activeModal, openModal, closeModal, challenges]);
  
  const equipmentModal = useMemo(() => ({
    isOpen: activeModal === MODAL_TYPES.EQUIPMENT,
    open: () => openModal(MODAL_TYPES.EQUIPMENT),
    close: closeModal,
    areas: equipment.areas,
    rods: equipment.rods,
    tab: equipment.tab,
    setTab: equipment.setTab,
    loading: equipment.loading,
    onSelectArea: equipment.selectArea,
    onUnlockArea: equipment.unlockArea,
    onEquipRod: equipment.equipRod,
    onBuyRod: equipment.buyRod,
  }), [activeModal, openModal, closeModal, equipment]);
  
  const prestigeModal = useMemo(() => ({
    isOpen: activeModal === MODAL_TYPES.PRESTIGE,
    open: () => openModal(MODAL_TYPES.PRESTIGE),
    close: closeModal,
    data: prestige.data,
    setData: prestige.setData,
    claiming: prestige.claiming,
    onClaim: prestige.claim,
  }), [activeModal, openModal, closeModal, prestige]);
  
  const moreMenuControl = useMemo(() => ({
    isOpen: showMoreMenu,
    toggle: () => setShowMoreMenu(prev => !prev),
    close: () => setShowMoreMenu(false),
    ref: moreMenuRef,
  }), [showMoreMenu]);

  // ===========================================
  // RETURN ORGANIZED MODAL CONTROLS
  // ===========================================

  return {
    // Core modal controls
    activeModal,
    open: openModal,
    close: closeModal,
    isOpen: isModalOpen,

    // Backward-compatible modal interfaces
    help: helpModal,
    leaderboard: leaderboardModal,
    trading: tradingModal,
    challenges: challengesModal,
    equipment: equipmentModal,
    prestige: prestigeModal,
    moreMenu: moreMenuControl,

    // Shared rank data (used by multiple modals)
    rankData,
    setRankData,
  };
}

export default useFishingModals;
