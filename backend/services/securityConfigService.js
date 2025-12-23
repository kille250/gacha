/**
 * Security Configuration Service
 * 
 * Provides cached access to security configuration values.
 * Centralizes security parameter management with runtime configurability.
 */

// In-memory cache for performance
const configCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Default values (fallback if DB not available)
const DEFAULTS = {
  // Risk Thresholds
  RISK_THRESHOLD_MONITORING: 30,
  RISK_THRESHOLD_SOFT_RESTRICTION: 50,
  RISK_THRESHOLD_SHADOWBAN: 70,
  RISK_THRESHOLD_TEMP_BAN: 85,
  RISK_SCORE_DECAY_PERCENTAGE: 0.1,
  
  // Risk Score Weights (for calculateRiskScore)
  RISK_WEIGHT_NEW_DEVICE: 10,
  RISK_WEIGHT_MULTIPLE_DEVICES: 15,
  RISK_WEIGHT_SHARED_DEVICE: 25,
  RISK_WEIGHT_BANNED_DEVICE: 50,
  RISK_WEIGHT_VELOCITY_BREACH: 20,
  RISK_WEIGHT_TIMING_ANOMALY: 15,
  RISK_WEIGHT_PREVIOUS_WARNING: 10,
  RISK_WEIGHT_ACCOUNT_AGE_BONUS: -5,
  RISK_WEIGHT_VERIFIED_ACCOUNT_BONUS: -10,
  
  // Rate Limits
  RATE_LIMIT_GENERAL_WINDOW: 60000,
  RATE_LIMIT_GENERAL_MAX: 100,
  RATE_LIMIT_SENSITIVE_WINDOW: 3600000,
  RATE_LIMIT_SENSITIVE_MAX: 20,
  RATE_LIMIT_SIGNUP_WINDOW: 86400000,
  RATE_LIMIT_SIGNUP_MAX: 5,
  RATE_LIMIT_COUPON_WINDOW: 900000,
  RATE_LIMIT_COUPON_MAX: 10,
  RATE_LIMIT_BURST_WINDOW: 1000,
  RATE_LIMIT_BURST_MAX: 10,
  
  // CAPTCHA
  CAPTCHA_FAILED_ATTEMPTS_THRESHOLD: 3,
  CAPTCHA_TOKEN_VALIDITY_MS: 300000,
  CAPTCHA_RISK_THRESHOLD: 50,
  CAPTCHA_SENSITIVE_ACTIONS: 'trade,coupon_redeem,password_change,account_link',
  
  // reCAPTCHA
  RECAPTCHA_ENABLED: false,
  RECAPTCHA_MIN_SCORE: 0.5,
  RECAPTCHA_SCORE_TRADE: 0.6,
  RECAPTCHA_SCORE_COUPON: 0.4,
  RECAPTCHA_SCORE_PASSWORD_CHANGE: 0.7,
  RECAPTCHA_SCORE_ACCOUNT_LINK: 0.7,
  
  // Policies
  POLICY_TRADE_ACCOUNT_AGE_HOURS: 24,
  POLICY_WARNING_ESCALATION_THRESHOLD: 3,
  POLICY_WARNING_ESCALATION_DURATION: '7d',
  
  // Enforcement
  SHADOWBAN_REWARD_MULTIPLIER: 0.1,
  SHADOWBAN_TICKET_MULTIPLIER: 0,
  SHADOWBAN_FISH_MULTIPLIER: 0.5,
  SHADOWBAN_POINTS_MULTIPLIER: 0.1,
  SHADOWBAN_TIMING_PENALTY: -100,
  RATE_LIMIT_PENALTY_MULTIPLIER: 0.5,
  RATE_LIMIT_COOLDOWN_MULTIPLIER: 2.0
};

/**
 * Get a single config value with caching
 * @param {string} key - Config key
 * @returns {Promise<*>} - Config value
 */
async function getConfig(key) {
  // Check cache first
  const cached = configCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }
  
  try {
    const SecurityConfig = require('../models/securityConfig');
    const value = await SecurityConfig.getValue(key, DEFAULTS[key]);
    
    // Cache the result
    configCache.set(key, {
      value,
      expiry: Date.now() + CACHE_TTL
    });
    
    return value;
  } catch (err) {
    console.error(`[SecurityConfig] Failed to get ${key}:`, err.message);
    return DEFAULTS[key];
  }
}

