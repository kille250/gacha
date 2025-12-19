import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaGem, FaTrophy, FaDice } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import { theme, getRarityColor } from '../../styles/DesignSystem';

// ==================== RARITY CONFIGURATION ====================

const RARITY_CONFIG = {
  common: {
    color: '#8e8e93',
    particleColors: ['#8e8e93', '#a8a8ad', '#c7c7cc'],
    glowIntensity: 0.3,
    shakeIntensity: 0,
    circleSpeed: 8,
    particleCount: 15,
    icon: <FaDice />,
    soundHint: 'soft',
    buildupTime: 1200,
    confettiCount: 0
  },
  uncommon: {
    color: '#30d158',
    particleColors: ['#30d158', '#5fe07a', '#8aea9d'],
    glowIntensity: 0.5,
    shakeIntensity: 0.5,
    circleSpeed: 6,
    particleCount: 25,
    icon: <FaStar />,
    soundHint: 'medium',
    buildupTime: 1400,
    confettiCount: 30
  },
  rare: {
    color: '#0a84ff',
    particleColors: ['#0a84ff', '#409cff', '#70b4ff'],
    glowIntensity: 0.7,
    shakeIntensity: 1,
    circleSpeed: 4,
    particleCount: 40,
    icon: <FaGem />,
    soundHint: 'electric',
    buildupTime: 1800,
    confettiCount: 80
  },
  epic: {
    color: '#bf5af2',
    particleColors: ['#bf5af2', '#d183f5', '#e3acf8', '#ff6bff'],
    glowIntensity: 0.85,
    shakeIntensity: 2,
    circleSpeed: 3,
    particleCount: 60,
    icon: <FaStar />,
    soundHint: 'mystic',
    buildupTime: 2200,
    confettiCount: 120
  },
  legendary: {
    color: '#ff9f0a',
    particleColors: ['#ff9f0a', '#ffc040', '#ffe070', '#ffffff'],
    glowIntensity: 1,
    shakeIntensity: 3,
    circleSpeed: 2,
    particleCount: 100,
    icon: <FaTrophy />,
    soundHint: 'divine',
    buildupTime: 2800,
    confettiCount: 200
  }
};

// ==================== ANIMATION PHASES ====================

const PHASES = {
  IDLE: 'idle',
  CHARGING: 'charging',
  PEAK: 'peak',
  REVEAL: 'reveal',
  COMPLETE: 'complete'
};

// ==================== MAIN COMPONENT ====================

