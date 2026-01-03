/**
 * Essence Tap Frontend Utilities
 *
 * Centralized exports for all Essence Tap utility functions.
 */

// Calculations
export * from './calculations';
export { default as calculations } from './calculations';

// Re-export from parent utilities for backward compatibility
export {
  reconcileEssence,
  resolveAutoSaveEssence,
  formatNumber as formatNumberCompat,
  formatPerSecond as formatPerSecondCompat,
  formatDuration,
  calculateClickEssence,
  validateBossEligibility
} from '../essenceTapUtils';
