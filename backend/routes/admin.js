// routes/admin.js - Admin routes for character and user management
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { generalRateLimiter, sensitiveActionLimiter } = require('../middleware/rateLimiter');
const { User, Character, Banner, Coupon, CouponRedemption, FishInventory, AuditEvent } = require('../models');
const {
  getStandardBanner,
  getStandardBannerCharacters,
  removeCharacterFromStandardBanner,
  bulkAddToStandardBanner,
  getUnassignedCharacters,
  invalidateStandardBannerCache
} = require('../services/standardBannerService');
const { getUrlPath, UPLOAD_BASE } = require('../config/upload');
const { logAdminAction, AUDIT_EVENTS, getSecurityEvents } = require('../services/auditService');
const { getHighRiskUsers, RISK_THRESHOLDS, calculateRiskScore, parseDuration } = require('../services/riskService');
const securityConfigService = require('../services/securityConfigService');
const { getAllSecurityConfig, updateSecurityConfig, DEFAULTS: CONFIG_DEFAULTS } = securityConfigService;
const { characterUpload: upload } = require('../config/multer');
const { isValidId } = require('../utils/validation');
const { safeUnlink, safeDeleteUpload, safeUnlinkMany, downloadImage, generateUniqueFilename, getExtensionFromUrl } = require('../utils/fileUtils');
const sequelize = require('../config/db');
const { checkForDuplicates, getDetectionMode } = require('../services/duplicateDetectionService');
const { logAdminAction: logDuplicateEvent } = require('../services/auditService');

