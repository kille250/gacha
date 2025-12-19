const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User, Character } = require('../models');
const sequelize = require('../config/db');

// Get user's R18 preference via raw SQL
async function getUserAllowR18(userId) {
  const [rows] = await sequelize.query(
    `SELECT "allowR18" FROM "Users" WHERE "id" = :userId`,
    { replacements: { userId } }
  );
  return rows[0]?.allowR18 === true;
}

// Multi-roll endpoint (10 characters at once)
router.post('/roll-multi', auth, async (req, res) => {
  try {
    const count = Math.min(req.body.count || 10, 20); // Limit to max 20 characters per request
    const basePoints = count * 100;
    // Apply discount based on count (matching frontend logic)
    let discount = 0;
    if (count >= 10) discount = 0.1; // 10% discount for 10+ pulls
    else if (count >= 5) discount = 0.05; // 5% discount for 5-9 pulls
    
    // Calculate final cost with discount
    const finalCost = Math.floor(basePoints * (1 - discount));
    
    const user = await User.findByPk(req.user.id);
    if (user.points < finalCost)
      return res.status(400).json({ error: `Not enough points. Required: ${finalCost}` });
    
    // Deduct points with discount applied
    user.points -= finalCost;
    await user.save();
    
    // Logic for pity system
    const guaranteedRare = count >= 10; // Guarantee at least one rare+ for 10-pulls
    
    // Get user's R18 preference via raw SQL
    const allowR18 = await getUserAllowR18(req.user.id);
    
    // Get all characters, filtered by R18 preference
    const allCharacters = await Character.findAll();
    const characters = allowR18 
      ? allCharacters 
      : allCharacters.filter(char => !char.isR18);
    const charactersByRarity = {
      common: characters.filter(char => char.rarity === 'common'),
      uncommon: characters.filter(char => char.rarity === 'uncommon'),
      rare: characters.filter(char => char.rarity === 'rare'),
      epic: characters.filter(char => char.rarity === 'epic'),
      legendary: characters.filter(char => char.rarity === 'legendary')
    };
    
    // Define drop rates (in percent) - challenging rates
    const standardDropRates = {
      common: 70,     // 70% chance
      uncommon: 20,   // 20% chance
      rare: 7,        // 7% chance
      epic: 2.5,      // 2.5% chance
      legendary: 0.5  // 0.5% chance
    };
    
    // Slightly better drop rates for multi-pulls
    const multiPullRates = {
      common: 65,     // 65% chance
      uncommon: 22,   // 22% chance
      rare: 9,        // 9% chance
      epic: 3.5,      // 3.5% chance
      legendary: 0.5  // 0.5% chance
    };
    
    const dropRates = count >= 10 ? multiPullRates : standardDropRates;
    let results = [];
    let hasRarePlus = false; // Track if we've already rolled a rare or better
    
    // Roll individual characters
    for (let i = 0; i < count; i++) {
      // For the last roll in a 10-pull, enforce pity if no rare+ has been obtained yet
      const isLastRoll = (i === count - 1);
      const needsPity = guaranteedRare && isLastRoll && !hasRarePlus;
      
      // If pity is needed, use modified rates that exclude common & uncommon (more balanced)
      const currentRates = needsPity ? { rare: 85, epic: 14, legendary: 1 } : dropRates;
      
      // Determine rarity based on probability
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
      
      // Fallback for edge cases
      if (!selectedRarity) selectedRarity = 'common';
      
      // Track if we've rolled a rare or better
      if (['rare', 'epic', 'legendary'].includes(selectedRarity)) {
        hasRarePlus = true;
      }
      
      // Check if characters of the selected rarity exist
      if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
        // Fallback: Choose next lower rarity with available characters
        const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
        const rarityIndex = rarityOrder.indexOf(selectedRarity);
        
        for (let j = rarityIndex + 1; j < rarityOrder.length; j++) {
          const fallbackRarity = rarityOrder[j];
          if (charactersByRarity[fallbackRarity]?.length > 0) {
            selectedRarity = fallbackRarity;
            break;
          }
        }
        
        // If still no characters found, pick a random one from all
        if (!charactersByRarity[selectedRarity] || charactersByRarity[selectedRarity].length === 0) {
          const randomChar = characters[Math.floor(Math.random() * characters.length)];
          results.push(randomChar);
          // Auto-claim the character
          await user.addCharacter(randomChar);
          continue;
        }
      }
      
      // Select a random character from the chosen rarity
      const rareCharacters = charactersByRarity[selectedRarity];
      const randomChar = rareCharacters[Math.floor(Math.random() * rareCharacters.length)];
      
      // Auto-claim the character
      await user.addCharacter(randomChar);
      
      // Add to results
      results.push(randomChar);
    }
    
    // Log the multi-roll for analysis
    console.log(`User ${user.username} (ID: ${user.id}) performed a ${count}× roll with ${hasRarePlus ? 'rare+' : 'no rare+'} result (cost: ${finalCost}, discount: ${discount * 100}%)`);
    
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Roll a character
router.post('/roll', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user.points < 100) return res.status(400).json({ error: 'Not enough points' });
    
    // Punkte abziehen
    user.points -= 100;
    await user.save();
    
    // Get user's R18 preference via raw SQL
    const allowR18 = await getUserAllowR18(req.user.id);
    
    // Alle Charaktere nach Seltenheit gruppieren (filtered by R18 preference)
    const allCharacters = await Character.findAll();
    const characters = allowR18 
      ? allCharacters 
      : allCharacters.filter(char => !char.isR18);
    const charactersByRarity = {
      common: characters.filter(char => char.rarity === 'common'),
      uncommon: characters.filter(char => char.rarity === 'uncommon'),
      rare: characters.filter(char => char.rarity === 'rare'),
      epic: characters.filter(char => char.rarity === 'epic'),
      legendary: characters.filter(char => char.rarity === 'legendary')
    };
    
    // Dropchancen definieren (in Prozent)
    const dropRates = {
      common: 60, // 60% Chance
      uncommon: 25, // 25% Chance
      rare: 10, // 10% Chance
      epic: 4, // 4% Chance
      legendary: 1 // 1% Chance
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
        // Auto-claim the character
        await user.addCharacter(randomChar);
        // Protokolliere den Roll
        console.log(`User ${user.username} (ID: ${user.id}) rolled ${randomChar.name} (Fallback random)`);
        return res.json(randomChar);
      }
    }
    
    // Zufälligen Charakter aus der gewählten Rarität auswählen
    const rareCharacters = charactersByRarity[selectedRarity];
    const randomChar = rareCharacters[Math.floor(Math.random() * rareCharacters.length)];
    
    // Auto-claim the character
    await user.addCharacter(randomChar);
    
    // Protokolliere den Roll für Analyse-Zwecke
    console.log(`User ${user.username} (ID: ${user.id}) rolled ${randomChar.name} (${selectedRarity})`);
    
    res.json(randomChar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's collection (filtered by R18 preference)
router.get('/collection', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const allowR18 = await getUserAllowR18(req.user.id);
    
    let characters = await user.getCharacters();
    
    // Filter out R18 characters if user hasn't enabled R18 content
    if (!allowR18) {
      characters = characters.filter(char => !char.isR18);
    }
    
    res.json(characters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Combined collection data endpoint - single request for collection page
router.get('/collection-data', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const allowR18 = await getUserAllowR18(req.user.id);
    
    // Get user's collection and all characters in parallel
    let [collection, allCharacters] = await Promise.all([
      user.getCharacters(),
      Character.findAll()
    ]);
    
    // Filter R18 content if not enabled
    if (!allowR18) {
      collection = collection.filter(char => !char.isR18);
      allCharacters = allCharacters.filter(char => !char.isR18);
    }
    
    res.json({ collection, allCharacters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all characters (filtered by R18 preference if authenticated)
router.get('/', async (req, res) => {
  try {
    let characters = await Character.findAll();
    
    // If user is authenticated, filter based on their R18 preference
    // Check for auth token without requiring it
    const token = req.header('x-auth-token');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const allowR18 = await getUserAllowR18(decoded.user.id);
        if (!allowR18) {
          characters = characters.filter(char => !char.isR18);
        }
      } catch (e) {
        // Invalid token - filter out R18 by default
        characters = characters.filter(char => !char.isR18);
      }
    } else {
      // No auth - filter out R18 by default
      characters = characters.filter(char => !char.isR18);
    }
    
    res.json(characters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;