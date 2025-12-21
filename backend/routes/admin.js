// routes/admin.js - Admin routes for character and user management
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { User, Character, Banner, Coupon, CouponRedemption, FishInventory } = require('../models');
const { getUrlPath, getFilePath, UPLOAD_BASE } = require('../config/upload');
const { characterUpload: upload } = require('../config/multer');
const { isValidId } = require('../utils/validation');
const sequelize = require('../config/db');

// Track server start time
const serverStartTime = Date.now();

// System health check endpoint
router.get('/health', auth, adminAuth, async (req, res) => {
  try {
    const healthData = {
      timestamp: new Date().toISOString(),
      server: {
        status: 'online',
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
      },
      database: {
        status: 'unknown',
        responseTime: null
      },
      storage: {
        status: 'unknown',
        path: UPLOAD_BASE,
        writable: false,
        directories: {}
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      stats: {
        totalUsers: 0,
        activeToday: 0,
        totalCharacters: 0,
        totalBanners: 0,
        totalCoupons: 0
      }
    };

    // Check database connectivity
    const dbStart = Date.now();
    try {
      await sequelize.authenticate();
      healthData.database.status = 'connected';
      healthData.database.responseTime = Date.now() - dbStart;
      healthData.database.dialect = sequelize.getDialect();
    } catch (dbErr) {
      healthData.database.status = 'disconnected';
      healthData.database.error = dbErr.message;
    }

    // Check storage directories
    const storageDirs = ['characters', 'banners', 'videos'];
    for (const dir of storageDirs) {
      const dirPath = path.join(UPLOAD_BASE, dir);
      try {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          healthData.storage.directories[dir] = {
            exists: true,
            fileCount: files.length
          };
        } else {
          healthData.storage.directories[dir] = { exists: false, fileCount: 0 };
        }
      } catch (err) {
        healthData.storage.directories[dir] = { exists: false, error: err.message };
      }
    }

    // Check if storage is writable
    const testFile = path.join(UPLOAD_BASE, '.health-check-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      healthData.storage.writable = true;
      healthData.storage.status = 'available';
    } catch (err) {
      healthData.storage.writable = false;
      healthData.storage.status = 'read-only';
    }

    // Get database stats
    if (healthData.database.status === 'connected') {
      try {
        const [userCount, charCount, bannerCount, couponCount] = await Promise.all([
          User.count(),
          Character.count(),
          Banner.count({ where: { active: true } }),
          Coupon.count({ where: { isActive: true } })
        ]);

        healthData.stats.totalUsers = userCount;
        healthData.stats.totalCharacters = charCount;
        healthData.stats.totalBanners = bannerCount;
        healthData.stats.totalCoupons = couponCount;

        // Count users active in last 24 hours (based on lastDailyReward)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeCount = await User.count({
          where: {
            updatedAt: { [require('sequelize').Op.gte]: oneDayAgo }
          }
        });
        healthData.stats.activeToday = activeCount;
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    }

    res.json(healthData);
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      server: { status: 'error', error: err.message },
      database: { status: 'unknown' },
      storage: { status: 'unknown' },
      memory: {},
      stats: {}
    });
  }
});

