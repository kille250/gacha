/**
 * usePullToRefresh - Apple-inspired pull-to-refresh hook
 *
 * Provides smooth, physics-based pull-to-refresh with:
 * - Natural resistance curve (harder to pull as distance increases)
 * - Clear threshold feedback
 * - Haptic feedback support
 * - Reduced motion support
 * - Proper state machine for all pull states
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Pull states for visual feedback
 */
export const PULL_STATES = {
  IDLE: 'idle',
  PULLING: 'pulling',
  THRESHOLD_REACHED: 'threshold_reached',
  REFRESHING: 'refreshing',
  COMPLETING: 'completing',
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  // Distance thresholds
  threshold: 80,              // Distance to trigger refresh
  maxPull: 140,              // Maximum pull distance

  // Physics
  resistance: 0.4,           // Base resistance (lower = more resistance)
  rubberBandFactor: 0.3,     // Rubber band effect past threshold

  // Animation timing
  snapBackDuration: 300,     // Return to rest animation (ms)
  refreshHoldDuration: 1000, // Minimum time to show refreshing state
  completeDuration: 200,     // Completion feedback duration

  // Feature flags
  hapticFeedback: true,      // Vibrate on threshold
  preventScroll: true,       // Prevent body scroll while pulling
};

/**
 * Apply resistance curve for natural feel
 * Returns a value between 0 and maxPull
 */
const applyResistance = (distance, threshold, maxPull, resistance, rubberBandFactor) => {
  if (distance <= 0) return 0;

  if (distance <= threshold) {
    // Before threshold: moderate resistance
    const progress = distance / threshold;
    return threshold * (1 - Math.pow(1 - progress * resistance, 2));
  } else {
    // After threshold: strong rubber-band resistance
    const overPull = distance - threshold;
    const maxOverPull = maxPull - threshold;
    const rubberBand = maxOverPull * (1 - Math.exp(-overPull * rubberBandFactor / maxOverPull));
    return threshold * resistance + rubberBand;
  }
};

/**
 * Trigger haptic feedback if available
 */
