/**
 * HolographicCard - Premium holographic foil effect for rare cards
 *
 * Creates a dynamic rainbow/holographic sheen that responds to
 * mouse movement or device orientation.
 *
 * Features:
 * - Interactive gradient that follows cursor/tilt
 * - Multiple rarity levels with different intensities
 * - Shimmer overlay for extra premium feel
 * - Performance optimized with CSS transforms
 * - Fallback for non-interactive contexts
 *
 * @example
 * <HolographicCard rarity="legendary" interactive>
 *   <CardContent />
 * </HolographicCard>
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../tokens';
import { useReducedMotion } from '../utilities/accessibility';

// ==================== ANIMATIONS ====================

const shimmerMove = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const rainbowShift = keyframes`
  0% {
    filter: hue-rotate(0deg);
  }
  100% {
    filter: hue-rotate(360deg);
  }
`;

const sparkle = keyframes`
  0%, 100% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
`;

// ==================== RARITY CONFIGS ====================

const rarityConfigs = {
  common: {
    enabled: false,
    intensity: 0,
    shimmer: false,
  },
  uncommon: {
    enabled: false,
    intensity: 0,
    shimmer: false,
  },
  rare: {
    enabled: true,
    intensity: 0.15,
    shimmer: false,
    gradient: `linear-gradient(
      135deg,
      rgba(10, 132, 255, 0.1) 0%,
      rgba(88, 86, 214, 0.15) 50%,
      rgba(10, 132, 255, 0.1) 100%
    )`,
  },
  epic: {
    enabled: true,
    intensity: 0.25,
    shimmer: true,
    gradient: `linear-gradient(
      135deg,
      rgba(191, 90, 242, 0.2) 0%,
      rgba(156, 39, 176, 0.25) 25%,
      rgba(175, 82, 222, 0.2) 50%,
      rgba(156, 39, 176, 0.25) 75%,
      rgba(191, 90, 242, 0.2) 100%
    )`,
  },
  legendary: {
    enabled: true,
    intensity: 0.4,
    shimmer: true,
    rainbow: true,
    gradient: `linear-gradient(
      135deg,
      rgba(255, 215, 0, 0.3) 0%,
      rgba(255, 140, 0, 0.35) 20%,
      rgba(255, 69, 0, 0.3) 40%,
      rgba(255, 215, 0, 0.35) 60%,
      rgba(255, 193, 7, 0.3) 80%,
      rgba(255, 215, 0, 0.3) 100%
    )`,
  },
};

// ==================== STYLED COMPONENTS ====================

const CardWrapper = styled(motion.div)`
  position: relative;
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  transform-style: preserve-3d;
  perspective: 1000px;

  /* Base glow for rare+ cards */
  ${props => props.$rarity && rarityConfigs[props.$rarity]?.enabled && css`
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: inherit;
      background: ${rarityConfigs[props.$rarity]?.gradient};
      opacity: 0.5;
      z-index: -1;
      transition: opacity 0.3s ease;
    }

    &:hover::before {
      opacity: 0.8;
    }
  `}
`;

const HoloOverlay = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;
  opacity: ${props => props.$intensity || 0.3};
  mix-blend-mode: overlay;
  transition: opacity 0.3s ease;

  /* Gradient follows mouse */
  background: radial-gradient(
    circle at ${props => props.$x || 50}% ${props => props.$y || 50}%,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.4) 20%,
    transparent 60%
  );

  ${props => props.$rainbow && css`
    animation: ${rainbowShift} 5s linear infinite;
  `}

  ${props => props.$reducedMotion && css`
    animation: none;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.6) 0%,
      transparent 60%
    );
  `}
`;

const ShimmerOverlay = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 3;
  background: linear-gradient(
    110deg,
    transparent 20%,
    rgba(255, 255, 255, 0.1) 40%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 60%,
    transparent 80%
  );
  background-size: 200% 100%;
  animation: ${shimmerMove} 3s ease-in-out infinite;
  opacity: 0;
  transition: opacity 0.3s ease;

  ${CardWrapper}:hover & {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    display: none;
  }
`;

const SparkleContainer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  overflow: hidden;
`;

const Sparkle = styled.div`
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8);
  opacity: 0;
  animation: ${sparkle} ${props => props.$duration}s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
  left: ${props => props.$left}%;
  top: ${props => props.$top}%;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const CardContent = styled.div`
  position: relative;
  z-index: 1;
`;

// ==================== COMPONENT ====================

/**
 * HolographicCard Component
 *
 * @param {'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'} rarity - Card rarity
 * @param {boolean} interactive - Enable mouse tracking effect
 * @param {boolean} showSparkles - Show sparkle particles
 * @param {React.ReactNode} children - Card content
 */
const HolographicCard = memo(function HolographicCard({
  children,
  rarity = 'common',
  interactive = true,
  showSparkles = true,
  className,
  ...props
}) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const prefersReducedMotion = useReducedMotion();

  const config = useMemo(() => rarityConfigs[rarity] || rarityConfigs.common, [rarity]);

  // Handle mouse movement for interactive effect
  const handleMouseMove = useCallback((e) => {
    if (!interactive || !config.enabled || prefersReducedMotion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }, [interactive, config.enabled, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 50, y: 50 });
  }, []);

  // Generate sparkle positions
  const sparkles = useMemo(() => {
    if (!showSparkles || !config.enabled || rarity !== 'legendary') return [];
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 1.5 + Math.random() * 1,
      delay: Math.random() * 2,
    }));
  }, [showSparkles, config.enabled, rarity]);

  // Skip effects for common/uncommon
  if (!config.enabled) {
    return (
      <CardWrapper className={className} {...props}>
        <CardContent>{children}</CardContent>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper
      className={className}
      $rarity={rarity}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    >
      <CardContent>{children}</CardContent>

      {/* Holographic overlay */}
      <HoloOverlay
        $x={mousePos.x}
        $y={mousePos.y}
        $intensity={config.intensity}
        $rainbow={config.rainbow}
        $reducedMotion={prefersReducedMotion}
      />

      {/* Shimmer effect */}
      {config.shimmer && <ShimmerOverlay />}

      {/* Sparkles for legendary */}
      {sparkles.length > 0 && (
        <SparkleContainer>
          {sparkles.map(s => (
            <Sparkle
              key={s.id}
              $left={s.left}
              $top={s.top}
              $duration={s.duration}
              $delay={s.delay}
            />
          ))}
        </SparkleContainer>
      )}
    </CardWrapper>
  );
});

/**
 * Holographic border effect (can be applied to any element)
 */
export const holographicBorderStyle = css`
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      rgba(255, 215, 0, 0.5) 0%,
      rgba(255, 140, 0, 0.5) 25%,
      rgba(191, 90, 242, 0.5) 50%,
      rgba(10, 132, 255, 0.5) 75%,
      rgba(255, 215, 0, 0.5) 100%
    );
    background-size: 400% 400%;
    animation: ${rainbowShift} 4s linear infinite, gradientMove 3s ease infinite;
    z-index: -1;
    opacity: 0.8;
  }

  @keyframes gradientMove {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

export default HolographicCard;
