/**
 * useSwipeToDelete - Touch gesture hook for swipe-to-delete
 *
 * Features:
 * - Left swipe to reveal delete button
 * - Velocity-based detection
 * - Haptic feedback (if supported)
 * - Snap back animation
 */
import { useState, useCallback, useRef } from 'react';

const THRESHOLD = 80; // Distance to trigger delete reveal
const VELOCITY_THRESHOLD = 0.5; // Speed threshold for quick swipes

export const useSwipeToDelete = ({
  onDelete,
  threshold = THRESHOLD,
  disabled = false,
}) => {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isHorizontalSwipe = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = Date.now();
    isHorizontalSwipe.current = null;
    setSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || !swiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current !== true) return;

    // Prevent vertical scroll during horizontal swipe
    e.preventDefault();

    // Only allow left swipe (negative deltaX)
    // Add resistance when pulling right from revealed state
    let newOffset;
    if (isRevealed) {
      // Already revealed - allow pulling back
      newOffset = Math.min(0, Math.max(-threshold * 1.5, deltaX - threshold));
    } else {
      // Not revealed - only allow left swipe
      newOffset = Math.min(0, Math.max(-threshold * 1.5, deltaX));
    }

    setOffset(newOffset);
  }, [disabled, swiping, threshold, isRevealed]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    setSwiping(false);

    const endTime = Date.now();
    const duration = endTime - startTime.current;
    const velocity = Math.abs(offset) / duration;

    // Determine if we should reveal or hide
    const shouldReveal = Math.abs(offset) > threshold / 2 || velocity > VELOCITY_THRESHOLD;

    if (shouldReveal && offset < 0) {
      // Reveal delete button
      setOffset(-threshold);
      setIsRevealed(true);

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } else {
      // Snap back
      setOffset(0);
      setIsRevealed(false);
    }

    isHorizontalSwipe.current = null;
  }, [disabled, offset, threshold]);

  const handleDelete = useCallback(() => {
    // Animate out then delete
    setOffset(-window.innerWidth);
    setTimeout(() => {
      onDelete?.();
      setOffset(0);
      setIsRevealed(false);
    }, 200);
  }, [onDelete]);

  const reset = useCallback(() => {
    setOffset(0);
    setIsRevealed(false);
    setSwiping(false);
  }, []);

  // Close when clicking elsewhere
  const handleClickOutside = useCallback(() => {
    if (isRevealed) {
      reset();
    }
  }, [isRevealed, reset]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    style: {
      transform: `translateX(${offset}px)`,
      transition: swiping ? 'none' : 'transform 0.2s ease-out',
    },
    isRevealed,
    isSwiping: swiping,
    handleDelete,
    reset,
    handleClickOutside,
  };
};

export default useSwipeToDelete;
