/**
 * useScrollReveal - Scroll-linked reveal animation hook
 *
 * Provides smooth reveal animations as elements enter the viewport.
 * Uses IntersectionObserver for performance and supports:
 * - Configurable threshold and margins
 * - One-time or repeating animations
 * - Staggered reveals for lists
 * - Reduced motion support
 *
 * @example
 * // Basic usage
 * const { ref, isVisible } = useScrollReveal();
 * <Card ref={ref} style={{ opacity: isVisible ? 1 : 0 }}>...</Card>
 *
 * @example
 * // With motion component
 * const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
 * <motion.div ref={ref} animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}>
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Default options for scroll reveal
 */
const defaultOptions = {
  threshold: 0.1,      // Percentage of element visible to trigger
  rootMargin: '0px',   // Margin around root
  triggerOnce: true,   // Only trigger once (false = animate on each entry)
  delay: 0,            // Delay before marking visible (ms)
  disabled: false,     // Disable the observer
};

/**
 * Hook to detect when an element enters the viewport
 *
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Visibility threshold (0-1)
 * @param {string} options.rootMargin - Root margin for observer
 * @param {boolean} options.triggerOnce - Only trigger visibility once
 * @param {number} options.delay - Delay before marking visible
 * @param {boolean} options.disabled - Disable observation
 * @returns {{ ref: RefObject, isVisible: boolean, hasBeenVisible: boolean }}
 */
export const useScrollReveal = (options = {}) => {
  const {
    threshold,
    rootMargin,
    triggerOnce,
    delay,
    disabled,
  } = { ...defaultOptions, ...options };

  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef(null);
  const timeoutRef = useRef(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const handleIntersection = useCallback((entries) => {
    const [entry] = entries;

    if (entry.isIntersecting) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true);
          setHasBeenVisible(true);
        }, delay);
      } else {
        setIsVisible(true);
        setHasBeenVisible(true);
      }
    } else if (!triggerOnce) {
      // Only reset visibility if not trigger-once mode
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsVisible(false);
    }
  }, [delay, triggerOnce]);

  useEffect(() => {
    const element = elementRef.current;

    // If disabled or reduced motion preferred, set visible immediately
    if (disabled || prefersReducedMotion.current) {
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    if (!element) return;

    // Check for IntersectionObserver support
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [threshold, rootMargin, handleIntersection, disabled]);

  return {
    ref: elementRef,
    isVisible,
    hasBeenVisible,
  };
};

/**
 * Hook for staggered scroll reveals of multiple items
 *
 * @param {number} itemCount - Number of items to reveal
 * @param {Object} options - Configuration options
 * @param {number} options.staggerDelay - Delay between each item (ms)
 * @param {number} options.threshold - Visibility threshold
 * @param {string} options.rootMargin - Root margin
 * @param {boolean} options.triggerOnce - Only trigger once
 * @returns {{ containerRef: RefObject, isContainerVisible: boolean, getItemDelay: (index: number) => number, getItemStyle: (index: number) => Object }}
 */
export const useStaggeredReveal = (itemCount, options = {}) => {
  const {
    staggerDelay = 50,
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
  } = options;

  const { ref: containerRef, isVisible: isContainerVisible } = useScrollReveal({
    threshold,
    rootMargin,
    triggerOnce,
  });

  // Check for reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /**
   * Get delay for a specific item index
   */
  const getItemDelay = useCallback((index) => {
    if (prefersReducedMotion) return 0;
    return index * staggerDelay;
  }, [staggerDelay, prefersReducedMotion]);

  /**
   * Get inline styles for staggered animation
   */
  const getItemStyle = useCallback((index) => {
    if (prefersReducedMotion) {
      return { opacity: 1, transform: 'none' };
    }

    return {
      opacity: isContainerVisible ? 1 : 0,
      transform: isContainerVisible ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity 0.3s ease-out ${getItemDelay(index)}ms, transform 0.3s ease-out ${getItemDelay(index)}ms`,
    };
  }, [isContainerVisible, getItemDelay, prefersReducedMotion]);

  /**
   * Get Framer Motion variants for staggered items
   */
  const getMotionProps = useCallback((index) => {
    if (prefersReducedMotion) {
      return {};
    }

    return {
      initial: { opacity: 0, y: 12 },
      animate: isContainerVisible
        ? { opacity: 1, y: 0 }
        : { opacity: 0, y: 12 },
      transition: {
        delay: getItemDelay(index) / 1000,
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      },
    };
  }, [isContainerVisible, getItemDelay, prefersReducedMotion]);

  return {
    containerRef,
    isContainerVisible,
    getItemDelay,
    getItemStyle,
    getMotionProps,
  };
};

/**
 * Hook for parallax scroll effects
 *
 * @param {Object} options - Configuration options
 * @param {number} options.speed - Parallax speed (0.1 = subtle, 0.5 = medium)
 * @param {string} options.direction - 'up' | 'down'
 * @returns {{ ref: RefObject, style: Object }}
 */
export const useParallax = (options = {}) => {
  const { speed = 0.2, direction = 'up' } = options;

  const elementRef = useRef(null);
  const [offset, setOffset] = useState(0);

  // Check for reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate how far the element is from the center of the viewport
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      const distanceFromCenter = elementCenter - viewportCenter;

      // Apply parallax offset
      const parallaxOffset = distanceFromCenter * speed;
      setOffset(direction === 'up' ? -parallaxOffset : parallaxOffset);
    };

    // Initial calculation
    handleScroll();

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed, direction, prefersReducedMotion]);

  const style = prefersReducedMotion
    ? {}
    : {
        transform: `translateY(${offset}px)`,
        willChange: 'transform',
      };

  return {
    ref: elementRef,
    style,
    offset,
  };
};

/**
 * Hook for scroll progress tracking
 *
 * @param {Object} options - Configuration options
 * @param {RefObject} options.containerRef - Optional container ref (defaults to document)
 * @returns {{ progress: number, isScrolling: boolean }}
 */
export const useScrollProgress = (options = {}) => {
  const { containerRef } = options;

  const [progress, setProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const container = containerRef?.current || document.documentElement;

    const handleScroll = () => {
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set scrolling to false after scroll stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      // Calculate scroll progress
      const scrollTop = containerRef?.current
        ? container.scrollTop
        : window.pageYOffset || document.documentElement.scrollTop;

      const scrollHeight = containerRef?.current
        ? container.scrollHeight - container.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;

      const scrollProgress = scrollHeight > 0
        ? Math.min(scrollTop / scrollHeight, 1)
        : 0;

      setProgress(scrollProgress);
    };

    // Initial calculation
    handleScroll();

    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerRef]);

  return {
    progress,
    isScrolling,
  };
};

export default useScrollReveal;
