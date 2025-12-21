/**
 * Character Dojo Configuration
 * 
 * Centralized configuration for the idle training dojo game.
 * Characters assigned to training slots generate passive rewards.
 * 
 * Character levels (from duplicate cards) multiply the base rates.
 * Level multipliers are defined in config/leveling.js (single source of truth).
 * 
 * Balance considerations:
 * - Diminishing returns prevent runaway late-game scaling
 * - Daily/weekly caps ensure active play remains rewarding
 * - Synergy bonuses are capped to prevent stacking exploits
 */

const { getLevelMultiplier: getLevelMultiplierFromConfig } = require('./leveling');

// ===========================================
// BASE RATES (Points per Hour)
// ===========================================

const DOJO_RATES = {
  // Base points per hour by rarity
  baseRates: {
    common: 2,
    uncommon: 5,
    rare: 12,
    epic: 30,
    legendary: 75
  },
  
  // Ticket generation (per hour, chance-based)
  ticketChances: {
    // Chance to generate 1 roll ticket per hour
    rollTicket: {
      common: 0.01,      // 1% per hour
      uncommon: 0.02,    // 2% per hour
      rare: 0.05,        // 5% per hour
      epic: 0.10,        // 10% per hour
      legendary: 0.20    // 20% per hour
    },
    // Chance to generate 1 premium ticket per hour
    premiumTicket: {
      common: 0,
      uncommon: 0,
      rare: 0.01,        // 1% per hour
      epic: 0.03,        // 3% per hour
      legendary: 0.08    // 8% per hour
    }
  }
};

// ===========================================
// BALANCE CAPS & DIMINISHING RETURNS
// ===========================================

const DOJO_BALANCE = {
  // Diminishing returns brackets for hourly income
  // Softer curve - rewards late-game investment without runaway scaling
  incomeBrackets: [
    { threshold: 0,    efficiency: 1.0 },   // 0-200 pts/h: 100%
    { threshold: 200,  efficiency: 0.85 },  // 200-600: 85%
    { threshold: 600,  efficiency: 0.70 },  // 600-1500: 70%
    { threshold: 1500, efficiency: 0.50 },  // 1500-3000: 50%
    { threshold: 3000, efficiency: 0.35 },  // 3000+: 35%
  ],
  
  // Daily caps (reset at midnight UTC)
  dailyCaps: {
    points: 15000,          // Max 15k points/day from Dojo
    rollTickets: 20,        // Max 20 roll tickets/day
    premiumTickets: 5       // Max 5 premium tickets/day
  },
  
  // Maximum synergy multiplier (prevents stacking)
  maxSynergyMultiplier: 1.5  // Cap at +50%
};

// ===========================================
// GAME SETTINGS
// ===========================================

const DOJO_CONFIG = {
  // Starting slots and maximum
  defaultSlots: 3,
  maxSlots: 10,
  
  // Offline accumulation cap (hours)
  defaultCapHours: 8,
  maxCapHours: 24,
  
  // Active claim bonus multiplier
  activeClaimMultiplier: 1.5,
  
  // Minimum claim interval (prevent spam, in seconds)
  minClaimInterval: 3,
  
  // Series synergy bonuses
  seriesSynergy: {
    2: 1.20,  // 2 chars from same series: +20%
    3: 1.50,  // 3 chars: +50%
    4: 2.00,  // 4+ chars: +100%
  },
  
  // Intensity upgrade bonus per level (25% per level)
  intensityBonusPerLevel: 0.25,
  maxIntensityLevel: 5,
  
  // Mastery upgrade bonus per rarity (50% for that rarity)
  masteryBonus: 0.50
};

// ===========================================
// UPGRADE COSTS
// ===========================================

