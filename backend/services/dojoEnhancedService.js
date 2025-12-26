/**
 * Enhanced Dojo Service
 *
 * Handles the enhanced dojo features including:
 * - Character specializations
 * - Training breakthroughs
 * - Facility tier upgrades
 * - Training methods
 */

const {
  DOJO_SPECIALIZATIONS,
  DOJO_FACILITY_TIERS,
  DOJO_TRAINING_METHODS,
  DOJO_BREAKTHROUGH_CONFIG
} = require('../config/gameDesign');

// ===========================================
// SPECIALIZATION SYSTEM
// ===========================================

/**
 * Get available specializations for a character
 * @param {Object} character - Character object
 * @param {Object} userCharacter - UserCharacter junction with specialization data
 * @returns {Object} - Available specializations and current state
 */
function getAvailableSpecializations(character, userCharacter) {
  const currentSpec = userCharacter?.specialization || null;

  if (currentSpec) {
    // Already specialized - show current only
    return {
      hasSpecialization: true,
      current: DOJO_SPECIALIZATIONS[currentSpec],
      available: [],
      canChange: false // Specializations are permanent
    };
  }

  return {
    hasSpecialization: false,
    current: null,
    available: Object.values(DOJO_SPECIALIZATIONS),
    canChange: true
  };
}

/**
 * Apply specialization to a character
 * @param {Object} userCharacter - UserCharacter junction record
 * @param {string} specializationId - Specialization to apply
 * @returns {Object} - Result with success status and new bonuses
 */
function applySpecialization(userCharacter, specializationId) {
  if (userCharacter.specialization) {
    return {
      success: false,
      error: 'Character already has a specialization'
    };
  }

  const spec = DOJO_SPECIALIZATIONS[specializationId];
  if (!spec) {
    return {
      success: false,
      error: 'Invalid specialization'
    };
  }

  return {
    success: true,
    specialization: spec,
    message: `${spec.name} chosen! This is permanent.`
  };
}

/**
 * Calculate specialization bonuses for dojo rewards
 * @param {Array} characters - Characters in dojo with their specializations
 * @returns {Object} - Aggregated bonuses
 */
function calculateSpecializationBonuses(characters) {
  const bonuses = {
    pointsMultiplier: 1.0,
    ticketChanceMultiplier: 1.0,
    synergyBonus: 0,
    premiumCurrencyChance: 0,
    fishingPowerBonus: 0,
    gachaLuckBonus: 0
  };

  characters.forEach(char => {
    if (char.specialization) {
      const spec = DOJO_SPECIALIZATIONS[char.specialization];
      if (spec) {
        bonuses.pointsMultiplier *= spec.bonuses.dojoPointsMultiplier || 1.0;
        bonuses.ticketChanceMultiplier *= 1 + (spec.bonuses.ticketChanceBonus || 0);
        bonuses.synergyBonus += spec.bonuses.synergyBonus || 0;
        bonuses.fishingPowerBonus += spec.bonuses.fishingPowerBonus || 0;
        bonuses.gachaLuckBonus += spec.bonuses.gachaLuckBonus || 0;
        // Premium currency chance is additive
        if (spec.bonuses.currencyBonus) {
          bonuses.premiumCurrencyChance += 0.01; // 1% per spirit-path character
        }
      }
    }
  });

  return bonuses;
}

// ===========================================
// FACILITY TIER SYSTEM
// ===========================================

/**
 * Get current facility tier based on user's account level and unlocks
 * @param {Object} user - User object
 * @returns {Object} - Current tier and available upgrades
 */
function getFacilityTier(user) {
  const unlockedTiers = user.dojoFacilityTiers || ['basic'];
  const accountLevel = user.accountLevel || 1;

  // Find highest unlocked tier
  let currentTier = DOJO_FACILITY_TIERS.basic;
  for (const tierId of ['grandmasters_sanctum', 'masters_temple', 'warriors_hall', 'basic']) {
    if (unlockedTiers.includes(tierId)) {
      currentTier = DOJO_FACILITY_TIERS[tierId];
      break;
    }
  }

  // Find next available upgrade
  const tierOrder = ['basic', 'warriors_hall', 'masters_temple', 'grandmasters_sanctum'];
  const currentIndex = tierOrder.indexOf(currentTier.id);
  let nextTier = null;

  if (currentIndex < tierOrder.length - 1) {
    const nextTierId = tierOrder[currentIndex + 1];
    const potentialNext = DOJO_FACILITY_TIERS[nextTierId];

    if (accountLevel >= potentialNext.requiredLevel) {
      nextTier = potentialNext;
    }
  }

  return {
    current: currentTier,
    next: nextTier,
    features: currentTier.features,
    maxSlots: currentTier.maxSlots
  };
}

/**
 * Unlock a facility tier
 * @param {Object} user - User object
 * @param {string} tierId - Tier to unlock
 * @returns {Object} - Result with success status
 */
function unlockFacilityTier(user, tierId) {
  const tier = DOJO_FACILITY_TIERS[tierId];
  if (!tier) {
    return { success: false, error: 'Invalid facility tier' };
  }

  const accountLevel = user.accountLevel || 1;
  if (accountLevel < tier.requiredLevel) {
    return {
      success: false,
      error: `Requires account level ${tier.requiredLevel}`
    };
  }

  if (user.points < tier.unlockCost) {
    return {
      success: false,
      error: `Not enough points. Need ${tier.unlockCost}`
    };
  }

  const unlockedTiers = user.dojoFacilityTiers || ['basic'];
  if (unlockedTiers.includes(tierId)) {
    return { success: false, error: 'Tier already unlocked' };
  }

  return {
    success: true,
    tier: tier,
    cost: tier.unlockCost,
    newFeatures: tier.features
  };
}

// ===========================================
// TRAINING METHODS
// ===========================================

/**
 * Get available training methods based on facility tier
 * @param {Object} facilityTier - Current facility tier
 * @returns {Array} - Available training methods
 */
function getAvailableTrainingMethods(facilityTier) {
  const methods = [DOJO_TRAINING_METHODS.standard];

  if (facilityTier.features.includes('specializations')) {
    methods.push(DOJO_TRAINING_METHODS.meditation);
  }

  if (facilityTier.features.includes('synergy_training')) {
    methods.push(DOJO_TRAINING_METHODS.sparring);
  }

  if (facilityTier.features.includes('breakthroughs')) {
    methods.push(DOJO_TRAINING_METHODS.intense);
  }

  return methods;
}

/**
 * Apply training method modifiers to rewards
 * @param {Object} baseRewards - Base calculated rewards
 * @param {string} methodId - Training method being used
 * @param {number} hours - Hours trained
 * @returns {Object} - Modified rewards
 */
function applyTrainingMethodModifiers(baseRewards, methodId, hours) {
  const method = DOJO_TRAINING_METHODS[methodId] || DOJO_TRAINING_METHODS.standard;

  const modifiedRewards = {
    ...baseRewards,
    points: Math.floor(baseRewards.points * method.pointsMultiplier),
    xp: Math.floor((baseRewards.xp || 0) * method.xpMultiplier)
  };

  // Meditation has premium currency chance
  if (method.premiumCurrencyChance) {
    const premiumChance = method.premiumCurrencyChance * hours;
    if (Math.random() < premiumChance) {
      modifiedRewards.premiumCurrency = 1;
    }
  }

  modifiedRewards.trainingMethod = method;

  return modifiedRewards;
}

// ===========================================
// BREAKTHROUGH SYSTEM
// ===========================================

/**
 * Calculate breakthrough chance based on training
 * @param {Object} character - Character being trained
 * @param {number} hours - Hours trained
 * @param {Object} facilityTier - Current facility tier
 * @returns {number} - Breakthrough chance (0-1)
 */
function calculateBreakthroughChance(character, hours, facilityTier) {
  if (!facilityTier.features.includes('breakthroughs')) {
    return 0;
  }

  const baseChance = DOJO_BREAKTHROUGH_CONFIG.baseChancePerHour;
  const rarityMult = DOJO_BREAKTHROUGH_CONFIG.rarityMultipliers[character.rarity] || 1.0;

  // Higher level characters have better breakthrough chances
  const levelBonus = 1 + ((character.level || 1) - 1) * 0.1; // +10% per level

  return Math.min(0.5, baseChance * hours * rarityMult * levelBonus);
}

/**
 * Roll for and generate a breakthrough
 * @param {Object} character - Character that achieved breakthrough
 * @param {number} chance - Pre-calculated chance
 * @returns {Object|null} - Breakthrough result or null
 */
