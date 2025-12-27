/**
 * Game Enhancements API Routes
 *
 * Exposes the enhanced game features:
 * - Dojo enhancements (specializations, breakthroughs, facilities)
 * - Fishing enhancements (bait, double-or-nothing)
 * - Gacha enhancements (milestones, fate points)
 * - Retention systems (mastery, return bonus)
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { enforcementMiddleware } = require('../middleware/enforcement');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');
const { deviceBindingMiddleware } = require('../middleware/deviceBinding');
const { User, Character, UserCharacter, Banner, sequelize } = require('../models');

// Service imports
const dojoEnhanced = require('../services/dojoEnhancedService');
const fishingEnhanced = require('../services/fishingEnhancedService');
const gachaEnhanced = require('../services/gachaEnhancedService');
const retention = require('../services/retentionService');
const accountLevel = require('../services/accountLevelService');

// ===========================================
// DOJO ENHANCEMENTS
// ===========================================

/**
 * GET /api/enhancements/dojo/facility
 * Get current facility tier and available upgrades
 */
router.get('/dojo/facility', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const facilityInfo = dojoEnhanced.getFacilityTier(user);
    const trainingMethods = dojoEnhanced.getAvailableTrainingMethods(facilityInfo.current);

    res.json({
      facility: facilityInfo,
      trainingMethods
    });
  } catch (err) {
    console.error('Facility info error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/dojo/facility/upgrade
 * Upgrade to next facility tier
 */
router.post('/dojo/facility/upgrade', [auth, enforcementMiddleware, deviceBindingMiddleware('dojo'), sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { tierId } = req.body;

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const result = dojoEnhanced.unlockFacilityTier(user, tierId);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    // Deduct cost and unlock tier
    user.points -= result.cost;
    const unlockedTiers = user.dojoFacilityTiers || ['basic'];
    unlockedTiers.push(tierId);
    user.dojoFacilityTiers = unlockedTiers;

    await user.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      tier: result.tier,
      newPoints: user.points,
      newFeatures: result.newFeatures
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Facility upgrade error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/dojo/character/:id/specialization
 * Get available specializations for a character
 */
router.get('/dojo/character/:id/specialization', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);

    const userCharacter = await UserCharacter.findOne({
      where: { UserId: req.user.id, CharacterId: characterId },
      include: [{ model: Character }]
    });

    if (!userCharacter) {
      return res.status(404).json({ error: 'Character not found in collection' });
    }

    const specInfo = dojoEnhanced.getAvailableSpecializations(
      userCharacter.Character,
      userCharacter
    );

    res.json(specInfo);
  } catch (err) {
    console.error('Specialization info error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/dojo/character/:id/specialize
 * Apply a specialization to a character (permanent)
 */
router.post('/dojo/character/:id/specialize', [auth, enforcementMiddleware, deviceBindingMiddleware('dojo'), sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const characterId = parseInt(req.params.id);
    const { specializationId } = req.body;

    // Don't use include with lock - PostgreSQL doesn't allow FOR UPDATE on outer joins
    const userCharacter = await UserCharacter.findOne({
      where: { UserId: req.user.id, CharacterId: characterId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!userCharacter) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = dojoEnhanced.applySpecialization(userCharacter, specializationId);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    // Apply specialization (stored in UserCharacter)
    userCharacter.specialization = specializationId;
    await userCharacter.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      specialization: result.specialization,
      message: result.message
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Specialize error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// FISHING ENHANCEMENTS
// ===========================================

/**
 * GET /api/enhancements/fishing/bait
 * Get available baits and inventory
 */
router.get('/fishing/bait', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const baits = fishingEnhanced.getAvailableBaits(user);
    const inventory = fishingEnhanced.getBaitInventory(user);

    res.json({
      baits,
      inventory
    });
  } catch (err) {
    console.error('Bait info error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/fishing/bait/purchase
 * Purchase bait
 */
router.post('/fishing/bait/purchase', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { baitId, quantity = 1 } = req.body;

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const result = fishingEnhanced.purchaseBait(user, baitId, quantity);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      bait: result.bait,
      quantity: result.quantity,
      newInventory: result.newInventory
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Bait purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/fishing/double-or-nothing
 * Execute double-or-nothing gamble on a catch
 */
router.post('/fishing/double-or-nothing', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { fish, originalQuantity } = req.body;

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const result = fishingEnhanced.executeDoubleOrNothing(fish, originalQuantity);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    // Apply result to inventory (would integrate with fishing inventory system)
    // For now, just return the result
    await transaction.commit();

    res.json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Double or nothing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/fishing/visual-config/:rarity
 * Get visual effects configuration for a rarity
 */
router.get('/fishing/visual-config/:rarity', [auth], async (req, res) => {
  try {
    const { rarity } = req.params;
    const config = fishingEnhanced.getVisualConfig(rarity);
    res.json(config);
  } catch (err) {
    console.error('Visual config error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// GACHA ENHANCEMENTS
// ===========================================

/**
 * GET /api/enhancements/gacha/pity
 * Get detailed pity state
 */
router.get('/gacha/pity', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const { bannerId } = req.query;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get banner if specified
    let banner = null;
    if (bannerId) {
      const { Banner } = require('../models');
      banner = await Banner.findByPk(bannerId);
    }

    const pityState = gachaEnhanced.getPityState(user, banner);

    res.json(pityState);
  } catch (err) {
    console.error('Pity state error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/gacha/milestones
 * Get milestone rewards status
 */
router.get('/gacha/milestones', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const { bannerId = 'standard' } = req.query;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const milestones = gachaEnhanced.getMilestoneStatus(user, bannerId);

    res.json(milestones);
  } catch (err) {
    console.error('Milestones error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/gacha/milestones/claim
 * Claim a milestone reward
 */
router.post('/gacha/milestones/claim', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { bannerId = 'standard', milestonePulls } = req.body;

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const result = gachaEnhanced.claimMilestoneReward(user, bannerId, milestonePulls);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Milestone claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/gacha/fate-points
 * Get fate points status
 */
router.get('/gacha/fate-points', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const { bannerId } = req.query;

    if (!bannerId) {
      return res.status(400).json({ error: 'bannerId required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fatePoints = gachaEnhanced.getFatePointsStatus(user, bannerId);

    res.json(fatePoints);
  } catch (err) {
    console.error('Fate points error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/gacha/fate-points/exchange
 * Exchange fate points for rewards (selectors, pity reset)
 *
 * Body: {
 *   exchangeType: 'rare_selector' | 'epic_selector' | 'legendary_selector' | 'banner_pity_reset',
 *   bannerId: string (optional, used for pity reset context)
 * }
 */
router.post('/gacha/fate-points/exchange', [auth, enforcementMiddleware, deviceBindingMiddleware('gacha'), sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { exchangeType, bannerId } = req.body;

    if (!exchangeType) {
      await transaction.rollback();
      return res.status(400).json({ error: 'exchangeType required' });
    }

    // Validate exchange type
    const validTypes = ['rare_selector', 'epic_selector', 'legendary_selector', 'banner_pity_reset'];
    if (!validTypes.includes(exchangeType)) {
      await transaction.rollback();
      return res.status(400).json({ error: `Invalid exchangeType. Must be one of: ${validTypes.join(', ')}` });
    }

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Exchange fate points for the specified reward
    const result = gachaEnhanced.exchangeFatePoints(user, exchangeType, bannerId);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    await user.save({ transaction });
    await transaction.commit();

    // Return result with updated fate points status
    res.json({
      ...result,
      fatePoints: gachaEnhanced.getFatePointsStatus(user, bannerId)
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Fate points exchange error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// RETENTION SYSTEMS
// ===========================================

/**
 * GET /api/enhancements/mastery/character/:id
 * Get character mastery progress
 */
router.get('/mastery/character/:id', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mastery = retention.getCharacterMastery(user, characterId);

    res.json(mastery);
  } catch (err) {
    console.error('Mastery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/mastery/codex
 * Get fish codex progress
 */
router.get('/mastery/codex', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const codex = retention.getFishCodex(user);

    res.json(codex);
  } catch (err) {
    console.error('Codex error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/return-bonus
 * Check for rest-and-return bonus
 */
router.get('/return-bonus', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bonus = retention.checkRestAndReturnBonus(user);

    res.json({
      hasBonus: !!bonus,
      bonus
    });
  } catch (err) {
    console.error('Return bonus error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/return-bonus/claim
 * Claim rest-and-return bonus
 */
router.post('/return-bonus/claim', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const bonus = retention.checkRestAndReturnBonus(user);
    if (!bonus) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No bonus available' });
    }

    const result = retention.claimRestAndReturnBonus(user, bonus);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Return bonus claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// ACCOUNT LEVEL SYSTEM
// ===========================================

/**
 * GET /api/enhancements/account-level
 * Get current account level status
 */
router.get('/account-level', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const status = accountLevel.getAccountLevelStatus(user);

    res.json(status);
  } catch (err) {
    console.error('Account level status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/account-level/recalculate
 * Recalculate account XP from user progression data
 * Useful for fixing inconsistencies or initializing existing users
 */
router.post('/account-level/recalculate', [auth, enforcementMiddleware], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch user's collection with character rarity data
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: req.user.id },
      include: [{ model: Character, attributes: ['id', 'rarity'] }],
      transaction
    });

    const collection = userCharacters.map(uc => ({
      id: uc.CharacterId,
      rarity: uc.Character?.rarity || 'common',
      level: uc.level || 1
    }));

    // Recalculate XP
    const result = accountLevel.recalculateXP(user, collection);

    await user.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      ...result,
      status: accountLevel.getAccountLevelStatus(user)
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Account level recalculate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/account-level/check-requirement
 * Check if user meets a specific level requirement
 */
router.get('/account-level/check-requirement', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const { level } = req.query;
    const requiredLevel = parseInt(level) || 1;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = accountLevel.checkFacilityRequirement(user, requiredLevel);

    res.json(result);
  } catch (err) {
    console.error('Account level check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// CHARACTER SELECTORS
// ===========================================

/**
 * GET /api/enhancements/selectors
 * Get user's character selectors inventory
 */
router.get('/selectors', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const selectors = user.characterSelectors || [];

    // Filter to only unused selectors and add index for identification
    const availableSelectors = selectors
      .map((s, index) => ({ ...s, id: index }))
      .filter(s => !s.used);

    res.json({
      selectors: availableSelectors,
      total: selectors.length,
      available: availableSelectors.length,
      used: selectors.filter(s => s.used).length
    });
  } catch (err) {
    console.error('Get selectors error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/selectors/characters
 * Get available characters for a given rarity (for selector redemption)
 * If bannerId is provided, fetches characters from that banner's pool
 */
router.get('/selectors/characters', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const { rarity, bannerId } = req.query;

    if (!rarity || !['rare', 'epic', 'legendary'].includes(rarity)) {
      return res.status(400).json({ error: 'Valid rarity required (rare, epic, legendary)' });
    }

    let characters;

    if (bannerId) {
      // Fetch characters from the specific banner's pool
      const banner = await Banner.findByPk(bannerId, {
        include: [{
          model: Character,
          where: { rarity },
          attributes: ['id', 'name', 'rarity', 'element', 'imageUrl'],
          required: false
        }]
      });

      if (!banner) {
        return res.status(404).json({ error: 'Banner not found' });
      }

      characters = banner.Characters || [];
      // Sort by name
      characters.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Fallback: Get all characters of this rarity from global pool
      characters = await Character.findAll({
        where: { rarity },
        attributes: ['id', 'name', 'rarity', 'element', 'imageUrl'],
        order: [['name', 'ASC']]
      });
    }

    // Get user's collection to mark owned characters
    const userCharacters = await UserCharacter.findAll({
      where: { UserId: req.user.id },
      attributes: ['CharacterId']
    });
    const ownedIds = new Set(userCharacters.map(uc => uc.CharacterId));

    const charactersWithOwnership = characters.map(char => ({
      id: char.id,
      name: char.name,
      rarity: char.rarity,
      element: char.element,
      imageUrl: char.imageUrl,
      owned: ownedIds.has(char.id)
    }));

    res.json({
      rarity,
      bannerId: bannerId || null,
      characters: charactersWithOwnership,
      total: characters.length
    });
  } catch (err) {
    console.error('Get selector characters error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/selectors/use
 * Use a selector to claim a specific character
 */
router.post('/selectors/use', [auth, enforcementMiddleware, deviceBindingMiddleware('gacha'), sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { selectorIndex, characterId } = req.body;

    if (selectorIndex === undefined || selectorIndex === null) {
      await transaction.rollback();
      return res.status(400).json({ error: 'selectorIndex required' });
    }

    if (!characterId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'characterId required' });
    }

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const selectors = user.characterSelectors || [];

    // Validate selector index
    if (selectorIndex < 0 || selectorIndex >= selectors.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid selector index' });
    }

    const selector = selectors[selectorIndex];

    // Check if already used
    if (selector.used) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Selector already used' });
    }

    // Validate character exists and matches rarity
    const character = await Character.findByPk(characterId, { transaction });

    if (!character) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.rarity !== selector.rarity) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Selector is for ${selector.rarity} characters, but selected character is ${character.rarity}`
      });
    }

    // Mark selector as used
    selectors[selectorIndex] = {
      ...selector,
      used: true,
      usedAt: new Date().toISOString(),
      characterSelected: characterId
    };
    user.characterSelectors = selectors;

    // Add character to collection (or increase copies if already owned)
    let userCharacter = await UserCharacter.findOne({
      where: { UserId: user.id, CharacterId: characterId },
      transaction
    });

    let isNew = false;
    if (userCharacter) {
      // Already owned - increase copies
      userCharacter.copies = (userCharacter.copies || 1) + 1;
      await userCharacter.save({ transaction });
    } else {
      // New character
      isNew = true;
      userCharacter = await UserCharacter.create({
        UserId: user.id,
        CharacterId: characterId,
        copies: 1,
        level: 1
      }, { transaction });
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      character: {
        id: character.id,
        name: character.name,
        rarity: character.rarity,
        element: character.element,
        imageUrl: character.imageUrl
      },
      isNew,
      copies: userCharacter.copies,
      message: isNew
        ? `${character.name} has joined your collection!`
        : `${character.name} constellation increased! (${userCharacter.copies} copies)`,
      remainingSelectors: selectors.filter(s => !s.used).length
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Use selector error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
