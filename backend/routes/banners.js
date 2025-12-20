const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Banner = require('../models/banner');
const Character = require('../models/character');
const User = require('../models/user');
const sequelize = require('../config/db');
const { UPLOAD_DIRS, getUrlPath, getFilePath } = require('../config/upload');
const { PRICING_CONFIG, getDiscountForCount } = require('../config/pricing');

// ===========================================
// SECURITY: Input validation helpers
// ===========================================

// Validate that a value is a positive integer
const isValidId = (value) => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && String(num) === String(value);
};

// Validate an array of IDs
const validateIdArray = (arr) => {
  if (!Array.isArray(arr)) return false;
  return arr.every(id => isValidId(id));
};

// Safely parse characterIds from request body
const parseCharacterIds = (characterIdsStr) => {
  if (!characterIdsStr) return [];
  try {
    const parsed = JSON.parse(characterIdsStr);
    if (!Array.isArray(parsed)) return null;
    // Ensure all values are positive integers
    const validated = parsed.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
    if (validated.length !== parsed.length) return null;
    return validated;
  } catch (e) {
    return null;
  }
};

// Get user's R18 preference via raw SQL (requires both admin permission AND user preference)
async function getUserAllowR18(userId) {
  const [rows] = await sequelize.query(
    `SELECT "allowR18", "showR18" FROM "Users" WHERE "id" = :userId`,
    { replacements: { userId } }
  );
  // User can see R18 content only if admin has allowed AND user has enabled it
  return rows[0]?.allowR18 === true && rows[0]?.showR18 === true;
}

