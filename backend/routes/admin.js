// routes/admin.js - Admin routes for character and user management
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { User, Character, Banner, Coupon, CouponRedemption, FishInventory, AuditEvent } = require('../models');
const { getUrlPath, UPLOAD_BASE } = require('../config/upload');
const { logAdminAction, AUDIT_EVENTS, getSecurityEvents } = require('../services/auditService');
const { getHighRiskUsers, RISK_THRESHOLDS } = require('../services/riskService');
const { characterUpload: upload } = require('../config/multer');
const { isValidId } = require('../utils/validation');
const { safeUnlink, safeDeleteUpload, safeUnlinkMany, downloadImage, generateUniqueFilename, getExtensionFromUrl } = require('../utils/fileUtils');
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
      safeUnlink(req.file.path);
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

    // Delete old image if it was an uploaded file
    safeDeleteUpload(oldImage, 'characters');

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
    await downloadImage(imageUrl, filename, 'characters');
    
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
    safeDeleteUpload(oldImage, 'characters');
    
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

// ===========================================
// SECURITY & ABUSE PREVENTION ENDPOINTS
// ===========================================

// Valid restriction types
const VALID_RESTRICTIONS = ['none', 'warning', 'rate_limited', 'shadowban', 'temp_ban', 'perm_ban'];

/**
 * Parse duration string to milliseconds
 * Formats: 1h, 24h, 7d, 30d
 */
function parseDuration(durationStr) {
  if (!durationStr) return null;
  
  const match = durationStr.match(/^(\d+)(h|d)$/i);
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  
  return null;
}

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
        'riskScore', 'warningCount', 'deviceFingerprints', 'linkedAccounts', 'lastKnownIP'
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
        lastKnownIP: user.lastKnownIP
      },
      auditTrail
    });
  } catch (err) {
    console.error('Get user security error:', err);
    res.status(500).json({ error: 'Failed to fetch user security info' });
  }
});

// POST /api/admin/users/:id/restrict - Apply restriction to user
router.post('/users/:id/restrict', auth, adminAuth, async (req, res) => {
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
    
    // Auto-escalation: 3+ warnings = temp ban
    let autoAction = null;
    if (user.warningCount >= 3 && user.restrictionType === 'none') {
      user.restrictionType = 'temp_ban';
      user.restrictedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      user.restrictionReason = 'Multiple warnings';
      user.lastRestrictionChange = new Date();
      autoAction = 'temp_ban (7 days)';
    }
    
    await user.save();
    
    // Log the warning
    await logAdminAction(AUDIT_EVENTS.ADMIN_WARNING, req.user.id, user.id, {
      warningNumber: user.warningCount,
      reason,
      autoAction
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
    const { limit = 100, offset = 0, userId, eventType, severity } = req.query;
    
    const where = {};
    if (userId) where.userId = parseInt(userId, 10);
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    
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

module.exports = router;
