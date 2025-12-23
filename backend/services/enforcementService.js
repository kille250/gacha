/**
 * Enforcement Service
 * 
 * Provides utilities for applying restrictions and penalties to game actions.
 * Used by routes to modify rewards based on user restriction status.
 * 
 * Shadowban and rate limit penalties are now configurable via SecurityConfig.
 * Changes take effect within 60 seconds (config cache TTL).
 */

const securityConfigService = require('./securityConfigService');

// Default shadowban penalty configuration (fallback if config unavailable)
const DEFAULT_SHADOWBAN_CONFIG = {
  rewardMultiplier: 0.1,
  ticketMultiplier: 0.0,
  pointsMultiplier: 0.1,
  fishQuantityMultiplier: 0.5,
  timingPenalty: -100,
  tradingDisabled: true,
  showNormalMessages: true
};

// Default rate limit penalty configuration (fallback if config unavailable)
const DEFAULT_RATE_LIMIT_CONFIG = {
  dailyLimitMultiplier: 0.5,
  cooldownMultiplier: 2.0
};

// Cached config values (updated periodically)
let shadowbanConfigCache = { ...DEFAULT_SHADOWBAN_CONFIG };
let rateLimitConfigCache = { ...DEFAULT_RATE_LIMIT_CONFIG };
let lastConfigLoad = 0;
const CONFIG_REFRESH_INTERVAL = 60000; // 1 minute

/**
 * Load config from SecurityConfig service with caching
 */
async function loadConfig() {
  const now = Date.now();
  if (now - lastConfigLoad < CONFIG_REFRESH_INTERVAL) {
    return;
  }
  
  try {
    // Load shadowban config values
    const [
      rewardMultiplier,
      ticketMultiplier,
      fishMultiplier,
      pointsMultiplier,
      timingPenalty,
      rateLimitPenalty,
      rateLimitCooldown
    ] = await Promise.all([
      securityConfigService.getNumber('SHADOWBAN_REWARD_MULTIPLIER', 0.1),
      securityConfigService.getNumber('SHADOWBAN_TICKET_MULTIPLIER', 0),
      securityConfigService.getNumber('SHADOWBAN_FISH_MULTIPLIER', 0.5),
      securityConfigService.getNumber('SHADOWBAN_POINTS_MULTIPLIER', 0.1),
      securityConfigService.getNumber('SHADOWBAN_TIMING_PENALTY', -100),
      securityConfigService.getNumber('RATE_LIMIT_PENALTY_MULTIPLIER', 0.5),
      securityConfigService.getNumber('RATE_LIMIT_COOLDOWN_MULTIPLIER', 2.0)
    ]);
    
    shadowbanConfigCache = {
      rewardMultiplier,
      ticketMultiplier,
      pointsMultiplier,
      fishQuantityMultiplier: fishMultiplier,
      timingPenalty,
      tradingDisabled: true,
      showNormalMessages: true
    };
    
    rateLimitConfigCache = {
      dailyLimitMultiplier: rateLimitPenalty,
      cooldownMultiplier: rateLimitCooldown
    };
    
    lastConfigLoad = now;
  } catch (err) {
    console.error('[EnforcementService] Failed to load config, using defaults:', err.message);
  }
}

/**
 * Get current shadowban config (sync, uses cache)
 */
function getShadowbanConfigSync() {
  // Trigger async refresh in background if needed
  if (Date.now() - lastConfigLoad > CONFIG_REFRESH_INTERVAL) {
    loadConfig().catch(() => {});
  }
  return shadowbanConfigCache;
}

/**
 * Get current rate limit config (sync, uses cache)
 */
function getRateLimitConfigSync() {
  // Trigger async refresh in background if needed
  if (Date.now() - lastConfigLoad > CONFIG_REFRESH_INTERVAL) {
    loadConfig().catch(() => {});
  }
  return rateLimitConfigCache;
}