// Configure storage for banner images and videos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = file.mimetype.startsWith('video/') 
      ? UPLOAD_DIRS.videos 
      : UPLOAD_DIRS.banners;
    
    console.log(`Storing file in: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

// File filter to allow only images and videos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// ===========================================
// PRICING ENDPOINT - Single source of truth for frontend
// ===========================================

router.get('/pricing', (req, res) => {
  // Return pricing config for frontend to use
  res.json(PRICING_CONFIG);
});

// Get pricing for a specific banner (includes costMultiplier)
router.get('/:id/pricing', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    const banner = await Banner.findByPk(req.params.id, {
      attributes: ['id', 'name', 'costMultiplier']
    });
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    const singlePullCost = Math.floor(PRICING_CONFIG.baseCost * (banner.costMultiplier || 1));
    
    res.json({
      ...PRICING_CONFIG,
      costMultiplier: banner.costMultiplier || 1,
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
    let allowR18 = false;
    const token = req.header('x-auth-token');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        allowR18 = await getUserAllowR18(decoded.user.id);
      } catch (e) { /* Invalid token - use default */ }
    }
    
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
    let allowR18 = false;
    const token = req.header('x-auth-token');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        allowR18 = await getUserAllowR18(decoded.user.id);
      } catch (e) { /* Invalid token - use default */ }
    }
    
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
router.post('/update-order', [auth, admin], async (req, res) => {
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
router.post('/bulk-toggle-featured', [auth, admin], async (req, res) => {
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
router.patch('/:id/featured', [auth, admin], async (req, res) => {
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
router.post('/', [auth, admin], upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Processing banner creation request');
    console.log('Request body:', req.body);
    console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');

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
        console.log('Image file details:', req.files.image[0]);
        imagePath = getUrlPath('banners', req.files.image[0].filename);
        console.log('Image path set to:', imagePath);
      }
      
      if (req.files.video) {
        console.log('Video file details:', req.files.video[0]);
        videoPath = getUrlPath('videos', req.files.video[0].filename);
        console.log('Video path set to:', videoPath);
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

    console.log('Banner created with ID:', banner.id);
    
    // Add characters to banner if provided
    if (characterIds.length > 0) {
      const characters = await Character.findAll({
        where: { id: characterIds }
      });
      
      if (characters.length > 0) {
        await banner.addCharacters(characters);
        console.log(`Added ${characters.length} characters to banner`);
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
router.put('/:id', [auth, admin], upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    // Validate banner ID
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }
    
    console.log(`Processing banner update for ID: ${req.params.id}`);
    console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');

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
        console.log('New image file:', req.files.image[0].filename);
        // Delete old image if exists
        if (banner.image && banner.image.startsWith('/uploads/')) {
          const oldFilename = path.basename(banner.image);
          const oldPath = getFilePath('banners', oldFilename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log('Deleted old image file:', oldPath);
          }
        }
        banner.image = getUrlPath('banners', req.files.image[0].filename);
        console.log('Updated banner image path:', banner.image);
      }
      
      if (req.files.video) {
        console.log('New video file:', req.files.video[0].filename);
        // Delete old video if exists
        if (banner.videoUrl && banner.videoUrl.startsWith('/uploads/')) {
          const oldFilename = path.basename(banner.videoUrl);
          const oldPath = getFilePath('videos', oldFilename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log('Deleted old video file:', oldPath);
          }
        }
        banner.videoUrl = getUrlPath('videos', req.files.video[0].filename);
        console.log('Updated banner video path:', banner.videoUrl);
      }
    }
    
    await banner.save();
    console.log('Banner saved successfully');
    
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
      console.log(`Updated banner characters: ${characters.length} characters`);
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
router.delete('/:id', [auth, admin], async (req, res) => {
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
      const imagePath = getFilePath('banners', filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Deleted image file:', imagePath);
      }
    }
    
    if (banner.videoUrl && banner.videoUrl.startsWith('/uploads/')) {
      const filename = path.basename(banner.videoUrl);
      const videoPath = getFilePath('videos', filename);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        console.log('Deleted video file:', videoPath);
      }
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
	try {
	  // Validate banner ID
	  if (!isValidId(req.params.id)) {
		return res.status(400).json({ error: 'Invalid banner ID' });
	  }
	  
	  const banner = await Banner.findByPk(req.params.id, {
		include: [{ model: Character }]
	  });
	  if (!banner) return res.status(404).json({ error: 'Banner not found' });
	  if (!banner.active) return res.status(400).json({ error: 'This banner is no longer active' });
	  
	  // Check if banner is within date range
	  const now = new Date();
	  if (banner.startDate && new Date(banner.startDate) > now) {
		return res.status(400).json({ error: 'This banner has not started yet' });
	  }
	  if (banner.endDate && new Date(banner.endDate) < now) {
		return res.status(400).json({ error: 'This banner has already ended' });
	  }
	  
	  // Get the user
	  const user = await User.findByPk(req.user.id);
	  
	  // Check payment method: ticket or points
	  const { useTicket, ticketType } = req.body;
	  let cost = Math.floor(100 * banner.costMultiplier);
	  let usedTicket = null;
	  let isPremium = false;
	  
	  if (useTicket) {
	    // Use ticket instead of points
	    if (ticketType === 'premium' && (user.premiumTickets || 0) >= 1) {
	      user.premiumTickets -= 1;
	      usedTicket = 'premium';
	      isPremium = true;
	      cost = 0;
	    } else if ((user.rollTickets || 0) >= 1) {
	      user.rollTickets -= 1;
	      usedTicket = 'roll';
	      cost = 0;
	    } else {
	      return res.status(400).json({
	        error: 'No tickets available',
	        rollTickets: user.rollTickets || 0,
	        premiumTickets: user.premiumTickets || 0
	      });
	    }
	  } else {
	    // Use points
	    if (user.points < cost) {
	      return res.status(400).json({
	        error: `Not enough points. Banner pulls cost ${cost} points.`,
	        rollTickets: user.rollTickets || 0,
	        premiumTickets: user.premiumTickets || 0
	      });
	    }
	    user.points -= cost;
	  }
	  
	  await user.save();
	  
	  // Get user's R18 preference
	  const allowR18 = await getUserAllowR18(req.user.id);
	  
	  // Get all banner characters (filtered by R18)
	  const bannerCharacters = allowR18 
	    ? banner.Characters 
	    : banner.Characters.filter(char => !char.isR18);
	  
	  // Get all characters for fallback (filtered by R18)
	  const allChars = await Character.findAll();
	  const allCharacters = allowR18 
	    ? allChars 
	    : allChars.filter(char => !char.isR18);
	  
	  // Group all characters by rarity
	  const allCharactersByRarity = {
		common: allCharacters.filter(char => char.rarity === 'common'),
		uncommon: allCharacters.filter(char => char.rarity === 'uncommon'),
		rare: allCharacters.filter(char => char.rarity === 'rare'),
		epic: allCharacters.filter(char => char.rarity === 'epic'),
		legendary: allCharacters.filter(char => char.rarity === 'legendary')
	  };
	  
	  // Group banner characters by rarity
	  const bannerCharactersByRarity = {
		common: bannerCharacters.filter(char => char.rarity === 'common'),
		uncommon: bannerCharacters.filter(char => char.rarity === 'uncommon'),
		rare: bannerCharacters.filter(char => char.rarity === 'rare'),
		epic: bannerCharacters.filter(char => char.rarity === 'epic'),
		legendary: bannerCharacters.filter(char => char.rarity === 'legendary')
	  };
	  
	  // Define standard drop rates - challenging rates
	  const standardDropRates = {
		common: 70,     // 70% chance
		uncommon: 20,   // 20% chance
		rare: 7,        // 7% chance
		epic: 2.5,      // 2.5% chance
		legendary: 0.5  // 0.5% chance
	  };
	  
	  // Define base banner drop rates (slightly better than standard)
	  const baseDropRates = {
		common: 60,     // 60% chance
		uncommon: 22,   // 22% chance
		rare: 12,       // 12% chance
		epic: 5,        // 5% chance
		legendary: 1    // 1% chance
	  };
	  
	  // Premium ticket rates (guaranteed rare or better!)
	  const premiumDropRates = {
		common: 0,      // 0% chance - no common with premium
		uncommon: 0,    // 0% chance - no uncommon with premium
		rare: 70,       // 70% chance
		epic: 25,       // 25% chance
		legendary: 5    // 5% chance
	  };
	  
	  // Apply the rate multiplier to adjust rates for banner
	  const bannerDropRates = {};
	  // Cap the multiplier effect to prevent extreme values
	  const effectiveMultiplier = Math.min(banner.rateMultiplier, 5.0);
	  const rateAdjustment = (effectiveMultiplier - 1) * 0.1; // Reduced scaling effect
	  
	  // Adjust rates based on multiplier (with lower caps)
	  bannerDropRates.legendary = Math.min(baseDropRates.legendary * (1 + rateAdjustment * 2), 3); // Cap at 3%
	  bannerDropRates.epic = Math.min(baseDropRates.epic * (1 + rateAdjustment * 1.5), 10); // Cap at 10%
	  bannerDropRates.rare = Math.min(baseDropRates.rare * (1 + rateAdjustment), 18); // Cap at 18%
	  bannerDropRates.uncommon = Math.min(baseDropRates.uncommon * (1 + rateAdjustment * 0.5), 25); // Cap at 25%
	  
	  // Calculate remaining percentage for common to ensure total is 100%
	  const totalHigherRarities = bannerDropRates.legendary + bannerDropRates.epic + 
								  bannerDropRates.rare + bannerDropRates.uncommon;
	  bannerDropRates.common = Math.max(100 - totalHigherRarities, 40); // Ensure at least 40% common
	  
	  console.log(`Banner ${banner.name} rates (multiplier: ${banner.rateMultiplier}):`, bannerDropRates);
	  
	  // Determine if we pull from banner or standard pool
	  // Banner has a significantly higher chance
	  const pullFromBanner = Math.random() < 0.70; // 70% chance to pull from banner
	  
	  // Choose the appropriate drop rates
	  // Premium tickets get guaranteed rare+ rates
	  let dropRates;
	  if (isPremium) {
	    dropRates = premiumDropRates;
	  } else {
	    dropRates = pullFromBanner ? bannerDropRates : standardDropRates;
	  }
	  
	  // Determine the rarity based on probability
	  const rarityRoll = Math.random() * 100;
	  let selectedRarity;
	  let cumulativeRate = 0;
	  for (const [rarity, rate] of Object.entries(dropRates)) {
		cumulativeRate += rate;
		if (rarityRoll <= cumulativeRate) {
		  selectedRarity = rarity;
		  break;
		}
	  }
	  
	  // Fallback for edge cases
	  if (!selectedRarity) selectedRarity = 'common';
	  
	  // Decide whether to pull from banner or standard pool
	  let characterPool;
	  let characterPoolSource;
	  if (pullFromBanner && bannerCharactersByRarity[selectedRarity]?.length > 0) {
		characterPool = bannerCharactersByRarity[selectedRarity];
		characterPoolSource = 'banner';
	  } else {
		characterPool = allCharactersByRarity[selectedRarity];
		characterPoolSource = 'standard';
		// If no characters in standard pool for this rarity, find next available rarity
		if (!characterPool || characterPool.length === 0) {
		  const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
		  const rarityIndex = rarityOrder.indexOf(selectedRarity);
		  for (let i = rarityIndex + 1; i < rarityOrder.length; i++) {
			const fallbackRarity = rarityOrder[i];
			if (allCharactersByRarity[fallbackRarity]?.length > 0) {
			  characterPool = allCharactersByRarity[fallbackRarity];
			  selectedRarity = fallbackRarity;
			  break;
			}
		  }
		}
	  }
	  
	  // Last resort fallback
	  if (!characterPool || characterPool.length === 0) {
		characterPool = allCharacters;
	  }
	  
	  // Select a random character
	  const randomChar = characterPool[Math.floor(Math.random() * characterPool.length)];
	  
	  // Auto-claim the character
	  await user.addCharacter(randomChar);
	  
	  // Log the pull for analysis
	  console.log(`User ${user.username} (ID: ${user.id}) pulled from '${banner.name}' banner: ${randomChar.name} (${selectedRarity}) from ${characterPoolSource} pool. Cost: ${cost} points`);
	  
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
	  console.error(err);
	  res.status(500).json({ error: 'Server error' });
	}
  });
  
// Multi-roll on a banner (similar to standard multi-roll but with banner rates)
router.post('/:id/roll-multi', auth, async (req, res) => {
	try {
	  // Validate banner ID
	  if (!isValidId(req.params.id)) {
		return res.status(400).json({ error: 'Invalid banner ID' });
	  }
	  
	  const count = Math.min(req.body.count || 10, PRICING_CONFIG.maxPulls);
	  const banner = await Banner.findByPk(req.params.id, {
		include: [{ model: Character }]
	  });
	  if (!banner) return res.status(404).json({ error: 'Banner not found' });
	  if (!banner.active) return res.status(400).json({ error: 'This banner is no longer active' });
	  
	  // Check if banner is within date range
	  const now = new Date();
	  if (banner.startDate && new Date(banner.startDate) > now) {
		return res.status(400).json({ error: 'This banner has not started yet' });
	  }
	  if (banner.endDate && new Date(banner.endDate) < now) {
		return res.status(400).json({ error: 'This banner has already ended' });
	  }
	  
	  // Get the user
	  const user = await User.findByPk(req.user.id);
	  
	  // Check payment method: tickets or points
	  const { useTickets, ticketType } = req.body;
	  let finalCost = 0;
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
	    const discount = getDiscountForCount(count);
	    finalCost = Math.floor(baseCost * (1 - discount));
	    
	    if (user.points < finalCost) {
	      return res.status(400).json({
	        error: `Not enough points. This multi-pull costs ${finalCost} points.`,
	        rollTickets: user.rollTickets || 0,
	        premiumTickets: user.premiumTickets || 0
	      });
	    }
	    user.points -= finalCost;
	  }
	  
	  await user.save();
	  
	  // Get user's R18 preference
	  const allowR18 = await getUserAllowR18(req.user.id);
	  
	  // Get banner characters (filtered by R18)
	  const bannerCharacters = allowR18 
	    ? banner.Characters 
	    : banner.Characters.filter(char => !char.isR18);
	  
	  // Get all characters for fallback (filtered by R18)
	  const allChars = await Character.findAll();
	  const allCharacters = allowR18 
	    ? allChars 
	    : allChars.filter(char => !char.isR18);
	  
	  // Group all characters by rarity
	  const allCharactersByRarity = {
		common: allCharacters.filter(char => char.rarity === 'common'),
		uncommon: allCharacters.filter(char => char.rarity === 'uncommon'),
		rare: allCharacters.filter(char => char.rarity === 'rare'),
		epic: allCharacters.filter(char => char.rarity === 'epic'),
		legendary: allCharacters.filter(char => char.rarity === 'legendary')
	  };
	  
	  // Group banner characters by rarity
	  const bannerCharactersByRarity = {
		common: bannerCharacters.filter(char => char.rarity === 'common'),
		uncommon: bannerCharacters.filter(char => char.rarity === 'uncommon'),
		rare: bannerCharacters.filter(char => char.rarity === 'rare'),
		epic: bannerCharacters.filter(char => char.rarity === 'epic'),
		legendary: bannerCharacters.filter(char => char.rarity === 'legendary')
	  };
	  
	  // Define standard drop rates - challenging multi-pull rates
	  const standardDropRates = {
		common: 65,     // 65% chance
		uncommon: 22,   // 22% chance
		rare: 9,        // 9% chance
		epic: 3.5,      // 3.5% chance
		legendary: 0.5  // 0.5% chance
	  };
	  
	  // Define base banner drop rates (slightly better than standard)
	  const baseDropRates = {
		common: 55,     // 55% chance
		uncommon: 24,   // 24% chance
		rare: 14,       // 14% chance
		epic: 6,        // 6% chance
		legendary: 1    // 1% chance
	  };
	  
	  // Premium ticket rates (guaranteed rare or better!)
	  const premiumDropRates = {
		common: 0,      // 0% chance
		uncommon: 0,    // 0% chance
		rare: 65,       // 65% chance
		epic: 28,       // 28% chance
		legendary: 7    // 7% chance
	  };
	  
	  // Apply the rate multiplier to adjust rates for banner
	  const bannerDropRates = {};
	  // Cap the multiplier effect to prevent extreme values
	  const effectiveMultiplier = Math.min(banner.rateMultiplier, 5.0);
	  const rateAdjustment = (effectiveMultiplier - 1) * 0.1; // Reduced scaling effect
	  
	  // Adjust rates based on multiplier (with lower caps)
	  bannerDropRates.legendary = Math.min(baseDropRates.legendary * (1 + rateAdjustment * 2), 3); // Cap at 3%
	  bannerDropRates.epic = Math.min(baseDropRates.epic * (1 + rateAdjustment * 1.5), 12); // Cap at 12%
	  bannerDropRates.rare = Math.min(baseDropRates.rare * (1 + rateAdjustment), 20); // Cap at 20%
	  bannerDropRates.uncommon = Math.min(baseDropRates.uncommon * (1 + rateAdjustment * 0.5), 28); // Cap at 28%
	  
	  // Calculate remaining percentage for common to ensure total is 100%
	  const totalHigherRarities = bannerDropRates.legendary + bannerDropRates.epic + 
								  bannerDropRates.rare + bannerDropRates.uncommon;
	  bannerDropRates.common = Math.max(100 - totalHigherRarities, 35); // Ensure at least 35% common
	  
	  console.log(`Banner ${banner.name} multi-roll rates (multiplier: ${banner.rateMultiplier}):`, bannerDropRates);
	  
	  // Guaranteed pity mechanics
	  const guaranteedRare = count >= 10; // Guarantee at least one rare+ for 10-pulls
	  
	  // Define pity rates (these are not affected by rateMultiplier) - more balanced
	  const pityRates = {
		rare: 85, epic: 14, legendary: 1
	  };
	  
	  let results = [];
	  let hasRarePlus = false; // Track if we've already rolled a rare or better
	  
	  // Roll characters
	  for (let i = 0; i < count; i++) {
		// For the last roll in a 10-pull, enforce pity if needed
		const isLastRoll = (i === count - 1);
		const needsPity = guaranteedRare && isLastRoll && !hasRarePlus;
		
		// Check if this roll uses a premium ticket
		const isPremiumRoll = i < premiumCount;
		
		// Determine if this pull is from the banner pool
		// Banner rate increases for the last few pulls
		const bannerChance = (i >= count - 3) ? 0.85 : 0.7; // 70% normally, 85% for last 3
		const pullFromBanner = Math.random() < bannerChance;
		
		// Select appropriate rates
		// Premium tickets get guaranteed rare+ rates
		let currentRates;
		if (isPremiumRoll) {
		  currentRates = premiumDropRates;
		} else if (needsPity) {
		  currentRates = pityRates;
		} else {
		  currentRates = pullFromBanner ? bannerDropRates : standardDropRates;
		}
		
		// Determine rarity
		const rarityRoll = Math.random() * 100;
		let selectedRarity;
		let cumulativeRate = 0;
		for (const [rarity, rate] of Object.entries(currentRates)) {
		  cumulativeRate += rate;
		  if (rarityRoll <= cumulativeRate) {
			selectedRarity = rarity;
			break;
		  }
		}
		
		// Fallback
		if (!selectedRarity) selectedRarity = 'common';
		
		// Track if we've rolled a rare or better
		if (['rare', 'epic', 'legendary'].includes(selectedRarity)) {
		  hasRarePlus = true;
		}
		
		// Decide character pool
		let characterPool;
		let isBannerChar = false;
		if (pullFromBanner && bannerCharactersByRarity[selectedRarity]?.length > 0) {
		  characterPool = bannerCharactersByRarity[selectedRarity];
		  isBannerChar = true;
		} else {
		  characterPool = allCharactersByRarity[selectedRarity];
		  // If no characters available at this rarity, fallback
		  if (!characterPool || characterPool.length === 0) {
			const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
			const rarityIndex = rarityOrder.indexOf(selectedRarity);
			for (let j = rarityIndex + 1; j < rarityOrder.length; j++) {
			  const fallbackRarity = rarityOrder[j];
			  if (allCharactersByRarity[fallbackRarity]?.length > 0) {
				characterPool = allCharactersByRarity[fallbackRarity];
				selectedRarity = fallbackRarity;
				break;
			  }
			}
		  }
		}
		
		// Final fallback
		if (!characterPool || characterPool.length === 0) {
		  characterPool = allCharacters;
		}
		
		// Get random character
		const randomChar = characterPool[Math.floor(Math.random() * characterPool.length)];
		
		// Auto-claim the character
		await user.addCharacter(randomChar);
		
		// Check if it's actually a banner character (might have fallen back)
		const actuallyBannerChar = bannerCharacters.some(c => c.id === randomChar.id);
		
		// Add to results with banner flag
		results.push({
		  ...randomChar.get({ plain: true }),
		  isBannerCharacter: actuallyBannerChar
		});
	  }
	  
	  // Log the multi-roll
	  console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll on banner '${banner.name}' with ${hasRarePlus ? 'rare+' : 'no rare+'} result (cost: ${finalCost}, discount: ${discount * 100}%)`);
	  
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