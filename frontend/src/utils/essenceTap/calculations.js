/**
 * Essence Tap Calculations
 *
 * Frontend calculation utilities for the Essence Tap minigame.
 * These mirror the backend calculations for optimistic UI updates.
 *
 * IMPORTANT: The server is the authoritative source of truth.
 * These calculations are for UI prediction only.
 */

/**
 * Format large numbers with suffixes (K, M, B, T, Qa)
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places (default: 1 for K, 2 for others)
 * @returns {string} Formatted number string
 */
export function formatNumber(num, decimals = null) {
  if (num === undefined || num === null || isNaN(num)) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum < 1 && absNum > 0) return sign + absNum.toFixed(1);
  if (absNum < 1000) return sign + Math.floor(absNum).toLocaleString();
  if (absNum < 1000000) return sign + (absNum / 1000).toFixed(decimals ?? 1) + 'K';
  if (absNum < 1000000000) return sign + (absNum / 1000000).toFixed(decimals ?? 2) + 'M';
  if (absNum < 1000000000000) return sign + (absNum / 1000000000).toFixed(decimals ?? 2) + 'B';
  if (absNum < 1000000000000000) return sign + (absNum / 1000000000000).toFixed(decimals ?? 2) + 'T';
  return sign + (absNum / 1000000000000000).toFixed(decimals ?? 2) + 'Qa';
}

/**
 * Format per-second rate
 * @param {number} num - Rate per second
 * @returns {string} Formatted rate string
 */
export function formatPerSecond(num) {
  if (num === 0) return '+0/sec';
  return '+' + formatNumber(num) + '/sec';
}

/**
 * Format time remaining in a user-friendly way
 * @param {number} ms - Milliseconds remaining
 * @returns {string} Formatted time string
 */
export function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Ready';

  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Format session duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatSessionDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Calculate combo multiplier from combo count
 * @param {number} comboCount - Current combo count
 * @param {Object} config - Game config
 * @returns {number} Combo multiplier
 */
export function calculateComboMultiplier(comboCount, config = {}) {
  if (comboCount <= 0) return 1;

  const multiplierPerCombo = config.comboGrowthRate || 0.08;
  const maxComboMultiplier = config.comboMaxMultiplier || 2.5;

  return Math.min(1 + (comboCount * multiplierPerCombo), maxComboMultiplier);
}

/**
 * Estimate click essence (for optimistic UI)
 * @param {Object} params - Parameters
 * @param {number} params.clickPower - Base click power
 * @param {number} params.comboMultiplier - Combo multiplier
 * @param {boolean} params.isCrit - Whether this is a crit
 * @param {number} params.critMultiplier - Crit multiplier
 * @param {boolean} params.isGolden - Whether this is a golden click
 * @param {number} params.goldenMultiplier - Golden multiplier
 * @returns {number} Estimated essence
 */
export function estimateClickEssence({
  clickPower,
  comboMultiplier = 1,
  isCrit = false,
  critMultiplier = 2,
  isGolden = false,
  goldenMultiplier = 100
}) {
  let essence = Math.floor(clickPower * comboMultiplier);

  if (isCrit) {
    essence = Math.floor(essence * critMultiplier);
  }

  if (isGolden) {
    essence = Math.floor(essence * goldenMultiplier);
  }

  return essence;
}

/**
 * Calculate prestige shards preview
 * @param {number} lifetimeEssence - Player's lifetime essence
 * @param {Object} config - Prestige config
 * @returns {number} Estimated shards
 */
export function calculatePrestigeShardsPreview(lifetimeEssence, config = {}) {
  const minimumEssence = config.minimumEssence || 50000000;
  const shardDivisor = config.shardDivisor || 10000000;

  if (lifetimeEssence < minimumEssence) {
    return 0;
  }

  return Math.floor(Math.sqrt(lifetimeEssence / shardDivisor));
}

