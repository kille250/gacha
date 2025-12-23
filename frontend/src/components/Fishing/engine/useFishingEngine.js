/**
 * Fishing Engine Hook
 * 
 * Main orchestration hook for the PIXI.js fishing game engine.
 * Composes smaller hooks for app, rendering, and movement.
 * 
 * ARCHITECTURE:
 * - usePixiApp: PIXI application lifecycle
 * - useFishingRenderer: Visual layers and updates
 * - usePlayerMovement: Movement and collision
 * 
 * USAGE:
 * const { movePlayer } = useFishingEngine({
 *   containerRef,
 *   playerPos,
 *   setPlayerPos,
 *   playerDir,
 *   setPlayerDir,
 *   isFishing,
 *   showBiteAlert,
 *   canMove,
 *   timeOfDay,
 *   onCanFishChange,
 *   otherPlayers
 * });
 */

import { usePixiApp } from './usePixiApp';
import { useFishingRenderer } from './useFishingRenderer';
import { usePlayerMovement } from './usePlayerMovement';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './FishingMap';

/**
 * Main fishing engine hook - composes smaller focused hooks
 * @param {Object} options - Engine configuration
 * @param {React.RefObject} options.containerRef - Container for PIXI canvas
 * @param {Object} options.playerPos - Player position { x, y }
 * @param {Function} options.setPlayerPos - Player position setter
 * @param {string} options.playerDir - Player direction ('up', 'down', 'left', 'right')
 * @param {Function} options.setPlayerDir - Player direction setter
 * @param {boolean} options.isFishing - Whether player is currently fishing
 * @param {boolean} options.showBiteAlert - Whether to show fish bite alert
 * @param {boolean} options.canMove - Whether player can move
 * @param {string} options.timeOfDay - Current time period
 * @param {Function} options.onCanFishChange - Callback when fishing availability changes
 * @param {Array} options.otherPlayers - Other players for multiplayer rendering
 */
export const useFishingEngine = ({
  containerRef,
  playerPos,
  setPlayerPos,
  playerDir,
  setPlayerDir,
  isFishing = false,
  showBiteAlert = false,
  canMove = true,
  timeOfDay,
  onCanFishChange,
  otherPlayers = []
}) => {
  // Initialize PIXI application
  const { getApp, getContainer, isReady } = usePixiApp(containerRef);
  
  // Set up rendering layers and game loop
  useFishingRenderer({
    getApp,
    getContainer,
    isReady,
    playerPos,
    playerDir,
    isFishing,
    showBiteAlert,
    timeOfDay,
    otherPlayers,
  });
  
  // Handle player movement
  const { movePlayer } = usePlayerMovement({
    playerPos,
    setPlayerPos,
    playerDir,
    setPlayerDir,
    canMove,
    onCanFishChange,
  });
  
  return { movePlayer };
};

// Re-export constants for backward compatibility
export { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT };
