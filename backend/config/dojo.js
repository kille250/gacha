/**
 * Character Dojo Configuration
 * 
 * Centralized configuration for the idle training dojo game.
 * Characters assigned to training slots generate passive rewards.
 */

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
  slotCosts: [
    500,    // 4th slot
    1000,   // 5th slot
    2500,   // 6th slot
    5000,   // 7th slot
    10000,  // 8th slot
    20000,  // 9th slot
    50000   // 10th slot
  ],
  
  // Cost to increase accumulation cap (per +4 hours)
  capCosts: [
    2000,   // 12 hours
    5000,   // 16 hours
    10000,  // 20 hours
    25000   // 24 hours
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
 * Calculate points per hour for a character
 * @param {string} rarity - Character rarity
 * @param {Object} upgrades - User's dojo upgrades
 * @returns {number} - Points per hour
 */
function getBasePointsPerHour(rarity, upgrades = {}) {
  const baseRate = DOJO_RATES.baseRates[rarity] || 0;
  
  // Apply intensity bonus
  const intensityLevel = upgrades.intensity || 0;
  const intensityMultiplier = 1 + (intensityLevel * DOJO_CONFIG.intensityBonusPerLevel);
  
  // Apply mastery bonus if unlocked
  const hasMastery = upgrades.masteries?.[rarity] || false;
  const masteryMultiplier = hasMastery ? (1 + DOJO_CONFIG.masteryBonus) : 1;
  
  return baseRate * intensityMultiplier * masteryMultiplier;
}

/**
 * Calculate series synergy multiplier
 * @param {Array} characters - Array of characters in slots
 * @returns {Object} - { multiplier, synergies: [{series, count, bonus}] }
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
  
  return { multiplier: totalMultiplier, synergies };
}

/**
 * Calculate total rewards for accumulated time
 * @param {Array} characters - Characters in training (with rarity, series)
 * @param {number} hours - Hours of accumulated training
 * @param {Object} upgrades - User's dojo upgrades
 * @param {boolean} isActive - Whether this is an active claim (bonus applies)
 * @returns {Object} - { points, rollTickets, premiumTickets, breakdown }
 */
function calculateRewards(characters, hours, upgrades = {}, isActive = false) {
  if (!characters || characters.length === 0 || hours <= 0) {
    return { points: 0, rollTickets: 0, premiumTickets: 0, breakdown: [] };
  }
  
  const { multiplier: synergyMultiplier, synergies } = calculateSeriesSynergy(characters);
  const activeMultiplier = isActive ? DOJO_CONFIG.activeClaimMultiplier : 1;
  
  let totalPoints = 0;
  let totalRollTickets = 0;
  let totalPremiumTickets = 0;
  const breakdown = [];
  
  characters.forEach(char => {
    if (!char) return;
    
    const basePoints = getBasePointsPerHour(char.rarity, upgrades);
    const charPoints = basePoints * hours * synergyMultiplier * activeMultiplier;
    
    // Calculate ticket chances (per hour, accumulative)
    const rollChance = DOJO_RATES.ticketChances.rollTicket[char.rarity] || 0;
    const premiumChance = DOJO_RATES.ticketChances.premiumTicket[char.rarity] || 0;
    
    // Expected tickets based on hours (with some randomness)
    const expectedRollTickets = rollChance * hours;
    const expectedPremiumTickets = premiumChance * hours;
    
    // Apply randomness: use expected value + random variance
    const rollTickets = Math.floor(expectedRollTickets) + (Math.random() < (expectedRollTickets % 1) ? 1 : 0);
    const premiumTickets = Math.floor(expectedPremiumTickets) + (Math.random() < (expectedPremiumTickets % 1) ? 1 : 0);
    
    totalPoints += charPoints;
    totalRollTickets += rollTickets;
    totalPremiumTickets += premiumTickets;
    
    breakdown.push({
      characterId: char.id,
      characterName: char.name,
      rarity: char.rarity,
      series: char.series,
      basePoints,
      earnedPoints: Math.floor(charPoints),
      rollTickets,
      premiumTickets
    });
  });
  
  return {
    points: Math.floor(totalPoints),
    rollTickets: totalRollTickets,
    premiumTickets: totalPremiumTickets,
    breakdown,
    synergies,
    synergyMultiplier,
    activeMultiplier,
    hours
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

module.exports = {
  DOJO_RATES,
  DOJO_CONFIG,
  DOJO_UPGRADES,
  getBasePointsPerHour,
  calculateSeriesSynergy,
  calculateRewards,
  getUpgradeCost,
  getAvailableUpgrades
};

