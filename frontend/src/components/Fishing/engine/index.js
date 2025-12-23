/**
 * Fishing Engine Module Exports
 */

// Main engine hook (composes smaller hooks)
export { useFishingEngine, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './useFishingEngine';

// Individual hooks for advanced usage
export { usePixiApp } from './usePixiApp';
export { useFishingRenderer } from './useFishingRenderer';
export { usePlayerMovement } from './usePlayerMovement';

// Map utilities
export { isWalkable, isWaterAdjacent } from './FishingMap';