// ===========================================
// ADMIN RATE LIMITING
// ===========================================
// Apply general rate limiting to all admin routes to prevent abuse
router.use(generalRateLimiter);

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
    } catch (_err) {
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

        // Count users active in last 24 hours (based on updatedAt)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeCount = await User.count({
          where: {
            updatedAt: { [Op.gte]: oneDayAgo }
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
    
    const oldValue = user.allowR18;
    user.allowR18 = enabled !== undefined ? enabled : !user.allowR18;
    await user.save();
    
    // Audit log the action
    await logAdminAction(AUDIT_EVENTS.ADMIN_POINTS_ADJUST || 'admin.r18_toggle', req.user.id, user.id, {
      action: 'r18_toggle',
      oldValue,
      newValue: user.allowR18
    }, req);
    
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
      safeUnlink(req.file.path);
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check for duplicates
    const duplicateCheck = await checkForDuplicates(req.file.path);
    const detectionMode = getDetectionMode();

    if (duplicateCheck.action === 'reject') {
      safeUnlink(req.file.path);
      const existingMatch = duplicateCheck.exactMatch || duplicateCheck.similarMatches[0];
      return res.status(409).json({
        error: duplicateCheck.reason,
        // Frontend-friendly fields
        status: 'confirmed_duplicate',
        explanation: duplicateCheck.reason,
        similarity: existingMatch?.similarity || (duplicateCheck.isExactDuplicate ? 100 : null),
        suggestedActions: ['change_media', 'cancel'],
        existingMatch: existingMatch ? {
          id: existingMatch.id,
          name: existingMatch.name,
          series: existingMatch.series,
          image: existingMatch.image,
          thumbnailUrl: existingMatch.image,
          mediaType: existingMatch.mediaType || 'image',
          similarity: existingMatch.similarity
        } : null,
        // Legacy fields for backwards compatibility
        duplicateType: duplicateCheck.isExactDuplicate ? 'exact' : 'similar',
        existingCharacter: existingMatch
      });
    }

    // Log warnings for audit trail
    if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
      await logDuplicateEvent('character.duplicate_warning', req.user.id, null, {
        action: duplicateCheck.action,
        reason: duplicateCheck.reason,
        matches: duplicateCheck.similarMatches,
        filename: req.file.filename,
        detectionMode
      }, req);
    }

    // Save the relative path to the image or video file
    const imagePath = getUrlPath('characters', req.file.filename);
    const fp = duplicateCheck.fingerprints;
    const character = await Character.create({
      name,
      image: imagePath,
      series,
      rarity,
      isR18: isR18 === 'true' || isR18 === true,
      sha256Hash: fp?.sha256 || null,
      dHash: fp?.dHash || null,
      aHash: fp?.aHash || null,
      duplicateWarning: duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag',
      // Video fingerprint fields
      mediaType: fp?.mediaType || 'image',
      frameHashes: fp?.frameHashes || null,
      representativeDHash: fp?.representativeDHash || null,
      representativeAHash: fp?.representativeAHash || null,
      duration: fp?.duration || null,
      frameCount: fp?.frameCount || null
    });

    const response = {
      message: 'Character added successfully',
      character
    };

    // Include warning in response if flagged
    if (duplicateCheck.action === 'flag') {
      response.warning = duplicateCheck.reason;
      response.similarCharacters = duplicateCheck.similarMatches;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('Character upload error:', err);
    // Clean up uploaded file on error
    if (req.file) safeUnlink(req.file.path);
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
    
    // Audit log the operation
    await logAdminAction(AUDIT_EVENTS.ADMIN_POINTS_ADJUST, req.user.id, user.id, {
      action: 'add_coins',
      amount: parsedAmount,
      oldBalance,
      newBalance: user.points
    }, req);
    
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

    // Check for duplicates (exclude current character)
    const duplicateCheck = await checkForDuplicates(req.file.path, character.id);
    const detectionMode = getDetectionMode();

    if (duplicateCheck.action === 'reject') {
      safeUnlink(req.file.path);
      const existingMatch = duplicateCheck.exactMatch || duplicateCheck.similarMatches[0];
      return res.status(409).json({
        error: duplicateCheck.reason,
        // Frontend-friendly fields
        status: 'confirmed_duplicate',
        explanation: duplicateCheck.reason,
        similarity: existingMatch?.similarity || (duplicateCheck.isExactDuplicate ? 100 : null),
        suggestedActions: ['change_media', 'cancel'],
        existingMatch: existingMatch ? {
          id: existingMatch.id,
          name: existingMatch.name,
          series: existingMatch.series,
          image: existingMatch.image,
          thumbnailUrl: existingMatch.image,
          mediaType: existingMatch.mediaType || 'image',
          similarity: existingMatch.similarity
        } : null,
        // Legacy fields for backwards compatibility
        duplicateType: duplicateCheck.isExactDuplicate ? 'exact' : 'similar',
        existingCharacter: existingMatch
      });
    }

    // Log warnings for audit trail
    if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
      await logDuplicateEvent('character.duplicate_warning', req.user.id, null, {
        action: duplicateCheck.action,
        reason: duplicateCheck.reason,
        matches: duplicateCheck.similarMatches,
        characterId: character.id,
        detectionMode,
        imageUpdate: true
      }, req);
    }

    // Save old image path to delete later if it was an uploaded file
    const oldImage = character.image;

    // Update image path and fingerprints
    const newImagePath = getUrlPath('characters', req.file.filename);
    character.image = newImagePath;
    const fp = duplicateCheck.fingerprints;
    if (fp) {
      character.sha256Hash = fp.sha256;
      character.dHash = fp.dHash;
      character.aHash = fp.aHash;
      character.duplicateWarning = duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag';
      // Video fingerprint fields
      character.mediaType = fp.mediaType || 'image';
      character.frameHashes = fp.frameHashes || null;
      character.representativeDHash = fp.representativeDHash || null;
      character.representativeAHash = fp.representativeAHash || null;
      character.duration = fp.duration || null;
      character.frameCount = fp.frameCount || null;
    }
    await character.save();

    // Delete old image if it was an uploaded file
    safeDeleteUpload(oldImage, 'characters');

    console.log(`Admin (ID: ${req.user.id}) updated media for character ${character.id} (${character.name})`);

    const response = {
      message: 'Character media updated successfully',
      character
    };

    if (duplicateCheck.action === 'flag') {
      response.warning = duplicateCheck.reason;
      response.similarCharacters = duplicateCheck.similarMatches;
    }

    res.json(response);
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
    } catch (_err) {
      // Clean up uploaded files on parse error
      safeUnlinkMany(req.files);
      return res.status(400).json({ error: 'Invalid metadata format' });
    }

    // Validate we have metadata for each file
    if (metadata.length !== req.files.length) {
      safeUnlinkMany(req.files);
      return res.status(400).json({ 
        error: `Metadata count (${metadata.length}) doesn't match file count (${req.files.length})` 
      });
    }

    const createdCharacters = [];
    const errors = [];
    const detectionMode = getDetectionMode();

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const meta = metadata[i];

      // Validate required fields
      if (!meta.name || !meta.series || !meta.rarity) {
        errors.push({ index: i, filename: file.originalname, error: 'Missing required fields (name, series, rarity)' });
        safeUnlink(file.path);
        continue;
      }

      try {
        // Check for duplicates
        const duplicateCheck = await checkForDuplicates(file.path);

        if (duplicateCheck.action === 'reject') {
          const existingMatch = duplicateCheck.exactMatch || duplicateCheck.similarMatches[0];
          errors.push({
            index: i,
            filename: file.originalname,
            error: duplicateCheck.reason,
            duplicateOf: existingMatch?.name,
            // Frontend-friendly fields
            isDuplicate: true,
            status: 'confirmed_duplicate',
            similarity: existingMatch?.similarity || (duplicateCheck.isExactDuplicate ? 100 : null),
            existingMatch: existingMatch ? {
              id: existingMatch.id,
              name: existingMatch.name,
              series: existingMatch.series,
              image: existingMatch.image
            } : null
          });
          safeUnlink(file.path);
          continue;
        }

        // Log warnings for audit trail
        if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
          await logDuplicateEvent('character.duplicate_warning', req.user.id, null, {
            action: duplicateCheck.action,
            reason: duplicateCheck.reason,
            matches: duplicateCheck.similarMatches,
            filename: file.originalname,
            detectionMode,
            bulkUpload: true
          }, req);
        }

        const imagePath = getUrlPath('characters', file.filename);
        const fp = duplicateCheck.fingerprints;
        const character = await Character.create({
          name: meta.name,
          image: imagePath,
          series: meta.series,
          rarity: meta.rarity || 'common',
          isR18: meta.isR18 === true || meta.isR18 === 'true',
          sha256Hash: fp?.sha256 || null,
          dHash: fp?.dHash || null,
          aHash: fp?.aHash || null,
          duplicateWarning: duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag',
          // Video fingerprint fields
          mediaType: fp?.mediaType || 'image',
          frameHashes: fp?.frameHashes || null,
          representativeDHash: fp?.representativeDHash || null,
          representativeAHash: fp?.representativeAHash || null,
          duration: fp?.duration || null,
          frameCount: fp?.frameCount || null
        });
        createdCharacters.push(character);
      } catch (err) {
        errors.push({ index: i, filename: file.originalname, error: err.message });
        safeUnlink(file.path);
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
    safeUnlinkMany(req.files);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update character image from URL (for Danbooru/external images)
router.put('/characters/:id/image-url', auth, adminAuth, async (req, res) => {
  try {
    const characterId = req.params.id;
    const { imageUrl, skipDuplicateCheck } = req.body;

    // Validate character ID
    if (!isValidId(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (_err) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    // Find the character
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Determine file extension and generate unique filename
    const ext = getExtensionFromUrl(imageUrl);
    const filename = generateUniqueFilename('alt', ext);

    // Download the image from URL
    console.log(`Downloading image from URL: ${imageUrl}`);
    const { getFilePath } = require('../config/upload');
    await downloadImage(imageUrl, filename, 'characters');
    const downloadedPath = getFilePath('characters', filename);

    // Check for duplicates (exclude current character)
    let duplicateCheck = { action: 'accept', fingerprints: null };
    if (!skipDuplicateCheck) {
      duplicateCheck = await checkForDuplicates(downloadedPath, character.id);
      const detectionMode = getDetectionMode();

      if (duplicateCheck.action === 'reject') {
        safeUnlink(downloadedPath);
        const existingMatch = duplicateCheck.exactMatch || duplicateCheck.similarMatches[0];
        return res.status(409).json({
          error: duplicateCheck.reason,
          // Frontend-friendly fields
          status: 'confirmed_duplicate',
          explanation: duplicateCheck.reason,
          similarity: existingMatch?.similarity || (duplicateCheck.isExactDuplicate ? 100 : null),
          suggestedActions: ['change_media', 'cancel'],
          existingMatch: existingMatch ? {
            id: existingMatch.id,
            name: existingMatch.name,
            series: existingMatch.series,
            image: existingMatch.image,
            thumbnailUrl: existingMatch.image,
            mediaType: existingMatch.mediaType || 'image',
            similarity: existingMatch.similarity
          } : null,
          // Legacy fields for backwards compatibility
          duplicateType: duplicateCheck.isExactDuplicate ? 'exact' : 'similar',
          existingCharacter: existingMatch
        });
      }

      // Log warnings for audit trail
      if (duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag') {
        await logDuplicateEvent('character.duplicate_warning', req.user.id, null, {
          action: duplicateCheck.action,
          reason: duplicateCheck.reason,
          matches: duplicateCheck.similarMatches,
          characterId: character.id,
          detectionMode,
          imageUpdate: true
        }, req);
      }
    }

    // Save old image path to delete later
    const oldImage = character.image;

    // Update character with new image path and fingerprints
    const newImagePath = getUrlPath('characters', filename);
    character.image = newImagePath;
    const fp = duplicateCheck.fingerprints;
    if (fp) {
      character.sha256Hash = fp.sha256;
      character.dHash = fp.dHash;
      character.aHash = fp.aHash;
      character.duplicateWarning = duplicateCheck.action === 'warn' || duplicateCheck.action === 'flag';
      // Video fingerprint fields
      character.mediaType = fp.mediaType || 'image';
      character.frameHashes = fp.frameHashes || null;
      character.representativeDHash = fp.representativeDHash || null;
      character.representativeAHash = fp.representativeAHash || null;
      character.duration = fp.duration || null;
      character.frameCount = fp.frameCount || null;
    }
    await character.save();

    // Reload to ensure we have the latest data
    await character.reload();

    console.log(`Updated character ${character.id} image: ${oldImage} -> ${character.image}`);

    // Delete old image if it was an uploaded file
    safeDeleteUpload(oldImage, 'characters');

    console.log(`Admin (ID: ${req.user.id}) updated character ${character.id} (${character.name}) image from URL`);

    const response = {
      message: 'Character image updated successfully',
      character
    };

    if (duplicateCheck.action === 'flag') {
      response.warning = duplicateCheck.reason;
      response.similarCharacters = duplicateCheck.similarMatches;
    }

    res.json(response);
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
    
    // Delete associated image if it was an uploaded file
    safeDeleteUpload(character.image, 'characters');
    
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

// Batch delete characters (admin only)
router.post('/characters/batch-delete', [auth, adminAuth, sensitiveActionLimiter], async (req, res) => {
  try {
    const { characterIds } = req.body;

    // Validate input
    if (!Array.isArray(characterIds) || characterIds.length === 0) {
      return res.status(400).json({ error: 'characterIds must be a non-empty array' });
    }

    if (characterIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 characters per batch delete' });
    }

    // Validate all IDs
    const invalidIds = characterIds.filter(id => !isValidId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid character IDs: ${invalidIds.join(', ')}` });
    }

    // Find all characters
    const characters = await Character.findAll({
      where: { id: characterIds }
    });

    if (characters.length === 0) {
      return res.status(404).json({ error: 'No characters found' });
    }

    const results = { success: [], failed: [] };

    // Delete each character
    for (const character of characters) {
      try {
        const charData = { id: character.id, name: character.name };

        // Delete associated image
        safeDeleteUpload(character.image, 'characters');

        // Delete the character
        await character.destroy();

        results.success.push(charData);
      } catch (err) {
        results.failed.push({ id: character.id, name: character.name, error: err.message });
      }
    }

    // Log the batch deletion
    console.log(`Admin (ID: ${req.user.id}) batch deleted ${results.success.length} characters (${results.failed.length} failed)`);

    res.json({
      message: `Deleted ${results.success.length} characters`,
      deleted: results.success,
      failed: results.failed
    });
  } catch (err) {
    console.error('Error batch deleting characters:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// SECURITY & ABUSE PREVENTION ENDPOINTS
// ===========================================

// Valid restriction types
const VALID_RESTRICTIONS = ['none', 'warning', 'rate_limited', 'shadowban', 'temp_ban', 'perm_ban'];

// NOTE: parseDuration is now imported from riskService to avoid duplication

// GET /api/admin/security/overview - Security dashboard overview
router.get('/security/overview', auth, adminAuth, async (req, res) => {
  try {
    // Get counts of restricted users
    const [
      totalBanned,
      tempBanned,
      shadowbanned,
      rateLimited,
      warnings,
      highRiskUsers,
      recentEvents
    ] = await Promise.all([
      User.count({ where: { restrictionType: 'perm_ban' } }),
      User.count({ where: { restrictionType: 'temp_ban' } }),
      User.count({ where: { restrictionType: 'shadowban' } }),
      User.count({ where: { restrictionType: 'rate_limited' } }),
      User.sum('warningCount') || 0,
      getHighRiskUsers(RISK_THRESHOLDS.MONITORING, 10),
      getSecurityEvents({ limit: 20, severity: 'warning' })
    ]);
    
    res.json({
      restrictions: {
        permBanned: totalBanned,
        tempBanned,
        shadowbanned,
        rateLimited,
        totalWarnings: warnings
      },
      highRiskUsers: highRiskUsers.map(u => ({
        id: u.id,
        username: u.username,
        riskScore: u.riskScore,
        warningCount: u.warningCount
      })),
      recentEvents: recentEvents.slice(0, 10),
      thresholds: RISK_THRESHOLDS
    });
  } catch (err) {
    console.error('Security overview error:', err);
    res.status(500).json({ error: 'Failed to fetch security overview' });
  }
});

// GET /api/admin/users/:id/security - Get user security details
router.get('/users/:id/security', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'username', 'email', 'createdAt',
        'restrictionType', 'restrictedUntil', 'restrictionReason',
        'riskScore', 'warningCount', 'deviceFingerprints', 'linkedAccounts', 'lastKnownIP',
        'riskScoreHistory'
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get recent audit events for this user
    const auditTrail = await AuditEvent.findAll({
      where: {
        [Op.or]: [
          { userId: userId },
          { targetUserId: userId }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    // Get IP collision data - users sharing the same IP hash
    let ipCollisions = [];
    if (user.lastKnownIP) {
      const sameIPUsers = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
          lastKnownIP: user.lastKnownIP
        },
        attributes: ['id', 'username', 'restrictionType', 'riskScore', 'createdAt']
      });
      
      ipCollisions = sameIPUsers.map(u => ({
        id: u.id,
        username: u.username,
        restrictionType: u.restrictionType || 'none',
        riskScore: u.riskScore || 0,
        isBanned: ['perm_ban', 'temp_ban'].includes(u.restrictionType),
        createdAt: u.createdAt
      }));
    }
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        restriction: {
          type: user.restrictionType || 'none',
          until: user.restrictedUntil,
          reason: user.restrictionReason
        },
        riskScore: user.riskScore || 0,
        warningCount: user.warningCount || 0,
        deviceFingerprints: user.deviceFingerprints || [],
        linkedAccounts: user.linkedAccounts || [],
        lastKnownIP: user.lastKnownIP,
        riskScoreHistory: user.riskScoreHistory || []
      },
      auditTrail,
      ipCollisions
    });
  } catch (err) {
    console.error('Get user security error:', err);
    res.status(500).json({ error: 'Failed to fetch user security info' });
  }
});

// POST /api/admin/users/:id/restrict - Apply restriction to user
// Security: sensitive action rate limited
router.post('/users/:id/restrict', [auth, adminAuth, sensitiveActionLimiter], async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { restrictionType, duration, reason } = req.body;
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!restrictionType || !VALID_RESTRICTIONS.includes(restrictionType)) {
      return res.status(400).json({ 
        error: 'Invalid restriction type',
        validTypes: VALID_RESTRICTIONS
      });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent self-restriction
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot restrict your own account' });
    }
    
    // Prevent restricting other admins
    if (user.isAdmin) {
      return res.status(400).json({ error: 'Cannot restrict admin accounts' });
    }
    
    const oldRestriction = user.restrictionType;
    
    // Update restriction
    user.restrictionType = restrictionType;
    user.restrictionReason = reason || null;
    user.lastRestrictionChange = new Date();
    
    // Handle duration for temp restrictions
    if (['temp_ban', 'rate_limited'].includes(restrictionType) && duration) {
      const durationMs = parseDuration(duration);
      if (!durationMs) {
        return res.status(400).json({ 
          error: 'Invalid duration format. Use: 1h, 24h, 7d, 30d' 
        });
      }
      user.restrictedUntil = new Date(Date.now() + durationMs);
    } else if (restrictionType === 'none') {
      user.restrictedUntil = null;
      user.restrictionReason = null;
    } else {
      user.restrictedUntil = null;
    }
    
    // Increment warning count for warnings
    if (restrictionType === 'warning') {
      user.warningCount = (user.warningCount || 0) + 1;
    }
    
    await user.save();
    
    // Log the action
    await logAdminAction(AUDIT_EVENTS.ADMIN_RESTRICT, req.user.id, user.id, {
      oldRestriction,
      newRestriction: restrictionType,
      duration,
      reason
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) applied ${restrictionType} to user ${user.username} (ID: ${userId})`);
    
    res.json({
      success: true,
      message: `${restrictionType === 'none' ? 'Restriction removed' : `${restrictionType} applied`} for ${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        restrictionType: user.restrictionType,
        restrictedUntil: user.restrictedUntil,
        restrictionReason: user.restrictionReason,
        warningCount: user.warningCount
      }
    });
  } catch (err) {
    console.error('Restrict user error:', err);
    res.status(500).json({ error: 'Failed to apply restriction' });
  }
});

// POST /api/admin/users/:id/unrestrict - Remove all restrictions
router.post('/users/:id/unrestrict', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldRestriction = user.restrictionType;
    
    // Clear restrictions
    user.restrictionType = 'none';
    user.restrictedUntil = null;
    user.restrictionReason = null;
    user.lastRestrictionChange = new Date();
    
    await user.save();
    
    // Log the action
    await logAdminAction(AUDIT_EVENTS.ADMIN_UNRESTRICT, req.user.id, user.id, {
      oldRestriction,
      reason: reason || 'Manual unrestriction'
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) removed restrictions from user ${user.username} (ID: ${userId})`);
    
    res.json({
      success: true,
      message: `All restrictions removed for ${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        restrictionType: 'none'
      }
    });
  } catch (err) {
    console.error('Unrestrict user error:', err);
    res.status(500).json({ error: 'Failed to remove restriction' });
  }
});

// POST /api/admin/users/:id/warn - Issue a warning
// Auto-escalation configurable via: POLICY_WARNING_ESCALATION_THRESHOLD, POLICY_WARNING_ESCALATION_DURATION
router.post('/users/:id/warn', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Warning reason is required' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Increment warning count
    const oldCount = user.warningCount || 0;
    user.warningCount = oldCount + 1;
    
    // Auto-escalation: configurable threshold and duration
    const escalationThreshold = await securityConfigService.getNumber('POLICY_WARNING_ESCALATION_THRESHOLD', 3);
    const escalationDuration = await securityConfigService.get('POLICY_WARNING_ESCALATION_DURATION', '7d');
    
    let autoAction = null;
    if (user.warningCount >= escalationThreshold && user.restrictionType === 'none') {
      const durationMs = parseDuration(escalationDuration);
      user.restrictionType = 'temp_ban';
      user.restrictedUntil = new Date(Date.now() + durationMs);
      user.restrictionReason = 'Multiple warnings';
      user.lastRestrictionChange = new Date();
      autoAction = `temp_ban (${escalationDuration})`;
    }
    
    await user.save();
    
    // Log the warning
    await logAdminAction(AUDIT_EVENTS.ADMIN_WARNING, req.user.id, user.id, {
      warningNumber: user.warningCount,
      reason,
      autoAction,
      escalationThreshold,
      escalationDuration
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) warned user ${user.username} (warning #${user.warningCount})`);
    
    res.json({
      success: true,
      message: `Warning issued to ${user.username} (warning #${user.warningCount})`,
      user: {
        id: user.id,
        username: user.username,
        warningCount: user.warningCount,
        restrictionType: user.restrictionType
      },
      autoAction
    });
  } catch (err) {
    console.error('Warn user error:', err);
    res.status(500).json({ error: 'Failed to issue warning' });
  }
});

// POST /api/admin/users/:id/reset-warnings - Reset warning count
router.post('/users/:id/reset-warnings', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldCount = user.warningCount || 0;
    user.warningCount = 0;
    await user.save();
    
    await logAdminAction(AUDIT_EVENTS.ADMIN_WARNING, req.user.id, user.id, {
      action: 'reset',
      oldCount
    }, req);
    
    res.json({
      success: true,
      message: `Warnings reset for ${user.username}`,
      oldCount,
      newCount: 0
    });
  } catch (err) {
    console.error('Reset warnings error:', err);
    res.status(500).json({ error: 'Failed to reset warnings' });
  }
});

// GET /api/admin/security/audit - Get audit log
router.get('/security/audit', auth, adminAuth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, userId, eventType, severity, adminId, adminActionsOnly } = req.query;
    
    const where = {};
    if (userId) where.userId = parseInt(userId, 10);
    if (eventType) {
      // Support event category prefix matching (e.g., 'admin' matches 'admin.restrict')
      where.eventType = { [Op.like]: `${eventType}%` };
    }
    if (severity) where.severity = severity;
    
    // Admin activity filters
    if (adminId) {
      where.adminId = parseInt(adminId, 10);
    }
    if (adminActionsOnly === 'true') {
      // Filter for events where adminId is set (admin-initiated actions)
      where.adminId = { [Op.ne]: null };
    }
    
    const events = await AuditEvent.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 100, 500),
      offset: parseInt(offset, 10) || 0
    });
    
    const total = await AuditEvent.count({ where });
    
    res.json({
      events,
      total,
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0
    });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/admin/security/high-risk - Get high-risk users
router.get('/security/high-risk', auth, adminAuth, async (req, res) => {
  try {
    const { threshold = 50, limit = 50 } = req.query;
    
    const users = await getHighRiskUsers(
      parseInt(threshold, 10) || 50,
      parseInt(limit, 10) || 50
    );
    
    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        riskScore: u.riskScore,
        warningCount: u.warningCount,
        createdAt: u.createdAt,
        deviceCount: (u.deviceFingerprints || []).length
      })),
      thresholds: RISK_THRESHOLDS
    });
  } catch (err) {
    console.error('High risk users error:', err);
    res.status(500).json({ error: 'Failed to fetch high risk users' });
  }
});

