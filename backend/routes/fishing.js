const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { sequelize, User, FishInventory } = require('../models');
const { Op } = require('sequelize');
const { isValidId } = require('../utils/validation');
const { 
  FISHING_CONFIG, 
  FISH_TYPES, 
  TRADE_OPTIONS, 
  selectRandomFish, 
  calculateFishTotals,
  getCatchThresholds
} = require('../config/fishing');

// Extract frequently used config values
const AUTOFISH_UNLOCK_RANK = FISHING_CONFIG.autofishUnlockRank;
const AUTOFISH_COOLDOWN = FISHING_CONFIG.autofishCooldown;
const CAST_COOLDOWN = FISHING_CONFIG.castCooldown;
const CAST_COST = FISHING_CONFIG.castCost;
const LATENCY_BUFFER = FISHING_CONFIG.latencyBuffer || 200;
const MIN_REACTION_TIME = FISHING_CONFIG.minReactionTime || 80;
const CLEANUP_INTERVAL = FISHING_CONFIG.cleanupInterval || 15000;
const SESSION_EXPIRY = FISHING_CONFIG.sessionExpiry || 30000;
const TRADE_TIMEOUT = FISHING_CONFIG.tradeTimeout || 30000;
const RANK_CACHE_TTL = FISHING_CONFIG.rankCacheTTL || 30000;

// Rate limiting maps (per user)
const autofishCooldowns = new Map();
const castCooldowns = new Map();

// Race condition protection with timestamps for timeout cleanup
const autofishInProgress = new Set();
const tradeInProgress = new Map(); // userId -> timestamp (for timeout detection)

// Multi-tab detection: track active fishing mode per user
const userFishingMode = new Map(); // userId -> { mode: 'manual' | 'autofish', lastActivity: timestamp }

// Rank cache for performance
const rankCache = new Map(); // points -> { rank, expiry }
const userRankCache = new Map(); // userId -> { rank, expiry }

// Store active fishing sessions (fish appears, waiting for catch)
const activeSessions = new Map();

/**
 * Check if user is in conflicting fishing mode (multi-tab exploit prevention)
 * @param {number} userId 
 * @param {string} requestedMode - 'manual' or 'autofish'
 * @returns {boolean|string} - false if OK, or error message
 */
function checkFishingModeConflict(userId, requestedMode) {
  const current = userFishingMode.get(userId);
  if (!current) return false;
  
  // 10 second window to detect concurrent activity
  const isRecent = Date.now() - current.lastActivity < 10000;
  
  if (isRecent && current.mode !== requestedMode) {
    return `Cannot ${requestedMode} while ${current.mode} is active`;
  }
  
  return false;
}

/**
 * Update user's fishing mode (for multi-tab detection)
 */
function setFishingMode(userId, mode) {
  userFishingMode.set(userId, { mode, lastActivity: Date.now() });
}

// Cleanup interval - removes stale data from all maps/sessions
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired fishing sessions
  for (const [key, session] of activeSessions.entries()) {
    if (now - session.createdAt > SESSION_EXPIRY) {
      activeSessions.delete(key);
    }
  }
  
  // Clean up old cooldowns (1 minute expiry)
  for (const [userId, lastTime] of autofishCooldowns.entries()) {
    if (now - lastTime > 60000) {
      autofishCooldowns.delete(userId);
    }
  }
  for (const [userId, lastTime] of castCooldowns.entries()) {
    if (now - lastTime > 60000) {
      castCooldowns.delete(userId);
    }
  }
  
  // Clean up stuck trades (timeout protection)
  for (const [userId, startTime] of tradeInProgress.entries()) {
    if (now - startTime > TRADE_TIMEOUT) {
      tradeInProgress.delete(userId);
      console.warn(`[Fishing] Trade timeout for user ${userId}, releasing lock`);
    }
  }
  
  // Clean up fishing mode tracking (inactive for 30 seconds)
  for (const [userId, data] of userFishingMode.entries()) {
    if (now - data.lastActivity > 30000) {
      userFishingMode.delete(userId);
    }
  }
  
  // Clean up expired rank cache entries
  for (const [userId, data] of userRankCache.entries()) {
    if (now > data.expiry) {
      userRankCache.delete(userId);
    }
  }
}, CLEANUP_INTERVAL);

