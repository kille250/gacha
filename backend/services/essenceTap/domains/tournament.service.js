/**
 * Tournament Service
 *
 * Handles weekly tournament system including:
 * - Progress tracking and tier calculation
 * - Burning hour events
 * - Checkpoints and streaks
 * - Rank-based rewards
 * - Tournament cosmetics
 */

const {
  WEEKLY_TOURNAMENT,
  RANK_REWARDS,
  BRACKET_SYSTEM,
  DAILY_CHECKPOINTS,
  BURNING_HOURS,
  TOURNAMENT_STREAKS,
  TOURNAMENT_COSMETICS,
  UNDERDOG_MECHANICS
} = require('../../../config/essenceTap');

/**
 * Get current ISO week string (YYYY-WW)
 * @returns {string} ISO week identifier
 */
function getCurrentISOWeek() {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Get the end of the current ISO week (Sunday 23:59:59.999 UTC)
 * @returns {Date} End of current week
 */
function getWeekEndDate() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const endOfWeek = new Date(now);
  endOfWeek.setUTCDate(now.getUTCDate() + daysUntilSunday);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  return endOfWeek;
}

/**
 * Initialize tournament state for a new tournament or player
 * @param {Object} existingState - Existing tournament state (if any)
 * @returns {Object} Initialized tournament state
 */
function initializeTournamentState(existingState = {}) {
  return {
    essenceEarned: 0,
    bracket: existingState?.bracket || BRACKET_SYSTEM.defaultBracket,
    bracketRank: null,
    streak: existingState?.streak || 0,
    lastParticipationWeek: existingState?.lastParticipationWeek || null,
    totalTournamentsPlayed: existingState?.totalTournamentsPlayed || 0,
    bestRank: existingState?.bestRank || null,
    podiumFinishes: existingState?.podiumFinishes || 0,
    cosmetics: existingState?.cosmetics || { owned: [], equipped: {} }
  };
}

/**
 * Update weekly tournament progress
 * @param {Object} state - Current state
 * @param {number} essenceEarned - Base essence earned to add
 * @param {Object} options - Optional multiplier context { burningHourActive, bracketSize }
 * @returns {Object} { newState, adjustedEssence, multiplier, bonuses }
 */
function updateWeeklyProgress(state, essenceEarned, options = {}) {
  const currentWeek = getCurrentISOWeek();
  const newState = { ...state };

  // Ensure required state properties exist
  if (!newState.generators) newState.generators = state.generators || {};
  if (!newState.purchasedUpgrades) newState.purchasedUpgrades = state.purchasedUpgrades || [];
  if (!newState.daily) newState.daily = state.daily || {};
  if (!newState.stats) newState.stats = state.stats || {};

  // Initialize tournament state if needed
  if (!state.tournament) {
    newState.tournament = initializeTournamentState(state.tournament);
  }

  // Check if we need to reset for a new week
  if (state.weekly?.weekId !== currentWeek) {
    // Update streak before resetting
    const participated = (state.weekly?.essenceEarned || 0) >= TOURNAMENT_STREAKS.minimumEssenceToMaintain;
    const streakResult = updateStreak(state.tournament || {}, participated);

    newState.tournament = {
      ...initializeTournamentState(state.tournament),
      streak: streakResult.streak,
      lastParticipationWeek: streakResult.broken ? null : state.tournament?.lastParticipationWeek,
      totalTournamentsPlayed: (state.tournament?.totalTournamentsPlayed || 0) + (participated ? 1 : 0)
    };

    newState.weekly = {
      weekId: currentWeek,
      essenceEarned: 0,
      rank: null,
      bracketRank: null,
      rewardsClaimed: false,
      checkpointsClaimed: []
    };
  }

  // Calculate multipliers
  let totalMultiplier = 1.0;

  // Streak bonus
  const streakBonus = getStreakBonus(newState.tournament?.streak || 0);
  totalMultiplier += streakBonus;

  // Burning hour bonus (if active)
  if (options.burningHourActive) {
    totalMultiplier += (BURNING_HOURS.multiplier - 1);
  }

  // Underdog bonuses
  if (newState.tournament?.bracketRank && options.bracketSize) {
    const underdogBonuses = getUnderdogBonuses(newState.tournament, options.bracketSize);
    totalMultiplier += underdogBonuses.total;
  }

  // Cap multiplier
  totalMultiplier = Math.min(totalMultiplier, BURNING_HOURS.maxMultiplierStack);

  // Apply multiplier to essence
  const adjustedEssence = Math.floor(essenceEarned * totalMultiplier);

  newState.weekly = {
    ...newState.weekly,
    essenceEarned: (newState.weekly?.essenceEarned || 0) + adjustedEssence
  };

  // Update tournament essence as well
  if (newState.tournament) {
    newState.tournament.essenceEarned = newState.weekly.essenceEarned;
  }

  return {
    newState,
    adjustedEssence,
    multiplier: totalMultiplier,
    bonuses: {
      streak: streakBonus,
      burningHour: options.burningHourActive ? (BURNING_HOURS.multiplier - 1) : 0
    }
  };
}

