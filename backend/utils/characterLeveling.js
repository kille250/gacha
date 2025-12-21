/**
 * Character Leveling Utility
 * 
 * Handles character acquisition and manual leveling system.
 * - Duplicates give "shards" that players can use to level up
 * - Players choose when to level up their cards
 * - Max level duplicates convert to bonus points
 */

const { UserCharacter } = require('../models');

// ===========================================
// LEVELING CONFIGURATION
// ===========================================

const LEVELING_CONFIG = {
  maxLevel: 5,
  
  // Shards required to level up (from current level)
  // Level 1 -> 2: 1 shard
  // Level 2 -> 3: 1 shard
  // Level 3 -> 4: 2 shards
  // Level 4 -> 5: 2 shards
  shardsToLevel: {
    1: 1,  // 1 shard to go from Lv.1 to Lv.2
    2: 1,  // 1 shard to go from Lv.2 to Lv.3
    3: 2,  // 2 shards to go from Lv.3 to Lv.4
    4: 2   // 2 shards to go from Lv.4 to Lv.5
  },
  
  // Power multiplier per level (used in Dojo calculations)
  // Level 1: 1.0x, Level 2: 1.25x, Level 3: 1.5x, Level 4: 1.75x, Level 5: 2.0x
  powerBonusPerLevel: 0.25,
  
  // Points awarded when rolling a duplicate of a max-level character
  maxLevelDuplicatePoints: 50
};

/**
 * Get shards required to level up from current level
 * @param {number} currentLevel - Current level (1-4)
 * @returns {number|null} - Shards needed, or null if at max level
 */
const getShardsToLevel = (currentLevel) => {
  if (currentLevel >= LEVELING_CONFIG.maxLevel) return null;
  return LEVELING_CONFIG.shardsToLevel[currentLevel] || 1;
};

/**
 * Get power multiplier for a given level
 * @param {number} level - Character level (1-5)
 * @returns {number} - Power multiplier (1.0 - 2.0)
 */
const getLevelMultiplier = (level) => {
  return 1 + (Math.min(level, LEVELING_CONFIG.maxLevel) - 1) * LEVELING_CONFIG.powerBonusPerLevel;
};

/**
 * Check if a character is at max level
 * @param {number} level - Current level
 * @returns {boolean}
 */
const isMaxLevel = (level) => {
  return level >= LEVELING_CONFIG.maxLevel;
};

/**
 * Acquire a character for a user
 * - New character: adds to collection at level 1
 * - Duplicate: adds 1 shard (does NOT auto-level)
 * - Max level duplicate: awards bonus points
 * 
 * @param {number} userId - User ID
 * @param {number} characterId - Character ID
 * @param {Object} user - User model instance (for point rewards)
 * @returns {Promise<Object>} - Result object with acquisition details
 */
const acquireCharacter = async (userId, characterId, user = null) => {
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
    // Max level - award bonus points instead of shard
    bonusPoints = LEVELING_CONFIG.maxLevelDuplicatePoints;
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
 * @param {Array<Object>} characters - Array of character objects (must have id property)
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
      const result = await acquireCharacterInternal(userId, character.id);
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
 */
const acquireCharacterInternal = async (userId, characterId) => {
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
    bonusPoints = LEVELING_CONFIG.maxLevelDuplicatePoints;
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
