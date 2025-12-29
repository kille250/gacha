/**
 * useConfetti Hook
 *
 * Provides a stable confetti instance that uses a fixed-position canvas.
 * This prevents layout shifts caused by the global confetti() creating its own canvas.
 *
 * The canvas is shared across all components using this hook and is lazily initialized.
 */

import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

// Singleton canvas element shared across all hook instances
let sharedCanvas = null;
let sharedConfettiInstance = null;
let refCount = 0;

/**
 * Creates or returns the shared confetti canvas
 */
const getSharedCanvas = () => {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCanvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100000;
    `;
    sharedCanvas.id = 'shared-confetti-canvas';
    document.body.appendChild(sharedCanvas);

    sharedConfettiInstance = confetti.create(sharedCanvas, {
      resize: true,
      useWorker: true
    });
  }
  return { canvas: sharedCanvas, instance: sharedConfettiInstance };
};

/**
 * Cleans up the shared canvas when no more components are using it
 */
const cleanupSharedCanvas = () => {
  if (refCount <= 0 && sharedCanvas) {
    if (sharedConfettiInstance) {
      sharedConfettiInstance.reset();
      sharedConfettiInstance = null;
    }
    if (sharedCanvas.parentNode) {
      sharedCanvas.parentNode.removeChild(sharedCanvas);
    }
    sharedCanvas = null;
  }
};

/**
 * Hook that provides a confetti function using a shared fixed-position canvas.
 *
 * @returns {Object} Object containing the fire function and reset function
 *
 * @example
 * const { fire, reset } = useConfetti();
 *
 * // Fire confetti with options
 * fire({
 *   particleCount: 100,
 *   spread: 70,
 *   origin: { y: 0.6 }
 * });
 *
 * // Reset/clear all confetti
 * reset();
 */
export const useConfetti = () => {
  const instanceRef = useRef(null);

  // Initialize on mount, cleanup on unmount
  useEffect(() => {
    refCount++;
    const { instance } = getSharedCanvas();
    instanceRef.current = instance;

    return () => {
      refCount--;
      // Delay cleanup slightly to allow for component remounting
      setTimeout(cleanupSharedCanvas, 100);
    };
  }, []);

  /**
   * Fire confetti with the given options
   */
  const fire = useCallback((options = {}) => {
    const instance = instanceRef.current;
    if (!instance) {
      // Fallback: try to get instance directly
      const { instance: freshInstance } = getSharedCanvas();
      if (freshInstance) {
        return freshInstance(options);
      }
      return;
    }
    return instance(options);
  }, []);

  /**
   * Reset/clear all confetti particles
   */
  const reset = useCallback(() => {
    const instance = instanceRef.current;
    if (instance && typeof instance.reset === 'function') {
      instance.reset();
    }
  }, []);

  /**
   * Fire a rare pull celebration effect
   * @param {string} rarity - The rarity level ('legendary', 'epic', 'rare', etc.)
   * @param {string} color - The primary color for the confetti
   */
  const fireRarePull = useCallback((rarity, color) => {
    if (!['legendary', 'epic'].includes(rarity)) return;

    const particleCount = rarity === 'legendary' ? 200 : 100;

    fire({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: [color, '#ffffff', '#ffd700']
    });
  }, [fire]);

  /**
   * Fire a multi-pull celebration effect
   * @param {boolean} hasRare - Whether any rare+ characters were pulled
   */
  const fireMultiPull = useCallback((hasRare) => {
    if (!hasRare) return;

    fire({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 }
    });
  }, [fire]);

  return { fire, reset, fireRarePull, fireMultiPull };
};

export default useConfetti;
