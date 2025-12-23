/**
 * Risk Scoring Service
 * 
 * Calculates and manages user risk scores based on various signals.
 * Used for automated abuse detection and graduated enforcement.
 */

const { User } = require('../models');

/**
 * Standardized action identifiers for risk scoring.
 * Use these constants to ensure consistent keys across the codebase.
 * 
 * Usage Status Legend:
 * - ACTIVE: Currently integrated and contributing to risk scoring
 * - RESERVED: Defined for future use, not yet integrated
 */
const RISK_ACTIONS = {
  // Authentication actions
  LOGIN_FAILED: 'login_failed',         // ACTIVE: auth.js /login (failed attempts)
  LOGIN_SUCCESS: 'login_success',       // ACTIVE: auth.js /login, /google
  SIGNUP: 'signup',                     // ACTIVE: auth.js /signup (used for checkSignupRisk)
  SIGNUP_BLOCKED: 'signup_blocked',     // ACTIVE: auth.js /signup (blocked registrations)
  
  // Account security actions
  PASSWORD_CHANGE: 'password_change',   // ACTIVE: auth.js /profile/password
  EMAIL_CHANGE: 'email_change',         // ACTIVE: auth.js /profile/email
  USERNAME_CHANGE: 'username_change',   // ACTIVE: auth.js /profile/username
  PREFERENCE_CHANGE: 'preference_change', // ACTIVE: auth.js /toggle-r18 (settings changes)
  ACCOUNT_RESET: 'account_reset',       // ACTIVE: auth.js /reset-account
  GOOGLE_LINK: 'google_link',           // ACTIVE: auth.js /google/relink
  GOOGLE_UNLINK: 'google_unlink',       // ACTIVE: auth.js /google/unlink
  
  // Economy actions
  COUPON_FAILED: 'coupon_failed',       // ACTIVE: coupons.js /redeem (invalid codes)
  COUPON_REDEEMED: 'coupon_redeemed',   // ACTIVE: coupons.js /redeem (successful)
  TRADE: 'trade',                       // RESERVED: Generic trade action (use TRADE_SUCCESS instead)
  TRADE_SUCCESS: 'trade_success',       // ACTIVE: fishing/trading.js /trade
  TRADE_FAILED: 'trade_failed',         // RESERVED: For failed trade attempts (validation errors)
  GACHA_ROLL: 'gacha_roll',             // ACTIVE: characters.js /roll, banners.js /:id/roll
  GACHA_MULTI_ROLL: 'gacha_multi_roll', // ACTIVE: characters.js /roll-multi, banners.js /:id/roll-multi
  BATCH_LEVEL_UP: 'batch_level_up',     // ACTIVE: characters.js /level-up-all (batch leveling)
  DOJO_CLAIM: 'dojo_claim',             // ACTIVE: dojo.js /claim
  DOJO_UPGRADE: 'dojo_upgrade',         // ACTIVE: dojo.js /upgrade (dojo upgrades)
  DAILY_REWARD: 'daily_reward',         // ACTIVE: auth.js /daily-reward
  
  // Fishing actions
  FISHING_CAST: 'fishing_cast',         // ACTIVE: fishing/core.js /cast
  FISHING_CATCH: 'fishing_catch',       // ACTIVE: fishing/core.js /catch
  FISHING_AUTOFISH: 'fishing_autofish', // ACTIVE: fishing/autofish.js
  FISHING_AREA_PURCHASE: 'fishing_area_purchase',   // ACTIVE: fishing/areas.js /unlock
  FISHING_ROD_PURCHASE: 'fishing_rod_purchase',     // ACTIVE: fishing/rods.js /buy
  PRESTIGE_CLAIM: 'prestige_claim',                 // ACTIVE: fishing/prestige.js /claim
  COLLECTION_MILESTONE: 'collection_milestone',     // ACTIVE: fishing/collection.js /claim-milestone
  
  // Anomaly detection
  VELOCITY_BREACH: 'velocity_breach',   // ACTIVE: economyService.js, fishing/trading.js
  TIMING_ANOMALY: 'timing_anomaly'      // RESERVED: For reaction time anomalies (bot detection)
};
const { Op } = require('sequelize');
const { findFingerprintCollisions } = require('../middleware/deviceSignals');
const { getDeviceBindingStatus } = require('../middleware/deviceBinding');
const { logSecurityEvent, AUDIT_EVENTS } = require('./auditService');
const { getRiskWeights } = require('./securityConfigService');

// Default risk weight configuration (can be overridden via security config)
const RISK_WEIGHTS = {
  // Positive signals (reduce risk)
  accountAge: {
    moreThan30Days: -10,
    moreThan7Days: -5,
    moreThan1Day: 0,
    lessThan1Day: 5
  },
  googleLinked: -5,
  hasPassword: -2,
  normalPlayPattern: -3,
  
  // Negative signals (increase risk)
  deviceCollision: 20,
  deviceCollisionWithBanned: 35,
  ipCollision: 10,
  
  rapidActions: 15,
  timingAnomaly: 25,
  
  previousWarning: 10, // Per warning
  failedLoginAttempt: 5, // Per failed login attempt
  failedCouponAttempts: 2, // Per failed attempt
  
  alwaysMaxDailyLimit: 5,
  unusualPlayHours: 3,
  multiAccountSuspicion: 25
};

/**
 * Get risk weights with configurable overrides
 * @returns {Promise<Object>} - Merged risk weights
 */
async function getConfigurableWeights() {
  try {
    const configWeights = await getRiskWeights();
    return {
      ...RISK_WEIGHTS,
      deviceCollision: configWeights.sharedDevice || RISK_WEIGHTS.deviceCollision,
      deviceCollisionWithBanned: configWeights.bannedDevice || RISK_WEIGHTS.deviceCollisionWithBanned,
      timingAnomaly: configWeights.timingAnomaly || RISK_WEIGHTS.timingAnomaly,
      previousWarning: configWeights.previousWarning || RISK_WEIGHTS.previousWarning,
      rapidActions: configWeights.velocityBreach || RISK_WEIGHTS.rapidActions,
      accountAge: {
        ...RISK_WEIGHTS.accountAge,
        moreThan30Days: configWeights.accountAgeBonus || RISK_WEIGHTS.accountAge.moreThan30Days
      },
      googleLinked: configWeights.verifiedAccountBonus || RISK_WEIGHTS.googleLinked
    };
  } catch (err) {
    console.error('[RiskService] Failed to get configurable weights:', err.message);
    return RISK_WEIGHTS;
  }
}

// Default thresholds for automated actions (can be overridden via security config)
const DEFAULT_RISK_THRESHOLDS = {
  MONITORING: 30,
  SOFT_RESTRICTION: 50,
  SHADOWBAN: 70,
  TEMP_BAN: 85
};

// Exported for backwards compatibility
const RISK_THRESHOLDS = DEFAULT_RISK_THRESHOLDS;

// Cached thresholds (updated periodically)
let riskThresholdsCache = { ...DEFAULT_RISK_THRESHOLDS };
let lastThresholdsLoad = 0;
const THRESHOLDS_REFRESH_INTERVAL = 60000; // 1 minute

/**
 * Get dynamic risk thresholds from SecurityConfig
 * @returns {Promise<Object>} - Risk thresholds
 */
async function getDynamicRiskThresholds() {
  const now = Date.now();
  if (now - lastThresholdsLoad < THRESHOLDS_REFRESH_INTERVAL) {
    return riskThresholdsCache;
  }
  
  try {
    const securityConfigService = require('./securityConfigService');
    const [monitoring, softRestriction, shadowban, tempBan] = await Promise.all([
      securityConfigService.getNumber('RISK_THRESHOLD_MONITORING', DEFAULT_RISK_THRESHOLDS.MONITORING),
      securityConfigService.getNumber('RISK_THRESHOLD_SOFT_RESTRICTION', DEFAULT_RISK_THRESHOLDS.SOFT_RESTRICTION),
      securityConfigService.getNumber('RISK_THRESHOLD_SHADOWBAN', DEFAULT_RISK_THRESHOLDS.SHADOWBAN),
      securityConfigService.getNumber('RISK_THRESHOLD_TEMP_BAN', DEFAULT_RISK_THRESHOLDS.TEMP_BAN)
    ]);
    
    riskThresholdsCache = {
      MONITORING: monitoring,
      SOFT_RESTRICTION: softRestriction,
      SHADOWBAN: shadowban,
      TEMP_BAN: tempBan
    };
    lastThresholdsLoad = now;
  } catch (err) {
    console.error('[RiskService] Failed to load thresholds, using defaults:', err.message);
  }
  
  return riskThresholdsCache;
}

/**
 * Calculate risk score for a user
 * @param {number} userId - User ID
 * @param {Object} context - Additional context (reactionTime, etc.)
 * @returns {Promise<number>} - Risk score (0-100)
 */
async function calculateRiskScore(userId, context = {}) {
  const user = await User.findByPk(userId);
  if (!user) return 0;
  
  // Get configurable weights
  const weights = await getConfigurableWeights();
  
  let score = 0;
  
  // === Account Age ===
  const ageInDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 30) {
    score += weights.accountAge.moreThan30Days;
  } else if (ageInDays > 7) {
    score += weights.accountAge.moreThan7Days;
  } else if (ageInDays > 1) {
    score += weights.accountAge.moreThan1Day;
  } else {
    score += weights.accountAge.lessThan1Day;
  }
  
  // === OAuth Linked ===
  if (user.googleId) {
    score += weights.googleLinked;
  }
  
  // === Has Password (not just OAuth) ===
  if (user.password) {
    score += weights.hasPassword;
  }
  
  // === Previous Warnings ===
  const warningCount = user.warningCount || 0;
  score += warningCount * weights.previousWarning;
  
  // === Context-based signals ===
  
  // Reaction time anomaly (bot detection)
  if (context.reactionTime !== undefined && context.reactionTime < 100) {
    score += weights.timingAnomaly;
  }
  
  // Device fingerprint collision
  if (context.deviceFingerprint) {
    const collisions = await findFingerprintCollisions(context.deviceFingerprint, userId);
    if (collisions.length > 0) {
      const hasBannedCollision = collisions.some(c => c.isBanned);
      if (hasBannedCollision) {
        score += weights.deviceCollisionWithBanned;
      } else {
        score += weights.deviceCollision;
      }
    }
  }
  
  // IP collision with banned users
  if (context.ipHash) {
    const bannedOnIP = await findBannedUsersOnIP(context.ipHash, userId);
    if (bannedOnIP.length > 0) {
      score += weights.ipCollision;
    }
  }
  
  // Rapid actions indicator (by rate)
  if (context.actionsPerMinute && context.actionsPerMinute > 60) {
    score += weights.rapidActions;
  }
  
  // Rapid actions flag (from trading velocity, etc.)
  if (context.rapidActions) {
    score += weights.rapidActions;
  }
  
  // Failed login attempts (incremental per attempt)
  if (context.failedAttempts && context.failedAttempts > 0) {
    score += context.failedAttempts * (weights.failedLoginAttempt || 5);
  }
  
  // Failed coupon attempts
  if (context.failedCouponAttempts && context.failedCouponAttempts > 0) {
    score += context.failedCouponAttempts * (weights.failedCouponAttempts || 2);
  }
  
  // Multi-account suspicion (e.g., from linked account detection)
  if (context.multiAccountSuspicion) {
    score += weights.multiAccountSuspicion;
  }

  // Device binding status (new/unknown device adds risk)
  if (context.deviceFingerprint) {
    try {
      const deviceStatus = await getDeviceBindingStatus(userId, context.deviceFingerprint);
      if (deviceStatus.riskContribution > 0) {
        score += deviceStatus.riskContribution;
      }
    } catch (err) {
      // Non-blocking: don't fail risk calculation if device binding check fails
      console.error('[RiskService] Device binding status check failed:', err.message);
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Update user's stored risk score
 * @param {number} userId - User ID
 * @param {Object} context - Context for calculation
 * @param {Object} options - { autoEnforce: boolean } - Whether to auto-apply enforcement
 * @returns {Promise<Object>} - { oldScore, newScore, delta, enforcement }
 */
async function updateRiskScore(userId, context = {}, options = {}) {
  const { autoEnforce = true } = options;
  const user = await User.findByPk(userId);
  if (!user) return null;
  
  const oldScore = user.riskScore || 0;
  const newScore = await calculateRiskScore(userId, context);
  
  let enforcement = null;
  
  // Only update if changed significantly (>5 points) OR if it's a security event
  const isSecurityEvent = context.failedAttempts || context.rapidActions || context.multiAccountSuspicion;
  if (Math.abs(newScore - oldScore) >= 5 || isSecurityEvent) {
    user.riskScore = newScore;
    
    // Record in history for trend analysis
    const history = user.riskScoreHistory || [];
    history.push({
      score: newScore,
      oldScore,
      timestamp: new Date().toISOString(),
      reason: context.reason || 'automatic_update'
    });
    // Keep history manageable (last 50 entries)
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    user.riskScoreHistory = history;
    
    await user.save();
    
    // Log significant changes
    if (newScore > oldScore + 10) {
      await logSecurityEvent(AUDIT_EVENTS.RISK_SCORE_CHANGE, userId, {
        oldScore,
        newScore,
        delta: newScore - oldScore,
        context
      });
    }
    
    // Auto-enforce if score increased and option enabled
    if (autoEnforce && newScore > oldScore) {
      const recommendation = await checkAutoEnforcement(userId);
      if (recommendation && recommendation.action !== 'monitor') {
        enforcement = await applyAutomatedEnforcement(userId, recommendation);
      }
    }
  }
  
  return { oldScore, newScore, delta: newScore - oldScore, enforcement };
}

/**
 * Check if user should be auto-restricted based on risk score
 * Uses dynamic thresholds from SecurityConfig for runtime configurability
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - Recommended action or null
 */
async function checkAutoEnforcement(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;
  
  const score = user.riskScore || 0;
  const currentRestriction = user.restrictionType || 'none';
  
  // Don't escalate if already restricted
  if (currentRestriction !== 'none') {
    return null;
  }
  
  // Get dynamic thresholds from config
  const thresholds = await getDynamicRiskThresholds();
  
  // New accounts get grace period (7 days)
  const ageInDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays < 7) {
    // Only warn, don't auto-restrict new accounts
    if (score >= thresholds.SHADOWBAN) {
      return { action: 'warning', reason: 'High risk score (new account grace period)' };
    }
    return null;
  }
  
  // Determine recommended action using dynamic thresholds
  if (score >= thresholds.TEMP_BAN) {
    return { action: 'temp_ban', reason: 'Extremely high risk score', duration: '7d' };
  } else if (score >= thresholds.SHADOWBAN) {
    return { action: 'shadowban', reason: 'High risk score detected' };
  } else if (score >= thresholds.SOFT_RESTRICTION) {
    return { action: 'rate_limited', reason: 'Elevated risk score', duration: '24h' };
  } else if (score >= thresholds.MONITORING) {
    return { action: 'monitor', reason: 'Risk score above monitoring threshold' };
  }
  
  return null;
}

/**
 * Get users with high risk scores (for admin review)
 * @param {number} threshold - Minimum risk score
 * @param {number} limit - Max users to return
 */
async function getHighRiskUsers(threshold = 50, limit = 50) {
  return User.findAll({
    where: {
      riskScore: { [Op.gte]: threshold },
      restrictionType: { [Op.or]: ['none', null] } // Not already restricted
    },
    order: [['riskScore', 'DESC']],
    limit,
    attributes: ['id', 'username', 'riskScore', 'warningCount', 'createdAt', 'deviceFingerprints']
  });
}

/**
 * Decay risk scores over time (call periodically)
 * Reduces scores by a percentage for users with no recent issues
 */
async function decayRiskScores(decayPercentage = 0.1) {
  const decayFactor = 1 - decayPercentage;
  
  // Find users with risk scores above 0
  const users = await User.findAll({
    where: {
      riskScore: { [Op.gt]: 5 }
    },
    attributes: ['id', 'riskScore']
  });
  
  let decayedCount = 0;
  for (const user of users) {
    const newScore = Math.floor(user.riskScore * decayFactor);
    if (newScore !== user.riskScore) {
      await User.update(
        { riskScore: newScore },
        { where: { id: user.id } }
      );
      decayedCount++;
    }
  }
  
  console.log(`[RiskService] Decayed risk scores for ${decayedCount} users`);
  return decayedCount;
}

/**
 * Parse duration string to milliseconds
 * Formats: 1h, 24h, 7d, 30d
 */
function parseDuration(durationStr) {
  if (!durationStr) return 24 * 60 * 60 * 1000; // Default 24h
  
  const match = durationStr.match(/^(\d+)(h|d|w)$/i);
  if (!match) return 24 * 60 * 60 * 1000;
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  const multipliers = { h: 3600000, d: 86400000, w: 604800000 };
  return value * (multipliers[unit] || 86400000);
}

/**
 * Apply automated enforcement based on recommendation
 * Includes escalation logic for repeat offenders
 * @param {number} userId - User ID
 * @param {Object} recommendation - From checkAutoEnforcement()
 * @returns {Promise<Object>} - { applied, escalated, oldRestriction }
 */
async function applyAutomatedEnforcement(userId, recommendation) {
  if (!recommendation || !recommendation.action || recommendation.action === 'monitor') {
    return null;
  }
  
  const { action, reason, duration } = recommendation;
  const user = await User.findByPk(userId);
  if (!user) return null;
  
  const previousRestriction = user.restrictionType || 'none';
  
  // Escalation map: if user already has a restriction, escalate to next level
  const escalationMap = {
    'none': action,
    'warning': action === 'warning' ? 'rate_limited' : action,
    'rate_limited': action === 'rate_limited' ? 'shadowban' : action,
    'shadowban': action === 'shadowban' ? 'temp_ban' : action,
    'temp_ban': 'temp_ban', // Don't auto-escalate to perm_ban
    'perm_ban': 'perm_ban'  // Already at max
  };
  
  const finalAction = escalationMap[previousRestriction] || action;
  const wasEscalated = finalAction !== action;
  
  // Calculate expiry for temporary restrictions
  let restrictedUntil = null;
  if (['temp_ban', 'rate_limited'].includes(finalAction)) {
    const durationMs = parseDuration(duration || (finalAction === 'temp_ban' ? '7d' : '24h'));
    restrictedUntil = new Date(Date.now() + durationMs);
  }
  
  // Apply the restriction
  const updateData = {
    restrictionType: finalAction,
    restrictedUntil,
    restrictionReason: wasEscalated ? `${reason} (escalated from ${action})` : reason,
    lastRestrictionChange: new Date()
  };
  
  // Increment warning count for warnings
  if (finalAction === 'warning') {
    updateData.warningCount = (user.warningCount || 0) + 1;
  }
  
  await User.update(updateData, { where: { id: userId } });
  
  // Log the automated action
  await logSecurityEvent(AUDIT_EVENTS.AUTO_RESTRICTION, userId, {
    action: finalAction,
    originalRecommendation: action,
    escalated: wasEscalated,
    previousRestriction,
    reason: updateData.restrictionReason,
    expiresAt: restrictedUntil
  });
  
  console.log(`[RiskService] Auto-enforcement: ${finalAction} applied to user ${userId} (escalated: ${wasEscalated})`);
  
  return {
    applied: finalAction,
    escalated: wasEscalated,
    oldRestriction: previousRestriction,
    expiresAt: restrictedUntil
  };
}

/**
 * Check for IP collisions with banned users
 * @param {string} ipHash - Hashed IP address
 * @param {number} excludeUserId - User ID to exclude
 * @returns {Promise<Array>} - Array of banned user IDs on same IP
 */
async function findBannedUsersOnIP(ipHash, excludeUserId = null) {
  if (!ipHash) return [];
  
  try {
    const where = {
      lastKnownIP: ipHash,
      restrictionType: { [Op.in]: ['perm_ban', 'temp_ban'] }
    };
    
    if (excludeUserId) {
      where.id = { [Op.ne]: excludeUserId };
    }
    
    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'restrictionType']
    });
    
    return users.map(u => ({
      id: u.id,
      username: u.username,
      restrictionType: u.restrictionType
    }));
  } catch (err) {
    console.error('[RiskService] IP collision check error:', err.message);
    return [];
  }
}

