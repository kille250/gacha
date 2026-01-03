/**
 * Essence Tap Unified Handlers
 *
 * Single implementation of game operations used by both REST and WebSocket endpoints.
 * Eliminates code duplication between routes/essenceTap.js and websocket/essenceTapHandler.js.
 */

const essenceTapService = require('../../services/essenceTapService');
const { withUserTransaction, getClickerState, setClickerState } = require('../../utils/essenceTap/transaction');
const { successResult, errorResult } = require('../../utils/essenceTap/errors');

/**
 * Get full game state for a user
 */
async function handleGetState(userId, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    // Initialize if needed
    if (!state || Object.keys(state).length === 0) {
      state = essenceTapService.getInitialState();
      setClickerState(user, state);
    }

    // Reset daily if needed
    state = essenceTapService.resetDaily(state);

    // Calculate offline progress
    const offlineResult = essenceTapService.calculateOfflineProgress(state);
    if (offlineResult.essenceEarned > 0) {
      state = offlineResult.newState;
    }

    setClickerState(user, state);

    const gameState = essenceTapService.getGameState(state, userCharacters);

    return successResult({
      gameState,
      offlineProgress: offlineResult.essenceEarned > 0 ? {
        essenceEarned: offlineResult.essenceEarned,
        duration: offlineResult.duration
      } : null
    });
  });
}

/**
 * Process click/tap action
 */
async function handleClick(userId, { count = 1, comboMultiplier = 1 }, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);
    state = essenceTapService.resetDaily(state);

    const clickPower = essenceTapService.calculateClickPower(state, userCharacters);
    const critChance = essenceTapService.calculateCritChance(state, userCharacters);
    const critMultiplier = essenceTapService.calculateCritMultiplier(state);

    let totalEssence = 0;
    let crits = 0;
    let goldenClicks = 0;

    for (let i = 0; i < count; i++) {
      const result = essenceTapService.processClick(state, userCharacters, comboMultiplier);
      state = result.newState;
      totalEssence += result.essenceGained;
      if (result.isCrit) crits++;
      if (result.isGolden) goldenClicks++;
    }

    // Update weekly tournament progress
    const weeklyResult = essenceTapService.updateWeeklyProgress(state, totalEssence);
    state = weeklyResult.newState;

    // Check daily challenges
    const completedChallenges = essenceTapService.checkDailyChallenges(state);

    setClickerState(user, state);

    return successResult({
      essence: state.essence,
      lifetimeEssence: state.lifetimeEssence,
      totalClicks: state.totalClicks,
      essenceGained: totalEssence,
      crits,
      goldenClicks,
      clickPower,
      critChance,
      critMultiplier,
      completedChallenges: completedChallenges.map(c => ({ id: c.id, name: c.name }))
    });
  });
}

/**
 * Purchase a generator
 */
async function handlePurchaseGenerator(userId, { generatorId, count = 1 }, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.purchaseGenerator(state, generatorId, count);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      essence: state.essence,
      generator: result.generator,
      newCount: result.newCount,
      cost: result.cost,
      generators: essenceTapService.getAvailableGenerators(state),
      productionPerSecond: essenceTapService.calculateProductionPerSecond(state, userCharacters)
    });
  });
}

/**
 * Purchase an upgrade
 */
async function handlePurchaseUpgrade(userId, { upgradeId }, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.purchaseUpgrade(state, upgradeId);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      essence: state.essence,
      upgrade: result.upgrade,
      upgrades: essenceTapService.getAvailableUpgrades(state),
      clickPower: essenceTapService.calculateClickPower(state, userCharacters),
      productionPerSecond: essenceTapService.calculateProductionPerSecond(state, userCharacters)
    });
  });
}

/**
 * Perform prestige (awakening)
 */
async function handlePrestige(userId, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.performPrestige(state);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;

    // Apply FP reward with weekly cap
    let fatePointsReward = 0;
    const prestigeLevel = state.prestigeLevel || 1;
    const fpReward = essenceTapService.PRESTIGE_FATE_REWARDS?.[prestigeLevel];
    if (fpReward) {
      const capResult = essenceTapService.applyFPWithCap(state, fpReward, 'prestige');
      state = capResult.newState;
      fatePointsReward = capResult.awarded;
      user.fatePoints = (user.fatePoints || 0) + fatePointsReward;
    }

    setClickerState(user, state);

    return successResult({
      shardsEarned: result.shardsEarned,
      prestigeLevel: state.prestigeLevel,
      totalShards: state.prestigeShards,
      lifetimeShards: state.lifetimeShards,
      fatePointsReward,
      gameState: essenceTapService.getGameState(state, userCharacters)
    });
  });
}

/**
 * Purchase prestige upgrade
 */
