import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowBack, MdHelpOutline, MdClose } from 'react-icons/md';
import { FaFish, FaWater } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { theme, ModalOverlay, ModalContent, ModalHeader, ModalBody, Heading2, Text, IconButton, motionVariants } from '../styles/DesignSystem';

// Game states
const GAME_STATES = {
  IDLE: 'idle',
  CASTING: 'casting',
  WAITING: 'waiting',
  FISH_APPEARED: 'fish_appeared',
  CATCHING: 'catching',
  SUCCESS: 'success',
  FAILURE: 'failure'
};

// Rarity colors
const RARITY_COLORS = {
  common: '#8e8e93',
  uncommon: '#30d158',
  rare: '#0a84ff',
  epic: '#bf5af2',
  legendary: '#ff9f0a'
};

const RARITY_GLOW = {
  common: 'rgba(142, 142, 147, 0.4)',
  uncommon: 'rgba(48, 209, 88, 0.4)',
  rare: 'rgba(10, 132, 255, 0.4)',
  epic: 'rgba(191, 90, 242, 0.4)',
  legendary: 'rgba(255, 159, 10, 0.5)'
};

const FishingPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  
  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [sessionId, setSessionId] = useState(null);
  const [currentFish, setCurrentFish] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [fishInfo, setFishInfo] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState(null);
  
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
  
  // Fetch fish info on mount
  useEffect(() => {
    const fetchFishInfo = async () => {
      try {
        const response = await api.get('/fishing/info');
        setFishInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch fish info:', err);
      }
    };
    fetchFishInfo();
    
    return () => {
      // Cleanup timeouts on unmount
      if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
      if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
    };
  }, []);
  
  // Cast the line
  const castLine = useCallback(async () => {
    if (gameState !== GAME_STATES.IDLE) return;
    
    setError(null);
    setGameState(GAME_STATES.CASTING);
    setLastResult(null);
    
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
          
          // Set a timeout for missing the fish (based on worst case timing window + buffer)
          missTimeoutRef.current = setTimeout(() => {
            handleMiss(newSessionId);
          }, 2500); // 2.5 seconds max to react
          
        }, waitTime);
        
      }, 800); // Cast animation duration
      
    } catch (err) {
      console.error('Cast error:', err);
      setError(err.response?.data?.error || 'Failed to cast line');
      setGameState(GAME_STATES.IDLE);
    }
  }, [gameState]);
  
  // Handle catching the fish
  const handleCatch = useCallback(async () => {
    if (gameState !== GAME_STATES.FISH_APPEARED || !sessionId) return;
    
    // Clear the miss timeout
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
        refreshUser();
      } else {
        setGameState(GAME_STATES.FAILURE);
      }
      
      // Return to idle after showing result
      setTimeout(() => {
        setGameState(GAME_STATES.IDLE);
        setSessionId(null);
        setCurrentFish(null);
      }, 2500);
      
    } catch (err) {
      console.error('Catch error:', err);
      setError(err.response?.data?.error || 'Failed to catch fish');
      setGameState(GAME_STATES.IDLE);
      setSessionId(null);
    }
  }, [gameState, sessionId, refreshUser]);
  
  // Handle missing the fish (timeout)
  const handleMiss = useCallback(async (sid) => {
    if (gameState !== GAME_STATES.FISH_APPEARED) return;
    
    try {
      const response = await api.post('/fishing/catch', {
        sessionId: sid,
        reactionTime: undefined // Indicates a miss
      });
      
      setCurrentFish(response.data.fish);
      setLastResult(response.data);
      setGameState(GAME_STATES.FAILURE);
      
      setTimeout(() => {
        setGameState(GAME_STATES.IDLE);
        setSessionId(null);
        setCurrentFish(null);
      }, 2500);
      
    } catch (err) {
      console.error('Miss handling error:', err);
      setGameState(GAME_STATES.IDLE);
      setSessionId(null);
    }
  }, [gameState]);
  
  // Keyboard support for catching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === GAME_STATES.IDLE) {
          castLine();
        } else if (gameState === GAME_STATES.FISH_APPEARED) {
          handleCatch();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, castLine, handleCatch]);
  
  const getStatusMessage = () => {
    switch (gameState) {
      case GAME_STATES.IDLE:
        return 'Press SPACE or tap to cast your line';
      case GAME_STATES.CASTING:
        return 'Casting...';
      case GAME_STATES.WAITING:
        return 'Waiting for a bite...';
      case GAME_STATES.FISH_APPEARED:
        return '🎣 CATCH IT NOW!';
      case GAME_STATES.CATCHING:
        return 'Reeling in...';
      case GAME_STATES.SUCCESS:
        return `Caught a ${currentFish?.name}!`;
      case GAME_STATES.FAILURE:
        return `The ${currentFish?.name || 'fish'} got away!`;
      default:
        return '';
    }
  };
  
  return (
    <PageContainer>
      {/* Background layers */}
      <SkyGradient />
      <Stars />
      <WaterContainer>
        <WaterSurface />
        <WaterDeep />
        <Bubbles />
      </WaterContainer>
      
      {/* Header */}
      <Header>
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack />
        </BackButton>
        <HeaderTitle>
          <FaFish style={{ color: '#4fc3f7' }} />
          <span>Fishing Cove</span>
        </HeaderTitle>
        <HeaderRight>
          <PointsDisplay>
            <span>🪙</span>
            <span>{user?.points || 0}</span>
          </PointsDisplay>
          <HelpButton onClick={() => setShowHelp(true)}>
            <MdHelpOutline />
          </HelpButton>
        </HeaderRight>
      </Header>
      
      {/* Session Stats */}
      <StatsBar>
        <StatItem>
          <StatValue>{sessionStats.casts}</StatValue>
          <StatLabel>Casts</StatLabel>
        </StatItem>
        <StatDivider />
        <StatItem>
          <StatValue>{sessionStats.catches}</StatValue>
          <StatLabel>Catches</StatLabel>
        </StatItem>
        <StatDivider />
        <StatItem>
          <StatValue>+{sessionStats.totalEarned}</StatValue>
          <StatLabel>Earned</StatLabel>
        </StatItem>
        {sessionStats.bestCatch && (
          <>
            <StatDivider />
            <StatItem>
              <StatValue style={{ color: RARITY_COLORS[sessionStats.bestCatch.fish.rarity] }}>
                {sessionStats.bestCatch.fish.emoji}
              </StatValue>
              <StatLabel>Best</StatLabel>
            </StatItem>
          </>
        )}
      </StatsBar>
      
      {/* Main Game Area */}
      <GameArea onClick={() => {
        if (gameState === GAME_STATES.IDLE) castLine();
        else if (gameState === GAME_STATES.FISH_APPEARED) handleCatch();
      }}>
        {/* Fishing Rod */}
        <FishingRod $state={gameState}>
          <RodHandle />
          <RodPole />
          <FishingLine $state={gameState} />
          <Bobber $state={gameState} />
        </FishingRod>
        
        {/* Fish Appearance */}
        <AnimatePresence>
          {gameState === GAME_STATES.FISH_APPEARED && (
            <FishAlert
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <AlertRing />
              <AlertText>!</AlertText>
            </FishAlert>
          )}
        </AnimatePresence>
        
        {/* Result Display */}
        <AnimatePresence>
          {(gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE) && lastResult && (
            <ResultOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ResultCard
                $success={lastResult.success}
                $rarity={lastResult.fish?.rarity}
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.5, y: 50 }}
              >
                <ResultEmoji $success={lastResult.success}>
                  {lastResult.fish?.emoji || '🐟'}
                </ResultEmoji>
                <ResultTitle $success={lastResult.success}>
                  {lastResult.success ? 'Caught!' : 'Escaped!'}
                </ResultTitle>
                <ResultFishName $rarity={lastResult.fish?.rarity}>
                  {lastResult.fish?.name}
                </ResultFishName>
                {lastResult.success && (
                  <ResultReward
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    +{lastResult.reward} 🪙
                  </ResultReward>
                )}
                {!lastResult.success && lastResult.reactionTime && (
                  <ResultTiming>
                    {lastResult.reactionTime}ms / {lastResult.timingWindow}ms needed
                  </ResultTiming>
                )}
              </ResultCard>
            </ResultOverlay>
          )}
        </AnimatePresence>
        
        {/* Status Message */}
        <StatusContainer>
          <StatusMessage $state={gameState}>
            {getStatusMessage()}
          </StatusMessage>
          {gameState === GAME_STATES.IDLE && (
            <CastHint>Click anywhere or press SPACE</CastHint>
          )}
        </StatusContainer>
        
        {/* Error Display */}
        {error && (
          <ErrorMessage
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </ErrorMessage>
        )}
      </GameArea>
      
      {/* Cast Button (Mobile-friendly) */}
      <CastButtonContainer>
        <CastButton
          onClick={() => {
            if (gameState === GAME_STATES.IDLE) castLine();
            else if (gameState === GAME_STATES.FISH_APPEARED) handleCatch();
          }}
          disabled={![GAME_STATES.IDLE, GAME_STATES.FISH_APPEARED].includes(gameState)}
          $state={gameState}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {gameState === GAME_STATES.IDLE && (
            <>
              <FaWater />
              <span>Cast Line</span>
            </>
          )}
          {gameState === GAME_STATES.CASTING && <span>Casting...</span>}
          {gameState === GAME_STATES.WAITING && (
            <>
              <WaitingDots />
              <span>Waiting</span>
            </>
          )}
          {gameState === GAME_STATES.FISH_APPEARED && (
            <CatchNow>
              <span>CATCH!</span>
            </CatchNow>
          )}
          {gameState === GAME_STATES.CATCHING && <span>Reeling...</span>}
          {(gameState === GAME_STATES.SUCCESS || gameState === GAME_STATES.FAILURE) && (
            <span>{gameState === GAME_STATES.SUCCESS ? '✓' : '✗'}</span>
          )}
        </CastButton>
      </CastButtonContainer>
      
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
                <Heading2>How to Fish</Heading2>
                <IconButton onClick={() => setShowHelp(false)}>
                  <MdClose />
                </IconButton>
              </ModalHeader>
              <ModalBody>
                <HelpSection>
                  <HelpTitle>🎣 Casting</HelpTitle>
                  <Text secondary>Press SPACE, click, or tap the button to cast your line into the water.</Text>
                </HelpSection>
                <HelpSection>
                  <HelpTitle>⏳ Waiting</HelpTitle>
                  <Text secondary>Wait patiently for a fish to bite. This can take 1-6 seconds.</Text>
                </HelpSection>
                <HelpSection>
                  <HelpTitle>⚡ Catching</HelpTitle>
                  <Text secondary>When you see the alert, react quickly! Click/tap or press SPACE to catch the fish. Rarer fish require faster reactions!</Text>
                </HelpSection>
                <HelpSection>
                  <HelpTitle>🐟 Fish Rarities</HelpTitle>
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
    </PageContainer>
  );
};

