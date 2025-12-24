/**
 * Prestige System Configuration
 *
 * Provides late-game progression through prestige levels.
 * Each prestige level requires achievements and offers permanent bonuses.
 *
 * ============================================================================
 * EMOJI USAGE NOTICE
 * ============================================================================
 * This file contains INTENTIONAL emoji usage as game data. Emojis represent:
 * - Prestige level tier icons (displayed in player profiles and UI)
 *
 * These emojis are REQUIRED for game functionality and should NOT be removed.
 * They are stored in the database and sent to clients as part of game data.
 * ============================================================================
 */

// Import directly from parent to avoid circular dependency (index.js imports this file)
const { FISH_TYPES } = require('../fishing');

// Smoother progression curve - reduced requirements for better player retention
const PRESTIGE_LEVELS = {
  1: {
    name: 'Journeyman Angler',
    emoji: '🥉',
    requirements: {
      totalCatches: 500,              // Reduced from 1000
      totalLegendaries: 3,            // Reduced from 5
      totalPerfects: 50,              // Reduced from 100
      areasUnlocked: 2,               // Reduced from 3
      rodsOwned: 2                    // Reduced from 3
    },
    rewards: {
      bonusPoints: 25000,
      permanentTimingBonus: 25,       // +25ms to all timing windows
      permanentRarityBonus: 0.02,     // +2% rare+ chance
      unlocks: ['master_rod_purchase']
    },
    description: 'Prove your worth as a dedicated fisher'
  },
  2: {
    name: 'Expert Angler',
    emoji: '🥈',
    requirements: {
      totalCatches: 2000,             // Reduced from 5000
      totalLegendaries: 12,           // Reduced from 25
      totalPerfects: 200,             // Reduced from 500
      areasUnlocked: 3,               // Reduced from 4
      longestStreak: 15,              // Reduced from 25
      challengesCompleted: 25         // Reduced from 50
    },
    rewards: {
      bonusPoints: 75000,
      permanentTimingBonus: 50,
      permanentRarityBonus: 0.05,
      bonusAutofishLimit: 50,
      unlocks: ['celestial_area']
    },
    description: 'Master the art of fishing'
  },
  3: {
    name: 'Master Angler',
    emoji: '🥇',
    requirements: {
      totalCatches: 6000,             // Reduced from 15000
      totalLegendaries: 40,           // Reduced from 100
      totalPerfects: 600,             // Reduced from 1500
      longestStreak: 30,              // Reduced from 50
      challengesCompleted: 75,        // Reduced from 150
      collectionComplete: true        // All fish caught at least once
    },
    rewards: {
      bonusPoints: 200000,
      permanentTimingBonus: 100,
      permanentRarityBonus: 0.10,
      bonusAutofishLimit: 100,
      premiumTicketBonus: 1,          // +1 premium ticket per day from challenges
      unlocks: ['mythic_rod_purchase', 'void_area']
    },
    description: 'Become a legend among fishers'
  },
  4: {
    name: 'Legendary Angler',
    emoji: '👑',
    requirements: {
      totalCatches: 20000,            // Reduced from 50000
      totalLegendaries: 150,          // Reduced from 500
      totalPerfects: 2000,            // Reduced from 5000
      longestStreak: 50,              // Reduced from 100
      challengesCompleted: 200,       // Reduced from 500
      allFishMaxStars: true           // All fish at 5 stars
    },
    rewards: {
      bonusPoints: 500000,
      permanentTimingBonus: 150,
      permanentRarityBonus: 0.15,
      bonusAutofishLimit: 200,
      premiumTicketBonus: 2,
      autofishPerfectChance: 0.05,    // 5% chance for "perfect" quality on autofish
      unlocks: ['legendary_title', 'celestial_rod_purchase']
    },
    description: 'Achieve immortal status in the fishing world'
  },
  5: {
    name: 'Mythic Angler',
    emoji: '🌟',
    requirements: {
      totalCatches: 50000,            // Reduced from 100000
      totalLegendaries: 400,          // Reduced from 1000
      allPrestigeBonusesActive: true
    },
    rewards: {
      bonusPoints: 1000000,
      permanentTimingBonus: 200,
      permanentRarityBonus: 0.20,
      bonusAutofishLimit: 350,
      premiumTicketBonus: 3,
      autofishPerfectChance: 0.10,
      pityReduction: 0.20,            // 20% faster pity buildup
      unlocks: ['mythic_title', 'rainbow_rod']
    },
    description: 'Transcend mortal fishing limits'
  }
};

/**
 * Check if user meets requirements for a prestige level
 * @param {Object} achievements - User's fishing achievements
 * @param {Object} stats - User's fishing stats
 * @param {Object} areas - User's unlocked areas
 * @param {Array} ownedRods - User's owned rods
 * @param {number} targetLevel - Prestige level to check
 * @returns {Object} - { canPrestige, missingRequirements }
 */
