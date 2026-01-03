/**
 * usePassiveIncome - Manages passive essence accumulation from generators
 *
 * Handles the interval-based passive income tick system. Respects sync state
 * to prevent double-counting when server is calculating offline progress.
 */

import { useEffect, useRef, useState } from 'react';
import { UI_TIMING } from '../../config/essenceTapConfig';

/**
 * @param {number} productionPerSecond - Production rate from gameState
 * @param {Object} isWaitingForSync - Ref to track if we're waiting for server sync
 * @returns {{ pendingEssence: number, clearPending: function }}
 */
export const usePassiveIncome = (productionPerSecond, isWaitingForSync) => {
  const [pendingEssence, setPendingEssence] = useState(0);
  const passiveTickRef = useRef(null);
  const pendingEssenceRef = useRef(0);

  useEffect(() => {
    // Always clear existing interval before setting up new one
    if (passiveTickRef.current) {
      clearInterval(passiveTickRef.current);
      passiveTickRef.current = null;
    }

    // Don't start passive income if no production or invalid state
    if (!productionPerSecond || productionPerSecond <= 0) {
      return;
    }

    const essencePerTick = (productionPerSecond * UI_TIMING.passiveTickRate) / 1000;

    passiveTickRef.current = setInterval(() => {
      // Skip tick if waiting for server sync to prevent double-counting
      if (isWaitingForSync && isWaitingForSync.current) {
        return;
      }

      setPendingEssence(prev => {
        const newVal = prev + essencePerTick;
        pendingEssenceRef.current = newVal;
        return newVal;
      });
    }, UI_TIMING.passiveTickRate);

    return () => {
      if (passiveTickRef.current) {
        clearInterval(passiveTickRef.current);
        passiveTickRef.current = null;
      }
    };
  }, [productionPerSecond, isWaitingForSync]);

  /**
   * Clear pending essence (called after sync)
   */
  const clearPending = () => {
    setPendingEssence(0);
    pendingEssenceRef.current = 0;
  };

  return {
    pendingEssence,
    clearPending,
    // Expose ref for synchronous access if needed
    pendingEssenceRef,
  };
};

export default usePassiveIncome;