/**
 * Get weekly tournament info
 * @param {Object} state - Current state
 * @returns {Object} Enhanced tournament info
 */
function getWeeklyTournamentInfo(state) {
  const currentWeek = getCurrentISOWeek();
  const isCurrentWeek = state.weekly?.weekId === currentWeek;

  // Calculate estimated tier based on essence earned
  let estimatedTier = null;
  const essenceEarned = isCurrentWeek ? (state.weekly?.essenceEarned || 0) : 0;

  for (const tier of WEEKLY_TOURNAMENT.tiers) {
    if (essenceEarned >= tier.minEssence) {
      estimatedTier = tier;
    }
  }

  // Get checkpoint status
  const checkpointsClaimed = state.weekly?.checkpointsClaimed || [];
  const checkpoints = getCheckpointStatus(essenceEarned, checkpointsClaimed);

  // Get streak info
  const streak = state.tournament?.streak || 0;
  const streakBonus = getStreakBonus(streak);

  // Get bracket info
  const bracket = state.tournament?.bracket || BRACKET_SYSTEM.defaultBracket;
  const bracketInfo = BRACKET_SYSTEM.brackets[bracket];

  return {
    weekId: currentWeek,
    essenceEarned,
    estimatedTier,
    tiers: WEEKLY_TOURNAMENT.tiers,
    rewards: WEEKLY_TOURNAMENT.rewards,
    isCurrentWeek,
    canClaimRewards: !isCurrentWeek && state.weekly?.weekId && !state.weekly?.rewardsClaimed,
    endsAt: getWeekEndDate().toISOString(),

    // v4.0 enhancements
    bracket,
    bracketInfo,
    bracketRank: state.weekly?.bracketRank || null,
    checkpoints,
    claimableCheckpoints: checkpoints.filter(c => c.claimable),
    streak,
    streakBonus,
    nextStreakMilestone: TOURNAMENT_STREAKS.milestones.find(m => m.weeks > streak),
    cosmetics: state.tournament?.cosmetics || { owned: [], equipped: {} },
    totalTournamentsPlayed: state.tournament?.totalTournamentsPlayed || 0,
    bestRank: state.tournament?.bestRank || null,
    podiumFinishes: state.tournament?.podiumFinishes || 0
  };
}

/**
 * Claim weekly tournament rewards
 * @param {Object} state - Current state
 * @returns {Object} Result with combined rewards
 */