export const SummonAnimation = ({
  isActive,
  rarity = 'common',
  character,
  onComplete,
  onSkip,
  skipEnabled = true,
  getImagePath
}) => {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [particles, setParticles] = useState([]);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const containerRef = useRef(null);
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  // Generate particles
  const generateParticles = useCallback(() => {
    const newParticles = [];
    for (let i = 0; i < config.particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        color: config.particleColors[Math.floor(Math.random() * config.particleColors.length)],
        delay: Math.random() * 2,
        duration: Math.random() * 3 + 2,
        angle: Math.random() * 360
      });
    }
    setParticles(newParticles);
  }, [config]);

  // Fire confetti for high rarity
  const fireConfetti = useCallback(() => {
    if (config.confettiCount > 0) {
      const colors = config.particleColors;
      
      // Main burst
      confetti({
        particleCount: config.confettiCount,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
        colors: [...colors, '#ffffff', '#ffd700'],
        startVelocity: 45,
        gravity: 0.8,
        shapes: ['star', 'circle'],
        scalar: 1.2
      });

      // Side bursts for legendary
      if (rarity === 'legendary') {
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
          });
        }, 200);
      }
    }
  }, [config, rarity]);

  // Animation sequence
  useEffect(() => {
    if (isActive && phase === PHASES.IDLE) {
      generateParticles();
      setPhase(PHASES.CHARGING);
      setShowSkipHint(false);

      // Show skip hint after a short delay
      const skipTimer = setTimeout(() => {
        setShowSkipHint(true);
      }, 800);

      // Transition to peak
      const peakTimer = setTimeout(() => {
        setPhase(PHASES.PEAK);
      }, config.buildupTime * 0.7);

      // Transition to reveal
      const revealTimer = setTimeout(() => {
        setPhase(PHASES.REVEAL);
        fireConfetti();
      }, config.buildupTime);

      // Complete
      const completeTimer = setTimeout(() => {
        setPhase(PHASES.COMPLETE);
        if (onComplete) onComplete();
      }, config.buildupTime + 1000);

      return () => {
        clearTimeout(skipTimer);
        clearTimeout(peakTimer);
        clearTimeout(revealTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, phase, config, generateParticles, fireConfetti, onComplete]);

  // Reset when inactive
  useEffect(() => {
    if (!isActive) {
      setPhase(PHASES.IDLE);
      setParticles([]);
      setShowSkipHint(false);
    }
  }, [isActive]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (skipEnabled && phase !== PHASES.COMPLETE) {
      setPhase(PHASES.REVEAL);
      fireConfetti();
      setTimeout(() => {
        setPhase(PHASES.COMPLETE);
        if (onSkip) onSkip();
        if (onComplete) onComplete();
      }, 300);
    }
  }, [skipEnabled, phase, fireConfetti, onSkip, onComplete]);

  // Handle click to skip
  const handleContainerClick = useCallback(() => {
    if (phase === PHASES.CHARGING || phase === PHASES.PEAK) {
      handleSkip();
    }
  }, [phase, handleSkip]);

  if (!isActive) return null;

  const isVideo = (file) => {
    if (!file) return false;
    if (typeof file === 'string') {
      const lower = file.toLowerCase();
      return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.includes('video');
    }
    return false;
  };

  return (
    <AnimationContainer
      ref={containerRef}
      onClick={handleContainerClick}
      $rarity={rarity}
      $phase={phase}
      $glowIntensity={config.glowIntensity}
      $shakeIntensity={config.shakeIntensity}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background Vignette */}
      <Vignette $rarity={rarity} $phase={phase} />

      {/* Particle Field */}
      <ParticleField>
        {particles.map(particle => (
          <Particle
            key={particle.id}
            $x={particle.x}
            $y={particle.y}
            $size={particle.size}
            $color={particle.color}
            $delay={particle.delay}
            $duration={particle.duration}
            $phase={phase}
            $angle={particle.angle}
          />
        ))}
      </ParticleField>

      {/* Summoning Circle */}
      <CircleContainer $phase={phase}>
        <SummonCircle 
          $rarity={rarity} 
          $phase={phase}
          $speed={config.circleSpeed}
        >
          <CircleRing $delay={0} $rarity={rarity} />
          <CircleRing $delay={0.2} $rarity={rarity} $reverse />
          <CircleRing $delay={0.4} $rarity={rarity} />
          <InnerGlow $rarity={rarity} $phase={phase} />
          <RuneCircle $rarity={rarity} $phase={phase}>
            {[...Array(12)].map((_, i) => (
              <Rune key={i} $index={i} $rarity={rarity}>✦</Rune>
            ))}
          </RuneCircle>
        </SummonCircle>
      </CircleContainer>

      {/* Energy Beams */}
      <AnimatePresence>
        {(phase === PHASES.PEAK || phase === PHASES.REVEAL) && (
          <EnergyBeams $rarity={rarity}>
            {[...Array(8)].map((_, i) => (
              <EnergyBeam 
                key={i} 
                $index={i} 
                $rarity={rarity}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 1, 0.5] }}
                transition={{ 
                  duration: 0.5, 
                  delay: i * 0.05,
                  ease: "easeOut" 
                }}
              />
            ))}
          </EnergyBeams>
        )}
      </AnimatePresence>

      {/* Flash Effect */}
      <AnimatePresence>
        {phase === PHASES.REVEAL && (
          <FlashOverlay
            $rarity={rarity}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {/* Character Reveal */}
      <AnimatePresence>
        {(phase === PHASES.REVEAL || phase === PHASES.COMPLETE) && character && (
          <CharacterReveal
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              transition: {
                type: "spring",
                damping: 15,
                stiffness: 200
              }
            }}
            $rarity={rarity}
          >
            <CharacterCard $rarity={rarity}>
              <CardGlow $rarity={rarity} />
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
                  <CardImage 
                    src={getImagePath(character.image)} 
                    alt={character.name} 
                  />
                )}
                <ImageOverlay $rarity={rarity} />
              </CardImageContainer>
              <CardInfo>
                <RarityIcon $rarity={rarity}>
                  {config.icon}
                </RarityIcon>
                <CharacterName>{character.name}</CharacterName>
                <CharacterSeries>{character.series}</CharacterSeries>
                <RarityLabel $rarity={rarity}>
                  {rarity.toUpperCase()}
                </RarityLabel>
              </CardInfo>
              <ShineEffect />
            </CharacterCard>
          </CharacterReveal>
        )}
      </AnimatePresence>

      {/* Rarity Indicator */}
      <AnimatePresence>
        {phase === PHASES.CHARGING && (
          <RarityHint
            $rarity={rarity}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.5, 1, 0.5], 
              scale: [0.95, 1.05, 0.95] 
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {config.icon}
          </RarityHint>
        )}
      </AnimatePresence>

      {/* Skip Hint */}
      <AnimatePresence>
        {showSkipHint && skipEnabled && phase !== PHASES.COMPLETE && (
          <SkipHint
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.7, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Tap to skip
          </SkipHint>
        )}
      </AnimatePresence>

      {/* Summoning Text */}
      <AnimatePresence>
        {phase === PHASES.CHARGING && (
          <SummoningText
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span>S</span>
            <span>U</span>
            <span>M</span>
            <span>M</span>
            <span>O</span>
            <span>N</span>
            <span>I</span>
            <span>N</span>
            <span>G</span>
          </SummoningText>
        )}
      </AnimatePresence>
    </AnimationContainer>
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
  50% { transform: scale(1.1); opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0) translateX(0); }
  25% { transform: translateY(-20px) translateX(10px); }
  50% { transform: translateY(0) translateX(20px); }
  75% { transform: translateY(20px) translateX(10px); }
