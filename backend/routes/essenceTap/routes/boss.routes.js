/**
 * Boss Routes
 *
 * Handles boss encounter operations: spawning, attacking, status, and rewards.
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
 * Get user's characters for damage calculation
 */
async function getUserCharacters(userId, transaction = null) {
  const options = {
    where: { UserId: userId },
    include: ['Character']
  };

  if (transaction) {
    options.transaction = transaction;
  }

  const userCharacters = await UserCharacter.findAll(options);

  return userCharacters.map(uc => ({
    id: uc.CharacterId,
    rarity: uc.Character?.rarity || 'common',
    element: uc.Character?.element || 'neutral'
  }));
}

// ===========================================
// BOSS ENCOUNTERS
// ===========================================

/**
 * POST /boss/spawn
 * Spawn a boss encounter
 */
router.post('/spawn', createRoute({
  execute: async (ctx) => {
    const result = essenceTapService.spawnBoss(ctx.state);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        errorData: {
          cooldownRemaining: result.cooldownRemaining,
          clicksUntilSpawn: result.clicksUntilSpawn
        }
      };
    }

    return {
      success: true,
      newState: result.newState,
      data: {
        boss: result.boss,
        bossEncounter: result.newState.bossEncounter
      }
    };
  }
}));

/**
 * POST /boss/attack
 * Attack the current boss
 */
router.post('/attack', createRoute({
  validate: (body) => {
    if (body.damage === undefined || body.damage < 0) {
      return 'Valid damage value required';
    }
    return null;
  },
  execute: async (ctx) => {
    const { damage } = ctx.body;

    // Get user's characters for damage calculation
    const characters = await getUserCharacters(ctx.user.id, ctx.transaction);

    const result = essenceTapService.attackBoss(ctx.state, damage, characters);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const responseData = {
      damage: result.damage,
      currentHealth: result.currentHealth,
      defeated: result.defeated,
      bossEncounter: result.newState.bossEncounter
    };

    if (result.defeated && result.reward) {
      responseData.reward = result.reward;
      responseData.essence = result.newState.essence;
    }

    return {
      success: true,
      newState: result.newState,
      fatePointsToAward: result.reward?.fatePoints,
      rollTicketsToAward: result.reward?.rollTickets,
      data: responseData
    };
  }
}));

/**
 * GET /boss/status
 * Get current boss encounter status
 */
router.get('/status', createGetRoute((state) => {
  return essenceTapService.getBossEncounterInfo(state);
}));

/**
 * POST /boss/rewards/claim
 * Claim boss reward (if not auto-claimed)
 */
router.post('/rewards/claim', createRoute({
  execute: async (ctx) => {
    const result = essenceTapService.claimBossReward(ctx.state);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      newState: result.newState,
      fatePointsToAward: result.reward?.fatePoints,
      rollTicketsToAward: result.reward?.rollTickets,
      data: {
        reward: result.reward,
        essence: result.newState.essence,
        bossEncounter: result.newState.bossEncounter
      }
    };
  }
}));

module.exports = router;
