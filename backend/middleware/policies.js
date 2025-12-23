/**
 * Policy-Based Access Control Middleware
 * 
 * Provides reusable policy checks for common access control scenarios.
 * Separates authorization logic from route handlers for cleaner code.
 */

const { User } = require('../models');

/**
 * Policy definitions
 * Each policy is an async function that returns { allowed: boolean, reason?: string }
 */
const policies = {
  /**
   * Check if user can trade
   * Requirements: Not shadowbanned, not rate limited, account > 24 hours old
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
    
    // Check account age
    const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 1) {
      return { 
        allowed: false, 
        reason: 'Your account must be at least 24 hours old to trade',
        retryAfter: Math.ceil(1 - accountAgeDays) * 24 * 60 * 60
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
    
    // High risk users need verification
    if (user.riskScore >= 50) {
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
    return next();
  }
  
  try {
    const result = await policy(req);
    
    if (!result.allowed) {
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
      
      return res.status(403).json(response);
    }
    
    next();
  } catch (err) {
    console.error(`[Policy] Error in ${policyName}:`, err.message);
    // Fail open for availability
    next();
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
      continue;
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
      // Continue to next policy
    }
  }
  
  next();
};

module.exports = {
  policies,
  enforcePolicy,
  enforcePolicies
};

