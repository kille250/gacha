/**
 * Enhanced Fishing Service
 *
 * Handles the enhanced fishing features including:
 * - Bait system
 * - Double-or-nothing mechanic
 * - Visual rarity communication
 * - Anti-frustration mechanics
 */

const {
  FISHING_BAIT_SYSTEM,
  FISHING_DOUBLE_OR_NOTHING,
  FISHING_VISUAL_RARITY_CONFIG,
  STREAK_INSURANCE
} = require('../config/gameDesign');

// ===========================================
// BAIT SYSTEM
// ===========================================

/**
 * Get user's bait inventory
 * @param {Object} user - User object
 * @returns {Object} - Bait inventory with quantities
 */
function getBaitInventory(user) {
  const inventory = user.baitInventory || {};

  // Ensure all bait types have a quantity (default 0)
  const fullInventory = {};
  Object.keys(FISHING_BAIT_SYSTEM).forEach(baitId => {
    if (baitId !== 'none') {
      fullInventory[baitId] = inventory[baitId] || 0;
    }
  });

  return fullInventory;
}

/**
 * Get available baits for a user
 * @param {Object} user - User object
 * @returns {Array} - Available bait options with costs and effects
 */
function getAvailableBaits(user) {
  const inventory = getBaitInventory(user);

  return Object.values(FISHING_BAIT_SYSTEM).map(bait => ({
    ...bait,
    owned: inventory[bait.id] || 0,
    canAfford: canAffordBait(user, bait.id),
    isAvailable: !bait.eventOnly // Event baits disabled until event system is implemented
  }));
}

/**
 * Check if user can afford a bait
 * @param {Object} user - User object
 * @param {string} baitId - Bait ID
 * @returns {boolean}
 */
function canAffordBait(user, baitId) {
  const bait = FISHING_BAIT_SYSTEM[baitId];
  if (!bait || bait.cost === 0) return true;

  switch (bait.costType) {
    case 'points':
      return (user.points || 0) >= bait.cost;
    case 'rollTickets':
      return (user.rollTickets || 0) >= bait.cost;
    case 'premiumTickets':
      return (user.premiumTickets || 0) >= bait.cost;
    default:
      return true;
  }
}

/**
 * Purchase bait (deduct cost and add to inventory)
 * @param {Object} user - User object
 * @param {string} baitId - Bait to purchase
 * @param {number} quantity - Amount to purchase
 * @returns {Object} - Result with success/error
 */
function purchaseBait(user, baitId, quantity = 1) {
  const bait = FISHING_BAIT_SYSTEM[baitId];
  if (!bait) {
    return { success: false, error: 'Invalid bait type' };
  }

  if (bait.cost === 0) {
    return { success: false, error: 'This bait cannot be purchased' };
  }

  const totalCost = bait.cost * quantity;

  // Check and deduct cost
  switch (bait.costType) {
    case 'points':
      if ((user.points || 0) < totalCost) {
        return { success: false, error: `Not enough points. Need ${totalCost}` };
      }
      user.points -= totalCost;
      break;
    case 'rollTickets':
      if ((user.rollTickets || 0) < totalCost) {
        return { success: false, error: `Not enough roll tickets. Need ${totalCost}` };
      }
      user.rollTickets -= totalCost;
      break;
    case 'premiumTickets':
      if ((user.premiumTickets || 0) < totalCost) {
        return { success: false, error: `Not enough premium tickets. Need ${totalCost}` };
      }
      user.premiumTickets -= totalCost;
      break;
    default:
      return { success: false, error: 'Unknown cost type' };
  }

  // Add to inventory
  const inventory = user.baitInventory || {};
  inventory[baitId] = (inventory[baitId] || 0) + quantity;
  user.baitInventory = inventory;

  return {
    success: true,
    bait: bait,
    quantity: quantity,
    totalCost: totalCost,
    newInventory: inventory[baitId]
  };
}

/**
 * Use bait for a fishing cast
 * @param {Object} user - User object
 * @param {string} baitId - Bait to use (or 'none')
 * @returns {Object} - Result with bait effects
 */
