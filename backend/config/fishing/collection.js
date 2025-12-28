/**
 * Fish Collection/Codex System
 * 
 * Tracks player progress towards catching all fish species
 * and provides permanent bonuses based on collection milestones.
 */

// Base star thresholds - how many of a fish type to catch for each star
const BASE_STAR_THRESHOLDS = [1, 10, 50, 100, 500];

// Rarity multipliers for star thresholds (rarer fish = easier to max)
const RARITY_THRESHOLD_MULTIPLIERS = {
  common: 1.0,      // Full thresholds: [1, 10, 50, 100, 500]
  uncommon: 0.6,    // Reduced: [1, 6, 30, 60, 300]
  rare: 0.3,        // Reduced: [1, 3, 15, 30, 150]
  epic: 0.15,       // Reduced: [1, 2, 8, 15, 75]
  legendary: 0.06   // Reduced: [1, 1, 3, 6, 30]
};

/**
 * Get star thresholds for a specific rarity
 * Rarer fish have reduced thresholds since they're harder to catch
 * @param {string} rarity - Fish rarity
 * @returns {Array} - Star thresholds for this rarity
 */
function getStarThresholdsForRarity(rarity) {
  const multiplier = RARITY_THRESHOLD_MULTIPLIERS[rarity] || 1.0;
  return BASE_STAR_THRESHOLDS.map(t => Math.max(1, Math.floor(t * multiplier)));
}

// Default thresholds for backwards compatibility
const STAR_THRESHOLDS = BASE_STAR_THRESHOLDS;

// Rewards for reaching star milestones on a single fish
const STAR_REWARDS = {
  1: { 
    points: 25,
    description: 'First catch!'
  },
  2: { 
    points: 75,
    description: 'Familiar catch'
  },
  3: { 
    points: 150,
    rollTickets: 1,
    description: 'Expert at catching this fish'
  },
  4: { 
    points: 300,
    rollTickets: 2,
    description: 'Master of this species'
  },
  5: { 
    points: 500,
    premiumTickets: 1,
    permanentBonus: true,
    description: 'Ultimate mastery achieved!'
  }
};

// Bonuses for completing rarity tiers (all fish of a rarity at 5 stars)
const RARITY_COMPLETION_BONUSES = {
  common: {
    timingBonus: 10,
    description: 'Common fish mastery: +10ms timing window'
  },
  uncommon: {
    timingBonus: 15,
    rarityBonus: 0.01,
    description: 'Uncommon fish mastery: +15ms timing, +1% rare chance'
  },
  rare: {
    timingBonus: 20,
    rarityBonus: 0.02,
    autofishBonus: 5,
    description: 'Rare fish mastery: +20ms timing, +2% rare chance, +5 autofish'
  },
  epic: {
    timingBonus: 25,
    rarityBonus: 0.03,
    autofishBonus: 10,
    description: 'Epic fish mastery: +25ms timing, +3% rare chance, +10 autofish'
  },
  legendary: {
    timingBonus: 50,
    rarityBonus: 0.05,
    autofishBonus: 25,
    pityBonus: 5,  // Pity counter fills 5 faster
    description: 'Legendary fish mastery: Maximum bonuses!'
  }
};

// Collection milestones (total unique fish caught)
// BALANCE UPDATE: Fixed milestone counts to match actual fish species count (15 total)
// Added intermediate milestone at 12 for smoother progression
const COLLECTION_MILESTONES = {
  5: {
    name: 'Budding Collector',
    reward: { points: 500 },
    description: 'Catch 5 different fish species'
  },
  8: {
    name: 'Fish Enthusiast',
    reward: { points: 1000, rollTickets: 2 },
    description: 'Catch 8 different fish species'
  },
  12: {
    name: 'Diverse Angler',
    reward: { points: 3000, rollTickets: 4, premiumTickets: 1 },
    description: 'Catch 12 different fish species'
  },
  15: {
    name: 'Complete Collector',
    // Adjusted rewards for full collection (all 15 species)
    reward: {
      points: 20000,
      rollTickets: 10,
      premiumTickets: 5,
      permanentBonus: { rarityBonus: 0.05 }
    },
    description: 'Catch all fish species!'
  }
};

