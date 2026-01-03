/**
 * Multiplier Calculation Functions
 *
 * Pure functions for calculating various multipliers and bonuses.
 * These can be used by service, routes, and websocket handler.
 */

const {
  GLOBAL_UPGRADES,
  PRESTIGE_CONFIG,
  GAME_CONFIG,
  CHARACTER_ABILITIES,
  ELEMENT_SYNERGIES,
  SERIES_SYNERGIES,
  CHARACTER_MASTERY,
  DAILY_MODIFIERS
} = require('../../../config/essenceTap');

/**
 * Calculate global multiplier from purchased upgrades
 * @param {Array} purchasedUpgrades - List of purchased upgrade IDs
 * @returns {number} Global multiplier
 */
function calculateGlobalMultiplier(purchasedUpgrades = []) {
  let mult = 1;

  const upgrades = Array.isArray(purchasedUpgrades) ? purchasedUpgrades : [];
  for (const upgradeId of upgrades) {
    const upgrade = GLOBAL_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade) {
      mult *= upgrade.multiplier;
    }
  }

  return mult;
}

/**
 * Calculate prestige shard bonus multiplier
 * @param {number} lifetimeShards - Total lifetime shards earned
 * @returns {number} Shard bonus multiplier
 */
function calculateShardBonus(lifetimeShards = 0) {
  const effectiveShards = Math.min(lifetimeShards, PRESTIGE_CONFIG.maxEffectiveShards);
  return 1 + effectiveShards * PRESTIGE_CONFIG.shardMultiplier;
}

/**
 * Calculate character rarity bonus multiplier
 * @param {Array} assignedCharacters - List of assigned character IDs
 * @param {Array} characters - User's character collection with rarity info
 * @returns {number} Character bonus multiplier
 */
function calculateCharacterBonus(assignedCharacters = [], characters = []) {
  if (!assignedCharacters || assignedCharacters.length === 0) {
    return 1;
  }

  let bonus = 1;
  const maxChars = GAME_CONFIG.maxAssignedCharacters;

  for (const charId of assignedCharacters.slice(0, maxChars)) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (char) {
      const rarity = char.rarity?.toLowerCase() || 'common';
      bonus += GAME_CONFIG.characterBonuses[rarity] || 0.05;
    }
  }

  return bonus;
}

/**
 * Calculate element-based bonuses from assigned characters
 * @param {Array} assignedCharacters - List of assigned character IDs
 * @param {Array} characters - User's character collection with element info
 * @returns {Object} Element bonuses breakdown
 */
function calculateElementBonuses(assignedCharacters = [], characters = []) {
  const bonuses = {
    critChance: 0,
    production: 0,
    offline: 0,
    comboDuration: 0,
    goldenChance: 0,
    clickPower: 0,
    allStats: 0
  };

  if (!assignedCharacters || assignedCharacters.length === 0) {
    return bonuses;
  }

  const maxChars = GAME_CONFIG.maxAssignedCharacters;
  const assignedChars = assignedCharacters.slice(0, maxChars);

  for (const charId of assignedChars) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (!char) continue;

    const element = (char.element || 'neutral').toLowerCase();
    const ability = CHARACTER_ABILITIES[element];

    if (!ability) continue;

    switch (ability.type) {
      case 'crit_chance':
        bonuses.critChance += ability.bonusPerCharacter;
        break;
      case 'production':
        bonuses.production += ability.bonusPerCharacter;
        break;
      case 'offline':
        bonuses.offline += ability.bonusPerCharacter;
        break;
      case 'combo_duration':
        bonuses.comboDuration += ability.bonusPerCharacter;
        break;
      case 'golden_chance':
        bonuses.goldenChance += ability.bonusPerCharacter;
        break;
      case 'click_power':
        bonuses.clickPower += ability.bonusPerCharacter;
        break;
      case 'all_stats':
        bonuses.allStats += ability.bonusPerCharacter;
        break;
    }
  }

  return bonuses;
}