function rollBreakthrough(character, chance) {
  if (Math.random() > chance) {
    return null;
  }

  // Select breakthrough type based on weights
  const types = Object.entries(DOJO_BREAKTHROUGH_CONFIG.types);
  const totalWeight = types.reduce((sum, [, t]) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;

  for (const [typeId, type] of types) {
    random -= type.weight;
    if (random <= 0) {
      return {
        type: typeId,
        name: type.name,
        description: type.description,
        rewards: { ...type.rewards },
        character: {
          id: character.id,
          name: character.name
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Fallback to first type
  const [firstTypeId, firstType] = types[0];
  return {
    type: firstTypeId,
    name: firstType.name,
    description: firstType.description,
    rewards: { ...firstType.rewards },
    character: {
      id: character.id,
      name: character.name
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Process potential breakthroughs for all training characters
 * @param {Array} characters - Characters in training with their data
 * @param {number} hours - Hours since last claim
 * @param {Object} facilityTier - Current facility tier
 * @returns {Array} - Array of breakthrough results
 */
function processBreakthroughs(characters, hours, facilityTier) {
  const breakthroughs = [];

  characters.forEach(character => {
    const chance = calculateBreakthroughChance(character, hours, facilityTier);
    const breakthrough = rollBreakthrough(character, chance);

    if (breakthrough) {
      breakthroughs.push(breakthrough);
    }
  });

  return breakthroughs;
}

/**
 * Apply breakthrough rewards to user
 * @param {Object} user - User object
 * @param {Array} breakthroughs - Array of breakthrough results
 * @returns {Object} - Total rewards applied
 */
function applyBreakthroughRewards(user, breakthroughs) {
  const totals = {
    xpBonus: 0,
    pointsBonus: 0,
    rollTickets: 0,
    premiumTickets: 0
  };

  breakthroughs.forEach(bt => {
    if (bt.rewards.xpBonus) totals.xpBonus += bt.rewards.xpBonus;
    if (bt.rewards.pointsBonus) totals.pointsBonus += bt.rewards.pointsBonus;
    if (bt.rewards.rollTickets) totals.rollTickets += bt.rewards.rollTickets;
    if (bt.rewards.premiumTickets) totals.premiumTickets += bt.rewards.premiumTickets;
  });

  // Apply rewards
  user.points += totals.pointsBonus;
  user.rollTickets = (user.rollTickets || 0) + totals.rollTickets;
  user.premiumTickets = (user.premiumTickets || 0) + totals.premiumTickets;

  return totals;
}

// ===========================================
// ENHANCED REWARD CALCULATION
// ===========================================

/**
 * Calculate enhanced dojo rewards with all new systems
 * @param {Array} characters - Characters in training (with specializations)
 * @param {number} hours - Hours accumulated
 * @param {Object} upgrades - User's dojo upgrades
 * @param {Object} facilityTier - Current facility tier
 * @param {Object} options - Additional options (isActive, trainingMethod)
 * @returns {Object} - Full reward calculation
 */
function calculateEnhancedRewards(characters, hours, upgrades, facilityTier, options = {}) {
  const { DOJO_RATES, calculateSeriesSynergy, calculateCatchUpBonus } = require('../config/dojo');
  const { getLevelMultiplier } = require('../config/leveling');

  const { isActive = false, trainingMethod = 'standard' } = options;

  if (!characters || characters.length === 0 || hours <= 0) {
    return {
      points: 0,
      rollTickets: 0,
      premiumTickets: 0,
      breakthroughs: [],
      breakdown: []
    };
  }

  // Calculate base synergy
  const { multiplier: synergyMultiplier, synergies } = calculateSeriesSynergy(characters);

  // Calculate specialization bonuses
  const specBonuses = calculateSpecializationBonuses(characters);

  // Apply synergy bonus from spirit-path characters
  const enhancedSynergyMultiplier = synergyMultiplier * (1 + specBonuses.synergyBonus);

  // Catch-up bonus
  const catchUpBonus = calculateCatchUpBonus(characters.length);

  // Active bonus
  const { DOJO_CONFIG } = require('../config/dojo');
  const activeMultiplier = isActive ? DOJO_CONFIG.activeClaimMultiplier : 1;

  // Calculate per-character contributions
  let totalPointsPerHour = 0;
  let totalExpectedRollTickets = 0;
  let totalExpectedPremiumTickets = 0;
  const breakdown = [];

  characters.forEach(char => {
    const level = char.level || 1;
    const levelMult = getLevelMultiplier(level);

    const baseRate = DOJO_RATES.baseRates[char.rarity] || 0;

    // Apply all multipliers
    let charPoints = baseRate
      * levelMult
      * enhancedSynergyMultiplier
      * activeMultiplier
      * catchUpBonus.multiplier
      * specBonuses.pointsMultiplier;

    // Apply intensity upgrade
    const intensityLevel = upgrades.intensity || 0;
    const intensityMult = 1 + (intensityLevel * DOJO_CONFIG.intensityBonusPerLevel);
    charPoints *= intensityMult;

    // Apply mastery bonus
    if (upgrades.masteries?.[char.rarity]) {
      charPoints *= (1 + DOJO_CONFIG.masteryBonus);
    }

    totalPointsPerHour += charPoints;

    // Ticket chances (boosted by level and specialization ticketChanceMultiplier)
    const baseRollChance = DOJO_RATES.ticketChances.rollTicket[char.rarity] || 0;
    const basePremiumChance = DOJO_RATES.ticketChances.premiumTicket[char.rarity] || 0;

    totalExpectedRollTickets += baseRollChance * levelMult * specBonuses.ticketChanceMultiplier * hours;
    totalExpectedPremiumTickets += basePremiumChance * levelMult * specBonuses.ticketChanceMultiplier * hours;

    breakdown.push({
      characterId: char.id,
      characterName: char.name,
      rarity: char.rarity,
      level,
      specialization: char.specialization || null,
      pointsPerHour: Math.floor(charPoints)
    });
  });

  // Apply training method modifiers
  const method = DOJO_TRAINING_METHODS[trainingMethod] || DOJO_TRAINING_METHODS.standard;
  totalPointsPerHour *= method.pointsMultiplier;

  // Apply diminishing returns
  const { applyDiminishingReturns } = require('../config/dojo');
  const effectivePointsPerHour = applyDiminishingReturns(totalPointsPerHour);
  const totalPoints = Math.floor(effectivePointsPerHour * hours);

  // Calculate tickets (deterministic for preview, random for claims)
  let rollTickets, premiumTickets;
  if (isActive) {
    rollTickets = Math.floor(totalExpectedRollTickets) +
      (Math.random() < (totalExpectedRollTickets % 1) ? 1 : 0);
    premiumTickets = Math.floor(totalExpectedPremiumTickets) +
      (Math.random() < (totalExpectedPremiumTickets % 1) ? 1 : 0);
  } else {
    rollTickets = Math.round(totalExpectedRollTickets * 10) / 10;
    premiumTickets = Math.round(totalExpectedPremiumTickets * 10) / 10;
  }

  // Premium currency from meditation/specializations
  let premiumCurrency = 0;
  if (isActive) {
    const premiumChance = specBonuses.premiumCurrencyChance +
      (method.premiumCurrencyChance || 0);
    if (Math.random() < premiumChance * hours) {
      premiumCurrency = 1;
    }
  }

  // Process breakthroughs
  const breakthroughs = isActive
    ? processBreakthroughs(characters, hours, facilityTier)
    : [];

  return {
    points: totalPoints,
    rollTickets: isActive ? rollTickets : rollTickets,
    premiumTickets: isActive ? premiumTickets : premiumTickets,
    premiumCurrency,
    breakthroughs,
    breakdown,
    synergies,
    synergyMultiplier: enhancedSynergyMultiplier,
    specBonuses,
    catchUpBonus,
    activeMultiplier,
    trainingMethod: method,
    hours,
    rawPointsPerHour: Math.floor(totalPointsPerHour),
    effectivePointsPerHour: Math.floor(effectivePointsPerHour),
    diminishingReturnsApplied: effectivePointsPerHour < totalPointsPerHour
  };
}

// ===========================================
// USER BONUSES HELPER
// ===========================================

/**
 * Get aggregated specialization bonuses for a user's dojo characters
 * Used by other services (fishing, gacha) to apply cross-system bonuses
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Aggregated bonuses from all specialized characters
 */
async function getUserSpecializationBonuses(userId) {
  const { UserCharacter } = require('../models');

  // Get all characters with specializations in the dojo
  const userChars = await UserCharacter.findAll({
    where: {
      UserId: userId,
      inDojo: true
    },
    attributes: ['specialization']
  });

  // Calculate bonuses from characters in dojo
  const bonuses = calculateSpecializationBonuses(
    userChars.map(uc => ({ specialization: uc.specialization }))
  );

  return bonuses;
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  // Specialization
  getAvailableSpecializations,
  applySpecialization,
  calculateSpecializationBonuses,
  getUserSpecializationBonuses,

  // Facility
  getFacilityTier,
  unlockFacilityTier,

  // Training Methods
  getAvailableTrainingMethods,
  applyTrainingMethodModifiers,

  // Breakthroughs
  calculateBreakthroughChance,
  rollBreakthrough,
  processBreakthroughs,
  applyBreakthroughRewards,

  // Enhanced Rewards
  calculateEnhancedRewards
};