// Legacy exports for backwards compatibility
const SHADOWBAN_CONFIG = DEFAULT_SHADOWBAN_CONFIG;
const RATE_LIMIT_CONFIG = DEFAULT_RATE_LIMIT_CONFIG;

/**
 * Apply shadowban penalty to a numeric reward
 * Uses dynamically configurable multipliers from SecurityConfig
 * @param {number} amount - Original amount
 * @param {string} type - Type of reward (points, fish, tickets)
 * @param {boolean} isShadowbanned - Whether user is shadowbanned
 * @returns {number} - Modified amount (always returns integer)
 */
function applyShadowbanPenalty(amount, type, isShadowbanned) {
  if (!isShadowbanned) return amount;
  
  const config = getShadowbanConfigSync();
  let multiplier;
  switch (type) {
    case 'points':
      multiplier = config.pointsMultiplier;
      break;
    case 'fish':
      multiplier = config.fishQuantityMultiplier;
      break;
    case 'rollTickets':
    case 'premiumTickets':
    case 'tickets':
      multiplier = config.ticketMultiplier;
      break;
    default:
      multiplier = config.rewardMultiplier;
  }
  
  return Math.floor(amount * multiplier);
}

/**
 * Apply timing penalty for shadowbanned users
 * Uses dynamically configurable timing penalty from SecurityConfig
 * @param {number} timingWindow - Original timing window in ms
 * @param {boolean} isShadowbanned - Whether user is shadowbanned
 * @returns {number} - Modified timing window
 */
function applyShadowbanTimingPenalty(timingWindow, isShadowbanned) {
  if (!isShadowbanned) return timingWindow;
  
  const config = getShadowbanConfigSync();
  // Reduce timing window, but keep minimum of 300ms
  return Math.max(300, timingWindow + config.timingPenalty);
}

/**
 * Check if trading is allowed for user
 * @param {Object} req - Express request object
 * @returns {boolean} - Whether trading is allowed
 */
function isTradingAllowed(req) {
  const config = getShadowbanConfigSync();
  if (req.shadowbanned && config.tradingDisabled) {
    return false;
  }
  return true;
}

/**
 * Apply rate limit penalty to daily limits
 * Uses dynamically configurable multiplier from SecurityConfig
 * @param {number} limit - Original limit
 * @param {boolean} isRateLimited - Whether user is rate limited
 * @returns {number} - Modified limit
 */
function applyRateLimitPenalty(limit, isRateLimited) {
  if (!isRateLimited) return limit;
  
  const config = getRateLimitConfigSync();
  return Math.floor(limit * config.dailyLimitMultiplier);
}

/**
 * Apply rate limit penalty to cooldowns
 * Uses dynamically configurable multiplier from SecurityConfig
 * @param {number} cooldown - Original cooldown in ms
 * @param {boolean} isRateLimited - Whether user is rate limited
 * @returns {number} - Modified cooldown
 */
function applyRateLimitCooldown(cooldown, isRateLimited) {
  if (!isRateLimited) return cooldown;
  
  const config = getRateLimitConfigSync();
  return Math.floor(cooldown * config.cooldownMultiplier);
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
  const config = getShadowbanConfigSync();
  if (!enforcementContext.isShadowbanned || config.showNormalMessages) {
    return response;
  }
  
  const modified = { ...response };
  
  // Note: We don't modify the displayed values, only the actual DB values
  // The shadowban penalty should be applied when saving, not when responding
  // This function is for any response-level modifications if needed
  
  return modified;
}

/**
 * Force reload config from database
 * Call this when admin updates enforcement settings
 */
async function reloadConfig() {
  lastConfigLoad = 0;
  return loadConfig();
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
  // Config (static defaults for backwards compatibility)
  SHADOWBAN_CONFIG,
  RATE_LIMIT_CONFIG,
  
  // Dynamic config getters
  getShadowbanConfigSync,
  getRateLimitConfigSync,
  reloadConfig,
  
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

