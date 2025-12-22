/**
 * Fishing Trading Routes
 * 
 * Handles: /inventory, /trading-post, /trade
 * Fish inventory and trading system.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { sequelize, User, FishInventory } = require('../../models');

// Config imports
const { 
  FISHING_CONFIG,
  TRADE_OPTIONS,
  calculateFishTotals
} = require('../../config/fishing');

// Service imports
const {
  getOrResetDailyData,
  getOrResetChallenges,
  updateChallengeProgress,
  applyChallengeRewards
} = require('../../services/fishingService');

// Error classes
const {
  UserNotFoundError,
  DailyLimitError,
  TradeError
} = require('../../errors/FishingErrors');

// Extract config
const DAILY_LIMITS = FISHING_CONFIG.dailyLimits;
const TRADE_TIMEOUT = FISHING_CONFIG.tradeTimeout || 30000;

// Trade lock map
const tradeInProgress = new Map();

// GET /inventory - Get user's fish inventory
router.get('/inventory', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const inventory = await FishInventory.findAll({
      where: { userId: req.user.id },
      order: [['rarity', 'ASC'], ['fishName', 'ASC']]
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
    next(err);
  }
});

// GET /trading-post - Get trading post options with availability
router.get('/trading-post', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const inventory = await FishInventory.findAll({
      where: { userId: req.user.id }
    });
    
    const totals = calculateFishTotals(inventory);
    
    const options = TRADE_OPTIONS.map(option => {
      let canTrade = false;
      let currentQuantity = 0;
      
      if (option.requiredRarity === 'collection') {
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
    next(err);
  }
});

// POST /trade - Execute a trade
router.post('/trade', auth, async (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  
  // Trade lock
  if (tradeInProgress.has(userId)) {
    return res.status(429).json(new TradeError('in_progress').toJSON());
  }
  tradeInProgress.set(userId, now);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { tradeId, quantity = 1 } = req.body;
    
    if (!tradeId) {
      throw new TradeError('not_found');
    }
    
    const tradeQuantity = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
    const tradeOption = TRADE_OPTIONS.find(t => t.id === tradeId);
    
    if (!tradeOption) {
      throw new TradeError('not_found');
    }
    
    const user = await User.findByPk(userId, { 
      lock: transaction.LOCK.UPDATE,
      transaction 
    });
    
    if (!user) throw new UserNotFoundError(userId);
    
    // Daily limits check
    let daily = getOrResetDailyData(user);
    
    // Calculate pending rewards
    let pendingPoints = 0, pendingRollTickets = 0, pendingPremiumTickets = 0;
    
    if (tradeOption.rewardType === 'points') {
      pendingPoints = tradeOption.rewardAmount * tradeQuantity;
    } else if (tradeOption.rewardType === 'rollTickets') {
      pendingRollTickets = tradeOption.rewardAmount * tradeQuantity;
    } else if (tradeOption.rewardType === 'premiumTickets') {
      pendingPremiumTickets = tradeOption.rewardAmount * tradeQuantity;
    } else if (tradeOption.rewardType === 'mixed') {
      const amounts = tradeOption.rewardAmount;
      pendingPoints = (amounts.points || 0) * tradeQuantity;
      pendingRollTickets = (amounts.rollTickets || 0) * tradeQuantity;
      pendingPremiumTickets = (amounts.premiumTickets || 0) * tradeQuantity;
    }
    
    // Check limits
    const currentPoints = daily.pointsFromTrades || 0;
    const currentRoll = daily.ticketsEarned?.roll || 0;
    const currentPremium = daily.ticketsEarned?.premium || 0;
    
    if (pendingPoints > 0 && currentPoints + pendingPoints > DAILY_LIMITS.pointsFromTrades) {
      throw new DailyLimitError('points from trades', currentPoints, DAILY_LIMITS.pointsFromTrades);
    }
    if (pendingRollTickets > 0 && currentRoll + pendingRollTickets > DAILY_LIMITS.rollTickets) {
      throw new DailyLimitError('roll tickets', currentRoll, DAILY_LIMITS.rollTickets);
    }
    if (pendingPremiumTickets > 0 && currentPremium + pendingPremiumTickets > DAILY_LIMITS.premiumTickets) {
      throw new DailyLimitError('premium tickets', currentPremium, DAILY_LIMITS.premiumTickets);
    }
    
    // Get inventory
    const inventory = await FishInventory.findAll({
      where: { userId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    const totals = calculateFishTotals(inventory);
    
    // Check and deduct fish
    if (tradeOption.requiredRarity === 'collection') {
      const minAvailable = Math.min(...Object.values(totals));
      if (minAvailable < tradeQuantity) {
        throw new TradeError('not_enough_fish', { needed: tradeQuantity, available: minAvailable });
      }
      
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
      const requiredTotal = tradeOption.requiredQuantity * tradeQuantity;
      if (totals[tradeOption.requiredRarity] < requiredTotal) {
        throw new TradeError('not_enough_fish', { 
          rarity: tradeOption.requiredRarity,
          needed: requiredTotal, 
          available: totals[tradeOption.requiredRarity] 
        });
      }
      
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
    
    // Give rewards
    let reward = {};
    if (tradeOption.rewardType === 'points') {
      user.points += pendingPoints;
      reward = { points: pendingPoints };
    } else if (tradeOption.rewardType === 'rollTickets') {
      user.rollTickets = (user.rollTickets || 0) + pendingRollTickets;
      reward = { rollTickets: pendingRollTickets };
    } else if (tradeOption.rewardType === 'premiumTickets') {
      user.premiumTickets = (user.premiumTickets || 0) + pendingPremiumTickets;
      reward = { premiumTickets: pendingPremiumTickets };
    } else if (tradeOption.rewardType === 'mixed') {
      if (pendingRollTickets) {
        user.rollTickets = (user.rollTickets || 0) + pendingRollTickets;
        reward.rollTickets = pendingRollTickets;
      }
      if (pendingPremiumTickets) {
        user.premiumTickets = (user.premiumTickets || 0) + pendingPremiumTickets;
        reward.premiumTickets = pendingPremiumTickets;
      }
      if (pendingPoints) {
        user.points += pendingPoints;
        reward.points = pendingPoints;
      }
    }
    
    // Update daily tracking
    daily.tradesCompleted = (daily.tradesCompleted || 0) + tradeQuantity;
    if (reward.points) {
      daily.pointsFromTrades = (daily.pointsFromTrades || 0) + reward.points;
    }
    if (!daily.ticketsEarned) daily.ticketsEarned = { roll: 0, premium: 0 };
    if (reward.rollTickets) {
      daily.ticketsEarned.roll = (daily.ticketsEarned.roll || 0) + reward.rollTickets;
    }
    if (reward.premiumTickets) {
      daily.ticketsEarned.premium = (daily.ticketsEarned.premium || 0) + reward.premiumTickets;
    }
    user.fishingDaily = daily;
    
    // Challenge progress
    let challenges = getOrResetChallenges(user);
    const tradeResult = updateChallengeProgress(challenges, 'trade', { 
      isCollection: tradeOption.requiredRarity === 'collection' 
    });
    challenges = tradeResult.challenges;
    const challengeRewards = tradeResult.newlyCompleted;
    
    if (challengeRewards.length > 0) {
      applyChallengeRewards(user, challengeRewards);
    }
    user.fishingChallenges = challenges;
    
    await user.save({ transaction });
    await transaction.commit();
    
    // Get updated inventory
    const updatedInventory = await FishInventory.findAll({ where: { userId } });
    const newTotals = calculateFishTotals(updatedInventory);
    
    // Build message
    let message = 'Trade successful!';
    if (reward.points) message = `+${reward.points} points!`;
    else if (reward.rollTickets && reward.premiumTickets) {
      message = `+${reward.rollTickets} Roll Tickets, +${reward.premiumTickets} Premium Tickets!`;
    } else if (reward.rollTickets) {
      message = `+${reward.rollTickets} Roll Ticket${reward.rollTickets > 1 ? 's' : ''}!`;
    } else if (reward.premiumTickets) {
      message = `+${reward.premiumTickets} Premium Ticket${reward.premiumTickets > 1 ? 's' : ''}!`;
    }
    
    tradeInProgress.delete(userId);
    
    const response = {
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
      dailyLimits: {
        pointsFromTrades: {
          used: daily.pointsFromTrades,
          limit: DAILY_LIMITS.pointsFromTrades,
          remaining: DAILY_LIMITS.pointsFromTrades - daily.pointsFromTrades
        },
        rollTickets: {
          used: daily.ticketsEarned.roll,
          limit: DAILY_LIMITS.rollTickets,
          remaining: DAILY_LIMITS.rollTickets - daily.ticketsEarned.roll
        },
        premiumTickets: {
          used: daily.ticketsEarned.premium,
          limit: DAILY_LIMITS.premiumTickets,
          remaining: DAILY_LIMITS.premiumTickets - daily.ticketsEarned.premium
        }
      },
      message
    };
    
    if (challengeRewards.length > 0) {
      response.challengesCompleted = challengeRewards;
    }
    
    res.json(response);
    
  } catch (err) {
    await transaction.rollback();
    tradeInProgress.delete(userId);
    next(err);
  }
});

// Cleanup stuck trades
setInterval(() => {
  const now = Date.now();
  for (const [userId, startTime] of tradeInProgress.entries()) {
    if (now - startTime > TRADE_TIMEOUT) {
      tradeInProgress.delete(userId);
      console.warn(`[Trading] Trade timeout for user ${userId}, releasing lock`);
    }
  }
}, 15000);

module.exports = router;

