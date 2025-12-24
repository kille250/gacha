/**
 * Economy Service
 * 
 * Handles economy-related security checks including:
 * - Velocity limits (daily transaction caps)
 * - Anomaly detection
 * - Transaction logging
 */

const { AuditEvent } = require('../models');
const { Op } = require('sequelize');
const { logSecurityEvent, AUDIT_EVENTS } = require('./auditService');

// Economy velocity limits
const VELOCITY_LIMITS = {
  // Daily limits
  daily: {
    pointsEarned: 100000,      // Max points that can be earned per day
    pointsSpent: 100000,       // Max points that can be spent per day
    tradesCompleted: 200,      // Max trades per day
    rollsPerformed: 500,       // Max gacha rolls per day
    fishCaught: 1000           // Max fish per day
  },
  
  // Hourly limits (for burst detection)
  hourly: {
    pointsEarned: 20000,
    tradesCompleted: 50,
    rollsPerformed: 100
  },
  
  // Per-transaction limits
  transaction: {
    maxPointsTransfer: 50000,  // Single transfer limit
    maxTradeValue: 10000       // Max value per trade
  }
};

// Anomaly thresholds
const ANOMALY_THRESHOLDS = {
  // Rate at which actions happen (actions per minute)
  actionsPerMinute: {
    fishing: 30,     // Max 30 casts per minute
    trading: 10,     // Max 10 trades per minute
    rolling: 20      // Max 20 rolls per minute
  },
  
  // Suspicious patterns
  patternDetection: {
    // Same exact timing repeatedly (bot indicator)
    timingVariance: 50,  // If variance < 50ms, suspicious
    
    // Always at daily limit
    alwaysMaxLimitDays: 3,  // If at max limit 3+ days in a row
    
    // Unusual play hours
    unusualHoursThreshold: 0.8  // If 80%+ activity is during off-hours
  }
};

/**
 * Check if a transaction would exceed velocity limits
 * @param {number} userId - User ID
 * @param {string} type - Transaction type (pointsEarned, tradesCompleted, etc.)
 * @param {number} amount - Amount to add
 * @returns {Promise<Object>} - { allowed, current, limit, remaining }
 */
async function checkVelocityLimit(userId, type, amount = 1) {
  const dailyLimit = VELOCITY_LIMITS.daily[type];
  
  if (!dailyLimit) {
    return { allowed: true, current: 0, limit: Infinity, remaining: Infinity };
  }
  
  // Get today's start
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  // Query audit events for today
  const eventTypeMap = {
    pointsEarned: ['admin.economy.trade', 'economy.daily_reward', 'fishing.catch'],
    tradesCompleted: ['admin.economy.trade'],
    rollsPerformed: ['economy.gacha.roll'],
    fishCaught: ['fishing.catch']
  };
  
  const eventTypes = eventTypeMap[type] || [];
  
  try {
    const events = await AuditEvent.findAll({
      where: {
        userId,
        eventType: { [Op.in]: eventTypes },
        createdAt: { [Op.gte]: todayStart }
      },
      attributes: ['data']
    });
    
    // Sum up the relevant amounts
    let current = 0;
    for (const event of events) {
      const data = event.data || {};
      if (type === 'pointsEarned') {
        current += data.points || data.reward?.points || 0;
      } else {
        current += data.quantity || 1;
      }
    }
    
    const remaining = Math.max(0, dailyLimit - current);
    const allowed = current + amount <= dailyLimit;
    
    return { allowed, current, limit: dailyLimit, remaining };
  } catch (err) {
    console.error('[Economy] Velocity check error:', err.message);
    // Fail open
    return { allowed: true, current: 0, limit: dailyLimit, remaining: dailyLimit };
  }
}

/**
 * Check hourly velocity for burst detection
 * @param {number} userId - User ID
 * @param {string} type - Transaction type
 * @param {number} amount - Amount to add
 */
async function checkHourlyVelocity(userId, type, amount = 1) {
  const hourlyLimit = VELOCITY_LIMITS.hourly[type];
  
  if (!hourlyLimit) {
    return { allowed: true };
  }
  
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  try {
    const count = await AuditEvent.count({
      where: {
        userId,
        eventType: { [Op.like]: `economy.${type === 'pointsEarned' ? '%' : type}%` },
        createdAt: { [Op.gte]: hourAgo }
      }
    });
    
    return {
      allowed: count + amount <= hourlyLimit,
      current: count,
      limit: hourlyLimit
    };
  } catch (err) {
    console.error('[Economy] Hourly velocity error:', err.message);
    return { allowed: true };
  }
}

/**
 * Detect action velocity anomalies (potential bot behavior)
 * @param {number} userId - User ID
 * @param {string} actionType - Type of action (fishing, trading, rolling)
 * @returns {Promise<Object>} - { isAnomaly, reason, actionsPerMinute }
 */