function useBait(user, baitId = 'none') {
  if (baitId === 'none') {
    return {
      success: true,
      bait: FISHING_BAIT_SYSTEM.none,
      effects: {
        rarityBonus: 0,
        catchRateBonus: 0,
        guaranteedMinRarity: null
      }
    };
  }

  const bait = FISHING_BAIT_SYSTEM[baitId];
  if (!bait) {
    return { success: false, error: 'Invalid bait type' };
  }

  // Check if consumable and user has it
  if (bait.consumable) {
    const inventory = user.baitInventory || {};
    if ((inventory[baitId] || 0) <= 0) {
      return { success: false, error: 'No bait remaining' };
    }

    // Consume bait
    inventory[baitId] -= 1;
    user.baitInventory = inventory;
  }

  return {
    success: true,
    bait: bait,
    consumed: bait.consumable,
    effects: {
      rarityBonus: bait.rarityBonus || 0,
      catchRateBonus: bait.catchRateBonus || 0,
      guaranteedMinRarity: bait.guaranteedMinRarity || null,
      legendaryBonus: bait.legendaryBonus || 0
    }
  };
}

/**
 * Apply bait effects to fish selection
 * @param {Object} baitEffects - Effects from useBait
 * @param {Object} selectionParams - Fish selection parameters
 * @returns {Object} - Modified selection parameters
 */
function applyBaitToSelection(baitEffects, selectionParams) {
  return {
    ...selectionParams,
    rarityBonus: (selectionParams.rarityBonus || 0) + baitEffects.rarityBonus,
    legendaryBonus: (selectionParams.legendaryBonus || 0) + (baitEffects.legendaryBonus || 0),
    guaranteedMinRarity: baitEffects.guaranteedMinRarity || selectionParams.guaranteedMinRarity,
    timingWindowBonus: (selectionParams.timingWindowBonus || 0) +
      (baitEffects.catchRateBonus * 200) // Convert to timing ms
  };
}

// ===========================================
// DOUBLE OR NOTHING SYSTEM
// ===========================================

/**
 * Check if double-or-nothing is available for a catch
 * @param {Object} fish - Caught fish
 * @returns {Object} - Availability and odds
 */
function isDoubleOrNothingAvailable(fish) {
  if (!FISHING_DOUBLE_OR_NOTHING.enabled) {
    return { available: false };
  }

  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const fishRarityIndex = rarityOrder.indexOf(fish.rarity);
  const minRarityIndex = rarityOrder.indexOf(FISHING_DOUBLE_OR_NOTHING.minRarity);

  if (fishRarityIndex < minRarityIndex) {
    return { available: false };
  }

  const tier = FISHING_DOUBLE_OR_NOTHING.tiers[fish.rarity];
  if (!tier) {
    return { available: false };
  }

  return {
    available: true,
    successChance: tier.successChance,
    successChancePercent: Math.round(tier.successChance * 100),
    sizeMultiplier: tier.sizeMultiplier,
    bonusReward: tier.bonusReward,
    failureReward: FISHING_DOUBLE_OR_NOTHING.failureReward
  };
}

/**
 * Execute double-or-nothing gamble
 * @param {Object} fish - Original caught fish
 * @param {number} originalQuantity - Original fish quantity
 * @returns {Object} - Result of the gamble
 */
