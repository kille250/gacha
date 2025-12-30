/**
 * ProgressRing - Circular progress indicator
 *
 * A beautiful circular progress indicator with animation,
 * perfect for displaying daily progress, completion rates, etc.
 *
 * Features:
 * - Smooth animated progress
 * - Configurable colors and sizes
 * - Optional center content
 * - Gradient stroke support
 * - Reduced motion support
 *
 * @example
 * <ProgressRing value={75} max={100} />
 * <ProgressRing value={5} max={10} size={80} color="gold">
 *   <span>5/10</span>
 * </ProgressRing>
 */

import React, { memo, useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { theme } from '../tokens';

// ==================== ANIMATIONS ====================

const progressAnimation = keyframes`
  from {
    stroke-dashoffset: var(--circumference);
  }
  to {
    stroke-dashoffset: var(--offset);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 4px var(--glow-color));
  }
  50% {
    filter: drop-shadow(0 0 8px var(--glow-color));
  }
`;

// ==================== STYLED COMPONENTS ====================

const Container = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
`;

const SVG = styled.svg`
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`;

const BackgroundCircle = styled.circle`
  fill: none;
  stroke: ${props => props.$trackColor || 'rgba(255, 255, 255, 0.08)'};
  stroke-width: ${props => props.$strokeWidth};
`;

const ProgressCircle = styled.circle`
  fill: none;
  stroke: ${props => props.$color};
  stroke-width: ${props => props.$strokeWidth};
  stroke-linecap: round;
  stroke-dasharray: var(--circumference);
  stroke-dashoffset: var(--offset);
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);

  ${props => props.$animate && css`
    animation: ${progressAnimation} 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `}

  ${props => props.$glow && css`
    --glow-color: ${props.$color}60;
    animation: ${pulseGlow} 2s ease-in-out infinite;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

const CenterContent = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$fontSize}px;
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  line-height: 1;
`;

const PercentageText = styled.span`
  font-variant-numeric: tabular-nums;
`;

const LabelText = styled.span`
  font-size: ${props => Math.max(10, props.$fontSize * 0.5)}px;
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

// ==================== COLOR PRESETS ====================

const colorPresets = {
  primary: theme.colors.primary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  error: theme.colors.error,
  purple: theme.colors.accentSecondary,
  gold: theme.colors.featured,
  cyan: '#00c7be',
};

// ==================== COMPONENT ====================

/**
 * ProgressRing Component
 *
 * @param {number} value - Current progress value
 * @param {number} max - Maximum value (default: 100)
 * @param {number} size - Ring size in pixels (default: 60)
 * @param {number} strokeWidth - Stroke width (default: 6)
 * @param {string} color - Color or preset name
 * @param {string} trackColor - Background track color
 * @param {boolean} showPercentage - Show percentage in center
 * @param {string} label - Optional label below percentage
 * @param {boolean} animate - Animate on mount
 * @param {boolean} glow - Add glow effect when complete
 * @param {React.ReactNode} children - Custom center content
 */
const ProgressRing = memo(function ProgressRing({
  value = 0,
  max = 100,
  size = 60,
  strokeWidth = 6,
  color = 'primary',
  trackColor,
  showPercentage = false,
  label,
  animate = true,
  glow = false,
  children,
  className,
}) {
  const [mounted, setMounted] = useState(!animate);

  useEffect(() => {
    if (animate) {
      // Small delay for animation effect
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  // Calculate progress
  const clampedValue = Math.min(Math.max(0, value), max);
  const percentage = max > 0 ? (clampedValue / max) * 100 : 0;
  const isComplete = percentage >= 100;

  // Calculate circle dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Get color
  const strokeColor = colorPresets[color] || color;

  // Font size based on ring size
  const fontSize = Math.max(12, size * 0.25);

  return (
    <Container $size={size} className={className}>
      <SVG
        viewBox={`0 0 ${size} ${size}`}
        style={{
          '--circumference': circumference,
          '--offset': mounted ? offset : circumference,
        }}
      >
        {/* Background track */}
        <BackgroundCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          $strokeWidth={strokeWidth}
          $trackColor={trackColor}
        />

        {/* Progress arc */}
        <ProgressCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          $strokeWidth={strokeWidth}
          $color={strokeColor}
          $animate={animate && !mounted}
          $glow={glow && isComplete}
        />
      </SVG>

      {/* Center content */}
      <CenterContent $fontSize={fontSize}>
        {children || (
          <>
            {showPercentage && (
              <PercentageText>
                {Math.round(percentage)}%
              </PercentageText>
            )}
            {label && (
              <LabelText $fontSize={fontSize}>{label}</LabelText>
            )}
          </>
        )}
      </CenterContent>
    </Container>
  );
});

ProgressRing.displayName = 'ProgressRing';

export default ProgressRing;
