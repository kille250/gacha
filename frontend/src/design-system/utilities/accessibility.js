/**
 * Accessibility Utilities
 *
 * CSS utilities and React components for accessibility.
 * Includes visually hidden content, focus management, and live regions.
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

// ==================== CSS UTILITIES ====================

/**
 * Visually hidden but accessible to screen readers
 * Use for labels, descriptions that shouldn't be visible
 */
export const srOnly = css`
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
 * Show element on focus (for skip links, etc.)
 */
export const srOnlyFocusable = css`
  ${srOnly}

  &:focus,
  &:focus-within {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }
`;

/**
 * Hide from screen readers
 */
export const ariaHidden = css`
  aria-hidden: true;
`;

// ==================== STYLED COMPONENTS ====================

/**
 * VisuallyHidden - Content hidden visually but accessible to screen readers
 *
 * @example
 * <VisuallyHidden>This text is only for screen readers</VisuallyHidden>
 * <VisuallyHidden as="label" htmlFor="email">Email address</VisuallyHidden>
 */
export const VisuallyHidden = styled.span`
  ${srOnly}
`;

/**
 * SkipLink - Skip to main content link
 *
 * @example
 * <SkipLink href="#main-content">Skip to main content</SkipLink>
 */
export const SkipLink = styled.a`
  ${srOnly}

  &:focus {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 12px 24px;
    background: #0071e3;
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    width: auto;
    height: auto;
    clip: auto;
    white-space: normal;
    margin: 0;
    overflow: visible;
  }
`;

// ==================== LIVE REGION COMPONENTS ====================

const LiveRegionContainer = styled.div`
  ${srOnly}
