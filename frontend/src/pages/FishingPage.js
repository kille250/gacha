import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowBack, MdHelpOutline, MdClose, MdKeyboardArrowUp, MdKeyboardArrowDown, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdLeaderboard, MdAutorenew, MdPeople, MdStorefront } from 'react-icons/md';
import { FaFish, FaCrown, FaTrophy, FaExchangeAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { io } from 'socket.io-client';
import api, { clearCache, WS_URL, getTradingPostOptions, executeTrade } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { theme, ModalOverlay, ModalContent, ModalHeader, ModalBody, Heading2, Text, IconButton, motionVariants } from '../styles/DesignSystem';
import { useFishingEngine, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../components/Fishing/FishingEngine';

// Game configuration
const AUTOFISH_INTERVAL = 3000;

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

const RARITY_COLORS = {
  common: '#a8b5a0',
  uncommon: '#7cb342',
  rare: '#42a5f5',
  epic: '#ab47bc',
  legendary: '#ffc107'
};

const RARITY_GLOW = {
  common: 'rgba(168, 181, 160, 0.3)',
  uncommon: 'rgba(124, 179, 66, 0.4)',
  rare: 'rgba(66, 165, 245, 0.5)',
  epic: 'rgba(171, 71, 188, 0.5)',
  legendary: 'rgba(255, 193, 7, 0.6)'
};

const FishingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const canvasContainerRef = useRef(null);
  const movePlayerRef = useRef(null);
  
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
    totalEarned: 0,
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
  
  // Time of day
  const [timeOfDay, setTimeOfDay] = useState(TIME_PERIODS.DAY);
  
  // Multiplayer state
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [isMultiplayerConnected, setIsMultiplayerConnected] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
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
  useEffect(() => {
    const token = localStorage.getItem('token');
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
    
    // Initialize with existing players
    socket.on('init', (data) => {
      console.log('[Multiplayer] Initialized with', data.players.length, 'players');
      setOtherPlayers(data.players);
      setPlayerCount(data.players.length + 1);
    });
    
    // New player joined
    socket.on('player_joined', (player) => {
      console.log('[Multiplayer] Player joined:', player.username);
      setOtherPlayers(prev => {
        // Avoid duplicates
        if (prev.find(p => p.id === player.id)) return prev;
        return [...prev, player];
      });
      setPlayerCount(prev => prev + 1);
    });
    
    // Player left
    socket.on('player_left', (data) => {
      console.log('[Multiplayer] Player left:', data.id);
      setOtherPlayers(prev => prev.filter(p => p.id !== data.id));
      setPlayerCount(prev => Math.max(1, prev - 1));
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
  
  // Leaderboard fetch
  useEffect(() => {
    if (showLeaderboard) {
      api.get('/fishing/leaderboard')
        .then(res => setLeaderboard(res.data.leaderboard))
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
      setTimeout(() => setTradeResult(null), 2000);
    } catch (err) {
      showNotification(err.response?.data?.message || t('fishing.tradeFailed'), 'error');
      setTradingLoading(false);
    }
  }, [setUser, t]);
  
  // Autofishing loop with integrated cleanup
  useEffect(() => {
    if (!isAutofishing || !rankData?.canAutofish) {
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
        
        setSessionStats(prev => ({
          ...prev,
          casts: prev.casts + 1,
          catches: result.success ? prev.catches + 1 : prev.catches,
          totalEarned: prev.totalEarned + (result.reward || 0),
          bestCatch: result.success && (!prev.bestCatch || result.reward > prev.bestCatch.reward)
            ? { fish: result.fish, reward: result.reward }
            : prev.bestCatch
        }));
        
        const now = Date.now();
        setAutofishLog(prev => {
          // Add new entry and clean old ones in single update
          const newEntry = {
            fish: result.fish,
            success: result.success,
            reward: result.reward,
            timestamp: now
          };
          // Keep only entries less than 4 seconds old, limit to 6
          return [newEntry, ...prev.filter(e => now - e.timestamp < 4000)].slice(0, 6);
        });
        
      } catch (err) {
        if (err.response?.status === 403) {
          setIsAutofishing(false);
          showNotification(t('fishing.autofishLocked', { rank: rankData?.requiredRank || 10 }), 'error');
        }
      }
    }, AUTOFISH_INTERVAL);
    
    return () => {
      if (autofishIntervalRef.current) {
        clearInterval(autofishIntervalRef.current);
        autofishIntervalRef.current = null;
      }
    };
  }, [isAutofishing, rankData, setUser, t]);
  
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
  
  // Start fishing
  const startFishing = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.WALKING || !canFishRef.current) return;
    
    setLastResult(null);
    setGameState(GAME_STATES.CASTING);
    
    try {
      const res = await api.post('/fishing/cast');
      const { sessionId: newSessionId, waitTime } = res.data;
      
      setSessionId(newSessionId);
      setSessionStats(prev => ({ ...prev, casts: prev.casts + 1 }));
      
      setTimeout(() => {
        setGameState(GAME_STATES.WAITING);
        
        waitTimeoutRef.current = setTimeout(() => {
          fishAppearedTime.current = Date.now();
          setGameState(GAME_STATES.FISH_APPEARED);
          
          missTimeoutRef.current = setTimeout(() => {
            handleMiss(newSessionId);
          }, 2500);
        }, waitTime);
      }, 600);
      
    } catch (err) {
      showNotification(err.response?.data?.error || t('fishing.failedCast'), 'error');
      setGameState(GAME_STATES.WALKING);
    }
  }, [t]);
  
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
        setSessionStats(prev => ({
          ...prev,
          catches: prev.catches + 1,
          totalEarned: prev.totalEarned + result.reward,
          bestCatch: !prev.bestCatch || result.reward > prev.bestCatch.reward
            ? { fish: result.fish, reward: result.reward }
            : prev.bestCatch
        }));
        if (result.newPoints !== undefined) {
          setUser(prev => ({ ...prev, points: result.newPoints }));
          clearCache('/auth/me');
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
  }, [sessionId, setUser, t]);
  
  // Handle missing fish
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
  
  // Keep function refs updated for keyboard handler
  useEffect(() => {
    startFishingRef.current = startFishing;
    handleCatchRef.current = handleCatch;
  }, [startFishing, handleCatch]);
  
  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // Toggle autofish
  const toggleAutofish = useCallback(() => {
    if (!rankData?.canAutofish) {
      showNotification(t('fishing.autofishLocked', { rank: rankData?.requiredRank || 10 }), 'error');
      return;
    }
    setIsAutofishing(prev => !prev);
    setAutofishLog([]);
  }, [rankData, t]);
  
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
        <HeaderTitle>
          <FaFish style={{ color: '#64b5f6' }} />
          <span>{t('fishing.title')}</span>
        </HeaderTitle>
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
          {rankData?.canAutofish && (
            <AutofishButton onClick={toggleAutofish} $active={isAutofishing}>
              <MdAutorenew className={isAutofishing ? 'spinning' : ''} />
            </AutofishButton>
          )}
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
                <BubbleFishName $rarity={entry.fish?.rarity}>{entry.fish?.name}</BubbleFishName>
                <BubbleReward $success={entry.success}>
                  {entry.success ? `+${entry.reward}` : t('fishing.escaped')}
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
        <StatDivider />
        <StatItem>
          <StatValue>+{sessionStats.totalEarned}</StatValue>
          <StatLabel>{t('fishing.earned')}</StatLabel>
        </StatItem>
        {sessionStats.bestCatch && (
          <>
            <StatDivider />
            <StatItem $highlight>
              <StatValue style={{ color: RARITY_COLORS[sessionStats.bestCatch.fish.rarity] }}>
                {sessionStats.bestCatch.fish.emoji}
              </StatValue>
              <StatLabel>{t('fishing.best')}</StatLabel>
            </StatItem>
          </>
        )}
      </StatsBar>
      
      {/* Game Canvas */}
      <GameContainer>
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
              <Trans i18nKey="fishing.pressFishPrompt" components={{ key: <KeyHint /> }} />
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
              $rarity={lastResult.fish?.rarity}
            >
              <ResultGlow $rarity={lastResult.fish?.rarity} />
              <ResultEmoji>{lastResult.fish?.emoji}</ResultEmoji>
              <ResultInfo>
                <ResultTitle $success={lastResult.success}>
                  {lastResult.success ? t('fishing.caught') : t('fishing.escaped')}
                </ResultTitle>
                <ResultFishName $rarity={lastResult.fish?.rarity}>
                  {lastResult.fish?.name}
                </ResultFishName>
                {lastResult.success && (
                  <ResultReward>+{lastResult.reward}</ResultReward>
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
            onClick={() => setShowHelp(false)}
          >
            <CozyModal
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
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
                        <FishItem key={fish.rarity} $rarity={fish.rarity}>
                          <FishEmoji>{fish.emoji}</FishEmoji>
                          <FishRarity $rarity={fish.rarity}>
                            {fish.rarity.charAt(0).toUpperCase() + fish.rarity.slice(1)}
                          </FishRarity>
                          <FishReward>{fish.minReward}-{fish.maxReward}</FishReward>
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
            onClick={() => setShowLeaderboard(false)}
          >
            <CozyModal
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
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
      
      {/* Trading Post Modal */}
      <AnimatePresence>
        {showTradingPost && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowTradingPost(false)}
          >
            <TradingPostModal
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  <MdStorefront style={{ color: '#8b6914', marginRight: '8px' }} />
                  {t('fishing.tradingPost')}
                </ModalTitle>
                <CloseButton onClick={() => setShowTradingPost(false)}><MdClose /></CloseButton>
              </ModalHeader>
              <ModalBody>
                {tradingLoading && !tradingOptions ? (
                  <TradingLoadingState>
                    <FaFish className="loading-fish" />
                    <span>{t('common.loading')}</span>
                  </TradingLoadingState>
                ) : tradingOptions ? (
                  <>
                    {/* Inventory Summary */}
                    <InventorySummary>
                      <InventoryTitle>
                        <FaFish /> {t('fishing.yourFish')}
                      </InventoryTitle>
                      <InventoryGrid>
                        {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => (
                          <InventoryItem key={rarity} $rarity={rarity}>
                            <InventoryEmoji>
                              {rarity === 'common' ? '🐟' : rarity === 'uncommon' ? '🐠' : rarity === 'rare' ? '🐡' : rarity === 'epic' ? '🦈' : '🐋'}
                            </InventoryEmoji>
                            <InventoryCount $rarity={rarity}>
                              {tradingOptions.totals[rarity] || 0}
                            </InventoryCount>
                            <InventoryLabel>{t(`fishing.${rarity}`)}</InventoryLabel>
                          </InventoryItem>
                        ))}
                      </InventoryGrid>
                    </InventorySummary>
                    
                    {/* Tickets Summary */}
                    {tradingOptions.tickets && (
                      <TicketsSummary>
                        <InventoryTitle>
                          🎟️ {t('fishing.yourTickets')}
                        </InventoryTitle>
                        <TicketsGrid>
                          <TicketItem>
                            <TicketEmoji>🎟️</TicketEmoji>
                            <TicketCount>{tradingOptions.tickets.rollTickets || 0}</TicketCount>
                            <TicketLabel>{t('fishing.rollTickets')}</TicketLabel>
                          </TicketItem>
                          <TicketItem $premium>
                            <TicketEmoji>🌟</TicketEmoji>
                            <TicketCount $premium>{tradingOptions.tickets.premiumTickets || 0}</TicketCount>
                            <TicketLabel>{t('fishing.premiumTickets')}</TicketLabel>
                            <TicketBonus>{t('fishing.premiumBonus')}</TicketBonus>
                          </TicketItem>
                        </TicketsGrid>
                      </TicketsSummary>
                    )}
                    
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
                    
                    {/* Trade Options - Tickets */}
                    <TradeOptionsTitle>
                      🎟️ {t('fishing.ticketsCategory')}
                    </TradeOptionsTitle>
                    <TradeOptionsList>
                      {tradingOptions.options.filter(o => o.category === 'tickets').map(option => (
                        <TradeOptionCard 
                          key={option.id} 
                          $canTrade={option.canTrade}
                          $rarity={option.requiredRarity}
                          $isTicket
                        >
                          <TradeOptionEmoji>{option.emoji}</TradeOptionEmoji>
                          <TradeOptionInfo>
                            <TradeOptionName>{option.name}</TradeOptionName>
                            <TradeOptionDesc>{option.description}</TradeOptionDesc>
                            <TradeOptionRequirement $canTrade={option.canTrade}>
                              {`${option.requiredQuantity}× ${t(`fishing.${option.requiredRarity}`)}`}
                              <span> ({option.currentQuantity} {t('fishing.available')})</span>
                            </TradeOptionRequirement>
                          </TradeOptionInfo>
                          <TradeOptionReward $isTicket>
                            <RewardAmount>+{option.rewardAmount}</RewardAmount>
                            <RewardLabel>{option.rewardType === 'premiumTickets' ? '🌟' : '🎟️'}</RewardLabel>
                          </TradeOptionReward>
                          <TradeButton 
                            onClick={() => handleTrade(option.id)}
                            disabled={!option.canTrade || tradingLoading}
                            $canTrade={option.canTrade}
                            whileHover={option.canTrade ? { scale: 1.05 } : {}}
                            whileTap={option.canTrade ? { scale: 0.95 } : {}}
                          >
                            {tradingLoading ? '...' : t('fishing.trade')}
                          </TradeButton>
                        </TradeOptionCard>
                      ))}
                    </TradeOptionsList>
                    
                    {/* Trade Options - Points */}
                    <TradeOptionsTitle>
                      🪙 {t('fishing.pointsCategory')}
                    </TradeOptionsTitle>
                    <TradeOptionsList>
                      {tradingOptions.options.filter(o => o.category === 'points').map(option => (
                        <TradeOptionCard 
                          key={option.id} 
                          $canTrade={option.canTrade}
                          $rarity={option.requiredRarity}
                        >
                          <TradeOptionEmoji>{option.emoji}</TradeOptionEmoji>
                          <TradeOptionInfo>
                            <TradeOptionName>{option.name}</TradeOptionName>
                            <TradeOptionDesc>{option.description}</TradeOptionDesc>
                            <TradeOptionRequirement $canTrade={option.canTrade}>
                              {`${option.requiredQuantity}× ${t(`fishing.${option.requiredRarity}`)}`}
                              <span> ({option.currentQuantity} {t('fishing.available')})</span>
                            </TradeOptionRequirement>
                          </TradeOptionInfo>
                          <TradeOptionReward>
                            <RewardAmount>+{option.rewardAmount}</RewardAmount>
                            <RewardLabel>{t('common.points')}</RewardLabel>
                          </TradeOptionReward>
                          <TradeButton 
                            onClick={() => handleTrade(option.id)}
                            disabled={!option.canTrade || tradingLoading}
                            $canTrade={option.canTrade}
                            whileHover={option.canTrade ? { scale: 1.05 } : {}}
                            whileTap={option.canTrade ? { scale: 0.95 } : {}}
                          >
                            {tradingLoading ? '...' : t('fishing.trade')}
                          </TradeButton>
                        </TradeOptionCard>
                      ))}
                    </TradeOptionsList>
                    
                    {/* Trade Options - Special */}
                    <TradeOptionsTitle>
                      🏆 {t('fishing.specialCategory')}
                    </TradeOptionsTitle>
                    <TradeOptionsList>
                      {tradingOptions.options.filter(o => o.category === 'special').map(option => (
                        <TradeOptionCard 
                          key={option.id} 
                          $canTrade={option.canTrade}
                          $rarity={option.requiredRarity}
                          $isSpecial
                        >
                          <TradeOptionEmoji>{option.emoji}</TradeOptionEmoji>
                          <TradeOptionInfo>
                            <TradeOptionName>{option.name}</TradeOptionName>
                            <TradeOptionDesc>{option.description}</TradeOptionDesc>
                            <TradeOptionRequirement $canTrade={option.canTrade}>
                              1 of each rarity
                              <span> ({option.currentQuantity} sets {t('fishing.available')})</span>
                            </TradeOptionRequirement>
                          </TradeOptionInfo>
                          <TradeOptionReward $isSpecial>
                            <RewardAmount>
                              {option.rewardType === 'mixed' 
                                ? `${option.rewardAmount.rollTickets}🎟️ + ${option.rewardAmount.premiumTickets}🌟`
                                : `+${option.rewardAmount}`}
                            </RewardAmount>
                            <RewardLabel>{option.rewardType === 'points' ? t('common.points') : 'Tickets'}</RewardLabel>
                          </TradeOptionReward>
                          <TradeButton 
                            onClick={() => handleTrade(option.id)}
                            disabled={!option.canTrade || tradingLoading}
                            $canTrade={option.canTrade}
                            whileHover={option.canTrade ? { scale: 1.05 } : {}}
                            whileTap={option.canTrade ? { scale: 0.95 } : {}}
                          >
                            {tradingLoading ? '...' : t('fishing.trade')}
                          </TradeButton>
                        </TradeOptionCard>
                      ))}
                    </TradeOptionsList>
                  </>
                ) : (
                  <TradingLoadingState>
                    <span>{t('fishing.noFish')}</span>
                    <span style={{ fontSize: '14px', opacity: 0.7 }}>{t('fishing.catchFishToTrade')}</span>
                  </TradingLoadingState>
                )}
              </ModalBody>
            </TradingPostModal>
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

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
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
  display: flex;
  flex-direction: column;
  background: ${props => getTimeGradient(props.$timeOfDay)};
  font-family: 'Nunito', 'Comic Sans MS', cursive, sans-serif;
  user-select: none;
  overflow: hidden;
  transition: background 5s ease;
  position: relative;
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
  overflow: hidden;
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

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 800;
  color: #fff8e1;
  margin: 0;
  text-shadow: 
    2px 2px 0 #5a3d0a,
    -1px -1px 0 #5a3d0a;
  letter-spacing: 1px;
`;


const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(180deg, #ffd54f 0%, #ffb300 100%);
  border: 3px solid #e65100;
  border-radius: 20px;
  font-weight: 800;
  font-size: 14px;
  color: #5d4037;
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.5),
    0 3px 0 #bf360c,
    0 5px 8px rgba(0,0,0,0.2);
`;

const CoinDot = styled.div`
  width: ${props => props.$small ? '10px' : '14px'};
  height: ${props => props.$small ? '10px' : '14px'};
  background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%);
  border-radius: 50%;
  border: 2px solid #e65100;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
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
  
  svg {
    font-size: 16px;
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
  
  @media (max-width: 768px) { bottom: 220px; right: 12px; }
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
`;

const BubbleEmoji = styled.div`
  font-size: 36px;
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.3));
`;

const BubbleContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BubbleFishName = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
`;

const BubbleReward = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${props => props.$success ? '#fff9c4' : 'rgba(255, 255, 255, 0.7)'};
`;

const StatsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(180deg, 
    rgba(139, 105, 20, 0.9) 0%, 
    rgba(109, 76, 16, 0.95) 50%, 
    rgba(90, 61, 10, 0.9) 100%);
  border-bottom: 3px solid rgba(62, 42, 6, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 220, 150, 0.2);
  z-index: 100;
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
`;

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 800;
  color: #fff8e1;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
`;

const StatLabel = styled.span`
  font-size: 10px;
  color: rgba(255, 248, 225, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
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
  overflow: hidden;
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
`;

const CanvasWrapper = styled.div`
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
  
  /* Fixed size based on map dimensions */
  width: ${MAP_WIDTH * TILE_SIZE}px;
  height: ${MAP_HEIGHT * TILE_SIZE}px;
  
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
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 
    0 6px 20px rgba(0,0,0,0.3),
    inset 0 2px 0 rgba(255,255,255,0.5);
  z-index: 150;
  
  @media (max-width: 768px) {
    bottom: 190px;
    font-size: 14px;
    padding: 12px 20px;
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
  font-size: 16px;
  font-weight: 700;
`;

const CatchAlert = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  background: linear-gradient(180deg, #ff5252 0%, #d32f2f 100%);
  border: 4px solid #b71c1c;
  border-radius: 20px;
  animation: ${pulse} 0.2s ease-in-out infinite;
  box-shadow: 
    0 0 40px rgba(255, 82, 82, 0.6),
    0 8px 24px rgba(0,0,0,0.4);
`;

const AlertIcon = styled.span`
  font-size: 28px;
  font-weight: 900;
  color: white;
  animation: ${pulse} 0.15s ease-in-out infinite;
`;

const CatchText = styled.div`
  color: white;
  font-size: 22px;
  font-weight: 800;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  letter-spacing: 1px;
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
    ${props => props.$success && props.$rarity ? `0 0 30px ${RARITY_GLOW[props.$rarity]}` : 'none'};
  z-index: 200;
  overflow: hidden;
`;

const ResultGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, ${props => RARITY_GLOW[props.$rarity] || 'transparent'} 0%, transparent 70%);
  animation: ${glow} 1.5s ease-in-out infinite;
  pointer-events: none;
`;

const ResultEmoji = styled.div`
  font-size: 64px;
  filter: drop-shadow(3px 3px 5px rgba(0,0,0,0.3));
  animation: ${float} 2s ease-in-out infinite;
  z-index: 1;
`;

const ResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1;
`;

const ResultTitle = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: ${props => props.$success ? '#558b2f' : '#5d4037'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
`;

const ResultFishName = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => RARITY_COLORS[props.$rarity] || '#5d4037'};
  text-shadow: 1px 1px 0 rgba(255,255,255,0.3);
`;

const ResultReward = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 800;
  color: #f57c00;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
`;

// Mobile Controls
const MobileControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, 
    rgba(139, 105, 20, 0.95) 0%, 
    rgba(109, 76, 16, 0.98) 50%, 
    rgba(90, 61, 10, 0.95) 100%);
  border-top: 4px solid rgba(255, 220, 150, 0.2);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  
  @media (min-width: 768px) { display: none; }
