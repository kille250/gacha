/**
 * Tournament Service - Enhanced Weekly Tournament System (v4.0)
 *
 * Handles all tournament-related logic including:
 * - Bracket assignment and management
 * - Burning hour scheduling
 * - Daily checkpoint tracking
 * - Streak management
 * - Rank-based rewards calculation
 * - Cosmetic unlocks
 * - Underdog mechanics
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
} = require('../config/essenceTap');

// ===========================================
// ISO WEEK UTILITIES
// ===========================================

/**
 * Calculate ISO 8601 week number for a given date
 * ISO weeks start on Monday and week 1 is the week containing the first Thursday
 * @param {Date} date - The date to calculate the week for
 * @returns {{ year: number, week: number }} The ISO year and week number
 */
function getISOWeekData(date) {
  const target = new Date(date.valueOf());
  // ISO week starts on Monday, so adjust day number (0=Sun becomes 6, 1=Mon becomes 0, etc.)
  const dayNumber = (date.getUTCDay() + 6) % 7;
  // Set to nearest Thursday (current date + 4 - current day number)
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  // Get first Thursday of the year
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3);
  // Calculate week number
  const weekNumber = 1 + Math.round((target.valueOf() - firstThursday.valueOf()) / 604800000);
  return { year: target.getUTCFullYear(), week: weekNumber };
}

/**
 * Get current ISO week string (YYYY-Www)
 * Follows ISO 8601 standard for week numbering
 */
