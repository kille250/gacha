const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { User } = require('../models');
const { Op } = require('sequelize');

// Rank required to unlock autofishing (top X users)
const AUTOFISH_UNLOCK_RANK = 10;

// Fish types with their properties
const FISH_TYPES = [
  // Common fish (60% chance) - easy timing
  { id: 'sardine', name: 'Sardine', emoji: '🐟', rarity: 'common', minReward: 5, maxReward: 10, timingWindow: 2000, weight: 25 },
  { id: 'anchovy', name: 'Anchovy', emoji: '🐟', rarity: 'common', minReward: 5, maxReward: 12, timingWindow: 2000, weight: 20 },
  { id: 'herring', name: 'Herring', emoji: '🐟', rarity: 'common', minReward: 8, maxReward: 15, timingWindow: 1800, weight: 15 },
  
  // Uncommon fish (25% chance) - medium timing
  { id: 'bass', name: 'Sea Bass', emoji: '🐠', rarity: 'uncommon', minReward: 20, maxReward: 35, timingWindow: 1500, weight: 12 },
  { id: 'trout', name: 'Rainbow Trout', emoji: '🐠', rarity: 'uncommon', minReward: 25, maxReward: 40, timingWindow: 1400, weight: 8 },
  { id: 'mackerel', name: 'Mackerel', emoji: '🐠', rarity: 'uncommon', minReward: 30, maxReward: 50, timingWindow: 1300, weight: 5 },
  
  // Rare fish (10% chance) - harder timing
  { id: 'salmon', name: 'Salmon', emoji: '🐡', rarity: 'rare', minReward: 60, maxReward: 100, timingWindow: 1000, weight: 5 },
  { id: 'tuna', name: 'Bluefin Tuna', emoji: '🐡', rarity: 'rare', minReward: 80, maxReward: 120, timingWindow: 900, weight: 3 },
  { id: 'snapper', name: 'Red Snapper', emoji: '🐡', rarity: 'rare', minReward: 70, maxReward: 110, timingWindow: 950, weight: 2 },
  
  // Epic fish (4% chance) - very hard timing
  { id: 'swordfish', name: 'Swordfish', emoji: '🦈', rarity: 'epic', minReward: 150, maxReward: 250, timingWindow: 700, weight: 2.5 },
  { id: 'marlin', name: 'Blue Marlin', emoji: '🦈', rarity: 'epic', minReward: 200, maxReward: 300, timingWindow: 650, weight: 1 },
  { id: 'manta', name: 'Manta Ray', emoji: '🦈', rarity: 'epic', minReward: 180, maxReward: 280, timingWindow: 680, weight: 0.5 },
  
  // Legendary fish (1% chance) - extremely hard timing
  { id: 'whale', name: 'Golden Whale', emoji: '🐋', rarity: 'legendary', minReward: 500, maxReward: 800, timingWindow: 500, weight: 0.6 },
  { id: 'kraken', name: 'Baby Kraken', emoji: '🦑', rarity: 'legendary', minReward: 600, maxReward: 1000, timingWindow: 450, weight: 0.3 },
  { id: 'dragon', name: 'Sea Dragon', emoji: '🐉', rarity: 'legendary', minReward: 800, maxReward: 1500, timingWindow: 400, weight: 0.1 },
];

// Calculate total weight for probability
const TOTAL_WEIGHT = FISH_TYPES.reduce((sum, fish) => sum + fish.weight, 0);

// Select a random fish based on weights
function selectRandomFish() {
  const random = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  
  for (const fish of FISH_TYPES) {
    cumulative += fish.weight;
    if (random < cumulative) {
      return fish;
    }
  }
  
  return FISH_TYPES[0]; // Fallback to first fish
}

// Calculate reward within fish's range
function calculateReward(fish) {
  return Math.floor(Math.random() * (fish.maxReward - fish.minReward + 1)) + fish.minReward;
}

// Cost to cast (set to 0 for free fishing, or a value for paid fishing)
const CAST_COST = 0;

// Cooldown between casts in milliseconds (5 seconds)
const CAST_COOLDOWN = 5000;

// Store active fishing sessions (fish appears, waiting for catch)
const activeSessions = new Map();

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    // Remove sessions older than 30 seconds
    if (now - session.createdAt > 30000) {
      activeSessions.delete(key);
    }
  }
}, 60000);