/**
 * Check for ban evasion signals
 * @param {number} userId - User ID
 * @param {Object} signals - { fingerprint, ipHash, username }
 * @returns {Promise<Object>} - { evasionScore, flags, shouldBlock }
 */
async function checkBanEvasion(userId, signals) {
  const { fingerprint, ipHash } = signals;
  let evasionScore = 0;
  const flags = [];
  
  // Check fingerprint collisions with banned users
  if (fingerprint) {
    const fpCollisions = await findFingerprintCollisions(fingerprint, userId);
    const bannedCollisions = fpCollisions.filter(c => c.isBanned);
    
    if (bannedCollisions.length > 0) {
      evasionScore += RISK_WEIGHTS.deviceCollisionWithBanned;
      flags.push({ signal: 'sameDeviceAsBanned', accounts: bannedCollisions });
    } else if (fpCollisions.length > 0) {
      evasionScore += RISK_WEIGHTS.deviceCollision;
      flags.push({ signal: 'deviceCollision', accounts: fpCollisions });
    }
  }
  
  // Check IP collisions with banned users
  if (ipHash) {
    const bannedOnIP = await findBannedUsersOnIP(ipHash, userId);
    if (bannedOnIP.length > 0) {
      evasionScore += RISK_WEIGHTS.ipCollision;
      flags.push({ signal: 'sameIPAsBanned', accounts: bannedOnIP });
    }
  }
  
  return {
    evasionScore,
    flags,
    shouldBlock: evasionScore >= RISK_WEIGHTS.deviceCollisionWithBanned
  };
}

