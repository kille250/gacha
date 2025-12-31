/**
 * User State Update Helpers
 * 
 * Centralized helpers for optimistic UI updates to user state.
 * Use these instead of inline setUser calls for consistency and maintainability.
 * 
 * USAGE:
 * import { applyPointsUpdate, applyRewards } from '../utils/userStateUpdates';
 * 
 * // After API call with response containing newPoints:
 * applyPointsUpdate(setUser, result.newPoints);
 * 
 * // After API call with reward object:
 * applyRewards(setUser, result.rewards);
 */

/**
 * Update user points (absolute value from server response)
 * Includes defensive validation to prevent corrupted state.
 *
 * @param {Function} setUser - React state setter from AuthContext
 * @param {number|undefined} newPoints - New points value from server
 * @returns {boolean} Whether the update was applied
 */
export const applyPointsUpdate = (setUser, newPoints) => {
  // Type validation
  if (newPoints === undefined || newPoints === null) return false;
  if (typeof newPoints !== 'number') {
    console.error('[StateUpdate] Invalid points type:', typeof newPoints, newPoints);
    return false;
  }

  // Value validation
  if (!Number.isFinite(newPoints)) {
    console.error('[StateUpdate] Non-finite points value:', newPoints);
    return false;
  }

  // Warn but allow negative (some systems may legitimately use it)
  if (newPoints < 0) {
    console.warn('[StateUpdate] Negative points value:', newPoints);
  }

  setUser(prev => prev ? { ...prev, points: newPoints } : prev);
  return true;
};

/**
 * Validate a numeric value for state updates
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of field for logging
 * @returns {boolean} Whether the value is valid
 */
const isValidNumber = (value, fieldName) => {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) {
    console.error(`[StateUpdate] Non-finite ${fieldName} value:`, value);
    return false;
  }
  return true;
};

/**
 * Apply multiple reward types at once from a rewards object
 * Handles points (absolute), rollTickets (delta), premiumTickets (delta)
 * Includes defensive validation to prevent corrupted state.
 *
 * @param {Function} setUser - React state setter from AuthContext
 * @param {Object} rewards - Rewards object from API response
 * @param {number} [rewards.points] - New absolute points value
 * @param {number} [rewards.rollTickets] - Roll tickets to add
 * @param {number} [rewards.premiumTickets] - Premium tickets to add
 * @returns {boolean} Whether any updates were applied
 */
export const applyRewards = (setUser, rewards) => {
  if (!rewards || typeof rewards !== 'object') return false;

  let hasUpdates = false;

  setUser(prev => {
    if (!prev) return prev;

    const updates = {};

    // Points are absolute values from server
    if (isValidNumber(rewards.points, 'points')) {
      updates.points = rewards.points;
      if (rewards.points < 0) {
        console.warn('[StateUpdate] Negative points in rewards:', rewards.points);
      }
    }

    // Tickets are deltas (added to current)
    if (isValidNumber(rewards.rollTickets, 'rollTickets') && rewards.rollTickets !== 0) {
      updates.rollTickets = Math.max(0, (prev.rollTickets || 0) + rewards.rollTickets);
    }

    if (isValidNumber(rewards.premiumTickets, 'premiumTickets') && rewards.premiumTickets !== 0) {
      updates.premiumTickets = Math.max(0, (prev.premiumTickets || 0) + rewards.premiumTickets);
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) return prev;

    hasUpdates = true;
    return { ...prev, ...updates };
  });

  return hasUpdates;
};

/**
 * Apply a complete user state update from server response
 * Used when server returns full user object or multiple fields
 * Includes defensive validation to prevent corrupted state.
 *
 * @param {Function} setUser - React state setter from AuthContext
 * @param {Object} serverData - Server response data
 * @param {number} [serverData.newPoints] - New points value
 * @param {Object} [serverData.newTotals] - Object with points, rollTickets, premiumTickets
 * @returns {boolean} Whether any updates were applied
 */
export const applyServerResponse = (setUser, serverData) => {
  if (!serverData || typeof serverData !== 'object') return false;

  let hasUpdates = false;

  setUser(prev => {
    if (!prev) return prev;

    const updates = {};

    // Handle newPoints (common pattern)
    if (isValidNumber(serverData.newPoints, 'newPoints')) {
      updates.points = serverData.newPoints;
      if (serverData.newPoints < 0) {
        console.warn('[StateUpdate] Negative newPoints:', serverData.newPoints);
      }
    }

    // Handle newTotals (dojo claim pattern)
    if (serverData.newTotals && typeof serverData.newTotals === 'object') {
      if (isValidNumber(serverData.newTotals.points, 'newTotals.points')) {
        updates.points = serverData.newTotals.points;
      }
      if (isValidNumber(serverData.newTotals.rollTickets, 'newTotals.rollTickets')) {
        updates.rollTickets = serverData.newTotals.rollTickets;
      }
      if (isValidNumber(serverData.newTotals.premiumTickets, 'newTotals.premiumTickets')) {
        updates.premiumTickets = serverData.newTotals.premiumTickets;
      }
    }

    if (Object.keys(updates).length === 0) return prev;

    hasUpdates = true;
    return { ...prev, ...updates };
  });

  return hasUpdates;
};

// NOTE: Default export removed - use named exports instead for better tree-shaking

