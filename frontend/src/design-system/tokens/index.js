/**
 * Design System Tokens
 *
 * Central export for all design tokens.
 * Updated to include new timing, easing, springs, and animation mixins.
 */

export { colors } from './colors';
export { fonts, fontSizes, fontWeights, lineHeights, letterSpacing, textStyles, typography } from './typography';
export { spacing, radius, shadows, elevation, blur } from './spacing';
export { breakpoints, zIndex, transitions as breakpointTransitions, timing as breakpointTiming, navHeights } from './breakpoints';
export {
  // Keyframes
  fadeIn,
  slideUp,
  slideDown,
  slideIn,
  scaleIn,
  shimmer,
  shimmerPremium,
  pulse,
  pulseSoft,
  float,
  spin,
  glow,
  glowSubtle,
  sparkle,
  focusRing,
  focusRingIn,
  cardLift,
  celebrationPulse,
  screenShake,
  // Timing & Easing
  timing,
  easing,
  springs,
  transitions,
  // Mixins
  animationMixins,
  // Motion variants
  motionVariants
} from './animations';

// Import all tokens for consolidated theme object
import { colors } from './colors';
import { fonts, fontSizes, fontWeights, lineHeights, letterSpacing, textStyles } from './typography';
import { spacing, radius, shadows, elevation, blur } from './spacing';
import { breakpoints, zIndex, navHeights, transitions as breakpointTransitionsImport } from './breakpoints';
import { timing, easing, springs, animationMixins } from './animations';

// Consolidated theme object for backward compatibility
export const theme = {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  textStyles,
  spacing,
  radius,
  shadows,
  elevation,
  blur,
  breakpoints,
  zIndex,
  navHeights,
  transitions: breakpointTransitionsImport,
  timing,
  easing,
  springs,
  animationMixins
};

export default theme;
