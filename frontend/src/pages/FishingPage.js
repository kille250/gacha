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

// Rarity colors - Stardew-inspired warm palette
const RARITY_COLORS = {
  common: '#a0a0a0',
  uncommon: '#5fcf65',
  rare: '#5b9ee1',
  epic: '#c77dff',
  legendary: '#ffc53d'
};

// Time of day for lighting
const TIME_PERIODS = {
  DAWN: 'dawn',
  DAY: 'day',
  DUSK: 'dusk',
  NIGHT: 'night'
};

// Map configuration
const TILE_SIZE = 40;
const MAP_WIDTH = 24;
const MAP_HEIGHT = 14;

// Map tiles: 0=grass, 1=water, 2=sand, 3=flowers, 4=path, 5=tree, 6=rock, 7=bush, 8=dock, 9=tall grass, 10=lily pad water
const MAP_DATA = [
  [5, 0, 0, 3, 0, 5, 0, 0, 3, 0, 0, 5, 0, 3, 0, 0, 0, 5, 0, 0, 3, 0, 0, 5],
  [0, 7, 0, 0, 0, 0, 9, 0, 0, 0, 7, 0, 0, 0, 9, 0, 0, 0, 0, 7, 0, 0, 9, 0],
  [0, 0, 6, 0, 4, 4, 4, 0, 0, 3, 0, 0, 6, 0, 0, 4, 4, 4, 0, 0, 0, 6, 0, 0],
  [3, 0, 0, 0, 4, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0, 3],
  [5, 0, 9, 0, 4, 0, 0, 0, 7, 0, 3, 0, 9, 0, 0, 4, 0, 0, 7, 0, 0, 9, 0, 5],
  [0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 7, 0, 3, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 3, 0, 7, 0, 3, 0, 0],
  [6, 0, 0, 0, 9, 0, 0, 3, 0, 0, 4, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [1, 1, 1, 1,10, 1, 1, 1, 1, 1, 8, 1, 1, 1,10, 1, 1, 1, 1, 1,10, 1, 1, 1],
  [1, 1,10, 1, 1, 1, 1,10, 1, 1, 8, 1, 1, 1, 1, 1, 1,10, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1,10, 1, 1, 1, 1, 1,10, 1, 1, 1, 1,10, 1, 1, 1, 1, 1, 1,10, 1, 1],
  [1, 1, 1, 1, 1,10, 1, 1, 1, 1, 1, 1,10, 1, 1, 1, 1,10, 1, 1, 1, 1, 1, 1],
];

// Check if a tile is walkable
const isWalkable = (x, y) => {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const tile = MAP_DATA[y]?.[x];
  // Can't walk on water (1, 10), trees (5), or rocks (6)
  return ![1, 5, 6, 10].includes(tile);
};

// Check if player is at water's edge (adjacent to water or on dock)
const isAtWaterEdge = (x, y, direction) => {
  const currentTile = MAP_DATA[y]?.[x];
  // If on dock, can fish in any direction towards water
  if (currentTile === 8) {
    let checkX = x;
    let checkY = y;
    switch (direction) {
      case DIRECTIONS.DOWN: checkY += 1; break;
      case DIRECTIONS.UP: checkY -= 1; break;
      case DIRECTIONS.LEFT: checkX -= 1; break;
      case DIRECTIONS.RIGHT: checkX += 1; break;
      default: break;
    }
    const targetTile = MAP_DATA[checkY]?.[checkX];
    return [1, 10].includes(targetTile); // water or lily pad
  }
  
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
  const targetTile = MAP_DATA[checkY]?.[checkX];
  return [1, 10].includes(targetTile); // water or lily pad water
};

const FishingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const gameLoopRef = useRef(null);
  const keysPressed = useRef(new Set());
  
  // Player state - start on the dock facing water
  const [playerPos, setPlayerPos] = useState({ x: 10, y: 8 });
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
  
  // Stardew-style ambient effects
  const [timeOfDay, setTimeOfDay] = useState(TIME_PERIODS.DAY);
  const [ambientParticles, setAmbientParticles] = useState([]);
  const [jumpingFish, setJumpingFish] = useState([]);
  const [birds, setBirds] = useState([]);
  const [clouds, setClouds] = useState([
    { id: 1, x: 10, speed: 0.3 },
    { id: 2, x: 40, speed: 0.2 },
    { id: 3, x: 70, speed: 0.4 },
  ]);
  
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
  
  // Auto-remove old bubbles after 4 seconds
  useEffect(() => {
    if (autofishLog.length === 0) return;
    
    const timer = setTimeout(() => {
      setAutofishLog(prev => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        return prev.filter(entry => now - entry.timestamp < 4000);
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [autofishLog]);
  
  // Day/Night cycle - changes every 2 minutes
  useEffect(() => {
    const cycleTime = 120000; // 2 minutes per period
    const periods = [TIME_PERIODS.DAWN, TIME_PERIODS.DAY, TIME_PERIODS.DAY, TIME_PERIODS.DUSK, TIME_PERIODS.NIGHT, TIME_PERIODS.NIGHT];
    let periodIndex = 1; // Start at day
    
    const interval = setInterval(() => {
      periodIndex = (periodIndex + 1) % periods.length;
      setTimeOfDay(periods[periodIndex]);
    }, cycleTime);
    
    return () => clearInterval(interval);
  }, []);
  
  // Ambient particles (fireflies at night, butterflies during day)
  useEffect(() => {
    const createParticle = () => {
      const isNight = timeOfDay === TIME_PERIODS.NIGHT || timeOfDay === TIME_PERIODS.DUSK;
      return {
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 60,
        type: isNight ? 'firefly' : 'butterfly',
        duration: 4 + Math.random() * 4
      };
    };
    
    // Spawn particles periodically
    const interval = setInterval(() => {
      if (ambientParticles.length < 8) {
        setAmbientParticles(prev => [...prev, createParticle()]);
      }
    }, 2000);
    
    // Clean up old particles
    const cleanup = setInterval(() => {
      setAmbientParticles(prev => prev.slice(-6));
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(cleanup);
    };
  }, [timeOfDay, ambientParticles.length]);
  
  // Fish jumping out of water randomly
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6 && jumpingFish.length < 3) {
        const waterStartY = 9; // Row where water starts
        setJumpingFish(prev => [...prev, {
          id: Date.now(),
          x: 4 + Math.random() * (MAP_WIDTH - 8),
          y: waterStartY + Math.random() * 3,
        }]);
        
        // Remove after animation
        setTimeout(() => {
          setJumpingFish(prev => prev.slice(1));
        }, 1500);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [jumpingFish.length]);
  
  // Birds flying across
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && birds.length < 2) {
        setBirds(prev => [...prev, {
          id: Date.now(),
          startX: -10,
          y: 5 + Math.random() * 20,
          speed: 2 + Math.random() * 2
        }]);
        
        setTimeout(() => {
          setBirds(prev => prev.slice(1));
        }, 8000);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [birds.length]);
  
  // Cloud movement
  useEffect(() => {
    const interval = setInterval(() => {
      setClouds(prev => prev.map(cloud => ({
        ...cloud,
        x: cloud.x > 110 ? -20 : cloud.x + cloud.speed
      })));
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
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
    const style = { left: x * TILE_SIZE, top: y * TILE_SIZE };
    switch (tileType) {
      case 0: return <GrassTile key={`${x}-${y}`} style={style} $variant={(x + y) % 3} />;
      case 1: return <WaterTile key={`${x}-${y}`} style={style} $animOffset={(x + y) % 4} $timeOfDay={timeOfDay} />;
      case 2: return <SandTile key={`${x}-${y}`} style={style} $variant={(x * y) % 2} />;
      case 3: return <FlowerTile key={`${x}-${y}`} style={style} $flowerType={(x + y) % 4} />;
      case 4: return <PathTile key={`${x}-${y}`} style={style} $variant={(x + y) % 2} />;
      case 5: return <TreeTile key={`${x}-${y}`} style={style} $treeType={(x * y) % 3} />;
      case 6: return <RockTile key={`${x}-${y}`} style={style} $variant={(x + y) % 2} />;
      case 7: return <BushTile key={`${x}-${y}`} style={style} $variant={x % 2} />;
      case 8: return <DockTile key={`${x}-${y}`} style={style} />;
      case 9: return <TallGrassTile key={`${x}-${y}`} style={style} />;
      case 10: return <LilyPadTile key={`${x}-${y}`} style={style} $animOffset={(x + y) % 3} $timeOfDay={timeOfDay} />;
      default: return <GrassTile key={`${x}-${y}`} style={style} $variant={0} />;
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
      
      {/* Autofish Bubbles - Bottom Right Notifications */}
      <AutofishBubblesContainer>
        <AnimatePresence mode="popLayout">
          {autofishLog.slice(0, 6).map((entry, i) => (
            <AutofishBubble
              key={entry.timestamp}
              $success={entry.success}
              $rarity={entry.fish?.rarity}
              initial={{ opacity: 0, x: 80, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30,
                mass: 0.8
              }}
              layout
            >
              <BubbleEmoji>{entry.fish?.emoji}</BubbleEmoji>
              <BubbleContent>
                <BubbleFishName $rarity={entry.fish?.rarity}>
                  {entry.fish?.name}
                </BubbleFishName>
                <BubbleReward $success={entry.success}>
                  {entry.success ? `+${entry.reward} 🪙` : t('fishing.escaped')}
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
            <StatItem>
              <StatValue style={{ color: RARITY_COLORS[sessionStats.bestCatch.fish.rarity] }}>
                {sessionStats.bestCatch.fish.emoji}
              </StatValue>
              <StatLabel>{t('fishing.best')}</StatLabel>
            </StatItem>
          </>
        )}
      </StatsBar>
      
      {/* Ambient Sky Layer */}
      <SkyLayer $timeOfDay={timeOfDay}>
        {/* Clouds */}
        {clouds.map(cloud => (
          <Cloud key={cloud.id} style={{ left: `${cloud.x}%`, top: `${5 + cloud.id * 8}%` }} $timeOfDay={timeOfDay} />
        ))}
        
        {/* Sun/Moon */}
        <CelestialBody $timeOfDay={timeOfDay} />
        
        {/* Birds */}
        {birds.map(bird => (
          <Bird key={bird.id} $startX={bird.startX} $y={bird.y} $speed={bird.speed} />
        ))}
        
        {/* Ambient Particles */}
        {ambientParticles.map(particle => (
          <AmbientParticle 
            key={particle.id} 
            $x={particle.x} 
            $y={particle.y} 
            $type={particle.type}
            $duration={particle.duration}
          />
        ))}
      </SkyLayer>
      
      {/* Game World */}
      <GameWorld $timeOfDay={timeOfDay}>
        <GameViewport $timeOfDay={timeOfDay}>
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
              <PlayerBody $isFishing={isFishing} />
              <PlayerLegs />
              {isFishing && <FishingRodSprite $direction={playerDir} $state={gameState} />}
            </Player>
            
            {/* Jumping fish in water */}
            {jumpingFish.map(fish => (
              <JumpingFishSprite 
                key={fish.id}
                style={{ left: fish.x * TILE_SIZE, top: fish.y * TILE_SIZE }}
              />
            ))}
            
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
  0%, 100% { background-position: 0% 0%; opacity: 0.9; }
  50% { background-position: 100% 100%; opacity: 1; }
`;

const waterWave = keyframes`
  0%, 100% { transform: translateX(0) scaleY(1); }
  25% { transform: translateX(2px) scaleY(0.98); }
  50% { transform: translateX(0) scaleY(1.02); }
  75% { transform: translateX(-2px) scaleY(0.99); }
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
  0%, 100% { transform: rotate(-3deg) translateY(0); }
  50% { transform: rotate(3deg) translateY(-1px); }
`;

const treeSway = keyframes`
  0%, 100% { transform: rotate(-1deg) translateX(0); }
  50% { transform: rotate(1deg) translateX(1px); }
`;

const tallGrassSway = keyframes`
  0%, 100% { transform: skewX(-2deg); }
  50% { transform: skewX(2deg); }
`;

const fireflyGlow = keyframes`
  0%, 100% { opacity: 0.3; box-shadow: 0 0 4px 2px rgba(255, 255, 150, 0.3); }
  50% { opacity: 1; box-shadow: 0 0 12px 6px rgba(255, 255, 150, 0.8); }
`;

const butterflyFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  25% { transform: translateY(-8px) rotate(5deg); }
  50% { transform: translateY(-4px) rotate(-3deg); }
  75% { transform: translateY(-10px) rotate(3deg); }
`;

const fishJump = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  30% { transform: translateY(-30px) rotate(-20deg) scale(1.1); opacity: 1; }
  50% { transform: translateY(-40px) rotate(0deg) scale(1); opacity: 1; }
  70% { transform: translateY(-30px) rotate(20deg) scale(1.1); opacity: 1; }
  100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0; }
`;

const birdFly = keyframes`
  0% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(25vw) translateY(-10px); }
  50% { transform: translateX(50vw) translateY(5px); }
  75% { transform: translateX(75vw) translateY(-5px); }
  100% { transform: translateX(120vw) translateY(0); }
`;

const cloudDrift = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.9; }
`;

const sunPulse = keyframes`
  0%, 100% { box-shadow: 0 0 40px 15px rgba(255, 200, 100, 0.4); }
  50% { box-shadow: 0 0 60px 25px rgba(255, 200, 100, 0.6); }
`;

const moonGlow = keyframes`
  0%, 100% { box-shadow: 0 0 30px 10px rgba(200, 220, 255, 0.3); }
  50% { box-shadow: 0 0 50px 20px rgba(200, 220, 255, 0.5); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
`;

// ==================== STYLED COMPONENTS ====================

// Time of day color palettes (Stardew-inspired)
const getTimeColors = (timeOfDay) => {
  switch (timeOfDay) {
    case TIME_PERIODS.DAWN:
      return {
        skyTop: '#ffb347',
        skyBottom: '#87ceeb',
        ambient: 'rgba(255, 180, 100, 0.15)',
        water: '#5a9fd4'
      };
    case TIME_PERIODS.DUSK:
      return {
        skyTop: '#ff6b6b',
        skyBottom: '#4a69bd',
        ambient: 'rgba(255, 100, 100, 0.2)',
        water: '#3d5a80'
      };
    case TIME_PERIODS.NIGHT:
      return {
        skyTop: '#1a1a2e',
        skyBottom: '#16213e',
        ambient: 'rgba(30, 40, 80, 0.4)',
        water: '#1e3a5f'
      };
    default: // DAY
      return {
        skyTop: '#87CEEB',
        skyBottom: '#98D8C8',
        ambient: 'rgba(255, 255, 255, 0)',
        water: '#4a90c2'
      };
  }
};

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #87CEEB 0%, #98D8C8 100%);
  font-family: ${theme.fonts.primary};
  user-select: none;
  overflow: hidden;
  position: relative;
`;

const SkyLayer = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: ${props => {
    const colors = getTimeColors(props.$timeOfDay);
    return `linear-gradient(180deg, ${colors.skyTop} 0%, ${colors.skyBottom} 100%)`;
  }};
  transition: background 3s ease;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => getTimeColors(props.$timeOfDay).ambient};
    transition: background 3s ease;
  }
`;

const Cloud = styled.div`
  position: absolute;
  width: 80px;
  height: 30px;
  background: ${props => props.$timeOfDay === TIME_PERIODS.NIGHT 
    ? 'rgba(100, 120, 150, 0.4)' 
    : 'rgba(255, 255, 255, 0.9)'};
  border-radius: 20px;
  animation: ${cloudDrift} 4s ease-in-out infinite;
  transition: background 3s ease;
  
  &::before, &::after {
    content: '';
    position: absolute;
    background: inherit;
    border-radius: 50%;
  }
  
  &::before {
    width: 35px;
    height: 35px;
    top: -15px;
    left: 15px;
  }
  
  &::after {
    width: 45px;
    height: 40px;
    top: -20px;
    left: 35px;
  }
`;

const CelestialBody = styled.div`
  position: absolute;
  top: 8%;
  right: 15%;
  width: ${props => props.$timeOfDay === TIME_PERIODS.NIGHT ? '40px' : '50px'};
  height: ${props => props.$timeOfDay === TIME_PERIODS.NIGHT ? '40px' : '50px'};
  border-radius: 50%;
  background: ${props => {
    switch (props.$timeOfDay) {
      case TIME_PERIODS.NIGHT: return 'linear-gradient(135deg, #f5f5f5, #e0e0e0)';
      case TIME_PERIODS.DUSK: return 'linear-gradient(135deg, #ff8c42, #ff6b35)';
      case TIME_PERIODS.DAWN: return 'linear-gradient(135deg, #ffcc80, #ffab40)';
      default: return 'linear-gradient(135deg, #fff9c4, #ffee58)';
    }
  }};
  animation: ${props => props.$timeOfDay === TIME_PERIODS.NIGHT ? moonGlow : sunPulse} 4s ease-in-out infinite;
  transition: all 3s ease;
  
  ${props => props.$timeOfDay === TIME_PERIODS.NIGHT && css`
    &::before {
      content: '';
      position: absolute;
      top: 5px;
      left: 8px;
      width: 8px;
      height: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 50%;
    }
    &::after {
      content: '';
      position: absolute;
      top: 18px;
      right: 10px;
      width: 5px;
      height: 5px;
      background: rgba(0, 0, 0, 0.08);
      border-radius: 50%;
    }
  `}
`;

const Bird = styled.div`
  position: absolute;
  top: ${props => props.$y}%;
  font-size: 14px;
  animation: ${birdFly} ${props => 8 / props.$speed}s linear forwards;
  
  &::before {
    content: '🐦';
  }
`;

const AmbientParticle = styled.div`
  position: absolute;
  left: ${props => props.$x}%;
  top: ${props => props.$y}%;
  width: ${props => props.$type === 'firefly' ? '6px' : '10px'};
  height: ${props => props.$type === 'firefly' ? '6px' : '10px'};
  border-radius: 50%;
  
  ${props => props.$type === 'firefly' ? css`
    background: rgba(255, 255, 150, 0.9);
    animation: ${fireflyGlow} ${props.$duration}s ease-in-out infinite;
  ` : css`
    &::before {
      content: '🦋';
      font-size: 12px;
    }
    animation: ${butterflyFloat} ${props.$duration}s ease-in-out infinite;
  `}
`;

const JumpingFishSprite = styled.div`
  position: absolute;
  font-size: 20px;
  z-index: 35;
  animation: ${fishJump} 1.5s ease-out forwards;
  pointer-events: none;
  
  &::before {
    content: '🐟';
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: linear-gradient(180deg, rgba(101, 67, 33, 0.9) 0%, rgba(80, 50, 25, 0.85) 100%);
  border-bottom: 3px solid rgba(60, 40, 20, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 100;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(139, 90, 43, 0.5);
  }
`;

const BackButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #8b6914 0%, #6d5410 100%);
  border: 2px solid #5d4410;
  border-radius: 8px;
  color: #fff8e1;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.2),
    0 2px 4px rgba(0,0,0,0.3);
  
  &:hover {
    background: linear-gradient(180deg, #a67c20 0%, #8b6914 100%);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
  }
`;

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #fff8e1;
  margin: 0;
  text-shadow: 
    1px 1px 0 rgba(0,0,0,0.5),
    2px 2px 4px rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
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
  background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);
  border: 2px solid #e65100;
  border-radius: 20px;
  font-weight: 700;
  font-size: 13px;
  color: #4e342e;
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.4),
    0 2px 4px rgba(0,0,0,0.3);
  text-shadow: 0 1px 0 rgba(255,255,255,0.3);
`;

const HelpButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #8b6914 0%, #6d5410 100%);
  border: 2px solid #5d4410;
  border-radius: 8px;
  color: #fff8e1;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.2),
    0 2px 4px rgba(0,0,0,0.3);
  
  &:hover {
    background: linear-gradient(180deg, #a67c20 0%, #8b6914 100%);
    transform: translateY(-1px);
  }
`;

const RankBadge = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: ${props => props.$canAutofish 
    ? 'linear-gradient(180deg, #ffd700 0%, #ffa000 100%)' 
    : 'linear-gradient(180deg, #8b6914 0%, #6d5410 100%)'};
  border: 2px solid ${props => props.$canAutofish ? '#e65100' : '#5d4410'};
  border-radius: 20px;
  color: ${props => props.$canAutofish ? '#4e342e' : '#fff8e1'};
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.3),
    0 2px 4px rgba(0,0,0,0.3);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 
      inset 0 1px 0 rgba(255,255,255,0.3),
      0 4px 8px rgba(0,0,0,0.3);
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
    ? 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)' 
    : 'linear-gradient(180deg, #8b6914 0%, #6d5410 100%)'};
  border: 2px solid ${props => props.$active ? '#2e7d32' : '#5d4410'};
  border-radius: 8px;
  color: ${props => props.$active ? '#e8f5e9' : '#fff8e1'};
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.2),
    0 2px 4px rgba(0,0,0,0.3);
  
  &:hover {
    transform: translateY(-1px);
  }
  
  svg.spinning {
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

// Stardew-style notification bubbles in bottom right
const AutofishBubblesContainer = styled.div`
  position: fixed;
  bottom: 140px;
  right: 16px;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  z-index: 500;
  pointer-events: none;
  max-height: 400px;
  overflow: hidden;
  
  @media (max-width: 768px) {
    bottom: 200px;
    right: 12px;
  }
`;

const AutofishBubble = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-width: 180px;
  max-width: 260px;
  background: ${props => {
    if (!props.$success) return 'linear-gradient(180deg, #78909c 0%, #546e7a 100%)';
    switch (props.$rarity) {
      case 'legendary': return 'linear-gradient(180deg, #ffc107 0%, #ff9800 100%)';
      case 'epic': return 'linear-gradient(180deg, #ce93d8 0%, #ab47bc 100%)';
      case 'rare': return 'linear-gradient(180deg, #64b5f6 0%, #1e88e5 100%)';
      case 'uncommon': return 'linear-gradient(180deg, #81c784 0%, #43a047 100%)';
      default: return 'linear-gradient(180deg, #a1887f 0%, #795548 100%)';
    }
  }};
  border-radius: 12px;
  border: 3px solid ${props => {
    if (!props.$success) return '#37474f';
    switch (props.$rarity) {
      case 'legendary': return '#e65100';
      case 'epic': return '#7b1fa2';
      case 'rare': return '#1565c0';
      case 'uncommon': return '#2e7d32';
      default: return '#5d4037';
    }
  }};
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  pointer-events: auto;
`;

const BubbleEmoji = styled.div`
  font-size: 32px;
  line-height: 1;
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.3));
`;

const BubbleContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
`;

const BubbleFishName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BubbleReward = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${props => props.$success ? '#fff9c4' : 'rgba(255, 255, 255, 0.7)'};
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
`;

const StatsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(180deg, rgba(80, 50, 25, 0.85) 0%, rgba(60, 35, 15, 0.8) 100%);
  border-bottom: 2px solid rgba(40, 25, 10, 0.6);
  z-index: 100;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(139, 90, 43, 0.4);
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #fff8e1;
  text-shadow: 
    1px 1px 0 rgba(0,0,0,0.5),
    0 0 8px rgba(255,200,100,0.3);
`;

const StatLabel = styled.span`
  font-size: 9px;
  color: rgba(255, 248, 225, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const StatDivider = styled.div`
  width: 2px;
  height: 28px;
  background: linear-gradient(180deg, transparent, rgba(139, 90, 43, 0.6), transparent);
  border-radius: 1px;
`;

const GameWorld = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: ${theme.spacing.md};
  z-index: 1;
  
  /* Time of day overlay */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: ${props => getTimeColors(props.$timeOfDay).ambient};
    transition: background 3s ease;
    z-index: 100;
  }
`;

const GameViewport = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 8px 40px rgba(0, 0, 0, 0.2),
    inset 0 0 0 3px rgba(101, 67, 33, 0.9),
    inset 0 0 0 6px rgba(139, 90, 43, 0.6);
  background: #4a7c59;
  
  /* Pixel art aesthetic border */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    pointer-events: none;
    z-index: 60;
  }
`;

const TileMap = styled.div`
  position: relative;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
`;

// Tile styles - Stardew Valley inspired
const BaseTile = styled.div`
  position: absolute;
  width: ${TILE_SIZE}px;
  height: ${TILE_SIZE}px;
`;

const GrassTile = styled(BaseTile)`
  background: ${props => {
    const variants = [
      'linear-gradient(135deg, #6b8e23 0%, #556b2f 50%, #4a5f2b 100%)',
      'linear-gradient(135deg, #7cb342 0%, #689f38 50%, #5c8a30 100%)',
      'linear-gradient(135deg, #8bc34a 0%, #7cb342 50%, #6b9b3a 100%)'
    ];
    return variants[props.$variant || 0];
  }};
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => props.$variant === 1 
      ? 'radial-gradient(circle at 25% 75%, rgba(100, 140, 50, 0.4) 0%, transparent 30%)'
      : 'none'};
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0%, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(0,0,0,0.05) 0%, transparent 30%);
  }
`;

const WaterTile = styled(BaseTile)`
  background: ${props => {
    const colors = getTimeColors(props.$timeOfDay);
    return `linear-gradient(180deg, ${colors.water} 0%, ${colors.water}dd 100%)`;
  }};
  animation: ${waterWave} ${props => 2.5 + props.$animOffset * 0.3}s ease-in-out infinite;
  transition: background 3s ease;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255,255,255,0.1) 30%,
      rgba(255,255,255,0.2) 50%,
      rgba(255,255,255,0.1) 70%,
      transparent 100%
    );
    animation: ${waterShimmer} ${props => 4 + props.$animOffset}s ease-in-out infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background: rgba(255,255,255,0.6);
    border-radius: 50%;
    top: ${props => 20 + (props.$animOffset * 25)}%;
    left: ${props => 30 + (props.$animOffset * 20)}%;
    animation: ${sparkle} ${props => 2 + props.$animOffset}s ease-in-out infinite;
  }
`;

const LilyPadTile = styled(BaseTile)`
  background: ${props => {
    const colors = getTimeColors(props.$timeOfDay);
    return `linear-gradient(180deg, ${colors.water} 0%, ${colors.water}dd 100%)`;
  }};
  animation: ${waterWave} ${props => 2.5 + props.$animOffset * 0.3}s ease-in-out infinite;
  transition: background 3s ease;
  
  &::before {
    content: '🍃';
    position: absolute;
    font-size: 18px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(${props => props.$animOffset * 30}deg);
    filter: hue-rotate(-20deg) saturate(1.3);
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background: rgba(255,255,255,0.5);
    border-radius: 50%;
    top: 20%;
    left: 70%;
    animation: ${sparkle} 3s ease-in-out infinite;
  }
`;

const SandTile = styled(BaseTile)`
  background: ${props => props.$variant 
    ? 'linear-gradient(135deg, #e8d4a8 0%, #d4b896 50%, #c9a882 100%)'
    : 'linear-gradient(135deg, #f0e4c8 0%, #e2d0a8 50%, #d4bc8a 100%)'};
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => props.$variant
      ? 'radial-gradient(ellipse 8px 4px at 30% 60%, rgba(180,150,100,0.5) 0%, transparent 100%)'
      : 'radial-gradient(ellipse 6px 3px at 70% 40%, rgba(160,130,80,0.4) 0%, transparent 100%)'};
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle at 60% 30%, rgba(255,255,255,0.15) 0%, transparent 30%),
      radial-gradient(circle at 20% 80%, rgba(0,0,0,0.05) 0%, transparent 20%);
  }
`;

const FlowerTile = styled(BaseTile)`
  background: linear-gradient(135deg, #7cb342 0%, #689f38 50%, #5c8a30 100%);
  
  &::before {
    content: '${props => {
      const flowers = ['🌸', '🌼', '🌺', '💐'];
      return flowers[props.$flowerType || 0];
    }}';
    position: absolute;
    font-size: 14px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: ${flowerSway} ${props => 2 + props.$flowerType * 0.5}s ease-in-out infinite;
    filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.2));
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%);
  }
`;

const PathTile = styled(BaseTile)`
  background: ${props => props.$variant
    ? 'linear-gradient(135deg, #8b7355 0%, #7a6548 50%, #695839 100%)'
    : 'linear-gradient(135deg, #9c8465 0%, #8b7355 50%, #7a6548 100%)'};
  
  &::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
    background: rgba(0,0,0,0.08);
    border-radius: 3px;
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    background: rgba(100, 80, 60, 0.4);
    border-radius: 50%;
    top: ${props => props.$variant ? '30%' : '60%'};
    left: ${props => props.$variant ? '60%' : '25%'};
  }
`;

const TreeTile = styled(BaseTile)`
  background: linear-gradient(135deg, #6b8e23 0%, #556b2f 50%, #4a5f2b 100%);
  
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 16px;
    background: linear-gradient(90deg, #5d4037, #4e342e, #5d4037);
    border-radius: 2px;
  }
  
  &::after {
    content: '${props => {
      const trees = ['🌲', '🌳', '🌴'];
      return trees[props.$treeType || 0];
    }}';
    position: absolute;
    font-size: 28px;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    animation: ${treeSway} 4s ease-in-out infinite;
    filter: drop-shadow(2px 4px 3px rgba(0,0,0,0.3));
  }
`;

const RockTile = styled(BaseTile)`
  background: linear-gradient(135deg, #6b8e23 0%, #556b2f 50%, #4a5f2b 100%);
  
  &::before {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: ${props => props.$variant ? '28px' : '24px'};
    height: ${props => props.$variant ? '20px' : '18px'};
    background: linear-gradient(135deg, #9e9e9e 0%, #757575 50%, #616161 100%);
    border-radius: 40% 50% 45% 55%;
    box-shadow: 
      inset -3px -3px 6px rgba(0,0,0,0.3),
      inset 2px 2px 4px rgba(255,255,255,0.2),
      2px 2px 4px rgba(0,0,0,0.3);
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 14px;
    left: ${props => props.$variant ? '55%' : '45%'};
    width: 6px;
    height: 4px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
  }
`;

const BushTile = styled(BaseTile)`
  background: linear-gradient(135deg, #7cb342 0%, #689f38 50%, #5c8a30 100%);
  
  &::before {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 22px;
    background: linear-gradient(135deg, #4a7c59 0%, #3d6b4a 50%, #2e5739 100%);
    border-radius: 50% 50% 45% 45%;
    box-shadow: 
      inset 2px 2px 6px rgba(80,140,80,0.5),
      inset -2px -2px 6px rgba(0,0,0,0.2),
      2px 2px 4px rgba(0,0,0,0.2);
  }
  
  &::after {
    content: '${props => props.$variant ? '🫐' : ''}';
    position: absolute;
    font-size: 8px;
    bottom: 10px;
    left: 55%;
  }
`;

const DockTile = styled(BaseTile)`
  background: linear-gradient(135deg, #e8d4a8 0%, #d4b896 50%, #c9a882 100%);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      linear-gradient(90deg, 
        #8b6914 0%, #8b6914 8%,
        #a67c20 8%, #a67c20 25%,
        #8b6914 25%, #8b6914 33%,
        #a67c20 33%, #a67c20 50%,
        #8b6914 50%, #8b6914 58%,
        #a67c20 58%, #a67c20 75%,
        #8b6914 75%, #8b6914 83%,
        #a67c20 83%, #a67c20 100%
      );
    box-shadow: 
      inset 0 2px 4px rgba(255,255,255,0.2),
      inset 0 -2px 4px rgba(0,0,0,0.2);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #6d5410, #7d6015, #6d5410);
  }
`;

const TallGrassTile = styled(BaseTile)`
  background: linear-gradient(135deg, #7cb342 0%, #689f38 50%, #5c8a30 100%);
  overflow: hidden;
  
  &::before {
    content: '🌾';
    position: absolute;
    font-size: 18px;
    bottom: 0;
    left: 45%;
    transform: translateX(-50%);
    animation: ${tallGrassSway} 2s ease-in-out infinite;
  }
  
  &::after {
    content: '🌾';
    position: absolute;
    font-size: 14px;
    bottom: 0;
    left: 70%;
    animation: ${tallGrassSway} 2.3s ease-in-out infinite reverse;
  }
`;

// Player - Stardew-style character
const Player = styled.div`
  position: absolute;
  width: ${TILE_SIZE}px;
  height: ${TILE_SIZE}px;
  z-index: 50;
  transition: left 0.12s ease-out, top 0.12s ease-out;
  filter: drop-shadow(2px 3px 2px rgba(0,0,0,0.3));
  
  ${props => props.$isMoving && css`
    animation: ${walkBounce} 0.25s ease-in-out infinite;
  `}
`;

const PlayerSprite = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  
  /* Stardew-style pixel art character */
  /* Hair */
  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 10px;
    background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
    border-radius: 8px 8px 0 0;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 
      inset 1px 1px 0 rgba(255,255,255,0.15),
      inset -1px -1px 0 rgba(0,0,0,0.2);
  }
  
  /* Face */
  &::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 14px;
    background: linear-gradient(180deg, #ffcc80 0%, #ffb74d 100%);
    border-radius: 3px 3px 6px 6px;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 
      inset 1px 1px 0 rgba(255,255,255,0.3),
      inset -1px -1px 0 rgba(0,0,0,0.1),
      /* Eyes */
      inset 4px 4px 0 0 #4e342e,
      inset -4px 4px 0 0 #4e342e,
      /* Cheeks */
      inset 6px -2px 0 0 rgba(255,138,128,0.4),
      inset -6px -2px 0 0 rgba(255,138,128,0.4);
  }
`;

const PlayerBody = styled.div`
  position: absolute;
  width: 18px;
  height: 14px;
  background: ${props => props.$isFishing 
    ? 'linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%)' 
    : 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)'};
  border-radius: 3px 3px 2px 2px;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 
    inset 1px 1px 0 rgba(255,255,255,0.25),
    inset -1px -1px 0 rgba(0,0,0,0.15);
  
  /* Arms */
  &::before {
    content: '';
    position: absolute;
    width: 24px;
    height: 6px;
    background: ${props => props.$isFishing 
      ? 'linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%)' 
      : 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)'};
    border-radius: 3px;
    top: 2px;
    left: -3px;
    box-shadow: 
      inset 0 1px 0 rgba(255,255,255,0.2),
      inset 0 -1px 0 rgba(0,0,0,0.1);
  }
  
  /* Hands */
  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: #ffcc80;
    border-radius: 50%;
    top: 2px;
    left: -5px;
    box-shadow: 
      22px 0 0 #ffcc80;
  }
`;

const PlayerLegs = styled.div`
  position: absolute;
  width: 14px;
  height: 8px;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  
  /* Pants */
  &::before {
    content: '';
    position: absolute;
    width: 14px;
    height: 5px;
    background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
    border-radius: 0 0 2px 2px;
    top: 0;
    left: 0;
  }
  
  /* Shoes */
  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 4px;
    background: #3e2723;
    border-radius: 2px;
    top: 4px;
    left: 0;
    box-shadow: 8px 0 0 #3e2723;
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
  padding: 12px 24px;
  background: linear-gradient(180deg, rgba(101, 67, 33, 0.95) 0%, rgba(80, 50, 25, 0.95) 100%);
  border: 3px solid rgba(139, 90, 43, 0.8);
  border-radius: 12px;
  color: #fff8e1;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 150;
  box-shadow: 
    0 4px 12px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.1);
`;

const KeyHint = styled.span`
  padding: 4px 10px;
  background: linear-gradient(180deg, #8b6914 0%, #6d5410 100%);
  border: 2px solid #5d4410;
  border-radius: 6px;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
`;

const StateIndicator = styled(motion.div)`
  position: fixed;
  top: 140px;
  left: 50%;
  z-index: 150;
`;

const WaitingText = styled.div`
  padding: 12px 24px;
  background: linear-gradient(180deg, rgba(101, 67, 33, 0.95) 0%, rgba(80, 50, 25, 0.95) 100%);
  border: 3px solid rgba(139, 90, 43, 0.8);
  border-radius: 12px;
  color: #fff8e1;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  
  /* Animated dots */
  &::after {
    content: '...';
    animation: ${pulse} 1s ease-in-out infinite;
  }
`;

const CatchText = styled.div`
  padding: 14px 28px;
  background: linear-gradient(180deg, #ff5252 0%, #d32f2f 100%);
  border: 3px solid #b71c1c;
  border-radius: 12px;
  color: white;
  font-size: 20px;
  font-weight: 800;
  animation: ${pulse} 0.25s ease-in-out infinite;
  box-shadow: 
    0 0 30px rgba(255, 82, 82, 0.6),
    0 4px 12px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.3);
  text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  letter-spacing: 1px;
`;

const ResultPopup = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 32px;
  background: ${props => props.$success 
    ? 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)' 
    : 'linear-gradient(180deg, #ef5350 0%, #d32f2f 100%)'};
  border: 4px solid ${props => props.$success ? '#2e7d32' : '#b71c1c'};
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 2px 0 rgba(255,255,255,0.2);
  z-index: 200;
`;

const ResultEmoji = styled.div`
  font-size: 56px;
  filter: drop-shadow(3px 3px 4px rgba(0,0,0,0.3));
`;

const ResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ResultTitle = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: white;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
`;

const ResultFishName = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${props => props.$rarity === 'legendary' ? '#ffd700' : 
                    props.$rarity === 'epic' ? '#e1bee7' :
                    props.$rarity === 'rare' ? '#bbdefb' :
                    props.$rarity === 'uncommon' ? '#c8e6c9' : '#f5f5f5'};
  text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
`;

const ResultReward = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: #fff9c4;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  
  &::before {
    content: '+ ';
  }
`;

// Mobile Controls - Stardew style
const MobileControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  padding-bottom: calc(${theme.spacing.lg} + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, rgba(80, 50, 25, 0.9) 0%, rgba(60, 35, 15, 0.95) 100%);
  border-top: 3px solid rgba(139, 90, 43, 0.6);
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const DPad = styled.div`
  position: relative;
  width: 130px;
  height: 130px;
  
  /* Center decoration */
  &::before {
    content: '';
    position: absolute;
    top: 45px;
    left: 45px;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #5d4037 0%, #4e342e 100%);
    border-radius: 8px;
    border: 2px solid #3e2723;
  }
`;

const DPadButton = styled.button`
  position: absolute;
  width: 44px;
  height: 44px;
  background: linear-gradient(180deg, #8b6914 0%, #6d5410 100%);
  border: 2px solid #5d4410;
  border-radius: 10px;
  color: #fff8e1;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.2),
    0 3px 6px rgba(0,0,0,0.4);
  transition: all 0.1s;
  
  ${props => {
    switch (props.$position) {
      case 'up': return css`top: 0; left: 43px;`;
      case 'down': return css`bottom: 0; left: 43px;`;
      case 'left': return css`top: 43px; left: 0;`;
      case 'right': return css`top: 43px; right: 0;`;
      default: return '';
    }
  }}
  
  &:active {
    background: linear-gradient(180deg, #a67c20 0%, #8b6914 100%);
    transform: scale(0.95);
    box-shadow: 
      inset 0 2px 4px rgba(0,0,0,0.3),
      0 1px 2px rgba(0,0,0,0.3);
  }
`;

const ActionButton = styled(motion.button)`
  width: 85px;
  height: 85px;
  border-radius: 50%;
  font-size: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => {
    if (props.$state === GAME_STATES.FISH_APPEARED) return 'linear-gradient(180deg, #ff5252 0%, #d32f2f 100%)';
    if (props.$canFish) return 'linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%)';
    return 'linear-gradient(180deg, #8b6914 0%, #6d5410 100%)';
  }};
  
  border: 3px solid ${props => {
    if (props.$state === GAME_STATES.FISH_APPEARED) return '#b71c1c';
    if (props.$canFish) return '#1565c0';
    return '#5d4410';
  }};
  
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    0 4px 8px rgba(0,0,0,0.4);
  
  ${props => props.$state === GAME_STATES.FISH_APPEARED && css`
    animation: ${pulse} 0.3s ease-in-out infinite;
    box-shadow: 
      inset 0 2px 0 rgba(255,255,255,0.3),
      0 0 20px rgba(255, 82, 82, 0.6),
      0 4px 8px rgba(0,0,0,0.4);
  `}
  
  &:disabled {
    opacity: 0.5;
  }
`;

const Notification = styled(motion.div)`
  position: fixed;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 700;
  z-index: 1000;
  background: ${props => props.$type === 'error' 
    ? 'linear-gradient(180deg, #ef5350 0%, #d32f2f 100%)' 
    : 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)'};
  border: 3px solid ${props => props.$type === 'error' ? '#b71c1c' : '#2e7d32'};
  color: white;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  box-shadow: 
    0 4px 16px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.2);
`;

// Help Modal - Stardew style
const HelpModalContent = styled(ModalContent)`
  max-width: 520px;
  background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
  border: 4px solid #8b6914;
  box-shadow: 
    0 8px 32px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.1);
`;

const HelpSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 2px solid rgba(139, 90, 43, 0.4);
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const HelpTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 ${theme.spacing.sm};
  color: #fff8e1;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
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
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
  border-radius: 10px;
  border: 2px solid ${props => RARITY_COLORS[props.$rarity] || '#666'}40;
  border-left: 4px solid ${props => RARITY_COLORS[props.$rarity] || '#666'};
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255,255,255,0.12);
    transform: translateX(4px);
  }
`;

const FishRarity = styled.span`
  font-weight: 700;
  color: ${props => RARITY_COLORS[props.$rarity] || '#fff8e1'};
  min-width: 85px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
`;

const FishReward = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #ffc107;
  flex: 1;
`;

const FishDifficulty = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  background: linear-gradient(180deg, rgba(139,90,43,0.6) 0%, rgba(100,65,30,0.6) 100%);
  border: 1px solid rgba(139,90,43,0.6);
  border-radius: 6px;
  color: #fff8e1;
`;

// Leaderboard Modal Styles - Stardew style
const LeaderboardModalContent = styled(ModalContent)`
  max-width: 520px;
  max-height: 80vh;
  background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
  border: 4px solid #8b6914;
  box-shadow: 
    0 8px 32px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.1);
`;

const YourRankSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: ${theme.spacing.lg};
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.08) 100%);
  border-radius: 14px;
  margin-bottom: ${theme.spacing.lg};
  border: 3px solid rgba(255, 193, 7, 0.4);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);
`;

const YourRankLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255, 248, 225, 0.7);
  font-weight: 600;
`;

const YourRankValue = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 36px;
  font-weight: 800;
  color: ${props => props.$canAutofish ? '#ffd700' : '#fff8e1'};
  text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
`;

const AutofishUnlockStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: ${props => props.$unlocked 
    ? 'linear-gradient(180deg, rgba(102, 187, 106, 0.3) 0%, rgba(67, 160, 71, 0.2) 100%)' 
    : 'rgba(0, 0, 0, 0.3)'};
  border: 2px solid ${props => props.$unlocked ? 'rgba(102, 187, 106, 0.5)' : 'rgba(139, 90, 43, 0.4)'};
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$unlocked ? '#a5d6a7' : 'rgba(255, 248, 225, 0.7)'};
`;

const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.2);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.6);
    border-radius: 4px;
  }
`;

const LeaderboardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.$isYou 
    ? 'linear-gradient(180deg, rgba(66, 165, 245, 0.25) 0%, rgba(30, 136, 229, 0.2) 100%)' 
    : 'rgba(0, 0, 0, 0.2)'};
  border-radius: 10px;
  border: 2px solid ${props => props.$isYou ? 'rgba(66, 165, 245, 0.5)' : 'rgba(139, 90, 43, 0.3)'};
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }
`;

const LeaderboardRank = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$rank <= 3 ? '20px' : '14px'};
  font-weight: 800;
  color: ${props => props.$rank <= 3 ? 'inherit' : 'rgba(255, 248, 225, 0.6)'};
  background: ${props => props.$rank <= 3 ? 'none' : 'rgba(0,0,0,0.2)'};
  border-radius: ${props => props.$rank <= 3 ? '0' : '8px'};
`;

const LeaderboardName = styled.div`
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: #fff8e1;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
`;

const LeaderboardPoints = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #ffc107;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
`;

const AutofishBadge = styled.div`
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(102, 187, 106, 0.4) 0%, rgba(67, 160, 71, 0.3) 100%);
  border: 2px solid rgba(102, 187, 106, 0.5);
  border-radius: 50%;
  color: #a5d6a7;
  font-size: 14px;
`;

export default FishingPage;
