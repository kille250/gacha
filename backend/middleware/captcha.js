/**
 * CAPTCHA Middleware with reCAPTCHA Integration
 * 
 * Provides human verification for high-risk requests using Google reCAPTCHA v3.
 * Falls back to simple math challenges when reCAPTCHA is not configured (dev mode).
 * 
 * Environment Variables:
 *   RECAPTCHA_SECRET_KEY - Google reCAPTCHA v3 secret key (required for production)
 *   RECAPTCHA_SITE_KEY   - Google reCAPTCHA v3 site key (for frontend, optional here)
 *   RECAPTCHA_MIN_SCORE  - Minimum score to pass (0.0-1.0, default 0.5)
 * 
 * =============================================================================
 * SECURITY MIDDLEWARE ORDER (for protected routes)
 * =============================================================================
 * The correct middleware order is critical for security. Follow this pattern:
 * 
 *   1. auth                    - Verify JWT token, attach req.user
 *   2. lockoutMiddleware()     - EARLY lockout check (fail-fast, avoids wasted work)
 *   3. enforcementMiddleware   - Check bans/restrictions (fails closed on error)
 *   4. sensitiveActionLimiter  - Rate limiting for sensitive actions
 *   5. enforcePolicy('...')    - Policy-based access control (optional)
 *   6. captchaMiddleware('...')- CAPTCHA verification for high-risk actions
 * 
 * Examples:
 *   // High-security route (password change, account linking):
 *   router.post('/secure-action', [
 *     auth, 
 *     lockoutMiddleware(),      // Fail fast if locked out
 *     enforcementMiddleware, 
 *     sensitiveActionLimiter, 
 *     enforcePolicy('canChangeAccountSettings'), 
 *     captchaMiddleware('password_change')
 *   ], handler);
 * 
 *   // Standard protected route (trade, coupon):
 *   router.post('/trade', [
 *     auth, 
 *     lockoutMiddleware(),      // Fail fast if locked out
 *     enforcementMiddleware, 
 *     sensitiveActionLimiter, 
 *     enforcePolicy('canTrade'), 
 *     captchaMiddleware('trade')
 *   ], handler);
 * 
 *   // Login (unauthenticated, uses prefix for attempt key):
 *   // Note: Login handles CAPTCHA manually due to unauthenticated nature
 *   router.post('/login', async handler);
 * 
 * IMPORTANT:
 *   - lockoutMiddleware() should be EARLY to avoid wasted work (DB queries, CAPTCHA)
 *   - enforcementMiddleware MUST come after auth (needs req.user)
 *   - All middleware fails CLOSED on errors (security-first)
 *   - captchaMiddleware should be LAST to avoid unnecessary CAPTCHA on policy denials
 *   - Use getAttemptKey(req) helper for consistent attempt tracking keys
 *   - lockoutMiddleware sets req.attemptKey for convenience in handlers
 * =============================================================================
 */

const { User } = require('../models');
const { RISK_THRESHOLDS } = require('../services/riskService');
const { logSecurityEvent, AUDIT_EVENTS } = require('../services/auditService');
const securityConfigService = require('../services/securityConfigService');

// reCAPTCHA verification endpoint
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Static configuration (headers, etc.)
const CAPTCHA_STATIC_CONFIG = {
  // Header names
  recaptchaHeader: 'x-recaptcha-token',
  fallbackTokenHeader: 'x-captcha-token',
  fallbackAnswerHeader: 'x-captcha-answer',
  
  // Environment variables (cannot be changed at runtime)
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY || null,
  recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null
};

/**
 * Get dynamic CAPTCHA configuration from SecurityConfig
 * This allows admins to adjust settings without server restart
 */
