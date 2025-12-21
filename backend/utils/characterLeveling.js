/**
 * Character Leveling Utility
 * 
 * Handles character acquisition and manual leveling system.
 * - Duplicates give "shards" that players can use to level up
 * - Players choose when to level up their cards
 * - Max level duplicates convert to bonus points (scaled by rarity)
 * 
 * Configuration is centralized in config/leveling.js
 */

const { UserCharacter, Character } = require('../models');
const {
  LEVEL_CONFIG,
  getLevelMultiplier,
  getShardsToLevel,
  isMaxLevel,
  getMaxLevelDuplicatePoints
} = require('../config/leveling');

// Re-export LEVEL_CONFIG as LEVELING_CONFIG for backwards compatibility
const LEVELING_CONFIG = LEVEL_CONFIG;

/**
 * Acquire a character for a user
 * - New character: adds to collection at level 1
 * - Duplicate: adds 1 shard (does NOT auto-level)
 * - Max level duplicate: awards bonus points (scaled by rarity)
 * 
 * @param {number} userId - User ID
 * @param {number} characterId - Character ID
 * @param {Object} user - User model instance (for point rewards)
 * @param {string} rarity - Character rarity (optional, fetched if not provided)
 * @returns {Promise<Object>} - Result object with acquisition details
 */
const acquireCharacter = async (userId, characterId, user = null, rarity = null) => {
  // Try to find existing entry
  const existing = await UserCharacter.findOne({
    where: {
      UserId: userId,
      CharacterId: characterId
    }
  });
  
  if (!existing) {
    // New character - create entry at level 1 with 0 shards
    await UserCharacter.create({
      UserId: userId,
      CharacterId: characterId,
      level: 1,
      duplicateCount: 0  // duplicateCount = shards
    });
    
    return {
      isNew: true,
      isDuplicate: false,
      shards: 0,
      level: 1,
      isMaxLevel: false,
      bonusPoints: 0
    };
  }
  
  // Duplicate! Check if max level
  const wasMaxLevel = isMaxLevel(existing.level);
  let bonusPoints = 0;
  
  if (wasMaxLevel) {
    // Max level - award bonus points based on rarity
    // Fetch rarity if not provided
    let charRarity = rarity;
    if (!charRarity) {
      const character = await Character.findByPk(characterId);
      charRarity = character?.rarity || 'common';
    }
    
    bonusPoints = getMaxLevelDuplicatePoints(charRarity);
    if (user) {
      user.points += bonusPoints;
      await user.save();
    }
  } else {
    // Add a shard
    existing.duplicateCount += 1;
    await existing.save();
  }
  
  return {
    isNew: false,
    isDuplicate: true,
    shards: existing.duplicateCount,
    level: existing.level,
    isMaxLevel: wasMaxLevel,
    bonusPoints,
    canLevelUp: !wasMaxLevel && existing.duplicateCount >= getShardsToLevel(existing.level)
  };
};

/**
 * Acquire multiple characters (for multi-rolls)
 * 
 * @param {number} userId - User ID
 * @param {Array<Object>} characters - Array of character objects (must have id and rarity)
 * @param {Object} user - User model instance (for point rewards)
 * @returns {Promise<Array<Object>>} - Array of acquisition results
 */
const acquireMultipleCharacters = async (userId, characters, user = null) => {
  const results = [];
  let totalBonusPoints = 0;
  
  // Process sequentially to handle duplicates within the same batch correctly
  for (const character of characters) {
    if (character && character.id) {
      // Don't pass user to individual calls - we'll batch the point update
      // Pass rarity for max-level duplicate bonus calculation
      const result = await acquireCharacterInternal(userId, character.id, character.rarity);
      totalBonusPoints += result.bonusPoints;
      results.push({
        characterId: character.id,
        ...result
      });
    }
  }
  
  // Batch update points if any max-level duplicates
  if (totalBonusPoints > 0 && user) {
    user.points += totalBonusPoints;
    await user.save();
  }
  
  return results;
};

