/**
 * useComboSystem - Manages combo multiplier state for Essence Tap
 *
 * Handles:
 * - Combo multiplier growth on clicks
 * - Combo decay after inactivity
 * - Rate limiting for click spam
 *
 * @param {Object} config - Configuration object
 * @param {number} config.growthRate - How much combo grows per click
 * @param {number} config.maxMultiplier - Maximum combo multiplier
 * @param {number} config.decayTime - Time in ms before combo resets
 * @returns {Object} Combo state and functions
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export const useComboSystem = ({ growthRate, maxMultiplier, decayTime }) => {
  // Combo state
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboTimeoutRef = useRef(null);

  // Rate limiting
  const [clicksThisSecond, setClicksThisSecond] = useState(0);

  /**
   * Calculate the current combo multiplier
   * In this implementation, combo grows by growthRate each click
   */
  const calculateComboMultiplier = useCallback((currentCombo) => {
    return Math.min(currentCombo + growthRate, maxMultiplier);
  }, [growthRate, maxMultiplier]);

  /**
   * Reset combo to 1
   */
  const resetCombo = useCallback(() => {
    setComboMultiplier(1);
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
  }, []);

  /**
   * Update combo on click and restart decay timer
   */
  const updateCombo = useCallback(() => {
    // Clear existing timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    // Update combo
    setComboMultiplier(prev => calculateComboMultiplier(prev));

    // Set decay timeout
    comboTimeoutRef.current = setTimeout(() => {
      resetCombo();
    }, decayTime);
  }, [calculateComboMultiplier, resetCombo, decayTime]);

  /**
   * Check if click should be rate limited
   * @param {number} maxClicksPerSecond - Maximum allowed clicks per second
   * @returns {boolean} True if click should be allowed
   */
  const canClick = useCallback((maxClicksPerSecond = 20) => {
    return clicksThisSecond < maxClicksPerSecond;
  }, [clicksThisSecond]);

  /**
   * Register a click for rate limiting
   */
  const registerClick = useCallback(() => {
    setClicksThisSecond(prev => prev + 1);
    setTimeout(() => {
      setClicksThisSecond(prev => Math.max(0, prev - 1));
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, []);

  return {
    comboMultiplier,
    clicksThisSecond,
    calculateComboMultiplier,
    resetCombo,
    updateCombo,
    canClick,
    registerClick,
  };
};
