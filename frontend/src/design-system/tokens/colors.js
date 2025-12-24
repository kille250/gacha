/**
 * Color Tokens
 *
 * Centralized color definitions for the design system.
 * All colors should be referenced from here.
 */

export const colors = {
  // Primary palette
  primary: '#0071e3',
  primaryHover: '#0077ed',
  primaryActive: '#006edb',

  // Accent colors
  accent: '#5856d6',
  accentSecondary: '#af52de',

  // Semantic colors
  success: '#34c759',
  warning: '#ff9f0a',
  error: '#ff3b30',
  info: '#5ac8fa',

  // Neutral palette (dark mode)
  background: '#000000',
  backgroundSecondary: '#1c1c1e',
  backgroundTertiary: '#2c2c2e',
  backgroundElevated: '#1c1c1e',

  // Surface colors (for cards, modals)
  surface: 'rgba(28, 28, 30, 0.8)',
  surfaceHover: 'rgba(44, 44, 46, 0.9)',
  surfaceBorder: 'rgba(255, 255, 255, 0.1)',

  // Text colors
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.5)', // Increased from 0.4 for better contrast (WCAG AA)

  // Special
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Rarity colors
  rarity: {
    common: '#8e8e93',
    uncommon: '#30d158',
    rare: '#0a84ff',
    epic: '#bf5af2',
    legendary: '#ff9f0a'
  }
};

export default colors;