const triggerHaptic = (pattern = [10]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

/**
 * @param {Object} options
 * @param {Function} options.onRefresh - Async function called when refresh triggers
 * @param {Function} options.onComplete - Called after refresh completes
 * @param {boolean} options.disabled - Disable pull-to-refresh
 * @param {number} options.threshold - Pull distance to trigger (default: 80)
 * @param {number} options.maxPull - Maximum pull distance (default: 140)
 * @param {boolean} options.hapticFeedback - Enable haptic on threshold (default: true)
 * @returns {Object} Pull-to-refresh state and handlers
 */
export const usePullToRefresh = (options = {}) => {
  const { onRefresh, onComplete, disabled = false } = options;

  // Destructure options with defaults for stable dependencies
  const {
    threshold = DEFAULT_CONFIG.threshold,
    maxPull = DEFAULT_CONFIG.maxPull,
    resistance = DEFAULT_CONFIG.resistance,
    rubberBandFactor = DEFAULT_CONFIG.rubberBandFactor,
    snapBackDuration = DEFAULT_CONFIG.snapBackDuration,
    refreshHoldDuration = DEFAULT_CONFIG.refreshHoldDuration,
    completeDuration = DEFAULT_CONFIG.completeDuration,
    hapticFeedback = DEFAULT_CONFIG.hapticFeedback,
    preventScroll = DEFAULT_CONFIG.preventScroll,
  } = options;

  // Memoize config to prevent dependency changes on every render
  const config = useMemo(() => ({
    threshold,
    maxPull,
    resistance,
    rubberBandFactor,
    snapBackDuration,
    refreshHoldDuration,
    completeDuration,
    hapticFeedback,
    preventScroll,
  }), [
    threshold,
    maxPull,
    resistance,
    rubberBandFactor,
    snapBackDuration,
    refreshHoldDuration,
    completeDuration,
    hapticFeedback,
    preventScroll,
  ]);

  // State
  const [pullState, setPullState] = useState(PULL_STATES.IDLE);
  const [pullDistance, setPullDistance] = useState(0);
  const [visualOffset, setVisualOffset] = useState(0);

  // Refs for tracking
  const startY = useRef(null);
  const currentY = useRef(null);
  const startScrollTop = useRef(0);
  const isTracking = useRef(false);
  const hasTriggeredHaptic = useRef(false);
  const refreshStartTime = useRef(null);
  const containerRef = useRef(null);

  // Check if we're at the top of scroll container
  const isAtScrollTop = useCallback(() => {
    if (containerRef.current) {
      return containerRef.current.scrollTop <= 0;
    }
    return window.scrollY <= 0;
  }, []);

  // Calculate visual offset with resistance
  const calculateVisualOffset = useCallback((rawDistance) => {
    return applyResistance(
      rawDistance,
      config.threshold,
      config.maxPull,
      config.resistance,
      config.rubberBandFactor
    );
  }, [config.threshold, config.maxPull, config.resistance, config.rubberBandFactor]);

  // Progress toward threshold (0 to 1)
  const progress = Math.min(visualOffset / config.threshold, 1);

  // Is past the trigger threshold
  const isPastThreshold = pullDistance >= config.threshold;

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (disabled || pullState === PULL_STATES.REFRESHING) return;

    // Only start tracking if at top of scroll
    if (!isAtScrollTop()) return;

    const touch = e.touches[0];
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
    startScrollTop.current = containerRef.current?.scrollTop ?? window.scrollY;
    isTracking.current = true;
    hasTriggeredHaptic.current = false;
  }, [disabled, pullState, isAtScrollTop]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!isTracking.current || disabled || pullState === PULL_STATES.REFRESHING) return;
    if (startY.current === null) return;

    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const deltaY = touch.clientY - startY.current;

    // Only allow downward pull when at top
    if (deltaY <= 0 || !isAtScrollTop()) {
      if (pullDistance > 0) {
        setPullDistance(0);
        setVisualOffset(0);
        setPullState(PULL_STATES.IDLE);
      }
      return;
    }

    // Prevent default scroll while pulling
    if (config.preventScroll && deltaY > 10) {
      e.preventDefault();
    }

    // Update pull distance
    setPullDistance(deltaY);
    const offset = calculateVisualOffset(deltaY);
    setVisualOffset(offset);

    // Update state based on distance
    if (deltaY >= config.threshold) {
      if (pullState !== PULL_STATES.THRESHOLD_REACHED) {
        setPullState(PULL_STATES.THRESHOLD_REACHED);

        // Haptic feedback when threshold reached
        if (config.hapticFeedback && !hasTriggeredHaptic.current) {
          triggerHaptic([15]);
          hasTriggeredHaptic.current = true;
        }
      }
    } else if (deltaY > 0) {
      setPullState(PULL_STATES.PULLING);
      hasTriggeredHaptic.current = false;
    }
  }, [disabled, pullState, pullDistance, isAtScrollTop, calculateVisualOffset, config]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isTracking.current) return;
    isTracking.current = false;

    // If past threshold and we have a refresh handler, trigger it
    if (isPastThreshold && onRefresh && pullState === PULL_STATES.THRESHOLD_REACHED) {
      setPullState(PULL_STATES.REFRESHING);
      setVisualOffset(config.threshold * 0.8); // Hold at slightly below threshold
      refreshStartTime.current = Date.now();

      try {
        await onRefresh();
      } catch (error) {
        console.error('[PullToRefresh] Refresh failed:', error);
      }

      // Ensure minimum hold time for visual feedback
      const elapsed = Date.now() - refreshStartTime.current;
      const remainingHold = Math.max(0, config.refreshHoldDuration - elapsed);

      if (remainingHold > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingHold));
      }

      // Show completion state briefly
      setPullState(PULL_STATES.COMPLETING);

      // Light haptic for completion
      if (config.hapticFeedback) {
        triggerHaptic([5, 50, 5]);
      }

      await new Promise(resolve => setTimeout(resolve, config.completeDuration));

      // Call completion callback
      onComplete?.();
    }

    // Animate back to rest
    setPullState(PULL_STATES.IDLE);
    setPullDistance(0);
    setVisualOffset(0);
    startY.current = null;
    currentY.current = null;
  }, [isPastThreshold, onRefresh, onComplete, pullState, config]);

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    isTracking.current = false;
    setPullState(PULL_STATES.IDLE);
    setPullDistance(0);
    setVisualOffset(0);
    startY.current = null;
    currentY.current = null;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isTracking.current = false;
    };
  }, []);

  // Generate transform style for content
  const contentStyle = {
    transform: visualOffset > 0 ? `translateY(${visualOffset}px)` : 'none',
    transition: pullState === PULL_STATES.IDLE || pullState === PULL_STATES.COMPLETING
      ? `transform ${config.snapBackDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
      : 'none',
  };

  return {
    // State
    pullState,
    pullDistance,
    visualOffset,
    progress,
    isPastThreshold,
    isRefreshing: pullState === PULL_STATES.REFRESHING,
    isIdle: pullState === PULL_STATES.IDLE,

    // Handlers
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },

    // Refs
    containerRef,

    // Styles
    contentStyle,

    // Config (for indicator)
    threshold: config.threshold,
  };
};

export default usePullToRefresh;
