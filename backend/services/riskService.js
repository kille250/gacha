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

// Risk weight configuration
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
  
  let score = 0;
  
  // === Account Age ===
  const ageInDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 30) {
    score += RISK_WEIGHTS.accountAge.moreThan30Days;
  } else if (ageInDays > 7) {
    score += RISK_WEIGHTS.accountAge.moreThan7Days;
  } else if (ageInDays > 1) {
    score += RISK_WEIGHTS.accountAge.moreThan1Day;
  } else {
    score += RISK_WEIGHTS.accountAge.lessThan1Day;
  }
  
  // === OAuth Linked ===
  if (user.googleId) {
    score += RISK_WEIGHTS.googleLinked;
  }
  
  // === Has Password (not just OAuth) ===
  if (user.password) {
    score += RISK_WEIGHTS.hasPassword;
  }
  
  // === Previous Warnings ===
  const warningCount = user.warningCount || 0;
  score += warningCount * RISK_WEIGHTS.previousWarning;
  
  // === Context-based signals ===
  
  // Reaction time anomaly (bot detection)
  if (context.reactionTime !== undefined && context.reactionTime < 100) {
    score += RISK_WEIGHTS.timingAnomaly;
  }
  
  // Device fingerprint collision
  if (context.deviceFingerprint) {
    const collisions = await findFingerprintCollisions(context.deviceFingerprint, userId);
    if (collisions.length > 0) {
      const hasBannedCollision = collisions.some(c => c.isBanned);
      if (hasBannedCollision) {
        score += RISK_WEIGHTS.deviceCollisionWithBanned;
      } else {
        score += RISK_WEIGHTS.deviceCollision;
      }
    }
  }
  
  // Rapid actions indicator
  if (context.actionsPerMinute && context.actionsPerMinute > 60) {
    score += RISK_WEIGHTS.rapidActions;
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
  
  for (const user of users) {
    const newScore = Math.floor(user.riskScore * decayFactor);
    await User.update(
      { riskScore: newScore },
      { where: { id: user.id } }
    );
  }
  
  return users.length;
}

module.exports = {
  // Constants
  RISK_WEIGHTS,
  RISK_THRESHOLDS,
  
  // Core functions
  calculateRiskScore,
  updateRiskScore,
  checkAutoEnforcement,
  
  // Admin functions
  getHighRiskUsers,
  decayRiskScores
};

