const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const auth = require('../middleware/auth');
const { User } = require('../models');
const sequelize = require('../config/db');
const { validateUsername, validatePassword, validateEmail } = require('../utils/validation');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/daily-reward - Claim hourly reward
// Note: Route name is legacy ("daily") but actual interval is 1 hour for better engagement
router.post('/daily-reward', auth, async (req, res) => {
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
    
    // Create user
    const user = await User.create({
      username: usernameValidation.value,
      email: emailValidation.value,
      password,
      points: 1000,
      isAdmin: isFirstUser // First user becomes admin
    });
    
    // Create token
    const payload = { 
      user: { 
        id: user.id,
        isAdmin: user.isAdmin
      } 
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ error: 'Registration failed: ' + (err.message || '') });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation (don't reveal which field is wrong)
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  try {
    const user = await User.findOne({ where: { username: username.trim() } });
    if (!user || !user.validPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const payload = { 
      user: { 
        id: user.id,
        isAdmin: user.isAdmin
      } 
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
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
    const { sub: googleId, email, name } = payload;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required from Google account' });
    }
    
    // Check if user exists by googleId or email
    let user = await User.findOne({ 
      where: sequelize.or(
        { googleId },
        { email }
      )
    });
    
    if (user) {
      // Update googleId if user signed up with email but now uses Google
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user - generate unique username from email or name
      let baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '');
      let username = baseUsername;
      let counter = 1;
      
      // Ensure username is unique
      while (await User.findOne({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      
      // Check if this is the first user
      const userCount = await User.count();
      const isFirstUser = userCount === 0;
      
      user = await User.create({
        username,
        email,
        googleId,
        password: null, // No password for Google SSO users
        points: 1000,
        isAdmin: isFirstUser
      });
    }
    
    // Create JWT token
    const jwtPayload = { 
      user: { 
        id: user.id,
        isAdmin: user.isAdmin
      } 
    };
    
    jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Google SSO error:', err);
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT "id", "username", "email", "googleId", "points", "isAdmin", "lastDailyReward", "allowR18", "showR18", "usernameChanged" 
       FROM "Users" WHERE "id" = :userId`,
      { replacements: { userId: req.user.id } }
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = rows[0];
    user.allowR18 = user.allowR18 === true;
    user.showR18 = user.showR18 === true;
    user.usernameChanged = user.usernameChanged === true;
    user.hasGoogle = !!user.googleId;
    // Don't expose googleId to frontend
    delete user.googleId;
    
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile/email - Add or update email
router.put('/profile/email', auth, async (req, res) => {
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

// PUT /api/auth/profile/username - Change username (one time only)
router.put('/profile/username', auth, async (req, res) => {
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

// POST /api/auth/toggle-r18 - Toggle R18 content preference
router.post('/toggle-r18', auth, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT "allowR18", "showR18" FROM "Users" WHERE "id" = :userId`,
      { replacements: { userId: req.user.id } }
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if admin has allowed R18 for this user
    const hasPermission = rows[0].allowR18 === true;
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'R18 access not enabled for your account',
        message: 'Contact an administrator to enable R18 content access'
      });
    }
    
    // Toggle the user's showR18 preference
    const currentValue = rows[0].showR18 === true;
    const newValue = !currentValue;
    
    await sequelize.query(
      `UPDATE "Users" SET "showR18" = :newValue WHERE "id" = :userId`,
      { replacements: { newValue, userId: req.user.id } }
    );
    
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
