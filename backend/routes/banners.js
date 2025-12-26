const express = require('express');
const router = express.Router();
const path = require('path');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { enforcementMiddleware } = require('../middleware/enforcement');
const { enforcePolicy } = require('../middleware/policies');
const { Banner, Character, User } = require('../models');
const { getUrlPath, getFilePath } = require('../config/upload');
const { safeUnlink } = require('../utils/fileUtils');
const { bannerUpload: upload } = require('../config/multer');
const { 
  PRICING_CONFIG, 
  getDiscountForCount,
  calculateBannerRates,
  getStandardRates,
  getPremiumRates,
  getPityRates,
  getBannerPullChance,
  roundRatesForDisplay,
  getRarities
} = require('../config/pricing');
const { isValidId, validateIdArray, parseCharacterIds } = require('../utils/validation');
const { getUserAllowR18, getR18PreferenceFromRequest } = require('../utils/userPreferences');
const { 
  acquireRollLock,
  releaseRollLock
} = require('../utils/rollHelpers');
const {
  buildBannerRollContext,
  executeSingleBannerRoll,
  executeBannerMultiRoll
} = require('../utils/rollEngine');
const {
  acquireCharacter,
  acquireMultipleCharacters
} = require('../utils/characterLeveling');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');
const { lockoutMiddleware } = require('../middleware/captcha');
const { deviceBindingMiddleware } = require('../middleware/deviceBinding');
const { updateRiskScore, RISK_ACTIONS } = require('../services/riskService');
const { getUserSpecializationBonuses } = require('../services/dojoEnhancedService');
const { addGachaPullXP, addNewCharacterXP } = require('../services/accountLevelService');

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Validate banner is available for rolling
 * @param {Object} banner - Banner instance
 * @returns {{ valid: boolean, error?: string, status?: number }}
 */
const validateBannerForRoll = (banner) => {
  if (!banner) {
    return { valid: false, error: 'Banner not found', status: 404 };
  }
  if (!banner.active) {
    return { valid: false, error: 'This banner is no longer active', status: 400 };
  }
  // Prevent rolling on Standard Banner via this endpoint
  // Users should use /api/characters/roll for standard pulls
  if (banner.isStandard) {
    return { valid: false, error: 'Use standard roll endpoint for standard pulls', status: 400 };
  }

  const now = new Date();
  if (banner.startDate && new Date(banner.startDate) > now) {
    return { valid: false, error: 'This banner has not started yet', status: 400 };
  }
  if (banner.endDate && new Date(banner.endDate) < now) {
    return { valid: false, error: 'This banner has already ended', status: 400 };
  }

  return { valid: true };
};

// ===========================================
// PRICING ENDPOINTS
// ===========================================

/**
 * Get base pricing configuration
 * GET /api/banners/pricing
 */
router.get('/pricing', (req, res) => {
  res.json(PRICING_CONFIG);
});

/**
 * Get pricing for a specific banner (includes costMultiplier and drop rates)
 * GET /api/banners/:id/pricing
 */
