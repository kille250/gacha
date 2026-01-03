/**
 * Essence Tap Hooks - Index
 *
 * Re-exports all Essence Tap related hooks for convenient importing.
 */

export { useEssenceTapState, default as useEssenceTapStateDefault } from './useEssenceTapState';
export { useEssenceTapClick, default as useEssenceTapClickDefault } from './useEssenceTapClick';
export { useEssenceTapAchievements, default as useEssenceTapAchievementsDefault } from './useEssenceTapAchievements';
export { useEssenceTapLifecycle, default as useEssenceTapLifecycleDefault } from './useEssenceTapLifecycle';

// Re-export from parent hooks for backward compatibility
// These are the main hooks that should be used
export { useEssenceTap } from '../useEssenceTap';
export { useEssenceTapSocket, CONNECTION_STATES } from '../useEssenceTapSocket';

// Utilities
export { formatNumber, formatPerSecond } from '../useEssenceTap';
