/**
 * Character Leveling Utility
 * 
 * Handles the acquisition of characters with automatic leveling on duplicates.
 * When a user rolls a character they already own, the card levels up instead
 * of being wasted.
 */

const { UserCharacter } = require('../models');

// ===========================================
// LEVELING CONFIGURATION
// ===========================================

const LEVELING_CONFIG = {
  maxLevel: 5,
  // Duplicates required to reach each level (cumulative)
  // Level 1: 0 duplicates (first pull)
  // Level 2: 1 duplicate
  // Level 3: 2 duplicates
  // Level 4: 3 duplicates
  // Level 5: 4+ duplicates
  duplicatesPerLevel: 1,
  
  // Power multiplier per level (used in Dojo calculations)
  // Level 1: 1.0x, Level 2: 1.25x, Level 3: 1.5x, Level 4: 1.75x, Level 5: 2.0x
  powerBonusPerLevel: 0.25
};

/**
 * Calculate level from duplicate count
 * @param {number} duplicateCount - Number of times rolled after first
 * @returns {number} - Level (1-5)
 */
const calculateLevel = (duplicateCount) => {
  const level = 1 + Math.floor(duplicateCount / LEVELING_CONFIG.duplicatesPerLevel);
  return Math.min(level, LEVELING_CONFIG.maxLevel);
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
 * Acquire a character for a user, handling duplicates with leveling
 * 
 * @param {number} userId - User ID
 * @param {number} characterId - Character ID
 * @returns {Promise<Object>} - Result object with acquisition details
 *   - isNew: boolean - Whether this is a new character (first pull)
 *   - isDuplicate: boolean - Whether this was a duplicate
 *   - leveledUp: boolean - Whether the character leveled up
 *   - previousLevel: number - Level before this pull
 *   - newLevel: number - Level after this pull
 *   - duplicateCount: number - Total duplicate count
 *   - isMaxLevel: boolean - Whether character is now at max level
 */
const acquireCharacter = async (userId, characterId) => {
  // Try to find existing entry
  const existing = await UserCharacter.findOne({
    where: {
      UserId: userId,
      CharacterId: characterId
    }
  });
  
  if (!existing) {
    // New character - create entry
    await UserCharacter.create({
      UserId: userId,
      CharacterId: characterId,
      level: 1,
      duplicateCount: 0
    });
    
    return {
      isNew: true,
      isDuplicate: false,
      leveledUp: false,
      previousLevel: 0,
      newLevel: 1,
      duplicateCount: 0,
      isMaxLevel: false
    };
  }
  
  // Duplicate! Increment count and potentially level up
  const previousLevel = existing.level;
  const previousDuplicates = existing.duplicateCount;
  
  existing.duplicateCount += 1;
  const newLevel = calculateLevel(existing.duplicateCount);
  const leveledUp = newLevel > previousLevel;
  
  if (leveledUp) {
    existing.level = newLevel;
  }
  
  await existing.save();
  
  return {
    isNew: false,
    isDuplicate: true,
    leveledUp,
    previousLevel,
    newLevel: existing.level,
    duplicateCount: existing.duplicateCount,
    isMaxLevel: isMaxLevel(existing.level)
  };
};

/**
 * Acquire multiple characters (for multi-rolls)
 * Efficiently handles batches with proper duplicate tracking within the batch
 * 
 * @param {number} userId - User ID
 * @param {Array<Object>} characters - Array of character objects (must have id property)
 * @returns {Promise<Array<Object>>} - Array of acquisition results in same order
 */
const acquireMultipleCharacters = async (userId, characters) => {
  const results = [];
  
  // Process sequentially to handle duplicates within the same batch correctly
  for (const character of characters) {
    if (character && character.id) {
      const result = await acquireCharacter(userId, character.id);
      results.push({
        characterId: character.id,
        ...result
      });
    }
  }
  
  return results;
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
  
  return {
    level: entry.level,
    duplicateCount: entry.duplicateCount,
    isMaxLevel: isMaxLevel(entry.level),
    powerMultiplier: getLevelMultiplier(entry.level)
  };
};

module.exports = {
  LEVELING_CONFIG,
  calculateLevel,
  getLevelMultiplier,
  isMaxLevel,
  acquireCharacter,
  acquireMultipleCharacters,
  getCharacterWithLevel
};

