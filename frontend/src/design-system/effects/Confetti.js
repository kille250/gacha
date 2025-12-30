/**
 * Confetti - Celebration particle effect component
 *
 * Creates a burst of colorful confetti particles for rewards and achievements.
 * Uses CSS animations for performance (no external libraries needed).
 *
 * Features:
 * - Multiple particle shapes (squares, circles, stars)
 * - Customizable colors and count
 * - Physics-based falling animation
 * - Auto-cleanup after animation
 * - Reduced motion support
 *
 * @example
 * <Confetti active={showCelebration} onComplete={() => setShowCelebration(false)} />
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useReducedMotion } from '../utilities/accessibility';

// ==================== ANIMATIONS ====================

const fall = keyframes`
  0% {
    transform: translateY(-10vh) rotate(0deg);
    opacity: 1;
  }
  25% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
`;

const sway = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(15px);
  }
  75% {
    transform: translateX(-15px);
  }
`;

const twinkle = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.9);
  }
`;

// ==================== STYLED COMPONENTS ====================

const ConfettiContainer = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
`;

const Particle = styled.div`
  position: absolute;
  top: -20px;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: ${props => props.$color};
  left: ${props => props.$left}%;
  opacity: 0;

  ${props => props.$shape === 'circle' && css`
    border-radius: 50%;
  `}

  ${props => props.$shape === 'star' && css`
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  `}

  ${props => props.$shape === 'square' && css`
    border-radius: 2px;
  `}

  animation:
    ${fall} ${props => props.$duration}s ease-in forwards,
    ${sway} ${props => props.$swayDuration}s ease-in-out infinite,
    ${twinkle} 0.5s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

// ==================== PARTICLE GENERATION ====================

const COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Warm yellow
  '#BB8FCE', // Purple
];

const LEGENDARY_COLORS = [
  '#FFD700', // Gold
  '#FFA500', // Orange
  '#FFEC8B', // Light gold
  '#FFB347', // Pastel orange
  '#F0E68C', // Khaki
];

const SHAPES = ['square', 'circle', 'star'];

const generateParticles = (count, colorPalette) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: Math.random() * 8 + 4, // 4-12px
    color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    duration: Math.random() * 2 + 2.5, // 2.5-4.5s
    swayDuration: Math.random() * 1 + 0.5, // 0.5-1.5s
    delay: Math.random() * 0.8, // 0-0.8s delay
  }));
};

// ==================== COMPONENT ====================

/**
 * Confetti Component
 *
 * @param {boolean} active - Whether to show confetti
 * @param {number} particleCount - Number of particles (default: 50)
 * @param {number} duration - Animation duration in ms (default: 4000)
 * @param {'default' | 'legendary' | 'epic'} variant - Color scheme
 * @param {Function} onComplete - Callback when animation ends
 */
const Confetti = memo(function Confetti({
  active = false,
  particleCount = 50,
  duration = 4000,
  variant = 'default',
  onComplete,
}) {
  const [particles, setParticles] = useState([]);
  const prefersReducedMotion = useReducedMotion();

  // Select color palette based on variant
  const getColorPalette = useCallback(() => {
    switch (variant) {
      case 'legendary':
        return LEGENDARY_COLORS;
      case 'epic':
        return ['#BF5AF2', '#9C27B0', '#AF52DE', '#E040FB', '#7B1FA2'];
      default:
        return COLORS;
    }
  }, [variant]);

  // Generate particles when active
  useEffect(() => {
    if (active && !prefersReducedMotion) {
      const colorPalette = getColorPalette();
      setParticles(generateParticles(particleCount, colorPalette));

      // Cleanup after duration
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active, particleCount, duration, variant, prefersReducedMotion, onComplete, getColorPalette]);

  if (!active || particles.length === 0) {
    return null;
  }

  return (
    <ConfettiContainer aria-hidden="true">
      {particles.map(particle => (
        <Particle
          key={particle.id}
          $left={particle.left}
          $size={particle.size}
          $color={particle.color}
          $shape={particle.shape}
          $duration={particle.duration}
          $swayDuration={particle.swayDuration}
          $delay={particle.delay}
        />
      ))}
    </ConfettiContainer>
  );
});

/**
 * Hook for triggering confetti
 */
export const useConfetti = (options = {}) => {
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState(options);

  const trigger = useCallback((overrides = {}) => {
    setConfig(prev => ({ ...prev, ...overrides }));
    setIsActive(true);
  }, []);

  const handleComplete = useCallback(() => {
    setIsActive(false);
  }, []);

  const ConfettiComponent = useCallback(() => (
    <Confetti
      active={isActive}
      onComplete={handleComplete}
      {...config}
    />
  ), [isActive, handleComplete, config]);

  return { trigger, isActive, ConfettiComponent };
};

export default Confetti;
