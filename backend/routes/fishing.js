const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { User, FishInventory } = require('../models');
const { Op } = require('sequelize');
const { isValidId } = require('../utils/validation');
const { 
  FISHING_CONFIG, 
  FISH_TYPES, 
  TRADE_OPTIONS, 
  selectRandomFish, 
  calculateFishTotals 
} = require('../config/fishing');

// Extract frequently used config values
const AUTOFISH_UNLOCK_RANK = FISHING_CONFIG.autofishUnlockRank;
const AUTOFISH_COOLDOWN = FISHING_CONFIG.autofishCooldown;
const CAST_COOLDOWN = FISHING_CONFIG.castCooldown;
const CAST_COST = FISHING_CONFIG.castCost;

// Rate limiting for autofish (per user)
const autofishCooldowns = new Map();
const autofishInProgress = new Set(); // Prevent race conditions

// Race condition protection for trading (per user)
const tradeInProgress = new Set();

// Clean up old cooldowns periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastTime] of autofishCooldowns.entries()) {
    if (now - lastTime > 60000) { // Remove entries older than 1 minute
      autofishCooldowns.delete(userId);
    }
  }
}, 60000);

// Store active fishing sessions (fish appears, waiting for catch)
const activeSessions = new Map();

// Rate limiting for casting (per user)
const castCooldowns = new Map();

// Clean up old sessions and cooldowns periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    // Remove sessions older than 30 seconds
    if (now - session.createdAt > 30000) {
      activeSessions.delete(key);
    }
  }
  // Clean up cast cooldowns older than 1 minute
  for (const [userId, lastTime] of castCooldowns.entries()) {
    if (now - lastTime > 60000) {
      castCooldowns.delete(userId);
    }
  }
}, 60000);

