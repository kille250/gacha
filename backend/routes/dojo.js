/**
 * Character Dojo Routes
 * 
 * API endpoints for the idle training game where characters
 * generate passive rewards over time.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, Character, UserCharacter } = require('../models');
const { Op } = require('sequelize');
const {
  DOJO_CONFIG,
  calculateRewards,
  getUpgradeCost,
  getAvailableUpgrades,
  getLevelMultiplier
} = require('../config/dojo');

// Rate limiting for claims (prevent spam)
const claimCooldowns = new Map();

// Cleanup old cooldowns periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastTime] of claimCooldowns.entries()) {
    if (now - lastTime > 120000) { // 2 minutes
      claimCooldowns.delete(userId);
    }
  }
}, 60000);

/**
 * GET /api/dojo/status
 * Get current dojo status including slots, accumulated rewards, and upgrades
 */
router.get('/status', auth, async (req, res) => {
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
          duplicateCount: uc.duplicateCount
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
    
    // Calculate hourly rate for display
    const activeCharacters = slotsWithCharacters.filter(c => c !== null);
    const hourlyRate = activeCharacters.length > 0
      ? calculateRewards(activeCharacters, 1, upgrades, false)
      : { points: 0, rollTickets: 0, premiumTickets: 0 };
    
    // Get available upgrades
    const availableUpgrades = getAvailableUpgrades(upgrades);
    
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
          levelMultiplier: getLevelMultiplier(char.level || 1)
        } : null
      })),
      maxSlots,
      usedSlots: activeCharacters.length,
      upgrades,
      hourlyRate: {
        points: hourlyRate.points,
        rollTickets: hourlyRate.rollTickets || 0,
        premiumTickets: hourlyRate.premiumTickets || 0,
        synergies: hourlyRate.synergies || []
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
 */
router.get('/available-characters', auth, async (req, res) => {
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
        levelMultiplier: getLevelMultiplier(uc.level || 1)
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
 */
router.post('/assign', auth, async (req, res) => {
  try {
    const { characterId, slotIndex } = req.body;
    
    if (characterId === undefined || slotIndex === undefined) {
      return res.status(400).json({ error: 'characterId and slotIndex required' });
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const upgrades = user.dojoUpgrades || { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    const maxSlots = upgrades.slots || DOJO_CONFIG.defaultSlots;
    
    // Validate slot index
    if (slotIndex < 0 || slotIndex >= maxSlots) {
      return res.status(400).json({ error: 'Invalid slot index' });
    }
    
    // Verify user owns this character
    const userWithChars = await User.findByPk(req.user.id, {
      include: [{
        model: Character,
        where: { id: characterId },
        required: false
      }]
    });
    
    if (!userWithChars.Characters || userWithChars.Characters.length === 0) {
      return res.status(400).json({ error: 'You do not own this character' });
    }
    
    const character = userWithChars.Characters[0];
    
    // Get current slots
    let dojoSlots = user.dojoSlots || [];
    
    // Ensure array is proper length
    while (dojoSlots.length < maxSlots) {
      dojoSlots.push(null);
    }
    
    // Check if character is already assigned to another slot
    const existingSlot = dojoSlots.findIndex(id => id === characterId);
    if (existingSlot !== -1 && existingSlot !== slotIndex) {
      return res.status(400).json({ error: 'Character already assigned to another slot' });
    }
    
    // Assign character
    dojoSlots[slotIndex] = characterId;
    user.dojoSlots = dojoSlots;
    
    // Initialize last claim if first assignment
    if (!user.dojoLastClaim) {
      user.dojoLastClaim = new Date();
    }
    
    await user.save();
    
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
    console.error('Dojo assign error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dojo/unassign
 * Remove a character from a training slot
 */
router.post('/unassign', auth, async (req, res) => {
  try {
    const { slotIndex } = req.body;
    
    if (slotIndex === undefined) {
      return res.status(400).json({ error: 'slotIndex required' });
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let dojoSlots = user.dojoSlots || [];
    
    // Validate slot index
    if (slotIndex < 0 || slotIndex >= dojoSlots.length) {
      return res.status(400).json({ error: 'Invalid slot index' });
    }
    
    const removedCharId = dojoSlots[slotIndex];
    if (!removedCharId) {
      return res.status(400).json({ error: 'Slot is already empty' });
    }
    
    // Get character name for message
    const character = await Character.findByPk(removedCharId);
    
    // Remove from slot
    dojoSlots[slotIndex] = null;
    user.dojoSlots = dojoSlots;
    await user.save();
    
    res.json({
      success: true,
      message: character ? `${character.name} stopped training.` : 'Character removed from training.',
      slotIndex
    });
    
  } catch (err) {
    console.error('Dojo unassign error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dojo/claim
 * Claim accumulated rewards
 */
router.post('/claim', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Rate limiting
    const lastClaim = claimCooldowns.get(userId);
    const now = Date.now();
    if (lastClaim && (now - lastClaim) < DOJO_CONFIG.minClaimInterval * 1000) {
      const remaining = Math.ceil((DOJO_CONFIG.minClaimInterval * 1000 - (now - lastClaim)) / 1000);
      return res.status(429).json({
        error: 'Too fast',
        message: `Please wait ${remaining} seconds`,
        retryAfter: remaining
      });
    }
    claimCooldowns.set(userId, now);
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const dojoSlots = user.dojoSlots || [];
    const upgrades = user.dojoUpgrades || { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    const capHours = upgrades.capHours || DOJO_CONFIG.defaultCapHours;
    
    // Check if there's anything to claim
    if (!user.dojoLastClaim) {
      return res.status(400).json({ error: 'No rewards to claim' });
    }
    
    // Get characters in slots with level info
    const characterIds = dojoSlots.filter(id => id !== null);
    if (characterIds.length === 0) {
      return res.status(400).json({ error: 'No characters training' });
    }
    
    // Get characters with their levels from junction table
    const userCharacters = await UserCharacter.findAll({
      where: {
        UserId: userId,
        CharacterId: characterIds
      },
      include: [{ model: Character }]
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
      .filter(c => c !== null);
    
    // Calculate time elapsed
    const lastClaimTime = new Date(user.dojoLastClaim);
    const elapsedMs = new Date() - lastClaimTime;
    const elapsedHours = Math.min(elapsedMs / (1000 * 60 * 60), capHours);
    
    if (elapsedHours < 0.01) { // Less than ~36 seconds
      return res.status(400).json({ error: 'Not enough time accumulated' });
    }
    
    // Calculate rewards (active claim bonus)
    const rewards = calculateRewards(activeCharacters, elapsedHours, upgrades, true);
    
    // Apply rewards
    user.points += rewards.points;
    user.rollTickets = (user.rollTickets || 0) + rewards.rollTickets;
    user.premiumTickets = (user.premiumTickets || 0) + rewards.premiumTickets;
    user.dojoLastClaim = new Date();
    
    await user.save();
    
    res.json({
      success: true,
      rewards: {
        points: rewards.points,
        rollTickets: rewards.rollTickets,
        premiumTickets: rewards.premiumTickets
      },
      breakdown: rewards.breakdown,
      synergies: rewards.synergies,
      activeBonus: rewards.activeMultiplier > 1,
      hoursAccumulated: Math.floor(elapsedHours * 100) / 100,
      newTotals: {
        points: user.points,
        rollTickets: user.rollTickets,
        premiumTickets: user.premiumTickets
      }
    });
    
  } catch (err) {
    console.error('Dojo claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dojo/upgrade
 * Purchase a dojo upgrade
 */
router.post('/upgrade', auth, async (req, res) => {
  try {
    const { upgradeType, rarity } = req.body; // rarity only for mastery upgrades
    
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
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const upgrades = user.dojoUpgrades || { slots: 3, capHours: 8, intensity: 0, masteries: {} };
    
    // Get cost
    const cost = getUpgradeCost(upgradeType, upgrades, rarity);
    if (cost === null) {
      return res.status(400).json({ error: 'Upgrade already maxed or not available' });
    }
    
    // Check if user can afford
    if (user.points < cost) {
      return res.status(400).json({
        error: 'Not enough points',
        required: cost,
        current: user.points
      });
    }
    
    // Apply upgrade
    user.points -= cost;
    
    switch (upgradeType) {
      case 'slot':
        upgrades.slots = (upgrades.slots || DOJO_CONFIG.defaultSlots) + 1;
        // Extend dojoSlots array
        const dojoSlots = user.dojoSlots || [];
        while (dojoSlots.length < upgrades.slots) {
          dojoSlots.push(null);
        }
        user.dojoSlots = dojoSlots;
        break;
        
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
    await user.save();
    
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
    console.error('Dojo upgrade error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

