/**
 * Generator Routes
 *
 * Handles generator purchases and information:
 * - POST /generator/buy - Purchase generators
 * - GET /generator/info - Get generator information
 */

const express = require('express');
const router = express.Router();
const { UserCharacter } = require('../../../models');
const essenceTapService = require('../../../services/essenceTapService');
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
 * POST /generator/buy
 * Purchase one or more generators
 */
router.post('/buy', createRoute({
  validate: (body) => {
    if (!body.generatorId) {
      return 'Generator ID required';
    }
    const count = parseInt(body.count, 10);
    if (count && (isNaN(count) || count < 1)) {
      return 'Invalid count';
    }
    return null;
  },
  execute: async (ctx) => {
    const { generatorId, count = 1 } = ctx.body;

    // Get user's characters for passive calculation
    const characters = await getUserCharacters(ctx.user.id);

    // Apply passive essence before purchase check
    const passiveResult = await applyPassiveGains(ctx.state, characters);
    ctx.state = passiveResult.state;

    const result = essenceTapService.purchaseGenerator(ctx.state, generatorId, count);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Check for new daily challenge completions
    const completedChallenges = essenceTapService.checkDailyChallenges(result.newState);

    // Mark completed challenges as done so they don't trigger again
    if (completedChallenges.length > 0) {
      result.newState.daily.completedChallenges = [
        ...(result.newState.daily.completedChallenges || []),
        ...completedChallenges.map(c => c.id)
      ];
    }

    // Get updated game state for production per second
    const gameState = essenceTapService.getGameState(result.newState, characters);

    return {
      success: true,
      newState: result.newState,
      data: {
        generator: result.generator,
        newCount: result.newCount,
        cost: result.cost,
        productionPerSecond: gameState.productionPerSecond,
        essence: result.newState.essence,
        completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined
      }
    };
  }
}));

/**
 * GET /generator/info
 * Get available generators and current state
 */
router.get('/info', createGetRoute((state, _user) => {
  const generators = essenceTapService.getAvailableGenerators(state);

  return {
    generators,
    totalProduction: state.productionPerSecond || 0
  };
}));

module.exports = router;