`;

const spiralIn = keyframes`
  0% { 
    transform: rotate(0deg) translateY(-150px) scale(0.5);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% { 
    transform: rotate(720deg) translateY(0) scale(1);
    opacity: 0;
  }
`;

const glow = keyframes`
  0%, 100% { filter: brightness(1) drop-shadow(0 0 20px currentColor); }
  50% { filter: brightness(1.3) drop-shadow(0 0 40px currentColor); }
`;

const shake = (intensity) => keyframes`
  0%, 100% { transform: translateX(0) translateY(0); }
  10% { transform: translateX(${-intensity * 2}px) translateY(${intensity}px); }
  20% { transform: translateX(${intensity * 2}px) translateY(${-intensity}px); }
  30% { transform: translateX(${-intensity}px) translateY(${intensity * 2}px); }
  40% { transform: translateX(${intensity}px) translateY(${-intensity * 2}px); }
  50% { transform: translateX(${-intensity * 2}px) translateY(${intensity}px); }
  60% { transform: translateX(${intensity * 2}px) translateY(${-intensity}px); }
  70% { transform: translateX(${-intensity}px) translateY(${intensity * 2}px); }
  80% { transform: translateX(${intensity}px) translateY(${-intensity * 2}px); }
  90% { transform: translateX(${-intensity * 2}px) translateY(${intensity}px); }
`;

const shimmer = keyframes`
  0% { left: -150%; }
  100% { left: 150%; }
`;

const letterWave = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

// ==================== STYLED COMPONENTS ====================

const AnimationContainer = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    ellipse at center,
    ${props => `${getRarityColor(props.$rarity)}15`} 0%,
    rgba(0, 0, 0, 0.95) 70%,
    #000000 100%
  );
  overflow: hidden;
  cursor: pointer;
  
  ${props => props.$phase === PHASES.PEAK && props.$shakeIntensity > 0 && css`
    animation: ${shake(props.$shakeIntensity)} 0.1s infinite;
  `}
`;

const Vignette = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 30%,
    rgba(0, 0, 0, 0.8) 100%
  );
  pointer-events: none;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => getRarityColor(props.$rarity)};
    opacity: ${props => props.$phase === PHASES.PEAK ? 0.1 : 0.03};
    transition: opacity 0.5s ease;
  }
