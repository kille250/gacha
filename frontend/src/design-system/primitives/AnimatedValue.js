/**
 * AnimatedValue - Animated number display component
 *
 * Displays numbers with smooth counting animations and optional
 * delta indicators showing increases/decreases.
 *
 * Features:
 * - Smooth counting animation between values
 * - Delta popup showing change amount (+50, -100)
 * - Color-coded positive/negative changes
 * - Haptic feedback on change
 * - Accessible live region announcements
 * - Reduced motion support
 *
 * @example
 * <AnimatedValue value={points} prefix="$" />
 * <AnimatedValue value={score} showDelta deltaPosition="right" />
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { theme } from '../tokens';
import { haptic } from '../utilities/microInteractions';

// ==================== ANIMATIONS ====================

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const flashGreen = keyframes`
  0% { color: ${theme.colors.success}; text-shadow: 0 0 8px ${theme.colors.success}; }
  100% { color: inherit; text-shadow: none; }
`;

const flashRed = keyframes`
  0% { color: ${theme.colors.error}; text-shadow: 0 0 8px ${theme.colors.error}; }
  100% { color: inherit; text-shadow: none; }
`;

// ==================== STYLED COMPONENTS ====================

const Container = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  position: relative;
  font-variant-numeric: tabular-nums;
`;

const ValueText = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${props => props.$color || theme.colors.text};
  font-weight: ${props => props.$bold ? theme.fontWeights.semibold : 'inherit'};
  font-size: inherit;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};

  /* Pulse animation on change */
  ${props => props.$animate && !props.$reducedMotion && css`
    animation: ${pulse} 0.3s ease-out;
  `}

  /* Color flash on value change */
  ${props => props.$flashPositive && !props.$reducedMotion && css`
    animation: ${flashGreen} 0.6s ease-out;
  `}

  ${props => props.$flashNegative && !props.$reducedMotion && css`
    animation: ${flashRed} 0.6s ease-out;
  `}
`;

const DeltaIndicator = styled(motion.span)`
  position: ${props => props.$inline ? 'relative' : 'absolute'};
  ${props => !props.$inline && css`
    ${props.$position === 'right' ? 'left: 100%; margin-left: 8px;' : 'right: 100%; margin-right: 8px;'}
    top: 50%;
  `}

  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$positive ? theme.colors.success : theme.colors.error};
  white-space: nowrap;
  pointer-events: none;
`;

const DeltaIcon = styled.span`
  font-size: 10px;
