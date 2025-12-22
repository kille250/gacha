/**
 * Fishing Config Validator
 * 
 * Validates fishing configuration on application startup.
 * Catches configuration errors early before they cause runtime issues.
 */

const { FISH_TYPES, FISHING_CONFIG, FISHING_AREAS, FISHING_RODS, TRADE_OPTIONS } = require('../fishing');

class ConfigValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ConfigValidationError';
    this.details = details;
  }
}

/**
 * Validate fish type weights sum correctly
 */
function validateFishWeights() {
  const totalWeight = FISH_TYPES.reduce((sum, fish) => sum + fish.weight, 0);
  
  // Allow small floating point variance
  if (Math.abs(totalWeight - 100) > 1) {
    throw new ConfigValidationError(
      `Fish weights should sum to ~100, got ${totalWeight.toFixed(2)}`,
      { 
        weights: FISH_TYPES.map(f => ({ id: f.id, weight: f.weight })),
        totalWeight 
      }
    );
  }
  
  // Check for negative weights
  const negativeWeights = FISH_TYPES.filter(f => f.weight < 0);
  if (negativeWeights.length > 0) {
    throw new ConfigValidationError(
      'Fish weights cannot be negative',
      { invalidFish: negativeWeights.map(f => f.id) }
    );
  }
  
  // Check for zero weight (unreachable fish)
  const zeroWeights = FISH_TYPES.filter(f => f.weight === 0);
  if (zeroWeights.length > 0) {
    console.warn('[FishingConfig] Warning: Some fish have 0 weight and cannot be caught:', 
      zeroWeights.map(f => f.id));
  }
  
  return true;
}

/**
 * Validate fish timing windows are reasonable
 */
function validateFishTiming() {
  const issues = [];
  
  for (const fish of FISH_TYPES) {
    if (fish.timingWindow < 100) {
      issues.push(`${fish.id}: timing window ${fish.timingWindow}ms is too short (min 100ms)`);
    }
    if (fish.timingWindow > 5000) {
      issues.push(`${fish.id}: timing window ${fish.timingWindow}ms is too long (max 5000ms)`);
    }
    if (fish.minReward >= fish.maxReward) {
      issues.push(`${fish.id}: minReward (${fish.minReward}) >= maxReward (${fish.maxReward})`);
    }
  }
  
  if (issues.length > 0) {
    throw new ConfigValidationError('Fish timing/reward validation failed', { issues });
  }
  
  return true;
}

/**
 * Validate rarity distribution
 */
function validateRarityDistribution() {
  const rarityWeights = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };
  
  for (const fish of FISH_TYPES) {
    if (!rarityWeights.hasOwnProperty(fish.rarity)) {
      throw new ConfigValidationError(`Unknown rarity "${fish.rarity}" for fish ${fish.id}`);
    }
    rarityWeights[fish.rarity] += fish.weight;
  }
  
  // Warn if rarity distribution seems off
  const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
  const legendaryPercent = (rarityWeights.legendary / totalWeight) * 100;
  
  if (legendaryPercent > 5) {
    console.warn(`[FishingConfig] Warning: Legendary drop rate is ${legendaryPercent.toFixed(1)}% (>5% may be too generous)`);
  }
  
  if (legendaryPercent === 0) {
    console.warn('[FishingConfig] Warning: No legendary fish configured');
  }
  
  return { rarityWeights, totalWeight };
}

/**
 * Validate pity system configuration
 */
function validatePitySystem() {
  const { pity } = FISHING_CONFIG;
  
  if (!pity) {
    throw new ConfigValidationError('Pity system configuration is missing');
  }
  
  for (const [rarity, config] of Object.entries(pity)) {
    if (config.softPity >= config.hardPity) {
      throw new ConfigValidationError(
        `${rarity} pity: softPity (${config.softPity}) must be less than hardPity (${config.hardPity})`
      );
    }
    if (config.softPityBonus <= 0 || config.softPityBonus > 0.5) {
      throw new ConfigValidationError(
        `${rarity} pity: softPityBonus (${config.softPityBonus}) should be between 0 and 0.5`
      );
    }
  }
  
  return true;
}

/**
 * Validate daily limits make sense
 */