`;

const ParticleField = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

const Particle = styled.div`
  position: absolute;
  left: ${props => props.$x}%;
  top: ${props => props.$y}%;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: ${props => props.$color};
  border-radius: 50%;
  opacity: 0;
  box-shadow: 0 0 ${props => props.$size * 2}px ${props => props.$color};
  
  ${props => props.$phase !== PHASES.IDLE && css`
    animation: ${spiralIn} ${props.$duration}s ease-in-out infinite;
    animation-delay: ${props.$delay}s;
  `}
`;

const CircleContainer = styled.div`
  position: relative;
  width: 400px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: ${props => props.$phase === PHASES.REVEAL ? 'scale(0)' : 'scale(1)'};
  opacity: ${props => props.$phase === PHASES.REVEAL || props.$phase === PHASES.COMPLETE ? 0 : 1};
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 768px) {
    width: 300px;
    height: 300px;
  }
`;

const SummonCircle = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${props => props.$phase === PHASES.PEAK ? pulse : 'none'} 0.5s ease-in-out infinite;
`;

const CircleRing = styled.div`
  position: absolute;
  width: ${props => 70 - props.$delay * 40}%;
  height: ${props => 70 - props.$delay * 40}%;
  border: 2px solid ${props => getRarityColor(props.$rarity)};
  border-radius: 50%;
  opacity: 0.6;
  animation: ${props => props.$reverse ? rotateReverse : rotate} 
    ${props => 8 - props.$delay * 4}s linear infinite;
  box-shadow: 
    0 0 20px ${props => getRarityColor(props.$rarity)}40,
    inset 0 0 20px ${props => getRarityColor(props.$rarity)}20;
    
  &::before, &::after {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    background: ${props => getRarityColor(props.$rarity)};
    border-radius: 50%;
  }
  
  &::before {
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
  }
  
  &::after {
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
  }
`;

const InnerGlow = styled.div`
  position: absolute;
  width: 40%;
  height: 40%;
  background: radial-gradient(
    circle,
    ${props => getRarityColor(props.$rarity)}60 0%,
    ${props => getRarityColor(props.$rarity)}20 50%,
    transparent 70%
  );
  border-radius: 50%;
  animation: ${pulse} 2s ease-in-out infinite;
  filter: blur(10px);
`;

const RuneCircle = styled.div`
  position: absolute;
  width: 85%;
  height: 85%;
  animation: ${rotateReverse} 20s linear infinite;
`;

const Rune = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 18px;
  color: ${props => getRarityColor(props.$rarity)};
  transform-origin: 0 0;
  transform: rotate(${props => props.$index * 30}deg) translateY(-140px);
  text-shadow: 0 0 10px ${props => getRarityColor(props.$rarity)};
  animation: ${glow} 2s ease-in-out infinite;
  animation-delay: ${props => props.$index * 0.1}s;
`;

const EnergyBeams = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const EnergyBeam = styled(motion.div)`
  position: absolute;
  width: 4px;
  height: 100vh;
  background: linear-gradient(
    to top,
    transparent,
    ${props => getRarityColor(props.$rarity)}80,
    ${props => getRarityColor(props.$rarity)},
    ${props => getRarityColor(props.$rarity)}80,
    transparent
  );
  transform-origin: center;
  transform: rotate(${props => props.$index * 45}deg);
  filter: blur(2px);