// ===========================================
// SECURITY CONFIGURATION ENDPOINTS
// ===========================================

// GET /api/admin/security/config - Get all security configuration
router.get('/security/config', auth, adminAuth, async (req, res) => {
  try {
    const config = await getAllSecurityConfig();
    res.json({
      config,
      defaults: CONFIG_DEFAULTS,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get security config error:', err);
    res.status(500).json({ error: 'Failed to fetch security configuration' });
  }
});

// PUT /api/admin/security/config - Update security configuration
// Security: sensitive action rate limited (high-impact operation)
router.put('/security/config', [auth, adminAuth, sensitiveActionLimiter], async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Updates object is required' });
    }
    
    // Validate all values are reasonable
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'number' && (isNaN(value) || value < 0)) {
        return res.status(400).json({ error: `Invalid value for ${key}` });
      }
    }
    
    const result = await updateSecurityConfig(updates, req.user.id);
    
    res.json({
      success: true,
      message: `Updated ${Object.keys(result).length} configuration(s)`,
      updated: result
    });
  } catch (err) {
    console.error('Update security config error:', err);
    res.status(500).json({ error: err.message || 'Failed to update configuration' });
  }
});

// ===========================================
// ENHANCED USER SECURITY ACTIONS
// ===========================================

// POST /api/admin/users/:id/clear-devices - Clear user's device fingerprints
router.post('/users/:id/clear-devices', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldCount = (user.deviceFingerprints || []).length;
    user.deviceFingerprints = [];
    await user.save();
    
    await logAdminAction(AUDIT_EVENTS.ADMIN_CLEAR_DEVICES, req.user.id, userId, {
      clearedCount: oldCount
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) cleared ${oldCount} device fingerprints for user ${user.username}`);
    
    res.json({
      success: true,
      message: `Cleared ${oldCount} device fingerprint(s) for ${user.username}`,
      clearedCount: oldCount
    });
  } catch (err) {
    console.error('Clear devices error:', err);
    res.status(500).json({ error: 'Failed to clear device fingerprints' });
  }
});

// POST /api/admin/users/:id/recalculate-risk - Force risk score recalculation
router.post('/users/:id/recalculate-risk', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldScore = user.riskScore || 0;
    const newScore = await calculateRiskScore(userId, {});
    
    user.riskScore = newScore;
    await user.save();
    
    await logAdminAction(AUDIT_EVENTS.ADMIN_RECALCULATE_RISK, req.user.id, userId, {
      oldScore,
      newScore
    }, req);
    
    res.json({
      success: true,
      message: `Risk score recalculated for ${user.username}`,
      oldScore,
      newScore,
      delta: newScore - oldScore
    });
  } catch (err) {
    console.error('Recalculate risk error:', err);
    res.status(500).json({ error: 'Failed to recalculate risk score' });
  }
});

// POST /api/admin/users/:id/reset-risk - Reset risk score to 0
router.post('/users/:id/reset-risk', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldScore = user.riskScore || 0;
    user.riskScore = 0;
    await user.save();
    
    await logAdminAction(AUDIT_EVENTS.ADMIN_RESET_RISK, req.user.id, userId, {
      oldScore,
      reason: reason || 'Manual reset by admin'
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) reset risk score for user ${user.username} (was ${oldScore})`);
    
    res.json({
      success: true,
      message: `Risk score reset to 0 for ${user.username}`,
      oldScore,
      newScore: 0
    });
  } catch (err) {
    console.error('Reset risk error:', err);
    res.status(500).json({ error: 'Failed to reset risk score' });
  }
});