// Combined dashboard endpoint - reduces multiple API calls to one
router.get('/dashboard', auth, adminAuth, async (req, res) => {
  try {
    // Fetch all data in parallel
    const [users, characters, banners, coupons, fishStats] = await Promise.all([
      User.findAll({
        attributes: ['id', 'username', 'points', 'isAdmin', 'allowR18', 'showR18', 'autofishEnabled', 'autofishUnlockedByRank', 'createdAt'],
        order: [['points', 'DESC']]
      }),
      Character.findAll(),
      Banner.findAll({
        include: [{ model: Character }],
        order: [['featured', 'DESC'], ['displayOrder', 'ASC'], ['createdAt', 'DESC']]
      }),
      Coupon.findAll({
        include: [
          { model: Character, attributes: ['id', 'name', 'rarity', 'image'], required: false },
          { model: CouponRedemption, attributes: ['id', 'userId', 'redeemedAt'], required: false }
        ],
        order: [['createdAt', 'DESC']]
      }),
      // Get total fish caught (sum of all quantities in FishInventory)
      FishInventory.sum('quantity').catch(() => 0)
    ]);
    
    res.json({ 
      users, 
      characters, 
      banners, 
      coupons,
      stats: {
        totalFishCaught: fishStats || 0
      }
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'points', 'isAdmin', 'allowR18', 'showR18', 'autofishEnabled', 'autofishUnlockedByRank', 'createdAt'],
      order: [['points', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: Toggle R18 access for a user
router.post('/toggle-r18', auth, adminAuth, async (req, res) => {
  try {
    const { userId, enabled } = req.body;
    
    // Validate userId
    if (!userId || !isValidId(userId)) {
      return res.status(400).json({ error: 'Valid User ID required' });
    }
    
    const user = await User.findByPk(parseInt(userId, 10));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.allowR18 = enabled !== undefined ? enabled : !user.allowR18;
    await user.save();
    
    console.log(`Admin (ID: ${req.user.id}) ${user.allowR18 ? 'enabled' : 'disabled'} R18 access for user ${user.username} (ID: ${userId})`);
    
    res.json({
      userId: user.id,
      username: user.username,
      allowR18: user.allowR18,
      message: `R18 access ${user.allowR18 ? 'enabled' : 'disabled'} for ${user.username}`
    });
  } catch (err) {
    console.error('Admin toggle R18 error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new character (admin only)
router.post('/characters', auth, adminAuth, async (req, res) => {
  try {
    const { name, image, series, rarity, isR18 } = req.body;
    if (!name || !image || !series || !rarity) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const character = await Character.create({
      name,
      image,
      series,
      rarity,
      isR18: isR18 || false
    });
    res.status(201).json(character);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/characters/upload', auth, adminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image or video uploaded' });
    }
    const { name, series, rarity, isR18 } = req.body;
    if (!name || !series || !rarity) {
      // Delete uploaded file if other data is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'All fields are required' });
    }
    // Save the relative path to the image or video file
    const imagePath = getUrlPath('characters', req.file.filename);
    const character = await Character.create({
      name,
      image: imagePath,
      series,
      rarity,
      isR18: isR18 === 'true' || isR18 === true
    });
    res.status(201).json({
      message: 'Character added successfully',
      character
    });
  } catch (err) {
    console.error('Character upload error:', err);
    // Try to delete the file if an error occurs
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting file:', unlinkErr);
      }
    }
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Add coins to user account (admin only)
router.post('/add-coins', auth, adminAuth, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        error: 'Valid User ID is required'
      });
    }
    
    // Validate amount - must be a positive integer
    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number'
      });
    }
    
    // Cap maximum coins that can be added at once (prevent accidental huge values)
    const MAX_COINS_PER_OPERATION = 1000000;
    if (parsedAmount > MAX_COINS_PER_OPERATION) {
      return res.status(400).json({
        error: `Amount cannot exceed ${MAX_COINS_PER_OPERATION} coins per operation`
      });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Add coins to user account
    const oldBalance = user.points;
    await user.increment('points', { by: parsedAmount });
    await user.reload();
    
    // Log the operation
    console.log(`Admin (ID: ${req.user.id}) added ${parsedAmount} coins to User ${user.username} (ID: ${userId}). Old balance: ${oldBalance}, New balance: ${user.points}`);
    
    res.json({
      message: `${parsedAmount} coins added to ${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        points: user.points
      }
    });
  } catch (err) {
    console.error('Error adding coins:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/characters/:id', auth, adminAuth, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Validate character ID
    if (!isValidId(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }
    
    const { name, series, rarity, isR18 } = req.body;

    // Find the character
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Update character data
    if (name) character.name = name;
    if (series) character.series = series;
    if (rarity) character.rarity = rarity;
    if (typeof isR18 !== 'undefined') character.isR18 = isR18;

    await character.save();

    // Log the change
    console.log(`Admin (ID: ${req.user.id}) edited character ${character.id} (${character.name})`);

    res.json({
      message: 'Character updated successfully',
      character
    });
  } catch (err) {
    console.error('Error updating character:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update character image/video (admin only)
router.put('/characters/:id/image', auth, adminAuth, upload.single('image'), async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Validate character ID
    if (!isValidId(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }
    
    // Find the character
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    // Check if an image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image or video uploaded' });
    }

    // Save old image path to delete later if it was an uploaded file
    const oldImage = character.image;
    
    // Update image path
    const newImagePath = getUrlPath('characters', req.file.filename);
    character.image = newImagePath;
    await character.save();

    // If the old image was an uploaded file, delete it
    if (oldImage && oldImage.startsWith('/uploads/')) {
      const oldFilename = path.basename(oldImage);
      const oldFilePath = getFilePath('characters', oldFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`Deleted old image/video: ${oldImage}`);
      }
    }

    // Log the change
    console.log(`Admin (ID: ${req.user.id}) updated media for character ${character.id} (${character.name})`);

    res.json({
      message: 'Character media updated successfully',
      character
    });
  } catch (err) {
    console.error('Error updating character media:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Multi-upload characters endpoint
router.post('/characters/multi-upload', auth, adminAuth, (req, res, next) => {
  // Wrap multer to catch errors
  upload.array('images', 50)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log(`Multi-upload request received: ${req.files?.length || 0} files`);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Parse metadata array from request body
    let metadata = [];
    try {
      metadata = JSON.parse(req.body.metadata || '[]');
    } catch (e) {
      // Clean up uploaded files on parse error
      req.files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (err) {}
      });
      return res.status(400).json({ error: 'Invalid metadata format' });
    }

    // Validate we have metadata for each file
    if (metadata.length !== req.files.length) {
      req.files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (err) {}
      });
      return res.status(400).json({ 
        error: `Metadata count (${metadata.length}) doesn't match file count (${req.files.length})` 
      });
    }

    const createdCharacters = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const meta = metadata[i];

      // Validate required fields
      if (!meta.name || !meta.series || !meta.rarity) {
        errors.push({ index: i, filename: file.originalname, error: 'Missing required fields (name, series, rarity)' });
        try { fs.unlinkSync(file.path); } catch (err) {}
        continue;
      }

      try {
        const imagePath = getUrlPath('characters', file.filename);
        const character = await Character.create({
          name: meta.name,
          image: imagePath,
          series: meta.series,
          rarity: meta.rarity || 'common',
          isR18: meta.isR18 === true || meta.isR18 === 'true'
        });
        createdCharacters.push(character);
      } catch (err) {
        errors.push({ index: i, filename: file.originalname, error: err.message });
        try { fs.unlinkSync(file.path); } catch (unlinkErr) {}
      }
    }

    console.log(`Admin (ID: ${req.user.id}) bulk uploaded ${createdCharacters.length} characters (${errors.length} errors)`);

    return res.status(201).json({
      message: `Successfully created ${createdCharacters.length} characters`,
      characters: createdCharacters,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Multi-upload error:', err);
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (unlinkErr) {}
      });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update character image from URL (for Danbooru/external images)
router.put('/characters/:id/image-url', auth, adminAuth, async (req, res) => {
  try {
    const characterId = req.params.id;
    const { imageUrl } = req.body;
    
    // Validate character ID
    if (!isValidId(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }
    
    // Find the character
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Determine file extension from URL
    const urlPath = parsedUrl.pathname;
    let ext = path.extname(urlPath).toLowerCase();
    if (!ext || !['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4'].includes(ext)) {
      ext = '.jpg'; // Default to jpg if extension is unclear
    }
    
    // Generate unique filename
    const filename = `alt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    const filepath = getFilePath('characters', filename);
    
    // Download the image with proper redirect handling
    const downloadImage = (url, maxRedirects = 5) => {
      return new Promise((resolve, reject) => {
        let redirectCount = 0;
        
        const makeRequest = (reqUrl) => {
          const currentUrl = new URL(reqUrl);
          const protocol = currentUrl.protocol === 'https:' ? https : http;
          
          const options = {
            hostname: currentUrl.hostname,
            port: currentUrl.port || (currentUrl.protocol === 'https:' ? 443 : 80),
            path: currentUrl.pathname + currentUrl.search,
            method: 'GET',
            headers: {
              'User-Agent': 'GachaApp/1.0 (Anime Character Import Tool)',
              'Accept': '*/*',
              'Referer': currentUrl.origin
            }
          };
          
          const req = protocol.request(options, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              redirectCount++;
              if (redirectCount > maxRedirects) {
                reject(new Error('Too many redirects'));
                return;
              }
              const redirectUrl = new URL(response.headers.location, reqUrl);
              console.log(`Following redirect ${redirectCount}: ${redirectUrl.href}`);
              makeRequest(redirectUrl.href);
              return;
            }
            
            if (response.statusCode !== 200) {
              reject(new Error(`Download failed with status ${response.statusCode}`));
              return;
            }
            
            const file = fs.createWriteStream(filepath);
            response.pipe(file);
            
            file.on('finish', () => {
              file.close(() => {
                fs.stat(filepath, (err, stats) => {
                  if (err || stats.size < 500) {
                    fs.unlink(filepath, () => {});
                    reject(new Error('Downloaded file is too small or corrupted'));
                  } else {
                    console.log(`Downloaded ${filename}: ${stats.size} bytes`);
                    resolve(filepath);
                  }
                });
              });
            });
            
            file.on('error', (err) => {
              fs.unlink(filepath, () => {});
              reject(err);
            });
          });
          
          req.on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
          });
          
          req.end();
        };
        
        makeRequest(url);
      });
    };
    
    // Download the image from URL
    console.log(`Downloading image from URL: ${imageUrl}`);
    await downloadImage(imageUrl);
    
    // Save old image path to delete later
    const oldImage = character.image;
    
    // Update character with new image path
    const newImagePath = getUrlPath('characters', filename);
    character.image = newImagePath;
    await character.save();
    
    // Reload to ensure we have the latest data
    await character.reload();
    
    console.log(`Updated character ${character.id} image: ${oldImage} -> ${character.image}`);
    
    // Delete old image if it was an uploaded file
    if (oldImage && oldImage.startsWith('/uploads/')) {
      const oldFilename = path.basename(oldImage);
      const oldFilePath = getFilePath('characters', oldFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`Deleted old image: ${oldImage}`);
      }
    }
    
    console.log(`Admin (ID: ${req.user.id}) updated character ${character.id} (${character.name}) image from URL`);
    
    res.json({
      message: 'Character image updated successfully',
      character
    });
  } catch (err) {
    console.error('Error updating character image from URL:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete character (admin only)
router.delete('/characters/:id', auth, adminAuth, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Validate character ID
    if (!isValidId(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }
    
    // Find the character
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    // Save character data for response
    const deletedChar = { ...character.get() };
    
    // If the image was an uploaded file, delete it
    const image = character.image;
    if (image && image.startsWith('/uploads/')) {
      const filename = path.basename(image);
      const filePath = getFilePath('characters', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted media for deleted character: ${image}`);
      }
    }
    
    // Delete the character
    await character.destroy();

    // Log the deletion
    console.log(`Admin (ID: ${req.user.id}) deleted character ${deletedChar.id} (${deletedChar.name})`);

    res.json({
      message: 'Character deleted successfully',
      character: deletedChar
    });
  } catch (err) {
    console.error('Error deleting character:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
