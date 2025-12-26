/**
 * Game Enhancements API Routes
 *
 * Exposes the enhanced game features:
 * - Dojo enhancements (specializations, breakthroughs, facilities)
 * - Fishing enhancements (bait, double-or-nothing)
 * - Gacha enhancements (milestones, fate points)
 * - Retention systems (voyages, mastery, daily menu)
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { enforcementMiddleware } = require('../middleware/enforcement');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');
const { deviceBindingMiddleware } = require('../middleware/deviceBinding');
const { User, Character, UserCharacter, sequelize } = require('../models');

// Service imports
const dojoEnhanced = require('../services/dojoEnhancedService');
const fishingEnhanced = require('../services/fishingEnhancedService');
const gachaEnhanced = require('../services/gachaEnhancedService');
const retention = require('../services/retentionService');

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

    const userCharacter = await UserCharacter.findOne({
      where: { UserId: req.user.id, CharacterId: characterId },
      include: [{ model: Character }],
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
 * Exchange fate points for guaranteed featured character
 */
router.post('/gacha/fate-points/exchange', [auth, enforcementMiddleware, deviceBindingMiddleware('gacha'), sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { bannerId } = req.body;

    if (!bannerId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'bannerId required' });
    }

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const result = gachaEnhanced.exchangeFatePoints(user, bannerId);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    // Mark that next pull is guaranteed featured
    const bannerPities = user.bannerPity || {};
    bannerPities[bannerId] = bannerPities[bannerId] || {};
    bannerPities[bannerId].fatePointsGuarantee = true;
    user.bannerPity = bannerPities;

    await user.save({ transaction });
    await transaction.commit();

    res.json(result);
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
 * GET /api/enhancements/voyage
 * Get current weekly voyage
 */
router.get('/voyage', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const voyage = retention.getActiveVoyage(user);

    res.json(voyage);
  } catch (err) {
    console.error('Voyage error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/voyage/claim-chapter
 * Claim voyage chapter reward
 */
router.post('/voyage/claim-chapter', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { chapterIndex } = req.body;

    const user = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const result = retention.claimVoyageChapterReward(user, chapterIndex);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Voyage claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/voyage/claim-complete
 * Claim voyage completion reward
 */
router.post('/voyage/claim-complete', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
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

    const result = retention.claimVoyageCompletionReward(user);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Voyage complete claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/enhancements/daily-menu
 * Get daily activity menu
 */
router.get('/daily-menu', [auth, enforcementMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const menu = retention.getDailyActivityMenu(user);

    // Save any generated activities
    await user.save();

    res.json(menu);
  } catch (err) {
    console.error('Daily menu error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/enhancements/daily-menu/claim
 * Claim daily bonus
 */
router.post('/daily-menu/claim', [auth, enforcementMiddleware, sensitiveActionLimiter], async (req, res) => {
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

    const result = retention.claimDailyBonus(user);

    if (!result.success) {
      await transaction.rollback();
      return res.status(400).json({ error: result.error });
    }

    await user.save({ transaction });
    await transaction.commit();

    res.json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Daily claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

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

module.exports = router;
