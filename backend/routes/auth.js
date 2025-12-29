const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const auth = require('../middleware/auth');
const { User, PasswordResetHistory } = require('../models');
const { validateUsername, validatePassword, validateEmail } = require('../utils/validation');
const { checkSignupRisk, updateRiskScore, RISK_ACTIONS } = require('../services/riskService');
const { recordDeviceFingerprint, recordIPHash } = require('../middleware/deviceSignals');
const { deviceBindingMiddleware } = require('../middleware/deviceBinding');
const { logSecurityEvent, logEvent, AUDIT_EVENTS, SEVERITY } = require('../services/auditService');
const { enforcementMiddleware, getRestrictionStatus } = require('../middleware/enforcement');
const { enforcePolicy } = require('../middleware/policies');
const { 
  captchaMiddleware,
  lockoutMiddleware,  // Early lockout check for fail-fast behavior
  recordFailedAttempt, 
  clearFailedAttempts,
  checkLockout,
  getRemainingAttempts,
  verifyRecaptcha,
  verifyFallbackTokenAsync,
  isRecaptchaEnabled,
  getAttemptKey,
  CAPTCHA_CONFIG,
  getCaptchaConfig,
  getLockoutConfig
} = require('../middleware/captcha');
const { sensitiveActionLimiter, generalRateLimiter, signupVelocityLimiter } = require('../middleware/rateLimiter');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/daily-reward - Claim hourly reward
// Note: Route name is legacy ("daily") but actual interval is 1 hour for better engagement
// Security: lockout checked, enforcement checked, rate limited, risk tracked
router.post('/daily-reward', [auth, lockoutMiddleware(), enforcementMiddleware, generalRateLimiter], async (req, res) => {
  try {
    // SECURITY: Track daily reward claim for risk scoring
    await updateRiskScore(req.user.id, {
      action: RISK_ACTIONS.DAILY_REWARD,
      reason: 'daily_reward_claimed',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const now = new Date();
    const lastReward = user.lastDailyReward ? new Date(user.lastDailyReward) : null;
    
    // Check if 1 hour has passed since last reward
    const rewardInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (lastReward && now - lastReward < rewardInterval) {
      // Calculate remaining time in minutes:seconds
      const remainingTime = rewardInterval - (now - lastReward);
      const minutes = Math.floor(remainingTime / (60 * 1000));
      const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
      
      return res.status(400).json({ 
        error: 'You already collected your hourly reward', 
        nextRewardTime: {
          hours: 0,
          minutes,
          seconds,
          timestamp: new Date(lastReward.getTime() + rewardInterval)
        }
      });
    }
    
    // Hourly reward amount
    const rewardAmount = Math.floor(Math.random() * 800) + 200; // Random between 200-1000
    
    // Update user
    await user.increment('points', { by: rewardAmount });
    user.lastDailyReward = now;
    await user.save();
    
    res.json({ 
      message: 'Hourly reward collected!',
      rewardAmount,
      user: {
        id: user.id,
        username: user.username,
        points: user.points,
        lastDailyReward: user.lastDailyReward
      } 
    });
  } catch (err) {
    console.error('Hourly reward error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/signup - Register new user
// Security: lockout checked (fail-fast), rate limited by IP, CAPTCHA after failed attempts
router.post('/signup', [lockoutMiddleware('signup'), signupVelocityLimiter], async (req, res) => {
  const { username, email, password } = req.body;
  
  // Build key for failed attempt tracking using centralized helper
  const attemptKey = req.attemptKey || getAttemptKey(req, 'signup');
  
  // SECURITY: Check if CAPTCHA is required after multiple failed signup attempts
  const captchaConfig = await getCaptchaConfig();
  const lockoutConfig = await getLockoutConfig();
  const remainingBeforeCaptcha = getRemainingAttempts(attemptKey, lockoutConfig);
  const failedAttemptsThreshold = captchaConfig.failedAttemptsThreshold;
  const totalAttempts = lockoutConfig.maxAttempts - remainingBeforeCaptcha;
  
  if (totalAttempts >= failedAttemptsThreshold) {
    // CAPTCHA required - check for valid token
    const recaptchaToken = req.header('x-recaptcha-token');
    const fallbackToken = req.header('x-captcha-token');
    const fallbackAnswer = req.header('x-captcha-answer');
    const recaptchaEnabled = await isRecaptchaEnabled();
    
    let captchaVerified = false;
    
    // Try reCAPTCHA first
    if (recaptchaToken && recaptchaEnabled) {
      const result = await verifyRecaptcha(recaptchaToken, 'signup', req);
      captchaVerified = result.success;
    }
    // Try fallback CAPTCHA
    else if (fallbackToken && fallbackAnswer) {
      captchaVerified = await verifyFallbackTokenAsync(fallbackToken, fallbackAnswer);
    }
    
    if (!captchaVerified) {
      await logSecurityEvent(AUDIT_EVENTS.CAPTCHA_TRIGGERED || 'security.captcha.triggered', null, {
        action: 'signup',
        reason: 'failed_attempts',
        failedAttempts: totalAttempts
      }, req);
      
      return res.status(403).json({
        error: 'CAPTCHA verification required',
        code: 'CAPTCHA_REQUIRED',
        captchaRequired: true,
        captchaType: recaptchaEnabled ? 'recaptcha' : 'fallback',
        siteKey: recaptchaEnabled ? CAPTCHA_CONFIG.recaptchaSiteKey : undefined,
        action: 'signup'
      });
    }
  }
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    recordFailedAttempt(attemptKey);
    return res.status(400).json({ error: usernameValidation.error });
  }
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    recordFailedAttempt(attemptKey);
    return res.status(400).json({ error: emailValidation.error });
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    recordFailedAttempt(attemptKey);
    return res.status(400).json({ error: passwordValidation.error });
  }
  
  try {
    // Check signup risk (IP velocity, ban evasion)
    const signupRisk = await checkSignupRisk({
      fingerprint: req.deviceSignals?.fingerprint,
      ipHash: req.deviceSignals?.ipHash
    });
    
    if (!signupRisk.allowed) {
      recordFailedAttempt(attemptKey);
      await logSecurityEvent(AUDIT_EVENTS.SIGNUP_BLOCKED || 'auth.signup.blocked', null, {
        reason: signupRisk.reason,
        ipHash: req.deviceSignals?.ipHash?.substring(0, 8)
      }, req);
      return res.status(403).json({ error: signupRisk.reason });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ where: { username: usernameValidation.value } });
    if (existingUser) {
      recordFailedAttempt(attemptKey);
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email: emailValidation.value } });
    if (existingEmail) {
      recordFailedAttempt(attemptKey);
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Check if this is the first user
    const userCount = await User.count();
    const isFirstUser = userCount === 0;
    
    // Create user with initial risk score
    const user = await User.create({
      username: usernameValidation.value,
      email: emailValidation.value,
      password,
      points: 1000,
      isAdmin: isFirstUser, // First user becomes admin
      riskScore: signupRisk.riskScore || 0,
      lastKnownIP: req.deviceSignals?.ipHash
    });
    
    // Record device fingerprint
    if (req.deviceSignals?.fingerprint) {
      await recordDeviceFingerprint(user, req.deviceSignals.fingerprint);
    }
    
    // Log signup
    await logEvent({
      eventType: AUDIT_EVENTS.SIGNUP,
      severity: SEVERITY.INFO,
      userId: user.id,
      data: { 
        username: user.username,
        riskScore: signupRisk.riskScore,
        warning: signupRisk.warning
      },
      req
    });
    
    // Create token
    const payload = { 
      user: { 
        id: user.id,
        isAdmin: user.isAdmin
      } 
    };
    
    const token = await new Promise((resolve, reject) => {
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
        if (err) reject(err);
        else resolve(token);
      });
    });
    
    // Clear failed attempts on successful signup
    clearFailedAttempts(attemptKey);
    
    res.json({ token });
  } catch (err) {
    console.error('Registration error:', err);
    recordFailedAttempt(attemptKey);
    res.status(400).json({ error: 'Registration failed: ' + (err.message || '') });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Build key for failed attempt tracking using centralized helper
  // Use 'login' prefix to namespace login attempts separately from other flows
  const attemptKey = getAttemptKey(req, 'login');
  
  // SECURITY: Check if IP is locked out due to too many failed attempts
  const lockoutStatus = checkLockout(attemptKey);
  if (lockoutStatus.locked) {
    await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, null, {
      reason: 'Account locked due to too many failed attempts',
      attemptedUsername: username?.trim(),
      remainingSec: lockoutStatus.remainingSec
    }, req);
    return res.status(429).json({ 
      error: 'Too many failed login attempts. Please try again later.',
      code: 'ACCOUNT_LOCKED',
      retryAfter: lockoutStatus.remainingSec
    });
  }
  
  // SECURITY: Require CAPTCHA after multiple failed attempts
  // Use dynamic config to allow runtime adjustments
  const captchaConfig = await getCaptchaConfig();
  const lockoutConfig = await getLockoutConfig();
  const remainingBeforeCaptcha = getRemainingAttempts(attemptKey, lockoutConfig);
  const failedAttemptsThreshold = captchaConfig.failedAttemptsThreshold;
  const totalAttempts = lockoutConfig.maxAttempts - remainingBeforeCaptcha;
  
  if (totalAttempts >= failedAttemptsThreshold) {
    // CAPTCHA required - check for valid token
    const recaptchaToken = req.header('x-recaptcha-token');
    const fallbackToken = req.header('x-captcha-token');
    const fallbackAnswer = req.header('x-captcha-answer');
    const recaptchaEnabled = await isRecaptchaEnabled();
    
    let captchaVerified = false;
    
    // Try reCAPTCHA first
    if (recaptchaToken && recaptchaEnabled) {
      const result = await verifyRecaptcha(recaptchaToken, 'login', req);
      captchaVerified = result.success;
    }
    // Try fallback CAPTCHA (use async version for dynamic config)
    else if (fallbackToken && fallbackAnswer) {
      captchaVerified = await verifyFallbackTokenAsync(fallbackToken, fallbackAnswer);
    }
    
    if (!captchaVerified) {
      // No valid CAPTCHA - return requirement
      await logSecurityEvent(AUDIT_EVENTS.CAPTCHA_TRIGGERED || 'security.captcha.triggered', null, {
        action: 'login',
        reason: 'failed_attempts',
        attemptedUsername: username?.trim(),
        failedAttempts: totalAttempts
      }, req);
      
      return res.status(403).json({
        error: 'CAPTCHA verification required',
        code: 'CAPTCHA_REQUIRED',
        captchaRequired: true,
        captchaType: recaptchaEnabled ? 'recaptcha' : 'fallback',
        siteKey: recaptchaEnabled ? CAPTCHA_CONFIG.recaptchaSiteKey : undefined,
        action: 'login'
      });
    }
  }
  
  // Basic validation (don't reveal which field is wrong)
  // SECURITY: Record failed attempt even for empty credentials to prevent enumeration
  if (!username || !password) {
    recordFailedAttempt(attemptKey);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  try {
    const user = await User.findOne({ where: { username: username.trim() } });
    if (!user || !user.validPassword(password)) {
      // Record failed attempt for CAPTCHA escalation AND lockout
      const failCount = recordFailedAttempt(attemptKey);
      const remainingAttempts = getRemainingAttempts(attemptKey);
      
      // Update risk score if user exists (potential targeted attack)
      // This also triggers auto-enforcement if thresholds are exceeded
      if (user) {
        const riskResult = await updateRiskScore(user.id, { 
          action: RISK_ACTIONS.LOGIN_FAILED,
          reason: 'failed_login_attempt',
          failedAttempts: failCount,
          ipHash: req.deviceSignals?.ipHash,
          deviceFingerprint: req.deviceSignals?.fingerprint
        });
        
        // If auto-enforcement was applied, log it
        if (riskResult?.enforcement) {
          console.log(`[Auth] Auto-enforcement applied to user ${user.id}: ${riskResult.enforcement.applied}`);
        }
      }
      
      // Log failed login
      await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, user?.id || null, {
        attemptedUsername: username.trim(),
        ipHash: req.deviceSignals?.ipHash?.substring(0, 8),
        failCount,
        remainingAttempts
      }, req);
      
      // Include remaining attempts warning when getting close to lockout
      const response = { error: 'Invalid credentials' };
      if (remainingAttempts <= 3 && remainingAttempts > 0) {
        response.warning = `${remainingAttempts} attempt(s) remaining before lockout`;
      }
      
      return res.status(401).json(response);
    }
    
    // Check if user is banned BEFORE issuing token
    const restriction = await getRestrictionStatus(user.id);
    if (restriction) {
      if (restriction.type === 'perm_ban') {
        await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, user.id, {
          reason: 'Account permanently banned',
          attemptedUsername: username.trim()
        }, req);
        return res.status(403).json({
          error: 'Account permanently suspended',
          reason: restriction.reason || 'Terms of Service violation',
          canAppeal: true,
          code: 'ACCOUNT_BANNED'
        });
      }
      if (restriction.type === 'temp_ban') {
        await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, user.id, {
          reason: 'Account temporarily banned',
          attemptedUsername: username.trim()
        }, req);
        return res.status(403).json({
          error: 'Account temporarily suspended',
          reason: restriction.reason || 'Policy violation',
          expiresAt: restriction.expiresAt,
          code: 'ACCOUNT_TEMP_BANNED'
        });
      }
    }
    
    // Clear failed attempts on successful login
    clearFailedAttempts(attemptKey);
    
    // Update device signals
    if (req.deviceSignals?.fingerprint) {
      await recordDeviceFingerprint(user, req.deviceSignals.fingerprint);
    }
    if (req.deviceSignals?.ipHash) {
      await recordIPHash(user, req.deviceSignals.ipHash);
    }
    
    // SECURITY: Update risk score for successful login with proper action identifier
    await updateRiskScore(user.id, {
      action: RISK_ACTIONS.LOGIN_SUCCESS,
      reason: 'successful_login',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });
    
    // Log successful login
    await logEvent({
      eventType: AUDIT_EVENTS.LOGIN_SUCCESS,
      severity: SEVERITY.INFO,
      userId: user.id,
      data: { username: user.username },
      req
    });

    // Check if password change is required (admin-initiated password reset)
    const requiresPasswordChange = user.forcePasswordChange === true;

    if (requiresPasswordChange && user.passwordResetExpiry) {
      // Check if the temporary password has expired
      if (new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(403).json({
          error: 'Temporary password has expired. Please contact an administrator for a new password.',
          code: 'PASSWORD_EXPIRED'
        });
      }
    }

    // Clear session invalidation after successful login
    // The session invalidation served its purpose (invalidated old sessions)
    // Now that the user has logged in with valid credentials, clear it
    if (user.sessionInvalidatedAt) {
      user.sessionInvalidatedAt = null;
      await user.save();
    }

    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };

    const token = await new Promise((resolve, reject) => {
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
        if (err) reject(err);
        else resolve(token);
      });
    });

    // Return token with password change requirement flag if needed
    if (requiresPasswordChange) {
      return res.json({
        token,
        requiresPasswordChange: true,
        passwordResetExpiry: user.passwordResetExpiry
      });
    }

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/google - Google SSO login/register
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  
  // Build key for failed attempt tracking using centralized helper with 'google' prefix
  const attemptKey = getAttemptKey(req, 'google');
  
  // SECURITY: Check if IP is locked out due to too many failed attempts
  const lockoutStatus = checkLockout(attemptKey);
  if (lockoutStatus.locked) {
    await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, null, {
      reason: 'Account locked due to too many failed Google auth attempts',
      method: 'google',
      remainingSec: lockoutStatus.remainingSec
    }, req);
    return res.status(429).json({ 
      error: 'Too many failed attempts. Please try again later.',
      code: 'ACCOUNT_LOCKED',
      retryAfter: lockoutStatus.remainingSec
    });
  }
  
  // SECURITY: Require CAPTCHA after multiple failed attempts (matching login behavior)
  // Use dynamic config to allow runtime adjustments
  const captchaConfig = await getCaptchaConfig();
  const lockoutConfigGoogle = await getLockoutConfig();
  const remainingBeforeCaptcha = getRemainingAttempts(attemptKey, lockoutConfigGoogle);
  const failedAttemptsThreshold = captchaConfig.failedAttemptsThreshold;
  const totalAttempts = lockoutConfigGoogle.maxAttempts - remainingBeforeCaptcha;
  
  if (totalAttempts >= failedAttemptsThreshold) {
    const recaptchaToken = req.header('x-recaptcha-token');
    const fallbackToken = req.header('x-captcha-token');
    const fallbackAnswer = req.header('x-captcha-answer');
    const recaptchaEnabled = await isRecaptchaEnabled();
    
    let captchaVerified = false;
    
    // Try reCAPTCHA first
    if (recaptchaToken && recaptchaEnabled) {
      const result = await verifyRecaptcha(recaptchaToken, 'login', req);
      captchaVerified = result.success;
    }
    // Try fallback CAPTCHA (use async version for dynamic config)
    else if (fallbackToken && fallbackAnswer) {
      captchaVerified = await verifyFallbackTokenAsync(fallbackToken, fallbackAnswer);
    }
    
    if (!captchaVerified) {
      await logSecurityEvent(AUDIT_EVENTS.CAPTCHA_TRIGGERED || 'security.captcha.triggered', null, {
        action: 'google_auth',
        reason: 'failed_attempts',
        failedAttempts: totalAttempts
      }, req);
      
      return res.status(403).json({
        error: 'CAPTCHA verification required',
        code: 'CAPTCHA_REQUIRED',
        captchaRequired: true,
        captchaType: recaptchaEnabled ? 'recaptcha' : 'fallback',
        siteKey: recaptchaEnabled ? CAPTCHA_CONFIG.recaptchaSiteKey : undefined,
        action: 'login'
      });
    }
  }
  
  if (!credential) {
    recordFailedAttempt(attemptKey);
    return res.status(400).json({ error: 'Google credential is required' });
  }
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google SSO is not configured' });
  }
  
  try {
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, email_verified, name } = payload;
    
    // Security: Require verified email from Google
    if (!email) {
      return res.status(400).json({ error: 'Email is required from Google account' });
    }
    
    if (!email_verified) {
      return res.status(400).json({ error: 'Please verify your Google email address first' });
    }
    
    // Check if user exists - prioritize googleId over email
    // (googleId is immutable and takes precedence for returning users)
    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({ where: { googleId } });
    
    // If not found by googleId, check by email (for first-time Google linking)
    if (!user) {
      user = await User.findOne({ where: { email: normalizedEmail } });
    }
    
    // SECURITY FIX: Check if existing user is banned BEFORE issuing token
    if (user) {
      const restriction = await getRestrictionStatus(user.id);
      if (restriction) {
        if (restriction.type === 'perm_ban') {
          await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, user.id, {
            reason: 'Account permanently banned',
            method: 'google'
          }, req);
          return res.status(403).json({
            error: 'Account permanently suspended',
            reason: restriction.reason || 'Terms of Service violation',
            canAppeal: true,
            code: 'ACCOUNT_BANNED'
          });
        }
        if (restriction.type === 'temp_ban') {
          await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, user.id, {
            reason: 'Account temporarily banned',
            method: 'google'
          }, req);
          return res.status(403).json({
            error: 'Account temporarily suspended',
            reason: restriction.reason || 'Policy violation',
            expiresAt: restriction.expiresAt,
            code: 'ACCOUNT_TEMP_BANNED'
          });
        }
      }
    }
    
    if (user) {
      let needsSave = false;
      
      // Update googleId if user signed up with email but now uses Google
      if (!user.googleId) {
        user.googleId = googleId;
        needsSave = true;
      }
      
      // Always keep googleEmail in sync with the actual Google account email
      if (user.googleEmail !== normalizedEmail) {
        user.googleEmail = normalizedEmail;
        needsSave = true;
      }
      
      // Only set user.email from Google if it's currently empty (first-time setup)
      if (!user.email) {
        user.email = normalizedEmail;
        needsSave = true;
      }
      
      if (needsSave) {
        await user.save();
      }
    } else {
      // Check signup risk for new Google accounts
      const signupRisk = await checkSignupRisk({
        fingerprint: req.deviceSignals?.fingerprint,
        ipHash: req.deviceSignals?.ipHash
      });
      
      if (!signupRisk.allowed) {
        await logSecurityEvent(AUDIT_EVENTS.SIGNUP || 'auth.signup.blocked', null, {
          reason: signupRisk.reason,
          method: 'google',
          ipHash: req.deviceSignals?.ipHash?.substring(0, 8)
        }, req);
        return res.status(403).json({ error: signupRisk.reason });
      }
      
      // Create new user - generate unique username from email or name
      let baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_-]/g, '');
      
      // Ensure base username meets minimum length requirement
      if (baseUsername.length < 3) {
        baseUsername = 'user' + baseUsername;
      }
      
      // Truncate to max length (leaving room for counter suffix)
      if (baseUsername.length > 25) {
        baseUsername = baseUsername.substring(0, 25);
      }
      
      let username = baseUsername;
      let counter = 1;
      const maxAttempts = 100;
      
      // Ensure username is unique (with safety limit)
      while (await User.findOne({ where: { username } })) {
        if (counter >= maxAttempts) {
          // Fallback: use random suffix
          username = `${baseUsername}${Date.now().toString(36)}`;
          break;
        }
        username = `${baseUsername}${counter}`;
        counter++;
      }
      
      // Check if this is the first user
      const userCount = await User.count();
      const isFirstUser = userCount === 0;
      
      user = await User.create({
        username,
        email: normalizedEmail,
        googleId,
        googleEmail: normalizedEmail,
        password: null, // No password for Google SSO users
        points: 1000,
        isAdmin: isFirstUser,
        riskScore: signupRisk.riskScore || 0,
        lastKnownIP: req.deviceSignals?.ipHash
      });
      
      // Log signup
      await logEvent({
        eventType: AUDIT_EVENTS.SIGNUP,
        severity: SEVERITY.INFO,
        userId: user.id,
        data: { 
          username: user.username,
          method: 'google',
          riskScore: signupRisk.riskScore
        },
        req
      });
    }
    
    // Record device signals for returning users too
    if (req.deviceSignals?.fingerprint) {
      await recordDeviceFingerprint(user, req.deviceSignals.fingerprint);
    }
    if (req.deviceSignals?.ipHash) {
      await recordIPHash(user, req.deviceSignals.ipHash);
    }
    
    // SECURITY: Update risk score for Google SSO login (existing user)
    await updateRiskScore(user.id, {
      action: RISK_ACTIONS.LOGIN_SUCCESS,
      reason: 'google_sso_login',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });
    
    // Log Google login
    await logEvent({
      eventType: AUDIT_EVENTS.GOOGLE_LOGIN,
      severity: SEVERITY.INFO,
      userId: user.id,
      data: { username: user.username },
      req
    });

    // Clear session invalidation after successful login
    // The session invalidation served its purpose (invalidated old sessions)
    if (user.sessionInvalidatedAt) {
      user.sessionInvalidatedAt = null;
      await user.save();
    }

    // Create JWT token
    const jwtPayload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };
    
    const token = await new Promise((resolve, reject) => {
      jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
        if (err) reject(err);
        else resolve(token);
      });
    });
    
    // Clear failed attempts on successful authentication
    clearFailedAttempts(attemptKey);
    
    res.json({ token });
  } catch (err) {
    console.error('Google SSO error:', err);
    
    // Record failed attempt for invalid/expired tokens
    recordFailedAttempt(attemptKey);
    
    await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, null, {
      reason: 'Google token verification failed',
      method: 'google',
      error: err.message?.substring(0, 50)
    }, req);
    
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/google/relink - Link or relink Google account (authenticated users only)
// Security: lockout checked FIRST (fail-fast), enforcement checked, device binding verified, policy enforced, rate limited, CAPTCHA protected
router.post('/google/relink', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('account_link'), sensitiveActionLimiter, enforcePolicy('canChangeAccountSettings'), captchaMiddleware('account_link')], async (req, res) => {
  const { credential } = req.body;
  // Attempt key is now set by lockoutMiddleware for convenience
  const attemptKey = req.attemptKey || getAttemptKey(req);
  
  // SECURITY: Update risk score for Google account linking (account security action)
  await updateRiskScore(req.user.id, {
    action: RISK_ACTIONS.GOOGLE_LINK,
    reason: 'google_account_linked',
    ipHash: req.deviceSignals?.ipHash,
    deviceFingerprint: req.deviceSignals?.fingerprint
  });
  
  if (!credential) {
    recordFailedAttempt(attemptKey);
    return res.status(400).json({ error: 'Google credential is required' });
  }
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google SSO is not configured' });
  }
  
  try {
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, email_verified } = payload;
    
    // Security: Require verified email from Google
    if (!email) {
      recordFailedAttempt(attemptKey);
      return res.status(400).json({ error: 'Email is required from Google account' });
    }
    
    if (!email_verified) {
      recordFailedAttempt(attemptKey);
      return res.status(400).json({ error: 'Please verify your Google email address first' });
    }
    
    const normalizedEmail = email.toLowerCase();
    
    // Check if this Google account is already linked to another user
    const existingGoogleUser = await User.findOne({ where: { googleId } });
    if (existingGoogleUser && existingGoogleUser.id !== req.user.id) {
      recordFailedAttempt(attemptKey);
      return res.status(400).json({ 
        error: 'This Google account is already linked to another user' 
      });
    }
    
    // Get the current user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update Google link
    user.googleId = googleId;
    user.googleEmail = normalizedEmail;
    await user.save();
    
    // SECURITY: Clear failed attempts only AFTER successful save
    clearFailedAttempts(attemptKey);
    
    // Log successful link
    await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
      action: 'google_link',
      linkedEmail: normalizedEmail.substring(0, 3) + '***'
    }, req);
    
    res.json({ 
      message: 'Google account linked successfully',
      linkedGoogleEmail: normalizedEmail
    });
  } catch (err) {
    console.error('Google relink error:', err);
    
    // Record failed attempt for invalid tokens
    recordFailedAttempt(attemptKey);
    
    await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, req.user.id, {
      reason: 'Google token verification failed during relink',
      error: err.message?.substring(0, 50)
    }, req);
    
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }
    res.status(500).json({ error: 'Failed to link Google account' });
  }
});