// ==================== ANIMATIONS ====================

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const bobFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-8px) rotate(5deg); }
`;

const splash = keyframes`
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
`;

const alertPulse = keyframes`
  0% { transform: scale(0.8); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(0.8); opacity: 1; }
`;

const ringExpand = keyframes`
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const wave = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const bubbleRise = keyframes`
  0% { transform: translateY(100%) scale(0); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.4; }
  100% { transform: translateY(-100%) scale(1); opacity: 0; }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const catchFlash = keyframes`
  0%, 100% { background: linear-gradient(135deg, #ff6b6b, #ffa502); }
  50% { background: linear-gradient(135deg, #ffa502, #ff6b6b); }
`;

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: ${theme.fonts.primary};
  user-select: none;
`;

const SkyGradient = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    #0f0c29 0%,
    #302b63 30%,
    #24243e 60%,
    #1a1a3e 100%
  );
  z-index: 0;
`;

const Stars = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  z-index: 1;
  
  &::before, &::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    background: white;
    border-radius: 50%;
    box-shadow:
      10vw 5vh 0 0 rgba(255,255,255,0.8),
      25vw 15vh 0 0 rgba(255,255,255,0.6),
      40vw 8vh 0 0 rgba(255,255,255,0.9),
      55vw 20vh 0 0 rgba(255,255,255,0.5),
      70vw 12vh 0 0 rgba(255,255,255,0.7),
      85vw 3vh 0 0 rgba(255,255,255,0.8),
      15vw 25vh 0 0 rgba(255,255,255,0.6),
      35vw 30vh 0 0 rgba(255,255,255,0.4),
      60vw 28vh 0 0 rgba(255,255,255,0.7),
      80vw 18vh 0 0 rgba(255,255,255,0.5),
      5vw 35vh 0 0 rgba(255,255,255,0.6),
      90vw 25vh 0 0 rgba(255,255,255,0.8);
    animation: ${twinkle} 3s ease-in-out infinite;
  }
  
  &::after {
    animation-delay: 1.5s;
    box-shadow:
      8vw 10vh 0 0 rgba(255,255,255,0.7),
      22vw 8vh 0 0 rgba(255,255,255,0.5),
      45vw 22vh 0 0 rgba(255,255,255,0.6),
      62vw 5vh 0 0 rgba(255,255,255,0.8),
      78vw 28vh 0 0 rgba(255,255,255,0.4),
      92vw 15vh 0 0 rgba(255,255,255,0.7);
  }
`;

const WaterContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 55%;
  z-index: 2;
  overflow: hidden;
`;

const WaterSurface = styled.div`
  position: absolute;
  top: 0;
  left: -100%;
  width: 300%;
  height: 60px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0%,
    rgba(79, 195, 247, 0.3) 25%,
    transparent 50%
  );
  background-size: 200px 100%;
  animation: ${wave} 8s linear infinite;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(79, 195, 247, 0.4) 0%,
      transparent 100%
    );
  }
