/**
 * Design System Tokens
 *
 * Central export for all design tokens.
 */

export { colors } from './colors';
export { fonts, fontSizes, fontWeights, lineHeights, typography } from './typography';
export { spacing, radius, shadows, blur } from './spacing';
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
  spacing: require('./spacing').spacing,
  radius: require('./spacing').radius,
  shadows: require('./spacing').shadows,
  blur: require('./spacing').blur,
  breakpoints: require('./breakpoints').breakpoints,
  zIndex: require('./breakpoints').zIndex,
  transitions: require('./breakpoints').transitions,
  timing: require('./breakpoints').timing
};

export default theme;
