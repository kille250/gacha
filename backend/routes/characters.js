const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, Character } = require('../models');
const { 
  PRICING_CONFIG, 
  getDiscountForCount,
  getStandardRates,
  getPityRates,
  rollRarity,
  getRarities,
  getOrderedRarities
} = require('../config/pricing');
const { getUserAllowR18, getR18PreferenceFromRequest } = require('../utils/userPreferences');
const { 
  acquireRollLock,
  releaseRollLock,
  groupCharactersByRarity, 
  selectCharacterWithFallback, 
  filterR18Characters,
  isRarePlus 
} = require('../utils/rollHelpers');

// Multi-roll endpoint (10 characters at once)
router.post('/roll-multi', auth, async (req, res) => {
  const userId = req.user.id;
  
  if (!acquireRollLock(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  
  try {
    const count = Math.min(req.body.count || 10, PRICING_CONFIG.maxPulls);
    const basePoints = count * PRICING_CONFIG.baseCost;
    const discount = getDiscountForCount(count);
    const finalCost = Math.floor(basePoints * (1 - discount));
    
    const user = await User.findByPk(userId);
    if (user.points < finalCost) {
      releaseRollLock(userId);
      return res.status(400).json({ error: `Not enough points. Required: ${finalCost}` });
    }
    
    user.points -= finalCost;
    await user.save();
    
    // Pity system: guarantee at least one rare+ for 10-pulls
    const guaranteedRare = count >= 10;
    
    // Get user's R18 preference and filter characters
    const allowR18 = await getUserAllowR18(userId);
    const allCharacters = await Character.findAll();
    const characters = filterR18Characters(allCharacters, allowR18);
    
    // Load rarities from database
    const raritiesData = await getRarities();
    const orderedRarities = raritiesData.map(r => r.name);
    const charactersByRarity = groupCharactersByRarity(characters, orderedRarities);
    
    // Use centralized rates from pricing config (async)
    const dropRates = await getStandardRates(count >= 10, raritiesData);
    const pityRates = await getPityRates(raritiesData);
    
    let results = [];
    let hasRarePlusResult = false;
    
    for (let i = 0; i < count; i++) {
      const isLastRoll = (i === count - 1);
      const needsPity = guaranteedRare && isLastRoll && !hasRarePlusResult;
      
      // Use centralized rollRarity helper
      const currentRates = needsPity ? pityRates : dropRates;
      const selectedRarity = rollRarity(currentRates, orderedRarities);
      
      if (isRarePlus(selectedRarity, raritiesData)) {
        hasRarePlusResult = true;
      }
      
      // Select character with fallback logic
      const { character } = selectCharacterWithFallback(
        null, // No primary pool for standard rolls
        charactersByRarity,
        selectedRarity,
        characters,
        raritiesData
      );
      
      await user.addCharacter(character);
      results.push(character);
    }
    
    console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll with ${hasRarePlusResult ? 'rare+' : 'no rare+'} result (cost: ${finalCost}, discount: ${discount * 100}%)`);
    
    releaseRollLock(userId);
    
    res.json({
      characters: results,
      updatedPoints: user.points
    });
  } catch (err) {
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pricing configuration for standard pulls
router.get('/pricing', async (req, res) => {
  try {
    const singlePullCost = PRICING_CONFIG.baseCost;
    const raritiesData = await getRarities();
    const standardRates = await getStandardRates(false, raritiesData);
    
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
      }),
      dropRates: standardRates,
      rarities: raritiesData.map(r => ({ 
        name: r.name, 
        displayName: r.displayName, 
        color: r.color,
        order: r.order 
      }))
    });
  } catch (err) {
    console.error('Error fetching pricing:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Roll a single character
router.post('/roll', auth, async (req, res) => {
  const userId = req.user.id;
  
  if (!acquireRollLock(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  
  try {
    const user = await User.findByPk(userId);
    if (user.points < PRICING_CONFIG.baseCost) {
      releaseRollLock(userId);
      return res.status(400).json({ error: 'Not enough points' });
    }
    
    user.points -= PRICING_CONFIG.baseCost;
    await user.save();
    
    // Get user's R18 preference and filter characters
    const allowR18 = await getUserAllowR18(userId);
    const allCharacters = await Character.findAll();
    const characters = filterR18Characters(allCharacters, allowR18);
    
    // Load rarities from database
    const raritiesData = await getRarities();
    const orderedRarities = raritiesData.map(r => r.name);
    const charactersByRarity = groupCharactersByRarity(characters, orderedRarities);
    
    // Use centralized rates from pricing config (async)
    const dropRates = await getStandardRates(false, raritiesData);
    const selectedRarity = rollRarity(dropRates, orderedRarities);
    
    // Select character with fallback logic
    const { character, actualRarity } = selectCharacterWithFallback(
      null, // No primary pool for standard rolls
      charactersByRarity,
      selectedRarity,
      characters,
      raritiesData
    );
    
    await user.addCharacter(character);
    
    console.log(`User ${user.username} (ID: ${user.id}) rolled ${character.name} (${actualRarity})`);
    
    releaseRollLock(userId);
    
    res.json({
      ...character.toJSON(),
      updatedPoints: user.points
    });
  } catch (err) {
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's collection (filtered by R18 preference)
router.get('/collection', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const allowR18 = await getUserAllowR18(req.user.id);
    const characters = await user.getCharacters();
    
    res.json(filterR18Characters(characters, allowR18));
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
    const [collection, allCharacters] = await Promise.all([
      user.getCharacters(),
      Character.findAll()
    ]);
    
    res.json({ 
      collection: filterR18Characters(collection, allowR18), 
      allCharacters: filterR18Characters(allCharacters, allowR18) 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all characters (filtered by R18 preference if authenticated)
router.get('/', async (req, res) => {
  try {
    const characters = await Character.findAll();
    const allowR18 = await getR18PreferenceFromRequest(req);
    res.json(filterR18Characters(characters, allowR18));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
