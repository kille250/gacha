/**
 * Device Binding Middleware
 *
 * Binds sessions to devices for enhanced security on sensitive actions.
 * Integrates with the existing security architecture:
 *   - Uses admin-configurable settings from SecurityConfig
 *   - Integrates with RiskService for risk-based decisions
 *   - Follows existing middleware patterns (non-blocking by default)
 *   - Logs to AuditService for observability
 *
 * Usage:
 *   - verifyDeviceBinding: Non-blocking check, sets req.deviceVerified
 *   - requireDeviceVerification: Blocking check for critical actions
 *   - recordDeviceAfterAuth: Record device after successful authentication
 *   - deviceBindingMiddleware: Action-aware middleware factory
 */

const { User } = require('../models');
const { logSecurityEvent, AUDIT_EVENTS } = require('../services/auditService');
const { getDeviceBindingConfig } = require('../services/securityConfigService');

// Cache for config (refreshed on each request, but cached within request lifecycle)
let configCache = null;
let configCacheExpiry = 0;
const CONFIG_CACHE_TTL = 30000; // 30 seconds

/**
 * Get device binding config with short-term caching
 * @returns {Promise<Object>}
 */
async function getConfig() {
  const now = Date.now();
  if (configCache && now < configCacheExpiry) {
    return configCache;
  }
  configCache = await getDeviceBindingConfig();
  configCacheExpiry = now + CONFIG_CACHE_TTL;
  return configCache;
}

/**
 * Check if current fingerprint matches any known device for the user
 * @param {Object} user - User instance with deviceFingerprints
 * @param {string} fingerprint - Current device fingerprint
 * @returns {Object} - { isKnown, isNew, knownCount }
 */
function checkDeviceStatus(user, fingerprint) {
  if (!fingerprint || !user) {
    return { isKnown: false, isNew: false, knownCount: 0 };
  }

  const knownFingerprints = user.deviceFingerprints || [];
  const isKnown = knownFingerprints.includes(fingerprint);

  return {
    isKnown,
    isNew: !isKnown && knownFingerprints.length > 0,
    knownCount: knownFingerprints.length
  };
}

/**
 * Verify that the current device matches a known device for the user.
 * Non-blocking: sets req.deviceVerified and req.newDevice flags.
 *
 * This middleware should be placed AFTER auth middleware.
 */
const verifyDeviceBinding = async (req, res, next) => {
  // Skip if no user context
  if (!req.user?.id) {
    return next();
  }

  try {
    const config = await getConfig();

    // Skip if device binding is disabled
    if (!config.enabled) {
      req.deviceBindingDisabled = true;
      return next();
    }

    const currentFingerprint = req.deviceSignals?.fingerprint;

    // If no fingerprint provided, flag but don't block
    if (!currentFingerprint) {
      req.deviceVerified = false;
      req.deviceBindingSkipped = true;
      return next();
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'deviceFingerprints']
    });

    if (!user) {
      return next();
    }

    const deviceStatus = checkDeviceStatus(user, currentFingerprint);

    req.deviceVerified = deviceStatus.isKnown;
    req.newDevice = deviceStatus.isNew;
    req.deviceKnownCount = deviceStatus.knownCount;

    // Log new device detection if enabled
    if (deviceStatus.isNew && config.newDeviceNotify) {
      await logSecurityEvent(AUDIT_EVENTS.DEVICE_NEW, req.user.id, {
        fingerprint: currentFingerprint?.substring(0, 8) + '...',
        knownDeviceCount: deviceStatus.knownCount,
        action: req.deviceBindingAction || 'unknown'
      }, req);
    }

    next();
  } catch (err) {
    console.error('[DeviceBinding] Verification error:', err.message);
    // Non-blocking: allow request to proceed on error
    req.deviceVerified = false;
    req.deviceBindingError = true;
    next();
  }
};

/**
 * Require device verification for critical actions.
 * Blocking: returns 403 if device is not recognized.
 *
 * This should be used sparingly for high-value operations.
 */
