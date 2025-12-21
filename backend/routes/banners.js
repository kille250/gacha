const express = require('express');
const router = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
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
  rollRarity,
  getRarities,
  getOrderedRarities
} = require('../config/pricing');
const { isValidId, validateIdArray, parseCharacterIds } = require('../utils/validation');
const { getUserAllowR18, getR18PreferenceFromRequest } = require('../utils/userPreferences');
const { 
  acquireRollLock,
  releaseRollLock,
  groupCharactersByRarity, 
  selectCharacterWithFallback,
  filterR18Characters,
  isRarePlus
} = require('../utils/rollHelpers');

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Validate banner is available for rolling
 * @param {Object} banner - Banner instance
 * @returns {{ valid: boolean, error?: string }} - Validation result
 */
const validateBannerForRoll = (banner) => {
  if (!banner) {
    return { valid: false, error: 'Banner not found', status: 404 };
  }
  if (!banner.active) {
    return { valid: false, error: 'This banner is no longer active', status: 400 };
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
// PRICING ENDPOINT - Single source of truth for frontend
// ===========================================

router.get('/pricing', (req, res) => {
  // Return pricing config for frontend to use
  res.json(PRICING_CONFIG);
});

// Get pricing for a specific banner (includes costMultiplier and drop rates)
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
    
    // Load rarities from database
    const raritiesData = await getRarities();
    
    const singlePullCost = Math.floor(PRICING_CONFIG.baseCost * (banner.costMultiplier || 1));
    
    // Calculate banner-specific rates using centralized config (async)
    const bannerDropRates = roundRatesForDisplay(await calculateBannerRates(banner.rateMultiplier, false, raritiesData));
    const standardRates = await getStandardRates(false, raritiesData);
    const premiumRates = await getPremiumRates(false, raritiesData);
    const pityRates = await getPityRates(raritiesData);
    
    res.json({
      ...PRICING_CONFIG,
      costMultiplier: banner.costMultiplier || 1,
      rateMultiplier: banner.rateMultiplier || 1,
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
      // Drop rate information from centralized config
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

// Get all active banners (filters R18 banners and characters based on user preference)
router.get('/', async (req, res) => {
  try {
    const showAll = req.query.showAll === 'true';
    const query = showAll ? {} : { where: { active: true } };
    
    const banners = await Banner.findAll({
      ...query,
      include: [{ model: Character }],
      order: [['featured', 'DESC'], ['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    
    // For admin view (showAll=true), skip R18 filtering
    if (showAll) {
      res.json(banners.map(b => b.get({ plain: true })));
      return;
    }
    
    // Check R18 preference
    const allowR18 = await getR18PreferenceFromRequest(req);
    
    // Filter R18 banners and characters if user hasn't enabled R18
    const filteredBanners = banners
      .filter(banner => allowR18 || !banner.isR18) // Filter out R18 banners
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

// Get a specific banner by ID (filters R18 banners and characters based on user preference)
router.get('/:id', async (req, res) => {
  try {
    // Validate banner ID is a positive integer
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id, {
      include: [{ model: Character }]
    });
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    // Check R18 preference
    const allowR18 = await getR18PreferenceFromRequest(req);
    
    // Block access to R18 banner if user hasn't enabled R18
    if (banner.isR18 && !allowR18) {
      return res.status(403).json({ error: 'This banner requires R18 content to be enabled' });
    }
    
    // Filter R18 characters if user hasn't enabled R18
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

// Admin routes below require authentication and admin privileges

// Update banner display order (admin only)
router.post('/update-order', [auth, adminAuth], async (req, res) => {
  try {
    const { bannerOrder } = req.body;
    
    if (!bannerOrder || !Array.isArray(bannerOrder)) {
      return res.status(400).json({ error: 'bannerOrder array is required' });
    }
    
    // Update each banner's displayOrder
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

// Bulk toggle featured status for multiple banners (admin only)
router.post('/bulk-toggle-featured', [auth, adminAuth], async (req, res) => {
  try {
    const { bannerIds, featured } = req.body;
    
    // Validate bannerIds
    if (!bannerIds || !Array.isArray(bannerIds) || bannerIds.length === 0) {
      return res.status(400).json({ error: 'bannerIds array is required' });
    }
    
    // Validate all IDs
    if (!validateIdArray(bannerIds)) {
      return res.status(400).json({ error: 'Invalid banner IDs. All IDs must be positive integers.' });
    }
    
    const parsedIds = bannerIds.map(id => parseInt(id, 10));
    
    // Find all banners
    const banners = await Banner.findAll({
      where: { id: parsedIds }
    });
    
    if (banners.length === 0) {
      return res.status(404).json({ error: 'No banners found with the provided IDs' });
    }
    
    // Update featured status
    // If 'featured' is provided, set to that value; otherwise toggle each banner
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

// Toggle featured status for a single banner (admin only)
router.patch('/:id/featured', [auth, adminAuth], async (req, res) => {
  try {
    // Validate banner ID
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }

    const banner = await Banner.findByPk(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    // Toggle or set featured status
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

// Create a new banner (admin only)
router.post('/', [auth, adminAuth], upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      name, description, series, startDate, endDate, 
      featured, costMultiplier, rateMultiplier, active, isR18 
    } = req.body;
    
    // Parse and validate characterIds
    const characterIds = parseCharacterIds(req.body.characterIds);
    if (characterIds === null) {
      return res.status(400).json({ error: 'Invalid characterIds format. Must be an array of positive integers.' });
    }
    
    // Handle file uploads
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
    
    // Create the banner
    const banner = await Banner.create({
      name,
      description,
      series,
      image: imagePath,
      videoUrl: videoPath,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      featured: featured === 'true',
      costMultiplier: parseFloat(costMultiplier || 1.5),
      rateMultiplier: parseFloat(rateMultiplier || 5.0),
      active: active !== 'false',
      isR18: isR18 === 'true' || isR18 === true
    });

    // Add characters to banner if provided
    if (characterIds.length > 0) {
      const characters = await Character.findAll({
        where: { id: characterIds }
      });
      
      if (characters.length > 0) {
        await banner.addCharacters(characters);
      }
    }
    
    // Fetch the created banner with associated characters
    const createdBanner = await Banner.findByPk(banner.id, {
      include: [{ model: Character }]
    });
    
    res.status(201).json(createdBanner);
  } catch (err) {
    console.error('Error creating banner:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update a banner (admin only)
router.put('/:id', [auth, adminAuth], upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    // Validate banner ID
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }

    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    
    // Update fields if provided
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
        } else {
          banner[field] = req.body[field];
        }
      }
    });
    
    // Handle file uploads
    if (req.files) {
      if (req.files.image) {
        // Delete old image if exists
        if (banner.image && banner.image.startsWith('/uploads/')) {
          const oldFilename = path.basename(banner.image);
          safeUnlink(getFilePath('banners', oldFilename));
        }
        banner.image = getUrlPath('banners', req.files.image[0].filename);
      }
      
      if (req.files.video) {
        // Delete old video if exists
        if (banner.videoUrl && banner.videoUrl.startsWith('/uploads/')) {
          const oldFilename = path.basename(banner.videoUrl);
          safeUnlink(getFilePath('videos', oldFilename));
        }
        banner.videoUrl = getUrlPath('videos', req.files.video[0].filename);
      }
    }
    
    await banner.save();
    
    // Update character associations if provided
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
    
    // Return updated banner with characters
    const updatedBanner = await Banner.findByPk(banner.id, {
      include: [{ model: Character }]
    });
    
    res.json(updatedBanner);
  } catch (err) {
    console.error('Error updating banner:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete a banner (admin only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    // Validate banner ID
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    
    // Delete associated files
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

// Roll on a specific banner
router.post('/:id/roll', auth, async (req, res) => {
  const userId = req.user.id;
  
  if (!acquireRollLock(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  
  try {
    // Validate banner ID
    if (!isValidId(req.params.id)) {
      releaseRollLock(userId);
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id, {
      include: [{ model: Character }]
    });
    
    // Validate banner availability
    const bannerValidation = validateBannerForRoll(banner);
    if (!bannerValidation.valid) {
      releaseRollLock(userId);
      return res.status(bannerValidation.status).json({ error: bannerValidation.error });
    }
    
    // Get the user
    const user = await User.findByPk(userId);
    
    // Check payment method: ticket or points
    const { useTicket, ticketType } = req.body;
    let cost = Math.floor(100 * banner.costMultiplier);
    let usedTicket = null;
    let isPremium = false;
    
    if (useTicket) {
      // Use ticket instead of points
      if (ticketType === 'premium') {
        // User explicitly wants premium ticket
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
        // Use roll ticket
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
      // Use points
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
    
    // Get user's R18 preference and filter characters
    const allowR18 = await getUserAllowR18(req.user.id);
    const bannerCharacters = filterR18Characters(banner.Characters, allowR18);
    const allChars = await Character.findAll();
    const allCharacters = filterR18Characters(allChars, allowR18);
    
    // Load rarities from database
    const raritiesData = await getRarities();
    const orderedRarities = raritiesData.map(r => r.name);
    
    // Group characters by rarity using helper
    const allCharactersByRarity = groupCharactersByRarity(allCharacters, orderedRarities);
    const bannerCharactersByRarity = groupCharactersByRarity(bannerCharacters, orderedRarities);
    
    // Get rates from centralized config (async)
    const premiumDropRates = await getPremiumRates(false, raritiesData);
    const bannerDropRates = await calculateBannerRates(banner.rateMultiplier, false, raritiesData);
    
    console.log(`Banner ${banner.name} rates (multiplier: ${banner.rateMultiplier}):`, bannerDropRates);
    
    // When rolling on a banner, ALWAYS use banner rates
    // The bannerPullChance only affects which CHARACTER POOL to use, not the rates
    const dropRates = isPremium ? premiumDropRates : bannerDropRates;
    
    // Roll for rarity using centralized helper
    let selectedRarity = rollRarity(dropRates, orderedRarities);
    
    // Determine if we pull character from banner pool or all characters
    // This is separate from rates - affects which character of the rolled rarity you get
    const pullFromBannerPool = Math.random() < getBannerPullChance();
    
    // Select character using centralized helper with banner pool priority when applicable
    const primaryPool = pullFromBannerPool ? bannerCharactersByRarity : null;
    const { character: randomChar, actualRarity } = selectCharacterWithFallback(
      primaryPool,
      allCharactersByRarity,
      selectedRarity,
      allCharacters,
      raritiesData
    );
    
    // Safety check: if no character found, refund and error
    if (!randomChar) {
      if (usedTicket) {
        // Refund the ticket
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
    
    // Auto-claim the character
    await user.addCharacter(randomChar);
    
    // Log the pull for analysis
    const isBannerPull = bannerCharacters.some(c => c.id === randomChar.id);
    console.log(`User ${user.username} (ID: ${user.id}) pulled from '${banner.name}' banner: ${randomChar.name} (${actualRarity}) from ${isBannerPull ? 'banner' : 'standard'} pool. Cost: ${cost} points`);
    
    // Release lock before responding
    releaseRollLock(userId);
    
    res.json({
      character: randomChar,
      isBannerCharacter: bannerCharacters.some(c => c.id === randomChar.id),
      bannerName: banner.name,
      cost,
      updatedPoints: user.points,
      usedTicket,
      isPremiumRoll: isPremium,
      tickets: {
        rollTickets: user.rollTickets || 0,
        premiumTickets: user.premiumTickets || 0
      }
    });
  } catch (err) {
    // Always release lock on error
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Multi-roll on a banner (similar to standard multi-roll but with banner rates)
router.post('/:id/roll-multi', auth, async (req, res) => {
  const userId = req.user.id;
  
  if (!acquireRollLock(userId)) {
    return res.status(429).json({ 
      error: 'Roll in progress',
      message: 'Another roll request is being processed'
    });
  }
  
  try {
    // Validate banner ID
    if (!isValidId(req.params.id)) {
      releaseRollLock(userId);
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const count = Math.min(req.body.count || 10, PRICING_CONFIG.maxPulls);
    const banner = await Banner.findByPk(req.params.id, {
      include: [{ model: Character }]
    });
    
    // Validate banner availability
    const bannerValidation = validateBannerForRoll(banner);
    if (!bannerValidation.valid) {
      releaseRollLock(userId);
      return res.status(bannerValidation.status).json({ error: bannerValidation.error });
    }
    
    // Get the user
    const user = await User.findByPk(userId);
    
    // Check payment method: tickets or points
    const { useTickets, ticketType } = req.body;
    let finalCost = 0;
    let discount = 0;
    let usedTickets = { roll: 0, premium: 0 };
    let premiumCount = 0;
    
    if (useTickets) {
      // Use tickets for multi-roll
      const rollTickets = user.rollTickets || 0;
      const premiumTickets = user.premiumTickets || 0;
      
      if (ticketType === 'premium') {
        // Use premium tickets first
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
        // Use roll tickets
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
        // Mixed: use premium first, then roll
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
      // Use points
      const singlePullCost = Math.floor(100 * banner.costMultiplier);
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
    
    // Get user's R18 preference and filter characters
    const allowR18 = await getUserAllowR18(req.user.id);
    const bannerCharacters = filterR18Characters(banner.Characters, allowR18);
    const allChars = await Character.findAll();
    const allCharacters = filterR18Characters(allChars, allowR18);
    
    // Load rarities from database
    const raritiesData = await getRarities();
    const orderedRarities = raritiesData.map(r => r.name);
    
    // Group characters by rarity using helper
    const allCharactersByRarity = groupCharactersByRarity(allCharacters, orderedRarities);
    const bannerCharactersByRarity = groupCharactersByRarity(bannerCharacters, orderedRarities);
    
    // Get rates from centralized config (multi-pull rates, async)
    const premiumDropRates = await getPremiumRates(true, raritiesData);
    const bannerDropRates = await calculateBannerRates(banner.rateMultiplier, true, raritiesData);
    const pityRates = await getPityRates(raritiesData);
    
    console.log(`Banner ${banner.name} multi-roll rates (multiplier: ${banner.rateMultiplier}):`, bannerDropRates);
    
    // Guaranteed pity mechanics
    const guaranteedRare = count >= 10;
    
    let results = [];
    let hasRarePlus = false;
    
    // Roll characters
    for (let i = 0; i < count; i++) {
      const isLastRoll = (i === count - 1);
      const needsPity = guaranteedRare && isLastRoll && !hasRarePlus;
      
      // Check if this roll uses a premium ticket
      const isPremiumRoll = i < premiumCount;
      
      // When rolling on a banner, ALWAYS use banner rates
      // Select appropriate rates (premium > pity > banner)
      let currentRates;
      if (isPremiumRoll) {
        currentRates = premiumDropRates;
      } else if (needsPity) {
        currentRates = pityRates;
      } else {
        currentRates = bannerDropRates;
      }
      
      // Roll for rarity using centralized helper
      let selectedRarity = rollRarity(currentRates, orderedRarities);
      
      if (isRarePlus(selectedRarity, raritiesData)) {
        hasRarePlus = true;
      }
      
      // Determine if we pull character from banner pool or all characters
      // This is separate from rates - affects which character of the rolled rarity you get
      const isLast3 = i >= count - 3;
      const pullFromBannerPool = Math.random() < getBannerPullChance(isLast3);
      
      // Select character using centralized helper with banner pool priority when applicable
      const primaryPool = pullFromBannerPool ? bannerCharactersByRarity : null;
      const { character: randomChar } = selectCharacterWithFallback(
        primaryPool,
        allCharactersByRarity,
        selectedRarity,
        allCharacters,
        raritiesData
      );
      
      // Safety check: if no character found, skip this roll
      if (!randomChar) continue;
      
      // Auto-claim the character
      await user.addCharacter(randomChar);
      
      // Check if it's actually a banner character
      const actuallyBannerChar = bannerCharacters.some(c => c.id === randomChar.id);
      
      results.push({
        ...randomChar.get({ plain: true }),
        isBannerCharacter: actuallyBannerChar
      });
    }
    
    console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll on banner '${banner.name}' with ${hasRarePlus ? 'rare+' : 'no rare+'} result (cost: ${finalCost}, discount: ${discount * 100}%)`);
    
    releaseRollLock(userId);
    
    res.json({
      characters: results,
      bannerName: banner.name,
      cost: finalCost,
      updatedPoints: user.points,
      usedTickets,
      premiumRolls: premiumCount,
      tickets: {
        rollTickets: user.rollTickets || 0,
        premiumTickets: user.premiumTickets || 0
      }
    });
  } catch (err) {
    releaseRollLock(userId);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/banners/user/tickets - Get user's ticket counts
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