async function handlePurchasePrestigeUpgrade(userId, { upgradeId }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.purchasePrestigeUpgrade(state, upgradeId);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      upgrade: result.upgrade,
      newLevel: result.newLevel,
      cost: result.cost,
      remainingShards: state.prestigeShards,
      prestige: essenceTapService.getPrestigeInfo(state)
    });
  });
}

/**
 * Activate an ability
 */
async function handleActivateAbility(userId, { abilityId }, _userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.activateAbility(state, abilityId);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      ability: result.ability,
      duration: result.duration,
      effects: result.effects,
      bonusEssence: result.bonusEssence,
      essence: state.essence,
      activeAbilities: essenceTapService.getActiveAbilitiesInfo(state)
    });
  });
}

/**
 * Perform gamble
 */
async function handleGamble(userId, { betType, betAmount }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.performGamble(state, betType, betAmount);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;

    // Contribute to jackpot
    await essenceTapService.contributeToJackpot(state, result.betAmount, userId);

    // Check for jackpot win
    let jackpotWin = null;
    const jackpotResult = await essenceTapService.checkJackpotWin(state, result.betAmount, betType);
    if (jackpotResult.won) {
      state.essence += jackpotResult.amount;
      state.lifetimeEssence += jackpotResult.amount;
      jackpotWin = jackpotResult.amount;

      // Award jackpot FP and tickets
      if (jackpotResult.rewards) {
        const fpCapResult = essenceTapService.applyFPWithCap(state, jackpotResult.rewards.fatePoints || 0, 'jackpot');
        state = fpCapResult.newState;
        user.fatePoints = (user.fatePoints || 0) + fpCapResult.awarded;
        user.rollTickets = (user.rollTickets || 0) + (jackpotResult.rewards.rollTickets || 0);
      }

      await essenceTapService.resetJackpot(state, userId, jackpotResult.amount);
    }

    setClickerState(user, state);

    return successResult({
      won: result.won,
      betAmount: result.betAmount,
      betType: result.betType,
      essenceChange: result.essenceChange,
      newEssence: state.essence,
      jackpotWin,
      gamble: essenceTapService.getGambleInfo(state)
    });
  });
}

/**
 * Perform infusion
 */
async function handleInfusion(userId) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.performInfusion(state);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      cost: result.cost,
      bonusGained: result.bonusGained,
      totalBonus: result.totalBonus,
      infusionCount: result.infusionCount,
      essence: state.essence
    });
  });
}

/**
 * Assign character
 */
async function handleAssignCharacter(userId, { characterId }, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.assignCharacter(state, characterId, userCharacters);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      assignedCharacters: state.assignedCharacters,
      characterBonus: essenceTapService.calculateCharacterBonus(state, userCharacters),
      elementBonuses: essenceTapService.calculateElementBonuses(state, userCharacters),
      elementSynergy: essenceTapService.calculateElementSynergy(state, userCharacters),
      seriesSynergy: essenceTapService.calculateSeriesSynergy(state, userCharacters),
      clickPower: essenceTapService.calculateClickPower(state, userCharacters),
      productionPerSecond: essenceTapService.calculateProductionPerSecond(state, userCharacters)
    });
  });
}

/**
 * Unassign character
 */
async function handleUnassignCharacter(userId, { characterId }, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.unassignCharacter(state, characterId);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      assignedCharacters: state.assignedCharacters,
      characterBonus: essenceTapService.calculateCharacterBonus(state, userCharacters),
      clickPower: essenceTapService.calculateClickPower(state, userCharacters),
      productionPerSecond: essenceTapService.calculateProductionPerSecond(state, userCharacters)
    });
  });
}

/**
 * Claim milestone
 */
async function handleClaimMilestone(userId, { milestoneKey }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.claimMilestone(state, milestoneKey);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;

    // Apply FP with cap
    const fpCapResult = essenceTapService.applyFPWithCap(state, result.fatePoints, 'milestone');
    state = fpCapResult.newState;
    user.fatePoints = (user.fatePoints || 0) + fpCapResult.awarded;

    setClickerState(user, state);

    return successResult({
      fatePoints: fpCapResult.awarded,
      wasLimited: fpCapResult.limited,
      claimedMilestones: state.claimedMilestones,
      claimableMilestones: essenceTapService.checkMilestones(state)
    });
  });
}

/**
 * Claim repeatable milestone
 */
async function handleClaimRepeatableMilestone(userId, { milestoneType }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.claimRepeatableMilestone(state, milestoneType);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;

    // Apply FP with cap
    const fpCapResult = essenceTapService.applyFPWithCap(state, result.fatePoints, 'repeatable_milestone');
    state = fpCapResult.newState;
    user.fatePoints = (user.fatePoints || 0) + fpCapResult.awarded;

    setClickerState(user, state);

    return successResult({
      fatePoints: fpCapResult.awarded,
      wasLimited: fpCapResult.limited,
      claimableRepeatableMilestones: essenceTapService.checkRepeatableMilestones(state)
    });
  });
}