`;

const FlashOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: ${props => getRarityColor(props.$rarity)};
  mix-blend-mode: screen;
  pointer-events: none;
`;

const CharacterReveal = styled(motion.div)`
  position: relative;
  z-index: 10;
`;

const CharacterCard = styled.div`
  position: relative;
  width: 320px;
  border-radius: 24px;
  overflow: hidden;
  background: ${theme.colors.backgroundSecondary};
  border: 3px solid ${props => getRarityColor(props.$rarity)};
  box-shadow: 
    0 0 60px ${props => getRarityColor(props.$rarity)}50,
    0 25px 50px -12px rgba(0, 0, 0, 0.8);
  
  @media (max-width: 768px) {
    width: 280px;
  }
`;

const CardGlow = styled.div`
  position: absolute;
  inset: -50%;
  background: radial-gradient(
    circle at 50% 30%,
    ${props => getRarityColor(props.$rarity)}30 0%,
    transparent 50%
  );
  pointer-events: none;
  animation: ${pulse} 3s ease-in-out infinite;
`;

const CardImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 350px;
  overflow: hidden;
  
  @media (max-width: 768px) {
    height: 300px;
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

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    ${props => getRarityColor(props.$rarity)}20 100%
  );
  pointer-events: none;
`;

const CardInfo = styled.div`
  padding: 24px;
  text-align: center;
  position: relative;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.4),
    rgba(0, 0, 0, 0.8)
  );
`;

const RarityIcon = styled.div`
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  background: ${props => getRarityColor(props.$rarity)};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  box-shadow: 
    0 0 30px ${props => getRarityColor(props.$rarity)}80,
    0 4px 15px rgba(0, 0, 0, 0.3);
  border: 3px solid ${theme.colors.backgroundSecondary};
`;

const CharacterName = styled.h2`
  margin: 12px 0 4px;
  font-size: 24px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
`;

const CharacterSeries = styled.p`
  margin: 0 0 12px;
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`;

const RarityLabel = styled.div`
  display: inline-block;
  padding: 6px 20px;
  background: ${props => getRarityColor(props.$rarity)};
  color: white;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  border-radius: 100px;
  box-shadow: 0 4px 15px ${props => getRarityColor(props.$rarity)}50;
`;

const ShineEffect = styled.div`
  position: absolute;
  top: 0;
  left: -150%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 45%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0.1) 55%,
    transparent 100%
  );
  animation: ${shimmer} 3s ease-in-out infinite;
  animation-delay: 1s;
  pointer-events: none;
`;

const RarityHint = styled(motion.div)`
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 48px;
  color: ${props => getRarityColor(props.$rarity)};
  filter: drop-shadow(0 0 20px ${props => getRarityColor(props.$rarity)});
`;

const SkipHint = styled(motion.div)`
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  backdrop-filter: blur(10px);
`;

const SummoningText = styled(motion.div)`
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 8px;
  color: ${theme.colors.textSecondary};
  
  span {
    animation: ${letterWave} 1s ease-in-out infinite;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.1s; }
    &:nth-child(3) { animation-delay: 0.2s; }
    &:nth-child(4) { animation-delay: 0.3s; }
    &:nth-child(5) { animation-delay: 0.4s; }
    &:nth-child(6) { animation-delay: 0.5s; }
    &:nth-child(7) { animation-delay: 0.6s; }
    &:nth-child(8) { animation-delay: 0.7s; }
    &:nth-child(9) { animation-delay: 0.8s; }
  }
