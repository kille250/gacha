import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowBack, MdHelpOutline, MdClose, MdKeyboardArrowUp, MdKeyboardArrowDown, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdLeaderboard, MdAutorenew, MdPeople, MdStorefront, MdEmojiEvents, MdSettings, MdCheckCircle } from 'react-icons/md';
import { FaFish, FaCrown, FaTrophy } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { io } from 'socket.io-client';
import api, { 
  clearCache, 
  WS_URL, 
  getTradingPostOptions, 
  executeTrade,
  getFishingChallenges,
  claimFishingChallenge,
  getFishingAreas,
  selectFishingArea,
  getFishingRods,
  buyFishingRod
} from '../utils/api';
import { getToken, getUserIdFromToken } from '../utils/authStorage';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { theme, ModalOverlay, ModalContent, ModalHeader, ModalBody, IconButton, motionVariants } from '../styles/DesignSystem';
import { useFishingEngine, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../components/Fishing/FishingEngine';

// Game configuration
// Note: Backend has 4s cooldown, frontend uses slightly higher to account for latency
const AUTOFISH_INTERVAL = 4500;

const GAME_STATES = {
  WALKING: 'walking',
  CASTING: 'casting',
  WAITING: 'waiting',
  FISH_APPEARED: 'fish_appeared',
  CATCHING: 'catching',
  SUCCESS: 'success',
  FAILURE: 'failure'
};

const DIRECTIONS = {
  DOWN: 'down',
  UP: 'up',
  LEFT: 'left',
  RIGHT: 'right'
};

const TIME_PERIODS = {
  DAWN: 'dawn',
  DAY: 'day',
  DUSK: 'dusk',
  NIGHT: 'night'
};

// RARITY_COLORS is now dynamically provided by useRarity() hook

// Rarity ranking for comparing fish (higher = better)
const RARITY_RANK = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5
};

// Helper to check if new fish is better than current best
const isBetterFish = (newFish, currentBest) => {
  if (!currentBest) return true;
  return (RARITY_RANK[newFish.rarity] || 0) > (RARITY_RANK[currentBest.fish?.rarity] || 0);
};

// RARITY_GLOW is now dynamically provided by useRarity() hook - getRarityGlow(rarity)

const FishingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();
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
  
  // Session stats
  const [sessionStats, setSessionStats] = useState({
    casts: 0,
    catches: 0,
    bestCatch: null
  });
  
  // Ranking and autofishing
  const [rankData, setRankData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isAutofishing, setIsAutofishing] = useState(false);
  const [autofishLog, setAutofishLog] = useState([]);
  const autofishIntervalRef = useRef(null);
  
  // Trading post state
  const [showTradingPost, setShowTradingPost] = useState(false);
  const [tradingOptions, setTradingOptions] = useState(null);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [tradeResult, setTradeResult] = useState(null);
  
  // NEW: Daily challenges state
  const [showChallenges, setShowChallenges] = useState(false);
  const [challenges, setChallenges] = useState(null);
  const [challengesLoading, setChallengesLoading] = useState(false);
  
  // NEW: Areas & Rods state
  const [showEquipment, setShowEquipment] = useState(false);
  const [areas, setAreas] = useState(null);
  const [rods, setRods] = useState(null);
  const [equipmentTab, setEquipmentTab] = useState('areas'); // 'areas' or 'rods'
  
  // NEW: Daily autofish limits
  const [dailyStats, setDailyStats] = useState(null);
  
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
    });
    
    socket.on('connect_error', (err) => {
      console.log('[Multiplayer] Connection error:', err.message);
      setIsMultiplayerConnected(false);
    });
    
    // Handle duplicate session (same user connected in another tab)
    socket.on('duplicate_session', (data) => {
      console.log('[Multiplayer] Duplicate session detected:', data.message);
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
  
  // Derived state: player count is other players + self
  const playerCount = otherPlayers.length + 1;
  
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
  
  // Fetch fish info and rank on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fishRes, rankRes] = await Promise.all([
          api.get('/fishing/info'),
          api.get('/fishing/rank')
        ]);
        setFishInfo(fishRes.data);
        setRankData(rankRes.data);
        
        // Set initial daily stats from rank response
        if (rankRes.data.autofish) {
          setDailyStats({
            used: rankRes.data.autofish.used,
            limit: rankRes.data.autofish.dailyLimit,
            remaining: rankRes.data.autofish.remaining
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
  
  // Leaderboard fetch - also refresh rank data to keep it in sync
  useEffect(() => {
    if (showLeaderboard) {
      Promise.all([
        api.get('/fishing/leaderboard'),
        api.get('/fishing/rank')
      ])
        .then(([leaderboardRes, rankRes]) => {
          setLeaderboard(leaderboardRes.data.leaderboard);
          setRankData(rankRes.data);
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
  
  // Equipment (Areas & Rods) fetch
  useEffect(() => {
    if (showEquipment) {
      Promise.all([getFishingAreas(), getFishingRods()])
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
  
  // Handle trade execution
  const handleTrade = useCallback(async (tradeId) => {
    try {
      setTradingLoading(true);
      const result = await executeTrade(tradeId, 1);
      setTradeResult(result);
      
      // Update user points
      if (result.newPoints !== undefined) {
        setUser(prev => ({ ...prev, points: result.newPoints }));
        clearCache('/auth/me');
      }
      
      // Refresh trading options (includes new ticket counts)
      const newOptions = await getTradingPostOptions();
      setTradingOptions(newOptions);
      
      showNotification(result.message, 'success');
      setTradingLoading(false);
      
      // Clear result after animation
      setTimeout(() => setTradeResult(null), theme.timing.tradeResultDismiss);
    } catch (err) {
      showNotification(err.response?.data?.message || t('fishing.tradeFailed'), 'error');
      setTradingLoading(false);
    }
  }, [setUser, t, showNotification]);
  
  // Autofishing loop with integrated cleanup (now with daily limits)
  useEffect(() => {
    // NEW: Everyone can autofish now (canAutofish is always true)
    if (!isAutofishing) {
      return;
    }
    
    // Single interval for autofishing
    autofishIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.post('/fishing/autofish');
        const result = res.data;
        
        if (result.newPoints !== undefined) {
          setUser(prev => ({ ...prev, points: result.newPoints }));
          clearCache('/auth/me');
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
          // Keep only entries less than 4 seconds old, limit to 6
          return [newEntry, ...prev.filter(e => now - e.timestamp < 4000)].slice(0, 6);
        });
        
        // Show challenge completion notifications
        if (result.challengesCompleted?.length > 0) {
          result.challengesCompleted.forEach(ch => {
            showNotification(`🏆 ${t('fishing.challengeComplete')}: ${ch.id}`, 'success');
          });
        }
        
      } catch (err) {
        if (err.response?.status === 429 && err.response?.data?.error === 'Daily limit reached') {
          setIsAutofishing(false);
          showNotification(err.response.data.message || t('fishing.dailyLimitReached'), 'info');
        } else if (err.response?.status === 403) {
          setIsAutofishing(false);
          showNotification(t('fishing.autofishError'), 'error');
        }
      }
    }, AUTOFISH_INTERVAL);
    
    return () => {
      if (autofishIntervalRef.current) {
        clearInterval(autofishIntervalRef.current);
        autofishIntervalRef.current = null;
      }
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
  const handleMiss = useCallback(async (sid) => {
    try {
      const res = await api.post('/fishing/catch', { sessionId: sid });
      setLastResult(res.data);
      setGameState(GAME_STATES.FAILURE);
      
      setTimeout(() => {
        setGameState(GAME_STATES.WALKING);
        setSessionId(null);
      }, 2000);
    } catch (err) {
      setGameState(GAME_STATES.WALKING);
      setSessionId(null);
    }
  }, []);
  
  // Start fishing
  const startFishing = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.WALKING || !canFishRef.current) return;
    
    setLastResult(null);
    setGameState(GAME_STATES.CASTING);
    
    try {
      const res = await api.post('/fishing/cast');
      const { sessionId: newSessionId, waitTime, missTimeout = 2500 } = res.data;
      
      setSessionId(newSessionId);
      setSessionStats(prev => ({ ...prev, casts: prev.casts + 1 }));
      
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
  }, [t, showNotification, handleMiss]);
  
  // Handle catching fish
  const handleCatch = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.FISH_APPEARED || !sessionId) return;
    
    if (missTimeoutRef.current) {
      clearTimeout(missTimeoutRef.current);
    }
    
    const reactionTime = Date.now() - fishAppearedTime.current;
    setGameState(GAME_STATES.CATCHING);
    
    try {
      const res = await api.post('/fishing/catch', { sessionId, reactionTime });
      const result = res.data;
      
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
  }, [sessionId, t, showNotification]);
  
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
  
  // Handle challenge claim
  const handleClaimChallenge = useCallback(async (challengeId) => {
    try {
      const result = await claimFishingChallenge(challengeId);
      showNotification(result.message, 'success');
      
      // Update user points/tickets
      if (result.rewards?.points) {
        setUser(prev => ({ ...prev, points: (prev.points || 0) + result.rewards.points }));
      }
      if (result.rewards?.rollTickets) {
        setUser(prev => ({ ...prev, rollTickets: (prev.rollTickets || 0) + result.rewards.rollTickets }));
      }
      if (result.rewards?.premiumTickets) {
        setUser(prev => ({ ...prev, premiumTickets: (prev.premiumTickets || 0) + result.rewards.premiumTickets }));
      }
      
      // Refresh challenges
      const updatedChallenges = await getFishingChallenges();
      setChallenges(updatedChallenges);
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to claim challenge', 'error');
    }
  }, [setUser, showNotification]);
  
  // Handle area selection
  const handleSelectArea = useCallback(async (areaId) => {
    try {
      await selectFishingArea(areaId);
      // Refresh areas and fish info
      const [areasData, fishRes] = await Promise.all([
        getFishingAreas(),
        api.get('/fishing/info')
      ]);
      setAreas(areasData);
      setFishInfo(fishRes.data);
      showNotification(`Switched to ${areasData.areas.find(a => a.id === areaId)?.name}!`, 'success');
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to switch area', 'error');
    }
  }, [showNotification]);
  
  // Handle rod purchase
  const handleBuyRod = useCallback(async (rodId) => {
    try {
      const result = await buyFishingRod(rodId);
      setUser(prev => ({ ...prev, points: result.newPoints }));
      showNotification(result.message, 'success');
      
      // Refresh rods and fish info
      const [rodsData, fishRes] = await Promise.all([
        getFishingRods(),
        api.get('/fishing/info')
      ]);
      setRods(rodsData);
      setFishInfo(fishRes.data);
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to buy rod', 'error');
    }
  }, [setUser, showNotification]);
  
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
      
      {/* Header - Rustic wooden style */}
      <Header>
        <HeaderWoodGrain />
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack />
        </BackButton>
        <HeaderRight>
          {/* Multiplayer indicator */}
          <MultiplayerBadge $connected={isMultiplayerConnected}>
            <MdPeople />
            <span>{playerCount}</span>
          </MultiplayerBadge>
          {rankData && (
            <RankBadge onClick={() => setShowLeaderboard(true)} $canAutofish={rankData.canAutofish}>
              <FaCrown style={{ color: rankData.canAutofish ? '#ffd54f' : '#a1887f' }} />
              <span>#{rankData.rank}</span>
            </RankBadge>
          )}
          <PointsDisplay>
            <CoinDot />
            <span>{user?.points?.toLocaleString() || 0}</span>
          </PointsDisplay>
          {/* Autofish button - now available to everyone */}
          <AutofishButton onClick={toggleAutofish} $active={isAutofishing} title={dailyStats ? `${dailyStats.remaining}/${dailyStats.limit} remaining` : ''}>
            <MdAutorenew className={isAutofishing ? 'spinning' : ''} />
            {dailyStats && (
              <AutofishCounter $warning={dailyStats.remaining < 20}>
                {dailyStats.remaining}
              </AutofishCounter>
            )}
          </AutofishButton>
          {/* Challenges button */}
          <ChallengesButton onClick={() => setShowChallenges(true)} $hasCompleted={challenges?.challenges?.some(c => c.progress >= c.target && !c.completed)}>
            <MdEmojiEvents />
          </ChallengesButton>
          {/* Equipment button (Areas & Rods) */}
          <WoodButton onClick={() => setShowEquipment(true)} title={t('fishing.equipment')}>
            <MdSettings />
          </WoodButton>
          <WoodButton onClick={() => setShowLeaderboard(true)}>
            <MdLeaderboard />
          </WoodButton>
          <TradingPostButton onClick={() => setShowTradingPost(true)}>
            <MdStorefront />
          </TradingPostButton>
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
      
      {/* Stats Bar */}
      <StatsBar>
        <StatItem>
          <StatValue>{sessionStats.casts}</StatValue>
          <StatLabel>{t('fishing.casts')}</StatLabel>
        </StatItem>
        <StatDivider />
        <StatItem>
          <StatValue>{sessionStats.catches}</StatValue>
          <StatLabel>{t('fishing.catches')}</StatLabel>
        </StatItem>
        {sessionStats.bestCatch && (
          <>
            <StatDivider />
            <StatItem $highlight>
              <StatValue style={{ color: getRarityColor(sessionStats.bestCatch.fish.rarity) }}>
                {sessionStats.bestCatch.fish.emoji}
              </StatValue>
              <StatLabel>{t('fishing.best')}</StatLabel>
            </StatItem>
          </>
        )}
        {/* Pity Progress Indicator */}
        {fishInfo?.pity && (
          <>
            <StatDivider />
            <StatItem title={`${fishInfo.pity.legendary.current}/${fishInfo.pity.legendary.hardPity} casts`}>
              <PityBar>
                <PityFill 
                  $progress={fishInfo.pity.legendary.progress} 
                  $inSoftPity={fishInfo.pity.legendary.inSoftPity}
                  $color="#ffc107"
                />
              </PityBar>
              <StatLabel>🐋 Pity</StatLabel>
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
                            {fish.rarity.charAt(0).toUpperCase() + fish.rarity.slice(1)}
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
                      const unavailableTrades = tradingOptions.options.filter(o => !o.canTrade);
                      
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
                          
                          {/* Locked Trades - Progress Section */}
                          {unavailableTrades.length > 0 && (
                            <TradeSection $locked>
                              <TradeSectionHeader>
                                <TradeSectionBadge>🔒</TradeSectionBadge>
                                <TradeSectionTitle>{t('fishing.needMoreFish') || 'Need More Fish'}</TradeSectionTitle>
                                <TradeSectionCount>{unavailableTrades.length}</TradeSectionCount>
                              </TradeSectionHeader>
                              <LockedTradesList>
                                {unavailableTrades.map(option => {
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
                          {availableTrades.length === 0 && unavailableTrades.length === 0 && (
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
                          <ChallengeName>{challenge.name}</ChallengeName>
                          <DifficultyBadge $difficulty={challenge.difficulty}>
                            {challenge.difficulty}
                          </DifficultyBadge>
                        </ChallengeHeader>
                        <ChallengeDescription>{challenge.description}</ChallengeDescription>
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
                          <ClaimButton onClick={() => handleClaimChallenge(challenge.id)}>
                            <MdCheckCircle /> {t('fishing.claim') || 'Claim'}
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
                          <SelectButton onClick={() => handleSelectArea(area.id)}>
                            {t('fishing.select') || 'Select'}
                          </SelectButton>
                        ) : (
                          <UnlockInfo>
                            <span>🪙 {area.unlockCost.toLocaleString()}</span>
                            {area.unlockRank && <span>#{area.unlockRank}</span>}
                          </UnlockInfo>
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
                          <SelectButton onClick={() => handleBuyRod(rod.id)}>
                            {t('fishing.equip') || 'Equip'}
                          </SelectButton>
                        ) : rod.locked ? (
                          <LockedBadge>🔒 Prestige {rod.requiresPrestige}</LockedBadge>
                        ) : (
                          <BuyButton 
                            onClick={() => handleBuyRod(rod.id)}
                            disabled={user?.points < rod.cost}
                          >
                            🪙 {rod.cost.toLocaleString()}
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
    </PageContainer>
  );
};

// ==================== ANIMATIONS ====================

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const glow = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

// ==================== STYLED COMPONENTS ====================

const getTimeGradient = (timeOfDay) => {
  switch (timeOfDay) {
    case 'dawn': return 'linear-gradient(180deg, #ffcc80 0%, #81d4fa 50%, #4db6ac 100%)';
    case 'dusk': return 'linear-gradient(180deg, #ff7043 0%, #7e57c2 50%, #3949ab 100%)';
    case 'night': return 'linear-gradient(180deg, #1a237e 0%, #0d1b3e 50%, #0a1628 100%)';
    default: return 'linear-gradient(180deg, #81d4fa 0%, #aed581 50%, #98d8c8 100%)';
  }
};

const PageContainer = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${props => getTimeGradient(props.$timeOfDay)};
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Nunito', 'Helvetica Neue', sans-serif;
  user-select: none;
  overflow-x: hidden;
  overflow-y: auto;
  transition: background 5s ease;
  position: relative;
  touch-action: manipulation;
  -webkit-overflow-scrolling: touch;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  /* Ensure no black shows through from body */
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: inherit;
    z-index: -1;
  }
  
  @supports (-webkit-touch-callout: none) {
    /* iOS specific fixes */
    min-height: -webkit-fill-available;
    height: -webkit-fill-available;
  }
`;

const StarsOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: 
    radial-gradient(1px 1px at 20px 30px, white, transparent),
    radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
    radial-gradient(1px 1px at 90px 40px, white, transparent),
    radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
    radial-gradient(2px 2px at 160px 120px, white, transparent),
    radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.5), transparent),
    radial-gradient(1px 1px at 250px 90px, white, transparent),
    radial-gradient(1px 1px at 300px 140px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 350px 60px, white, transparent);
  background-size: 400px 200px;
  animation: ${twinkle} 3s ease-in-out infinite;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 50%, #5a3d0a 100%);
  border-bottom: 4px solid #3e2a06;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 220, 150, 0.3);
  z-index: 100;
  position: relative;
  overflow: visible;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    padding: 8px 10px;
    border-bottom-width: 3px;
  }
  
  @media (max-width: 400px) {
    padding: 6px 8px;
  }
`;

const HeaderWoodGrain = styled.div`
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(0, 0, 0, 0.03) 2px,
    transparent 4px,
    rgba(0, 0, 0, 0.02) 8px
  );
  pointer-events: none;
`;

const LocationSign = styled.div`
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, #a07830 0%, #8b6914 30%, #7a5820 70%, #6d4c10 100%);
  border: 3px solid #5a3d0a;
  border-radius: 8px;
  padding: 6px 16px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 2px 0 rgba(255, 220, 150, 0.25),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  z-index: 50;
  
  @media (max-width: 600px) {
    padding: 4px 12px;
    top: 6px;
  }
  
  @media (max-width: 400px) {
    display: none;
  }
`;

const SignWoodGrain = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    rgba(0, 0, 0, 0.04) 3px,
    transparent 6px,
    rgba(0, 0, 0, 0.02) 12px
  );
  pointer-events: none;
`;

const SignContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #fff8e1;
  text-shadow: 
    1px 1px 0 #5a3d0a,
    -1px -1px 0 rgba(90, 61, 10, 0.5);
  white-space: nowrap;
  position: relative;
  z-index: 1;
  
  @media (max-width: 700px) {
    font-size: 14px;
    gap: 6px;
  }
`;

const BackButton = styled.button`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  border-radius: 10px;
  color: #fff8e1;
  font-size: 22px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 3px 0 #4a3008,
    0 5px 8px rgba(0,0,0,0.3);
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: 36px;
    height: 36px;
    font-size: 18px;
    border-width: 2px;
    border-radius: 8px;
  }
  
  @media (max-width: 400px) {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 
      inset 0 2px 0 rgba(255,255,255,0.2),
      0 5px 0 #4a3008,
      0 8px 12px rgba(0,0,0,0.3);
  }
  
  &:active {
    transform: translateY(2px);
    box-shadow: 
      inset 0 2px 0 rgba(0,0,0,0.1),
      0 1px 0 #4a3008;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    gap: 6px;
  }
  
  @media (max-width: 400px) {
    gap: 4px;
  }
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(180deg, #ffd54f 0%, #ffb300 100%);
  border: 3px solid #e65100;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
  color: #5d4037;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.5),
    0 3px 0 #bf360c,
    0 5px 8px rgba(0,0,0,0.2);
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    padding: 6px 12px;
    font-size: 14px;
    gap: 5px;
    border-width: 2px;
    font-weight: 600;
  }
  
  @media (max-width: 400px) {
    padding: 5px 10px;
    font-size: 13px;
  }
`;

const CoinDot = styled.div`
  width: ${props => props.$small ? '10px' : '14px'};
  height: ${props => props.$small ? '10px' : '14px'};
  background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%);
  border-radius: 50%;
  border: 2px solid #e65100;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: ${props => props.$small ? '8px' : '10px'};
    height: ${props => props.$small ? '8px' : '10px'};
    border-width: 1px;
  }
`;

const WoodButton = styled.button`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  border-radius: 10px;
  color: #fff8e1;
  font-size: 22px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 3px 0 #4a3008;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
    font-size: 18px;
    border-width: 2px;
    border-radius: 8px;
  }
  
  @media (max-width: 400px) {
    width: 30px;
    height: 30px;
    font-size: 16px;
  }
  
  &:hover {
    background: linear-gradient(180deg, #b88a40 0%, #8a6828 100%);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(2px);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  }
`;

const MultiplayerBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${props => props.$connected 
    ? 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)' 
    : 'linear-gradient(180deg, #78909c 0%, #546e7a 100%)'};
  border: 3px solid ${props => props.$connected ? '#2e7d32' : '#455a64'};
  border-radius: 20px;
  color: white;
  font-weight: 800;
  font-size: 13px;
  box-shadow: ${props => props.$connected
    ? 'inset 0 2px 0 rgba(255,255,255,0.3), 0 3px 0 #1b5e20'
    : 'inset 0 2px 0 rgba(255,255,255,0.2), 0 3px 0 #37474f'};
  flex-shrink: 0;
  
  svg {
    font-size: 16px;
  }
  
  @media (max-width: 600px) {
    padding: 6px 8px;
    font-size: 11px;
    gap: 4px;
    border-width: 2px;
    
    svg {
      font-size: 14px;
    }
  }
  
  @media (max-width: 400px) {
    span {
      display: none;
    }
    padding: 6px;
  }
`;

const RankBadge = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${props => props.$canAutofish 
    ? 'linear-gradient(180deg, #ffd54f 0%, #ffc107 100%)' 
    : 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'};
  border: 3px solid ${props => props.$canAutofish ? '#e65100' : '#5a4010'};
  border-radius: 20px;
  color: ${props => props.$canAutofish ? '#5d4037' : '#fff8e1'};
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${props => props.$canAutofish
    ? 'inset 0 2px 0 rgba(255,255,255,0.5), 0 3px 0 #bf360c, 0 0 12px rgba(255, 193, 7, 0.4)'
    : 'inset 0 2px 0 rgba(255,255,255,0.2), 0 3px 0 #4a3008'};
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    padding: 6px 10px;
    font-size: 12px;
    gap: 4px;
    border-width: 2px;
  }
  
  @media (max-width: 400px) {
    padding: 5px 8px;
    font-size: 11px;
  }
  
  &:hover { transform: translateY(-2px); }
`;

const AutofishButton = styled.button`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$active 
    ? 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)' 
    : 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'};
  border: 3px solid ${props => props.$active ? '#2e7d32' : '#5a4010'};
  border-radius: 10px;
  color: ${props => props.$active ? '#e8f5e9' : '#fff8e1'};
  font-size: 22px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${props => props.$active
    ? '0 0 15px rgba(102, 187, 106, 0.5), inset 0 2px 0 rgba(255,255,255,0.3)'
    : 'inset 0 2px 0 rgba(255,255,255,0.2), 0 3px 0 #4a3008'};
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
    font-size: 18px;
    border-width: 2px;
    border-radius: 8px;
  }
  
  @media (max-width: 400px) {
    width: 30px;
    height: 30px;
    font-size: 16px;
  }
  
  svg.spinning { animation: ${spin} 1s linear infinite; }
`;

const AutofishBubblesContainer = styled.div`
  position: fixed;
  bottom: 160px;
  right: 16px;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  z-index: 500;
  pointer-events: none;
  
  @media (max-width: 768px) { 
    bottom: 200px; 
    right: 10px; 
  }
  
  @media (max-width: 400px) {
    bottom: 180px;
    right: 8px;
  }
`;

const AutofishBubble = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  min-width: 180px;
  background: ${props => {
    if (!props.$success) return 'linear-gradient(180deg, #78909c 0%, #546e7a 100%)';
    switch (props.$rarity) {
      case 'legendary': return 'linear-gradient(180deg, #ffd54f 0%, #ffb300 100%)';
      case 'epic': return 'linear-gradient(180deg, #ce93d8 0%, #ab47bc 100%)';
      case 'rare': return 'linear-gradient(180deg, #64b5f6 0%, #1e88e5 100%)';
      case 'uncommon': return 'linear-gradient(180deg, #81c784 0%, #4caf50 100%)';
      default: return 'linear-gradient(180deg, #a1887f 0%, #795548 100%)';
    }
  }};
  border-radius: 16px;
  border: 3px solid ${props => {
    if (!props.$success) return '#455a64';
    switch (props.$rarity) {
      case 'legendary': return '#e65100';
      case 'epic': return '#7b1fa2';
      case 'rare': return '#1565c0';
      case 'uncommon': return '#2e7d32';
      default: return '#5d4037';
    }
  }};
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    ${props => props.$success && props.$rarity === 'legendary' ? '0 0 20px rgba(255, 193, 7, 0.4)' : 'none'};
  pointer-events: auto;
  
  @media (max-width: 500px) {
    min-width: 140px;
    padding: 8px 12px;
    gap: 8px;
    border-radius: 12px;
    border-width: 2px;
  }
`;

const BubbleEmoji = styled.div`
  font-size: 36px;
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.3));
  
  @media (max-width: 500px) {
    font-size: 28px;
  }
`;

const BubbleContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  @media (max-width: 500px) {
    gap: 2px;
  }
`;

const BubbleFishName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
  
  @media (max-width: 500px) {
    font-size: 14px;
    font-weight: 600;
  }
`;

const BubbleReward = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$success ? '#fff9c4' : 'rgba(255, 255, 255, 0.7)'};
`;

const StatsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(180deg, 
    rgba(139, 105, 20, 0.9) 0%, 
    rgba(109, 76, 16, 0.95) 50%, 
    rgba(90, 61, 10, 0.9) 100%);
  border-bottom: 2px solid rgba(62, 42, 6, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 220, 150, 0.2);
  z-index: 100;
  flex-shrink: 0;
  flex-wrap: wrap;
  
  @media (max-width: 600px) {
    gap: 4px;
    padding: 3px 8px;
  }
  
  @media (max-width: 400px) {
    padding: 2px 6px;
    gap: 3px;
  }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  border: 2px solid rgba(255, 220, 150, 0.15);
  
  ${props => props.$highlight && css`
    background: rgba(255, 193, 7, 0.15);
    border-color: rgba(255, 193, 7, 0.3);
  `}
  
  @media (max-width: 600px) {
    padding: 4px 10px;
    border-radius: 10px;
    gap: 1px;
  }
  
  @media (max-width: 400px) {
    padding: 3px 8px;
    border-radius: 8px;
  }
`;

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #fff8e1;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
  
  @media (max-width: 600px) {
    font-size: 16px;
  }
  
  @media (max-width: 400px) {
    font-size: 14px;
  }
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 248, 225, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
  
  @media (max-width: 600px) {
    font-size: 10px;
    letter-spacing: 0.2px;
  }
  
  @media (max-width: 400px) {
    font-size: 9px;
  }
`;

const StatDivider = styled.div`
  width: 2px;
  height: 32px;
  background: linear-gradient(180deg, transparent, rgba(255, 220, 150, 0.3), transparent);
`;

const GameContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 16px;
  min-height: 0;
  overflow: visible;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
  
  @media (max-width: 480px) {
    padding: 6px;
  }
`;

const CanvasFrame = styled.div`
  position: relative;
  border-radius: 8px;
  background: linear-gradient(180deg, #5a3d0a 0%, #3e2a06 100%);
  padding: 8px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 2px 0 rgba(255, 220, 150, 0.2),
    inset 0 -2px 0 rgba(0, 0, 0, 0.3);
  max-width: calc(100vw - 16px);
  max-height: calc(100% - 8px);
  overflow: visible;
  
  @media (max-width: 1000px) {
    padding: 6px;
    border-radius: 6px;
  }
  
  @media (max-width: 600px) {
    padding: 4px;
    border-radius: 4px;
    max-width: calc(100vw - 12px);
  }
`;

const CanvasWrapper = styled.div`
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
  
  /* Base size - aspect ratio preserved */
  width: ${MAP_WIDTH * TILE_SIZE}px;
  height: ${MAP_HEIGHT * TILE_SIZE}px;
  max-width: 100%;
  max-height: 100%;
  
  /* Mobile scaling - use width-based scaling with proper containment */
  @media (max-width: 1000px) {
    width: calc(100vw - 40px);
    height: calc((100vw - 40px) * ${MAP_HEIGHT / MAP_WIDTH});
    max-width: ${MAP_WIDTH * TILE_SIZE}px;
    max-height: ${MAP_HEIGHT * TILE_SIZE}px;
  }
  
  @media (max-width: 600px) {
    width: calc(100vw - 24px);
    height: calc((100vw - 24px) * ${MAP_HEIGHT / MAP_WIDTH});
  }
  
  canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    width: 100% !important;
    height: 100% !important;
  }
`;

const CanvasCorner = styled.div`
  position: absolute;
  width: 16px;
  height: 16px;
  background: #8b6914;
  border-radius: 50%;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.3);
  
  ${props => {
    switch (props.$position) {
      case 'tl': return 'top: -4px; left: -4px;';
      case 'tr': return 'top: -4px; right: -4px;';
      case 'bl': return 'bottom: -4px; left: -4px;';
      case 'br': return 'bottom: -4px; right: -4px;';
      default: return '';
    }
  }}
`;

const FishPrompt = styled(motion.div)`
  position: fixed;
  bottom: 110px;
  left: 50%;
  padding: 14px 24px;
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 4px solid #8b6914;
  border-radius: 16px;
  color: #5d4037;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 
    0 6px 20px rgba(0,0,0,0.3),
    inset 0 2px 0 rgba(255,255,255,0.5);
  z-index: 150;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    bottom: 180px;
    font-size: 15px;
    padding: 12px 18px;
    gap: 8px;
    border-width: 3px;
  }
  
  @media (max-width: 400px) {
    bottom: 165px;
    font-size: 14px;
    padding: 10px 14px;
  }
`;

const KeyHint = styled.span`
  padding: 6px 12px;
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 100%);
  border: 2px solid #5a3d0a;
  border-radius: 8px;
  font-weight: 800;
  color: #fff8e1;
  box-shadow: 0 2px 0 #4a3008;
`;

const DesktopOnly = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileOnly = styled.span`
  display: none;
  align-items: center;
  
  @media (max-width: 768px) {
    display: flex;
  }
`;

const StateIndicator = styled(motion.div)`
  position: fixed;
  top: 140px;
  left: 50%;
  z-index: 150;
`;

const WaitingBubble = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 4px solid #8b6914;
  border-radius: 20px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
`;

const WaitingDots = styled.span`
  font-size: 24px;
  font-weight: 800;
  color: #8b6914;
  letter-spacing: 2px;
`;

const WaitingText = styled.div`
  color: #5d4037;
  font-size: 17px;
  font-weight: 600;
`;

const CatchAlert = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 32px;
  background: linear-gradient(180deg, #ff5252 0%, #d32f2f 100%);
  border: 4px solid #b71c1c;
  border-radius: 20px;
  animation: ${pulse} 0.2s ease-in-out infinite;
  box-shadow: 
    0 0 40px rgba(255, 82, 82, 0.6),
    0 8px 24px rgba(0,0,0,0.4);
`;

const AlertIcon = styled.span`
  font-size: 32px;
  font-weight: 800;
  color: white;
  animation: ${pulse} 0.15s ease-in-out infinite;
`;

const CatchText = styled.div`
  color: white;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
`;

const ResultPopup = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 36px;
  background: ${props => props.$success 
    ? 'linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%)' 
    : 'linear-gradient(180deg, #bcaaa4 0%, #a1887f 100%)'};
  border: 5px solid ${props => props.$success ? '#8b6914' : '#6d4c41'};
  border-radius: 24px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.5),
    ${props => props.$success && props.$glow ? `0 0 30px ${props.$glow}` : 'none'};
  z-index: 200;
  overflow: hidden;
  max-width: calc(100vw - 40px);
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 12px;
    padding: 20px 24px;
    border-width: 4px;
    border-radius: 20px;
    text-align: center;
  }
  
  @media (max-width: 400px) {
    padding: 16px 20px;
    gap: 10px;
  }
`;

const ResultGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, ${props => props.$glow || 'transparent'} 0%, transparent 70%);
  animation: ${glow} 1.5s ease-in-out infinite;
  pointer-events: none;
`;

const ResultEmoji = styled.div`
  font-size: 64px;
  filter: drop-shadow(3px 3px 5px rgba(0,0,0,0.3));
  animation: ${float} 2s ease-in-out infinite;
  z-index: 1;
  
  @media (max-width: 600px) {
    font-size: 52px;
  }
  
  @media (max-width: 400px) {
    font-size: 44px;
  }
`;

const ResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1;
  
  @media (max-width: 600px) {
    gap: 6px;
    align-items: center;
  }
`;

const ResultTitle = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.$success ? '#2e7d32' : '#5d4037'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
`;

const ResultFishName = styled.div`
  font-size: 21px;
  font-weight: 600;
  color: ${props => props.$color || '#5d4037'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.3);
`;

const ResultReward = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${props => props.$quality === 'perfect' ? '30px' : props.$quality === 'great' ? '28px' : '26px'};
  font-weight: 700;
  color: ${props => props.$quality === 'perfect' ? '#ffd700' : props.$quality === 'great' ? '#4caf50' : '#e65100'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
  ${props => props.$quality === 'perfect' && `
    animation: ${pulse} 0.5s ease-in-out infinite;
  `}
`;

// Mobile Controls
const MobileControls = styled.div`
  display: none;
  align-items: center;
  justify-content: space-around;
  padding: 16px 24px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, 
    rgba(139, 105, 20, 0.98) 0%, 
    rgba(109, 76, 16, 0.99) 50%, 
    rgba(90, 61, 10, 0.98) 100%);
  border-top: 4px solid rgba(255, 220, 150, 0.25);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  touch-action: manipulation;
  min-height: 160px;
  
  @media (max-width: 768px) { 
    display: flex; 
  }
  
  @media (max-width: 400px) {
    padding: 12px 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    min-height: 140px;
  }
`;

const DPad = styled.div`
  position: relative;
  width: 140px;
  height: 140px;
  touch-action: manipulation;
  
  @media (max-width: 400px) {
    width: 120px;
    height: 120px;
  }
`;

const DPadCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #5d4037 0%, #4e342e 100%);
  border-radius: 12px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  
  @media (max-width: 400px) {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
`;

const DPadButton = styled.button`
  position: absolute;
  width: 48px;
  height: 48px;
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  border-radius: 12px;
  color: #fff8e1;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.2),
    0 3px 0 #4a3008,
    0 5px 8px rgba(0,0,0,0.3);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  
  ${props => {
    switch (props.$position) {
      case 'up': return 'top: 0; left: 50%; transform: translateX(-50%);';
      case 'down': return 'bottom: 0; left: 50%; transform: translateX(-50%);';
      case 'left': return 'top: 50%; left: 0; transform: translateY(-50%);';
      case 'right': return 'top: 50%; right: 0; transform: translateY(-50%);';
      default: return '';
    }
  }}
  
  @media (max-width: 400px) {
    width: 42px;
    height: 42px;
    font-size: 24px;
    border-radius: 10px;
    border-width: 2px;
  }
  
  &:active {
    background: linear-gradient(180deg, #b88a40 0%, #8a6828 100%);
    transform: ${props => {
      switch (props.$position) {
        case 'up': return 'translateX(-50%) translateY(2px)';
        case 'down': return 'translateX(-50%) translateY(-2px)';
        case 'left': return 'translateY(-50%) translateX(2px)';
        case 'right': return 'translateY(-50%) translateX(-2px)';
        default: return '';
      }
    }};
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  }
`;

const ActionButton = styled(motion.button)`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  color: #fff8e1;
  background: ${props => {
    if (props.$state === 'fish_appeared') return 'linear-gradient(180deg, #ff5252 0%, #d32f2f 100%)';
    if (props.$canFish) return 'linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%)';
    return 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)';
  }};
  border: 4px solid ${props => {
    if (props.$state === 'fish_appeared') return '#b71c1c';
    if (props.$canFish) return '#1565c0';
    return '#5a4010';
  }};
  box-shadow: 
    inset 0 3px 0 rgba(255,255,255,0.3),
    0 4px 0 ${props => {
      if (props.$state === 'fish_appeared') return '#7f0000';
      if (props.$canFish) return '#0d47a1';
      return '#4a3008';
    }},
    0 6px 12px rgba(0,0,0,0.4);
  
  @media (max-width: 400px) {
    width: 76px;
    height: 76px;
    font-size: 32px;
    border-width: 3px;
  }
  
  ${props => props.$state === 'fish_appeared' && css`
    animation: ${pulse} 0.25s ease-in-out infinite;
    box-shadow: 
      inset 0 3px 0 rgba(255,255,255,0.3),
      0 4px 0 #7f0000,
      0 0 30px rgba(255, 82, 82, 0.6);
  `}
  
  &:disabled { opacity: 0.5; }
`;

const Notification = styled(motion.div)`
  position: fixed;
  top: 120px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 28px;
  border-radius: 16px;
  font-weight: 700;
  z-index: 1000;
  background: ${props => props.$type === 'error' 
    ? 'linear-gradient(180deg, #ff5252 0%, #d32f2f 100%)' 
    : 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)'};
  border: 3px solid ${props => props.$type === 'error' ? '#b71c1c' : '#2e7d32'};
  color: white;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
`;

// Modal Styles - Cozy parchment look
const CozyModal = styled(ModalContent)`
  max-width: 540px;
  max-height: 85vh;
  width: calc(100vw - 32px);
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 5px solid #8b6914;
  border-radius: 20px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.5),
    inset 0 2px 0 rgba(255,255,255,0.5);
  position: relative;
  overflow: hidden;
  
  @media (max-width: 600px) {
    max-height: 80vh;
    border-width: 4px;
    border-radius: 16px;
  }
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      rgba(139, 105, 20, 0.03) 2px,
      transparent 4px
    );
    pointer-events: none;
  }
`;

const ModalTitle = styled.h2`
  display: flex;
  align-items: center;
  font-size: 22px;
  font-weight: 700;
  color: #5d4037;
  margin: 0;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
  
  @media (max-width: 500px) {
    font-size: 19px;
    font-weight: 600;
  }
`;

const CloseButton = styled(IconButton)`
  background: linear-gradient(180deg, #a07830 0%, #7a5820 100%);
  border: 3px solid #5a4010;
  color: #fff8e1;
  
  &:hover {
    background: linear-gradient(180deg, #b88a40 0%, #8a6828 100%);
  }
`;

const HelpSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(139, 105, 20, 0.1);
  border-radius: 16px;
  border: 2px solid rgba(139, 105, 20, 0.2);
  
  &:last-child { margin-bottom: 0; }
  
  @media (max-width: 500px) {
    gap: 12px;
    padding: 12px;
    margin-bottom: 16px;
  }
`;

const HelpNumber = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 100%);
  border-radius: 50%;
  color: #fff8e1;
  font-weight: 800;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 0 #4a3008;
`;

const HelpContent = styled.div`
  flex: 1;
`;

const HelpTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #5d4037;
  
  @media (max-width: 500px) {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 6px;
  }
`;

const HelpText = styled.p`
  font-size: 15px;
  color: #5d4037;
  margin: 0;
  line-height: 1.55;
  
  @media (max-width: 500px) {
    font-size: 14px;
    line-height: 1.5;
  }
`;

const FishList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
`;

const FishItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.5);
  border-radius: 12px;
  border-left: 5px solid ${props => props.$color || '#666'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const FishEmoji = styled.span`
  font-size: 28px;
`;

const FishRarity = styled.span`
  font-weight: 800;
  color: ${props => props.$color || '#5d4037'};
  min-width: 90px;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
`;

const FishDifficulty = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #795548;
  margin-left: auto;
  padding: 4px 8px;
  background: rgba(0,0,0,0.1);
  border-radius: 8px;
`;

const YourRankSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
`;

const RankBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 32px;
  background: ${props => props.$canAutofish 
    ? 'linear-gradient(180deg, #ffd54f 0%, #ffb300 100%)' 
    : 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'};
  border-radius: 20px;
  border: 4px solid ${props => props.$canAutofish ? '#e65100' : '#5a4010'};
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    0 4px 12px rgba(0,0,0,0.3);
`;

const YourRankValue = styled.div`
  font-size: 40px;
  font-weight: 900;
  color: #5d4037;
  text-shadow: 2px 2px 0 rgba(255,255,255,0.5);
`;

const RankSubtext = styled.div`
  font-size: 14px;
  color: rgba(93, 64, 55, 0.7);
  font-weight: 600;
`;

const AutofishUnlockStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: ${props => props.$unlocked 
    ? 'linear-gradient(180deg, rgba(102, 187, 106, 0.3) 0%, rgba(76, 175, 80, 0.2) 100%)' 
    : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 20px;
  border: 2px solid ${props => props.$unlocked ? '#43a047' : 'rgba(0,0,0,0.1)'};
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.$unlocked ? '#2e7d32' : '#795548'};
`;

const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(139, 105, 20, 0.1);
    border-radius: 5px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #a07830, #7a5820);
    border-radius: 5px;
    border: 2px solid rgba(139, 105, 20, 0.2);
  }
`;

const LeaderboardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: ${props => {
    if (props.$isYou) return 'linear-gradient(180deg, rgba(66, 165, 245, 0.2) 0%, rgba(30, 136, 229, 0.15) 100%)';
    if (props.$rank <= 3) return 'linear-gradient(180deg, rgba(255, 213, 79, 0.15) 0%, rgba(255, 179, 0, 0.1) 100%)';
    return 'rgba(255, 255, 255, 0.4)';
  }};
  border-radius: 14px;
  border: 3px solid ${props => {
    if (props.$isYou) return 'rgba(66, 165, 245, 0.4)';
    if (props.$rank <= 3) return 'rgba(255, 179, 0, 0.3)';
    return 'rgba(139, 105, 20, 0.15)';
  }};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const LeaderboardRank = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$rank <= 3 ? '28px' : '16px'};
  font-weight: 900;
  color: ${props => props.$rank <= 3 ? 'inherit' : '#795548'};
`;

const LeaderboardName = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #5d4037;
`;

const LeaderboardPoints = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #e65100;
`;

const AutofishBadge = styled.div`
  font-size: 20px;
`;

// =============================================
// TRADING POST STYLED COMPONENTS - REDESIGNED
// =============================================

const TradingPostButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(180deg, #43a047 0%, #2e7d32 100%);
  color: #fff;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    0 3px 0 #1b5e20,
    0 4px 8px rgba(0,0,0,0.3);
  transition: all 0.15s;
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
    font-size: 18px;
    border-radius: 8px;
  }
  
  @media (max-width: 400px) {
    width: 30px;
    height: 30px;
    font-size: 16px;
  }
  
  &:hover {
    background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 
      inset 0 2px 0 rgba(255,255,255,0.3),
      0 1px 0 #1b5e20,
      0 2px 4px rgba(0,0,0,0.3);
  }
`;

const TradingPostModal = styled(motion.div)`
  background: linear-gradient(180deg, #fff8e1 0%, #ffecb3 100%);
  border-radius: 20px;
  border: 5px solid #8b6914;
  box-shadow: 
    0 0 0 2px #d4a020,
    inset 0 2px 0 rgba(255,255,255,0.5),
    0 20px 60px rgba(0, 0, 0, 0.4);
  width: calc(100% - 24px);
  max-width: 420px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 600px) {
    border-width: 4px;
    border-radius: 16px;
    max-height: 80vh;
    max-width: 100%;
  }
`;

const ShopHeader = styled.div`
  background: linear-gradient(180deg, #8b6914 0%, #6d4c10 100%);
  padding: 14px 18px 12px;
  border-bottom: 4px solid #3e2a06;
`;

const ShopTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const ShopIcon = styled.div`
  font-size: 26px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
`;

const ShopTitle = styled.h2`
  flex: 1;
  font-size: 18px;
  font-weight: 800;
  color: #fff8e1;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.4);
  letter-spacing: 0.5px;
`;

const WalletStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 6px 14px;
  border: 2px solid rgba(255,248,225,0.2);
`;

const WalletItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  
  span:first-child {
    font-size: 16px;
  }
`;

const WalletDivider = styled.div`
  width: 1px;
  height: 20px;
  background: rgba(255,248,225,0.3);
`;

const WalletValue = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: ${props => props.$highlight ? '#ffd54f' : '#fff8e1'};
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
`;

const ShopBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: linear-gradient(180deg, rgba(139, 105, 20, 0.05) 0%, rgba(139, 105, 20, 0.1) 100%);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(139, 105, 20, 0.1);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #a07830, #7a5820);
    border-radius: 4px;
  }
`;

const TradingLoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  color: #795548;
  font-size: 18px;
  font-weight: 600;
  
  .loading-fish {
    font-size: 48px;
    color: #64b5f6;
    animation: fishBob 1.5s ease-in-out infinite;
  }
  
  @keyframes fishBob {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
  }
`;

const FishBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px;
  background: rgba(139, 105, 20, 0.1);
  border-radius: 12px;
  margin-bottom: 14px;
  border: 2px solid rgba(139, 105, 20, 0.2);
  
  @media (max-width: 400px) {
    gap: 4px;
    padding: 8px 6px;
  }
`;

const FishChip = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: ${props => props.$hasAny 
    ? 'rgba(255,255,255,0.7)'
    : 'rgba(255,255,255,0.3)'};
  border-radius: 10px;
  border: 2px solid ${props => props.$hasAny 
    ? `${props.$color}60`
    : 'rgba(139, 105, 20, 0.15)'};
  opacity: ${props => props.$hasAny ? 1 : 0.6};
  transition: all 0.2s;
  
  @media (max-width: 400px) {
    padding: 6px 2px;
    gap: 2px;
    border-radius: 8px;
  }
`;

const FishChipEmoji = styled.div`
  font-size: 20px;
  
  @media (max-width: 400px) {
    font-size: 16px;
  }
`;

const FishChipCount = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${props => props.$color || '#5d4037'};
  
  @media (max-width: 400px) {
    font-size: 12px;
  }
`;

const TradeSection = styled.div`
  margin-bottom: 14px;
  opacity: ${props => props.$locked ? 0.9 : 1};
`;

const TradeSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${props => props.$available 
    ? 'rgba(76, 175, 80, 0.4)' 
    : 'rgba(139, 105, 20, 0.2)'};
`;

const TradeSectionBadge = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: ${props => props.$available 
    ? 'linear-gradient(180deg, #4caf50 0%, #388e3c 100%)'
    : 'rgba(139, 105, 20, 0.2)'};
  color: ${props => props.$available ? '#fff' : '#795548'};
  box-shadow: ${props => props.$available ? '0 2px 0 #2e7d32' : 'none'};
`;

const TradeSectionTitle = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #5d4037;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TradeSectionCount = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #8b6914;
  background: rgba(139, 105, 20, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
`;

const TradeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 10px;
  
  @media (max-width: 400px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

const QuickTradeCard = styled(motion.div)`
  background: rgba(255,255,255,0.8);
  border-radius: 14px;
  border: 3px solid ${props => `${props.$color}50` || 'rgba(139, 105, 20, 0.3)'};
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  
  &:hover {
    border-color: ${props => props.$color || '#8b6914'};
    background: rgba(255,255,255,0.95);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    transform: translateY(-2px);
  }
  
  @media (max-width: 400px) {
    padding: 10px 8px;
    gap: 8px;
    border-radius: 12px;
  }
`;

const TradeCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const TradeGiveSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const TradeLabel = styled.div`
  font-size: 9px;
  font-weight: 700;
  color: #8b6914;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TradeGiveContent = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const TradeGiveEmoji = styled.div`
  font-size: 22px;
  
  @media (max-width: 400px) {
    font-size: 18px;
  }
`;

const TradeGiveAmount = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: #c62828;
  
  @media (max-width: 400px) {
    font-size: 13px;
  }
`;

const TradeArrow = styled.div`
  font-size: 16px;
  color: #8b6914;
  margin: 0 2px;
`;

const TradeGetSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const TradeGetContent = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const TradeGetEmoji = styled.div`
  font-size: 22px;
  
  @media (max-width: 400px) {
    font-size: 18px;
  }
`;

const TradeGetAmount = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: #2e7d32;
  
  @media (max-width: 400px) {
    font-size: 13px;
  }
`;

const QuickTradeButton = styled(motion.button)`
  width: 100%;
  padding: 9px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(180deg, #43a047 0%, #2e7d32 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 
    0 3px 0 #1b5e20,
    0 4px 10px rgba(0,0,0,0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.15s;
  
  &:hover {
    background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 
      0 1px 0 #1b5e20,
      0 2px 5px rgba(0,0,0,0.2);
  }
  
  &:disabled {
    background: linear-gradient(180deg, #9e9e9e 0%, #757575 100%);
    cursor: not-allowed;
    box-shadow: 0 2px 0 #616161;
  }
`;

const LockedTradesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LockedTradeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.5);
  border-radius: 10px;
  border: 2px solid rgba(139, 105, 20, 0.15);
`;

const LockedTradeInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LockedTradeEmoji = styled.div`
  font-size: 20px;
  opacity: 0.6;
`;

const LockedTradeText = styled.div`
  flex: 1;
  min-width: 0;
`;

const LockedTradeName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #795548;
  margin-bottom: 4px;
`;

const ProgressBarContainer = styled.div`
  height: 6px;
  background: rgba(139, 105, 20, 0.15);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  width: ${props => props.$progress}%;
  background: ${props => props.$color || '#8b6914'};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const LockedTradeReward = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #795548;
  
  span:first-child {
    font-size: 15px;
  }
`;

const EmptyTradeState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #795548;
  text-align: center;
  
  span {
    font-size: 48px;
    opacity: 0.5;
  }
  
  p {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
`;

const TradeSuccessOverlay = styled(motion.div)`
  position: fixed;
  top: 100px;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: fit-content;
  background: linear-gradient(180deg, rgba(76, 175, 80, 0.98) 0%, rgba(56, 142, 60, 0.98) 100%);
  border-radius: 16px;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 2000;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  pointer-events: none;
`;

const TradeSuccessIcon = styled.div`
  font-size: 28px;
`;

const TradeSuccessText = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
`;

// Pity system progress bar
const PityBar = styled.div`
  width: 50px;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  
  @media (max-width: 600px) {
    width: 40px;
    height: 6px;
  }
`;

const PityFill = styled.div`
  height: 100%;
  width: ${props => props.$progress}%;
  background: ${props => props.$inSoftPity 
    ? `linear-gradient(90deg, ${props.$color} 0%, #ff4444 100%)`
    : props.$color};
  border-radius: 4px;
  transition: width 0.3s ease, background 0.3s ease;
  box-shadow: ${props => props.$inSoftPity ? '0 0 8px rgba(255, 68, 68, 0.6)' : 'none'};
`;

// =============================================
// AUTOFISH COUNTER & NEW BUTTONS
// =============================================

const AutofishCounter = styled.span`
  position: absolute;
  bottom: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: ${props => props.$warning ? '#ff5252' : '#43a047'};
  border-radius: 9px;
  font-size: 10px;
  font-weight: 800;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
`;

const ChallengesButton = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);
  border: 3px solid #e65100;
  border-radius: 10px;
  color: #5d4037;
  font-size: 22px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    0 3px 0 #bf360c;
  flex-shrink: 0;
  
  ${props => props.$hasCompleted && css`
    &::after {
      content: '!';
      position: absolute;
      top: -6px;
      right: -6px;
      width: 18px;
      height: 18px;
      background: #ff3333;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 800;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: ${pulse} 1s ease-in-out infinite;
    }
  `}
  
  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
    font-size: 18px;
    border-width: 2px;
    border-radius: 8px;
  }
  
  &:hover {
    transform: translateY(-1px);
    background: linear-gradient(180deg, #ffd54f 0%, #ffa726 100%);
  }
`;

// =============================================
// CHALLENGES MODAL STYLES
// =============================================

const ChallengesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChallengeCard = styled.div`
  padding: 16px;
  background: ${props => props.$completed 
    ? 'linear-gradient(180deg, rgba(76, 175, 80, 0.15) 0%, rgba(56, 142, 60, 0.1) 100%)'
    : 'rgba(255, 255, 255, 0.5)'};
  border-radius: 14px;
  border: 3px solid ${props => {
    if (props.$completed) return 'rgba(76, 175, 80, 0.4)';
    switch (props.$difficulty) {
      case 'legendary': return '#ffc107';
      case 'hard': return '#ab47bc';
      case 'medium': return '#42a5f5';
      default: return 'rgba(139, 105, 20, 0.2)';
    }
  }};
  position: relative;
  opacity: ${props => props.$completed ? 0.7 : 1};
`;

const ChallengeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ChallengeName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #5d4037;
`;

const DifficultyBadge = styled.span`
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$difficulty) {
      case 'legendary': return 'linear-gradient(180deg, #ffc107 0%, #ff9800 100%)';
      case 'hard': return 'linear-gradient(180deg, #ce93d8 0%, #ab47bc 100%)';
      case 'medium': return 'linear-gradient(180deg, #64b5f6 0%, #42a5f5 100%)';
      default: return 'linear-gradient(180deg, #a5d6a7 0%, #81c784 100%)';
    }
  }};
  color: ${props => props.$difficulty === 'easy' ? '#2e7d32' : '#fff'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const ChallengeDescription = styled.div`
  font-size: 14px;
  color: #795548;
  margin-bottom: 12px;
`;

const ChallengeProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`;

const ProgressText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #5d4037;
  min-width: 50px;
`;

const ChallengeReward = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  
  span {
    font-size: 14px;
    font-weight: 600;
    color: #795548;
  }
`;

const ClaimButton = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 0 #2e7d32, 0 4px 8px rgba(0,0,0,0.2);
  
  &:hover {
    background: linear-gradient(180deg, #66bb6a 0%, #43a047 100%);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 0 #2e7d32;
  }
`;

const CompletedBadge = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 10px;
  color: #2e7d32;
  font-size: 14px;
  font-weight: 700;
`;

// =============================================
// EQUIPMENT MODAL STYLES
// =============================================

const EquipmentTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background: rgba(139, 105, 20, 0.1);
  border-radius: 12px;
`;

const EquipmentTab = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active 
    ? 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'
    : 'transparent'};
  color: ${props => props.$active ? '#fff8e1' : '#795548'};
  box-shadow: ${props => props.$active ? '0 3px 0 #4a3008' : 'none'};
  
  &:hover {
    background: ${props => props.$active 
      ? 'linear-gradient(180deg, #a07830 0%, #7a5820 100%)'
      : 'rgba(139, 105, 20, 0.1)'};
  }
`;

const EquipmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
`;

const EquipmentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: ${props => {
    if (props.$current) return 'linear-gradient(180deg, rgba(102, 187, 106, 0.2) 0%, rgba(76, 175, 80, 0.15) 100%)';
    if (!props.$unlocked) return 'rgba(0, 0, 0, 0.05)';
    return 'rgba(255, 255, 255, 0.5)';
  }};
  border-radius: 14px;
  border: 3px solid ${props => {
    if (props.$current) return 'rgba(76, 175, 80, 0.5)';
    if (props.$locked) return 'rgba(0, 0, 0, 0.2)';
    if (!props.$unlocked) return 'rgba(139, 105, 20, 0.15)';
    return 'rgba(139, 105, 20, 0.2)';
  }};
  opacity: ${props => props.$locked ? 0.6 : 1};
`;

const EquipmentIcon = styled.div`
  font-size: 36px;
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.2));
`;

const EquipmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const EquipmentName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #5d4037;
  margin-bottom: 4px;
`;

const EquipmentDesc = styled.div`
  font-size: 12px;
  color: #795548;
  margin-bottom: 4px;
`;

const EquipmentBonus = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #4caf50;
`;

const RodBonuses = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  
  span {
    font-size: 11px;
    font-weight: 600;
    color: #4caf50;
    padding: 2px 6px;
    background: rgba(76, 175, 80, 0.15);
    border-radius: 6px;
  }
`;

const CurrentBadge = styled.div`
  padding: 8px 14px;
  background: linear-gradient(180deg, #66bb6a 0%, #4caf50 100%);
  border-radius: 10px;
  color: white;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 0 #2e7d32;
`;

const SelectButton = styled.button`
  padding: 8px 14px;
  background: linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 0 #1565c0;
  
  &:hover {
    background: linear-gradient(180deg, #64b5f6 0%, #42a5f5 100%);
    transform: translateY(-1px);
  }
`;

const UnlockInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  
  span {
    font-size: 12px;
    font-weight: 700;
    color: #795548;
    
    &:first-child {
      color: #e65100;
    }
  }
`;

const BuyButton = styled.button`
  padding: 8px 14px;
  background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);
  border: none;
  border-radius: 10px;
  color: #5d4037;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 0 #e65100;
  
  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #ffd54f 0%, #ffa726 100%);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LockedBadge = styled.div`
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  color: #795548;
  font-size: 12px;
  font-weight: 600;
`;

export default FishingPage;
