/**
 * Fishing Components Barrel Export
 * 
 * Re-exports all fishing-related components for cleaner imports.
 */

// Engine - now modular
export { useFishingEngine, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './engine';

// Modal components
export { 
  HelpModal, 
  LeaderboardModal, 
  TradingPostModal, 
  ChallengesModal, 
  EquipmentModal, 
  PrestigeModal 
} from './modals';

// Layout components
export {
  FishingHeader,
  FishingStatsBar,
  FishingGameCanvas,
  FishingMobileControls,
  FishingAutofishBubbles,
} from './layout';

// Overlay components
export {
  FishingOverlays,
  FishingNotification,
} from './overlays';

