const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // WICHTIG: jwt importieren
const auth = require('../middleware/auth');
const { User } = require('../models');

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

router.post('/signup', async (req, res) => {
	console.log('Signup request received:', req.body);
	
	const { username, password } = req.body;
	
	if (!username || !password) {
	  return res.status(400).json({ error: 'Username and password are required' });
	}
	
	try {
	  // Überprüfe, ob der Benutzer bereits existiert
	  const existingUser = await User.findOne({ where: { username } });
	  if (existingUser) {
		return res.status(400).json({ error: 'Username already exists' });
	  }
	  
	  // Prüfe, ob dies der erste Benutzer ist
	  const userCount = await User.count();
	  const isFirstUser = userCount === 0;
	  
	  // Benutzer erstellen
	  const user = await User.create({
		username,
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
	
	try {
	  const user = await User.findOne({ where: { username } });
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

// routes/auth.js
router.get('/me', auth, async (req, res) => {
	try {
	  const user = await User.findByPk(req.user.id, {
		attributes: ['id', 'username', 'points', 'isAdmin', 'lastDailyReward']
	  });
	  
	  if (!user) {
		return res.status(404).json({ error: 'User not found' });
	  }
	  
	  res.json(user);
	} catch (err) {
	  console.error('Get user error:', err);
	  res.status(500).json({ error: 'Server error' });
	}
  });

// Allen Benutzern Punkte hinzufügen
router.post('/add-points', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { points } = req.body;
    
    if (!points || isNaN(points)) {
      return res.status(400).json({ error: 'Valid points value is required' });
    }
    
    await user.increment('points', { by: parseInt(points) });
    await user.reload();
    
    res.json({ 
      message: 'Points added successfully',
      user: {
        id: user.id,
        username: user.username,
        points: user.points
      } 
    });
  } catch (err) {
    console.error('Add points error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;