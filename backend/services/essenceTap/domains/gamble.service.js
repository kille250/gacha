/**
 * Gamble Service
 *
 * Handles gambling and jackpot logic for Essence Tap.
 * Includes bet validation, outcome calculation, and progressive jackpot management.
 */

const { GAMBLE_CONFIG } = require('../../../config/essenceTap');

/**
 * Get gamble availability and info
 * @param {Object} state - Current state
 * @returns {Object} Gamble availability info
 */
function getGambleInfo(state) {
  const now = Date.now();
  const lastGamble = state.lastGambleTimestamp || 0;
  const cooldownMs = GAMBLE_CONFIG.cooldownSeconds * 1000;
  const cooldownRemaining = Math.max(0, cooldownMs - (now - lastGamble));
  const dailyGamblesUsed = state.daily?.gamblesUsed || 0;

  return {
    available: cooldownRemaining === 0 && dailyGamblesUsed < GAMBLE_CONFIG.maxDailyGambles,
    cooldownRemaining,
    dailyGamblesUsed,
    maxDailyGambles: GAMBLE_CONFIG.maxDailyGambles,
    betTypes: GAMBLE_CONFIG.betTypes
  };
}

/**
 * Calculate gamble outcome (pure helper)
 * @param {number} betAmount - Amount being bet
 * @param {string} betType - Type of bet (safe/risky/extreme)
 * @param {number} roll - Random roll (0-1)
 * @returns {Object} Outcome { won, essenceChange, multiplier, winChance }
 */
function calculateGambleOutcome(betAmount, betType, roll) {
  const bet = GAMBLE_CONFIG.betTypes[betType];
  if (!bet) {
    return null;
  }

  const won = roll < bet.winChance;
  let essenceChange;

  if (won) {
    essenceChange = Math.floor(betAmount * bet.multiplier) - betAmount;
  } else {
    essenceChange = -betAmount;
  }

  return {
    won,
    essenceChange,
    multiplier: bet.multiplier,
    winChance: bet.winChance
  };
}

/**
 * Perform a gamble
 * @param {Object} state - Current state
 * @param {number} betAmount - Amount to bet
 * @param {string} betType - Type of bet (safe, risky, extreme)
 * @returns {Object} Result { success, newState?, error?, won?, betAmount?, essenceChange?, newEssence? }
 */
function gamble(state, betAmount, betType) {
  const now = Date.now();
  const lastGamble = state.lastGambleTimestamp || 0;
  const cooldownMs = GAMBLE_CONFIG.cooldownSeconds * 1000;

  // Check cooldown
  if (now - lastGamble < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - lastGamble)) / 1000);
    return { success: false, error: `Gamble on cooldown. ${remaining}s remaining.` };
  }

  // Check daily limit
  const dailyGamblesUsed = state.daily?.gamblesUsed || 0;
  if (dailyGamblesUsed >= GAMBLE_CONFIG.maxDailyGambles) {
    return { success: false, error: 'Daily gamble limit reached' };
  }

  // Validate bet type
  const bet = GAMBLE_CONFIG.betTypes[betType];
  if (!bet) {
    return { success: false, error: 'Invalid bet type' };
  }

  // Validate bet amount - must be a positive finite number
  const sanitizedBetAmount = Math.floor(Number(betAmount));
  if (!Number.isFinite(sanitizedBetAmount) || sanitizedBetAmount <= 0) {
    return { success: false, error: 'Invalid bet amount' };
  }

  if (sanitizedBetAmount < GAMBLE_CONFIG.minBet) {
    return { success: false, error: `Minimum bet is ${GAMBLE_CONFIG.minBet} essence` };
  }

  const maxBet = Math.floor(state.essence * GAMBLE_CONFIG.maxBetPercent);
  if (sanitizedBetAmount > maxBet) {
    return { success: false, error: `Maximum bet is ${maxBet} essence (${GAMBLE_CONFIG.maxBetPercent * 100}% of current essence)` };
  }

  if (sanitizedBetAmount > state.essence) {
    return { success: false, error: 'Not enough essence' };
  }

  // Perform gamble
  const roll = Math.random();
  const outcome = calculateGambleOutcome(sanitizedBetAmount, betType, roll);

  if (!outcome) {
    return { success: false, error: 'Invalid bet type' };
  }

  const newState = { ...state };
  newState.essence = Math.max(0, state.essence + outcome.essenceChange);
  newState.lastGambleTimestamp = now;
  newState.daily = {
    ...state.daily,
    gamblesUsed: dailyGamblesUsed + 1
  };
  newState.stats = {
    ...state.stats,
    totalGambleWins: (state.stats?.totalGambleWins || 0) + (outcome.won ? 1 : 0),
    totalGambleLosses: (state.stats?.totalGambleLosses || 0) + (outcome.won ? 0 : 1)
  };

  return {
    success: true,
    won: outcome.won,
    betAmount: sanitizedBetAmount,
    betType,
    multiplier: outcome.multiplier,
    winChance: outcome.winChance,
    essenceChange: outcome.essenceChange,
    newEssence: newState.essence,
    newState
  };
}

