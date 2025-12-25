/**
 * ScrollToTop - Floating button for quick scroll navigation
 *
 * Features:
 * - Appears after scrolling down (configurable threshold)
 * - Smooth spring animation entrance/exit
 * - Touch-optimized with haptic feedback
 * - Keyboard accessible
 * - Reduced motion support
 * - Positions above bottom nav on mobile
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdKeyboardArrowUp } from 'react-icons/md';
import { theme, springs, useReducedMotion } from '../../design-system';

// Scroll threshold before showing button (in pixels)
const SCROLL_THRESHOLD = 400;

const Button = styled(motion.button)`
  position: fixed;
  right: ${theme.spacing.lg};
  z-index: ${theme.zIndex.sticky};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: ${theme.radius.full};
  background: ${theme.colors.surface};
  color: ${theme.colors.text};
  cursor: pointer;
  box-shadow: ${theme.shadows.lg};
  backdrop-filter: blur(${theme.blur.md});
  -webkit-backdrop-filter: blur(${theme.blur.md});
  border: 1px solid ${theme.colors.surfaceBorder};
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut},
    transform ${theme.timing.fast} ${theme.easing.appleSpring};
  -webkit-tap-highlight-color: transparent;

  /* Desktop positioning */
  bottom: ${theme.spacing.xl};

  /* Mobile positioning - above bottom nav */
  @media (max-width: ${theme.breakpoints.md}) {
    right: ${theme.spacing.md};
    /* Account for bottom nav (72px) + safe area + padding */
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.glassHover};
      box-shadow: ${theme.shadows.xl};
      transform: translateY(-2px);
    }
  }

  &:active {
    transform: scale(0.92);
    box-shadow: ${theme.shadows.md};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing},
      ${theme.shadows.lg};
  }

  svg {
    font-size: 28px;
    transition: transform ${theme.timing.fast} ${theme.easing.appleSpring};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover svg {
      transform: translateY(-2px);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover, &:active {
      transform: none;
    }
    svg {
      transition: none;
    }
  }
`;

// Scroll progress ring (optional visual indicator)
const ProgressRing = styled.svg`
  position: absolute;
  width: 52px;
  height: 52px;
  transform: rotate(-90deg);
  pointer-events: none;
`;

const ProgressCircle = styled.circle`
  fill: none;
  stroke: ${theme.colors.primary};
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
`;

/**
 * ScrollToTop Component
 *
 * @param {Object} props
 * @param {number} props.threshold - Scroll distance before showing button (default: 400px)
 * @param {boolean} props.showProgress - Show scroll progress ring (default: false)
 * @param {string} props.ariaLabel - Custom aria-label
 */
const ScrollToTop = memo(({
  threshold = SCROLL_THRESHOLD,
  showProgress = false,
  ariaLabel = 'Scroll to top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  // Track scroll position
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;

          setIsVisible(scrollY > threshold);

          if (showProgress && docHeight > 0) {
            setScrollProgress(Math.min(scrollY / docHeight, 1));
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, showProgress]);

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // Smooth scroll to top
  const scrollToTop = useCallback(() => {
    triggerHaptic();

    if (prefersReducedMotion) {
      window.scrollTo({ top: 0 });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [prefersReducedMotion, triggerHaptic]);

  // Calculate progress ring dimensions
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - scrollProgress);

  return (
    <AnimatePresence>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          aria-label={ariaLabel}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={prefersReducedMotion ? { duration: 0 } : springs.snappy}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
        >
          {showProgress && (
            <ProgressRing viewBox="0 0 52 52">
              <ProgressCircle
                cx="26"
                cy="26"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </ProgressRing>
          )}
          <MdKeyboardArrowUp aria-hidden="true" />
        </Button>
      )}
    </AnimatePresence>
  );
});

ScrollToTop.displayName = 'ScrollToTop';

export default ScrollToTop;