// GET /api/admin/users/:id/linked-accounts - Get potentially linked accounts
router.get('/users/:id/linked-accounts', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'deviceFingerprints', 'lastKnownIP', 'linkedAccounts']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find users with matching fingerprints
    const fingerprints = user.deviceFingerprints || [];
    const linkedByFingerprint = [];
    
    if (fingerprints.length > 0) {
      const potentialMatches = await User.findAll({
        where: {
          id: { [Op.ne]: userId }
        },
        attributes: ['id', 'username', 'deviceFingerprints', 'restrictionType', 'riskScore']
      });
      
      for (const other of potentialMatches) {
        const otherFps = other.deviceFingerprints || [];
        const shared = fingerprints.filter(fp => otherFps.includes(fp));
        if (shared.length > 0) {
          linkedByFingerprint.push({
            id: other.id,
            username: other.username,
            sharedFingerprints: shared.length,
            restrictionType: other.restrictionType,
            riskScore: other.riskScore
          });
        }
      }
    }
    
    // Find users with same IP
    const linkedByIP = [];
    if (user.lastKnownIP) {
      const sameIP = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
          lastKnownIP: user.lastKnownIP
        },
        attributes: ['id', 'username', 'restrictionType', 'riskScore']
      });
      
      linkedByIP.push(...sameIP.map(u => ({
        id: u.id,
        username: u.username,
        restrictionType: u.restrictionType,
        riskScore: u.riskScore
      })));
    }
    
    res.json({
      userId,
      username: user.username,
      linkedByFingerprint,
      linkedByIP,
      manuallyLinked: user.linkedAccounts || [],
      totalLinked: new Set([
        ...linkedByFingerprint.map(l => l.id),
        ...linkedByIP.map(l => l.id),
        ...(user.linkedAccounts || [])
      ]).size
    });
  } catch (err) {
    console.error('Get linked accounts error:', err);
    res.status(500).json({ error: 'Failed to fetch linked accounts' });
  }
});