function executeDoubleOrNothing(fish, originalQuantity) {
  const availability = isDoubleOrNothingAvailable(fish);
  if (!availability.available) {
    return {
      success: false,
      error: 'Double or nothing not available for this fish'
    };
  }

  const tier = FISHING_DOUBLE_OR_NOTHING.tiers[fish.rarity];
  const roll = Math.random();
  const isSuccess = roll < tier.successChance;

  if (isSuccess) {
    // Success! Fish is bigger
    const newQuantity = Math.ceil(originalQuantity * tier.sizeMultiplier);

    return {
      success: true,
      won: true,
      originalQuantity,
      newQuantity,
      bonusReward: tier.bonusReward,
      message: `The ${fish.name} is even bigger than you thought! ${tier.sizeMultiplier}x size!`,
      fish: {
        ...fish,
        isEnhanced: true,
        sizeMultiplier: tier.sizeMultiplier
      }
    };
  } else {
    // Failure - fish escapes but drops consolation
    const failureConfig = FISHING_DOUBLE_OR_NOTHING.failureReward;
    let consolation = null;

    if (failureConfig.scales) {
      // Calculate scale reward based on fish value
      const fishValue = fish.maxReward || fish.minReward || 100;
      consolation = {
        type: 'scales',
        quantity: Math.max(1, Math.floor(fishValue * failureConfig.scaleMultiplier)),
        name: `${fish.name} Scales`
      };
    }

    return {
      success: true,
      won: false,
      originalQuantity,
      newQuantity: 0,
      consolation,
      message: `The ${fish.name} broke free! But you got some ${consolation?.name || 'materials'}.`,
      fish: null
    };
  }
}

// ===========================================
// VISUAL RARITY COMMUNICATION
// ===========================================

/**
 * Get visual configuration for a fish rarity
 * @param {string} rarity - Fish rarity
 * @returns {Object} - Visual configuration
 */
function getVisualConfig(rarity) {
  return FISHING_VISUAL_RARITY_CONFIG[rarity] || FISHING_VISUAL_RARITY_CONFIG.common;
}

/**
 * Generate visual hints for an approaching fish
 * Used during the "waiting for bite" phase
 * @param {Object} fish - Fish that will bite
 * @returns {Object} - Visual hints (without revealing exact fish)
 */
function getPreBiteVisualHints(fish) {
  const config = getVisualConfig(fish.rarity);

  // Only reveal certain hints - don't spoil everything
  return {
    hasWarning: config.warningIndicator || false,
    splashIntensity: config.splashSize,
    hasGlow: config.glowIntensity > 0.3,
    glowHint: config.glowIntensity > 0.5 ? 'strong' : config.glowIntensity > 0 ? 'faint' : null,
    // For legendary, show the "!" warning
    exclamationWarning: config.warningIndicator || false
  };
}

/**
 * Generate full visual effects for a successful catch
 * @param {Object} fish - Caught fish
 * @param {string} catchQuality - 'perfect', 'great', 'good', 'normal'
 * @returns {Object} - Full visual effect configuration
 */
function getCatchVisualEffects(fish, catchQuality) {
  const config = getVisualConfig(fish.rarity);

  return {
    // Base rarity effects
    rarity: fish.rarity,
    splashSize: config.splashSize,
    glow: {
      intensity: config.glowIntensity,
      color: config.glowColor
    },
    screenShake: config.screenShake ? {
      enabled: true,
      intensity: config.shakeIntensity
    } : { enabled: false },
    musicChange: config.musicChange,
    cinematicCamera: config.cinematicCamera || false,
    celebrationLevel: config.celebrationLevel,

    // Catch quality modifiers
    perfectCatch: catchQuality === 'perfect',
    greatCatch: catchQuality === 'great',
    qualityBonus: catchQuality === 'perfect' ? 1.5 : catchQuality === 'great' ? 1.2 : 1.0,

    // Animation suggestions
    suggestedAnimations: getSuggestedAnimations(fish.rarity, catchQuality)
  };
}

/**
 * Get suggested animations based on rarity and quality
 * @param {string} rarity - Fish rarity
 * @param {string} quality - Catch quality
 * @returns {Array} - Animation names to play
 */
function getSuggestedAnimations(rarity, quality) {
  const animations = [];

  // Base animations by rarity
  if (rarity === 'legendary') {
    animations.push('legendary_burst', 'rainbow_trail', 'slow_motion_reveal');
  } else if (rarity === 'epic') {
    animations.push('epic_glow', 'purple_particles');
  } else if (rarity === 'rare') {
    animations.push('blue_sparkle', 'water_splash_large');
  }

  // Quality bonuses
  if (quality === 'perfect') {
    animations.push('perfect_star_burst', 'golden_ring');
  } else if (quality === 'great') {
    animations.push('great_sparkle');
  }

  return animations;
}

