/**
 * Trade Service
 * 
 * Handles all trading post logic with proper transaction management.
 * Extracted from routes for better maintainability and testability.
 */

const { sequelize, User, FishInventory } = require('../models');
const {
  TRADE_OPTIONS,
  FISHING_CONFIG,
  calculateFishTotals
} = require('../config/fishing');
const {
  getOrResetDailyData,
  getOrResetChallenges,
  updateChallengeProgress,
  applyChallengeRewards
} = require('./fishingService');

const DAILY_LIMITS = FISHING_CONFIG.dailyLimits;

/**
 * Calculate actual points with diminishing returns
 * After threshold, points are reduced to prevent excessive farming
 * 
 * @param {number} basePoints - Points before diminishing returns
 * @param {number} currentDailyPoints - Points already earned today
 * @returns {number} - Actual points to award
 */
function calculatePointsWithDiminishingReturns(basePoints, currentDailyPoints) {
  const softCap = FISHING_CONFIG.dailyLimits.pointsSoftCap || 10000;
  const hardCap = FISHING_CONFIG.dailyLimits.pointsFromTrades;
  
  if (currentDailyPoints >= hardCap) {
    return 0;
  }
  
  if (currentDailyPoints >= softCap) {
    // 50% reduction after soft cap
    const reducedPoints = Math.floor(basePoints * 0.5);
    // Don't exceed hard cap
    return Math.min(reducedPoints, hardCap - currentDailyPoints);
  }
  
  // Check if this trade would push us past soft cap
  if (currentDailyPoints + basePoints > softCap) {
    // Split: full points until soft cap, reduced after
    const fullPointsAmount = softCap - currentDailyPoints;
    const overflowAmount = basePoints - fullPointsAmount;
    const reducedOverflow = Math.floor(overflowAmount * 0.5);
    return fullPointsAmount + reducedOverflow;
  }
  
  return basePoints;
}

/**
 * Validate trade request before processing
 * 
 * @param {string} tradeId - Trade option ID
 * @param {number} quantity - Trade quantity
 * @returns {Object} - { valid, error, tradeOption }
 */
function validateTradeRequest(tradeId, quantity) {
  if (!tradeId) {
    return { valid: false, error: { code: 'MISSING_TRADE_ID', message: 'Trade ID required', status: 400 } };
  }
  
  const tradeOption = TRADE_OPTIONS.find(t => t.id === tradeId);
  if (!tradeOption) {
    return { valid: false, error: { code: 'INVALID_TRADE', message: 'Invalid trade option', status: 400 } };
  }
  
  const tradeQuantity = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
  
  return { valid: true, tradeOption, tradeQuantity };
}

/**
 * Calculate pending rewards for a trade
 * 
 * @param {Object} tradeOption - Trade option configuration
 * @param {number} quantity - Number of trades
 * @returns {Object} - { points, rollTickets, premiumTickets }
 */
function calculatePendingRewards(tradeOption, quantity) {
  let pendingPoints = 0;
  let pendingRollTickets = 0;
  let pendingPremiumTickets = 0;
  
  if (tradeOption.rewardType === 'points') {
    pendingPoints = tradeOption.rewardAmount * quantity;
  } else if (tradeOption.rewardType === 'rollTickets') {
    pendingRollTickets = tradeOption.rewardAmount * quantity;
  } else if (tradeOption.rewardType === 'premiumTickets') {
    pendingPremiumTickets = tradeOption.rewardAmount * quantity;
  } else if (tradeOption.rewardType === 'mixed') {
    const amounts = tradeOption.rewardAmount;
    pendingPoints = (amounts.points || 0) * quantity;
    pendingRollTickets = (amounts.rollTickets || 0) * quantity;
    pendingPremiumTickets = (amounts.premiumTickets || 0) * quantity;
  }
  
  return { pendingPoints, pendingRollTickets, pendingPremiumTickets };
}

/**
 * Check if trade would exceed daily limits
 * 
 * @param {Object} daily - User's daily data
 * @param {Object} pending - Pending rewards { points, rollTickets, premiumTickets }
 * @returns {Object|null} - Error object or null if within limits
 */
