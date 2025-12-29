/**
 * useCountUp
 *
 * GSAP-powered number counting animation.
 * Useful for XP gains, point awards, level ups.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import gsap from 'gsap';

/**
 * Format number with thousands separators
 */
const formatNumber = (num, options = {}) => {
  const { decimals = 0, prefix = '', suffix = '' } = options;
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return `${prefix}${formatted}${suffix}`;
};

/**
 * Hook for animated number counting
 * @param {Object} options - Configuration
 * @param {number} options.start - Starting value (default: 0)
 * @param {number} options.end - Ending value (required for auto-start)
 * @param {number} options.duration - Animation duration in seconds (default: 1)
 * @param {string} options.ease - GSAP easing (default: 'power2.out')
 * @param {number} options.decimals - Decimal places (default: 0)
 * @param {string} options.prefix - String prefix (default: '')
 * @param {string} options.suffix - String suffix (default: '')
 * @param {boolean} options.autoStart - Start animation immediately (default: false)
 * @param {Function} options.onComplete - Callback when animation completes
 */
export const useCountUp = (options = {}) => {
  const {
    start = 0,
    end: initialEnd,
    duration = 1,
    ease = 'power2.out',
    decimals = 0,
    prefix = '',
    suffix = '',
    autoStart = false,
    onComplete
  } = options;

  const [displayValue, setDisplayValue] = useState(
    formatNumber(start, { decimals, prefix, suffix })
  );
  const [rawValue, setRawValue] = useState(start);

  const tweenRef = useRef(null);
  const valueRef = useRef({ value: start });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, []);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && initialEnd !== undefined) {
      countTo(initialEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Animate to a specific value
   * @param {number} targetValue - Value to count to
   * @param {Object} overrides - Override options for this animation
   */
  const countTo = useCallback((targetValue, overrides = {}) => {
    // Kill any existing animation
    if (tweenRef.current) {
      tweenRef.current.kill();
    }

    const {
      duration: dur = duration,
      ease: e = ease,
      decimals: dec = decimals,
      prefix: pre = prefix,
      suffix: suf = suffix,
      onComplete: complete = onComplete
    } = overrides;

    const tween = gsap.to(valueRef.current, {
      value: targetValue,
      duration: dur,
      ease: e,
      onUpdate: () => {
        const current = valueRef.current.value;
        setRawValue(current);
        setDisplayValue(formatNumber(current, {
          decimals: dec,
          prefix: pre,
          suffix: suf
        }));
      },
      onComplete: () => {
        // Ensure we end on exact value
        setRawValue(targetValue);
        setDisplayValue(formatNumber(targetValue, {
          decimals: dec,
          prefix: pre,
          suffix: suf
        }));
        complete?.();
      }
    });

    tweenRef.current = tween;
    return tween;
  }, [duration, ease, decimals, prefix, suffix, onComplete]);

  /**
   * Count from current value by a delta
   * @param {number} delta - Amount to add/subtract
   * @param {Object} overrides - Override options
   */
  const countBy = useCallback((delta, overrides = {}) => {
    return countTo(valueRef.current.value + delta, overrides);
  }, [countTo]);

  /**
   * Reset to a specific value without animation
   * @param {number} value - Value to reset to
   */
  const reset = useCallback((value = start) => {
    if (tweenRef.current) {
      tweenRef.current.kill();
    }
    valueRef.current.value = value;
    setRawValue(value);
    setDisplayValue(formatNumber(value, { decimals, prefix, suffix }));
  }, [start, decimals, prefix, suffix]);

  /**
   * Pause current animation
   */
  const pause = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.pause();
    }
  }, []);

  /**
   * Resume paused animation
   */
  const resume = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.resume();
    }
  }, []);

  return {
    displayValue,
    rawValue,
    countTo,
    countBy,
    reset,
    pause,
    resume
  };
};

/**
 * Standalone function to animate a number in an element
 * @param {HTMLElement} element - Element to update
 * @param {number} from - Start value
 * @param {number} to - End value
 * @param {Object} options - Animation options
 */
export const animateNumber = (element, from, to, options = {}) => {
  const {
    duration = 1,
    ease = 'power2.out',
    decimals = 0,
    prefix = '',
    suffix = '',
    onComplete
  } = options;

  const obj = { value: from };

  return gsap.to(obj, {
    value: to,
    duration,
    ease,
    onUpdate: () => {
      if (element) {
        element.textContent = formatNumber(obj.value, { decimals, prefix, suffix });
      }
    },
    onComplete
  });
};

export default useCountUp;