/**
 * Claim daily challenge
 */
async function handleClaimDailyChallenge(userId, { challengeId }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.claimDailyChallenge(state, challengeId);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      rewards: result.rewards,
      challenge: result.challenge,
      essence: state.essence,
      dailyChallenges: essenceTapService.getDailyChallengesWithProgress(state)
    });
  });
}

/**
 * Claim tournament rewards
 */
async function handleClaimTournamentRewards(userId) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.claimWeeklyRewards(state);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;

    // Apply FP with cap
    const fatePoints = result.rewards.fatePoints || 0;
    const fpCapResult = essenceTapService.applyFPWithCap(state, fatePoints, 'tournament');
    state = fpCapResult.newState;
    user.fatePoints = (user.fatePoints || 0) + fpCapResult.awarded;
    user.rollTickets = (user.rollTickets || 0) + (result.rewards.rollTickets || 0);

    setClickerState(user, state);

    return successResult({
      tier: result.tier,
      rewards: {
        ...result.rewards,
        fatePoints: fpCapResult.awarded
      },
      breakdown: result.breakdown,
      wasLimited: fpCapResult.limited
    });
  });
}

/**
 * Claim tournament checkpoint
 */
async function handleClaimTournamentCheckpoint(userId, { day }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.claimTournamentCheckpoint(state, day);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;

    // Apply FP with cap
    const fatePoints = result.rewards?.fatePoints || 0;
    const fpCapResult = essenceTapService.applyFPWithCap(state, fatePoints, 'checkpoint');
    state = fpCapResult.newState;
    user.fatePoints = (user.fatePoints || 0) + fpCapResult.awarded;
    user.rollTickets = (user.rollTickets || 0) + (result.rewards?.rollTickets || 0);

    setClickerState(user, state);

    return successResult({
      checkpointName: result.checkpointName,
      day: result.day,
      rewards: {
        ...result.rewards,
        fatePoints: fpCapResult.awarded
      },
      claimedCheckpoints: state.weekly?.checkpointsClaimed || [],
      wasLimited: fpCapResult.limited
    });
  });
}

/**
 * Claim daily streak
 */
async function handleClaimDailyStreak(userId) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.checkDailyStreakTickets(state);
    state = result.newState;

    if (result.awarded) {
      user.rollTickets = (user.rollTickets || 0) + result.tickets;
    }

    setClickerState(user, state);

    return successResult({
      awarded: result.awarded,
      tickets: result.tickets || 0,
      streakDays: result.streakDays,
      nextMilestone: result.nextMilestone,
      ticketGeneration: state.ticketGeneration
    });
  });
}

/**
 * Exchange FP for tickets
 */
async function handleExchangeFPForTickets(userId) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.exchangeFatePointsForTickets(state, user.fatePoints || 0);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    user.fatePoints = (user.fatePoints || 0) - result.fatePointsCost;
    user.rollTickets = (user.rollTickets || 0) + result.ticketsReceived;

    setClickerState(user, state);

    return successResult({
      fatePointsCost: result.fatePointsCost,
      ticketsReceived: result.ticketsReceived,
      exchangesRemaining: result.exchangesRemaining,
      ticketGeneration: state.ticketGeneration
    });
  });
}

/**
 * Claim session milestone
 */
async function handleClaimSessionMilestone(userId, { milestoneType, milestoneName }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    // Determine which milestone check to use
    let milestones;
    let claimedKey;

    if (milestoneType === 'session') {
      milestones = essenceTapService.checkSessionMilestones(state);
      claimedKey = 'claimedSessionMilestones';
    } else if (milestoneType === 'combo') {
      milestones = essenceTapService.checkComboMilestones(state);
      claimedKey = 'claimedComboMilestones';
    } else if (milestoneType === 'crit') {
      milestones = essenceTapService.checkCritStreakMilestones(state);
      claimedKey = 'claimedCritMilestones';
    } else {
      return errorResult('Invalid milestone type');
    }

    const milestone = milestones.find(m => m.name === milestoneName && !m.claimed && m.reached);
    if (!milestone) {
      return errorResult('Milestone not claimable');
    }

    // Mark as claimed
    state.sessionStats = state.sessionStats || {};
    state.sessionStats[claimedKey] = [...(state.sessionStats[claimedKey] || []), milestoneName];

    // Apply reward
    if (milestone.reward?.essence) {
      state.essence = (state.essence || 0) + milestone.reward.essence;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + milestone.reward.essence;
    }

    setClickerState(user, state);

    return successResult({
      milestoneName,
      reward: milestone.reward,
      essence: state.essence,
      sessionStats: state.sessionStats
    });
  });
}

/**
 * Spawn boss encounter
 */