// ===========================================
// BULK USER ACTIONS
// ===========================================

// POST /api/admin/users/bulk-restrict - Apply restriction to multiple users
// Security: sensitive action rate limited (bulk operation)
router.post('/users/bulk-restrict', [auth, adminAuth, sensitiveActionLimiter], async (req, res) => {
  try {
    const { userIds, restrictionType, duration, reason } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }
    
    if (userIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 users per bulk action' });
    }
    
    if (!restrictionType || !VALID_RESTRICTIONS.includes(restrictionType)) {
      return res.status(400).json({ 
        error: 'Invalid restriction type',
        validTypes: VALID_RESTRICTIONS
      });
    }
    
    const results = { success: [], failed: [] };
    
    for (const userId of userIds) {
      try {
        const user = await User.findByPk(userId);
        if (!user) {
          results.failed.push({ userId, error: 'User not found' });
          continue;
        }
        
        // Skip admins and self
        if (user.isAdmin || user.id === req.user.id) {
          results.failed.push({ userId, error: 'Cannot restrict admin or self' });
          continue;
        }
        
        const oldRestriction = user.restrictionType;
        user.restrictionType = restrictionType;
        user.restrictionReason = reason || 'Bulk action';
        user.lastRestrictionChange = new Date();
        
        if (['temp_ban', 'rate_limited'].includes(restrictionType) && duration) {
          const durationMs = parseDuration(duration);
          if (durationMs) {
            user.restrictedUntil = new Date(Date.now() + durationMs);
          }
        } else if (restrictionType === 'none') {
          user.restrictedUntil = null;
          user.restrictionReason = null;
        }
        
        if (restrictionType === 'warning') {
          user.warningCount = (user.warningCount || 0) + 1;
        }
        
        await user.save();
        results.success.push({ userId, username: user.username, oldRestriction });
      } catch (err) {
        results.failed.push({ userId, error: err.message });
      }
    }
    
    // Log bulk action
    await logAdminAction(AUDIT_EVENTS.ADMIN_BULK_ACTION, req.user.id, null, {
      action: 'bulk_restrict',
      restrictionType,
      duration,
      reason,
      successCount: results.success.length,
      failedCount: results.failed.length,
      affectedUsers: results.success.map(r => r.userId)
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) bulk restricted ${results.success.length} users with ${restrictionType}`);
    
    res.json({
      success: true,
      message: `Applied ${restrictionType} to ${results.success.length} user(s)`,
      results
    });
  } catch (err) {
    console.error('Bulk restrict error:', err);
    res.status(500).json({ error: 'Failed to perform bulk restriction' });
  }
});

// POST /api/admin/users/bulk-unrestrict - Remove restrictions from multiple users
// Security: sensitive action rate limited (bulk operation)
router.post('/users/bulk-unrestrict', [auth, adminAuth, sensitiveActionLimiter], async (req, res) => {
  try {
    const { userIds, reason } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }
    
    if (userIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 users per bulk action' });
    }
    
    const results = { success: [], failed: [] };
    
    for (const userId of userIds) {
      try {
        const user = await User.findByPk(userId);
        if (!user) {
          results.failed.push({ userId, error: 'User not found' });
          continue;
        }
        
        const oldRestriction = user.restrictionType;
        user.restrictionType = 'none';
        user.restrictedUntil = null;
        user.restrictionReason = null;
        user.lastRestrictionChange = new Date();
        
        await user.save();
        results.success.push({ userId, username: user.username, oldRestriction });
      } catch (err) {
        results.failed.push({ userId, error: err.message });
      }
    }
    
    await logAdminAction(AUDIT_EVENTS.ADMIN_BULK_ACTION, req.user.id, null, {
      action: 'bulk_unrestrict',
      reason: reason || 'Bulk unrestriction',
      successCount: results.success.length,
      failedCount: results.failed.length,
      affectedUsers: results.success.map(r => r.userId)
    }, req);
    
    res.json({
      success: true,
      message: `Removed restrictions from ${results.success.length} user(s)`,
      results
    });
  } catch (err) {
    console.error('Bulk unrestrict error:', err);
    res.status(500).json({ error: 'Failed to perform bulk unrestriction' });
  }
});

// ===========================================
// AUDIT LOG EXPORT
// ===========================================

// GET /api/admin/security/audit/export - Export audit log as JSON/CSV
router.get('/security/audit/export', auth, adminAuth, async (req, res) => {
  try {
    const { format = 'json', limit = 1000, userId, eventType, severity, startDate, endDate } = req.query;
    
    const where = {};
    if (userId) where.userId = parseInt(userId, 10);
    if (eventType) where.eventType = { [Op.like]: `${eventType}%` };
    if (severity) where.severity = severity;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    
    const events = await AuditEvent.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 1000, 10000)
    });
    
    // Log the export
    await logAdminAction(AUDIT_EVENTS.ADMIN_EXPORT_AUDIT, req.user.id, null, {
      format,
      filters: { userId, eventType, severity, startDate, endDate },
      exportedCount: events.length
    }, req);
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = ['id', 'eventType', 'severity', 'userId', 'adminId', 'targetUserId', 'ipHash', 'createdAt', 'data'];
      const rows = events.map(e => [
        e.id,
        e.eventType,
        e.severity,
        e.userId || '',
        e.adminId || '',
        e.targetUserId || '',
        e.ipHash || '',
        e.createdAt.toISOString(),
        JSON.stringify(e.data || {})
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-log-${Date.now()}.csv`);
      return res.send(csv);
    }
    
    // Default to JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-log-${Date.now()}.json`);
    res.json({
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.id,
      totalEvents: events.length,
      filters: { userId, eventType, severity, startDate, endDate },
      events
    });
  } catch (err) {
    console.error('Export audit log error:', err);
    res.status(500).json({ error: 'Failed to export audit log' });
  }
});