// POST /api/auth/google/unlink - Unlink Google account (authenticated users only)
// Security: lockout checked FIRST (fail-fast), enforcement checked, device binding verified, policy enforced, rate limited, CAPTCHA protected
router.post('/google/unlink', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('account_link'), sensitiveActionLimiter, enforcePolicy('canChangeAccountSettings'), captchaMiddleware('account_link')], async (req, res) => {
  // Attempt key is now set by lockoutMiddleware for convenience
  const attemptKey = req.attemptKey || getAttemptKey(req);
  
  // SECURITY: Update risk score for Google account unlinking (account security action)
  await updateRiskScore(req.user.id, {
    action: RISK_ACTIONS.GOOGLE_UNLINK,
    reason: 'google_account_unlinked',
    ipHash: req.deviceSignals?.ipHash,
    deviceFingerprint: req.deviceSignals?.fingerprint
  });
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has Google linked
    if (!user.googleId) {
      return res.status(400).json({ error: 'No Google account is linked' });
    }
    
    // Don't allow unlinking if user has no password (Google-only account)
    if (!user.password) {
      return res.status(400).json({ 
        error: 'Cannot unlink Google account. Please set a password first to enable email login.' 
      });
    }
    
    // Track for audit
    const unlinkedEmail = user.googleEmail;
    
    // Clear Google link
    user.googleId = null;
    user.googleEmail = null;
    await user.save();
    
    // SECURITY: Clear failed attempts only AFTER successful save
    clearFailedAttempts(attemptKey);
    
    // Log the unlink action
    await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
      action: 'google_unlink',
      unlinkedEmail: unlinkedEmail ? unlinkedEmail.substring(0, 3) + '***' : null
    }, req);
    
    res.json({ message: 'Google account unlinked successfully' });
  } catch (err) {
    console.error('Google unlink error:', err);
    res.status(500).json({ error: 'Failed to unlink Google account' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'password', 'googleId', 'googleEmail', 'points', 'isAdmin', 'lastDailyReward', 'allowR18', 'showR18', 'usernameChanged', 'forcePasswordChange', 'passwordResetExpiry']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build response object (avoid mutating Sequelize instance)
    const hasGoogle = !!user.googleId;
    const hasPassword = !!user.password;
    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      points: user.points,
      isAdmin: user.isAdmin,
      lastDailyReward: user.lastDailyReward,
      allowR18: user.allowR18 === true,
      showR18: user.showR18 === true,
      usernameChanged: user.usernameChanged === true,
      hasGoogle,
      hasPassword,
      // The actual Google account email (updated on each Google login)
      linkedGoogleEmail: user.googleEmail || null
    };

    // Include password change requirement status if applicable
    // This ensures the modal appears on page reload during password reset flow
    if (user.forcePasswordChange === true) {
      response.requiresPasswordChange = true;
      response.passwordResetExpiry = user.passwordResetExpiry;
    }

    res.json(response);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile/email - Add or update email
// Security: lockout checked FIRST (fail-fast), enforcement checked, device binding verified, policy enforced, rate limited, CAPTCHA protected
router.put('/profile/email', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('account_link'), sensitiveActionLimiter, enforcePolicy('canChangeAccountSettings'), captchaMiddleware('account_link')], async (req, res) => {
  const { email } = req.body;
  // Attempt key is now set by lockoutMiddleware for convenience
  const attemptKey = req.attemptKey || getAttemptKey(req);
  
  // SECURITY: Update risk score for email change attempt (account security action)
  await updateRiskScore(req.user.id, {
    action: RISK_ACTIONS.EMAIL_CHANGE,
    reason: 'email_change_attempt',
    ipHash: req.deviceSignals?.ipHash,
    deviceFingerprint: req.deviceSignals?.fingerprint
  });
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is already used by another user
    const existingEmail = await User.findOne({ 
      where: { email: emailValidation.value } 
    });
    if (existingEmail && existingEmail.id !== user.id) {
      // Record failed attempt for CAPTCHA escalation (potential enumeration)
      recordFailedAttempt(attemptKey);
      return res.status(400).json({ error: 'Email already registered to another account' });
    }
    
    // Track old email for audit
    const oldEmail = user.email;
    
    // Update email
    user.email = emailValidation.value;
    await user.save();
    
    // Clear failed attempts on success
    clearFailedAttempts(attemptKey);
    
    // Log the email change
    await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
      action: 'email_change',
      oldEmail: oldEmail ? oldEmail.substring(0, 3) + '***' : null,
      newEmail: emailValidation.value.substring(0, 3) + '***'
    }, req);
    
    res.json({ 
      message: 'Email updated successfully',
      email: user.email
    });
  } catch (err) {
    console.error('Update email error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile/password - Set or change password
// Security: lockout checked FIRST (fail-fast), enforcement checked, device binding verified, policy enforced, rate limited, CAPTCHA protected
router.put('/profile/password', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('password_change'), sensitiveActionLimiter, enforcePolicy('canChangeAccountSettings'), captchaMiddleware('password_change')], async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  // Attempt key is now set by lockoutMiddleware for convenience
  const attemptKey = req.attemptKey || getAttemptKey(req);
  
  // SECURITY: Update risk score for password change attempt (account security action)
  await updateRiskScore(req.user.id, {
    action: RISK_ACTIONS.PASSWORD_CHANGE,
    reason: 'password_change_attempt',
    ipHash: req.deviceSignals?.ipHash,
    deviceFingerprint: req.deviceSignals?.fingerprint
  });
  
  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if this is a forced password change (from admin reset) FIRST
    // This must happen before current password verification since the user
    // may not know/remember the temporary password they logged in with
    const wasForcedChange = user.forcePasswordChange === true;

    // If user already has a password AND this is NOT a forced password change,
    // require current password verification
    if (user.password && !wasForcedChange) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      if (!user.validPassword(currentPassword)) {
        // Record failed attempt for CAPTCHA escalation
        recordFailedAttempt(attemptKey);

        // Log failed password attempt
        await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
          success: false,
          reason: 'Invalid current password'
        }, req);

        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }
    // For Google-only users (no password) or forced password changes,
    // they can set a new password without providing current password
    // since they've already authenticated via Google/JWT or admin-reset flow

    // Track whether user had a password before this change (for audit log)
    const hadPreviousPassword = !!user.password;

    // Set the new password (the model's beforeCreate/beforeUpdate hook will hash it)
    user.password = newPassword;

    // Clear forced password change flags if they were set
    if (wasForcedChange) {
      user.forcePasswordChange = false;
      user.passwordResetExpiry = null;

      // Update the most recent password reset history record to mark it as used
      const recentReset = await PasswordResetHistory.findOne({
        where: { targetUserId: user.id, usedAt: null },
        order: [['createdAt', 'DESC']]
      });
      if (recentReset) {
        recentReset.usedAt = new Date();
        await recentReset.save();
      }
    }

    await user.save();

    // SECURITY: Clear failed attempts only AFTER successful save
    clearFailedAttempts(attemptKey);

    // Log successful password change
    await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
      success: true,
      hadPreviousPassword,
      wasForcedChange
    }, req);

    res.json({
      message: wasForcedChange
        ? 'Password updated successfully. You can now use your new password to log in.'
        : 'Password updated successfully'
    });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile/username - Change username (one time only)
