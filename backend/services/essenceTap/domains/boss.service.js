/**
 * Boss Service
 *
 * Handles boss encounter mechanics for Essence Tap.
 * Includes spawning, attacking, and reward claiming for boss encounters.
 */

const { BOSS_CONFIG } = require('../../../config/essenceTap');

// Import element derivation helper from legacy service
// TODO: Move this to a shared utility module
const legacyService = require('../../essenceTapService');
const getCharacterElement = legacyService.getCharacterElement;

/**
 * Get appropriate boss tier for prestige level (pure helper)
 * @param {number} prestigeLevel - Current prestige level
 * @returns {Object} Boss data
 */
function getBossForPrestigeLevel(prestigeLevel) {
  // Higher prestige = access to harder bosses
  let maxTier = 1;
  if (prestigeLevel >= 5) maxTier = 4;
  else if (prestigeLevel >= 3) maxTier = 3;
  else if (prestigeLevel >= 1) maxTier = 2;

  // Random tier up to max
  const tier = Math.floor(Math.random() * maxTier) + 1;
  return BOSS_CONFIG.bosses.find(b => b.tier === tier) || BOSS_CONFIG.bosses[0];
}

/**
 * Calculate boss health based on prestige (pure helper)
 * @param {number} baseHealth - Base health of boss
 * @param {number} prestigeLevel - Current prestige level
 * @returns {number} Scaled health
 */
function calculateBossHealth(baseHealth, prestigeLevel) {
  const healthMultiplier = 1 + (prestigeLevel || 0) * 0.5;
  return Math.floor(baseHealth * healthMultiplier);
}

/**
 * Get boss encounter info
 * @param {Object} state - Current state
 * @returns {Object} Boss encounter status
 */
function getBossInfo(state) {
  const now = Date.now();
  const bossState = state.bossEncounter || {};

  // Check if there's an active boss
  if (bossState.active && bossState.expiresAt > now) {
    const boss = BOSS_CONFIG.bosses.find(b => b.id === bossState.bossId);
    return {
      active: true,
      boss: boss,
      currentHealth: bossState.currentHealth,
      maxHealth: bossState.maxHealth,
      timeRemaining: Math.max(0, bossState.expiresAt - now),
      damageDealt: bossState.damageDealt || 0
    };
  }

  // Check if on cooldown
  const lastDefeat = bossState.lastDefeatTime || 0;
  const cooldownRemaining = Math.max(0, (lastDefeat + BOSS_CONFIG.cooldownMs) - now);

  // Check if eligible to spawn a new boss
  const clicksSinceLastBoss = (state.totalClicks || 0) - (bossState.clicksAtLastSpawn || 0);
  const canSpawn = clicksSinceLastBoss >= BOSS_CONFIG.spawnInterval && cooldownRemaining === 0;

  // Auto-spawn if eligible
  if (canSpawn) {
    return {
      active: false,
      canSpawn: true,
      nextBossTier: getBossForPrestigeLevel(state.prestigeLevel || 0),
      cooldownRemaining: 0,
      clicksUntilSpawn: 0
    };
  }

  return {
    active: false,
    canSpawn: false,
    cooldownRemaining,
    clicksUntilSpawn: Math.max(0, BOSS_CONFIG.spawnInterval - clicksSinceLastBoss)
  };
}

/**
 * Check if a boss is currently active
 * @param {Object} state - Current state
 * @returns {boolean} True if boss is active
 */
function isBossActive(state) {
  const now = Date.now();
  const bossState = state.bossEncounter || {};
  return bossState.active && bossState.expiresAt > now;
}

/**
 * Spawn a boss encounter
 * @param {Object} state - Current state
 * @returns {Object} Result { success, newState?, error?, boss?, cooldownRemaining?, clicksUntilSpawn? }
 */
function spawnBoss(state) {
  const now = Date.now();
  const bossState = state.bossEncounter || {};

  // Check cooldown - cannot spawn if on cooldown
  const lastDefeat = bossState.lastDefeatTime || 0;
  const cooldownRemaining = Math.max(0, (lastDefeat + BOSS_CONFIG.cooldownMs) - now);
  if (cooldownRemaining > 0) {
    return {
      success: false,
      error: 'Boss on cooldown',
      cooldownRemaining
    };
  }

  // Check click requirement
  const clicksSinceLastBoss = (state.totalClicks || 0) - (bossState.clicksAtLastSpawn || 0);
  if (clicksSinceLastBoss < BOSS_CONFIG.spawnInterval) {
    return {
      success: false,
      error: 'Not enough clicks to spawn boss',
      clicksUntilSpawn: BOSS_CONFIG.spawnInterval - clicksSinceLastBoss
    };
  }

  const boss = getBossForPrestigeLevel(state.prestigeLevel || 0);

  // Scale health with prestige
  const maxHealth = calculateBossHealth(boss.baseHealth, state.prestigeLevel || 0);

  const newState = { ...state };
  newState.bossEncounter = {
    ...bossState,
    active: true,
    bossId: boss.id,
    currentHealth: maxHealth,
    maxHealth: maxHealth,
    expiresAt: now + boss.timeLimit,
    spawnedAt: now,
    clicksAtLastSpawn: state.totalClicks || 0,
    damageDealt: 0
    // Preserve lastDefeatTime and totalDefeated from previous state
  };

  return {
    success: true,
    newState,
    boss
  };
}

