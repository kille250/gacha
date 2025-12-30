/**
 * PulsingDot - Notification/new item indicator
 *
 * A subtle pulsing dot to indicate new items, notifications,
 * or attention-needed states.
 *
 * Features:
 * - Multiple color presets
 * - Size variants
 * - Optional count badge
 * - Reduced motion support
 * - Glow effect
 *
 * @example
 * <PulsingDot />
 * <PulsingDot color="error" size="md" />
 * <PulsingDot count={5} />
 */

import React, { memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { theme } from '../tokens';

// ==================== ANIMATIONS ====================

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
`;

const ripple = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
`;

const glow = keyframes`
  0%, 100% {
    box-shadow: 0 0 4px var(--glow-color), 0 0 8px var(--glow-color);
  }
  50% {
    box-shadow: 0 0 8px var(--glow-color), 0 0 16px var(--glow-color);
  }
`;

// ==================== SIZE PRESETS ====================

const sizePresets = {
  xs: { size: 6, fontSize: 8, padding: '0 3px' },
  sm: { size: 8, fontSize: 9, padding: '0 4px' },
  md: { size: 10, fontSize: 10, padding: '1px 5px' },
  lg: { size: 14, fontSize: 11, padding: '2px 6px' },
};

// ==================== COLOR PRESETS ====================

const colorPresets = {
  primary: { bg: theme.colors.primary, glow: 'rgba(0, 113, 227, 0.5)' },
  success: { bg: theme.colors.success, glow: 'rgba(52, 199, 89, 0.5)' },
  warning: { bg: theme.colors.warning, glow: 'rgba(255, 159, 10, 0.5)' },
  error: { bg: theme.colors.error, glow: 'rgba(255, 59, 48, 0.5)' },
  purple: { bg: theme.colors.accentSecondary, glow: 'rgba(175, 82, 222, 0.5)' },
  gold: { bg: theme.colors.featured, glow: 'rgba(255, 167, 38, 0.5)' },
  new: { bg: '#00c7be', glow: 'rgba(0, 199, 190, 0.5)' },
};

// ==================== STYLED COMPONENTS ====================

const Container = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Dot = styled.span`
  position: relative;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  min-width: ${props => props.$hasCount ? 'auto' : `${props.$size}px`};
  min-height: ${props => props.$size}px;
  padding: ${props => props.$hasCount ? props.$padding : '0'};
  background: ${props => props.$bgColor};
  border-radius: ${theme.radius.full};
  --glow-color: ${props => props.$glowColor};

  ${props => props.$animate && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}

  ${props => props.$showGlow && css`
    animation: ${pulse} 2s ease-in-out infinite, ${glow} 2s ease-in-out infinite;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    ${props => props.$showGlow && css`
      box-shadow: 0 0 6px var(--glow-color);
    `}
  }
`;

const RippleEffect = styled.span`
  position: absolute;
  inset: 0;
  background: ${props => props.$bgColor};
  border-radius: ${theme.radius.full};
  animation: ${ripple} 1.5s ease-out infinite;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const CountText = styled.span`
  font-size: ${props => props.$fontSize}px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`;

const PositionWrapper = styled.span`
  position: absolute;
  top: ${props => props.$top || '-4px'};
  right: ${props => props.$right || '-4px'};
  z-index: 1;
`;

// ==================== COMPONENT ====================

/**
 * PulsingDot Component
 *
 * @param {'xs' | 'sm' | 'md' | 'lg'} size - Dot size
 * @param {string} color - Color preset or custom color
 * @param {number} count - Optional count to display
 * @param {number} maxCount - Max count before showing "+"
 * @param {boolean} animate - Enable pulse animation
 * @param {boolean} showRipple - Show expanding ripple effect
 * @param {boolean} showGlow - Show glow effect
 * @param {boolean} positioned - Render as positioned element (for overlaying)
 * @param {string} top - Top position when positioned
 * @param {string} right - Right position when positioned
 */
const PulsingDot = memo(function PulsingDot({
  size = 'sm',
  color = 'error',
  count,
  maxCount = 99,
  animate = true,
  showRipple = false,
  showGlow = false,
  positioned = false,
  top,
  right,
  className,
}) {
  const sizeConfig = sizePresets[size] || sizePresets.sm;
  const colorConfig = colorPresets[color] || { bg: color, glow: `${color}80` };
  const hasCount = typeof count === 'number';

  const displayCount = hasCount
    ? count > maxCount
      ? `${maxCount}+`
      : count.toString()
    : null;

  const dot = (
    <Container className={className}>
      {showRipple && (
        <RippleEffect $bgColor={colorConfig.bg} />
      )}
      <Dot
        $size={sizeConfig.size}
        $bgColor={colorConfig.bg}
        $glowColor={colorConfig.glow}
        $animate={animate}
        $showGlow={showGlow}
        $hasCount={hasCount}
        $padding={sizeConfig.padding}
        aria-hidden={!hasCount}
        role={hasCount ? 'status' : undefined}
      >
        {displayCount && (
          <CountText $fontSize={sizeConfig.fontSize}>
            {displayCount}
          </CountText>
        )}
      </Dot>
    </Container>
  );

  if (positioned) {
    return (
      <PositionWrapper $top={top} $right={right}>
        {dot}
      </PositionWrapper>
    );
  }

  return dot;
});

PulsingDot.displayName = 'PulsingDot';

export default PulsingDot;
