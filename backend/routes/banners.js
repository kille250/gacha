const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Banner = require('../models/banner');
const Character = require('../models/character');
const User = require('../models/user');

// Configure storage for banner images and videos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = file.mimetype.startsWith('video/') 
      ? 'public/uploads/videos' 
      : 'public/uploads/banners';
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
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

// Get all active banners
router.get('/', async (req, res) => {
	try {
	  const query = req.query.showAll === 'true' ? {} : { where: { active: true } };
	  
	  const banners = await Banner.findAll({
		...query,
		include: [{ model: Character }],
		order: [['featured', 'DESC'], ['createdAt', 'DESC']]
	  });
	  
	  res.json(banners);
	} catch (err) {
	  console.error(err);
	  res.status(500).json({ error: 'Server error' });
	}
  });

// Get a specific banner by ID
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id, {
      include: [{ model: Character }]
    });
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    res.json(banner);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin routes below require authentication and admin privileges
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
      featured, costMultiplier, rateMultiplier, active 
    } = req.body;
    
    // Optional fields
    const characterIds = req.body.characterIds ? JSON.parse(req.body.characterIds) : [];
    
    // Handle file uploads
    let imagePath = null;
    let videoPath = null;
    
    if (req.files) {
      if (req.files.image) {
        console.log('Image file details:', req.files.image[0]);
        imagePath = `/uploads/banners/${req.files.image[0].filename}`;
        console.log('Image path set to:', imagePath);
      }
      
      if (req.files.video) {
        console.log('Video file details:', req.files.video[0]);
        videoPath = `/uploads/videos/${req.files.video[0].filename}`;
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
      active: active !== 'false'
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
    console.log(`Processing banner update for ID: ${req.params.id}`);
    console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');

    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    
    // Update fields if provided
    const fields = [
      'name', 'description', 'series', 'startDate', 'endDate',
      'featured', 'costMultiplier', 'rateMultiplier', 'active'
    ];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'featured') {
          banner[field] = req.body[field] === 'true';
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
          const oldPath = path.join(__dirname, '..', 'public', banner.image);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log('Deleted old image file:', oldPath);
          }
        }
        banner.image = `/uploads/banners/${req.files.image[0].filename}`;
        console.log('Updated banner image path:', banner.image);
      }
      
      if (req.files.video) {
        console.log('New video file:', req.files.video[0].filename);
        // Delete old video if exists
        if (banner.videoUrl && banner.videoUrl.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', 'public', banner.videoUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log('Deleted old video file:', oldPath);
          }
        }
        banner.videoUrl = `/uploads/videos/${req.files.video[0].filename}`;
        console.log('Updated banner video path:', banner.videoUrl);
      }
    }
    
    await banner.save();
    console.log('Banner saved successfully');
    
    // Update character associations if provided
    if (req.body.characterIds) {
      const characterIds = JSON.parse(req.body.characterIds);
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
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    
    // Delete associated files
    if (banner.image && banner.image.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', 'public', banner.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Deleted image file:', imagePath);
      }
    }
    
    if (banner.videoUrl && banner.videoUrl.startsWith('/uploads/')) {
      const videoPath = path.join(__dirname, '..', 'public', banner.videoUrl);
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
	  
	  // Calculate cost
	  const cost = Math.floor(100 * banner.costMultiplier);
	  if (user.points < cost) {
		return res.status(400).json({
		  error: `Not enough points. Banner pulls cost ${cost} points.`
		});
	  }
	  
	  // Deduct points
	  user.points -= cost;
	  await user.save();
	  
	  // Get all banner characters
	  const bannerCharacters = banner.Characters;
	  
	  // Get all characters for fallback
	  const allCharacters = await Character.findAll();
	  
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
	  
	  // Define standard drop rates
	  const standardDropRates = {
		common: 60, // 60% chance
		uncommon: 25, // 25% chance
		rare: 10, // 10% chance
		epic: 4, // 4% chance
		legendary: 1 // 1% chance
	  };
	  
	  // Define base banner drop rates
	  const baseDropRates = {
		common: 35, // 35% chance
		uncommon: 25, // 25% chance
		rare: 20, // 20% chance
		epic: 15, // 15% chance
		legendary: 5 // 5% chance
	  };
	  
	  // Apply the rate multiplier to adjust rates for banner
	  const bannerDropRates = {};
	  // Cap the multiplier effect to prevent extreme values
	  const effectiveMultiplier = Math.min(banner.rateMultiplier, 5.0);
	  const rateAdjustment = (effectiveMultiplier - 1) * 0.2; // Scale the effect
	  
	  // Adjust rates based on multiplier
	  bannerDropRates.legendary = Math.min(baseDropRates.legendary * (1 + rateAdjustment * 4), 15); // Cap at 15%
	  bannerDropRates.epic = Math.min(baseDropRates.epic * (1 + rateAdjustment * 3), 25); // Cap at 25%
	  bannerDropRates.rare = Math.min(baseDropRates.rare * (1 + rateAdjustment * 2), 30); // Cap at 30%
	  bannerDropRates.uncommon = Math.min(baseDropRates.uncommon * (1 + rateAdjustment), 30); // Cap at 30%
	  
	  // Calculate remaining percentage for common to ensure total is 100%
	  const totalHigherRarities = bannerDropRates.legendary + bannerDropRates.epic + 
								  bannerDropRates.rare + bannerDropRates.uncommon;
	  bannerDropRates.common = Math.max(100 - totalHigherRarities, 5); // Ensure at least 5% common
	  
	  console.log(`Banner ${banner.name} rates (multiplier: ${banner.rateMultiplier}):`, bannerDropRates);
	  
	  // Determine if we pull from banner or standard pool
	  // Banner has a significantly higher chance
	  const pullFromBanner = Math.random() < 0.70; // 70% chance to pull from banner
	  
	  // Choose the appropriate drop rates
	  const dropRates = pullFromBanner ? bannerDropRates : standardDropRates;
	  
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
		cost
	  });
	} catch (err) {
	  console.error(err);
	  res.status(500).json({ error: 'Server error' });
	}
  });
  
