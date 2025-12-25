/**
 * Spacing Tokens
 *
 * Consistent spacing values, border radius, shadows, and elevation.
 * All spacing follows an 8px grid for visual harmony.
 *
 * Shadows updated for softer, more Apple-like appearance with
 * multi-layer composition for natural depth.
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

/**
 * Border Radius System
 *
 * Standardized radius values with semantic usage guidelines:
 * - xs/sm: Small interactive elements (badges, chips, buttons)
 * - md: Form inputs, small cards
 * - lg: Buttons, nav items, standard cards
 * - xl: Large cards, panels
 * - 2xl: Modals, dialogs
 * - 3xl: Hero sections, featured elements
 * - full: Pills, avatars, circular elements
 */
export const radius = {
  xs: '4px',       // Badges, tiny elements
  sm: '8px',       // Chips, small buttons
  md: '12px',      // Inputs, small cards
  lg: '16px',      // Standard buttons, nav items, cards
  xl: '20px',      // Large cards, panels
  '2xl': '24px',   // Modals, dialogs (was 28px - slightly reduced for consistency)
  '3xl': '32px',   // Hero sections, featured elements (was 36px)
  full: '9999px'   // Pills, avatars, circular elements
};

/**
 * Shadow System
 *
 * Multi-layer shadows for natural depth. Each shadow has:
 * - A subtle ambient layer (larger, lighter)
 * - A direct shadow layer (smaller, darker)
 *
 * This creates more realistic, softer shadows than single-layer shadows.
 */
export const shadows = {
  // Minimal - for subtle elevation (inputs, small cards at rest)
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',

  // Light touch - cards at rest
  sm: '0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.06)',

  // Medium - hover states, elevated cards
  md: '0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.08)',

  // Large - dropdowns, popovers
  lg: '0 4px 8px rgba(0, 0, 0, 0.06), 0 16px 32px rgba(0, 0, 0, 0.12)',

  // Extra large - modals, dialogs
  xl: '0 8px 16px rgba(0, 0, 0, 0.08), 0 24px 48px rgba(0, 0, 0, 0.16)',

  // 2XL - hero elements, feature cards
  '2xl': '0 12px 24px rgba(0, 0, 0, 0.1), 0 32px 64px rgba(0, 0, 0, 0.2)',

  // Glow effects for interactive elements
  glow: (color) => `0 0 20px ${color}30, 0 0 40px ${color}15`,

  // Subtle glow for rarity/special items
  glowSubtle: (color) => `0 0 12px ${color}20, 0 0 24px ${color}10`,

  // Strong glow for emphasis
  glowStrong: (color) => `0 0 24px ${color}50, 0 0 48px ${color}25, 0 0 72px ${color}15`,

  // Inner shadow for pressed states and inputs
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',

  // Inner highlight for glass effects
  innerHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',

  // Combined for depth
  card: '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
  cardHover: '0 4px 8px rgba(0, 0, 0, 0.06), 0 16px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04)',

  // Button shadows
  button: '0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.12)',
  buttonHover: '0 4px 8px rgba(0, 0, 0, 0.1), 0 8px 20px rgba(0, 0, 0, 0.15)',
  buttonPressed: '0 1px 2px rgba(0, 0, 0, 0.08)',

  // Primary button shadows (with color tint)
  buttonPrimary: '0 4px 12px rgba(0, 113, 227, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08)',
  buttonPrimaryHover: '0 6px 20px rgba(0, 113, 227, 0.4), 0 4px 8px rgba(0, 0, 0, 0.1)',

  // Dropdown/popover shadows
  dropdown: '0 4px 12px rgba(0, 0, 0, 0.1), 0 16px 48px rgba(0, 0, 0, 0.15)'
};

/**
 * Elevation Scale
 *
 * Semantic shadow levels for UI depth hierarchy.
 * Use these for consistent elevation across components.
 * Softened for more natural, Apple-like appearance.
 */
export const elevation = {
  0: 'none',
  1: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06)',
  2: '0 2px 4px rgba(0, 0, 0, 0.04), 0 6px 12px rgba(0, 0, 0, 0.08)',
  3: '0 4px 8px rgba(0, 0, 0, 0.06), 0 12px 24px rgba(0, 0, 0, 0.1)',
  4: '0 8px 16px rgba(0, 0, 0, 0.08), 0 20px 40px rgba(0, 0, 0, 0.12)',
  5: '0 12px 24px rgba(0, 0, 0, 0.1), 0 32px 64px rgba(0, 0, 0, 0.16)'
};

export const blur = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
  '2xl': '64px'
};

const spacingTokens = { spacing, radius, shadows, elevation, blur };
export default spacingTokens;
