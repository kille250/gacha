/**
 * Prestige System Configuration
 *
 * Provides late-game progression through prestige levels.
 * Each prestige level requires achievements and offers permanent bonuses.
 *
 * ============================================================================
 * BALANCE UPDATE (v3.0 - Cross-Mode Economy Balancing)
 * ============================================================================
 * Key changes:
 *
 * 1. ACCOUNT XP INTEGRATION: Prestige levels now award account XP
 *    - Prestige 1: 500 XP
 *    - Prestige 2: 1500 XP
 *    - Prestige 3: 4000 XP
 *    - Prestige 4: 8000 XP
 *    - Prestige 5: 15000 XP
 *    - Total: 29,000 XP from prestige alone
 *
 * 2. PERMANENT XP BONUS: Each prestige level adds +5% to fishing XP
 *    - Connects fishing progression to account progression
 *    - Max prestige = +25% fishing XP
 *
 * 3. ACCOUNT LEVEL BONUSES APPLY: Account level fishing rarity bonuses
 *    now stack with prestige rarity bonuses
 * ============================================================================
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

// BALANCE UPDATE: Rebalanced prestige requirements and rewards
// Design Philosophy:
// - Level 1: Achievable within first week of dedicated fishing (~500 catches)
// - Level 2: Mid-game goal (~1-2 weeks of fishing)
// - Level 3: Late-game achievement (~1 month of play)
// - Level 4-5: Endgame prestige for dedicated players
// - Removed "allFishMaxStars" requirement (too grindy, some fish need 500 catches)
// - Autofish bonuses capped to prevent trivializing active play
const PRESTIGE_LEVELS = {
  1: {
    name: 'Journeyman Angler',
    emoji: '🥉',
    requirements: {
      totalCatches: 300,              // Reduced: achievable in 2-3 play sessions
      totalLegendaries: 2,            // 2 legendaries more accessible
      totalPerfects: 30,              // ~10% of catches being perfect is reasonable
      areasUnlocked: 2,               // River + Pond
      rodsOwned: 2
    },
    rewards: {
      bonusPoints: 15000,             // Reduced from 25k - first prestige shouldn't be windfall
      permanentTimingBonus: 30,       // +30ms to all timing windows
      permanentRarityBonus: 0.02,     // +2% rare+ chance
      unlocks: ['master_rod_purchase'],
      // NEW in v3.0: Account XP integration
      accountXP: 500,                 // Contributes to profile progression
      permanentXPBonus: 0.05          // +5% XP from fishing permanently
    },
    description: 'Prove your worth as a dedicated fisher'
  },
  2: {
    name: 'Expert Angler',
    emoji: '🥈',
    requirements: {
      totalCatches: 1200,             // ~4x Level 1 requirement
      totalLegendaries: 8,            // Reasonable with Prestige 1 bonuses
      totalPerfects: 120,             // 10% perfect rate maintained
      areasUnlocked: 3,               // Includes Ocean
      longestStreak: 12,              // Achievable with focus
      challengesCompleted: 20
    },
    rewards: {
      bonusPoints: 50000,
      permanentTimingBonus: 40,       // +70ms total with Prestige 1
      permanentRarityBonus: 0.04,     // +6% total
      bonusAutofishLimit: 30,
      unlocks: ['celestial_area'],
      // NEW in v3.0: Account XP integration
      accountXP: 1500,                // Contributes to profile progression
      permanentXPBonus: 0.05          // +10% total XP from fishing
    },
    description: 'Master the art of fishing'
  },
  3: {
    name: 'Master Angler',
    emoji: '🥇',
    requirements: {
      totalCatches: 4000,             // ~3.3x Level 2
      totalLegendaries: 25,
      totalPerfects: 400,
      longestStreak: 20,
      challengesCompleted: 50,
      collectionComplete: true        // All 15 fish caught at least once
    },
    rewards: {
      bonusPoints: 150000,
      permanentTimingBonus: 50,       // +120ms total
      permanentRarityBonus: 0.06,     // +12% total
      bonusAutofishLimit: 50,         // +80 total
      premiumTicketBonus: 1,
      unlocks: ['mythic_rod_purchase', 'void_area'],
      // NEW in v3.0: Account XP integration
      accountXP: 4000,                // Contributes to profile progression
      permanentXPBonus: 0.05          // +15% total XP from fishing
    },
    description: 'Become a legend among fishers'
  },
  4: {
    name: 'Legendary Angler',
    emoji: '👑',
    requirements: {
      totalCatches: 12000,            // 3x Level 3
      totalLegendaries: 80,
      totalPerfects: 1200,
      longestStreak: 35,
      challengesCompleted: 120,
      // Removed allFishMaxStars - too grindy (would need 7500+ catches)
      collectionStars: 60             // NEW: 60 total stars across all fish (more flexible)
    },
    rewards: {
      bonusPoints: 350000,
      permanentTimingBonus: 60,       // +180ms total
      permanentRarityBonus: 0.08,     // +20% total
      bonusAutofishLimit: 70,         // +150 total
      premiumTicketBonus: 2,
      autofishPerfectChance: 0.05,
      unlocks: ['legendary_title', 'celestial_rod_purchase'],
      // NEW in v3.0: Account XP integration
      accountXP: 8000,                // Contributes to profile progression
      permanentXPBonus: 0.05          // +20% total XP from fishing
    },
    description: 'Achieve immortal status in the fishing world'
  },
  5: {
    name: 'Mythic Angler',
    emoji: '🌟',
    requirements: {
      totalCatches: 30000,
      totalLegendaries: 200,
      longestStreak: 50,
      challengesCompleted: 250,
      // BALANCE UPDATE v2.1: collectionStars requirement reduced to 70
      // Max possible is 75 (15 fish * 5 stars), requiring exactly max feels punishing
      // 70 stars = 93% completion, leaving room for 1 fish not at max
      collectionStars: 70
    },
    rewards: {
      bonusPoints: 750000,
      permanentTimingBonus: 70,       // +250ms total (very forgiving timing)
      permanentRarityBonus: 0.10,     // +30% total rare+ chance
      bonusAutofishLimit: 100,        // +250 total (capped to not trivialize)
      premiumTicketBonus: 3,
      autofishPerfectChance: 0.10,
      pityReduction: 0.15,            // 15% faster pity buildup
      unlocks: ['mythic_title', 'rainbow_rod'],
      // NEW in v3.0: Account XP integration
      accountXP: 15000,               // Major contribution to profile progression
      permanentXPBonus: 0.05          // +25% total XP from fishing (max prestige)
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

  // NEW: Check collection stars requirement (total stars across all fish)
  if (req.collectionStars) {
    const totalStars = achievements.totalStars || 0;
    if (totalStars < req.collectionStars) {
      missing.push(`Earn ${req.collectionStars - totalStars} more collection stars (${totalStars}/${req.collectionStars})`);
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
    xpMultiplier: 0,      // NEW in v3.0: Cumulative XP bonus
    totalAccountXP: 0,     // NEW in v3.0: Total account XP earned from prestige
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
      // NEW in v3.0: Track XP bonuses
      bonuses.xpMultiplier += level.rewards.permanentXPBonus || 0;
      bonuses.totalAccountXP += level.rewards.accountXP || 0;
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

  // NEW: Track collection stars progress
  if (req.collectionStars) {
    progress.collectionStars = {
      current: achievements.totalStars || 0,
      required: req.collectionStars,
      percent: Math.min(100, ((achievements.totalStars || 0) / req.collectionStars) * 100)
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