`;

const WaterDeep = styled.div`
  position: absolute;
  top: 30px;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(13, 71, 161, 0.9) 0%,
    rgba(21, 101, 192, 0.85) 30%,
    rgba(13, 71, 161, 0.95) 70%,
    rgba(6, 40, 97, 1) 100%
  );
`;

const Bubbles = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  
  &::before, &::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    animation: ${bubbleRise} 4s ease-in-out infinite;
  }
  
  &::before {
    left: 20%;
    bottom: 0;
    animation-delay: 0s;
  }
  
  &::after {
    left: 60%;
    bottom: 0;
    animation-delay: 2s;
    width: 6px;
    height: 6px;
  }
`;

const Header = styled.header`
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
`;

const BackButton = styled.button`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin: 0;
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
  padding: 8px 16px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: 100px;
  font-weight: 600;
  font-size: 14px;
  color: white;
`;

const HelpButton = styled.button`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const StatsBar = styled.div`
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.2);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: white;
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatDivider = styled.div`
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.2);
`;

const GameArea = styled.div`
  flex: 1;
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const FishingRod = styled.div`
  position: absolute;
  top: 10%;
  right: 15%;
  transform-origin: bottom right;
  transition: transform 0.3s ease;
  
  ${props => props.$state === GAME_STATES.CASTING && css`
    animation: ${keyframes`
      0% { transform: rotate(0deg); }
      50% { transform: rotate(-30deg); }
      100% { transform: rotate(-10deg); }
    `} 0.8s ease-out;
  `}