/**
 * Check for jackpot win during gamble (uses shared jackpot)
 * @param {Object} state - Current state
 * @param {number} betAmount - Amount bet
 * @param {string} betType - Type of bet (safe/risky/extreme)
 * @returns {Promise<Object>} Jackpot result { won, amount?, rewards?, reason? }
 */
async function checkJackpot(state, betAmount, betType = 'safe') {
  const { SharedJackpot } = require('../../../models');
  const jackpotConfig = GAMBLE_CONFIG.jackpot;

  // Must meet minimum bet to qualify
  if (betAmount < jackpotConfig.minBetToQualify) {
    return { won: false, reason: 'bet_too_small' };
  }

  // Get bet type multiplier for win chance
  const chanceMultiplier = jackpotConfig.chanceMultipliers[betType] || 1.0;

  // Calculate win chance with streak bonus
  let winChance = jackpotConfig.winChance * chanceMultiplier;

  // Add streak bonus if applicable
  const gamblesInSession = state.daily?.gamblesUsed || 0;
  if (gamblesInSession >= jackpotConfig.streakBonus.threshold) {
    const extraGambles = gamblesInSession - jackpotConfig.streakBonus.threshold;
    winChance += extraGambles * jackpotConfig.streakBonus.bonusPerGamble;
  }

  const roll = Math.random();
  if (roll < winChance) {
    // Get the shared jackpot amount
    const jackpot = await SharedJackpot.findOne({
      where: { jackpotType: 'essence_tap_main' }
    });

    if (jackpot) {
      const jackpotAmount = Number(jackpot.currentAmount);
      return {
        won: true,
        amount: jackpotAmount,
        rewards: jackpotConfig.rewards
      };
    }
  }

  return { won: false };
}

/**
 * Reset shared jackpot after win and record winner
 * @param {Object} state - Current state
 * @param {number} userId - Winner's user ID
 * @param {number} winAmount - Amount won
 * @returns {Promise<Object>} Updated state
 */
async function resetJackpot(state, userId, winAmount) {
  const { SharedJackpot } = require('../../../models');
  const jackpotConfig = GAMBLE_CONFIG.jackpot;

  const jackpot = await SharedJackpot.findOne({
    where: { jackpotType: 'essence_tap_main' }
  });

  if (jackpot) {
    await jackpot.update({
      currentAmount: jackpotConfig.seedAmount,
      totalContributions: 0,
      contributorCount: 0,
      totalWins: jackpot.totalWins + 1,
      lastWinnerId: userId,
      lastWinAmount: winAmount,
      lastWinDate: new Date(),
      largestWin: Math.max(Number(jackpot.largestWin), winAmount)
    });
  }

  // Update player state
  const newState = { ...state };
  newState.jackpotContributions = 0;
  newState.stats = {
    ...state.stats,
    jackpotsWon: (state.stats?.jackpotsWon || 0) + 1,
    totalJackpotWinnings: (state.stats?.totalJackpotWinnings || 0) + winAmount
  };

  return newState;
}

module.exports = {
  gamble,
  checkJackpot,
  resetJackpot,
  getGambleInfo,
  calculateGambleOutcome
};
