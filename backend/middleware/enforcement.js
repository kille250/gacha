/**
 * Enforcement Middleware
 * 
 * Checks user restrictions before processing requests.
 * Handles: perm_ban, temp_ban, shadowban, rate_limited, warning
 */
const { User } = require('../models');

/**
 * Main enforcement middleware
 * Should be placed AFTER auth middleware for user context
 */
const enforcementMiddleware = async (req, res, next) => {
  // Skip for unauthenticated requests
  if (!req.user || !req.user.id) {
    return next();
  }
  
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'restrictionType', 'restrictedUntil', 'restrictionReason', 'sessionInvalidatedAt']
    });
    
    if (!user) {
      return next();
    }
    
    // Check if session was invalidated (force logout)
    if (user.sessionInvalidatedAt) {
      // JWT has iat (issued at) in seconds, sessionInvalidatedAt is a Date
      const tokenIssuedAt = req.user.iat ? req.user.iat * 1000 : 0;
      const sessionInvalidatedAt = new Date(user.sessionInvalidatedAt).getTime();
      
      if (tokenIssuedAt < sessionInvalidatedAt) {
        return res.status(401).json({
          error: 'Session has been invalidated',
          code: 'SESSION_INVALIDATED',
          message: 'Please log in again'
        });
      }
    }
    
    const now = new Date();
    const restrictionType = user.restrictionType || 'none';
    
    switch (restrictionType) {
      case 'perm_ban':
        return res.status(403).json({
          error: 'Account permanently suspended',
          reason: user.restrictionReason || 'Terms of Service violation',
          canAppeal: true,
          code: 'ACCOUNT_BANNED'
        });
        
      case 'temp_ban':
        if (user.restrictedUntil && new Date(user.restrictedUntil) > now) {
          return res.status(403).json({
            error: 'Account temporarily suspended',
            reason: user.restrictionReason || 'Policy violation',
            expiresAt: user.restrictedUntil,
            code: 'ACCOUNT_TEMP_BANNED'
          });
        }
        // Temp ban expired - auto-clear (will be saved on next user action)
        req.clearRestriction = true;
        break;
        
      case 'shadowban':
        // Mark request for reduced rewards - user doesn't see this
        req.shadowbanned = true;
        break;
        
      case 'rate_limited':
        if (user.restrictedUntil && new Date(user.restrictedUntil) > now) {
          // Apply stricter rate limits
          req.restrictedRateLimit = true;
        } else {
          // Rate limit expired
          req.clearRestriction = true;
        }
        break;
        
      case 'warning':
        // Just informational, doesn't block
        req.hasWarning = true;
        break;
        
      case 'none':
      default:
        // No restrictions
        break;
    }
    
    // Auto-clear expired restrictions asynchronously (non-blocking)
    // This ensures the database stays clean without slowing down requests
    if (req.clearRestriction) {
      clearExpiredRestriction(user.id).catch(err => {
        console.error('[Enforcement] Background clear failed:', err.message);
      });
    }
    
    next();
  } catch (err) {
    // SECURITY: Fail CLOSED - errors should not bypass enforcement checks
    // This is a security-critical middleware; if we can't verify the user's
    // restriction status, we must not allow the request to proceed.
    console.error('[Enforcement] Middleware error - failing closed:', err.message);
    return res.status(503).json({
      error: 'Security verification temporarily unavailable. Please try again.',
      code: 'ENFORCEMENT_ERROR'
    });
  }
};

/**
 * Clear expired restrictions (helper, called from routes if needed)
 */
async function clearExpiredRestriction(userId) {
  try {
    await User.update(
      {
        restrictionType: 'none',
        restrictedUntil: null,
        restrictionReason: null,
        lastRestrictionChange: new Date()
      },
      { where: { id: userId } }
    );
    return true;
  } catch (err) {
    console.error('[Enforcement] Failed to clear restriction:', err.message);
    return false;
  }
}

/**
 * Check if a user is currently restricted
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - Restriction info or null
 */
async function getRestrictionStatus(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'restrictionType', 'restrictedUntil', 'restrictionReason', 'warningCount']
  });
  
  if (!user || !user.restrictionType || user.restrictionType === 'none') {
    return null;
  }
  
  const now = new Date();
  
  // Check if temp restrictions have expired
  if (['temp_ban', 'rate_limited'].includes(user.restrictionType)) {
    if (user.restrictedUntil && new Date(user.restrictedUntil) <= now) {
      await clearExpiredRestriction(userId);
      return null;
    }
  }
  
  return {
    type: user.restrictionType,
    reason: user.restrictionReason,
    expiresAt: user.restrictedUntil,
    warningCount: user.warningCount
  };
}

module.exports = {
  enforcementMiddleware,
  clearExpiredRestriction,
  getRestrictionStatus
};