// Security: lockout checked FIRST (fail-fast), enforcement checked, device binding verified, policy enforced, rate limited, CAPTCHA protected
router.put('/profile/username', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('username_change'), sensitiveActionLimiter, enforcePolicy('canChangeAccountSettings'), captchaMiddleware('account_link')], async (req, res) => {
  const { username } = req.body;
  // Attempt key is now set by lockoutMiddleware for convenience
  const attemptKey = req.attemptKey || getAttemptKey(req);
  
  // SECURITY: Update risk score for username change attempt (account security action)
  await updateRiskScore(req.user.id, {
    action: RISK_ACTIONS.USERNAME_CHANGE,
    reason: 'username_change_attempt',
    ipHash: req.deviceSignals?.ipHash,
    deviceFingerprint: req.deviceSignals?.fingerprint
  });
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.error });
  }
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has already changed their username
    if (user.usernameChanged) {
      return res.status(400).json({ error: 'You have already used your one-time username change' });
    }
    
    // Check if new username is same as current
    if (user.username === usernameValidation.value) {
      return res.status(400).json({ error: 'New username must be different from current username' });
    }
    
    // Check if username is already taken
    const existingUser = await User.findOne({ 
      where: { username: usernameValidation.value } 
    });
    if (existingUser) {
      // Record failed attempt for CAPTCHA escalation (potential enumeration)
      recordFailedAttempt(attemptKey);
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Track old username for audit
    const oldUsername = user.username;
    
    // Update username and mark as changed
    user.username = usernameValidation.value;
    user.usernameChanged = true;
    await user.save();
    
    // SECURITY: Clear failed attempts only AFTER successful save
    clearFailedAttempts(attemptKey);
    
    // Log the username change
    await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
      action: 'username_change',
      oldUsername,
      newUsername: usernameValidation.value
    }, req);
    
    res.json({ 
      message: 'Username changed successfully',
      username: user.username
    });
  } catch (err) {
    console.error('Update username error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-account - Reset account progress (dangerous action)
// Security: lockout checked FIRST (fail-fast), enforcement checked, device binding verified, policy enforced, rate limited, CAPTCHA protected
router.post('/reset-account', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('account_reset'), sensitiveActionLimiter, enforcePolicy('canChangeAccountSettings'), captchaMiddleware('password_change')], async (req, res) => {
  const { password, confirmationText } = req.body;
  // Attempt key is now set by lockoutMiddleware for convenience
  const attemptKey = req.attemptKey || getAttemptKey(req);
  
  // SECURITY: Update risk score for account reset attempt (high-risk action)
  await updateRiskScore(req.user.id, {
    action: RISK_ACTIONS.ACCOUNT_RESET,
    reason: 'account_reset_initiated',
    ipHash: req.deviceSignals?.ipHash,
    deviceFingerprint: req.deviceSignals?.fingerprint
  });
  
  // Security: Require exact confirmation text (supports all translated versions)
  // Record failed attempt for incorrect confirmation to prevent automated attacks
  const VALID_CONFIRMATION_TEXTS = [
    'RESET MY ACCOUNT',           // English
    'アカウントをリセット',         // Japanese
    'KONTO ZURÜCKSETZEN',         // German
    'RESTABLECER MI CUENTA',      // Spanish
  ];
  if (!VALID_CONFIRMATION_TEXTS.includes(confirmationText)) {
    recordFailedAttempt(attemptKey);
    return res.status(400).json({
      error: 'Invalid confirmation text'
    });
  }
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Security: For password-based accounts, require password verification
    if (user.password) {
      if (!password) {
        return res.status(400).json({ error: 'Password is required to reset account' });
      }
      if (!user.validPassword(password)) {
        // Record failed attempt for CAPTCHA escalation
        recordFailedAttempt(attemptKey);
        
        await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
          action: 'account_reset',
          success: false,
          reason: 'Invalid password'
        }, req);
        
        return res.status(401).json({ error: 'Invalid password' });
      }
    }
    // For Google-only accounts (no password), the confirmation text is sufficient
    // since they've already authenticated via Google to get here
    
    // Import required models for deletion
    const { UserCharacter, FishInventory, CouponRedemption } = require('../models');
    
    // Log the reset action (for security audit)
    console.log(`[ACCOUNT RESET] User ${user.id} (${user.username}) initiated account reset at ${new Date().toISOString()}`);
    
    // Delete all associated data
    await Promise.all([
      // Delete character collection
      UserCharacter.destroy({ where: { UserId: user.id } }),
      // Delete fish inventory
      FishInventory.destroy({ where: { userId: user.id } }),
      // Delete coupon redemptions (allows re-redemption)
      CouponRedemption.destroy({ where: { userId: user.id } })
    ]);
    
    // Reset user fields to defaults
    user.points = 1000;
    user.rollTickets = 0;
    user.premiumTickets = 0;
    user.lastDailyReward = null;
    user.autofishEnabled = false;
    user.autofishUnlockedByRank = false;
    user.usernameChanged = false; // Give back the username change
    
    // Reset Dojo fields
    user.dojoSlots = [];
    user.dojoLastClaim = null;
    user.dojoUpgrades = { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    user.dojoDailyStats = {};
    user.dojoTicketProgress = { roll: 0, premium: 0 };
    
    // Reset Fishing fields
    user.lastAutofish = null;
    user.fishingPity = { legendary: 0, epic: 0, lastCast: null };
    user.fishingStats = { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
    user.fishingDaily = {
      date: null, manualCasts: 0, autofishCasts: 0, catches: 0,
      perfectCatches: 0, rareCatches: 0, tradesCompleted: 0,
      pointsFromTrades: 0, ticketsEarned: { roll: 0, premium: 0 }
    };
    user.fishingChallenges = { date: null, active: [], completed: [], progress: {} };
    user.fishingAreas = { unlocked: ['pond'], current: 'pond' };
    user.fishingRod = 'basic';
    user.fishingOwnedRods = ['basic'];
    user.fishingAchievements = {
      totalLegendaries: 0, totalPerfects: 0, longestStreak: 0,
      currentStreak: 0, challengesCompleted: 0, prestige: 0
    };

    // Reset Game Enhancement fields
    user.accountXP = 0;
    user.dojoClaimsTotal = 0;
    user.dojoFacilityTiers = ['basic'];

    // Reset Gacha pity, milestone, and fate points systems
    user.gachaPity = { pullsSinceRare: 0, pullsSinceEpic: 0, pullsSinceLegendary: 0, totalPulls: 0 };
    user.bannerPity = {};
    user.pullHistory = {};
    user.fatePoints = {};
    user.fatePointsWeekly = {};  // Reset weekly fate points limit
    user.characterSelectors = [];
    user.weeklyBannerTickets = 0;

    // Reset retention/mastery fields
    user.characterMastery = {};
    user.fishCodex = { discovered: [], biomeProgress: {}, claimedMilestones: [], recentDiscoveries: [] };
    user.luckMeter = { fishing: 0, gacha: 0, lastUpdate: null };
    user.lastLogin = null;
    user.returnBonusClaimed = null;
    user.items = [];
    user.rodSkins = [];
    user.lastWanderingWarrior = null;

    await user.save();
    
    // SECURITY: Clear failed attempts only AFTER successful save
    clearFailedAttempts(attemptKey);
    
    console.log(`[ACCOUNT RESET] User ${user.id} (${user.username}) account reset completed successfully`);
    
    res.json({ 
      message: 'Account reset successfully. Your progress has been cleared.',
      user: {
        id: user.id,
        username: user.username,
        points: user.points,
        rollTickets: user.rollTickets,
        premiumTickets: user.premiumTickets
      }
    });
  } catch (err) {
    console.error('Account reset error:', err);
    res.status(500).json({ error: 'Failed to reset account' });
  }
});

// POST /api/auth/toggle-r18 - Toggle R18 content preference
// Security: lockout checked, enforcement checked, rate limited, risk tracked
router.post('/toggle-r18', [auth, lockoutMiddleware(), enforcementMiddleware, generalRateLimiter], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'allowR18', 'showR18']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if admin has allowed R18 for this user
    if (user.allowR18 !== true) {
      return res.status(403).json({ 
        error: 'R18 access not enabled for your account',
        message: 'Contact an administrator to enable R18 content access'
      });
    }
    
    // Toggle the user's showR18 preference
    const newValue = user.showR18 !== true;
    user.showR18 = newValue;
    await user.save();
    
    // SECURITY: Track R18 preference change for risk scoring (account setting change)
    await updateRiskScore(req.user.id, {
      action: RISK_ACTIONS.PREFERENCE_CHANGE,
      reason: 'r18_preference_toggled',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });
    
    res.json({ 
      message: newValue ? 'R18 content enabled' : 'R18 content disabled',
      showR18: newValue
    });
  } catch (err) {
    console.error('Toggle R18 error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
