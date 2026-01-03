/**
 * Daily Challenge Action
 *
 * Unified daily challenge handling for REST and WebSocket.
 * Handles checking progress and claiming rewards.
 */

const { DAILY_CHALLENGES } = require('../../../config/essenceTap');

/**
 * Daily challenge action result
 * @typedef {Object} DailyChallengeResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [newState] - Updated state
 * @property {Object} [rewards] - Rewards earned
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Get today's date string
 * @returns {string} Date in YYYY-MM-DD format
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get daily challenges with progress
 * @param {Object} state - Current state
 * @returns {Array} Challenges with progress
 */
function getDailyChallengesWithProgress(state) {
  const today = getTodayString();
  const challengeProgress = state.dailyChallengeProgress || {};
  const claimedToday = state.dailyChallengesClaimed?.[today] || [];

  return DAILY_CHALLENGES.map(challenge => {
    let progress = 0;

    switch (challenge.type) {
      case 'essence':
        progress = state.daily?.essenceEarned || 0;
        break;
      case 'clicks':
        progress = state.daily?.clicks || 0;
        break;
      case 'crits':
        progress = state.daily?.crits || 0;
        break;
      case 'goldens':
        progress = state.daily?.goldens || 0;
        break;
      case 'generators':
        progress = state.daily?.generatorsBought || 0;
        break;
      case 'upgrades':
        progress = state.daily?.upgradesBought || 0;
        break;
      case 'gambles':
        progress = state.daily?.gamblesUsed || 0;
        break;
      case 'gambleWins':
        progress = state.daily?.gambleWins || 0;
        break;
      case 'bossesDefeated':
        progress = state.daily?.bossesDefeated || 0;
        break;
      case 'combo':
        progress = state.daily?.highestCombo || 0;
        break;
      case 'abilities':
        progress = state.daily?.abilitiesUsed || 0;
        break;
      default:
        progress = challengeProgress[challenge.id] || 0;
    }

    return {
      ...challenge,
      progress,
      completed: progress >= challenge.target,
      claimed: claimedToday.includes(challenge.id),
      claimable: progress >= challenge.target && !claimedToday.includes(challenge.id)
    };
  });
}

/**
 * Check daily challenges for completion
 * @param {Object} state - Current state
 * @returns {Object} Claimable challenges info
 */
function checkDailyChallenges(state) {
  const challenges = getDailyChallengesWithProgress(state);
  const claimable = challenges.filter(c => c.claimable);

  return {
    challenges,
    claimable,
    totalClaimed: challenges.filter(c => c.claimed).length,
    totalCompleted: challenges.filter(c => c.completed).length,
    total: challenges.length
  };
}

/**
 * Claim a daily challenge reward
 * @param {Object} params - Action parameters
 * @param {Object} params.state - Current player state
 * @param {string} params.challengeId - Challenge ID to claim
 * @returns {DailyChallengeResult} Claim result
 */
function claimDailyChallenge({ state, challengeId }) {
  if (!challengeId) {
    return {
      success: false,
      error: 'Challenge ID required',
      code: 'INVALID_REQUEST'
    };
  }

  const challenges = getDailyChallengesWithProgress(state);
  const challenge = challenges.find(c => c.id === challengeId);

  if (!challenge) {
    return {
      success: false,
      error: 'Invalid challenge',
      code: 'INVALID_CHALLENGE'
    };
  }

  if (challenge.claimed) {
    return {
      success: false,
      error: 'Challenge already claimed',
      code: 'ALREADY_CLAIMED'
    };
  }

  if (!challenge.completed) {
    return {
      success: false,
      error: 'Challenge not completed',
      code: 'NOT_COMPLETED'
    };
  }

  const today = getTodayString();
  const newState = { ...state };

  // Track claimed challenges
  newState.dailyChallengesClaimed = { ...state.dailyChallengesClaimed };
  newState.dailyChallengesClaimed[today] = [
    ...(state.dailyChallengesClaimed?.[today] || []),
    challengeId
  ];

  newState.lastOnlineTimestamp = Date.now();

  return {
    success: true,
    newState,
    challenge: {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description
    },
    rewards: challenge.rewards
  };
}

/**
 * Update challenge progress (called after relevant actions)
 * @param {Object} state - Current state
 * @param {string} type - Challenge type to update
 * @param {number} amount - Amount to add
 * @returns {Object} Updated state
 */
function updateChallengeProgress(state, type, amount = 1) {
  const newState = { ...state };
  newState.daily = { ...state.daily };

  switch (type) {
    case 'essence':
      newState.daily.essenceEarned = (state.daily?.essenceEarned || 0) + amount;
      break;
    case 'clicks':
      newState.daily.clicks = (state.daily?.clicks || 0) + amount;
      break;
    case 'crits':
      newState.daily.crits = (state.daily?.crits || 0) + amount;
      break;
    case 'goldens':
      newState.daily.goldens = (state.daily?.goldens || 0) + amount;
      break;
    case 'generators':
      newState.daily.generatorsBought = (state.daily?.generatorsBought || 0) + amount;
      break;
    case 'upgrades':
      newState.daily.upgradesBought = (state.daily?.upgradesBought || 0) + amount;
      break;
    case 'gambles':
      newState.daily.gamblesUsed = (state.daily?.gamblesUsed || 0) + amount;
      break;
    case 'gambleWins':
      newState.daily.gambleWins = (state.daily?.gambleWins || 0) + amount;
      break;
    case 'bossesDefeated':
      newState.daily.bossesDefeated = (state.daily?.bossesDefeated || 0) + amount;
      break;
    case 'combo':
      newState.daily.highestCombo = Math.max(state.daily?.highestCombo || 0, amount);
      break;
    case 'abilities':
      newState.daily.abilitiesUsed = (state.daily?.abilitiesUsed || 0) + amount;
      break;
  }

  return newState;
}

module.exports = {
  getDailyChallengesWithProgress,
  checkDailyChallenges,
  claimDailyChallenge,
  updateChallengeProgress
};