/**
 * Process signup for potential abuse
 * Checks IP velocity and ban evasion
 * @param {Object} signals - Device signals from request
 * @returns {Promise<Object>} - { allowed, reason, riskScore }
 */
async function checkSignupRisk(signals) {
  const { fingerprint, ipHash } = signals;
  
  // Check ban evasion
  const evasionCheck = await checkBanEvasion(null, { fingerprint, ipHash });
  
  if (evasionCheck.shouldBlock) {
    return {
      allowed: false,
      reason: 'Account creation not available',
      riskScore: 100,
      flags: evasionCheck.flags
    };
  }
  
  // Check IP velocity (accounts created from same IP recently)
  if (ipHash) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentSignups = await User.count({
      where: {
        lastKnownIP: ipHash,
        createdAt: { [Op.gte]: oneDayAgo }
      }
    });
    
    if (recentSignups >= 5) {
      return {
        allowed: false,
        reason: 'Too many accounts created recently',
        riskScore: 75
      };
    }
    
    if (recentSignups >= 3) {
      return {
        allowed: true,
        warning: true,
        reason: 'Multiple accounts from same location',
        riskScore: 30 + (recentSignups * 10)
      };
    }
  }
  
  return {
    allowed: true,
    riskScore: evasionCheck.evasionScore
  };
}

