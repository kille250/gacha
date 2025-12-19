import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowBack, MdHelpOutline, MdClose, MdKeyboardArrowUp, MdKeyboardArrowDown, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdLeaderboard, MdAutorenew } from 'react-icons/md';
import { FaFish, FaCrown, FaTrophy } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import api, { clearCache } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { theme, ModalOverlay, ModalContent, ModalHeader, ModalBody, Heading2, Text, IconButton, motionVariants } from '../styles/DesignSystem';

// Autofishing interval in ms (3 seconds between catches)
const AUTOFISH_INTERVAL = 3000;

// Game states
const GAME_STATES = {
  WALKING: 'walking',
  CASTING: 'casting',
  WAITING: 'waiting',
  FISH_APPEARED: 'fish_appeared',
  CATCHING: 'catching',
  SUCCESS: 'success',
  FAILURE: 'failure'
};

// Player directions
const DIRECTIONS = {
  DOWN: 'down',
  UP: 'up',
  LEFT: 'left',
  RIGHT: 'right'
};

// Rarity colors
const RARITY_COLORS = {
  common: '#8e8e93',
  uncommon: '#30d158',
  rare: '#0a84ff',
  epic: '#bf5af2',
  legendary: '#ff9f0a'
};

// Map configuration
const TILE_SIZE = 48;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 12;

// Map tiles: 0 = grass, 1 = water, 2 = sand/shore, 3 = flowers, 4 = path
const MAP_DATA = [
  [0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0],
  [0, 3, 0, 0, 4, 4, 4, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0],
  [0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 4, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 3],
  [0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 0, 0, 0, 0, 0, 4, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 3, 0],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Check if a tile is walkable
const isWalkable = (x, y) => {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const tile = MAP_DATA[y]?.[x];
  return tile !== 1; // Can't walk on water
};

// Check if player is at water's edge (adjacent to water)
const isAtWaterEdge = (x, y, direction) => {
  let checkX = x;
  let checkY = y;
  
  switch (direction) {
    case DIRECTIONS.DOWN: checkY += 1; break;
    case DIRECTIONS.UP: checkY -= 1; break;
    case DIRECTIONS.LEFT: checkX -= 1; break;
    case DIRECTIONS.RIGHT: checkX += 1; break;
    default: break;
  }
  
  if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) return false;
  return MAP_DATA[checkY]?.[checkX] === 1;
};

const FishingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const gameLoopRef = useRef(null);
  const keysPressed = useRef(new Set());
  
  // Player state
  const [playerPos, setPlayerPos] = useState({ x: 10, y: 5 });
  const [playerDir, setPlayerDir] = useState(DIRECTIONS.DOWN);
  const [isMoving, setIsMoving] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);
  
  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.WALKING);
  const [sessionId, setSessionId] = useState(null);
  const [currentFish, setCurrentFish] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [fishInfo, setFishInfo] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [canFish, setCanFish] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Timing tracking
  const fishAppearedTime = useRef(null);
  const waitTimeoutRef = useRef(null);
  const missTimeoutRef = useRef(null);
  
  // Stats for current session
  const [sessionStats, setSessionStats] = useState({
    casts: 0,
    catches: 0,
    totalEarned: 0,
    bestCatch: null
  });
  
  // Ranking and Autofishing state
  const [rankData, setRankData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isAutofishing, setIsAutofishing] = useState(false);
  const [autofishLog, setAutofishLog] = useState([]);
  const autofishIntervalRef = useRef(null);
  
  // Fetch fish info and rank data on mount
  useEffect(() => {
    const fetchFishInfo = async () => {
      try {
        const response = await api.get('/fishing/info');
        setFishInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch fish info:', err);
      }
    };
    
    const fetchRankData = async () => {
      try {
        const response = await api.get('/fishing/rank');
        setRankData(response.data);
      } catch (err) {
        console.error('Failed to fetch rank data:', err);
      }
    };
    
    fetchFishInfo();
    fetchRankData();
    
    return () => {
      if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
      if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (autofishIntervalRef.current) clearInterval(autofishIntervalRef.current);
    };
  }, []);
  
  // Fetch leaderboard when modal opens
  useEffect(() => {
    if (showLeaderboard) {
      const fetchLeaderboard = async () => {
        try {
          const response = await api.get('/fishing/leaderboard');
          setLeaderboard(response.data.leaderboard);
        } catch (err) {
          console.error('Failed to fetch leaderboard:', err);
        }
      };
      fetchLeaderboard();
    }
  }, [showLeaderboard]);
  
  // Autofishing loop
  useEffect(() => {
    if (isAutofishing && rankData?.canAutofish) {
      autofishIntervalRef.current = setInterval(async () => {
        try {
          const response = await api.post('/fishing/autofish');
          const result = response.data;
          
          // Update points
          if (result.newPoints !== null && result.newPoints !== undefined) {
            setUser(prev => ({ ...prev, points: result.newPoints }));
            clearCache('/auth/me');
          }
          
          // Update session stats
          setSessionStats(prev => ({
            ...prev,
            casts: prev.casts + 1,
            catches: result.success ? prev.catches + 1 : prev.catches,
            totalEarned: prev.totalEarned + (result.reward || 0),
            bestCatch: result.success && (!prev.bestCatch || result.reward > prev.bestCatch.reward)
              ? { fish: result.fish, reward: result.reward }
              : prev.bestCatch
          }));
          
          // Add to autofish log (keep last 10 entries)
          setAutofishLog(prev => [{
            fish: result.fish,
            success: result.success,
            reward: result.reward,
            timestamp: Date.now()
          }, ...prev].slice(0, 10));
          
        } catch (err) {
          console.error('Autofish error:', err);
          if (err.response?.status === 403) {
            setIsAutofishing(false);
            showNotification(t('fishing.autofishLocked', { rank: rankData?.requiredRank || 10 }), 'error');
          }
        }
      }, AUTOFISH_INTERVAL);
    }
    
    return () => {
      if (autofishIntervalRef.current) {
        clearInterval(autofishIntervalRef.current);
        autofishIntervalRef.current = null;
      }
    };
  }, [isAutofishing, rankData, setUser, t]);
  
  // Toggle autofishing
  const toggleAutofish = useCallback(() => {
    if (!rankData?.canAutofish) {
      showNotification(t('fishing.autofishLocked', { rank: rankData?.requiredRank || 10 }), 'error');
      return;
    }
    setIsAutofishing(prev => !prev);
    setAutofishLog([]);
  }, [rankData, t]);
  
  // Check if player can fish
  useEffect(() => {
    const canFishNow = isAtWaterEdge(playerPos.x, playerPos.y, playerDir);
    setCanFish(canFishNow);
  }, [playerPos, playerDir]);
  
  // Animation frame counter
  useEffect(() => {
    if (isMoving) {
      const interval = setInterval(() => {
        setAnimFrame(f => (f + 1) % 4);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setAnimFrame(0);
    }
  }, [isMoving]);
  
  // Movement handler
  const movePlayer = useCallback((dx, dy, newDir) => {
    if (gameState !== GAME_STATES.WALKING) return;
    
    setPlayerDir(newDir);
    
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    
    if (isWalkable(newX, newY)) {
      setPlayerPos({ x: newX, y: newY });
      setIsMoving(true);
    }
  }, [playerPos, gameState]);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showHelp) return;
      
      keysPressed.current.add(e.code);
      
      // Fishing controls
      if ((e.code === 'Space' || e.code === 'KeyE') && gameState === GAME_STATES.WALKING && canFish) {
        e.preventDefault();
        startFishing();
        return;
      }
      
      if ((e.code === 'Space' || e.code === 'KeyE') && gameState === GAME_STATES.FISH_APPEARED) {
        e.preventDefault();
        handleCatch();
        return;
      }
      
      // Movement controls
      if (gameState === GAME_STATES.WALKING) {
        switch (e.code) {
          case 'ArrowUp':
          case 'KeyW':
            e.preventDefault();
            movePlayer(0, -1, DIRECTIONS.UP);
            break;
          case 'ArrowDown':
          case 'KeyS':
            e.preventDefault();
            movePlayer(0, 1, DIRECTIONS.DOWN);
            break;
          case 'ArrowLeft':
          case 'KeyA':
            e.preventDefault();
            movePlayer(-1, 0, DIRECTIONS.LEFT);
            break;
          case 'ArrowRight':
          case 'KeyD':
            e.preventDefault();
            movePlayer(1, 0, DIRECTIONS.RIGHT);
            break;
          default:
            break;
        }
      }
    };
    
    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.code);
      
      const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
      const anyMovementKeyPressed = movementKeys.some(key => keysPressed.current.has(key));
      
      if (!anyMovementKeyPressed) {
        setIsMoving(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, canFish, movePlayer, showHelp]);
  
  // Start fishing
  const startFishing = useCallback(async () => {
    if (gameState !== GAME_STATES.WALKING || !canFish) return;
    
    setLastResult(null);
    setGameState(GAME_STATES.CASTING);
    
    try {
      const response = await api.post('/fishing/cast');
      const { sessionId: newSessionId, waitTime } = response.data;
      
      setSessionId(newSessionId);
      setSessionStats(prev => ({ ...prev, casts: prev.casts + 1 }));
      
      // Transition to waiting state after cast animation
      setTimeout(() => {
        setGameState(GAME_STATES.WAITING);
        
        // After wait time, fish appears
        waitTimeoutRef.current = setTimeout(() => {
          fishAppearedTime.current = Date.now();
          setGameState(GAME_STATES.FISH_APPEARED);
          
          // Set a timeout for missing the fish
          missTimeoutRef.current = setTimeout(() => {
            handleMiss(newSessionId);
          }, 2500);
          
        }, waitTime);
        
      }, 600);
      
    } catch (err) {
      console.error('Cast error:', err);
      showNotification(err.response?.data?.error || t('fishing.failedCast'), 'error');
      setGameState(GAME_STATES.WALKING);
    }
  }, [gameState, canFish]);
  
  // Handle catching the fish
  const handleCatch = useCallback(async () => {
    if (gameState !== GAME_STATES.FISH_APPEARED || !sessionId) return;
    
    if (missTimeoutRef.current) {
      clearTimeout(missTimeoutRef.current);
      missTimeoutRef.current = null;
    }
    
    const reactionTime = Date.now() - fishAppearedTime.current;
    setGameState(GAME_STATES.CATCHING);
    
    try {
      const response = await api.post('/fishing/catch', {
        sessionId,
        reactionTime
      });
      
      const result = response.data;
      setCurrentFish(result.fish);
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
        // Update user points immediately from the response
        if (result.newPoints !== null && result.newPoints !== undefined) {
          setUser(prev => ({ ...prev, points: result.newPoints }));
          // Clear the auth cache so next refresh gets fresh data
          clearCache('/auth/me');
        }
      } else {
        setGameState(GAME_STATES.FAILURE);
      }
      
      setTimeout(() => {
        setGameState(GAME_STATES.WALKING);
        setSessionId(null);
        setCurrentFish(null);
      }, 2000);
      
    } catch (err) {
      console.error('Catch error:', err);
      showNotification(err.response?.data?.error || t('fishing.failedCatch'), 'error');
      setGameState(GAME_STATES.WALKING);
      setSessionId(null);
    }
  }, [gameState, sessionId, setUser]);
  
  // Handle missing the fish
  const handleMiss = useCallback(async (sid) => {
    try {
      const response = await api.post('/fishing/catch', {
        sessionId: sid,
        reactionTime: undefined
      });
      
      setCurrentFish(response.data.fish);
      setLastResult(response.data);
      setGameState(GAME_STATES.FAILURE);
      
      setTimeout(() => {
        setGameState(GAME_STATES.WALKING);
        setSessionId(null);
        setCurrentFish(null);
      }, 2000);
      
    } catch (err) {
      console.error('Miss handling error:', err);
      setGameState(GAME_STATES.WALKING);
      setSessionId(null);
    }
  }, []);
  
  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // Mobile controls
  const handleMobileMove = (dx, dy, dir) => {
    if (gameState === GAME_STATES.WALKING) {
      movePlayer(dx, dy, dir);
      setTimeout(() => setIsMoving(false), 100);
    }
  };
  
  const handleMobileAction = () => {
    if (gameState === GAME_STATES.WALKING && canFish) {
      startFishing();
    } else if (gameState === GAME_STATES.FISH_APPEARED) {
      handleCatch();
    }
  };
  
  // Render tile
  const renderTile = (tileType, x, y) => {
    switch (tileType) {
      case 0: return <GrassTile key={`${x}-${y}`} style={{ left: x * TILE_SIZE, top: y * TILE_SIZE }} />;
      case 1: return <WaterTile key={`${x}-${y}`} style={{ left: x * TILE_SIZE, top: y * TILE_SIZE }} $animOffset={(x + y) % 3} />;
      case 2: return <SandTile key={`${x}-${y}`} style={{ left: x * TILE_SIZE, top: y * TILE_SIZE }} />;
      case 3: return <FlowerTile key={`${x}-${y}`} style={{ left: x * TILE_SIZE, top: y * TILE_SIZE }} />;
      case 4: return <PathTile key={`${x}-${y}`} style={{ left: x * TILE_SIZE, top: y * TILE_SIZE }} />;
      default: return <GrassTile key={`${x}-${y}`} style={{ left: x * TILE_SIZE, top: y * TILE_SIZE }} />;
    }
  };
  
  const isFishing = gameState !== GAME_STATES.WALKING;
  
  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack />
        </BackButton>
        <HeaderTitle>
          <FaFish style={{ color: '#4fc3f7' }} />
          <span>{t('fishing.title')}</span>
        </HeaderTitle>
        <HeaderRight>
          {/* Rank Display */}
          {rankData && (
            <RankBadge onClick={() => setShowLeaderboard(true)} $canAutofish={rankData.canAutofish}>
              <FaCrown style={{ color: rankData.canAutofish ? '#ffd700' : '#8e8e93' }} />
              <span>#{rankData.rank}</span>
            </RankBadge>
          )}
          <PointsDisplay>
            <span>🪙</span>
            <span>{user?.points || 0}</span>
          </PointsDisplay>
          {/* Autofish Toggle */}
          {rankData?.canAutofish && (
            <AutofishButton 
              onClick={toggleAutofish} 
              $active={isAutofishing}
              title={isAutofishing ? t('fishing.stopAutofish') : t('fishing.startAutofish')}
            >
              <MdAutorenew className={isAutofishing ? 'spinning' : ''} />
            </AutofishButton>
          )}
          <HelpButton onClick={() => setShowLeaderboard(true)}>
            <MdLeaderboard />
          </HelpButton>
          <HelpButton onClick={() => setShowHelp(true)}>
            <MdHelpOutline />
          </HelpButton>
        </HeaderRight>
      </Header>
      
      {/* Autofishing Status Bar */}
      <AnimatePresence>
        {isAutofishing && (
          <AutofishBar
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AutofishStatusText>
              <MdAutorenew className="spinning" />
              <span>{t('fishing.autofishing')}</span>
            </AutofishStatusText>
            <AutofishLog>
              {autofishLog.slice(0, 5).map((entry, i) => (
                <AutofishEntry key={entry.timestamp} $success={entry.success}>
                  <span>{entry.fish?.emoji}</span>
                  <span>{entry.success ? `+${entry.reward}` : '✗'}</span>
                </AutofishEntry>
              ))}
            </AutofishLog>
          </AutofishBar>
        )}
      </AnimatePresence>
      
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
            <StatItem>
              <StatValue style={{ color: RARITY_COLORS[sessionStats.bestCatch.fish.rarity] }}>
                {sessionStats.bestCatch.fish.emoji}
              </StatValue>
              <StatLabel>{t('fishing.best')}</StatLabel>
            </StatItem>
          </>
        )}
      </StatsBar>
      
      {/* Game World */}
      <GameWorld>
        <GameViewport>
          <TileMap style={{ width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE }}>
            {/* Render tiles */}
            {MAP_DATA.map((row, y) =>
              row.map((tile, x) => renderTile(tile, x, y))
            )}
            
            {/* Fishing line and bobber when fishing */}
            <AnimatePresence>
              {isFishing && (
                <FishingElements
                  style={{
                    left: playerPos.x * TILE_SIZE + TILE_SIZE / 2,
                    top: playerPos.y * TILE_SIZE + TILE_SIZE / 2
                  }}
                  $direction={playerDir}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <FishingLineElement $state={gameState} $direction={playerDir} />
                  <BobberElement $state={gameState} $direction={playerDir}>
                    {gameState === GAME_STATES.FISH_APPEARED && (
                      <ExclamationMark
                        initial={{ scale: 0, y: -10 }}
                        animate={{ scale: [1, 1.2, 1], y: [-20, -25, -20] }}
                        transition={{ duration: 0.3, repeat: Infinity }}
                      >
                        !
                      </ExclamationMark>
                    )}
                  </BobberElement>
                </FishingElements>
              )}
            </AnimatePresence>
            
            {/* Player */}
            <Player
              style={{
                left: playerPos.x * TILE_SIZE,
                top: playerPos.y * TILE_SIZE,
              }}
              $direction={playerDir}
              $isMoving={isMoving}
              $animFrame={animFrame}
              $isFishing={isFishing}
            >
              <PlayerSprite $direction={playerDir} $animFrame={animFrame} $isMoving={isMoving} $isFishing={isFishing} />
              {isFishing && <FishingRodSprite $direction={playerDir} $state={gameState} />}
            </Player>
            
            {/* Fish splash effect */}
            <AnimatePresence>
              {gameState === GAME_STATES.FISH_APPEARED && (
                <SplashEffect
                  style={{
                    left: playerPos.x * TILE_SIZE + (playerDir === DIRECTIONS.LEFT ? -TILE_SIZE : playerDir === DIRECTIONS.RIGHT ? TILE_SIZE * 2 : TILE_SIZE / 2),
                    top: playerPos.y * TILE_SIZE + (playerDir === DIRECTIONS.UP ? -TILE_SIZE : playerDir === DIRECTIONS.DOWN ? TILE_SIZE * 2 : TILE_SIZE / 2),
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.4, repeat: Infinity }}
                >
                  💦
                </SplashEffect>
              )}
            </AnimatePresence>
          </TileMap>
        </GameViewport>
        
        {/* Fishing prompt */}
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
        
        {/* Game state indicator */}
        <AnimatePresence>
          {gameState === GAME_STATES.WAITING && (
            <StateIndicator
              initial={{ opacity: 0, x: "-50%" }}
              animate={{ opacity: 1, x: "-50%" }}
              exit={{ opacity: 0, x: "-50%" }}
            >
              <WaitingText>{t('fishing.waitingForBite')}</WaitingText>
            </StateIndicator>
          )}
          {gameState === GAME_STATES.FISH_APPEARED && (
            <StateIndicator
              initial={{ opacity: 0, scale: 0.5, x: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, x: "-50%" }}
            >
              <CatchText>{t('fishing.catchIt')}</CatchText>
            </StateIndicator>
          )}
        </AnimatePresence>
        
        {/* Result popup */}
        <AnimatePresence>
          {(gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE) && lastResult && (
            <ResultPopup
              initial={{ opacity: 0, y: "-40%", x: "-50%", scale: 0.9 }}
              animate={{ opacity: 1, y: "-50%", x: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: "-60%", x: "-50%", scale: 0.9 }}
              $success={lastResult.success}
            >
              <ResultEmoji>{lastResult.fish?.emoji}</ResultEmoji>
              <ResultInfo>
                <ResultTitle $success={lastResult.success}>
                  {lastResult.success ? t('fishing.caught') : t('fishing.escaped')}
                </ResultTitle>
                <ResultFishName $rarity={lastResult.fish?.rarity}>
                  {lastResult.fish?.name}
                </ResultFishName>
                {lastResult.success && (
                  <ResultReward>+{lastResult.reward} 🪙</ResultReward>
                )}
              </ResultInfo>
            </ResultPopup>
          )}
        </AnimatePresence>
      </GameWorld>
      
      {/* Mobile Controls */}
      <MobileControls>
        <DPad>
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
          {gameState === GAME_STATES.WALKING && (canFish ? '🎣' : '🚶')}
          {gameState === GAME_STATES.CASTING && '...'}
          {gameState === GAME_STATES.WAITING && '🎣'}
          {gameState === GAME_STATES.FISH_APPEARED && '❗'}
          {(gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE) && (
            lastResult?.success ? '✓' : '✗'
          )}
        </ActionButton>
      </MobileControls>
      
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <Notification
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            $type={notification.type}
          >
            {notification.message}
          </Notification>
        )}
      </AnimatePresence>
      
      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <ModalOverlay
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowHelp(false)}
          >
            <HelpModalContent
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <Heading2>{t('fishing.howToFish')}</Heading2>
                <IconButton onClick={() => setShowHelp(false)}>
                  <MdClose />
                </IconButton>
              </ModalHeader>
              <ModalBody>
                <HelpSection>
                  <HelpTitle>🚶 {t('fishing.movement')}</HelpTitle>
                  <Text secondary>{t('fishing.movementHelp')}</Text>
                </HelpSection>
                <HelpSection>
                  <HelpTitle>🎣 {t('fishing.fishingTitle')}</HelpTitle>
                  <Text secondary>{t('fishing.fishingHelp')}</Text>
                </HelpSection>
                <HelpSection>
                  <HelpTitle>⚡ {t('fishing.catching')}</HelpTitle>
                  <Text secondary>{t('fishing.catchingHelp')}</Text>
                </HelpSection>
                <HelpSection>
                  <HelpTitle>🐟 {t('fishing.fishRarities')}</HelpTitle>
                  <FishList>
                    {fishInfo?.fish?.reduce((acc, fish) => {
                      if (!acc.find(f => f.rarity === fish.rarity)) {
                        acc.push(fish);
                      }
                      return acc;
                    }, []).map(fish => (
                      <FishItem key={fish.rarity} $rarity={fish.rarity}>
                        <span>{fish.emoji}</span>
                        <FishRarity $rarity={fish.rarity}>
                          {fish.rarity.charAt(0).toUpperCase() + fish.rarity.slice(1)}
                        </FishRarity>
                        <FishReward>{fish.minReward}-{fish.maxReward} 🪙</FishReward>
                        <FishDifficulty>{fish.difficulty}</FishDifficulty>
                      </FishItem>
                    ))}
                  </FishList>
                </HelpSection>
              </ModalBody>
            </HelpModalContent>
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
            <LeaderboardModalContent
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <Heading2>
                  <FaTrophy style={{ color: '#ffd700', marginRight: '8px' }} />
                  {t('fishing.leaderboard')}
                </Heading2>
                <IconButton onClick={() => setShowLeaderboard(false)}>
                  <MdClose />
                </IconButton>
              </ModalHeader>
              <ModalBody>
                {/* User's Rank */}
                {rankData && (
                  <YourRankSection>
                    <YourRankLabel>{t('fishing.yourRank')}</YourRankLabel>
                    <YourRankValue $canAutofish={rankData.canAutofish}>
                      <span>#{rankData.rank}</span>
                      <span style={{ fontSize: '14px', opacity: 0.7 }}>
                        / {rankData.totalUsers} {t('fishing.topPlayers').toLowerCase()}
                      </span>
                    </YourRankValue>
                    <AutofishUnlockStatus $unlocked={rankData.canAutofish}>
                      {rankData.canAutofish ? (
                        <>
                          <MdAutorenew style={{ color: '#30d158' }} />
                          <span>{t('fishing.autofishUnlocked')}</span>
                        </>
                      ) : (
                        <>
                          <span>🔒</span>
                          <span>{t('fishing.autofishLocked', { rank: rankData.requiredRank })}</span>
                        </>
                      )}
                    </AutofishUnlockStatus>
                  </YourRankSection>
                )}
                
                {/* Leaderboard List */}
                <LeaderboardList>
                  {leaderboard.map((player, i) => (
                    <LeaderboardItem 
                      key={player.username} 
                      $isYou={rankData?.rank === player.rank}
                      $hasAutofish={player.hasAutofish}
                    >
                      <LeaderboardRank $rank={player.rank}>
                        {player.rank <= 3 ? (
                          <FaCrown style={{ 
                            color: player.rank === 1 ? '#ffd700' : player.rank === 2 ? '#c0c0c0' : '#cd7f32'
                          }} />
                        ) : (
                          `#${player.rank}`
                        )}
                      </LeaderboardRank>
                      <LeaderboardName>{player.username}</LeaderboardName>
                      <LeaderboardPoints>
                        <span>🪙</span>
                        <span>{player.points.toLocaleString()}</span>
                      </LeaderboardPoints>
                      {player.hasAutofish && (
                        <AutofishBadge title={t('fishing.hasAutofish')}>
                          <MdAutorenew />
                        </AutofishBadge>
                      )}
                    </LeaderboardItem>
                  ))}
                </LeaderboardList>
              </ModalBody>
            </LeaderboardModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

