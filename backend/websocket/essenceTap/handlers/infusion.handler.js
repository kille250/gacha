/**
 * Infusion Handlers - Essence infusion operations
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle infusion action
 */
const handleInfusion = createHandler({
  eventName: 'infusion_complete',
  errorCode: 'INFUSION_ERROR',
  validate: (data) => {
    if (!data.amount || data.amount < 1) return 'Invalid infusion amount';
    return null;
  },
  execute: async (ctx, data) => {
    const { amount } = data;

    const result = essenceTapService.performInfusion(ctx.state, amount);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        amount,
        bonusGained: result.bonusGained,
        totalBonus: result.totalBonus,
        infusionCount: result.infusionCount,
        essence: result.newState.essence
      }
    };
  }
});

module.exports = {
  handleInfusion
};
