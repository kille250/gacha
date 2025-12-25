/**
 * Toast - Premium auto-dismissing notification component
 *
 * Features:
 * - Animated progress bar showing time remaining
 * - Swipe-to-dismiss on touch devices
 * - Pause on hover/focus for accessibility
 * - Smooth spring animations
 * - Haptic feedback on mobile
 * - Stacking with proper spacing
 */

import React, { useState, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { MdCheck, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';
import { theme } from '../../../design-system';

const toastVariants = {
  success: {
    icon: MdCheck,
    bg: 'rgba(52, 199, 89, 0.12)',
    border: 'rgba(52, 199, 89, 0.25)',
    color: theme.colors.success,
    progressColor: theme.colors.success
  },
  error: {
    icon: MdError,
    bg: 'rgba(255, 59, 48, 0.12)',
    border: 'rgba(255, 59, 48, 0.25)',
    color: theme.colors.error,
    progressColor: theme.colors.error
  },
  warning: {
    icon: MdWarning,
    bg: 'rgba(255, 159, 10, 0.12)',
    border: 'rgba(255, 159, 10, 0.25)',
    color: theme.colors.warning,
    progressColor: theme.colors.warning
  },
  info: {
    icon: MdInfo,
    bg: 'rgba(90, 200, 250, 0.12)',
    border: 'rgba(90, 200, 250, 0.25)',
    color: theme.colors.info,
    progressColor: theme.colors.info
  }
};

// Progress bar countdown animation
const progressShrink = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

// Icon entrance animation
const iconPop = keyframes`
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(0deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const ToastWrapper = styled(motion.div)`
  position: relative;
  touch-action: pan-y;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  @media (pointer: fine) {
    cursor: default;
    &:active { cursor: default; }
  }
`;

const ToastContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => toastVariants[props.$variant].bg};
  border: 1px solid ${props => toastVariants[props.$variant].border};
  border-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadows.lg};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  max-width: 420px;
  width: calc(100vw - 32px);
  overflow: hidden;
  transition: box-shadow ${theme.timing.fast} ${theme.easing.easeOut};

  @media (min-width: ${theme.breakpoints.sm}) {
    width: auto;
    min-width: 320px;
  }

  /* Subtle lift on hover */
  @media (hover: hover) and (pointer: fine) {
    ${ToastWrapper}:hover & {
      box-shadow: ${theme.shadows.xl};
    }
  }
`;

const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => toastVariants[props.$variant].progressColor};
  opacity: 0.6;
  transform-origin: left;
  animation: ${progressShrink} ${props => props.$duration}ms linear forwards;
  animation-play-state: ${props => props.$paused ? 'paused' : 'running'};

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${theme.radius.full};
  background: ${props => `${toastVariants[props.$variant].color}20`};
  color: ${props => toastVariants[props.$variant].color};
  font-size: 18px;
  flex-shrink: 0;
  animation: ${iconPop} 0.4s ${theme.easing.appleSpring} forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  line-height: ${theme.lineHeights.snug};

  ${props => props.$hasDescription && css`
    margin-bottom: 2px;
  `}
`;

const Description = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  line-height: ${theme.lineHeights.normal};
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textTertiary};
  cursor: pointer;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    color ${theme.timing.fast} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.glass};
      color: ${theme.colors.text};
    }
  }

  &:active {
    transform: scale(0.9);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }
`;

// Swipe threshold for dismissal (in pixels)
const SWIPE_THRESHOLD = 100;
// Velocity threshold for quick swipe dismissal
const VELOCITY_THRESHOLD = 500;

/**
 * Toast Component
 *
 * @param {Object} props
 * @param {'success' | 'error' | 'warning' | 'info'} props.variant - Toast type
 * @param {string} props.title - Toast title (required)
 * @param {string} props.description - Optional description text
 * @param {boolean} props.dismissible - Whether to show close button
 * @param {Function} props.onDismiss - Called when toast is dismissed
 * @param {number} props.duration - Auto-dismiss duration in ms (for progress bar)
 */
const Toast = ({
  variant = 'info',
  title,
  description,
  dismissible = true,
  onDismiss,
  duration = 4000
}) => {
  const Icon = toastVariants[variant].icon;
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // Handle swipe end
  const handleDragEnd = useCallback((_, info) => {
    const shouldDismiss =
      Math.abs(info.offset.x) > SWIPE_THRESHOLD ||
      Math.abs(info.velocity.x) > VELOCITY_THRESHOLD;

    if (shouldDismiss && onDismiss) {
      setIsExiting(true);
      triggerHaptic();
      // Animate out in swipe direction
      const exitX = info.offset.x > 0 ? 300 : -300;
      animate(x, exitX, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        onComplete: onDismiss
      });
    } else {
      // Snap back
      animate(x, 0, {
        type: 'spring',
        stiffness: 500,
        damping: 30
      });
    }
  }, [onDismiss, x, triggerHaptic]);

  // Pause progress on hover/focus for accessibility
  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);
  const handleFocus = useCallback(() => setIsPaused(true), []);
  const handleBlur = useCallback(() => setIsPaused(false), []);

  return (
    <ToastWrapper
      style={{ x, opacity: isExiting ? opacity : 1 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        mass: 0.8
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="alert"
      aria-live="polite"
    >
      <ToastContainer $variant={variant}>
        <IconWrapper $variant={variant}>
          <Icon />
        </IconWrapper>
        <Content>
          <Title $hasDescription={!!description}>{title}</Title>
          {description && <Description>{description}</Description>}
        </Content>
        {dismissible && onDismiss && (
          <CloseButton
            onClick={onDismiss}
            aria-label="Dismiss notification"
            type="button"
          >
            <MdClose />
          </CloseButton>
        )}
        {duration > 0 && (
          <ProgressBar
            $variant={variant}
            $duration={duration}
            $paused={isPaused}
          />
        )}
      </ToastContainer>
    </ToastWrapper>
  );
};

/**
 * ToastList - Container for multiple stacked toasts
 *
 * Features:
 * - Smart positioning above bottom nav on mobile
 * - Stacking with visual depth
 * - Max visible toasts with "N more" indicator
 */
const ToastListWrapper = styled.div`
  position: fixed;
  bottom: ${theme.spacing.xl};
  right: ${theme.spacing.lg};
  z-index: ${theme.zIndex.toast};
  display: flex;
  flex-direction: column-reverse;
  gap: ${theme.spacing.sm};
  pointer-events: none;
  max-height: 80vh;
  overflow: visible;

  > * {
    pointer-events: auto;
  }

  /* Mobile: position above bottom nav with safe area */
  @media (max-width: ${theme.breakpoints.md}) {
    left: ${theme.spacing.md};
    right: ${theme.spacing.md};
    /* Account for bottom nav (72px) + safe area + some padding */
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    left: ${theme.spacing.sm};
    right: ${theme.spacing.sm};
  }
`;

const MoreToastsIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.glass};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  align-self: center;
`;

// Maximum visible toasts before showing "more" indicator
const MAX_VISIBLE_TOASTS = 3;

export const ToastList = ({ toasts, onDismiss }) => {
  const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS);
  const hiddenCount = Math.max(0, toasts.length - MAX_VISIBLE_TOASTS);

  return (
    <ToastListWrapper
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence mode="popLayout">
        {hiddenCount > 0 && (
          <MoreToastsIndicator
            key="more-indicator"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            +{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}
          </MoreToastsIndicator>
        )}
        {visibleToasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => onDismiss(toast.id)}
          />
        ))}
      </AnimatePresence>
    </ToastListWrapper>
  );
};

export default Toast;
