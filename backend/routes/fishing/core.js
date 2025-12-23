/**
 * Fishing Core Routes
 * 
 * Handles: /cast, /catch, /info, /daily
 * Core fishing mechanics and game info endpoints.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../../middleware/auth');
const { sequelize, User, FishInventory } = require('../../models');

// Config imports
const { 
  FISHING_CONFIG, 
  FISH_TYPES, 
  FISHING_AREAS,
  FISHING_RODS,
  selectRandomFishWithBonuses,
  getAutofishLimit
} = require('../../config/fishing');

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
  calculateMercyBonus
} = require('../../services/fishingService');

const { getUserRank } = require('../../services/rankService');

// Error classes
const {
  UserNotFoundError,
  InsufficientPointsError,
  DailyLimitError,
  CooldownError,
  ModeConflictError,
  SessionError
} = require('../../errors/FishingErrors');

// Extract config values
const DAILY_LIMITS = FISHING_CONFIG.dailyLimits;
const CAST_COOLDOWN = FISHING_CONFIG.castCooldown;
const CAST_COST = FISHING_CONFIG.castCost;
const MIN_REACTION_TIME = FISHING_CONFIG.minReactionTime || 80;
const LATENCY_BUFFER = FISHING_CONFIG.latencyBuffer || 200; // Compensate for network round-trip
const MAX_ACTIVE_SESSIONS_PER_USER = FISHING_CONFIG.sessionLimits?.maxActiveSessionsPerUser || 3;

// In-memory state (shared via module exports)
const castCooldowns = new Map();
const activeSessions = new Map();
const userFishingMode = new Map();

/**
 * Check for fishing mode conflict
 */
function checkModeConflict(userId, mode) {
  const current = userFishingMode.get(userId);
  if (!current) return null;
  
  const isRecent = Date.now() - current.lastActivity < 15000;
  if (isRecent && current.mode !== mode) {
    return `Cannot ${mode} while ${current.mode} is active`;
  }
  return null;
}

/**
 * Set user's fishing mode
 */
function setMode(userId, mode) {
  userFishingMode.set(userId, { mode, lastActivity: Date.now() });
}

// POST /cast - Start fishing (cast the line)
router.post('/cast', auth, async (req, res, next) => {
  const userId = req.user.id;
  
  try {
    // Multi-tab detection
    const modeConflict = checkModeConflict(userId, 'manual');
    if (modeConflict) {
      throw new ModeConflictError('autofish', 'manual');
    }
    
    // Session hoarding prevention
    const userSessionCount = [...activeSessions.values()]
      .filter(s => s.userId === userId).length;
    if (userSessionCount >= MAX_ACTIVE_SESSIONS_PER_USER) {
      throw new SessionError('too_many');
    }
    
    // Rate limiting check
    const lastCast = castCooldowns.get(userId);
    const now = Date.now();
    if (lastCast && (now - lastCast) < CAST_COOLDOWN) {
      throw new CooldownError(CAST_COOLDOWN - (now - lastCast), 'cast');
    }
    castCooldowns.set(userId, now);
    setMode(userId, 'manual');
    
    // Use transaction for atomic operations
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) throw new UserNotFoundError(userId);
      
      // Daily limit check
      let daily = getOrResetDailyData(user);
      if (daily.manualCasts >= DAILY_LIMITS.manualCasts) {
        throw new DailyLimitError('manual casts', daily.manualCasts, DAILY_LIMITS.manualCasts);
      }
      
      // Check points
      if (CAST_COST > 0 && user.points < CAST_COST) {
        throw new InsufficientPointsError(CAST_COST, user.points);
      }
      
      // Deduct cost
      if (CAST_COST > 0) {
        user.points -= CAST_COST;
      }
      
      // Mercy timer bonus
      const mercyBonus = calculateMercyBonus(daily.missStreak || 0);
      
      // Get area and rod
      const areas = user.fishingAreas || { current: 'pond' };
      const rodId = user.fishingRod || 'basic';
      const rod = FISHING_RODS[rodId] || FISHING_RODS.basic;
      const pityData = user.fishingPity || { legendary: 0, epic: 0 };
      
      // Select fish with bonuses
      const { fish: baseFish, pityTriggered, resetPity } = selectRandomFishWithBonuses(
        pityData, areas.current, rodId
      );
      
      // Apply timing bonuses
      const fish = {
        ...baseFish,
        timingWindow: baseFish.timingWindow + (rod.timingBonus || 0) + mercyBonus
      };
      
      // Update pity counters
      user.fishingPity = updatePityCounters(pityData, resetPity, now);
      
      // Update stats
      const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
      stats.totalCasts = (stats.totalCasts || 0) + 1;
      user.fishingStats = stats;
      
      // Increment daily counter
      daily.manualCasts = (daily.manualCasts || 0) + 1;
      user.fishingDaily = daily;
      
      await user.save({ transaction });
      
      return { user, fish, pityTriggered, mercyBonus, daily };
    });
    
    const { user, fish, pityTriggered, mercyBonus, daily } = result;
    
    // Random wait time
    const waitTime = getRandomWaitTime();
    
    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const createdAt = Date.now();
    const session = {
      sessionId,
      fish,
      waitTime,
      createdAt,
      pityTriggered,
      fishAppearsAt: createdAt + waitTime,
      userId
    };
    
    activeSessions.set(sessionId, session);
    
    const missTimeout = getMissTimeout(fish.rarity);
    
    let message = pityTriggered ? '✨ Lucky cast! A rare fish approaches...' : 'Line cast! Wait for a bite...';
    if (mercyBonus > 0) {
      message += ` (+${mercyBonus}ms mercy bonus!)`;
    }
    
    res.json({
      sessionId,
      waitTime,
      missTimeout,
      timingWindow: fish.timingWindow,
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
    next(err);
  }
});

