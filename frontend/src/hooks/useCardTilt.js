/**
 * useCardTilt - 3D perspective tilt effect for cards
 *
 * Creates an interactive 3D tilt effect that follows mouse/touch position.
 * Provides a premium, game-like feel to interactive cards.
 *
 * Features:
 * - Smooth spring physics animation
 * - Optional glare/shine effect
 * - Touch support for mobile
 * - Reduced motion support
 * - GPU-accelerated transforms
 *
 * @example
 * const { tiltStyle, handlers, glareStyle } = useCardTilt({ intensity: 15, glare: true });
 * <motion.div style={tiltStyle} {...handlers}>
 *   {glare && <div style={glareStyle} />}
 *   Card content
 * </motion.div>
 */

import { useRef, useCallback, useState, useMemo } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotion } from '../design-system';

const defaultConfig = {
  intensity: 10,       // Max tilt angle in degrees
  scale: 1.02,         // Scale on hover
  glare: false,        // Enable glare effect
  glareOpacity: 0.15,  // Max glare opacity
  perspective: 1000,   // CSS perspective value
  springConfig: {
    stiffness: 400,
    damping: 30,
    mass: 0.5,
  },
};

/**
 * useCardTilt hook
 *
 * @param {Object} config - Configuration options
 * @param {number} config.intensity - Max tilt angle in degrees (default: 10)
 * @param {number} config.scale - Scale factor on hover (default: 1.02)
 * @param {boolean} config.glare - Enable glare effect (default: false)
 * @param {number} config.glareOpacity - Max glare opacity (default: 0.15)
 * @param {number} config.perspective - CSS perspective value (default: 1000)
 * @param {Object} config.springConfig - Framer Motion spring config
 *
 * @returns {Object} { tiltStyle, handlers, glareStyle, isHovering }
 */
export const useCardTilt = (config = {}) => {
  const {
    intensity,
    scale,
    glare,
    glareOpacity,
    perspective,
    springConfig,
  } = { ...defaultConfig, ...config };

  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  // Motion values for mouse position (0-1 range)
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Apply spring physics for smooth animation
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Transform mouse position to rotation angles
  const rotateX = useTransform(springY, [0, 1], [intensity, -intensity]);
  const rotateY = useTransform(springX, [0, 1], [-intensity, intensity]);

  // Transform for glare position
  const glareX = useTransform(springX, [0, 1], ['0%', '100%']);
  const glareY = useTransform(springY, [0, 1], ['0%', '100%']);

  // Calculate relative mouse position within the card
  const updatePosition = useCallback((clientX, clientY) => {
    if (!cardRef.current || prefersReducedMotion) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Clamp values to 0-1 range
    mouseX.set(Math.max(0, Math.min(1, x)));
    mouseY.set(Math.max(0, Math.min(1, y)));
  }, [mouseX, mouseY, prefersReducedMotion]);

  // Reset to center position
  const resetPosition = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    setIsHovering(false);
  }, [mouseX, mouseY]);

  // Event handlers
  const handlers = useMemo(() => ({
    ref: cardRef,
    onMouseEnter: () => setIsHovering(true),
    onMouseLeave: resetPosition,
    onMouseMove: (e) => updatePosition(e.clientX, e.clientY),
    onTouchStart: () => setIsHovering(true),
    onTouchEnd: resetPosition,
    onTouchMove: (e) => {
      if (e.touches[0]) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
  }), [updatePosition, resetPosition]);

  // Style object for the card
  const tiltStyle = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        transform: isHovering ? `scale(${scale})` : 'scale(1)',
        transition: 'transform 0.2s ease-out',
      };
    }

    return {
      perspective: `${perspective}px`,
      transformStyle: 'preserve-3d',
      rotateX,
      rotateY,
      scale: isHovering ? scale : 1,
    };
  }, [prefersReducedMotion, isHovering, scale, perspective, rotateX, rotateY]);

  // Glare overlay style
  const glareStyle = useMemo(() => {
    if (!glare || prefersReducedMotion) return null;

    return {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      borderRadius: 'inherit',
      background: `radial-gradient(
        circle at var(--glare-x, 50%) var(--glare-y, 50%),
        rgba(255, 255, 255, ${isHovering ? glareOpacity : 0}) 0%,
        transparent 60%
      )`,
      transition: 'opacity 0.2s ease-out',
      '--glare-x': glareX,
      '--glare-y': glareY,
    };
  }, [glare, glareOpacity, isHovering, glareX, glareY, prefersReducedMotion]);

  return {
    tiltStyle,
    handlers,
    glareStyle,
    isHovering,
    // Expose individual values for custom use
    rotateX,
    rotateY,
    springX,
    springY,
  };
};

export default useCardTilt;