function checkDailyLimits(daily, pending) {
  const currentPoints = daily.pointsFromTrades || 0;
  const currentRollTickets = daily.ticketsEarned?.roll || 0;
  const currentPremiumTickets = daily.ticketsEarned?.premium || 0;
  
  // Points use soft cap with diminishing returns, so we check hard cap
  if (pending.pendingPoints > 0 && currentPoints >= DAILY_LIMITS.pointsFromTrades) {
    return {
      code: 'DAILY_POINTS_LIMIT',
      message: 'Daily points limit reached',
      status: 429,
      details: { limit: DAILY_LIMITS.pointsFromTrades, used: currentPoints }
    };
  }
  
  if (pending.pendingRollTickets > 0 && currentRollTickets + pending.pendingRollTickets > DAILY_LIMITS.rollTickets) {
    const remaining = DAILY_LIMITS.rollTickets - currentRollTickets;
    return {
      code: 'DAILY_ROLL_TICKET_LIMIT',
      message: `You can only earn ${remaining} more roll tickets today`,
      status: 429,
      details: { limit: DAILY_LIMITS.rollTickets, used: currentRollTickets }
    };
  }
  
  if (pending.pendingPremiumTickets > 0 && currentPremiumTickets + pending.pendingPremiumTickets > DAILY_LIMITS.premiumTickets) {
    const remaining = DAILY_LIMITS.premiumTickets - currentPremiumTickets;
    return {
      code: 'DAILY_PREMIUM_TICKET_LIMIT',
      message: `You can only earn ${remaining} more premium tickets today`,
      status: 429,
      details: { limit: DAILY_LIMITS.premiumTickets, used: currentPremiumTickets }
    };
  }
  
  return null;
}

/**
 * Deduct fish from inventory for a trade
 * 
 * @param {Array} inventory - User's fish inventory
 * @param {Object} tradeOption - Trade option configuration
 * @param {number} quantity - Number of trades
 * @param {Object} transaction - Sequelize transaction
 * @returns {boolean} - Success
 */
