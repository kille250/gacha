/**
 * Responsive Utilities
 *
 * Helper functions and hooks for responsive design.
 * Use these for programmatic responsive behavior.
 */

import { useState, useEffect } from 'react';
import { BREAKPOINTS, MEDIA_QUERIES } from '../constants/ui';

// ==================== MEDIA QUERY HELPERS ====================

/**
 * Check if viewport matches a breakpoint (min-width)
 * @param {keyof BREAKPOINTS} breakpoint - Breakpoint name
 * @returns {boolean}
 */
export const isMinWidth = (breakpoint) => {
  if (typeof window === 'undefined') return false;
  const width = BREAKPOINTS[breakpoint.toUpperCase()];
  if (!width) return false;
  return window.matchMedia(`(min-width: ${width}px)`).matches;
};

/**
 * Check if viewport is below a breakpoint (max-width)
 * @param {keyof BREAKPOINTS} breakpoint - Breakpoint name
 * @returns {boolean}
 */
export const isMaxWidth = (breakpoint) => {
  if (typeof window === 'undefined') return false;
  const width = BREAKPOINTS[breakpoint.toUpperCase()];
  if (!width) return false;
  return window.matchMedia(`(max-width: ${width - 1}px)`).matches;
};

/**
 * Check if device is mobile (< SM breakpoint)
 * @returns {boolean}
 */
export const isMobile = () => isMaxWidth('SM');

/**
 * Check if device is tablet (SM to LG)
 * @returns {boolean}
 */
export const isTablet = () => isMinWidth('SM') && isMaxWidth('LG');

/**
 * Check if device is desktop (>= LG)
 * @returns {boolean}
 */
export const isDesktop = () => isMinWidth('LG');

/**
 * Check if device has touch capability
 * @returns {boolean}
 */
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MEDIA_QUERIES.TOUCH).matches;
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MEDIA_QUERIES.REDUCED_MOTION).matches;
};

// ==================== REACT HOOKS ====================

/**
 * Hook to track a media query match
 * @param {string} query - Media query string
 * @returns {boolean} Whether the query matches
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (e) => setMatches(e.matches);

    // Initial check
    setMatches(mediaQuery.matches);

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
};

/**
 * Hook to track breakpoint matches
 * @returns {Object} Breakpoint match states
 */
export const useBreakpoint = () => {
  const xs = useMediaQuery(`(min-width: ${BREAKPOINTS.XS}px)`);
  const sm = useMediaQuery(`(min-width: ${BREAKPOINTS.SM}px)`);
  const md = useMediaQuery(`(min-width: ${BREAKPOINTS.MD}px)`);
  const lg = useMediaQuery(`(min-width: ${BREAKPOINTS.LG}px)`);
  const xl = useMediaQuery(`(min-width: ${BREAKPOINTS.XL}px)`);
  const xxl = useMediaQuery(`(min-width: ${BREAKPOINTS.XXL}px)`);

  return {
    xs,
    sm,
    md,
    lg,
    xl,
    xxl,
    // Semantic aliases
    isMobile: !sm,
    isTablet: sm && !lg,
    isDesktop: lg,
    // Current breakpoint name
    current: xxl ? 'xxl' : xl ? 'xl' : lg ? 'lg' : md ? 'md' : sm ? 'sm' : 'xs',
  };
};

/**
 * Hook to track touch/mouse capability
 * @returns {Object} Input capability states
 */
export const useInputCapability = () => {
  const hasTouch = useMediaQuery(MEDIA_QUERIES.TOUCH);
  const hasMouse = useMediaQuery(MEDIA_QUERIES.MOUSE);

  return {
    hasTouch,
    hasMouse,
    // True if device supports both (e.g., Surface, iPad with mouse)
    isHybrid: hasTouch && hasMouse,
    // Primary input type
    primaryInput: hasTouch ? 'touch' : 'mouse',
  };
};

/**
 * Hook to track reduced motion preference
 * @returns {boolean} Whether user prefers reduced motion
 */
export const useReducedMotion = () => {
  return useMediaQuery(MEDIA_QUERIES.REDUCED_MOTION);
};

/**
 * Hook to get current viewport dimensions
 * @returns {Object} Viewport width and height
 */
export const useViewportSize = () => {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

// ==================== CSS-IN-JS HELPERS ====================

/**
 * Generate a media query string for styled-components
 * @param {keyof BREAKPOINTS} breakpoint - Breakpoint name
 * @param {'min' | 'max'} type - Query type
 * @returns {string} Media query string
 */
export const mediaQuery = (breakpoint, type = 'min') => {
  const width = BREAKPOINTS[breakpoint.toUpperCase()];
  if (!width) {
    console.warn(`Unknown breakpoint: ${breakpoint}`);
    return '';
  }

  if (type === 'min') {
    return `@media (min-width: ${width}px)`;
  }
  return `@media (max-width: ${width - 1}px)`;
};

/**
 * Shorthand media query helpers for styled-components
 *
 * @example
 * const Component = styled.div`
 *   font-size: 14px;
 *
 *   ${media.sm} {
 *     font-size: 16px;
 *   }
 *
 *   ${media.lg} {
 *     font-size: 18px;
 *   }
 * `;
 */
export const media = {
  xs: `@media (min-width: ${BREAKPOINTS.XS}px)`,
  sm: `@media (min-width: ${BREAKPOINTS.SM}px)`,
  md: `@media (min-width: ${BREAKPOINTS.MD}px)`,
  lg: `@media (min-width: ${BREAKPOINTS.LG}px)`,
  xl: `@media (min-width: ${BREAKPOINTS.XL}px)`,
  xxl: `@media (min-width: ${BREAKPOINTS.XXL}px)`,
  // Max-width variants
  mobileOnly: `@media (max-width: ${BREAKPOINTS.SM - 1}px)`,
  tabletOnly: `@media (min-width: ${BREAKPOINTS.SM}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`,
  desktopOnly: `@media (min-width: ${BREAKPOINTS.LG}px)`,
  // Capability queries
  touch: `@media ${MEDIA_QUERIES.TOUCH}`,
  mouse: `@media ${MEDIA_QUERIES.MOUSE}`,
  reducedMotion: `@media ${MEDIA_QUERIES.REDUCED_MOTION}`,
};

/**
 * Container width helper for responsive containers
 * @param {string} maxWidth - Maximum container width
 * @returns {string} CSS for responsive container
 */
export const containerWidth = (maxWidth = '1400px') => `
  width: 100%;
  max-width: ${maxWidth};
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;

  ${media.lg} {
    padding-left: 32px;
    padding-right: 32px;
  }
`;