// ==================== ANIMATIONS ====================

const waterShimmer = keyframes`
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
`;

const bobberFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-4px) rotate(5deg); }
`;

const bobberBite = keyframes`
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(8px); }
  50% { transform: translateY(-4px); }
  75% { transform: translateY(6px); }
`;

const walkBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
`;

const flowerSway = keyframes`
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
`;

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #87CEEB 0%, #98D8C8 100%);
  font-family: ${theme.fonts.primary};
  user-select: none;
  overflow: hidden;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  z-index: 100;
`;

const BackButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: 100px;
  font-weight: 600;
  font-size: 13px;
  color: white;
`;

const HelpButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 20px;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const RankBadge = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: ${props => props.$canAutofish 
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.2))' 
    : 'rgba(255, 255, 255, 0.15)'};
  border: 1px solid ${props => props.$canAutofish ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 100px;
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$canAutofish 
      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 193, 7, 0.3))' 
      : 'rgba(255, 255, 255, 0.25)'};
  }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const AutofishButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, #30d158, #34c759)' 
    : 'rgba(255, 255, 255, 0.2)'};
  border: 2px solid ${props => props.$active ? '#30d158' : 'transparent'};
  border-radius: 10px;
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$active 
      ? 'linear-gradient(135deg, #28c050, #2db54e)' 
      : 'rgba(255, 255, 255, 0.3)'};
  }
  
  svg.spinning {
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

const AutofishBar = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(48, 209, 88, 0.5);
  overflow: hidden;
`;

const AutofishStatusText = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #30d158;
  font-weight: 700;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  
  svg.spinning {
    animation: ${spinAnimation} 1s linear infinite;
    font-size: 20px;
  }
`;

const AutofishLog = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 0;
`;

const AutofishEntry = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${props => props.$success 
    ? 'rgba(48, 209, 88, 0.9)' 
    : 'rgba(255, 69, 58, 0.9)'};
  border-radius: 10px;
  font-size: 15px;
  color: white;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  
  span:first-child {
    font-size: 18px;
  }
`;

const StatsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.15);
  z-index: 100;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
