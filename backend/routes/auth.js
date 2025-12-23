const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const auth = require('../middleware/auth');
const { User } = require('../models');
const { validateUsername, validatePassword, validateEmail } = require('../utils/validation');
const { checkSignupRisk, updateRiskScore } = require('../services/riskService');
const { recordDeviceFingerprint, recordIPHash } = require('../middleware/deviceSignals');
const { logSecurityEvent, logEvent, AUDIT_EVENTS, SEVERITY } = require('../services/auditService');
const { enforcementMiddleware, getRestrictionStatus } = require('../middleware/enforcement');
const { 
  captchaMiddleware, 
  recordFailedAttempt, 
  clearFailedAttempts 
} = require('../middleware/captcha');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/daily-reward - Claim hourly reward
// Note: Route name is legacy ("daily") but actual interval is 1 hour for better engagement
// Security: enforcement checked
router.post('/daily-reward', [auth, enforcementMiddleware], async (req, res) => {
  try {
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
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.error });
  }
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }
  
  try {
    // Check signup risk (IP velocity, ban evasion)
    const signupRisk = await checkSignupRisk({
      fingerprint: req.deviceSignals?.fingerprint,
      ipHash: req.deviceSignals?.ipHash
    });
    
    if (!signupRisk.allowed) {
      await logSecurityEvent(AUDIT_EVENTS.SIGNUP || 'auth.signup.blocked', null, {
        reason: signupRisk.reason,
        ipHash: req.deviceSignals?.ipHash?.substring(0, 8)
      }, req);
      return res.status(403).json({ error: signupRisk.reason });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ where: { username: usernameValidation.value } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email: emailValidation.value } });
    if (existingEmail) {
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
    
    res.json({ token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ error: 'Registration failed: ' + (err.message || '') });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Build key for failed attempt tracking (IP-based for login since user unknown)
  const attemptKey = `login:${req.deviceSignals?.ipHash || 'unknown'}`;
  
  // Basic validation (don't reveal which field is wrong)
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  try {
    const user = await User.findOne({ where: { username: username.trim() } });
    if (!user || !user.validPassword(password)) {
      // Record failed attempt for CAPTCHA escalation
      recordFailedAttempt(attemptKey);
      
      // Log failed login
      await logSecurityEvent(AUDIT_EVENTS.LOGIN_FAILED, null, {
        attemptedUsername: username.trim(),
        ipHash: req.deviceSignals?.ipHash?.substring(0, 8)
      }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
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
    
    // Update risk score with login context
    await updateRiskScore(user.id, {
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
    
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/google - Google SSO login/register
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
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
    
    // Log Google login
    await logEvent({
      eventType: AUDIT_EVENTS.GOOGLE_LOGIN,
      severity: SEVERITY.INFO,
      userId: user.id,
      data: { username: user.username },
      req
    });
    
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
    
    res.json({ token });
  } catch (err) {
    console.error('Google SSO error:', err);
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/google/relink - Link or relink Google account (authenticated users only)
// Security: enforcement checked, rate limited, CAPTCHA protected
router.post('/google/relink', [auth, enforcementMiddleware, sensitiveActionLimiter, captchaMiddleware('account_link')], async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
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
      return res.status(400).json({ error: 'Email is required from Google account' });
    }
    
    if (!email_verified) {
      return res.status(400).json({ error: 'Please verify your Google email address first' });
    }
    
    const normalizedEmail = email.toLowerCase();
    
    // Check if this Google account is already linked to another user
    const existingGoogleUser = await User.findOne({ where: { googleId } });
    if (existingGoogleUser && existingGoogleUser.id !== req.user.id) {
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
    
    res.json({ 
      message: 'Google account linked successfully',
      linkedGoogleEmail: normalizedEmail
    });
  } catch (err) {
    console.error('Google relink error:', err);
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }
    res.status(500).json({ error: 'Failed to link Google account' });
  }
});

// POST /api/auth/google/unlink - Unlink Google account (authenticated users only)
// Security: enforcement checked, rate limited
router.post('/google/unlink', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
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
    
    // Clear Google link
    user.googleId = null;
    user.googleEmail = null;
    await user.save();
    
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
      attributes: ['id', 'username', 'email', 'password', 'googleId', 'googleEmail', 'points', 'isAdmin', 'lastDailyReward', 'allowR18', 'showR18', 'usernameChanged']
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
    
    res.json(response);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile/email - Add or update email
// Security: enforcement checked, rate limited
router.put('/profile/email', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  const { email } = req.body;
  
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
      return res.status(400).json({ error: 'Email already registered to another account' });
    }
    
    // Update email
    user.email = emailValidation.value;
    await user.save();
    
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
// Security: rate limited, CAPTCHA protected, enforcement checked
router.put('/profile/password', [auth, enforcementMiddleware, sensitiveActionLimiter, captchaMiddleware('password_change')], async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const attemptKey = `password:${req.user.id}`;
  
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
    
    // If user already has a password, require current password verification
    if (user.password) {
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
    // For Google-only users (no password), they can set one without verification
    // since they've already authenticated via Google/JWT
    
    // Clear failed attempts on success
    clearFailedAttempts(attemptKey);
    
    // Set the new password (the model's beforeCreate/beforeUpdate hook will hash it)
    user.password = newPassword;
    await user.save();
    
    // Log successful password change
    await logSecurityEvent(AUDIT_EVENTS.PASSWORD_CHANGE, req.user.id, {
      success: true,
      hadPreviousPassword: !!user.password
    }, req);
    
    res.json({ 
      message: user.password ? 'Password updated successfully' : 'Password set successfully'
    });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile/username - Change username (one time only)
// Security: enforcement checked, rate limited
router.put('/profile/username', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  const { username } = req.body;
  
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
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Update username and mark as changed
    user.username = usernameValidation.value;
    user.usernameChanged = true;
    await user.save();
    
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
// Security: rate limited, CAPTCHA protected, enforcement checked
router.post('/reset-account', [auth, enforcementMiddleware, sensitiveActionLimiter, captchaMiddleware('password_change')], async (req, res) => {
  const { password, confirmationText } = req.body;
  const attemptKey = `reset:${req.user.id}`;
  
  // Security: Require exact confirmation text
  const REQUIRED_CONFIRMATION = 'RESET MY ACCOUNT';
  if (confirmationText !== REQUIRED_CONFIRMATION) {
    return res.status(400).json({ 
      error: `Please type "${REQUIRED_CONFIRMATION}" exactly to confirm` 
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
    
    // Clear failed attempts on success
    clearFailedAttempts(attemptKey);
    
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
    
    await user.save();
    
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
// Security: enforcement checked
router.post('/toggle-r18', [auth, enforcementMiddleware], async (req, res) => {
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