/**
 * Get multiple config values at once
 * @param {string[]} keys - Config keys
 * @returns {Promise<Object>} - Key-value map
 */
async function getConfigs(keys) {
  const result = {};
  for (const key of keys) {
    result[key] = await getConfig(key);
  }
  return result;
}

/**
 * Get a config value with optional default (alias for getConfig)
 * @param {string} key - Config key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} - Config value
 */
async function get(key, defaultValue) {
  const value = await getConfig(key);
  return value !== undefined ? value : defaultValue;
}

/**
 * Get a config value as a number
 * @param {string} key - Config key
 * @param {number} defaultValue - Default value if not found or invalid
 * @returns {Promise<number>} - Numeric config value
 */
async function getNumber(key, defaultValue) {
  const value = await getConfig(key);
  const num = parseFloat(value);
  return !isNaN(num) ? num : defaultValue;
}

/**
 * Get a config value as a boolean
 * @param {string} key - Config key
 * @param {boolean} defaultValue - Default value if not found
 * @returns {Promise<boolean>} - Boolean config value
 */
async function getBoolean(key, defaultValue) {
  const value = await getConfig(key);
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}

/**
 * Get risk thresholds
 * @returns {Promise<Object>}
 */
async function getRiskThresholds() {
  return {
    MONITORING: await getConfig('RISK_THRESHOLD_MONITORING'),
    SOFT_RESTRICTION: await getConfig('RISK_THRESHOLD_SOFT_RESTRICTION'),
    SHADOWBAN: await getConfig('RISK_THRESHOLD_SHADOWBAN'),
    TEMP_BAN: await getConfig('RISK_THRESHOLD_TEMP_BAN')
  };
}

/**
 * Get rate limit config
 * @param {string} type - 'general', 'sensitive', 'signup', 'coupon', 'burst'
 * @returns {Promise<Object>}
 */
async function getRateLimitConfig(type) {
  const prefix = `RATE_LIMIT_${type.toUpperCase()}`;
  return {
    windowMs: await getConfig(`${prefix}_WINDOW`),
    max: await getConfig(`${prefix}_MAX`)
  };
}

/**
 * Get CAPTCHA configuration
 * @returns {Promise<Object>}
 */
async function getCaptchaConfig() {
  return {
    failedAttemptsThreshold: await getConfig('CAPTCHA_FAILED_ATTEMPTS_THRESHOLD'),
    tokenValidityMs: await getConfig('CAPTCHA_TOKEN_VALIDITY_MS'),
    riskScoreThreshold: await getConfig('RISK_THRESHOLD_SOFT_RESTRICTION')
  };
}

/**
 * Get policy configuration
 * @returns {Promise<Object>}
 */
async function getPolicyConfig() {
  return {
    tradeAccountAgeHours: await getConfig('POLICY_TRADE_ACCOUNT_AGE_HOURS'),
    warningEscalationThreshold: await getConfig('POLICY_WARNING_ESCALATION_THRESHOLD'),
    warningEscalationDuration: await getConfig('POLICY_WARNING_ESCALATION_DURATION')
  };
}

/**
 * Get shadowban configuration
 * @returns {Promise<Object>}
 */
async function getShadowbanConfig() {
  return {
    rewardMultiplier: await getConfig('SHADOWBAN_REWARD_MULTIPLIER'),
    ticketMultiplier: await getConfig('SHADOWBAN_TICKET_MULTIPLIER'),
    fishMultiplier: await getConfig('SHADOWBAN_FISH_MULTIPLIER'),
    pointsMultiplier: await getConfig('SHADOWBAN_POINTS_MULTIPLIER'),
    timingPenalty: await getConfig('SHADOWBAN_TIMING_PENALTY')
  };
}

/**
 * Get risk score weights configuration
 * @returns {Promise<Object>}
 */
