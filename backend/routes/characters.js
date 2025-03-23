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
  
	  // Alle Charaktere nach Seltenheit gruppieren
	  const characters = await Character.findAll();
	  const charactersByRarity = {
		common: characters.filter(char => char.rarity === 'common'),
		uncommon: characters.filter(char => char.rarity === 'uncommon'),
		rare: characters.filter(char => char.rarity === 'rare'),
		epic: characters.filter(char => char.rarity === 'epic'),
		legendary: characters.filter(char => char.rarity === 'legendary')
	  };
  
	  // Dropchancen definieren (in Prozent)
	  const dropRates = {
		common: 60,     // 60% Chance
		uncommon: 25,   // 25% Chance
		rare: 10,       // 10% Chance
		epic: 4,        // 4% Chance
		legendary: 1    // 1% Chance
	  };
  
	  // Bestimme die Rarität basierend auf Wahrscheinlichkeit
	  const rarityRoll = Math.random() * 100; // Zufallszahl zwischen 0 und 100
	  let selectedRarity;
	  let cumulativeRate = 0;
  
	  for (const [rarity, rate] of Object.entries(dropRates)) {
		cumulativeRate += rate;
		if (rarityRoll <= cumulativeRate) {
		  selectedRarity = rarity;
		  break;
		}
	  }
  
	  // Fallback für den unwahrscheinlichen Fall, dass nichts ausgewählt wurde
	  if (!selectedRarity) selectedRarity = 'common';
  
	  // Prüfe, ob Charaktere der ausgewählten Rarität existieren
	  if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
		// Fallback: Wähle die nächstniedrigere Rarität mit verfügbaren Charakteren
		const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
		const rarityIndex = rarityOrder.indexOf(selectedRarity);
		
		for (let i = rarityIndex + 1; i < rarityOrder.length; i++) {
		  const fallbackRarity = rarityOrder[i];
		  if (charactersByRarity[fallbackRarity]?.length > 0) {
			selectedRarity = fallbackRarity;
			break;
		  }
		}
		
		// Wenn immer noch keine Charaktere gefunden wurden, wähle einen zufälligen aus allen
		if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
		  const randomChar = characters[Math.floor(Math.random() * characters.length)];
		  
		  // Protokolliere den Roll
		  console.log(`User ${user.username} (ID: ${user.id}) rolled ${randomChar.name} (Fallback random)`);
		  
		  return res.json(randomChar);
		}
	  }
  
	  // Zufälligen Charakter aus der gewählten Rarität auswählen
	  const rareCharacters = charactersByRarity[selectedRarity];
	  const randomChar = rareCharacters[Math.floor(Math.random() * rareCharacters.length)];
  
	  // Protokolliere den Roll für Analyse-Zwecke
	  console.log(`User ${user.username} (ID: ${user.id}) rolled ${randomChar.name} (${selectedRarity})`);
  
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