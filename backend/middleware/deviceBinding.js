/**
 * Device Binding Middleware
 * 
 * Binds sessions to devices for high-value actions.
 * Prevents session hijacking by requiring device verification.
 * 
 * STATUS: IMPLEMENTED BUT NOT INTEGRATED
 * These middleware functions are ready to use but not yet applied to any routes.
 * They can be added to sensitive routes when stricter device verification is needed.
 * 
 * Potential use cases:
 *   - High-value trades
 *   - Account deletion
 *   - Admin actions
 * 
 * To integrate, add to route middleware chains:
 *   router.post('/sensitive', [auth, verifyDeviceBinding, ...], handler);
 *   router.post('/critical', [auth, requireDeviceVerification, ...], handler);
 */

const { User } = require('../models');
const { logSecurityEvent, AUDIT_EVENTS } = require('../services/auditService');

/**
 * Verify that the current device matches the session's bound device
 * Used for sensitive operations like trades, password changes
 */
const verifyDeviceBinding = async (req, res, next) => {
  // Skip if no user context
  if (!req.user?.id) {
    return next();
  }
  
  const currentFingerprint = req.deviceSignals?.fingerprint;
  
  // If no fingerprint provided, allow but log
  if (!currentFingerprint) {
    // Don't block, but flag the request
    req.deviceVerified = false;
    return next();
  }
  
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['deviceFingerprints']
    });
    
    if (!user) {
      return next();
    }
    
    const knownFingerprints = user.deviceFingerprints || [];
    
    // Check if current fingerprint is in known list
    if (knownFingerprints.includes(currentFingerprint)) {
      req.deviceVerified = true;
      return next();
    }
    
    // Unknown device - flag but don't block
    req.deviceVerified = false;
    req.newDevice = true;
    
    // Log new device
    await logSecurityEvent(AUDIT_EVENTS.DEVICE_NEW, req.user.id, {
      fingerprint: currentFingerprint?.substring(0, 8) + '...',
      knownDeviceCount: knownFingerprints.length
    }, req);
    
    next();
  } catch (err) {
    console.error('[DeviceBinding] Error:', err.message);
    next();
  }
};

/**
 * Require device verification for sensitive actions
 * Blocks requests from unknown devices
 */
const requireDeviceVerification = async (req, res, next) => {
  // First run the verification check
  await verifyDeviceBinding(req, res, () => {
    // If new device, block the action
    if (req.newDevice) {
      return res.status(403).json({
        error: 'This action requires a recognized device. Please log in again.',
        code: 'DEVICE_VERIFICATION_REQUIRED',
        newDevice: true
      });
    }
    
    // If no fingerprint at all, allow for backwards compatibility
    // but log it
    if (!req.deviceVerified && req.deviceSignals?.fingerprint) {
      console.warn(`[DeviceBinding] Unverified device for user ${req.user?.id}`);
    }
    
    next();
  });
};

/**
 * Record device fingerprint after successful authentication
 */
const recordDeviceAfterAuth = async (req, res, next) => {
  if (!req.user?.id || !req.deviceSignals?.fingerprint) {
    return next();
  }
  
  try {
    const { recordDeviceFingerprint, recordIPHash } = require('./deviceSignals');
    const user = await User.findByPk(req.user.id);
    
    if (user) {
      const isNew = await recordDeviceFingerprint(user, req.deviceSignals.fingerprint);
      await recordIPHash(user, req.deviceSignals.ipHash);
      
      if (isNew) {
        await logSecurityEvent(AUDIT_EVENTS.DEVICE_NEW, req.user.id, {
          fingerprint: req.deviceSignals.fingerprint?.substring(0, 8) + '...'
        }, req);
      }
    }
  } catch (err) {
    console.error('[DeviceBinding] Record error:', err.message);
  }
  
  next();
};

module.exports = {
  verifyDeviceBinding,
  requireDeviceVerification,
  recordDeviceAfterAuth
};

