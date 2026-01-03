/**
 * Gamble Action
 *
 * Unified gamble handling for REST and WebSocket.
 * Delegates to gamble.service.js for business logic.
 */

const gambleService = require('../domains/gamble.service');
const { SharedJackpot } = require('../../../models');
const { GAMBLE_CONFIG } = require('../../../config/essenceTap');
const { applyFPWithCap } = require('../shared');

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
 * @property {Object} [jackpotRewards] - Rewards from jackpot win (FP, tickets, etc.)
 * @property {number} [jackpotContribution] - Amount contributed to jackpot
 * @property {Object} [userChanges] - Changes to apply to user model (FP, tickets)
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Contribute to shared jackpot from bet
 * @param {number} betAmount - Amount bet
 * @param {number} userId - User ID
 * @returns {Promise<{contribution: number}>} Contribution info
 */
async function contributeToJackpot(betAmount, userId) {
  const jackpotConfig = GAMBLE_CONFIG.jackpot;
  const contribution = Math.floor(betAmount * jackpotConfig.contributionRate);

  if (contribution <= 0) {
    return { contribution: 0 };
  }

  try {
    const [jackpot] = await SharedJackpot.findOrCreate({
      where: { jackpotType: 'essence_tap_main' },
      defaults: {
        currentAmount: jackpotConfig.seedAmount,
        totalContributions: 0,
        contributorCount: 0,
        totalWins: 0
      }
    });

    await jackpot.increment('currentAmount', { by: contribution });
    await jackpot.increment('totalContributions', { by: contribution });

    // Track unique contributors (simplistic - just count)
    if (userId) {
      await jackpot.increment('contributorCount', { by: 1 });
    }

    return { contribution };
  } catch (error) {
    console.error('Error contributing to jackpot:', error);
    return { contribution: 0 };
  }
}

/**
 * Get shared jackpot info
 * @returns {Promise<Object>} Jackpot info
 */
async function getSharedJackpotInfo() {
  try {
    const jackpot = await SharedJackpot.findOne({
      where: { jackpotType: 'essence_tap_main' }
    });

    if (!jackpot) {
      return {
        currentAmount: GAMBLE_CONFIG.jackpot.seedAmount,
        totalContributions: 0,
        contributorCount: 0,
        lastWinDate: null
      };
    }

    return {
      currentAmount: Number(jackpot.currentAmount),
      totalContributions: Number(jackpot.totalContributions),
      contributorCount: jackpot.contributorCount,
      totalWins: jackpot.totalWins,
      lastWinDate: jackpot.lastWinDate,
      lastWinAmount: jackpot.lastWinAmount ? Number(jackpot.lastWinAmount) : null,
      largestWin: jackpot.largestWin ? Number(jackpot.largestWin) : null
    };
  } catch (error) {
    console.error('Error getting jackpot info:', error);
    return {
      currentAmount: GAMBLE_CONFIG.jackpot.seedAmount,
      totalContributions: 0,
      contributorCount: 0,
      lastWinDate: null
    };
  }
}

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
  let jackpotRewards = null;
  const userChanges = {};

  // Contribute to shared jackpot
  const contributionResult = await contributeToJackpot(result.betAmount, userId);

  // Check for jackpot win (async operation)
  if (userId) {
    const jackpotResult = await gambleService.checkJackpot(state, result.betAmount, betType);
    if (jackpotResult.won) {
      jackpotWin = jackpotResult.amount;
      jackpotRewards = jackpotResult.rewards;

      // Award jackpot essence
      newState.essence = (newState.essence || 0) + jackpotResult.amount;
      newState.lifetimeEssence = (newState.lifetimeEssence || 0) + jackpotResult.amount;

      // Process jackpot rewards
      if (jackpotRewards) {
        // Add fate points (capped by weekly limit)
        if (jackpotRewards.fatePoints) {
          const fpResult = applyFPWithCap(newState, jackpotRewards.fatePoints, 'jackpot');
          newState = fpResult.newState;
          if (fpResult.actualFP > 0) {
            userChanges.fatePoints = fpResult.actualFP;
          }
        }

        // Add roll tickets
        if (jackpotRewards.rollTickets) {
          userChanges.rollTickets = jackpotRewards.rollTickets;
        }

        // Add prismatic essence
        if (jackpotRewards.prismaticEssence) {
          newState.essenceTypes = {
            ...newState.essenceTypes,
            prismatic: (newState.essenceTypes?.prismatic || 0) + jackpotRewards.prismaticEssence
          };
        }
      }

      // Reset the shared jackpot and record winner
      newState = await gambleService.resetJackpot(newState, userId, jackpotResult.amount);
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
    jackpotWin,
    jackpotRewards,
    jackpotContribution: contributionResult.contribution,
    userChanges,
    gambleInfo: gambleService.getGambleInfo(newState)
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
  getGambleInfo,
  getSharedJackpotInfo,
  contributeToJackpot
};
