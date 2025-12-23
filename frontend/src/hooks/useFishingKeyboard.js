/**
 * Fishing Keyboard Hook
 * 
 * Handles keyboard input for the fishing minigame.
 * Extracted from FishingPage.js for cleaner component code.
 * 
 * USAGE:
 * useFishingKeyboard({
 *   gameState,
 *   canFish,
 *   isAutofishing,
 *   onCast,
 *   onCatch,
 *   onMove,
 * });
 */

import { useEffect, useCallback } from 'react';
import { GAME_STATES, DIRECTIONS } from '../constants/fishingConstants';

/**
 * Hook for handling fishing keyboard controls
 * @param {Object} options - Configuration options
 * @param {string} options.gameState - Current game state
 * @param {boolean} options.canFish - Whether player can fish at current position
 * @param {boolean} options.isAutofishing - Whether autofish is active
 * @param {Function} options.onCast - Cast handler
 * @param {Function} options.onCatch - Catch handler
 * @param {Function} options.onMove - Movement handler (dx, dy, direction)
 */
export function useFishingKeyboard({
  gameState,
  canFish,
  isAutofishing,
  onCast,
  onCatch,
  onMove,
}) {
  const handleKeyDown = useCallback((e) => {
    // Fishing action (Space or E)
    if (e.code === 'Space' || e.code === 'KeyE') {
      e.preventDefault();
      
      // Cast if ready
      if (gameState === GAME_STATES.WALKING && canFish && !isAutofishing) {
        onCast();
        return;
      }
      
      // Catch if fish appeared
      if (gameState === GAME_STATES.FISH_APPEARED) {
        onCatch();
        return;
      }
    }
    
    // Movement (only when walking and not autofishing)
    if (gameState === GAME_STATES.WALKING && !isAutofishing) {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          onMove(0, -1, DIRECTIONS.UP);
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          onMove(0, 1, DIRECTIONS.DOWN);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          onMove(-1, 0, DIRECTIONS.LEFT);
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          onMove(1, 0, DIRECTIONS.RIGHT);
          break;
        default:
          break;
      }
    }
  }, [gameState, canFish, isAutofishing, onCast, onCatch, onMove]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useFishingKeyboard;

