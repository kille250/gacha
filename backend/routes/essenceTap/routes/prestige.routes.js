/**
 * Prestige Routes
 *
 * Handles prestige (awakening) system:
 * - POST /prestige - Perform prestige/awakening
 * - GET /prestige/info - Get prestige information
 * - POST /prestige/upgrade - Purchase prestige upgrade
 */

const express = require('express');
const router = express.Router();
const essenceTapService = require('../../../services/essenceTapService');
const { createRoute, createGetRoute } = require('../createRoute');

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /prestige
 * Perform prestige (awakening) to reset and gain prestige shards
 */
router.post('/', createRoute({
  lockUser: true,
  execute: async (ctx) => {
    const result = essenceTapService.performPrestige(ctx.state, ctx.user);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Apply FP with cap enforcement (prestige counts toward weekly cap)
    let actualFP = 0;
    let fpCapped = false;
    if (result.fatePointsReward > 0) {
      const fpResult = essenceTapService.applyFPWithCap(
        result.newState,
        result.fatePointsReward,
        'prestige'
      );
      result.newState = fpResult.newState;
      actualFP = fpResult.actualFP;
      fpCapped = fpResult.capped;
    }

    // Award XP
    if (result.xpReward > 0) {
      ctx.user.accountXP = (ctx.user.accountXP || 0) + result.xpReward;
      await ctx.user.save({ transaction: ctx.transaction });
    }

    return {
      success: true,
      newState: result.newState,
      fatePointsToAward: actualFP,
      data: {
        shardsEarned: result.shardsEarned,
        totalShards: result.totalShards,
        prestigeLevel: result.prestigeLevel,
        fatePointsReward: actualFP,
        fatePointsCapped: fpCapped,
        xpReward: result.xpReward,
        startingEssence: result.startingEssence
      }
    };
  }
}));

/**
 * GET /prestige/info
 * Get prestige information (shards, level, upgrades, next prestige preview)
 */
router.get('/info', createGetRoute((state) => {
  const prestigeInfo = essenceTapService.getPrestigeInfo(state);

  return {
    ...prestigeInfo,
    prestigeShards: state.prestigeShards || 0,
    prestigeLevel: state.prestigeLevel || 0
  };
}));

/**
 * POST /prestige/upgrade
 * Purchase a prestige upgrade
 */
router.post('/upgrade', createRoute({
  lockUser: false,
  validate: (body) => {
    if (!body.upgradeId) {
      return 'Upgrade ID required';
    }
    return null;
  },
  execute: async (ctx) => {
    const { upgradeId } = ctx.body;

    const result = essenceTapService.purchasePrestigeUpgrade(ctx.state, upgradeId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        upgrade: result.upgrade,
        newLevel: result.newLevel,
        cost: result.cost,
        remainingShards: result.newState.prestigeShards
      }
    };
  }
}));

module.exports = router;
