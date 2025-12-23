/**
 * Enhanced Rate Limiter Middleware
 * 
 * Provides request-level rate limiting with enforcement integration.
 * Uses express-rate-limit with custom key generation and limits.
 */
const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Applied to all API routes, with reduced limits for restricted users
 */
const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Restricted users get lower limits
    const baseLimit = 100;
    if (req.restrictedRateLimit) {
      return Math.floor(baseLimit * 0.5);
    }
    return baseLimit;
  },
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP hash + user ID for more accurate limiting
    const ipHash = req.deviceSignals?.ipHash || 'unknown';
    const userId = req.user?.id || 'anon';
    return `general:${ipHash}:${userId}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

/**
 * Strict rate limit for sensitive actions
 * Applied to high-value operations like trades, password changes
 */
const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many sensitive actions. Please wait before trying again.', code: 'SENSITIVE_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `sensitive:${req.user?.id || req.deviceSignals?.ipHash || 'unknown'}`;
  }
});

/**
 * Signup velocity limiter
 * Prevents rapid account creation from the same IP
 */
const signupVelocityLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 accounts per IP per day
  message: { 
    error: 'Too many accounts created from this location. Please try again later.',
    code: 'SIGNUP_VELOCITY_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `signup:${req.deviceSignals?.ipHash || 'unknown'}`;
  }
});

/**
 * Coupon brute-force prevention
 * Strict limits on coupon redemption attempts
 */
const couponAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: { 
    error: 'Too many coupon redemption attempts. Please wait before trying again.',
    code: 'COUPON_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anon';
    const ipHash = req.deviceSignals?.ipHash || 'unknown';
    return `coupon:${userId}:${ipHash}`;
  }
});

/**
 * API burst protection
 * Catches rapid-fire requests that might indicate automated abuse
 */
const burstProtectionLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second
  message: { error: 'Request rate too high', code: 'BURST_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `burst:${req.deviceSignals?.ipHash || 'unknown'}`;
  }
});

module.exports = {
  generalRateLimiter,
  sensitiveActionLimiter,
  signupVelocityLimiter,
  couponAttemptLimiter,
  burstProtectionLimiter
};

