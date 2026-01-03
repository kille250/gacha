/**
 * Essence Tap State Service
 *
 * Handles core state management and CRUD operations for the Essence Tap minigame.
 */

const { GAME_CONFIG, INFUSION_CONFIG, TICKET_GENERATION } = require('../../config/essenceTap');
const calculations = require('./calculations');

/**
 * Get initial clicker state for a new user
 * @returns {Object} Initial clicker state
 */
function getInitialState() {
  return {
    essence: 0,
    lifetimeEssence: 0,
    totalClicks: 0,
    totalCrits: 0,

    // Generators: { generatorId: count }
    generators: {},

    // Purchased upgrades: array of upgrade IDs
    purchasedUpgrades: [],

    // Prestige
    prestigeLevel: 0,
    prestigeShards: 0,
    lifetimeShards: 0,
    prestigeUpgrades: {}, // { upgradeId: level }

    // Assigned characters for bonuses
    assignedCharacters: [],

    // Daily progress
    daily: {
      date: null,
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      completedChallenges: [],
      gamblesUsed: 0,
      ticketChallengesCompleted: 0
    },

    // Milestones claimed
    claimedMilestones: [],

    // Repeatable milestones tracking
    repeatableMilestones: {
      weeklyEssenceLastClaimed: null,  // ISO week string
      per100BCount: 0  // Number of 100B milestones claimed
    },

    // Stats
    stats: {
      totalGeneratorsBought: 0,
      totalUpgradesPurchased: 0,
      highestCombo: 0,
      goldenEssenceClicks: 0,
      totalGambleWins: 0,
      totalGambleLosses: 0,
      totalInfusions: 0,
      jackpotsWon: 0,
      totalJackpotWinnings: 0
    },

    // Infusion system (resets on prestige)
    infusionCount: 0,
    infusionBonus: 0,

    // Active ability cooldowns (stored as timestamps)
    abilityCooldowns: {},

    // Character XP earned in essence tap { charId: xp }
    characterXP: {},

    // Character mastery tracking { charId: { hoursUsed, level } }
    characterMastery: {},

    // Weekly tournament tracking
    weekly: {
      weekId: null,  // ISO week string
      essenceEarned: 0,
      rank: null,
      rewardsClaimed: false
    },

    // Progressive jackpot contribution tracking
    jackpotContributions: 0,

    // Roll ticket generation tracking
    ticketGeneration: {
      dailyStreakDays: 0,
      lastStreakDate: null,
      exchangedThisWeek: 0,
      lastExchangeWeek: null
    },

    // Weekly FP cap tracking
    weeklyFP: {
      weekId: null,  // ISO week string
      earnedThisWeek: 0
    },

    // Session stats for mini-milestones
    sessionStats: {
      sessionStartTime: null,
      sessionEssence: 0,
      currentCombo: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    },

    // Essence types tracking
    essenceTypes: {
      pure: 0,
      ambient: 0,
      golden: 0,
      prismatic: 0
    },

    // Timestamps
    lastOnlineTimestamp: Date.now(),
    lastSaveTimestamp: Date.now(),
    lastGambleTimestamp: 0,
    createdAt: Date.now()
  };
}

/**
 * Reset daily progress (called at start of new day)
 * @param {Object} state - Current state
 * @returns {Object} New state with reset daily
 */
function resetDaily(state) {
  const today = calculations.getTodayDateString();

  if (state.daily?.date === today) {
    return state; // Already reset for today
  }

  return {
    ...state,
    daily: {
      date: today,
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      completedChallenges: [],
      claimedChallenges: [],
      gamblesUsed: 0,
      ticketChallengesCompleted: 0
    }
  };
}

/**
 * Reset session stats (called when session starts)
 * @param {Object} state - Current state
 * @returns {Object} New state with reset session stats
 */
function resetSessionStats(state) {
  const newState = { ...state };
  newState.sessionStats = {
    sessionStartTime: Date.now(),
    sessionEssence: 0,
    currentCombo: 0,
    maxCombo: 0,
    critStreak: 0,
    maxCritStreak: 0,
    claimedSessionMilestones: [],
    claimedComboMilestones: [],
    claimedCritMilestones: []
  };
  return newState;
}

/**
 * Get session stats summary
 * @param {Object} state - Current state
 * @returns {Object} Session stats summary
 */
function getSessionStats(state) {
  const stats = state.sessionStats || {};
  const sessionDuration = stats.sessionStartTime
    ? Math.floor((Date.now() - stats.sessionStartTime) / 1000)
    : 0;

  return {
    duration: sessionDuration,
    durationFormatted: calculations.formatSessionDuration(sessionDuration),
    essenceEarned: stats.sessionEssence || 0,
    maxCombo: stats.maxCombo || 0,
    maxCritStreak: stats.maxCritStreak || 0,
    milestonesAchieved: (stats.claimedSessionMilestones?.length || 0) +
                        (stats.claimedComboMilestones?.length || 0) +
                        (stats.claimedCritMilestones?.length || 0)
  };
}