async function getCaptchaConfig() {
  return {
    // Risk score threshold that triggers CAPTCHA
    riskScoreThreshold: await securityConfigService.getNumber('CAPTCHA_RISK_THRESHOLD', RISK_THRESHOLDS.SOFT_RESTRICTION),
    
    // Failed attempts before requiring CAPTCHA
    failedAttemptsThreshold: await securityConfigService.getNumber('CAPTCHA_FAILED_ATTEMPTS_THRESHOLD', 3),
    
    // Actions that can trigger CAPTCHA
    sensitiveActions: (await securityConfigService.get('CAPTCHA_SENSITIVE_ACTIONS', 'login,trade,coupon_redeem,password_change,account_link')).split(',').map(s => s.trim()),
    
    // Token validity period for fallback challenges (5 minutes)
    tokenValidityMs: await securityConfigService.getNumber('CAPTCHA_TOKEN_VALIDITY_MS', 5 * 60 * 1000),
    
    // reCAPTCHA settings
    recaptchaEnabled: await securityConfigService.getBoolean('RECAPTCHA_ENABLED', false),
    recaptchaMinScore: await securityConfigService.getNumber('RECAPTCHA_MIN_SCORE', 0.5),
    
    // Action-specific score thresholds (lower = stricter)
    actionScoreThresholds: {
      login: await securityConfigService.getNumber('RECAPTCHA_SCORE_LOGIN', 0.5),
      trade: await securityConfigService.getNumber('RECAPTCHA_SCORE_TRADE', 0.6),
      coupon_redeem: await securityConfigService.getNumber('RECAPTCHA_SCORE_COUPON', 0.4),
      password_change: await securityConfigService.getNumber('RECAPTCHA_SCORE_PASSWORD_CHANGE', 0.7),
      account_link: await securityConfigService.getNumber('RECAPTCHA_SCORE_ACCOUNT_LINK', 0.7)
    }
  };
}

// Legacy export for backwards compatibility
const CAPTCHA_CONFIG = {
  riskScoreThreshold: RISK_THRESHOLDS.SOFT_RESTRICTION,
  failedAttemptsThreshold: 3,
  sensitiveActions: ['login', 'trade', 'coupon_redeem', 'password_change', 'account_link'],
  tokenValidityMs: 5 * 60 * 1000,
  ...CAPTCHA_STATIC_CONFIG,
  recaptchaMinScore: parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5,
  actionScoreThresholds: {
    login: 0.5,
    trade: 0.6,
    coupon_redeem: 0.4,
    password_change: 0.7,
    account_link: 0.7
  }
};

// In-memory store for fallback CAPTCHA tokens
const fallbackTokens = new Map();

// In-memory store for failed attempt counts
const failedAttempts = new Map();

// Lockout configuration (hard-coded as these are security-critical)
const LOCKOUT_CONFIG = {
  maxAttempts: 10,           // Lock after 10 failed attempts
  lockoutDurationMs: 15 * 60 * 1000,  // 15 minute lockout
  windowMs: 15 * 60 * 1000   // 15 minute window for counting attempts
};

/**
 * Check if reCAPTCHA is configured and available
 * Note: Requires both env var AND config flag
 */
async function isRecaptchaEnabled() {
  if (!CAPTCHA_STATIC_CONFIG.recaptchaSecretKey) {
    return false;
  }
  
  const config = await getCaptchaConfig();
  return config.recaptchaEnabled;
}

/**
 * Verify reCAPTCHA token with Google's API
 * @param {string} token - The reCAPTCHA response token from frontend
 * @param {string} action - Expected action name for v3 verification
 * @param {string} remoteIp - Client IP address (optional)
 * @returns {Promise<{success: boolean, score?: number, action?: string, error?: string}>}
 */
