/**
 * Enforcement Service
 * 
 * Provides utilities for applying restrictions and penalties to game actions.
 * Used by routes to modify rewards based on user restriction status.
 */

// Shadowban penalty configuration
const SHADOWBAN_CONFIG = {
  // Reward multipliers (how much of normal reward shadowbanned users get)
  rewardMultiplier: 0.1,        // 10% of normal rewards
  ticketMultiplier: 0.0,        // 0% tickets (none)
  pointsMultiplier: 0.1,        // 10% points
  fishQuantityMultiplier: 0.5,  // 50% fish
  
  // Timing penalties (make game slightly harder)
  timingPenalty: -100,          // Reduce timing window by 100ms
  
  // Trade restrictions
  tradingDisabled: true,        // Prevent trading when shadowbanned
  
  // Display fake success (user thinks everything is normal)
  showNormalMessages: true
};

// Rate limit penalty configuration
const RATE_LIMIT_CONFIG = {
  // Multipliers for daily limits
  dailyLimitMultiplier: 0.5,    // 50% of normal limits
  
  // Cooldown multipliers
  cooldownMultiplier: 2.0,      // 2x longer cooldowns
};

/**
 * Apply shadowban penalty to a numeric reward
 * @param {number} amount - Original amount
 * @param {string} type - Type of reward (points, fish, tickets)
 * @param {boolean} isShadowbanned - Whether user is shadowbanned
 * @returns {number} - Modified amount (always returns integer)
 */
function applyShadowbanPenalty(amount, type, isShadowbanned) {
  if (!isShadowbanned) return amount;
  
  let multiplier;
  switch (type) {
    case 'points':
      multiplier = SHADOWBAN_CONFIG.pointsMultiplier;
      break;
    case 'fish':
      multiplier = SHADOWBAN_CONFIG.fishQuantityMultiplier;
      break;
    case 'rollTickets':
    case 'premiumTickets':
    case 'tickets':
      multiplier = SHADOWBAN_CONFIG.ticketMultiplier;
      break;
    default:
      multiplier = SHADOWBAN_CONFIG.rewardMultiplier;
  }
  
  return Math.floor(amount * multiplier);
}

/**
 * Apply timing penalty for shadowbanned users
 * @param {number} timingWindow - Original timing window in ms
 * @param {boolean} isShadowbanned - Whether user is shadowbanned
 * @returns {number} - Modified timing window
 */
function applyShadowbanTimingPenalty(timingWindow, isShadowbanned) {
  if (!isShadowbanned) return timingWindow;
  
  // Reduce timing window, but keep minimum of 300ms
  return Math.max(300, timingWindow + SHADOWBAN_CONFIG.timingPenalty);
}

/**
 * Check if trading is allowed for user
 * @param {Object} req - Express request object
 * @returns {boolean} - Whether trading is allowed
 */
function isTradingAllowed(req) {
  if (req.shadowbanned && SHADOWBAN_CONFIG.tradingDisabled) {
    return false;
  }
  return true;
}

/**
 * Apply rate limit penalty to daily limits
 * @param {number} limit - Original limit
 * @param {boolean} isRateLimited - Whether user is rate limited
 * @returns {number} - Modified limit
 */
function applyRateLimitPenalty(limit, isRateLimited) {
  if (!isRateLimited) return limit;
  
  return Math.floor(limit * RATE_LIMIT_CONFIG.dailyLimitMultiplier);
}

/**
 * Apply rate limit penalty to cooldowns
 * @param {number} cooldown - Original cooldown in ms
 * @param {boolean} isRateLimited - Whether user is rate limited
 * @returns {number} - Modified cooldown
 */
function applyRateLimitCooldown(cooldown, isRateLimited) {
  if (!isRateLimited) return cooldown;
  
  return Math.floor(cooldown * RATE_LIMIT_CONFIG.cooldownMultiplier);
}

/**
 * Get enforcement context from request
 * Helper to extract all enforcement flags from request
 * @param {Object} req - Express request object
 * @returns {Object} - Enforcement context
 */
function getEnforcementContext(req) {
  return {
    isShadowbanned: req.shadowbanned === true,
    isRateLimited: req.restrictedRateLimit === true,
    hasWarning: req.hasWarning === true,
    shouldClearRestriction: req.clearRestriction === true
  };
}

/**
 * Modify game response based on enforcement status
 * Keeps messages normal while reducing actual rewards
 * @param {Object} response - Original response object
 * @param {Object} enforcementContext - From getEnforcementContext()
 * @returns {Object} - Modified response
 */
function applyEnforcementToResponse(response, enforcementContext) {
  if (!enforcementContext.isShadowbanned) {
    return response;
  }
  
  const modified = { ...response };
  
  // Note: We don't modify the displayed values, only the actual DB values
  // The shadowban penalty should be applied when saving, not when responding
  // This function is for any response-level modifications if needed
  
  return modified;
}

/**
 * Check if user should be auto-restricted based on action
 * @param {Object} user - User model instance
 * @param {string} action - Type of action
 * @param {Object} context - Additional context
 * @returns {Object|null} - Recommended restriction or null
 */
async function checkActionRestriction(user, action, context = {}) {
  // Import here to avoid circular dependency
  const { checkAutoEnforcement, updateRiskScore } = require('./riskService');
  
  // Update risk score with context
  await updateRiskScore(user.id, context);
  
  // Check if auto-enforcement is warranted
  return checkAutoEnforcement(user.id);
}

module.exports = {
  // Config
  SHADOWBAN_CONFIG,
  RATE_LIMIT_CONFIG,
  
  // Penalty functions
  applyShadowbanPenalty,
  applyShadowbanTimingPenalty,
  applyRateLimitPenalty,
  applyRateLimitCooldown,
  
  // Trading
  isTradingAllowed,
  
  // Context helpers
  getEnforcementContext,
  applyEnforcementToResponse,
  
  // Auto-restriction
  checkActionRestriction
};

