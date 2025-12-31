/**
 * CelebrationEffects - Premium celebration animations
 *
 * Provides various celebration effects for game achievements:
 * - Confetti burst
 * - Screen flash
 * - Particle explosion
 * - Level-up glow
 *
 * Uses CSS animations and canvas for performance.
 */

import React, { useCallback, useState, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../tokens';

// ==================== KEYFRAMES ====================

const confettiFall = keyframes`
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 60px rgba(255, 215, 0, 0.6), 0 0 100px rgba(255, 215, 0, 0.3);
  }
`;

const starBurst = keyframes`
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(1.5) rotate(180deg);
    opacity: 1;
  }
  100% {
    transform: scale(2) rotate(360deg);
    opacity: 0;
  }
`;

// ==================== STYLED COMPONENTS ====================

const EffectsContainer = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: ${theme.zIndex.tooltip + 200};
  overflow: hidden;
`;

// Confetti piece
const ConfettiPiece = styled.div`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size * 0.6}px;
  background: ${props => props.$color};
  top: -20px;
  left: ${props => props.$left}%;
  animation: ${confettiFall} ${props => props.$duration}s linear forwards;
  animation-delay: ${props => props.$delay}s;
  border-radius: 2px;
  opacity: 0;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    display: none;
  }
`;

// Screen flash overlay
const ScreenFlash = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${props => props.$color || 'rgba(255, 215, 0, 0.3)'};
  pointer-events: none;
  z-index: ${theme.zIndex.tooltip + 150};
`;

// Star burst effect
const StarBurst = styled.div`
  position: absolute;
  width: 100px;
  height: 100px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);

  &::before,
  &::after {
    content: '\\2726';
    position: absolute;
    font-size: 40px;
    color: ${props => props.$color || theme.colors.featured};
    animation: ${starBurst} 0.8s ease-out forwards;
    text-shadow: 0 0 20px ${props => props.$color || theme.colors.featured};
  }

  &::before {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  &::after {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(45deg);
    animation-delay: 0.1s;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before, &::after {
      animation: none;
    }
  }
`;

// Level up text animation
const LevelUpText = styled(motion.div)`
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translateX(-50%);
  font-size: clamp(32px, 8vw, 64px);
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(135deg, #ffd700, #ff8c00, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
  letter-spacing: ${theme.letterSpacing.wide};
  white-space: nowrap;
  z-index: ${theme.zIndex.tooltip + 180};
  animation: ${pulseGlow} 1s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// Particle for explosion effect
const Particle = styled.div`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: ${props => props.$color};
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 ${props => props.$size * 2}px ${props => props.$color};
  animation: particleExplode ${props => props.$duration}s ease-out forwards;
  animation-delay: ${props => props.$delay}s;

  @keyframes particleExplode {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(
        calc(-50% + ${props => props.$x}px),
        calc(-50% + ${props => props.$y}px)
      ) scale(0);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    display: none;
  }
