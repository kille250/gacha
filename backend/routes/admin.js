// routes/admin.js (updated with video support)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { User, Character } = require('../models');
const { UPLOAD_DIRS, getUrlPath, getFilePath } = require('../config/upload');

// ===========================================
// SECURITY: Input validation helpers
// ===========================================

// Validate that a value is a positive integer
const isValidId = (value) => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && String(num) === String(value);
};

// Konfiguration für Multer (Dateispeicherung)
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, UPLOAD_DIRS.characters);
  },
  filename: function(req, file, cb) {
    // Sichere Dateinamen mit Zeitstempel
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Überprüfe, ob die Datei ein Bild oder Video ist
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || 
      file.mimetype === 'video/mp4' || 
      file.mimetype === 'video/webm') {
    cb(null, true);
  } else {
    cb(new Error('Only images or videos (MP4, WebM) are allowed'), false);
  }
};

// Bereite Multer mit den Optionen vor
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB Maximalgröße
  }
});

// Combined dashboard endpoint - reduces multiple API calls to one
router.get('/dashboard', auth, adminAuth, async (req, res) => {
  try {
    const Banner = require('../models/banner');
    const { Coupon, CouponRedemption } = require('../models');
    
    // Fetch all data in parallel
    const [users, characters, banners, coupons] = await Promise.all([
      User.findAll({
        attributes: ['id', 'username', 'points', 'isAdmin', 'autofishEnabled', 'autofishUnlockedByRank', 'createdAt'],
        order: [['points', 'DESC']]
      }),
      Character.findAll(),
      Banner.findAll({
        include: [{ model: Character }],
        order: [['featured', 'DESC'], ['createdAt', 'DESC']]
      }),
      Coupon.findAll({
        include: [
          { model: Character, attributes: ['id', 'name', 'rarity', 'image'], required: false },
          { model: CouponRedemption, attributes: ['id', 'userId', 'redeemedAt'], required: false }
        ],
        order: [['createdAt', 'DESC']]
      })
    ]);
    
    res.json({ users, characters, banners, coupons });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Alle Benutzer abrufen (nur Admin)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'points', 'isAdmin', 'autofishEnabled', 'autofishUnlockedByRank', 'createdAt'],
      order: [['points', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Neuen Charakter hinzufügen (nur Admin)
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
      // Lösche die hochgeladene Datei, wenn die anderen Daten fehlen
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'All fields are required' });
    }
    // Speichere den relativen Pfad zur Bild- oder Videodatei
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
    // Versuche, die Datei zu löschen, wenn ein Fehler auftritt
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

// In routes/admin.js - Coins hinzufügen
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
    
    // Coins zum Benutzerkonto hinzufügen
    const oldBalance = user.points;
    await user.increment('points', { by: parsedAmount });
    await user.reload();
    
    // Log erstellen
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

    // Suche den Charakter
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Aktualisiere die Charakterdaten
    if (name) character.name = name;
    if (series) character.series = series;
    if (rarity) character.rarity = rarity;
    if (typeof isR18 !== 'undefined') character.isR18 = isR18;

    await character.save();

    // Log die Änderung
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

// In routes/admin.js - Route zum Aktualisieren des Bildes eines Charakters
router.put('/characters/:id/image', auth, adminAuth, upload.single('image'), async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Validate character ID
    if (!isValidId(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }
    
    // Suche den Charakter
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    // Überprüfe, ob ein Bild hochgeladen wurde
    if (!req.file) {
      return res.status(400).json({ error: 'No image or video uploaded' });
    }

    // Speichere das alte Bild, um es später zu löschen, wenn es ein hochgeladenes Bild war
    const oldImage = character.image;
    
    // Aktualisiere den Bildpfad
    const newImagePath = getUrlPath('characters', req.file.filename);
    character.image = newImagePath;
    await character.save();

    // Wenn das alte Bild ein hochgeladenes Bild war, lösche es
    if (oldImage && oldImage.startsWith('/uploads/')) {
      const oldFilename = path.basename(oldImage);
      const oldFilePath = getFilePath('characters', oldFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`Deleted old image/video: ${oldImage}`);
      }
    }

    // Log die Änderung
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

    const responseData = {
      message: `Successfully created ${createdCharacters.length} characters`,
      characters: createdCharacters,
      errors: errors.length > 0 ? errors : undefined
    };
    
    console.log('Sending response:', JSON.stringify(responseData).substring(0, 200));
    return res.status(201).json(responseData);
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

// In routes/admin.js - Route zum Löschen eines Charakters
router.delete('/characters/:id', auth, adminAuth, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // Validate character ID
    if (!isValidId(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID' });
    }
    
    // Suche den Charakter
    const character = await Character.findByPk(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    // Speichere Charakterdaten für die Antwort
    const deletedChar = { ...character.get() };
    
    // Wenn das Bild ein hochgeladenes Bild war, lösche es
    const image = character.image;
    if (image && image.startsWith('/uploads/')) {
      const filename = path.basename(image);
      const filePath = getFilePath('characters', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted media for deleted character: ${image}`);
      }
    }
    
    // Lösche den Charakter
    await character.destroy();

    // Log die Löschung
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
