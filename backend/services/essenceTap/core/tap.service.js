/**
 * Tap Service - Tap/click processing
 */

const { GAME_CONFIG, DAILY_CHALLENGES } = require('../../../config/essenceTap');

/**
 * Process a single tap
 * @param {Object} state - Current state
 * @param {number} comboMultiplier - Current combo multiplier
 * @returns {Object} Result with updated state
 */
function processTap(state, comboMultiplier = 1) {
  const clickPower = state.clickPower || 1;
  const critChance = state.critChance || 0.01;
  const critMultiplier = state.critMultiplier || 10;
  const goldenChance = GAME_CONFIG.goldenEssenceChance || 0.001;
  const goldenMultiplier = GAME_CONFIG.goldenEssenceMultiplier || 100;

  // Determine click type
  const isCrit = Math.random() < critChance;
  const isGolden = Math.random() < goldenChance;

  // Calculate essence gained
  let essenceGained = Math.floor(clickPower * comboMultiplier);
  if (isCrit) essenceGained = Math.floor(essenceGained * critMultiplier);
  if (isGolden) essenceGained = Math.floor(essenceGained * goldenMultiplier);

  // Apply active ability multipliers
  const now = Date.now();
  for (const [_abilityId, ability] of Object.entries(state.abilities?.active || {})) {
    if (ability.endTime > now) {
      if (ability.effect === 'click_multiplier') {
        essenceGained = Math.floor(essenceGained * ability.multiplier);
      }
    }
  }

  // Update state
  const newState = {
    ...state,
    essence: (state.essence || 0) + essenceGained,
    lifetimeEssence: (state.lifetimeEssence || 0) + essenceGained,
    totalClicks: (state.totalClicks || 0) + 1,
    daily: {
      ...state.daily,
      clicks: (state.daily?.clicks || 0) + 1,
      crits: (state.daily?.crits || 0) + (isCrit ? 1 : 0),
      essenceEarned: (state.daily?.essenceEarned || 0) + essenceGained
    },
    sessionStats: {
      ...state.sessionStats,
      clicks: (state.sessionStats?.clicks || 0) + 1,
      essence: (state.sessionStats?.essence || 0) + essenceGained,
      critStreak: isCrit ? (state.sessionStats?.critStreak || 0) + 1 : 0,
      maxCritStreak: Math.max(
        state.sessionStats?.maxCritStreak || 0,
        isCrit ? (state.sessionStats?.critStreak || 0) + 1 : 0
      )
    },
    stats: {
      ...state.stats,
      goldenEssenceClicks: (state.stats?.goldenEssenceClicks || 0) + (isGolden ? 1 : 0)
    },
    bossEncounter: {
      ...state.bossEncounter,
      clicksSinceLastBoss: (state.bossEncounter?.clicksSinceLastBoss || 0) + 1
    }
  };

  return {
    success: true,
    newState,
    essenceGained,
    isCrit,
    isGolden,
    comboMultiplier
  };
}

/**
 * Process multiple taps (batched)
 * @param {Object} state - Current state
 * @param {number} count - Number of taps
 * @param {number} comboMultiplier - Average combo multiplier
 * @returns {Object} Result with updated state
 */
function processMultipleTaps(state, count, comboMultiplier = 1) {
  const clickPower = state.clickPower || 1;
  const critChance = state.critChance || 0.01;
  const critMultiplier = state.critMultiplier || 10;
  const goldenChance = GAME_CONFIG.goldenEssenceChance || 0.001;
  const goldenMultiplier = GAME_CONFIG.goldenEssenceMultiplier || 100;

  let totalEssence = 0;
  let totalCrits = 0;
  let totalGolden = 0;

  // Process each tap
  for (let i = 0; i < count; i++) {
    const isCrit = Math.random() < critChance;
    const isGolden = Math.random() < goldenChance;

    let essenceGained = Math.floor(clickPower * comboMultiplier);
    if (isCrit) {
      essenceGained = Math.floor(essenceGained * critMultiplier);
      totalCrits++;
    }
    if (isGolden) {
      essenceGained = Math.floor(essenceGained * goldenMultiplier);
      totalGolden++;
    }

    totalEssence += essenceGained;
  }

  // Apply active ability multipliers
  const now = Date.now();
  for (const ability of Object.values(state.abilities?.active || {})) {
    if (ability.endTime > now && ability.effect === 'click_multiplier') {
      totalEssence = Math.floor(totalEssence * ability.multiplier);
    }
  }

  // Check for completed challenges
  const completedChallenges = checkTapChallenges(state, count, totalEssence, totalCrits);

  // Update state
  const newState = {
    ...state,
    essence: (state.essence || 0) + totalEssence,
    lifetimeEssence: (state.lifetimeEssence || 0) + totalEssence,
    totalClicks: (state.totalClicks || 0) + count,
    daily: {
      ...state.daily,
      clicks: (state.daily?.clicks || 0) + count,
      crits: (state.daily?.crits || 0) + totalCrits,
      essenceEarned: (state.daily?.essenceEarned || 0) + totalEssence,
      completedChallenges: [
        ...(state.daily?.completedChallenges || []),
        ...completedChallenges.map(c => c.id)
      ]
    },
    sessionStats: {
      ...state.sessionStats,
      clicks: (state.sessionStats?.clicks || 0) + count,
      essence: (state.sessionStats?.essence || 0) + totalEssence
    },
    stats: {
      ...state.stats,
      goldenEssenceClicks: (state.stats?.goldenEssenceClicks || 0) + totalGolden
    },
    bossEncounter: {
      ...state.bossEncounter,
      clicksSinceLastBoss: (state.bossEncounter?.clicksSinceLastBoss || 0) + count
    }
  };

  return {
    success: true,
    newState,
    essenceGained: totalEssence,
    crits: totalCrits,
    golden: totalGolden,
    completedChallenges
  };
}

/**
 * Check if any tap-related challenges were completed
 * @param {Object} state - Current state
 * @param {number} newClicks - New clicks to add
 * @param {number} newEssence - New essence to add
 * @param {number} newCrits - New crits to add
 * @returns {Array} Newly completed challenges
 */
function checkTapChallenges(state, newClicks, newEssence, newCrits) {
  const completed = [];
  const alreadyCompleted = state.daily?.completedChallenges || [];

  const newTotalClicks = (state.daily?.clicks || 0) + newClicks;
  const newTotalEssence = (state.daily?.essenceEarned || 0) + newEssence;
  const newTotalCrits = (state.daily?.crits || 0) + newCrits;

  for (const challenge of DAILY_CHALLENGES) {
    if (alreadyCompleted.includes(challenge.id)) continue;

    let isComplete = false;

    switch (challenge.type) {
      case 'clicks':
        isComplete = newTotalClicks >= challenge.target;
        break;
      case 'crits':
        isComplete = newTotalCrits >= challenge.target;
        break;
      case 'essence_earned':
        isComplete = newTotalEssence >= challenge.target;
        break;
    }

    if (isComplete) {
      completed.push({
        id: challenge.id,
        name: challenge.name,
        type: challenge.type
      });
    }
  }

  return completed;
}

module.exports = {
  processTap,
  processMultipleTaps,
  checkTapChallenges
};