const DOJO_UPGRADES = {
  // Cost to unlock additional slots
  // Smoother progression curve for better mid-game pacing
  // Old total: 89,000 | New total: 46,500 (more accessible)
  slotCosts: [
    500,    // 4th slot  - Early unlock, quick win
    1000,   // 5th slot  - Still accessible
    2000,   // 6th slot  - Reasonable mid-game
    4000,   // 7th slot  - Commitment required
    7000,   // 8th slot  - Serious investment
    12000,  // 9th slot  - Late-game goal
    20000   // 10th slot - Endgame achievement
  ],
  
  // Cost to increase accumulation cap (per +4 hours)
  // Reduced costs to encourage offline play variety
  capCosts: [
    1500,   // 12 hours - Accessible early
    3500,   // 16 hours - Mid-game
    7000,   // 20 hours - Late mid-game
    15000   // 24 hours - Endgame convenience
  ],
  
  // Cost for intensity upgrades (per level)
  intensityCosts: [
    1000,   // Level 1: +25%
    2500,   // Level 2: +50%
    5000,   // Level 3: +75%
    10000,  // Level 4: +100%
    25000   // Level 5: +125%
  ],
  
  // Cost for rarity mastery (one-time per rarity)
  masteryCosts: {
    common: 1000,
    uncommon: 2500,
    rare: 5000,
    epic: 15000,
    legendary: 50000
  }
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate level multiplier for a character
 * Delegates to centralized leveling config for consistency
 * @param {number} level - Character level (1-5)
 * @returns {number} - Multiplier (1.0 to 1.5)
 */
function getLevelMultiplier(level) {
  return getLevelMultiplierFromConfig(level);
}

/**
 * Apply diminishing returns to raw points per hour
 * Prevents runaway scaling in late game
 * @param {number} rawPointsPerHour - Unmodified points per hour
 * @returns {number} - Adjusted points with diminishing returns
 */
function applyDiminishingReturns(rawPointsPerHour) {
  const brackets = DOJO_BALANCE.incomeBrackets;
  let effectivePoints = 0;
  let remaining = rawPointsPerHour;
  
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const nextThreshold = brackets[i + 1]?.threshold || Infinity;
    const bracketSize = nextThreshold - bracket.threshold;
    
    const pointsInBracket = Math.min(remaining, bracketSize);
    effectivePoints += pointsInBracket * bracket.efficiency;
    remaining -= pointsInBracket;
    
    if (remaining <= 0) break;
  }
  
  return effectivePoints;
}

/**
 * Calculate points per hour for a character
 * @param {string} rarity - Character rarity
 * @param {Object} upgrades - User's dojo upgrades
 * @param {number} level - Character level (1-5, default 1)
 * @returns {number} - Points per hour
 */
function getBasePointsPerHour(rarity, upgrades = {}, level = 1) {
  const baseRate = DOJO_RATES.baseRates[rarity] || 0;
  
  // Apply character level bonus
  const levelMultiplier = getLevelMultiplier(level);
  
  // Apply intensity bonus
  const intensityLevel = upgrades.intensity || 0;
  const intensityMultiplier = 1 + (intensityLevel * DOJO_CONFIG.intensityBonusPerLevel);
  
  // Apply mastery bonus if unlocked
  const hasMastery = upgrades.masteries?.[rarity] || false;
  const masteryMultiplier = hasMastery ? (1 + DOJO_CONFIG.masteryBonus) : 1;
  
  return baseRate * levelMultiplier * intensityMultiplier * masteryMultiplier;
}

/**
 * Calculate series synergy multiplier
 * Capped at DOJO_BALANCE.maxSynergyMultiplier to prevent stacking exploits
 * @param {Array} characters - Array of characters in slots
 * @returns {Object} - { multiplier, synergies: [{series, count, bonus}], wasCapped }
 */
function calculateSeriesSynergy(characters) {
  // Count characters per series
  const seriesCounts = {};
  characters.forEach(char => {
    if (char && char.series) {
      seriesCounts[char.series] = (seriesCounts[char.series] || 0) + 1;
    }
  });
  
  // Calculate bonuses
  const synergies = [];
  let totalMultiplier = 1;
  
  Object.entries(seriesCounts).forEach(([series, count]) => {
    if (count >= 2) {
      // Find highest applicable synergy
      let bonus = 1;
      for (const [threshold, mult] of Object.entries(DOJO_CONFIG.seriesSynergy).sort((a, b) => b[0] - a[0])) {
        if (count >= parseInt(threshold)) {
          bonus = mult;
          break;
        }
      }
      
      synergies.push({ series, count, bonus });
      // Synergy is additive, not multiplicative
      totalMultiplier += (bonus - 1);
    }
  });
  
  // Apply cap to prevent excessive stacking
  const maxMultiplier = DOJO_BALANCE.maxSynergyMultiplier;
  const wasCapped = totalMultiplier > maxMultiplier;
  const finalMultiplier = Math.min(totalMultiplier, maxMultiplier);
  
  return { 
    multiplier: finalMultiplier, 
    synergies,
    wasCapped,
    uncappedMultiplier: totalMultiplier
  };
}

