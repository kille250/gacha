/**
 * Fortune Wheel Service
 *
 * Handles all business logic for the daily fortune wheel mini-game.
 * Manages spins, rewards, streaks, and pity system.
 */

const {
  SPIN_CONFIG,
  MULTIPLIER_EFFECTS,
  getWheelForLevel,
  selectSegment,
  calculateStreakBonus,
  isBadSpin
} = require('../config/fortuneWheel');

/**
 * Get the current date string in YYYY-MM-DD format (UTC)
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if user can spin (has free spins available)
 * @param {Object} user - User model instance
 * @returns {Object} - { canSpin, reason, freeSpins, bonusSpins, usedSpins, nextSpinAt }
 */
function getSpinStatus(user) {
  const wheelState = user.fortuneWheel || {};
  const today = getTodayString();

  // Reset daily spins if it's a new day
  let todaySpins = wheelState.todaySpins || 0;
  if (wheelState.todayDate !== today) {
    todaySpins = 0;
  }

  // Calculate available spins
  const freeSpins = SPIN_CONFIG.freeSpinsPerDay;
  const bonusSpins = calculateStreakBonus(wheelState.currentStreak || 0);
  const totalAvailable = Math.min(freeSpins + bonusSpins, SPIN_CONFIG.maxDailySpins);
  const remaining = totalAvailable - todaySpins;

  // Calculate next free spin time (24h from last spin)
  let nextSpinAt = null;
  if (remaining <= 0 && wheelState.lastFreeSpinAt) {
    const lastSpin = new Date(wheelState.lastFreeSpinAt);
    nextSpinAt = new Date(lastSpin.getTime() + SPIN_CONFIG.resetHours * 60 * 60 * 1000);
  }

  return {
    canSpin: remaining > 0,
    reason: remaining > 0 ? null : 'No spins remaining today',
    freeSpins,
    bonusSpins,
    totalAvailable,
    usedSpins: todaySpins,
    remaining,
    nextSpinAt,
    currentStreak: wheelState.currentStreak || 0,
    longestStreak: wheelState.longestStreak || 0,
    totalSpins: wheelState.totalSpins || 0,
    jackpotsWon: wheelState.jackpotsWon || 0
  };
}

/**
 * Get the wheel configuration for a user
 * @param {Object} user - User model instance
 * @returns {Object} - Wheel config with segments
 */
function getWheelConfig(user) {
  const accountLevel = user.accountXP ? Math.floor(user.accountXP / 1000) + 1 : 1;
  const wheel = getWheelForLevel(accountLevel);

  return {
    ...wheel,
    // Don't expose weights to client (prevent cheating)
    segments: wheel.segments.map(s => ({
      id: s.id,
      label: s.label,
      type: s.type,
      color: s.color,
      iconType: s.iconType,
      value: s.value
    }))
  };
}

/**
 * Perform a spin and award prizes
 * @param {Object} user - User model instance
 * @returns {Object} - { success, segment, rewards, newState, error }
 */