// POST /api/fishing/cast - Start fishing (cast the line)
router.post('/cast', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Multi-tab detection: check for autofish conflict
    const modeConflict = checkFishingModeConflict(userId, 'manual');
    if (modeConflict) {
      return res.status(409).json({ 
        error: 'Mode conflict',
        message: modeConflict
      });
    }
    
    // Rate limiting check (prevent spam casting)
    const lastCast = castCooldowns.get(userId);
    const now = Date.now();
    if (lastCast && (now - lastCast) < CAST_COOLDOWN) {
      const remainingMs = CAST_COOLDOWN - (now - lastCast);
      return res.status(429).json({ 
        error: 'Casting too fast',
        message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds`,
        retryAfter: remainingMs
      });
    }
    castCooldowns.set(userId, now);
    setFishingMode(userId, 'manual');
    
    // Use transaction with row lock for atomic points deduction
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      // Check if user has enough points (if there's a cost)
      if (CAST_COST > 0 && user.points < CAST_COST) {
        throw new Error('NOT_ENOUGH_POINTS');
      }
      
      // Deduct cost if any (atomic operation)
      if (CAST_COST > 0) {
        user.points -= CAST_COST;
      }
      
      // Get pity data for fish selection
      const pityData = user.fishingPity || { legendary: 0, epic: 0 };
      
      // Select a fish with pity system
      const { fish, pityTriggered, resetPity } = selectRandomFish(pityData);
      
      // Update pity counters
      const newPityData = { ...pityData };
      if (resetPity.includes('legendary')) {
        newPityData.legendary = 0;
      } else {
        newPityData.legendary = (newPityData.legendary || 0) + 1;
      }
      if (resetPity.includes('epic')) {
        newPityData.epic = 0;
      } else if (!resetPity.includes('legendary')) {
        newPityData.epic = (newPityData.epic || 0) + 1;
      }
      newPityData.lastCast = now;
      user.fishingPity = newPityData;
      
      // Update fishing stats
      const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
      stats.totalCasts = (stats.totalCasts || 0) + 1;
      user.fishingStats = stats;
      
      await user.save({ transaction });
      
      return { user, fish, pityTriggered };
    });
    
    const { user, fish, pityTriggered } = result;
    
    // Random wait time before fish bites (1.5 to 6 seconds)
    const waitTime = Math.floor(Math.random() * 4500) + 1500;
    
    // Create session with cryptographically random ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    const createdAt = Date.now();
    const session = {
      sessionId,
      fish,
      waitTime,
      createdAt,
      pityTriggered,
      // Server tracks when fish appears for anti-cheat validation
      fishAppearsAt: createdAt + waitTime,
      userId
    };
    
    activeSessions.set(sessionId, session);
    
    res.json({
      sessionId,
      waitTime,
      castCost: CAST_COST,
      newPoints: user.points,
      pityTriggered: pityTriggered || false,
      message: pityTriggered ? '✨ Lucky cast! A rare fish approaches...' : 'Line cast! Wait for a bite...'
    });
    
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err.message === 'NOT_ENOUGH_POINTS') {
      return res.status(400).json({ 
        error: 'Not enough points',
        required: CAST_COST
      });
    }
    console.error('Fishing cast error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/catch - Attempt to catch the fish
router.post('/catch', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const { sessionId, reactionTime: clientReactionTime } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'No fishing session' });
    }
    
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(400).json({ error: 'Fishing session expired or invalid' });
    }
    
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Not your fishing session' });
    }
    
    // Remove the session (one attempt only)
    activeSessions.delete(sessionId);
    
    const fish = session.fish;
    const now = Date.now();
    
    // Server-side timing validation (anti-cheat)
    const serverReactionTime = now - session.fishAppearsAt;
    
    // Anti-cheat: Minimum reaction time (humans can't react < 80ms)
    // Use the higher of: minimum reaction time, client time, or (server time - latency buffer)
    let validatedReactionTime;
    if (clientReactionTime !== undefined) {
      validatedReactionTime = Math.max(
        MIN_REACTION_TIME,  // Minimum human-possible reaction
        clientReactionTime,
        serverReactionTime - LATENCY_BUFFER
      );
    }
    
    // Check if player reacted within the timing window
    const success = validatedReactionTime !== undefined && validatedReactionTime <= fish.timingWindow;
    
    if (success) {
      // Use transaction for atomic inventory update
      const result = await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(userId, {
          lock: transaction.LOCK.UPDATE,
          transaction
        });
        
        if (!user) {
          throw new Error('USER_NOT_FOUND');
        }
        
        // Get rarity-specific catch quality thresholds (skill ceiling improvement)
        const catchConfig = getCatchThresholds(fish.rarity);
        
        let catchQuality = 'normal';
        let bonusMultiplier = 1.0;
        let catchMessage = `You caught a ${fish.name}!`;
        
        const reactionRatio = validatedReactionTime / fish.timingWindow;
        
        if (reactionRatio <= catchConfig.perfectThreshold) {
          catchQuality = 'perfect';
          bonusMultiplier = catchConfig.perfectMultiplier;
          catchMessage = `⭐ PERFECT! You caught a ${fish.name}!`;
        } else if (reactionRatio <= catchConfig.greatThreshold) {
          catchQuality = 'great';
          bonusMultiplier = catchConfig.greatMultiplier;
          catchMessage = `✨ Great catch! You caught a ${fish.name}!`;
        }
        
        // Calculate fish quantity based on catch quality
        const fishQuantity = Math.floor(bonusMultiplier);
        
        // Add fish to inventory (quantity based on catch quality)
        const [inventoryItem, created] = await FishInventory.findOrCreate({
          where: { userId, fishId: fish.id },
          defaults: {
            userId,
            fishId: fish.id,
            fishName: fish.name,
            fishEmoji: fish.emoji,
            rarity: fish.rarity,
            quantity: fishQuantity
          },
          transaction
        });
        
        if (!created) {
          inventoryItem.quantity += fishQuantity;
          await inventoryItem.save({ transaction });
        }
        
        // Update fishing stats
        const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
        stats.totalCatches = (stats.totalCatches || 0) + fishQuantity;
        if (catchQuality === 'perfect') {
          stats.perfectCatches = (stats.perfectCatches || 0) + 1;
        }
        stats.fishCaught = stats.fishCaught || {};
        stats.fishCaught[fish.id] = (stats.fishCaught[fish.id] || 0) + fishQuantity;
        user.fishingStats = stats;
        
        await user.save({ transaction });
        
        return { user, catchQuality, bonusMultiplier, fishQuantity, catchMessage, inventoryItem };
      });
      
      const { user, catchQuality, bonusMultiplier, fishQuantity, catchMessage, inventoryItem } = result;
      
      return res.json({
        success: true,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        catchQuality,
        bonusMultiplier,
        fishQuantity,
        reactionTime: validatedReactionTime,
        timingWindow: fish.timingWindow,
        newPoints: user ? user.points : null,
        inventoryCount: inventoryItem.quantity,
        pityTriggered: session.pityTriggered || false,
        message: catchMessage
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
        reactionTime: validatedReactionTime || null,
        timingWindow: fish.timingWindow,
        message: validatedReactionTime === undefined 
          ? `The ${fish.name} got away! You were too slow.`
          : `The ${fish.name} escaped! You needed to react within ${fish.timingWindow}ms.`
      });
    }
    
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Fishing catch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/fishing/info - Get fishing game info
router.get('/info', auth, async (req, res) => {
  try {
    // Get user for pity info
    const user = await User.findByPk(req.user.id, {
      attributes: ['fishingPity', 'fishingStats']
    });
    
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
    
    // Calculate pity progress percentages
    const pityData = user?.fishingPity || { legendary: 0, epic: 0 };
    const pityConfig = FISHING_CONFIG.pity;
    
    const pityProgress = {
      legendary: {
        current: pityData.legendary || 0,
        softPity: pityConfig.legendary.softPity,
        hardPity: pityConfig.legendary.hardPity,
        progress: Math.min(100, ((pityData.legendary || 0) / pityConfig.legendary.hardPity) * 100),
        inSoftPity: (pityData.legendary || 0) >= pityConfig.legendary.softPity
      },
      epic: {
        current: pityData.epic || 0,
        softPity: pityConfig.epic.softPity,
        hardPity: pityConfig.epic.hardPity,
        progress: Math.min(100, ((pityData.epic || 0) / pityConfig.epic.hardPity) * 100),
        inSoftPity: (pityData.epic || 0) >= pityConfig.epic.softPity
      }
    };
    
    res.json({
      castCost: CAST_COST,
      cooldown: CAST_COOLDOWN,
      autofishCooldown: AUTOFISH_COOLDOWN,
      fish: fishInfo,
      pity: pityProgress,
      stats: user?.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} }
    });
  } catch (err) {
    console.error('Fishing info error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user's rank with caching for performance
 * @param {number} userId 
 * @param {boolean} forceRefresh - Skip cache and recalculate
 * @returns {Promise<number|null>}
 */
async function getUserRank(userId, forceRefresh = false) {
  const now = Date.now();
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = userRankCache.get(userId);
    if (cached && now < cached.expiry) {
      return cached.rank;
    }
  }
  
  const user = await User.findByPk(userId);
  if (!user) return null;
  
  // Count users with more points
  const higherRanked = await User.count({
    where: {
      points: { [Op.gt]: user.points }
    }
  });
  
  const rank = higherRanked + 1; // Rank is 1-indexed
  
  // Cache the result
  userRankCache.set(userId, {
    rank,
    expiry: now + RANK_CACHE_TTL
  });
  
  return rank;
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
  const userId = req.user.id;
  
  try {
    // Multi-tab detection: check for manual fishing conflict
    const modeConflict = checkFishingModeConflict(userId, 'autofish');
    if (modeConflict) {
      return res.status(409).json({ 
        error: 'Mode conflict',
        message: modeConflict
      });
    }
    
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
    setFishingMode(userId, 'autofish');
    
    // Use transaction for atomic operations
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      // Re-verify rank to ensure user still qualifies (use cache for performance)
      const currentRank = await getUserRank(userId);
      const stillQualifiesByRank = currentRank <= AUTOFISH_UNLOCK_RANK;
      
      // Update rank status if it changed
      if (stillQualifiesByRank !== user.autofishUnlockedByRank) {
        user.autofishUnlockedByRank = stillQualifiesByRank;
      }
      
      // Check if user can autofish (admin-enabled OR qualified by rank)
      if (!user.autofishEnabled && !stillQualifiesByRank) {
        throw new Error('AUTOFISH_NOT_UNLOCKED');
      }
      
      // Check cast cost
      if (CAST_COST > 0 && user.points < CAST_COST) {
        throw new Error('NOT_ENOUGH_POINTS');
      }
      
      // Deduct cost if any
      if (CAST_COST > 0) {
        user.points -= CAST_COST;
      }
      
      // Get pity data (autofish also contributes to pity)
      const pityData = user.fishingPity || { legendary: 0, epic: 0 };
      
      // Select a random fish with pity
      const { fish, pityTriggered, resetPity } = selectRandomFish(pityData);
      
      // Update pity counters
      const newPityData = { ...pityData };
      if (resetPity.includes('legendary')) {
        newPityData.legendary = 0;
      } else {
        newPityData.legendary = (newPityData.legendary || 0) + 1;
      }
      if (resetPity.includes('epic')) {
        newPityData.epic = 0;
      } else if (!resetPity.includes('legendary')) {
        newPityData.epic = (newPityData.epic || 0) + 1;
      }
      newPityData.lastCast = now;
      user.fishingPity = newPityData;
      
      // Update fishing stats
      const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
      stats.totalCasts = (stats.totalCasts || 0) + 1;
      
      // Autofish success rate varies by fish rarity (nerfed for balance)
      const successChance = FISHING_CONFIG.autofishSuccessRates[fish.rarity] || 0.40;
      const success = Math.random() < successChance;
      
      let inventoryItem = null;
      
      if (success) {
        // Add fish to inventory
        const [item, created] = await FishInventory.findOrCreate({
          where: { userId, fishId: fish.id },
          defaults: {
            userId,
            fishId: fish.id,
            fishName: fish.name,
            fishEmoji: fish.emoji,
            rarity: fish.rarity,
            quantity: 1
          },
          transaction
        });
        
        if (!created) {
          item.quantity += 1;
          await item.save({ transaction });
        }
        
        inventoryItem = item;
        stats.totalCatches = (stats.totalCatches || 0) + 1;
        stats.fishCaught = stats.fishCaught || {};
        stats.fishCaught[fish.id] = (stats.fishCaught[fish.id] || 0) + 1;
      }
      
      user.fishingStats = stats;
      await user.save({ transaction });
      
      return { user, fish, success, inventoryItem, pityTriggered };
    });
    
    // Release lock
    autofishInProgress.delete(userId);
    
    const { user, fish, success, inventoryItem, pityTriggered } = result;
    
    if (success) {
      return res.json({
        success: true,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        newPoints: user.points,
        inventoryCount: inventoryItem?.quantity || 1,
        pityTriggered,
        message: pityTriggered ? `✨ Lucky! Autofished a ${fish.name}!` : `Autofished a ${fish.name}!`
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
        newPoints: user.points,
        message: `The ${fish.name} got away during autofishing.`
      });
    }
    
  } catch (err) {
    // Release lock on error
    autofishInProgress.delete(userId);
    
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err.message === 'AUTOFISH_NOT_UNLOCKED') {
      return res.status(403).json({ 
        error: 'Autofishing not unlocked',
        message: `Reach top ${AUTOFISH_UNLOCK_RANK} to unlock autofishing`
      });
    }
    if (err.message === 'NOT_ENOUGH_POINTS') {
      return res.status(400).json({ 
        error: 'Not enough points',
        required: CAST_COST
      });
    }
    
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

// POST /api/fishing/trade - Execute a trade (with database transaction for atomicity)
router.post('/trade', auth, async (req, res) => {
  const userId = req.user.id;
  const now = Date.now();
  
  // Prevent race condition - only one trade request at a time per user
  // Use Map with timestamp for timeout cleanup
  if (tradeInProgress.has(userId)) {
    return res.status(429).json({ 
      error: 'Trade in progress',
      message: 'Another trade request is being processed'
    });
  }
  tradeInProgress.set(userId, now);
  
  // Start database transaction for atomicity
  const transaction = await sequelize.transaction();
  
  try {
    const { tradeId, quantity = 1 } = req.body;
    
    if (!tradeId) {
      await transaction.rollback();
      tradeInProgress.delete(userId);
      return res.status(400).json({ error: 'Trade ID required' });
    }
    
    // Validate quantity
    const tradeQuantity = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
    
    const tradeOption = TRADE_OPTIONS.find(t => t.id === tradeId);
    if (!tradeOption) {
      await transaction.rollback();
      tradeInProgress.delete(userId);
      return res.status(400).json({ error: 'Invalid trade option' });
    }
    
    // Lock user row for update (prevents concurrent modification)
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    if (!user) {
      await transaction.rollback();
      tradeInProgress.delete(userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's inventory with lock
    const inventory = await FishInventory.findAll({
      where: { userId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    const totals = calculateFishTotals(inventory);
    
    // Check if user can make the trade
    if (tradeOption.requiredRarity === 'collection') {
      // Need at least 1 of each rarity per trade
      const minAvailable = Math.min(...Object.values(totals));
      if (minAvailable < tradeQuantity) {
        await transaction.rollback();
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
            await item.destroy({ transaction });
          } else {
            await item.save({ transaction });
          }
        }
      }
    } else {
      // Regular rarity trade
      const requiredTotal = tradeOption.requiredQuantity * tradeQuantity;
      if (totals[tradeOption.requiredRarity] < requiredTotal) {
        await transaction.rollback();
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
          await item.destroy({ transaction });
        } else {
          await item.save({ transaction });
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
    await user.save({ transaction });
    
    // Commit the transaction - all changes are now permanent
    await transaction.commit();
    
    // Get updated inventory (after commit)
    const updatedInventory = await FishInventory.findAll({
      where: { userId }
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
    // Rollback transaction on error - no partial changes saved
    await transaction.rollback();
    // Always release lock on error
    tradeInProgress.delete(userId);
    console.error('Trade error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
