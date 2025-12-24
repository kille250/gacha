import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaGem, FaTrophy, FaDice } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import { theme } from '../../design-system';
import { isVideo } from '../../utils/mediaUtils';
import { useRarity } from '../../context/RarityContext';

// ==================== RARITY ICON MAPPING ====================
// Icons are React components and can't be stored in database, so we map by order
const getIconByOrder = (order) => {
  if (order >= 5) return <FaTrophy />;
  if (order >= 4) return <FaStar />;
  if (order >= 3) return <FaGem />;
  if (order >= 2) return <FaStar />;
  return <FaDice />;
};

// Fallback config for unknown rarities
const DEFAULT_ANIMATION_CONFIG = {
  color: '#8e8e93',
  accentColor: '#a8a8ad',
  glowIntensity: 0.3,
  buildupTime: 800,
  confettiCount: 0,
  orbCount: 3,
  ringCount: 1
};

// ==================== ANIMATION PHASES ====================

const PHASES = {
  IDLE: 'idle',
  BUILDUP: 'buildup',
  FLASH: 'flash',
  REVEAL: 'reveal',
  COMPLETE: 'complete'
};

// ==================== MAIN COMPONENT ====================

export const SummonAnimation = ({
  isActive,
  rarity = 'common',
  character,
  onComplete,
  skipEnabled = true,
  getImagePath,
  isMultiPull = false,
  currentPull = 1,
  totalPulls = 1,
  onSkipAll,
  ambientRarity = null
}) => {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const timersRef = useRef([]);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false); // Guard against double-click
  
  // Get dynamic rarity configuration from context
  const { getRarityAnimation, getRarityColor, ordered } = useRarity();
  
  const effectRarity = ambientRarity || rarity;
  
  // Get dynamic colors from context (admin-configurable)
  const rarityColor = getRarityColor(rarity);
  const effectRarityColor = getRarityColor(effectRarity);
  
  // Memoize config to prevent unnecessary re-renders
  const config = useMemo(() => {
    const animConfig = getRarityAnimation(rarity);
    const rarityInfo = ordered.find(r => r.name === rarity?.toLowerCase());
    return {
      ...DEFAULT_ANIMATION_CONFIG,
      ...animConfig,
      icon: getIconByOrder(rarityInfo?.order || 1)
    };
  }, [rarity, getRarityAnimation, ordered]);
  
  const ambientConfig = useMemo(() => {
    const animConfig = getRarityAnimation(effectRarity);
    const rarityInfo = ordered.find(r => r.name === effectRarity?.toLowerCase());
    return {
      ...DEFAULT_ANIMATION_CONFIG,
      ...animConfig,
      icon: getIconByOrder(rarityInfo?.order || 1)
    };
  }, [effectRarity, getRarityAnimation, ordered]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  // Fire confetti celebration
  const fireConfetti = useCallback(() => {
    if (ambientConfig.confettiCount === 0) return;
    
    const colors = [ambientConfig.color, ambientConfig.accentColor, '#ffffff'];
    
    // Main burst
    confetti({
      particleCount: ambientConfig.confettiCount,
      spread: 80,
      origin: { y: 0.45, x: 0.5 },
      colors,
      startVelocity: 35,
      gravity: 0.9,
      shapes: ['circle', 'square'],
      scalar: 1.1,
      ticks: 100
    });

    // Side bursts for legendary/epic
    if (effectRarity === 'legendary' || effectRarity === 'epic') {
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 45,
          origin: { x: 0, y: 0.5 },
          colors
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 45,
          origin: { x: 1, y: 0.5 },
          colors
        });
      }, 150);
    }
  }, [ambientConfig, effectRarity]);

  // Start animation sequence
  useEffect(() => {
    if (isActive && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setPhase(PHASES.BUILDUP);
      setShowSkipHint(false);

      // Show skip hint after brief delay
      const skipTimer = setTimeout(() => setShowSkipHint(true), 600);
      timersRef.current.push(skipTimer);

      // Flash phase - the climax
      const flashTimer = setTimeout(() => {
        setPhase(PHASES.FLASH);
        fireConfetti();
      }, ambientConfig.buildupTime);
      timersRef.current.push(flashTimer);

      // Reveal phase
      const revealTimer = setTimeout(() => {
        setPhase(PHASES.REVEAL);
      }, ambientConfig.buildupTime + 300);
      timersRef.current.push(revealTimer);

      // Complete - ready for dismiss
      const completeTimer = setTimeout(() => {
        setPhase(PHASES.COMPLETE);
        setShowSkipHint(false);
      }, ambientConfig.buildupTime + 900);
      timersRef.current.push(completeTimer);
    }
    
    return () => {
      if (!isActive) clearAllTimers();
    };
  }, [isActive, ambientConfig.buildupTime, fireConfetti, clearAllTimers]);

  // Reset when inactive
  useEffect(() => {
    if (!isActive) {
      clearAllTimers();
      setPhase(PHASES.IDLE);
      setShowSkipHint(false);
      hasStartedRef.current = false;
      hasCompletedRef.current = false; // Reset guard for next animation
    }
  }, [isActive, clearAllTimers]);

  // Reset completed guard when character changes (for multi-pull)
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [currentPull]);

  // Handle skip/continue
  const handleInteraction = useCallback((e) => {
    e.stopPropagation();
    
    if (phase === PHASES.COMPLETE) {
      // Guard against double-click
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      onComplete?.();
    } else if (skipEnabled && phase === PHASES.BUILDUP) {
      clearAllTimers();
      setPhase(PHASES.FLASH);
      fireConfetti();
      
      setTimeout(() => setPhase(PHASES.REVEAL), 200);
      const completeTimer = setTimeout(() => {
        setPhase(PHASES.COMPLETE);
        setShowSkipHint(false);
      }, 700);
      timersRef.current.push(completeTimer);
    }
  }, [phase, skipEnabled, onComplete, clearAllTimers, fireConfetti]);

  if (!isActive) return null;

  const isBuildup = phase === PHASES.BUILDUP;
  const isRevealed = phase === PHASES.REVEAL || phase === PHASES.COMPLETE;

  return (
    <Overlay onClick={handleInteraction}>
      <Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Ambient Background Glow */}
        <AmbientGlow $color={effectRarityColor} $phase={phase} />
        
        {/* Vignette overlay */}
        <Vignette />

        {/* Buildup Animation */}
        <AnimatePresence>
          {isBuildup && (
            <BuildupContainer
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.3 }}
            >
              {/* Central Orb */}
              <CentralOrb>
                <OrbCore $color={effectRarityColor} $accentColor={ambientConfig.accentColor} />
                <OrbPulse $color={effectRarityColor} />
                <OrbPulse $color={effectRarityColor} $delay={0.5} />
              </CentralOrb>

              {/* Rotating Rings */}
              {[...Array(ambientConfig.ringCount)].map((_, i) => (
                <Ring 
                  key={i} 
                  $color={effectRarityColor}
                  $index={i}
                  $total={ambientConfig.ringCount}
                />
              ))}

              {/* Floating Orbs */}
              <OrbField>
                {[...Array(ambientConfig.orbCount)].map((_, i) => (
                  <FloatingOrb
                    key={i}
                    $color={effectRarityColor}
                    $index={i}
                    $total={ambientConfig.orbCount}
                  />
                ))}
              </OrbField>

              {/* Rarity Icon */}
              <RarityIconContainer
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, delay: 0.2 }}
                $color={effectRarityColor}
              >
                {ambientConfig.icon}
              </RarityIconContainer>
            </BuildupContainer>
          )}
        </AnimatePresence>

        {/* Flash Effect */}
        <AnimatePresence>
          {phase === PHASES.FLASH && (
            <FlashOverlay
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              $color={effectRarityColor}
            />
          )}
        </AnimatePresence>

        {/* Character Reveal */}
        <AnimatePresence>
          {isRevealed && character && (
            <CardContainer
              initial={{ scale: 0.5, opacity: 0, y: 60, rotateX: 20 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                rotateX: 0,
                transition: {
                  type: "spring",
                  damping: 20,
                  stiffness: 200,
                  mass: 0.8
                }
              }}
              exit={{ scale: 0.9, opacity: 0, y: -30 }}
            >
              <CharacterCard>
                <CardShine />
                <CardImageContainer>
                  {isVideo(character.image) ? (
                    <CardVideo 
                      src={getImagePath(character.image)} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                    />
                  ) : (
                    <CardImage src={getImagePath(character.image)} alt={character.name} />
                  )}
                  <ImageGradient $color={rarityColor} />
                </CardImageContainer>
                
                <CardInfo>
                  <RarityBadge $color={rarityColor}>
                    {config.icon}
                    <span>{rarity.toUpperCase()}</span>
                  </RarityBadge>
                  <CharacterName>{character.name}</CharacterName>
                  <CharacterSeries>{character.series}</CharacterSeries>
                </CardInfo>
                
                <CardGlowBorder $color={rarityColor} />
              </CharacterCard>
            </CardContainer>
          )}
        </AnimatePresence>

        {/* Skip Hint */}
        <AnimatePresence>
          {showSkipHint && skipEnabled && isBuildup && (
            <SkipHint
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              Tap to skip
            </SkipHint>
          )}
        </AnimatePresence>

        {/* Bottom Controls */}
        <BottomArea>
          {/* Multi-pull Progress */}
          {isMultiPull && (
            <ProgressBar>
              <ProgressText>{currentPull} / {totalPulls}</ProgressText>
              <ProgressTrack>
                <ProgressFill style={{ width: `${(currentPull / totalPulls) * 100}%` }} />
              </ProgressTrack>
            </ProgressBar>
          )}
          
          {/* Continue Button */}
          <AnimatePresence>
            {phase === PHASES.COMPLETE && (
              <ContinueButton
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 20 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isMultiPull && currentPull < totalPulls ? 'Next →' : 'Continue'}
              </ContinueButton>
            )}
          </AnimatePresence>

          {/* Skip All for Multi-pull */}
          {isMultiPull && onSkipAll && phase !== PHASES.COMPLETE && (
            <SkipAllBtn 
              onClick={(e) => { e.stopPropagation(); onSkipAll(); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Skip All
            </SkipAllBtn>
          )}
        </BottomArea>
      </Container>
    </Overlay>
  );
};