async function detectVelocityAnomaly(userId, actionType) {
  const threshold = ANOMALY_THRESHOLDS.actionsPerMinute[actionType];
  
  if (!threshold) {
    return { isAnomaly: false };
  }
  
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  
  try {
    const eventTypeMap = {
      fishing: 'fishing.catch',
      trading: 'admin.economy.trade',
      rolling: 'economy.gacha.roll'
    };
    
    const count = await AuditEvent.count({
      where: {
        userId,
        eventType: eventTypeMap[actionType],
        createdAt: { [Op.gte]: oneMinuteAgo }
      }
    });
    
    if (count > threshold) {
      return {
        isAnomaly: true,
        reason: 'velocity_exceeded',
        actionsPerMinute: count,
        threshold
      };
    }
    
    return { isAnomaly: false, actionsPerMinute: count };
  } catch (err) {
    // SECURITY: Fail-closed - assume potential anomaly on error
    // This prevents attackers from exploiting errors to bypass detection
    console.error('[Economy] Anomaly detection error (fail-closed):', err.message);
    return { isAnomaly: true, reason: 'detection_error', error: true };
  }
}

/**
 * Detect timing pattern anomalies (bot behavior)
 * @param {number} userId - User ID
 * @param {string} actionType - Type of action
 * @returns {Promise<Object>} - { isAnomaly, variance }
 */
async function detectTimingAnomaly(userId, actionType) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  try {
    const events = await AuditEvent.findAll({
      where: {
        userId,
        eventType: { [Op.like]: `${actionType}%` },
        createdAt: { [Op.gte]: fiveMinutesAgo }
      },
      order: [['createdAt', 'ASC']],
      attributes: ['createdAt']
    });
    
    if (events.length < 5) {
      return { isAnomaly: false };
    }
    
    // Calculate intervals between actions
    const intervals = [];
    for (let i = 1; i < events.length; i++) {
      const interval = new Date(events[i].createdAt).getTime() - 
                       new Date(events[i-1].createdAt).getTime();
      intervals.push(interval);
    }
    
    // Calculate variance
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Very low variance indicates automation
    if (stdDev < ANOMALY_THRESHOLDS.patternDetection.timingVariance) {
      return {
        isAnomaly: true,
        reason: 'timing_pattern',
        variance: stdDev,
        threshold: ANOMALY_THRESHOLDS.patternDetection.timingVariance
      };
    }
    
    return { isAnomaly: false, variance: stdDev };
  } catch (err) {
    console.error('[Economy] Timing anomaly error:', err.message);
    return { isAnomaly: false };
  }
}

/**
 * Log an economy event with velocity tracking
 * @param {string} eventType - Type of economy event
 * @param {number} userId - User ID
 * @param {Object} data - Event data
 * @param {Object} req - Express request (optional)
 */
async function logEconomyEvent(eventType, userId, data, req = null) {
  try {
    // Check for anomalies
    const actionType = eventType.includes('trade') ? 'trading' :
                       eventType.includes('roll') ? 'rolling' :
                       eventType.includes('fish') ? 'fishing' : null;
    
    if (actionType) {
      const velocityAnomaly = await detectVelocityAnomaly(userId, actionType);
      
      if (velocityAnomaly.isAnomaly) {
        await logSecurityEvent(AUDIT_EVENTS.RATE_EXCEEDED, userId, {
          actionType,
          ...velocityAnomaly
        }, req);
        
        // Update user's risk score with standardized action identifier
        const { updateRiskScore, RISK_ACTIONS } = require('./riskService');
        await updateRiskScore(userId, { 
          action: RISK_ACTIONS.VELOCITY_BREACH,
          reason: 'velocity_anomaly_detected',
          rapidActions: true,
          actionsPerMinute: velocityAnomaly.actionsPerMinute
        });
      }
    }
    
    // Log the actual event
    const { logEconomyAction } = require('./auditService');
    await logEconomyAction(eventType, userId, data, req);
    
  } catch (err) {
    console.error('[Economy] Log event error:', err.message);
  }
}

/**
 * Get user's economy statistics for the day
 * @param {number} userId - User ID
 */
async function getDailyEconomyStats(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  try {
    const events = await AuditEvent.findAll({
      where: {
        userId,
        eventType: { [Op.like]: 'economy.%' },
        createdAt: { [Op.gte]: todayStart }
      },
      attributes: ['eventType', 'data']
    });
    
    const stats = {
      pointsEarned: 0,
      pointsSpent: 0,
      tradesCompleted: 0,
      rollsPerformed: 0,
      couponsRedeemed: 0
    };
    
    for (const event of events) {
      const data = event.data || {};
      
      if (event.eventType.includes('trade')) {
        stats.tradesCompleted++;
        if (data.reward?.points) stats.pointsEarned += data.reward.points;
      }
      
      if (event.eventType.includes('roll')) {
        stats.rollsPerformed += data.count || 1;
        if (data.cost) stats.pointsSpent += data.cost;
      }
      
      if (event.eventType.includes('coupon')) {
        stats.couponsRedeemed++;
        if (data.reward?.points) stats.pointsEarned += data.reward.points;
      }
    }
    
    return stats;
  } catch (err) {
    console.error('[Economy] Get stats error:', err.message);
    return null;
  }
}

module.exports = {
  // Limits
  VELOCITY_LIMITS,
  ANOMALY_THRESHOLDS,
  
  // Velocity checks
  checkVelocityLimit,
  checkHourlyVelocity,
  
  // Anomaly detection
  detectVelocityAnomaly,
  detectTimingAnomaly,
  
  // Logging
  logEconomyEvent,
  
  // Stats
  getDailyEconomyStats
};

