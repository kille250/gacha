/**
 * Boss Handlers - Boss encounter operations
 */

const { createHandler } = require('../createHandler');
const essenceTapService = require('../../../services/essenceTapService');

/**
 * Handle boss spawn
 */
const handleSpawnBoss = createHandler({
  eventName: 'boss_spawned',
  errorCode: 'BOSS_SPAWN_ERROR',
  execute: async (ctx) => {
    const result = essenceTapService.spawnBoss(ctx.state);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        rejectData: {
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
});

/**
 * Handle boss attack
 */
const handleAttackBoss = createHandler({
  eventName: 'boss_attacked',
  errorCode: 'BOSS_ATTACK_ERROR',
  execute: async (ctx, data) => {
    const { damage } = data;

    const result = essenceTapService.attackBoss(ctx.state, damage);

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
});

/**
 * Handle claiming boss reward (if not auto-claimed)
 */
const handleClaimBossReward = createHandler({
  eventName: 'boss_reward_claimed',
  errorCode: 'BOSS_REWARD_ERROR',
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
});

module.exports = {
  handleSpawnBoss,
  handleAttackBoss,
  handleClaimBossReward
};