// ==================== KEYFRAMES ====================

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const rotateReverse = keyframes`
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { 
    transform: scale(1); 
    opacity: 0.6;
  }
  50% { 
    transform: scale(1.8); 
    opacity: 0;
  }
`;

const shimmer = keyframes`
  0% { transform: translateX(-100%) rotate(25deg); }
  100% { transform: translateX(200%) rotate(25deg); }
`;

const orbitPath = keyframes`
  0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
`;

// ==================== STYLED COMPONENTS ====================

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99999;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
`;

const Container = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, 
    rgba(10, 10, 15, 0.98) 0%, 
    rgba(5, 5, 10, 1) 100%
  );
  overflow: hidden;
`;

const AmbientGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 60% at 50% 40%,
    ${props => `${props.$color}${props.$phase === 'buildup' ? '25' : '15'}`} 0%,
    transparent 70%
  );
  transition: all 0.5s ease;
`;

const Vignette = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(0, 0, 0, 0.7) 100%
  );
  pointer-events: none;
`;

// Buildup Elements
const BuildupContainer = styled(motion.div)`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CentralOrb = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
  }
`;

const OrbCore = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    ${props => props.$accentColor || props.$color},
    ${props => props.$color}
  );
  box-shadow: 
    0 0 40px ${props => props.$color}80,
    0 0 80px ${props => props.$color}40,
    inset 0 0 20px rgba(255, 255, 255, 0.3);
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

