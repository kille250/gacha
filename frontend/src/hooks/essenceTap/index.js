/**
 * Essence Tap Hooks - Index
 *
 * Re-exports all Essence Tap related hooks for convenient importing.
 *
 * REFACTORED HOOK STRUCTURE:
 * ===========================
 *
 * Core Modular Hooks:
 *   - useEssenceTapState        - Core state management (essence, generators, upgrades)
 *   - useEssenceTapActions      - All action callbacks (click, purchase, prestige, etc.)
 *   - useEssenceTapAchievements - Achievement tracking and notifications
 *   - useEssenceTapClick        - Click/tap handling and combo system
 *   - useEssenceTapLifecycle    - Lifecycle and sync management
 *
 * Granular Utility Hooks:
 *   - useComboSystem            - Combo multiplier logic
 *   - usePassiveProduction      - Passive essence generation
 *   - useOptimisticEssence      - Optimistic UI updates
 *   - useEssenceTapSounds       - Sound effects management
 *
 * Main Combined Hooks (for backward compatibility):
 *   - useEssenceTap             - Full combined hook with all functionality
 *   - useEssenceTapSocket       - WebSocket connection management
 *
 * Usage Examples:
 * ===============
 *
 * // Use individual hooks for fine-grained control:
 * import { useEssenceTapState, useEssenceTapActions } from '@/hooks/essenceTap';
 *
 * // Use the combined hook for full functionality (legacy):
 * import { useEssenceTap } from '@/hooks/essenceTap';
 */

// Core Modular hooks
export { useEssenceTapState, default as useEssenceTapStateDefault } from './useEssenceTapState';
export { useEssenceTapActions, default as useEssenceTapActionsDefault } from './useEssenceTapActions';
export { useEssenceTapAchievements, default as useEssenceTapAchievementsDefault } from './useEssenceTapAchievements';
export { useEssenceTapClick, default as useEssenceTapClickDefault } from './useEssenceTapClick';
export { useEssenceTapLifecycle, default as useEssenceTapLifecycleDefault } from './useEssenceTapLifecycle';

// Granular utility hooks
export { useComboSystem } from './useComboSystem';
export { usePassiveProduction } from './usePassiveProduction';
export { useOptimisticEssence } from './useOptimisticEssence';
export { useEssenceTapSounds } from './useEssenceTapSounds';

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