/**
 * Calculate total rewards for accumulated time
 * 
 * Preview mode (isActive=false): Deterministic calculation for UI display
 * Claim mode (isActive=true): Applies randomness to ticket drops and active bonus
 * 
 * @param {Array} characters - Characters in training (with rarity, series, level)
 * @param {number} hours - Hours of accumulated training
 * @param {Object} upgrades - User's dojo upgrades
 * @param {boolean} isActive - Whether this is an active claim (bonus applies, randomness enabled)
 * @returns {Object} - { points, rollTickets, premiumTickets, breakdown, ... }
 */
function calculateRewards(characters, hours, upgrades = {}, isActive = false) {
  if (!characters || characters.length === 0 || hours <= 0) {
    return { 
      points: 0, 
      rollTickets: 0, 
      premiumTickets: 0, 
      breakdown: [],
      rawPointsPerHour: 0,
      effectivePointsPerHour: 0,
      diminishingReturnsApplied: false
    };
  }
  
  const { multiplier: synergyMultiplier, synergies, wasCapped: synergyCapped } = calculateSeriesSynergy(characters);
  const activeMultiplier = isActive ? DOJO_CONFIG.activeClaimMultiplier : 1;
  
  let rawPointsPerHour = 0;
  let totalExpectedRollTickets = 0;
  let totalExpectedPremiumTickets = 0;
  const breakdown = [];
  
  // First pass: Calculate raw totals per hour
  characters.forEach(char => {
    if (!char) return;
    
    const charLevel = char.level || 1;
    const levelMultiplier = getLevelMultiplier(charLevel);
    
    const basePoints = getBasePointsPerHour(char.rarity, upgrades, charLevel);
    const charPointsPerHour = basePoints * synergyMultiplier * activeMultiplier;
    
    rawPointsPerHour += charPointsPerHour;
    
    // Calculate ticket chances (per hour)
    // Level also boosts ticket chances slightly
    const rollChance = (DOJO_RATES.ticketChances.rollTicket[char.rarity] || 0) * levelMultiplier;
    const premiumChance = (DOJO_RATES.ticketChances.premiumTicket[char.rarity] || 0) * levelMultiplier;
    
    totalExpectedRollTickets += rollChance * hours;
    totalExpectedPremiumTickets += premiumChance * hours;
    
    breakdown.push({
      characterId: char.id,
      characterName: char.name,
      rarity: char.rarity,
      series: char.series,
      level: charLevel,
      levelMultiplier,
      basePointsPerHour: basePoints,
      charPointsPerHour: Math.floor(charPointsPerHour)
    });
  });
  
  // Apply diminishing returns to total points per hour
  const effectivePointsPerHour = applyDiminishingReturns(rawPointsPerHour);
  const diminishingReturnsApplied = effectivePointsPerHour < rawPointsPerHour;
  
  // Calculate total points with diminishing returns
  const totalPoints = effectivePointsPerHour * hours;
  
  // Ticket calculation: Deterministic for preview, randomized for claims
  let finalRollTickets, finalPremiumTickets;
  
  if (isActive) {
    // Active claim: Apply randomness to fractional tickets
    finalRollTickets = Math.floor(totalExpectedRollTickets) + 
      (Math.random() < (totalExpectedRollTickets % 1) ? 1 : 0);
    finalPremiumTickets = Math.floor(totalExpectedPremiumTickets) + 
      (Math.random() < (totalExpectedPremiumTickets % 1) ? 1 : 0);
  } else {
    // Preview: Show expected value (deterministic)
    finalRollTickets = Math.round(totalExpectedRollTickets * 10) / 10;
    finalPremiumTickets = Math.round(totalExpectedPremiumTickets * 10) / 10;
  }
  
  // Update breakdown with earned points (after diminishing returns)
  const diminishingRatio = rawPointsPerHour > 0 ? effectivePointsPerHour / rawPointsPerHour : 1;
  breakdown.forEach(entry => {
    entry.earnedPoints = Math.floor(entry.charPointsPerHour * hours * diminishingRatio);
  });
  
  return {
    points: Math.floor(totalPoints),
    rollTickets: isActive ? finalRollTickets : finalRollTickets,
    premiumTickets: isActive ? finalPremiumTickets : finalPremiumTickets,
    breakdown,
    synergies,
    synergyMultiplier,
    synergyCapped,
    activeMultiplier,
    hours,
    // Debugging/transparency info
    rawPointsPerHour: Math.floor(rawPointsPerHour),
    effectivePointsPerHour: Math.floor(effectivePointsPerHour),
    diminishingReturnsApplied,
    expectedTickets: {
      roll: Math.round(totalExpectedRollTickets * 100) / 100,
      premium: Math.round(totalExpectedPremiumTickets * 100) / 100
    }
  };
}

