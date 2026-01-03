/**
 * Prestige Handlers - Prestige system operations
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle prestige action
 */
const handlePrestige = createHandler({
  eventName: 'prestige_complete',
  errorCode: 'PRESTIGE_ERROR',
  execute: async (ctx, data) => {
    const characters = data.characters || [];

    const result = essenceTapService.prestige(ctx.state, characters);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        rejectData: {
          cooldownRemaining: result.cooldownRemaining
        }
      };
    }

    return {
      success: true,
      newState: result.newState,
      fatePointsToAward: result.fatePointsEarned,
      data: {
        ...result.newState,
        shardsEarned: result.shardsEarned,
        fatePointsEarned: result.fatePointsEarned,
        newPrestigeLevel: result.newPrestigeLevel
      }
    };
  }
});

/**
 * Handle prestige upgrade purchase
 */
const handlePurchasePrestigeUpgrade = createHandler({
  eventName: 'prestige_upgrade_purchased',
  errorCode: 'PRESTIGE_UPGRADE_ERROR',
  validate: (data) => data.upgradeId ? null : 'Upgrade ID required',
  execute: async (ctx, data) => {
    const { upgradeId } = data;

    const result = essenceTapService.purchasePrestigeUpgrade(ctx.state, upgradeId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const prestigeInfo = essenceTapService.getPrestigeInfo(result.newState);

    return {
      success: true,
      newState: result.newState,
      data: {
        upgradeId,
        upgrade: result.upgrade,
        newLevel: result.newLevel,
        cost: result.cost,
        prestigeShards: result.newState.prestigeShards,
        prestigeUpgrades: result.newState.prestigeUpgrades,
        prestige: prestigeInfo
      }
    };
  }
});

module.exports = {
  handlePrestige,
  handlePurchasePrestigeUpgrade
};
