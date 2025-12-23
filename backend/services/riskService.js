/**
 * Risk Scoring Service
 * 
 * Calculates and manages user risk scores based on various signals.
 * Used for automated abuse detection and graduated enforcement.
 */

const { User } = require('../models');
const { Op } = require('sequelize');
const { findFingerprintCollisions } = require('../middleware/deviceSignals');
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

// Thresholds for automated actions
const RISK_THRESHOLDS = {
  MONITORING: 30,
  SOFT_RESTRICTION: 50,
  SHADOWBAN: 70,
  TEMP_BAN: 85
};

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
  
  // Rapid actions indicator
  if (context.actionsPerMinute && context.actionsPerMinute > 60) {
    score += weights.rapidActions;
  }
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Update user's stored risk score
 * @param {number} userId - User ID
 * @param {Object} context - Context for calculation
 * @returns {Promise<Object>} - { oldScore, newScore, delta }
 */
async function updateRiskScore(userId, context = {}) {
  const user = await User.findByPk(userId);
  if (!user) return null;
  
  const oldScore = user.riskScore || 0;
  const newScore = await calculateRiskScore(userId, context);
  
  // Only update if changed significantly (>5 points)
  if (Math.abs(newScore - oldScore) >= 5) {
    user.riskScore = newScore;
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
  }
  
  return { oldScore, newScore, delta: newScore - oldScore };
}

/**
 * Check if user should be auto-restricted based on risk score
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
  
  // New accounts get grace period (7 days)
  const ageInDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays < 7) {
    // Only warn, don't auto-restrict new accounts
    if (score >= RISK_THRESHOLDS.SHADOWBAN) {
      return { action: 'warning', reason: 'High risk score (new account grace period)' };
    }
    return null;
  }
  
  // Determine recommended action
  if (score >= RISK_THRESHOLDS.TEMP_BAN) {
    return { action: 'temp_ban', reason: 'Extremely high risk score', duration: '7d' };
  } else if (score >= RISK_THRESHOLDS.SHADOWBAN) {
    return { action: 'shadowban', reason: 'High risk score detected' };
  } else if (score >= RISK_THRESHOLDS.SOFT_RESTRICTION) {
    return { action: 'rate_limited', reason: 'Elevated risk score', duration: '24h' };
  } else if (score >= RISK_THRESHOLDS.MONITORING) {
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

module.exports = {
  // Constants
  RISK_WEIGHTS,
  RISK_THRESHOLDS,
  
  // Core functions
  calculateRiskScore,
  updateRiskScore,
  checkAutoEnforcement,
  getConfigurableWeights,
  
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

