/**
 * useChargeUp - Button charge-up animation hook
 *
 * Creates an anticipation-building charge effect for buttons.
 * Hold the button to "charge up" before release triggers the action.
 * Perfect for gacha pulls, attacks, or any dramatic actions.
 *
 * Features:
 * - Customizable charge duration
 * - Visual progress feedback
 * - Haptic feedback on charge complete
 * - Spring-based animations
 * - Abort on release before complete
 *
 * @example
 * const { bind, isCharging, chargeProgress, isCharged } = useChargeUp({
 *   onCharged: () => handlePull(),
 *   chargeDuration: 800,
 * });
 *
 * <Button {...bind}>
 *   {isCharging ? `${Math.round(chargeProgress * 100)}%` : 'Hold to Pull'}
 * </Button>
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { haptic } from '../design-system/utilities/microInteractions';

/**
 * useChargeUp Hook
 *
 * @param {Object} options
 * @param {Function} options.onCharged - Callback when fully charged and released
 * @param {Function} options.onChargeStart - Callback when charging starts
 * @param {Function} options.onChargeCancel - Callback when charge is cancelled
 * @param {number} options.chargeDuration - Duration to fully charge (ms, default: 600)
 * @param {boolean} options.releaseOnComplete - Auto-release when fully charged
 * @param {boolean} options.hapticFeedback - Enable haptic feedback
 * @param {boolean} options.disabled - Disable the hook
 */
const useChargeUp = ({
  onCharged,
  onChargeStart,
  onChargeCancel,
  chargeDuration = 600,
  releaseOnComplete = false,
  hapticFeedback = true,
  disabled = false,
} = {}) => {
  const [isCharging, setIsCharging] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [isCharged, setIsCharged] = useState(false);

  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const hasTriggeredRef = useRef(false);
  const isPressingRef = useRef(false);

  // Cleanup animation frame
  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!startTimeRef.current || !isPressingRef.current) return;

    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / chargeDuration, 1);

    setChargeProgress(progress);

    if (progress >= 1) {
      setIsCharged(true);

      // Haptic feedback when fully charged
      if (hapticFeedback) {
        haptic.success();
      }

      // Auto-release if enabled
      if (releaseOnComplete && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        onCharged?.();
        reset();
      }
    } else {
      // Continue animating
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeDuration, hapticFeedback, releaseOnComplete, onCharged]);

  // Reset state
  const reset = useCallback(() => {
    setIsCharging(false);
    setChargeProgress(0);
    setIsCharged(false);
    startTimeRef.current = null;
    hasTriggeredRef.current = false;
    isPressingRef.current = false;
    cancelAnimation();
  }, [cancelAnimation]);

  // Start charging
  const startCharge = useCallback(() => {
    if (disabled) return;

    isPressingRef.current = true;
    hasTriggeredRef.current = false;
    setIsCharging(true);
    setIsCharged(false);
    startTimeRef.current = Date.now();

    if (hapticFeedback) {
      haptic.light();
    }

    onChargeStart?.();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [disabled, hapticFeedback, onChargeStart, animate]);

  // Stop charging
  const stopCharge = useCallback(() => {
    if (!isPressingRef.current) return;

    cancelAnimation();
    isPressingRef.current = false;

    if (isCharged && !hasTriggeredRef.current && !releaseOnComplete) {
      // Fully charged - trigger action
      hasTriggeredRef.current = true;

      if (hapticFeedback) {
        haptic.medium();
      }

      onCharged?.();
    } else if (!isCharged && chargeProgress > 0) {
      // Cancelled before complete
      if (hapticFeedback && chargeProgress > 0.2) {
        haptic.light();
      }
      onChargeCancel?.();
    }

    reset();
  }, [
    cancelAnimation,
    isCharged,
    releaseOnComplete,
    hapticFeedback,
    chargeProgress,
    onCharged,
    onChargeCancel,
    reset,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  // Event bindings for the element
  const bind = {
    onMouseDown: startCharge,
    onMouseUp: stopCharge,
    onMouseLeave: stopCharge,
    onTouchStart: (e) => {
      e.preventDefault(); // Prevent scrolling while charging
      startCharge();
    },
    onTouchEnd: stopCharge,
    onTouchCancel: stopCharge,
    onKeyDown: (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isCharging) {
        e.preventDefault();
        startCharge();
      }
    },
    onKeyUp: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        stopCharge();
      }
    },
  };

  // Framer Motion animation values
  const motionValues = {
    scale: isCharging ? 1 + chargeProgress * 0.05 : 1,
    boxShadow: isCharging
      ? `0 0 ${20 * chargeProgress}px ${10 * chargeProgress}px rgba(255, 167, 38, ${0.3 * chargeProgress})`
      : 'none',
  };

  // CSS custom properties for styling
  const cssVariables = {
    '--charge-progress': chargeProgress,
    '--charge-scale': 1 + chargeProgress * 0.05,
    '--charge-glow': `${20 * chargeProgress}px`,
  };

  return {
    // State
    isCharging,
    chargeProgress,
    isCharged,

    // Bindings
    bind,

    // Animation helpers
    motionValues,
    cssVariables,

    // Manual controls
    startCharge,
    stopCharge,
    reset,
  };
};

export default useChargeUp;
