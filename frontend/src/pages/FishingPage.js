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
  common: '#a0a0a0',
  uncommon: '#5fcf65',
  rare: '#5b9ee1',
  epic: '#c77dff',
  legendary: '#ffc53d'
};

const FishingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const canvasContainerRef = useRef(null);
  const movePlayerRef = useRef(null);
  
  // Player state
  const [playerPos, setPlayerPos] = useState({ x: 10, y: 8 });
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
  
  // Time of day
  const [timeOfDay, setTimeOfDay] = useState(TIME_PERIODS.DAY);
  
  // Initialize the game engine
  const { movePlayer } = useFishingEngine({
    containerRef: canvasContainerRef,
    playerPos,
    setPlayerPos,
    playerDir,
    setPlayerDir,
    gameState,
    timeOfDay,
    onCanFishChange: setCanFish
  });
  
  // Keep ref updated to avoid stale closures in keyboard handler
  useEffect(() => {
    movePlayerRef.current = movePlayer;
  }, [movePlayer]);
  
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
  
  // Day/night cycle
  useEffect(() => {
    const periods = [TIME_PERIODS.DAWN, TIME_PERIODS.DAY, TIME_PERIODS.DAY, TIME_PERIODS.DUSK, TIME_PERIODS.NIGHT, TIME_PERIODS.NIGHT];
    let idx = 1;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % periods.length;
      setTimeOfDay(periods[idx]);
    }, 120000);
    
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
  
  // Autofishing loop
  useEffect(() => {
    if (isAutofishing && rankData?.canAutofish) {
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
          
          setAutofishLog(prev => [{
            fish: result.fish,
            success: result.success,
            reward: result.reward,
            timestamp: Date.now()
          }, ...prev].slice(0, 10));
          
        } catch (err) {
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
      }
    };
  }, [isAutofishing, rankData, setUser, t]);
  
  // Auto-cleanup old autofish bubbles
  useEffect(() => {
    if (autofishLog.length === 0) return;
    const timer = setTimeout(() => {
      setAutofishLog(prev => prev.filter(e => Date.now() - e.timestamp < 4000));
    }, 500);
    return () => clearTimeout(timer);
  }, [autofishLog]);
  
  // Refs for keyboard handler to avoid stale closures
  const gameStateRef = useRef(gameState);
  const canFishRef = useRef(canFish);
  const startFishingRef = useRef(null);
  const handleCatchRef = useRef(null);
  
  useEffect(() => {
    gameStateRef.current = gameState;
    canFishRef.current = canFish;
  }, [gameState, canFish]);
  
  // Keyboard controls - use refs to avoid stale closures
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
          {rankData?.canAutofish && (
            <AutofishButton onClick={toggleAutofish} $active={isAutofishing}>
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
      
      {/* Autofish bubbles */}
      <AutofishBubblesContainer>
        <AnimatePresence mode="popLayout">
          {autofishLog.slice(0, 6).map((entry) => (
            <AutofishBubble
              key={entry.timestamp}
              $success={entry.success}
              $rarity={entry.fish?.rarity}
              initial={{ opacity: 0, x: 80, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.8 }}
              layout
            >
              <BubbleEmoji>{entry.fish?.emoji}</BubbleEmoji>
              <BubbleContent>
                <BubbleFishName $rarity={entry.fish?.rarity}>{entry.fish?.name}</BubbleFishName>
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
      
      {/* Game Canvas */}
      <GameContainer>
        <CanvasWrapper ref={canvasContainerRef} />
        
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
              <WaitingText>{t('fishing.waitingForBite')}...</WaitingText>
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
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
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
      </GameContainer>
      
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
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
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
            <HelpModal
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <Heading2>{t('fishing.howToFish')}</Heading2>
                <IconButton onClick={() => setShowHelp(false)}><MdClose /></IconButton>
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
                      if (!acc.find(f => f.rarity === fish.rarity)) acc.push(fish);
                      return acc;
                    }, []).map(fish => (
                      <FishItem key={fish.rarity} $rarity={fish.rarity}>
                        <span>{fish.emoji}</span>
                        <FishRarity $rarity={fish.rarity}>
                          {fish.rarity.charAt(0).toUpperCase() + fish.rarity.slice(1)}
                        </FishRarity>
                        <FishReward>{fish.minReward}-{fish.maxReward} 🪙</FishReward>
                      </FishItem>
                    ))}
                  </FishList>
                </HelpSection>
              </ModalBody>
            </HelpModal>
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
            <LeaderboardModal
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <Heading2>
                  <FaTrophy style={{ color: '#ffd700', marginRight: '8px' }} />
                  {t('fishing.leaderboard')}
                </Heading2>
                <IconButton onClick={() => setShowLeaderboard(false)}><MdClose /></IconButton>
              </ModalHeader>
              <ModalBody>
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
                        <><MdAutorenew style={{ color: '#30d158' }} /><span>{t('fishing.autofishUnlocked')}</span></>
                      ) : (
                        <><span>🔒</span><span>{t('fishing.autofishLocked', { rank: rankData.requiredRank })}</span></>
                      )}
                    </AutofishUnlockStatus>
                  </YourRankSection>
                )}
                
                <LeaderboardList>
                  {leaderboard.map((player) => (
                    <LeaderboardItem key={player.username} $isYou={rankData?.rank === player.rank}>
                      <LeaderboardRank $rank={player.rank}>
                        {player.rank <= 3 ? (
                          <FaCrown style={{ color: player.rank === 1 ? '#ffd700' : player.rank === 2 ? '#c0c0c0' : '#cd7f32' }} />
                        ) : `#${player.rank}`}
                      </LeaderboardRank>
                      <LeaderboardName>{player.username}</LeaderboardName>
                      <LeaderboardPoints>
                        <span>🪙</span>
                        <span>{player.points.toLocaleString()}</span>
                      </LeaderboardPoints>
                      {player.hasAutofish && (
                        <AutofishBadge><MdAutorenew /></AutofishBadge>
                      )}
                    </LeaderboardItem>
                  ))}
                </LeaderboardList>
              </ModalBody>
            </LeaderboardModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