`;

/**
 * AriaLiveRegion - Announces dynamic content to screen readers
 *
 * @param {'polite' | 'assertive'} politeness - How urgently to announce
 * @param {boolean} atomic - Whether to announce entire region or just changes
 * @param {React.ReactNode} children - Content to announce
 *
 * @example
 * <AriaLiveRegion politeness="polite">
 *   {searchResults.length} results found
 * </AriaLiveRegion>
 */
export const AriaLiveRegion = ({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions text',
  ...props
}) => (
  <LiveRegionContainer
    role="status"
    aria-live={politeness}
    aria-atomic={atomic}
    aria-relevant={relevant}
    {...props}
  >
    {children}
  </LiveRegionContainer>
);

/**
 * AriaAlert - For error messages and important alerts
 *
 * @example
 * <AriaAlert>Form submission failed. Please check your inputs.</AriaAlert>
 */
export const AriaAlert = ({ children, ...props }) => (
  <LiveRegionContainer
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    {...props}
  >
    {children}
  </LiveRegionContainer>
);

// ==================== HOOKS ====================

/**
 * useAriaLive - Hook for programmatic announcements
 *
 * @param {'polite' | 'assertive'} politeness - Default announcement urgency
 * @returns {{ announce: (message: string) => void, LiveRegion: React.FC }}
 *
 * @example
 * const { announce, LiveRegion } = useAriaLive();
 *
 * const handleSubmit = async () => {
 *   await submitForm();
 *   announce('Form submitted successfully');
 * };
 *
 * return (
 *   <>
 *     <form onSubmit={handleSubmit}>...</form>
 *     <LiveRegion />
 *   </>
 * );
 */
export function useAriaLive(defaultPoliteness = 'polite') {
  const [message, setMessage] = useState('');

  const announce = useCallback((newMessage, _politeness = defaultPoliteness) => {
    // Clear first to ensure repeated messages are announced
    setMessage('');
    // Use requestAnimationFrame to ensure the clear happens first
    requestAnimationFrame(() => {
      setMessage(newMessage);
    });
  }, [defaultPoliteness]);

  const LiveRegion = useCallback(() => (
    <AriaLiveRegion politeness={defaultPoliteness}>
      {message}
    </AriaLiveRegion>
  ), [message, defaultPoliteness]);

  return { announce, message, LiveRegion };
}

/**
 * useFocusReturn - Returns focus to trigger element when component unmounts
 *
 * @returns {Object} ref to attach to the trigger element
 *
 * @example
 * const { triggerRef, contentRef } = useFocusReturn();
 *
 * <button ref={triggerRef} onClick={openModal}>Open</button>
 * <Modal ref={contentRef}>...</Modal>
 */
export function useFocusReturn() {
  const triggerRef = useRef(null);
  const contentRef = useRef(null);
  const previousActiveElement = useRef(null);

  const saveFocus = useCallback(() => {
    previousActiveElement.current = document.activeElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
      previousActiveElement.current.focus();
    } else if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      triggerRef.current.focus();
    }
  }, []);

  return { triggerRef, contentRef, saveFocus, restoreFocus };
}

/**
 * useRovingTabIndex - Keyboard navigation for lists/grids
 *
 * @param {number} itemCount - Number of items in the list
 * @param {Object} options - Configuration options
 * @returns {Object} Props and handlers for roving tabindex
 *
 * @example
 * const items = ['Apple', 'Banana', 'Cherry'];
 * const { focusedIndex, getItemProps, handleKeyDown } = useRovingTabIndex(items.length);
 *
 * <ul onKeyDown={handleKeyDown}>
 *   {items.map((item, index) => (
 *     <li key={item} {...getItemProps(index)}>{item}</li>
 *   ))}
 * </ul>
 */
export function useRovingTabIndex(itemCount, options = {}) {
  const {
    orientation = 'horizontal', // 'horizontal' | 'vertical' | 'grid'
    columns = 1, // Only used for grid orientation
    loop = true,
    onSelect,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef([]);

  // Keep refs array in sync with item count
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [itemCount]);

  const focusItem = useCallback((index) => {
    const clampedIndex = loop
      ? ((index % itemCount) + itemCount) % itemCount
      : Math.max(0, Math.min(index, itemCount - 1));

    setFocusedIndex(clampedIndex);

    if (itemRefs.current[clampedIndex]) {
      itemRefs.current[clampedIndex].focus();
    }
  }, [itemCount, loop]);

  const handleKeyDown = useCallback((e) => {
    const currentIndex = focusedIndex;
    let nextIndex = currentIndex;
    let handled = false;

    switch (e.key) {
      case 'ArrowRight':
        if (orientation !== 'vertical') {
          nextIndex = currentIndex + 1;
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (orientation !== 'vertical') {
          nextIndex = currentIndex - 1;
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical') {
          nextIndex = currentIndex + 1;
        } else if (orientation === 'grid') {
          nextIndex = currentIndex + columns;
        }
        handled = orientation !== 'horizontal';
        break;
      case 'ArrowUp':
        if (orientation === 'vertical') {
          nextIndex = currentIndex - 1;
        } else if (orientation === 'grid') {
          nextIndex = currentIndex - columns;
        }
        handled = orientation !== 'horizontal';
        break;
      case 'Home':
        nextIndex = 0;
        handled = true;
        break;
      case 'End':
        nextIndex = itemCount - 1;
        handled = true;
        break;
      case 'Enter':
      case ' ':
        if (onSelect) {
          e.preventDefault();
          onSelect(currentIndex);
        }
        return;
      default:
        return;
    }

    if (handled) {
      e.preventDefault();
      focusItem(nextIndex);
    }
  }, [focusedIndex, orientation, columns, itemCount, focusItem, onSelect]);

  const getItemProps = useCallback((index) => ({
    ref: (el) => {
      itemRefs.current[index] = el;
    },
    tabIndex: index === focusedIndex ? 0 : -1,
    'aria-selected': index === focusedIndex,
    onFocus: () => setFocusedIndex(index),
  }), [focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex: focusItem,
    handleKeyDown,
    getItemProps,
    containerProps: {
      role: 'listbox',
      'aria-activedescendant': `item-${focusedIndex}`,
      onKeyDown: handleKeyDown,
    },
  };
}

/**
 * useReducedMotion - Check if user prefers reduced motion
 *
 * @returns {boolean} Whether user prefers reduced motion
 *
 * @example
 * const prefersReducedMotion = useReducedMotion();
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

const accessibilityUtils = {
  srOnly,
  srOnlyFocusable,
  VisuallyHidden,
  SkipLink,
  AriaLiveRegion,
  AriaAlert,
  useAriaLive,
  useFocusReturn,
  useRovingTabIndex,
  useReducedMotion,
};

export default accessibilityUtils;