`;

const StatLabel = styled.span`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatDivider = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.3);
`;

const GameWorld = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: ${theme.spacing.md};
`;

const GameViewport = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 4px rgba(139, 90, 43, 0.8);
  background: #4a7c59;
`;

const TileMap = styled.div`
  position: relative;
  image-rendering: pixelated;
`;

// Tile styles
const BaseTile = styled.div`
  position: absolute;
  width: ${TILE_SIZE}px;
  height: ${TILE_SIZE}px;
`;

const GrassTile = styled(BaseTile)`
  background: linear-gradient(135deg, #7cb342 0%, #689f38 50%, #558b2f 100%);
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%);
  }
`;

const WaterTile = styled(BaseTile)`
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%);
  animation: ${waterShimmer} ${props => 3 + props.$animOffset * 0.5}s ease-in-out infinite;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(ellipse 30% 20% at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(ellipse 20% 15% at 70% 60%, rgba(255,255,255,0.2) 0%, transparent 100%);
  }
`;

const SandTile = styled(BaseTile)`
  background: linear-gradient(135deg, #fdd835 0%, #f9a825 50%, #f57f17 100%);
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 60% 40%, rgba(255,255,255,0.2) 0%, transparent 40%);
  }
`;

const FlowerTile = styled(BaseTile)`
  background: linear-gradient(135deg, #7cb342 0%, #689f38 50%, #558b2f 100%);
  
  &::before {
    content: '🌸';
    position: absolute;
    font-size: 16px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: ${flowerSway} 2s ease-in-out infinite;
  }
`;

const PathTile = styled(BaseTile)`
  background: linear-gradient(135deg, #a1887f 0%, #8d6e63 50%, #795548 100%);
  
  &::after {
    content: '';
    position: absolute;
    inset: 4px;
    background: rgba(0,0,0,0.1);
    border-radius: 2px;
  }
`;

// Player
const Player = styled.div`
  position: absolute;
  width: ${TILE_SIZE}px;
  height: ${TILE_SIZE}px;
  z-index: 50;
  transition: left 0.15s ease-out, top 0.15s ease-out;
  
  ${props => props.$isMoving && css`
    animation: ${walkBounce} 0.3s ease-in-out infinite;
  `}
`;

const PlayerSprite = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  
  /* Simple pixel art character using CSS */
  &::before {
    content: '';
    position: absolute;
    /* Head */
    width: 20px;
    height: 20px;
    background: #ffcc80;
    border-radius: 50%;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: inset -3px -3px 0 rgba(0,0,0,0.1);
  }
  
  &::after {
    content: '';
    position: absolute;
    /* Body */
    width: 24px;
    height: 20px;
    background: ${props => props.$isFishing ? '#2196f3' : '#4caf50'};
    border-radius: 4px 4px 0 0;
    top: 22px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: inset -4px -4px 0 rgba(0,0,0,0.15);
  }
`;

const FishingRodSprite = styled.div`
  position: absolute;
  width: 4px;
  height: 30px;
  background: linear-gradient(90deg, #8d6e63, #5d4037);
  border-radius: 2px;
  
  ${props => {
    switch (props.$direction) {
      case DIRECTIONS.UP:
        return css`
          top: 0;
          left: 50%;
          transform: translateX(-50%) rotate(-45deg);
          transform-origin: bottom center;
        `;
      case DIRECTIONS.DOWN:
        return css`
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          transform-origin: top center;
        `;
      case DIRECTIONS.LEFT:
        return css`
          top: 15px;
          left: -10px;
          transform: rotate(-60deg);
        `;
      case DIRECTIONS.RIGHT:
        return css`
          top: 15px;
          right: -10px;
          transform: rotate(60deg);
        `;
      default:
        return '';
    }
  }}
`;

const FishingElements = styled(motion.div)`
  position: absolute;
  z-index: 40;
  pointer-events: none;
`;

const FishingLineElement = styled.div`
  position: absolute;
  width: 2px;
  height: ${props => props.$state === GAME_STATES.CASTING ? '20px' : '60px'};
  background: linear-gradient(180deg, rgba(200,200,200,0.8), rgba(200,200,200,0.4));
  transition: height 0.3s ease-out;
  
  ${props => {
    switch (props.$direction) {
      case DIRECTIONS.DOWN:
        return css`top: 20px; left: -1px;`;
      case DIRECTIONS.UP:
        return css`bottom: 20px; left: -1px; transform: rotate(180deg);`;
      case DIRECTIONS.LEFT:
        return css`top: -1px; right: 20px; transform: rotate(90deg); transform-origin: right center;`;
      case DIRECTIONS.RIGHT:
        return css`top: -1px; left: 20px; transform: rotate(-90deg); transform-origin: left center;`;
      default:
        return '';
    }
  }}
`;

const BobberElement = styled.div`
  position: absolute;
  width: 12px;
  height: 16px;
  background: linear-gradient(180deg, #ff5252, #c62828);
  border-radius: 50% 50% 40% 40%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  
  ${props => props.$state === GAME_STATES.WAITING && css`
    animation: ${bobberFloat} 1.5s ease-in-out infinite;
  `}
  
  ${props => props.$state === GAME_STATES.FISH_APPEARED && css`
    animation: ${bobberBite} 0.3s ease-in-out infinite;
  `}
  
  ${props => {
    const offset = props.$state === GAME_STATES.CASTING ? 30 : 70;
    switch (props.$direction) {
      case DIRECTIONS.DOWN:
        return css`top: ${offset}px; left: -6px;`;
      case DIRECTIONS.UP:
        return css`bottom: ${offset}px; left: -6px;`;
      case DIRECTIONS.LEFT:
        return css`top: -8px; right: ${offset}px;`;
      case DIRECTIONS.RIGHT:
        return css`top: -8px; left: ${offset}px;`;
      default:
        return '';
    }
  }}
  
  &::after {
    content: '';
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 3px;
    background: white;
    border-radius: 2px;
  }
`;

const ExclamationMark = styled(motion.div)`
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  font-weight: 900;
  color: #ff5252;
  text-shadow: 0 0 10px rgba(255, 82, 82, 0.8), 2px 2px 0 #fff;
`;

const SplashEffect = styled(motion.div)`
  position: absolute;
  font-size: 24px;
  z-index: 45;
  pointer-events: none;
`;

const FishPrompt = styled(motion.div)`
  position: fixed;
  bottom: 100px;
  left: 50%;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 150;
`;

const KeyHint = styled.span`
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-weight: 600;
`;

const StateIndicator = styled(motion.div)`
  position: fixed;
  top: 120px;
  left: 50%;
  z-index: 150;
`;

const WaitingText = styled.div`
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  color: white;
  font-size: 14px;
`;

const CatchText = styled.div`
  padding: 12px 24px;
  background: linear-gradient(135deg, #ff5252, #ff1744);
  border-radius: 20px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  animation: ${pulse} 0.3s ease-in-out infinite;
  box-shadow: 0 4px 20px rgba(255, 82, 82, 0.5);
`;

const ResultPopup = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 30px;
  background: ${props => props.$success 
    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95))' 
    : 'linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(198, 40, 40, 0.95))'};
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 200;
`;

const ResultEmoji = styled.div`
  font-size: 48px;