async function handleSpawnBoss(userId) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.spawnBoss(state);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      boss: result.boss,
      currentHealth: state.bossEncounter.currentHealth,
      maxHealth: state.bossEncounter.maxHealth,
      expiresAt: state.bossEncounter.expiresAt,
      timeLimit: result.boss.timeLimit
    });
  });
}

/**
 * Attack boss
 */
async function handleAttackBoss(userId, { damage }, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.attackBoss(state, damage, userCharacters);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;

    // Handle boss rewards
    if (result.defeated && result.rewards) {
      state.essence = (state.essence || 0) + result.rewards.essence;
      state.lifetimeEssence = (state.lifetimeEssence || 0) + result.rewards.essence;

      // Apply FP with cap
      if (result.rewards.fatePoints) {
        const fpCapResult = essenceTapService.applyFPWithCap(state, result.rewards.fatePoints, 'boss');
        state = fpCapResult.newState;
        user.fatePoints = (user.fatePoints || 0) + fpCapResult.awarded;
      }

      if (result.rewards.rollTickets) {
        user.rollTickets = (user.rollTickets || 0) + result.rewards.rollTickets;
      }
    }

    setClickerState(user, state);

    return successResult({
      damageDealt: result.damageDealt,
      bossHealth: result.bossHealth,
      defeated: result.defeated,
      bossSpawned: result.bossSpawned,
      boss: result.boss,
      rewards: result.rewards,
      timeRemaining: result.timeRemaining,
      essence: state.essence,
      lifetimeEssence: state.lifetimeEssence,
      bossEncounter: essenceTapService.getBossEncounterInfo(state)
    });
  });
}

/**
 * Get boss status
 */
async function handleGetBossStatus(userId) {
  return withUserTransaction(userId, async (user) => {
    const state = getClickerState(user);
    const bossInfo = essenceTapService.getBossEncounterInfo(state);

    return successResult(bossInfo);
  }, { saveUser: false });
}

/**
 * Swap character
 */
async function handleSwapCharacter(userId, { oldCharacterId, newCharacterId }, userCharacters = []) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    // Unassign old character
    if (oldCharacterId) {
      const unassignResult = essenceTapService.unassignCharacter(state, oldCharacterId);
      if (unassignResult.success) {
        state = unassignResult.newState;
      }
    }

    // Assign new character
    const assignResult = essenceTapService.assignCharacter(state, newCharacterId, userCharacters);
    if (!assignResult.success) {
      return errorResult(assignResult.error);
    }

    state = assignResult.newState;
    setClickerState(user, state);

    return successResult({
      oldCharacterId,
      newCharacterId,
      assignedCharacters: state.assignedCharacters,
      characterBonus: essenceTapService.calculateCharacterBonus(state, userCharacters),
      elementBonuses: essenceTapService.calculateElementBonuses(state, userCharacters),
      elementSynergy: essenceTapService.calculateElementSynergy(state, userCharacters),
      seriesSynergy: essenceTapService.calculateSeriesSynergy(state, userCharacters),
      masteryBonus: essenceTapService.calculateTotalMasteryBonus(state),
      clickPower: essenceTapService.calculateClickPower(state, userCharacters),
      productionPerSecond: essenceTapService.calculateProductionPerSecond(state, userCharacters)
    });
  });
}

/**
 * Equip tournament cosmetic
 */
async function handleEquipCosmetic(userId, { cosmeticId }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.equipTournamentCosmetic(state, cosmeticId);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      equippedSlot: result.equippedSlot,
      cosmetics: state.tournament?.cosmetics
    });
  });
}

/**
 * Unequip tournament cosmetic
 */
async function handleUnequipCosmetic(userId, { slot }) {
  return withUserTransaction(userId, async (user) => {
    let state = getClickerState(user);

    const result = essenceTapService.unequipTournamentCosmetic(state, slot);
    if (!result.success) {
      return errorResult(result.error);
    }

    state = result.newState;
    setClickerState(user, state);

    return successResult({
      cosmetics: state.tournament?.cosmetics
    });
  });
}

module.exports = {
  handleGetState,
  handleClick,
  handlePurchaseGenerator,
  handlePurchaseUpgrade,
  handlePrestige,
  handlePurchasePrestigeUpgrade,
  handleActivateAbility,
  handleGamble,
  handleInfusion,
  handleAssignCharacter,
  handleUnassignCharacter,
  handleClaimMilestone,
  handleClaimRepeatableMilestone,
  handleClaimDailyChallenge,
  handleClaimTournamentRewards,
  handleClaimTournamentCheckpoint,
  handleClaimDailyStreak,
  handleExchangeFPForTickets,
  handleClaimSessionMilestone,
  handleSpawnBoss,
  handleAttackBoss,
  handleGetBossStatus,
  handleSwapCharacter,
  handleEquipCosmetic,
  handleUnequipCosmetic
};
