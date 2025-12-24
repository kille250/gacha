/**
 * Design System Tokens
 *
 * Central export for all design tokens.
 */

export { colors } from './colors';
export { fonts, fontSizes, fontWeights, lineHeights, letterSpacing, typography } from './typography';
export { spacing, radius, shadows, elevation, blur } from './spacing';
export { breakpoints, zIndex, transitions, timing } from './breakpoints';
export {
  fadeIn,
  slideUp,
  slideDown,
  scaleIn,
  shimmer,
  pulse,
  float,
  spin,
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
  spacing: require('./spacing').spacing,
  radius: require('./spacing').radius,
  shadows: require('./spacing').shadows,
  elevation: require('./spacing').elevation,
  blur: require('./spacing').blur,
  breakpoints: require('./breakpoints').breakpoints,
  zIndex: require('./breakpoints').zIndex,
  transitions: require('./breakpoints').transitions,
  timing: require('./breakpoints').timing
};

export default theme;
