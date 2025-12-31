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
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {Object} { value: number, isAnimating: boolean } - The animated value and animation state
 *
 * @example
 * const { value: animatedPoints, isAnimating } = useAnimatedCounter(user?.points || 0, {
 *   duration: 500,
 *   onComplete: () => console.log('Animation done!')
 * });
 * // animatedPoints will smoothly count up to user.points
 * // isAnimating will be true during animation (useful for adding bounce CSS class)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const useAnimatedCounter = (value, options = {}) => {
  const {
    duration = 400,
    enabled = true,
    onComplete,
  } = options;

  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(value);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Easing function for smooth animation (ease-out cubic with slight overshoot for bounce)
  const easeOutBack = useCallback((t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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
    setIsAnimating(true);

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutBack(progress);

      const currentValue = Math.round(startValue + difference * easedProgress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
        setIsAnimating(false);
        onCompleteRef.current?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, enabled, easeOutBack]);

  // Update previous value when animation completes
  useEffect(() => {
    return () => {
      previousValue.current = value;
    };
  }, [value]);

  // Return both the value and animation state for backward compatibility
  // Can be used as: const value = useAnimatedCounter(...)  (backwards compatible)
  // Or as: const { value, isAnimating } = useAnimatedCounter(...)
  const result = displayValue;
  result.value = displayValue;
  result.isAnimating = isAnimating;
  return result;
};

export default useAnimatedCounter;