async function verifyRecaptchaToken(token, action, remoteIp = null) {
  const enabled = await isRecaptchaEnabled();
  if (!enabled) {
    return { success: false, error: 'reCAPTCHA not configured' };
  }
  
  if (!token) {
    return { success: false, error: 'No reCAPTCHA token provided' };
  }
  
  try {
    // Build verification request
    const params = new URLSearchParams({
      secret: CAPTCHA_STATIC_CONFIG.recaptchaSecretKey,
      response: token
    });
    
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }
    
    // Call Google's verification API
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      console.error('[reCAPTCHA] API request failed:', response.status);
      return { success: false, error: 'Verification API error' };
    }
    
    const result = await response.json();
    
    /*
     * reCAPTCHA v3 response format:
     * {
     *   success: boolean,
     *   score: number (0.0 - 1.0),
     *   action: string,
     *   challenge_ts: string,
     *   hostname: string,
     *   error-codes?: string[]
     * }
     */
    
    if (!result.success) {
      const errorCodes = result['error-codes'] || [];
      console.warn('[reCAPTCHA] Verification failed:', errorCodes);
      return { 
        success: false, 
        error: errorCodes.includes('timeout-or-duplicate') 
          ? 'Token expired or already used' 
          : 'Verification failed',
        errorCodes 
      };
    }
    
    // Verify action matches (prevents token reuse across actions)
    if (action && result.action && result.action !== action) {
      console.warn(`[reCAPTCHA] Action mismatch: expected ${action}, got ${result.action}`);
      return { success: false, error: 'Action mismatch', score: result.score };
    }
    
    // Get dynamic config for threshold
    const config = await getCaptchaConfig();
    const minScore = config.actionScoreThresholds[action] || config.recaptchaMinScore;
    
    // Check score threshold
    if (result.score < minScore) {
      console.warn(`[reCAPTCHA] Score too low: ${result.score} < ${minScore} for action ${action}`);
      return { 
        success: false, 
        error: 'Score below threshold',
        score: result.score,
        threshold: minScore
      };
    }
    
    return {
      success: true,
      score: result.score,
      action: result.action,
      hostname: result.hostname
    };
    
  } catch (err) {
    console.error('[reCAPTCHA] Verification error:', err.message);
    return { success: false, error: 'Verification request failed' };
  }
}

/**
 * Generate a fallback math challenge (for development/testing)
 */
function generateFallbackChallenge() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let answer;
  switch (operator) {
    case '+': answer = num1 + num2; break;
    case '-': answer = num1 - num2; break;
    case '*': answer = num1 * num2; break;
    default: answer = num1 + num2;
  }
  
  return {
    question: `${num1} ${operator} ${num2} = ?`,
    answer: answer.toString(),
    id: `cap_${Date.now()}_${Math.random().toString(36).substring(7)}`
  };
}

/**
 * Verify fallback CAPTCHA token (sync version)
 * Uses static config for token validity - prefer verifyFallbackTokenAsync for dynamic config
 * @deprecated Use verifyFallbackTokenAsync for dynamic config support
 */
function verifyFallbackToken(token, answer) {
  if (!token) return false;
  
  const storedData = fallbackTokens.get(token);
  if (!storedData) return false;
  
  // Check expiry using static config (5 minutes default)
  if (Date.now() - storedData.createdAt > CAPTCHA_CONFIG.tokenValidityMs) {
    fallbackTokens.delete(token);
    return false;
  }
  
  // Check answer
  if (storedData.answer !== answer) {
    return false;
  }
  
  // One-time use
  fallbackTokens.delete(token);
  return true;
}

/**
 * Verify fallback CAPTCHA token (async version)
 * Uses dynamic config for token validity - allows runtime adjustments
 */
async function verifyFallbackTokenAsync(token, answer) {
  if (!token) return false;
  
  const storedData = fallbackTokens.get(token);
  if (!storedData) return false;
  
  // Get dynamic token validity from config
  const config = await getCaptchaConfig();
  
  // Check expiry using dynamic config
  if (Date.now() - storedData.createdAt > config.tokenValidityMs) {
    fallbackTokens.delete(token);
    return false;
  }
  
  // Check answer
  if (storedData.answer !== answer) {
    return false;
  }
  
  // One-time use
  fallbackTokens.delete(token);
  return true;
}

/**
 * Record a failed attempt for CAPTCHA escalation
 */
function recordFailedAttempt(key) {
  const current = failedAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
  
  // Reset if window has passed (15 minutes)
  if (Date.now() - current.firstAttempt > 15 * 60 * 1000) {
    current.count = 1;
    current.firstAttempt = Date.now();
  } else {
    current.count++;
  }
  
  failedAttempts.set(key, current);
  return current.count;
}