`;

const RodHandle = styled.div`
  width: 12px;
  height: 40px;
  background: linear-gradient(90deg, #5d4037, #3e2723);
  border-radius: 4px;
  position: absolute;
  bottom: 0;
  right: 0;
`;

const RodPole = styled.div`
  width: 6px;
  height: 120px;
  background: linear-gradient(90deg, #8d6e63, #5d4037);
  border-radius: 3px 3px 0 0;
  position: absolute;
  bottom: 35px;
  right: 3px;
  transform: rotate(-45deg);
  transform-origin: bottom center;
`;

const FishingLine = styled.div`
  position: absolute;
  width: 2px;
  height: ${props => props.$state === GAME_STATES.WAITING || props.$state === GAME_STATES.FISH_APPEARED ? '180px' : '60px'};
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.3));
  top: -60px;
  right: 6px;
  transform: rotate(-45deg);
  transform-origin: top center;
  transition: height 0.5s ease;
`;

const Bobber = styled.div`
  position: absolute;
  width: 16px;
  height: 24px;
  background: linear-gradient(180deg, #ff5252, #b71c1c);
  border-radius: 50% 50% 40% 40%;
  top: ${props => props.$state === GAME_STATES.WAITING || props.$state === GAME_STATES.FISH_APPEARED ? '100px' : '-10px'};
  right: -5px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  transition: top 0.5s ease;
  
  ${props => props.$state === GAME_STATES.WAITING && css`
    animation: ${bobFloat} 2s ease-in-out infinite;
  `}
  
  ${props => props.$state === GAME_STATES.FISH_APPEARED && css`
    animation: ${keyframes`
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25% { transform: translateY(-15px) rotate(-15deg); }
      75% { transform: translateY(-15px) rotate(15deg); }
    `} 0.3s ease-in-out infinite;
  `}
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 4px;
    background: white;
    border-radius: 2px;
  }