const OrbPulse = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid ${props => props.$color};
  animation: ${pulseGlow} 1.5s ease-out infinite;
  animation-delay: ${props => props.$delay || 0}s;
`;

const Ring = styled.div`
  position: absolute;
  width: ${props => 180 + props.$index * 60}px;
  height: ${props => 180 + props.$index * 60}px;
  border: 1.5px solid ${props => props.$color}40;
  border-radius: 50%;
  animation: ${props => props.$index % 2 === 0 ? rotate : rotateReverse} ${props => 6 + props.$index * 2}s linear infinite;
  
  &::before {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: ${props => props.$color};
    border-radius: 50%;
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 10px ${props => props.$color};
  }
  
  @media (max-width: 768px) {
    width: ${props => 140 + props.$index * 45}px;
    height: ${props => 140 + props.$index * 45}px;
  }
`;

const OrbField = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const FloatingOrb = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  background: ${props => props.$color};
  border-radius: 50%;
  box-shadow: 0 0 12px ${props => props.$color};
  animation: ${orbitPath} ${props => 3 + (props.$index * 0.5)}s linear infinite;
  animation-delay: ${props => (props.$index / props.$total) * -3}s;
  transform-origin: center center;
  
  @media (max-width: 768px) {
    width: 5px;
    height: 5px;
  }
`;

