/**
 * Generator Handlers - Purchase and manage generators
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle generator purchase
 */
const handlePurchaseGenerator = createHandler({
  eventName: 'generator_purchased',
  errorCode: 'GENERATOR_ERROR',
  validate: (data) => data.generatorId ? null : 'Generator ID required',
  execute: async (ctx, data) => {
    const { generatorId, quantity = 1 } = data;

    const result = essenceTapService.purchaseGenerator(
      ctx.state,
      generatorId,
      quantity
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        generatorId,
        quantity,
        newCount: result.newCount,
        cost: result.cost,
        essence: result.newState.essence,
        generators: result.newState.generators,
        productionPerSecond: result.newState.productionPerSecond
      }
    };
  }
});

module.exports = {
  handlePurchaseGenerator
};
