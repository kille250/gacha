/**
 * Generator Calculation Functions
 *
 * Pure functions for generator-related calculations.
 * These can be used by service, routes, and websocket handler.
 */

const { GENERATORS, GENERATOR_UPGRADES, SYNERGY_UPGRADES } = require('../../../config/essenceTap');

/**
 * Calculate the cost of the next generator purchase
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @returns {number} Cost for next purchase
 */
function getGeneratorCost(generatorId, owned) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return Infinity;

  return Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned));
}

/**
 * Calculate cost to buy multiple generators at once
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @param {number} count - Number to buy
 * @returns {number} Total cost
 */
function getBulkGeneratorCost(generatorId, owned, count) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return Infinity;

  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned + i));
  }
  return total;
}

/**
 * Calculate maximum generators purchasable with given essence
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @param {number} essence - Available essence
 * @returns {number} Maximum purchasable
 */
function getMaxPurchasable(generatorId, owned, essence) {
  let count = 0;
  let cost = 0;

  while (true) {
    const nextCost = getGeneratorCost(generatorId, owned + count);
    if (cost + nextCost > essence) break;
    cost += nextCost;
    count++;
    if (count > 1000) break; // Safety limit
  }

  return count;
}

/**
 * Calculate base production for a single generator type
 * @param {string} generatorId - Generator ID
 * @param {number} count - Number owned
 * @param {Array} purchasedUpgrades - List of purchased upgrade IDs
 * @param {Object} generators - All owned generators (for synergy calculations)
 * @returns {number} Production per second for this generator type
 */
function calculateGeneratorBaseProduction(generatorId, count, purchasedUpgrades = [], generators = {}) {
  if (count <= 0) return 0;

  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return 0;

  let output = generator.baseOutput * count;

  // Apply generator-specific upgrades
  for (const upgradeId of purchasedUpgrades) {
    const upgrade = GENERATOR_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.generatorId === generatorId) {
      output *= upgrade.multiplier;
    }
  }

  // Apply synergy bonuses
  for (const upgradeId of purchasedUpgrades) {
    const synergy = SYNERGY_UPGRADES.find(u => u.id === upgradeId);
    if (synergy && synergy.targetGenerator === generatorId) {
      const sourceCount = generators[synergy.sourceGenerator] || 0;
      output *= (1 + sourceCount * synergy.bonusPerSource);
    }
  }

  return output;
}

/**
 * Calculate total generator production (before multipliers)
 * @param {Object} generators - Generators owned { generatorId: count }
 * @param {Array} purchasedUpgrades - List of purchased upgrade IDs
 * @returns {number} Total base production per second
 */
function calculateTotalBaseProduction(generators, purchasedUpgrades = []) {
  let total = 0;

  for (const [generatorId, count] of Object.entries(generators || {})) {
    total += calculateGeneratorBaseProduction(generatorId, count, purchasedUpgrades, generators);
  }

  return total;
}

/**
 * Get generator definition by ID
 * @param {string} generatorId - Generator ID
 * @returns {Object|null} Generator definition or null
 */
function getGeneratorById(generatorId) {
  return GENERATORS.find(g => g.id === generatorId) || null;
}

/**
 * Check if a generator is unlocked
 * @param {string} generatorId - Generator ID
 * @param {number} lifetimeEssence - Player's lifetime essence
 * @returns {boolean} Whether generator is unlocked
 */
function isGeneratorUnlocked(generatorId, lifetimeEssence) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return false;
  return lifetimeEssence >= generator.unlockEssence;
}

module.exports = {
  getGeneratorCost,
  getBulkGeneratorCost,
  getMaxPurchasable,
  calculateGeneratorBaseProduction,
  calculateTotalBaseProduction,
  getGeneratorById,
  isGeneratorUnlocked,
  GENERATORS
};