// POST /api/fishing/cast - Start fishing (cast the line)
router.post('/cast', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has enough points (if there's a cost)
    if (CAST_COST > 0 && user.points < CAST_COST) {
      return res.status(400).json({ 
        error: 'Not enough points',
        required: CAST_COST,
        current: user.points
      });
    }
    
    // Deduct cost if any
    if (CAST_COST > 0) {
      user.points -= CAST_COST;
      await user.save();
    }
    
    // Select a fish
    const fish = selectRandomFish();
    
    // Random wait time before fish bites (1.5 to 6 seconds)
    const waitTime = Math.floor(Math.random() * 4500) + 1500;
    
    // Create session with cryptographically random ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      sessionId,
      fish,
      waitTime,
      createdAt: Date.now(),
      userId: req.user.id
    };
    
    activeSessions.set(sessionId, session);
    
    res.json({
      sessionId,
      waitTime,
      castCost: CAST_COST,
      newPoints: user.points,
      message: 'Line cast! Wait for a bite...'
    });
    
  } catch (err) {
    console.error('Fishing cast error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/catch - Attempt to catch the fish
router.post('/catch', auth, async (req, res) => {
  try {
    const { sessionId, reactionTime } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'No fishing session' });
    }
    
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(400).json({ error: 'Fishing session expired or invalid' });
    }
    
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not your fishing session' });
    }
    
    // Remove the session (one attempt only)
    activeSessions.delete(sessionId);
    
    const fish = session.fish;
    
    // Check if player reacted within the timing window
    // reactionTime is how long they took to click after the fish appeared
    const success = reactionTime !== undefined && reactionTime <= fish.timingWindow;
    
    if (success) {
      // Calculate reward
      const reward = calculateReward(fish);
      
      // Update user points
      const user = await User.findByPk(req.user.id);
      if (user) {
        user.points += reward;
        await user.save();
      }
      
      return res.json({
        success: true,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        reward,
        reactionTime,
        timingWindow: fish.timingWindow,
        newPoints: user ? user.points : null,
        message: `You caught a ${fish.name}!`
      });
    } else {
      return res.json({
        success: false,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        reward: 0,
        reactionTime: reactionTime || null,
        timingWindow: fish.timingWindow,
        message: reactionTime === undefined 
          ? `The ${fish.name} got away! You were too slow.`
          : `The ${fish.name} escaped! You needed to react within ${fish.timingWindow}ms.`
      });
    }
    
  } catch (err) {
    console.error('Fishing catch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/fishing/info - Get fishing game info
router.get('/info', auth, (req, res) => {
  // Return fish info without weights (so players can see what's possible)
  const fishInfo = FISH_TYPES.map(f => ({
    id: f.id,
    name: f.name,
    emoji: f.emoji,
    rarity: f.rarity,
    minReward: f.minReward,
    maxReward: f.maxReward,
    difficulty: f.timingWindow <= 500 ? 'Extreme' : 
                f.timingWindow <= 700 ? 'Very Hard' :
                f.timingWindow <= 1000 ? 'Hard' :
                f.timingWindow <= 1500 ? 'Medium' : 'Easy'
  }));
  
  res.json({
    castCost: CAST_COST,
    cooldown: CAST_COOLDOWN,
    fish: fishInfo
  });
});

// Helper function to get user's rank
async function getUserRank(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;
  
  // Count users with more points
  const higherRanked = await User.count({
    where: {
      points: { [Op.gt]: user.points }
    }
  });
  
  return higherRanked + 1; // Rank is 1-indexed
}

// GET /api/fishing/rank - Get user's ranking and autofish status
router.get('/rank', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const rank = await getUserRank(req.user.id);
    const totalUsers = await User.count();
    
    // Check if user qualifies for autofishing by rank
    const qualifiesByRank = rank <= AUTOFISH_UNLOCK_RANK;
    
    // Update autofishUnlockedByRank if status changed
    if (qualifiesByRank !== user.autofishUnlockedByRank) {
      user.autofishUnlockedByRank = qualifiesByRank;
      // Auto-enable autofishing when first unlocked by rank
      if (qualifiesByRank && !user.autofishEnabled) {
        user.autofishEnabled = true;
      }
      await user.save();
    }
    
    // User can autofish if manually enabled by admin OR qualified by rank
    const canAutofish = user.autofishEnabled || user.autofishUnlockedByRank;
    
    res.json({
      rank,
      totalUsers,
      points: user.points,
      autofishEnabled: user.autofishEnabled,
      autofishUnlockedByRank: user.autofishUnlockedByRank,
      canAutofish,
      requiredRank: AUTOFISH_UNLOCK_RANK,
      message: qualifiesByRank 
        ? 'Autofishing unlocked! You are in the top ' + AUTOFISH_UNLOCK_RANK + '!'
        : `Reach top ${AUTOFISH_UNLOCK_RANK} to unlock autofishing (currently #${rank})`
    });
  } catch (err) {
    console.error('Rank fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/fishing/leaderboard - Get top players
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const topUsers = await User.findAll({
      attributes: ['id', 'username', 'points'],
      order: [['points', 'DESC']],
      limit: 20
    });
    
    res.json({
      leaderboard: topUsers.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        points: u.points,
        hasAutofish: i < AUTOFISH_UNLOCK_RANK
      })),
      requiredRank: AUTOFISH_UNLOCK_RANK
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/autofish - Perform an autofish catch (for users with autofishing enabled)
router.post('/autofish', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user can autofish
    if (!user.autofishEnabled && !user.autofishUnlockedByRank) {
      return res.status(403).json({ 
        error: 'Autofishing not unlocked',
        message: 'Reach top ' + AUTOFISH_UNLOCK_RANK + ' to unlock autofishing'
      });
    }
    
    // Check cast cost
    if (CAST_COST > 0 && user.points < CAST_COST) {
      return res.status(400).json({ 
        error: 'Not enough points',
        required: CAST_COST,
        current: user.points
      });
    }
    
    // Deduct cost if any
    if (CAST_COST > 0) {
      user.points -= CAST_COST;
    }
    
    // Select a random fish
    const fish = selectRandomFish();
    
    // Autofish has 70% base success rate, adjusted by fish difficulty
    // Legendary = 40%, Epic = 55%, Rare = 65%, Uncommon = 75%, Common = 85%
    const successRates = {
      legendary: 0.40,
      epic: 0.55,
      rare: 0.65,
      uncommon: 0.75,
      common: 0.85
    };
    
    const successChance = successRates[fish.rarity] || 0.70;
    const success = Math.random() < successChance;
    
    if (success) {
      const reward = calculateReward(fish);
      user.points += reward;
      await user.save();
      
      return res.json({
        success: true,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        reward,
        newPoints: user.points,
        message: `Autofished a ${fish.name}!`
      });
    } else {
      await user.save();
      
      return res.json({
        success: false,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        reward: 0,
        newPoints: user.points,
        message: `The ${fish.name} got away during autofishing.`
      });
    }
    
  } catch (err) {
    console.error('Autofish error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/toggle-autofish - Toggle autofishing on/off
router.post('/toggle-autofish', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user can autofish
    if (!user.autofishEnabled && !user.autofishUnlockedByRank) {
      return res.status(403).json({ 
        error: 'Autofishing not unlocked',
        message: 'Reach top ' + AUTOFISH_UNLOCK_RANK + ' to unlock autofishing'
      });
    }
    
    const { enabled } = req.body;
    user.autofishEnabled = enabled !== undefined ? enabled : !user.autofishEnabled;
    await user.save();
    
    res.json({
      autofishEnabled: user.autofishEnabled,
      message: user.autofishEnabled ? 'Autofishing enabled' : 'Autofishing disabled'
    });
  } catch (err) {
    console.error('Toggle autofish error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: POST /api/fishing/admin/toggle-autofish - Admin toggle user's autofishing
router.post('/admin/toggle-autofish', auth, adminAuth, async (req, res) => {
  try {
    const { userId, enabled } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.autofishEnabled = enabled !== undefined ? enabled : !user.autofishEnabled;
    await user.save();
    
    console.log(`Admin (ID: ${req.user.id}) ${user.autofishEnabled ? 'enabled' : 'disabled'} autofishing for user ${user.username} (ID: ${userId})`);
    
    res.json({
      userId: user.id,
      username: user.username,
      autofishEnabled: user.autofishEnabled,
      message: `Autofishing ${user.autofishEnabled ? 'enabled' : 'disabled'} for ${user.username}`
    });
  } catch (err) {
    console.error('Admin toggle autofish error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: GET /api/fishing/admin/users - Get all users with autofish status
router.get('/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'points', 'autofishEnabled', 'autofishUnlockedByRank'],
      order: [['points', 'DESC']]
    });
    
    res.json({
      users: users.map((u, i) => ({
        id: u.id,
        username: u.username,
        points: u.points,
        rank: i + 1,
        autofishEnabled: u.autofishEnabled,
        autofishUnlockedByRank: u.autofishUnlockedByRank,
        canAutofish: u.autofishEnabled || u.autofishUnlockedByRank
      })),
      requiredRank: AUTOFISH_UNLOCK_RANK
    });
  } catch (err) {
    console.error('Admin users fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