`;

// ==================== CONFETTI COMPONENT ====================

const CONFETTI_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d',
  '#c084fc', '#22d3ee', '#f97316', '#10b981', '#f472b6',
];

const ConfettiEffect = ({ count = 50, duration = 3 }) => {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 8 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.5,
    duration: duration + Math.random() * 2,
  }));

  return (
    <>
      {pieces.map(piece => (
        <ConfettiPiece
          key={piece.id}
          $left={piece.left}
          $size={piece.size}
          $color={piece.color}
          $delay={piece.delay}
          $duration={piece.duration}
        />
      ))}
    </>
  );
};

// ==================== PARTICLE EXPLOSION ====================

const ParticleExplosion = ({ count = 20, color = theme.colors.featured }) => {
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const distance = 50 + Math.random() * 100;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.1,
      duration: 0.6 + Math.random() * 0.4,
      color,
    };
  });

  return (
    <>
      {particles.map(p => (
        <Particle
          key={p.id}
          $x={p.x}
          $y={p.y}
          $size={p.size}
          $delay={p.delay}
          $duration={p.duration}
          $color={p.color}
        />
      ))}
    </>
  );
};

// ==================== CELEBRATION HOOK ====================

/**
 * Hook to trigger celebration effects
 *
 * @returns {Object} { triggerConfetti, triggerLevelUp, triggerFlash, triggerExplosion, EffectsPortal }
 */
export const useCelebration = () => {
  const [effects, setEffects] = useState([]);
  const idCounter = useRef(0);

  // Remove an effect after its duration
  const removeEffect = useCallback((id) => {
    setEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  // Schedule effect removal
  const scheduleRemoval = useCallback((id, duration) => {
    setTimeout(() => removeEffect(id), duration);
  }, [removeEffect]);

  // Trigger confetti burst
  const triggerConfetti = useCallback((options = {}) => {
    const id = ++idCounter.current;
    const { count = 50, duration = 4000 } = options;

    setEffects(prev => [...prev, {
      id,
      type: 'confetti',
      count,
    }]);

    scheduleRemoval(id, duration);
  }, [scheduleRemoval]);

  // Trigger screen flash
  const triggerFlash = useCallback((options = {}) => {
    const id = ++idCounter.current;
    const { color = 'rgba(255, 215, 0, 0.3)', duration = 400 } = options;

    setEffects(prev => [...prev, {
      id,
      type: 'flash',
      color,
      duration,
    }]);

    scheduleRemoval(id, duration);
  }, [scheduleRemoval]);

  // Trigger particle explosion
  const triggerExplosion = useCallback((options = {}) => {
    const id = ++idCounter.current;
    const { color = theme.colors.featured, count = 20, duration = 1000 } = options;

    setEffects(prev => [...prev, {
      id,
      type: 'explosion',
      color,
      count,
    }]);

    scheduleRemoval(id, duration);
  }, [scheduleRemoval]);

  // Trigger level up celebration (combines confetti + flash)
  const triggerLevelUp = useCallback((level, options = {}) => {
    const id = ++idCounter.current;
    const { duration = 3000 } = options;

    setEffects(prev => [...prev, {
      id,
      type: 'levelup',
      level,
    }]);

    // Also trigger confetti and flash
    triggerConfetti({ count: 80 });
    triggerFlash({ color: 'rgba(255, 215, 0, 0.4)', duration: 500 });

    scheduleRemoval(id, duration);
  }, [scheduleRemoval, triggerConfetti, triggerFlash]);

  // Trigger legendary reveal (combined effects)
  const triggerLegendaryReveal = useCallback(() => {
    triggerFlash({ color: 'rgba(255, 215, 0, 0.5)', duration: 600 });
    triggerExplosion({ color: '#ffd700', count: 30 });
    setTimeout(() => {
      triggerConfetti({ count: 100 });
    }, 200);
  }, [triggerFlash, triggerExplosion, triggerConfetti]);

  // Portal component for rendering effects
  const EffectsPortal = useCallback(() => {
    if (typeof document === 'undefined' || effects.length === 0) return null;

    return createPortal(
      <EffectsContainer>
        <AnimatePresence>
          {effects.map(effect => {
            switch (effect.type) {
              case 'confetti':
                return <ConfettiEffect key={effect.id} count={effect.count} />;

              case 'flash':
                return (
                  <ScreenFlash
                    key={effect.id}
                    $color={effect.color}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: effect.duration / 1000 / 2 }}
                  />
                );

              case 'explosion':
                return (
                  <div key={effect.id} style={{ position: 'fixed', inset: 0 }}>
                    <ParticleExplosion count={effect.count} color={effect.color} />
                    <StarBurst $color={effect.color} />
                  </div>
                );

              case 'levelup':
                return (
                  <LevelUpText
                    key={effect.id}
                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2, y: -30 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    LEVEL UP!
                  </LevelUpText>
                );

              default:
                return null;
            }
          })}
        </AnimatePresence>
      </EffectsContainer>,
      document.body
    );
  }, [effects]);

  return {
    triggerConfetti,
    triggerLevelUp,
    triggerFlash,
    triggerExplosion,
    triggerLegendaryReveal,
    EffectsPortal,
  };
};

// ==================== CONTEXT PROVIDER ====================

const CelebrationContext = createContext(null);

export const CelebrationProvider = ({ children }) => {
  const celebration = useCelebration();

  return (
    <CelebrationContext.Provider value={celebration}>
      {children}
      <celebration.EffectsPortal />
    </CelebrationContext.Provider>
  );
};

/**
 * Hook to access celebration effects from anywhere
 */
export const useCelebrationContext = () => {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebrationContext must be used within CelebrationProvider');
  }
  return context;
};

export default useCelebration;
