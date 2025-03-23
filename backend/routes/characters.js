const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, Character } = require('../models'); // This should now work

// Roll a character
router.post('/roll', auth, async (req, res) => {
	try {
	  const user = await User.findByPk(req.user.id);
	  if (user.points < 100) return res.status(400).json({ error: 'Not enough points' });
  
	  // Punkte abziehen
	  user.points -= 100;
	  await user.save();
  
	  // Zufälligen Charakter abrufen
	  const characters = await Character.findAll();
	  const randomChar = characters[Math.floor(Math.random() * characters.length)];
  
	  res.json(randomChar);
	} catch (err) {
	  console.error(err);
	  res.status(500).json({ error: 'Server error' });
	}
  });

// Claim a character
router.post('/claim', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const character = await Character.findByPk(req.body.charId);

    if (!character) return res.status(404).json({ error: 'Character not found' });

    await user.addCharacter(character);
    res.json(await user.getCharacters());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's collection
router.get('/collection', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const characters = await user.getCharacters();
    res.json(characters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// routes/characters.js
router.get('/', async (req, res) => {
	try {
	  const characters = await Character.findAll();
	  res.json(characters);
	} catch (err) {
	  console.error(err);
	  res.status(500).json({ error: 'Server error' });
	}
  });

module.exports = router;