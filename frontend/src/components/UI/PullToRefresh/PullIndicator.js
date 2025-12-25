/**
 * PullIndicator - Visual feedback component for pull-to-refresh
 *
 * Apple-inspired pull indicator with:
 * - Smooth arrow rotation based on pull progress
 * - Clean state transitions
 * - Spinner for refreshing state
 * - Checkmark for completion
 * - Subtle, calm visual language
 */
import React, { memo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowDownward, MdCheck } from 'react-icons/md';
import { theme, springs } from '../../../design-system';
import { PULL_STATES } from '../../../hooks/usePullToRefresh';

/**
 * Keyframes
 */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

/**
 * Styled components
 */
const IndicatorContainer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: ${theme.spacing.md};
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
`;

const IconContainer = styled(motion.div)`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${theme.colors.surfaceElevated};
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04);

  ${props => props.$isThreshold && css`
    background: ${theme.colors.primary};
    color: white;
  `}

  ${props => props.$isRefreshing && css`
    background: ${theme.colors.surfaceElevated};
  `}

  ${props => props.$isComplete && css`
    background: ${theme.colors.success};
    color: white;
    animation: ${scaleIn} 200ms ${theme.easing.appleSpring};
  `}
`;

const ArrowIcon = styled(MdArrowDownward)`
  font-size: 18px;
  color: ${theme.colors.textSecondary};
  transition: transform 200ms ${theme.easing.apple};

  ${props => props.$isThreshold && css`
    color: white;
    transform: rotate(180deg);
  `}
`;

const SpinnerRing = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid ${theme.colors.surfaceBorder};
  border-top-color: ${theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.5s;
  }
`;

const CheckIcon = styled(MdCheck)`
  font-size: 18px;
`;

const HintText = styled(motion.span)`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  margin-top: ${theme.spacing.xs};
  opacity: 0.8;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Get the appropriate hint text for current state
 */
const getHintText = (pullState, progress) => {
  switch (pullState) {
    case PULL_STATES.PULLING:
      return progress > 0.5 ? 'Keep pulling...' : 'Pull to refresh';
    case PULL_STATES.THRESHOLD_REACHED:
      return 'Release to refresh';
    case PULL_STATES.REFRESHING:
      return 'Updating...';
    case PULL_STATES.COMPLETING:
      return 'Done';
    default:
      return null;
  }
};

/**
 * PullIndicator Component
 *
 * @param {string} pullState - Current pull state from usePullToRefresh
 * @param {number} progress - Pull progress (0 to 1)
 * @param {number} visualOffset - Visual offset in pixels
 * @param {boolean} showHint - Whether to show hint text
 * @param {boolean} reducedMotion - Reduce animations
 */
const PullIndicator = memo(({
  pullState,
  progress,
  visualOffset,
  showHint = true,
  reducedMotion = false,
}) => {
  const isIdle = pullState === PULL_STATES.IDLE;
  const isThreshold = pullState === PULL_STATES.THRESHOLD_REACHED;
  const isRefreshing = pullState === PULL_STATES.REFRESHING;
  const isComplete = pullState === PULL_STATES.COMPLETING;

  // Don't render if idle and no offset
  if (isIdle && visualOffset <= 0) {
    return null;
  }

  // Calculate arrow rotation (0 to 180 degrees based on progress)
  const arrowRotation = Math.min(progress * 180, 180);

  // Indicator height follows the visual offset
  const indicatorHeight = Math.max(0, visualOffset);

  const hintText = getHintText(pullState, progress);

  return (
    <IndicatorContainer
      style={{ height: indicatorHeight }}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role="status"
      aria-live="polite"
      aria-label={hintText || 'Pull to refresh'}
    >
      <AnimatePresence mode="wait">
        {isComplete ? (
          <IconContainer
            key="complete"
            $isComplete
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : springs.bouncy}
          >
            <CheckIcon aria-hidden="true" />
          </IconContainer>
        ) : isRefreshing ? (
          <IconContainer
            key="refreshing"
            $isRefreshing
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SpinnerRing aria-hidden="true" />
          </IconContainer>
        ) : (
          <IconContainer
            key="arrow"
            $isThreshold={isThreshold}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: Math.min(progress * 2, 1),
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
          >
            <ArrowIcon
              $isThreshold={isThreshold}
              style={{
                transform: isThreshold ? 'rotate(180deg)' : `rotate(${arrowRotation}deg)`
              }}
              aria-hidden="true"
            />
          </IconContainer>
        )}
      </AnimatePresence>

      {showHint && hintText && (
        <AnimatePresence>
          <HintText
            key={pullState}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
          >
            {hintText}
          </HintText>
        </AnimatePresence>
      )}
    </IndicatorContainer>
  );
});

PullIndicator.displayName = 'PullIndicator';

export default PullIndicator;