function checkPrestigeRequirements(achievements, stats, areas, ownedRods, targetLevel) {
  const level = PRESTIGE_LEVELS[targetLevel];
  if (!level) {
    return { canPrestige: false, missingRequirements: ['Invalid prestige level'] };
  }

  const missing = [];
  const req = level.requirements;

  if (req.totalCatches && (stats.totalCatches || 0) < req.totalCatches) {
    missing.push(`Catch ${req.totalCatches - (stats.totalCatches || 0)} more fish`);
  }

  if (req.totalLegendaries && (achievements.totalLegendaries || 0) < req.totalLegendaries) {
    missing.push(`Catch ${req.totalLegendaries - (achievements.totalLegendaries || 0)} more legendary fish`);
  }

  if (req.totalPerfects && (achievements.totalPerfects || 0) < req.totalPerfects) {
    missing.push(`Get ${req.totalPerfects - (achievements.totalPerfects || 0)} more perfect catches`);
  }

  if (req.areasUnlocked && (areas.unlocked?.length || 1) < req.areasUnlocked) {
    missing.push(`Unlock ${req.areasUnlocked - (areas.unlocked?.length || 1)} more areas`);
  }

  if (req.rodsOwned && (ownedRods?.length || 1) < req.rodsOwned) {
    missing.push(`Own ${req.rodsOwned - (ownedRods?.length || 1)} more rods`);
  }

  if (req.longestStreak && (achievements.longestStreak || 0) < req.longestStreak) {
    missing.push(`Achieve a streak of ${req.longestStreak} (current best: ${achievements.longestStreak || 0})`);
  }

  if (req.challengesCompleted && (achievements.challengesCompleted || 0) < req.challengesCompleted) {
    missing.push(`Complete ${req.challengesCompleted - (achievements.challengesCompleted || 0)} more challenges`);
  }

  if (req.collectionComplete) {
    const uniqueFishCaught = Object.keys(stats.fishCaught || {}).length;
    const totalFishTypes = FISH_TYPES.length;
    if (uniqueFishCaught < totalFishTypes) {
      missing.push(`Catch all fish species (${uniqueFishCaught}/${totalFishTypes})`);
    }
  }

  return {
    canPrestige: missing.length === 0,
    missingRequirements: missing,
    level: level
  };
}

/**
 * Calculate cumulative prestige bonuses for a user
 * @param {number} prestigeLevel - User's current prestige level
 * @returns {Object} - Cumulative bonuses from all achieved prestige levels
 */
function getPrestigeBonuses(prestigeLevel) {
  const bonuses = {
    timingBonus: 0,
    rarityBonus: 0,
    autofishLimit: 0,
    premiumTicketBonus: 0,
    autofishPerfectChance: 0,
    pityReduction: 0,
    unlocks: []
  };

  for (let i = 1; i <= prestigeLevel; i++) {
    const level = PRESTIGE_LEVELS[i];
    if (level && level.rewards) {
      bonuses.timingBonus += level.rewards.permanentTimingBonus || 0;
      bonuses.rarityBonus += level.rewards.permanentRarityBonus || 0;
      bonuses.autofishLimit += level.rewards.bonusAutofishLimit || 0;
      bonuses.premiumTicketBonus += level.rewards.premiumTicketBonus || 0;
      bonuses.autofishPerfectChance += level.rewards.autofishPerfectChance || 0;
      bonuses.pityReduction += level.rewards.pityReduction || 0;
      if (level.rewards.unlocks) {
        bonuses.unlocks.push(...level.rewards.unlocks);
      }
    }
  }

  return bonuses;
}

/**
 * Get prestige progress for display
 * @param {Object} achievements - User's fishing achievements
 * @param {Object} stats - User's fishing stats
 * @param {number} currentPrestige - User's current prestige level
 * @returns {Object} - Progress towards next prestige level
 */
function getPrestigeProgress(achievements, stats, currentPrestige) {
  const nextLevel = currentPrestige + 1;
  const level = PRESTIGE_LEVELS[nextLevel];
  
  if (!level) {
    return { 
      maxPrestige: true, 
      currentLevel: currentPrestige,
      currentName: PRESTIGE_LEVELS[currentPrestige]?.name || 'Mythic Angler'
    };
  }

  const progress = {};
  const req = level.requirements;

  if (req.totalCatches) {
    progress.catches = {
      current: stats.totalCatches || 0,
      required: req.totalCatches,
      percent: Math.min(100, ((stats.totalCatches || 0) / req.totalCatches) * 100)
    };
  }

  if (req.totalLegendaries) {
    progress.legendaries = {
      current: achievements.totalLegendaries || 0,
      required: req.totalLegendaries,
      percent: Math.min(100, ((achievements.totalLegendaries || 0) / req.totalLegendaries) * 100)
    };
  }

  if (req.totalPerfects) {
    progress.perfects = {
      current: achievements.totalPerfects || 0,
      required: req.totalPerfects,
      percent: Math.min(100, ((achievements.totalPerfects || 0) / req.totalPerfects) * 100)
    };
  }

  if (req.longestStreak) {
    progress.streak = {
      current: achievements.longestStreak || 0,
      required: req.longestStreak,
      percent: Math.min(100, ((achievements.longestStreak || 0) / req.longestStreak) * 100)
    };
  }

  if (req.challengesCompleted) {
    progress.challenges = {
      current: achievements.challengesCompleted || 0,
      required: req.challengesCompleted,
      percent: Math.min(100, ((achievements.challengesCompleted || 0) / req.challengesCompleted) * 100)
    };
  }

  // Calculate overall progress
  const progressValues = Object.values(progress).map(p => p.percent);
  const overallProgress = progressValues.length > 0 
    ? progressValues.reduce((a, b) => a + b, 0) / progressValues.length 
    : 0;

  return {
    maxPrestige: false,
    currentLevel: currentPrestige,
    nextLevel: nextLevel,
    nextLevelInfo: level,
    progress,
    overallProgress: Math.round(overallProgress)
  };
}

module.exports = {
  PRESTIGE_LEVELS,
  checkPrestigeRequirements,
  getPrestigeBonuses,
  getPrestigeProgress
};