/**
 * Clear failed attempts after successful action
 */
function clearFailedAttempts(key) {
  failedAttempts.delete(key);
}

/**
 * Generate a consistent attempt tracking key
 * Use this helper in routes to ensure keys match middleware format
 * @param {Object} req - Express request object
 * @param {string} prefix - Optional prefix for action type (e.g., 'login', 'google')
 * @returns {string} - Consistent attempt key
 */
function getAttemptKey(req, prefix = null) {
  const userId = req.user?.id || 'anon';
  const ipHash = req.deviceSignals?.ipHash || 'unknown';
  
  if (prefix) {
    return `${prefix}:${ipHash}`;
  }
  return `${userId}:${ipHash}`;
}

/**
 * Check if an account/IP is locked out due to too many failed attempts
 * @param {string} key - Attempt tracking key (e.g., 'login:ipHash')
 * @returns {{locked: boolean, remainingMs?: number, attempts?: number}}
 */
function checkLockout(key) {
  const current = failedAttempts.get(key);
  if (!current) {
    return { locked: false };
  }
  
  const now = Date.now();
  
  // Check if window has expired - reset if so
  if (now - current.firstAttempt > LOCKOUT_CONFIG.windowMs) {
    return { locked: false };
  }
  
  // Check if locked
  if (current.count >= LOCKOUT_CONFIG.maxAttempts) {
    const lockoutEndTime = current.firstAttempt + LOCKOUT_CONFIG.lockoutDurationMs;
    const remainingMs = lockoutEndTime - now;
    
    if (remainingMs > 0) {
      return { 
        locked: true, 
        remainingMs, 
        remainingSec: Math.ceil(remainingMs / 1000),
        attempts: current.count 
      };
    }
    // Lockout expired, reset counter
    failedAttempts.delete(key);
    return { locked: false };
  }
  
  return { locked: false, attempts: current.count };
}

/**
 * Get remaining attempts before lockout
 * @param {string} key - Attempt tracking key
 * @returns {number} - Remaining attempts (0 if locked)
 */
function getRemainingAttempts(key) {
  const current = failedAttempts.get(key);
  if (!current) {
    return LOCKOUT_CONFIG.maxAttempts;
  }
  
  const now = Date.now();
  
  // Window expired
  if (now - current.firstAttempt > LOCKOUT_CONFIG.windowMs) {
    return LOCKOUT_CONFIG.maxAttempts;
  }
  
  return Math.max(0, LOCKOUT_CONFIG.maxAttempts - current.count);
}

/**
 * Create a lockout check middleware
 * Use this EARLY in the middleware chain (after auth) to fail fast on locked accounts
 * This prevents running expensive operations (CAPTCHA verification, DB queries) for locked users
 * 
 * @param {string|null} prefix - Optional prefix for attempt key (e.g., 'login', 'google')
 *                               If null, uses the default user:ip key format
 * @returns {Function} Express middleware
 * 
 * Example usage:
 *   router.post('/sensitive-action', [auth, lockoutMiddleware(), enforcementMiddleware, ...], handler);
 *   router.post('/login', [lockoutMiddleware('login')], handler);  // For unauthenticated routes
 */
const lockoutMiddleware = (prefix = null) => async (req, res, next) => {
  try {
    const attemptKey = getAttemptKey(req, prefix);
    const lockoutStatus = checkLockout(attemptKey);
    
    if (lockoutStatus.locked) {
      // Log lockout attempt for audit (don't await to avoid blocking)
      const { logSecurityEvent, AUDIT_EVENTS } = require('../services/auditService');
      logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED || 'security.lockout.blocked', req.user?.id || null, {
        reason: 'Request blocked due to account lockout',
        attemptKey: attemptKey.substring(0, 20) + '...',
        remainingSec: lockoutStatus.remainingSec
      }, req).catch(() => {}); // Don't fail on logging errors
      
      return res.status(429).json({ 
        error: 'Too many failed attempts. Please try again later.',
        code: 'ACCOUNT_LOCKED',
        retryAfter: lockoutStatus.remainingSec
      });
    }
    
    // Store attempt key on request for use in handler (convenience)
    req.attemptKey = attemptKey;
    
    next();
  } catch (err) {
    // SECURITY: Fail closed - errors should not bypass lockout check
    console.error('[Lockout] Middleware error - failing closed:', err.message);
    return res.status(503).json({
      error: 'Security verification temporarily unavailable. Please try again.',
      code: 'LOCKOUT_CHECK_ERROR'
    });
  }
};

