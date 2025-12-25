/**
 * usePressState - Interactive press state management
 *
 * Provides comprehensive press/hover/focus state management
 * with proper touch handling, keyboard support, and accessibility.
 *
 * Handles the complexity of:
 * - Touch vs mouse interactions
 * - Long press detection
 * - Press cancellation (drag/scroll)
 * - Keyboard activation
 * - Focus states
 *
 * @example
 * const { pressProps, isPressed, isHovered, isFocused } = usePressState({
 *   onPress: () => console.log('Pressed!'),
 *   onLongPress: () => console.log('Long pressed!'),
 * });
 *
 * <button {...pressProps} style={{ transform: isPressed ? 'scale(0.97)' : 'none' }}>
 *   Click me
 * </button>
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { haptic } from '../design-system/utilities/microInteractions';

/**
 * Hook for managing press states on interactive elements
 *
 * @param {Object} options - Configuration options
 * @returns {{ pressProps: Object, isPressed: boolean, isHovered: boolean, isFocused: boolean, isLongPressed: boolean }}
 */
export const usePressState = (options = {}) => {
  // Memoize config to prevent unnecessary re-renders
  const config = useMemo(() => ({
    onPress: options.onPress,
    onLongPress: options.onLongPress,
    onPressStart: options.onPressStart,
    onPressEnd: options.onPressEnd,
    longPressDelay: options.longPressDelay ?? 500,
    disabled: options.disabled ?? false,
    hapticFeedback: options.hapticFeedback ?? true,
    preventFocusOnPress: options.preventFocusOnPress ?? false,
    allowTextSelection: options.allowTextSelection ?? false,
  }), [
    options.onPress,
    options.onLongPress,
    options.onPressStart,
    options.onPressEnd,
    options.longPressDelay,
    options.disabled,
    options.hapticFeedback,
    options.preventFocusOnPress,
    options.allowTextSelection,
  ]);

  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);

  // Refs for tracking state across event handlers
  const longPressTimerRef = useRef(null);
  const pressStartRef = useRef(null);
  const touchMoveRef = useRef(false);
  const isKeyboardPressRef = useRef(false);

  // Cleanup long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  // Handle press start
  const handlePressStart = useCallback((event) => {
    if (config.disabled) return;

    // Store press start position for move detection
    if (event.type === 'touchstart') {
      const touch = event.touches[0];
      pressStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchMoveRef.current = false;
    } else {
      pressStartRef.current = { x: event.clientX, y: event.clientY };
    }

    setIsPressed(true);
    setIsLongPressed(false);

    // Haptic feedback
    if (config.hapticFeedback) {
      haptic.light();
    }

    // Callback
    config.onPressStart?.();

    // Start long press timer
    if (config.onLongPress) {
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        if (!touchMoveRef.current) {
          setIsLongPressed(true);
          if (config.hapticFeedback) {
            haptic.medium();
          }
          config.onLongPress();
        }
      }, config.longPressDelay);
    }
  }, [config, clearLongPressTimer]);

  // Handle press end
  const handlePressEnd = useCallback((event) => {
    clearLongPressTimer();

    if (!isPressed) return;

    setIsPressed(false);

    // Callback
    config.onPressEnd?.();

    // Don't trigger press if it was a long press or was cancelled
    if (!isLongPressed && !touchMoveRef.current && !config.disabled) {
      config.onPress?.();
    }

    setIsLongPressed(false);
    pressStartRef.current = null;
  }, [config, isPressed, isLongPressed, clearLongPressTimer]);

  // Handle touch move (for cancelling press on scroll/drag)
  const handleTouchMove = useCallback((event) => {
    if (!pressStartRef.current) return;

    const touch = event.touches[0];
    const dx = touch.clientX - pressStartRef.current.x;
    const dy = touch.clientY - pressStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If moved more than 10px, cancel the press
    if (distance > 10) {
      touchMoveRef.current = true;
      clearLongPressTimer();
      setIsPressed(false);
      setIsLongPressed(false);
    }
  }, [clearLongPressTimer]);

  // Handle press cancel
  const handlePressCancel = useCallback(() => {
    clearLongPressTimer();
    setIsPressed(false);
    setIsLongPressed(false);
    touchMoveRef.current = false;
    pressStartRef.current = null;
    config.onPressEnd?.();
  }, [config, clearLongPressTimer]);

  // Handle mouse enter/leave
  const handleMouseEnter = useCallback(() => {
    if (!config.disabled) {
      setIsHovered(true);
    }
  }, [config.disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Also cancel press if mouse leaves while pressed
    if (isPressed && !isKeyboardPressRef.current) {
      handlePressCancel();
    }
  }, [isPressed, handlePressCancel]);

  // Handle focus/blur
  const handleFocus = useCallback((event) => {
    // Only show focus ring for keyboard navigation
    if (event.target.matches(':focus-visible')) {
      setIsFocused(true);
    }
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Cancel keyboard press if focus lost
    if (isKeyboardPressRef.current) {
      isKeyboardPressRef.current = false;
      setIsPressed(false);
      clearLongPressTimer();
    }
  }, [clearLongPressTimer]);

  // Handle keyboard press (Enter/Space)
  const handleKeyDown = useCallback((event) => {
    if (config.disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      // Prevent scrolling for space
      if (event.key === ' ') {
        event.preventDefault();
      }

      if (!isKeyboardPressRef.current) {
        isKeyboardPressRef.current = true;
        setIsPressed(true);

        if (config.hapticFeedback) {
          haptic.light();
        }

        config.onPressStart?.();

        // Start long press timer for keyboard
        if (config.onLongPress) {
          clearLongPressTimer();
          longPressTimerRef.current = setTimeout(() => {
            setIsLongPressed(true);
            if (config.hapticFeedback) {
              haptic.medium();
            }
            config.onLongPress();
          }, config.longPressDelay);
        }
      }
    }
  }, [config, clearLongPressTimer]);

  const handleKeyUp = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      clearLongPressTimer();

      if (isKeyboardPressRef.current) {
        isKeyboardPressRef.current = false;
        setIsPressed(false);

        config.onPressEnd?.();

        // Trigger press if not long pressed
        if (!isLongPressed && !config.disabled) {
          config.onPress?.();
        }

        setIsLongPressed(false);
      }
    }
  }, [config, isLongPressed, clearLongPressTimer]);

  // Build props object for the element
  const pressProps = {
    // Mouse events
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,

    // Touch events
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    onTouchMove: handleTouchMove,
    onTouchCancel: handlePressCancel,

    // Keyboard events
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,

    // Focus events
    onFocus: handleFocus,
    onBlur: handleBlur,

    // Prevent text selection during press
    ...(config.allowTextSelection ? {} : { style: { userSelect: 'none', WebkitUserSelect: 'none' } }),

    // Accessibility
    role: 'button',
    tabIndex: config.disabled ? -1 : 0,
    'aria-disabled': config.disabled || undefined,
  };

  return {
    pressProps,
    isPressed,
    isHovered,
    isFocused,
    isLongPressed,
    // Utility methods
    cancelPress: handlePressCancel,
  };
};

