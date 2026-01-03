/**
 * useAutoSave - Manages periodic auto-save of game state
 *
 * Runs a periodic interval to save pending essence to the server.
 * Tracks last save time for debugging and UI display.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * @param {number} saveInterval - Interval in ms between saves (default 30000)
 * @param {function} getPendingEssence - Function that returns current pending essence
 * @param {function} onSave - Async callback to execute the save
 * @returns {{ lastSaveTime: number }}
 */
export const useAutoSave = (saveInterval = 30000, getPendingEssence, onSave) => {
  const [lastSaveTime, setLastSaveTime] = useState(Date.now());
  const lastSaveRef = useRef(Date.now());

  useEffect(() => {
    if (!getPendingEssence || !onSave) {
      console.warn('[useAutoSave] Missing required callbacks');
      return;
    }

    const intervalId = setInterval(async () => {
      const pendingEssence = getPendingEssence();

      if (pendingEssence > 0) {
        try {
          await onSave(pendingEssence);
          const now = Date.now();
          setLastSaveTime(now);
          lastSaveRef.current = now;
        } catch (err) {
          console.error('[useAutoSave] Save failed:', err);
          // Don't update lastSaveTime on failure
        }
      }
    }, saveInterval);

    return () => clearInterval(intervalId);
  }, [saveInterval, getPendingEssence, onSave]);

  return {
    lastSaveTime,
    lastSaveRef, // Exposed for synchronous access if needed
  };
};

export default useAutoSave;