`;

const ResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ResultTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: white;
`;

const ResultFishName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => RARITY_COLORS[props.$rarity] || 'white'};
`;

const ResultReward = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
`;

// Mobile Controls
const MobileControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  padding-bottom: calc(${theme.spacing.lg} + env(safe-area-inset-bottom, 0px));
  background: rgba(0, 0, 0, 0.2);
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const DPad = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
`;

const DPadButton = styled.button`
  position: absolute;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 10px;
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  ${props => {
    switch (props.$position) {
      case 'up': return css`top: 0; left: 40px;`;
      case 'down': return css`bottom: 0; left: 40px;`;
      case 'left': return css`top: 40px; left: 0;`;
      case 'right': return css`top: 40px; right: 0;`;
      default: return '';
    }
  }}
  
  &:active {
    background: rgba(255, 255, 255, 0.5);
  }
`;

const ActionButton = styled(motion.button)`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.5);
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => {
    if (props.$state === GAME_STATES.FISH_APPEARED) return 'linear-gradient(135deg, #ff5252, #ff1744)';
    if (props.$canFish) return 'linear-gradient(135deg, #4fc3f7, #0288d1)';
    return 'rgba(255, 255, 255, 0.2)';
  }};
  
  ${props => props.$state === GAME_STATES.FISH_APPEARED && css`
    animation: ${pulse} 0.3s ease-in-out infinite;
    box-shadow: 0 0 30px rgba(255, 82, 82, 0.6);
  `}
  
  &:disabled {
    opacity: 0.5;
  }
