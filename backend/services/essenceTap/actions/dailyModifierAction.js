/**
 * Daily Modifier Action
 *
 * Unified daily modifier handling for REST and WebSocket.
 */

const { DAILY_MODIFIERS } = require('../../../config/essenceTap');

/**
 * Daily modifier result
 * @typedef {Object} DailyModifierResult
 * @property {boolean} success - Whether action succeeded
 * @property {Object} [modifier] - Current daily modifier
 * @property {number} [nextChangeIn] - Time until next modifier in ms
 * @property {string} [error] - Error message if failed
 * @property {string} [code] - Error code if failed
 */

/**
 * Get current daily modifier
 * @returns {DailyModifierResult} Daily modifier result
 */
function getDailyModifier() {
  try {
    const modifier = getCurrentDailyModifier();
    const nextChangeIn = getTimeUntilNextModifier();

    return {
      success: true,
      modifier,
      nextChangeIn
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to get daily modifier',
      code: 'MODIFIER_ERROR'
    };
  }
}

/**
 * Get the current daily modifier based on day of week
 * @returns {Object} Current daily modifier
 */
function getCurrentDailyModifier() {
  const dayOfWeek = new Date().getDay();
  return DAILY_MODIFIERS[dayOfWeek] || DAILY_MODIFIERS[0];
}

/**
 * Get time until next daily modifier change
 * @returns {number} Milliseconds until next modifier
 */
function getTimeUntilNextModifier() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime() - now.getTime();
}

module.exports = {
  getDailyModifier,
  getCurrentDailyModifier,
  getTimeUntilNextModifier
};
