/**
 * Upgrade Handlers - Purchase upgrades
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle upgrade purchase
 */
const handlePurchaseUpgrade = createHandler({
  eventName: 'upgrade_purchased',
  errorCode: 'UPGRADE_ERROR',
  validate: (data) => data.upgradeId ? null : 'Upgrade ID required',
  execute: async (ctx, data) => {
    const { upgradeId } = data;

    const result = essenceTapService.purchaseUpgrade(ctx.state, upgradeId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        upgradeId,
        cost: result.cost,
        essence: result.newState.essence,
        purchasedUpgrades: result.newState.purchasedUpgrades,
        clickPower: result.newState.clickPower,
        productionPerSecond: result.newState.productionPerSecond,
        critChance: result.newState.critChance,
        critMultiplier: result.newState.critMultiplier
      }
    };
  }
});

module.exports = {
  handlePurchaseUpgrade
};
