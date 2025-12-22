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
 * @param {Function} setUser - React state setter from AuthContext
 * @param {number|undefined} newPoints - New points value from server
 */
export const applyPointsUpdate = (setUser, newPoints) => {
  if (typeof newPoints !== 'number') return;
  setUser(prev => prev ? { ...prev, points: newPoints } : prev);
};

/**
 * Update user tickets by delta (relative change)
 * @param {Function} setUser - React state setter from AuthContext
 * @param {'roll'|'premium'} ticketType - Type of ticket to update
 * @param {number} delta - Amount to add (can be negative)
 */
export const applyTicketDelta = (setUser, ticketType, delta) => {
  if (typeof delta !== 'number' || delta === 0) return;
  
  setUser(prev => {
    if (!prev) return prev;
    const key = ticketType === 'premium' ? 'premiumTickets' : 'rollTickets';
    return { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) };
  });
};

/**
 * Set tickets to absolute value (from server response)
 * @param {Function} setUser - React state setter from AuthContext
 * @param {'roll'|'premium'} ticketType - Type of ticket to update
 * @param {number} value - New absolute value
 */
export const applyTicketValue = (setUser, ticketType, value) => {
  if (typeof value !== 'number') return;
  
  setUser(prev => {
    if (!prev) return prev;
    const key = ticketType === 'premium' ? 'premiumTickets' : 'rollTickets';
    return { ...prev, [key]: value };
  });
};

/**
 * Apply multiple reward types at once from a rewards object
 * Handles points (absolute), rollTickets (delta), premiumTickets (delta)
 * 
 * @param {Function} setUser - React state setter from AuthContext
 * @param {Object} rewards - Rewards object from API response
 * @param {number} [rewards.points] - New absolute points value
 * @param {number} [rewards.rollTickets] - Roll tickets to add
 * @param {number} [rewards.premiumTickets] - Premium tickets to add
 */
export const applyRewards = (setUser, rewards) => {
  if (!rewards) return;
  
  setUser(prev => {
    if (!prev) return prev;
    
    const updates = {};
    
    // Points are absolute values from server
    if (typeof rewards.points === 'number') {
      updates.points = rewards.points;
    }
    
    // Tickets are deltas (added to current)
    if (typeof rewards.rollTickets === 'number' && rewards.rollTickets !== 0) {
      updates.rollTickets = Math.max(0, (prev.rollTickets || 0) + rewards.rollTickets);
    }
    
    if (typeof rewards.premiumTickets === 'number' && rewards.premiumTickets !== 0) {
      updates.premiumTickets = Math.max(0, (prev.premiumTickets || 0) + rewards.premiumTickets);
    }
    
    // Only update if there are changes
    if (Object.keys(updates).length === 0) return prev;
    
    return { ...prev, ...updates };
  });
};

/**
 * Apply a complete user state update from server response
 * Used when server returns full user object or multiple fields
 * 
 * @param {Function} setUser - React state setter from AuthContext
 * @param {Object} serverData - Server response data
 * @param {number} [serverData.newPoints] - New points value
 * @param {Object} [serverData.newTotals] - Object with points, rollTickets, premiumTickets
 */
export const applyServerResponse = (setUser, serverData) => {
  if (!serverData) return;
  
  setUser(prev => {
    if (!prev) return prev;
    
    const updates = {};
    
    // Handle newPoints (common pattern)
    if (typeof serverData.newPoints === 'number') {
      updates.points = serverData.newPoints;
    }
    
    // Handle newTotals (dojo claim pattern)
    if (serverData.newTotals) {
      if (typeof serverData.newTotals.points === 'number') {
        updates.points = serverData.newTotals.points;
      }
      if (typeof serverData.newTotals.rollTickets === 'number') {
        updates.rollTickets = serverData.newTotals.rollTickets;
      }
      if (typeof serverData.newTotals.premiumTickets === 'number') {
        updates.premiumTickets = serverData.newTotals.premiumTickets;
      }
    }
    
    if (Object.keys(updates).length === 0) return prev;
    
    return { ...prev, ...updates };
  });
};

/**
 * Handle action error with consistent recovery pattern.
 * Always refreshes user data to re-sync currency/tickets after failures.
 * 
 * @param {Object} params
 * @param {Function} params.refreshUser - The refreshUser function from AuthContext
 * @param {Error} params.error - The error that occurred
 * @param {string} [params.fallbackMessage='Action failed'] - Default error message
 * @returns {Promise<string>} The error message to display
 * 
 * @example
 * try {
 *   await someAction();
 * } catch (err) {
 *   const errorMessage = await handleActionError({ refreshUser, error: err });
 *   setError(errorMessage);
 * }
 */
export const handleActionError = async ({ refreshUser, error, fallbackMessage = 'Action failed' }) => {
  console.error('[ActionError]', error);
  
  // Always refresh user to re-sync currency after errors
  // This handles cases where the action partially succeeded or state is stale
  try {
    const result = await refreshUser();
    if (!result.success) {
      console.warn('[ActionError] Failed to refresh user after error:', result.error);
    }
  } catch (refreshErr) {
    console.warn('[ActionError] Exception during user refresh:', refreshErr);
  }
  
  return error?.response?.data?.error || fallbackMessage;
};

/**
 * Handle action error with additional ticket refresh.
 * Use this for gacha/banner actions that involve tickets.
 * 
 * @param {Object} params
 * @param {Function} params.refreshUser - The refreshUser function from AuthContext
 * @param {Error} params.error - The error that occurred
 * @param {Function} [params.refreshTickets] - Optional function to refresh ticket state
 * @param {string} [params.fallbackMessage='Action failed'] - Default error message
 * @returns {Promise<string>} The error message to display
 */
export const handleGachaError = async ({ refreshUser, error, refreshTickets, fallbackMessage = 'Roll failed' }) => {
  const errorMessage = await handleActionError({ refreshUser, error, fallbackMessage });
  
  // Also refresh tickets if a refresh function is provided
  if (refreshTickets) {
    try {
      await refreshTickets();
    } catch (ticketErr) {
      console.warn('[GachaError] Failed to refresh tickets:', ticketErr);
    }
  }
  
  return errorMessage;
};

// NOTE: Default export removed - use named exports instead for better tree-shaking

