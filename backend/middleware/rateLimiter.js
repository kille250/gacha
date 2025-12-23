/**
 * Enhanced Rate Limiter Middleware
 * 
 * Provides request-level rate limiting with enforcement integration.
 * Uses express-rate-limit with custom key generation and limits.
 * 
 * Rate limits are configurable via SecurityConfig service.
 * Default values are used as fallbacks if config unavailable.
 */
const rateLimit = require('express-rate-limit');

// Default values (used as fallback, should match SecurityConfig DEFAULTS)
const DEFAULTS = {
  RATE_LIMIT_GENERAL_WINDOW: 60000,
  RATE_LIMIT_GENERAL_MAX: 100,
  RATE_LIMIT_SENSITIVE_WINDOW: 3600000,
  RATE_LIMIT_SENSITIVE_MAX: 20,
  RATE_LIMIT_SIGNUP_WINDOW: 86400000,
  RATE_LIMIT_SIGNUP_MAX: 5,
  RATE_LIMIT_COUPON_WINDOW: 900000,
  RATE_LIMIT_COUPON_MAX: 10,
  RATE_LIMIT_BURST_WINDOW: 1000,
  RATE_LIMIT_BURST_MAX: 10
};

// Cached config values (updated periodically)
let configCache = { ...DEFAULTS };
let lastConfigLoad = 0;
const CONFIG_REFRESH_INTERVAL = 60000; // 1 minute

/**
 * Load config from SecurityConfig service with caching
 */
async function loadConfig() {
  const now = Date.now();
  if (now - lastConfigLoad < CONFIG_REFRESH_INTERVAL) {
    return configCache;
  }
  
  try {
    const { getConfig } = require('../services/securityConfigService');
    
    // Load all rate limit configs in parallel
    const [
      generalWindow, generalMax,
      sensitiveWindow, sensitiveMax,
      signupWindow, signupMax,
      couponWindow, couponMax,
      burstWindow, burstMax
    ] = await Promise.all([
      getConfig('RATE_LIMIT_GENERAL_WINDOW'),
      getConfig('RATE_LIMIT_GENERAL_MAX'),
      getConfig('RATE_LIMIT_SENSITIVE_WINDOW'),
      getConfig('RATE_LIMIT_SENSITIVE_MAX'),
      getConfig('RATE_LIMIT_SIGNUP_WINDOW'),
      getConfig('RATE_LIMIT_SIGNUP_MAX'),
      getConfig('RATE_LIMIT_COUPON_WINDOW'),
      getConfig('RATE_LIMIT_COUPON_MAX'),
      getConfig('RATE_LIMIT_BURST_WINDOW'),
      getConfig('RATE_LIMIT_BURST_MAX')
    ]);
    
    configCache = {
      RATE_LIMIT_GENERAL_WINDOW: generalWindow,
      RATE_LIMIT_GENERAL_MAX: generalMax,
      RATE_LIMIT_SENSITIVE_WINDOW: sensitiveWindow,
      RATE_LIMIT_SENSITIVE_MAX: sensitiveMax,
      RATE_LIMIT_SIGNUP_WINDOW: signupWindow,
      RATE_LIMIT_SIGNUP_MAX: signupMax,
      RATE_LIMIT_COUPON_WINDOW: couponWindow,
      RATE_LIMIT_COUPON_MAX: couponMax,
      RATE_LIMIT_BURST_WINDOW: burstWindow,
      RATE_LIMIT_BURST_MAX: burstMax
    };
    
    lastConfigLoad = now;
  } catch (err) {
    console.error('[RateLimiter] Failed to load config, using defaults:', err.message);
  }
  
  return configCache;
}

/**
 * Get current config values (sync, uses cache)
 */
function getConfigSync() {
  // Trigger async refresh in background if needed
  if (Date.now() - lastConfigLoad > CONFIG_REFRESH_INTERVAL) {
    loadConfig().catch(() => {});
  }
  return configCache;
}

/**
 * General API rate limiter
 * Applied to all API routes, with reduced limits for restricted users
 */
const generalRateLimiter = rateLimit({
  windowMs: DEFAULTS.RATE_LIMIT_GENERAL_WINDOW, // Initial value
  max: (req) => {
    const config = getConfigSync();
    // Restricted users get lower limits
    const baseLimit = config.RATE_LIMIT_GENERAL_MAX;
    if (req.restrictedRateLimit) {
      return Math.floor(baseLimit * 0.5);
    }
    return baseLimit;
  },
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP hash + user ID for more accurate limiting
    const ipHash = req.deviceSignals?.ipHash || 'unknown';
    const userId = req.user?.id || 'anon';
    return `general:${ipHash}:${userId}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

/**
 * Strict rate limit for sensitive actions
 * Applied to high-value operations like trades, password changes
 */
const sensitiveActionLimiter = rateLimit({
  windowMs: DEFAULTS.RATE_LIMIT_SENSITIVE_WINDOW,
  max: () => getConfigSync().RATE_LIMIT_SENSITIVE_MAX,
  message: { error: 'Too many sensitive actions. Please wait before trying again.', code: 'SENSITIVE_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `sensitive:${req.user?.id || req.deviceSignals?.ipHash || 'unknown'}`;
  }
});

/**
 * Signup velocity limiter
 * Prevents rapid account creation from the same IP
 */
const signupVelocityLimiter = rateLimit({
  windowMs: DEFAULTS.RATE_LIMIT_SIGNUP_WINDOW,
  max: () => getConfigSync().RATE_LIMIT_SIGNUP_MAX,
  message: { 
    error: 'Too many accounts created from this location. Please try again later.',
    code: 'SIGNUP_VELOCITY_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `signup:${req.deviceSignals?.ipHash || 'unknown'}`;
  }
});

// NOTE: couponAttemptLimiter is NOT defined here.
// Coupon rate limiting is handled by the couponLimiter in app.js
// which is applied globally to /api/coupons/redeem route.
// The RATE_LIMIT_COUPON_* config values are kept for future use
// if we want to make the app.js limiter configurable.

/**
 * API burst protection
 * Catches rapid-fire requests that might indicate automated abuse
 */
const burstProtectionLimiter = rateLimit({
  windowMs: DEFAULTS.RATE_LIMIT_BURST_WINDOW,
  max: () => getConfigSync().RATE_LIMIT_BURST_MAX,
  message: { error: 'Request rate too high', code: 'BURST_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `burst:${req.deviceSignals?.ipHash || 'unknown'}`;
  }
});

/**
 * Force reload config from database
 * Call this when admin updates rate limit settings
 */
async function reloadConfig() {
  lastConfigLoad = 0;
  return loadConfig();
}

/**
 * Get current config values for admin display
 */
function getCurrentConfig() {
  return { ...configCache };
}

module.exports = {
  generalRateLimiter,
  sensitiveActionLimiter,
  signupVelocityLimiter,
  burstProtectionLimiter,
  reloadConfig,
  getCurrentConfig
};

