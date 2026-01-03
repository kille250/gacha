/**
 * Ticket Action
 *
 * Unified ticket generation handling for REST and WebSocket.
 * Handles daily streak tickets and fate point exchanges.
 */

const ticketService = require('../domains/ticket.service');

/**
 * Ticket action result
 * @typedef {Object} TicketResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {number} [tickets] - Tickets awarded
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Claim daily streak ticket (if at milestone)
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @returns {TicketResult} Claim result
 */
function claimDailyStreak({ state }) {
  const result = ticketService.claimDailyStreak(state);

  if (result.reason === 'already_claimed') {
    return {
      success: false,
      error: 'Already claimed today',
      code: 'ALREADY_CLAIMED'
    };
  }

  if (result.newState) {
    result.newState.lastOnlineTimestamp = Date.now();
  }

  return {
    success: true,
    newState: result.newState,
    awarded: result.awarded,
    tickets: result.tickets || 0,
    streakDays: result.streakDays,
    nextMilestone: result.nextMilestone,
    reason: result.reason
  };
}

/**
 * Check daily streak status
 * @param {Object} state - Current state
 * @returns {Object} Streak status
 */
function checkDailyStreak(state) {
  const info = ticketService.getTicketGenerationInfo(state);
  return info.dailyStreak;
}

/**
 * Exchange fate points for tickets
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {Object} params.user - User object with fatePoints
 * @returns {TicketResult} Exchange result
 */
function exchangeFatePointsForTickets({ state, user }) {
  if (!user) {
    return {
      success: false,
      error: 'User data required',
      code: 'INVALID_REQUEST'
    };
  }

  const result = ticketService.exchangeFatePointsForTickets(state, user);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState: result.newState,
    fatePointsCost: result.fatePointsCost,
    ticketsReceived: result.ticketsReceived,
    exchangesRemaining: result.exchangesRemaining
  };
}

/**
 * Get ticket generation info
 * @param {Object} state - Current state
 * @returns {Object} Ticket generation info
 */
function getTicketGenerationInfo(state) {
  return ticketService.getTicketGenerationInfo(state);
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  if (error.includes('Weekly exchange limit')) return 'WEEKLY_LIMIT_REACHED';
  if (error.includes('Need')) return 'INSUFFICIENT_FATE_POINTS';
  return 'EXCHANGE_FAILED';
}

module.exports = {
  claimDailyStreak,
  checkDailyStreak,
  exchangeFatePointsForTickets,
  getTicketGenerationInfo
};
