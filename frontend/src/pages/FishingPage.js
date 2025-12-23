import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MdArrowBack, MdHelpOutline, MdClose, MdKeyboardArrowUp, MdKeyboardArrowDown, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdLeaderboard, MdAutorenew, MdPeople, MdEmojiEvents, MdSettings, MdCheckCircle, MdMoreVert, MdStorefront } from 'react-icons/md';
import { FaFish, FaCrown, FaTrophy } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { io } from 'socket.io-client';
import { 
  WS_URL, 
  getTradingPostOptions, 
  getFishingChallenges,
  getFishingAreas,
  getFishingRods
} from '../utils/api';
import { invalidateFor, CACHE_ACTIONS, onVisibilityChange, VISIBILITY_CALLBACK_IDS, STALE_THRESHOLDS } from '../cache';
import { getToken, getUserIdFromToken } from '../utils/authStorage';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock } from '../hooks';
import {
  executeFishTrade,
  catchFish,
  claimChallenge,
  buyRod,
  equipRod,
  unlockArea,
  selectArea,
  runAutofish,
  castLine,
  claimPrestige,
  getFishingInfo,
  getFishingRank,
  getFishingPrestige,
  getFishingLeaderboard,
  fetchAllFishingData
} from '../actions/fishingActions';
import { theme, ModalOverlay, ModalHeader, ModalBody, motionVariants } from '../styles/DesignSystem';
import { useFishingEngine } from '../components/Fishing/FishingEngine';

// Import constants from centralized location
import {
  FISHING_TIMING,
  GAME_STATES,
  DIRECTIONS,
  TIME_PERIODS,
  isBetterFish,
  STORAGE_KEYS,
  SESSION_STATS_VALIDITY
} from '../constants/fishingConstants';

// Import styled components from centralized location
import {
  // Layout
  PageContainer, StarsOverlay,
  // Header
  Header, HeaderWoodGrain, LocationSign, SignWoodGrain, SignContent,
  BackButton, HeaderRight, CoinDot, WoodButton, MultiplayerBadge,
  AutofishButton, LowQuotaDot,
  // Stats Bar
  StatsBar, StatItem, StatValue, StatLabel, StatDivider,
  // Game Area
  GameContainer, CanvasFrame, CanvasCorner, CanvasWrapper,
  // Prompts & Indicators
  FishPrompt, KeyHint, DesktopOnly, MobileOnly,
  StateIndicator, WaitingBubble, WaitingDots, WaitingText,
  CatchAlert, AlertIcon, CatchText,
  // Result Popup
  ResultPopup, ResultGlow, ResultEmoji, ResultInfo,
  ResultTitle, ResultFishName, ResultReward,
  // Mobile Controls
  MobileControls, DPad, DPadCenter, DPadButton, ActionButton,
  // Notifications
  Notification,
  // Autofish Bubbles
  AutofishBubblesContainer, AutofishBubble, BubbleEmoji,
  BubbleContent, BubbleFishName, BubbleReward,
  // Modals
  CozyModal, ModalTitle, CloseButton,
  // Help
  HelpSection, HelpNumber, HelpContent, HelpTitle, HelpText,
  FishList, FishItem, FishEmoji, FishRarity, FishDifficulty,
  // Leaderboard
  YourRankSection, RankBanner, YourRankValue, RankSubtext,
  AutofishUnlockStatus, LeaderboardList, LeaderboardItem,
  LeaderboardRank, LeaderboardName, LeaderboardPoints, AutofishBadge,
  // Pity
  PityBar, PityFill,
  // More Menu
  MoreMenuWrapper, MoreButton, MoreMenuDropdown, MoreMenuItem,
  MoreMenuItemMobile, MoreMenuInfo, MoreMenuDivider, MoreMenuBadge,
  // Challenges Button
  ChallengesButtonDesktop,
  // Prestige Badge (Header)
  PrestigeBadge, PrestigeEmoji, PrestigeName,
  // Loading
  TradingLoadingState,
  // Progress Bars
  ProgressBarContainer, ProgressBarFill,
  // Trading Post Modal
  TradingPostModal, ShopHeader, ShopTitleRow, ShopIcon, ShopTitle, ShopBody,
  WalletStrip, WalletItem, WalletDivider, WalletValue,
  DailyLimitsStrip, DailyLimitItem, DailyLimitDivider, DailyLimitText, LimitReachedBadge,
  FishBar, FishChip, FishChipEmoji, FishChipCount,
  TradeSection, TradeSectionHeader, TradeSectionBadge, TradeSectionTitle, TradeSectionCount,
  TradeGrid, QuickTradeCard, TradeCardTop,
  TradeGiveSection, TradeLabel, TradeGiveContent, TradeGiveEmoji, TradeGiveAmount,
  TradeArrow, TradeGetSection, TradeGetContent, TradeGetEmoji, TradeGetAmount,
  QuickTradeButton, SoftCapWarning, NearLimitWarning, BottleneckInfo,
  LimitReachedNote, LockedTradesList, LockedTradeRow, LockedTradeInfo,
  LockedTradeEmoji, LockedTradeText, LockedTradeName, LockedTradeReward,
  EmptyTradeState, TradeSuccessOverlay, TradeSuccessIcon, TradeSuccessText,
  // Challenges Modal
  ChallengesList, ChallengeCard, ChallengeHeader, ChallengeName, DifficultyBadge,
  ChallengeDescription, ChallengeProgress, ProgressText, ChallengeReward,
  ClaimButton, CompletedBadge,
  // Equipment Modal
  EquipmentTabs, EquipmentTab, EquipmentList, EquipmentCard,
  EquipmentIcon, EquipmentInfo, EquipmentName, EquipmentDesc, EquipmentBonus,
  RodBonuses, CurrentBadge, SelectButton, BuyButton, UnlockButton, LockedBadge,
  // Prestige Modal
  PrestigeCurrentLevel, PrestigeLevelEmoji, PrestigeLevelInfo,
  PrestigeLevelTitle, PrestigeLevelSubtitle,
  PrestigeBonusSection, PrestigeSectionTitle, PrestigeBonusList, PrestigeBonusItem,
  PrestigeProgressSection, PrestigeDescription,
  PrestigeOverallProgress, PrestigeProgressBarWrapper, PrestigeProgressFill, PrestigeProgressPercent,
  PrestigeRequirementsList, PrestigeRequirementItem,
  PrestigeReqIcon, PrestigeReqContent, PrestigeReqLabel, PrestigeReqBar, PrestigeReqFill, PrestigeReqValue,
  PrestigeClaimButton, PrestigeMaxLevel, PrestigeMaxIcon, PrestigeMaxText, PrestigeMaxSubtext,
  PrestigeLevelsOverview, PrestigeLevelsList, PrestigeLevelCard,
  PrestigeLevelCardEmoji, PrestigeLevelCardInfo, PrestigeLevelCardName,
  PrestigeLevelCardBadge, PrestigeLevelCardCheck, PrestigeLevelCardLock
} from '../components/Fishing/FishingStyles';

// Alias for backward compatibility (used in autofish interval)
const AUTOFISH_INTERVAL = FISHING_TIMING.autofishInterval;

const FishingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();
  const { withLock: withTradeLock } = useActionLock(300);
  const canvasContainerRef = useRef(null);
  const movePlayerRef = useRef(null);
  // Stable ref for translation function to avoid WebSocket reconnections
  const tRef = useRef(t);
  tRef.current = t;
  
  // Player state
  const [playerPos, setPlayerPos] = useState({ x: 10, y: 6 });
  const [playerDir, setPlayerDir] = useState(DIRECTIONS.DOWN);
  
  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.WALKING);
  const [sessionId, setSessionId] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [fishInfo, setFishInfo] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [canFish, setCanFish] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Timing refs
  const fishAppearedTime = useRef(null);
  const waitTimeoutRef = useRef(null);
  const missTimeoutRef = useRef(null);
  
  // Session stats - persisted to sessionStorage for reload recovery
  const [sessionStats, setSessionStats] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.sessionStats);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if it's from the same session (within validity window)
        if (parsed.timestamp && Date.now() - parsed.timestamp < SESSION_STATS_VALIDITY) {
          return { casts: parsed.casts || 0, catches: parsed.catches || 0, bestCatch: parsed.bestCatch || null };
        }
      }
    } catch {
      // Ignore errors
    }
    return { casts: 0, catches: 0, bestCatch: null };
  });
  
  // Persist session stats to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.sessionStats, JSON.stringify({
        ...sessionStats,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore errors
    }
  }, [sessionStats]);
  
  // Ranking and autofishing
  const [rankData, setRankData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isAutofishing, setIsAutofishing] = useState(false);
  const [autofishLog, setAutofishLog] = useState([]);
  const autofishIntervalRef = useRef(null);
  const autofishInFlightRef = useRef(false); // Prevent overlapping autofish requests
  const autofishTimeoutRef = useRef(null); // Failsafe timeout to reset in-flight guard
  const [autofishInFlight, setAutofishInFlight] = useState(false); // State version for UI rendering
  
  // Trading post state
  const [showTradingPost, setShowTradingPost] = useState(false);
  const [tradingOptions, setTradingOptions] = useState(null);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [tradeResult, setTradeResult] = useState(null);
  
  // NEW: Daily challenges state
  const [showChallenges, setShowChallenges] = useState(false);
  const [challenges, setChallenges] = useState(null);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [claimingChallenges, setClaimingChallenges] = useState({}); // Track which challenges are being claimed
  
  // NEW: Areas & Rods state
  const [showEquipment, setShowEquipment] = useState(false);
  const [areas, setAreas] = useState(null);
  const [rods, setRods] = useState(null);
  const [equipmentTab, setEquipmentTab] = useState('areas'); // 'areas' or 'rods'
  const [equipmentActionLoading, setEquipmentActionLoading] = useState(false);
  
  // NEW: Daily autofish limits
  const [dailyStats, setDailyStats] = useState(null);
  
  // Prestige system state
  const [prestigeData, setPrestigeData] = useState(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [claimingPrestige, setClaimingPrestige] = useState(false);
  
  // Mobile UI: More menu (overflow menu for secondary actions)
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);
  
  // Time of day
  const [timeOfDay, setTimeOfDay] = useState(TIME_PERIODS.DAY);
  
  // Multiplayer state
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [isMultiplayerConnected, setIsMultiplayerConnected] = useState(false);
  // playerCount is derived directly: otherPlayers.length + 1 (for self)
  const socketRef = useRef(null);
  const lastPositionRef = useRef({ x: 10, y: 6, direction: 'down' });
  
  // Initialize the game engine with multiplayer support
  const { movePlayer } = useFishingEngine({
    containerRef: canvasContainerRef,
    playerPos,
    setPlayerPos,
    playerDir,
    setPlayerDir,
    gameState,
    timeOfDay,
    onCanFishChange: setCanFish,
    otherPlayers // Pass other players for rendering
  });
  
  // Keep ref updated to avoid stale closures in keyboard handler
  useEffect(() => {
    movePlayerRef.current = movePlayer;
  }, [movePlayer]);
  
  // Multiplayer WebSocket connection
  // NOTE: Empty dependency array is intentional - we want a single WebSocket connection
  // that persists for the component's lifetime. Token is read once on mount.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    
    // Connect to fishing namespace using base URL
    const socket = io(`${WS_URL}/fishing`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[Multiplayer] Connected to fishing server');
      setIsMultiplayerConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('[Multiplayer] Disconnected from fishing server');
      setIsMultiplayerConnected(false);
      setOtherPlayers([]);
      // Stop autofishing on disconnect to prevent orphaned requests
      setIsAutofishing(false);
      // Reset in-flight ref to allow autofishing to restart on reconnect
      autofishInFlightRef.current = false;
      setAutofishInFlight(false);
    });
    
    socket.on('connect_error', (err) => {
      console.log('[Multiplayer] Connection error:', err.message);
      setIsMultiplayerConnected(false);
    });
    
    // Handle duplicate session (same user connected in another tab)
    socket.on('duplicate_session', (data) => {
      console.log('[Multiplayer] Duplicate session detected:', data.message);
      // Stop autofishing immediately on duplicate session
      setIsAutofishing(false);
      setNotification({
        type: 'error',
        message: tRef.current('fishing.duplicateSession') || 'Disconnected: You opened fishing in another tab'
      });
    });
    
    // Get current user ID for filtering self from multiplayer
    const currentUserId = getUserIdFromToken();
    
    // Initialize with existing players
    socket.on('init', (data) => {
      console.log('[Multiplayer] Initialized with', data.players.length, 'players');
      // Filter out current user (defensive check)
      const filteredPlayers = data.players.filter(p => p.id !== currentUserId);
      setOtherPlayers(filteredPlayers);
    });
    
    // New player joined
    socket.on('player_joined', (player) => {
      // Filter out current user (defensive check for duplicate sessions)
      if (player.id === currentUserId) {
        console.log('[Multiplayer] Ignoring self-join event');
        return;
      }
      console.log('[Multiplayer] Player joined:', player.username);
      setOtherPlayers(prev => {
        // Avoid duplicates - don't add if already exists
        if (prev.find(p => p.id === player.id)) {
          console.log('[Multiplayer] Player already in list, skipping');
          return prev;
        }
        return [...prev, player];
      });
    });
    
    // Player left
    socket.on('player_left', (data) => {
      // Ignore player_left for current user (can happen during duplicate session handling)
      if (data.id === currentUserId) {
        console.log('[Multiplayer] Ignoring self-leave event');
        return;
      }
      console.log('[Multiplayer] Player left:', data.id);
      setOtherPlayers(prev => prev.filter(p => p.id !== data.id));
    });
    
    // Player moved
    socket.on('player_moved', (data) => {
      setOtherPlayers(prev => prev.map(p => 
        p.id === data.id 
          ? { ...p, x: data.x, y: data.y, direction: data.direction }
          : p
      ));
    });
    
    // Player state changed (fishing state)
    socket.on('player_state', (data) => {
      setOtherPlayers(prev => prev.map(p => 
        p.id === data.id 
          ? { ...p, state: data.state, lastFish: data.fish, success: data.success }
          : p
      ));
    });
    
    // Player emote - set with timestamp, engine will auto-clear
    socket.on('player_emote', (data) => {
      setOtherPlayers(prev => prev.map(p => 
        p.id === data.id 
          ? { ...p, emote: data.emote, emoteTime: Date.now() }
          : p
      ));
    });
    
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
  
  // Listen for global session expiry event (from AuthContext)
  // This ensures WebSocket disconnects when auth token becomes invalid
  useEffect(() => {
    const handleSessionExpired = () => {
      console.warn('[Fishing] Session expired - disconnecting WebSocket');
      setIsAutofishing(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setNotification({
        type: 'error',
        message: tRef.current('common.sessionExpired') || 'Session expired. Please log in again.'
      });
    };
    
    window.addEventListener('session:expired', handleSessionExpired);
    return () => window.removeEventListener('session:expired', handleSessionExpired);
  }, []);
  
  // Derived state: player count is other players + self
  const playerCount = otherPlayers.length + 1;
  
  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };
    
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMoreMenu]);
  
  // Send position updates to server
  useEffect(() => {
    if (!socketRef.current || !isMultiplayerConnected) return;
    
    // Only send if position changed
    const pos = lastPositionRef.current;
    if (pos.x !== playerPos.x || pos.y !== playerPos.y || pos.direction !== playerDir) {
      socketRef.current.emit('move', {
        x: playerPos.x,
        y: playerPos.y,
        direction: playerDir
      });
      lastPositionRef.current = { x: playerPos.x, y: playerPos.y, direction: playerDir };
    }
  }, [playerPos, playerDir, isMultiplayerConnected]);
  
  // Send game state changes to server
  useEffect(() => {
    if (!socketRef.current || !isMultiplayerConnected) return;
    
    socketRef.current.emit('state_change', {
      state: gameState,
      fish: lastResult?.fish,
      success: lastResult?.success
    });
  }, [gameState, isMultiplayerConnected, lastResult]);
  
  // Fetch fish info, rank, and prestige on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { fishInfo, rankData, prestigeData } = await fetchAllFishingData();
        setFishInfo(fishInfo);
        setRankData(rankData);
        setPrestigeData(prestigeData);
        
        // Set initial daily stats from rank response
        if (rankData.autofish) {
          setDailyStats({
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
      if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
      if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
      if (autofishIntervalRef.current) clearInterval(autofishIntervalRef.current);
    };
  }, []);
  
  // Day/night cycle - slower transitions for coziness
  useEffect(() => {
    const periods = [TIME_PERIODS.DAWN, TIME_PERIODS.DAY, TIME_PERIODS.DAY, TIME_PERIODS.DAY, TIME_PERIODS.DUSK, TIME_PERIODS.NIGHT, TIME_PERIODS.NIGHT];
    let idx = 1;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % periods.length;
      setTimeOfDay(periods[idx]);
    }, 90000); // 90 seconds per period for cozier feel
    
    return () => clearInterval(interval);
  }, []);
  
  // Visibility change handler - refresh stale fishing data when tab regains focus
  // Uses centralized cacheManager.onVisibilityChange() instead of scattered event listeners
  // 
  // CACHE DEPENDENCY: cacheManager.initVisibilityHandler() clears these at 'normal' threshold:
  // - /fishing/info, /fishing/rank (via VISIBILITY_INVALIDATIONS.normal)
  // This callback just re-fetches into component state after cache is cleared.
  useEffect(() => {
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.FISHING_DATA, async (staleLevel) => {
      // Only refresh if tab was hidden long enough to be considered stale
      if (staleLevel === 'critical' || staleLevel === 'normal' || staleLevel === 'static') {
        try {
          const { fishInfo, rankData, prestigeData } = await fetchAllFishingData();
          setFishInfo(fishInfo);
          setRankData(rankData);
          setPrestigeData(prestigeData);
          
          // Update daily stats from fresh info
          if (fishInfo.daily) {
            setDailyStats({
              used: fishInfo.daily.autofishUsed,
              limit: fishInfo.daily.autofishLimit,
              remaining: fishInfo.daily.autofishLimit - fishInfo.daily.autofishUsed
            });
          }
        } catch (err) {
          console.warn('Failed to refresh fishing data on visibility change:', err);
        }
      }
    });
  }, []);
  
  // Prestige modal fetch - refresh prestige data when opening
  useEffect(() => {
    if (showPrestigeModal) {
      // Ensure fresh data when opening prestige modal
      invalidateFor(CACHE_ACTIONS.MODAL_PRESTIGE_OPEN);
      
      getFishingPrestige()
        .then(freshPrestigeData => {
          setPrestigeData(freshPrestigeData);
        })
        .catch(err => console.error('Failed to fetch prestige data:', err));
    }
  }, [showPrestigeModal]);
  
  // Leaderboard fetch - also refresh rank data to keep it in sync
  useEffect(() => {
    if (showLeaderboard) {
      // Ensure fresh data when opening leaderboard modal
      invalidateFor(CACHE_ACTIONS.MODAL_LEADERBOARD_OPEN);
      
      Promise.all([
        getFishingLeaderboard(),
        getFishingRank()
      ])
        .then(([leaderboardData, rankData]) => {
          setLeaderboard(leaderboardData.leaderboard);
          setRankData(rankData);
        })
        .catch(err => console.error('Failed to fetch leaderboard:', err));
    }
  }, [showLeaderboard]);
  
  // Trading post fetch
  useEffect(() => {
    if (showTradingPost) {
      setTradingLoading(true);
      getTradingPostOptions()
        .then(data => {
          setTradingOptions(data);
          setTradingLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch trading options:', err);
          setTradingLoading(false);
        });
    }
  }, [showTradingPost]);
  
  // Visibility-based refresh for trading modal to prevent stale data
  // Uses centralized VISIBILITY_CALLBACK_IDS for consistency and auditability
  useEffect(() => {
    if (!showTradingPost) return;
    
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.TRADING_POST, async (staleLevel) => {
      // Refresh trade options when tab becomes visible after being backgrounded
      if (staleLevel) {
        try {
          const newOptions = await getTradingPostOptions();
          setTradingOptions(newOptions);
        } catch (err) {
          console.error('Failed to refresh trading options on visibility change:', err);
        }
      }
    });
  }, [showTradingPost]);
  
  // Challenges fetch
  useEffect(() => {
    if (showChallenges) {
      setChallengesLoading(true);
      getFishingChallenges()
        .then(data => {
          setChallenges(data);
          setChallengesLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch challenges:', err);
          setChallengesLoading(false);
        });
    }
  }, [showChallenges]);
  
  // Equipment (Areas & Rods) fetch - invalidate cache when modal opens
  useEffect(() => {
    if (showEquipment) {
      // Invalidate cache before fetching fresh data
      invalidateFor(CACHE_ACTIONS.MODAL_EQUIPMENT_OPEN);
      Promise.all([
        getFishingAreas(), 
        getFishingRods()
      ])
        .then(([areasData, rodsData]) => {
          setAreas(areasData);
          setRods(rodsData);
        })
        .catch(err => console.error('Failed to fetch equipment:', err));
    }
  }, [showEquipment]);
  
  // Show notification
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), theme.timing.notificationDismiss);
  }, []);
  
  // Handle trade execution with timeout protection
  const handleTrade = useCallback(async (tradeId) => {
    // Use action lock to prevent rapid double-clicks
    await withTradeLock(async () => {
      try {
        setTradingLoading(true);
        
        // Create timeout promise for client-side trade timeout protection
        const TRADE_TIMEOUT_MS = 35000;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TRADE_TIMEOUT')), TRADE_TIMEOUT_MS)
        );
        
        // Race between trade execution and timeout
        const result = await Promise.race([
          executeFishTrade(tradeId, 1, setUser),
          timeoutPromise
        ]);
        
        setTradeResult(result);
        
        // Refresh trading options (cache already invalidated by helper)
        const newOptions = await getTradingPostOptions();
        setTradingOptions(newOptions);
        
        showNotification(result.message, 'success');
        
        // Show challenge completion notifications (rewards are auto-applied on completion)
        if (result.challengesCompleted?.length > 0) {
          result.challengesCompleted.forEach(ch => {
            const rewardParts = [];
            if (ch.reward?.points) rewardParts.push(`${ch.reward.points} points`);
            if (ch.reward?.rollTickets) rewardParts.push(`${ch.reward.rollTickets} 🎟️`);
            if (ch.reward?.premiumTickets) rewardParts.push(`${ch.reward.premiumTickets} 🌟`);
            const rewardStr = rewardParts.length > 0 ? ` +${rewardParts.join(', ')}` : '';
            
            showNotification(`🏆 ${t('fishing.challengeComplete')}: ${t(`fishing.challengeNames.${ch.id}`) || ch.id}${rewardStr}`, 'success');
          });
          
          // Refresh challenges state
          getFishingChallenges().then(setChallenges).catch(() => {});
        }
        
        setTradingLoading(false);
        
        // Clear result after animation
        setTimeout(() => setTradeResult(null), theme.timing.tradeResultDismiss);
      } catch (err) {
        // Handle specific error codes with appropriate messages
        const errorCode = err.response?.data?.error || err.message;
        const errorMessages = {
          'TRADE_NOT_ENOUGH_FISH': t('fishing.errors.notEnoughFish') || 'Not enough fish for this trade',
          'TRADE_NOT_FOUND': t('fishing.errors.tradeNotFound') || 'Trade option not found',
          'TRADE_IN_PROGRESS': t('fishing.errors.tradeInProgress') || 'Another trade is being processed',
          'DAILY_LIMIT_REACHED': t('fishing.errors.dailyLimitReached') || 'Daily limit reached for this reward',
          'DAILY_POINTS_LIMIT': t('fishing.errors.dailyPointsLimit') || 'Daily points limit reached',
          'DAILY_ROLL_TICKET_LIMIT': t('fishing.errors.dailyRollTicketLimit') || 'Daily roll ticket limit reached',
          'DAILY_PREMIUM_TICKET_LIMIT': t('fishing.errors.dailyPremiumTicketLimit') || 'Daily premium ticket limit reached',
          'INSUFFICIENT_FISH': t('fishing.errors.notEnoughFish') || 'Not enough fish for this trade',
          'TRADE_TIMEOUT': t('fishing.errors.tradeTimeout') || 'Trade timed out, please try again'
        };
        
        const message = errorMessages[errorCode] || err.response?.data?.message || t('fishing.tradeFailed');
        showNotification(message, 'error');
        setTradingLoading(false);
        
        // Always refresh both user and trade options after failure to sync state
        const [newOptions] = await Promise.all([
          getTradingPostOptions(),
          refreshUser()
        ]);
        setTradingOptions(newOptions);
      }
    });
  }, [setUser, t, showNotification, withTradeLock, refreshUser]);
  
  // Time-based staleness tracking for autofish refreshes
  // Replaces counter-based approach for consistency with centralized cache patterns
  const lastAutofishRefreshRef = useRef(Date.now());
  
  // Autofishing loop with integrated cleanup (now with daily limits)
  useEffect(() => {
    // NEW: Everyone can autofish now (canAutofish is always true)
    if (!isAutofishing) {
      lastAutofishRefreshRef.current = Date.now(); // Reset timer when stopping
      return;
    }
    
    // Single interval for autofishing
    autofishIntervalRef.current = setInterval(async () => {
      // Skip if previous request still in flight (prevents overlap on slow network)
      if (autofishInFlightRef.current) {
        console.debug('[Autofish] Skipping - previous request still in flight');
        return;
      }
      
      autofishInFlightRef.current = true;
      setAutofishInFlight(true);
      
      // Failsafe timeout: reset in-flight guard after 30s in case of stuck request
      autofishTimeoutRef.current = setTimeout(() => {
        if (autofishInFlightRef.current) {
          console.warn('[Autofish] Request timeout - resetting in-flight guard');
          autofishInFlightRef.current = false;
          setAutofishInFlight(false);
        }
      }, 30000);
      
      try {
        // Use centralized action helper for consistent cache invalidation
        const result = await runAutofish(setUser);
        
        // Update pity progress from response (immediate)
        if (result.pityInfo) {
          setFishInfo(prev => ({
            ...prev,
            pity: result.pityInfo
          }));
        }
        
        // Update daily stats from response
        if (result.daily) {
          setDailyStats({
            used: result.daily.used,
            limit: result.daily.limit,
            remaining: result.daily.remaining
          });
          
          // Auto-stop if limit reached
          if (result.daily.remaining <= 0) {
            setIsAutofishing(false);
            showNotification(t('fishing.dailyLimitReached') || 'Daily autofish limit reached!', 'info');
          }
        }
        
        setSessionStats(prev => ({
          ...prev,
          casts: prev.casts + 1,
          catches: result.success ? prev.catches + 1 : prev.catches,
          bestCatch: result.success && isBetterFish(result.fish, prev.bestCatch)
            ? { fish: result.fish }
            : prev.bestCatch
        }));
        
        const now = Date.now();
        setAutofishLog(prev => {
          // Add new entry and clean old ones in single update
          const newEntry = {
            fish: result.fish,
            success: result.success,
            timestamp: now
          };
          // Keep only entries less than 4 seconds old, limit to 3 on mobile, 6 on desktop
          const maxBubbles = window.innerWidth < 768 ? 3 : 6;
          return [newEntry, ...prev.filter(e => now - e.timestamp < 4000)].slice(0, maxBubbles);
        });
        
        // Show challenge completion notifications (rewards are auto-applied on completion)
        if (result.challengesCompleted?.length > 0) {
          result.challengesCompleted.forEach(ch => {
            // Build reward string for clarity
            const rewardParts = [];
            if (ch.reward?.points) rewardParts.push(`${ch.reward.points} points`);
            if (ch.reward?.rollTickets) rewardParts.push(`${ch.reward.rollTickets} 🎟️`);
            if (ch.reward?.premiumTickets) rewardParts.push(`${ch.reward.premiumTickets} 🌟`);
            const rewardStr = rewardParts.length > 0 ? ` +${rewardParts.join(', ')}` : '';
            
            showNotification(`🏆 ${t('fishing.challengeComplete')}: ${t(`fishing.challengeNames.${ch.id}`) || ch.id}${rewardStr}`, 'success');
          });
          
          // Refresh challenges state immediately to update UI
          getFishingChallenges().then(setChallenges).catch(() => {});
        }
        
        // Time-based refresh of fishInfo, rank, and challenges during long autofish sessions
        // Uses STALE_THRESHOLDS.normal (2 min) for consistency with visibility-based invalidation
        const timeSinceLastRefresh = Date.now() - lastAutofishRefreshRef.current;
        if (timeSinceLastRefresh > STALE_THRESHOLDS.normal) {
          lastAutofishRefreshRef.current = Date.now();
          try {
            const [fishInfo, rankData, challengesData] = await Promise.all([
              getFishingInfo(),
              getFishingRank(),
              getFishingChallenges()
            ]);
            setFishInfo(fishInfo);
            setRankData(rankData);
            setChallenges(challengesData);
          } catch {
            // Silent fail - non-critical periodic refresh
          }
        }
        
      } catch (err) {
        if (err.response?.status === 429 && err.response?.data?.error === 'Daily limit reached') {
          setIsAutofishing(false);
          showNotification(err.response.data.message || t('fishing.dailyLimitReached'), 'info');
        } else if (err.response?.status === 403) {
          setIsAutofishing(false);
          showNotification(t('fishing.autofishError'), 'error');
        }
      } finally {
        // Clear failsafe timeout and reset in-flight guard
        if (autofishTimeoutRef.current) {
          clearTimeout(autofishTimeoutRef.current);
          autofishTimeoutRef.current = null;
        }
        autofishInFlightRef.current = false;
        setAutofishInFlight(false);
      }
    }, AUTOFISH_INTERVAL);
    
    return () => {
      if (autofishIntervalRef.current) {
        clearInterval(autofishIntervalRef.current);
        autofishIntervalRef.current = null;
      }
      if (autofishTimeoutRef.current) {
        clearTimeout(autofishTimeoutRef.current);
        autofishTimeoutRef.current = null;
      }
      autofishInFlightRef.current = false;
      setAutofishInFlight(false);
    };
  }, [isAutofishing, setUser, t, showNotification]);
  
  // Keep-alive heartbeat (prevents inactive timeout disconnect for idle users)
  useEffect(() => {
    if (!socketRef.current || !isMultiplayerConnected) {
      return;
    }
    
    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat');
      }
    }, 30000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isMultiplayerConnected]);
  
  // Refs for keyboard handler to avoid stale closures
  const gameStateRef = useRef(gameState);
  const canFishRef = useRef(canFish);
  const startFishingRef = useRef(null);
  const handleCatchRef = useRef(null);
  
  useEffect(() => {
    gameStateRef.current = gameState;
    canFishRef.current = canFish;
  }, [gameState, canFish]);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showHelp || showLeaderboard) return;
      
      // Fishing action
      if (e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        if (gameStateRef.current === GAME_STATES.WALKING && canFishRef.current) {
          startFishingRef.current?.();
          return;
        }
        if (gameStateRef.current === GAME_STATES.FISH_APPEARED) {
          handleCatchRef.current?.();
          return;
        }
      }
      
      // Movement
      if (gameStateRef.current === GAME_STATES.WALKING) {
        const move = movePlayerRef.current;
        if (!move) return;
        
        switch (e.code) {
          case 'ArrowUp':
          case 'KeyW':
            e.preventDefault();
            move(0, -1, DIRECTIONS.UP);
            break;
          case 'ArrowDown':
          case 'KeyS':
            e.preventDefault();
            move(0, 1, DIRECTIONS.DOWN);
            break;
          case 'ArrowLeft':
          case 'KeyA':
            e.preventDefault();
            move(-1, 0, DIRECTIONS.LEFT);
            break;
          case 'ArrowRight':
          case 'KeyD':
            e.preventDefault();
            move(1, 0, DIRECTIONS.RIGHT);
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHelp, showLeaderboard]);
  
  // Handle missing fish (defined first as it's used by startFishing)
  // NOTE: Misses do NOT invalidate caches because:
  // - No fish/points are granted (no inventory/auth change)
  // - Server records the miss but it doesn't affect client-visible state
  // - Challenge progress for "catch" challenges only counts successes
  // - Fresh data is fetched on visibility change or next successful catch
  const handleMiss = useCallback(async (sid) => {
    try {
      // Use catchFish helper without reactionTime to signal a miss
      // The helper only invalidates cache on success, so misses are handled correctly
      const result = await catchFish(sid, undefined, setUser);
      setLastResult(result);
      setGameState(GAME_STATES.FAILURE);
      
      setTimeout(() => {
        setGameState(GAME_STATES.WALKING);
        setSessionId(null);
      }, 2000);
    } catch (err) {
      setGameState(GAME_STATES.WALKING);
      setSessionId(null);
    }
  }, [setUser]);
  
  // Start fishing
  const startFishing = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.WALKING || !canFishRef.current) return;
    
    setLastResult(null);
    setGameState(GAME_STATES.CASTING);
    
    try {
      // Use centralized action helper for consistent state updates
      const result = await castLine(setUser);
      const { sessionId: newSessionId, waitTime, missTimeout = 2500, daily } = result;
      
      setSessionId(newSessionId);
      setSessionStats(prev => ({ ...prev, casts: prev.casts + 1 }));
      
      // Update daily stats from cast response (tracks manual casts)
      if (daily) {
        // daily contains { manualCasts, limit } from cast endpoint
        // We can use this to track manual cast progress if needed
      }
      
      setTimeout(() => {
        setGameState(GAME_STATES.WAITING);
        
        waitTimeoutRef.current = setTimeout(() => {
          fishAppearedTime.current = Date.now();
          setGameState(GAME_STATES.FISH_APPEARED);
          
          // Use server-provided missTimeout (varies by fish rarity for balance)
          missTimeoutRef.current = setTimeout(() => {
            handleMiss(newSessionId);
          }, missTimeout);
        }, waitTime);
      }, 600);
      
    } catch (err) {
      showNotification(err.response?.data?.error || t('fishing.failedCast'), 'error');
      setGameState(GAME_STATES.WALKING);
    }
  }, [t, showNotification, handleMiss, setUser]);
  
  // Handle catching fish
  const handleCatch = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.FISH_APPEARED || !sessionId) return;
    
    if (missTimeoutRef.current) {
      clearTimeout(missTimeoutRef.current);
    }
    
    const reactionTime = Date.now() - fishAppearedTime.current;
    setGameState(GAME_STATES.CATCHING);
    
    try {
      // Use centralized action helper for consistent cache invalidation and state updates
      const result = await catchFish(sessionId, reactionTime, setUser);
      
      setLastResult(result);
      
      if (result.success) {
        setGameState(GAME_STATES.SUCCESS);
        // Use fishQuantity from server (based on catch quality: perfect=2, great=1, normal=1)
        const caughtQty = result.fishQuantity || 1;
        setSessionStats(prev => ({
          ...prev,
          catches: prev.catches + caughtQty,
          bestCatch: isBetterFish(result.fish, prev.bestCatch)
            ? { fish: result.fish, quality: result.catchQuality }
            : prev.bestCatch
        }));
        
        // Immediate optimistic update of pity from response (if available)
        if (result.pityInfo) {
          setFishInfo(prev => ({
            ...prev,
            pity: result.pityInfo
          }));
        }
        
        // Background refresh of full fishInfo for complete state sync
        // This runs async and doesn't block the success animation
        getFishingInfo().then(fishInfo => {
          setFishInfo(fishInfo);
          
          // Update daily stats from fresh info
          if (fishInfo.daily) {
            setDailyStats({
              used: fishInfo.daily.autofishUsed,
              limit: fishInfo.daily.autofishLimit,
              remaining: fishInfo.daily.autofishLimit - fishInfo.daily.autofishUsed
            });
          }
        }).catch(() => {
          // Silent fail - pity was already updated from response
        });
        
        // Show challenge completion notifications (rewards are auto-applied on completion)
        if (result.challengesCompleted?.length > 0) {
          result.challengesCompleted.forEach(ch => {
            // Build reward string for clarity
            const rewardParts = [];
            if (ch.reward?.points) rewardParts.push(`${ch.reward.points} points`);
            if (ch.reward?.rollTickets) rewardParts.push(`${ch.reward.rollTickets} 🎟️`);
            if (ch.reward?.premiumTickets) rewardParts.push(`${ch.reward.premiumTickets} 🌟`);
            const rewardStr = rewardParts.length > 0 ? ` +${rewardParts.join(', ')}` : '';
            
            showNotification(`🏆 ${t('fishing.challengeComplete')}: ${t(`fishing.challengeNames.${ch.id}`) || ch.id}${rewardStr}`, 'success');
          });
          
          // Refresh challenges state immediately to update UI
          getFishingChallenges().then(setChallenges).catch(() => {});
        }
      } else {
        setGameState(GAME_STATES.FAILURE);
      }
      
      setTimeout(() => {
        setGameState(GAME_STATES.WALKING);
        setSessionId(null);
      }, 2000);
      
    } catch (err) {
      showNotification(err.response?.data?.error || t('fishing.failedCatch'), 'error');
      setGameState(GAME_STATES.WALKING);
      setSessionId(null);
    }
  }, [sessionId, t, showNotification, setUser]);
  
  // Keep function refs updated for keyboard handler
  useEffect(() => {
    startFishingRef.current = startFishing;
    handleCatchRef.current = handleCatch;
  }, [startFishing, handleCatch]);
  
  // Toggle autofish (now available to everyone with daily limits)
  const toggleAutofish = useCallback(() => {
    // Check if daily limit is already reached
    if (dailyStats && dailyStats.remaining <= 0) {
      showNotification(t('fishing.dailyLimitReached') || 'Daily autofish limit reached! Resets at midnight.', 'info');
      return;
    }
    setIsAutofishing(prev => !prev);
    setAutofishLog([]);
  }, [dailyStats, t, showNotification]);
  
  // Handle challenge claim - with claiming state to prevent double-clicks
  const handleClaimChallenge = useCallback(async (challengeId) => {
    // Prevent double-claim
    if (claimingChallenges[challengeId]) return;
    
    setClaimingChallenges(prev => ({ ...prev, [challengeId]: true }));
    
    try {
      // Use centralized action helper for consistent cache invalidation and state updates
      const result = await claimChallenge(challengeId, setUser);
      showNotification(result.message, 'success');
      
      // Refresh challenges (cache already invalidated by helper)
      const updatedChallenges = await getFishingChallenges();
      setChallenges(updatedChallenges);
    } catch (err) {
      showNotification(err.response?.data?.error || t('fishing.errors.claimFailed'), 'error');
    } finally {
      setClaimingChallenges(prev => ({ ...prev, [challengeId]: false }));
    }
  }, [claimingChallenges, setUser, showNotification, t]);
  
  // Handle area selection
  const handleSelectArea = useCallback(async (areaId) => {
    if (equipmentActionLoading) return;
    setEquipmentActionLoading(true);
    try {
      // Use centralized action helper for consistent cache invalidation
      await selectArea(areaId);
      
      // Refresh areas and fish info (cache already invalidated by helper)
      const [areasData, fishInfo] = await Promise.all([
        getFishingAreas(),
        getFishingInfo()
      ]);
      setAreas(areasData);
      setFishInfo(fishInfo);
      showNotification(t('fishing.switchedTo', { area: areasData.areas.find(a => a.id === areaId)?.name }), 'success');
    } catch (err) {
      showNotification(err.response?.data?.error || t('fishing.errors.switchAreaFailed'), 'error');
    } finally {
      setEquipmentActionLoading(false);
    }
  }, [showNotification, equipmentActionLoading, t]);
  
  // Handle area unlock (purchase)
  const handleUnlockArea = useCallback(async (areaId) => {
    if (equipmentActionLoading) return;
    setEquipmentActionLoading(true);
    try {
      // Use centralized action helper for consistent cache invalidation and state updates
      const result = await unlockArea(areaId, setUser);
      showNotification(result.message, 'success');
      
      // Refresh areas and fish info (cache already invalidated by helper)
      const [areasData, fishInfo] = await Promise.all([
        getFishingAreas(),
        getFishingInfo()
      ]);
      setAreas(areasData);
      setFishInfo(fishInfo);
    } catch (err) {
      const errorCode = err.response?.data?.error;
      const errorMessages = {
        'already_unlocked': t('fishing.errors.alreadyUnlocked') || 'Area already unlocked!',
        'rank_required': t('fishing.errors.rankRequired') || 'Higher rank required',
        'insufficient_points': t('fishing.errors.notEnoughPoints') || 'Not enough coins'
      };
      showNotification(errorMessages[errorCode] || err.response?.data?.message || t('fishing.errors.unlockAreaFailed'), 'error');
      // Refresh user to sync state after failure
      await refreshUser();
    } finally {
      setEquipmentActionLoading(false);
    }
  }, [setUser, showNotification, equipmentActionLoading, t, refreshUser]);
  
  // Handle rod purchase
  const handleBuyRod = useCallback(async (rodId) => {
    if (equipmentActionLoading) return;
    setEquipmentActionLoading(true);
    try {
      // Use centralized action helper for consistent cache invalidation and state updates
      const result = await buyRod(rodId, setUser);
      showNotification(result.message, 'success');
      
      // Refresh rods and fish info (cache already invalidated by helper)
      const [rodsData, fishInfo] = await Promise.all([
        getFishingRods(),
        getFishingInfo()
      ]);
      setRods(rodsData);
      setFishInfo(fishInfo);
    } catch (err) {
      const errorCode = err.response?.data?.error;
      const errorMessages = {
        'already_owned': t('fishing.errors.alreadyOwned') || 'You already own this rod!',
        'prestige_required': t('fishing.errors.prestigeRequired') || 'Higher prestige level required',
        'insufficient_points': t('fishing.errors.notEnoughPoints') || 'Not enough coins'
      };
      showNotification(errorMessages[errorCode] || err.response?.data?.message || t('fishing.errors.buyRodFailed'), 'error');
      // Refresh user to sync state after failure
      await refreshUser();
    } finally {
      setEquipmentActionLoading(false);
    }
  }, [setUser, showNotification, equipmentActionLoading, t, refreshUser]);
  
  // Handle rod equip (for already owned rods)
  const handleEquipRod = useCallback(async (rodId) => {
    if (equipmentActionLoading) return;
    setEquipmentActionLoading(true);
    try {
      // Use centralized action helper for consistent cache invalidation
      const result = await equipRod(rodId);
      showNotification(t('fishing.equippedRod', { rod: result.rod?.name || t('fishing.rods') }), 'success');
      
      // Refresh rods and fish info (cache already invalidated by helper)
      const [rodsData, fishInfo] = await Promise.all([
        getFishingRods(),
        getFishingInfo()
      ]);
      setRods(rodsData);
      setFishInfo(fishInfo);
    } catch (err) {
      const errorCode = err.response?.data?.error;
      const errorMessages = {
        'not_owned': t('fishing.errors.notOwned') || 'You don\'t own this rod',
        'not_found': t('fishing.errors.notFound') || 'Rod not found'
      };
      showNotification(errorMessages[errorCode] || err.response?.data?.message || t('fishing.errors.equipRodFailed'), 'error');
    } finally {
      setEquipmentActionLoading(false);
    }
  }, [showNotification, equipmentActionLoading, t]);
  
  // Mobile controls
  const handleMobileMove = (dx, dy, dir) => {
    if (gameState === GAME_STATES.WALKING) {
      movePlayer(dx, dy, dir);
    }
  };
  
  const handleMobileAction = () => {
    if (gameState === GAME_STATES.WALKING && canFish) {
      startFishing();
    } else if (gameState === GAME_STATES.FISH_APPEARED) {
      handleCatch();
    }
  };
  
  return (
    <PageContainer $timeOfDay={timeOfDay}>
      {/* Ambient stars overlay for night */}
      {timeOfDay === TIME_PERIODS.NIGHT && <StarsOverlay />}
      
      {/* Header - Rustic wooden style - Mobile optimized */}
      <Header>
        <HeaderWoodGrain />
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack />
        </BackButton>
        <HeaderRight>
          {/* Multiplayer indicator - only show when >1 player (conditional for less clutter) */}
          {playerCount > 1 && (
            <MultiplayerBadge $connected={isMultiplayerConnected}>
              <MdPeople />
              <span>{playerCount}</span>
            </MultiplayerBadge>
          )}
          {/* Prestige Badge - tappable, shows current level */}
          <PrestigeBadge 
            onClick={() => setShowPrestigeModal(true)}
            $level={prestigeData?.currentLevel || 0}
            title={prestigeData?.currentName || t('fishing.noviceAngler')}
          >
            <PrestigeEmoji>{prestigeData?.currentEmoji || '🎣'}</PrestigeEmoji>
            <PrestigeName>
              {prestigeData?.currentLevel > 0 
                ? prestigeData.currentName?.split(' ')[0] 
                : t('fishing.novice') || 'Novice'}
            </PrestigeName>
          </PrestigeBadge>
          {/* Autofish button - primary action, always visible */}
          <AutofishButton 
            onClick={toggleAutofish} 
            $active={isAutofishing} 
            $inFlight={autofishInFlight}
            $lowQuota={dailyStats && dailyStats.remaining < 20}
            title={dailyStats ? `${dailyStats.remaining}/${dailyStats.limit} ${t('fishing.remainingToday')}` : ''}
          >
            <MdAutorenew className={isAutofishing ? 'spinning' : ''} />
            {dailyStats && dailyStats.remaining < 20 && <LowQuotaDot />}
          </AutofishButton>
          {/* Challenges button - show on desktop, hide on mobile (moved to More menu) */}
          <ChallengesButtonDesktop onClick={() => setShowChallenges(true)} $hasCompleted={challenges?.challenges?.some(c => c.progress >= c.target && !c.completed)}>
            <MdEmojiEvents />
          </ChallengesButtonDesktop>
          {/* More menu - consolidates secondary actions on mobile */}
          <MoreMenuWrapper ref={moreMenuRef}>
            <MoreButton onClick={() => setShowMoreMenu(!showMoreMenu)} $isOpen={showMoreMenu}>
              <MdMoreVert />
            </MoreButton>
            <AnimatePresence>
              {showMoreMenu && (
                <MoreMenuDropdown
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Prestige info - first in menu for visibility */}
                  {prestigeData && (
                    <MoreMenuItem onClick={() => { setShowPrestigeModal(true); setShowMoreMenu(false); }}>
                      <span>{prestigeData.currentEmoji || '🎣'}</span>
                      <span>{prestigeData.currentName || t('fishing.noviceAngler')}</span>
                      {prestigeData.canPrestige && <MoreMenuBadge $glow>!</MoreMenuBadge>}
                    </MoreMenuItem>
                  )}
                  {/* Rank info */}
                  {rankData && (
                    <MoreMenuItem onClick={() => { setShowLeaderboard(true); setShowMoreMenu(false); }}>
                      <FaCrown style={{ color: rankData.canAutofish ? '#ffd54f' : '#a1887f' }} />
                      <span>#{rankData.rank}</span>
                      {rankData.canAutofish && <MoreMenuBadge>⭐</MoreMenuBadge>}
                    </MoreMenuItem>
                  )}
                  {/* Autofish quota info */}
                  {dailyStats && (
                    <MoreMenuInfo>
                      <MdAutorenew />
                      <span>{dailyStats.remaining}/{dailyStats.limit} {t('fishing.remainingToday') || 'left today'}</span>
                    </MoreMenuInfo>
                  )}
                  <MoreMenuDivider />
                  {/* Challenges - mobile only (desktop has dedicated button) */}
                  <MoreMenuItemMobile onClick={() => { setShowChallenges(true); setShowMoreMenu(false); }} $hasNotification={challenges?.challenges?.some(c => c.progress >= c.target && !c.completed)}>
                    <MdEmojiEvents />
                    <span>{t('fishing.challenges') || 'Challenges'}</span>
                    {challenges?.challenges?.some(c => c.progress >= c.target && !c.completed) && <MoreMenuBadge>!</MoreMenuBadge>}
                  </MoreMenuItemMobile>
                  {/* Equipment */}
                  <MoreMenuItem onClick={() => { setShowEquipment(true); setShowMoreMenu(false); }}>
                    <MdSettings />
                    <span>{t('fishing.equipment') || 'Equipment'}</span>
                  </MoreMenuItem>
                  {/* Leaderboard */}
                  <MoreMenuItem onClick={() => { setShowLeaderboard(true); setShowMoreMenu(false); }}>
                    <MdLeaderboard />
                    <span>{t('fishing.leaderboard') || 'Leaderboard'}</span>
                  </MoreMenuItem>
                  {/* Trading Post */}
                  <MoreMenuItem onClick={() => { setShowTradingPost(true); setShowMoreMenu(false); }}>
                    <MdStorefront />
                    <span>{t('fishing.tradingPost') || 'Trading Post'}</span>
                  </MoreMenuItem>
                </MoreMenuDropdown>
              )}
            </AnimatePresence>
          </MoreMenuWrapper>
          {/* Help button - always visible */}
          <WoodButton onClick={() => setShowHelp(true)}>
            <MdHelpOutline />
          </WoodButton>
        </HeaderRight>
      </Header>
      
      {/* Autofish bubbles */}
      <AutofishBubblesContainer>
        <AnimatePresence>
          {autofishLog.map((entry) => (
            <AutofishBubble
              key={entry.timestamp}
              $success={entry.success}
              $rarity={entry.fish?.rarity}
              initial={{ opacity: 0, x: 80, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <BubbleEmoji>{entry.fish?.emoji}</BubbleEmoji>
              <BubbleContent>
                <BubbleFishName>{entry.fish?.name}</BubbleFishName>
                <BubbleReward $success={entry.success}>
                  {entry.success ? '+1 🐟' : t('fishing.escaped')}
                </BubbleReward>
              </BubbleContent>
            </AutofishBubble>
          ))}
        </AnimatePresence>
      </AutofishBubblesContainer>
      
      {/* Stats Bar - Mobile optimized: no wrapping, prioritized catches */}
      <StatsBar>
        {/* Catches first - primary success metric */}
        <StatItem $primary>
          <StatValue $success>{sessionStats.catches}</StatValue>
          <StatLabel>{t('fishing.catches')}</StatLabel>
        </StatItem>
        <StatDivider />
        {/* Casts - secondary metric */}
        <StatItem $secondary>
          <StatValue>{sessionStats.casts}</StatValue>
          <StatLabel>{t('fishing.casts')}</StatLabel>
        </StatItem>
        {/* Best catch - show on desktop, hide on very small mobile */}
        {sessionStats.bestCatch && (
          <>
            <StatDivider className="hide-on-tiny" />
            <StatItem $highlight className="hide-on-tiny">
              <StatValue style={{ color: getRarityColor(sessionStats.bestCatch.fish.rarity) }}>
                {sessionStats.bestCatch.fish.emoji}
              </StatValue>
              <StatLabel>{t('fishing.best')}</StatLabel>
            </StatItem>
          </>
        )}
        {/* Pity Progress - only show when approaching pity (soft pity active) */}
        {fishInfo?.pity?.legendary?.inSoftPity && (
          <>
            <StatDivider />
            <StatItem $pity title={`${fishInfo.pity.legendary.current}/${fishInfo.pity.legendary.hardPity} ${t('fishing.casts').toLowerCase()}`}>
              <PityBar>
                <PityFill 
                  $progress={fishInfo.pity.legendary.progress} 
                  $inSoftPity={fishInfo.pity.legendary.inSoftPity}
                  $color="#ffc107"
                />
              </PityBar>
              <StatLabel>🐋 {t('fishing.pity')}</StatLabel>
            </StatItem>
          </>
        )}
      </StatsBar>
      
      {/* Game Canvas */}
      <GameContainer>
        {/* Location Sign - above game frame */}
        <LocationSign>
          <SignWoodGrain />
          <SignContent>
            <FaFish style={{ color: '#64b5f6', fontSize: '16px' }} />
            <span>{t('fishing.title')}</span>
          </SignContent>
        </LocationSign>
        
        <CanvasFrame>
          <CanvasWrapper ref={canvasContainerRef} />
          <CanvasCorner $position="tl" />
          <CanvasCorner $position="tr" />
          <CanvasCorner $position="bl" />
          <CanvasCorner $position="br" />
        </CanvasFrame>
        
        {/* Fish prompt */}
        <AnimatePresence>
          {canFish && gameState === GAME_STATES.WALKING && (
            <FishPrompt
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 10, x: "-50%" }}
            >
              <DesktopOnly>
                <Trans i18nKey="fishing.pressFishPrompt" components={{ key: <KeyHint /> }} />
              </DesktopOnly>
              <MobileOnly>
                <FaFish style={{ marginRight: '8px' }} /> {t('fishing.tapToFish')}
              </MobileOnly>
            </FishPrompt>
          )}
        </AnimatePresence>
        
        {/* State indicator */}
        <AnimatePresence>
          {gameState === GAME_STATES.WAITING && (
            <StateIndicator
              initial={{ opacity: 0, x: "-50%" }}
              animate={{ opacity: 1, x: "-50%" }}
              exit={{ opacity: 0, x: "-50%" }}
            >
              <WaitingBubble>
                <WaitingDots>...</WaitingDots>
                <WaitingText>{t('fishing.waitingForBite')}</WaitingText>
              </WaitingBubble>
            </StateIndicator>
          )}
          {gameState === GAME_STATES.FISH_APPEARED && (
            <StateIndicator
              initial={{ opacity: 0, scale: 0.5, x: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, x: "-50%" }}
            >
              <CatchAlert>
                <AlertIcon>!</AlertIcon>
                <CatchText>{t('fishing.catchIt')}</CatchText>
              </CatchAlert>
            </StateIndicator>
          )}
        </AnimatePresence>
        
        {/* Result popup */}
        <AnimatePresence>
          {(gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE) && lastResult && (
            <ResultPopup
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              $success={lastResult.success}
              $color={getRarityColor(lastResult.fish?.rarity)}
              $glow={getRarityGlow(lastResult.fish?.rarity)}
            >
              <ResultGlow $glow={getRarityGlow(lastResult.fish?.rarity)} />
              <ResultEmoji>{lastResult.fish?.emoji}</ResultEmoji>
              <ResultInfo>
                <ResultTitle $success={lastResult.success}>
                  {lastResult.success ? t('fishing.caught') : t('fishing.escaped')}
                </ResultTitle>
                <ResultFishName $color={getRarityColor(lastResult.fish?.rarity)}>
                  {lastResult.fish?.name}
                </ResultFishName>
                {lastResult.success && (
                  <ResultReward $quality={lastResult.catchQuality}>
                    +{lastResult.fishQuantity || 1} 🐟
                    {lastResult.catchQuality === 'perfect' && ' ⭐'}
                    {lastResult.catchQuality === 'great' && ' ✨'}
                  </ResultReward>
                )}
              </ResultInfo>
            </ResultPopup>
          )}
        </AnimatePresence>
      </GameContainer>
      
      {/* Mobile Controls - Rustic button style */}
      <MobileControls>
        <DPad>
          <DPadCenter />
          <DPadButton onClick={() => handleMobileMove(0, -1, DIRECTIONS.UP)} $position="up">
            <MdKeyboardArrowUp />
          </DPadButton>
          <DPadButton onClick={() => handleMobileMove(-1, 0, DIRECTIONS.LEFT)} $position="left">
            <MdKeyboardArrowLeft />
          </DPadButton>
          <DPadButton onClick={() => handleMobileMove(1, 0, DIRECTIONS.RIGHT)} $position="right">
            <MdKeyboardArrowRight />
          </DPadButton>
          <DPadButton onClick={() => handleMobileMove(0, 1, DIRECTIONS.DOWN)} $position="down">
            <MdKeyboardArrowDown />
          </DPadButton>
        </DPad>
        
        <ActionButton
          onClick={handleMobileAction}
          disabled={!canFish && gameState === GAME_STATES.WALKING}
          $state={gameState}
          $canFish={canFish}
          whileTap={{ scale: 0.9 }}
        >
          {gameState === GAME_STATES.WALKING && (canFish ? <FaFish /> : '•')}
          {gameState === GAME_STATES.CASTING && '...'}
          {gameState === GAME_STATES.WAITING && <FaFish />}
          {gameState === GAME_STATES.FISH_APPEARED && '!'}
          {(gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE) && (
            lastResult?.success ? '✓' : '✗'
          )}
        </ActionButton>
      </MobileControls>
      
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <Notification
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            $type={notification.type}
          >
            {notification.message}
          </Notification>
        )}
      </AnimatePresence>
      
      {/* Help Modal - Cozy parchment style */}
      <AnimatePresence>
        {showHelp && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowHelp(false); }}
          >
            <CozyModal
              variants={motionVariants.modal}
            >
              <ModalHeader>
                <ModalTitle>{t('fishing.howToFish')}</ModalTitle>
                <CloseButton onClick={() => setShowHelp(false)}><MdClose /></CloseButton>
              </ModalHeader>
              <ModalBody>
                <HelpSection>
                  <HelpNumber>1</HelpNumber>
                  <HelpContent>
                    <HelpTitle>{t('fishing.movement')}</HelpTitle>
                    <HelpText>{t('fishing.movementHelp')}</HelpText>
                  </HelpContent>
                </HelpSection>
                <HelpSection>
                  <HelpNumber>2</HelpNumber>
                  <HelpContent>
                    <HelpTitle>{t('fishing.fishingTitle')}</HelpTitle>
                    <HelpText>{t('fishing.fishingHelp')}</HelpText>
                  </HelpContent>
                </HelpSection>
                <HelpSection>
                  <HelpNumber>3</HelpNumber>
                  <HelpContent>
                    <HelpTitle>{t('fishing.catching')}</HelpTitle>
                    <HelpText>{t('fishing.catchingHelp')}</HelpText>
                  </HelpContent>
                </HelpSection>
                <HelpSection>
                  <HelpContent>
                    <HelpTitle>{t('fishing.fishRarities')}</HelpTitle>
                    <FishList>
                      {fishInfo?.fish?.reduce((acc, fish) => {
                        if (!acc.find(f => f.rarity === fish.rarity)) acc.push(fish);
                        return acc;
                      }, []).map(fish => (
                        <FishItem key={fish.rarity} $color={getRarityColor(fish.rarity)}>
                          <FishEmoji>{fish.emoji}</FishEmoji>
                          <FishRarity $color={getRarityColor(fish.rarity)}>
                            {t(`fishing.${fish.rarity}`)}
                          </FishRarity>
                          <FishDifficulty>{fish.difficulty}</FishDifficulty>
                        </FishItem>
                      ))}
                    </FishList>
                  </HelpContent>
                </HelpSection>
              </ModalBody>
            </CozyModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowLeaderboard(false); }}
          >
            <CozyModal
              variants={motionVariants.modal}
            >
              <ModalHeader>
                <ModalTitle>
                  <FaTrophy style={{ color: '#c9a227', marginRight: '8px' }} />
                  {t('fishing.leaderboard')}
                </ModalTitle>
                <CloseButton onClick={() => setShowLeaderboard(false)}><MdClose /></CloseButton>
              </ModalHeader>
              <ModalBody>
                {rankData && (
                  <YourRankSection>
                    <RankBanner $canAutofish={rankData.canAutofish}>
                      <YourRankValue>#{rankData.rank}</YourRankValue>
                      <RankSubtext>/ {rankData.totalUsers} {t('fishing.topPlayers').toLowerCase()}</RankSubtext>
                    </RankBanner>
                    <AutofishUnlockStatus $unlocked={rankData.canAutofish}>
                      {rankData.canAutofish ? (
                        <><MdAutorenew style={{ color: '#558b2f' }} /><span>{t('fishing.autofishUnlocked')}</span></>
                      ) : (
                        <><span style={{ opacity: 0.6 }}>●</span><span>{t('fishing.autofishLocked', { rank: rankData.requiredRank })}</span></>
                      )}
                    </AutofishUnlockStatus>
                  </YourRankSection>
                )}
                
                <LeaderboardList>
                  {leaderboard.map((player) => (
                    <LeaderboardItem key={player.username} $isYou={rankData?.rank === player.rank} $rank={player.rank}>
                      <LeaderboardRank $rank={player.rank}>
                        {player.rank <= 3 ? <FaCrown style={{ color: player.rank === 1 ? '#c9a227' : player.rank === 2 ? '#a8a8a8' : '#b87333' }} /> : `#${player.rank}`}
                      </LeaderboardRank>
                      <LeaderboardName>{player.username}</LeaderboardName>
                      <LeaderboardPoints>
                        <CoinDot $small />
                        <span>{player.points.toLocaleString()}</span>
                      </LeaderboardPoints>
                      {player.hasAutofish && (
                        <AutofishBadge><MdAutorenew /></AutofishBadge>
                      )}
                    </LeaderboardItem>
                  ))}
                </LeaderboardList>
              </ModalBody>
            </CozyModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Trading Post Modal - Redesigned */}
      <AnimatePresence>
        {showTradingPost && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowTradingPost(false); }}
          >
            <TradingPostModal
              variants={motionVariants.modal}
            >
              <ShopHeader>
                <ShopTitleRow>
                  <ShopIcon>🏪</ShopIcon>
                  <ShopTitle>{t('fishing.tradingPost')}</ShopTitle>
                  <CloseButton onClick={() => setShowTradingPost(false)}><MdClose /></CloseButton>
                </ShopTitleRow>
                
                {/* Compact Wallet Display */}
                {tradingOptions && (
                  <WalletStrip>
                    <WalletItem>
                      <span>🎟️</span>
                      <WalletValue>{tradingOptions.tickets?.rollTickets || 0}</WalletValue>
                    </WalletItem>
                    <WalletDivider />
                    <WalletItem $highlight>
                      <span>🌟</span>
                      <WalletValue $highlight>{tradingOptions.tickets?.premiumTickets || 0}</WalletValue>
                    </WalletItem>
                  </WalletStrip>
                )}
                
                {/* Daily Limits Display */}
                {tradingOptions?.dailyLimits && (
                  <DailyLimitsStrip>
                    <DailyLimitItem 
                      $atLimit={tradingOptions.dailyLimits.rollTickets.remaining === 0}
                      title={t('fishing.dailyLimitInfo', { used: tradingOptions.dailyLimits.rollTickets.used, limit: tradingOptions.dailyLimits.rollTickets.limit }) || `Daily: ${tradingOptions.dailyLimits.rollTickets.used}/${tradingOptions.dailyLimits.rollTickets.limit}`}
                    >
                      <span>🎟️</span>
                      <DailyLimitText $atLimit={tradingOptions.dailyLimits.rollTickets.remaining === 0}>
                        {tradingOptions.dailyLimits.rollTickets.used}/{tradingOptions.dailyLimits.rollTickets.limit}
                      </DailyLimitText>
                      {tradingOptions.dailyLimits.rollTickets.remaining === 0 && <LimitReachedBadge>MAX</LimitReachedBadge>}
                    </DailyLimitItem>
                    <DailyLimitDivider />
                    <DailyLimitItem 
                      $atLimit={tradingOptions.dailyLimits.premiumTickets.remaining === 0}
                      title={t('fishing.dailyLimitInfo', { used: tradingOptions.dailyLimits.premiumTickets.used, limit: tradingOptions.dailyLimits.premiumTickets.limit }) || `Daily: ${tradingOptions.dailyLimits.premiumTickets.used}/${tradingOptions.dailyLimits.premiumTickets.limit}`}
                    >
                      <span>🌟</span>
                      <DailyLimitText $atLimit={tradingOptions.dailyLimits.premiumTickets.remaining === 0}>
                        {tradingOptions.dailyLimits.premiumTickets.used}/{tradingOptions.dailyLimits.premiumTickets.limit}
                      </DailyLimitText>
                      {tradingOptions.dailyLimits.premiumTickets.remaining === 0 && <LimitReachedBadge>MAX</LimitReachedBadge>}
                    </DailyLimitItem>
                  </DailyLimitsStrip>
                )}
              </ShopHeader>
              
              <ShopBody>
                {tradingLoading && !tradingOptions ? (
                  <TradingLoadingState>
                    <FaFish className="loading-fish" />
                    <span>{t('common.loading')}</span>
                  </TradingLoadingState>
                ) : tradingOptions ? (
                  <>
                    {/* Trade Success Animation */}
                    <AnimatePresence>
                      {tradeResult && (
                        <TradeSuccessOverlay
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <TradeSuccessIcon>✨</TradeSuccessIcon>
                          <TradeSuccessText>
                            {tradeResult.reward?.points && `+${tradeResult.reward.points} 🪙`}
                            {tradeResult.reward?.rollTickets && `+${tradeResult.reward.rollTickets} 🎟️`}
                            {tradeResult.reward?.premiumTickets && ` +${tradeResult.reward.premiumTickets} 🌟`}
                          </TradeSuccessText>
                        </TradeSuccessOverlay>
                      )}
                    </AnimatePresence>
                    
                    {/* Fish Inventory - Compact Horizontal Bar */}
                    <FishBar>
                      {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => (
                        <FishChip key={rarity} $color={getRarityColor(rarity)} $hasAny={(tradingOptions.totals[rarity] || 0) > 0}>
                          <FishChipEmoji>
                            {rarity === 'common' ? '🐟' : rarity === 'uncommon' ? '🐠' : rarity === 'rare' ? '🐡' : rarity === 'epic' ? '🦈' : '🐋'}
                          </FishChipEmoji>
                          <FishChipCount $color={getRarityColor(rarity)}>{tradingOptions.totals[rarity] || 0}</FishChipCount>
                        </FishChip>
                      ))}
                    </FishBar>
                    
                    {/* Available Trades Section */}
                    {(() => {
                      const availableTrades = tradingOptions.options.filter(o => o.canTrade);
                      const limitReachedTrades = tradingOptions.options.filter(o => !o.canTrade && o.limitReached);
                      const needMoreFishTrades = tradingOptions.options.filter(o => !o.canTrade && !o.limitReached);
                      
                      return (
                        <>
                          {/* Available Now - Priority Section */}
                          {availableTrades.length > 0 && (
                            <TradeSection>
                              <TradeSectionHeader $available>
                                <TradeSectionBadge $available>✓</TradeSectionBadge>
                                <TradeSectionTitle>{t('fishing.availableNow') || 'Available Now'}</TradeSectionTitle>
                                <TradeSectionCount>{availableTrades.length}</TradeSectionCount>
                              </TradeSectionHeader>
                              <TradeGrid>
                                {availableTrades.map(option => (
                                  <QuickTradeCard 
                                    key={option.id}
                                    $color={getRarityColor(option.requiredRarity)}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <TradeCardTop>
                                      <TradeGiveSection>
                                        <TradeLabel>{t('fishing.give') || 'Give'}</TradeLabel>
                                        <TradeGiveContent>
                                          <TradeGiveEmoji>
                                            {option.requiredRarity === 'common' ? '🐟' : 
                                             option.requiredRarity === 'uncommon' ? '🐠' : 
                                             option.requiredRarity === 'rare' ? '🐡' : 
                                             option.requiredRarity === 'epic' ? '🦈' : 
                                             option.requiredRarity === 'special' ? '🎣' : '🐋'}
                                          </TradeGiveEmoji>
                                          <TradeGiveAmount>×{option.requiredQuantity}</TradeGiveAmount>
                                        </TradeGiveContent>
                                      </TradeGiveSection>
                                      <TradeArrow>→</TradeArrow>
                                      <TradeGetSection>
                                        <TradeLabel>{t('fishing.get') || 'Get'}</TradeLabel>
                                        <TradeGetContent $type={option.rewardType}>
                                          <TradeGetEmoji>
                                            {option.rewardType === 'premiumTickets' ? '🌟' : 
                                             option.rewardType === 'rollTickets' ? '🎟️' : 
                                             option.rewardType === 'mixed' ? '🎁' : '🪙'}
                                          </TradeGetEmoji>
                                          <TradeGetAmount>
                                            {option.rewardType === 'mixed' 
                                              ? `${option.rewardAmount.rollTickets}+${option.rewardAmount.premiumTickets}`
                                              : `+${option.rewardAmount}`}
                                          </TradeGetAmount>
                                        </TradeGetContent>
                                      </TradeGetSection>
                                    </TradeCardTop>
                                    {/* Soft cap warning for points trades */}
                                    {option.rewardType === 'points' && 
                                     tradingOptions.dailyLimits?.pointsFromTrades?.used >= 10000 && (
                                      <SoftCapWarning title={t('fishing.softCapTooltip') || 'Daily soft cap reached - rewards reduced by 50%'}>
                                        ⚠️ {t('fishing.reducedRewards') || '-50% rewards'}
                                      </SoftCapWarning>
                                    )}
                                    {/* Near limit warning for ticket trades */}
                                    {option.rewardType === 'rollTickets' && 
                                     tradingOptions.dailyLimits?.rollTickets?.remaining > 0 &&
                                     tradingOptions.dailyLimits?.rollTickets?.remaining <= option.rewardAmount && (
                                      <NearLimitWarning>
                                        🎫 {t('fishing.lastTradeToday') || 'Last one today!'}
                                      </NearLimitWarning>
                                    )}
                                    {option.rewardType === 'premiumTickets' && 
                                     tradingOptions.dailyLimits?.premiumTickets?.remaining > 0 &&
                                     tradingOptions.dailyLimits?.premiumTickets?.remaining <= option.rewardAmount && (
                                      <NearLimitWarning>
                                        🌟 {t('fishing.lastTradeToday') || 'Last one today!'}
                                      </NearLimitWarning>
                                    )}
                                    {/* Collection trade bottleneck indicator */}
                                    {option.requiredRarity === 'collection' && option.bottleneck && (
                                      <BottleneckInfo $color={getRarityColor(option.bottleneck.rarity)}>
                                        {t('fishing.bottleneck') || 'Limiting:'} {option.bottleneck.quantity} {t(`fishing.${option.bottleneck.rarity}`)}
                                      </BottleneckInfo>
                                    )}
                                    <QuickTradeButton
                                      onClick={() => handleTrade(option.id)}
                                      disabled={tradingLoading}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      {tradingLoading ? '...' : t('fishing.trade')}
                                    </QuickTradeButton>
                                  </QuickTradeCard>
                                ))}
                              </TradeGrid>
                            </TradeSection>
                          )}
                          
                          {/* Daily Limit Reached - Separate Section */}
                          {limitReachedTrades.length > 0 && (
                            <TradeSection $limitReached>
                              <TradeSectionHeader $limitReached>
                                <TradeSectionBadge $limitReached>⏰</TradeSectionBadge>
                                <TradeSectionTitle>{t('fishing.dailyLimitReachedTitle') || 'Daily Limit Reached'}</TradeSectionTitle>
                                <TradeSectionCount>{limitReachedTrades.length}</TradeSectionCount>
                              </TradeSectionHeader>
                              <LimitReachedNote>{t('fishing.limitResetsAtMidnight') || 'Resets at midnight UTC'}</LimitReachedNote>
                              <LockedTradesList>
                                {limitReachedTrades.map(option => (
                                  <LockedTradeRow key={option.id} $limitReached>
                                    <LockedTradeInfo>
                                      <LockedTradeEmoji>
                                        {option.requiredRarity === 'common' ? '🐟' : 
                                         option.requiredRarity === 'uncommon' ? '🐠' : 
                                         option.requiredRarity === 'rare' ? '🐡' : 
                                         option.requiredRarity === 'epic' ? '🦈' : 
                                         option.requiredRarity === 'special' ? '🎣' : '🐋'}
                                      </LockedTradeEmoji>
                                      <LockedTradeText>
                                        <LockedTradeName>×{option.requiredQuantity} {t(`fishing.${option.requiredRarity}`)}</LockedTradeName>
                                      </LockedTradeText>
                                    </LockedTradeInfo>
                                    <LockedTradeReward $limitReached>
                                      <span>
                                        {option.rewardType === 'premiumTickets' ? '🌟' : 
                                         option.rewardType === 'rollTickets' ? '🎟️' : 
                                         option.rewardType === 'mixed' ? '🎁' : '🪙'}
                                      </span>
                                      <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>
                                        {option.rewardType === 'mixed' 
                                          ? `${option.rewardAmount.rollTickets}+${option.rewardAmount.premiumTickets}`
                                          : `+${option.rewardAmount}`}
                                      </span>
                                    </LockedTradeReward>
                                  </LockedTradeRow>
                                ))}
                              </LockedTradesList>
                            </TradeSection>
                          )}
                          
                          {/* Locked Trades - Progress Section */}
                          {needMoreFishTrades.length > 0 && (
                            <TradeSection $locked>
                              <TradeSectionHeader>
                                <TradeSectionBadge>🔒</TradeSectionBadge>
                                <TradeSectionTitle>{t('fishing.needMoreFish') || 'Need More Fish'}</TradeSectionTitle>
                                <TradeSectionCount>{needMoreFishTrades.length}</TradeSectionCount>
                              </TradeSectionHeader>
                              <LockedTradesList>
                                {needMoreFishTrades.map(option => {
                                  const progress = Math.min((option.currentQuantity / option.requiredQuantity) * 100, 100);
                                  return (
                                    <LockedTradeRow key={option.id}>
                                      <LockedTradeInfo>
                                        <LockedTradeEmoji>
                                          {option.requiredRarity === 'common' ? '🐟' : 
                                           option.requiredRarity === 'uncommon' ? '🐠' : 
                                           option.requiredRarity === 'rare' ? '🐡' : 
                                           option.requiredRarity === 'epic' ? '🦈' : 
                                           option.requiredRarity === 'special' ? '🎣' : '🐋'}
                                        </LockedTradeEmoji>
                                        <LockedTradeText>
                                          <LockedTradeName>{option.currentQuantity}/{option.requiredQuantity} {t(`fishing.${option.requiredRarity}`)}</LockedTradeName>
                                          <ProgressBarContainer>
                                            <ProgressBarFill $progress={progress} $color={getRarityColor(option.requiredRarity)} />
                                          </ProgressBarContainer>
                                        </LockedTradeText>
                                      </LockedTradeInfo>
                                      <LockedTradeReward>
                                        <span>
                                          {option.rewardType === 'premiumTickets' ? '🌟' : 
                                           option.rewardType === 'rollTickets' ? '🎟️' : 
                                           option.rewardType === 'mixed' ? '🎁' : '🪙'}
                                        </span>
                                        <span>
                                          {option.rewardType === 'mixed' 
                                            ? `${option.rewardAmount.rollTickets}+${option.rewardAmount.premiumTickets}`
                                            : `+${option.rewardAmount}`}
                                        </span>
                                      </LockedTradeReward>
                                    </LockedTradeRow>
                                  );
                                })}
                              </LockedTradesList>
                            </TradeSection>
                          )}
                          
                          {/* Empty State */}
                          {availableTrades.length === 0 && limitReachedTrades.length === 0 && needMoreFishTrades.length === 0 && (
                            <EmptyTradeState>
                              <span>🎣</span>
                              <p>{t('fishing.catchFishToTrade')}</p>
                            </EmptyTradeState>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <TradingLoadingState>
                    <span>{t('fishing.noFish')}</span>
                    <span style={{ fontSize: '14px', opacity: 0.7 }}>{t('fishing.catchFishToTrade')}</span>
                  </TradingLoadingState>
                )}
              </ShopBody>
            </TradingPostModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Daily Challenges Modal */}
      <AnimatePresence>
        {showChallenges && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowChallenges(false); }}
          >
            <CozyModal variants={motionVariants.modal}>
              <ModalHeader>
                <ModalTitle>
                  <MdEmojiEvents style={{ color: '#ffc107', marginRight: '8px' }} />
                  {t('fishing.dailyChallenges') || 'Daily Challenges'}
                </ModalTitle>
                <CloseButton onClick={() => setShowChallenges(false)}><MdClose /></CloseButton>
              </ModalHeader>
              <ModalBody>
                {challengesLoading ? (
                  <TradingLoadingState>
                    <FaFish className="loading-fish" />
                    <span>{t('common.loading')}</span>
                  </TradingLoadingState>
                ) : challenges ? (
                  <ChallengesList>
                    {challenges.challenges.map(challenge => (
                      <ChallengeCard 
                        key={challenge.id} 
                        $completed={challenge.completed}
                        $difficulty={challenge.difficulty}
                      >
                        <ChallengeHeader>
                          <ChallengeName>{t(`fishing.challengeNames.${challenge.id}`) || challenge.name}</ChallengeName>
                          <DifficultyBadge $difficulty={challenge.difficulty}>
                            {t(`fishing.difficulty.${challenge.difficulty}`) || challenge.difficulty}
                          </DifficultyBadge>
                        </ChallengeHeader>
                        <ChallengeDescription>{t(`fishing.challengeDescriptions.${challenge.id}`) || challenge.description}</ChallengeDescription>
                        <ChallengeProgress>
                          <ProgressBarContainer>
                            <ProgressBarFill 
                              $progress={Math.min(100, (challenge.progress / challenge.target) * 100)} 
                              $color={challenge.completed ? '#4caf50' : '#ffc107'}
                            />
                          </ProgressBarContainer>
                          <ProgressText>{challenge.progress}/{challenge.target}</ProgressText>
                        </ChallengeProgress>
                        <ChallengeReward>
                          {challenge.reward.points && <span>🪙 {challenge.reward.points}</span>}
                          {challenge.reward.rollTickets && <span>🎟️ {challenge.reward.rollTickets}</span>}
                          {challenge.reward.premiumTickets && <span>🌟 {challenge.reward.premiumTickets}</span>}
                        </ChallengeReward>
                        {challenge.progress >= challenge.target && !challenge.completed && (
                          <ClaimButton 
                            onClick={() => handleClaimChallenge(challenge.id)}
                            disabled={claimingChallenges[challenge.id]}
                          >
                            {claimingChallenges[challenge.id] ? (
                              <><MdAutorenew className="spinning" /> {t('common.claiming') || 'Claiming...'}</>
                            ) : (
                              <><MdCheckCircle /> {t('fishing.claim') || 'Claim'}</>
                            )}
                          </ClaimButton>
                        )}
                        {challenge.completed && (
                          <CompletedBadge>
                            <MdCheckCircle /> {t('fishing.completed') || 'Completed'}
                          </CompletedBadge>
                        )}
                      </ChallengeCard>
                    ))}
                  </ChallengesList>
                ) : (
                  <TradingLoadingState>
                    <span>{t('fishing.noChallenges') || 'No challenges available'}</span>
                  </TradingLoadingState>
                )}
              </ModalBody>
            </CozyModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Equipment Modal (Areas & Rods) */}
      <AnimatePresence>
        {showEquipment && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowEquipment(false); }}
          >
            <CozyModal variants={motionVariants.modal}>
              <ModalHeader>
                <ModalTitle>
                  <MdSettings style={{ marginRight: '8px' }} />
                  {t('fishing.equipment') || 'Equipment'}
                </ModalTitle>
                <CloseButton onClick={() => setShowEquipment(false)}><MdClose /></CloseButton>
              </ModalHeader>
              <ModalBody>
                {/* Tab Selector */}
                <EquipmentTabs>
                  <EquipmentTab 
                    $active={equipmentTab === 'areas'} 
                    onClick={() => setEquipmentTab('areas')}
                  >
                    🏞️ {t('fishing.areas') || 'Areas'}
                  </EquipmentTab>
                  <EquipmentTab 
                    $active={equipmentTab === 'rods'} 
                    onClick={() => setEquipmentTab('rods')}
                  >
                    🎣 {t('fishing.rods') || 'Rods'}
                  </EquipmentTab>
                </EquipmentTabs>
                
                {/* Areas Tab */}
                {equipmentTab === 'areas' && areas && (
                  <EquipmentList>
                    {areas.areas.map(area => (
                      <EquipmentCard 
                        key={area.id}
                        $unlocked={area.unlocked}
                        $current={area.current}
                      >
                        <EquipmentIcon>{area.emoji}</EquipmentIcon>
                        <EquipmentInfo>
                          <EquipmentName>{area.name}</EquipmentName>
                          <EquipmentDesc>{area.description}</EquipmentDesc>
                          {area.rarityBonus > 0 && (
                            <EquipmentBonus>+{Math.round(area.rarityBonus * 100)}% {t('fishing.rareChance') || 'rare chance'}</EquipmentBonus>
                          )}
                        </EquipmentInfo>
                        {area.current ? (
                          <CurrentBadge>{t('fishing.current') || 'Current'}</CurrentBadge>
                        ) : area.unlocked ? (
                          <SelectButton 
                            onClick={() => handleSelectArea(area.id)}
                            disabled={equipmentActionLoading}
                          >
                            {equipmentActionLoading ? '...' : (t('fishing.select') || 'Select')}
                          </SelectButton>
                        ) : (
                          <UnlockButton
                            onClick={() => handleUnlockArea(area.id)}
                            disabled={equipmentActionLoading || !area.canUnlock}
                            $canAfford={user?.points >= area.unlockCost}
                          >
                            <span>🪙 {area.unlockCost.toLocaleString()}</span>
                            {area.unlockRank && <span style={{ fontSize: '10px', opacity: 0.8 }}>{t('fishing.rankRequired', { rank: area.unlockRank })}</span>}
                          </UnlockButton>
                        )}
                      </EquipmentCard>
                    ))}
                  </EquipmentList>
                )}
                
                {/* Rods Tab */}
                {equipmentTab === 'rods' && rods && (
                  <EquipmentList>
                    {rods.rods.map(rod => (
                      <EquipmentCard 
                        key={rod.id}
                        $unlocked={rod.owned}
                        $current={rod.equipped}
                        $locked={rod.locked}
                      >
                        <EquipmentIcon>{rod.emoji}</EquipmentIcon>
                        <EquipmentInfo>
                          <EquipmentName>{rod.name}</EquipmentName>
                          <EquipmentDesc>{rod.description}</EquipmentDesc>
                          <RodBonuses>
                            {rod.timingBonus > 0 && <span>⏱️ +{rod.timingBonus}ms</span>}
                            {rod.rarityBonus > 0 && <span>✨ +{Math.round(rod.rarityBonus * 100)}%</span>}
                            {rod.perfectBonus > 0 && <span>⭐ +{Math.round(rod.perfectBonus * 100)}%</span>}
                          </RodBonuses>
                        </EquipmentInfo>
                        {rod.equipped ? (
                          <CurrentBadge>{t('fishing.equipped') || 'Equipped'}</CurrentBadge>
                        ) : rod.owned ? (
                          <SelectButton 
                            onClick={() => handleEquipRod(rod.id)}
                            disabled={equipmentActionLoading}
                          >
                            {equipmentActionLoading ? '...' : (t('fishing.equip') || 'Equip')}
                          </SelectButton>
                        ) : rod.locked ? (
                          <LockedBadge>🔒 {t('fishing.prestigeRequired', { level: rod.requiresPrestige })}</LockedBadge>
                        ) : (
                          <BuyButton 
                            onClick={() => handleBuyRod(rod.id)}
                            disabled={equipmentActionLoading || !rod.canBuy}
                          >
                            {equipmentActionLoading ? '...' : `🪙 ${rod.cost.toLocaleString()}`}
                          </BuyButton>
                        )}
                      </EquipmentCard>
                    ))}
                  </EquipmentList>
                )}
              </ModalBody>
            </CozyModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
      
      {/* Prestige Modal */}
      <AnimatePresence>
        {showPrestigeModal && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPrestigeModal(false); }}
          >
            <CozyModal variants={motionVariants.modal}>
              <ModalHeader>
                <ModalTitle>
                  <span style={{ marginRight: '8px' }}>{prestigeData?.currentEmoji || '🎣'}</span>
                  {t('fishing.prestige') || 'Prestige'}
                </ModalTitle>
                <CloseButton onClick={() => setShowPrestigeModal(false)}><MdClose /></CloseButton>
              </ModalHeader>
              <ModalBody>
                {prestigeData ? (
                  <>
                    {/* Current Level Display */}
                    <PrestigeCurrentLevel $level={prestigeData.currentLevel}>
                      <PrestigeLevelEmoji>{prestigeData.currentEmoji || '🎣'}</PrestigeLevelEmoji>
                      <PrestigeLevelInfo>
                        <PrestigeLevelTitle>{prestigeData.currentName || t('fishing.noviceAngler')}</PrestigeLevelTitle>
                        <PrestigeLevelSubtitle>
                          {prestigeData.currentLevel > 0 
                            ? t('fishing.prestigeLevel', { level: prestigeData.currentLevel, max: 5 }) || `Prestige Level ${prestigeData.currentLevel} of 5`
                            : t('fishing.notPrestigedYet') || 'Not prestiged yet'}
                        </PrestigeLevelSubtitle>
                      </PrestigeLevelInfo>
                    </PrestigeCurrentLevel>
                    
                    {/* Active Bonuses */}
                    {prestigeData.currentLevel > 0 && prestigeData.currentBonuses && (
                      <PrestigeBonusSection>
                        <PrestigeSectionTitle>{t('fishing.activeBonuses') || 'Active Bonuses'}</PrestigeSectionTitle>
                        <PrestigeBonusList>
                          {prestigeData.currentBonuses.timingBonus > 0 && (
                            <PrestigeBonusItem>
                              <span>⏱️</span>
                              <span>+{prestigeData.currentBonuses.timingBonus}ms {t('fishing.timingWindow') || 'timing window'}</span>
                            </PrestigeBonusItem>
                          )}
                          {prestigeData.currentBonuses.rarityBonus > 0 && (
                            <PrestigeBonusItem>
                              <span>✨</span>
                              <span>+{Math.round(prestigeData.currentBonuses.rarityBonus * 100)}% {t('fishing.rareChance') || 'rare fish chance'}</span>
                            </PrestigeBonusItem>
                          )}
                          {prestigeData.currentBonuses.autofishLimit > 0 && (
                            <PrestigeBonusItem>
                              <span>🔄</span>
                              <span>+{prestigeData.currentBonuses.autofishLimit} {t('fishing.dailyAutofish') || 'daily autofish'}</span>
                            </PrestigeBonusItem>
                          )}
                          {prestigeData.currentBonuses.premiumTicketBonus > 0 && (
                            <PrestigeBonusItem>
                              <span>🌟</span>
                              <span>+{prestigeData.currentBonuses.premiumTicketBonus} {t('fishing.dailyPremiumTickets') || 'daily premium tickets'}</span>
                            </PrestigeBonusItem>
                          )}
                          {prestigeData.currentBonuses.autofishPerfectChance > 0 && (
                            <PrestigeBonusItem>
                              <span>⭐</span>
                              <span>{Math.round(prestigeData.currentBonuses.autofishPerfectChance * 100)}% {t('fishing.autofishPerfect') || 'autofish perfect chance'}</span>
                            </PrestigeBonusItem>
                          )}
                          {prestigeData.currentBonuses.pityReduction > 0 && (
                            <PrestigeBonusItem>
                              <span>🐋</span>
                              <span>{Math.round(prestigeData.currentBonuses.pityReduction * 100)}% {t('fishing.fasterPity') || 'faster pity buildup'}</span>
                            </PrestigeBonusItem>
                          )}
                        </PrestigeBonusList>
                      </PrestigeBonusSection>
                    )}
                    
                    {/* Next Level Progress */}
                    {!prestigeData.progress?.maxPrestige && prestigeData.progress?.nextLevelInfo && (
                      <PrestigeProgressSection>
                        <PrestigeSectionTitle>
                          {t('fishing.nextLevel') || 'Next Level'}: {prestigeData.progress.nextLevelInfo.emoji} {prestigeData.progress.nextLevelInfo.name}
                        </PrestigeSectionTitle>
                        <PrestigeDescription>{prestigeData.progress.nextLevelInfo.description}</PrestigeDescription>
                        
                        {/* Overall Progress Bar */}
                        <PrestigeOverallProgress>
                          <PrestigeProgressBarWrapper>
                            <PrestigeProgressFill $percent={prestigeData.progress.overallProgress || 0} />
                          </PrestigeProgressBarWrapper>
                          <PrestigeProgressPercent>{prestigeData.progress.overallProgress || 0}%</PrestigeProgressPercent>
                        </PrestigeOverallProgress>
                        
                        {/* Detailed Requirements */}
                        <PrestigeRequirementsList>
                          {prestigeData.progress.progress?.catches && (
                            <PrestigeRequirementItem $complete={prestigeData.progress.progress.catches.percent >= 100}>
                              <PrestigeReqIcon>{prestigeData.progress.progress.catches.percent >= 100 ? '✓' : '🐟'}</PrestigeReqIcon>
                              <PrestigeReqContent>
                                <PrestigeReqLabel>{t('fishing.totalCatches') || 'Total Catches'}</PrestigeReqLabel>
                                <PrestigeReqBar>
                                  <PrestigeReqFill $percent={prestigeData.progress.progress.catches.percent} />
                                </PrestigeReqBar>
                                <PrestigeReqValue>
                                  {prestigeData.progress.progress.catches.current.toLocaleString()} / {prestigeData.progress.progress.catches.required.toLocaleString()}
                                </PrestigeReqValue>
                              </PrestigeReqContent>
                            </PrestigeRequirementItem>
                          )}
                          {prestigeData.progress.progress?.legendaries && (
                            <PrestigeRequirementItem $complete={prestigeData.progress.progress.legendaries.percent >= 100}>
                              <PrestigeReqIcon>{prestigeData.progress.progress.legendaries.percent >= 100 ? '✓' : '🐋'}</PrestigeReqIcon>
                              <PrestigeReqContent>
                                <PrestigeReqLabel>{t('fishing.legendaryCatches') || 'Legendary Catches'}</PrestigeReqLabel>
                                <PrestigeReqBar>
                                  <PrestigeReqFill $percent={prestigeData.progress.progress.legendaries.percent} />
                                </PrestigeReqBar>
                                <PrestigeReqValue>
                                  {prestigeData.progress.progress.legendaries.current} / {prestigeData.progress.progress.legendaries.required}
                                </PrestigeReqValue>
                              </PrestigeReqContent>
                            </PrestigeRequirementItem>
                          )}
                          {prestigeData.progress.progress?.perfects && (
                            <PrestigeRequirementItem $complete={prestigeData.progress.progress.perfects.percent >= 100}>
                              <PrestigeReqIcon>{prestigeData.progress.progress.perfects.percent >= 100 ? '✓' : '⭐'}</PrestigeReqIcon>
                              <PrestigeReqContent>
                                <PrestigeReqLabel>{t('fishing.perfectCatches') || 'Perfect Catches'}</PrestigeReqLabel>
                                <PrestigeReqBar>
                                  <PrestigeReqFill $percent={prestigeData.progress.progress.perfects.percent} />
                                </PrestigeReqBar>
                                <PrestigeReqValue>
                                  {prestigeData.progress.progress.perfects.current} / {prestigeData.progress.progress.perfects.required}
                                </PrestigeReqValue>
                              </PrestigeReqContent>
                            </PrestigeRequirementItem>
                          )}
                          {prestigeData.progress.progress?.streak && (
                            <PrestigeRequirementItem $complete={prestigeData.progress.progress.streak.percent >= 100}>
                              <PrestigeReqIcon>{prestigeData.progress.progress.streak.percent >= 100 ? '✓' : '🔥'}</PrestigeReqIcon>
                              <PrestigeReqContent>
                                <PrestigeReqLabel>{t('fishing.longestStreak') || 'Longest Streak'}</PrestigeReqLabel>
                                <PrestigeReqBar>
                                  <PrestigeReqFill $percent={prestigeData.progress.progress.streak.percent} />
                                </PrestigeReqBar>
                                <PrestigeReqValue>
                                  {prestigeData.progress.progress.streak.current} / {prestigeData.progress.progress.streak.required}
                                </PrestigeReqValue>
                              </PrestigeReqContent>
                            </PrestigeRequirementItem>
                          )}
                          {prestigeData.progress.progress?.challenges && (
                            <PrestigeRequirementItem $complete={prestigeData.progress.progress.challenges.percent >= 100}>
                              <PrestigeReqIcon>{prestigeData.progress.progress.challenges.percent >= 100 ? '✓' : '🏆'}</PrestigeReqIcon>
                              <PrestigeReqContent>
                                <PrestigeReqLabel>{t('fishing.challengesCompleted') || 'Challenges Completed'}</PrestigeReqLabel>
                                <PrestigeReqBar>
                                  <PrestigeReqFill $percent={prestigeData.progress.progress.challenges.percent} />
                                </PrestigeReqBar>
                                <PrestigeReqValue>
                                  {prestigeData.progress.progress.challenges.current} / {prestigeData.progress.progress.challenges.required}
                                </PrestigeReqValue>
                              </PrestigeReqContent>
                            </PrestigeRequirementItem>
                          )}
                        </PrestigeRequirementsList>
                        
                        {/* Claim Button */}
                        {prestigeData.canPrestige && (
                          <PrestigeClaimButton
                            onClick={async () => {
                              setClaimingPrestige(true);
                              try {
                                // Use centralized action helper for consistent cache invalidation
                                const result = await claimPrestige();
                                setPrestigeData(prev => ({
                                  ...prev,
                                  currentLevel: result.newLevel,
                                  currentName: result.levelName,
                                  currentEmoji: result.levelEmoji,
                                  currentBonuses: result.newBonuses,
                                  canPrestige: false
                                }));
                                showNotification(result.message, 'success');
                                // Refresh full prestige data (cache already invalidated by helper)
                                const freshData = await getFishingPrestige();
                                setPrestigeData(freshData);
                                // Refresh user for updated points
                                await refreshUser();
                              } catch (err) {
                                showNotification(err.response?.data?.message || t('fishing.errors.claimFailed'), 'error');
                              } finally {
                                setClaimingPrestige(false);
                              }
                            }}
                            disabled={claimingPrestige}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {claimingPrestige ? '...' : (t('fishing.claimPrestige') || '🎉 Claim Prestige!')}
                          </PrestigeClaimButton>
                        )}
                      </PrestigeProgressSection>
                    )}
                    
                    {/* Max Prestige Message */}
                    {prestigeData.progress?.maxPrestige && (
                      <PrestigeMaxLevel>
                        <PrestigeMaxIcon>🌟</PrestigeMaxIcon>
                        <PrestigeMaxText>{t('fishing.maxPrestige') || 'Maximum Prestige Achieved!'}</PrestigeMaxText>
                        <PrestigeMaxSubtext>{t('fishing.maxPrestigeDesc') || 'You have mastered the art of fishing.'}</PrestigeMaxSubtext>
                      </PrestigeMaxLevel>
                    )}
                    
                    {/* All Levels Overview */}
                    {prestigeData.allLevels && (
                      <PrestigeLevelsOverview>
                        <PrestigeSectionTitle>{t('fishing.allLevels') || 'All Prestige Levels'}</PrestigeSectionTitle>
                        <PrestigeLevelsList>
                          {prestigeData.allLevels.map(level => (
                            <PrestigeLevelCard 
                              key={level.level} 
                              $unlocked={level.unlocked} 
                              $current={level.current}
                            >
                              <PrestigeLevelCardEmoji>{level.emoji}</PrestigeLevelCardEmoji>
                              <PrestigeLevelCardInfo>
                                <PrestigeLevelCardName $unlocked={level.unlocked}>{level.name}</PrestigeLevelCardName>
                                {level.current && <PrestigeLevelCardBadge>{t('fishing.current') || 'Current'}</PrestigeLevelCardBadge>}
                              </PrestigeLevelCardInfo>
                              {level.unlocked && !level.current && <PrestigeLevelCardCheck>✓</PrestigeLevelCardCheck>}
                              {!level.unlocked && <PrestigeLevelCardLock>🔒</PrestigeLevelCardLock>}
                            </PrestigeLevelCard>
                          ))}
                        </PrestigeLevelsList>
                      </PrestigeLevelsOverview>
                    )}
                  </>
                ) : (
                  <TradingLoadingState>
                    <FaFish className="loading-fish" />
                    <span>{t('common.loading')}</span>
                  </TradingLoadingState>
                )}
              </ModalBody>
            </CozyModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};


export default FishingPage;
