/**
 * Essence Tap Utility Functions
 *
 * Centralized utilities for the Essence Tap clicker minigame.
 * These functions are used by both useEssenceTap.js and useEssenceTapSocket.js
 * to ensure consistent behavior across the codebase.
 *
 * IMPORTANT: These utilities work with the server being the source of truth.
 * Frontend calculations are for optimistic UI updates only.
 */

/**
 * Reconcile local essence with server state.
 * Adds remaining optimistic (unconfirmed) essence to server value for smooth UI.
 *
 * @param {number} serverEssence - The authoritative essence value from server
 * @param {number} optimisticEssence - Unconfirmed optimistic essence from pending taps
 * @returns {number} Reconciled essence value
 *
 * @example
 * // After receiving tap_confirmed from server:
 * const remaining = getOptimisticEssence(); // e.g., 50 (from 5 pending taps)
 * const reconciled = reconcileEssence(serverEssence, remaining); // server + 50
 */
export function reconcileEssence(serverEssence, optimisticEssence = 0) {
  // Server value is authoritative; add back pending optimistic for smooth UI
  return serverEssence + optimisticEssence;
}

/**
 * Determine whether to accept server essence value during auto-save.
 * Prevents overwriting local gains that happened during the API call.
 *
 * @param {number} serverEssence - The essence value from server
 * @param {number} localEssence - Current local essence value
 * @param {number} lastSyncEssence - Essence at last successful sync
 * @returns {number} The essence value to use (server or local)
 *
 * @example
 * const finalEssence = resolveAutoSaveEssence(
 *   response.data.essence,
 *   localEssenceRef.current,
 *   lastSyncEssenceRef.current
 * );
 */
export function resolveAutoSaveEssence(serverEssence, localEssence, lastSyncEssence) {
  const localGainsSinceSync = localEssence - lastSyncEssence;

  // Accept server value if:
  // 1. Server is higher (normal case, server confirmed our gains)
  // 2. Local hasn't changed much (no pending taps during API call)
  if (serverEssence >= localEssence || localGainsSinceSync < 1) {
    return serverEssence;
  }

  // Server is lower but we have local gains - keep local to preserve smooth UI
  // Next sync will reconcile properly
  return localEssence;
}

/**
 * Format large numbers with suffixes (K, M, B, T, Qa).
 * Provides consistent number formatting across all Essence Tap components.
 *
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 *
 * @example
 * formatNumber(1500000) // "1.50M"
 * formatNumber(0.5) // "0.5"
 * formatNumber(999) // "999"
 */
export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // Handle small decimals (like 0.5/sec production rates)
  if (absNum < 1 && absNum > 0) return sign + absNum.toFixed(1);
  if (absNum < 1000) return sign + Math.floor(absNum).toLocaleString();
  if (absNum < 1000000) return sign + (absNum / 1000).toFixed(1) + 'K';
  if (absNum < 1000000000) return sign + (absNum / 1000000).toFixed(2) + 'M';
  if (absNum < 1000000000000) return sign + (absNum / 1000000000).toFixed(2) + 'B';
  if (absNum < 1000000000000000) return sign + (absNum / 1000000000000).toFixed(2) + 'T';
  return sign + (absNum / 1000000000000000).toFixed(2) + 'Qa';
}

/**
 * Format essence per second with appropriate suffix.
 *
 * @param {number} num - Production rate per second
 * @returns {string} Formatted rate string
 *
 * @example
 * formatPerSecond(500) // "+500/sec"
 * formatPerSecond(1500000) // "+1.50M/sec"
 */
export function formatPerSecond(num) {
  if (num === 0) return '+0/sec';
  return '+' + formatNumber(num) + '/sec';
}

/**
 * Format time duration in a user-friendly way.
 *
 * @param {number} ms - Time in milliseconds
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeSeconds - Include seconds in output
 * @returns {string} Formatted time string
 *
 * @example
 * formatDuration(305000) // "5:05"
 * formatDuration(3605000) // "1:00:05"
 */
export function formatDuration(ms, options = {}) {
  const { includeSeconds = true } = options;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  if (includeSeconds) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}m`;
}

/**
 * Calculate click essence with modifiers.
 * Used for optimistic UI updates before server confirmation.
 *
 * Note: Server is authoritative - this is for UI prediction only.
 *
 * @param {Object} params - Calculation parameters
 * @param {number} params.baseClickPower - Base click power from upgrades
 * @param {number} params.comboMultiplier - Current combo multiplier (1.0 - 2.5)
 * @param {number} params.critMultiplier - Critical hit multiplier (0 if no crit)
 * @param {boolean} params.isGolden - Whether this is a golden essence click
 * @param {number} params.goldenMultiplier - Golden essence multiplier (default 100)
 * @returns {number} Calculated essence gain
 */
export function calculateClickEssence({
  baseClickPower,
  comboMultiplier = 1,
  critMultiplier = 0,
  isGolden = false,
  goldenMultiplier = 100
}) {
  let essence = Math.floor(baseClickPower * comboMultiplier);

  if (critMultiplier > 0) {
    essence = Math.floor(essence * critMultiplier);
  }

  if (isGolden) {
    essence = Math.floor(essence * goldenMultiplier);
  }

  return essence;
}

/**
 * Validate boss encounter eligibility.
 *
 * @param {Object} bossInfo - Current boss info from server
 * @returns {Object} Validation result
 */
export function validateBossEligibility(bossInfo) {
  if (!bossInfo) {
    return { canAttack: false, reason: 'no_data' };
  }

  if (bossInfo.active) {
    return { canAttack: true, reason: 'active' };
  }

  if (bossInfo.canSpawn) {
    return { canAttack: true, reason: 'can_spawn' };
  }

  if (bossInfo.cooldownRemaining > 0) {
    return { canAttack: false, reason: 'cooldown', remaining: bossInfo.cooldownRemaining };
  }

  if (bossInfo.clicksUntilSpawn > 0) {
    return { canAttack: false, reason: 'clicks_needed', remaining: bossInfo.clicksUntilSpawn };
  }

  return { canAttack: false, reason: 'unknown' };
}

// Named exports for better tree-shaking
export default {
  reconcileEssence,
  resolveAutoSaveEssence,
  formatNumber,
  formatPerSecond,
  formatDuration,
  calculateClickEssence,
  validateBossEligibility
};