const RarityIconContainer = styled(motion.div)`
  position: absolute;
  font-size: 28px;
  color: ${props => props.$color};
  filter: drop-shadow(0 0 15px ${props => props.$color});
  
  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

// Flash
const FlashOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: ${props => props.$color};
  pointer-events: none;
`;

// Character Card
const CardContainer = styled(motion.div)`
  position: relative;
  perspective: 1000px;
  z-index: 10;
`;

const CharacterCard = styled.div`
  position: relative;
  width: 300px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(165deg, 
    ${theme.colors.backgroundSecondary} 0%, 
    rgba(20, 20, 28, 1) 100%
  );
  box-shadow: 
    0 25px 60px -12px rgba(0, 0, 0, 0.7),
    0 0 1px 0 rgba(255, 255, 255, 0.1) inset;
  
  @media (max-width: 768px) {
    width: 260px;
  }
`;

const CardShine = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.03) 45%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 55%,
    transparent 100%
  );
  animation: ${shimmer} 4s ease-in-out infinite;
  animation-delay: 1s;
  pointer-events: none;
  z-index: 5;
`;

const CardGlowBorder = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 20px;
  border: 2px solid ${props => props.$color};
  box-shadow: 
    0 0 30px ${props => props.$color}50,
    inset 0 0 30px ${props => props.$color}15;
  pointer-events: none;
`;

const CardImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  
  @media (max-width: 768px) {
    height: 280px;
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImageGradient = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    ${props => props.$color}20 80%,
    rgba(10, 10, 15, 0.95) 100%
  );
  pointer-events: none;
`;

const CardInfo = styled.div`
  padding: 20px 24px 28px;
  text-align: center;
  position: relative;
`;

const RarityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: ${props => props.$color};
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  border-radius: 100px;
  margin-bottom: 14px;
  box-shadow: 0 4px 12px ${props => props.$color}50;
  
  svg {
    font-size: 12px;
  }
`;

const CharacterName = styled.h2`
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
  
  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const CharacterSeries = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  letter-spacing: 0.02em;
`;

// Bottom Controls
const BottomArea = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: max(32px, env(safe-area-inset-bottom, 32px));
  gap: 16px;
  z-index: 20;
  pointer-events: none;
  
  > * {
    pointer-events: auto;
  }
`;

const ProgressBar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const ProgressText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
`;

const ProgressTrack = styled.div`
  width: 140px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const ContinueButton = styled(motion.button)`
  padding: 16px 40px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(88, 86, 214, 0.4);
  letter-spacing: 0.02em;
`;

const SkipAllBtn = styled(motion.button)`
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 100px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.9);
  }
`;

const SkipHint = styled(motion.div)`
  position: absolute;
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  padding: 8px 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 100px;
  backdrop-filter: blur(10px);
  letter-spacing: 0.02em;
