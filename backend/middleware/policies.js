/**
 * Policy-Based Access Control Middleware
 * 
 * Provides reusable policy checks for common access control scenarios.
 * Separates authorization logic from route handlers for cleaner code.
 * 
 * Policy thresholds are configurable via SecurityConfig admin interface.
 */

const { User } = require('../models');
const { logSecurityEvent, AUDIT_EVENTS } = require('../services/auditService');
const securityConfigService = require('../services/securityConfigService');

/**
 * Policy definitions
 * Each policy is an async function that returns { allowed: boolean, reason?: string }
 */
const policies = {
  /**
   * Check if user can trade
   * Requirements: Not shadowbanned, not rate limited, account age meets threshold
   * 
   * Configurable via: POLICY_TRADE_ACCOUNT_AGE_HOURS (default: 24)
   */
  canTrade: async (req) => {
    // Shadowbanned users can't trade (but don't reveal why)
    if (req.shadowbanned) {
      return { allowed: false, reason: 'Trading is temporarily unavailable' };
    }
    
    // Rate limited users can't trade
    if (req.restrictedRateLimit) {
      return { allowed: false, reason: 'Your account is under review' };
    }
    
    if (!req.user?.id) {
      return { allowed: false, reason: 'Authentication required' };
    }
    
    const user = await User.findByPk(req.user.id, {
      attributes: ['createdAt', 'restrictionType']
    });
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    // Check account age against configurable threshold
    const tradeAgeHours = await securityConfigService.getNumber('POLICY_TRADE_ACCOUNT_AGE_HOURS', 24);
    const accountAgeHours = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);
    
    if (accountAgeHours < tradeAgeHours) {
      const hoursRemaining = Math.ceil(tradeAgeHours - accountAgeHours);
      return { 
        allowed: false, 
        reason: `Your account must be at least ${tradeAgeHours} hours old to trade`,
        retryAfter: hoursRemaining * 60 * 60
      };
    }
    
    return { allowed: true };
  },
  
  /**
   * Check if user can use autofish
   * Requirements: Feature unlocked by rank
   */
  canUseAutofish: async (req) => {
    if (!req.user?.id) {
      return { allowed: false, reason: 'Authentication required' };
    }
    
    const user = await User.findByPk(req.user.id, {
      attributes: ['autofishUnlockedByRank', 'autofishEnabled']
    });
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    if (!user.autofishUnlockedByRank) {
      return { allowed: false, reason: 'Autofish is not unlocked. Reach a higher rank to unlock it.' };
    }
    
    return { allowed: true };
  },
  
  /**
   * Check if user can redeem coupons
   * Requirements: Not banned, not rate limited
   */
  canRedeemCoupon: async (req) => {
    if (req.shadowbanned || req.restrictedRateLimit) {
      return { allowed: false, reason: 'Coupon redemption is temporarily unavailable' };
    }
    
    return { allowed: true };
  },
  
  /**
   * Check if user can perform high-value actions
   * Requirements: Low risk score, verified account
   * 
   * Configurable via: RISK_THRESHOLD_SOFT_RESTRICTION (default: 50)
   */
  canPerformHighValueAction: async (req) => {
    if (req.shadowbanned) {
      return { allowed: false, reason: 'Action not available' };
    }
    
    if (!req.user?.id) {
      return { allowed: false, reason: 'Authentication required' };
    }
    
    const user = await User.findByPk(req.user.id, {
      attributes: ['riskScore', 'googleId', 'email']
    });
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    // High risk users need verification (threshold from config)
    const riskThreshold = await securityConfigService.getNumber('RISK_THRESHOLD_SOFT_RESTRICTION', 50);
    if (user.riskScore >= riskThreshold) {
      return { 
        allowed: false, 
        reason: 'Additional verification required',
        requiresVerification: true
      };
    }
    
    return { allowed: true };
  },
  
  /**
   * Check if user can access R18 content
   * Requirements: Admin-enabled allowR18, user-enabled showR18
   */
  canAccessR18: async (req) => {
    if (!req.user?.id) {
      return { allowed: false, reason: 'Authentication required' };
    }
    
    const user = await User.findByPk(req.user.id, {
      attributes: ['allowR18', 'showR18']
    });
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    if (!user.allowR18) {
      return { allowed: false, reason: 'R18 access not enabled for your account' };
    }
    
    if (!user.showR18) {
      return { allowed: false, reason: 'R18 content is disabled in your settings' };
    }
    
    return { allowed: true };
  },
  
  /**
   * Check if user can change sensitive account settings
   * Requirements: Not new account, not restricted
   */
  canChangeAccountSettings: async (req) => {
    if (req.restrictedRateLimit) {
      return { allowed: false, reason: 'Account settings cannot be changed while under review' };
    }
    
    return { allowed: true };
  },
  
  /**
   * Check if user can perform gacha pulls
   * Requirements: Not banned, not shadowbanned, not rate limited
   */
  canGachaPull: async (req) => {
    if (req.shadowbanned) {
      return { allowed: false, reason: 'Gacha pulls are temporarily unavailable' };
    }
    
    if (req.restrictedRateLimit) {
      return { allowed: false, reason: 'Your account is under review' };
    }
    
    if (!req.user?.id) {
      return { allowed: false, reason: 'Authentication required' };
    }
    
    const user = await User.findByPk(req.user.id, {
      attributes: ['restrictionType', 'restrictedUntil']
    });
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    // Check for active ban
    if (user.restrictionType === 'banned') {
      return { allowed: false, reason: 'Your account is banned from this action' };
    }
    
    // Check for active temporary restriction
    if (user.restrictionType === 'restricted' && user.restrictedUntil) {
      const now = new Date();
      if (new Date(user.restrictedUntil) > now) {
        const hoursRemaining = Math.ceil((new Date(user.restrictedUntil) - now) / (1000 * 60 * 60));
        return { 
          allowed: false, 
          reason: `Gacha pulls are restricted for ${hoursRemaining} more hour(s)`,
          restrictedUntil: user.restrictedUntil
        };
      }
    }
    
    return { allowed: true };
  },
  
  /**
   * Check if user can claim dojo/idle rewards
   * Requirements: Not banned, not shadowbanned
   */
  canClaimRewards: async (req) => {
    if (req.shadowbanned) {
      return { allowed: false, reason: 'Rewards are temporarily unavailable' };
    }
    
    if (req.restrictedRateLimit) {
      return { allowed: false, reason: 'Your account is under review' };
    }
    
    if (!req.user?.id) {
      return { allowed: false, reason: 'Authentication required' };
    }
    
    const user = await User.findByPk(req.user.id, {
      attributes: ['restrictionType', 'restrictedUntil']
    });
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    // Check for active ban
    if (user.restrictionType === 'banned') {
      return { allowed: false, reason: 'Your account is banned from claiming rewards' };
    }
    
    return { allowed: true };
  }
};