// Total star milestones (sum of all stars across all fish)
const TOTAL_STAR_MILESTONES = {
  10: { reward: { points: 1000 } },
  25: { reward: { points: 3000, rollTickets: 2 } },
  50: { reward: { points: 10000, rollTickets: 5, premiumTickets: 1 } },
  75: { reward: { points: 25000, premiumTickets: 3 } },
  80: { 
    reward: { 
      points: 100000, 
      premiumTickets: 10,
      permanentBonus: { 
        timingBonus: 100, 
        rarityBonus: 0.10, 
        autofishBonus: 50 
      }
    },
    description: 'Maximum star mastery - all fish at 5 stars!'
  }
};

/**
 * Calculate star level for a fish based on quantity caught
 * @param {number} quantity - How many of this fish have been caught
 * @param {string} rarity - Fish rarity (optional, for rarity-based thresholds)
 * @returns {number} - Star level (0-5)
 */
function calculateStarLevel(quantity, rarity = null) {
  const thresholds = rarity ? getStarThresholdsForRarity(rarity) : STAR_THRESHOLDS;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (quantity >= thresholds[i]) {
      return i + 1;
    }
  }
  return 0;
}

/**
 * Get progress to next star
 * @param {number} quantity - Current quantity
 * @param {number} currentStars - Current star level
 * @param {string} rarity - Fish rarity (optional, for rarity-based thresholds)
 * @returns {Object} - { current, needed, percent }
 */
function getNextStarProgress(quantity, currentStars, rarity = null) {
  const thresholds = rarity ? getStarThresholdsForRarity(rarity) : STAR_THRESHOLDS;
  
  if (currentStars >= 5) {
    return { current: quantity, needed: thresholds[4], percent: 100, maxed: true };
  }
  
  const nextThreshold = thresholds[currentStars];
  const prevThreshold = currentStars > 0 ? thresholds[currentStars - 1] : 0;
  const progressInTier = quantity - prevThreshold;
  const tierSize = nextThreshold - prevThreshold;
  
  return {
    current: quantity,
    needed: nextThreshold,
    progress: progressInTier,
    tierSize: tierSize,
    percent: Math.min(100, (progressInTier / tierSize) * 100),
    maxed: false
  };
}

/**
 * Build collection data from fish stats
 * @param {Object} fishCaught - Map of fishId -> quantity from user stats
 * @param {Array} fishTypes - Array of all fish type definitions
 * @returns {Object} - Detailed collection data
 */
function buildCollectionData(fishCaught, fishTypes) {
  const collection = {
    fish: {},
    byRarity: {
      common: { caught: 0, total: 0, stars: 0, maxStars: 0 },
      uncommon: { caught: 0, total: 0, stars: 0, maxStars: 0 },
      rare: { caught: 0, total: 0, stars: 0, maxStars: 0 },
      epic: { caught: 0, total: 0, stars: 0, maxStars: 0 },
      legendary: { caught: 0, total: 0, stars: 0, maxStars: 0 }
    },
    totalUnique: 0,
    totalStars: 0,
    maxPossibleStars: fishTypes.length * 5,
    completionPercent: 0
  };

  // Process each fish type
  for (const fish of fishTypes) {
    const quantity = fishCaught[fish.id] || 0;
    const stars = calculateStarLevel(quantity, fish.rarity);
    
    collection.fish[fish.id] = {
      id: fish.id,
      name: fish.name,
      emoji: fish.emoji,
      rarity: fish.rarity,
      quantity: quantity,
      stars: stars,
      caught: quantity > 0,
      progress: getNextStarProgress(quantity, stars, fish.rarity),
      thresholds: getStarThresholdsForRarity(fish.rarity)
    };

    // Update rarity totals
    if (collection.byRarity[fish.rarity]) {
      collection.byRarity[fish.rarity].total++;
      collection.byRarity[fish.rarity].maxStars += 5;
      if (quantity > 0) {
        collection.byRarity[fish.rarity].caught++;
        collection.byRarity[fish.rarity].stars += stars;
      }
    }

    if (quantity > 0) {
      collection.totalUnique++;
    }
    collection.totalStars += stars;
  }

  // Calculate completion percentage
  collection.completionPercent = Math.round(
    (collection.totalStars / collection.maxPossibleStars) * 100
  );

  // Check rarity completion bonuses
  collection.rarityBonuses = {};
  for (const [rarity, data] of Object.entries(collection.byRarity)) {
    if (data.stars === data.maxStars && data.total > 0) {
      collection.rarityBonuses[rarity] = RARITY_COMPLETION_BONUSES[rarity];
    }
  }

  return collection;
}

