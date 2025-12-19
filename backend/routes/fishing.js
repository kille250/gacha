const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { User } = require('../models');

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

module.exports = router;

