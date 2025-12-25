/**
 * useAnimatedCounter - Animated number counter hook
 *
 * Animates a number value smoothly from the previous value to the new value.
 * Creates a satisfying counting-up effect when points/currency changes.
 *
 * @param {number} value - The target value to animate to
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in ms (default: 400)
 * @param {boolean} options.enabled - Whether animation is enabled (default: true)
 * @returns {number} The animated current value
 *
 * @example
 * const animatedPoints = useAnimatedCounter(user?.points || 0, { duration: 500 });
 * // animatedPoints will smoothly count up to user.points
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const useAnimatedCounter = (value, options = {}) => {
  const {
    duration = 400,
    enabled = true,
  } = options;

  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // Easing function for smooth animation (ease-out cubic)
  const easeOutCubic = useCallback((t) => {
    return 1 - Math.pow(1 - t, 3);
  }, []);

  useEffect(() => {
    // Skip animation if disabled or value hasn't changed
    if (!enabled || previousValue.current === value) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }

    // Skip animation if this is the initial render (no previous value)
    if (previousValue.current === undefined || previousValue.current === null) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }

    const startValue = previousValue.current;
    const endValue = value;
    const difference = endValue - startValue;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue = Math.round(startValue + difference * easedProgress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, enabled, easeOutCubic]);

  // Update previous value when animation completes
  useEffect(() => {
    return () => {
      previousValue.current = value;
    };
  }, [value]);

  return displayValue;
};

export default useAnimatedCounter;