// Multi-roll on a banner (similar to standard multi-roll but with banner rates)
router.post('/:id/roll-multi', auth, async (req, res) => {
	try {
	  const count = Math.min(req.body.count || 10, 20); // Limit to max 20 characters
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
	  
	  // Calculate base cost with banner multiplier
	  const baseCost = Math.floor(count * 100 * banner.costMultiplier);
	  
	  // Apply bulk discount
	  let discount = 0;
	  if (count >= 10) discount = 0.1; // 10% discount for 10+ pulls
	  else if (count >= 5) discount = 0.05; // 5% discount for 5-9 pulls
	  
	  // Calculate final cost
	  const finalCost = Math.floor(baseCost * (1 - discount));
	  
	  // Get the user
	  const user = await User.findByPk(req.user.id);
	  if (user.points < finalCost) {
		return res.status(400).json({
		  error: `Not enough points. This multi-pull costs ${finalCost} points.`
		});
	  }
	  
	  // Deduct points
	  user.points -= finalCost;
	  await user.save();
	  
	  // Get banner characters
	  const bannerCharacters = banner.Characters;
	  
	  // Get all characters for fallback
	  const allCharacters = await Character.findAll();
	  
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
	  
	  // Define standard drop rates
	  const standardDropRates = {
		common: 55, // 55% chance
		uncommon: 25, // 25% chance
		rare: 12, // 12% chance
		epic: 6, // 6% chance
		legendary: 2 // 2% chance
	  };
	  
	  // Define base banner drop rates
	  const baseDropRates = {
		common: 30, // 30% chance
		uncommon: 30, // 30% chance
		rare: 20, // 20% chance
		epic: 15, // 15% chance
		legendary: 5 // 5% chance
	  };
	  
	  // Apply the rate multiplier to adjust rates for banner
	  const bannerDropRates = {};
	  // Cap the multiplier effect to prevent extreme values
	  const effectiveMultiplier = Math.min(banner.rateMultiplier, 5.0);
	  const rateAdjustment = (effectiveMultiplier - 1) * 0.2; // Scale the effect
	  
	  // Adjust rates based on multiplier
	  bannerDropRates.legendary = Math.min(baseDropRates.legendary * (1 + rateAdjustment * 4), 15); // Cap at 15%
	  bannerDropRates.epic = Math.min(baseDropRates.epic * (1 + rateAdjustment * 3), 25); // Cap at 25%
	  bannerDropRates.rare = Math.min(baseDropRates.rare * (1 + rateAdjustment * 2), 30); // Cap at 30%
	  bannerDropRates.uncommon = Math.min(baseDropRates.uncommon * (1 + rateAdjustment), 30); // Cap at 30%
	  
	  // Calculate remaining percentage for common to ensure total is 100%
	  const totalHigherRarities = bannerDropRates.legendary + bannerDropRates.epic + 
								  bannerDropRates.rare + bannerDropRates.uncommon;
	  bannerDropRates.common = Math.max(100 - totalHigherRarities, 5); // Ensure at least 5% common
	  
	  console.log(`Banner ${banner.name} multi-roll rates (multiplier: ${banner.rateMultiplier}):`, bannerDropRates);
	  
	  // Guaranteed pity mechanics
	  const guaranteedRare = count >= 10; // Guarantee at least one rare+ for 10-pulls
	  
	  // Define pity rates (these are not affected by rateMultiplier)
	  const pityRates = {
		rare: 70, epic: 25, legendary: 5
	  };
	  
	  let results = [];
	  let hasRarePlus = false; // Track if we've already rolled a rare or better
	  
	  // Roll characters
	  for (let i = 0; i < count; i++) {
		// For the last roll in a 10-pull, enforce pity if needed
		const isLastRoll = (i === count - 1);
		const needsPity = guaranteedRare && isLastRoll && !hasRarePlus;
		
		// Determine if this pull is from the banner pool
		// Banner rate increases for the last few pulls
		const bannerChance = (i >= count - 3) ? 0.85 : 0.7; // 70% normally, 85% for last 3
		const pullFromBanner = Math.random() < bannerChance;
		
		// Select appropriate rates
		const currentRates = needsPity ? pityRates :
		  (pullFromBanner ? bannerDropRates : standardDropRates);
		
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
		cost: finalCost
	  });
	} catch (err) {
	  console.error(err);
	  res.status(500).json({ error: 'Server error' });
	}
  });

module.exports = router;