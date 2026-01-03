/**
 * Ticket & Essence Routes
 *
 * Handles ticket generation (streak claiming, FP exchange),
 * essence types, daily modifiers, and infusion.
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
// TICKET GENERATION
// ===========================================

/**
 * POST /tickets/streak/claim
 * Claim daily streak and potentially earn tickets
 */
router.post('/streak/claim', createRoute({
  lockUser: false,
  execute: async (ctx) => {
    const result = essenceTapService.checkDailyStreakTickets(ctx.state);

    if (!result.newState) {
      // Already claimed today
      return {
        success: false,
        error: result.reason || 'Already claimed today'
      };
    }

    return {
      success: true,
      newState: result.newState,
      rollTicketsToAward: result.awarded ? result.tickets : 0,
      data: {
        awarded: result.awarded,
        tickets: result.tickets || 0,
        streakDays: result.streakDays,
        nextMilestone: result.nextMilestone
      }
    };
  }
}));

// ===========================================
// ESSENCE TYPES & MODIFIERS
// ===========================================

/**
 * GET /essence-types
 * Get essence type breakdown and bonuses
 */
router.get('/essence-types', createGetRoute((state) => {
  const essenceTypes = state.essenceTypes || { pure: 0, ambient: 0, golden: 0, prismatic: 0 };
  const bonuses = essenceTapService.getEssenceTypeBonuses(state);

  return {
    essenceTypes,
    bonuses,
    config: essenceTapService.ESSENCE_TYPES
  };
}));

/**
 * GET /daily-modifier
 * Get current daily modifier info
 */
router.get('/daily-modifier', async (req, res) => {
  try {
    const modifier = essenceTapService.getCurrentDailyModifier();
    const nextChangeIn = essenceTapService.getTimeUntilNextModifier();

    res.json({
      ...modifier,
      nextChangeIn
    });
  } catch (error) {
    console.error('Error getting daily modifier:', error);
    res.status(500).json({ error: 'Failed to get daily modifier' });
  }
});

// ===========================================
// INFUSION
// ===========================================

/**
 * POST /infusion
 * Perform an essence infusion for permanent bonus
 */
router.post('/infusion', createRoute({
  lockUser: false,
  execute: async (ctx) => {
    // Get user's characters for passive calculation
    const characters = await getUserCharacters(ctx.user.id);

    // Apply passive essence before infusion
    const passiveResult = await applyPassiveGains(ctx.state, characters);
    ctx.state = passiveResult.state;

    const result = essenceTapService.performInfusion(ctx.state);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        cost: result.cost,
        costPercent: result.costPercent,
        bonusGained: result.bonusGained,
        totalBonus: result.totalBonus,
        infusionCount: result.infusionCount,
        nextCost: essenceTapService.calculateInfusionCost(result.newState),
        essence: result.newState.essence
      }
    };
  }
}));

module.exports = router;
