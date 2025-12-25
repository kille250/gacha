/**
 * Color Tokens
 *
 * Centralized color definitions for the design system.
 * All colors should be referenced from here.
 *
 * Updated for better accessibility and visual hierarchy.
 * Text contrast improved for WCAG compliance.
 */

export const colors = {
  // Primary palette
  primary: '#0071e3',
  primaryHover: '#0077ed',
  primaryActive: '#006edb',
  primaryMuted: 'rgba(0, 113, 227, 0.15)',     // For backgrounds
  primarySubtle: 'rgba(0, 113, 227, 0.08)',    // For hover states

  // Accent colors
  accent: '#5856d6',
  accentHover: '#6866e0',
  accentSecondary: '#af52de',
  accentMuted: 'rgba(88, 86, 214, 0.15)',

  // Semantic colors
  success: '#34c759',
  successHover: '#30d158',
  successMuted: 'rgba(52, 199, 89, 0.15)',

  warning: '#ff9f0a',
  warningHover: '#ffb340',
  warningMuted: 'rgba(255, 159, 10, 0.15)',

  error: '#ff3b30',
  errorHover: '#ff453a',
  errorMuted: 'rgba(255, 59, 48, 0.15)',

  info: '#5ac8fa',
  infoMuted: 'rgba(90, 200, 250, 0.15)',

  // Neutral palette (dark mode)
  background: '#000000',
  backgroundSecondary: '#1c1c1e',
  backgroundTertiary: '#2c2c2e',
  backgroundElevated: '#1c1c1e',
  backgroundSubtle: '#0d0d0d',    // Slightly lighter than pure black

  // Surface colors (for cards, modals)
  surface: 'rgba(28, 28, 30, 0.85)',           // Slightly more opaque
  surfaceHover: 'rgba(44, 44, 46, 0.9)',
  surfaceSolid: '#1c1c1e',                     // Non-transparent version
  surfaceBorder: 'rgba(255, 255, 255, 0.1)',
  surfaceBorderSubtle: 'rgba(255, 255, 255, 0.06)',

  // Text colors - improved contrast for better readability
  // Using slightly off-white for primary to reduce eye strain
  text: 'rgba(255, 255, 255, 0.95)',           // Softer than pure white
  textPrimary: 'rgba(255, 255, 255, 0.95)',    // Alias for clarity
  textSecondary: 'rgba(255, 255, 255, 0.70)',  // Improved from 0.65
  textTertiary: 'rgba(255, 255, 255, 0.50)',   // Improved from 0.40
  textMuted: 'rgba(255, 255, 255, 0.35)',      // Improved from 0.30
  textDisabled: 'rgba(255, 255, 255, 0.25)',   // For disabled states
  textInverse: '#000000',                       // For light backgrounds

  // Interactive text
  textLink: '#0a84ff',
  textLinkHover: '#409cff',

  // Special
  glass: 'rgba(255, 255, 255, 0.06)',
  glassHover: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.6)',               // Slightly darker for better modal focus
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  // Rarity colors - slightly adjusted for better visibility
  rarity: {
    common: '#8e8e93',
    uncommon: '#32d74b',     // Slightly brighter green
    rare: '#0a84ff',
    epic: '#bf5af2',
    legendary: '#ffa726'     // Warmer gold
  },

  // Rarity glow colors for special effects
  rarityGlow: {
    common: 'rgba(142, 142, 147, 0.3)',
    uncommon: 'rgba(50, 215, 75, 0.35)',
    rare: 'rgba(10, 132, 255, 0.4)',
    epic: 'rgba(191, 90, 242, 0.45)',
    legendary: 'rgba(255, 167, 38, 0.5)'
  },

  // Featured/promotional colors
  featured: '#F5A623',
  featuredHover: '#FDB63C',
  featuredGlow: 'rgba(245, 166, 35, 0.4)',

  // Dividers and borders
  divider: 'rgba(255, 255, 255, 0.08)',
  dividerStrong: 'rgba(255, 255, 255, 0.15)',

  // Focus ring
  focusRing: 'rgba(0, 113, 227, 0.6)',
  focusRingOffset: '#000000'
};

export default colors;
