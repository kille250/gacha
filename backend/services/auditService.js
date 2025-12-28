/**
 * Audit Service
 * 
 * Centralized logging for security-relevant events.
 * Supports both database storage and console logging.
 */

// Event type constants
const AUDIT_EVENTS = {
  // Authentication
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILED: 'auth.login.failed',
  SIGNUP: 'auth.signup',
  SIGNUP_BLOCKED: 'auth.signup.blocked',
  GOOGLE_LOGIN: 'auth.google.login',
  PASSWORD_CHANGE: 'auth.password.change',
  
  // Economy actions
  TRADE_COMPLETED: 'admin.economy.trade',
  GACHA_ROLL: 'economy.gacha.roll',
  COUPON_REDEEMED: 'economy.coupon.redeemed',
  COUPON_FAILED: 'economy.coupon.failed',
  DAILY_REWARD: 'economy.daily_reward',
  ECONOMY_ANOMALY: 'economy.anomaly',
  ECONOMY_VELOCITY: 'economy.velocity_breach',
  
  // Fishing
  FISH_CAUGHT: 'fishing.catch',
  AUTOFISH_SESSION: 'fishing.autofish',
  
  // Admin actions
  ADMIN_RESTRICT: 'admin.restrict',
  ADMIN_UNRESTRICT: 'admin.unrestrict',
  ADMIN_WARNING: 'admin.warning',
  ADMIN_POINTS_ADJUST: 'admin.points_adjust',
  ADMIN_PASSWORD_RESET: 'admin.password_reset',
  
  // Security events
  DEVICE_NEW: 'admin.security.deviceNew',
  DEVICE_COLLISION: 'admin.security.deviceCollision',
  DEVICE_MISMATCH: 'admin.security.deviceMismatch',
  DEVICE_BINDING_BLOCKED: 'admin.security.deviceBindingBlocked',
  DEVICE_BINDING_CLEARED: 'admin.security.deviceBindingCleared',
  RISK_SCORE_CHANGE: 'admin.security.riskChange',
  AUTO_RESTRICTION: 'security.auto_restriction',
  BAN_EVASION: 'security.ban_evasion',
  CAPTCHA_TRIGGERED: 'security.captcha.triggered',
  CAPTCHA_FAILED: 'security.captcha.failed',
  
  // Anomalies
  TIMING_ANOMALY: 'anomaly.timing',
  RATE_EXCEEDED: 'anomaly.rate_exceeded',
  SUSPICIOUS_PATTERN: 'anomaly.suspicious',
  VELOCITY_EXCEEDED: 'anomaly.velocity_exceeded',
  
  // Policy enforcement
  POLICY_DENIED: 'policy.denied',
  
  // Session management
  SESSION_INVALIDATED: 'session.invalidated',
  FORCE_LOGOUT: 'admin.session.force_logout',
  
  // Appeals
  APPEAL_SUBMITTED: 'appeal.submitted',
  APPEAL_APPROVED: 'appeal.approved',
  APPEAL_DENIED: 'appeal.denied',
  
  // Admin security actions
  ADMIN_CLEAR_DEVICES: 'admin.security.clear_devices',
  ADMIN_RESET_RISK: 'admin.security.reset_risk',
  ADMIN_RECALCULATE_RISK: 'admin.security.recalculate_risk',
  ADMIN_CONFIG_CHANGE: 'admin.security.config_change',
  ADMIN_BULK_ACTION: 'admin.security.bulk_action',
  ADMIN_EXPORT_AUDIT: 'admin.security.export_audit'
};

// Severity levels
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * Log an audit event
 * @param {Object} event - Event details
 */
async function logEvent(event) {
  const {
    eventType,
    severity = SEVERITY.INFO,
    userId = null,
    adminId = null,
    targetUserId = null,
    data = {},
    req = null // Express request object for context
  } = event;
  
  // Extract request context if provided
  let ipHash = null;
  let userAgent = null;
  let deviceFingerprint = null;
  
  if (req) {
    ipHash = req.deviceSignals?.ipHash || null;
    userAgent = req.headers?.['user-agent']?.substring(0, 255) || null;
    deviceFingerprint = req.deviceSignals?.fingerprint || null;
  }
  
  // Always log to console for immediate visibility
  const LOG_PREFIXES = {
    [SEVERITY.CRITICAL]: '[CRITICAL]',
    [SEVERITY.WARNING]: '[WARN]',
    [SEVERITY.INFO]: '[INFO]'
  };
  const logPrefix = LOG_PREFIXES[severity] || '[INFO]';
  console.log(`[AUDIT] ${logPrefix} ${eventType}`, JSON.stringify({
    userId,
    targetUserId,
    ...data
  }));
  
  // Try to persist to database
  try {
    const AuditEvent = require('../models/auditEvent');
    await AuditEvent.log({
      eventType,
      severity,
      userId,
      adminId,
      targetUserId,
      data,
      ipHash,
      userAgent,
      deviceFingerprint
    });
  } catch (err) {
    // Database logging failed - already logged to console
    console.error('[AUDIT] DB write failed:', err.message);
  }
}

/**
 * Log a security-critical event (shorthand)
 */
async function logSecurityEvent(eventType, userId, data = {}, req = null) {
  return logEvent({
    eventType,
    severity: SEVERITY.WARNING,
    userId,
    data,
    req
  });
}

/**
 * Log an admin action
 */
async function logAdminAction(eventType, adminId, targetUserId, data = {}, req = null) {
  return logEvent({
    eventType,
    severity: SEVERITY.WARNING,
    adminId,
    targetUserId,
    data,
    req
  });
}

/**
 * Log an economy action
 */
async function logEconomyAction(eventType, userId, data = {}, req = null) {
  return logEvent({
    eventType,
    severity: SEVERITY.INFO,
    userId,
    data,
    req
  });
}

/**
 * Log a critical security event
 */
async function logCritical(eventType, userId, data = {}, req = null) {
  return logEvent({
    eventType,
    severity: SEVERITY.CRITICAL,
    userId,
    data,
    req
  });
}

/**
 * Get audit trail for a user
 */
async function getUserAuditTrail(userId, options = {}) {
  try {
    const AuditEvent = require('../models/auditEvent');
    return AuditEvent.getForUser(userId, options);
  } catch (err) {
    console.error('[AUDIT] Failed to get audit trail:', err.message);
    return [];
  }
}

/**
 * Get recent security events (for admin dashboard)
 */
async function getSecurityEvents(options = {}) {
  try {
    const AuditEvent = require('../models/auditEvent');
    return AuditEvent.getSecurityEvents(options);
  } catch (err) {
    console.error('[AUDIT] Failed to get security events:', err.message);
    return [];
  }
}

module.exports = {
  // Event types
  AUDIT_EVENTS,
  SEVERITY,
  
  // Logging functions
  logEvent,
  logSecurityEvent,
  logAdminAction,
  logEconomyAction,
  logCritical,
  
  // Query functions
  getUserAuditTrail,
  getSecurityEvents
};

