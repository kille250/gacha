/**
 * CAPTCHA Trigger Middleware
 * 
 * Triggers CAPTCHA verification for high-risk requests.
 * Works with frontend to require human verification when risk thresholds are exceeded.
 */

const { User } = require('../models');
const { RISK_THRESHOLDS } = require('../services/riskService');
const { logSecurityEvent, AUDIT_EVENTS } = require('../services/auditService');

// CAPTCHA requirement thresholds
const CAPTCHA_CONFIG = {
  // Risk score threshold that triggers CAPTCHA
  riskScoreThreshold: RISK_THRESHOLDS.SOFT_RESTRICTION, // 50
  
  // Failed attempts before requiring CAPTCHA
  failedAttemptsThreshold: 3,
  
  // Actions that can trigger CAPTCHA
  sensitiveActions: ['trade', 'coupon_redeem', 'password_change', 'account_link'],
  
  // Token validity period (5 minutes)
  tokenValidityMs: 5 * 60 * 1000,
  
  // Header name for CAPTCHA token
  tokenHeader: 'x-captcha-token'
};

// In-memory store for CAPTCHA tokens (in production, use Redis)
const captchaTokens = new Map();

// In-memory store for failed attempt counts
const failedAttempts = new Map();

/**
 * Generate a simple CAPTCHA challenge
 * In production, integrate with reCAPTCHA or hCaptcha
 */
function generateChallenge() {
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
 * Check if CAPTCHA is required for the request
 */
async function checkCaptchaRequired(req, _action) {
  const userId = req.user?.id;
  const ipHash = req.deviceSignals?.ipHash || 'unknown';
  const key = `${userId || 'anon'}:${ipHash}`;
  
  // Check failed attempts
  const attempts = failedAttempts.get(key);
  if (attempts && attempts.count >= CAPTCHA_CONFIG.failedAttemptsThreshold) {
    return { required: true, reason: 'failed_attempts' };
  }
  
  // Check risk score for authenticated users
  if (userId) {
    const user = await User.findByPk(userId, {
      attributes: ['riskScore']
    });
    
    if (user && user.riskScore >= CAPTCHA_CONFIG.riskScoreThreshold) {
      return { required: true, reason: 'high_risk' };
    }
  }
  
  return { required: false };
}

/**
 * Verify CAPTCHA token
 */
function verifyCaptchaToken(token, expectedAnswer) {
  if (!token) return false;
  
  const storedData = captchaTokens.get(token);
  if (!storedData) return false;
  
  // Check if token has expired
  if (Date.now() - storedData.createdAt > CAPTCHA_CONFIG.tokenValidityMs) {
    captchaTokens.delete(token);
    return false;
  }
  
  // Check if answer matches
  if (storedData.answer !== expectedAnswer) {
    return false;
  }
  
  // Token is valid, remove it (one-time use)
  captchaTokens.delete(token);
  return true;
}

/**
 * Middleware to check and enforce CAPTCHA for sensitive actions
 */
const captchaMiddleware = (action) => async (req, res, next) => {
  // Skip if action is not sensitive
  if (!CAPTCHA_CONFIG.sensitiveActions.includes(action)) {
    return next();
  }
  
  try {
    const captchaCheck = await checkCaptchaRequired(req, action);
    
    if (!captchaCheck.required) {
      return next();
    }
    
    // CAPTCHA is required - check for token
    const captchaToken = req.header(CAPTCHA_CONFIG.tokenHeader);
    const captchaAnswer = req.header('x-captcha-answer');
    
    if (captchaToken && captchaAnswer) {
      // Verify the CAPTCHA
      if (verifyCaptchaToken(captchaToken, captchaAnswer)) {
        // CAPTCHA passed, clear failed attempts
        const key = `${req.user?.id || 'anon'}:${req.deviceSignals?.ipHash || 'unknown'}`;
        clearFailedAttempts(key);
        return next();
      }
      
      // CAPTCHA failed
      return res.status(403).json({
        error: 'CAPTCHA verification failed',
        code: 'CAPTCHA_FAILED',
        captchaRequired: true
      });
    }
    
    // No CAPTCHA token provided - generate new challenge
    const challenge = generateChallenge();
    
    // Store the challenge
    captchaTokens.set(challenge.id, {
      answer: challenge.answer,
      createdAt: Date.now(),
      userId: req.user?.id,
      action
    });
    
    // Log the CAPTCHA trigger
    await logSecurityEvent(AUDIT_EVENTS.CAPTCHA_TRIGGERED || 'security.captcha.triggered', req.user?.id, {
      action,
      reason: captchaCheck.reason,
      ipHash: req.deviceSignals?.ipHash
    }, req);
    
    return res.status(403).json({
      error: 'CAPTCHA verification required',
      code: 'CAPTCHA_REQUIRED',
      captchaRequired: true,
      challenge: {
        id: challenge.id,
        question: challenge.question
      }
    });
    
  } catch (err) {
    console.error('[CAPTCHA] Middleware error:', err.message);
    // Fail open - don't block legitimate users due to errors
    next();
  }
};

/**
 * Cleanup expired tokens periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of captchaTokens.entries()) {
    if (now - data.createdAt > CAPTCHA_CONFIG.tokenValidityMs) {
      captchaTokens.delete(token);
    }
  }
}, 60000); // Every minute

module.exports = {
  captchaMiddleware,
  checkCaptchaRequired,
  verifyCaptchaToken,
  recordFailedAttempt,
  clearFailedAttempts,
  CAPTCHA_CONFIG
};

