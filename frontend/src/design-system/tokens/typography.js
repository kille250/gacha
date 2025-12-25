/**
 * Typography Tokens
 *
 * Font families, sizes, weights, line heights, and letter-spacing.
 * Follows Apple's typography guidelines for premium, readable text.
 *
 * Updated for better readability and visual hierarchy.
 * Base size increased to 16px for improved legibility.
 */

export const fonts = {
  primary: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", "Fira Code", "Monaco", monospace'
};

export const fontSizes = {
  xs: '12px',      // Slightly larger for better readability
  sm: '14px',      // Standard body small
  base: '16px',    // Primary body text (up from 15px)
  md: '18px',      // Emphasis text
  lg: '22px',      // Section headers
  xl: '28px',      // Page titles
  '2xl': '34px',   // Hero text
  '3xl': '42px',   // Display headings
  '4xl': '52px',   // Large display
  '5xl': '64px',   // Extra large display
  hero: '72px'     // Splash/feature headlines
};

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
};

export const lineHeights = {
  tight: 1.15,     // Headlines and display text
  snug: 1.25,      // Subheadings
  normal: 1.5,     // Body text
  relaxed: 1.625,  // Long-form content
  ui: 1.4          // UI elements (buttons, labels)
};

/**
 * Letter Spacing Scale
 *
 * - tighter: Large display headings (64px+)
 * - tight: Display headings (48-64px)
 * - snug: Section headings (24-42px)
 * - normal: Body text
 * - wide: Small labels and captions
 * - wider: All-caps text, badges
 */
export const letterSpacing = {
  tighter: '-0.04em',
  tight: '-0.03em',
  snug: '-0.02em',
  normal: '0',
  wide: '0.01em',
  wider: '0.02em',
  widest: '0.04em'  // For uppercase small text
};

export const typography = {
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing
};

export default typography;