// ==================== ANIMATIONS ====================

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ==================== STYLED COMPONENTS ====================

const getTimeGradient = (timeOfDay) => {
  switch (timeOfDay) {
    case 'dawn': return 'linear-gradient(180deg, #ffb347 0%, #87ceeb 100%)';
    case 'dusk': return 'linear-gradient(180deg, #ff6b6b 0%, #4a69bd 100%)';
    case 'night': return 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)';
    default: return 'linear-gradient(180deg, #87CEEB 0%, #98D8C8 100%)';
  }
};

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${props => getTimeGradient(props.$timeOfDay)};
  font-family: ${theme.fonts.primary};
  user-select: none;
  overflow: hidden;
  transition: background 3s ease;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: linear-gradient(180deg, rgba(101, 67, 33, 0.95) 0%, rgba(80, 50, 25, 0.9) 100%);
  border-bottom: 3px solid rgba(60, 40, 20, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 100;
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
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3);
  
  &:hover {
    background: linear-gradient(180deg, #a67c20 0%, #8b6914 100%);
    transform: translateY(-1px);
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
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
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
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3);
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
  
  &:hover {
    background: linear-gradient(180deg, #a67c20 0%, #8b6914 100%);
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
  
  &:hover { transform: translateY(-1px); }
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
  
  svg.spinning { animation: ${spin} 1s linear infinite; }
`;

const AutofishBubblesContainer = styled.div`
  position: fixed;
  bottom: 140px;
  right: 16px;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  z-index: 500;
  pointer-events: none;
  
  @media (max-width: 768px) { bottom: 200px; right: 12px; }
`;

const AutofishBubble = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-width: 180px;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
`;

const BubbleEmoji = styled.div`
  font-size: 32px;
  filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.3));
`;

const BubbleContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const BubbleFishName = styled.div`
  font-size: 14px;
  font-weight: 700;
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
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: linear-gradient(180deg, rgba(80, 50, 25, 0.9) 0%, rgba(60, 35, 15, 0.85) 100%);
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
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #fff8e1;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
`;

const StatLabel = styled.span`
  font-size: 9px;
  color: rgba(255, 248, 225, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatDivider = styled.div`
  width: 2px;
  height: 28px;
  background: linear-gradient(180deg, transparent, rgba(139, 90, 43, 0.6), transparent);
`;

const GameContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: ${theme.spacing.md};
  min-height: 0;
  overflow: hidden;
`;

const CanvasWrapper = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 8px 40px rgba(0, 0, 0, 0.2),
    inset 0 0 0 3px rgba(101, 67, 33, 0.9);
  flex-shrink: 0;
  
  /* Fixed size based on map dimensions */
  width: ${MAP_WIDTH * TILE_SIZE}px;
  height: ${MAP_HEIGHT * TILE_SIZE}px;
  
  canvas {
    display: block;
    image-rendering: pixelated;
    width: 100% !important;
    height: 100% !important;
  }
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  z-index: 150;
  
  @media (max-width: 768px) {
    bottom: 180px;
  }
`;

const KeyHint = styled.span`
  padding: 4px 10px;
  background: linear-gradient(180deg, #8b6914 0%, #6d5410 100%);
  border: 2px solid #5d4410;
  border-radius: 6px;
  font-weight: 700;
`;

const StateIndicator = styled(motion.div)`
  position: fixed;
  top: 150px;
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
  box-shadow: 0 0 30px rgba(255, 82, 82, 0.6);
  text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
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
`;

// Mobile Controls
const MobileControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  padding-bottom: calc(${theme.spacing.lg} + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, rgba(80, 50, 25, 0.95) 0%, rgba(60, 35, 15, 0.95) 100%);
  border-top: 3px solid rgba(139, 90, 43, 0.6);
  
  @media (min-width: 768px) { display: none; }
`;

const DPad = styled.div`
  position: relative;
  width: 130px;
  height: 130px;
  
  &::before {
    content: '';
    position: absolute;
    top: 45px;
    left: 45px;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #5d4037 0%, #4e342e 100%);
    border-radius: 8px;
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
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 3px 6px rgba(0,0,0,0.4);
  
  ${props => {
    switch (props.$position) {
      case 'up': return 'top: 0; left: 43px;';
      case 'down': return 'bottom: 0; left: 43px;';
      case 'left': return 'top: 43px; left: 0;';
      case 'right': return 'top: 43px; right: 0;';
      default: return '';
    }
  }}
  
  &:active {
    background: linear-gradient(180deg, #a67c20 0%, #8b6914 100%);
    transform: scale(0.95);
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
  background: ${props => {
    if (props.$state === 'fish_appeared') return 'linear-gradient(180deg, #ff5252 0%, #d32f2f 100%)';
    if (props.$canFish) return 'linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%)';
    return 'linear-gradient(180deg, #8b6914 0%, #6d5410 100%)';
  }};
  border: 3px solid ${props => {
    if (props.$state === 'fish_appeared') return '#b71c1c';
    if (props.$canFish) return '#1565c0';
    return '#5d4410';
  }};
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.4);
  
  ${props => props.$state === 'fish_appeared' && css`animation: ${pulse} 0.3s ease-in-out infinite;`}
  
  &:disabled { opacity: 0.5; }
`;

const Notification = styled(motion.div)`
  position: fixed;
  top: 120px;
  left: 50%;
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 700;
  z-index: 1000;
  background: ${props => props.$type === 'error' 
    ? 'linear-gradient(180deg, #ef5350 0%, #d32f2f 100%)' 
    : 'linear-gradient(180deg, #66bb6a 0%, #43a047 100%)'};
  border: 3px solid ${props => props.$type === 'error' ? '#b71c1c' : '#2e7d32'};
  color: white;
`;

// Modal Styles
const HelpModal = styled(ModalContent)`
  max-width: 520px;
  background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
  border: 4px solid #8b6914;
`;

const HelpSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  
  &:last-child { margin-bottom: 0; }
`;

const HelpTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 ${theme.spacing.sm};
  color: #fff8e1;
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
  background: rgba(255,255,255,0.08);
  border-radius: 10px;
  border-left: 4px solid ${props => RARITY_COLORS[props.$rarity] || '#666'};
`;

const FishRarity = styled.span`
  font-weight: 700;
  color: ${props => RARITY_COLORS[props.$rarity] || '#fff8e1'};
  min-width: 85px;
`;

const FishReward = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #ffc107;
`;

const LeaderboardModal = styled(ModalContent)`
  max-width: 520px;
  max-height: 80vh;
  background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
  border: 4px solid #8b6914;
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
`;

const YourRankLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255, 248, 225, 0.7);
`;

const YourRankValue = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 36px;
  font-weight: 800;
  color: ${props => props.$canAutofish ? '#ffd700' : '#fff8e1'};
`;

const AutofishUnlockStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: ${props => props.$unlocked 
    ? 'linear-gradient(180deg, rgba(102, 187, 106, 0.3) 0%, rgba(67, 160, 71, 0.2) 100%)' 
    : 'rgba(0, 0, 0, 0.3)'};
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
  
  &::-webkit-scrollbar {
    width: 8px;
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
  border: 2px solid ${props => props.$isYou ? 'rgba(66, 165, 245, 0.5)' : 'transparent'};
`;

const LeaderboardRank = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$rank <= 3 ? '20px' : '14px'};
  font-weight: 800;
  color: rgba(255, 248, 225, 0.6);
`;

const LeaderboardName = styled.div`
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: #fff8e1;
`;

const LeaderboardPoints = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #ffc107;
`;

const AutofishBadge = styled.div`
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 187, 106, 0.4);
  border-radius: 50%;
  color: #a5d6a7;
  font-size: 14px;
`;

export default FishingPage;