/**
 * Check if CAPTCHA is required for the request
 */
async function checkCaptchaRequired(req, _action) {
  const config = await getCaptchaConfig();
  const userId = req.user?.id;
  const ipHash = req.deviceSignals?.ipHash || 'unknown';
  const key = `${userId || 'anon'}:${ipHash}`;
  
  // Check failed attempts
  const attempts = failedAttempts.get(key);
  if (attempts && attempts.count >= config.failedAttemptsThreshold) {
    return { required: true, reason: 'failed_attempts' };
  }
  
  // Check risk score for authenticated users
  if (userId) {
    const user = await User.findByPk(userId, {
      attributes: ['riskScore']
    });
    
    if (user && user.riskScore >= config.riskScoreThreshold) {
      return { required: true, reason: 'high_risk' };
    }
  }
  
  return { required: false };
}

/**
 * Main CAPTCHA middleware
 * Supports both reCAPTCHA v3 and fallback math challenges
 * 
 * @param {string} action - The action being protected (e.g., 'trade')
 */
const captchaMiddleware = (action) => async (req, res, next) => {
  try {
    // Get dynamic config
    const config = await getCaptchaConfig();
    
    // Skip if action is not sensitive
    if (!config.sensitiveActions.includes(action)) {
      return next();
    }
    
    const captchaCheck = await checkCaptchaRequired(req, action);
    
    if (!captchaCheck.required) {
      return next();
    }
    
    const key = `${req.user?.id || 'anon'}:${req.deviceSignals?.ipHash || 'unknown'}`;
    const clientIp = req.deviceSignals?.rawIP || req.ip;
    const recaptchaEnabled = await isRecaptchaEnabled();
    
    // Check for reCAPTCHA token first
    const recaptchaToken = req.header(CAPTCHA_STATIC_CONFIG.recaptchaHeader);
    
    if (recaptchaToken && recaptchaEnabled) {
      const result = await verifyRecaptchaToken(recaptchaToken, action, clientIp);
      
      if (result.success) {
        // reCAPTCHA passed
        clearFailedAttempts(key);
        
        // Store score in request for potential use downstream
        req.recaptchaScore = result.score;
        
        return next();
      }
      
      // reCAPTCHA failed - log and return error
      await logSecurityEvent(AUDIT_EVENTS.CAPTCHA_FAILED || 'security.captcha.failed', req.user?.id, {
        action,
        reason: result.error,
        score: result.score,
        type: 'recaptcha'
      }, req);
      
      return res.status(403).json({
        error: 'CAPTCHA verification failed',
        code: 'CAPTCHA_FAILED',
        captchaRequired: true,
        captchaType: 'recaptcha',
        details: result.error
      });
    }
    
    // Check for fallback CAPTCHA token
    const fallbackToken = req.header(CAPTCHA_STATIC_CONFIG.fallbackTokenHeader);
    const fallbackAnswer = req.header(CAPTCHA_STATIC_CONFIG.fallbackAnswerHeader);
    
    if (fallbackToken && fallbackAnswer) {
      // Use async version for dynamic config support
      if (await verifyFallbackTokenAsync(fallbackToken, fallbackAnswer)) {
        clearFailedAttempts(key);
        return next();
      }
      
      // Fallback CAPTCHA failed
      await logSecurityEvent(AUDIT_EVENTS.CAPTCHA_FAILED || 'security.captcha.failed', req.user?.id, {
        action,
        reason: 'Invalid answer',
        type: 'fallback'
      }, req);
      
      return res.status(403).json({
        error: 'CAPTCHA verification failed',
        code: 'CAPTCHA_FAILED',
        captchaRequired: true,
        captchaType: 'fallback'
      });
    }
    
    // No valid token provided - require CAPTCHA
    await logSecurityEvent(AUDIT_EVENTS.CAPTCHA_TRIGGERED || 'security.captcha.triggered', req.user?.id, {
      action,
      reason: captchaCheck.reason,
      ipHash: req.deviceSignals?.ipHash,
      recaptchaEnabled
    }, req);
    
    // If reCAPTCHA is enabled, tell frontend to use it
    if (recaptchaEnabled) {
      return res.status(403).json({
        error: 'CAPTCHA verification required',
        code: 'CAPTCHA_REQUIRED',
        captchaRequired: true,
        captchaType: 'recaptcha',
        siteKey: CAPTCHA_STATIC_CONFIG.recaptchaSiteKey,
        action: action
      });
    }
    
    // Fallback: generate math challenge
    const challenge = generateFallbackChallenge();
    
    fallbackTokens.set(challenge.id, {
      answer: challenge.answer,
      createdAt: Date.now(),
      userId: req.user?.id,
      action
    });
    
    return res.status(403).json({
      error: 'CAPTCHA verification required',
      code: 'CAPTCHA_REQUIRED',
      captchaRequired: true,
      captchaType: 'fallback',
      challenge: {
        id: challenge.id,
        question: challenge.question
      }
    });
    
  } catch (err) {
    console.error('[CAPTCHA] Middleware error:', err.message);
    // SECURITY: Fail closed - errors should not bypass CAPTCHA
    // If CAPTCHA check itself fails, require CAPTCHA to be safe
    return res.status(403).json({
      error: 'Security verification temporarily unavailable. Please try again.',
      code: 'CAPTCHA_ERROR',
      captchaRequired: true,
      captchaType: 'fallback'
    });
  }
};