function claimWeeklyRewards(state) {
  const currentWeek = getCurrentISOWeek();

  // Can only claim rewards from previous weeks
  if (state.weekly?.weekId === currentWeek) {
    return { success: false, error: 'Cannot claim rewards for current week' };
  }

  if (!state.weekly?.weekId) {
    return { success: false, error: 'No weekly data to claim' };
  }

  if (state.weekly?.rewardsClaimed) {
    return { success: false, error: 'Rewards already claimed' };
  }

  // Determine tier achieved
  const essenceEarned = state.weekly?.essenceEarned || 0;
  let achievedTier = null;

  for (const tier of WEEKLY_TOURNAMENT.tiers) {
    if (essenceEarned >= tier.minEssence) {
      achievedTier = tier;
    }
  }

  if (!achievedTier) {
    return { success: false, error: 'No tier achieved' };
  }

  // Calculate total rewards
  const tournamentState = {
    ...state.tournament,
    essenceEarned,
    bracketRank: state.weekly?.bracketRank || null,
    streak: state.tournament?.streak || 0
  };

  const totalRewards = calculateTotalRewards(tournamentState);

  const newState = { ...state };
  newState.weekly = {
    ...state.weekly,
    rewardsClaimed: true
  };

  // Update tournament state with new stats
  newState.tournament = {
    ...state.tournament,
    totalTournamentsPlayed: (state.tournament?.totalTournamentsPlayed || 0) + 1
  };

  // Update best rank if applicable
  const bracketRank = state.weekly?.bracketRank;
  if (bracketRank && (!newState.tournament.bestRank || bracketRank < newState.tournament.bestRank)) {
    newState.tournament.bestRank = bracketRank;
  }

  // Update podium finishes
  if (bracketRank && bracketRank <= 3) {
    newState.tournament.podiumFinishes = (newState.tournament.podiumFinishes || 0) + 1;
  }

  // Unlock cosmetics
  if (totalRewards.combined.cosmetics.length > 0) {
    const cosmeticResult = unlockCosmetics(newState.tournament, totalRewards.combined.cosmetics);
    newState.tournament.cosmetics = cosmeticResult.cosmetics;
  }

  return {
    success: true,
    newState,
    tier: achievedTier.name,
    rewards: totalRewards.combined,
    breakdown: {
      tierRewards: totalRewards.tierRewards,
      rankRewards: totalRewards.rankRewards,
      streakRewards: totalRewards.streakRewards
    },
    bracketRank,
    streak: tournamentState.streak
  };
}

/**
 * Claim a daily checkpoint reward
 * @param {Object} state - Current state
 * @param {number} day - Checkpoint day (1-7)
 * @returns {Object} Result with rewards
 */
function claimTournamentCheckpoint(state, day) {
  const currentWeek = getCurrentISOWeek();

  if (state.weekly?.weekId !== currentWeek) {
    return { success: false, error: 'No active tournament week' };
  }

  const tournamentState = {
    essenceEarned: state.weekly?.essenceEarned || 0,
    checkpointsClaimed: state.weekly?.checkpointsClaimed || []
  };

  const result = claimCheckpoint(tournamentState, day);

  if (!result.success) {
    return result;
  }

  const newState = { ...state };
  newState.weekly = {
    ...state.weekly,
    checkpointsClaimed: [...(state.weekly?.checkpointsClaimed || []), day]
  };

  return {
    success: true,
    newState,
    rewards: result.rewards,
    checkpointName: result.checkpointName,
    day
  };
}

/**
 * Get burning hour status
 * @returns {Object} Burning hour status
 */
function getBurningHourStatus() {
  const currentWeek = getCurrentISOWeek();
  const schedule = generateBurningHourSchedule(currentWeek);
  return getBurningHourStatusFromSchedule(schedule);
}

/**
 * Calculate tier based on essence earned
 * @param {number} essenceEarned - Total essence earned
 * @returns {Object|null} Tier object or null if no tier reached
 */
function calculateTier(essenceEarned) {
  let achievedTier = null;

  for (const tier of WEEKLY_TOURNAMENT.tiers) {
    if (essenceEarned >= tier.minEssence) {
      achievedTier = tier;
    }
  }

  return achievedTier;
}

/**
 * Get tournament rank (placeholder for leaderboard integration)
 * @param {Object} state - Current state
 * @returns {Object} Rank information
 */
