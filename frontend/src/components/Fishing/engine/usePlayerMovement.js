/**
 * Player Movement Hook
 * 
 * Handles player movement with collision detection.
 * Separated from rendering for cleaner architecture.
 */

import { useCallback, useEffect } from 'react';
import { isWalkable, isWaterAdjacent } from './FishingMap';

/**
 * Manage player movement and fishing availability
 * @param {Object} options - Movement configuration
 * @param {Object} options.playerPos - Current player position { x, y }
 * @param {Function} options.setPlayerPos - Player position setter
 * @param {string} options.playerDir - Current player direction
 * @param {Function} options.setPlayerDir - Player direction setter
 * @param {boolean} options.canMove - Whether movement is allowed
 * @param {Function} options.onCanFishChange - Callback when fishing availability changes
 * @returns {{ movePlayer: Function }}
 */
export function usePlayerMovement({
  playerPos,
  setPlayerPos,
  playerDir,
  setPlayerDir,
  canMove,
  onCanFishChange,
}) {
  // Check fishing availability when position or direction changes
  useEffect(() => {
    const canFish = isWaterAdjacent(playerPos.x, playerPos.y, playerDir);
    onCanFishChange?.(canFish);
  }, [playerPos, playerDir, onCanFishChange]);
  
  // Movement handler
  const movePlayer = useCallback((dx, dy, newDir) => {
    if (!canMove) return;
    
    setPlayerDir(newDir);
    setPlayerPos(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      
      if (isWalkable(newX, newY)) {
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [canMove, setPlayerDir, setPlayerPos]);
  
  return { movePlayer };
}

export default usePlayerMovement;