// POST /catch - Attempt to catch the fish
router.post('/catch', auth, async (req, res, next) => {
  const userId = req.user.id;
  
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      throw new SessionError('invalid');
    }
    
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      throw new SessionError('expired');
    }
    
    if (session.userId !== userId) {
      throw new SessionError('not_owner');
    }
    
    // Remove session (one attempt only)
    activeSessions.delete(sessionId);
    
    const fish = session.fish;
    const now = Date.now();
    
    // Server-side timing validation with latency compensation
    // The server reaction time includes network round-trip delay, so we subtract
    // the latency buffer to give players fair credit for their actual reaction speed
    const serverReactionTime = now - session.fishAppearsAt;
    const latencyCompensatedTime = Math.max(0, serverReactionTime - LATENCY_BUFFER);
    const validatedReactionTime = Math.max(MIN_REACTION_TIME, latencyCompensatedTime);
    const success = serverReactionTime >= 0 && validatedReactionTime <= fish.timingWindow;
    
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) throw new UserNotFoundError(userId);
      
      const rodId = user.fishingRod || 'basic';
      const rod = FISHING_RODS[rodId] || FISHING_RODS.basic;
      let daily = getOrResetDailyData(user);
      let achievements = user.fishingAchievements || {};
      const { challenges: challengesData, autoClaimedRewards } = getOrResetChallenges(user);
      let challenges = challengesData;
      let challengeRewards = [];
      
      // Auto-claimed rewards from reset (if any) - apply them
      if (autoClaimedRewards.length > 0) {
        applyChallengeRewards(user, autoClaimedRewards);
        challengeRewards.push(...autoClaimedRewards);
      }
      
      if (success) {
        const { quality: catchQuality, multiplier: bonusMultiplier, message: catchMessage } = 
          calculateCatchQuality(validatedReactionTime, fish, rod);
        
        let fishQuantity = calculateFishQuantity(bonusMultiplier);
        
        // Streak system
        const streakResult = updateStreakCounters(daily, true, achievements);
        daily = streakResult.daily;
        achievements = streakResult.achievements;
        const streakBonus = streakResult.streakBonus;
        
        // Apply streak bonus
        if (streakBonus?.extraFishChance && Math.random() < streakBonus.extraFishChance) {
          fishQuantity += 1;
        }
        
        // Add to inventory
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
        
        // Update stats
        const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
        stats.totalCatches = (stats.totalCatches || 0) + fishQuantity;
        if (catchQuality === 'perfect') {
          stats.perfectCatches = (stats.perfectCatches || 0) + 1;
          achievements.totalPerfects = (achievements.totalPerfects || 0) + 1;
        }
        stats.fishCaught = stats.fishCaught || {};
        stats.fishCaught[fish.id] = (stats.fishCaught[fish.id] || 0) + fishQuantity;
        user.fishingStats = stats;
        
        // Update daily
        daily.catches = (daily.catches || 0) + fishQuantity;
        if (catchQuality === 'perfect') {
          daily.perfectCatches = (daily.perfectCatches || 0) + 1;
        }
        if (['rare', 'epic', 'legendary'].includes(fish.rarity)) {
          daily.rareCatches = (daily.rareCatches || 0) + 1;
        }
        
        if (fish.rarity === 'legendary') {
          achievements.totalLegendaries = (achievements.totalLegendaries || 0) + 1;
        }
        
        // Challenge progress
        const catchResult = updateChallengeProgress(challenges, 'catch', { rarity: fish.rarity });
        challenges = catchResult.challenges;
        challengeRewards.push(...catchResult.newlyCompleted);
        
        if (catchQuality === 'perfect') {
          const perfectResult = updateChallengeProgress(challenges, 'perfect', {});
          challenges = perfectResult.challenges;
          challengeRewards.push(...perfectResult.newlyCompleted);
        }
        
        if (daily.currentStreak > 0) {
          const streakChallengeResult = updateChallengeProgress(challenges, 'streak', { 
            streakCount: daily.currentStreak 
          });
          challenges = streakChallengeResult.challenges;
          challengeRewards.push(...streakChallengeResult.newlyCompleted);
        }
        
        if (challengeRewards.length > 0) {
          applyChallengeRewards(user, challengeRewards);
        }
        
        user.fishingDaily = daily;
        user.fishingAchievements = achievements;
        user.fishingChallenges = challenges;
        await user.save({ transaction });
        
        return { 
          user, catchQuality, bonusMultiplier, fishQuantity, catchMessage, inventoryItem,
          streakBonus, currentStreak: daily.currentStreak, challengeRewards, success: true
        };
      } else {
        // Miss
        const streakResult = updateStreakCounters(daily, false, achievements);
        daily = streakResult.daily;
        achievements = streakResult.achievements;
        
        user.fishingDaily = daily;
        user.fishingAchievements = achievements;
        await user.save({ transaction });
        
        let failureMessage;
        if (serverReactionTime < 0) {
          failureMessage = `The ${fish.name} wasn't ready yet!`;
        } else {
          failureMessage = `The ${fish.name} escaped! You needed to react within ${fish.timingWindow}ms (took ${validatedReactionTime}ms).`;
        }
        
        return { 
          user, success: false, failureMessage, missStreak: daily.missStreak 
        };
      }
    });
    
    if (result.success) {
      const { 
        user, catchQuality, bonusMultiplier, fishQuantity, catchMessage, inventoryItem,
        streakBonus, currentStreak, challengeRewards 
      } = result;
      
      let finalMessage = catchMessage;
      if (streakBonus) {
        finalMessage += ` ${streakBonus.message}`;
      }
      
      // Calculate current pity progress for client state update
      const pityData = user.fishingPity || { legendary: 0, epic: 0 };
      const pityConfig = FISHING_CONFIG.pity;
      const pityInfo = {
        legendary: {
          current: pityData.legendary || 0,
          hardPity: pityConfig.legendary.hardPity,
          progress: Math.min(100, ((pityData.legendary || 0) / pityConfig.legendary.hardPity) * 100),
          inSoftPity: (pityData.legendary || 0) >= pityConfig.legendary.softPity
        },
        epic: {
          current: pityData.epic || 0,
          hardPity: pityConfig.epic.hardPity,
          progress: Math.min(100, ((pityData.epic || 0) / pityConfig.epic.hardPity) * 100),
          inSoftPity: (pityData.epic || 0) >= pityConfig.epic.softPity
        }
      };
      
      const response = {
        success: true,
        fish: { id: fish.id, name: fish.name, emoji: fish.emoji, rarity: fish.rarity },
        catchQuality,
        bonusMultiplier,
        fishQuantity,
        reactionTime: validatedReactionTime,
        timingWindow: fish.timingWindow,
        newPoints: user.points,
        inventoryCount: inventoryItem.quantity,
        pityTriggered: session.pityTriggered || false,
        pityInfo, // Include current pity state for client update
        streak: currentStreak,
        streakBonus: streakBonus ? { milestone: streakBonus.milestone, message: streakBonus.message } : null,
        message: finalMessage
      };
      
      if (challengeRewards.length > 0) {
        response.challengesCompleted = challengeRewards;
      }
      
      return res.json(response);
    } else {
      const { user: _user, failureMessage, missStreak } = result;
      const mercyBonus = calculateMercyBonus(missStreak);
      
      return res.json({
        success: false,
        fish: { id: fish.id, name: fish.name, emoji: fish.emoji, rarity: fish.rarity },
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
    next(err);
  }
});