async function getRiskWeights() {
  return {
    newDevice: await getConfig('RISK_WEIGHT_NEW_DEVICE'),
    multipleDevices: await getConfig('RISK_WEIGHT_MULTIPLE_DEVICES'),
    sharedDevice: await getConfig('RISK_WEIGHT_SHARED_DEVICE'),
    bannedDevice: await getConfig('RISK_WEIGHT_BANNED_DEVICE'),
    velocityBreach: await getConfig('RISK_WEIGHT_VELOCITY_BREACH'),
    timingAnomaly: await getConfig('RISK_WEIGHT_TIMING_ANOMALY'),
    previousWarning: await getConfig('RISK_WEIGHT_PREVIOUS_WARNING'),
    accountAgeBonus: await getConfig('RISK_WEIGHT_ACCOUNT_AGE_BONUS'),
    verifiedAccountBonus: await getConfig('RISK_WEIGHT_VERIFIED_ACCOUNT_BONUS')
  };
}

/**
 * Get all security configuration (for admin display)
 * @returns {Promise<Object>}
 */
async function getAllSecurityConfig() {
  try {
    const SecurityConfig = require('../models/securityConfig');
    return await SecurityConfig.getAllGrouped();
  } catch (err) {
    console.error('[SecurityConfig] Failed to get all configs:', err.message);
    // Return defaults grouped by category
    return {
      risk_thresholds: Object.entries(DEFAULTS)
        .filter(([k]) => k.startsWith('RISK_'))
        .map(([key, value]) => ({ key, value, description: key })),
      rate_limits: Object.entries(DEFAULTS)
        .filter(([k]) => k.startsWith('RATE_LIMIT_'))
        .map(([key, value]) => ({ key, value, description: key })),
      captcha: Object.entries(DEFAULTS)
        .filter(([k]) => k.startsWith('CAPTCHA_'))
        .map(([key, value]) => ({ key, value, description: key })),
      policies: Object.entries(DEFAULTS)
        .filter(([k]) => k.startsWith('POLICY_'))
        .map(([key, value]) => ({ key, value, description: key })),
      enforcement: Object.entries(DEFAULTS)
        .filter(([k]) => k.startsWith('SHADOWBAN_') || k.endsWith('_MULTIPLIER'))
        .map(([key, value]) => ({ key, value, description: key }))
    };
  }
}

/**
 * Update security configuration (admin only)
 * @param {Object} updates - Key-value pairs to update
 * @param {number} adminId - Admin user ID
 * @returns {Promise<Object>} - Updated configs
 */
async function updateSecurityConfig(updates, adminId) {
  const SecurityConfig = require('../models/securityConfig');
  const { logAdminAction, AUDIT_EVENTS } = require('./auditService');
  
  // Validate keys
  const validKeys = Object.keys(DEFAULTS);
  const invalidKeys = Object.keys(updates).filter(k => !validKeys.includes(k));
  if (invalidKeys.length > 0) {
    throw new Error(`Invalid config keys: ${invalidKeys.join(', ')}`);
  }
  
  // Get old values for audit
  const oldValues = {};
  for (const key of Object.keys(updates)) {
    oldValues[key] = await getConfig(key);
  }
  
  // Update configs
  await SecurityConfig.bulkUpdate(updates, adminId);
  
  // Clear cache for updated keys
  for (const key of Object.keys(updates)) {
    configCache.delete(key);
  }
  
  // Log the change
  await logAdminAction(
    AUDIT_EVENTS.ADMIN_CONFIG_CHANGE || 'admin.config.change',
    adminId,
    null,
    { oldValues, newValues: updates }
  );
  
  return updates;
}

/**
 * Clear the config cache (for testing or forced refresh)
 */
function clearCache() {
  configCache.clear();
}

module.exports = {
  // Core functions
  getConfig,
  getConfigs,
  get,
  getNumber,
  getBoolean,
  
  // Grouped getters
  getRiskThresholds,
  getRateLimitConfig,
  getCaptchaConfig,
  getPolicyConfig,
  getShadowbanConfig,
  getRiskWeights,
  getAllSecurityConfig,
  
  // Admin functions
  updateSecurityConfig,
  clearCache,
  
  // Export defaults for reference
  DEFAULTS
};

