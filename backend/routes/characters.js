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
  acquireMultipleCharacters,
  levelUpCharacter,
  LEVELING_CONFIG,
  getShardsToLevel
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
    
    // Add character to user's collection (shards on duplicates, bonus points if max level)
    const acquisition = await acquireCharacter(userId, result.character.id, user);
    
    const shardInfo = acquisition.isDuplicate 
      ? acquisition.isMaxLevel 
        ? `(max level → +${acquisition.bonusPoints} pts)` 
        : `(+1 shard, total: ${acquisition.shards})`
      : '(new)';
    console.log(`User ${user.username} (ID: ${user.id}) rolled ${result.character.name} (${result.actualRarity}) ${shardInfo}`);
    
    releaseRollLock(userId);
    
    // Refetch user points if bonus was awarded
    const finalPoints = acquisition.bonusPoints > 0 ? user.points : user.points;
    
    res.json({
      ...result.character.toJSON(),
      updatedPoints: finalPoints,
      acquisition: {
        isNew: acquisition.isNew,
        isDuplicate: acquisition.isDuplicate,
        level: acquisition.level,
        shards: acquisition.shards,
        isMaxLevel: acquisition.isMaxLevel,
        bonusPoints: acquisition.bonusPoints,
        canLevelUp: acquisition.canLevelUp
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
    
    // Add all characters to collection (shards on duplicates, bonus points if max)
    const characters = results.map(r => r.character).filter(c => c);
    const acquisitions = await acquireMultipleCharacters(userId, characters, user);
    
    // Build character results with acquisition info
    const charactersWithLevels = results.map(r => {
      if (!r.character) return null;
      const acq = acquisitions.find(a => a.characterId === r.character.id);
      return {
        ...r.character.toJSON ? r.character.toJSON() : r.character,
        acquisition: acq ? {
          isNew: acq.isNew,
          isDuplicate: acq.isDuplicate,
          level: acq.level,
          shards: acq.shards,
          isMaxLevel: acq.isMaxLevel,
          bonusPoints: acq.bonusPoints
        } : null
      };
    }).filter(c => c);
    
    const newCards = acquisitions.filter(a => a.isNew).length;
    const shardsGained = acquisitions.filter(a => a.isDuplicate && !a.isMaxLevel).length;
    const bonusPointsTotal = acquisitions.reduce((sum, a) => sum + (a.bonusPoints || 0), 0);
    
    console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll (cost: ${finalCost}, new: ${newCards}, shards: ${shardsGained}, bonus pts: ${bonusPointsTotal})`);
    
    releaseRollLock(userId);
    
    res.json({
      characters: charactersWithLevels,
      updatedPoints: user.points,
      summary: {
        newCards,
        shardsGained,
        bonusPoints: bonusPointsTotal,
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
      .map(uc => {
        const isMax = uc.level >= LEVELING_CONFIG.maxLevel;
        const shardsNeeded = getShardsToLevel(uc.level);
        return {
          ...uc.Character.toJSON(),
          level: uc.level,
          shards: uc.duplicateCount,
          isMaxLevel: isMax,
          shardsToNextLevel: shardsNeeded,
          canLevelUp: !isMax && uc.duplicateCount >= shardsNeeded
        };
      });
    
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
      .map(uc => {
        const isMax = uc.level >= LEVELING_CONFIG.maxLevel;
        const shardsNeeded = getShardsToLevel(uc.level);
        return {
          ...uc.Character.toJSON(),
          level: uc.level,
          shards: uc.duplicateCount,
          isMaxLevel: isMax,
          shardsToNextLevel: shardsNeeded,
          canLevelUp: !isMax && uc.duplicateCount >= shardsNeeded
        };
      });
    
    const allCharacters = await Character.findAll();
    
    res.json({ 
      collection: filterR18Characters(collection, allowR18), 
      allCharacters: filterR18Characters(allCharacters, allowR18),
      levelingConfig: {
        maxLevel: LEVELING_CONFIG.maxLevel,
        shardsToLevel: LEVELING_CONFIG.shardsToLevel,
        maxLevelBonusPoints: LEVELING_CONFIG.maxLevelDuplicatePoints
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Batch max level all upgradable characters
 * POST /api/characters/level-up-all
 * 
 * Upgrades all characters to their maximum possible level based on available shards.
 * Returns summary of upgraded characters with total levels gained.
 */
router.post('/level-up-all', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all user's characters with their data
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: userId },
      include: [{ model: Character, attributes: ['id', 'name', 'rarity'] }],
      order: [['CharacterId', 'ASC']]
    });
    
    // Filter to only upgradable characters
    const upgradable = userCharacters.filter(uc => {
      if (!uc.Character) return false;
      const shardsNeeded = getShardsToLevel(uc.level);
      return shardsNeeded !== null && uc.duplicateCount >= shardsNeeded;
    });
    
    if (upgradable.length === 0) {
      return res.json({ 
        success: true, 
        total: 0,
        upgraded: 0,
        totalLevelsGained: 0,
        results: [], 
        message: 'No characters can be upgraded' 
      });
    }
    
    // Process each character - upgrade to max possible level
    const results = [];
    let totalLevelsGained = 0;
    
    for (const uc of upgradable) {
      const charResult = {
        characterId: uc.CharacterId,
        characterName: uc.Character?.name,
        rarity: uc.Character?.rarity,
        startLevel: uc.level,
        levelsGained: 0,
        finalLevel: uc.level,
        isMaxLevel: false
      };
      
      // Keep upgrading until we can't anymore
      let keepUpgrading = true;
      while (keepUpgrading) {
        const result = await levelUpCharacter(userId, uc.CharacterId);
        if (result.success) {
          charResult.levelsGained++;
          charResult.finalLevel = result.newLevel;
          charResult.isMaxLevel = result.isMaxLevel;
          totalLevelsGained++;
          
          // Stop if max level reached
          if (result.isMaxLevel) {
            keepUpgrading = false;
          }
        } else {
          // Not enough shards for next level
          keepUpgrading = false;
        }
      }
      
      results.push(charResult);
    }
    
    const successCount = results.filter(r => r.levelsGained > 0).length;
    
    console.log(`User ${userId} batch max-leveled ${successCount} characters (+${totalLevelsGained} levels total)`);
    
    res.json({
      success: true,
      total: upgradable.length,
      upgraded: successCount,
      totalLevelsGained,
      results,
      message: successCount === 1 
        ? `Maxed ${results[0].characterName} (+${results[0].levelsGained} levels)!`
        : `Upgraded ${successCount} character(s) (+${totalLevelsGained} levels)`
    });
  } catch (err) {
    console.error('Batch level up error:', err);
    res.status(500).json({ error: 'Failed to batch level up characters' });
  }
});

/**
 * Level up a character (manual action)
 * POST /api/characters/:id/level-up
 */
router.post('/:id/level-up', auth, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id, 10);
    
    if (isNaN(characterId) || characterId <= 0) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }
    
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const result = await levelUpCharacter(req.user.id, characterId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`User ${req.user.id} leveled up ${character.name}: Lv.${result.previousLevel} → Lv.${result.newLevel}`);
    
    res.json({
      ...result,
      character: {
        id: character.id,
        name: character.name,
        rarity: character.rarity
      }
    });
  } catch (err) {
    console.error('Level up error:', err);
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
