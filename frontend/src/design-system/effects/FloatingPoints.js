/**
 * FloatingPoints - Animated floating point indicator
 *
 * Shows a "+X" or "-X" animation that floats upward and fades out.
 * Used for immediate visual feedback when points are earned or spent.
 *
 * @example
 * const { showFloating, FloatingPortal } = useFloatingPoints();
 * showFloating(100, 'add'); // Shows "+100" floating up
 * showFloating(-50, 'subtract'); // Shows "-50" floating down
 */

import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../tokens';

// Float up and fade out animation
const floatUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateY(-10px) scale(1.1);
  }
  30% {
    transform: translateY(-25px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-60px) scale(0.9);
  }
`;

// Float down for negative values
const floatDown = keyframes`
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateY(10px) scale(1.1);
  }
  30% {
    transform: translateY(15px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(40px) scale(0.9);
  }
`;

const FloatingContainer = styled.div`
  position: fixed;
  pointer-events: none;
  z-index: ${theme.zIndex.tooltip + 100};
`;

const FloatingText = styled(motion.div)`
  position: absolute;
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  white-space: nowrap;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 0 20px ${props => props.$color}40;
  color: ${props => props.$color};
  animation: ${props => props.$isNegative ? floatDown : floatUp} 1.2s ease-out forwards;
  letter-spacing: ${theme.letterSpacing.wide};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

// Sparkle effect around the text
const Sparkle = styled.span`
  position: absolute;
  font-size: 0.6em;
  opacity: 0.8;
  animation: ${floatUp} 1s ease-out forwards;
  animation-delay: 0.1s;

  &:nth-child(1) {
    top: -8px;
    left: -12px;
  }
  &:nth-child(2) {
    top: -8px;
    right: -12px;
  }
`;

/**
 * Individual floating point indicator
 */
const FloatingPoint = ({ id, value, x, y, type, onComplete }) => {
  const isNegative = value < 0 || type === 'subtract';
  const displayValue = Math.abs(value);
  const prefix = isNegative ? '-' : '+';
  const color = isNegative ? theme.colors.error : theme.colors.success;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(id);
    }, 1200);
    return () => clearTimeout(timer);
  }, [id, onComplete]);

  return (
    <FloatingText
      $color={color}
      $isNegative={isNegative}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {!isNegative && (
        <>
          <Sparkle>✦</Sparkle>
          <Sparkle>✦</Sparkle>
        </>
      )}
      {prefix}{displayValue.toLocaleString()}
    </FloatingText>
  );
};

/**
 * Hook to manage floating point animations
 *
 * @returns {Object} { showFloating, FloatingPortal }
 */
export const useFloatingPoints = () => {
  const [floatingItems, setFloatingItems] = useState([]);
  const idCounter = useRef(0);

  const removeItem = useCallback((id) => {
    setFloatingItems(prev => prev.filter(item => item.id !== id));
  }, []);

  /**
   * Show a floating point indicator
   *
   * @param {number} value - The point value (positive or negative)
   * @param {string} type - 'add' or 'subtract'
   * @param {Object} position - { x, y } coordinates (optional, defaults to center-top)
   */
  const showFloating = useCallback((value, type = 'add', position = null) => {
    const id = ++idCounter.current;

    // Default position: center top of viewport
    const defaultPosition = {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.3,
    };

    const pos = position || defaultPosition;

    setFloatingItems(prev => [
      ...prev,
      {
        id,
        value,
        type,
        x: pos.x,
        y: pos.y,
      },
    ]);
  }, []);

  /**
   * Portal component to render floating points
   * Add this to your app root
   */
  const FloatingPortal = useCallback(() => {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <FloatingContainer>
        <AnimatePresence>
          {floatingItems.map(item => (
            <FloatingPoint
              key={item.id}
              id={item.id}
              value={item.value}
              x={item.x}
              y={item.y}
              type={item.type}
              onComplete={removeItem}
            />
          ))}
        </AnimatePresence>
      </FloatingContainer>,
      document.body
    );
  }, [floatingItems, removeItem]);

  return { showFloating, FloatingPortal };
};

/**
 * Context provider for app-wide floating points
 */
const FloatingPointsContext = createContext(null);

export const FloatingPointsProvider = ({ children }) => {
  const { showFloating, FloatingPortal } = useFloatingPoints();

  return (
    <FloatingPointsContext.Provider value={{ showFloating }}>
      {children}
      <FloatingPortal />
    </FloatingPointsContext.Provider>
  );
};

/**
 * Hook to access the floating points system from anywhere
 */
export const useFloatingPointsContext = () => {
  const context = useContext(FloatingPointsContext);
  if (!context) {
    throw new Error('useFloatingPointsContext must be used within FloatingPointsProvider');
  }
  return context;
};

export default FloatingPoint;