// POST /api/fishing/cast - Start fishing (cast the line)
router.post('/cast', auth, async (req, res) => {
  try {
    // Rate limiting check (prevent spam casting)
    const lastCast = castCooldowns.get(req.user.id);
    const now = Date.now();
    if (lastCast && (now - lastCast) < CAST_COOLDOWN) {
      const remainingMs = CAST_COOLDOWN - (now - lastCast);
      return res.status(429).json({ 
        error: 'Casting too fast',
        message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds`,
        retryAfter: remainingMs
      });
    }
    castCooldowns.set(req.user.id, now);
    
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
      // Get user for response
      const user = await User.findByPk(req.user.id);
      
      // Add fish to inventory (no automatic coin reward - use trading post to sell)
      const [inventoryItem, created] = await FishInventory.findOrCreate({
        where: { userId: req.user.id, fishId: fish.id },
        defaults: {
          userId: req.user.id,
          fishId: fish.id,
          fishName: fish.name,
          fishEmoji: fish.emoji,
          rarity: fish.rarity,
          quantity: 1
        }
      });
      
      if (!created) {
        inventoryItem.quantity += 1;
        await inventoryItem.save();
      }
      
      return res.json({
        success: true,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        reactionTime,
        timingWindow: fish.timingWindow,
        newPoints: user ? user.points : null,
        inventoryCount: inventoryItem.quantity,
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
    const userId = req.user.id;
    
    // Prevent race condition - only one autofish request at a time per user
    if (autofishInProgress.has(userId)) {
      return res.status(429).json({ 
        error: 'Request in progress',
        message: 'Another autofish request is being processed',
        retryAfter: 500
      });
    }
    
    // Rate limiting check
    const lastAutofish = autofishCooldowns.get(userId);
    const now = Date.now();
    if (lastAutofish && (now - lastAutofish) < AUTOFISH_COOLDOWN) {
      const remainingMs = AUTOFISH_COOLDOWN - (now - lastAutofish);
      return res.status(429).json({ 
        error: 'Too fast',
        message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds`,
        retryAfter: remainingMs
      });
    }
    
    // Lock this user's autofish
    autofishInProgress.add(userId);
    autofishCooldowns.set(userId, now);
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      autofishInProgress.delete(userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Re-verify rank to ensure user still qualifies
    const currentRank = await getUserRank(req.user.id);
    const stillQualifiesByRank = currentRank <= AUTOFISH_UNLOCK_RANK;
    
    // Update rank status if it changed
    if (stillQualifiesByRank !== user.autofishUnlockedByRank) {
      user.autofishUnlockedByRank = stillQualifiesByRank;
      await user.save();
    }
    
    // Check if user can autofish (admin-enabled OR qualified by rank)
    if (!user.autofishEnabled && !stillQualifiesByRank) {
      autofishInProgress.delete(userId);
      return res.status(403).json({ 
        error: 'Autofishing not unlocked',
        message: 'Reach top ' + AUTOFISH_UNLOCK_RANK + ' to unlock autofishing',
        currentRank
      });
    }
    
    // Check cast cost
    if (CAST_COST > 0 && user.points < CAST_COST) {
      autofishInProgress.delete(userId);
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
    
    // Autofish success rate varies by fish rarity (configured in config/fishing.js)
    const successChance = FISHING_CONFIG.autofishSuccessRates[fish.rarity] || 0.70;
    const success = Math.random() < successChance;
    
    if (success) {
      // Add fish to inventory (no automatic coin reward - use trading post to sell)
      const [inventoryItem, created] = await FishInventory.findOrCreate({
        where: { userId: req.user.id, fishId: fish.id },
        defaults: {
          userId: req.user.id,
          fishId: fish.id,
          fishName: fish.name,
          fishEmoji: fish.emoji,
          rarity: fish.rarity,
          quantity: 1
        }
      });
      
      if (!created) {
        inventoryItem.quantity += 1;
        await inventoryItem.save();
      }
      
      // Release lock
      autofishInProgress.delete(userId);
      
      return res.json({
        success: true,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        newPoints: user.points,
        inventoryCount: inventoryItem.quantity,
        message: `Autofished a ${fish.name}!`
      });
    } else {
      // Release lock
      autofishInProgress.delete(userId);
      
      return res.json({
        success: false,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        newPoints: user.points,
        message: `The ${fish.name} got away during autofishing.`
      });
    }
    
  } catch (err) {
    // Release lock on error
    autofishInProgress.delete(req.user.id);
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
    
    // Validate userId
    if (!userId || !isValidId(userId)) {
      return res.status(400).json({ error: 'Valid User ID required' });
    }
    
    const user = await User.findByPk(parseInt(userId, 10));
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

// =============================================
// TRADING POST ROUTES
// =============================================

// GET /api/fishing/inventory - Get user's fish inventory
router.get('/inventory', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const inventory = await FishInventory.findAll({
      where: { userId: req.user.id },
      order: [
        ['rarity', 'ASC'],
        ['fishName', 'ASC']
      ]
    });
    
    const totals = calculateFishTotals(inventory);
    
    res.json({
      inventory: inventory.map(item => ({
        fishId: item.fishId,
        fishName: item.fishName,
        fishEmoji: item.fishEmoji,
        rarity: item.rarity,
        quantity: item.quantity
      })),
      totals,
      totalFish: Object.values(totals).reduce((a, b) => a + b, 0),
      tickets: {
        rollTickets: user?.rollTickets || 0,
        premiumTickets: user?.premiumTickets || 0
      }
    });
  } catch (err) {
    console.error('Inventory fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/fishing/trading-post - Get trading post options with availability
router.get('/trading-post', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const inventory = await FishInventory.findAll({
      where: { userId: req.user.id }
    });
    
    const totals = calculateFishTotals(inventory);
    
    // Check availability for each trade option
    const options = TRADE_OPTIONS.map(option => {
      let canTrade = false;
      let currentQuantity = 0;
      
      if (option.requiredRarity === 'collection') {
        // Need at least 1 of each rarity
        canTrade = Object.values(totals).every(qty => qty >= 1);
        currentQuantity = Math.min(...Object.values(totals));
      } else {
        currentQuantity = totals[option.requiredRarity] || 0;
        canTrade = currentQuantity >= option.requiredQuantity;
      }
      
      return {
        ...option,
        canTrade,
        currentQuantity,
        timesAvailable: option.requiredRarity === 'collection' 
          ? currentQuantity 
          : Math.floor(currentQuantity / option.requiredQuantity)
      };
    });
    
    res.json({
      options,
      totals,
      tickets: {
        rollTickets: user?.rollTickets || 0,
        premiumTickets: user?.premiumTickets || 0
      }
    });
  } catch (err) {
    console.error('Trading post fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/trade - Execute a trade
router.post('/trade', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Prevent race condition - only one trade request at a time per user
    if (tradeInProgress.has(userId)) {
      return res.status(429).json({ 
        error: 'Trade in progress',
        message: 'Another trade request is being processed'
      });
    }
    tradeInProgress.add(userId);
    
    const { tradeId, quantity = 1 } = req.body;
    
    if (!tradeId) {
      tradeInProgress.delete(userId);
      return res.status(400).json({ error: 'Trade ID required' });
    }
    
    // Validate quantity
    const tradeQuantity = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
    
    const tradeOption = TRADE_OPTIONS.find(t => t.id === tradeId);
    if (!tradeOption) {
      tradeInProgress.delete(userId);
      return res.status(400).json({ error: 'Invalid trade option' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      tradeInProgress.delete(userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's inventory
    const inventory = await FishInventory.findAll({
      where: { userId: req.user.id }
    });
    
    const totals = calculateFishTotals(inventory);
    
    // Check if user can make the trade
    if (tradeOption.requiredRarity === 'collection') {
      // Need at least 1 of each rarity per trade
      const minAvailable = Math.min(...Object.values(totals));
      if (minAvailable < tradeQuantity) {
        tradeInProgress.delete(userId);
        return res.status(400).json({ 
          error: 'Not enough fish',
          message: `Need at least ${tradeQuantity} of each rarity`
        });
      }
      
      // Deduct 1 of each rarity per trade
      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      for (const rarity of rarities) {
        const itemsOfRarity = inventory.filter(i => i.rarity === rarity);
        let remaining = tradeQuantity;
        
        for (const item of itemsOfRarity) {
          if (remaining <= 0) break;
          
          const toDeduct = Math.min(item.quantity, remaining);
          item.quantity -= toDeduct;
          remaining -= toDeduct;
          
          if (item.quantity <= 0) {
            await item.destroy();
          } else {
            await item.save();
          }
        }
      }
    } else {
      // Regular rarity trade
      const requiredTotal = tradeOption.requiredQuantity * tradeQuantity;
      if (totals[tradeOption.requiredRarity] < requiredTotal) {
        tradeInProgress.delete(userId);
        return res.status(400).json({ 
          error: 'Not enough fish',
          message: `Need ${requiredTotal} ${tradeOption.requiredRarity} fish (have ${totals[tradeOption.requiredRarity]})`
        });
      }
      
      // Deduct fish from inventory
      const itemsOfRarity = inventory.filter(i => i.rarity === tradeOption.requiredRarity);
      let remaining = requiredTotal;
      
      for (const item of itemsOfRarity) {
        if (remaining <= 0) break;
        
        const toDeduct = Math.min(item.quantity, remaining);
        item.quantity -= toDeduct;
        remaining -= toDeduct;
        
        if (item.quantity <= 0) {
          await item.destroy();
        } else {
          await item.save();
        }
      }
    }
    
    // Give reward based on type
    let reward = {};
    if (tradeOption.rewardType === 'points') {
      const pointsReward = tradeOption.rewardAmount * tradeQuantity;
      user.points += pointsReward;
      reward = { points: pointsReward };
    } else if (tradeOption.rewardType === 'rollTickets') {
      const ticketReward = tradeOption.rewardAmount * tradeQuantity;
      user.rollTickets = (user.rollTickets || 0) + ticketReward;
      reward = { rollTickets: ticketReward };
    } else if (tradeOption.rewardType === 'premiumTickets') {
      const premiumReward = tradeOption.rewardAmount * tradeQuantity;
      user.premiumTickets = (user.premiumTickets || 0) + premiumReward;
      reward = { premiumTickets: premiumReward };
    } else if (tradeOption.rewardType === 'mixed') {
      // Handle mixed rewards (e.g., both rollTickets and premiumTickets)
      const amounts = tradeOption.rewardAmount;
      if (amounts.rollTickets) {
        const ticketReward = amounts.rollTickets * tradeQuantity;
        user.rollTickets = (user.rollTickets || 0) + ticketReward;
        reward.rollTickets = ticketReward;
      }
      if (amounts.premiumTickets) {
        const premiumReward = amounts.premiumTickets * tradeQuantity;
        user.premiumTickets = (user.premiumTickets || 0) + premiumReward;
        reward.premiumTickets = premiumReward;
      }
      if (amounts.points) {
        const pointsReward = amounts.points * tradeQuantity;
        user.points += pointsReward;
        reward.points = pointsReward;
      }
    }
    await user.save();
    
    // Get updated inventory
    const updatedInventory = await FishInventory.findAll({
      where: { userId: req.user.id }
    });
    
    const newTotals = calculateFishTotals(updatedInventory);
    
    // Build message based on reward type
    let message = 'Trade successful!';
    if (reward.points) {
      message = `+${reward.points} points!`;
    } else if (reward.rollTickets && reward.premiumTickets) {
      message = `+${reward.rollTickets} Roll Tickets, +${reward.premiumTickets} Premium Tickets!`;
    } else if (reward.rollTickets) {
      message = `+${reward.rollTickets} Roll Ticket${reward.rollTickets > 1 ? 's' : ''}!`;
    } else if (reward.premiumTickets) {
      message = `+${reward.premiumTickets} Premium Ticket${reward.premiumTickets > 1 ? 's' : ''}!`;
    }
    
    // Release lock before responding
    tradeInProgress.delete(userId);
    
    res.json({
      success: true,
      tradeName: tradeOption.name,
      quantity: tradeQuantity,
      rewardType: tradeOption.rewardType,
      reward,
      newPoints: user.points,
      newTickets: {
        rollTickets: user.rollTickets || 0,
        premiumTickets: user.premiumTickets || 0
      },
      newTotals,
      message
    });
    
  } catch (err) {
    // Always release lock on error
    tradeInProgress.delete(userId);
    console.error('Trade error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
