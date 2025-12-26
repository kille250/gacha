/**
 * Character Dojo Routes
 * 
 * API endpoints for the idle training game where characters
 * generate passive rewards over time.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { enforcementMiddleware } = require('../middleware/enforcement');
const { enforcePolicy } = require('../middleware/policies');
const { User, Character, UserCharacter, sequelize } = require('../models');
const {
  DOJO_CONFIG,
  DOJO_BALANCE,
  calculateRewards,
  getUpgradeCost,
  getAvailableUpgrades,
  getLevelMultiplier
} = require('../config/dojo');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');
const { deviceBindingMiddleware } = require('../middleware/deviceBinding');
const { updateRiskScore, RISK_ACTIONS } = require('../services/riskService');
const { updateVoyageProgress, completeDailyActivity } = require('../services/retentionService');

// Rate limiting is now handled via dojoLastClaim in the database
// This makes it multi-server safe (works behind load balancers)

/**
 * GET /api/dojo/status
 * Get current dojo status including slots, accumulated rewards, and upgrades
 * Security: enforcement checked (banned users cannot access game features)
 */
router.get('/status', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const dojoSlots = user.dojoSlots || [];
    const upgrades = user.dojoUpgrades || { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    const maxSlots = upgrades.slots || DOJO_CONFIG.defaultSlots;
    const capHours = upgrades.capHours || DOJO_CONFIG.defaultCapHours;
    
    // Get character details for slots with level info
    const characterIds = dojoSlots.filter(id => id !== null);
    let characters = [];
    
    if (characterIds.length > 0) {
      // Get characters with their levels from junction table
      const userCharacters = await UserCharacter.findAll({
        where: {
          UserId: req.user.id,
          CharacterId: characterIds
        },
        include: [{ model: Character }]
      });
      
      characters = userCharacters
        .filter(uc => uc.Character)
        .map(uc => ({
          ...uc.Character.toJSON(),
          level: uc.level,
          duplicateCount: uc.duplicateCount,
          specialization: uc.specialization || null
        }));
    }
    
    // Map slot positions to character data (with levels)
    const slotsWithCharacters = dojoSlots.map(charId => {
      if (!charId) return null;
      return characters.find(c => c.id === charId) || null;
    });
    
    // Calculate accumulated time
    let accumulatedHours = 0;
    let accumulatedRewards = null;
    
    if (user.dojoLastClaim && slotsWithCharacters.some(c => c !== null)) {
      const now = new Date();
      const lastClaim = new Date(user.dojoLastClaim);
      const elapsedMs = now - lastClaim;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      
      // Cap at maximum accumulation
      accumulatedHours = Math.min(elapsedHours, capHours);
      
      // Calculate pending rewards (not active, just preview)
      const activeCharacters = slotsWithCharacters.filter(c => c !== null);
      accumulatedRewards = calculateRewards(activeCharacters, accumulatedHours, upgrades, false);
    }
    
    // Calculate hourly rate for display (includes all bonuses)
    const activeCharacters = slotsWithCharacters.filter(c => c !== null);
    const hourlyRate = activeCharacters.length > 0
      ? calculateRewards(activeCharacters, 1, upgrades, false)
      : { 
          points: 0, 
          rollTickets: 0, 
          premiumTickets: 0,
          rawPointsPerHour: 0,
          effectivePointsPerHour: 0,
          diminishingReturnsApplied: false,
          catchUpBonus: { multiplier: 1, isActive: false }
        };
    
    // Get available upgrades
    const availableUpgrades = getAvailableUpgrades(upgrades);
    
    // Get daily cap status
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = user.dojoDailyStats || {};
    const todayStats = dailyStats[today] || { points: 0, rollTickets: 0, premiumTickets: 0 };
    
    const dailyCapsRemaining = {
      points: Math.max(0, DOJO_BALANCE.dailyCaps.points - todayStats.points),
      rollTickets: Math.max(0, DOJO_BALANCE.dailyCaps.rollTickets - todayStats.rollTickets),
      premiumTickets: Math.max(0, DOJO_BALANCE.dailyCaps.premiumTickets - todayStats.premiumTickets)
    };
    
    // Get ticket progress for pity system display
    const ticketProgress = user.dojoTicketProgress || { roll: 0, premium: 0 };
    
    res.json({
      slots: slotsWithCharacters.map((char, idx) => ({
        index: idx,
        character: char ? {
          id: char.id,
          name: char.name,
          image: char.image,
          series: char.series,
          rarity: char.rarity,
          level: char.level || 1,
          levelMultiplier: getLevelMultiplier(char.level || 1),
          specialization: char.specialization || null
        } : null
      })),
      maxSlots,
      usedSlots: activeCharacters.length,
      upgrades,
      hourlyRate: {
        points: hourlyRate.points,
        rollTickets: hourlyRate.rollTickets || 0,
        premiumTickets: hourlyRate.premiumTickets || 0,
        synergies: hourlyRate.synergies || [],
        // Transparency: Show raw vs effective rate
        rawPointsPerHour: hourlyRate.rawPointsPerHour || 0,
        effectivePointsPerHour: hourlyRate.effectivePointsPerHour || 0,
        efficiency: hourlyRate.rawPointsPerHour > 0 
          ? Math.round((hourlyRate.effectivePointsPerHour / hourlyRate.rawPointsPerHour) * 100)
          : 100,
        diminishingReturnsApplied: hourlyRate.diminishingReturnsApplied || false,
        catchUpBonus: hourlyRate.catchUpBonus || { multiplier: 1, isActive: false }
      },
      accumulated: {
        hours: Math.floor(accumulatedHours * 100) / 100,
        capHours,
        rewards: accumulatedRewards ? {
          points: accumulatedRewards.points,
          rollTickets: accumulatedRewards.rollTickets,
          premiumTickets: accumulatedRewards.premiumTickets
        } : null,
        isCapped: accumulatedHours >= capHours
      },
      dailyCaps: {
        limits: DOJO_BALANCE.dailyCaps,
        todayClaimed: todayStats,
        remaining: dailyCapsRemaining,
        isPointsCapped: dailyCapsRemaining.points <= 0,
        isTicketsCapped: dailyCapsRemaining.rollTickets <= 0 && dailyCapsRemaining.premiumTickets <= 0
      },
      ticketProgress: {
        roll: Math.round(ticketProgress.roll * 100) / 100,
        premium: Math.round(ticketProgress.premium * 100) / 100
      },
      availableUpgrades,
      lastClaim: user.dojoLastClaim
    });
    
  } catch (err) {
    console.error('Dojo status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dojo/available-characters
 * Get characters available for assignment (owned, not already in dojo)
 * Security: enforcement checked (banned users cannot access game features)
 */
router.get('/available-characters', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const dojoSlots = user.dojoSlots || [];
    const assignedIds = new Set(dojoSlots.filter(id => id !== null));
    
    // Get user's collection with level info
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: req.user.id },
      include: [{ model: Character }]
    });
    
    // Filter out already assigned characters and include level info
    const availableCharacters = userCharacters
      .filter(uc => uc.Character && !assignedIds.has(uc.CharacterId))
      .map(uc => ({
        id: uc.Character.id,
        name: uc.Character.name,
        image: uc.Character.image,
        series: uc.Character.series,
        rarity: uc.Character.rarity,
        level: uc.level || 1,
        levelMultiplier: getLevelMultiplier(uc.level || 1),
        specialization: uc.specialization || null
      }));
    
    // Group by series for UI convenience
    const bySeries = {};
    availableCharacters.forEach(char => {
      if (!bySeries[char.series]) {
        bySeries[char.series] = [];
      }
      bySeries[char.series].push(char);
    });
    
    res.json({
      characters: availableCharacters,
      bySeries,
      total: availableCharacters.length
    });
    
  } catch (err) {
    console.error('Available characters error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dojo/assign
 * Assign a character to a training slot
 * Security: enforcement checked, device binding verified, rate limited
 * Uses transaction with row locking to prevent race conditions
 */
router.post('/assign', [auth, enforcementMiddleware, deviceBindingMiddleware('dojo'), sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { characterId, slotIndex } = req.body;
    
    if (characterId === undefined || slotIndex === undefined) {
      await transaction.rollback();
      return res.status(400).json({ error: 'characterId and slotIndex required' });
    }
    
    // Lock user row to prevent concurrent modifications
    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const upgrades = user.dojoUpgrades || { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    const maxSlots = upgrades.slots || DOJO_CONFIG.defaultSlots;
    
    // Validate slot index
    if (slotIndex < 0 || slotIndex >= maxSlots) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid slot index' });
    }
    
    // Verify user owns this character
    const userCharacter = await UserCharacter.findOne({
      where: {
        UserId: req.user.id,
        CharacterId: characterId
      },
      include: [{ model: Character }],
      transaction
    });
    
    if (!userCharacter || !userCharacter.Character) {
      await transaction.rollback();
      return res.status(400).json({ error: 'You do not own this character' });
    }
    
    const character = userCharacter.Character;
    
    // Get current slots
    let dojoSlots = user.dojoSlots || [];
    
    // Ensure array is proper length
    while (dojoSlots.length < maxSlots) {
      dojoSlots.push(null);
    }
    
    // Check if character is already assigned to another slot
    const existingSlot = dojoSlots.findIndex(id => id === characterId);
    if (existingSlot !== -1 && existingSlot !== slotIndex) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Character already assigned to another slot' });
    }
    
    // Assign character
    dojoSlots[slotIndex] = characterId;
    user.dojoSlots = dojoSlots;
    
    // Initialize last claim if first assignment
    if (!user.dojoLastClaim) {
      user.dojoLastClaim = new Date();
    }
    
    await user.save({ transaction });
    await transaction.commit();
    
    res.json({
      success: true,
      message: `${character.name} is now training!`,
      slot: {
        index: slotIndex,
        character: {
          id: character.id,
          name: character.name,
          image: character.image,
          series: character.series,
          rarity: character.rarity
        }
      }
    });
    
  } catch (err) {
    await transaction.rollback();
    console.error('Dojo assign error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dojo/unassign
 * Remove a character from a training slot
 * Security: enforcement checked, device binding verified, rate limited
 * Uses transaction to prevent race conditions
 */
router.post('/unassign', [auth, enforcementMiddleware, deviceBindingMiddleware('dojo'), sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { slotIndex } = req.body;
    
    if (slotIndex === undefined) {
      await transaction.rollback();
      return res.status(400).json({ error: 'slotIndex required' });
    }
    
    // Lock user row to prevent concurrent modifications
    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    let dojoSlots = user.dojoSlots || [];
    
    // Validate slot index
    if (slotIndex < 0 || slotIndex >= dojoSlots.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid slot index' });
    }
    
    const removedCharId = dojoSlots[slotIndex];
    if (!removedCharId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Slot is already empty' });
    }
    
    // Get character name for message
    const character = await Character.findByPk(removedCharId, { transaction });
    
    // Remove from slot
    dojoSlots[slotIndex] = null;
    user.dojoSlots = dojoSlots;
    await user.save({ transaction });
    await transaction.commit();
    
    res.json({
      success: true,
      message: character ? `${character.name} stopped training.` : 'Character removed from training.',
      slotIndex
    });
    
  } catch (err) {
    await transaction.rollback();
    console.error('Dojo unassign error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dojo/claim
 * Claim accumulated rewards
 * Security: enforcement checked, device binding verified, rate limited, policy enforced
 * Uses transaction to ensure atomicity and proper cooldown handling
 */
router.post('/claim', [auth, enforcementMiddleware, deviceBindingMiddleware('dojo_claim'), sensitiveActionLimiter, enforcePolicy('canClaimRewards')], async (req, res) => {
  const userId = req.user.id;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Lock user row
    const user = await User.findByPk(userId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // DB-based rate limiting (multi-server safe)
    if (user.dojoLastClaim) {
      const lastClaimTime = new Date(user.dojoLastClaim).getTime();
      const now = Date.now();
      const minIntervalMs = DOJO_CONFIG.minClaimInterval * 1000;
      
      if (now - lastClaimTime < minIntervalMs) {
        await transaction.rollback();
        const remaining = Math.ceil((minIntervalMs - (now - lastClaimTime)) / 1000);
        return res.status(429).json({
          error: 'Too fast',
          message: `Please wait ${remaining} seconds`,
          retryAfter: remaining
        });
      }
    }
    
    const dojoSlots = user.dojoSlots || [];
    const upgrades = user.dojoUpgrades || { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    const capHours = upgrades.capHours || DOJO_CONFIG.defaultCapHours;
    
    // Check if there's anything to claim
    if (!user.dojoLastClaim) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No rewards to claim' });
    }
    
    // Get characters in slots with level info
    const characterIds = dojoSlots.filter(id => id !== null);
    if (characterIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No characters training' });
    }
    
    // Get characters with their levels from junction table
    const userCharacters = await UserCharacter.findAll({
      where: {
        UserId: userId,
        CharacterId: characterIds
      },
      include: [{ model: Character }],
      transaction
    });
    
    const charactersWithLevels = userCharacters
      .filter(uc => uc.Character)
      .map(uc => ({
        ...uc.Character.toJSON(),
        level: uc.level,
        duplicateCount: uc.duplicateCount
      }));
    
    const activeCharacters = dojoSlots
      .map(id => charactersWithLevels.find(c => c.id === id))
      .filter(c => c !== null && c !== undefined);
    
    // Calculate time elapsed
    const lastClaimTime = new Date(user.dojoLastClaim);
    const elapsedMs = new Date() - lastClaimTime;
    const elapsedHours = Math.min(elapsedMs / (1000 * 60 * 60), capHours);
    
    if (elapsedHours < 0.01) { // Less than ~36 seconds
      await transaction.rollback();
      return res.status(400).json({ error: 'Not enough time accumulated' });
    }
    
    // Calculate rewards (active claim bonus)
    const rewards = calculateRewards(activeCharacters, elapsedHours, upgrades, true);
    
    // =============================================
    // DAILY CAPS ENFORCEMENT
    // =============================================
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyStats = user.dojoDailyStats || {};
    const todayStats = dailyStats[today] || { points: 0, rollTickets: 0, premiumTickets: 0 };
    
    // Calculate remaining caps for today
    const remainingCaps = {
      points: Math.max(0, DOJO_BALANCE.dailyCaps.points - todayStats.points),
      rollTickets: Math.max(0, DOJO_BALANCE.dailyCaps.rollTickets - todayStats.rollTickets),
      premiumTickets: Math.max(0, DOJO_BALANCE.dailyCaps.premiumTickets - todayStats.premiumTickets)
    };
    
    // Apply daily caps to rewards
    const cappedRewards = {
      points: Math.min(rewards.points, remainingCaps.points),
      rollTickets: Math.min(rewards.rollTickets, remainingCaps.rollTickets),
      premiumTickets: Math.min(rewards.premiumTickets, remainingCaps.premiumTickets)
    };
    
    // =============================================
    // TICKET PITY SYSTEM
    // =============================================
    // Accumulate fractional ticket progress for guaranteed drops
    const ticketProgress = user.dojoTicketProgress || { roll: 0, premium: 0 };
    
    // Add expected ticket values to progress
    ticketProgress.roll += rewards.expectedTickets?.roll || 0;
    ticketProgress.premium += rewards.expectedTickets?.premium || 0;
    
    // Extract whole tickets from accumulated progress
    const pityRollTickets = Math.floor(ticketProgress.roll);
    const pityPremiumTickets = Math.floor(ticketProgress.premium);
    
    // Keep fractional part for next claim
    ticketProgress.roll = ticketProgress.roll % 1;
    ticketProgress.premium = ticketProgress.premium % 1;
    
    user.dojoTicketProgress = ticketProgress;
    
    // Use pity tickets instead of random tickets (more fair, deterministic)
    const finalRollTickets = Math.min(pityRollTickets, remainingCaps.rollTickets);
    const finalPremiumTickets = Math.min(pityPremiumTickets, remainingCaps.premiumTickets);
    
    // Track if any rewards were capped
    const wasPointsCapped = cappedRewards.points < rewards.points;
    const wasTicketsCapped = pityRollTickets > remainingCaps.rollTickets || 
                              pityPremiumTickets > remainingCaps.premiumTickets;
    
    // Update today's stats with ACTUAL tickets given (not random reward values)
    // FIX: Previously used cappedRewards.rollTickets which was from random calculation,
    // but actual tickets come from pity system (finalRollTickets/finalPremiumTickets)
    dailyStats[today] = {
      points: todayStats.points + cappedRewards.points,
      rollTickets: todayStats.rollTickets + finalRollTickets,
      premiumTickets: todayStats.premiumTickets + finalPremiumTickets
    };
    
    // Lazy cleanup: Only clean old daily stats when > 10 entries exist
    // This reduces processing on every claim while still preventing unbounded growth
    if (Object.keys(dailyStats).length > 10) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      for (const date of Object.keys(dailyStats)) {
        if (new Date(date) < cutoffDate) {
          delete dailyStats[date];
        }
      }
    }
    
    user.dojoDailyStats = dailyStats;
    
    // Apply rewards
    user.points += cappedRewards.points;
    user.rollTickets = (user.rollTickets || 0) + finalRollTickets;
    user.premiumTickets = (user.premiumTickets || 0) + finalPremiumTickets;
    user.dojoLastClaim = new Date();
    
    await user.save({ transaction });
    await transaction.commit();
    
    // SECURITY: Update risk score for dojo claim AFTER successful transaction
    // This ensures risk is only tracked for completed actions
    await updateRiskScore(userId, {
      action: RISK_ACTIONS.DOJO_CLAIM,
      reason: 'dojo_reward_claimed',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });

    // Update voyage progress for dojo claims (claim_dojo_rewards objective)
    // Refetch user to avoid stale data after transaction
    const freshUser = await User.findByPk(userId);
    if (freshUser) {
      updateVoyageProgress(freshUser, 'claim_dojo_rewards', 1);
      completeDailyActivity(freshUser, 'collect_dojo');
      completeDailyActivity(freshUser, 'complete_training');
      await freshUser.save();
    }

    // Cooldown is now enforced via dojoLastClaim (set above)
    // No need for in-memory tracking
    
    res.json({
      success: true,
      rewards: {
        points: cappedRewards.points,
        rollTickets: finalRollTickets,
        premiumTickets: finalPremiumTickets
      },
      breakdown: rewards.breakdown,
      synergies: rewards.synergies,
      synergyCapped: rewards.synergyCapped,
      activeBonus: rewards.activeMultiplier > 1,
      catchUpBonus: rewards.catchUpBonus,
      hoursAccumulated: Math.floor(elapsedHours * 100) / 100,
      diminishingReturnsApplied: rewards.diminishingReturnsApplied,
      // Transparency: raw vs effective points
      rawPointsPerHour: rewards.rawPointsPerHour,
      effectivePointsPerHour: rewards.effectivePointsPerHour,
      // Daily cap info
      dailyCaps: {
        wasPointsCapped,
        wasTicketsCapped,
        remaining: {
          points: remainingCaps.points - cappedRewards.points,
          rollTickets: remainingCaps.rollTickets - finalRollTickets,
          premiumTickets: remainingCaps.premiumTickets - finalPremiumTickets
        },
        todayTotal: dailyStats[today]
      },
      // Ticket pity info
      ticketProgress: {
        roll: Math.round(ticketProgress.roll * 100) / 100,
        premium: Math.round(ticketProgress.premium * 100) / 100
      },
      newTotals: {
        points: user.points,
        rollTickets: user.rollTickets,
        premiumTickets: user.premiumTickets
      }
    });
    
  } catch (err) {
    await transaction.rollback();
    console.error('Dojo claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dojo/upgrade
 * Purchase a dojo upgrade
 * Security: enforcement checked, device binding verified, rate limited, risk tracked
 * Uses transaction with row locking to prevent double-spending
 */
router.post('/upgrade', [auth, enforcementMiddleware, deviceBindingMiddleware('dojo_upgrade'), sensitiveActionLimiter], async (req, res) => {
  const { upgradeType, rarity } = req.body; // rarity only for mastery upgrades
  const userId = req.user.id;
  
  // Validate input before starting transaction
  if (!upgradeType) {
    return res.status(400).json({ error: 'upgradeType required' });
  }
  
  const validTypes = ['slot', 'cap', 'intensity', 'mastery'];
  if (!validTypes.includes(upgradeType)) {
    return res.status(400).json({ error: 'Invalid upgrade type' });
  }
  
  if (upgradeType === 'mastery' && !rarity) {
    return res.status(400).json({ error: 'rarity required for mastery upgrade' });
  }
  
  const transaction = await sequelize.transaction();
  
  try {
    // Lock user row to prevent concurrent modifications
    const user = await User.findByPk(userId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const upgrades = user.dojoUpgrades || { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    
    // Get cost
    const cost = getUpgradeCost(upgradeType, upgrades, rarity);
    if (cost === null) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Upgrade already maxed or not available' });
    }
    
    // Check if user can afford
    if (user.points < cost) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Not enough points',
        required: cost,
        current: user.points
      });
    }
    
    // Apply upgrade
    user.points -= cost;
    
    switch (upgradeType) {
      case 'slot': {
        upgrades.slots = (upgrades.slots || DOJO_CONFIG.defaultSlots) + 1;
        // Extend dojoSlots array
        const dojoSlots = user.dojoSlots || [];
        while (dojoSlots.length < upgrades.slots) {
          dojoSlots.push(null);
        }
        user.dojoSlots = dojoSlots;
        break;
      }
        
      case 'cap':
        upgrades.capHours = (upgrades.capHours || DOJO_CONFIG.defaultCapHours) + 4;
        break;
        
      case 'intensity':
        upgrades.intensity = (upgrades.intensity || 0) + 1;
        break;
        
      case 'mastery':
        if (!upgrades.masteries) upgrades.masteries = {};
        upgrades.masteries[rarity] = true;
        break;
    }
    
    user.dojoUpgrades = upgrades;
    await user.save({ transaction });
    await transaction.commit();
    
    // SECURITY: Track dojo upgrade for risk scoring (point spending)
    await updateRiskScore(userId, {
      action: RISK_ACTIONS.DOJO_UPGRADE,
      reason: 'dojo_upgrade_purchased',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });

    // Update daily activity progress
    const freshUser = await User.findByPk(userId);
    if (freshUser) {
      completeDailyActivity(freshUser, 'upgrade_facility');
      await freshUser.save();
    }

    // Get updated available upgrades
    const availableUpgrades = getAvailableUpgrades(upgrades);
    
    res.json({
      success: true,
      message: 'Upgrade purchased!',
      upgradeType,
      rarity: rarity || null,
      cost,
      newPoints: user.points,
      newUpgrades: upgrades,
      availableUpgrades
    });
    
  } catch (err) {
    await transaction.rollback();
    console.error('Dojo upgrade error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