const requireDeviceVerification = async (req, res, next) => {
  // First run the verification check
  await verifyDeviceBinding(req, res, async () => {
    try {
      const config = await getConfig();

      // Skip enforcement if disabled
      if (!config.enabled || !config.requireForSensitive) {
        return next();
      }

      // If new/unknown device, block the action
      if (req.newDevice || (req.deviceSignals?.fingerprint && !req.deviceVerified)) {
        await logSecurityEvent(AUDIT_EVENTS.DEVICE_BINDING_BLOCKED, req.user?.id, {
          action: req.deviceBindingAction || 'unknown',
          blocked: true,
          reason: 'unknown_device_for_sensitive_action',
          fingerprint: req.deviceSignals?.fingerprint?.substring(0, 8) + '...'
        }, req);

        return res.status(403).json({
          error: 'This action requires a recognized device. Please log in again from this device first.',
          code: 'DEVICE_VERIFICATION_REQUIRED',
          newDevice: true
        });
      }

      // If no fingerprint at all and strict mode is on, warn but allow
      // (for backwards compatibility with clients not sending fingerprints)
      if (!req.deviceSignals?.fingerprint && config.requireForSensitive) {
        console.warn(`[DeviceBinding] No fingerprint for sensitive action, user ${req.user?.id}`);
      }

      next();
    } catch (err) {
      console.error('[DeviceBinding] Require verification error:', err.message);
      // Fail closed for security-critical operations
      return res.status(503).json({
        error: 'Device verification temporarily unavailable. Please try again.',
        code: 'DEVICE_BINDING_ERROR'
      });
    }
  });
};

/**
 * Record device fingerprint after successful authentication.
 * Should be called AFTER successful login/signup/google auth.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const recordDeviceAfterAuth = async (req, res, next) => {
  if (!req.user?.id || !req.deviceSignals?.fingerprint) {
    return next();
  }

  try {
    const config = await getConfig();

    // Skip if recording is disabled
    if (!config.enabled || !config.recordOnAuth) {
      return next();
    }

    const { recordDeviceFingerprint, recordIPHash } = require('./deviceSignals');
    const user = await User.findByPk(req.user.id);

    if (user) {
      // Check if we're at max devices before recording
      const currentDevices = user.deviceFingerprints || [];
      const isNewDevice = !currentDevices.includes(req.deviceSignals.fingerprint);

      if (isNewDevice) {
        // Record the device (recordDeviceFingerprint handles max limit internally)
        await recordDeviceFingerprint(user, req.deviceSignals.fingerprint);

        // Log new device
        if (config.newDeviceNotify) {
          await logSecurityEvent(AUDIT_EVENTS.DEVICE_NEW, req.user.id, {
            fingerprint: req.deviceSignals.fingerprint?.substring(0, 8) + '...',
            previousDeviceCount: currentDevices.length,
            recordedOnAuth: true
          }, req);
        }
      }

      // Always update IP hash
      if (req.deviceSignals?.ipHash) {
        await recordIPHash(user, req.deviceSignals.ipHash);
      }
    }
  } catch (err) {
    console.error('[DeviceBinding] Record error:', err.message);
    // Non-blocking: don't fail auth if device recording fails
  }

  next();
};

/**
 * Action-aware device binding middleware factory.
 * Creates middleware that checks device binding based on the action type.
 *
 * Usage:
 *   router.post('/trade', [auth, deviceBindingMiddleware('trade'), ...], handler);
 *
 * @param {string} action - The action name (e.g., 'trade', 'password_change')
 * @returns {Function} - Express middleware
 */
const deviceBindingMiddleware = (action) => {
  return async (req, res, next) => {
    try {
      const config = await getConfig();

      // Skip if device binding is disabled
      if (!config.enabled) {
        return next();
      }

      // Tag the request with the action for logging
      req.deviceBindingAction = action;

      // Check if this action requires strict verification
      const requiresVerification = config.requireForSensitive &&
        config.sensitiveActions.includes(action);

      if (requiresVerification) {
        return requireDeviceVerification(req, res, next);
      } else {
        // Just verify and flag, don't block
        return verifyDeviceBinding(req, res, next);
      }
    } catch (err) {
      console.error('[DeviceBinding] Middleware error:', err.message);
      // Non-blocking on error for non-critical actions
      next();
    }
  };
};

/**
 * Detect suspicious device switching patterns.
 * Checks if user is rapidly switching between devices which may indicate
 * account sharing or credential theft.
 *
 * @param {Object} user - User instance
 * @param {string} currentFingerprint - Current device fingerprint
 * @param {Object} req - Express request (optional, for logging)
 * @returns {Promise<Object>} - { isSuspicious, reason, riskContribution }
 */