function getCurrentISOWeek() {
  const { year, week } = getISOWeekData(new Date());
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get the Monday of the current ISO week
 */
function getWeekStartDate() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday is day 1, Sunday is day 0
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the Sunday end of the current ISO week
 */
function getWeekEndDate() {
  const monday = getWeekStartDate();
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Get previous week's ISO week string
 */
function getPreviousISOWeek() {
  const now = new Date();
  const previousWeek = new Date(now.valueOf() - 7 * 24 * 60 * 60 * 1000);
  const { year, week } = getISOWeekData(previousWeek);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get hours remaining until tournament ends
 */
function getHoursUntilEnd() {
  const endDate = getWeekEndDate();
  const now = new Date();
  return Math.max(0, (endDate - now) / (1000 * 60 * 60));
}

// ===========================================
// BRACKET MANAGEMENT
// ===========================================

/**
 * Initialize tournament state for a user
 */
function initializeTournamentState(existingState = {}) {
  const currentWeek = getCurrentISOWeek();

  return {
    weekId: currentWeek,
    essenceEarned: 0,
    rank: null,
    bracketRank: null,
    rewardsClaimed: false,
    checkpointsClaimed: [],
    bracket: existingState.bracket || BRACKET_SYSTEM.defaultBracket,
    streak: existingState.streak || 0,
    lastParticipationWeek: existingState.lastParticipationWeek || null,
    bracketProtection: existingState.bracketProtection || 0,
    totalTournamentsPlayed: existingState.totalTournamentsPlayed || 0,
    bestRank: existingState.bestRank || null,
    podiumFinishes: existingState.podiumFinishes || 0,
    cosmetics: existingState.cosmetics || {
      owned: [],
      equipped: {
        avatarFrame: null,
        profileTitle: null,
        tapSkin: null
      }
    }
  };
}

/**
 * Assign player to bracket based on previous week's performance
 * @param {Array} allPlayers - All players sorted by previous week's essence
 * @returns {Object} Bracket assignments by user ID
 */
function assignBrackets(allPlayers) {
  const assignments = {};
  const totalPlayers = allPlayers.length;

  if (totalPlayers === 0) return assignments;

  // Sort by previous week's essence (descending)
  const sorted = [...allPlayers].sort((a, b) =>
    (b.previousWeekEssence || 0) - (a.previousWeekEssence || 0)
  );

  // Assign based on percentile
  sorted.forEach((player, index) => {
    const percentile = (index / totalPlayers) * 100;

    let bracket;
    if (percentile < BRACKET_SYSTEM.brackets.S.percentile.max) {
      bracket = 'S';
    } else if (percentile < BRACKET_SYSTEM.brackets.A.percentile.max) {
      bracket = 'A';
    } else if (percentile < BRACKET_SYSTEM.brackets.B.percentile.max) {
      bracket = 'B';
    } else {
      bracket = 'C';
    }

    // Check for bracket protection (new to bracket)
    const currentBracket = player.currentBracket || BRACKET_SYSTEM.defaultBracket;
    const isPromotion = bracket < currentBracket;

    assignments[player.userId] = {
      bracket,
      previousBracket: currentBracket,
      promoted: isPromotion,
      demoted: bracket > currentBracket,
      protected: isPromotion ? BRACKET_SYSTEM.protectionWeeks : 0
    };
  });

  return assignments;
}

/**
 * Get bracket leaderboard for a specific bracket
 * @param {Array} allPlayers - All players with their weekly essence
 * @param {string} bracket - The bracket to filter ('S', 'A', 'B', 'C')
 * @returns {Array} Sorted leaderboard for the bracket
 */
function getBracketLeaderboard(allPlayers, bracket) {
  return allPlayers
    .filter(p => p.bracket === bracket)
    .sort((a, b) => (b.weeklyEssence || 0) - (a.weeklyEssence || 0))
    .slice(0, BRACKET_SYSTEM.maxPlayersPerBracket)
    .map((player, index) => ({
      ...player,
      bracketRank: index + 1
    }));
}

/**
 * Calculate promotion/demotion status for a player
 * @param {number} bracketRank - Player's rank within their bracket
 * @param {number} bracketSize - Total players in the bracket
 * @param {number} protectionWeeks - Remaining protection weeks
 * @returns {Object} Promotion/demotion status
 */
function calculateBracketMovement(bracketRank, bracketSize, protectionWeeks = 0) {
  const promotionCutoff = Math.ceil(bracketSize * BRACKET_SYSTEM.promotionThreshold);
  const demotionCutoff = Math.ceil(bracketSize * (1 - BRACKET_SYSTEM.demotionThreshold));

  return {
    willPromote: bracketRank <= promotionCutoff,
    willDemote: protectionWeeks === 0 && bracketRank > demotionCutoff,
    isProtected: protectionWeeks > 0
  };
}

// ===========================================
// BURNING HOUR MANAGEMENT
// ===========================================

/**
 * Simple seeded random number generator (Mulberry32)
 * Provides deterministic pseudo-random numbers based on seed
 * @param {number} seed - The seed value
 * @returns {function} A function that returns pseudo-random numbers between 0 and 1
 */
function createSeededRandom(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate burning hour schedule for the week
 * Uses deterministic seeding based on weekId to ensure consistent schedules
 * @param {string} weekId - The ISO week string (e.g., "2024-W01")
 * @returns {Array} Array of burning hour events for each day
 */
function generateBurningHourSchedule(weekId) {
  const schedule = [];
  const monday = getWeekStartDate();

  // Create deterministic seed from weekId (e.g., "2024-W05" -> 202405)
  const seedString = weekId.replace('-W', '').replace(/-/g, '');
  const seed = parseInt(seedString, 10) || 202401;

  for (let day = 0; day < 7; day++) {
    const eventDate = new Date(monday);
    eventDate.setUTCDate(monday.getUTCDate() + day);

    // Generate deterministic hour within the allowed window using seeded random
    const { earliest, latest } = BURNING_HOURS.scheduleWindow;
    // Add day to seed for different hours each day
    const dayRandom = createSeededRandom(seed + day * 1000);
    const randomHour = earliest + Math.floor(dayRandom() * (latest - earliest - 2));

    eventDate.setUTCHours(randomHour, 0, 0, 0);

    const endDate = new Date(eventDate.getTime() + BURNING_HOURS.duration);

    schedule.push({
      day: day + 1,
      date: eventDate.toISOString().split('T')[0],
      startTime: eventDate.toISOString(),
      endTime: endDate.toISOString(),
      startHourUTC: randomHour,
      durationMs: BURNING_HOURS.duration
    });
  }

  return schedule;
}

/**
 * Check if burning hour is currently active
 * @param {Array} schedule - The burning hour schedule for the week
 * @returns {Object} Current burning hour status
 */
function getBurningHourStatus(schedule) {
  const now = new Date();

  for (const event of schedule) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    if (now >= start && now <= end) {
      return {
        active: true,
        multiplier: BURNING_HOURS.multiplier,
        endsAt: event.endTime,
        remainingMs: end - now
      };
    }

    // Check if upcoming (within notification window)
    const notifyTime = new Date(start.getTime() - BURNING_HOURS.notifyMinutesBefore * 60 * 1000);
    if (now >= notifyTime && now < start) {
      return {
        active: false,
        upcoming: true,
        startsAt: event.startTime,
        startsInMs: start - now
      };
    }
  }

  // Find next burning hour
  const futureEvents = schedule
    .filter(e => new Date(e.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  if (futureEvents.length > 0) {
    return {
      active: false,
      upcoming: false,
      nextEvent: futureEvents[0].startTime
    };
  }

  return {
    active: false,
    upcoming: false,
    nextEvent: null
  };
}

// ===========================================
// DAILY CHECKPOINTS
// ===========================================

/**
 * Get checkpoint status for current week
 * @param {number} essenceEarned - Total essence earned this week
 * @param {Array} checkpointsClaimed - Array of claimed checkpoint day numbers
 * @returns {Array} Checkpoint status array
 */
function getCheckpointStatus(essenceEarned, checkpointsClaimed = []) {
  return DAILY_CHECKPOINTS.checkpoints.map(checkpoint => ({
    ...checkpoint,
    achieved: essenceEarned >= checkpoint.cumulativeTarget,
    claimed: checkpointsClaimed.includes(checkpoint.day),
    claimable: essenceEarned >= checkpoint.cumulativeTarget && !checkpointsClaimed.includes(checkpoint.day),
    progress: Math.min(1, essenceEarned / checkpoint.cumulativeTarget)
  }));
}

/**
 * Claim a checkpoint reward
 * @param {Object} state - Player's tournament state
 * @param {number} day - The checkpoint day to claim (1-7)
 * @returns {Object} Result with rewards or error
 */
function claimCheckpoint(state, day) {
  const checkpoint = DAILY_CHECKPOINTS.checkpoints.find(c => c.day === day);

  if (!checkpoint) {
    return { success: false, error: 'Invalid checkpoint day' };
  }

  if (state.essenceEarned < checkpoint.cumulativeTarget) {
    return { success: false, error: 'Checkpoint target not reached' };
  }

  if (state.checkpointsClaimed.includes(day)) {
    return { success: false, error: 'Checkpoint already claimed' };
  }

  return {
    success: true,
    rewards: checkpoint.rewards,
    checkpointName: checkpoint.name
  };
}

// ===========================================
// STREAK MANAGEMENT
// ===========================================

/**
 * Update streak after tournament week ends
 * @param {Object} state - Player's tournament state
 * @param {boolean} participated - Whether player met minimum participation
 * @returns {Object} Updated streak info
 */
function updateStreak(state, participated) {
  const currentWeek = getCurrentISOWeek();
  const previousWeek = getPreviousISOWeek();

  if (!participated) {
    // Check grace period
    if (TOURNAMENT_STREAKS.gracePeriodWeeks > 0) {
      // Grace period not implemented yet, reset streak
    }
    return {
      streak: 0,
      broken: true,
      previousStreak: state.streak
    };
  }

  // Check if this continues the streak
  const isConsecutive = state.lastParticipationWeek === previousWeek;
  const newStreak = isConsecutive ? state.streak + 1 : 1;

  // Check for milestone rewards
  const milestone = TOURNAMENT_STREAKS.milestones.find(m => m.weeks === newStreak);

  return {
    streak: newStreak,
    broken: false,
    milestone: milestone || null,
    lastParticipationWeek: currentWeek
  };
}

/**
 * Get current streak bonus
 * @param {number} streak - Current streak count
 * @returns {number} Essence bonus multiplier (0.05 = 5%)
 */
function getStreakBonus(streak) {
  let bonus = 0;

  for (const milestone of TOURNAMENT_STREAKS.milestones) {
    if (streak >= milestone.weeks) {
      bonus = milestone.essenceBonus;
    }
  }

  return Math.min(bonus, TOURNAMENT_STREAKS.maxEssenceBonus);
}

// ===========================================
// RANK REWARDS
// ===========================================

/**
 * Get rewards for a specific rank
 * @param {number} rank - The bracket rank
 * @returns {Object|null} Rank rewards or null if not in reward range
 */
function getRankRewards(rank) {
  if (!rank || rank < 1) return null;

  for (const range of RANK_REWARDS.ranges) {
    if (rank >= range.minRank && rank <= range.maxRank) {
      return {
        rewards: range.rewards,
        cosmetics: range.cosmetics,
        title: range.title
      };
    }
  }

  return null;
}

/**
 * Calculate total tournament rewards for a player
 * @param {Object} state - Player's tournament state
 * @returns {Object} Combined rewards from tier, rank, and bonuses
 */
function calculateTotalRewards(state) {
  const { essenceEarned, bracketRank, streak } = state;

  // Get tier rewards
  let tier = null;
  for (const t of WEEKLY_TOURNAMENT.tiers) {
    if (essenceEarned >= t.minEssence) {
      tier = t.name;
    }
  }

  const tierRewards = tier ? WEEKLY_TOURNAMENT.rewards[tier] : null;

  // Get rank rewards
  const rankRewards = getRankRewards(bracketRank);

  // Get streak milestone rewards (if hitting a new milestone)
  const streakMilestone = TOURNAMENT_STREAKS.milestones.find(m => m.weeks === streak);
  const streakRewards = streakMilestone?.rewards || null;

  // Combine all rewards
  const combined = {
    fatePoints: 0,
    rollTickets: 0,
    premiumTickets: 0,
    cosmetics: []
  };

  if (tierRewards) {
    combined.fatePoints += tierRewards.fatePoints || 0;
    combined.rollTickets += tierRewards.rollTickets || 0;
  }

  if (rankRewards) {
    combined.fatePoints += rankRewards.rewards.fatePoints || 0;
    combined.rollTickets += rankRewards.rewards.rollTickets || 0;
    combined.premiumTickets += rankRewards.rewards.premiumTickets || 0;
    combined.cosmetics.push(...(rankRewards.cosmetics || []));
  }

  if (streakRewards) {
    combined.rollTickets += streakRewards.rollTickets || 0;
    combined.premiumTickets += streakRewards.premiumTickets || 0;
  }

  // Add streak cosmetics
  if (streakMilestone?.cosmetics) {
    combined.cosmetics.push(...streakMilestone.cosmetics);
  }

  return {
    tier,
    tierRewards,
    bracketRank,
    rankRewards: rankRewards?.rewards || null,
    streak,
    streakRewards,
    combined
  };
}

// ===========================================
// UNDERDOG MECHANICS
// ===========================================

/**
 * Calculate underdog bonuses for a player
 * @param {Object} state - Player's tournament state
 * @param {number} bracketSize - Total players in bracket
 * @returns {Object} Active underdog bonuses
 */
function getUnderdogBonuses(state, bracketSize) {
  const bonuses = {
    finalPush: 0,
    welcomeBack: 0,
    neverWon: 0,
    total: 0
  };

  const hoursRemaining = getHoursUntilEnd();

  // Final push bonus (last 48 hours, bottom 50% of bracket)
  if (hoursRemaining <= UNDERDOG_MECHANICS.finalPushBonus.hoursBeforeEnd) {
    const bracketPercentile = (state.bracketRank / bracketSize) * 100;
    if (bracketPercentile >= UNDERDOG_MECHANICS.finalPushBonus.bottomPercentile) {
      bonuses.finalPush = UNDERDOG_MECHANICS.finalPushBonus.essenceBonus;
    }
  }

  // Never-won bonus (never finished top 3)
  if (UNDERDOG_MECHANICS.neverWonBonus.enabled && state.podiumFinishes === 0) {
    bonuses.neverWon = UNDERDOG_MECHANICS.neverWonBonus.essenceBonus;
  }

  bonuses.total = bonuses.finalPush + bonuses.welcomeBack + bonuses.neverWon;

  return bonuses;
}

// ===========================================
// COSMETICS MANAGEMENT
// ===========================================

/**
 * Unlock cosmetics for a player
 * @param {Object} state - Player's tournament state
 * @param {Array} cosmeticIds - Array of cosmetic IDs to unlock
 * @returns {Object} Updated cosmetics state
 */
function unlockCosmetics(state, cosmeticIds) {
  const newlyUnlocked = [];

  for (const id of cosmeticIds) {
    if (!state.cosmetics.owned.includes(id) && TOURNAMENT_COSMETICS.items[id]) {
      state.cosmetics.owned.push(id);
      newlyUnlocked.push(TOURNAMENT_COSMETICS.items[id]);
    }
  }

  return {
    cosmetics: state.cosmetics,
    newlyUnlocked
  };
}

/**
 * Equip a cosmetic item
 * @param {Object} state - Player's tournament state
 * @param {string} cosmeticId - The cosmetic ID to equip
 * @returns {Object} Result with updated state or error
 */
function equipCosmetic(state, cosmeticId) {
  if (!state.cosmetics.owned.includes(cosmeticId)) {
    return { success: false, error: 'Cosmetic not owned' };
  }

  const cosmetic = TOURNAMENT_COSMETICS.items[cosmeticId];
  if (!cosmetic) {
    return { success: false, error: 'Invalid cosmetic' };
  }

  // Determine slot based on type
  let slot;
  switch (cosmetic.type) {
    case TOURNAMENT_COSMETICS.types.AVATAR_FRAME:
      slot = 'avatarFrame';
      break;
    case TOURNAMENT_COSMETICS.types.PROFILE_TITLE:
      slot = 'profileTitle';
      break;
    case TOURNAMENT_COSMETICS.types.TAP_SKIN:
      slot = 'tapSkin';
      break;
    default:
      return { success: false, error: 'Cosmetic type cannot be equipped' };
  }

  state.cosmetics.equipped[slot] = cosmeticId;

  return {
    success: true,
    cosmetics: state.cosmetics,
    equippedSlot: slot
  };
}

/**
 * Unequip a cosmetic from a slot
 * @param {Object} state - Player's tournament state
 * @param {string} slot - The slot to unequip ('avatarFrame', 'profileTitle', 'tapSkin')
 * @returns {Object} Updated cosmetics state
 */
function unequipCosmetic(state, slot) {
  if (!['avatarFrame', 'profileTitle', 'tapSkin'].includes(slot)) {
    return { success: false, error: 'Invalid slot' };
  }

  state.cosmetics.equipped[slot] = null;

  return {
    success: true,
    cosmetics: state.cosmetics
  };
}

// ===========================================
// ESSENCE MULTIPLIER CALCULATION
// ===========================================

/**
 * Calculate total essence multiplier from all tournament sources
 * @param {Object} state - Player's tournament state
 * @param {Object} burningHourStatus - Current burning hour status
 * @param {number} bracketSize - Total players in bracket
 * @returns {Object} Multiplier breakdown and total
 */
function calculateEssenceMultiplier(state, burningHourStatus, bracketSize = 50) {
  const multipliers = {
    base: 1.0,
    streak: 0,
    burningHour: 0,
    underdog: 0,
    total: 1.0
  };

  // Streak bonus
  multipliers.streak = getStreakBonus(state.streak);

  // Burning hour bonus
  if (burningHourStatus?.active) {
    multipliers.burningHour = BURNING_HOURS.multiplier - 1; // Convert to additive
  }

  // Underdog bonuses
  const underdogBonuses = getUnderdogBonuses(state, bracketSize);
  multipliers.underdog = underdogBonuses.total;

  // Calculate total (additive bonuses)
  multipliers.total = multipliers.base + multipliers.streak + multipliers.burningHour + multipliers.underdog;

  // Cap at maximum
  multipliers.total = Math.min(multipliers.total, BURNING_HOURS.maxMultiplierStack);

  return multipliers;
}

// ===========================================
// TOURNAMENT HISTORY
// ===========================================

/**
 * Record tournament result in history
 * @param {Object} state - Player's tournament state
 * @param {Object} result - Tournament result details
 * @returns {Object} Tournament history entry
 */
function recordTournamentHistory(state, result) {
  return {
    weekId: getCurrentISOWeek(),
    bracket: state.bracket,
    bracketRank: result.bracketRank,
    tier: result.tier,
    essenceEarned: state.essenceEarned,
    rewardsEarned: result.combined,
    streak: state.streak,
    timestamp: new Date().toISOString()
  };
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  // Utilities
  getCurrentISOWeek,
  getWeekStartDate,
  getWeekEndDate,
  getPreviousISOWeek,
  getHoursUntilEnd,

  // Initialization
  initializeTournamentState,

  // Bracket management
  assignBrackets,
  getBracketLeaderboard,
  calculateBracketMovement,

  // Burning hours
  generateBurningHourSchedule,
  getBurningHourStatus,

  // Checkpoints
  getCheckpointStatus,
  claimCheckpoint,

  // Streaks
  updateStreak,
  getStreakBonus,

  // Rewards
  getRankRewards,
  calculateTotalRewards,

  // Underdog
  getUnderdogBonuses,

  // Cosmetics
  unlockCosmetics,
  equipCosmetic,
  unequipCosmetic,

  // Multipliers
  calculateEssenceMultiplier,

  // History
  recordTournamentHistory,

  // Config exports for convenience
  BRACKET_SYSTEM,
  DAILY_CHECKPOINTS,
  BURNING_HOURS,
  TOURNAMENT_STREAKS,
  TOURNAMENT_COSMETICS,
  RANK_REWARDS,
  UNDERDOG_MECHANICS
};
