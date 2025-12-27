/**
 * Enhanced Fishing Service
 *
 * Handles the enhanced fishing features including:
 * - Double-or-nothing mechanic
 * - Visual rarity communication
 * - Anti-frustration mechanics
 */

const {
  FISHING_DOUBLE_OR_NOTHING,
  FISHING_VISUAL_RARITY_CONFIG,
  STREAK_INSURANCE
} = require('../config/gameDesign');

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