`;

const DPad = styled.div`
  position: relative;
  width: 140px;
  height: 140px;
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
  
  ${props => {
    switch (props.$position) {
      case 'up': return 'top: 0; left: 50%; transform: translateX(-50%);';
      case 'down': return 'bottom: 0; left: 50%; transform: translateX(-50%);';
      case 'left': return 'top: 50%; left: 0; transform: translateY(-50%);';
      case 'right': return 'top: 50%; right: 0; transform: translateY(-50%);';
      default: return '';
    }
  }}
  
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
  background: linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 100%);
  border: 5px solid #8b6914;
  border-radius: 20px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.5),
    inset 0 2px 0 rgba(255,255,255,0.5);
  position: relative;
  overflow: hidden;
  
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
  font-weight: 800;
  color: #5d4037;
  margin: 0;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
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
  font-weight: 800;
  margin: 0 0 8px;
  color: #5d4037;
`;

const HelpText = styled.p`
  font-size: 14px;
  color: #795548;
  margin: 0;
  line-height: 1.5;
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
  border-left: 5px solid ${props => RARITY_COLORS[props.$rarity] || '#666'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const FishEmoji = styled.span`
  font-size: 28px;
`;

const FishRarity = styled.span`
  font-weight: 800;
  color: ${props => RARITY_COLORS[props.$rarity] || '#5d4037'};
  min-width: 90px;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
`;

const FishReward = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #f57c00;
  margin-left: auto;
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
  font-weight: 700;
  color: #5d4037;
`;

const LeaderboardPoints = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 800;
  color: #f57c00;
`;

const AutofishBadge = styled.div`
  font-size: 20px;
`;

// =============================================
// TRADING POST STYLED COMPONENTS
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
  border-radius: 24px;
  border: 6px solid #8b6914;
  box-shadow: 
    0 0 0 3px #d4a020,
    inset 0 2px 0 rgba(255,255,255,0.5),
    0 20px 60px rgba(0, 0, 0, 0.4);
  width: 95%;
  max-width: 500px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

const InventorySummary = styled.div`
  background: rgba(139, 105, 20, 0.1);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  border: 2px solid rgba(139, 105, 20, 0.2);
`;

const InventoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  color: #5d4037;
  margin-bottom: 12px;
  
  svg {
    color: #64b5f6;
  }
`;

const InventoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const InventoryItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: rgba(255,255,255,0.6);
  border-radius: 12px;
  border: 2px solid ${props => RARITY_COLORS[props.$rarity] || '#ccc'}40;
`;

const InventoryEmoji = styled.div`
  font-size: 24px;
`;

const InventoryCount = styled.div`
  font-size: 18px;
  font-weight: 900;
  color: ${props => RARITY_COLORS[props.$rarity] || '#5d4037'};
`;

const InventoryLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #795548;
  text-transform: capitalize;
`;

const TicketsSummary = styled.div`
  background: linear-gradient(180deg, rgba(156, 39, 176, 0.1) 0%, rgba(103, 58, 183, 0.1) 100%);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  border: 2px solid rgba(156, 39, 176, 0.3);
`;

const TicketsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const TicketItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px;
  background: ${props => props.$premium 
    ? 'linear-gradient(180deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.15) 100%)'
    : 'rgba(255,255,255,0.6)'};
  border-radius: 12px;
  border: 2px solid ${props => props.$premium ? '#ffc107' : '#9c27b0'}40;
`;

const TicketEmoji = styled.div`
  font-size: 28px;
`;

const TicketCount = styled.div`
  font-size: 24px;
  font-weight: 900;
  color: ${props => props.$premium ? '#f57c00' : '#7b1fa2'};
`;

const TicketLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #5d4037;
`;

const TicketBonus = styled.div`
  font-size: 9px;
  font-weight: 600;
  color: #43a047;
  background: rgba(76, 175, 80, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 2px;
`;

const TradeSuccessOverlay = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(180deg, rgba(76, 175, 80, 0.95) 0%, rgba(56, 142, 60, 0.95) 100%);
  border-radius: 20px;
  padding: 24px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 10;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
`;

const TradeSuccessIcon = styled.div`
  font-size: 48px;
`;

const TradeSuccessText = styled.div`
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
`;

const TradeOptionsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  color: #5d4037;
  margin-bottom: 12px;
  
  svg {
    color: #8b6914;
  }
`;

const TradeOptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
  
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

const TradeOptionCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${props => props.$canTrade 
    ? 'rgba(255,255,255,0.7)' 
    : 'rgba(0,0,0,0.05)'};
  border-radius: 14px;
  border: 3px solid ${props => props.$canTrade 
    ? (RARITY_COLORS[props.$rarity] || '#8b6914') + '60'
    : 'rgba(0,0,0,0.1)'};
  opacity: ${props => props.$canTrade ? 1 : 0.6};
  transition: all 0.2s;
  
  ${props => props.$canTrade && `
    &:hover {
      border-color: ${RARITY_COLORS[props.$rarity] || '#8b6914'};
      background: rgba(255,255,255,0.9);
    }
  `}
`;

const TradeOptionEmoji = styled.div`
  font-size: 32px;
  flex-shrink: 0;
`;

const TradeOptionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TradeOptionName = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: #5d4037;
  margin-bottom: 2px;
`;

const TradeOptionDesc = styled.div`
  font-size: 11px;
  color: #795548;
  margin-bottom: 4px;
`;

const TradeOptionRequirement = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$canTrade ? '#43a047' : '#d32f2f'};
  
  span {
    color: #795548;
    font-weight: 400;
  }
`;

const TradeOptionReward = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(180deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.15) 100%);
  border-radius: 10px;
  flex-shrink: 0;
`;

const RewardAmount = styled.div`
  font-size: 18px;
  font-weight: 900;
  color: #f57c00;
`;

const RewardLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #795548;
`;

const TradeButton = styled(motion.button)`
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  background: ${props => props.$canTrade 
    ? 'linear-gradient(180deg, #43a047 0%, #2e7d32 100%)'
    : 'linear-gradient(180deg, #9e9e9e 0%, #757575 100%)'};
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: ${props => props.$canTrade ? 'pointer' : 'not-allowed'};
  box-shadow: ${props => props.$canTrade 
    ? '0 3px 0 #1b5e20, 0 4px 8px rgba(0,0,0,0.2)'
    : '0 2px 0 #616161'};
  flex-shrink: 0;
  
  ${props => props.$canTrade && `
    &:hover {
      background: linear-gradient(180deg, #4caf50 0%, #388e3c 100%);
    }
  `}
  
  &:disabled {
    cursor: not-allowed;
  }
`;

export default FishingPage;