/**
 * Check for newly earned milestones
 * @param {Object} oldCollection - Previous collection state
 * @param {Object} newCollection - New collection state
 * @returns {Array} - Array of newly earned milestones with rewards
 */
function checkNewMilestones(oldCollection, newCollection) {
  const newMilestones = [];

  // Check unique fish milestones
  for (const [threshold, milestone] of Object.entries(COLLECTION_MILESTONES)) {
    const thresholdNum = parseInt(threshold);
    if (newCollection.totalUnique >= thresholdNum && 
        (oldCollection?.totalUnique || 0) < thresholdNum) {
      newMilestones.push({
        type: 'collection',
        threshold: thresholdNum,
        ...milestone
      });
    }
  }

  // Check total star milestones
  for (const [threshold, milestone] of Object.entries(TOTAL_STAR_MILESTONES)) {
    const thresholdNum = parseInt(threshold);
    if (newCollection.totalStars >= thresholdNum && 
        (oldCollection?.totalStars || 0) < thresholdNum) {
      newMilestones.push({
        type: 'stars',
        threshold: thresholdNum,
        ...milestone
      });
    }
  }

  return newMilestones;
}

/**
 * Check for new star rewards on a specific fish
 * @param {string} fishId - Fish ID
 * @param {number} oldQuantity - Previous quantity
 * @param {number} newQuantity - New quantity
 * @param {string} rarity - Fish rarity (optional, for rarity-based thresholds)
 * @returns {Array} - Array of earned star rewards
 */
function checkStarRewards(fishId, oldQuantity, newQuantity, rarity = null) {
  const oldStars = calculateStarLevel(oldQuantity, rarity);
  const newStars = calculateStarLevel(newQuantity, rarity);
  const rewards = [];

  for (let star = oldStars + 1; star <= newStars; star++) {
    if (STAR_REWARDS[star]) {
      rewards.push({
        fishId,
        star,
        ...STAR_REWARDS[star]
      });
    }
  }

  return rewards;
}

/**
 * Calculate permanent bonuses from collection
 * @param {Object} collection - Collection data from buildCollectionData
 * @returns {Object} - Cumulative permanent bonuses
 */
function getCollectionBonuses(collection) {
  const bonuses = {
    timingBonus: 0,
    rarityBonus: 0,
    autofishBonus: 0,
    pityBonus: 0
  };

  // Add rarity completion bonuses
  for (const [_rarity, bonus] of Object.entries(collection.rarityBonuses || {})) {
    bonuses.timingBonus += bonus.timingBonus || 0;
    bonuses.rarityBonus += bonus.rarityBonus || 0;
    bonuses.autofishBonus += bonus.autofishBonus || 0;
    bonuses.pityBonus += bonus.pityBonus || 0;
  }

  return bonuses;
}

module.exports = {
  STAR_THRESHOLDS,
  BASE_STAR_THRESHOLDS,
  RARITY_THRESHOLD_MULTIPLIERS,
  STAR_REWARDS,
  RARITY_COMPLETION_BONUSES,
  COLLECTION_MILESTONES,
  TOTAL_STAR_MILESTONES,
  calculateStarLevel,
  getStarThresholdsForRarity,
  getNextStarProgress,
  buildCollectionData,
  checkNewMilestones,
  checkStarRewards,
  getCollectionBonuses
};

