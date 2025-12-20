const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, Character } = require('../models');
const { 
  PRICING_CONFIG, 
  getDiscountForCount,
  getStandardRates,
  getPityRates,
  rollRarity
} = require('../config/pricing');
const { getUserAllowR18 } = require('../utils/userPreferences');

// ===========================================
// SECURITY: Race condition protection
// ===========================================
// Prevent concurrent roll requests per user (could cause double-spending)
const rollInProgress = new Set();

// Multi-roll endpoint (10 characters at once)
router.post('/roll-multi', auth, async (req, res) => {
  const userId = req.user.id;
  
  // Prevent race condition - only one roll at a time per user
  if (rollInProgress.has(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  rollInProgress.add(userId);
  
  try {
    const count = Math.min(req.body.count || 10, PRICING_CONFIG.maxPulls);
    const basePoints = count * PRICING_CONFIG.baseCost;
    const discount = getDiscountForCount(count);
    const finalCost = Math.floor(basePoints * (1 - discount));
    
    const user = await User.findByPk(userId);
    if (user.points < finalCost) {
      rollInProgress.delete(userId);
      return res.status(400).json({ error: `Not enough points. Required: ${finalCost}` });
    }
    
    user.points -= finalCost;
    await user.save();
    
    // Pity system: guarantee at least one rare+ for 10-pulls
    const guaranteedRare = count >= 10;
    
    // Get user's R18 preference
    const allowR18 = await getUserAllowR18(userId);
    
    // Get all characters, filtered by R18 preference
    const allCharacters = await Character.findAll();
    const characters = allowR18 
      ? allCharacters 
      : allCharacters.filter(char => !char.isR18);
    
    const charactersByRarity = {
      common: characters.filter(char => char.rarity === 'common'),
      uncommon: characters.filter(char => char.rarity === 'uncommon'),
      rare: characters.filter(char => char.rarity === 'rare'),
      epic: characters.filter(char => char.rarity === 'epic'),
      legendary: characters.filter(char => char.rarity === 'legendary')
    };
    
    // Use centralized rates from pricing config
    const dropRates = getStandardRates(count >= 10);
    const pityRates = getPityRates();
    
    let results = [];
    let hasRarePlus = false;
    
    for (let i = 0; i < count; i++) {
      const isLastRoll = (i === count - 1);
      const needsPity = guaranteedRare && isLastRoll && !hasRarePlus;
      
      // Use centralized rollRarity helper
      const currentRates = needsPity ? pityRates : dropRates;
      let selectedRarity = rollRarity(currentRates);
      
      if (['rare', 'epic', 'legendary'].includes(selectedRarity)) {
        hasRarePlus = true;
      }
      
      // Fallback if no characters of selected rarity exist
      if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
        const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
        const rarityIndex = rarityOrder.indexOf(selectedRarity);
        
        for (let j = rarityIndex + 1; j < rarityOrder.length; j++) {
          const fallbackRarity = rarityOrder[j];
          if (charactersByRarity[fallbackRarity]?.length > 0) {
            selectedRarity = fallbackRarity;
            break;
          }
        }
        
        // Final fallback: pick random from all
        if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
          const randomChar = characters[Math.floor(Math.random() * characters.length)];
          results.push(randomChar);
          await user.addCharacter(randomChar);
          continue;
        }
      }
      
      const rareCharacters = charactersByRarity[selectedRarity];
      const randomChar = rareCharacters[Math.floor(Math.random() * rareCharacters.length)];
      
      await user.addCharacter(randomChar);
      results.push(randomChar);
    }
    
    console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll with ${hasRarePlus ? 'rare+' : 'no rare+'} result (cost: ${finalCost}, discount: ${discount * 100}%)`);
    
    rollInProgress.delete(userId);
    
    res.json({
      characters: results,
      updatedPoints: user.points
    });
  } catch (err) {
    rollInProgress.delete(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pricing configuration for standard pulls
router.get('/pricing', (req, res) => {
  const singlePullCost = PRICING_CONFIG.baseCost;
  
  res.json({
    ...PRICING_CONFIG,
    singlePullCost,
    // Pre-calculated costs for quick select options
    pullOptions: PRICING_CONFIG.quickSelectOptions.map(count => {
      const discount = getDiscountForCount(count);
      const baseCost = count * singlePullCost;
      const finalCost = Math.floor(baseCost * (1 - discount));
      return {
        count,
        discount,
        discountPercent: Math.round(discount * 100),
        baseCost,
        finalCost,
        savings: baseCost - finalCost
      };
    })
  });
});

// Roll a single character
router.post('/roll', auth, async (req, res) => {
  const userId = req.user.id;
  
  // Prevent race condition - only one roll at a time per user
  if (rollInProgress.has(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  rollInProgress.add(userId);
  
  try {
    const user = await User.findByPk(userId);
    if (user.points < PRICING_CONFIG.baseCost) {
      rollInProgress.delete(userId);
      return res.status(400).json({ error: 'Not enough points' });
    }
    
    user.points -= PRICING_CONFIG.baseCost;
    await user.save();
    
    // Get user's R18 preference
    const allowR18 = await getUserAllowR18(userId);
    
    // Get all characters, filtered by R18 preference
    const allCharacters = await Character.findAll();
    const characters = allowR18 
      ? allCharacters 
      : allCharacters.filter(char => !char.isR18);
    
    const charactersByRarity = {
      common: characters.filter(char => char.rarity === 'common'),
      uncommon: characters.filter(char => char.rarity === 'uncommon'),
      rare: characters.filter(char => char.rarity === 'rare'),
      epic: characters.filter(char => char.rarity === 'epic'),
      legendary: characters.filter(char => char.rarity === 'legendary')
    };
    
    // Use centralized rates from pricing config
    const dropRates = getStandardRates(false);
    
    // Use centralized rollRarity helper
    let selectedRarity = rollRarity(dropRates);
    
    // Fallback if no characters of selected rarity exist
    if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
      const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
      const rarityIndex = rarityOrder.indexOf(selectedRarity);
      
      for (let i = rarityIndex + 1; i < rarityOrder.length; i++) {
        const fallbackRarity = rarityOrder[i];
        if (charactersByRarity[fallbackRarity]?.length > 0) {
          selectedRarity = fallbackRarity;
          break;
        }
      }
      
      // Final fallback: pick random from all
      if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
        const randomChar = characters[Math.floor(Math.random() * characters.length)];
        await user.addCharacter(randomChar);
        console.log(`User ${user.username} (ID: ${user.id}) rolled ${randomChar.name} (fallback random)`);
        rollInProgress.delete(userId);
        return res.json({
          ...randomChar.toJSON(),
          updatedPoints: user.points
        });
      }
    }
    
    const rareCharacters = charactersByRarity[selectedRarity];
    const randomChar = rareCharacters[Math.floor(Math.random() * rareCharacters.length)];
    
    await user.addCharacter(randomChar);
    
    console.log(`User ${user.username} (ID: ${user.id}) rolled ${randomChar.name} (${selectedRarity})`);
    
    rollInProgress.delete(userId);
    
    res.json({
      ...randomChar.toJSON(),
      updatedPoints: user.points
    });
  } catch (err) {
    rollInProgress.delete(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's collection (filtered by R18 preference)
router.get('/collection', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const allowR18 = await getUserAllowR18(req.user.id);
    
    let characters = await user.getCharacters();
    
    // Filter out R18 characters if user hasn't enabled R18 content
    if (!allowR18) {
      characters = characters.filter(char => !char.isR18);
    }
    
    res.json(characters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Combined collection data endpoint - single request for collection page
router.get('/collection-data', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const allowR18 = await getUserAllowR18(req.user.id);
    
    // Get user's collection and all characters in parallel
    let [collection, allCharacters] = await Promise.all([
      user.getCharacters(),
      Character.findAll()
    ]);
    
    // Filter R18 content if not enabled
    if (!allowR18) {
      collection = collection.filter(char => !char.isR18);
      allCharacters = allCharacters.filter(char => !char.isR18);
    }
    
    res.json({ collection, allCharacters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all characters (filtered by R18 preference if authenticated)
router.get('/', async (req, res) => {
  try {
    let characters = await Character.findAll();
    
    // If user is authenticated, filter based on their R18 preference
    // Check for auth token without requiring it
    const token = req.header('x-auth-token');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const allowR18 = await getUserAllowR18(decoded.user.id);
        if (!allowR18) {
          characters = characters.filter(char => !char.isR18);
        }
      } catch (e) {
        // Invalid token - filter out R18 by default
        characters = characters.filter(char => !char.isR18);
      }
    } else {
      // No auth - filter out R18 by default
      characters = characters.filter(char => !char.isR18);
    }
    
    res.json(characters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;