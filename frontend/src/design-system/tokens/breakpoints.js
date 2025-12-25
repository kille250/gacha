/**
 * Breakpoint Tokens
 *
 * Responsive design breakpoints and z-index layers.
 */

export const breakpoints = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  // Semantic aliases
  mobile: '640px',
  tablet: '1024px',
  desktop: '1280px',
  // Touch vs pointer
  touch: '1024px',
  hover: '1025px'
};

export const zIndex = {
  base: 1,
  dropdown: 100,
  sticky: 200,
  stickyDropdown: 250, // For dropdowns inside sticky elements
  modal: 1000,
  toast: 1100,
  tooltip: 1200
};

/**
 * Navigation Height Tokens
 *
 * Consistent nav heights across the app. Use CSS custom properties
 * in components to enable dynamic updates based on orientation.
 *
 * Usage in styled-components:
 *   top: var(--nav-top-height, ${navHeights.top.default});
 */
export const navHeights = {
  top: {
    default: '56px',
    landscape: '48px',
    compact: '44px' // For very short viewports (< 400px height)
  },
  bottom: {
    default: '72px',
    landscape: '52px',
    compact: '48px'
  }
};

export const transitions = {
  fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  base: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
};

export const timing = {
  notificationDismiss: 3000,
  successMessageDismiss: 4000,
  errorMessageDismiss: 6000,
  tradeResultDismiss: 1500,
  stateTransition: 2000,
  retryDelay: 3000,
  claimCooldown: 2000,
  healthCheckInterval: 60000
};

const breakpointTokens = { breakpoints, zIndex, transitions, timing, navHeights };
export default breakpointTokens;