async function performSpin(user) {
  const status = getSpinStatus(user);

  if (!status.canSpin) {
    return {
      success: false,
      error: status.reason,
      nextSpinAt: status.nextSpinAt
    };
  }

  const accountLevel = user.accountXP ? Math.floor(user.accountXP / 1000) + 1 : 1;
  const wheel = getWheelForLevel(accountLevel);
  const wheelState = user.fortuneWheel || {};
  const today = getTodayString();

  // Check pity system
  const badSpinStreak = wheelState.badSpinStreak || 0;
  const forcePity = badSpinStreak >= SPIN_CONFIG.pityThreshold;

  // Select winning segment
  const segment = selectSegment(wheel, { forcePity });

  // Calculate rewards
  const rewards = {
    points: 0,
    tickets: 0,
    premium: 0,
    multiplier: null,
    isJackpot: false
  };

  switch (segment.type) {
    case 'points':
      rewards.points = segment.value;
      break;
    case 'tickets':
      rewards.tickets = segment.value;
      break;
    case 'premium':
      rewards.premium = segment.value;
      break;
    case 'jackpot':
      rewards.points = segment.value;
      rewards.isJackpot = true;
      break;
    case 'multiplier':
      rewards.multiplier = {
        type: 'xp',
        value: segment.value,
        duration: MULTIPLIER_EFFECTS.xp_boost[wheel.id] || 60,
        expiresAt: new Date(Date.now() + (MULTIPLIER_EFFECTS.xp_boost[wheel.id] || 60) * 60 * 1000)
      };
      break;
    case 'nothing':
      // No rewards
      break;
  }

  // Update user state
  const newBadSpinStreak = isBadSpin(segment) ? badSpinStreak + 1 : 0;

  // Update streak (only if first spin of the day)
  let newStreak = wheelState.currentStreak || 0;
  if (wheelState.todayDate !== today) {
    // Check if yesterday was the last spin
    const lastSpinDate = wheelState.todayDate;
    if (lastSpinDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastSpinDate === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1; // First spin ever
    }
  }

  const newWheelState = {
    ...wheelState,
    lastFreeSpinAt: new Date().toISOString(),
    totalSpins: (wheelState.totalSpins || 0) + 1,
    jackpotsWon: rewards.isJackpot ? (wheelState.jackpotsWon || 0) + 1 : (wheelState.jackpotsWon || 0),
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, wheelState.longestStreak || 0),
    badSpinStreak: newBadSpinStreak,
    todaySpins: wheelState.todayDate === today ? (wheelState.todaySpins || 0) + 1 : 1,
    todayDate: today,
    activeMultiplier: rewards.multiplier || wheelState.activeMultiplier
  };

  // Apply rewards to user
  if (rewards.points > 0) {
    user.points = (user.points || 0) + rewards.points;
  }
  if (rewards.tickets > 0) {
    user.rollTickets = (user.rollTickets || 0) + rewards.tickets;
  }
  if (rewards.premium > 0) {
    user.premiumTickets = (user.premiumTickets || 0) + rewards.premium;
  }

  // Update wheel state
  user.fortuneWheel = newWheelState;

  // Add to history
  const history = user.fortuneWheelHistory || [];
  history.push({
    date: new Date().toISOString(),
    segmentId: segment.id,
    segmentLabel: segment.label,
    type: segment.type,
    rewards: {
      points: rewards.points,
      tickets: rewards.tickets,
      premium: rewards.premium,
      isJackpot: rewards.isJackpot
    },
    pityTriggered: forcePity
  });
  user.fortuneWheelHistory = history;

  // Save user
  await user.save();

  // Calculate segment index for animation
  const segmentIndex = wheel.segments.findIndex(s => s.id === segment.id);

  return {
    success: true,
    segment: {
      id: segment.id,
      label: segment.label,
      type: segment.type,
      color: segment.color,
      iconType: segment.iconType,
      value: segment.value,
      index: segmentIndex
    },
    rewards,
    pityTriggered: forcePity,
    newState: getSpinStatus(user),
    animation: {
      targetIndex: segmentIndex,
      totalSegments: wheel.segments.length,
      duration: SPIN_CONFIG.spinDuration,
      rotations: SPIN_CONFIG.minRotations
    }
  };
}

/**
 * Get spin history for a user
 * @param {Object} user - User model instance
 * @param {number} limit - Max entries to return
 * @returns {Array} - Spin history
 */
function getSpinHistory(user, limit = 20) {
  const history = user.fortuneWheelHistory || [];
  return history.slice(-limit).reverse(); // Most recent first
}

/**
 * Check if user has an active XP multiplier
 * @param {Object} user - User model instance
 * @returns {Object|null} - Active multiplier or null
 */
function getActiveMultiplier(user) {
  const wheelState = user.fortuneWheel || {};
  const multiplier = wheelState.activeMultiplier;

  if (!multiplier) return null;

  const expiresAt = new Date(multiplier.expiresAt);
  if (expiresAt <= new Date()) {
    // Expired, clean up
    return null;
  }

  return {
    ...multiplier,
    remainingMinutes: Math.ceil((expiresAt - new Date()) / (60 * 1000))
  };
}

/**
 * Clear expired multiplier from user state
 * @param {Object} user - User model instance
 */
async function clearExpiredMultiplier(user) {
  const wheelState = user.fortuneWheel || {};
  const multiplier = wheelState.activeMultiplier;

  if (multiplier) {
    const expiresAt = new Date(multiplier.expiresAt);
    if (expiresAt <= new Date()) {
      user.fortuneWheel = {
        ...wheelState,
        activeMultiplier: null
      };
      await user.save();
    }
  }
}

/**
 * Get full wheel status for API response
 * @param {Object} user - User model instance
 * @returns {Object} - Complete wheel status
 */
function getFullStatus(user) {
  const spinStatus = getSpinStatus(user);
  const wheelConfig = getWheelConfig(user);
  const activeMultiplier = getActiveMultiplier(user);
  const recentHistory = getSpinHistory(user, 5);

  return {
    ...spinStatus,
    wheel: wheelConfig,
    activeMultiplier,
    recentHistory,
    config: {
      spinDuration: SPIN_CONFIG.spinDuration,
      streakBonuses: SPIN_CONFIG.streakBonuses
    }
  };
}

module.exports = {
  getSpinStatus,
  getWheelConfig,
  performSpin,
  getSpinHistory,
  getActiveMultiplier,
  clearExpiredMultiplier,
  getFullStatus
};
