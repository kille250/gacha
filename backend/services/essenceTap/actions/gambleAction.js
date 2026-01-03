/**
 * Gamble Action
 *
 * Unified gamble handling for REST and WebSocket.
 * Delegates to gamble.service.js for business logic.
 */

const gambleService = require('../domains/gamble.service');

/**
 * Gamble action result
 * @typedef {Object} GambleResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {boolean} [won] - Whether the gamble was won
 * @property {number} [betAmount] - Amount bet
 * @property {string} [betType] - Type of bet
 * @property {number} [essenceChange] - Net essence change
 * @property {number} [newEssence] - New essence total
 * @property {Object} [jackpotWin] - Jackpot win info if applicable
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Perform a gamble
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {number} params.betAmount - Amount to bet
 * @param {string} params.betType - Type of bet (safe, risky, extreme)
 * @param {number} [params.userId] - User ID for jackpot tracking
 * @returns {Promise<GambleResult>} Gamble result
 */
async function performGamble({ state, betAmount, betType, userId }) {
  if (!betAmount || !betType) {
    return {
      success: false,
      error: 'Bet amount and type required',
      code: 'INVALID_REQUEST'
    };
  }

  // Perform the gamble
  const result = gambleService.gamble(state, betAmount, betType);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  let newState = result.newState;
  let jackpotWin = null;

  // Check for jackpot win (async operation)
  if (userId) {
    const jackpotResult = await gambleService.checkJackpot(state, betAmount, betType);
    if (jackpotResult.won) {
      // Award jackpot
      newState = await gambleService.resetJackpot(newState, userId, jackpotResult.amount);
      newState.essence += jackpotResult.amount;
      jackpotWin = {
        amount: jackpotResult.amount,
        rewards: jackpotResult.rewards
      };
    }
  }

  newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState,
    won: result.won,
    betAmount: result.betAmount,
    betType: result.betType,
    multiplier: result.multiplier,
    winChance: result.winChance,
    essenceChange: result.essenceChange,
    newEssence: newState.essence,
    jackpotWin
  };
}

/**
 * Get gamble information and availability
 * @param {Object} state - Current state
 * @returns {Object} Gamble info
 */
function getGambleInfo(state) {
  return gambleService.getGambleInfo(state);
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  if (error.includes('cooldown')) return 'GAMBLE_COOLDOWN';
  if (error.includes('limit')) return 'DAILY_LIMIT_REACHED';
  if (error.includes('Invalid bet type')) return 'INVALID_BET_TYPE';
  if (error.includes('Invalid bet amount')) return 'INVALID_BET_AMOUNT';
  if (error.includes('Minimum bet')) return 'BET_TOO_SMALL';
  if (error.includes('Maximum bet')) return 'BET_TOO_LARGE';
  if (error.includes('Not enough essence')) return 'INSUFFICIENT_ESSENCE';
  return 'GAMBLE_FAILED';
}

module.exports = {
  performGamble,
  getGambleInfo
};