/**
 * Standalone reCAPTCHA verification function
 * Use this for custom verification outside the middleware
 */
async function verifyRecaptcha(token, action, req = null) {
  const clientIp = req?.deviceSignals?.rawIP || req?.ip || null;
  return verifyRecaptchaToken(token, action, clientIp);
}

/**
 * Cleanup expired fallback tokens periodically
 */
setInterval(async () => {
  const now = Date.now();
  
  // Get token validity from config (with fallback)
  let tokenValidityMs = 5 * 60 * 1000;
  try {
    const config = await getCaptchaConfig();
    tokenValidityMs = config.tokenValidityMs;
  } catch (_err) {
    // Use default if config unavailable
  }
  
  for (const [token, data] of fallbackTokens.entries()) {
    if (now - data.createdAt > tokenValidityMs) {
      fallbackTokens.delete(token);
    }
  }
  
  // Also clean up old failed attempts (15 minute window)
  for (const [key, data] of failedAttempts.entries()) {
    if (now - data.firstAttempt > 15 * 60 * 1000) {
      failedAttempts.delete(key);
    }
  }
}, 60000); // Every minute

module.exports = {
  // Middleware
  captchaMiddleware,
  lockoutMiddleware,  // Early lockout check middleware for fail-fast behavior
  
  // Verification functions
  verifyRecaptcha,
  verifyRecaptchaToken,
  verifyFallbackToken,
  verifyFallbackTokenAsync,
  
  // Utility functions
  checkCaptchaRequired,
  recordFailedAttempt,
  clearFailedAttempts,
  isRecaptchaEnabled,
  getAttemptKey,  // Helper for consistent key generation
  
  // Lockout functions
  checkLockout,
  getRemainingAttempts,
  LOCKOUT_CONFIG,
  
  // Configuration (getCaptchaConfig for dynamic config, CAPTCHA_CONFIG for static defaults)
  getCaptchaConfig,
  CAPTCHA_CONFIG
};