async function deductFishFromInventory(inventory, tradeOption, quantity, transaction) {
  const totals = calculateFishTotals(inventory);
  
  if (tradeOption.requiredRarity === 'collection') {
    // Need at least 1 of each rarity per trade
    const minAvailable = Math.min(...Object.values(totals));
    if (minAvailable < quantity) {
      return false;
    }
    
    // Deduct 1 of each rarity per trade
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const rarity of rarities) {
      const itemsOfRarity = inventory.filter(i => i.rarity === rarity);
      let remaining = quantity;
      
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
    const requiredTotal = tradeOption.requiredQuantity * quantity;
    if ((totals[tradeOption.requiredRarity] || 0) < requiredTotal) {
      return false;
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
  
  return true;
}

/**
 * Apply trade rewards to user
 * 
 * @param {Object} user - User model instance
 * @param {Object} tradeOption - Trade option configuration
 * @param {number} quantity - Number of trades
 * @param {Object} daily - User's daily data
 * @returns {Object} - { reward, actualPoints }
 */
function applyTradeRewards(user, tradeOption, quantity, daily) {
  const reward = {};
  let actualPoints = 0;
  
  if (tradeOption.rewardType === 'points') {
    const basePoints = tradeOption.rewardAmount * quantity;
    actualPoints = calculatePointsWithDiminishingReturns(basePoints, daily.pointsFromTrades || 0);
    user.points += actualPoints;
    reward.points = actualPoints;
    if (actualPoints < basePoints) {
      reward.reducedFrom = basePoints;
      reward.diminishingReturns = true;
    }
  } else if (tradeOption.rewardType === 'rollTickets') {
    const ticketReward = tradeOption.rewardAmount * quantity;
    user.rollTickets = (user.rollTickets || 0) + ticketReward;
    reward.rollTickets = ticketReward;
  } else if (tradeOption.rewardType === 'premiumTickets') {
    const premiumReward = tradeOption.rewardAmount * quantity;
    user.premiumTickets = (user.premiumTickets || 0) + premiumReward;
    reward.premiumTickets = premiumReward;
  } else if (tradeOption.rewardType === 'mixed') {
    const amounts = tradeOption.rewardAmount;
    if (amounts.rollTickets) {
      const ticketReward = amounts.rollTickets * quantity;
      user.rollTickets = (user.rollTickets || 0) + ticketReward;
      reward.rollTickets = ticketReward;
    }
    if (amounts.premiumTickets) {
      const premiumReward = amounts.premiumTickets * quantity;
      user.premiumTickets = (user.premiumTickets || 0) + premiumReward;
      reward.premiumTickets = premiumReward;
    }
    if (amounts.points) {
      const basePoints = amounts.points * quantity;
      actualPoints = calculatePointsWithDiminishingReturns(basePoints, daily.pointsFromTrades || 0);
      user.points += actualPoints;
      reward.points = actualPoints;
      if (actualPoints < basePoints) {
        reward.reducedFrom = basePoints;
        reward.diminishingReturns = true;
      }
    }
  }
  
  return { reward, actualPoints };
}

/**
 * Execute a trade with full transaction support
 * 
 * @param {number} userId - User ID
 * @param {string} tradeId - Trade option ID
 * @param {number} quantity - Number of trades to execute
 * @returns {Object} - Trade result
 */
async function executeTrade(userId, tradeId, quantity = 1) {
  // Validate request
  const validation = validateTradeRequest(tradeId, quantity);
  if (!validation.valid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code;
    error.status = validation.error.status;
    throw error;
  }
  
  const { tradeOption, tradeQuantity } = validation;
  
  // Start transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Lock user row
    const user = await User.findByPk(userId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!user) {
      throw Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND', status: 404 });
    }
    
    // Get daily data
    let daily = getOrResetDailyData(user);
    
    // Calculate pending rewards
    const pending = calculatePendingRewards(tradeOption, tradeQuantity);
    
    // Check daily limits
    const limitError = checkDailyLimits(daily, pending);
    if (limitError) {
      throw Object.assign(new Error(limitError.message), limitError);
    }
    
    // Get inventory with lock
    let inventory;
    if (tradeOption.requiredRarity === 'collection') {
      inventory = await FishInventory.findAll({
        where: { userId },
        lock: transaction.LOCK.UPDATE,
        transaction
      });
    } else {
      inventory = await FishInventory.findAll({
        where: { userId, rarity: tradeOption.requiredRarity },
        lock: transaction.LOCK.UPDATE,
        transaction
      });
    }
    
    // Deduct fish
    const deductSuccess = await deductFishFromInventory(inventory, tradeOption, tradeQuantity, transaction);
    if (!deductSuccess) {
      const totals = calculateFishTotals(inventory);
      throw Object.assign(new Error('Not enough fish for this trade'), {
        code: 'INSUFFICIENT_FISH',
        status: 400,
        details: {
          required: tradeOption.requiredRarity === 'collection' 
            ? `${tradeQuantity} of each rarity`
            : `${tradeOption.requiredQuantity * tradeQuantity} ${tradeOption.requiredRarity}`,
          available: totals
        }
      });
    }
    
    // Apply rewards
    const { reward, actualPoints } = applyTradeRewards(user, tradeOption, tradeQuantity, daily);
    
    // Update daily tracking
    daily.tradesCompleted = (daily.tradesCompleted || 0) + tradeQuantity;
    if (reward.points) {
      daily.pointsFromTrades = (daily.pointsFromTrades || 0) + reward.points;
    }
    if (!daily.ticketsEarned) {
      daily.ticketsEarned = { roll: 0, premium: 0 };
    }
    if (reward.rollTickets) {
      daily.ticketsEarned.roll = (daily.ticketsEarned.roll || 0) + reward.rollTickets;
    }
    if (reward.premiumTickets) {
      daily.ticketsEarned.premium = (daily.ticketsEarned.premium || 0) + reward.premiumTickets;
    }
    user.fishingDaily = daily;
    
    // Update challenge progress
    let challenges = getOrResetChallenges(user);
    const tradeResult = updateChallengeProgress(challenges, 'trade', {
      isCollection: tradeOption.requiredRarity === 'collection'
    });
    challenges = tradeResult.challenges;
    const challengeRewards = tradeResult.newlyCompleted;
    
    // Apply challenge rewards
    if (challengeRewards.length > 0) {
      applyChallengeRewards(user, challengeRewards);
    }
    user.fishingChallenges = challenges;
    
    await user.save({ transaction });
    await transaction.commit();
    
    // Get updated inventory
    const updatedInventory = await FishInventory.findAll({
      where: { userId }
    });
    const newTotals = calculateFishTotals(updatedInventory);
    
    // Build response message
    let message = 'Trade successful!';
    if (reward.points) {
      message = reward.diminishingReturns 
        ? `+${reward.points} points (reduced from ${reward.reducedFrom} - daily soft cap reached)`
        : `+${reward.points} points!`;
    } else if (reward.rollTickets && reward.premiumTickets) {
      message = `+${reward.rollTickets} Roll Tickets, +${reward.premiumTickets} Premium Tickets!`;
    } else if (reward.rollTickets) {
      message = `+${reward.rollTickets} Roll Ticket${reward.rollTickets > 1 ? 's' : ''}!`;
    } else if (reward.premiumTickets) {
      message = `+${reward.premiumTickets} Premium Ticket${reward.premiumTickets > 1 ? 's' : ''}!`;
    }
    
    return {
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
          softCap: FISHING_CONFIG.dailyLimits.pointsSoftCap || 10000,
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
      challengesCompleted: challengeRewards.length > 0 ? challengeRewards : undefined,
      message
    };
    
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  executeTrade,
  validateTradeRequest,
  calculatePendingRewards,
  checkDailyLimits,
  calculatePointsWithDiminishingReturns
};

