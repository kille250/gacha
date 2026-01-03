/**
 * Upgrade Routes
 *
 * Handles upgrade purchases and information:
 * - POST /upgrade/buy - Purchase an upgrade
 * - GET /upgrades - Get available upgrades
 */

const express = require('express');
const router = express.Router();
const { UserCharacter } = require('../../../models');
const essenceTapService = require('../../../services/essenceTapService');
const accountLevelService = require('../../../services/accountLevelService');
const { createRoute, createGetRoute } = require('../createRoute');

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Apply passive essence gains before performing essence-modifying operations
 */
async function applyPassiveGains(state, characters, maxSeconds = 300) {
  const now = Date.now();
  const lastUpdate = state.lastOnlineTimestamp || state.lastSaveTimestamp || now;
  const elapsedMs = now - lastUpdate;
  const elapsedSeconds = Math.min(elapsedMs / 1000, maxSeconds);

  // Guard: If gains were applied very recently, skip to prevent double-counting
  const MIN_PASSIVE_GAIN_INTERVAL_MS = 1000;
  if (elapsedMs < MIN_PASSIVE_GAIN_INTERVAL_MS) {
    return { state, gainsApplied: 0 };
  }

  if (elapsedSeconds <= 0) {
    return { state, gainsApplied: 0 };
  }

  const activeAbilityEffects = essenceTapService.getActiveAbilityEffects(state);
  let productionPerSecond = essenceTapService.calculateProductionPerSecond(state, characters);
  if (activeAbilityEffects.productionMultiplier) {
    productionPerSecond *= activeAbilityEffects.productionMultiplier;
  }

  const passiveGain = Math.floor(productionPerSecond * elapsedSeconds);
  if (passiveGain > 0) {
    state.essence = (state.essence || 0) + passiveGain;
    state.lifetimeEssence = (state.lifetimeEssence || 0) + passiveGain;
    // Check burning hour status for tournament multiplier
    const burningHourStatus = essenceTapService.getBurningHourStatus();
    const weeklyResult = essenceTapService.updateWeeklyProgress(state, passiveGain, {
      burningHourActive: burningHourStatus.active
    });
    state = weeklyResult.newState;
  }

  // Update timestamp to mark when gains were last applied
  state.lastOnlineTimestamp = now;

  return { state, gainsApplied: passiveGain };
}

/**
 * Get user's characters for bonus calculations
 */
async function getUserCharacters(userId) {
  const userCharacters = await UserCharacter.findAll({
    where: { UserId: userId },
    include: ['Character']
  });

  return userCharacters.map(uc => ({
    id: uc.CharacterId,
    rarity: uc.Character?.rarity || 'common',
    element: uc.Character?.element || 'neutral'
  }));
}

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /upgrade/buy
 * Purchase an upgrade
 */
router.post('/buy', createRoute({
  validate: (body) => {
    if (!body.upgradeId) {
      return 'Upgrade ID required';
    }
    return null;
  },
  execute: async (ctx) => {
    const { upgradeId } = ctx.body;

    // Get user's characters for passive calculation
    const characters = await getUserCharacters(ctx.user.id);

    // Apply passive essence before purchase check
    const passiveResult = await applyPassiveGains(ctx.state, characters);
    ctx.state = passiveResult.state;

    const result = essenceTapService.purchaseUpgrade(ctx.state, upgradeId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Award XP for upgrade purchase
    accountLevelService.addXP(
      ctx.user,
      essenceTapService.GAME_CONFIG.xpPerUpgrade || 2,
      'essence_tap_upgrade'
    );
    await ctx.user.save({ transaction: ctx.transaction });

    // Get updated game state
    const gameState = essenceTapService.getGameState(result.newState, characters);

    return {
      success: true,
      newState: result.newState,
      data: {
        upgrade: result.upgrade,
        clickPower: gameState.clickPower,
        productionPerSecond: gameState.productionPerSecond,
        critChance: gameState.critChance,
        critMultiplier: gameState.critMultiplier,
        essence: result.newState.essence
      }
    };
  }
}));

/**
 * GET /upgrades
 * Get available upgrades
 */
router.get('/', createGetRoute((state) => {
  const upgrades = essenceTapService.getAvailableUpgrades(state);

  return {
    upgrades,
    purchasedUpgrades: state.purchasedUpgrades || []
  };
}));

module.exports = router;
