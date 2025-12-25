/**
 * Ripple - Touch feedback effect component
 *
 * Provides Material Design-inspired ripple effect for touch/click feedback.
 * Can be added to any interactive element for enhanced tactile feedback.
 *
 * Features:
 * - Originates from touch/click point
 * - Smooth scale and fade animation
 * - Respects reduced motion preferences
 * - Automatically cleans up old ripples
 * - Customizable color and duration
 *
 * @example
 * <button style={{ position: 'relative', overflow: 'hidden' }}>
 *   <RippleContainer onRipple={handleRipple} />
 *   Click me
 * </button>
 */

import React, { useState, useCallback, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { theme } from '../../../design-system';

// Ripple expand animation
const rippleExpand = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

const RippleWrapper = styled.span`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  border-radius: inherit;
`;

const RippleCircle = styled.span`
  position: absolute;
  border-radius: 50%;
  background: ${props => props.$color || 'rgba(255, 255, 255, 0.35)'};
  animation: ${rippleExpand} ${props => props.$duration || 600}ms ease-out forwards;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

/**
 * Ripple hook for adding ripple effect to any element
 *
 * @param {Object} options
 * @param {string} options.color - Ripple color (default: white with opacity)
 * @param {number} options.duration - Animation duration in ms (default: 600)
 * @returns {Object} { ripples, addRipple, RippleContainer }
 *
 * @example
 * const { ripples, addRipple, RippleContainer } = useRipple();
 * <button onClick={addRipple}>
 *   <RippleContainer ripples={ripples} />
 *   Click me
 * </button>
 */
export const useRipple = (options = {}) => {
  const { color, duration = 600 } = options;
  const [ripples, setRipples] = useState([]);

  const addRipple = useCallback((event) => {
    // Get click/touch position relative to element
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();

    // Support both mouse and touch events
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Calculate ripple size (should cover the entire element)
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple = {
      id: Date.now(),
      x: x - size / 2,
      y: y - size / 2,
      size,
    };

    setRipples(prev => [...prev, newRipple]);

    // Clean up ripple after animation completes
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, duration);
  }, [duration]);

  const RippleContainer = memo(({ ripples: rippleList }) => (
    <RippleWrapper aria-hidden="true">
      {rippleList.map(ripple => (
        <RippleCircle
          key={ripple.id}
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
    </RippleWrapper>
  ));

  return { ripples, addRipple, RippleContainer };
};

/**
 * RippleButton - Pre-built button with ripple effect
 *
 * A convenience wrapper that combines a button with ripple effect.
 * Use this for quick implementation without manual setup.
 */
const RippleButtonBase = styled.button`
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  min-height: 44px;
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  transition:
    background ${theme.timing.fast} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut};
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${theme.colors.glassHover};
      border-color: ${theme.colors.glassBorder};
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${props => props.$variant === 'primary' && css`
    background: ${theme.colors.primary};
    color: white;
    border-color: transparent;

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.primaryHover};
      }
    }
  `}

  ${props => props.$fullWidth && css`
    width: 100%;
  `}
`;

export const RippleButton = memo(({
  children,
  variant,
  fullWidth,
  rippleColor,
  onClick,
  ...props
}) => {
  const { ripples, addRipple, RippleContainer } = useRipple({
    color: rippleColor || (variant === 'primary' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)')
  });

  const handleClick = useCallback((e) => {
    addRipple(e);
    onClick?.(e);
  }, [addRipple, onClick]);

  return (
    <RippleButtonBase
      $variant={variant}
      $fullWidth={fullWidth}
      onClick={handleClick}
      {...props}
    >
      <RippleContainer ripples={ripples} />
      {children}
    </RippleButtonBase>
  );
});

RippleButton.displayName = 'RippleButton';

export default useRipple;