/**
 * Create middleware from a policy name
 * @param {string} policyName - Name of the policy to enforce
 * @returns {Function} Express middleware
 */
const enforcePolicy = (policyName) => async (req, res, next) => {
  const policy = policies[policyName];
  
  if (!policy) {
    console.error(`[Policy] Unknown policy: ${policyName}`);
    // SECURITY: Unknown policy should fail closed, not open
    return res.status(500).json({
      error: 'Security verification temporarily unavailable. Please try again.',
      code: 'POLICY_ERROR'
    });
  }
  
  try {
    const result = await policy(req);
    
    if (!result.allowed) {
      // Log policy denial to audit trail
      if (req.user?.id) {
        await logSecurityEvent(AUDIT_EVENTS.POLICY_DENIED, req.user.id, {
          policy: policyName,
          reason: result.reason,
          path: req.originalUrl,
          method: req.method
        }, req).catch(err => {
          console.error('[Policy] Failed to log denial:', err.message);
        });
      }
      
      const response = { 
        error: result.reason || 'Action not permitted',
        code: 'POLICY_DENIED'
      };
      
      if (result.retryAfter) {
        response.retryAfter = result.retryAfter;
      }
      
      if (result.requiresVerification) {
        response.requiresVerification = true;
      }
      
      if (result.restrictedUntil) {
        response.restrictedUntil = result.restrictedUntil;
      }
      
      return res.status(403).json(response);
    }
    
    next();
  } catch (err) {
    console.error(`[Policy] Error in ${policyName}:`, err.message);
    // SECURITY: Fail closed - errors should not bypass policy checks
    return res.status(500).json({
      error: 'Security verification temporarily unavailable. Please try again.',
      code: 'POLICY_ERROR'
    });
  }
};

/**
 * Check multiple policies (all must pass)
 * @param {...string} policyNames - Names of policies to check
 * @returns {Function} Express middleware
 */
const enforcePolicies = (...policyNames) => async (req, res, next) => {
  for (const policyName of policyNames) {
    const policy = policies[policyName];
    
    if (!policy) {
      console.error(`[Policy] Unknown policy: ${policyName}`);
      // SECURITY: Unknown policy should fail closed
      return res.status(500).json({
        error: 'Security verification temporarily unavailable. Please try again.',
        code: 'POLICY_ERROR'
      });
    }
    
    try {
      const result = await policy(req);
      
      if (!result.allowed) {
        return res.status(403).json({
          error: result.reason || 'Action not permitted',
          code: 'POLICY_DENIED'
        });
      }
    } catch (err) {
      console.error(`[Policy] Error in ${policyName}:`, err.message);
      // SECURITY: Fail closed - errors should not bypass policy checks
      return res.status(500).json({
        error: 'Security verification temporarily unavailable. Please try again.',
        code: 'POLICY_ERROR'
      });
    }
  }
  
  next();
};

module.exports = {
  policies,
  enforcePolicy,
  enforcePolicies
};

