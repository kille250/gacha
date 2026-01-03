/**
 * Gambling Handlers - Gamble and jackpot operations
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle gamble action
 */
const handleGamble = createHandler({
  eventName: 'gamble_result',
  errorCode: 'GAMBLE_ERROR',
  resetDaily: true,
  validate: (data) => {
    if (!data.betAmount || data.betAmount < 1) return 'Invalid bet amount';
    return null;
  },
  execute: async (ctx, data) => {
    const { betAmount, betType = 'normal' } = data;

    const result = await essenceTapService.gamble(ctx.state, betAmount, betType);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        won: result.won,
        betAmount,
        payout: result.payout,
        multiplier: result.multiplier,
        jackpot: result.jackpot,
        jackpotAmount: result.jackpotAmount,
        newEssence: result.newState.essence,
        gambleInfo: essenceTapService.getGambleInfo(result.newState)
      }
    };
  }
});

module.exports = {
  handleGamble
};
