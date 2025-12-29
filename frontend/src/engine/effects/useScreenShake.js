/**
 * useScreenShake
 *
 * GSAP-powered screen shake effect for impactful moments.
 * Respects reduced motion preferences.
 */

import { useCallback, useRef, useMemo } from 'react';
import gsap from 'gsap';

// Preset shake intensities
export const SHAKE_PRESETS = {
  LIGHT: { intensity: 3, duration: 0.3, frequency: 20 },
  MEDIUM: { intensity: 6, duration: 0.4, frequency: 25 },
  HEAVY: { intensity: 12, duration: 0.5, frequency: 30 },
  EPIC: { intensity: 18, duration: 0.6, frequency: 35 },
  LEGENDARY: { intensity: 25, duration: 0.8, frequency: 40 }
};

// Map rarity to shake preset
export const RARITY_SHAKE_MAP = {
  common: null, // No shake
  uncommon: null, // No shake
  rare: SHAKE_PRESETS.LIGHT,
  epic: SHAKE_PRESETS.MEDIUM,
  legendary: SHAKE_PRESETS.HEAVY
};

export const useScreenShake = () => {
  const shakeTimelineRef = useRef(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /**
   * Trigger screen shake
   * @param {Object} options - Shake configuration
   * @param {number} options.intensity - Maximum pixel displacement (default: 8)
   * @param {number} options.duration - Duration in seconds (default: 0.4)
   * @param {number} options.frequency - Shakes per second (default: 25)
   * @param {HTMLElement} options.target - Element to shake (default: #app-shake-container)
   */
  const shake = useCallback(({
    intensity = 8,
    duration = 0.4,
    frequency = 25,
    target = null
  } = {}) => {
    // Respect reduced motion preference
    if (prefersReducedMotion) return;

    // Default to app shake container (avoids affecting fixed overlays)
    const element = target || document.getElementById('app-shake-container') || document.body;

    // Kill any existing shake
    if (shakeTimelineRef.current) {
      shakeTimelineRef.current.kill();
    }

    // Calculate number of shakes
    const shakeCount = Math.floor(duration * frequency);
    const interval = duration / shakeCount;

    // Create timeline
    const tl = gsap.timeline({
      onComplete: () => {
        // Ensure element returns to original position
        gsap.set(element, { x: 0, y: 0, clearProps: 'transform' });
      }
    });

    // Add shake keyframes with decreasing intensity
    for (let i = 0; i < shakeCount; i++) {
      const progress = i / shakeCount;
      const currentIntensity = intensity * (1 - progress * 0.7); // Decay intensity

      // Random direction for each shake
      const xOffset = (Math.random() - 0.5) * 2 * currentIntensity;
      const yOffset = (Math.random() - 0.5) * 2 * currentIntensity;

      tl.to(element, {
        x: xOffset,
        y: yOffset,
        duration: interval / 2,
        ease: 'power1.inOut'
      });
    }

    // Final return to center and clear transforms
    tl.to(element, {
      x: 0,
      y: 0,
      duration: interval,
      ease: 'power2.out',
      clearProps: 'transform'
    });

    shakeTimelineRef.current = tl;
    return tl;
  }, [prefersReducedMotion]);

  /**
   * Trigger shake based on rarity
   * @param {string} rarity - Rarity level (common, uncommon, rare, epic, legendary)
   * @param {Object} options - Additional options to merge with preset
   */
  const shakeForRarity = useCallback((rarity, options = {}) => {
    const preset = RARITY_SHAKE_MAP[rarity?.toLowerCase()];
    if (!preset) return null;

    return shake({ ...preset, ...options });
  }, [shake]);

  /**
   * Stop any active shake
   * IMPORTANT: Always clears the transform even if this instance doesn't have
   * the timeline ref. This handles the case where stopShake is called from a
   * different component instance than the one that started the shake.
   */
  const stopShake = useCallback(() => {
    if (shakeTimelineRef.current) {
      shakeTimelineRef.current.kill();
      shakeTimelineRef.current = null;
    }
    // Always clear the transform - critical for multi-summon where stopShake
    // may be called from a different component instance (MultiSummonAnimation)
    // than the one that started the shake (SummonAnimation)
    const element = document.getElementById('app-shake-container') || document.body;

    // Animate back to center smoothly instead of instant jump
    // This prevents jarring visual shifts when shake is interrupted mid-animation
    // (especially noticeable in multi-summon transitions)
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.08,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(element, { clearProps: 'transform' });
      }
    });
  }, []);

  return {
    shake,
    shakeForRarity,
    stopShake,
    presets: SHAKE_PRESETS
  };
};

export default useScreenShake;