/**
 * Calculate element synergy bonus from team composition
 * @param {Array} assignedCharacters - List of assigned character IDs
 * @param {Array} characters - User's character collection
 * @returns {Object} Synergy bonus info
 */
function calculateElementSynergy(assignedCharacters = [], characters = []) {
  const result = {
    bonus: 0,
    synergies: [],
    isFullTeam: false,
    isDiverseTeam: false
  };

  if (!assignedCharacters || assignedCharacters.length === 0) {
    return result;
  }

  const maxChars = GAME_CONFIG.maxAssignedCharacters;
  const assignedChars = assignedCharacters.slice(0, maxChars);
  const elementCounts = {};
  const elements = new Set();

  for (const charId of assignedChars) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (!char) continue;

    const element = (char.element || 'neutral').toLowerCase();
    elementCounts[element] = (elementCounts[element] || 0) + 1;
    elements.add(element);
  }

  // Check for element pair bonuses
  for (const [element, count] of Object.entries(elementCounts)) {
    if (count >= 2) {
      const pairBonus = (count - 1) * ELEMENT_SYNERGIES.pairBonus;
      result.bonus += pairBonus;
      result.synergies.push({ element, count, bonus: pairBonus });
    }
  }

  // Check for full team bonus (5 same element)
  for (const count of Object.values(elementCounts)) {
    if (count >= 5) {
      result.bonus += ELEMENT_SYNERGIES.fullTeamBonus;
      result.isFullTeam = true;
      break;
    }
  }

  // Check for diversity bonus (all different elements with 5 characters)
  if (assignedChars.length >= 5 && elements.size >= 5) {
    result.bonus += ELEMENT_SYNERGIES.diversityBonus;
    result.isDiverseTeam = true;
  }

  return result;
}

/**
 * Calculate series synergy bonus from assigned characters
 * @param {Array} assignedCharacters - List of assigned character IDs
 * @param {Array} characters - User's character collection
 * @returns {Object} Series synergy bonus info
 */
function calculateSeriesSynergy(assignedCharacters = [], characters = []) {
  const result = {
    bonus: 0,
    seriesMatches: [],
    diversityBonus: 0,
    totalBonus: 0
  };

  if (!assignedCharacters || assignedCharacters.length === 0) {
    return result;
  }

  const maxChars = GAME_CONFIG.maxAssignedCharacters;
  const assignedChars = assignedCharacters.slice(0, maxChars);
  const seriesCounts = {};
  const uniqueSeries = new Set();

  for (const charId of assignedChars) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (!char || !char.series) continue;

    const series = char.series.toLowerCase();
    seriesCounts[series] = (seriesCounts[series] || 0) + 1;
    uniqueSeries.add(series);
  }

  // Calculate series match bonuses
  for (const [series, count] of Object.entries(seriesCounts)) {
    if (count >= 2) {
      const bonus = SERIES_SYNERGIES.matchBonuses[Math.min(count, 5)] || 0;
      result.bonus += bonus;
      result.seriesMatches.push({ series, count, bonus });
    }
  }

  // Calculate diversity bonus (many different series)
  if (uniqueSeries.size >= SERIES_SYNERGIES.diversityThreshold) {
    result.diversityBonus = SERIES_SYNERGIES.diversityBonus;
    result.bonus += result.diversityBonus;
  }

  result.totalBonus = result.bonus;
  return result;
}

/**
 * Calculate character mastery level and bonuses
 * @param {Object} characterMastery - Character mastery data { charId: { hoursUsed, level } }
 * @param {string} characterId - Character ID
 * @returns {Object} Mastery info for the character
 */
