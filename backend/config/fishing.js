/**
 * Fishing Minigame Configuration
 * 
 * Centralized configuration for fish types, trading options, and game settings.
 * Extracted from routes/fishing.js for better maintainability.
 */

// ===========================================
// GAME SETTINGS
// ===========================================

const FISHING_CONFIG = {
  // Rank required to unlock autofishing (top X users)
  autofishUnlockRank: 10,
  
  // Autofish cooldown in milliseconds (increased for better balance - ~40% efficiency of active)
  autofishCooldown: 6000,
  
  // Cast cooldown in milliseconds
  castCooldown: 5000,
  
  // Cost to cast (0 for free fishing)
  castCost: 0,
  
  // Network latency buffer for reaction time validation (ms)
  latencyBuffer: 200,
  
  // Minimum human reaction time (anti-cheat, prevents instant catches)
  minReactionTime: 80,
  
  // Session cleanup interval (ms)
  cleanupInterval: 15000,
  
  // Session expiry time (ms)
  sessionExpiry: 30000,
  
  // Trade timeout in ms (for stuck trade cleanup)
  tradeTimeout: 30000,
  
  // Rank cache TTL in ms
  rankCacheTTL: 30000,
  
  // Autofish success rates by rarity (nerfed for balance - ~35-40% of active fishing efficiency)
  autofishSuccessRates: {
    legendary: 0.10,  // Was: 0.20
    epic: 0.15,       // Was: 0.30
    rare: 0.25,       // Was: 0.45
    uncommon: 0.40,   // Was: 0.55
    common: 0.55      // Was: 0.65
  },
  
  // Perfect/Great catch thresholds - dynamic per rarity for better skill ceiling
  catchQuality: {
    // Default thresholds
    perfectThreshold: 0.25,  // 25% of window = Perfect (was 30%)
    greatThreshold: 0.55,    // 55% of window = Great (was 60%)
    perfectMultiplier: 2.0,  // Double fish for perfect
    greatMultiplier: 1.5,    // 50% bonus for great
    // Per-rarity overrides (harder fish = tighter windows)
    rarityThresholds: {
      legendary: { perfect: 0.15, great: 0.40 },  // 60-75ms for perfect on 400-500ms window
      epic: { perfect: 0.18, great: 0.45 },
      rare: { perfect: 0.22, great: 0.50 },
      uncommon: { perfect: 0.25, great: 0.55 },
      common: { perfect: 0.30, great: 0.60 }
    }
  },
  
  // Pity system - bad luck protection
  pity: {
    // Casts required for guaranteed rarity (soft pity starts earlier)
    legendary: {
      softPity: 80,     // Start increasing odds at 80 casts
      hardPity: 120,    // Guaranteed at 120 casts
      softPityBonus: 0.02  // +2% per cast after soft pity
    },
    epic: {
      softPity: 30,
      hardPity: 50,
      softPityBonus: 0.03
    }
  }
};

// ===========================================
// FISH TYPES
// ===========================================

const FISH_TYPES = [
  // Common fish (60% chance) - easy timing
  { id: 'sardine', name: 'Sardine', emoji: '🐟', rarity: 'common', minReward: 5, maxReward: 10, timingWindow: 2000, weight: 25 },
  { id: 'anchovy', name: 'Anchovy', emoji: '🐟', rarity: 'common', minReward: 5, maxReward: 12, timingWindow: 2000, weight: 20 },
  { id: 'herring', name: 'Herring', emoji: '🐟', rarity: 'common', minReward: 8, maxReward: 15, timingWindow: 1800, weight: 15 },
  
  // Uncommon fish (25% chance) - medium timing
  { id: 'bass', name: 'Sea Bass', emoji: '🐠', rarity: 'uncommon', minReward: 20, maxReward: 35, timingWindow: 1500, weight: 12 },
  { id: 'trout', name: 'Rainbow Trout', emoji: '🐠', rarity: 'uncommon', minReward: 25, maxReward: 40, timingWindow: 1400, weight: 8 },
  { id: 'mackerel', name: 'Mackerel', emoji: '🐠', rarity: 'uncommon', minReward: 30, maxReward: 50, timingWindow: 1300, weight: 5 },
  
  // Rare fish (10% chance) - harder timing
  { id: 'salmon', name: 'Salmon', emoji: '🐡', rarity: 'rare', minReward: 60, maxReward: 100, timingWindow: 1000, weight: 5 },
  { id: 'tuna', name: 'Bluefin Tuna', emoji: '🐡', rarity: 'rare', minReward: 80, maxReward: 120, timingWindow: 900, weight: 3 },
  { id: 'snapper', name: 'Red Snapper', emoji: '🐡', rarity: 'rare', minReward: 70, maxReward: 110, timingWindow: 950, weight: 2 },
  
  // Epic fish (4% chance) - very hard timing
  { id: 'swordfish', name: 'Swordfish', emoji: '🦈', rarity: 'epic', minReward: 150, maxReward: 250, timingWindow: 700, weight: 2.5 },
  { id: 'marlin', name: 'Blue Marlin', emoji: '🦈', rarity: 'epic', minReward: 200, maxReward: 300, timingWindow: 650, weight: 1 },
  { id: 'manta', name: 'Manta Ray', emoji: '🦈', rarity: 'epic', minReward: 180, maxReward: 280, timingWindow: 680, weight: 0.5 },
  
  // Legendary fish (1% chance) - extremely hard timing
  { id: 'whale', name: 'Golden Whale', emoji: '🐋', rarity: 'legendary', minReward: 500, maxReward: 800, timingWindow: 500, weight: 0.6 },
  { id: 'kraken', name: 'Baby Kraken', emoji: '🦑', rarity: 'legendary', minReward: 600, maxReward: 1000, timingWindow: 450, weight: 0.3 },
  { id: 'dragon', name: 'Sea Dragon', emoji: '🐉', rarity: 'legendary', minReward: 800, maxReward: 1500, timingWindow: 400, weight: 0.1 },
];