`;

const Notification = styled(motion.div)`
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
  z-index: 1000;
  background: ${props => props.$type === 'error' ? '#ff5252' : '#4caf50'};
  color: white;
`;

// Help Modal
const HelpModalContent = styled(ModalContent)`
  max-width: 500px;
  background: ${theme.colors.backgroundSecondary};
`;

const HelpSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const HelpTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm};
  color: white;
`;

const FishList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FishItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border-left: 3px solid ${props => RARITY_COLORS[props.$rarity] || '#666'};
`;

const FishRarity = styled.span`
  font-weight: 600;
  color: ${props => RARITY_COLORS[props.$rarity] || 'white'};
  min-width: 80px;
`;

const FishReward = styled.span`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
`;

const FishDifficulty = styled.span`
  font-size: 12px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
`;

// Leaderboard Modal Styles
const LeaderboardModalContent = styled(ModalContent)`
  max-width: 500px;
  max-height: 80vh;
  background: ${theme.colors.backgroundSecondary};
`;

const YourRankSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 193, 7, 0.05));
  border-radius: 16px;
  margin-bottom: ${theme.spacing.lg};
  border: 1px solid rgba(255, 215, 0, 0.2);
`;

const YourRankLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.6);
`;

const YourRankValue = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 32px;
  font-weight: 800;
  color: ${props => props.$canAutofish ? '#ffd700' : 'white'};
`;

const AutofishUnlockStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${props => props.$unlocked 
    ? 'rgba(48, 209, 88, 0.15)' 
    : 'rgba(142, 142, 147, 0.15)'};
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.$unlocked ? '#30d158' : 'rgba(255, 255, 255, 0.7)'};
`;

const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
`;

const LeaderboardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.$isYou 
    ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(0, 122, 255, 0.15))' 
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  border: ${props => props.$isYou ? '1px solid rgba(10, 132, 255, 0.4)' : '1px solid transparent'};
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const LeaderboardRank = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$rank <= 3 ? '18px' : '14px'};
  font-weight: 700;
  color: ${props => props.$rank <= 3 ? 'inherit' : 'rgba(255, 255, 255, 0.6)'};
`;

const LeaderboardName = styled.div`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: white;
`;

const LeaderboardPoints = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #ffd700;
`;

const AutofishBadge = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(48, 209, 88, 0.2);
  border-radius: 50%;
  color: #30d158;
  font-size: 14px;
`;

export default FishingPage;