function getTournamentRank(state) {
  // This is a placeholder - in production this would query the leaderboard
  return {
    globalRank: null,
    bracketRank: state.weekly?.bracketRank || null,
    bracket: state.tournament?.bracket || BRACKET_SYSTEM.defaultBracket,
    essenceEarned: state.weekly?.essenceEarned || 0,
    tier: calculateTier(state.weekly?.essenceEarned || 0)
  };
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Update streak based on participation
 * @param {Object} tournamentState - Tournament state
 * @param {boolean} participated - Whether player participated
 * @returns {Object} { streak, broken }
 */
function updateStreak(tournamentState, participated) {
  const currentWeek = getCurrentISOWeek();
  const lastWeek = tournamentState?.lastParticipationWeek;

  if (!participated) {
    return { streak: 0, broken: true };
  }

  // Calculate if this is consecutive
  if (!lastWeek) {
    return { streak: 1, broken: false };
  }

  // Parse week numbers
  const [lastYear, lastWeekNum] = lastWeek.split('-W').map(Number);
  const [currentYear, currentWeekNum] = currentWeek.split('-W').map(Number);

  const isConsecutive = (currentYear === lastYear && currentWeekNum === lastWeekNum + 1) ||
                       (currentYear === lastYear + 1 && lastWeekNum === 52 && currentWeekNum === 1);

  if (isConsecutive) {
    return { streak: (tournamentState?.streak || 0) + 1, broken: false };
  }

  return { streak: 1, broken: true };
}

/**
 * Get streak bonus multiplier
 * @param {number} streak - Current streak
 * @returns {number} Bonus multiplier (0-0.25)
 */
function getStreakBonus(streak) {
  for (let i = TOURNAMENT_STREAKS.milestones.length - 1; i >= 0; i--) {
    const milestone = TOURNAMENT_STREAKS.milestones[i];
    if (streak >= milestone.weeks) {
      return milestone.essenceBonus;
    }
  }
  return 0;
}

/**
 * Get underdog bonuses
 * @param {Object} tournamentState - Tournament state
 * @param {number} bracketSize - Total players in bracket
 * @returns {Object} { total, finalPush, welcomeBack, neverWon }
 */
function getUnderdogBonuses(tournamentState, bracketSize) {
  const bonuses = {
    finalPush: 0,
    welcomeBack: 0,
    neverWon: 0,
    total: 0
  };

  // Final push bonus
  const hoursUntilEnd = (getWeekEndDate() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilEnd <= UNDERDOG_MECHANICS.finalPushBonus.hoursBeforeEnd) {
    const percentile = (tournamentState.bracketRank || bracketSize) / bracketSize * 100;
    if (percentile >= UNDERDOG_MECHANICS.finalPushBonus.bottomPercentile) {
      bonuses.finalPush = UNDERDOG_MECHANICS.finalPushBonus.essenceBonus;
    }
  }

  // Never won bonus
  if (UNDERDOG_MECHANICS.neverWonBonus.enabled && (!tournamentState.podiumFinishes || tournamentState.podiumFinishes === 0)) {
    bonuses.neverWon = UNDERDOG_MECHANICS.neverWonBonus.essenceBonus;
  }

  bonuses.total = bonuses.finalPush + bonuses.welcomeBack + bonuses.neverWon;
  return bonuses;
}

/**
 * Get checkpoint status
 * @param {number} essenceEarned - Total essence earned
 * @param {Array} checkpointsClaimed - Array of claimed checkpoint days
 * @returns {Array} Checkpoint status objects
 */
function getCheckpointStatus(essenceEarned, checkpointsClaimed = []) {
  return DAILY_CHECKPOINTS.checkpoints.map(checkpoint => ({
    ...checkpoint,
    reached: essenceEarned >= checkpoint.cumulativeTarget,
    claimed: checkpointsClaimed.includes(checkpoint.day),
    claimable: essenceEarned >= checkpoint.cumulativeTarget && !checkpointsClaimed.includes(checkpoint.day),
    progress: Math.min(1, essenceEarned / checkpoint.cumulativeTarget)
  }));
}

/**
 * Claim a checkpoint
 * @param {Object} tournamentState - Tournament state with essenceEarned and checkpointsClaimed
 * @param {number} day - Checkpoint day to claim
 * @returns {Object} Result
 */
function claimCheckpoint(tournamentState, day) {
  const checkpoint = DAILY_CHECKPOINTS.checkpoints.find(c => c.day === day);
  if (!checkpoint) {
    return { success: false, error: 'Invalid checkpoint day' };
  }

  if (tournamentState.checkpointsClaimed?.includes(day)) {
    return { success: false, error: 'Checkpoint already claimed' };
  }

  if (tournamentState.essenceEarned < checkpoint.cumulativeTarget) {
    return { success: false, error: 'Checkpoint not reached' };
  }

  return {
    success: true,
    rewards: checkpoint.rewards,
    checkpointName: checkpoint.name
  };
}

/**
 * Generate burning hour schedule for a week
 * @param {string} weekId - ISO week ID
 * @returns {Array} Schedule of burning hours
 */
function generateBurningHourSchedule(weekId) {
  // Deterministic schedule based on week
  const [year, weekNum] = weekId.split('-W').map(Number);
  const seed = year * 100 + weekNum;

  const schedule = [];
  for (let day = 0; day < 7; day++) {
    // Generate a random hour within the window
    const daySeed = seed + day;
    const hourRange = BURNING_HOURS.scheduleWindow.latest - BURNING_HOURS.scheduleWindow.earliest;
    const hour = BURNING_HOURS.scheduleWindow.earliest + (daySeed % hourRange);

    schedule.push({
      day,
      hour,
      duration: BURNING_HOURS.duration
    });
  }

  return schedule;
}

/**
 * Get burning hour status from schedule
 * @param {Array} schedule - Burning hour schedule
 * @returns {Object} Status
 */
function getBurningHourStatusFromSchedule(schedule) {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const currentTime = now.getTime();

  const todaySchedule = schedule.find(s => s.day === currentDay);
  if (!todaySchedule) {
    return { active: false, next: null };
  }

  const startTime = new Date(now);
  startTime.setUTCHours(todaySchedule.hour, 0, 0, 0);
  const endTime = new Date(startTime.getTime() + todaySchedule.duration);

  const active = currentTime >= startTime.getTime() && currentTime < endTime.getTime();

  return {
    active,
    multiplier: active ? BURNING_HOURS.multiplier : 1.0,
    startsAt: active ? null : startTime.toISOString(),
    endsAt: active ? endTime.toISOString() : null,
    next: active ? null : todaySchedule
  };
}

/**
 * Calculate total rewards from tier, rank, and streak
 * @param {Object} tournamentState - Tournament state with essenceEarned, bracketRank, streak
 * @returns {Object} Combined rewards
 */
function calculateTotalRewards(tournamentState) {
  const tier = calculateTier(tournamentState.essenceEarned);
  const rewards = {
    tierRewards: { fatePoints: 0, rollTickets: 0, premiumTickets: 0, cosmetics: [] },
    rankRewards: { fatePoints: 0, rollTickets: 0, premiumTickets: 0, cosmetics: [] },
    streakRewards: { rollTickets: 0, premiumTickets: 0, cosmetics: [] },
    combined: { fatePoints: 0, rollTickets: 0, premiumTickets: 0, cosmetics: [] }
  };

  // Tier rewards
  if (tier && WEEKLY_TOURNAMENT.rewards[tier.name]) {
    const tierReward = WEEKLY_TOURNAMENT.rewards[tier.name];
    rewards.tierRewards = {
      fatePoints: tierReward.fatePoints || 0,
      rollTickets: tierReward.rollTickets || 0,
      premiumTickets: tierReward.premiumTickets || 0,
      cosmetics: []
    };
  }

  // Rank rewards
  if (tournamentState.bracketRank) {
    const rankReward = RANK_REWARDS.getRewardsForRank(tournamentState.bracketRank);
    if (rankReward) {
      rewards.rankRewards = {
        fatePoints: rankReward.rewards.fatePoints || 0,
        rollTickets: rankReward.rewards.rollTickets || 0,
        premiumTickets: rankReward.rewards.premiumTickets || 0,
        cosmetics: rankReward.cosmetics || []
      };
    }
  }

  // Streak rewards
  const streakMilestone = TOURNAMENT_STREAKS.milestones
    .slice()
    .reverse()
    .find(m => tournamentState.streak >= m.weeks && m.rewards);

  if (streakMilestone && streakMilestone.rewards) {
    rewards.streakRewards = {
      rollTickets: streakMilestone.rewards.rollTickets || 0,
      premiumTickets: streakMilestone.rewards.premiumTickets || 0,
      cosmetics: streakMilestone.cosmetics || []
    };
  }

  // Combine rewards
  rewards.combined = {
    fatePoints: rewards.tierRewards.fatePoints + rewards.rankRewards.fatePoints,
    rollTickets: rewards.tierRewards.rollTickets + rewards.rankRewards.rollTickets + rewards.streakRewards.rollTickets,
    premiumTickets: (rewards.tierRewards.premiumTickets || 0) + (rewards.rankRewards.premiumTickets || 0) + (rewards.streakRewards.premiumTickets || 0),
    cosmetics: [
      ...rewards.rankRewards.cosmetics,
      ...rewards.streakRewards.cosmetics
    ]
  };

  return rewards;
}

/**
 * Unlock cosmetics
 * @param {Object} tournamentState - Tournament state
 * @param {Array} cosmeticIds - Cosmetic IDs to unlock
 * @returns {Object} Result
 */
function unlockCosmetics(tournamentState, cosmeticIds) {
  const cosmetics = tournamentState.cosmetics || { owned: [], equipped: {} };
  const newOwned = [...cosmetics.owned];

  for (const id of cosmeticIds) {
    if (!newOwned.includes(id)) {
      newOwned.push(id);
    }
  }

  return {
    cosmetics: {
      owned: newOwned,
      equipped: cosmetics.equipped
    },
    newlyUnlocked: cosmeticIds.filter(id => !cosmetics.owned.includes(id))
  };
}

/**
 * Equip a cosmetic
 * @param {Object} tournamentState - Tournament state
 * @param {string} cosmeticId - Cosmetic ID to equip
 * @returns {Object} Result
 */
function equipCosmetic(tournamentState, cosmeticId) {
  const cosmetics = tournamentState.cosmetics || { owned: [], equipped: {} };

  if (!cosmetics.owned.includes(cosmeticId)) {
    return { success: false, error: 'Cosmetic not owned' };
  }

  const cosmetic = TOURNAMENT_COSMETICS.items[cosmeticId];
  if (!cosmetic) {
    return { success: false, error: 'Invalid cosmetic' };
  }

  const newEquipped = { ...cosmetics.equipped };
  newEquipped[cosmetic.type] = cosmeticId;

  return {
    success: true,
    cosmetics: {
      owned: cosmetics.owned,
      equipped: newEquipped
    },
    equippedSlot: cosmetic.type
  };
}

/**
 * Unequip a cosmetic
 * @param {Object} tournamentState - Tournament state
 * @param {string} slot - Slot to unequip
 * @returns {Object} Result
 */
function unequipCosmetic(tournamentState, slot) {
  const cosmetics = tournamentState.cosmetics || { owned: [], equipped: {} };
  const newEquipped = { ...cosmetics.equipped };
  delete newEquipped[slot];

  return {
    success: true,
    cosmetics: {
      owned: cosmetics.owned,
      equipped: newEquipped
    }
  };
}

module.exports = {
  updateWeeklyProgress,
  getWeeklyTournamentInfo,
  claimWeeklyRewards,
  claimTournamentCheckpoint,
  getBurningHourStatus,
  calculateTier,
  getTournamentRank,

  // Helper exports for use by other services
  initializeTournamentState,
  updateStreak,
  getStreakBonus,
  getUnderdogBonuses,
  getCheckpointStatus,
  claimCheckpoint,
  generateBurningHourSchedule,
  getBurningHourStatusFromSchedule: getBurningHourStatus,
  calculateTotalRewards,
  unlockCosmetics,
  equipCosmetic,
  unequipCosmetic
};
