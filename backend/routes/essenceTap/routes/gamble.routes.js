/**
 * Gamble Routes
 *
 * Handles gambling operations and jackpot information.
 */

const express = require('express');
const router = express.Router();
const { UserCharacter } = require('../../../models');
const essenceTapService = require('../../../services/essenceTapService');
const { createRoute } = require('../createRoute');

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get user's characters for passive calculation
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

// ===========================================
// GAMBLING
// ===========================================

/**
 * POST /gamble
 * Perform a gamble with essence
 */
router.post('/gamble', createRoute({
  resetDaily: true,
  validate: (body) => {
    if (!body.betAmount || body.betAmount < 1) {
      return 'Invalid bet amount';
    }
    if (!body.betType) {
      return 'Bet type required';
    }
    return null;
  },
  execute: async (ctx) => {
    const { betAmount, betType } = ctx.body;

    // Get user's characters for passive calculation
    const characters = await getUserCharacters(ctx.user.id);

    // Apply passive essence before gambling
    const passiveResult = await applyPassiveGains(ctx.state, characters);
    ctx.state = passiveResult.state;

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
        betType,
        payout: result.payout,
        multiplier: result.multiplier,
        jackpot: result.jackpot,
        jackpotAmount: result.jackpotAmount,
        newEssence: result.newState.essence,
        gambleInfo: essenceTapService.getGambleInfo(result.newState)
      }
    };
  }
}));

// ===========================================
// JACKPOT INFO
// ===========================================

/**
 * GET /jackpot
 * Get shared jackpot info
 */
router.get('/jackpot', async (req, res) => {
  try {
    // Fetch shared jackpot info from database
    const jackpotInfo = await essenceTapService.getSharedJackpotInfo();

    res.json(jackpotInfo);
  } catch (error) {
    console.error('Error getting jackpot info:', error);
    res.status(500).json({ error: 'Failed to get jackpot info' });
  }
});

module.exports = router;