function validateDailyLimits() {
  const { dailyLimits } = FISHING_CONFIG;
  
  if (dailyLimits.pointsSoftCap && dailyLimits.pointsSoftCap >= dailyLimits.pointsFromTrades) {
    throw new ConfigValidationError(
      `pointsSoftCap (${dailyLimits.pointsSoftCap}) must be less than pointsFromTrades hard cap (${dailyLimits.pointsFromTrades})`
    );
  }
  
  if (dailyLimits.manualCasts < 100) {
    console.warn('[FishingConfig] Warning: manualCasts limit is very low:', dailyLimits.manualCasts);
  }
  
  return true;
}

/**
 * Validate areas have valid fish pools
 */
function validateAreas() {
  const fishIds = new Set(FISH_TYPES.map(f => f.id));
  
  for (const [areaId, area] of Object.entries(FISHING_AREAS)) {
    if (!area.fishPool || area.fishPool.length === 0) {
      throw new ConfigValidationError(`Area ${areaId} has no fish pool defined`);
    }
    
    const invalidFish = area.fishPool.filter(id => !fishIds.has(id));
    if (invalidFish.length > 0) {
      throw new ConfigValidationError(
        `Area ${areaId} references unknown fish: ${invalidFish.join(', ')}`
      );
    }
    
    if (area.rarityBonus < 0 || area.rarityBonus > 1) {
      console.warn(`[FishingConfig] Warning: Area ${areaId} has unusual rarityBonus: ${area.rarityBonus}`);
    }
  }
  
  return true;
}

/**
 * Validate rods configuration
 */
function validateRods() {
  let hasBasicRod = false;
  
  for (const [rodId, rod] of Object.entries(FISHING_RODS)) {
    if (rod.cost === 0) {
      hasBasicRod = true;
    }
    
    if (rod.timingBonus < 0) {
      throw new ConfigValidationError(`Rod ${rodId} has negative timingBonus`);
    }
    
    if (rod.rarityBonus < 0 || rod.rarityBonus > 1) {
      console.warn(`[FishingConfig] Warning: Rod ${rodId} has unusual rarityBonus: ${rod.rarityBonus}`);
    }
  }
  
  if (!hasBasicRod) {
    throw new ConfigValidationError('No free starting rod (cost: 0) defined');
  }
  
  return true;
}

/**
 * Validate trade options
 */
function validateTrades() {
  const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'collection'];
  const validRewardTypes = ['points', 'rollTickets', 'premiumTickets', 'mixed'];
  
  for (const trade of TRADE_OPTIONS) {
    if (!validRarities.includes(trade.requiredRarity)) {
      throw new ConfigValidationError(`Trade ${trade.id} has invalid requiredRarity: ${trade.requiredRarity}`);
    }
    
    if (!validRewardTypes.includes(trade.rewardType)) {
      throw new ConfigValidationError(`Trade ${trade.id} has invalid rewardType: ${trade.rewardType}`);
    }
    
    if (trade.requiredQuantity <= 0) {
      throw new ConfigValidationError(`Trade ${trade.id} has invalid requiredQuantity: ${trade.requiredQuantity}`);
    }
  }
  
  return true;
}

/**
 * Run all validations
 * Call this on application startup
 */
function validateFishingConfig() {
  console.log('[FishingConfig] Validating configuration...');
  
  try {
    validateFishWeights();
    validateFishTiming();
    const { rarityWeights } = validateRarityDistribution();
    validatePitySystem();
    validateDailyLimits();
    validateAreas();
    validateRods();
    validateTrades();
    
    console.log('[FishingConfig] ✓ All validations passed');
    console.log('[FishingConfig] Rarity weights:', rarityWeights);
    
    return true;
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      console.error('[FishingConfig] ✗ Validation failed:', err.message);
      if (err.details) {
        console.error('[FishingConfig] Details:', JSON.stringify(err.details, null, 2));
      }
    }
    throw err;
  }
}

module.exports = {
  validateFishingConfig,
  ConfigValidationError,
  // Export individual validators for testing
  validateFishWeights,
  validateFishTiming,
  validateRarityDistribution,
  validatePitySystem,
  validateDailyLimits,
  validateAreas,
  validateRods,
  validateTrades
};