/**
 * Hook for tracking press state with Framer Motion integration
 *
 * @param {Object} options - Same as usePressState options
 * @returns {{ pressProps: Object, motionProps: Object, isPressed: boolean, isHovered: boolean }}
 */
export const useMotionPress = (options = {}) => {
  const { pressProps, isPressed, isHovered, isFocused, isLongPressed } = usePressState(options);

  // Framer Motion compatible props
  const motionProps = {
    animate: {
      scale: isPressed ? 0.97 : 1,
      y: isHovered && !isPressed ? -2 : 0,
    },
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
    whileTap: { scale: 0.97 },
    whileHover: { y: -2 },
  };

  return {
    pressProps,
    motionProps,
    isPressed,
    isHovered,
    isFocused,
    isLongPressed,
  };
};

/**
 * Hook for simple hover state tracking
 *
 * @returns {{ hoverProps: Object, isHovered: boolean }}
 */
export const useHover = () => {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onFocus: () => setIsHovered(true),
    onBlur: () => setIsHovered(false),
  };

  return { hoverProps, isHovered };
};

/**
 * Hook for simple focus state tracking
 *
 * @returns {{ focusProps: Object, isFocused: boolean, isFocusVisible: boolean }}
 */
export const useFocus = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  const focusProps = {
    onFocus: (event) => {
      setIsFocused(true);
      // Check if focus is from keyboard navigation
      if (event.target.matches(':focus-visible')) {
        setIsFocusVisible(true);
      }
    },
    onBlur: () => {
      setIsFocused(false);
      setIsFocusVisible(false);
    },
  };

  return { focusProps, isFocused, isFocusVisible };
};

export default usePressState;
