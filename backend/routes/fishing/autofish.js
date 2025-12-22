/**
 * Fishing Autofish Routes
 * 
 * Handles: /autofish, /toggle-autofish, /rank, /leaderboard
 * Automated fishing and ranking system.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const adminAuth = require('../../middleware/adminAuth');
const { sequelize, User, FishInventory } = require('../../models');
const { isValidId } = require('../../utils/validation');

// Config imports
const { 
  FISHING_CONFIG,
  selectRandomFishWithBonuses,
  getAutofishLimit
} = require('../../config/fishing');

// Service imports
const {
  updatePityCounters,
  getOrResetDailyData,
  getOrResetChallenges,
  updateChallengeProgress,
  applyChallengeRewards
} = require('../../services/fishingService');

const { getUserRank, getTotalUsers } = require('../../services/rankService');

// Error classes
const {
  UserNotFoundError,
  InsufficientPointsError,
  DailyLimitError,
  CooldownError,
  ModeConflictError
} = require('../../errors/FishingErrors');

// Import shared state from core module
const coreModule = require('./core');
const { checkModeConflict, setMode } = coreModule;

// Extract config values
const AUTOFISH_COOLDOWN = FISHING_CONFIG.autofishCooldown;
const AUTOFISH_UNLOCK_RANK = FISHING_CONFIG.autofishUnlockRank;
const CAST_COST = FISHING_CONFIG.castCost;

// Rate limiting
const autofishCooldowns = new Map();
const autofishInProgress = new Set();

// POST /autofish - Perform an autofish catch
router.post('/', auth, async (req, res, next) => {
  const userId = req.user.id;
  
  try {
    // Mode conflict check
    const conflict = checkModeConflict(userId, 'autofish');
    if (conflict) {
      throw new ModeConflictError('manual', 'autofish');
    }
    
    // Race condition prevention
    if (autofishInProgress.has(userId)) {
      throw new CooldownError(500, 'autofish');
    }
    
    // Rate limiting
    const lastAutofish = autofishCooldowns.get(userId);
    const now = Date.now();
    if (lastAutofish && (now - lastAutofish) < AUTOFISH_COOLDOWN) {
      throw new CooldownError(AUTOFISH_COOLDOWN - (now - lastAutofish), 'autofish');
    }
    
    // Lock
    autofishInProgress.add(userId);
    autofishCooldowns.set(userId, now);
    setMode(userId, 'autofish');
    
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!user) throw new UserNotFoundError(userId);
      
      // Server-side cooldown check
      const lastDbAutofish = user.lastAutofish ? new Date(user.lastAutofish).getTime() : 0;
      if (now - lastDbAutofish < AUTOFISH_COOLDOWN) {
        throw new CooldownError(AUTOFISH_COOLDOWN - (now - lastDbAutofish), 'autofish');
      }
      
      user.lastAutofish = new Date(now);
      
      // Daily limit check
      const daily = getOrResetDailyData(user);
      const currentRank = await getUserRank(userId);
      const premiumStatusAuto = {
        tickets: user.premiumTickets || 0,
        usedToday: daily?.ticketsUsed?.premium || 0
      };
      const prestigeBonusAuto = user.fishingAchievements?.prestige 
        ? require('../../config/fishing/prestige').getPrestigeBonuses(user.fishingAchievements.prestige).autofishLimit 
        : 0;
      const dailyLimit = getAutofishLimit(currentRank, premiumStatusAuto, prestigeBonusAuto);
      
      if (daily.autofishCasts >= dailyLimit) {
        throw new DailyLimitError('autofish', daily.autofishCasts, dailyLimit);
      }
      
      daily.autofishCasts += 1;
      
      // Point cost check
      if (CAST_COST > 0 && user.points < CAST_COST) {
        throw new InsufficientPointsError(CAST_COST, user.points);
      }
      
      if (CAST_COST > 0) {
        user.points -= CAST_COST;
      }
      
      // Get fishing setup
      const areas = user.fishingAreas || { current: 'pond' };
      const rodId = user.fishingRod || 'basic';
      const pityData = user.fishingPity || { legendary: 0, epic: 0 };
      
      // Select fish
      const { fish, pityTriggered, resetPity } = selectRandomFishWithBonuses(
        pityData, areas.current, rodId
      );
      
      // Update pity
      user.fishingPity = updatePityCounters(pityData, resetPity, now);
      
      // Update stats
      const stats = user.fishingStats || { totalCasts: 0, totalCatches: 0, perfectCatches: 0, fishCaught: {} };
      stats.totalCasts = (stats.totalCasts || 0) + 1;
      
      // Success roll
      const successChance = FISHING_CONFIG.autofishSuccessRates[fish.rarity] || 0.40;
      const success = Math.random() < successChance;
      
      let inventoryItem = null;
      let challengeRewards = [];
      let challenges = getOrResetChallenges(user);
      
      if (success) {
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
        
        daily.catches += 1;
        if (['rare', 'epic', 'legendary'].includes(fish.rarity)) {
          daily.rareCatches += 1;
        }
        
        // Challenge progress
        const catchResult = updateChallengeProgress(challenges, 'catch', { rarity: fish.rarity });
        challenges = catchResult.challenges;
        challengeRewards = catchResult.newlyCompleted;
        
        // Also track autofish-specific challenges (e.g., Idle Fisher)
        const autofishResult = updateChallengeProgress(challenges, 'autofish_catch', { rarity: fish.rarity });
        challenges = autofishResult.challenges;
        challengeRewards = [...challengeRewards, ...autofishResult.newlyCompleted];
        
        if (challengeRewards.length > 0) {
          applyChallengeRewards(user, challengeRewards);
        }
        
        // Legendary achievement
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
        dailyLimit, dailyUsed: daily.autofishCasts, challengeRewards, currentRank 
      };
    });
    
    autofishInProgress.delete(userId);
    
    const { user, fish, success, inventoryItem, pityTriggered, dailyLimit, dailyUsed, challengeRewards, currentRank } = result;
    
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
      success,
      fish: { id: fish.id, name: fish.name, emoji: fish.emoji, rarity: fish.rarity },
      newPoints: user.points,
      pityTriggered,
      pityInfo, // Include current pity state for client update
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
    
    if (challengeRewards.length > 0) {
      response.challengesCompleted = challengeRewards;
    }
    
    return res.json(response);
    
  } catch (err) {
    autofishInProgress.delete(userId);
    next(err);
  }
});

// GET /rank - Get user's ranking and autofish status
router.get('/rank', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const daily = getOrResetDailyData(user);
    const rank = await getUserRank(req.user.id);
    const totalUsers = await getTotalUsers();
    const hasPremium = (user.premiumTickets || 0) > 0;
    const premiumStatusRank = {
      tickets: user.premiumTickets || 0,
      usedToday: daily?.ticketsUsed?.premium || 0
    };
    const prestigeBonusRank = user.fishingAchievements?.prestige 
      ? require('../../config/fishing/prestige').getPrestigeBonuses(user.fishingAchievements.prestige).autofishLimit 
      : 0;
    const autofishLimit = getAutofishLimit(rank, premiumStatusRank, prestigeBonusRank);
    const baseLimit = FISHING_CONFIG.autofish.baseDailyLimit;
    
    // Rank tier
    let rankTier = 'none';
    let rankBonus = 0;
    const bonuses = FISHING_CONFIG.autofish.rankBonuses;
    if (rank <= 5) { rankTier = 'top5'; rankBonus = bonuses.top5; }
    else if (rank <= 10) { rankTier = 'top10'; rankBonus = bonuses.top10; }
    else if (rank <= 25) { rankTier = 'top25'; rankBonus = bonuses.top25; }
    else if (rank <= 50) { rankTier = 'top50'; rankBonus = bonuses.top50; }
    else if (rank <= 100) { rankTier = 'top100'; rankBonus = bonuses.top100; }
    
    res.json({
      rank,
      totalUsers,
      points: user.points,
      canAutofish: true,
      autofishEnabled: user.autofishEnabled,
      autofish: {
        dailyLimit: autofishLimit,
        baseLimit,
        rankBonus,
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
    next(err);
  }
});

// GET /leaderboard - Get top players
router.get('/leaderboard', auth, async (req, res, next) => {
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
    next(err);
  }
});

// POST /toggle - Toggle autofishing
router.post('/toggle', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const { enabled } = req.body;
    user.autofishEnabled = enabled !== undefined ? enabled : !user.autofishEnabled;
    await user.save();
    
    res.json({
      autofishEnabled: user.autofishEnabled,
      message: user.autofishEnabled ? 'Autofishing enabled' : 'Autofishing disabled'
    });
  } catch (err) {
    next(err);
  }
});

// ADMIN: POST /admin/toggle - Admin toggle user's autofishing
router.post('/admin/toggle', auth, adminAuth, async (req, res, next) => {
  try {
    const { userId, enabled } = req.body;
    
    if (!userId || !isValidId(userId)) {
      return res.status(400).json({ error: 'Valid User ID required' });
    }
    
    const user = await User.findByPk(parseInt(userId, 10));
    if (!user) throw new UserNotFoundError(userId);
    
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
    next(err);
  }
});

// ADMIN: GET /admin/users - Get all users with autofish status
router.get('/admin/users', auth, adminAuth, async (req, res, next) => {
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
    next(err);
  }
});

module.exports = router;

