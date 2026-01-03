/**
 * Tap Handler - Processes tap/click events
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle batched taps from client
 */
const handleTap = createHandler({
  eventName: 'tap_confirmed',
  errorCode: 'TAP_ERROR',
  resetDaily: true,
  validate: (data) => {
    if (!data.count || data.count < 1) return 'Invalid tap count';
    if (data.count > 100) return 'Too many taps in batch';
    return null;
  },
  execute: async (ctx, data) => {
    const { count, comboMultiplier = 1 } = data;

    const result = essenceTapService.processMultipleTaps(
      ctx.state,
      count,
      comboMultiplier
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        essence: result.newState.essence,
        lifetimeEssence: result.newState.lifetimeEssence,
        totalClicks: result.newState.totalClicks,
        confirmedClientSeqs: [ctx.clientSeq],
        completedChallenges: result.completedChallenges || []
      }
    };
  }
});

module.exports = {
  handleTap
};
