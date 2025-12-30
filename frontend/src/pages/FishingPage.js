/**
 * Fishing Page - Main fishing minigame component
 * 
 * REFACTORED: This component now serves as an orchestration layer.
 * All UI has been extracted into sub-components for maintainability.
 * 
 * Component Structure:
 * - FishingHeader: Navigation, autofish, prestige, menus
 * - FishingStatsBar: Session stats display
 * - FishingGameCanvas: PIXI.js canvas with frame
 * - FishingOverlays: Prompts, indicators, result popups
 * - FishingMobileControls: D-pad and action button
 * - FishingNotification: Toast notifications
 * - FishingAutofishBubbles: Autofish result bubbles
 * 
 * Hooks Used:
 * - useFishingTimers: Centralized timer management
 * - useFishingState: State machine for game states
 * - useFishingSession: Cast/catch API coordination
 * - useFishingAutofish: Autofish loop with daily limits
 * - useFishingMultiplayer: WebSocket for multiplayer
 * - useFishingEngine: PIXI.js rendering
 * - useFishingModals: Modal state and logic
 * - useFishingNotifications: Unified notification handling
 * - useSessionStats: Persistent session statistics
 * - useFishingKeyboard: Keyboard input handling
 */

import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { onVisibilityChange, VISIBILITY_CALLBACK_IDS } from '../cache';
import { AuthContext } from '../context/AuthContext';

// Fishing hooks - centralized game logic
import {
  useFishingTimers,
  useFishingState,
  useFishingSession,
  useFishingAutofish,
  useFishingMultiplayer,
  useFishingNotifications,
  useFishingModals,
  useSessionStats,
  useFishingKeyboard,
} from '../hooks';

// Fishing components
import {
  useFishingEngine,
  HelpModal,
  LeaderboardModal,
  TradingPostModal,
  ChallengesModal,
  EquipmentModal,
  PrestigeModal,
  FishingHeader,
  FishingStatsBar,
  FishingGameCanvas,
  FishingMobileControls,
  FishingOverlays,
  FishingNotification,
  FishingAutofishBubbles,
} from '../components/Fishing';

// Fishing actions
import {
  getFishingInfo,
  fetchAllFishingData
} from '../actions/fishingActions';

// Constants
import {
  DIRECTIONS,
  TIME_PERIODS,
  FISHING_TIMING
} from '../constants/fishingConstants';

// Styled components
import { PageContainer, StarsOverlay } from '../components/Fishing/Fishing.styles';

// Design System
import { PageTransition } from '../design-system';

// ===========================================
// MAIN COMPONENT
// ===========================================

const FishingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const canvasContainerRef = useRef(null);
  
  // ===========================================
  // CORE HOOKS
  // ===========================================
  
  // Timer management (automatic cleanup)
  const timers = useFishingTimers();
  
  // Game state machine
  const {
    dispatch,
    canCast,
    canCatch,
    isFishing,
    showBiteAlert,
    canMove,
    gameState,
    sessionId,
    lastResult,
    getReactionTime,
  } = useFishingState();
  
  // Notifications (unified challenge formatting)
  const {
    notification,
    showNotification,
    notifyChallengesCompleted,
  } = useFishingNotifications();
  
  // Session stats (persistent)
  const {
    sessionStats,
    incrementCasts,
    updateFromCatch,
    updateFromAutofish,
  } = useSessionStats();
  
  // Player position and direction
  const [playerPos, setPlayerPos] = useState({ x: 10, y: 6 });
  const [playerDir, setPlayerDir] = useState(DIRECTIONS.DOWN);
  const [canFish, setCanFish] = useState(false);
  
  // Time of day (visual only)
  const [timeOfDay, setTimeOfDay] = useState(TIME_PERIODS.DAY);
  
  // Fish info data
  const [fishInfo, setFishInfo] = useState(null);
  
  // ===========================================
  // MODALS HOOK
  // ===========================================
  
  const modals = useFishingModals({
    user,
    setUser,
    refreshUser,
    showNotification,
    notifyChallengesCompleted,
    onFishInfoUpdate: setFishInfo,
  });
  
  // ===========================================
  // CALLBACK HANDLERS (stable references)
  // ===========================================
  
  // Catch success handler
  const handleCatchSuccess = useCallback((result) => {
    updateFromCatch(result);
    
    // Update pity from response
    if (result.pityInfo) {
      setFishInfo(prev => prev ? { ...prev, pity: result.pityInfo } : prev);
    }
    
    // Show challenge notifications
    notifyChallengesCompleted(result.challengesCompleted);
    
    // Background refresh of fish info
    getFishingInfo().then(setFishInfo).catch(() => {});
  }, [updateFromCatch, notifyChallengesCompleted]);
  
  // Error handler
  const handleError = useCallback((msg) => {
    showNotification(msg, 'error');
  }, [showNotification]);
  
  // ===========================================
  // FISHING SESSION HOOK
  // ===========================================
  
  const { startCast, attemptCatch, cancelSession } = useFishingSession({
    dispatch,
    timers,
    setUser,
    onCastSuccess: incrementCasts,
    onCatchSuccess: handleCatchSuccess,
    onError: handleError,
  });
  
  // ===========================================
  // MULTIPLAYER HOOK
  // ===========================================
  
  // Duplicate session handler
  const handleDuplicateSession = useCallback((msg) => {
    showNotification(t('fishing.duplicateSession') || msg, 'error');
  }, [showNotification, t]);
  
  const multiplayer = useFishingMultiplayer({
    playerPos,
    playerDir,
    gameState,
    lastResult,
    onDuplicateSession: handleDuplicateSession,
    onDisconnect: undefined, // No-op handler
  });
  
  // ===========================================
  // AUTOFISH HOOK
  // ===========================================
  
  // Autofish result handler
  const handleAutofishResult = useCallback((result) => {
    updateFromAutofish(result);
    
    // Update pity from response
    if (result.pityInfo) {
      setFishInfo(prev => prev ? { ...prev, pity: result.pityInfo } : prev);
    }
  }, [updateFromAutofish]);
  
  // Challenge complete handler
  const handleChallengeComplete = useCallback((ch) => {
    notifyChallengesCompleted([ch]);
  }, [notifyChallengesCompleted]);
  
  // Daily limit reached handler
  const handleDailyLimitReached = useCallback(() => {
    showNotification(t('fishing.dailyLimitReached') || 'Daily autofish limit reached!', 'info');
  }, [t, showNotification]);
  
  // Data refresh handler
  const handleDataRefresh = useCallback(({ fishInfo: newFishInfo, rankData, challenges }) => {
    setFishInfo(newFishInfo);
    modals.setRankData(rankData);
    modals.challenges.setData(challenges);
  }, [modals]);
  
  const autofish = useFishingAutofish({
    setUser,
    onResult: handleAutofishResult,
    onChallengeComplete: handleChallengeComplete,
    onError: handleError,
    onDailyLimitReached: handleDailyLimitReached,
    onDataRefresh: handleDataRefresh,
  });
  
  // Toggle autofish wrapper to check daily limits
  const toggleAutofish = useCallback(() => {
    if (autofish.dailyStats && autofish.dailyStats.remaining <= 0) {
      showNotification(t('fishing.dailyLimitReached') || 'Daily autofish limit reached! Resets at midnight.', 'info');
      return;
    }
    autofish.toggleAutofish();
  }, [autofish, t, showNotification]);
  
  // ===========================================
  // GAME ENGINE HOOK
  // ===========================================
  
  const { movePlayer } = useFishingEngine({
    containerRef: canvasContainerRef,
    playerPos,
    setPlayerPos,
    playerDir,
    setPlayerDir,
    // Derived booleans from state machine hook (decouples rendering from state details)
    isFishing,
    showBiteAlert,
    canMove,
    timeOfDay,
    onCanFishChange: setCanFish,
    otherPlayers: multiplayer.otherPlayers,
  });
  
  // ===========================================
  // DATA FETCHING
  // ===========================================
  
  // Initial data load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { fishInfo: fi, rankData, prestigeData } = await fetchAllFishingData();
        setFishInfo(fi);
        modals.setRankData(rankData);
        modals.prestige.setData(prestigeData);
        
        if (rankData.autofish) {
          autofish.updateDailyStats({
            used: rankData.autofish.used,
            limit: rankData.autofish.dailyLimit,
            remaining: rankData.autofish.remaining
          });
        }
      } catch (err) {
        console.error('Failed to fetch fishing data:', err);
      }
    };
    fetchData();
    
    return () => {
      cancelSession();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Visibility change refresh
  useEffect(() => {
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.FISHING_DATA, async (staleLevel) => {
      if (staleLevel === 'critical' || staleLevel === 'normal' || staleLevel === 'static') {
        try {
          const { fishInfo: fi, rankData, prestigeData } = await fetchAllFishingData();
          setFishInfo(fi);
          modals.setRankData(rankData);
          modals.prestige.setData(prestigeData);
          
          if (fi.daily) {
            autofish.updateDailyStats({
              used: fi.daily.autofishUsed,
              limit: fi.daily.autofishLimit,
              remaining: fi.daily.autofishLimit - fi.daily.autofishUsed
            });
          }
        } catch (err) {
          console.warn('Failed to refresh fishing data on visibility change:', err);
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Day/night cycle
  useEffect(() => {
    const periods = [TIME_PERIODS.DAWN, TIME_PERIODS.DAY, TIME_PERIODS.DAY, TIME_PERIODS.DAY, TIME_PERIODS.DUSK, TIME_PERIODS.NIGHT, TIME_PERIODS.NIGHT];
    let idx = 1;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % periods.length;
      setTimeOfDay(periods[idx]);
    }, FISHING_TIMING.dayNightCycleDuration || 90000);
    
    return () => clearInterval(interval);
  }, []);
  
  // ===========================================
  // INPUT HANDLERS
  // ===========================================
  
  const handleCast = useCallback(() => {
    if (canCast && canFish && !autofish.isAutofishing) {
      startCast();
    }
  }, [canCast, canFish, autofish.isAutofishing, startCast]);
  
  const handleCatch = useCallback(() => {
    if (canCatch && sessionId) {
      attemptCatch(sessionId, getReactionTime());
    }
  }, [canCatch, sessionId, attemptCatch, getReactionTime]);
  
  // Keyboard controls (extracted to hook)
  useFishingKeyboard({
    gameState,
    canFish,
    isAutofishing: autofish.isAutofishing,
    onCast: handleCast,
    onCatch: handleCatch,
    onMove: movePlayer,
  });
  
  // Mobile action handler
  const handleMobileAction = useCallback(() => {
    if (canCast && canFish && !autofish.isAutofishing) {
      handleCast();
    } else if (canCatch) {
      handleCatch();
    }
  }, [canCast, canCatch, canFish, autofish.isAutofishing, handleCast, handleCatch]);
  
  // Navigation handler
  const handleBack = useCallback(() => {
    navigate('/gacha');
  }, [navigate]);
  
  // ===========================================
  // RENDER
  // ===========================================

  return (
    <PageTransition>
      <PageContainer $timeOfDay={timeOfDay}>
        {timeOfDay === TIME_PERIODS.NIGHT && <StarsOverlay />}
      
      {/* Header */}
      <FishingHeader
        onBack={handleBack}
        autofish={{ ...autofish, toggleAutofish }}
        multiplayer={multiplayer}
        modals={modals}
        dailyStats={autofish.dailyStats}
      />
      
      {/* Autofish bubbles */}
      <FishingAutofishBubbles autofishLog={autofish.autofishLog} />
      
      {/* Stats Bar */}
      <FishingStatsBar
        sessionStats={sessionStats}
        fishInfo={fishInfo}
      />
      
      {/* Game Canvas */}
      <FishingGameCanvas ref={canvasContainerRef} />
      
      {/* Overlays (prompts, indicators, result popup) */}
      <FishingOverlays
        gameState={gameState}
        canFish={canFish}
        isAutofishing={autofish.isAutofishing}
        lastResult={lastResult}
      />
      
      {/* Mobile Controls */}
      <FishingMobileControls
        gameState={gameState}
        canFish={canFish}
        isAutofishing={autofish.isAutofishing}
        lastResult={lastResult}
        onMove={movePlayer}
        onAction={handleMobileAction}
      />
      
      {/* Notification */}
      <FishingNotification notification={notification} />
      
      {/* Modals */}
      <HelpModal show={modals.help.isOpen} onClose={modals.help.close} fishInfo={fishInfo} />
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
    </PageContainer>
    </PageTransition>
  );
};

export default FishingPage;