`;

// ==================== MULTI-PULL COMPONENT ====================

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const getHighestRarity = (characters) => {
  if (!characters || characters.length === 0) return 'common';
  
  let highestIndex = 0;
  characters.forEach(char => {
    const index = RARITY_ORDER.indexOf(char.rarity);
    if (index > highestIndex) highestIndex = index;
  });
  
  return RARITY_ORDER[highestIndex];
};

export const MultiSummonAnimation = ({
  isActive,
  characters = [],
  onComplete,
  skipEnabled = true,
  getImagePath
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkippedResults, setShowSkippedResults] = useState(false);
  const hasCompletedRef = useRef(false); // Guard against double-click
  
  // Get dynamic rarity colors from context
  const { getRarityColor } = useRarity();
  
  const highestRarity = getHighestRarity(characters);

  useEffect(() => {
    if (!isActive) {
      setCurrentIndex(0);
      setShowSkippedResults(false);
      hasCompletedRef.current = false; // Reset guard for next animation
    }
  }, [isActive]);

  const handleSingleComplete = useCallback(() => {
    if (currentIndex < characters.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Guard against double-click on last character
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      onComplete?.();
    }
  }, [currentIndex, characters.length, onComplete]);

  const handleSkipAll = useCallback(() => {
    setShowSkippedResults(true);
  }, []);

  const handleCloseSkippedResults = useCallback(() => {
    // Guard against double-click
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  const currentCharacter = characters[currentIndex];

  if (!isActive || characters.length === 0) return null;

  if (showSkippedResults) {
    return (
      <ResultsOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleCloseSkippedResults}
      >
        <ResultsContent onClick={e => e.stopPropagation()}>
          <ResultsHeader>
            <ResultsTitle>Summoning Complete</ResultsTitle>
            <ResultsSubtitle>{characters.length} characters obtained</ResultsSubtitle>
          </ResultsHeader>
          
          <ResultsGrid>
            {characters.map((char, index) => (
              <ResultCard
                key={index}
                $color={getRarityColor(char.rarity)}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.02, type: "spring", damping: 15 }}
              >
                <ResultImageWrapper>
                  {isVideo(char.image) ? (
                    <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                  ) : (
                    <img src={getImagePath(char.image)} alt={char.name} />
                  )}
                </ResultImageWrapper>
                <ResultInfo>
                  <ResultName>{char.name}</ResultName>
                  <ResultRarity $color={getRarityColor(char.rarity)}>{char.rarity}</ResultRarity>
                </ResultInfo>
              </ResultCard>
            ))}
          </ResultsGrid>
          
          <CloseButton
            onClick={handleCloseSkippedResults}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Continue
          </CloseButton>
        </ResultsContent>
      </ResultsOverlay>
    );
  }

  return (
    <SummonAnimation
      isActive={true}
      rarity={currentCharacter?.rarity || 'common'}
      character={currentCharacter}
      onComplete={handleSingleComplete}
      skipEnabled={skipEnabled}
      getImagePath={getImagePath}
      isMultiPull={true}
      currentPull={currentIndex + 1}
      totalPulls={characters.length}
      onSkipAll={handleSkipAll}
      ambientRarity={highestRarity}
    />
  );
};

// Multi-pull Results Styles
const ResultsOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(5, 5, 10, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
`;

const ResultsContent = styled.div`
  max-width: 900px;
  width: 100%;
`;

const ResultsHeader = styled.div`
  text-align: center;
  margin-bottom: 28px;
`;

const ResultsTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
`;

const ResultsSubtitle = styled.p`
  font-size: 15px;
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
  max-height: 55vh;
  overflow-y: auto;
  padding: 4px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
`;

const ResultCard = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid ${props => props.$color};
  box-shadow: 0 0 16px ${props => props.$color}25;
`;

const ResultImageWrapper = styled.div`
  height: 120px;
  overflow: hidden;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 768px) {
    height: 100px;
  }
`;

const ResultInfo = styled.div`
  padding: 10px;
  text-align: center;
`;

const ResultName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
`;

const ResultRarity = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.$color};
  letter-spacing: 0.5px;
`;

const CloseButton = styled(motion.button)`
  display: block;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  padding: 16px 32px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(88, 86, 214, 0.4);
`;

export default SummonAnimation;