`;

// ==================== MULTI-PULL ANIMATION ====================

export const MultiSummonAnimation = ({
  isActive,
  characters = [],
  currentIndex = 0,
  onRevealNext,
  onComplete,
  onSkip,
  skipEnabled = true,
  getImagePath
}) => {
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [showResults, setShowResults] = useState(false);
  const [autoPlayActive, setAutoPlayActive] = useState(true);

  useEffect(() => {
    if (!isActive) {
      setRevealedIndices(new Set());
      setShowResults(false);
      setAutoPlayActive(true);
    }
  }, [isActive]);

  const handleCharacterComplete = useCallback(() => {
    setRevealedIndices(prev => new Set([...prev, currentIndex]));
    
    if (currentIndex < characters.length - 1) {
      if (autoPlayActive) {
        setTimeout(() => {
          if (onRevealNext) onRevealNext();
        }, 500);
      }
    } else {
      setTimeout(() => {
        setShowResults(true);
        if (onComplete) onComplete();
      }, 800);
    }
  }, [currentIndex, characters.length, autoPlayActive, onRevealNext, onComplete]);

  const handleSkipAll = useCallback(() => {
    setShowResults(true);
    if (onSkip) onSkip();
    if (onComplete) onComplete();
  }, [onSkip, onComplete]);

  const currentCharacter = characters[currentIndex];

  if (!isActive) return null;

  if (showResults) {
    return (
      <MultiResultsOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <ResultsContainer>
          <ResultsHeader>
            <ResultsTitle>Summoning Complete!</ResultsTitle>
            <ResultsSubtitle>{characters.length} characters obtained</ResultsSubtitle>
          </ResultsHeader>
          <ResultsGrid>
            {characters.map((char, index) => (
              <ResultCard
                key={index}
                $rarity={char.rarity}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <ResultImage>
                  {char.image?.toLowerCase().includes('video') ? (
                    <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                  ) : (
                    <img src={getImagePath(char.image)} alt={char.name} />
                  )}
                </ResultImage>
                <ResultInfo>
                  <ResultName>{char.name}</ResultName>
                  <ResultRarity $rarity={char.rarity}>
                    {char.rarity}
                  </ResultRarity>
                </ResultInfo>
              </ResultCard>
            ))}
          </ResultsGrid>
          <CloseResultsButton
            onClick={onComplete}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Continue
          </CloseResultsButton>
        </ResultsContainer>
      </MultiResultsOverlay>
    );
  }

  return (
    <>
      <SummonAnimation
        isActive={isActive && currentCharacter}
        rarity={currentCharacter?.rarity || 'common'}
        character={currentCharacter}
        onComplete={handleCharacterComplete}
        onSkip={handleSkipAll}
        skipEnabled={skipEnabled}
        getImagePath={getImagePath}
      />
      
      {/* Progress indicator */}
      <ProgressIndicator>
        <ProgressText>
          {currentIndex + 1} / {characters.length}
        </ProgressText>
        <ProgressBar>
          <ProgressFill 
            style={{ width: `${((currentIndex + 1) / characters.length) * 100}%` }} 
          />
        </ProgressBar>
        <SkipAllButton onClick={handleSkipAll}>
          Skip All
        </SkipAllButton>
      </ProgressIndicator>
    </>
  );
};

// Additional styled components for multi-pull

const MultiResultsOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
`;

const ResultsContainer = styled.div`
  max-width: 1000px;
  width: 100%;
`;

const ResultsHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const ResultsTitle = styled.h2`
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px;
`;

const ResultsSubtitle = styled.p`
  font-size: 16px;
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 8px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
`;

const ResultCard = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid ${props => getRarityColor(props.$rarity)};
  box-shadow: 0 0 20px ${props => getRarityColor(props.$rarity)}30;
`;

const ResultImage = styled.div`
  height: 140px;
  overflow: hidden;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ResultInfo = styled.div`
  padding: 12px;
  text-align: center;
`;

const ResultName = styled.div`
  font-size: 13px;
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
  color: ${props => getRarityColor(props.$rarity)};
  letter-spacing: 1px;
`;

const CloseResultsButton = styled(motion.button)`
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  padding: 16px 32px;
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
`;

const ProgressIndicator = styled.div`
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const ProgressText = styled.div`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  font-weight: 500;
`;

const ProgressBar = styled.div`
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  transition: width 0.3s ease;
`;

const SkipAllButton = styled.button`
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  color: ${theme.colors.textSecondary};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }
`;

export default SummonAnimation;