// ===========================================
// SECURITY ALERTS
// ===========================================

// GET /api/admin/security/alerts - Get real-time security alerts
router.get('/security/alerts', auth, adminAuth, async (req, res) => {
  try {
    const { limit = 50, since } = req.query;
    
    // Build where clause
    const where = {
      severity: { [Op.in]: ['warning', 'critical'] },
      eventType: {
        [Op.or]: [
          { [Op.like]: 'security.%' },
          { [Op.like]: 'anomaly.%' },
          { [Op.like]: 'policy.%' },
          { [Op.eq]: 'auth.login.failed' },
          { [Op.eq]: 'auth.signup.blocked' }
        ]
      }
    };
    
    // Filter by time if `since` provided (ISO timestamp or epoch ms)
    if (since) {
      const sinceDate = new Date(isNaN(since) ? since : parseInt(since, 10));
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { [Op.gt]: sinceDate };
      }
    }
    
    const alerts = await AuditEvent.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 200),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username'],
        required: false
      }]
    });
    
    // Group alerts by type for summary
    const summary = {
      total: alerts.length,
      byType: {},
      bySeverity: { warning: 0, critical: 0 }
    };
    
    alerts.forEach(alert => {
      const type = alert.eventType.split('.')[0];
      summary.byType[type] = (summary.byType[type] || 0) + 1;
      if (alert.severity === 'critical') {
        summary.bySeverity.critical++;
      } else {
        summary.bySeverity.warning++;
      }
    });
    
    res.json({
      alerts: alerts.map(a => ({
        id: a.id,
        eventType: a.eventType,
        severity: a.severity,
        userId: a.userId,
        username: a.user?.username || null,
        data: a.data,
        ipHash: a.ipHash,
        createdAt: a.createdAt
      })),
      summary,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Security alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch security alerts' });
  }
});

// ===========================================
// SESSION MANAGEMENT
// ===========================================

// POST /api/admin/users/:id/force-logout - Invalidate user sessions
// Security: sensitive action rate limited
router.post('/users/:id/force-logout', [auth, adminAuth, sensitiveActionLimiter], async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent force-logout of other admins
    if (user.isAdmin && user.id !== req.user.id) {
      return res.status(400).json({ error: 'Cannot force logout other admin accounts' });
    }
    
    // Update session invalidation timestamp
    // Any JWT issued before this time will be rejected
    user.sessionInvalidatedAt = new Date();
    await user.save();
    
    // Log the action
    await logAdminAction(AUDIT_EVENTS.FORCE_LOGOUT, req.user.id, userId, {
      reason: reason || 'Admin initiated force logout'
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) force logged out user ${user.username} (ID: ${userId})`);
    
    res.json({
      success: true,
      message: `${user.username} has been logged out from all sessions`,
      sessionInvalidatedAt: user.sessionInvalidatedAt
    });
  } catch (err) {
    console.error('Force logout error:', err);
    res.status(500).json({ error: 'Failed to force logout user' });
  }
});

// POST /api/admin/users/bulk-force-logout - Force logout multiple users
// Security: sensitive action rate limited (bulk operation)
router.post('/users/bulk-force-logout', [auth, adminAuth, sensitiveActionLimiter], async (req, res) => {
  try {
    const { userIds, reason } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }
    
    if (userIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 users per bulk action' });
    }
    
    const results = { success: [], failed: [] };
    const invalidationTime = new Date();
    
    for (const userId of userIds) {
      try {
        const user = await User.findByPk(userId);
        if (!user) {
          results.failed.push({ userId, error: 'User not found' });
          continue;
        }
        
        // Skip other admins
        if (user.isAdmin && user.id !== req.user.id) {
          results.failed.push({ userId, error: 'Cannot force logout admin' });
          continue;
        }
        
        user.sessionInvalidatedAt = invalidationTime;
        await user.save();
        results.success.push({ userId, username: user.username });
      } catch (err) {
        results.failed.push({ userId, error: err.message });
      }
    }
    
    // Log bulk action
    await logAdminAction(AUDIT_EVENTS.ADMIN_BULK_ACTION, req.user.id, null, {
      action: 'bulk_force_logout',
      reason: reason || 'Bulk force logout',
      successCount: results.success.length,
      failedCount: results.failed.length,
      affectedUsers: results.success.map(r => r.userId)
    }, req);
    
    res.json({
      success: true,
      message: `Logged out ${results.success.length} user(s) from all sessions`,
      results
    });
  } catch (err) {
    console.error('Bulk force logout error:', err);
    res.status(500).json({ error: 'Failed to perform bulk force logout' });
  }
});

// ===========================================
// RESTRICTED USERS LIST
// ===========================================

// GET /api/admin/users/restricted - Get all restricted users
router.get('/users/restricted', auth, adminAuth, async (req, res) => {
  try {
    const { type } = req.query;
    
    const where = {
      restrictionType: { [Op.and]: [{ [Op.ne]: 'none' }, { [Op.ne]: null }] }
    };
    
    if (type && VALID_RESTRICTIONS.includes(type)) {
      where.restrictionType = type;
    }
    
    const users = await User.findAll({
      where,
      attributes: [
        'id', 'username', 'email', 'restrictionType', 'restrictedUntil',
        'restrictionReason', 'riskScore', 'warningCount', 'createdAt', 'lastRestrictionChange'
      ],
      order: [['lastRestrictionChange', 'DESC']]
    });
    
    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        restrictionType: u.restrictionType,
        restrictedUntil: u.restrictedUntil,
        restrictionReason: u.restrictionReason,
        riskScore: u.riskScore,
        warningCount: u.warningCount,
        createdAt: u.createdAt,
        lastRestrictionChange: u.lastRestrictionChange
      })),
      total: users.length,
      byType: {
        perm_ban: users.filter(u => u.restrictionType === 'perm_ban').length,
        temp_ban: users.filter(u => u.restrictionType === 'temp_ban').length,
        shadowban: users.filter(u => u.restrictionType === 'shadowban').length,
        rate_limited: users.filter(u => u.restrictionType === 'rate_limited').length,
        warning: users.filter(u => u.restrictionType === 'warning').length
      }
    });
  } catch (err) {
    console.error('Get restricted users error:', err);
    res.status(500).json({ error: 'Failed to fetch restricted users' });
  }
});

// ===========================================
// RISK SCORE MANAGEMENT
// ===========================================

// POST /api/admin/security/decay-risk-scores - Trigger risk score decay
router.post('/security/decay-risk-scores', auth, adminAuth, async (req, res) => {
  try {
    const { decayPercentage = 0.1 } = req.body;
    
    // Validate decay percentage
    const decay = parseFloat(decayPercentage);
    if (isNaN(decay) || decay <= 0 || decay > 0.5) {
      return res.status(400).json({ 
        error: 'Decay percentage must be between 0.01 and 0.5 (1% to 50%)' 
      });
    }
    
    const { decayRiskScores } = require('../services/riskService');
    const decayedCount = await decayRiskScores(decay);
    
    await logAdminAction(AUDIT_EVENTS.ADMIN_BULK_ACTION, req.user.id, null, {
      action: 'risk_score_decay',
      decayPercentage: decay,
      affectedUsers: decayedCount
    }, req);
    
    console.log(`Admin (ID: ${req.user.id}) triggered risk score decay: ${decay * 100}% for ${decayedCount} users`);
    
    res.json({
      success: true,
      message: `Decayed risk scores for ${decayedCount} user(s) by ${decay * 100}%`,
      decayedCount,
      decayPercentage: decay
    });
  } catch (err) {
    console.error('Risk decay error:', err);
    res.status(500).json({ error: 'Failed to decay risk scores' });
  }
});

// GET /api/admin/security/risk-stats - Get risk score statistics
router.get('/security/risk-stats', auth, adminAuth, async (req, res) => {
  try {
    // Check if riskScore column exists (case-insensitive check for both SQLite and PostgreSQL)
    let hasRiskScoreColumn = false;
    try {
      const tableInfo = await sequelize.getQueryInterface().describeTable('Users');
      // Check for both camelCase and lowercase versions (PostgreSQL may lowercase)
      hasRiskScoreColumn = !!(tableInfo.riskScore || tableInfo.riskscore);
    } catch (describeErr) {
      console.warn('Could not describe Users table:', describeErr.message);
    }
    
    if (!hasRiskScoreColumn) {
      // Column doesn't exist - return zeros with a note
      const totalUsers = await User.count();
      return res.json({
        total: totalUsers,
        avgScore: 0,
        maxScore: 0,
        distribution: {
          monitoring: 0,
          elevated: 0,
          high: 0,
          critical: 0
        },
        note: 'Risk scoring not yet enabled - run migrations to add security fields'
      });
    }
    
    // Use dialect-aware quoting for the column name
    const dialect = sequelize.getDialect();
    const quote = dialect === 'postgres' ? '"' : '`';
    const riskCol = `${quote}riskScore${quote}`;
    
    const stats = await User.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COALESCE', sequelize.fn('AVG', sequelize.col('riskScore')), 0), 'avgScore'],
        [sequelize.fn('COALESCE', sequelize.fn('MAX', sequelize.col('riskScore')), 0), 'maxScore'],
        [sequelize.literal(`SUM(CASE WHEN ${riskCol} >= 30 THEN 1 ELSE 0 END)`), 'monitoring'],
        [sequelize.literal(`SUM(CASE WHEN ${riskCol} >= 50 THEN 1 ELSE 0 END)`), 'elevated'],
        [sequelize.literal(`SUM(CASE WHEN ${riskCol} >= 70 THEN 1 ELSE 0 END)`), 'high'],
        [sequelize.literal(`SUM(CASE WHEN ${riskCol} >= 85 THEN 1 ELSE 0 END)`), 'critical']
      ],
      raw: true
    });
    
    const result = stats[0] || {};
    
    res.json({
      total: parseInt(result.total) || 0,
      avgScore: Math.round(parseFloat(result.avgScore) || 0),
      maxScore: parseInt(result.maxScore) || 0,
      distribution: {
        monitoring: parseInt(result.monitoring) || 0,
        elevated: parseInt(result.elevated) || 0,
        high: parseInt(result.high) || 0,
        critical: parseInt(result.critical) || 0
      }
    });
  } catch (err) {
    console.error('Risk stats error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch risk statistics', details: err.message });
  }
});