// Calculate total weight for probability
const TOTAL_WEIGHT = FISH_TYPES.reduce((sum, fish) => sum + fish.weight, 0);

/**
 * Calculate pity bonus for a given rarity
 * @param {Object} pityData - User's current pity counters
 * @param {string} rarity - 'legendary' or 'epic'
 * @returns {number} - Bonus weight to add
 */
function calculatePityBonus(pityData, rarity) {
  const pityConfig = FISHING_CONFIG.pity[rarity];
  if (!pityConfig || !pityData) return 0;
  
  const count = pityData[rarity] || 0;
  
  // Hard pity - guaranteed
  if (count >= pityConfig.hardPity) {
    return 1000; // Very high weight to guarantee
  }
  
  // Soft pity - increasing odds
  if (count >= pityConfig.softPity) {
    const overPity = count - pityConfig.softPity;
    return overPity * pityConfig.softPityBonus * 10; // Gradually increase weight
  }
  
  return 0;
}

/**
 * Select a random fish based on weights with optional pity system
 * @param {Object} pityData - Optional user's pity counters for bad luck protection
 * @returns {Object} - { fish, pityTriggered: boolean, resetPity: string[] }
 */
function selectRandomFish(pityData = null) {
  // Calculate adjusted weights with pity bonuses
  let adjustedWeights = FISH_TYPES.map(fish => ({
    ...fish,
    adjustedWeight: fish.weight
  }));
  
  let pityTriggered = false;
  let resetPity = [];
  
  if (pityData) {
    // Check for hard pity (guaranteed)
    const legendaryPity = FISHING_CONFIG.pity.legendary;
    const epicPity = FISHING_CONFIG.pity.epic;
    
    if (pityData.legendary >= legendaryPity.hardPity) {
      // Force legendary fish
      const legendaryFish = FISH_TYPES.filter(f => f.rarity === 'legendary');
      const fish = legendaryFish[Math.floor(Math.random() * legendaryFish.length)];
      return { 
        fish, 
        pityTriggered: true, 
        resetPity: ['legendary', 'epic']  // Reset both counters
      };
    }
    
    if (pityData.epic >= epicPity.hardPity) {
      // Force epic fish
      const epicFish = FISH_TYPES.filter(f => f.rarity === 'epic');
      const fish = epicFish[Math.floor(Math.random() * epicFish.length)];
      return { 
        fish, 
        pityTriggered: true, 
        resetPity: ['epic']  // Reset epic counter
      };
    }
    
    // Apply soft pity bonuses
    const legendaryBonus = calculatePityBonus(pityData, 'legendary');
    const epicBonus = calculatePityBonus(pityData, 'epic');
    
    adjustedWeights = adjustedWeights.map(fish => {
      let bonus = 0;
      if (fish.rarity === 'legendary') bonus = legendaryBonus;
      else if (fish.rarity === 'epic') bonus = epicBonus;
      
      return {
        ...fish,
        adjustedWeight: fish.weight + bonus
      };
    });
  }
  
  const totalAdjusted = adjustedWeights.reduce((sum, f) => sum + f.adjustedWeight, 0);
  const random = Math.random() * totalAdjusted;
  let cumulative = 0;
  
  for (const fish of adjustedWeights) {
    cumulative += fish.adjustedWeight;
    if (random < cumulative) {
      // Determine which pity counters to reset based on caught rarity
      if (fish.rarity === 'legendary') {
        resetPity = ['legendary', 'epic'];
      } else if (fish.rarity === 'epic') {
        resetPity = ['epic'];
      }
      
      return { 
        fish: FISH_TYPES.find(f => f.id === fish.id), 
        pityTriggered: false, 
        resetPity 
      };
    }
  }
  
  return { fish: FISH_TYPES[0], pityTriggered: false, resetPity: [] };
}

/**
 * Get catch quality thresholds for a specific rarity
 * @param {string} rarity - Fish rarity
 * @returns {Object} - { perfectThreshold, greatThreshold }
 */
function getCatchThresholds(rarity) {
  const overrides = FISHING_CONFIG.catchQuality.rarityThresholds?.[rarity];
  if (overrides) {
    return {
      perfectThreshold: overrides.perfect,
      greatThreshold: overrides.great,
      perfectMultiplier: FISHING_CONFIG.catchQuality.perfectMultiplier,
      greatMultiplier: FISHING_CONFIG.catchQuality.greatMultiplier
    };
  }
  return FISHING_CONFIG.catchQuality;
}

