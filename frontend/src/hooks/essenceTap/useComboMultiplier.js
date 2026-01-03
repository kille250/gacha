/**
 * useComboMultiplier - Manages combo multiplier state and auto-decay
 *
 * Handles the combo system that increases click power based on rapid clicking.
 * Features automatic decay timer that resets the combo after inactivity.
 */

import { useState, useRef, useCallback } from 'react';
import { COMBO_CONFIG } from '../../config/essenceTapConfig';

export const useComboMultiplier = () => {
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboTimeoutRef = useRef(null);

  /**
   * Increment combo multiplier and reset decay timer
   */
  const incrementCombo = useCallback(() => {
    // Clear existing timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    // Increment multiplier (capped at max)
    setComboMultiplier(prev =>
      Math.min(prev + COMBO_CONFIG.growthRate, COMBO_CONFIG.maxMultiplier)
    );

    // Set new decay timeout
    comboTimeoutRef.current = setTimeout(() => {
      setComboMultiplier(1);
    }, COMBO_CONFIG.decayTime);
  }, []);

  /**
   * Immediately reset combo to 1
   */
  const resetCombo = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    setComboMultiplier(1);
  }, []);

  // Cleanup on unmount
  // Note: Parent component should handle cleanup via useEffect
  // This hook provides the timeout ref for external cleanup if needed

  return {
    comboMultiplier,
    incrementCombo,
    resetCombo,
    comboTimeoutRef, // Exposed for cleanup in parent
  };
};

export default useComboMultiplier;
