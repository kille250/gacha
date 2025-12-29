/**
 * useScreenFlash
 *
 * GSAP-powered screen flash overlay effect.
 * Creates a fullscreen color flash for impactful reveals.
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';
import gsap from 'gsap';

// Flash presets
export const FLASH_PRESETS = {
  WHITE: { color: '#ffffff', opacity: 0.9, duration: 0.15 },
  GOLDEN: { color: '#ffd700', opacity: 0.8, duration: 0.2 },
  PURPLE: { color: '#9c27b0', opacity: 0.7, duration: 0.2 },
  BLUE: { color: '#2196f3', opacity: 0.6, duration: 0.15 }
};

// Map rarity to flash color
export const RARITY_FLASH_MAP = {
  common: { color: '#8e8e93', opacity: 0.4, duration: 0.1 },
  uncommon: { color: '#34c759', opacity: 0.5, duration: 0.12 },
  rare: { color: '#5856d6', opacity: 0.6, duration: 0.15 },
  epic: { color: '#af52de', opacity: 0.75, duration: 0.18 },
  legendary: { color: '#ffd700', opacity: 0.85, duration: 0.22 }
};

export const useScreenFlash = () => {
  const overlayRef = useRef(null);
  const timelineRef = useRef(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Create overlay element on mount
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Check if overlay already exists
    let overlay = document.getElementById('screen-flash-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'screen-flash-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 99998;
        opacity: 0;
        background: white;
      `;
      document.body.appendChild(overlay);
    }

    overlayRef.current = overlay;

    return () => {
      // Don't remove on unmount - might be used by other components
    };
  }, []);

  /**
   * Trigger screen flash
   * @param {Object} options - Flash configuration
   * @param {string} options.color - Flash color (default: '#ffffff')
   * @param {number} options.opacity - Peak opacity (default: 0.9)
   * @param {number} options.duration - Duration in seconds (default: 0.15)
   */
  const flash = useCallback(({
    color = '#ffffff',
    opacity = 0.9,
    duration = 0.15
  } = {}) => {
    // Respect reduced motion - use shorter, less intense flash
    if (prefersReducedMotion) {
      opacity = Math.min(opacity, 0.3);
      duration = Math.min(duration, 0.08);
    }

    if (!overlayRef.current) return;

    // Kill any existing flash
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const overlay = overlayRef.current;

    // Set initial state
    gsap.set(overlay, {
      backgroundColor: color,
      opacity: 0
    });

    // Create flash timeline
    const tl = gsap.timeline();

    tl.to(overlay, {
      opacity: opacity,
      duration: duration * 0.3,
      ease: 'power2.in'
    }).to(overlay, {
      opacity: 0,
      duration: duration * 0.7,
      ease: 'power2.out'
    });

    timelineRef.current = tl;
    return tl;
  }, [prefersReducedMotion]);

  /**
   * Trigger flash based on rarity
   * @param {string} rarity - Rarity level
   * @param {Object} options - Additional options to merge
   */
  const flashForRarity = useCallback((rarity, options = {}) => {
    const preset = RARITY_FLASH_MAP[rarity?.toLowerCase()] || RARITY_FLASH_MAP.common;
    return flash({ ...preset, ...options });
  }, [flash]);

  /**
   * Stop any active flash
   */
  const stopFlash = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    if (overlayRef.current) {
      gsap.set(overlayRef.current, { opacity: 0 });
    }
  }, []);

  return {
    flash,
    flashForRarity,
    stopFlash,
    presets: FLASH_PRESETS
  };
};

export default useScreenFlash;
