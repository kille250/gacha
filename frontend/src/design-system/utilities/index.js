/**
 * Design System Utilities
 *
 * CSS utilities and React hooks for common patterns.
 */

export {
  srOnly,
  srOnlyFocusable,
  VisuallyHidden,
  SkipLink,
  AriaLiveRegion,
  AriaAlert,
  useAriaLive,
  useFocusReturn,
  useRovingTabIndex,
  useReducedMotion
} from './accessibility';

// Rarity utilities
export { getRarityColor, getRarityGlow } from './rarity';

// Micro-interaction utilities
export {
  // Haptic feedback
  haptic,
  // Keyframe animations
  successPulse,
  errorShake,
  gentleBounce,
  rippleExpand,
  glowPulse,
  fadeInUp,
  scaleInBounce,
  // CSS mixins
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
  // Motion variants
  microMotionVariants
} from './microInteractions';
