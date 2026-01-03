/**
 * Ticket Service
 *
 * Handles ticket generation from various sources:
 * - Daily streak tickets
 * - Fate Point exchanges
 * - Ticket generation info
 */

const {
  TICKET_GENERATION
} = require('../../../config/essenceTap');

/**
 * Get current ISO week string (YYYY-WW)
 * @returns {string} ISO week identifier
 */
function getCurrentISOWeek() {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Check and award daily streak tickets
 * @param {Object} state - Current state
 * @returns {Object} Result with ticket award info
 */
function checkDailyStreakTickets(state) {
  const today = new Date().toISOString().split('T')[0];
  const lastStreakDate = state.ticketGeneration?.lastStreakDate;
  const currentStreak = state.ticketGeneration?.dailyStreakDays || 0;

  // If already claimed today, no reward
  if (lastStreakDate === today) {
    return { awarded: false, reason: 'already_claimed' };
  }

  const newState = { ...state };
  newState.ticketGeneration = { ...state.ticketGeneration };

  // Check if streak continues (played yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak;
  if (lastStreakDate === yesterdayStr) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1; // Reset streak
  }

  newState.ticketGeneration.dailyStreakDays = newStreak;
  newState.ticketGeneration.lastStreakDate = today;

  // Check if we hit a ticket milestone
  const ticketMilestone = TICKET_GENERATION.dailyStreak.ticketMilestones.find(
    m => m.days === newStreak
  );

  if (ticketMilestone) {
    return {
      awarded: true,
      tickets: ticketMilestone.tickets,
      streakDays: newStreak,
      newState,
      nextMilestone: TICKET_GENERATION.dailyStreak.ticketMilestones.find(m => m.days > newStreak)
    };
  }

  return {
    awarded: false,
    reason: 'no_milestone',
    streakDays: newStreak,
    newState,
    nextMilestone: TICKET_GENERATION.dailyStreak.ticketMilestones.find(m => m.days > newStreak)
  };
}

/**
 * Claim daily streak (update streak and get milestone if applicable)
 * @param {Object} state - Current state
 * @returns {Object} Result with updated streak info
 */
function claimDailyStreak(state) {
  return checkDailyStreakTickets(state);
}

/**
 * Exchange fate points for roll tickets
 * @param {Object} state - Current state
 * @param {Object} user - User object with fatePoints
 * @returns {Object} Exchange result
 */
function exchangeFatePointsForTickets(state, user) {
  const currentWeek = getCurrentISOWeek();
  const exchangeConfig = TICKET_GENERATION.fatePointExchange;
  const userFatePoints = user.fatePoints || 0;

  // Initialize ticket generation state if needed
  let ticketGeneration = state.ticketGeneration || {};

  // Reset weekly limit if new week
  if (ticketGeneration.lastExchangeWeek !== currentWeek) {
    ticketGeneration = {
      ...ticketGeneration,
      exchangedThisWeek: 0,
      lastExchangeWeek: currentWeek
    };
  }

  const exchangedThisWeek = ticketGeneration.exchangedThisWeek || 0;

  if (exchangedThisWeek >= exchangeConfig.weeklyLimit) {
    return { success: false, error: 'Weekly exchange limit reached' };
  }

  if (userFatePoints < exchangeConfig.cost) {
    return { success: false, error: `Need ${exchangeConfig.cost} Fate Points` };
  }

  const newState = { ...state };
  newState.ticketGeneration = {
    ...ticketGeneration,
    exchangedThisWeek: exchangedThisWeek + 1,
    lastExchangeWeek: currentWeek
  };

  return {
    success: true,
    newState,
    fatePointsCost: exchangeConfig.cost,
    ticketsReceived: exchangeConfig.tickets,
    exchangesRemaining: exchangeConfig.weeklyLimit - exchangedThisWeek - 1
  };
}

/**
 * Get ticket generation information
 * @param {Object} state - Current state
 * @returns {Object} Ticket generation info and availability
 */
function getTicketGenerationInfo(state) {
  const currentWeek = getCurrentISOWeek();
  const today = new Date().toISOString().split('T')[0];

  const ticketGeneration = state.ticketGeneration || {};

  // Daily streak info
  const currentStreak = ticketGeneration.dailyStreakDays || 0;
  const lastStreakDate = ticketGeneration.lastStreakDate;
  const canClaimStreak = lastStreakDate !== today;

  const nextStreakMilestone = TICKET_GENERATION.dailyStreak.ticketMilestones.find(
    m => m.days > currentStreak
  );

  // Fate point exchange info
  const exchangedThisWeek = (ticketGeneration.lastExchangeWeek === currentWeek)
    ? (ticketGeneration.exchangedThisWeek || 0)
    : 0;

  const exchangeConfig = TICKET_GENERATION.fatePointExchange;
  const canExchange = exchangedThisWeek < exchangeConfig.weeklyLimit;

  // Generator milestones
  const totalGenerators = Object.values(state.generators || {}).reduce((sum, count) => sum + count, 0);
  const nextGeneratorMilestone = TICKET_GENERATION.generatorMilestones.find(
    m => totalGenerators < m.totalGenerators
  );

  const completedGeneratorMilestones = TICKET_GENERATION.generatorMilestones.filter(
    m => totalGenerators >= m.totalGenerators
  ).length;

  return {
    dailyStreak: {
      currentStreak,
      canClaimToday: canClaimStreak,
      lastClaimDate: lastStreakDate,
      nextMilestone: nextStreakMilestone,
      milestones: TICKET_GENERATION.dailyStreak.ticketMilestones
    },
    fatePointExchange: {
      cost: exchangeConfig.cost,
      tickets: exchangeConfig.tickets,
      weeklyLimit: exchangeConfig.weeklyLimit,
      exchangedThisWeek,
      remaining: Math.max(0, exchangeConfig.weeklyLimit - exchangedThisWeek),
      canExchange
    },
    generatorMilestones: {
      totalGenerators,
      completed: completedGeneratorMilestones,
      total: TICKET_GENERATION.generatorMilestones.length,
      next: nextGeneratorMilestone,
      milestones: TICKET_GENERATION.generatorMilestones
    },
    streakTickets: TICKET_GENERATION.streakTickets,
    essenceExchange: TICKET_GENERATION.essenceExchange
  };
}

module.exports = {
  checkDailyStreakTickets,
  claimDailyStreak,
  exchangeFatePointsForTickets,
  getTicketGenerationInfo
};