// ===========================================
// SESSION ACTIVITY
// ===========================================

// GET /api/admin/users/:id/sessions - Get user's session activity from audit log
router.get('/users/:id/sessions', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'lastKnownIP', 'sessionInvalidatedAt', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get login events from audit log
    const loginEvents = await AuditEvent.findAll({
      where: {
        userId,
        eventType: {
          [Op.in]: ['auth.login.success', 'auth.google.login', 'auth.login.failed']
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'eventType', 'ipHash', 'userAgent', 'deviceFingerprint', 'createdAt', 'data']
    });
    
    // Get the last successful login
    const lastSuccessfulLogin = loginEvents.find(e => 
      e.eventType === 'auth.login.success' || e.eventType === 'auth.google.login'
    );
    
    // Count failed logins in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailedLogins = loginEvents.filter(e => 
      e.eventType === 'auth.login.failed' && new Date(e.createdAt) > oneDayAgo
    ).length;
    
    res.json({
      userId,
      username: user.username,
      lastKnownIP: user.lastKnownIP,
      sessionInvalidatedAt: user.sessionInvalidatedAt,
      accountCreated: user.createdAt,
      lastSuccessfulLogin: lastSuccessfulLogin ? {
        timestamp: lastSuccessfulLogin.createdAt,
        ipHash: lastSuccessfulLogin.ipHash,
        method: lastSuccessfulLogin.eventType === 'auth.google.login' ? 'google' : 'password'
      } : null,
      recentFailedLogins,
      loginHistory: loginEvents.map(e => ({
        id: e.id,
        type: e.eventType,
        success: e.eventType !== 'auth.login.failed',
        ipHash: e.ipHash,
        userAgent: e.userAgent?.substring(0, 100),
        timestamp: e.createdAt
      }))
    });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch session activity' });
  }
});

// ===========================================
// DEVICE HISTORY
// ===========================================

// GET /api/admin/users/:id/device-history - Get detailed device history
router.get('/users/:id/device-history', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'deviceFingerprints', 'lastKnownIP']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get device-related events from audit log
    const deviceEvents = await AuditEvent.findAll({
      where: {
        userId,
        eventType: {
          [Op.in]: ['admin.security.deviceNew', 'admin.security.deviceCollision', 'admin.security.deviceMismatch']
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'eventType', 'deviceFingerprint', 'ipHash', 'createdAt', 'data']
    });
    
    // Get unique device fingerprints with first/last seen from login events
    const loginEvents = await AuditEvent.findAll({
      where: {
        userId,
        eventType: {
          [Op.in]: ['auth.login.success', 'auth.google.login']
        },
        deviceFingerprint: { [Op.ne]: null }
      },
      order: [['createdAt', 'ASC']],
      attributes: ['deviceFingerprint', 'ipHash', 'createdAt']
    });
    
    // Build device history with timestamps
    const deviceMap = new Map();
    for (const event of loginEvents) {
      const fp = event.deviceFingerprint;
      if (!fp) continue;
      
      if (!deviceMap.has(fp)) {
        deviceMap.set(fp, {
          fingerprint: fp,
          firstSeen: event.createdAt,
          lastSeen: event.createdAt,
          ipHashes: new Set([event.ipHash]),
          loginCount: 1
        });
      } else {
        const device = deviceMap.get(fp);
        device.lastSeen = event.createdAt;
        if (event.ipHash) device.ipHashes.add(event.ipHash);
        device.loginCount++;
      }
    }
    
    const deviceHistory = Array.from(deviceMap.values()).map(d => ({
      fingerprint: d.fingerprint?.substring(0, 16) + '...',
      fullFingerprint: d.fingerprint,
      firstSeen: d.firstSeen,
      lastSeen: d.lastSeen,
      ipCount: d.ipHashes.size,
      loginCount: d.loginCount
    })).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    
    res.json({
      userId,
      username: user.username,
      currentDevices: (user.deviceFingerprints || []).map(fp => 
        typeof fp === 'string' ? fp.substring(0, 16) + '...' : fp
      ),
      deviceHistory,
      deviceEvents: deviceEvents.map(e => ({
        id: e.id,
        type: e.eventType,
        fingerprint: e.deviceFingerprint?.substring(0, 16) + '...',
        ipHash: e.ipHash,
        timestamp: e.createdAt,
        data: e.data
      })),
      totalDevicesEverSeen: deviceMap.size
    });
  } catch (err) {
    console.error('Get device history error:', err);
    res.status(500).json({ error: 'Failed to fetch device history' });
  }
});

// ===========================================
// AUTO-ENFORCEMENT EVENTS
// ===========================================