// ===========================================
// TRADING POST OPTIONS
// ===========================================

const TRADE_OPTIONS = [
  // === POINTS TRADES ===
  {
    id: 'common_to_points',
    name: 'Sell Common Fish',
    description: 'Trade common fish for points',
    requiredRarity: 'common',
    requiredQuantity: 5,
    rewardType: 'points',
    rewardAmount: 50,
    emoji: '🐟',
    category: 'points'
  },
  {
    id: 'uncommon_to_points',
    name: 'Sell Uncommon Fish',
    description: 'Trade uncommon fish for points',
    requiredRarity: 'uncommon',
    requiredQuantity: 3,
    rewardType: 'points',
    rewardAmount: 100,
    emoji: '🐠',
    category: 'points'
  },
  {
    id: 'rare_to_points',
    name: 'Sell Rare Fish',
    description: 'Trade rare fish for points',
    requiredRarity: 'rare',
    requiredQuantity: 2,
    rewardType: 'points',
    rewardAmount: 200,
    emoji: '🐡',
    category: 'points'
  },
  {
    id: 'epic_to_points',
    name: 'Sell Epic Fish',
    description: 'Trade epic fish for a large point bonus',
    requiredRarity: 'epic',
    requiredQuantity: 1,
    rewardType: 'points',
    rewardAmount: 250,  // Decreased from 350 for better rarity-value scaling
    emoji: '🦈',
    category: 'points'
  },
  {
    id: 'legendary_to_points',
    name: 'Sell Legendary Fish',
    description: 'Trade a legendary fish for a massive point bonus',
    requiredRarity: 'legendary',
    requiredQuantity: 1,
    rewardType: 'points',
    rewardAmount: 2500,  // Increased from 1000 for better rarity-value scaling
    emoji: '🐋',
    category: 'points'
  },
  
  // === TICKET TRADES ===
  {
    id: 'common_to_ticket',
    name: 'Roll Ticket',
    description: 'Trade common fish for a single roll ticket',
    requiredRarity: 'common',
    requiredQuantity: 10,
    rewardType: 'rollTickets',
    rewardAmount: 1,
    emoji: '🎟️',
    category: 'tickets'
  },
  {
    id: 'uncommon_to_tickets',
    name: 'Roll Ticket Pack',
    description: 'Trade uncommon fish for roll tickets',
    requiredRarity: 'uncommon',
    requiredQuantity: 5,
    rewardType: 'rollTickets',
    rewardAmount: 2,
    emoji: '🎟️',
    category: 'tickets'
  },
  {
    id: 'rare_to_premium',
    name: 'Premium Ticket',
    description: 'Trade rare fish for a premium ticket (better rates!)',
    requiredRarity: 'rare',
    requiredQuantity: 3,
    rewardType: 'premiumTickets',
    rewardAmount: 1,
    emoji: '🌟',
    category: 'tickets'
  },
  {
    id: 'epic_to_premium',
    name: 'Premium Ticket Pack',
    description: 'Trade epic fish for premium tickets',
    requiredRarity: 'epic',
    requiredQuantity: 2,
    rewardType: 'premiumTickets',
    rewardAmount: 2,
    emoji: '🌟',
    category: 'tickets'
  },
  {
    id: 'legendary_to_premium',
    name: 'Golden Ticket Pack',
    description: 'Trade a legendary fish for premium tickets',
    requiredRarity: 'legendary',
    requiredQuantity: 1,
    rewardType: 'premiumTickets',
    rewardAmount: 5,
    emoji: '✨',
    category: 'tickets'
  },
  
  // === SPECIAL TRADES ===
  {
    id: 'collection_bonus',
    name: 'Complete Collection',
    description: 'Trade one of each rarity for a mega bonus',
    requiredRarity: 'collection',
    requiredQuantity: 1, // 1 of each rarity
    rewardType: 'points',
    rewardAmount: 2500,
    emoji: '🏆',
    category: 'special'
  },
  {
    id: 'collection_tickets',
    name: 'Fisher\'s Treasure',
    description: 'Trade one of each rarity for tickets + premium tickets',
    requiredRarity: 'collection',
    requiredQuantity: 1,
    rewardType: 'mixed',
    rewardAmount: { rollTickets: 5, premiumTickets: 3 },
    emoji: '💎',
    category: 'special'
  }
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate fish totals by rarity from inventory
 * @param {Array} inventory - Array of FishInventory items
 * @returns {Object} - Totals object with rarity keys
 */
function calculateFishTotals(inventory) {
  const totals = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };
  
  inventory.forEach(item => {
    if (totals[item.rarity] !== undefined) {
      totals[item.rarity] += item.quantity;
    }
  });
  
  return totals;
}

module.exports = {
  FISHING_CONFIG,
  FISH_TYPES,
  TRADE_OPTIONS,
  selectRandomFish,
  calculateFishTotals,
  getCatchThresholds,
  calculatePityBonus
};