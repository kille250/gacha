const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, Character, UserCharacter } = require('../models');
const { 
  PRICING_CONFIG, 
  getDiscountForCount,
  getStandardRates,
  getRarities
} = require('../config/pricing');
const { getUserAllowR18, getR18PreferenceFromRequest } = require('../utils/userPreferences');
const { 
  acquireRollLock,
  releaseRollLock,
  filterR18Characters
} = require('../utils/rollHelpers');
const {
  buildStandardRollContext,
  executeSingleStandardRoll,
  executeStandardMultiRoll
} = require('../utils/rollEngine');
const {
  acquireCharacter,
  acquireMultipleCharacters
} = require('../utils/characterLeveling');

// ===========================================
// ROLL ENDPOINTS
// ===========================================

/**
 * Roll a single character
 * POST /api/characters/roll
 */
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
    
    // Deduct points
    user.points -= PRICING_CONFIG.baseCost;
    await user.save();
    
    // Build roll context
    const allowR18 = await getUserAllowR18(userId);
    const allCharacters = await Character.findAll();
    const context = await buildStandardRollContext(allCharacters, allowR18);
    
    // Execute roll
    const result = await executeSingleStandardRoll(context, false);
    
    // Safety check: refund if no character available
    if (!result.character) {
      user.points += PRICING_CONFIG.baseCost;
      await user.save();
      releaseRollLock(userId);
      return res.status(400).json({ error: 'No characters available to roll' });
    }
    
    // Add character to user's collection (with leveling on duplicates)
    const acquisition = await acquireCharacter(userId, result.character.id);
    
    const levelInfo = acquisition.isDuplicate 
      ? `(duplicate → Lv.${acquisition.newLevel}${acquisition.leveledUp ? ' LEVEL UP!' : ''})` 
      : '(new)';
    console.log(`User ${user.username} (ID: ${user.id}) rolled ${result.character.name} (${result.actualRarity}) ${levelInfo}`);
    
    releaseRollLock(userId);
    
    res.json({
      ...result.character.toJSON(),
      updatedPoints: user.points,
      acquisition: {
        isNew: acquisition.isNew,
        isDuplicate: acquisition.isDuplicate,
        leveledUp: acquisition.leveledUp,
        previousLevel: acquisition.previousLevel,
        level: acquisition.newLevel,
        isMaxLevel: acquisition.isMaxLevel
      }
    });
  } catch (err) {
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Multi-roll endpoint
 * POST /api/characters/roll-multi
 */
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
    
    // Calculate cost with discount
    const basePoints = count * PRICING_CONFIG.baseCost;
    const discount = getDiscountForCount(count);
    const finalCost = Math.floor(basePoints * (1 - discount));
    
    const user = await User.findByPk(userId);
    
    if (user.points < finalCost) {
      releaseRollLock(userId);
      return res.status(400).json({ error: `Not enough points. Required: ${finalCost}` });
    }
    
    // Deduct points
    user.points -= finalCost;
    await user.save();
    
    // Build roll context
    const allowR18 = await getUserAllowR18(userId);
    const allCharacters = await Character.findAll();
    const context = await buildStandardRollContext(allCharacters, allowR18);
    
    // Execute multi-roll
    const results = await executeStandardMultiRoll(context, count);
    
    // Add all characters to collection (with leveling on duplicates)
    const characters = results.map(r => r.character).filter(c => c);
    const acquisitions = await acquireMultipleCharacters(userId, characters);
    
    // Build character results with acquisition info
    const charactersWithLevels = results.map(r => {
      if (!r.character) return null;
      const acq = acquisitions.find(a => a.characterId === r.character.id);
      return {
        ...r.character.toJSON ? r.character.toJSON() : r.character,
        acquisition: acq ? {
          isNew: acq.isNew,
          isDuplicate: acq.isDuplicate,
          leveledUp: acq.leveledUp,
          level: acq.newLevel,
          isMaxLevel: acq.isMaxLevel
        } : null
      };
    }).filter(c => c);
    
    const hasRarePlus = results.some(r => r.wasPity || ['rare', 'epic', 'legendary'].includes(r.actualRarity));
    const levelUps = acquisitions.filter(a => a.leveledUp).length;
    const newCards = acquisitions.filter(a => a.isNew).length;
    
    console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll with ${hasRarePlus ? 'rare+' : 'no rare+'} result (cost: ${finalCost}, discount: ${discount * 100}%, new: ${newCards}, levelups: ${levelUps})`);
    
    releaseRollLock(userId);
    
    res.json({
      characters: charactersWithLevels,
      updatedPoints: user.points,
      summary: {
        newCards,
        levelUps,
        duplicates: acquisitions.filter(a => a.isDuplicate).length
      }
    });
  } catch (err) {
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// PRICING ENDPOINT
// ===========================================

/**
 * Get pricing configuration for standard pulls
 * GET /api/characters/pricing
 */
router.get('/pricing', async (req, res) => {
  try {
    const singlePullCost = PRICING_CONFIG.baseCost;
    const raritiesData = await getRarities();
    const standardRates = await getStandardRates(false, raritiesData);
    
    res.json({
      ...PRICING_CONFIG,
      singlePullCost,
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

// ===========================================
// COLLECTION ENDPOINTS
// ===========================================

/**
 * Get user's collection (filtered by R18 preference)
 * GET /api/characters/collection
 */
router.get('/collection', auth, async (req, res) => {
  try {
    const allowR18 = await getUserAllowR18(req.user.id);
    
    // Get characters with level info from junction table
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: req.user.id },
      include: [{ model: Character }]
    });
    
    const collection = userCharacters
      .filter(uc => uc.Character)
      .map(uc => ({
        ...uc.Character.toJSON(),
        level: uc.level,
        duplicateCount: uc.duplicateCount,
        isMaxLevel: uc.level >= 5
      }));
    
    res.json(filterR18Characters(collection, allowR18));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Combined collection data endpoint - single request for collection page
 * GET /api/characters/collection-data
 */
router.get('/collection-data', auth, async (req, res) => {
  try {
    const allowR18 = await getUserAllowR18(req.user.id);
    
    // Get user's collection with level info
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: req.user.id },
      include: [{ model: Character }]
    });
    
    const collection = userCharacters
      .filter(uc => uc.Character)
      .map(uc => ({
        ...uc.Character.toJSON(),
        level: uc.level,
        duplicateCount: uc.duplicateCount,
        isMaxLevel: uc.level >= 5
      }));
    
    const allCharacters = await Character.findAll();
    
    res.json({ 
      collection: filterR18Characters(collection, allowR18), 
      allCharacters: filterR18Characters(allCharacters, allowR18) 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get all characters (filtered by R18 preference if authenticated)
 * GET /api/characters
 */
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
