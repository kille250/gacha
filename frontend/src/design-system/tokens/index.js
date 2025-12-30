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

// Consolidated theme object for backward compatibility
export const theme = {
  colors: require('./colors').colors,
  fonts: require('./typography').fonts,
  fontSizes: require('./typography').fontSizes,
  fontWeights: require('./typography').fontWeights,
  lineHeights: require('./typography').lineHeights,
  letterSpacing: require('./typography').letterSpacing,
  textStyles: require('./typography').textStyles,
  spacing: require('./spacing').spacing,
  radius: require('./spacing').radius,
  shadows: require('./spacing').shadows,
  elevation: require('./spacing').elevation,
  blur: require('./spacing').blur,
  breakpoints: require('./breakpoints').breakpoints,
  zIndex: require('./breakpoints').zIndex,
  navHeights: require('./breakpoints').navHeights,
  transitions: require('./breakpoints').transitions,
  timing: require('./animations').timing,
  easing: require('./animations').easing,
  springs: require('./animations').springs,
  animationMixins: require('./animations').animationMixins
};

export default theme;