async function detectDeviceMismatch(user, currentFingerprint, req = null) {
  if (!user || !currentFingerprint) {
    return { isSuspicious: false, reason: null, riskContribution: 0 };
  }

  try {
    const config = await getConfig();
    if (!config.enabled) {
      return { isSuspicious: false, reason: 'disabled', riskContribution: 0 };
    }

    const knownFingerprints = user.deviceFingerprints || [];
    const isKnown = knownFingerprints.includes(currentFingerprint);

    // If device is known, no mismatch
    if (isKnown) {
      return { isSuspicious: false, reason: null, riskContribution: 0 };
    }

    // If this is the first device, no mismatch concern
    if (knownFingerprints.length === 0) {
      return { isSuspicious: false, reason: 'first_device', riskContribution: 0 };
    }

    // New device detected - this is a mismatch scenario
    // Log the mismatch for security monitoring
    await logSecurityEvent(AUDIT_EVENTS.DEVICE_MISMATCH, user.id, {
      fingerprint: currentFingerprint?.substring(0, 8) + '...',
      knownDeviceCount: knownFingerprints.length,
      action: req?.deviceBindingAction || 'unknown'
    }, req);

    return {
      isSuspicious: true,
      reason: 'unknown_device',
      riskContribution: config.unknownDeviceRisk,
      isNew: true,
      knownCount: knownFingerprints.length
    };
  } catch (err) {
    console.error('[DeviceBinding] Mismatch detection error:', err.message);
    return { isSuspicious: false, reason: 'error', riskContribution: 0 };
  }
}

/**
 * Get device binding status for risk scoring integration.
 * Called by RiskService to factor device status into risk calculations.
 *
 * @param {number} userId - User ID
 * @param {string} fingerprint - Current fingerprint
 * @returns {Promise<Object>} - Device status for risk calculation
 */
async function getDeviceBindingStatus(userId, fingerprint) {
  if (!userId) {
    return { status: 'no_user', riskContribution: 0 };
  }

  try {
    const config = await getConfig();

    if (!config.enabled) {
      return { status: 'disabled', riskContribution: 0 };
    }

    if (!fingerprint) {
      return { status: 'no_fingerprint', riskContribution: 0 };
    }

    const user = await User.findByPk(userId, {
      attributes: ['deviceFingerprints']
    });

    if (!user) {
      return { status: 'user_not_found', riskContribution: 0 };
    }

    const deviceStatus = checkDeviceStatus(user, fingerprint);

    if (deviceStatus.isKnown) {
      return {
        status: 'known_device',
        riskContribution: 0,
        deviceCount: deviceStatus.knownCount
      };
    }

    if (deviceStatus.isNew) {
      return {
        status: 'new_device',
        riskContribution: config.unknownDeviceRisk,
        deviceCount: deviceStatus.knownCount
      };
    }

    // First device (no history)
    return {
      status: 'first_device',
      riskContribution: 0,
      deviceCount: 0
    };
  } catch (err) {
    console.error('[DeviceBinding] Status check error:', err.message);
    return { status: 'error', riskContribution: 0 };
  }
}

/**
 * Clear a user's device bindings (for account reset/security events)
 * @param {number} userId - User ID
 * @param {string} reason - Reason for clearing
 * @returns {Promise<boolean>} - Success status
 */
async function clearDeviceBindings(userId, reason = 'manual_clear') {
  try {
    const user = await User.findByPk(userId);
    if (!user) return false;

    const previousCount = (user.deviceFingerprints || []).length;
    user.deviceFingerprints = [];
    await user.save();

    await logSecurityEvent(AUDIT_EVENTS.DEVICE_BINDING_CLEARED, userId, {
      action: 'devices_cleared',
      reason,
      previousDeviceCount: previousCount
    });

    return true;
  } catch (err) {
    console.error('[DeviceBinding] Clear error:', err.message);
    return false;
  }
}

module.exports = {
  // Middleware
  verifyDeviceBinding,
  requireDeviceVerification,
  recordDeviceAfterAuth,
  deviceBindingMiddleware,

  // Utility functions (for risk service and admin)
  getDeviceBindingStatus,
  detectDeviceMismatch,
  clearDeviceBindings,
  getConfig
};
