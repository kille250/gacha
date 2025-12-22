/**
 * Fishing Routes - Modular Wrapper
 * 
 * This file now serves as a wrapper that imports from the modular structure.
 * All actual route implementations are in ./fishing/ subdirectory.
 * 
 * Structure:
 * - ./fishing/core.js      - Cast, catch, info, daily
 * - ./fishing/autofish.js  - Autofish, rank, leaderboard
 * - ./fishing/trading.js   - Inventory, trading-post, trade
 * - ./fishing/areas.js     - Fishing areas
 * - ./fishing/rods.js      - Fishing rods
 * - ./fishing/challenges.js- Daily challenges
 * - ./fishing/prestige.js  - Prestige system (NEW)
 * - ./fishing/collection.js- Fish collection/codex (NEW)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { sequelize, User, FishInventory } = require('../models');
const { Op } = require('sequelize');
const { isValidId } = require('../utils/validation');

// Config imports
const { 
  FISHING_CONFIG, 
  FISH_TYPES, 
  TRADE_OPTIONS,
  FISHING_AREAS,
  FISHING_RODS,
  DAILY_CHALLENGES,
  selectRandomFish,
  selectRandomFishWithBonuses,
  calculateFishTotals,
  getCatchThresholds,
  getAutofishLimit,
  getTodayString,
  needsDailyReset,
  generateDailyChallenges,
  calculatePityBonus
} = require('../config/fishing');

// Import new modular routes
const prestigeRoutes = require('./fishing/prestige');
const collectionRoutes = require('./fishing/collection');

// Service imports
const {
  updatePityCounters,
  getOrResetDailyData,
  getOrResetChallenges,
  updateChallengeProgress,
  applyChallengeRewards,
  calculateCatchQuality,
  calculateFishQuantity,
  getRandomWaitTime,
  getMissTimeout,
  updateStreakCounters,
  calculateMercyBonus,
  applyStreakBonus,
  checkFishingModeConflict,
  setFishingMode,
  getUserPrestigeAutofishBonus,
  buildPremiumStatus
} = require('../services/fishingService');

// Extract daily limits from config
const DAILY_LIMITS = FISHING_CONFIG.dailyLimits;

const {
  getUserRank,
  refreshAllRanks,
  getTotalUsers
} = require('../services/rankService');

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

// Session limits from config (with fallbacks)
const MAX_ACTIVE_SESSIONS_PER_USER = FISHING_CONFIG.sessionLimits?.maxActiveSessionsPerUser || 3;
const MAX_MAP_SIZE = FISHING_CONFIG.sessionLimits?.maxMapSize || 10000;

// Rate limiting maps (per user)
const autofishCooldowns = new Map();
const castCooldowns = new Map();

// Race condition protection with timestamps for timeout cleanup
const autofishInProgress = new Set();
const tradeInProgress = new Map(); // userId -> timestamp (for timeout detection)

// Multi-tab detection: track active fishing mode per user
const userFishingMode = new Map(); // userId -> { mode: 'manual' | 'autofish', lastActivity: timestamp }

// Store active fishing sessions (fish appears, waiting for catch)
const activeSessions = new Map();

// Helper wrappers for service functions that need the userFishingMode map
const checkModeConflict = (userId, mode) => checkFishingModeConflict(userFishingMode, userId, mode);
const setMode = (userId, mode) => setFishingMode(userFishingMode, userId, mode);

// Cleanup interval - removes stale data from all maps/sessions
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired fishing sessions
  // Sessions expire when: fish has appeared + missTimeout + buffer has passed
  // This prevents legitimate catches from being deleted prematurely
  for (const [key, session] of activeSessions.entries()) {
    // Calculate actual expiry: when the fish appears + max reaction window + network buffer
    const missTimeout = FISHING_CONFIG.missTimeout?.[session.fish?.rarity] || 2500;
    const sessionExpiry = session.fishAppearsAt + missTimeout + LATENCY_BUFFER + 1000; // Extra 1s buffer
    
    // Fallback: also expire very old sessions (safety net)
    const absoluteExpiry = session.createdAt + SESSION_EXPIRY;
    
    if (now > sessionExpiry || now > absoluteExpiry) {
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
  
  // Clean up fishing mode tracking (inactive for 20 seconds - slightly longer than conflict window)
  for (const [userId, data] of userFishingMode.entries()) {
    if (now - data.lastActivity > 20000) {
      userFishingMode.delete(userId);
    }
  }
  
  // Note: Rank cache is now handled by rankService.js
  
  // Memory protection: Enforce map size limits
  // If maps grow too large, remove oldest entries
  const pruneMap = (map, maxSize, sortKey = null) => {
    if (map.size > maxSize) {
      const entries = [...map.entries()];
      // Sort by value (timestamp) if it's a simple timestamp map
      if (sortKey === null) {
        entries.sort((a, b) => a[1] - b[1]);
      }
      // Remove oldest 50%
      const toRemove = Math.floor(entries.length / 2);
      for (let i = 0; i < toRemove; i++) {
        map.delete(entries[i][0]);
      }
      console.log(`[Fishing] Pruned ${toRemove} entries from map (was ${entries.length})`);
    }
  };
  
  pruneMap(autofishCooldowns, MAX_MAP_SIZE);
  pruneMap(castCooldowns, MAX_MAP_SIZE);
  pruneMap(userFishingMode, MAX_MAP_SIZE);
  pruneMap(tradeInProgress, MAX_MAP_SIZE);
  
  // Active sessions should naturally expire, but also enforce limit
  if (activeSessions.size > MAX_MAP_SIZE) {
    console.warn(`[Fishing] Active sessions exceeded limit: ${activeSessions.size}`);
    // Remove oldest sessions
    const entries = [...activeSessions.entries()]
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toRemove = Math.floor(entries.length / 2);
    for (let i = 0; i < toRemove; i++) {
      activeSessions.delete(entries[i][0]);
    }
  }
}, CLEANUP_INTERVAL);

// POST /api/fishing/cast - Start fishing (cast the line)
router.post('/cast', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Multi-tab detection: check for autofish conflict
    const modeConflict = checkModeConflict(userId, 'manual');
    if (modeConflict) {
      return res.status(409).json({ 
        error: 'Mode conflict',
        message: modeConflict
      });
    }
    
    // Session hoarding prevention: limit active sessions per user
    const userSessionCount = [...activeSessions.values()]
      .filter(s => s.userId === userId).length;
    if (userSessionCount >= MAX_ACTIVE_SESSIONS_PER_USER) {
      return res.status(429).json({
        error: 'Too many active sessions',
        message: 'Please complete or let your current fishing attempts expire'
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
    setMode(userId, 'manual');
    
    // Use transaction with row lock for atomic points deduction
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      // === DAILY LIMIT CHECK ===
      let daily = getOrResetDailyData(user);
      if (daily.manualCasts >= DAILY_LIMITS.manualCasts) {
        throw new Error(`DAILY_LIMIT:${DAILY_LIMITS.manualCasts}`);
      }
      
      // Check if user has enough points (if there's a cost)
      if (CAST_COST > 0 && user.points < CAST_COST) {
        throw new Error('NOT_ENOUGH_POINTS');
      }
      
      // Deduct cost if any (atomic operation)
      if (CAST_COST > 0) {
        user.points -= CAST_COST;
      }
      
      // === MERCY TIMER BONUS ===
      // Calculate bonus timing based on consecutive misses
      const mercyBonus = calculateMercyBonus(daily.missStreak || 0);
      
      // Get area and rod for bonuses
      const areas = user.fishingAreas || { current: 'pond' };
      const rodId = user.fishingRod || 'basic';
      const rod = FISHING_RODS[rodId] || FISHING_RODS.basic;
      
      // Get pity data for fish selection
      const pityData = user.fishingPity || { legendary: 0, epic: 0 };
      
      // Select a fish with pity, area, and rod bonuses
      const { fish: baseFish, pityTriggered, resetPity } = selectRandomFishWithBonuses(
        pityData, 
        areas.current, 
        rodId
      );
      
      // Apply timing bonuses to fish (rod bonus + mercy bonus)
      const fish = {
        ...baseFish,
        timingWindow: baseFish.timingWindow + (rod.timingBonus || 0) + mercyBonus
      };
      
      // Update pity counters using helper function (fixes epic counter bug)
      user.fishingPity = updatePityCounters(pityData, resetPity, now);
      
      // Update fishing stats
      const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
      stats.totalCasts = (stats.totalCasts || 0) + 1;
      user.fishingStats = stats;
      
      // Increment daily manual cast counter
      daily.manualCasts = (daily.manualCasts || 0) + 1;
      user.fishingDaily = daily;
      
      await user.save({ transaction });
      
      return { user, fish, pityTriggered, mercyBonus, daily };
    });
    
    const { user, fish, pityTriggered, mercyBonus, daily } = result;
    
    // Random wait time before fish bites (from config)
    const waitTime = getRandomWaitTime();
    
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
    
    // Get miss timeout based on fish rarity (configured per rarity for balance)
    const missTimeout = getMissTimeout(fish.rarity);
    
    // Build response message
    let message = pityTriggered ? '✨ Lucky cast! A rare fish approaches...' : 'Line cast! Wait for a bite...';
    if (mercyBonus > 0) {
      message += ` (+${mercyBonus}ms mercy bonus!)`;
    }
    
    res.json({
      sessionId,
      waitTime,
      missTimeout,  // Frontend uses this to know when fish escapes
      timingWindow: fish.timingWindow,  // Include adjusted timing window
      castCost: CAST_COST,
      newPoints: user.points,
      pityTriggered: pityTriggered || false,
      mercyBonus: mercyBonus > 0 ? mercyBonus : null,
      daily: {
        manualCasts: daily.manualCasts,
        limit: DAILY_LIMITS.manualCasts
      },
      message
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
    if (err.message.startsWith('DAILY_LIMIT:')) {
      const limit = parseInt(err.message.split(':')[1], 10);
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `Maximum ${limit} manual casts per day. Resets at midnight!`,
        dailyLimit: limit
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
    // SECURITY: Use server time only - never trust client-reported reaction time
    // This prevents timing attacks where clients fake low latency
    const serverReactionTime = now - session.fishAppearsAt;
    
    // Anti-cheat: Minimum reaction time (humans can't react < 80ms)
    // Server time is authoritative - client time is ignored for security
    const validatedReactionTime = Math.max(
      MIN_REACTION_TIME,  // Minimum human-possible reaction
      serverReactionTime
    );
    
    // Check if player reacted within the timing window
    // Note: serverReactionTime < 0 means they clicked before fish appeared (impossible without cheating)
    const success = serverReactionTime >= 0 && validatedReactionTime <= fish.timingWindow;
    
    // Use transaction for atomic operations
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      // Get current rod for bonuses
      const rodId = user.fishingRod || 'basic';
      const rod = FISHING_RODS[rodId] || FISHING_RODS.basic;
      
      // Get daily data for streak tracking
      let daily = getOrResetDailyData(user);
      let achievements = user.fishingAchievements || {};
      let challenges = getOrResetChallenges(user);
      let challengeRewards = [];
      
      if (success) {
        // Use service function for catch quality calculation (includes rod bonus)
        const { quality: catchQuality, multiplier: bonusMultiplier, message: catchMessage } = 
          calculateCatchQuality(validatedReactionTime, fish, rod);
        
        // Calculate fish quantity using service function
        let fishQuantity = calculateFishQuantity(bonusMultiplier);
        
        // === STREAK SYSTEM ===
        const streakResult = updateStreakCounters(daily, true, achievements);
        daily = streakResult.daily;
        achievements = streakResult.achievements;
        const streakBonus = streakResult.streakBonus;
        
        // Apply streak bonus: extra fish chance
        if (streakBonus?.extraFishChance && Math.random() < streakBonus.extraFishChance) {
          fishQuantity += 1;
        }
        
        // Add fish to inventory (quantity based on catch quality + streak)
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
          achievements.totalPerfects = (achievements.totalPerfects || 0) + 1;
        }
        stats.fishCaught = stats.fishCaught || {};
        stats.fishCaught[fish.id] = (stats.fishCaught[fish.id] || 0) + fishQuantity;
        user.fishingStats = stats;
        
        // Update daily catches
        daily.catches = (daily.catches || 0) + fishQuantity;
        if (catchQuality === 'perfect') {
          daily.perfectCatches = (daily.perfectCatches || 0) + 1;
        }
        if (['rare', 'epic', 'legendary'].includes(fish.rarity)) {
          daily.rareCatches = (daily.rareCatches || 0) + 1;
        }
        
        // Update achievements for legendaries
        if (fish.rarity === 'legendary') {
          achievements.totalLegendaries = (achievements.totalLegendaries || 0) + 1;
        }
        
        // === CHALLENGE PROGRESS ===
        // Update catch challenge
        const catchResult = updateChallengeProgress(challenges, 'catch', { rarity: fish.rarity });
        challenges = catchResult.challenges;
        challengeRewards.push(...catchResult.newlyCompleted);
        
        // Update perfect challenge if applicable
        if (catchQuality === 'perfect') {
          const perfectResult = updateChallengeProgress(challenges, 'perfect', {});
          challenges = perfectResult.challenges;
          challengeRewards.push(...perfectResult.newlyCompleted);
        }
        
        // Update streak challenge
        if (daily.currentStreak > 0) {
          const streakChallengeResult = updateChallengeProgress(challenges, 'streak', { 
            streakCount: daily.currentStreak 
          });
          challenges = streakChallengeResult.challenges;
          challengeRewards.push(...streakChallengeResult.newlyCompleted);
        }
        
        // Apply challenge rewards
        if (challengeRewards.length > 0) {
          applyChallengeRewards(user, challengeRewards);
        }
        
        user.fishingDaily = daily;
        user.fishingAchievements = achievements;
        user.fishingChallenges = challenges;
        await user.save({ transaction });
        
        return { 
          user, catchQuality, bonusMultiplier, fishQuantity, catchMessage, inventoryItem,
          streakBonus, currentStreak: daily.currentStreak, challengeRewards
        };
      } else {
        // === MISS - Update streak counters ===
        const streakResult = updateStreakCounters(daily, false, achievements);
        daily = streakResult.daily;
        achievements = streakResult.achievements;
        
        user.fishingDaily = daily;
        user.fishingAchievements = achievements;
        await user.save({ transaction });
        
        // Determine failure reason for better feedback
        let failureMessage;
        if (serverReactionTime < 0) {
          failureMessage = `The ${fish.name} wasn't ready yet!`;
        } else {
          failureMessage = `The ${fish.name} escaped! You needed to react within ${fish.timingWindow}ms (took ${validatedReactionTime}ms).`;
        }
        
        return { 
          user, success: false, failureMessage, 
          missStreak: daily.missStreak 
        };
      }
    });
    
    if (success) {
      const { 
        user, catchQuality, bonusMultiplier, fishQuantity, catchMessage, inventoryItem,
        streakBonus, currentStreak, challengeRewards 
      } = result;
      
      // Build response message with streak info
      let finalMessage = catchMessage;
      if (streakBonus) {
        finalMessage += ` ${streakBonus.message}`;
      }
      
      const response = {
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
        newPoints: user.points,
        inventoryCount: inventoryItem.quantity,
        pityTriggered: session.pityTriggered || false,
        streak: currentStreak,
        streakBonus: streakBonus ? {
          milestone: streakBonus.milestone,
          message: streakBonus.message
        } : null,
        message: finalMessage
      };
      
      // Include challenge completions if any
      if (challengeRewards.length > 0) {
        response.challengesCompleted = challengeRewards;
      }
      
      return res.json(response);
    } else {
      const { user, failureMessage, missStreak } = result;
      
      // Calculate mercy bonus for next attempt
      const mercyBonus = calculateMercyBonus(missStreak);
      
      return res.json({
        success: false,
        fish: {
          id: fish.id,
          name: fish.name,
          emoji: fish.emoji,
          rarity: fish.rarity
        },
        reward: 0,
        reactionTime: validatedReactionTime,
        serverReactionTime,
        timingWindow: fish.timingWindow,
        missStreak,
        mercyBonus: mercyBonus > 0 ? mercyBonus : null,
        message: failureMessage + (mercyBonus > 0 ? ` (+${mercyBonus}ms mercy bonus next cast!)` : '')
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
    // Get user for pity info and current area/rod
    const user = await User.findByPk(req.user.id);
    
    const currentArea = user?.fishingAreas?.current || 'pond';
    const currentRod = user?.fishingRod || 'basic';
    const rod = FISHING_RODS[currentRod] || FISHING_RODS.basic;
    
    // Return fish info without weights (so players can see what's possible)
    const fishInfo = FISH_TYPES.map(f => ({
      id: f.id,
      name: f.name,
      emoji: f.emoji,
      rarity: f.rarity,
      minReward: f.minReward,
      maxReward: f.maxReward,
      // Include rod timing bonus in difficulty display
      timingWindow: f.timingWindow + (rod.timingBonus || 0),
      difficulty: (f.timingWindow + (rod.timingBonus || 0)) <= 500 ? 'Extreme' : 
                  (f.timingWindow + (rod.timingBonus || 0)) <= 700 ? 'Very Hard' :
                  (f.timingWindow + (rod.timingBonus || 0)) <= 1000 ? 'Hard' :
                  (f.timingWindow + (rod.timingBonus || 0)) <= 1500 ? 'Medium' : 'Easy'
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
    
    // Get daily data for limits display
    const daily = user ? getOrResetDailyData(user) : null;
    const rank = await getUserRank(req.user.id);
    // Use helper functions for cleaner code
    const premiumStatus = buildPremiumStatus(user, daily);
    const prestigeBonus = getUserPrestigeAutofishBonus(user);
    const autofishLimit = getAutofishLimit(rank, premiumStatus, prestigeBonus);
    
    res.json({
      castCost: CAST_COST,
      cooldown: CAST_COOLDOWN,
      autofishCooldown: AUTOFISH_COOLDOWN,
      fish: fishInfo,
      pity: pityProgress,
      stats: user?.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} },
      achievements: user?.fishingAchievements || {},
      // Current equipment
      currentArea: currentArea,
      currentRod: currentRod,
      rodBonus: rod,
      areaInfo: FISHING_AREAS[currentArea],
      // Daily limits summary
      daily: daily ? {
        autofishUsed: daily.autofishCasts,
        autofishLimit: autofishLimit,
        catches: daily.catches
      } : null,
      rank
    });
  } catch (err) {
    console.error('Fishing info error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Note: refreshAllRanks and getUserRank functions moved to services/rankService.js

// GET /api/fishing/rank - Get user's ranking and autofish status
router.get('/rank', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const rank = await getUserRank(req.user.id);
    const totalUsers = await getTotalUsers();
    const hasPremium = (user.premiumTickets || 0) > 0;
    
    // Get current daily usage FIRST (was causing undefined bug)
    const daily = getOrResetDailyData(user);
    
    // NEW: Everyone can autofish with daily limits
    // Rank now affects daily limit, not unlock status
    // Use new premium status format
    // Use helper functions for cleaner code
    const premiumStatusRank = buildPremiumStatus(user, daily);
    const hasPremiumBonus = (premiumStatusRank.usedToday > 0) || (premiumStatusRank.tickets >= 3);
    const prestigeBonusRank = getUserPrestigeAutofishBonus(user);
    const autofishLimit = getAutofishLimit(rank, premiumStatusRank, prestigeBonusRank);
    const baseLimit = FISHING_CONFIG.autofish.baseDailyLimit;
    const bonusFromRank = autofishLimit - baseLimit - (hasPremiumBonus ? Math.floor(baseLimit * 0.5) : 0) - prestigeBonusRank;
    
    // Determine rank tier for display
    let rankTier = 'none';
    let rankBonus = 0;
    if (rank <= 5) {
      rankTier = 'top5';
      rankBonus = FISHING_CONFIG.autofish.rankBonuses.top5;
    } else if (rank <= 10) {
      rankTier = 'top10';
      rankBonus = FISHING_CONFIG.autofish.rankBonuses.top10;
    } else if (rank <= 25) {
      rankTier = 'top25';
      rankBonus = FISHING_CONFIG.autofish.rankBonuses.top25;
    } else if (rank <= 50) {
      rankTier = 'top50';
      rankBonus = FISHING_CONFIG.autofish.rankBonuses.top50;
    } else if (rank <= 100) {
      rankTier = 'top100';
      rankBonus = FISHING_CONFIG.autofish.rankBonuses.top100;
    }
    
    res.json({
      rank,
      totalUsers,
      points: user.points,
      // NEW: Democratized autofish - everyone can use it
      canAutofish: true,
      autofishEnabled: user.autofishEnabled,
      // Daily limit info
      autofish: {
        dailyLimit: autofishLimit,
        baseLimit: baseLimit,
        rankBonus: rankBonus,
        premiumBonus: hasPremium ? Math.floor(baseLimit * 0.5) : 0,
        used: daily.autofishCasts,
        remaining: Math.max(0, autofishLimit - daily.autofishCasts)
      },
      rankTier,
      hasPremium,
      message: rankTier !== 'none'
        ? `🎖️ ${rankTier.toUpperCase()} - ${autofishLimit} daily autofish (+${rankBonus} bonus)`
        : `${autofishLimit} daily autofish available${hasPremium ? ' (+50% premium)' : ''}`
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

// POST /api/fishing/autofish - Perform an autofish catch (democratized - available to all with daily limits)
router.post('/autofish', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Multi-tab detection: check for manual fishing conflict
    const modeConflict = checkModeConflict(userId, 'autofish');
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
    setMode(userId, 'autofish');
    
    // Use transaction for atomic operations
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      // Server-side timestamp check (prevents multi-instance/restart exploits)
      const lastDbAutofish = user.lastAutofish ? new Date(user.lastAutofish).getTime() : 0;
      if (now - lastDbAutofish < AUTOFISH_COOLDOWN) {
        const remainingMs = AUTOFISH_COOLDOWN - (now - lastDbAutofish);
        throw new Error(`COOLDOWN:${remainingMs}`);
      }
      
      // Update the dedicated autofish timestamp
      user.lastAutofish = new Date(now);
      
      // === NEW: Democratized autofish with daily limits ===
      const daily = getOrResetDailyData(user);
      const currentRank = await getUserRank(userId);
      const hasPremium = (user.premiumTickets || 0) > 0;
      // Use helper functions for cleaner code
      const premiumStatusAuto = buildPremiumStatus(user, daily);
      const prestigeBonusAuto = getUserPrestigeAutofishBonus(user);
      const dailyLimit = getAutofishLimit(currentRank, premiumStatusAuto, prestigeBonusAuto);
      
      // Check if user has reached daily limit
      if (daily.autofishCasts >= dailyLimit) {
        throw new Error(`DAILY_LIMIT:${dailyLimit}`);
      }
      
      // Increment daily autofish counter
      daily.autofishCasts += 1;
      
      // Check cast cost
      if (CAST_COST > 0 && user.points < CAST_COST) {
        throw new Error('NOT_ENOUGH_POINTS');
      }
      
      // Deduct cost if any
      if (CAST_COST > 0) {
        user.points -= CAST_COST;
      }
      
      // Get fishing area and rod for bonuses
      const areas = user.fishingAreas || { current: 'pond' };
      const rodId = user.fishingRod || 'basic';
      
      // Get pity data (autofish also contributes to pity)
      const pityData = user.fishingPity || { legendary: 0, epic: 0 };
      
      // Select a random fish with pity, area, and rod bonuses
      const { fish, pityTriggered, resetPity } = selectRandomFishWithBonuses(
        pityData, 
        areas.current, 
        rodId
      );
      
      // Update pity counters
      user.fishingPity = updatePityCounters(pityData, resetPity, now);
      
      // Update fishing stats
      const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
      stats.totalCasts = (stats.totalCasts || 0) + 1;
      
      // Autofish success rate varies by fish rarity
      const successChance = FISHING_CONFIG.autofishSuccessRates[fish.rarity] || 0.40;
      const success = Math.random() < successChance;
      
      let inventoryItem = null;
      let challengeRewards = [];
      
      // Get challenges for potential updates
      let challenges = getOrResetChallenges(user);
      
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
        
        // Update daily stats
        daily.catches += 1;
        if (['rare', 'epic', 'legendary'].includes(fish.rarity)) {
          daily.rareCatches += 1;
        }
        
        // Update challenges
        const catchResult = updateChallengeProgress(challenges, 'catch', { rarity: fish.rarity });
        challenges = catchResult.challenges;
        challengeRewards = catchResult.newlyCompleted;
        
        // Apply challenge rewards
        if (challengeRewards.length > 0) {
          applyChallengeRewards(user, challengeRewards);
        }
        
        // Update achievements for legendaries
        if (fish.rarity === 'legendary') {
          const achievements = user.fishingAchievements || {};
          achievements.totalLegendaries = (achievements.totalLegendaries || 0) + 1;
          user.fishingAchievements = achievements;
        }
      }
      
      user.fishingStats = stats;
      user.fishingDaily = daily;
      user.fishingChallenges = challenges;
      await user.save({ transaction });
      
      return { 
        user, fish, success, inventoryItem, pityTriggered, 
        dailyLimit, dailyUsed: daily.autofishCasts, 
        challengeRewards, currentRank 
      };
    });
    
    // Release lock
    autofishInProgress.delete(userId);
    
    const { user, fish, success, inventoryItem, pityTriggered, dailyLimit, dailyUsed, challengeRewards, currentRank } = result;
    
    const response = {
      success,
      fish: {
        id: fish.id,
        name: fish.name,
        emoji: fish.emoji,
        rarity: fish.rarity
      },
      newPoints: user.points,
      pityTriggered,
      // Daily limit info
      daily: {
        used: dailyUsed,
        limit: dailyLimit,
        remaining: dailyLimit - dailyUsed
      },
      rank: currentRank
    };
    
    if (success) {
      response.inventoryCount = inventoryItem?.quantity || 1;
      response.message = pityTriggered ? `✨ Lucky! Autofished a ${fish.name}!` : `Autofished a ${fish.name}!`;
    } else {
      response.message = `The ${fish.name} got away during autofishing.`;
    }
    
    // Include challenge completions if any
    if (challengeRewards.length > 0) {
      response.challengesCompleted = challengeRewards;
    }
    
    return res.json(response);
    
  } catch (err) {
    // Release lock on error
    autofishInProgress.delete(userId);
    
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err.message.startsWith('COOLDOWN:')) {
      const remainingMs = parseInt(err.message.split(':')[1], 10);
      return res.status(429).json({
        error: 'Too fast',
        message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds`,
        retryAfter: remainingMs
      });
    }
    if (err.message.startsWith('DAILY_LIMIT:')) {
      const limit = parseInt(err.message.split(':')[1], 10);
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `You've used all ${limit} autofish casts for today. Resets at midnight!`,
        dailyLimit: limit
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

// =============================================
// DAILY CHALLENGES ROUTES
// =============================================

// GET /api/fishing/challenges - Get current daily challenges
router.get('/challenges', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const challenges = getOrResetChallenges(user);
    
    // Check if challenges were just reset
    const wasReset = challenges.date !== user.fishingChallenges?.date;
    
    // Save if reset occurred
    if (wasReset) {
      user.fishingChallenges = challenges;
      await user.save();
    }
    
    // Build detailed challenge info
    const challengeDetails = challenges.active.map(id => {
      const challenge = DAILY_CHALLENGES[id];
      if (!challenge) return null;
      
      return {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        difficulty: challenge.difficulty,
        target: challenge.target,
        progress: challenges.progress[id] || 0,
        completed: challenges.completed.includes(id),
        reward: challenge.reward
      };
    }).filter(Boolean);
    
    res.json({
      challenges: challengeDetails,
      completedToday: challenges.completed.length,
      resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    });
  } catch (err) {
    console.error('Challenges fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/challenges/:id/claim - Claim a completed challenge reward
router.post('/challenges/:id/claim', auth, async (req, res) => {
  try {
    const { id: challengeId } = req.params;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const challenges = getOrResetChallenges(user);
    const challenge = DAILY_CHALLENGES[challengeId];
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (!challenges.active.includes(challengeId)) {
      return res.status(400).json({ error: 'Challenge not active today' });
    }
    
    const progress = challenges.progress[challengeId] || 0;
    if (progress < challenge.target) {
      return res.status(400).json({ 
        error: 'Challenge not completed',
        progress,
        target: challenge.target
      });
    }
    
    if (challenges.completed.includes(challengeId)) {
      return res.status(400).json({ error: 'Challenge already claimed' });
    }
    
    // Apply rewards
    const rewards = [];
    if (challenge.reward.points) {
      user.points = (user.points || 0) + challenge.reward.points;
      rewards.push(`+${challenge.reward.points} points`);
    }
    if (challenge.reward.rollTickets) {
      user.rollTickets = (user.rollTickets || 0) + challenge.reward.rollTickets;
      rewards.push(`+${challenge.reward.rollTickets} roll tickets`);
    }
    if (challenge.reward.premiumTickets) {
      user.premiumTickets = (user.premiumTickets || 0) + challenge.reward.premiumTickets;
      rewards.push(`+${challenge.reward.premiumTickets} premium tickets`);
    }
    
    // Mark as completed
    challenges.completed.push(challengeId);
    user.fishingChallenges = challenges;
    
    // Update achievements
    const achievements = user.fishingAchievements || {};
    achievements.challengesCompleted = (achievements.challengesCompleted || 0) + 1;
    user.fishingAchievements = achievements;
    
    await user.save();
    
    res.json({
      success: true,
      challenge: challengeId,
      rewards: challenge.reward,
      message: `Challenge completed! ${rewards.join(', ')}`
    });
  } catch (err) {
    console.error('Challenge claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// FISHING AREAS ROUTES
// =============================================

// GET /api/fishing/areas - Get available fishing areas
router.get('/areas', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userAreas = user.fishingAreas || { unlocked: ['pond'], current: 'pond' };
    const rank = await getUserRank(req.user.id);
    
    const areasInfo = Object.values(FISHING_AREAS).map(area => ({
      ...area,
      unlocked: userAreas.unlocked.includes(area.id),
      current: userAreas.current === area.id,
      canUnlock: !userAreas.unlocked.includes(area.id) && 
                 user.points >= area.unlockCost &&
                 (!area.unlockRank || rank <= area.unlockRank)
    }));
    
    res.json({
      areas: areasInfo,
      current: userAreas.current,
      userRank: rank
    });
  } catch (err) {
    console.error('Areas fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/areas/:id/unlock - Unlock a fishing area
router.post('/areas/:id/unlock', auth, async (req, res) => {
  try {
    const { id: areaId } = req.params;
    const area = FISHING_AREAS[areaId];
    
    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userAreas = user.fishingAreas || { unlocked: ['pond'], current: 'pond' };
    
    if (userAreas.unlocked.includes(areaId)) {
      return res.status(400).json({ error: 'Area already unlocked' });
    }
    
    // Check rank requirement
    if (area.unlockRank) {
      const rank = await getUserRank(req.user.id);
      if (rank > area.unlockRank) {
        return res.status(403).json({ 
          error: 'Rank too low',
          message: `Requires top ${area.unlockRank} rank`,
          currentRank: rank
        });
      }
    }
    
    // Check cost
    if (user.points < area.unlockCost) {
      return res.status(400).json({ 
        error: 'Not enough points',
        required: area.unlockCost,
        current: user.points
      });
    }
    
    // Deduct cost and unlock
    user.points -= area.unlockCost;
    userAreas.unlocked.push(areaId);
    userAreas.current = areaId; // Auto-switch to new area
    user.fishingAreas = userAreas;
    
    await user.save();
    
    res.json({
      success: true,
      area: area.name,
      newPoints: user.points,
      message: `Unlocked ${area.name}! 🎉`
    });
  } catch (err) {
    console.error('Area unlock error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/areas/:id/select - Select a fishing area
router.post('/areas/:id/select', auth, async (req, res) => {
  try {
    const { id: areaId } = req.params;
    
    if (!FISHING_AREAS[areaId]) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userAreas = user.fishingAreas || { unlocked: ['pond'], current: 'pond' };
    
    if (!userAreas.unlocked.includes(areaId)) {
      return res.status(403).json({ error: 'Area not unlocked' });
    }
    
    userAreas.current = areaId;
    user.fishingAreas = userAreas;
    await user.save();
    
    res.json({
      success: true,
      current: areaId,
      area: FISHING_AREAS[areaId]
    });
  } catch (err) {
    console.error('Area select error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// FISHING RODS ROUTES
// =============================================

// GET /api/fishing/rods - Get available fishing rods
router.get('/rods', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentRod = user.fishingRod || 'basic';
    const ownedRods = user.fishingOwnedRods || ['basic'];
    const prestige = user.fishingAchievements?.prestige || 0;
    
    const rodsInfo = Object.values(FISHING_RODS).map(rod => {
      const owned = ownedRods.includes(rod.id);
      const canBuy = !owned && 
                     user.points >= rod.cost &&
                     (!rod.requiresPrestige || prestige >= rod.requiresPrestige);
      
      return {
        ...rod,
        owned,
        equipped: currentRod === rod.id,
        canBuy,
        locked: rod.requiresPrestige && prestige < rod.requiresPrestige
      };
    });
    
    res.json({
      rods: rodsInfo,
      current: currentRod,
      ownedRods,
      prestige
    });
  } catch (err) {
    console.error('Rods fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/rods/:id/buy - Buy a fishing rod
router.post('/rods/:id/buy', auth, async (req, res) => {
  try {
    const { id: rodId } = req.params;
    const rod = FISHING_RODS[rodId];
    
    if (!rod) {
      return res.status(404).json({ error: 'Rod not found' });
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get owned rods array
    const ownedRods = user.fishingOwnedRods || ['basic'];
    
    // Check if already owned
    if (ownedRods.includes(rodId)) {
      return res.status(400).json({
        error: 'Already owned',
        message: 'You already own this rod'
      });
    }
    
    // Check prestige requirement
    const prestige = user.fishingAchievements?.prestige || 0;
    if (rod.requiresPrestige && prestige < rod.requiresPrestige) {
      return res.status(403).json({
        error: 'Prestige required',
        message: `Requires prestige level ${rod.requiresPrestige}`,
        currentPrestige: prestige
      });
    }
    
    // Check cost
    if (user.points < rod.cost) {
      return res.status(400).json({
        error: 'Not enough points',
        required: rod.cost,
        current: user.points
      });
    }
    
    // Deduct cost, add to owned rods, and equip
    user.points -= rod.cost;
    ownedRods.push(rodId);
    user.fishingOwnedRods = ownedRods;
    user.fishingRod = rodId;
    await user.save();
    
    res.json({
      success: true,
      rod: rod.name,
      newPoints: user.points,
      ownedRods,
      message: `Purchased ${rod.name}! ${rod.emoji}`
    });
  } catch (err) {
    console.error('Rod buy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fishing/rods/:id/equip - Equip an owned rod
router.post('/rods/:id/equip', auth, async (req, res) => {
  try {
    const { id: rodId } = req.params;
    
    if (!FISHING_RODS[rodId]) {
      return res.status(404).json({ error: 'Rod not found' });
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user owns this rod
    const ownedRods = user.fishingOwnedRods || ['basic'];
    if (!ownedRods.includes(rodId)) {
      return res.status(403).json({ 
        error: 'Rod not owned',
        message: 'You need to purchase this rod first'
      });
    }
    
    user.fishingRod = rodId;
    await user.save();
    
    res.json({
      success: true,
      current: rodId,
      rod: FISHING_RODS[rodId]
    });
  } catch (err) {
    console.error('Rod equip error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// DAILY STATS & LIMITS
// =============================================

// GET /api/fishing/daily - Get daily stats and limits
router.get('/daily', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const daily = getOrResetDailyData(user);
    const rank = await getUserRank(req.user.id);
    const hasPremium = (user.premiumTickets || 0) > 0;
    // Use helper functions for cleaner code
    const premiumStatusDaily = buildPremiumStatus(user, daily);
    const prestigeBonusDaily = getUserPrestigeAutofishBonus(user);
    const autofishLimit = getAutofishLimit(rank, premiumStatusDaily, prestigeBonusDaily);
    
    // Save if reset occurred
    if (daily.date !== user.fishingDaily?.date) {
      user.fishingDaily = daily;
      await user.save();
    }
    
    res.json({
      date: daily.date,
      stats: {
        manualCasts: daily.manualCasts,
        autofishCasts: daily.autofishCasts,
        catches: daily.catches,
        perfectCatches: daily.perfectCatches,
        rareCatches: daily.rareCatches,
        tradesCompleted: daily.tradesCompleted
      },
      limits: {
        manual: { used: daily.manualCasts, limit: FISHING_CONFIG.dailyLimits.manualCasts },
        autofish: { used: daily.autofishCasts, limit: autofishLimit },
        pointsFromTrades: { used: daily.pointsFromTrades, limit: FISHING_CONFIG.dailyLimits.pointsFromTrades },
        rollTickets: { used: daily.ticketsEarned.roll, limit: FISHING_CONFIG.dailyLimits.rollTickets },
        premiumTickets: { used: daily.ticketsEarned.premium, limit: FISHING_CONFIG.dailyLimits.premiumTickets }
      },
      rank,
      hasPremium,
      resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    });
  } catch (err) {
    console.error('Daily stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// TRADING POST ROUTES
// =============================================

// Import trade service
const { tradeService } = require('../services');

// POST /api/fishing/trade - Execute a trade (with database transaction for atomicity)
// Now uses tradeService for cleaner separation of concerns
router.post('/trade', auth, async (req, res) => {
  const userId = req.user.id;
  const now = Date.now();
  
  // Prevent race condition - only one trade request at a time per user
  if (tradeInProgress.has(userId)) {
    return res.status(429).json({ 
      error: 'Trade in progress',
      message: 'Another trade request is being processed'
    });
  }
  tradeInProgress.set(userId, now);
  
  try {
    const { tradeId, quantity = 1 } = req.body;
    
    // Execute trade via service (handles all validation, transaction, and rewards)
    const result = await tradeService.executeTrade(userId, tradeId, quantity);
    
    // Release lock before responding
    tradeInProgress.delete(userId);
    
    res.json(result);
    
  } catch (err) {
    // Always release lock on error
    tradeInProgress.delete(userId);
    
    // Handle known error types with appropriate status codes
    if (err.status) {
      return res.status(err.status).json({
        error: err.code || 'TRADE_ERROR',
        message: err.message,
        ...err.details
      });
    }
    
    console.error('Trade error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// NEW MODULAR ROUTES (Prestige & Collection)
// =============================================

// Mount prestige routes: /api/fishing/prestige/*
router.use('/prestige', prestigeRoutes);

// Mount collection routes: /api/fishing/collection/*
router.use('/collection', collectionRoutes);

module.exports = router;
