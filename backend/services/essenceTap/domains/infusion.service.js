/**
 * Infusion Service
 *
 * Handles essence infusion mechanics:
 * - Cost calculation
 * - Performing infusions
 * - Bonus tracking
 * - Infusion information
 */

const {
  INFUSION_CONFIG
} = require('../../../config/essenceTap');

/**
 * Calculate the cost of the next infusion
 * @param {Object} state - Current state
 * @returns {number} Cost percentage (0-1)
 */
function calculateInfusionCost(state) {
  const infusionCount = state.infusionCount || 0;
  // Cost increases with each infusion: 50%, 55%, 60%, etc.
  return Math.min(
    INFUSION_CONFIG.baseCostPercent + (infusionCount * INFUSION_CONFIG.costIncreasePerUse),
    INFUSION_CONFIG.maxCostPercent
  );
}

/**
 * Calculate infusion bonus multiplier
 * @param {number} infusionCount - Number of infusions performed
 * @returns {number} Total bonus multiplier (e.g., 0.30 for +30%)
 */
function calculateInfusionBonus(infusionCount) {
  return infusionCount * INFUSION_CONFIG.bonusPerUse;
}

/**
 * Perform an infusion
 * @param {Object} state - Current state
 * @returns {Object} Result { success, newState?, error?, cost?, bonusGained?, totalBonus? }
 */
function performInfusion(state) {
  const infusionCount = state.infusionCount || 0;

  // Check if max infusions reached
  if (infusionCount >= INFUSION_CONFIG.maxPerPrestige) {
    return { success: false, error: 'Maximum infusions reached for this prestige' };
  }

  // Check minimum essence requirement - user must have at least minimumEssence to infuse
  if ((state.essence || 0) < INFUSION_CONFIG.minimumEssence) {
    return {
      success: false,
      error: `Need at least ${INFUSION_CONFIG.minimumEssence.toLocaleString()} essence to infuse`
    };
  }

  const costPercent = calculateInfusionCost(state);
  const cost = Math.floor(state.essence * costPercent);

  if (cost > state.essence) {
    return { success: false, error: 'Not enough essence' };
  }

  const bonusGained = INFUSION_CONFIG.bonusPerUse;
  const newBonus = (state.infusionBonus || 0) + bonusGained;

  const newState = { ...state };
  newState.essence = state.essence - cost;
  newState.infusionCount = infusionCount + 1;
  newState.infusionBonus = newBonus;
  newState.stats = {
    ...state.stats,
    totalInfusions: (state.stats?.totalInfusions || 0) + 1
  };

  return {
    success: true,
    cost,
    costPercent,
    bonusGained,
    totalBonus: newBonus,
    infusionCount: newState.infusionCount,
    newState
  };
}

/**
 * Get infusion information
 * @param {Object} state - Current state
 * @returns {Object} Infusion info including cost, bonus, and availability
 */
function getInfusionInfo(state) {
  const infusionCount = state.infusionCount || 0;
  const infusionBonus = state.infusionBonus || 0;
  const currentEssence = state.essence || 0;

  const costPercent = calculateInfusionCost(state);
  const nextCost = Math.floor(currentEssence * costPercent);

  const canAfford = currentEssence >= INFUSION_CONFIG.minimumEssence &&
                   nextCost <= currentEssence;

  const available = infusionCount < INFUSION_CONFIG.maxPerPrestige && canAfford;

  const nextBonus = INFUSION_CONFIG.bonusPerUse;
  const totalBonusAfterNext = infusionBonus + nextBonus;

  return {
    infusionCount,
    maxInfusions: INFUSION_CONFIG.maxPerPrestige,
    remaining: Math.max(0, INFUSION_CONFIG.maxPerPrestige - infusionCount),
    currentBonus: infusionBonus,
    bonusPercentage: infusionBonus * 100, // For display purposes
    nextCost,
    nextCostPercent: costPercent * 100, // For display purposes
    nextBonus,
    totalBonusAfterNext,
    totalBonusAfterNextPercentage: totalBonusAfterNext * 100,
    minimumEssence: INFUSION_CONFIG.minimumEssence,
    canAfford,
    available,
    config: {
      baseCostPercent: INFUSION_CONFIG.baseCostPercent,
      costIncreasePerUse: INFUSION_CONFIG.costIncreasePerUse,
      maxCostPercent: INFUSION_CONFIG.maxCostPercent,
      bonusPerUse: INFUSION_CONFIG.bonusPerUse,
      maxPerPrestige: INFUSION_CONFIG.maxPerPrestige,
      minimumEssence: INFUSION_CONFIG.minimumEssence
    }
  };
}

module.exports = {
  performInfusion,
  getInfusionInfo,
  calculateInfusionCost,
  calculateInfusionBonus
};
