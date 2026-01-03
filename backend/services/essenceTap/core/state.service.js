/**
 * State Service - Core state management for Essence Tap
 *
 * Handles state initialization, resets, and common state operations.
 */

const {
  GAME_CONFIG,
  WEEKLY_FP_CAP
} = require('../../../config/essenceTap');

/**
 * Get the initial state for a new player
 * @returns {import('../../../../shared/types/essenceTap.types').EssenceTapState}
 */
function getInitialState() {
  return {
    // Core resources
    essence: 0,
    lifetimeEssence: 0,
    totalClicks: 0,

    // Equipment
    generators: {},
    purchasedUpgrades: [],

    // Stats
    clickPower: GAME_CONFIG.baseClickPower || 1,
    productionPerSecond: 0,
    critChance: GAME_CONFIG.baseCritChance || 0.01,
    critMultiplier: GAME_CONFIG.baseCritMultiplier || 10,

    // Timestamps
    lastOnlineTimestamp: Date.now(),
    lastSaveTimestamp: Date.now(),

    // Prestige
    prestige: {
      level: 0,
      totalPrestiges: 0,
      lastPrestigeTimestamp: 0,
      lifetimeShards: 0
    },
    prestigeShards: 0,
    prestigeUpgrades: {},

    // Abilities
    abilities: {
      active: {},
      cooldowns: {}
    },

    // Daily tracking
    daily: {
      date: new Date().toISOString().split('T')[0],
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      gamblesUsed: 0,
      completedChallenges: [],
      claimedChallenges: [],
      ticketChallengesCompleted: 0
    },

    // Weekly tournament
    weekly: {
      weekId: null,
      essenceEarned: 0,
      rank: null,
      bracketRank: null,
      rewardsClaimed: false,
      checkpointsClaimed: []
    },

    // Tournament metadata
    tournament: {
      streak: 0,
      lastParticipationWeek: null,
      totalTournamentsPlayed: 0,
      bestRank: null,
      podiumFinishes: 0,
      bracket: 'bronze',
      cosmetics: { owned: [], equipped: {} }
    },

    // Boss encounters
    bossEncounter: {
      currentBoss: null,
      totalDefeated: 0,
      clicksSinceLastBoss: 0,
      lastBossSpawnTime: null,
      defeatedBosses: []
    },

    // Characters
    assignedCharacters: [],
    characterBonus: {
      clickPower: 0,
      production: 0,
      critChance: 0,
      critMultiplier: 0
    },

    // Stats
    stats: {
      goldenEssenceClicks: 0,
      jackpotsWon: 0,
      totalJackpotWinnings: 0,
      totalGambleWins: 0,
      totalGambleLosses: 0
    },

    // Ticket generation
    ticketGeneration: {
      dailyStreakDays: 0,
      lastStreakDate: null,
      exchangedThisWeek: 0,
      lastExchangeWeek: null
    },

    // Session stats (reset on new session)
    sessionStats: {
      clicks: 0,
      essence: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    },

    // Milestones
    claimedMilestones: [],
    repeatableMilestones: {},

    // Infusion
    infusion: {
      count: 0,
      totalBonus: 0,
      lastInfusionTime: null
    },

    // FP tracking
    weeklyFP: {
      weekId: null,
      earned: 0,
      sources: {}
    }
  };
}

/**
 * Reset daily state if it's a new day
 * @param {Object} state - Current state
 * @returns {Object} Updated state
 */
function resetDaily(state) {
  const today = new Date().toISOString().split('T')[0];

  if (state.daily?.date === today) {
    return state;
  }

  return {
    ...state,
    daily: {
      date: today,
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      gamblesUsed: 0,
      completedChallenges: [],
      claimedChallenges: [],
      ticketChallengesCompleted: 0
    },
    // Reset session stats on new day
    sessionStats: {
      clicks: 0,
      essence: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    }
  };
}

/**
 * Get current ISO week identifier
 * @returns {string} Week ID in format "YYYY-WXX"
 */
function getCurrentISOWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Reset weekly FP tracking if it's a new week
 * @param {Object} state - Current state
 * @returns {Object} Updated state
 */
function resetWeeklyFPIfNeeded(state) {
  const currentWeek = getCurrentISOWeek();

  if (state.weeklyFP?.weekId === currentWeek) {
    return state;
  }

  return {
    ...state,
    weeklyFP: {
      weekId: currentWeek,
      earned: 0,
      sources: {}
    }
  };
}

/**
 * Apply fate points with weekly cap
 * @param {Object} state - Current state
 * @param {number} amount - FP to award
 * @param {string} source - Source of FP (for tracking)
 * @returns {Object} Result with actual FP awarded and capped flag
 */
function applyFPWithCap(state, amount, source) {
  const currentWeek = getCurrentISOWeek();
  let newState = resetWeeklyFPIfNeeded(state);

  const currentEarned = newState.weeklyFP?.earned || 0;
  const cap = WEEKLY_FP_CAP.maxFP;
  const remaining = Math.max(0, cap - currentEarned);
  const actualFP = Math.min(amount, remaining);
  const capped = actualFP < amount;

  newState = {
    ...newState,
    weeklyFP: {
      ...newState.weeklyFP,
      weekId: currentWeek,
      earned: currentEarned + actualFP,
      sources: {
        ...newState.weeklyFP?.sources,
        [source]: (newState.weeklyFP?.sources?.[source] || 0) + actualFP
      }
    }
  };

  return {
    newState,
    actualFP,
    capped,
    remaining: remaining - actualFP
  };
}

/**
 * Get weekly FP budget info
 * @param {Object} state - Current state
 * @returns {Object} Budget info
 */
function getWeeklyFPBudget(state) {
  const currentWeek = getCurrentISOWeek();
  const isCurrentWeek = state.weeklyFP?.weekId === currentWeek;
  const earned = isCurrentWeek ? (state.weeklyFP?.earned || 0) : 0;
  const cap = WEEKLY_FP_CAP.maxFP;

  return {
    weekId: currentWeek,
    earned,
    cap,
    remaining: Math.max(0, cap - earned),
    sources: isCurrentWeek ? (state.weeklyFP?.sources || {}) : {}
  };
}

/**
 * Calculate offline progress
 * @param {Object} state - Current state
 * @param {number} currentTime - Current timestamp
 * @returns {Object} Offline progress info
 */
function calculateOfflineProgress(state, currentTime = Date.now()) {
  const lastOnline = state.lastOnlineTimestamp || currentTime;
  const offlineDuration = Math.max(0, currentTime - lastOnline);
  const maxOfflineTime = GAME_CONFIG.maxOfflineTime || 8 * 60 * 60 * 1000; // 8 hours
  const effectiveDuration = Math.min(offlineDuration, maxOfflineTime);
  const offlineEfficiency = GAME_CONFIG.offlineEfficiency || 0.5;

  const productionPerSecond = state.productionPerSecond || 0;
  const essenceEarned = Math.floor(
    productionPerSecond * (effectiveDuration / 1000) * offlineEfficiency
  );

  return {
    essenceEarned,
    offlineDuration: effectiveDuration,
    productionRate: productionPerSecond,
    efficiency: offlineEfficiency,
    capped: offlineDuration > maxOfflineTime
  };
}

module.exports = {
  getInitialState,
  resetDaily,
  getCurrentISOWeek,
  resetWeeklyFPIfNeeded,
  applyFPWithCap,
  getWeeklyFPBudget,
  calculateOfflineProgress
};
