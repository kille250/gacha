/**
 * useSwipeGesture - Hook for detecting swipe gestures
 *
 * Features:
 * - Detects swipe in any direction (down, left, right)
 * - Provides visual offset during drag
 * - Configurable threshold
 * - Touch-only (no mouse)
 * - Supports horizontal swipes for action reveal
 */
import { useState, useCallback, useRef } from 'react';

/**
 * @param {Object} options
 * @param {Function} options.onSwipeDown - Callback when swipe down threshold is reached
 * @param {Function} options.onSwipeLeft - Callback when swipe left threshold is reached
 * @param {Function} options.onSwipeRight - Callback when swipe right threshold is reached
 * @param {number} options.threshold - Distance in pixels to trigger swipe (default: 100)
 * @param {number} options.velocityThreshold - Velocity to trigger quick swipe (default: 0.5)
 * @param {string} options.direction - Direction to track: 'vertical', 'horizontal', or 'both' (default: 'vertical')
 * @returns {Object} handlers and current offset
 */
export const useSwipeGesture = ({
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  velocityThreshold = 0.5,
  direction = 'vertical',
} = {}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: null, y: null });
  const startTime = useRef(null);
  const currentPos = useRef({ x: null, y: null });
  const directionLocked = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    currentPos.current = { x: touch.clientX, y: touch.clientY };
    startTime.current = Date.now();
    directionLocked.current = null;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startPos.current.x === null) return;

    const touch = e.touches[0];
    currentPos.current = { x: touch.clientX, y: touch.clientY };

    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;

    // Lock direction after initial movement
    if (!directionLocked.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        directionLocked.current = 'horizontal';
      } else {
        directionLocked.current = 'vertical';
      }
    }

    // Apply resistance for a more natural feel
    const resistance = 0.5;

    if (direction === 'vertical' || (direction === 'both' && directionLocked.current === 'vertical')) {
      // Only allow downward dragging (positive delta)
      if (deltaY > 0) {
        setOffset({ x: 0, y: deltaY * resistance });
      }
    } else if (direction === 'horizontal' || (direction === 'both' && directionLocked.current === 'horizontal')) {
      setOffset({ x: deltaX * resistance, y: 0 });
    }
  }, [direction]);

  const handleTouchEnd = useCallback(() => {
    if (startPos.current.x === null || currentPos.current.x === null) {
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
      directionLocked.current = null;
      return;
    }

    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;
    const elapsedTime = Date.now() - startTime.current;
    const velocityX = deltaX / elapsedTime;
    const velocityY = deltaY / elapsedTime;

    // Check vertical swipes
    if (direction === 'vertical' || direction === 'both') {
      if (deltaY > threshold || (deltaY > 50 && velocityY > velocityThreshold)) {
        onSwipeDown?.();
      }
    }

    // Check horizontal swipes
    if (direction === 'horizontal' || direction === 'both') {
      if (deltaX < -threshold || (deltaX < -50 && velocityX < -velocityThreshold)) {
        onSwipeLeft?.();
      } else if (deltaX > threshold || (deltaX > 50 && velocityX > velocityThreshold)) {
        onSwipeRight?.();
      }
    }

    // Reset
    startPos.current = { x: null, y: null };
    currentPos.current = { x: null, y: null };
    startTime.current = null;
    directionLocked.current = null;
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [onSwipeDown, onSwipeLeft, onSwipeRight, threshold, velocityThreshold, direction]);

  const handleTouchCancel = useCallback(() => {
    startPos.current = { x: null, y: null };
    currentPos.current = { x: null, y: null };
    startTime.current = null;
    directionLocked.current = null;
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    offset: direction === 'vertical' ? offset.y : offset,
    offsetX: offset.x,
    offsetY: offset.y,
    isDragging,
  };
};

export default useSwipeGesture;