// ===========================================
// ANTI-FRUSTRATION / STREAK INSURANCE
// ===========================================

/**
 * Get user's current luck meter state
 * @param {Object} user - User object
 * @returns {Object} - Luck meter status
 */
function getLuckMeter(user) {
  const meter = user.luckMeter || {
    fishing: 0,
    gacha: 0,
    lastUpdate: null
  };

  // Apply decay if needed
  if (meter.lastUpdate) {
    const daysSinceUpdate = (Date.now() - new Date(meter.lastUpdate).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceUpdate >= 1) {
      const decay = Math.floor(daysSinceUpdate) * STREAK_INSURANCE.luckMeter.decayPerDay;
      meter.fishing = Math.max(0, meter.fishing - decay);
      meter.gacha = Math.max(0, meter.gacha - decay);
      meter.lastUpdate = new Date().toISOString();
    }
  }

  return meter;
}

/**
 * Update luck meter after an event
 * @param {Object} user - User object
 * @param {string} type - 'fishing' or 'gacha'
 * @param {string} outcome - 'miss', 'common', 'rare', etc.
 * @returns {Object} - Updated luck meter
 */
function updateLuckMeter(user, type, outcome) {
  const meter = getLuckMeter(user);
  const config = STREAK_INSURANCE.luckMeter;

  if (outcome === 'miss') {
    meter[type] = Math.min(config.maxAccumulated, meter[type] + config.perFailedCatch);
  } else if (outcome === 'common') {
    meter[type] = Math.min(config.maxAccumulated, meter[type] + config.perCommonCatch);
  } else if (['rare', 'epic', 'legendary'].includes(outcome)) {
    // Good outcome - reset some luck
    meter[type] = Math.max(0, meter[type] - 10);
  }

  meter.lastUpdate = new Date().toISOString();
  user.luckMeter = meter;

  return meter;
}

/**
 * Apply luck meter bonus to rarity chances
 * @param {number} currentBonus - Current rarity bonus
 * @param {Object} luckMeter - User's luck meter
 * @param {string} type - 'fishing' or 'gacha'
 * @returns {number} - Enhanced rarity bonus
 */
function applyLuckMeterBonus(currentBonus, luckMeter, type) {
  const luckValue = luckMeter[type] || 0;
  // Convert luck meter to bonus (max 50% luck = +25% rarity chance)
  const luckBonus = luckValue / 200;
  return currentBonus + luckBonus;
}

/**
 * Calculate consolation reward for a missed catch
 * @param {Object} fish - Fish that escaped
 * @returns {Object|null} - Consolation reward or null
 */
function calculateConsolationReward(fish) {
  if (!STREAK_INSURANCE.consolation.fishEscape.enabled) {
    return null;
  }

  // Only rare+ fish drop consolation
  if (!['rare', 'epic', 'legendary'].includes(fish.rarity)) {
    return null;
  }

  const fishValue = fish.maxReward || fish.minReward || 50;
  const consolationValue = Math.floor(fishValue * STREAK_INSURANCE.consolation.fishEscape.valueMultiplier);

  return {
    type: 'scales',
    name: `${fish.name} Scales`,
    quantity: Math.max(1, Math.floor(consolationValue / 10)),
    pointsValue: consolationValue
  };
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  // Bait System
  getBaitInventory,
  getAvailableBaits,
  canAffordBait,
  purchaseBait,
  useBait,
  applyBaitToSelection,

  // Double or Nothing
  isDoubleOrNothingAvailable,
  executeDoubleOrNothing,

  // Visual Effects
  getVisualConfig,
  getPreBiteVisualHints,
  getCatchVisualEffects,
  getSuggestedAnimations,

  // Anti-Frustration
  getLuckMeter,
  updateLuckMeter,
  applyLuckMeterBonus,
  calculateConsolationReward
};