/**
 * Attack the current boss
 * @param {Object} state - Current state
 * @param {number} damage - Base damage from clicks
 * @param {Array} characters - User's characters (optional, for damage bonuses)
 * @returns {Object} Result { success, newState?, error?, damageDealt?, bossHealth?, defeated?, rewards?, bossSpawned?, boss? }
 */
function attackBoss(state, damage, characters = []) {
  const now = Date.now();
  const bossState = state.bossEncounter || {};

  // Check if boss should spawn first
  if (!bossState.active || bossState.expiresAt <= now) {
    // Try to spawn a new boss
    const spawnResult = spawnBoss(state);
    if (spawnResult.success) {
      return {
        success: true,
        newState: spawnResult.newState,
        damageDealt: 0,
        bossHealth: spawnResult.newState.bossEncounter.currentHealth,
        defeated: false,
        bossSpawned: true,
        boss: spawnResult.boss
      };
    }
    return { success: false, error: 'No active boss encounter' };
  }

  const boss = BOSS_CONFIG.bosses.find(b => b.id === bossState.bossId);
  if (!boss) {
    return { success: false, error: 'Invalid boss' };
  }

  // Calculate actual damage with bonuses
  let totalDamage = damage || state.clickPower || 1;

  // Apply character damage bonuses
  const assignedChars = state.assignedCharacters || [];
  for (const charId of assignedChars) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (!char) continue;

    // Rarity bonus
    const rarityBonus = BOSS_CONFIG.rarityDamageBonus[char.rarity] || 1.0;
    totalDamage *= rarityBonus;

    // Element weakness bonus
    const charElement = getCharacterElement(char);
    if (boss.elementWeakness && charElement === boss.elementWeakness) {
      totalDamage *= BOSS_CONFIG.weaknessMultiplier;
    }
  }

  totalDamage = Math.floor(totalDamage);

  const newState = { ...state };
  const newHealth = Math.max(0, bossState.currentHealth - totalDamage);

  newState.bossEncounter = {
    ...bossState,
    currentHealth: newHealth,
    damageDealt: (bossState.damageDealt || 0) + totalDamage
  };

  // Check if boss defeated
  if (newHealth <= 0) {
    // Scale rewards with prestige
    const rewardMultiplier = 1 + (state.prestigeLevel || 0) * 0.25;
    const scaledRewards = {
      essence: Math.floor((boss.rewards.essence || 0) * rewardMultiplier),
      fatePoints: boss.rewards.fatePoints || 0,
      rollTickets: boss.rewards.rollTickets || 0,
      prismaticEssence: boss.rewards.prismaticEssence || 0,
      xp: boss.rewards.xp || 0
    };

    // Update boss state
    newState.bossEncounter = {
      active: false,
      lastDefeatTime: now,
      clicksAtLastSpawn: state.totalClicks || 0,
      totalDefeated: (bossState.totalDefeated || 0) + 1
    };

    // Track stats
    newState.stats = {
      ...newState.stats,
      bossesDefeated: (newState.stats?.bossesDefeated || 0) + 1
    };

    return {
      success: true,
      newState,
      damageDealt: totalDamage,
      bossHealth: 0,
      defeated: true,
      rewards: scaledRewards,
      nextBossIn: BOSS_CONFIG.cooldownMs
    };
  }

  return {
    success: true,
    newState,
    damageDealt: totalDamage,
    bossHealth: newHealth,
    defeated: false,
    timeRemaining: bossState.expiresAt - now
  };
}

/**
 * Claim boss reward (placeholder for future implementation)
 * Currently rewards are auto-claimed on defeat in attackBoss
 * @param {Object} state - Current state
 * @returns {Object} Result
 */
function claimBossReward(_state) {
  // This function exists for API compatibility
  // Boss rewards are currently auto-claimed on defeat
  return {
    success: false,
    error: 'Boss rewards are automatically claimed on defeat'
  };
}

module.exports = {
  spawnBoss,
  attackBoss,
  claimBossReward,
  getBossInfo,
  isBossActive,
  calculateBossHealth,
  getBossForPrestigeLevel
};
