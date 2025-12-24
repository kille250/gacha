/**
 * Spacing Tokens
 *
 * Consistent spacing values, border radius, shadows, and elevation.
 */

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px'
};

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '28px',
  full: '9999px'
};

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
  md: '0 4px 20px rgba(0, 0, 0, 0.25)',
  lg: '0 8px 40px rgba(0, 0, 0, 0.35)',
  xl: '0 16px 64px rgba(0, 0, 0, 0.45)',
  glow: (color) => `0 0 24px ${color}40, 0 0 48px ${color}20`,
  inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
};

/**
 * Elevation Scale
 *
 * Semantic shadow levels for UI depth hierarchy.
 * Use these for consistent elevation across components.
 */
export const elevation = {
  0: 'none',
  1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
  2: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
  3: '0 8px 24px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.12)',
  4: '0 16px 40px rgba(0, 0, 0, 0.25), 0 8px 16px rgba(0, 0, 0, 0.15)',
  5: '0 24px 64px rgba(0, 0, 0, 0.3), 0 12px 24px rgba(0, 0, 0, 0.2)'
};

export const blur = {
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px'
};

const spacingTokens = { spacing, radius, shadows, elevation, blur };
export default spacingTokens;
