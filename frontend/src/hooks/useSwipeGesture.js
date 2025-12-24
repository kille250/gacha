/**
 * useSwipeGesture - Hook for detecting swipe gestures
 *
 * Features:
 * - Detects swipe down to close
 * - Provides visual offset during drag
 * - Configurable threshold
 * - Touch-only (no mouse)
 */
import { useState, useCallback, useRef } from 'react';

/**
 * @param {Object} options
 * @param {Function} options.onSwipeDown - Callback when swipe down threshold is reached
 * @param {number} options.threshold - Distance in pixels to trigger swipe (default: 100)
 * @param {number} options.velocityThreshold - Velocity to trigger quick swipe (default: 0.5)
 * @returns {Object} handlers and current offset
 */
export const useSwipeGesture = ({
  onSwipeDown,
  threshold = 100,
  velocityThreshold = 0.5,
} = {}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(null);
  const startTime = useRef(null);
  const currentY = useRef(null);

  const handleTouchStart = useCallback((e) => {
    // Only track touches that start near the top of the element
    const touch = e.touches[0];
    startY.current = touch.clientY;
    startTime.current = Date.now();
    currentY.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;

    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const delta = touch.clientY - startY.current;

    // Only allow downward dragging (positive delta)
    if (delta > 0) {
      // Apply resistance for a more natural feel
      const resistance = 0.5;
      const resistedDelta = delta * resistance;
      setOffset(resistedDelta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startY.current === null || currentY.current === null) {
      setOffset(0);
      setIsDragging(false);
      return;
    }

    const delta = currentY.current - startY.current;
    const elapsedTime = Date.now() - startTime.current;
    const velocity = delta / elapsedTime;

    // Trigger if threshold exceeded OR quick swipe detected
    if (delta > threshold || (delta > 50 && velocity > velocityThreshold)) {
      if (onSwipeDown) {
        onSwipeDown();
      }
    }

    // Reset
    startY.current = null;
    currentY.current = null;
    startTime.current = null;
    setOffset(0);
    setIsDragging(false);
  }, [onSwipeDown, threshold, velocityThreshold]);

  const handleTouchCancel = useCallback(() => {
    startY.current = null;
    currentY.current = null;
    startTime.current = null;
    setOffset(0);
    setIsDragging(false);
  }, []);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    offset,
    isDragging,
  };
};

export default useSwipeGesture;