/**
 * Internal acquire without user point update (for batching)
 * @param {number} userId - User ID
 * @param {number} characterId - Character ID
 * @param {string} rarity - Character rarity for bonus point calculation
 */
const acquireCharacterInternal = async (userId, characterId, rarity = null) => {
  const existing = await UserCharacter.findOne({
    where: {
      UserId: userId,
      CharacterId: characterId
    }
  });
  
  if (!existing) {
    await UserCharacter.create({
      UserId: userId,
      CharacterId: characterId,
      level: 1,
      duplicateCount: 0
    });
    
    return {
      isNew: true,
      isDuplicate: false,
      shards: 0,
      level: 1,
      isMaxLevel: false,
      bonusPoints: 0
    };
  }
  
  const wasMaxLevel = isMaxLevel(existing.level);
  let bonusPoints = 0;
  
  if (wasMaxLevel) {
    // Fetch rarity if not provided
    let charRarity = rarity;
    if (!charRarity) {
      const character = await Character.findByPk(characterId);
      charRarity = character?.rarity || 'common';
    }
    bonusPoints = getMaxLevelDuplicatePoints(charRarity);
  } else {
    existing.duplicateCount += 1;
    await existing.save();
  }
  
  return {
    isNew: false,
    isDuplicate: true,
    shards: existing.duplicateCount,
    level: existing.level,
    isMaxLevel: wasMaxLevel,
    bonusPoints,
    canLevelUp: !wasMaxLevel && existing.duplicateCount >= getShardsToLevel(existing.level)
  };
};

/**
 * Level up a character (manual action by player)
 * 
 * @param {number} userId - User ID
 * @param {number} characterId - Character ID
 * @returns {Promise<Object>} - Result with success/error and new state
 */
const levelUpCharacter = async (userId, characterId) => {
  const entry = await UserCharacter.findOne({
    where: {
      UserId: userId,
      CharacterId: characterId
    }
  });
  
  if (!entry) {
    return { success: false, error: 'Character not owned' };
  }
  
  if (isMaxLevel(entry.level)) {
    return { success: false, error: 'Character is already at max level' };
  }
  
  const shardsNeeded = getShardsToLevel(entry.level);
  
  if (entry.duplicateCount < shardsNeeded) {
    return { 
      success: false, 
      error: `Not enough shards. Need ${shardsNeeded}, have ${entry.duplicateCount}`,
      shardsNeeded,
      shardsHave: entry.duplicateCount
    };
  }
  
  // Consume shards and level up
  const previousLevel = entry.level;
  entry.duplicateCount -= shardsNeeded;
  entry.level += 1;
  await entry.save();
  
  return {
    success: true,
    previousLevel,
    newLevel: entry.level,
    shardsRemaining: entry.duplicateCount,
    isMaxLevel: isMaxLevel(entry.level),
    shardsToNextLevel: getShardsToLevel(entry.level)
  };
};

/**
 * Get a user's character with level info
 * 
 * @param {number} userId - User ID
 * @param {number} characterId - Character ID
 * @returns {Promise<Object|null>} - Character data with level info, or null if not owned
 */
const getCharacterWithLevel = async (userId, characterId) => {
  const entry = await UserCharacter.findOne({
    where: {
      UserId: userId,
      CharacterId: characterId
    }
  });
  
  if (!entry) return null;
  
  const shardsToNext = getShardsToLevel(entry.level);
  
  return {
    level: entry.level,
    shards: entry.duplicateCount,
    isMaxLevel: isMaxLevel(entry.level),
    powerMultiplier: getLevelMultiplier(entry.level),
    shardsToNextLevel: shardsToNext,
    canLevelUp: shardsToNext !== null && entry.duplicateCount >= shardsToNext
  };
};

module.exports = {
  LEVELING_CONFIG,
  getShardsToLevel,
  getLevelMultiplier,
  isMaxLevel,
  acquireCharacter,
  acquireMultipleCharacters,
  levelUpCharacter,
  getCharacterWithLevel
};
