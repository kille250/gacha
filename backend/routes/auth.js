const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { User } = require('../models');
const sequelize = require('../config/db');

router.post('/daily-reward', auth, async (req, res) => {
	try {
	  const user = await User.findByPk(req.user.id);
	  
	  if (!user) {
		return res.status(404).json({ error: 'User not found' });
	  }
	  
	  const now = new Date();
	  const lastReward = user.lastDailyReward ? new Date(user.lastDailyReward) : null;
	  
	  // Check if 1 hour has passed since last reward (changed from 24 hours)
	  const rewardInterval = 60 * 60 * 1000; // 1 hour in milliseconds
	  
	  if (lastReward && now - lastReward < rewardInterval) {
		// Calculate remaining time in minutes:seconds
		const remainingTime = rewardInterval - (now - lastReward);
		const minutes = Math.floor(remainingTime / (60 * 1000));
		const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
		
		return res.status(400).json({ 
		  error: 'You already collected your hourly reward', 
		  nextRewardTime: {
			hours: 0, // Keep for compatibility
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

// ===========================================
// SECURITY: Input validation helpers
// ===========================================
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be at most 30 characters' };
  }
  
  // Only allow alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  // Block reserved usernames
  const reserved = ['admin', 'administrator', 'root', 'system', 'moderator', 'mod', 'support', 'help'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true, value: trimmed };
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters' };
  }
  
  // Require at least one number and one letter
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }
  
  return { valid: true };
};

router.post('/signup', async (req, res) => {
	const { username, password } = req.body;
	
	// Validate username
	const usernameValidation = validateUsername(username);
	if (!usernameValidation.valid) {
	  return res.status(400).json({ error: usernameValidation.error });
	}
	
	// Validate password
	const passwordValidation = validatePassword(password);
	if (!passwordValidation.valid) {
	  return res.status(400).json({ error: passwordValidation.error });
	}
	
	try {
	  // Überprüfe, ob der Benutzer bereits existiert
	  const existingUser = await User.findOne({ where: { username: usernameValidation.value } });
	  if (existingUser) {
		return res.status(400).json({ error: 'Username already exists' });
	  }
	  
	  // Prüfe, ob dies der erste Benutzer ist
	  const userCount = await User.count();
	  const isFirstUser = userCount === 0;
	  
	  // Benutzer erstellen
	  const user = await User.create({
		username: usernameValidation.value,
		password,
		points: 1000,
		isAdmin: isFirstUser // Erster Benutzer wird Admin
	  });
	  
	  // Token erstellen
	  const payload = { 
		user: { 
		  id: user.id,
		  isAdmin: user.isAdmin // Admin-Status im Token speichern
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
		  isAdmin: user.isAdmin // Admin-Status im Token speichern
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

router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT "id", "username", "points", "isAdmin", "lastDailyReward", "allowR18", "showR18" 
       FROM "Users" WHERE "id" = :userId`,
      { replacements: { userId: req.user.id } }
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = rows[0];
    user.allowR18 = user.allowR18 === true;
    user.showR18 = user.showR18 === true;
    
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle R18 content preference (user can only toggle if admin has allowed)
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