/**
 * Calculate the cost of the next infusion
 * @param {Object} state - Current state
 * @returns {number} Cost in essence (percentage of current)
 */
function calculateInfusionCost(state) {
  const infusionCount = state.infusionCount || 0;
  return Math.min(
    INFUSION_CONFIG.baseCostPercent + (infusionCount * INFUSION_CONFIG.costIncreasePerUse),
    INFUSION_CONFIG.maxCostPercent
  );
}

/**
 * Get available generators for the UI
 * @param {Object} state - Current state
 * @returns {Array} Available generators with costs
 */
function getAvailableGenerators(state) {
  const { GENERATORS } = calculations;

  return GENERATORS.map(gen => {
    const owned = state.generators?.[gen.id] || 0;
    const cost = calculations.getGeneratorCost(gen.id, owned);
    const unlocked = state.lifetimeEssence >= gen.unlockEssence;

    return {
      ...gen,
      owned,
      cost,
      unlocked,
      canAfford: state.essence >= cost,
      maxPurchasable: calculations.getMaxPurchasable(gen.id, owned, state.essence)
    };
  });
}

/**
 * Get full game state for the UI
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @param {Object} options - Additional options
 * @returns {Object} Full game state for UI
 */
function getGameState(state, characters = [], _options = {}) {
  const clickPower = calculations.calculateClickPower(state, characters);
  const productionPerSecond = calculations.calculateProductionPerSecond(state, characters);
  const critChance = calculations.calculateCritChance(state, characters);
  const critMultiplier = calculations.calculateCritMultiplier(state);
  const goldenChance = calculations.calculateGoldenChance(state, characters);
  const comboDecayTime = calculations.calculateComboDecayTime(state, characters);
  const elementBonuses = calculations.calculateElementBonuses(state.assignedCharacters, characters);
  const elementSynergy = calculations.calculateElementSynergy(state.assignedCharacters, characters);
  const seriesSynergy = calculations.calculateSeriesSynergy(state.assignedCharacters, characters);
  const masteryBonus = calculations.calculateTotalMasteryBonus(state.assignedCharacters, state.characterMastery);
  const underdogBonus = calculations.calculateUnderdogBonus(state.assignedCharacters, characters);
  const clickGeneratorScaling = calculations.calculateClickGeneratorScaling(state.generators);
  const dailyModifier = calculations.getCurrentDailyModifier();

  // Build character mastery info for assigned characters
  const characterMasteryInfo = {};
  for (const charId of state.assignedCharacters || []) {
    characterMasteryInfo[charId] = calculations.calculateCharacterMastery(state.characterMastery, charId);
  }

  return {
    essence: state.essence || 0,
    lifetimeEssence: state.lifetimeEssence || 0,
    totalClicks: state.totalClicks || 0,
    totalCrits: state.totalCrits || 0,
    clickPower,
    productionPerSecond,
    critChance,
    critMultiplier,
    goldenChance,
    comboDecayTime,
    generators: getAvailableGenerators(state),
    upgrades: calculations.getAvailableUpgrades(state),
    prestige: calculations.getPrestigeInfo(state),
    assignedCharacters: state.assignedCharacters || [],
    maxAssignedCharacters: GAME_CONFIG.maxAssignedCharacters,
    characterBonus: calculations.calculateCharacterBonus(state.assignedCharacters, characters),
    elementBonuses,
    elementSynergy,
    seriesSynergy,
    masteryBonus,
    characterMasteryInfo,
    underdogBonus,
    clickGeneratorScaling,
    infusion: {
      count: state.infusionCount || 0,
      bonus: state.infusionBonus || 0,
      cost: calculateInfusionCost(state),
      maxPerPrestige: INFUSION_CONFIG.maxPerPrestige
    },
    dailyModifier: {
      ...dailyModifier,
      nextChangeIn: calculations.getTimeUntilNextModifier()
    },
    stats: state.stats || {},
    daily: state.daily || {},
    ticketGeneration: {
      streakDays: state.ticketGeneration?.dailyStreakDays || 0,
      exchangedThisWeek: state.ticketGeneration?.exchangedThisWeek || 0,
      weeklyExchangeLimit: TICKET_GENERATION.fatePointExchange.weeklyLimit
    },
    essenceTypes: state.essenceTypes || { pure: 0, ambient: 0, golden: 0, prismatic: 0 },
    lastOnlineTimestamp: state.lastOnlineTimestamp,
    characterXP: state.characterXP || {}
  };
}

module.exports = {
  getInitialState,
  resetDaily,
  resetSessionStats,
  getSessionStats,
  calculateInfusionCost,
  getAvailableGenerators,
  getGameState
};
