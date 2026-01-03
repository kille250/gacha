/**
 * Essence Tap Hooks - Index
 *
 * Re-exports all Essence Tap related hooks for convenient importing.
 *
 * Hook Structure:
 *   - useEssenceTapState    - Core state management
 *   - useEssenceTapClick    - Click/tap handling and combo system
 *   - useEssenceTapAchievements - Achievement tracking
 *   - useEssenceTapLifecycle    - Lifecycle and sync management
 *
 * Main Hooks (for backward compatibility):
 *   - useEssenceTap       - Combined hook with full functionality
 *   - useEssenceTapSocket - WebSocket connection management
 */

// Modular hooks
export { useEssenceTapState, default as useEssenceTapStateDefault } from './useEssenceTapState';
export { useEssenceTapClick, default as useEssenceTapClickDefault } from './useEssenceTapClick';
export { useEssenceTapAchievements, default as useEssenceTapAchievementsDefault } from './useEssenceTapAchievements';
export { useEssenceTapLifecycle, default as useEssenceTapLifecycleDefault } from './useEssenceTapLifecycle';

// Re-export from parent hooks for backward compatibility
// These are the main hooks that should be used
export { useEssenceTap } from '../useEssenceTap';
export { useEssenceTapSocket, CONNECTION_STATES } from '../useEssenceTapSocket';

// Utilities from the utilities module
export {
  formatNumber,
  formatPerSecond,
  formatTimeRemaining,
  formatSessionDuration,
  calculateComboMultiplier,
  estimateClickEssence,
  calculatePrestigeShardsPreview,
  calculateShardBonus,
  calculateGeneratorCost,
  calculateBulkGeneratorCost,
  calculateMaxPurchasable,
  calculateOfflinePreview
} from '../../utils/essenceTap/calculations';

// Legacy re-exports for backward compatibility
export { formatNumber as formatNumberLegacy, formatPerSecond as formatPerSecondLegacy } from '../useEssenceTap';
