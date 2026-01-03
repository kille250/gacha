/**
 * Boss Action
 *
 * Unified boss encounter handling for REST and WebSocket.
 * Delegates to boss.service.js for business logic.
 */

const bossService = require('../domains/boss.service');
const { applyFPWithCap } = require('../shared');

/**
 * Boss action result
 * @typedef {Object} BossResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {Object} [boss] - Boss data
 * @property {number} [damageDealt] - Damage dealt
 * @property {number} [bossHealth] - Current boss health
 * @property {boolean} [defeated] - Whether boss was defeated
 * @property {Object} [rewards] - Rewards if defeated
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Spawn a boss encounter
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @returns {BossResult} Spawn result
 */
function spawnBoss({ state }) {
  const result = bossService.spawnBoss(state);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error),
      cooldownRemaining: result.cooldownRemaining,
      clicksUntilSpawn: result.clicksUntilSpawn
    };
  }

  result.newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState: result.newState,
    boss: result.boss,
    currentHealth: result.newState.bossEncounter.currentHealth,
    maxHealth: result.newState.bossEncounter.maxHealth,
    expiresAt: result.newState.bossEncounter.expiresAt,
    timeLimit: result.boss.timeLimit
  };
}

/**
 * Attack the current boss
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {number} [params.damage] - Base damage from clicks
 * @param {Array} [params.characters] - User's characters
 * @returns {BossResult} Attack result with userChanges for rewards
 */
function attackBoss({ state, damage, characters = [] }) {
  const result = bossService.attackBoss(state, damage, characters);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: mapErrorToCode(result.error)
    };
  }

  let newState = result.newState;
  newState.lastOnlineTimestamp = Date.now();

  const userChanges = {};
  const rewards = { ...(result.rewards || {}) };

  // If boss was defeated, process rewards
  if (result.defeated && result.rewards) {
    // Apply essence reward
    if (result.rewards.essence) {
      newState.essence = (newState.essence || 0) + result.rewards.essence;
      newState.lifetimeEssence = (newState.lifetimeEssence || 0) + result.rewards.essence;
    }

    // Apply FP with cap
    if (result.rewards.fatePoints && result.rewards.fatePoints > 0) {
      const fpResult = applyFPWithCap(newState, result.rewards.fatePoints, 'boss_defeat');
      newState = fpResult.newState;
      if (fpResult.actualFP > 0) {
        userChanges.fatePoints = fpResult.actualFP;
      }
      rewards.fatePointsAwarded = fpResult.actualFP;
      rewards.fatePointsCapped = fpResult.capped;
    }

    // Track ticket rewards
    if (result.rewards.rollTickets && result.rewards.rollTickets > 0) {
      userChanges.rollTickets = result.rewards.rollTickets;
    }

    // Track XP rewards
    if (result.rewards.xp && result.rewards.xp > 0) {
      userChanges.xp = result.rewards.xp;
    }
  }

  return {
    success: true,
    newState,
    damageDealt: result.damageDealt,
    bossHealth: result.bossHealth,
    defeated: result.defeated,
    rewards,
    userChanges,
    timeRemaining: result.timeRemaining,
    bossSpawned: result.bossSpawned,
    boss: result.boss,
    nextBossIn: result.nextBossIn
  };
}

/**
 * Get boss encounter info
 * @param {Object} state - Current state
 * @returns {Object} Boss info
 */
function getBossInfo(state) {
  return bossService.getBossInfo(state);
}

/**
 * Check if a boss is active
 * @param {Object} state - Current state
 * @returns {boolean} True if boss is active
 */
function isBossActive(state) {
  return bossService.isBossActive(state);
}

/**
 * Map error message to error code
 * @param {string} error - Error message
 * @returns {string} Error code
 */
function mapErrorToCode(error) {
  if (error.includes('cooldown')) return 'BOSS_COOLDOWN';
  if (error.includes('Not enough clicks')) return 'INSUFFICIENT_CLICKS';
  if (error.includes('No active boss')) return 'NO_ACTIVE_BOSS';
  if (error.includes('Invalid boss')) return 'INVALID_BOSS';
  return 'BOSS_ACTION_FAILED';
}

module.exports = {
  spawnBoss,
  attackBoss,
  getBossInfo,
  isBossActive
};
