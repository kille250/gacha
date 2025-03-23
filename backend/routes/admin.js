// routes/admin.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { User, Character } = require('../models');

// Konfiguration für Multer (Dateispeicherung)
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/characters/');
  },
  filename: function(req, file, cb) {
    // Sichere Dateinamen mit Zeitstempel
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Überprüfe, ob die Datei ein Bild ist
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
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

// Alle Benutzer abrufen (nur Admin)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'points', 'isAdmin', 'createdAt']
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
    const { name, image, series, rarity } = req.body;
    
    if (!name || !image || !series || !rarity) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const character = await Character.create({
      name,
      image,
      series,
      rarity
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
		return res.status(400).json({ error: 'No image uploaded' });
	  }
  
	  const { name, series, rarity } = req.body;
	  
	  if (!name || !series || !rarity) {
		// Lösche die hochgeladene Datei, wenn die anderen Daten fehlen
		fs.unlinkSync(req.file.path);
		return res.status(400).json({ error: 'All fields are required' });
	  }
  
	  // Speichere den relativen Pfad zur Bilddatei
	  const imagePath = `/uploads/characters/${req.file.filename}`;
  
	  const character = await Character.create({
		name,
		image: imagePath,
		series,
		rarity
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
	  
	  res.status(500).json({ error: 'Server error' });
	}
  });

// In routes/admin.js - Coins hinzufügen
router.post('/add-coins', auth, adminAuth, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount || isNaN(amount)) {
      return res.status(400).json({ 
        error: 'User ID and valid amount are required' 
      });
    }
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Coins zum Benutzerkonto hinzufügen
    const oldBalance = user.points;
    await user.increment('points', { by: parseInt(amount) });
    await user.reload();
    
    // Log erstellen
    console.log(`Admin (ID: ${req.user.id}) added ${amount} coins to User ${user.username} (ID: ${userId}). Old balance: ${oldBalance}, New balance: ${user.points}`);
    
    res.json({
      message: `${amount} coins added to ${user.username}`,
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

module.exports = router;