/**
 * Get upgrade cost for a specific upgrade
 * @param {string} upgradeType - 'slot', 'cap', 'intensity', or 'mastery'
 * @param {Object} currentUpgrades - Current upgrade levels
 * @param {string} masteryRarity - For mastery upgrades, which rarity
 * @returns {number|null} - Cost in points, or null if maxed
 */
function getUpgradeCost(upgradeType, currentUpgrades, masteryRarity = null) {
  switch (upgradeType) {
    case 'slot': {
      const currentSlots = currentUpgrades.slots || DOJO_CONFIG.defaultSlots;
      const nextSlotIndex = currentSlots - DOJO_CONFIG.defaultSlots;
      if (nextSlotIndex >= DOJO_UPGRADES.slotCosts.length) return null;
      return DOJO_UPGRADES.slotCosts[nextSlotIndex];
    }
    
    case 'cap': {
      const currentCap = currentUpgrades.capHours || DOJO_CONFIG.defaultCapHours;
      const upgradeIndex = (currentCap - DOJO_CONFIG.defaultCapHours) / 4;
      if (upgradeIndex >= DOJO_UPGRADES.capCosts.length) return null;
      return DOJO_UPGRADES.capCosts[upgradeIndex];
    }
    
    case 'intensity': {
      const currentLevel = currentUpgrades.intensity || 0;
      if (currentLevel >= DOJO_CONFIG.maxIntensityLevel) return null;
      return DOJO_UPGRADES.intensityCosts[currentLevel];
    }
    
    case 'mastery': {
      if (!masteryRarity) return null;
      if (currentUpgrades.masteries?.[masteryRarity]) return null; // Already owned
      return DOJO_UPGRADES.masteryCosts[masteryRarity] || null;
    }
    
    default:
      return null;
  }
}

/**
 * Get all available upgrades with their costs
 * @param {Object} currentUpgrades - Current upgrade levels
 * @returns {Array} - Available upgrades
 */
