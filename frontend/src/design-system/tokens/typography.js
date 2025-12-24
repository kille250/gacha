/**
 * Typography Tokens
 *
 * Font families, sizes, weights, line heights, and letter-spacing.
 * Follows Apple's typography guidelines for premium, readable text.
 */

export const fonts = {
  primary: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", "Fira Code", "Monaco", monospace'
};

export const fontSizes = {
  xs: '11px',
  sm: '13px',
  base: '15px',
  md: '17px',
  lg: '20px',
  xl: '24px',
  '2xl': '28px',
  '3xl': '34px',
  '4xl': '40px',
  '5xl': '48px',
  hero: '56px'
};

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
};

export const lineHeights = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.625
};

/**
 * Letter Spacing Scale
 *
 * - tight: Large display headings (48px+)
 * - snug: Section headings (24-40px)
 * - normal: Body text
 * - wide: Small labels and captions
 * - wider: All-caps text, badges
 */
export const letterSpacing = {
  tight: '-0.03em',
  snug: '-0.02em',
  normal: '0',
  wide: '0.01em',
  wider: '0.02em'
};

export const typography = {
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing
};

export default typography;
