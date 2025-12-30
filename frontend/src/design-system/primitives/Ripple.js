/**
 * Ripple - Material-inspired ripple effect for buttons and interactive elements
 *
 * Creates an expanding circle effect on click/tap for satisfying feedback.
 * Automatically cleans up completed ripples for performance.
 *
 * @example
 * <Button>
 *   <Ripple />
 *   Click me
 * </Button>
 */

import React, { useState, useCallback, useLayoutEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const rippleAnimation = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

const RippleContainer = styled.span`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
`;

const RippleCircle = styled.span`
  position: absolute;
  border-radius: 50%;
  background: ${props => props.$color || 'rgba(255, 255, 255, 0.35)'};
  animation: ${rippleAnimation} ${props => props.$duration || 600}ms ease-out forwards;
  transform: scale(0);
  pointer-events: none;
`;

/**
 * Ripple Component
 *
 * @param {string} color - Custom ripple color (default: white with transparency)
 * @param {number} duration - Animation duration in ms (default: 600)
 * @param {boolean} disabled - Disable ripple effect
 * @param {boolean} center - Always ripple from center instead of click position
 */
const Ripple = ({
  color,
  duration = 600,
  disabled = false,
  center = false,
}) => {
  const [ripples, setRipples] = useState([]);

  // Clean up completed ripples
  useLayoutEffect(() => {
    if (ripples.length === 0) return;

    const timeoutId = setTimeout(() => {
      setRipples([]);
    }, duration + 100);

    return () => clearTimeout(timeoutId);
  }, [ripples, duration]);

  const addRipple = useCallback((event) => {
    if (disabled) return;

    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    let x, y;
    if (center) {
      x = rect.width / 2 - size / 2;
      y = rect.height / 2 - size / 2;
    } else {
      x = event.clientX - rect.left - size / 2;
      y = event.clientY - rect.top - size / 2;
    }

    const newRipple = {
      x,
      y,
      size,
      key: Date.now(),
    };

    setRipples(prev => [...prev, newRipple]);
  }, [disabled, center]);

  return (
    <RippleContainer onMouseDown={addRipple} onTouchStart={addRipple}>
      {ripples.map(ripple => (
        <RippleCircle
          key={ripple.key}
          $color={color}
          $duration={duration}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </RippleContainer>
  );
};

/**
 * useRipple - Hook for adding ripple effect to any element
 *
 * @example
 * const { ripples, addRipple, RippleContainer } = useRipple();
 * <div onMouseDown={addRipple}>
 *   <RippleContainer ripples={ripples} />
 *   Content
 * </div>
 */
export const useRipple = (options = {}) => {
  const { color, duration = 600, disabled = false, center = false } = options;
  const [ripples, setRipples] = useState([]);

  useLayoutEffect(() => {
    if (ripples.length === 0) return;

    const timeoutId = setTimeout(() => {
      setRipples([]);
    }, duration + 100);

    return () => clearTimeout(timeoutId);
  }, [ripples, duration]);

  const addRipple = useCallback((event) => {
    if (disabled) return;

    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    let x, y;
    if (center) {
      x = rect.width / 2 - size / 2;
      y = rect.height / 2 - size / 2;
    } else {
      x = event.clientX - rect.left - size / 2;
      y = event.clientY - rect.top - size / 2;
    }

    const newRipple = {
      x,
      y,
      size,
      key: Date.now(),
    };

    setRipples(prev => [...prev, newRipple]);
  }, [disabled, center]);

  const RippleElements = useCallback(() => (
    <RippleContainer>
      {ripples.map(ripple => (
        <RippleCircle
          key={ripple.key}
          $color={color}
          $duration={duration}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </RippleContainer>
  ), [ripples, color, duration]);

  return { ripples, addRipple, RippleElements };
};

export default Ripple;