/**
 * Calculate shard bonus multiplier
 * @param {number} lifetimeShards - Total lifetime shards
 * @param {Object} config - Prestige config
 * @returns {number} Bonus multiplier
 */
export function calculateShardBonus(lifetimeShards, config = {}) {
  const maxShards = config.maxEffectiveShards || 500;
  const shardMultiplier = config.shardMultiplier || 0.02;

  const effectiveShards = Math.min(lifetimeShards, maxShards);
  return 1 + (effectiveShards * shardMultiplier);
}

/**
 * Calculate upgrade cost
 * @param {Object} upgrade - Upgrade definition
 * @param {number} currentLevel - Current level (for leveled upgrades)
 * @returns {number} Cost
 */
export function calculateUpgradeCost(upgrade, currentLevel = 0) {
  if (!upgrade) return Infinity;

  if (upgrade.costMultiplier && currentLevel > 0) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
  }

  return upgrade.cost || upgrade.baseCost;
}

/**
 * Calculate generator cost
 * @param {Object} generator - Generator definition
 * @param {number} owned - Number currently owned
 * @returns {number} Cost for next purchase
 */
export function calculateGeneratorCost(generator, owned) {
  if (!generator) return Infinity;
  return Math.floor(generator.baseCost * Math.pow(generator.costMultiplier || 1.15, owned));
}

/**
 * Calculate bulk generator cost
 * @param {Object} generator - Generator definition
 * @param {number} owned - Number currently owned
 * @param {number} count - Number to buy
 * @returns {number} Total cost
 */
export function calculateBulkGeneratorCost(generator, owned, count) {
  if (!generator) return Infinity;

  let total = 0;
  const costMultiplier = generator.costMultiplier || 1.15;

  for (let i = 0; i < count; i++) {
    total += Math.floor(generator.baseCost * Math.pow(costMultiplier, owned + i));
  }

  return total;
}

/**
 * Calculate max purchasable generators
 * @param {Object} generator - Generator definition
 * @param {number} owned - Number currently owned
 * @param {number} essence - Available essence
 * @returns {number} Max purchasable
 */
export function calculateMaxPurchasable(generator, owned, essence) {
  if (!generator || essence <= 0) return 0;

  let count = 0;
  let totalCost = 0;
  const costMultiplier = generator.costMultiplier || 1.15;

  while (true) {
    const nextCost = Math.floor(generator.baseCost * Math.pow(costMultiplier, owned + count));
    if (totalCost + nextCost > essence) break;
    totalCost += nextCost;
    count++;
    if (count > 1000) break; // Safety limit
  }

  return count;
}

/**
 * Calculate offline progress preview
 * @param {Object} params - Parameters
 * @param {number} params.productionPerSecond - Current production rate
 * @param {number} params.hoursAway - Hours away
 * @param {number} params.maxOfflineHours - Max hours (default 24)
 * @param {number} params.offlineEfficiency - Efficiency rate (default 0.5)
 * @returns {Object} Offline progress preview
 */
export function calculateOfflinePreview({
  productionPerSecond,
  hoursAway,
  maxOfflineHours = 24,
  offlineEfficiency = 0.5
}) {
  const cappedHours = Math.min(hoursAway, maxOfflineHours);
  const essenceEarned = Math.floor(productionPerSecond * cappedHours * 3600 * offlineEfficiency);

  return {
    essenceEarned,
    hoursAway: cappedHours,
    efficiency: offlineEfficiency,
    wasCapped: hoursAway > maxOfflineHours
  };
}

export default {
  formatNumber,
  formatPerSecond,
  formatTimeRemaining,
  formatSessionDuration,
  calculateComboMultiplier,
  estimateClickEssence,
  calculatePrestigeShardsPreview,
  calculateShardBonus,
  calculateUpgradeCost,
  calculateGeneratorCost,
  calculateBulkGeneratorCost,
  calculateMaxPurchasable,
  calculateOfflinePreview
};