// GET /info - Get fishing game info
router.get('/info', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    const currentArea = user?.fishingAreas?.current || 'pond';
    const currentRod = user?.fishingRod || 'basic';
    const rod = FISHING_RODS[currentRod] || FISHING_RODS.basic;
    
    const fishInfo = FISH_TYPES.map(f => ({
      id: f.id,
      name: f.name,
      emoji: f.emoji,
      rarity: f.rarity,
      minReward: f.minReward,
      maxReward: f.maxReward,
      timingWindow: f.timingWindow + (rod.timingBonus || 0),
      difficulty: (f.timingWindow + (rod.timingBonus || 0)) <= 500 ? 'Extreme' : 
                  (f.timingWindow + (rod.timingBonus || 0)) <= 700 ? 'Very Hard' :
                  (f.timingWindow + (rod.timingBonus || 0)) <= 1000 ? 'Hard' :
                  (f.timingWindow + (rod.timingBonus || 0)) <= 1500 ? 'Medium' : 'Easy'
    }));
    
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
    
    const daily = user ? getOrResetDailyData(user) : null;
    const rank = await getUserRank(req.user.id);
    // Use new premium status format
    const premiumStatus = {
      tickets: user?.premiumTickets || 0,
      usedToday: daily?.ticketsUsed?.premium || 0
    };
    const prestigeBonus = user?.fishingAchievements?.prestige 
      ? require('../../config/fishing/prestige').getPrestigeBonuses(user.fishingAchievements.prestige).autofishLimit 
      : 0;
    const autofishLimit = getAutofishLimit(rank, premiumStatus, prestigeBonus);
    
    res.json({
      castCost: CAST_COST,
      cooldown: CAST_COOLDOWN,
      autofishCooldown: FISHING_CONFIG.autofishCooldown,
      fish: fishInfo,
      pity: pityProgress,
      stats: user?.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} },
      achievements: user?.fishingAchievements || {},
      currentArea,
      currentRod,
      rodBonus: rod,
      areaInfo: FISHING_AREAS[currentArea],
      daily: daily ? {
        autofishUsed: daily.autofishCasts,
        autofishLimit,
        catches: daily.catches
      } : null,
      rank
    });
  } catch (err) {
    next(err);
  }
});

// GET /daily - Get daily stats and limits
router.get('/daily', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const daily = getOrResetDailyData(user);
    const rank = await getUserRank(req.user.id);
    const premiumStatusDaily = {
      tickets: user.premiumTickets || 0,
      usedToday: daily?.ticketsUsed?.premium || 0
    };
    const hasPremiumTickets = (user.premiumTickets || 0) > 0;
    const prestigeBonusDaily = user.fishingAchievements?.prestige 
      ? require('../../config/fishing/prestige').getPrestigeBonuses(user.fishingAchievements.prestige).autofishLimit 
      : 0;
    const autofishLimit = getAutofishLimit(rank, premiumStatusDaily, prestigeBonusDaily);
    
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
      hasPremium: hasPremiumTickets,
      resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// Export shared state for other modules
module.exports = router;
module.exports.activeSessions = activeSessions;
module.exports.userFishingMode = userFishingMode;
module.exports.castCooldowns = castCooldowns;
module.exports.checkModeConflict = checkModeConflict;
module.exports.setMode = setMode;

