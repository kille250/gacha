/**
 * Accessibility Utilities
 *
 * Helper functions and components for WCAG compliance.
 * Use these to ensure the application is accessible to all users.
 */

import React, { useEffect, useRef, useCallback } from 'react';

// ==================== KEYBOARD NAVIGATION ====================

/**
 * Key codes for keyboard navigation
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
};

/**
 * Check if a key event is an activation key (Enter or Space)
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export const isActivationKey = (event) => {
  return event.key === KEYS.ENTER || event.key === KEYS.SPACE;
};

/**
 * Create a keyboard handler for clickable non-button elements
 * Makes divs and spans keyboard-accessible like buttons
 *
 * @param {Function} onClick - Click handler
 * @returns {Function} Keyboard event handler
 *
 * @example
 * <div
 *   role="button"
 *   tabIndex={0}
 *   onClick={handleClick}
 *   onKeyDown={handleKeyboardClick(handleClick)}
 * >
 *   Clickable div
 * </div>
 */
export const handleKeyboardClick = (onClick) => (event) => {
  if (isActivationKey(event)) {
    event.preventDefault();
    onClick?.(event);
  }
};

/**
 * Get focusable elements within a container
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
export const getFocusableElements = (container) => {
  if (!container) return [];

  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(selector));
};

/**
 * Focus the first focusable element in a container
 * @param {HTMLElement} container
 * @returns {boolean} Whether focus was set
 */
export const focusFirstElement = (container) => {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[0].focus();
    return true;
  }
  return false;
};

/**
 * Focus the last focusable element in a container
 * @param {HTMLElement} container
 * @returns {boolean} Whether focus was set
 */
export const focusLastElement = (container) => {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[elements.length - 1].focus();
    return true;
  }
  return false;
};

// ==================== ARIA HELPERS ====================

/**
 * Generate a unique ID for ARIA relationships
 * @param {string} prefix - ID prefix
 * @returns {string}
 */
export const generateAriaId = (prefix = 'aria') => {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Create aria-describedby value from multiple IDs
 * @param {...string} ids - Element IDs
 * @returns {string | undefined}
 */
export const combineAriaIds = (...ids) => {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
};

/**
 * Get appropriate aria-live value for a notification type
 * @param {'error' | 'warning' | 'success' | 'info'} type
 * @returns {'polite' | 'assertive'}
 */
export const getAriaLive = (type) => {
  return type === 'error' ? 'assertive' : 'polite';
};

// ==================== SCREEN READER UTILITIES ====================

/**
 * Visually hidden styles for screen-reader-only content
 * Use with styled-components or as inline style
 */
export const visuallyHiddenStyles = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * CSS string for visually hidden content
 */
export const visuallyHiddenCSS = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * Component for screen-reader-only content
 */
export const ScreenReaderOnly = ({ children, as: Component = 'span' }) => (
  <Component style={visuallyHiddenStyles}>{children}</Component>
);

/**
 * Component for announcing dynamic content to screen readers
 *
 * @example
 * const [announcement, setAnnouncement] = useState('');
 *
 * // Announce a message
 * setAnnouncement('Item deleted successfully');
 *
 * // In JSX
 * <LiveRegion>{announcement}</LiveRegion>
 */
export const LiveRegion = ({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions text',
}) => (
  <div
    role="status"
    aria-live={politeness}
    aria-atomic={atomic}
    aria-relevant={relevant}
    style={visuallyHiddenStyles}
  >
    {children}
  </div>
);

// ==================== FOCUS MANAGEMENT ====================

/**
 * Hook to manage focus when content changes
 * Useful for loading states and error handling
 *
 * @param {boolean} shouldFocus - Whether to focus the target
 * @returns {React.RefObject}
 */
export const useFocusOnMount = (shouldFocus = true) => {
  const ref = useRef(null);

  useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus();
    }
  }, [shouldFocus]);

  return ref;
};

/**
 * Hook to restore focus to a previous element
 * Useful for modals and dialogs
 *
 * @returns {Object} { saveFocus, restoreFocus }
 */
export const useFocusReturn = () => {
  const previousElement = useRef(null);

  const saveFocus = useCallback(() => {
    previousElement.current = document.activeElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousElement.current && typeof previousElement.current.focus === 'function') {
      previousElement.current.focus();
    }
  }, []);

  return { saveFocus, restoreFocus };
};

// ==================== COLOR & CONTRAST ====================

/**
 * Calculate relative luminance of a color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number}
 */
export const getLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - Hex color (e.g., '#ffffff')
 * @param {string} color2 - Hex color
 * @returns {number} Contrast ratio (1-21)
 */
export const getContrastRatio = (color1, color2) => {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  const l1 = getLuminance(...hexToRgb(color1));
  const l2 = getLuminance(...hexToRgb(color2));

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if a color combination meets WCAG AA contrast requirements
 * @param {string} foreground - Foreground hex color
 * @param {string} background - Background hex color
 * @param {'normal' | 'large'} textSize - Text size category
 * @returns {boolean}
 */
export const meetsContrastRequirement = (foreground, background, textSize = 'normal') => {
  const ratio = getContrastRatio(foreground, background);
  // WCAG AA: 4.5:1 for normal text, 3:1 for large text
  const requiredRatio = textSize === 'large' ? 3 : 4.5;
  return ratio >= requiredRatio;
};

// ==================== MOTION ====================

/**
 * Get animation duration based on reduced motion preference
 * @param {number} duration - Default duration in ms
 * @returns {number}
 */
export const getAnimationDuration = (duration) => {
  if (typeof window === 'undefined') return duration;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion ? 0 : duration;
};

/**
 * Get animation config for Framer Motion respecting reduced motion
 * @param {Object} config - Animation config
 * @returns {Object}
 */
export const getMotionConfig = (config) => {
  if (typeof window === 'undefined') return config;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return {
      ...config,
      transition: { duration: 0 },
      initial: config.animate || config.initial,
    };
  }

  return config;
};

// ==================== SKIP LINK ====================

/**
 * Skip to main content link component
 * Should be the first focusable element on the page
 */
export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => (
  <a
    href={href}
    style={{
      ...visuallyHiddenStyles,
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 9999,
    }}
    onFocus={(e) => {
      // Make visible when focused
      e.target.style.width = 'auto';
      e.target.style.height = 'auto';
      e.target.style.clip = 'auto';
      e.target.style.padding = '8px 16px';
      e.target.style.backgroundColor = '#000';
      e.target.style.color = '#fff';
    }}
    onBlur={(e) => {
      // Hide when not focused
      Object.assign(e.target.style, visuallyHiddenStyles);
    }}
  >
    {children}
  </a>
);
