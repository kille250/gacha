/**
 * Spacing Tokens
 *
 * Consistent spacing values, border radius, and shadows.
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

export const blur = {
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px'
};

const spacingTokens = { spacing, radius, shadows, blur };
export default spacingTokens;