`;

const FishAlert = styled(motion.div)`
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AlertRing = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid #ff5252;
  border-radius: 50%;
  animation: ${ringExpand} 0.8s ease-out infinite;
`;

const AlertText = styled.div`
  font-size: 60px;
  font-weight: 900;
  color: #ff5252;
  text-shadow: 0 0 20px rgba(255, 82, 82, 0.8);
  animation: ${alertPulse} 0.4s ease-in-out infinite;
`;

const ResultOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
`;

const ResultCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl};
  background: ${props => props.$success 
    ? `linear-gradient(135deg, rgba(48, 209, 88, 0.2), rgba(0, 0, 0, 0.8))` 
    : `linear-gradient(135deg, rgba(255, 59, 48, 0.2), rgba(0, 0, 0, 0.8))`};
  border: 2px solid ${props => props.$success 
    ? theme.colors.success 
    : theme.colors.error};
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
              0 0 40px ${props => props.$success ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 59, 48, 0.3)'};
`;

const ResultEmoji = styled.div`
  font-size: 64px;
  animation: ${float} 2s ease-in-out infinite;
  filter: ${props => props.$success ? 'none' : 'grayscale(0.5) opacity(0.7)'};
`;

const ResultTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.$success ? theme.colors.success : theme.colors.error};
  margin: 0;
`;

const ResultFishName = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${props => RARITY_COLORS[props.$rarity] || 'white'};
  text-shadow: 0 0 10px ${props => RARITY_GLOW[props.$rarity] || 'transparent'};
`;

const ResultReward = styled(motion.div)`
  font-size: 32px;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
`;

const ResultTiming = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
`;

const StatusContainer = styled.div`
  position: absolute;
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
`;

const StatusMessage = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  margin-bottom: 8px;
  
  ${props => props.$state === GAME_STATES.FISH_APPEARED && css`
    color: #ff5252;
    animation: ${pulse} 0.5s ease-in-out infinite;
    font-size: 32px;
  `}
`;

const CastHint = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
`;

const ErrorMessage = styled(motion.div)`
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(255, 59, 48, 0.9);
  border-radius: 12px;
  color: white;
  font-weight: 500;
`;

const CastButtonContainer = styled.div`
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  padding: ${theme.spacing.xl};
  padding-bottom: calc(${theme.spacing.xl} + env(safe-area-inset-bottom, 0px));
`;

const CastButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 200px;
  padding: 18px 40px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => {
    if (props.$state === GAME_STATES.FISH_APPEARED) return 'linear-gradient(135deg, #ff5252, #ff1744)';
    if (props.$state === GAME_STATES.SUCCESS) return 'linear-gradient(135deg, #30d158, #00c853)';
    if (props.$state === GAME_STATES.FAILURE) return 'linear-gradient(135deg, #666, #444)';
    return 'linear-gradient(135deg, #4fc3f7, #0288d1)';
  }};
  
  box-shadow: ${props => {
    if (props.$state === GAME_STATES.FISH_APPEARED) return '0 8px 30px rgba(255, 82, 82, 0.5)';
    return '0 8px 30px rgba(79, 195, 247, 0.4)';
  }};
  
  ${props => props.$state === GAME_STATES.FISH_APPEARED && css`
    animation: ${catchFlash} 0.3s ease-in-out infinite;
  `}
  
  &:disabled {
    opacity: 0.7;
    cursor: default;
  }
`;

const CatchNow = styled.div`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 2px;
`;

const WaitingDots = styled.div`
  display: flex;
  gap: 4px;
  
  &::before, &::after, & {
    content: '';
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: ${pulse} 1s ease-in-out infinite;
  }
  
  &::before { animation-delay: 0s; }
  & { animation-delay: 0.2s; }
  &::after { animation-delay: 0.4s; }
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

export default FishingPage;