// GET /api/admin/security/auto-enforcements - Get auto-enforcement events
router.get('/security/auto-enforcements', auth, adminAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const events = await AuditEvent.findAll({
      where: {
        eventType: 'security.auto_restriction'
      },
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 200),
      offset: parseInt(offset, 10) || 0
    });
    
    const total = await AuditEvent.count({
      where: { eventType: 'security.auto_restriction' }
    });
    
    // Get usernames for the events
    const userIds = [...new Set(events.map(e => e.userId).filter(Boolean))];
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'username']
    });
    const userMap = new Map(users.map(u => [u.id, u.username]));
    
    res.json({
      events: events.map(e => ({
        id: e.id,
        userId: e.userId,
        username: userMap.get(e.userId) || 'Unknown',
        action: e.data?.action,
        reason: e.data?.reason,
        escalated: e.data?.escalated,
        previousRestriction: e.data?.previousRestriction,
        expiresAt: e.data?.expiresAt,
        timestamp: e.createdAt
      })),
      total,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0
    });
  } catch (err) {
    console.error('Get auto-enforcements error:', err);
    res.status(500).json({ error: 'Failed to fetch auto-enforcement events' });
  }
});

// ===========================================
// RISK SCORE HISTORY
// ===========================================

// GET /api/admin/users/:id/risk-history - Get user's risk score change history
router.get('/users/:id/risk-history', auth, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'riskScore', 'riskScoreHistory']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get risk score change events from audit log
    const riskEvents = await AuditEvent.findAll({
      where: {
        userId,
        eventType: {
          [Op.in]: ['admin.security.riskChange', 'admin.security.reset_risk', 'admin.security.recalculate_risk']
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'eventType', 'data', 'createdAt', 'adminId']
    });
    
    res.json({
      userId,
      username: user.username,
      currentScore: user.riskScore || 0,
      history: user.riskScoreHistory || [],
      events: riskEvents.map(e => ({
        id: e.id,
        type: e.eventType,
        oldScore: e.data?.oldScore,
        newScore: e.data?.newScore,
        delta: e.data?.delta,
        reason: e.data?.reason,
        adminId: e.adminId,
        timestamp: e.createdAt
      }))
    });
  } catch (err) {
    console.error('Get risk history error:', err);
    res.status(500).json({ error: 'Failed to fetch risk history' });
  }
});

// ===========================================
// STANDARD BANNER MANAGEMENT
// ===========================================

// GET /api/admin/standard-banner - Get Standard Banner info and characters
router.get('/standard-banner', auth, adminAuth, async (req, res) => {
  try {
    const banner = await getStandardBanner();
    if (!banner) {
      return res.status(404).json({
        error: 'Standard Banner not found. Run migrations to create it.'
      });
    }

    const characters = await getStandardBannerCharacters(true); // Force refresh

    res.json({
      banner: {
        id: banner.id,
        name: banner.name,
        description: banner.description,
        isStandard: banner.isStandard,
        active: banner.active
      },
      characters: characters.map(c => ({
        id: c.id,
        name: c.name,
        series: c.series,
        rarity: c.rarity,
        image: c.image,
        isR18: c.isR18
      })),
      totalCharacters: characters.length
    });
  } catch (err) {
    console.error('Get standard banner error:', err);
    res.status(500).json({ error: 'Failed to fetch standard banner' });
  }
});

// GET /api/admin/standard-banner/unassigned - Get characters not on any banner
router.get('/standard-banner/unassigned', auth, adminAuth, async (req, res) => {
  try {
    const unassigned = await getUnassignedCharacters();

    res.json({
      characters: unassigned.map(c => ({
        id: c.id,
        name: c.name,
        series: c.series,
        rarity: c.rarity,
        image: c.image,
        isR18: c.isR18
      })),
      total: unassigned.length,
      message: unassigned.length > 0
        ? `${unassigned.length} character(s) are not assigned to any banner and will NOT be pullable`
        : 'All characters are assigned to at least one banner'
    });
  } catch (err) {
    console.error('Get unassigned characters error:', err);
    res.status(500).json({ error: 'Failed to fetch unassigned characters' });
  }
});

// POST /api/admin/standard-banner/add - Add character(s) to Standard Banner
router.post('/standard-banner/add', [auth, adminAuth], async (req, res) => {
  try {
    const { characterId, characterIds } = req.body;

    // Support both single and bulk add
    const idsToAdd = characterIds || (characterId ? [characterId] : []);

    if (!idsToAdd.length) {
      return res.status(400).json({ error: 'characterId or characterIds required' });
    }

    // Validate IDs
    for (const id of idsToAdd) {
      if (!isValidId(id)) {
        return res.status(400).json({ error: `Invalid character ID: ${id}` });
      }
    }

    const addedCount = await bulkAddToStandardBanner(idsToAdd);

    await logAdminAction(AUDIT_EVENTS.ADMIN_BANNER_UPDATE || 'admin.standard_banner.add', req.user.id, null, {
      action: 'add_to_standard_banner',
      characterIds: idsToAdd,
      addedCount
    }, req);

    console.log(`Admin (ID: ${req.user.id}) added ${addedCount} character(s) to Standard Banner`);

    res.json({
      success: true,
      message: `Added ${addedCount} character(s) to Standard Banner`,
      addedCount
    });
  } catch (err) {
    console.error('Add to standard banner error:', err);
    res.status(500).json({ error: err.message || 'Failed to add character(s)' });
  }
});

// POST /api/admin/standard-banner/remove - Remove character from Standard Banner
router.post('/standard-banner/remove', [auth, adminAuth], async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId || !isValidId(characterId)) {
      return res.status(400).json({ error: 'Valid characterId required' });
    }

    await removeCharacterFromStandardBanner(characterId);

    await logAdminAction(AUDIT_EVENTS.ADMIN_BANNER_UPDATE || 'admin.standard_banner.remove', req.user.id, null, {
      action: 'remove_from_standard_banner',
      characterId
    }, req);

    console.log(`Admin (ID: ${req.user.id}) removed character ${characterId} from Standard Banner`);

    res.json({
      success: true,
      message: 'Character removed from Standard Banner',
      characterId
    });
  } catch (err) {
    console.error('Remove from standard banner error:', err);
    res.status(500).json({ error: err.message || 'Failed to remove character' });
  }
});

// POST /api/admin/standard-banner/add-all-unassigned - Add all unassigned characters to Standard Banner
router.post('/standard-banner/add-all-unassigned', [auth, adminAuth], async (req, res) => {
  try {
    const unassigned = await getUnassignedCharacters();

    if (unassigned.length === 0) {
      return res.json({
        success: true,
        message: 'No unassigned characters to add',
        addedCount: 0
      });
    }

    const characterIds = unassigned.map(c => c.id);
    const addedCount = await bulkAddToStandardBanner(characterIds);

    await logAdminAction(AUDIT_EVENTS.ADMIN_BANNER_UPDATE || 'admin.standard_banner.bulk_add', req.user.id, null, {
      action: 'add_all_unassigned_to_standard_banner',
      characterIds,
      addedCount
    }, req);

    console.log(`Admin (ID: ${req.user.id}) added ${addedCount} unassigned character(s) to Standard Banner`);

    res.json({
      success: true,
      message: `Added ${addedCount} unassigned character(s) to Standard Banner`,
      addedCount,
      characterIds
    });
  } catch (err) {
    console.error('Add all unassigned error:', err);
    res.status(500).json({ error: err.message || 'Failed to add unassigned characters' });
  }
});

// POST /api/admin/standard-banner/refresh-cache - Force refresh Standard Banner cache
router.post('/standard-banner/refresh-cache', [auth, adminAuth], async (req, res) => {
  try {
    invalidateStandardBannerCache();
    const characters = await getStandardBannerCharacters(true);

    res.json({
      success: true,
      message: 'Standard Banner cache refreshed',
      characterCount: characters.length
    });
  } catch (err) {
    console.error('Refresh cache error:', err);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

module.exports = router;
