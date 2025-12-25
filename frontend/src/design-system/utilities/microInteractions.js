/**
 * Micro-Interactions Utilities
 *
 * Premium interaction feedback utilities for a polished, world-class UX.
 * These utilities provide subtle but impactful feedback that makes
 * the interface feel responsive, alive, and premium.
 *
 * Includes:
 * - Haptic feedback for touch devices
 * - Visual ripple effects
 * - Success/error animation triggers
 * - Scroll-based reveal animations
 * - Press state management
 */

import { css, keyframes } from 'styled-components';
import { theme, timing, easing } from '../tokens';

// ==================== HAPTIC FEEDBACK ====================

/**
 * Haptic feedback patterns for different interaction types.
 * Uses the Vibration API on supported devices.
 *
 * @example
 * haptic.light()    // Light tap feedback
 * haptic.medium()   // Button press feedback
 * haptic.success()  // Success confirmation
 * haptic.error()    // Error alert
 * haptic.selection() // Selection change
 */
export const haptic = {
  // Light tap - for subtle interactions like navigation
  light: () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(8);
    }
  },

  // Medium tap - for button presses and confirmations
  medium: () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(15);
    }
  },

  // Heavy tap - for important actions
  heavy: () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(25);
    }
  },

  // Success pattern - double tap for positive feedback
  success: () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate([10, 50, 10]);
    }
  },

  // Error pattern - longer single vibration for attention
  error: () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate([30, 30, 30]);
    }
  },

  // Warning pattern - two short pulses
  warning: () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate([15, 30, 15]);
    }
  },

  // Selection change - very light feedback
  selection: () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(5);
    }
  },

  // Custom pattern
  custom: (pattern) => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(pattern);
    }
  },
};

// ==================== ANIMATION KEYFRAMES ====================

// Subtle scale pulse for success states
export const successPulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
`;

// Shake animation for error states
export const errorShake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
`;

// Gentle bounce for attention
export const gentleBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

// Ripple expansion
export const rippleExpand = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

// Subtle glow pulse for premium elements
export const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 var(--glow-color, rgba(0, 113, 227, 0.4));
  }
  50% {
    box-shadow: 0 0 20px 4px var(--glow-color, rgba(0, 113, 227, 0.2));
  }
`;

// Checkmark draw animation
export const drawCheck = keyframes`
  0% {
    stroke-dashoffset: 24;
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

// Fade in up for reveal
export const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Scale in with bounce
export const scaleInBounce = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  70% {
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

// ==================== CSS MIXINS ====================

/**
 * Touch feedback - visual press state for touch devices
 */
export const touchFeedback = css`
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;

  &:active {
    transform: scale(0.97);
    transition: transform 0.1s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
      opacity: 0.7;
    }
  }
`;

/**
 * Ripple effect container mixin
 */
export const rippleContainer = css`
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.3) 0%,
      transparent 70%
    );
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
    pointer-events: none;
    border-radius: inherit;
  }

  &:active::after {
    animation: ${rippleExpand} 0.4s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      display: none;
    }
  }
`;

/**
 * Success animation mixin
 */
export const successAnimation = css`
  animation: ${successPulse} 0.3s ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * Error shake animation mixin
 */
export const errorAnimation = css`
  animation: ${errorShake} 0.4s ease-in-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * Attention-grabbing bounce
 */
export const attentionBounce = css`
  animation: ${gentleBounce} 0.5s ease-in-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * Premium hover lift effect - for cards and interactive elements
 */
export const hoverLift = css`
  transition:
    transform ${timing.normal} ${easing.appleSpring},
    box-shadow ${timing.normal} ${easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.cardHover};
    }

    &:active {
      transform: translateY(0);
      box-shadow: ${theme.shadows.card};
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: box-shadow ${timing.fast} ${easing.easeOut};

    &:hover {
      transform: none;
    }
  }
`;

/**
 * Interactive scale - subtle scale on hover/press
 */
export const interactiveScale = css`
  transition: transform ${timing.fast} ${easing.appleSpring};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: scale(1.02);
    }
  }

  &:active {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover, &:active {
      transform: none;
    }
  }
`;

/**
 * Smooth reveal on scroll - use with IntersectionObserver
 */
export const scrollReveal = css`
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity ${timing.slow} ${easing.easeOut},
    transform ${timing.slow} ${easing.easeOut};

  &[data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    transform: none;
    transition: none;
  }
`;

/**
 * Staggered children animation
 * Usage: Apply to parent, children will animate in sequence
 */
export const staggeredChildren = css`
  > * {
    opacity: 0;
    transform: translateY(10px);
    animation: ${fadeInUp} 0.3s ease-out forwards;
  }

  ${[...Array(10)].map((_, i) => css`
    > *:nth-child(${i + 1}) {
      animation-delay: ${i * 50}ms;
    }
  `)}

  @media (prefers-reduced-motion: reduce) {
    > * {
      opacity: 1;
      transform: none;
      animation: none;
    }
  }
`;

/**
 * Premium glow effect for special elements
 */
export const premiumGlow = (color = theme.colors.primary) => css`
  --glow-color: ${color}40;
  animation: ${glowPulse} 2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    box-shadow: 0 0 12px var(--glow-color);
  }
`;

/**
 * Focus enhancement - more prominent focus for accessibility
 */
export const enhancedFocus = css`
  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing};
    transition: box-shadow ${timing.instant} ease-out;
  }

  /* High contrast mode enhancement */
  @media (forced-colors: active) {
    &:focus-visible {
      outline: 3px solid CanvasText;
      outline-offset: 2px;
    }
  }
`;

/**
 * Loading shimmer overlay
 */
export const loadingShimmer = css`
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.08) 50%,
      transparent 100%
    );
    animation: shimmerMove 1.5s ease-in-out infinite;
  }

  @keyframes shimmerMove {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
      opacity: 0.5;
    }
  }
`;

// ==================== FRAMER MOTION VARIANTS ====================

/**
 * Framer Motion variants for common micro-interactions
 */
export const microMotionVariants = {
  // Tap scale effect
  tap: {
    scale: 0.97,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },

  // Hover lift
  hover: {
    y: -2,
    transition: { type: 'spring', stiffness: 400, damping: 20 }
  },

  // Success scale pulse
  success: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3, ease: 'easeOut' }
  },

  // Error shake
  error: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4, ease: 'easeInOut' }
  },

  // Attention bounce
  attention: {
    y: [0, -4, 0],
    transition: { duration: 0.3, ease: 'easeOut' }
  },

  // Reveal from below
  reveal: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    }
  },

  // Scale in with slight bounce
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 350, damping: 20 }
    }
  },

  // Stagger container
  stagger: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  },

  // Stagger child item
  staggerItem: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    }
  }
};

const microInteractions = {
  haptic,
  successPulse,
  errorShake,
  gentleBounce,
  rippleExpand,
  glowPulse,
  fadeInUp,
  scaleInBounce,
  touchFeedback,
  rippleContainer,
  successAnimation,
  errorAnimation,
  attentionBounce,
  hoverLift,
  interactiveScale,
  scrollReveal,
  staggeredChildren,
  premiumGlow,
  enhancedFocus,
  loadingShimmer,
  microMotionVariants
};

export default microInteractions;