`;

// Screen reader only text
const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// ==================== HOOKS ====================

/**
 * Hook for animated counting
 */
const useAnimatedCount = (value, duration = 400, enabled = true) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!enabled || previousValue.current === value) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }

    // Capture current display value at effect start
    const startValue = displayValue;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, enabled]);

  // Get the delta
  const delta = value - previousValue.current;

  return { displayValue, delta };
};

// ==================== COMPONENT ====================

/**
 * AnimatedValue Component
 *
 * @param {number} value - The number to display
 * @param {string} prefix - Text before the number (e.g., "$")
 * @param {string} suffix - Text after the number (e.g., "pts")
 * @param {boolean} showDelta - Show change indicator
 * @param {'left' | 'right' | 'inline'} deltaPosition - Position of delta indicator
 * @param {number} deltaDuration - How long to show delta (ms)
 * @param {number} animationDuration - Counting animation duration (ms)
 * @param {boolean} hapticOnChange - Enable haptic feedback
 * @param {string} color - Text color
 * @param {boolean} bold - Bold text
 * @param {Function} formatValue - Custom formatter
 * @param {string} ariaLabel - Accessible label
 * @param {boolean} flashOnChange - Flash color on change (green/red)
 */
const AnimatedValue = memo(function AnimatedValue({
  value,
  prefix = '',
  suffix = '',
  showDelta = false,
  deltaPosition = 'right',
  deltaDuration = 2000,
  animationDuration = 400,
  hapticOnChange = false,
  flashOnChange = false,
  color,
  bold = false,
  formatValue,
  ariaLabel,
  className,
  ...props
}) {
  const [showDeltaIndicator, setShowDeltaIndicator] = useState(false);
  const [currentDelta, setCurrentDelta] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [flashType, setFlashType] = useState(null); // 'positive' | 'negative' | null
  const previousValueRef = useRef(value);
  const deltaTimerRef = useRef(null);
  const flashTimerRef = useRef(null);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Animated count hook
  const { displayValue } = useAnimatedCount(
    value,
    animationDuration,
    !prefersReducedMotion
  );

  // Handle value changes
  useEffect(() => {
    if (previousValueRef.current !== value) {
      const delta = value - previousValueRef.current;

      // Trigger animation
      setAnimate(true);
      setTimeout(() => setAnimate(false), 300);

      // Flash color on change
      if (flashOnChange && delta !== 0) {
        setFlashType(delta > 0 ? 'positive' : 'negative');
        if (flashTimerRef.current) {
          clearTimeout(flashTimerRef.current);
        }
        flashTimerRef.current = setTimeout(() => {
          setFlashType(null);
        }, 600);
      }

      // Haptic feedback
      if (hapticOnChange && delta !== 0) {
        haptic.light();
      }

      // Show delta indicator
      if (showDelta && delta !== 0) {
        setCurrentDelta(delta);
        setShowDeltaIndicator(true);

        // Clear existing timer
        if (deltaTimerRef.current) {
          clearTimeout(deltaTimerRef.current);
        }

        // Hide delta after duration
        deltaTimerRef.current = setTimeout(() => {
          setShowDeltaIndicator(false);
        }, deltaDuration);
      }

      previousValueRef.current = value;
    }

    return () => {
      if (deltaTimerRef.current) {
        clearTimeout(deltaTimerRef.current);
      }
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
    };
  }, [value, showDelta, deltaDuration, hapticOnChange, flashOnChange]);

  // Format the display value
  const formattedValue = formatValue
    ? formatValue(displayValue)
    : displayValue.toLocaleString();

  // Delta indicator component
  const deltaIndicator = showDeltaIndicator && currentDelta !== 0 && (
    <AnimatePresence mode="wait">
      <DeltaIndicator
        key={`delta-${currentDelta}`}
        $positive={currentDelta > 0}
        $position={deltaPosition}
        $inline={deltaPosition === 'inline'}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.8 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
      >
        <DeltaIcon aria-hidden="true">
          {currentDelta > 0 ? '▲' : '▼'}
        </DeltaIcon>
        {currentDelta > 0 ? '+' : ''}{currentDelta.toLocaleString()}
      </DeltaIndicator>
    </AnimatePresence>
  );

  return (
    <Container className={className} {...props}>
      {deltaPosition === 'left' && deltaIndicator}

      <ValueText
        $color={color}
        $bold={bold}
        $animate={animate}
        $flashPositive={flashType === 'positive'}
        $flashNegative={flashType === 'negative'}
        $reducedMotion={prefersReducedMotion}
        aria-live="polite"
        aria-atomic="true"
      >
        {prefix}{formattedValue}{suffix}
      </ValueText>

      {(deltaPosition === 'right' || deltaPosition === 'inline') && deltaIndicator}

      {/* Screen reader announcement */}
      {ariaLabel && (
        <SrOnly role="status" aria-live="polite">
          {ariaLabel}: {prefix}{formattedValue}{suffix}
          {showDeltaIndicator && currentDelta !== 0 && (
            `. Changed by ${currentDelta > 0 ? 'plus' : 'minus'} ${Math.abs(currentDelta)}`
          )}
        </SrOnly>
      )}
    </Container>
  );
});

// ==================== VARIANTS ====================

/**
 * Currency display with animated value
 */
export const AnimatedCurrency = memo(function AnimatedCurrency({
  value,
  currency = '$',
  decimals = 0,
  ...props
}) {
  const formatValue = (val) => {
    if (decimals > 0) {
      return val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return val.toLocaleString();
  };

  return (
    <AnimatedValue
      value={value}
      prefix={currency}
      formatValue={formatValue}
      bold
      {...props}
    />
  );
});

/**
 * Points display with star icon
 */
export const AnimatedPoints = memo(function AnimatedPoints({
  value,
  icon = '★',
  ...props
}) {
  return (
    <AnimatedValue
      value={value}
      prefix={`${icon} `}
      showDelta
      hapticOnChange
      bold
      {...props}
    />
  );
});

/**
 * Score display with optional ranking colors
 */
export const AnimatedScore = memo(function AnimatedScore({
  value,
  threshold = { gold: 1000, silver: 500, bronze: 100 },
  ...props
}) {
  let color = theme.colors.text;
  if (value >= threshold.gold) {
    color = theme.colors.featured;
  } else if (value >= threshold.silver) {
    color = theme.colors.textSecondary;
  } else if (value >= threshold.bronze) {
    color = '#CD7F32'; // Bronze color
  }

  return (
    <AnimatedValue
      value={value}
      color={color}
      showDelta
      bold
      {...props}
    />
  );
});

/**
 * Percentage display
 */
export const AnimatedPercentage = memo(function AnimatedPercentage({
  value,
  ...props
}) {
  return (
    <AnimatedValue
      value={Math.round(value * 100) / 100}
      suffix="%"
      {...props}
    />
  );
});

export default AnimatedValue;