function calculateCharacterMastery(characterMastery = {}, characterId) {
  const masteryData = characterMastery[characterId] || { hoursUsed: 0, level: 1 };
  const hoursUsed = masteryData.hoursUsed || 0;

  // Find current level based on hours
  let level = 1;
  for (const lvl of CHARACTER_MASTERY.levels) {
    if (hoursUsed >= lvl.hoursRequired) {
      level = lvl.level;
    } else {
      break;
    }
  }

  const levelData = CHARACTER_MASTERY.levels.find(l => l.level === level) || CHARACTER_MASTERY.levels[0];
  const nextLevel = CHARACTER_MASTERY.levels.find(l => l.level === level + 1);

  return {
    level,
    hoursUsed,
    productionBonus: levelData.productionBonus,
    unlockedAbility: levelData.unlockedAbility || null,
    hoursToNextLevel: nextLevel ? nextLevel.hoursRequired - hoursUsed : null,
    maxLevel: level >= CHARACTER_MASTERY.maxLevel
  };
}

/**
 * Calculate total mastery bonus from all assigned characters
 * @param {Array} assignedCharacters - List of assigned character IDs
 * @param {Object} characterMastery - Character mastery data
 * @returns {Object} Total mastery bonuses
 */
function calculateTotalMasteryBonus(assignedCharacters = [], characterMastery = {}) {
  const result = {
    productionBonus: 0,
    unlockedAbilities: []
  };

  if (!assignedCharacters || assignedCharacters.length === 0) {
    return result;
  }

  for (const charId of assignedCharacters) {
    const mastery = calculateCharacterMastery(characterMastery, charId);
    result.productionBonus += mastery.productionBonus;
    if (mastery.unlockedAbility) {
      result.unlockedAbilities.push({
        characterId: charId,
        ability: mastery.unlockedAbility
      });
    }
  }

  return result;
}

/**
 * Calculate click power scaling based on generator count
 * @param {Object} generators - Generators owned { generatorId: count }
 * @returns {number} Click power multiplier from generators
 */
function calculateClickGeneratorScaling(generators = {}) {
  const totalGenerators = Object.values(generators).reduce((sum, count) => sum + count, 0);
  const bonusPerGenerator = GAME_CONFIG.clickPowerPerGenerator || 0.001;
  const maxBonus = GAME_CONFIG.maxClickPowerFromGenerators || 2.0;

  return Math.min(1 + (totalGenerators * bonusPerGenerator), 1 + maxBonus);
}

/**
 * Calculate underdog bonus for using common/uncommon characters
 * @param {Array} assignedCharacters - List of assigned character IDs
 * @param {Array} characters - User's character collection
 * @returns {number} Underdog bonus multiplier
 */
function calculateUnderdogBonus(assignedCharacters = [], characters = []) {
  if (!assignedCharacters || assignedCharacters.length === 0) {
    return 0;
  }

  let bonus = 0;
  const underdogBonuses = GAME_CONFIG.underdogBonuses || { common: 0.15, uncommon: 0.10 };

  for (const charId of assignedCharacters) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (!char) continue;

    const rarity = (char.rarity || 'common').toLowerCase();
    if (underdogBonuses[rarity]) {
      bonus += underdogBonuses[rarity];
    }
  }

  return bonus;
}

/**
 * Get the current daily modifier based on day of week
 * @returns {Object} Current daily modifier
 */
function getCurrentDailyModifier() {
  const dayOfWeek = new Date().getDay();
  return DAILY_MODIFIERS[dayOfWeek] || DAILY_MODIFIERS[0];
}

/**
 * Calculate time until next daily modifier change
 * @returns {number} Milliseconds until next modifier
 */
function getTimeUntilNextModifier() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

module.exports = {
  calculateGlobalMultiplier,
  calculateShardBonus,
  calculateCharacterBonus,
  calculateElementBonuses,
  calculateElementSynergy,
  calculateSeriesSynergy,
  calculateCharacterMastery,
  calculateTotalMasteryBonus,
  calculateClickGeneratorScaling,
  calculateUnderdogBonus,
  getCurrentDailyModifier,
  getTimeUntilNextModifier
};