router.get('/:id/pricing', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id, {
      attributes: ['id', 'name', 'costMultiplier', 'rateMultiplier']
    });
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    const raritiesData = await getRarities();
    const singlePullCost = Math.floor(PRICING_CONFIG.baseCost * (banner.costMultiplier || 1));
    
    // Calculate all rate tables
    const bannerDropRates = roundRatesForDisplay(await calculateBannerRates(banner.rateMultiplier, false, raritiesData));
    const standardRates = await getStandardRates(false, raritiesData);
    const premiumRates = await getPremiumRates(false, raritiesData);
    const pityRates = await getPityRates(raritiesData);
    
    res.json({
      ...PRICING_CONFIG,
      costMultiplier: banner.costMultiplier || 1,
      rateMultiplier: banner.rateMultiplier || 1,
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
      dropRates: {
        banner: bannerDropRates,
        standard: standardRates,
        premium: premiumRates,
        bannerPullChance: Math.round(getBannerPullChance() * 100),
        pityInfo: {
          tenPullGuarantee: 'rare',
          pityRates: pityRates
        }
      },
      rarities: raritiesData.map(r => ({ 
        name: r.name, 
        displayName: r.displayName, 
        color: r.color,
        order: r.order 
      }))
    });
  } catch (err) {
    console.error('Error fetching banner pricing:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// BANNER CRUD ENDPOINTS
// ===========================================

/**
 * Get all active banners (filters R18 based on user preference)
 * GET /api/banners
 * Note: Standard Banner is hidden from this list (used for standard rolls, not direct rolling)
 */
router.get('/', async (req, res) => {
  try {
    const showAll = req.query.showAll === 'true';
    // Hide Standard Banner from user-facing list (still accessible for admins via showAll)
    const query = showAll
      ? {}
      : { where: { active: true, isStandard: false } };

    const banners = await Banner.findAll({
      ...query,
      include: [{ model: Character }],
      order: [['featured', 'DESC'], ['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    
    // Admin view: skip R18 filtering
    if (showAll) {
      res.json(banners.map(b => b.get({ plain: true })));
      return;
    }
    
    const allowR18 = await getR18PreferenceFromRequest(req);
    
    const filteredBanners = banners
      .filter(banner => allowR18 || !banner.isR18)
      .map(banner => {
        const bannerData = banner.get({ plain: true });
        if (!allowR18) {
          bannerData.Characters = bannerData.Characters.filter(char => !char.isR18);
        }
        return bannerData;
      });
    
    res.json(filteredBanners);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get a specific banner by ID
 * GET /api/banners/:id
 */
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id, {
      include: [{ model: Character }]
    });
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    const allowR18 = await getR18PreferenceFromRequest(req);
    
    if (banner.isR18 && !allowR18) {
      return res.status(403).json({ error: 'This banner requires R18 content to be enabled' });
    }
    
    const bannerData = banner.get({ plain: true });
    if (!allowR18) {
      bannerData.Characters = bannerData.Characters.filter(char => !char.isR18);
    }
    
    res.json(bannerData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// ADMIN BANNER MANAGEMENT
// ===========================================

/**
 * Update banner display order
 * POST /api/banners/update-order
 */
router.post('/update-order', [auth, adminAuth], async (req, res) => {
  try {
    const { bannerOrder } = req.body;
    
    if (!bannerOrder || !Array.isArray(bannerOrder)) {
      return res.status(400).json({ error: 'bannerOrder array is required' });
    }
    
    const updates = bannerOrder.map((bannerId, index) => 
      Banner.update({ displayOrder: index }, { where: { id: bannerId } })
    );
    
    await Promise.all(updates);
    
    console.log(`Admin updated banner display order: ${bannerOrder.length} banners`);
    
    res.json({ message: 'Banner order updated successfully' });
  } catch (err) {
    console.error('Error updating banner order:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * Bulk toggle featured status
 * POST /api/banners/bulk-toggle-featured
 */
router.post('/bulk-toggle-featured', [auth, adminAuth], async (req, res) => {
  try {
    const { bannerIds, featured } = req.body;
    
    if (!bannerIds || !Array.isArray(bannerIds) || bannerIds.length === 0) {
      return res.status(400).json({ error: 'bannerIds array is required' });
    }
    
    if (!validateIdArray(bannerIds)) {
      return res.status(400).json({ error: 'Invalid banner IDs. All IDs must be positive integers.' });
    }
    
    const parsedIds = bannerIds.map(id => parseInt(id, 10));
    
    const banners = await Banner.findAll({
      where: { id: parsedIds }
    });
    
    if (banners.length === 0) {
      return res.status(404).json({ error: 'No banners found with the provided IDs' });
    }
    
    const updatedBanners = [];
    for (const banner of banners) {
      if (featured !== undefined) {
        banner.featured = featured === true || featured === 'true';
      } else {
        banner.featured = !banner.featured;
      }
      await banner.save();
      updatedBanners.push({
        id: banner.id,
        name: banner.name,
        featured: banner.featured
      });
    }
    
    console.log(`Admin bulk-toggled featured status for ${updatedBanners.length} banners`);
    
    res.json({
      message: `Updated ${updatedBanners.length} banners`,
      banners: updatedBanners
    });
  } catch (err) {
    console.error('Error bulk toggling featured status:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * Toggle featured status for a single banner
 * PATCH /api/banners/:id/featured
 */
router.patch('/:id/featured', [auth, adminAuth], async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }

    const banner = await Banner.findByPk(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    const { featured } = req.body;
    banner.featured = featured !== undefined ? (featured === true || featured === 'true') : !banner.featured;
    await banner.save();

    console.log(`Admin toggled featured status for banner ${banner.name}: ${banner.featured}`);

    res.json({
      id: banner.id,
      name: banner.name,
      featured: banner.featured
    });
  } catch (err) {
    console.error('Error toggling featured status:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * Create a new banner
 * POST /api/banners
 */
router.post('/', [auth, adminAuth], upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      name, description, series, startDate, endDate, 
      featured, costMultiplier, rateMultiplier, active, isR18 
    } = req.body;
    
    const characterIds = parseCharacterIds(req.body.characterIds);
    if (characterIds === null) {
      return res.status(400).json({ error: 'Invalid characterIds format. Must be an array of positive integers.' });
    }
    
    let imagePath = null;
    let videoPath = null;
    
    if (req.files) {
      if (req.files.image) {
        imagePath = getUrlPath('banners', req.files.image[0].filename);
      }
      if (req.files.video) {
        videoPath = getUrlPath('videos', req.files.video[0].filename);
      }
    }
    
    // Parse and validate dates
    const parseDate = (dateValue, defaultValue = null) => {
      if (!dateValue || dateValue === '' || dateValue === 'Invalid date' || dateValue === 'null') {
        return defaultValue;
      }
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? defaultValue : parsed;
    };

    const banner = await Banner.create({
      name,
      description,
      series,
      image: imagePath,
      videoUrl: videoPath,
      startDate: parseDate(startDate, new Date()),
      endDate: parseDate(endDate, null),
      featured: featured === 'true',
      costMultiplier: parseFloat(costMultiplier || 1.5),
      rateMultiplier: parseFloat(rateMultiplier || 5.0),
      active: active !== 'false',
      isR18: isR18 === 'true' || isR18 === true
    });

    if (characterIds.length > 0) {
      const characters = await Character.findAll({
        where: { id: characterIds }
      });
      
      if (characters.length > 0) {
        await banner.addCharacters(characters);
      }
    }
    
    const createdBanner = await Banner.findByPk(banner.id, {
      include: [{ model: Character }]
    });
    
    res.status(201).json(createdBanner);
  } catch (err) {
    console.error('Error creating banner:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * Update a banner
 * PUT /api/banners/:id
 */
router.put('/:id', [auth, adminAuth], upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }

    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    
    const fields = [
      'name', 'description', 'series', 'startDate', 'endDate',
      'featured', 'costMultiplier', 'rateMultiplier', 'active', 'isR18'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'featured' || field === 'isR18') {
          banner[field] = req.body[field] === 'true' || req.body[field] === true;
        } else if (field === 'active') {
          banner[field] = req.body[field] !== 'false';
        } else if (field === 'costMultiplier' || field === 'rateMultiplier') {
          banner[field] = parseFloat(req.body[field]);
        } else if (field === 'startDate' || field === 'endDate') {
          // Validate date fields - set to null if invalid or empty
          const dateValue = req.body[field];
          if (!dateValue || dateValue === '' || dateValue === 'Invalid date' || dateValue === 'null') {
            banner[field] = null;
          } else {
            const parsedDate = new Date(dateValue);
            if (isNaN(parsedDate.getTime())) {
              // Invalid date - set to null instead of crashing
              banner[field] = null;
            } else {
              banner[field] = parsedDate;
            }
          }
        } else {
          banner[field] = req.body[field];
        }
      }
    });
    
    if (req.files) {
      if (req.files.image) {
        if (banner.image && banner.image.startsWith('/uploads/')) {
          const oldFilename = path.basename(banner.image);
          safeUnlink(getFilePath('banners', oldFilename));
        }
        banner.image = getUrlPath('banners', req.files.image[0].filename);
      }
      
      if (req.files.video) {
        if (banner.videoUrl && banner.videoUrl.startsWith('/uploads/')) {
          const oldFilename = path.basename(banner.videoUrl);
          safeUnlink(getFilePath('videos', oldFilename));
        }
        banner.videoUrl = getUrlPath('videos', req.files.video[0].filename);
      }
    }
    
    await banner.save();
    
    if (req.body.characterIds) {
      const characterIds = parseCharacterIds(req.body.characterIds);
      if (characterIds === null) {
        return res.status(400).json({ error: 'Invalid characterIds format. Must be an array of positive integers.' });
      }
      
      const characters = await Character.findAll({
        where: { id: characterIds }
      });
      
      await banner.setCharacters(characters);
    }
    
    const updatedBanner = await Banner.findByPk(banner.id, {
      include: [{ model: Character }]
    });
    
    res.json(updatedBanner);
  } catch (err) {
    console.error('Error updating banner:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * Delete a banner
 * DELETE /api/banners/:id
 */
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    
    if (banner.image && banner.image.startsWith('/uploads/')) {
      const filename = path.basename(banner.image);
      safeUnlink(getFilePath('banners', filename));
    }
    
    if (banner.videoUrl && banner.videoUrl.startsWith('/uploads/')) {
      const filename = path.basename(banner.videoUrl);
      safeUnlink(getFilePath('videos', filename));
    }
    
    await banner.destroy();
    console.log(`Banner ID ${req.params.id} deleted successfully`);
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    console.error('Error deleting banner:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// ROLL ENDPOINTS
// ===========================================

/**
 * Single roll on a banner
 * POST /api/banners/:id/roll
 * Security: lockout checked (fail-fast), enforcement checked, device binding verified, rate limited, policy enforced
 */
router.post('/:id/roll', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('gacha_roll'), sensitiveActionLimiter, enforcePolicy('canGachaPull')], async (req, res) => {
  const userId = req.user.id;
  
  if (!acquireRollLock(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  
  try {
    if (!isValidId(req.params.id)) {
      releaseRollLock(userId);
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id, {
      include: [{ model: Character }]
    });
    
    const bannerValidation = validateBannerForRoll(banner);
    if (!bannerValidation.valid) {
      releaseRollLock(userId);
      return res.status(bannerValidation.status).json({ error: bannerValidation.error });
    }
    
    const user = await User.findByPk(userId);
    
    // Payment handling
    const { useTicket, ticketType } = req.body;
    let cost = Math.floor(PRICING_CONFIG.baseCost * banner.costMultiplier);
    let usedTicket = null;
    let isPremium = false;
    
    if (useTicket) {
      if (ticketType === 'premium') {
        if ((user.premiumTickets || 0) >= 1) {
          user.premiumTickets -= 1;
          usedTicket = 'premium';
          isPremium = true;
          cost = 0;
        } else {
          releaseRollLock(userId);
          return res.status(400).json({
            error: 'No premium tickets available',
            rollTickets: user.rollTickets || 0,
            premiumTickets: user.premiumTickets || 0
          });
        }
      } else if ((user.rollTickets || 0) >= 1) {
        user.rollTickets -= 1;
        usedTicket = 'roll';
        cost = 0;
      } else {
        releaseRollLock(userId);
        return res.status(400).json({
          error: 'No roll tickets available',
          rollTickets: user.rollTickets || 0,
          premiumTickets: user.premiumTickets || 0
        });
      }
    } else {
      if (user.points < cost) {
        releaseRollLock(userId);
        return res.status(400).json({
          error: `Not enough points. Banner pulls cost ${cost} points.`,
          rollTickets: user.rollTickets || 0,
          premiumTickets: user.premiumTickets || 0
        });
      }
      user.points -= cost;
    }
    
    await user.save();
    
    // Build context and execute roll
    // Note: allCharacters is passed for backward compatibility but ignored
    // The fallback pool is now the Standard Banner characters only
    const allowR18 = await getUserAllowR18(userId);
    const allCharacters = await Character.findAll();

    // Get luck bonus from specializations (wisdom path)
    let luckBonus = 0;
    try {
      const specBonuses = await getUserSpecializationBonuses(userId);
      luckBonus = specBonuses.gachaLuckBonus || 0;
    } catch (_err) {
      // Ignore errors - use default
    }

    const context = await buildBannerRollContext(
      allCharacters,
      banner.Characters,
      banner.rateMultiplier,
      allowR18,
      luckBonus
    );

    const result = await executeSingleBannerRoll(context, {
      isPremium,
      needsPity: false,
      isMulti: false,
      isLast3: false
    });
    
    // Refund on failure
    if (!result.character) {
      if (usedTicket) {
        if (usedTicket === 'premium') {
          user.premiumTickets += 1;
        } else {
          user.rollTickets += 1;
        }
      } else {
        user.points += cost;
      }
      await user.save();
      releaseRollLock(userId);
      return res.status(400).json({ error: 'No characters available to roll' });
    }
    
    // Add character (shards on duplicates, bonus points if max level)
    const acquisition = await acquireCharacter(userId, result.character.id, user);
    
    const isBannerPull = context.bannerCharacters.some(c => c.id === result.character.id);
    const shardInfo = acquisition.isDuplicate 
      ? acquisition.isMaxLevel 
        ? `(max level → +${acquisition.bonusPoints} pts)` 
        : `(+1 shard, total: ${acquisition.shards})`
      : '(new)';
    console.log(`User ${user.username} (ID: ${user.id}) pulled from '${banner.name}' banner: ${result.character.name} (${result.actualRarity}) from ${isBannerPull ? 'banner' : 'standard'} pool ${shardInfo}. Cost: ${cost} points`);
    
    // SECURITY: Update risk score AFTER successful banner roll
    await updateRiskScore(userId, {
      action: RISK_ACTIONS.GACHA_ROLL,
      reason: 'banner_gacha_roll',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });

    // Update account XP for gacha pulls
    const freshUser = await User.findByPk(userId);
    let levelUpInfo = null;
    if (freshUser) {
      // Add account XP for the pull
      const pullXPResult = addGachaPullXP(freshUser, 1);

      // Add bonus XP if new character acquired
      if (acquisition.isNew) {
        const newCharXPResult = addNewCharacterXP(freshUser, result.character.rarity);
        if (newCharXPResult.levelUp) {
          levelUpInfo = newCharXPResult.levelUp;
        } else if (pullXPResult.levelUp) {
          levelUpInfo = pullXPResult.levelUp;
        }
      } else if (pullXPResult.levelUp) {
        levelUpInfo = pullXPResult.levelUp;
      }

      await freshUser.save();
    }

    releaseRollLock(userId);

    res.json({
      character: result.character,
      isBannerCharacter: isBannerPull,
      bannerName: banner.name,
      cost,
      updatedPoints: user.points,
      usedTicket,
      isPremiumRoll: isPremium,
      tickets: {
        rollTickets: user.rollTickets || 0,
        premiumTickets: user.premiumTickets || 0
      },
      acquisition: {
        isNew: acquisition.isNew,
        isDuplicate: acquisition.isDuplicate,
        level: acquisition.level,
        shards: acquisition.shards,
        isMaxLevel: acquisition.isMaxLevel,
        bonusPoints: acquisition.bonusPoints,
        canLevelUp: acquisition.canLevelUp
      },
      accountLevel: freshUser ? {
        level: freshUser.accountLevel,
        xp: freshUser.accountXP,
        levelUp: levelUpInfo
      } : null
    });
  } catch (err) {
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Multi-roll on a banner
 * POST /api/banners/:id/roll-multi
 * Security: lockout checked (fail-fast), enforcement checked, device binding verified, rate limited, policy enforced
 */
router.post('/:id/roll-multi', [auth, lockoutMiddleware(), enforcementMiddleware, deviceBindingMiddleware('gacha_roll'), sensitiveActionLimiter, enforcePolicy('canGachaPull')], async (req, res) => {
  const userId = req.user.id;
  
  if (!acquireRollLock(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  
  try {
    if (!isValidId(req.params.id)) {
      releaseRollLock(userId);
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const count = Math.min(req.body.count || 10, PRICING_CONFIG.maxPulls);
    const banner = await Banner.findByPk(req.params.id, {
      include: [{ model: Character }]
    });
    
    const bannerValidation = validateBannerForRoll(banner);
    if (!bannerValidation.valid) {
      releaseRollLock(userId);
      return res.status(bannerValidation.status).json({ error: bannerValidation.error });
    }
    
    const user = await User.findByPk(userId);
    
    // Payment handling
    const { useTickets, ticketType } = req.body;
    let finalCost = 0;
    let discount = 0;
    let usedTickets = { roll: 0, premium: 0 };
    let premiumCount = 0;
    
    if (useTickets) {
      const rollTickets = user.rollTickets || 0;
      const premiumTickets = user.premiumTickets || 0;
      
      if (ticketType === 'premium') {
        if (premiumTickets >= count) {
          user.premiumTickets -= count;
          usedTickets.premium = count;
          premiumCount = count;
        } else {
          releaseRollLock(userId);
          return res.status(400).json({
            error: `Not enough premium tickets. Need ${count}, have ${premiumTickets}.`,
            rollTickets,
            premiumTickets
          });
        }
      } else if (ticketType === 'roll') {
        if (rollTickets >= count) {
          user.rollTickets -= count;
          usedTickets.roll = count;
        } else {
          releaseRollLock(userId);
          return res.status(400).json({
            error: `Not enough roll tickets. Need ${count}, have ${rollTickets}.`,
            rollTickets,
            premiumTickets
          });
        }
      } else {
        // Mixed: premium first, then roll
        let remaining = count;
        if (premiumTickets > 0) {
          const usePremium = Math.min(premiumTickets, remaining);
          user.premiumTickets -= usePremium;
          usedTickets.premium = usePremium;
          premiumCount = usePremium;
          remaining -= usePremium;
        }
        if (remaining > 0 && rollTickets >= remaining) {
          user.rollTickets -= remaining;
          usedTickets.roll = remaining;
          remaining = 0;
        }
        if (remaining > 0) {
          releaseRollLock(userId);
          return res.status(400).json({
            error: `Not enough tickets. Need ${count} total.`,
            rollTickets,
            premiumTickets
          });
        }
      }
    } else {
      const singlePullCost = Math.floor(PRICING_CONFIG.baseCost * banner.costMultiplier);
      const baseCost = count * singlePullCost;
      discount = getDiscountForCount(count);
      finalCost = Math.floor(baseCost * (1 - discount));
      
      if (user.points < finalCost) {
        releaseRollLock(userId);
        return res.status(400).json({
          error: `Not enough points. This multi-pull costs ${finalCost} points.`,
          rollTickets: user.rollTickets || 0,
          premiumTickets: user.premiumTickets || 0
        });
      }
      user.points -= finalCost;
    }
    
    await user.save();
    
    // Build context and execute multi-roll
    // Note: allCharacters is passed for backward compatibility but ignored
    // The fallback pool is now the Standard Banner characters only
    const allowR18 = await getUserAllowR18(userId);
    const allCharacters = await Character.findAll();

    // Get luck bonus from specializations (wisdom path)
    let luckBonus = 0;
    try {
      const specBonuses = await getUserSpecializationBonuses(userId);
      luckBonus = specBonuses.gachaLuckBonus || 0;
    } catch (_err) {
      // Ignore errors - use default
    }

    const context = await buildBannerRollContext(
      allCharacters,
      banner.Characters,
      banner.rateMultiplier,
      allowR18,
      luckBonus
    );

    const results = await executeBannerMultiRoll(context, count, premiumCount);
    
    // Add all characters (shards on duplicates, bonus points if max)
    const characters = results.map(r => r.character).filter(c => c);
    const acquisitions = await acquireMultipleCharacters(userId, characters, user);
    
    // Build character results with acquisition info
    const charactersWithLevels = results.map(r => {
      if (!r.character) return null;
      const charData = r.character.get ? r.character.get({ plain: true }) : r.character;
      const acq = acquisitions.find(a => a.characterId === charData.id);
      return {
        ...charData,
        isBannerCharacter: r.isBannerCharacter,
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
    
    console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll on banner '${banner.name}' (cost: ${finalCost}, new: ${newCards}, shards: ${shardsGained}, bonus pts: ${bonusPointsTotal})`);
    
    // SECURITY: Update risk score AFTER successful banner multi-roll
    await updateRiskScore(userId, {
      action: RISK_ACTIONS.GACHA_MULTI_ROLL,
      reason: 'banner_multi_roll',
      ipHash: req.deviceSignals?.ipHash,
      deviceFingerprint: req.deviceSignals?.fingerprint
    });

    // Update account XP for gacha pulls
    const freshUser = await User.findByPk(userId);
    let levelUpInfo = null;
    if (freshUser) {
      // Add account XP for the pulls
      const pullXPResult = addGachaPullXP(freshUser, count);
      if (pullXPResult.levelUp) {
        levelUpInfo = pullXPResult.levelUp;
      }

      // Add XP for each new character acquired
      const newAcquisitions = acquisitions.filter(a => a.isNew);
      for (const acq of newAcquisitions) {
        const char = characters.find(c => c.id === acq.characterId);
        if (char) {
          const newCharXPResult = addNewCharacterXP(freshUser, char.rarity);
          if (newCharXPResult.levelUp && !levelUpInfo) {
            levelUpInfo = newCharXPResult.levelUp;
          } else if (newCharXPResult.levelUp) {
            levelUpInfo = newCharXPResult.levelUp;
          }
        }
      }

      await freshUser.save();
    }

    releaseRollLock(userId);

    res.json({
      characters: charactersWithLevels,
      bannerName: banner.name,
      cost: finalCost,
      updatedPoints: user.points,
      usedTickets,
      premiumRolls: premiumCount,
      tickets: {
        rollTickets: user.rollTickets || 0,
        premiumTickets: user.premiumTickets || 0
      },
      summary: {
        newCards,
        shardsGained,
        bonusPoints: bonusPointsTotal,
        duplicates: acquisitions.filter(a => a.isDuplicate).length
      },
      accountLevel: freshUser ? {
        level: freshUser.accountLevel,
        xp: freshUser.accountXP,
        levelUp: levelUpInfo
      } : null
    });
  } catch (err) {
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user's ticket counts
 * GET /api/banners/user/tickets
 */
router.get('/user/tickets', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      rollTickets: user.rollTickets || 0,
      premiumTickets: user.premiumTickets || 0,
      points: user.points
    });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