/**
 * Helper function to build a consistent risk context object from a request.
 * Use this to ensure device signals are always extracted the same way.
 * 
 * @param {Object} req - Express request object
 * @param {string} action - RISK_ACTIONS constant
 * @param {string} reason - Human-readable reason for the update
 * @param {Object} extras - Additional context fields (failedAttempts, rapidActions, etc.)
 * @returns {Object} - Context object for updateRiskScore()
 */
function buildRiskContext(req, action, reason, extras = {}) {
  return {
    action,
    reason,
    ipHash: req.deviceSignals?.ipHash,
    deviceFingerprint: req.deviceSignals?.fingerprint,
    ...extras
  };
}

module.exports = {
  // Constants
  RISK_WEIGHTS,
  RISK_THRESHOLDS,
  RISK_ACTIONS,
  
  // Core functions
  calculateRiskScore,
  updateRiskScore,
  checkAutoEnforcement,
  getConfigurableWeights,
  getDynamicRiskThresholds,
  
  // Helpers
  buildRiskContext,
  
  // Enforcement
  applyAutomatedEnforcement,
  parseDuration,
  
  // Ban evasion
  checkBanEvasion,
  findBannedUsersOnIP,
  checkSignupRisk,
  
  // Admin functions
  getHighRiskUsers,
  decayRiskScores
};