function getAvailableUpgrades(currentUpgrades) {
  const upgrades = [];
  
  // Slot upgrade
  const slotCost = getUpgradeCost('slot', currentUpgrades);
  if (slotCost !== null) {
    upgrades.push({
      type: 'slot',
      name: 'Extra Training Slot',
      description: `Unlock slot ${(currentUpgrades.slots || DOJO_CONFIG.defaultSlots) + 1}`,
      cost: slotCost,
      icon: '➕'
    });
  }
  
  // Cap upgrade
  const capCost = getUpgradeCost('cap', currentUpgrades);
  if (capCost !== null) {
    const newCap = (currentUpgrades.capHours || DOJO_CONFIG.defaultCapHours) + 4;
    upgrades.push({
      type: 'cap',
      name: 'Extended Storage',
      description: `Increase offline cap to ${newCap} hours`,
      cost: capCost,
      icon: '⏰'
    });
  }
  
  // Intensity upgrade
  const intensityCost = getUpgradeCost('intensity', currentUpgrades);
  if (intensityCost !== null) {
    const nextLevel = (currentUpgrades.intensity || 0) + 1;
    const totalBonus = nextLevel * DOJO_CONFIG.intensityBonusPerLevel * 100;
    upgrades.push({
      type: 'intensity',
      name: 'Training Intensity',
      description: `+${totalBonus}% base rates (Level ${nextLevel})`,
      cost: intensityCost,
      icon: '💪'
    });
  }
  
  // Mastery upgrades
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  rarities.forEach(rarity => {
    const masteryCost = getUpgradeCost('mastery', currentUpgrades, rarity);
    if (masteryCost !== null) {
      upgrades.push({
        type: 'mastery',
        rarity,
        name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Mastery`,
        description: `+50% rate for ${rarity} characters`,
        cost: masteryCost,
        icon: '🎓'
      });
    }
  });
  
  return upgrades;
}

// ===========================================
// CONFIG VALIDATION (runs at server start)
// ===========================================

/**
 * Validates dojo configuration for consistency
 * Throws an error if configuration is invalid
 */
function validateDojoConfig() {
  // Check that all rarities have base rates and ticket chances
  const baseRarities = Object.keys(DOJO_RATES.baseRates);
  const rollTicketRarities = Object.keys(DOJO_RATES.ticketChances.rollTicket);
  const premiumTicketRarities = Object.keys(DOJO_RATES.ticketChances.premiumTicket);
  
  const missingRollRarities = baseRarities.filter(r => !rollTicketRarities.includes(r));
  const missingPremiumRarities = baseRarities.filter(r => !premiumTicketRarities.includes(r));
  
  if (missingRollRarities.length > 0) {
    console.warn(`⚠️  Dojo Config: Missing roll ticket chances for: ${missingRollRarities.join(', ')}`);
  }
  if (missingPremiumRarities.length > 0) {
    console.warn(`⚠️  Dojo Config: Missing premium ticket chances for: ${missingPremiumRarities.join(', ')}`);
  }
  
  // Validate income brackets are sorted ascending
  const thresholds = DOJO_BALANCE.incomeBrackets.map(b => b.threshold);
  const isSorted = thresholds.every((t, i) => i === 0 || t > thresholds[i - 1]);
  if (!isSorted) {
    throw new Error('Dojo Config Error: Income brackets must be sorted in ascending order by threshold');
  }
  
  // Validate efficiency values are between 0 and 1
  const invalidEfficiencies = DOJO_BALANCE.incomeBrackets.filter(b => b.efficiency < 0 || b.efficiency > 1);
  if (invalidEfficiencies.length > 0) {
    throw new Error('Dojo Config Error: Efficiency values must be between 0 and 1');
  }
  
  // Validate slot costs match expected slot count
  const expectedSlotUpgrades = DOJO_CONFIG.maxSlots - DOJO_CONFIG.defaultSlots;
  if (DOJO_UPGRADES.slotCosts.length !== expectedSlotUpgrades) {
    console.warn(`⚠️  Dojo Config: slotCosts has ${DOJO_UPGRADES.slotCosts.length} entries but expected ${expectedSlotUpgrades} (maxSlots - defaultSlots)`);
  }
  
  // Validate intensity costs match max intensity level
  if (DOJO_UPGRADES.intensityCosts.length !== DOJO_CONFIG.maxIntensityLevel) {
    console.warn(`⚠️  Dojo Config: intensityCosts has ${DOJO_UPGRADES.intensityCosts.length} entries but maxIntensityLevel is ${DOJO_CONFIG.maxIntensityLevel}`);
  }
  
  // Validate synergy thresholds are valid
  const synergyThresholds = Object.keys(DOJO_CONFIG.seriesSynergy).map(Number);
  if (synergyThresholds.some(t => t < 2)) {
    throw new Error('Dojo Config Error: Synergy thresholds must be >= 2 (minimum for series bonus)');
  }
  
  console.log('✅ Dojo configuration validated successfully');
}

// Run validation when module is loaded
validateDojoConfig();

module.exports = {
  DOJO_RATES,
  DOJO_CONFIG,
  DOJO_UPGRADES,
  DOJO_BALANCE,
  getLevelMultiplier,
  getBasePointsPerHour,
  calculateSeriesSynergy,
  calculateRewards,
  getUpgradeCost,
  getAvailableUpgrades,
  applyDiminishingReturns,
  validateDojoConfig  // Export for testing
};

