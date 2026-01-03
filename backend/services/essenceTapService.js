/**
 * Essence Tap Service
 *
 * Business logic for the Essence Tap clicker minigame.
 * Handles state management, calculations, and integrations.
 */

const {
  GENERATORS,
  CLICK_UPGRADES,
  GENERATOR_UPGRADES,
  GLOBAL_UPGRADES,
  SYNERGY_UPGRADES,
  PRESTIGE_CONFIG,
  GAME_CONFIG,
  CHARACTER_MASTERY,
  ESSENCE_TYPES,
  SERIES_SYNERGIES,
  FATE_POINT_MILESTONES,
  REPEATABLE_MILESTONES,
  PRESTIGE_FATE_REWARDS,
  WEEKLY_FP_CAP,
  MINI_MILESTONES,
  XP_REWARDS,
  DAILY_CHALLENGES,
  CHARACTER_ABILITIES,
  ELEMENT_SYNERGIES,
  DAILY_MODIFIERS,
  ACTIVE_ABILITIES,
  GAMBLE_CONFIG,
  INFUSION_CONFIG,
  WEEKLY_TOURNAMENT,
  TICKET_GENERATION,
  deriveElement
} = require('../config/essenceTap');

// Import shared boss config - SINGLE SOURCE OF TRUTH
const { ESSENCE_TAP_DISPLAY } = require('../../shared/balanceConstants');

const _accountLevelService = require('./accountLevelService');

/**
 * Get the current daily modifier based on day of week
 * @returns {Object} Current daily modifier
 */
function getCurrentDailyModifier() {
  const dayOfWeek = new Date().getDay();
  return DAILY_MODIFIERS[dayOfWeek] || DAILY_MODIFIERS[0];
}

/**
 * Get initial clicker state for a new user
 * @returns {Object} Initial clicker state
 */
function getInitialState() {
  return {
    essence: 0,
    lifetimeEssence: 0,
    totalClicks: 0,
    totalCrits: 0,

    // Generators: { generatorId: count }
    generators: {},

    // Purchased upgrades: array of upgrade IDs
    purchasedUpgrades: [],

    // Prestige
    prestigeLevel: 0,
    prestigeShards: 0,
    lifetimeShards: 0,
    prestigeUpgrades: {}, // { upgradeId: level }

    // Assigned characters for bonuses
    assignedCharacters: [],

    // Daily progress
    daily: {
      date: null,
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      completedChallenges: [],
      gamblesUsed: 0,
      ticketChallengesCompleted: 0
    },

    // Milestones claimed
    claimedMilestones: [],

    // Repeatable milestones tracking
    repeatableMilestones: {
      weeklyEssenceLastClaimed: null,  // ISO week string
      per100BCount: 0  // Number of 100B milestones claimed
    },

    // Stats
    stats: {
      totalGeneratorsBought: 0,
      totalUpgradesPurchased: 0,
      highestCombo: 0,
      goldenEssenceClicks: 0,
      totalGambleWins: 0,
      totalGambleLosses: 0,
      totalInfusions: 0,
      jackpotsWon: 0,
      totalJackpotWinnings: 0
    },

    // Infusion system (resets on prestige)
    infusionCount: 0,
    infusionBonus: 0,

    // Active ability cooldowns (stored as timestamps)
    abilityCooldowns: {},

    // Character XP earned in essence tap { charId: xp }
    characterXP: {},

    // Character mastery tracking { charId: { hoursUsed, level } }
    characterMastery: {},

    // Weekly tournament tracking
    weekly: {
      weekId: null,  // ISO week string
      essenceEarned: 0,
      rank: null,
      rewardsClaimed: false
    },

    // Progressive jackpot contribution tracking
    jackpotContributions: 0,

    // Roll ticket generation tracking
    ticketGeneration: {
      dailyStreakDays: 0,
      lastStreakDate: null,
      exchangedThisWeek: 0,
      lastExchangeWeek: null
    },

    // Weekly FP cap tracking
    weeklyFP: {
      weekId: null,  // ISO week string
      earnedThisWeek: 0
    },

    // Session stats for mini-milestones
    sessionStats: {
      sessionStartTime: null,
      sessionEssence: 0,
      currentCombo: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    },

    // Essence types tracking
    essenceTypes: {
      pure: 0,
      ambient: 0,
      golden: 0,
      prismatic: 0
    },

    // Timestamps
    lastOnlineTimestamp: Date.now(),
    lastSaveTimestamp: Date.now(),
    lastGambleTimestamp: 0,
    createdAt: Date.now()
  };
}

/**
 * Calculate the cost of the next generator purchase
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @returns {number} Cost for next purchase
 */
function getGeneratorCost(generatorId, owned) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return Infinity;

  return Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned));
}

/**
 * Calculate cost to buy multiple generators at once
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @param {number} count - Number to buy
 * @returns {number} Total cost
 */
function getBulkGeneratorCost(generatorId, owned, count) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) return Infinity;

  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned + i));
  }
  return total;
}

/**
 * Calculate maximum generators purchasable with given essence
 * @param {string} generatorId - Generator ID
 * @param {number} owned - Number currently owned
 * @param {number} essence - Available essence
 * @returns {number} Maximum purchasable
 */
function getMaxPurchasable(generatorId, owned, essence) {
  let count = 0;
  let cost = 0;

  while (true) {
    const nextCost = getGeneratorCost(generatorId, owned + count);
    if (cost + nextCost > essence) break;
    cost += nextCost;
    count++;
    if (count > 1000) break; // Safety limit
  }

  return count;
}

/**
 * Calculate element-based bonuses from assigned characters
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection with element info
 * @returns {Object} Element bonuses breakdown
 */
function calculateElementBonuses(state, characters = []) {
  const bonuses = {
    critChance: 0,
    production: 0,
    offline: 0,
    comboDuration: 0,
    goldenChance: 0,
    clickPower: 0,
    allStats: 0
  };

  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return bonuses;
  }

  const assignedChars = state.assignedCharacters.slice(0, GAME_CONFIG.maxAssignedCharacters);

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
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {Object} Synergy bonus info
 */
function calculateElementSynergy(state, characters = []) {
  const result = {
    bonus: 0,
    synergies: [],
    isFullTeam: false,
    isDiverseTeam: false
  };

  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return result;
  }

  const assignedChars = state.assignedCharacters.slice(0, GAME_CONFIG.maxAssignedCharacters);
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
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {Object} Series synergy bonus info
 */
function calculateSeriesSynergy(state, characters = []) {
  const result = {
    bonus: 0,
    seriesMatches: [],
    diversityBonus: 0,
    totalBonus: 0
  };

  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return result;
  }

  const assignedChars = state.assignedCharacters.slice(0, GAME_CONFIG.maxAssignedCharacters);
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
 * @param {Object} state - Clicker state
 * @param {string} characterId - Character ID
 * @returns {Object} Mastery info for the character
 */
function calculateCharacterMastery(state, characterId) {
  const masteryData = state.characterMastery?.[characterId] || { hoursUsed: 0, level: 1 };
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
 * @param {Object} state - Clicker state
 * @returns {Object} Total mastery bonuses
 */
function calculateTotalMasteryBonus(state) {
  const result = {
    productionBonus: 0,
    unlockedAbilities: []
  };

  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return result;
  }

  for (const charId of state.assignedCharacters) {
    const mastery = calculateCharacterMastery(state, charId);
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
 * Update character mastery hours (call this periodically during gameplay)
 * @param {Object} state - Clicker state
 * @param {number} hoursElapsed - Hours played since last update
 * @returns {Object} Updated state and level-up info
 */
function updateCharacterMastery(state, hoursElapsed) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return { newState: state, levelUps: [] };
  }

  const newState = { ...state };
  newState.characterMastery = { ...state.characterMastery };
  const levelUps = [];

  for (const charId of state.assignedCharacters) {
    const oldMastery = calculateCharacterMastery(state, charId);
    const oldData = state.characterMastery?.[charId] || { hoursUsed: 0, level: 1 };

    newState.characterMastery[charId] = {
      hoursUsed: oldData.hoursUsed + hoursElapsed,
      level: oldMastery.level
    };

    const newMastery = calculateCharacterMastery(newState, charId);
    if (newMastery.level > oldMastery.level) {
      newState.characterMastery[charId].level = newMastery.level;
      levelUps.push({
        characterId: charId,
        oldLevel: oldMastery.level,
        newLevel: newMastery.level,
        unlockedAbility: newMastery.unlockedAbility
      });
    }
  }

  return { newState, levelUps };
}

/**
 * Calculate click power scaling based on generator count
 * @param {Object} state - Clicker state
 * @returns {number} Click power multiplier from generators
 */
function calculateClickGeneratorScaling(state) {
  const totalGenerators = Object.values(state.generators || {}).reduce((sum, count) => sum + count, 0);
  const bonusPerGenerator = GAME_CONFIG.clickPowerPerGenerator || 0.001;
  const maxBonus = GAME_CONFIG.maxClickPowerFromGenerators || 2.0;

  return Math.min(1 + (totalGenerators * bonusPerGenerator), 1 + maxBonus);
}

/**
 * Calculate underdog bonus for using common/uncommon characters
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Underdog bonus multiplier
 */
function calculateUnderdogBonus(state, characters = []) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return 0;
  }

  let bonus = 0;
  const underdogBonuses = GAME_CONFIG.underdogBonuses || { common: 0.15, uncommon: 0.10 };

  for (const charId of state.assignedCharacters) {
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
 * Calculate total click power for a state
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Total click power
 */
function calculateClickPower(state, characters = []) {
  let power = GAME_CONFIG.baseClickPower;

  // Add from purchased click upgrades
  for (const upgradeId of state.purchasedUpgrades || []) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'click_power') {
      power += upgrade.bonus;
    }
  }

  // Add from prestige upgrades
  const prestigeClick = state.prestigeUpgrades?.prestige_click || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_click');
  if (prestigeUpgrade) {
    power += prestigeClick * prestigeUpgrade.bonusPerLevel;
  }

  // Apply character rarity bonuses
  const characterMultiplier = calculateCharacterBonus(state, characters);
  power *= characterMultiplier;

  // Apply element-based click power bonus (Dark element)
  const elementBonuses = calculateElementBonuses(state, characters);
  power *= (1 + elementBonuses.clickPower + elementBonuses.allStats);

  // Apply element synergy bonus
  const synergy = calculateElementSynergy(state, characters);
  power *= (1 + synergy.bonus);

  // Apply series synergy bonus
  const seriesSynergy = calculateSeriesSynergy(state, characters);
  power *= (1 + seriesSynergy.totalBonus);

  // Apply character mastery bonus
  const masteryBonus = calculateTotalMasteryBonus(state);
  power *= (1 + masteryBonus.productionBonus);

  // Apply click power scaling from generators (keeps clicking relevant)
  const generatorScaling = calculateClickGeneratorScaling(state);
  power *= generatorScaling;

  // Apply underdog bonus for using common/uncommon characters
  const underdogBonus = calculateUnderdogBonus(state, characters);
  power *= (1 + underdogBonus);

  // Apply global multipliers
  const globalMult = calculateGlobalMultiplier(state);
  power *= globalMult;

  // Apply prestige shard bonus
  const shardBonus = 1 + Math.min(state.lifetimeShards || 0, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;
  power *= shardBonus;

  // Apply infusion bonus
  const infusionBonus = state.infusionBonus || 0;
  power *= (1 + infusionBonus);

  // Apply daily modifier click power bonus
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.clickPowerBonus) {
    power *= (1 + dailyMod.effects.clickPowerBonus);
  }

  return Math.floor(power);
}

/**
 * Calculate critical hit chance
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Crit chance (0-1)
 */
function calculateCritChance(state, characters = []) {
  let chance = GAME_CONFIG.baseCritChance;

  // Add from purchased crit upgrades
  for (const upgradeId of state.purchasedUpgrades || []) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'crit_chance') {
      chance += upgrade.bonus;
    }
  }

  // Add from prestige upgrades
  const prestigeCrit = state.prestigeUpgrades?.prestige_crit || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_crit');
  if (prestigeUpgrade) {
    chance += prestigeCrit * prestigeUpgrade.bonusPerLevel;
  }

  // Add element-based crit bonus (Fire element)
  const elementBonuses = calculateElementBonuses(state, characters);
  chance += elementBonuses.critChance + elementBonuses.allStats;

  // Apply daily modifier crit bonus
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.critChanceBonus) {
    chance += dailyMod.effects.critChanceBonus;
  }

  // FIX: Apply essence type bonuses (prismatic essence crit bonus)
  const essenceTypeBonuses = getEssenceTypeBonuses(state);
  chance += essenceTypeBonuses.critBonus;

  return Math.min(chance, 0.9); // Cap at 90%
}

/**
 * Calculate critical hit multiplier
 * @param {Object} state - Clicker state
 * @returns {number} Crit multiplier
 */
function calculateCritMultiplier(state) {
  let mult = GAME_CONFIG.baseCritMultiplier;

  // Add from purchased crit multiplier upgrades
  for (const upgradeId of state.purchasedUpgrades || []) {
    const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade && upgrade.type === 'crit_multiplier') {
      mult += upgrade.bonus;
    }
  }

  // Apply daily modifier crit multiplier bonus
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.critMultiplierBonus) {
    mult *= dailyMod.effects.critMultiplierBonus;
  }

  return mult;
}

/**
 * Calculate production per second from generators
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Essence per second
 */
function calculateProductionPerSecond(state, characters = []) {
  let total = 0;

  // Calculate base production for each generator type
  for (const [generatorId, count] of Object.entries(state.generators || {})) {
    if (count <= 0) continue;

    const generator = GENERATORS.find(g => g.id === generatorId);
    if (!generator) continue;

    let output = generator.baseOutput * count;

    // Apply generator-specific upgrades
    for (const upgradeId of state.purchasedUpgrades || []) {
      const upgrade = GENERATOR_UPGRADES.find(u => u.id === upgradeId);
      if (upgrade && upgrade.generatorId === generatorId) {
        output *= upgrade.multiplier;
      }
    }

    // Apply synergy bonuses
    for (const upgradeId of state.purchasedUpgrades || []) {
      const synergy = SYNERGY_UPGRADES.find(u => u.id === upgradeId);
      if (synergy && synergy.targetGenerator === generatorId) {
        const sourceCount = state.generators[synergy.sourceGenerator] || 0;
        output *= (1 + sourceCount * synergy.bonusPerSource);
      }
    }

    total += output;
  }

  // Apply global multipliers
  const globalMult = calculateGlobalMultiplier(state);
  total *= globalMult;

  // Apply character rarity bonuses
  const characterMultiplier = calculateCharacterBonus(state, characters);
  total *= characterMultiplier;

  // Apply element-based production bonus (Water element)
  const elementBonuses = calculateElementBonuses(state, characters);
  total *= (1 + elementBonuses.production + elementBonuses.allStats);

  // Apply element synergy bonus
  const synergy = calculateElementSynergy(state, characters);
  total *= (1 + synergy.bonus);

  // Apply series synergy bonus
  const seriesSynergy = calculateSeriesSynergy(state, characters);
  total *= (1 + seriesSynergy.totalBonus);

  // Apply character mastery bonus
  const masteryBonus = calculateTotalMasteryBonus(state);
  total *= (1 + masteryBonus.productionBonus);

  // Apply underdog bonus for using common/uncommon characters
  const underdogBonus = calculateUnderdogBonus(state, characters);
  total *= (1 + underdogBonus);

  // Apply prestige shard bonus
  const shardBonus = 1 + Math.min(state.lifetimeShards || 0, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;
  total *= shardBonus;

  // Apply prestige production upgrade
  const prestigeProd = state.prestigeUpgrades?.prestige_production || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_production');
  if (prestigeUpgrade) {
    total *= (1 + prestigeProd * prestigeUpgrade.bonusPerLevel);
  }

  // Apply infusion bonus
  const infusionBonus = state.infusionBonus || 0;
  total *= (1 + infusionBonus);

  // Apply daily modifier generator/production bonuses
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.generatorOutputBonus) {
    total *= (1 + dailyMod.effects.generatorOutputBonus);
  }
  if (dailyMod.effects?.allProductionBonus) {
    total *= (1 + dailyMod.effects.allProductionBonus);
  }

  // FIX: Apply essence type bonuses (prismatic essence production bonus)
  const essenceTypeBonuses = getEssenceTypeBonuses(state);
  total *= (1 + essenceTypeBonuses.productionBonus);

  return total;
}

/**
 * Calculate global multiplier from upgrades
 * @param {Object} state - Clicker state
 * @returns {number} Global multiplier
 */
function calculateGlobalMultiplier(state) {
  let mult = 1;

  const upgrades = Array.isArray(state.purchasedUpgrades) ? state.purchasedUpgrades : [];
  for (const upgradeId of upgrades) {
    const upgrade = GLOBAL_UPGRADES.find(u => u.id === upgradeId);
    if (upgrade) {
      mult *= upgrade.multiplier;
    }
  }

  return mult;
}

/**
 * Calculate character bonus multiplier
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {number} Character bonus multiplier
 */
function calculateCharacterBonus(state, characters = []) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return 1;
  }

  let bonus = 1;

  for (const charId of state.assignedCharacters.slice(0, GAME_CONFIG.maxAssignedCharacters)) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (char) {
      const rarity = char.rarity?.toLowerCase() || 'common';
      bonus += GAME_CONFIG.characterBonuses[rarity] || 0.05;
    }
  }

  return bonus;
}

/**
 * Calculate offline progress
 * @param {Object} state - Clicker state
 * @param {Array} characters - User's character collection
 * @returns {Object} Offline progress data
 */
function calculateOfflineProgress(state, characters = []) {
  const now = Date.now();
  const lastOnline = state.lastOnlineTimestamp || now;
  const elapsedMs = Math.max(0, now - lastOnline);
  const elapsedHours = Math.min(elapsedMs / (1000 * 60 * 60), GAME_CONFIG.maxOfflineHours);

  if (elapsedHours < 0.01) { // Less than ~36 seconds
    return { essenceEarned: 0, hoursAway: 0 };
  }

  const productionPerSecond = calculateProductionPerSecond(state, characters);

  // Base offline efficiency
  let offlineEfficiency = GAME_CONFIG.offlineEfficiency;

  // Add prestige offline bonus
  const prestigeOffline = state.prestigeUpgrades?.prestige_offline || 0;
  const prestigeUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_offline');
  if (prestigeUpgrade) {
    offlineEfficiency += prestigeOffline * prestigeUpgrade.bonusPerLevel;
  }

  // Add element-based offline bonus (Earth element)
  const elementBonuses = calculateElementBonuses(state, characters);
  offlineEfficiency += elementBonuses.offline + elementBonuses.allStats;

  // Cap at 100%
  offlineEfficiency = Math.min(offlineEfficiency, 1.0);

  const essenceEarned = Math.floor(productionPerSecond * elapsedHours * 3600 * offlineEfficiency);

  return {
    essenceEarned,
    hoursAway: elapsedHours,
    productionRate: productionPerSecond,
    efficiency: offlineEfficiency
  };
}

/**
 * Calculate golden essence chance including all bonuses
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {number} Golden essence chance (0-1)
 */
function calculateGoldenChance(state, characters = []) {
  let chance = GAME_CONFIG.goldenEssenceChance;

  // Add element-based golden chance bonus (Light element)
  const elementBonuses = calculateElementBonuses(state, characters);
  chance += elementBonuses.goldenChance + (elementBonuses.allStats * 0.001); // allStats gives small golden bonus

  // Apply daily modifier golden chance multiplier
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.goldenChanceMultiplier) {
    chance *= dailyMod.effects.goldenChanceMultiplier;
  }

  // FIX: Apply essence type bonuses (prismatic essence golden chance bonus)
  const essenceTypeBonuses = getEssenceTypeBonuses(state);
  chance += essenceTypeBonuses.goldenBonus;

  return Math.min(chance, 0.1); // Cap at 10%
}

/**
 * Calculate combo decay time including all bonuses
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {number} Combo decay time in ms
 */
function calculateComboDecayTime(state, characters = []) {
  let decayTime = GAME_CONFIG.comboDecayTime;

  // Add element-based combo duration bonus (Air element)
  const elementBonuses = calculateElementBonuses(state, characters);
  decayTime += elementBonuses.comboDuration;

  // Apply daily modifier combo growth multiplier (affects decay inversely)
  const dailyMod = getCurrentDailyModifier();
  if (dailyMod.effects?.comboGrowthMultiplier) {
    decayTime *= dailyMod.effects.comboGrowthMultiplier;
  }

  return decayTime;
}

/**
 * Process a click action
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @param {number} comboMultiplier - Current combo multiplier
 * @param {Object} activeAbilityEffects - Currently active ability effects
 * @returns {Object} Click result
 */
function processClick(state, characters = [], comboMultiplier = 1, activeAbilityEffects = {}) {
  const clickPower = calculateClickPower(state, characters);
  const critChance = calculateCritChance(state, characters);
  const critMultiplier = calculateCritMultiplier(state);
  const goldenChance = calculateGoldenChance(state, characters);

  // Check for guaranteed crits from active ability
  const isCrit = activeAbilityEffects.guaranteedCrits || Math.random() < critChance;

  // Calculate golden chance with ability boost
  let effectiveGoldenChance = goldenChance;
  if (activeAbilityEffects.goldenChanceMultiplier) {
    effectiveGoldenChance *= activeAbilityEffects.goldenChanceMultiplier;
  }
  const isGolden = Math.random() < effectiveGoldenChance;

  let essenceGained = clickPower * comboMultiplier;

  // Apply active ability production multiplier
  if (activeAbilityEffects.productionMultiplier) {
    essenceGained *= activeAbilityEffects.productionMultiplier;
  }

  if (isCrit) {
    essenceGained *= critMultiplier;
  }

  if (isGolden) {
    essenceGained *= GAME_CONFIG.goldenEssenceMultiplier;
  }

  essenceGained = Math.floor(essenceGained);

  return {
    essenceGained,
    isCrit,
    isGolden,
    clickPower,
    comboMultiplier,
    critChance,
    goldenChance: effectiveGoldenChance
  };
}

/**
 * Purchase a generator
 * @param {Object} state - Current state
 * @param {string} generatorId - Generator to purchase
 * @param {number} count - Number to purchase (default 1)
 * @returns {Object} Updated state and result
 */
function purchaseGenerator(state, generatorId, count = 1) {
  const generator = GENERATORS.find(g => g.id === generatorId);
  if (!generator) {
    return { success: false, error: 'Invalid generator' };
  }

  // Check unlock requirement
  if (state.lifetimeEssence < generator.unlockEssence) {
    return { success: false, error: 'Generator not unlocked yet' };
  }

  // Ensure generators object exists
  if (!state.generators) {
    state.generators = {};
  }

  const owned = state.generators[generatorId] || 0;
  const cost = getBulkGeneratorCost(generatorId, owned, count);

  if (state.essence < cost) {
    return { success: false, error: 'Not enough essence' };
  }

  // Apply purchase
  const newState = { ...state };
  newState.essence -= cost;
  newState.generators = { ...state.generators };
  newState.generators[generatorId] = owned + count;

  // Update stats
  newState.stats = { ...state.stats };
  newState.stats.totalGeneratorsBought = (state.stats.totalGeneratorsBought || 0) + count;

  // Update daily
  newState.daily = { ...state.daily };
  newState.daily.generatorsBought = (state.daily.generatorsBought || 0) + count;

  return {
    success: true,
    newState,
    cost,
    generator,
    newCount: owned + count
  };
}

/**
 * Purchase an upgrade
 * @param {Object} state - Current state
 * @param {string} upgradeId - Upgrade to purchase
 * @returns {Object} Updated state and result
 */
function purchaseUpgrade(state, upgradeId) {
  // Check if already purchased
  if (state.purchasedUpgrades.includes(upgradeId)) {
    return { success: false, error: 'Upgrade already purchased' };
  }

  // Find upgrade in all upgrade arrays
  const allUpgrades = [...CLICK_UPGRADES, ...GENERATOR_UPGRADES, ...GLOBAL_UPGRADES, ...SYNERGY_UPGRADES];
  const upgrade = allUpgrades.find(u => u.id === upgradeId);

  if (!upgrade) {
    return { success: false, error: 'Invalid upgrade' };
  }

  // Check unlock requirement
  if (upgrade.unlockEssence && state.lifetimeEssence < upgrade.unlockEssence) {
    return { success: false, error: 'Upgrade not unlocked yet' };
  }

  // Check generator requirement for generator upgrades
  if (upgrade.requiredOwned) {
    const owned = state.generators[upgrade.generatorId] || 0;
    if (owned < upgrade.requiredOwned) {
      return { success: false, error: `Need ${upgrade.requiredOwned} ${upgrade.generatorId}` };
    }
  }

  if (state.essence < upgrade.cost) {
    return { success: false, error: 'Not enough essence' };
  }

  // Apply purchase
  const newState = { ...state };
  newState.essence -= upgrade.cost;
  newState.purchasedUpgrades = [...state.purchasedUpgrades, upgradeId];

  // Update stats
  newState.stats = { ...state.stats };
  newState.stats.totalUpgradesPurchased = (state.stats.totalUpgradesPurchased || 0) + 1;

  return {
    success: true,
    newState,
    upgrade
  };
}

/**
 * Calculate prestige shards earned
 * @param {number} lifetimeEssence - Lifetime essence
 * @returns {number} Shards earned
 */
function calculatePrestigeShards(lifetimeEssence) {
  if (lifetimeEssence < PRESTIGE_CONFIG.minimumEssence) {
    return 0;
  }
  return Math.floor(Math.sqrt(lifetimeEssence / PRESTIGE_CONFIG.shardDivisor));
}

/**
 * Perform prestige (awakening)
 * @param {Object} state - Current state
 * @param {Object} _user - User object for rewards (reserved for future use)
 * @returns {Object} Prestige result
 */
function performPrestige(state, _user) {
  if (state.lifetimeEssence < PRESTIGE_CONFIG.minimumEssence) {
    return { success: false, error: 'Not enough lifetime essence to prestige' };
  }

  // Check prestige cooldown to prevent FP farming
  const now = Date.now();
  const lastPrestigeTime = state.lastPrestigeTimestamp || 0;
  const cooldownMs = PRESTIGE_CONFIG.cooldownMs || 3600000; // Default 1 hour
  const timeRemaining = Math.max(0, (lastPrestigeTime + cooldownMs) - now);

  if (timeRemaining > 0) {
    const minutesRemaining = Math.ceil(timeRemaining / 60000);
    return {
      success: false,
      error: `Prestige on cooldown. Please wait ${minutesRemaining} minute(s).`,
      cooldownRemaining: timeRemaining
    };
  }

  const shardsEarned = calculatePrestigeShards(state.lifetimeEssence);
  if (shardsEarned <= 0) {
    return { success: false, error: 'Would not earn any shards' };
  }

  // Calculate starting essence from prestige upgrade
  let startingEssence = 0;
  const prestigeStarting = state.prestigeUpgrades?.prestige_starting || 0;
  const startingUpgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === 'prestige_starting');
  if (startingUpgrade) {
    startingEssence = prestigeStarting * startingUpgrade.bonusPerLevel;
  }

  // Create new state (reset with bonuses kept)
  // IMPORTANT: Preserve weekly tournament progress and tournament state across prestiges
  const newState = {
    ...getInitialState(),
    essence: startingEssence,
    prestigeLevel: (state.prestigeLevel || 0) + 1,
    prestigeShards: (state.prestigeShards || 0) + shardsEarned,
    lifetimeShards: (state.lifetimeShards || 0) + shardsEarned,
    prestigeUpgrades: { ...state.prestigeUpgrades },
    assignedCharacters: state.assignedCharacters,
    claimedMilestones: state.claimedMilestones,
    // Preserve tournament state - weekly progress and tournament metadata should NOT reset on prestige
    weekly: state.weekly,
    tournament: state.tournament,
    // Preserve weekly FP tracking
    weeklyFP: state.weeklyFP,
    // Preserve ticket generation tracking
    ticketGeneration: state.ticketGeneration,
    stats: {
      ...state.stats,
      totalPrestigeCount: (state.stats?.totalPrestigeCount || 0) + 1
    },
    lastOnlineTimestamp: Date.now(),
    lastPrestigeTimestamp: now,
    createdAt: state.createdAt
  };

  // Calculate Fate Points reward
  let fatePointsReward = 0;
  if (newState.prestigeLevel === 1) {
    fatePointsReward = PRESTIGE_FATE_REWARDS.firstPrestige;
  } else if (newState.prestigeLevel <= PRESTIGE_FATE_REWARDS.maxPrestigeRewards) {
    fatePointsReward = PRESTIGE_FATE_REWARDS.perPrestige;
  }

  // Calculate XP reward
  const xpReward = XP_REWARDS.perPrestige;

  return {
    success: true,
    newState,
    shardsEarned,
    totalShards: newState.prestigeShards,
    prestigeLevel: newState.prestigeLevel,
    fatePointsReward,
    xpReward,
    startingEssence
  };
}

/**
 * Purchase a prestige upgrade
 * @param {Object} state - Current state
 * @param {string} upgradeId - Prestige upgrade ID
 * @returns {Object} Result
 */
function purchasePrestigeUpgrade(state, upgradeId) {
  const upgrade = PRESTIGE_CONFIG.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) {
    return { success: false, error: 'Invalid prestige upgrade' };
  }

  const currentLevel = state.prestigeUpgrades?.[upgradeId] || 0;
  if (currentLevel >= upgrade.maxLevel) {
    return { success: false, error: 'Upgrade is at max level' };
  }

  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));

  if ((state.prestigeShards || 0) < cost) {
    return { success: false, error: 'Not enough awakening shards' };
  }

  const newState = { ...state };
  newState.prestigeShards = (state.prestigeShards || 0) - cost;
  newState.prestigeUpgrades = {
    ...state.prestigeUpgrades,
    [upgradeId]: currentLevel + 1
  };

  return {
    success: true,
    newState,
    upgrade,
    newLevel: currentLevel + 1,
    cost
  };
}

/**
 * Check and claim Fate Points milestones
 * @param {Object} state - Current state
 * @returns {Object} Milestones to claim
 */
function checkMilestones(state) {
  const claimable = [];

  for (const milestone of FATE_POINT_MILESTONES) {
    const milestoneKey = `fp_${milestone.lifetimeEssence}`;
    if (state.lifetimeEssence >= milestone.lifetimeEssence &&
        !state.claimedMilestones?.includes(milestoneKey)) {
      claimable.push({
        ...milestone,
        key: milestoneKey
      });
    }
  }

  return claimable;
}

/**
 * Claim a milestone
 * @param {Object} state - Current state
 * @param {string} milestoneKey - Milestone key
 * @returns {Object} Result
 */
function claimMilestone(state, milestoneKey) {
  if (state.claimedMilestones?.includes(milestoneKey)) {
    return { success: false, error: 'Milestone already claimed' };
  }

  const milestone = FATE_POINT_MILESTONES.find(m => `fp_${m.lifetimeEssence}` === milestoneKey);
  if (!milestone) {
    return { success: false, error: 'Invalid milestone' };
  }

  if (state.lifetimeEssence < milestone.lifetimeEssence) {
    return { success: false, error: 'Milestone not reached' };
  }

  const newState = { ...state };
  newState.claimedMilestones = [...(state.claimedMilestones || []), milestoneKey];

  return {
    success: true,
    newState,
    fatePoints: milestone.fatePoints
  };
}

// ===========================================
// WEEKLY FP CAP ENFORCEMENT
// ===========================================

/**
 * Get current ISO week string
 * @returns {string} ISO week string (e.g., "2025-W01")
 */
function getCurrentWeekId() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((now - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Check and reset weekly FP tracking if new week
 * @param {Object} state - Current state
 * @returns {Object} Updated state
 */
function resetWeeklyFPIfNeeded(state) {
  const currentWeek = getCurrentWeekId();
  const newState = { ...state };

  if (!newState.weeklyFP) {
    newState.weeklyFP = { weekId: currentWeek, earnedThisWeek: 0 };
  } else if (newState.weeklyFP.weekId !== currentWeek) {
    newState.weeklyFP = { weekId: currentWeek, earnedThisWeek: 0 };
  }

  return newState;
}

/**
 * Check remaining FP budget for the week
 * @param {Object} state - Current state
 * @returns {Object} { remaining, cap, earned }
 */
function getWeeklyFPBudget(state) {
  const stateWithReset = resetWeeklyFPIfNeeded(state);
  const earned = stateWithReset.weeklyFP?.earnedThisWeek || 0;
  const cap = WEEKLY_FP_CAP.maxFatePointsPerWeek;
  return {
    remaining: Math.max(0, cap - earned),
    cap,
    earned,
    atCap: earned >= cap
  };
}

/**
 * Apply FP reward with cap enforcement
 * @param {Object} state - Current state
 * @param {number} fatePoints - FP to award
 * @param {string} source - Source of FP (for logging)
 * @returns {Object} { newState, actualFP, capped }
 */
function applyFPWithCap(state, fatePoints, source = 'unknown') {
  const newState = resetWeeklyFPIfNeeded(state);
  const budget = getWeeklyFPBudget(newState);

  // One-time milestones don't count toward cap
  const isOneTimeMilestone = source === 'one_time_milestone';
  if (isOneTimeMilestone) {
    return { newState, actualFP: fatePoints, capped: false };
  }

  // Apply cap
  const actualFP = Math.min(fatePoints, budget.remaining);
  const capped = actualFP < fatePoints;

  // Update weekly tracking
  newState.weeklyFP.earnedThisWeek += actualFP;

  return { newState, actualFP, capped };
}

// ===========================================
// MINI-MILESTONES FOR SHORT SESSIONS
// ===========================================

/**
 * Check and process session mini-milestones
 * @param {Object} state - Current state
 * @param {number} sessionEssence - Essence earned this session
 * @returns {Object} { newState, achievements }
 */
function checkSessionMilestones(state, sessionEssence) {
  const newState = { ...state };
  if (!newState.sessionStats) {
    newState.sessionStats = {
      sessionStartTime: Date.now(),
      sessionEssence: 0,
      currentCombo: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    };
  }

  newState.sessionStats.sessionEssence = sessionEssence;
  const achievements = [];

  for (const milestone of MINI_MILESTONES.sessionMilestones) {
    if (sessionEssence >= milestone.essence &&
        !newState.sessionStats.claimedSessionMilestones.includes(milestone.name)) {
      newState.sessionStats.claimedSessionMilestones.push(milestone.name);
      achievements.push({
        type: 'session',
        name: milestone.name,
        reward: milestone.reward
      });
    }
  }

  return { newState, achievements };
}

/**
 * Check and process combo milestones
 * @param {Object} state - Current state
 * @param {number} currentCombo - Current combo count
 * @returns {Object} { newState, achievements }
 */
function checkComboMilestones(state, currentCombo) {
  const newState = { ...state };
  if (!newState.sessionStats) {
    newState.sessionStats = {
      sessionStartTime: Date.now(),
      sessionEssence: 0,
      currentCombo: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    };
  }

  newState.sessionStats.currentCombo = currentCombo;
  if (currentCombo > newState.sessionStats.maxCombo) {
    newState.sessionStats.maxCombo = currentCombo;
  }

  const achievements = [];

  for (const milestone of MINI_MILESTONES.comboMilestones) {
    if (currentCombo >= milestone.combo &&
        !newState.sessionStats.claimedComboMilestones.includes(milestone.name)) {
      newState.sessionStats.claimedComboMilestones.push(milestone.name);
      achievements.push({
        type: 'combo',
        name: milestone.name,
        reward: milestone.reward
      });
    }
  }

  return { newState, achievements };
}

/**
 * Check and process crit streak milestones
 * @param {Object} state - Current state
 * @param {boolean} wasCrit - Whether last click was a crit
 * @returns {Object} { newState, achievements }
 */
function checkCritStreakMilestones(state, wasCrit) {
  const newState = { ...state };
  if (!newState.sessionStats) {
    newState.sessionStats = {
      sessionStartTime: Date.now(),
      sessionEssence: 0,
      currentCombo: 0,
      maxCombo: 0,
      critStreak: 0,
      maxCritStreak: 0,
      claimedSessionMilestones: [],
      claimedComboMilestones: [],
      claimedCritMilestones: []
    };
  }

  if (wasCrit) {
    newState.sessionStats.critStreak++;
    if (newState.sessionStats.critStreak > newState.sessionStats.maxCritStreak) {
      newState.sessionStats.maxCritStreak = newState.sessionStats.critStreak;
    }
  } else {
    newState.sessionStats.critStreak = 0;
  }

  const achievements = [];

  for (const milestone of MINI_MILESTONES.critStreakMilestones) {
    if (newState.sessionStats.critStreak >= milestone.streak &&
        !newState.sessionStats.claimedCritMilestones.includes(milestone.name)) {
      newState.sessionStats.claimedCritMilestones.push(milestone.name);
      achievements.push({
        type: 'critStreak',
        name: milestone.name,
        reward: milestone.reward
      });
    }
  }

  return { newState, achievements };
}

/**
 * Reset session stats (called when session starts)
 * @param {Object} state - Current state
 * @returns {Object} New state with reset session stats
 */
function resetSessionStats(state) {
  const newState = { ...state };
  newState.sessionStats = {
    sessionStartTime: Date.now(),
    sessionEssence: 0,
    currentCombo: 0,
    maxCombo: 0,
    critStreak: 0,
    maxCritStreak: 0,
    claimedSessionMilestones: [],
    claimedComboMilestones: [],
    claimedCritMilestones: []
  };
  return newState;
}

/**
 * Get session stats summary
 * @param {Object} state - Current state
 * @returns {Object} Session stats summary
 */
function getSessionStats(state) {
  const stats = state.sessionStats || {};
  const sessionDuration = stats.sessionStartTime
    ? Math.floor((Date.now() - stats.sessionStartTime) / 1000)
    : 0;

  return {
    duration: sessionDuration,
    durationFormatted: formatSessionDuration(sessionDuration),
    essenceEarned: stats.sessionEssence || 0,
    maxCombo: stats.maxCombo || 0,
    maxCritStreak: stats.maxCritStreak || 0,
    milestonesAchieved: (stats.claimedSessionMilestones?.length || 0) +
                        (stats.claimedComboMilestones?.length || 0) +
                        (stats.claimedCritMilestones?.length || 0)
  };
}

/**
 * Format session duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatSessionDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Assign a character for production bonus
 * @param {Object} state - Current state
 * @param {string} characterId - Character ID to assign
 * @param {Array} ownedCharacters - User's owned characters
 * @returns {Object} Result
 */
function assignCharacter(state, characterId, ownedCharacters) {
  // Check if character is owned
  const isOwned = ownedCharacters.some(c => c.id === characterId || c.characterId === characterId);
  if (!isOwned) {
    return { success: false, error: 'Character not owned' };
  }

  // Check if already assigned
  if (state.assignedCharacters?.includes(characterId)) {
    return { success: false, error: 'Character already assigned' };
  }

  // Check limit
  if ((state.assignedCharacters?.length || 0) >= GAME_CONFIG.maxAssignedCharacters) {
    return { success: false, error: 'Maximum characters assigned' };
  }

  const newState = { ...state };
  newState.assignedCharacters = [...(state.assignedCharacters || []), characterId];

  return {
    success: true,
    newState
  };
}

/**
 * Unassign a character
 * @param {Object} state - Current state
 * @param {string} characterId - Character ID to unassign
 * @returns {Object} Result
 */
function unassignCharacter(state, characterId) {
  if (!state.assignedCharacters?.includes(characterId)) {
    return { success: false, error: 'Character not assigned' };
  }

  const newState = { ...state };
  newState.assignedCharacters = state.assignedCharacters.filter(id => id !== characterId);

  return {
    success: true,
    newState
  };
}

/**
 * Reset daily progress (called at start of new day)
 * @param {Object} state - Current state
 * @returns {Object} New state with reset daily
 */
function resetDaily(state) {
  const today = new Date().toISOString().split('T')[0];

  if (state.daily?.date === today) {
    return state; // Already reset for today
  }

  return {
    ...state,
    daily: {
      date: today,
      clicks: 0,
      crits: 0,
      essenceEarned: 0,
      generatorsBought: 0,
      completedChallenges: []
    }
  };
}

/**
 * Check daily challenges progress
 * @param {Object} state - Current state
 * @returns {Array} Completed challenges
 */
function checkDailyChallenges(state) {
  const completedNew = [];

  for (const challenge of DAILY_CHALLENGES) {
    if (state.daily?.completedChallenges?.includes(challenge.id)) {
      continue; // Already completed
    }

    let progress = 0;
    let target = challenge.target;

    switch (challenge.type) {
      case 'clicks':
        progress = state.daily?.clicks || 0;
        break;
      case 'crits':
        progress = state.daily?.crits || 0;
        break;
      case 'essence_earned':
        progress = state.daily?.essenceEarned || 0;
        break;
      case 'generators_bought':
        progress = state.daily?.generatorsBought || 0;
        break;
    }

    if (progress >= target) {
      completedNew.push(challenge);
    }
  }

  return completedNew;
}

/**
 * Get available generators for the UI
 * @param {Object} state - Current state
 * @returns {Array} Available generators with costs
 */
function getAvailableGenerators(state) {
  return GENERATORS.map(gen => {
    const owned = state.generators?.[gen.id] || 0;
    const cost = getGeneratorCost(gen.id, owned);
    const unlocked = state.lifetimeEssence >= gen.unlockEssence;

    return {
      ...gen,
      owned,
      cost,
      unlocked,
      canAfford: state.essence >= cost,
      maxPurchasable: getMaxPurchasable(gen.id, owned, state.essence)
    };
  });
}

/**
 * Get available upgrades for the UI
 * @param {Object} state - Current state
 * @returns {Object} Categorized upgrades
 */
function getAvailableUpgrades(state) {
  const formatUpgrade = (upgrade) => ({
    ...upgrade,
    purchased: state.purchasedUpgrades?.includes(upgrade.id),
    canAfford: state.essence >= upgrade.cost,
    unlocked: !upgrade.unlockEssence || state.lifetimeEssence >= upgrade.unlockEssence,
    meetsRequirements: !upgrade.requiredOwned || (state.generators?.[upgrade.generatorId] || 0) >= upgrade.requiredOwned
  });

  return {
    click: CLICK_UPGRADES.map(formatUpgrade),
    generator: GENERATOR_UPGRADES.map(formatUpgrade),
    global: GLOBAL_UPGRADES.map(formatUpgrade),
    synergy: SYNERGY_UPGRADES.map(formatUpgrade)
  };
}

/**
 * Get prestige info for the UI
 * @param {Object} state - Current state
 * @returns {Object} Prestige information
 */
function getPrestigeInfo(state) {
  const shardsIfPrestige = calculatePrestigeShards(state.lifetimeEssence);
  const currentShards = state.prestigeShards || 0;
  const currentPrestigeBonus = 1 + Math.min(state.lifetimeShards || 0, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;
  const bonusAfterPrestige = 1 + Math.min((state.lifetimeShards || 0) + shardsIfPrestige, PRESTIGE_CONFIG.maxEffectiveShards) * PRESTIGE_CONFIG.shardMultiplier;

  const upgrades = PRESTIGE_CONFIG.upgrades.map(upgrade => {
    const level = state.prestigeUpgrades?.[upgrade.id] || 0;
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
    const canAfford = currentShards >= cost;
    const maxed = level >= upgrade.maxLevel;

    return {
      ...upgrade,
      level,
      cost,
      canAfford,
      maxed
    };
  });

  return {
    canPrestige: state.lifetimeEssence >= PRESTIGE_CONFIG.minimumEssence,
    minimumEssence: PRESTIGE_CONFIG.minimumEssence,
    shardsIfPrestige,
    currentShards,
    lifetimeShards: state.lifetimeShards || 0,
    prestigeLevel: state.prestigeLevel || 0,
    currentBonus: currentPrestigeBonus,
    bonusAfterPrestige,
    upgrades
  };
}

/**
 * Get full game state for the UI
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {Object} Full game state for UI
 */
function getGameState(state, characters = []) {
  const clickPower = calculateClickPower(state, characters);
  const productionPerSecond = calculateProductionPerSecond(state, characters);
  const critChance = calculateCritChance(state, characters);
  const critMultiplier = calculateCritMultiplier(state);
  const goldenChance = calculateGoldenChance(state, characters);
  const comboDecayTime = calculateComboDecayTime(state, characters);
  const elementBonuses = calculateElementBonuses(state, characters);
  const elementSynergy = calculateElementSynergy(state, characters);
  const seriesSynergy = calculateSeriesSynergy(state, characters);
  const masteryBonus = calculateTotalMasteryBonus(state);
  const underdogBonus = calculateUnderdogBonus(state, characters);
  const clickGeneratorScaling = calculateClickGeneratorScaling(state);
  const essenceTypeBonuses = getEssenceTypeBonuses(state);
  const dailyModifier = getCurrentDailyModifier();

  // Build character mastery info for assigned characters
  const characterMasteryInfo = {};
  for (const charId of state.assignedCharacters || []) {
    characterMasteryInfo[charId] = calculateCharacterMastery(state, charId);
  }

  return {
    essence: state.essence || 0,
    lifetimeEssence: state.lifetimeEssence || 0,
    totalClicks: state.totalClicks || 0,
    totalCrits: state.totalCrits || 0,
    clickPower,
    productionPerSecond,
    critChance,
    critMultiplier,
    goldenChance,
    comboDecayTime,
    generators: getAvailableGenerators(state),
    upgrades: getAvailableUpgrades(state),
    prestige: getPrestigeInfo(state),
    assignedCharacters: state.assignedCharacters || [],
    maxAssignedCharacters: GAME_CONFIG.maxAssignedCharacters,
    characterBonus: calculateCharacterBonus(state, characters),
    elementBonuses,
    elementSynergy,
    seriesSynergy,
    masteryBonus,
    characterMasteryInfo,
    underdogBonus,
    clickGeneratorScaling,
    infusion: {
      count: state.infusionCount || 0,
      bonus: state.infusionBonus || 0,
      cost: calculateInfusionCost(state),
      maxPerPrestige: INFUSION_CONFIG.maxPerPrestige
    },
    gamble: {
      ...getGambleInfo(state),
      jackpot: getJackpotInfo(state)
    },
    activeAbilities: getActiveAbilitiesInfo(state),
    dailyModifier: {
      ...dailyModifier,
      nextChangeIn: getTimeUntilNextModifier()
    },
    stats: state.stats || {},
    daily: state.daily || {},
    claimableMilestones: checkMilestones(state),
    claimableRepeatableMilestones: checkRepeatableMilestones(state),
    weeklyTournament: getWeeklyTournamentInfo(state),
    ticketGeneration: {
      streakDays: state.ticketGeneration?.dailyStreakDays || 0,
      exchangedThisWeek: state.ticketGeneration?.exchangedThisWeek || 0,
      weeklyExchangeLimit: TICKET_GENERATION.fatePointExchange.weeklyLimit
    },
    essenceTypes: state.essenceTypes || { pure: 0, ambient: 0, golden: 0, prismatic: 0 },
    essenceTypeBonuses,
    lastOnlineTimestamp: state.lastOnlineTimestamp,
    characterXP: state.characterXP || {}
  };
}

// ===========================================
// GAMBLE SYSTEM
// ===========================================

/**
 * Calculate gamble cooldown status
 * @param {Object} state - Current state
 * @returns {Object} Gamble availability info
 */
function getGambleInfo(state) {
  const now = Date.now();
  const lastGamble = state.lastGambleTimestamp || 0;
  const cooldownMs = GAMBLE_CONFIG.cooldownSeconds * 1000;
  const cooldownRemaining = Math.max(0, cooldownMs - (now - lastGamble));
  const dailyGamblesUsed = state.daily?.gamblesUsed || 0;

  return {
    available: cooldownRemaining === 0 && dailyGamblesUsed < GAMBLE_CONFIG.maxDailyGambles,
    cooldownRemaining,
    dailyGamblesUsed,
    maxDailyGambles: GAMBLE_CONFIG.maxDailyGambles,
    betTypes: GAMBLE_CONFIG.betTypes
  };
}

/**
 * Perform a gamble
 * @param {Object} state - Current state
 * @param {string} betType - Type of bet (safe, risky, extreme)
 * @param {number} betAmount - Amount to bet
 * @returns {Object} Gamble result
 */
function performGamble(state, betType, betAmount) {
  const now = Date.now();
  const lastGamble = state.lastGambleTimestamp || 0;
  const cooldownMs = GAMBLE_CONFIG.cooldownSeconds * 1000;

  // Check cooldown
  if (now - lastGamble < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - lastGamble)) / 1000);
    return { success: false, error: `Gamble on cooldown. ${remaining}s remaining.` };
  }

  // Check daily limit
  const dailyGamblesUsed = state.daily?.gamblesUsed || 0;
  if (dailyGamblesUsed >= GAMBLE_CONFIG.maxDailyGambles) {
    return { success: false, error: 'Daily gamble limit reached' };
  }

  // Validate bet type
  const bet = GAMBLE_CONFIG.betTypes[betType];
  if (!bet) {
    return { success: false, error: 'Invalid bet type' };
  }

  // Validate bet amount
  if (betAmount < GAMBLE_CONFIG.minBet) {
    return { success: false, error: `Minimum bet is ${GAMBLE_CONFIG.minBet} essence` };
  }

  const maxBet = Math.floor(state.essence * GAMBLE_CONFIG.maxBetPercent);
  if (betAmount > maxBet) {
    return { success: false, error: `Maximum bet is ${maxBet} essence (${GAMBLE_CONFIG.maxBetPercent * 100}% of current essence)` };
  }

  if (betAmount > state.essence) {
    return { success: false, error: 'Not enough essence' };
  }

  // Perform gamble
  const roll = Math.random();
  const won = roll < bet.winChance;
  let essenceChange;

  if (won) {
    essenceChange = Math.floor(betAmount * bet.multiplier) - betAmount;
  } else {
    essenceChange = -betAmount;
  }

  const newState = { ...state };
  newState.essence = Math.max(0, state.essence + essenceChange);
  newState.lastGambleTimestamp = now;
  newState.daily = {
    ...state.daily,
    gamblesUsed: dailyGamblesUsed + 1
  };
  newState.stats = {
    ...state.stats,
    totalGambleWins: (state.stats?.totalGambleWins || 0) + (won ? 1 : 0),
    totalGambleLosses: (state.stats?.totalGambleLosses || 0) + (won ? 0 : 1)
  };

  return {
    success: true,
    won,
    betAmount,
    betType,
    multiplier: bet.multiplier,
    winChance: bet.winChance,
    essenceChange,
    newEssence: newState.essence,
    newState
  };
}

// ===========================================
// INFUSION SYSTEM
// ===========================================

/**
 * Calculate the cost of the next infusion
 * @param {Object} state - Current state
 * @returns {number} Cost in essence (percentage of current)
 */
function calculateInfusionCost(state) {
  const infusionCount = state.infusionCount || 0;
  // Cost increases with each infusion: 50%, 55%, 60%, etc.
  return Math.min(
    INFUSION_CONFIG.baseCostPercent + (infusionCount * INFUSION_CONFIG.costIncreasePerUse),
    INFUSION_CONFIG.maxCostPercent
  );
}

/**
 * Perform an infusion
 * @param {Object} state - Current state
 * @returns {Object} Infusion result
 */
function performInfusion(state) {
  const infusionCount = state.infusionCount || 0;

  // Check if max infusions reached
  if (infusionCount >= INFUSION_CONFIG.maxPerPrestige) {
    return { success: false, error: 'Maximum infusions reached for this prestige' };
  }

  const costPercent = calculateInfusionCost(state);
  const cost = Math.floor(state.essence * costPercent);

  if (cost < INFUSION_CONFIG.minimumEssence) {
    return { success: false, error: `Need at least ${INFUSION_CONFIG.minimumEssence} essence to infuse` };
  }

  if (cost > state.essence) {
    return { success: false, error: 'Not enough essence' };
  }

  const bonusGained = INFUSION_CONFIG.bonusPerUse;
  const newBonus = (state.infusionBonus || 0) + bonusGained;

  const newState = { ...state };
  newState.essence = state.essence - cost;
  newState.infusionCount = infusionCount + 1;
  newState.infusionBonus = newBonus;
  newState.stats = {
    ...state.stats,
    totalInfusions: (state.stats?.totalInfusions || 0) + 1
  };

  return {
    success: true,
    cost,
    costPercent,
    bonusGained,
    totalBonus: newBonus,
    infusionCount: newState.infusionCount,
    newState
  };
}

// ===========================================
// ACTIVE ABILITIES SYSTEM
// ===========================================

/**
 * Get active abilities info for UI
 * @param {Object} state - Current state
 * @returns {Object} Active abilities info
 */
function getActiveAbilitiesInfo(state) {
  const now = Date.now();
  const abilities = {};

  for (const ability of ACTIVE_ABILITIES) {
    const lastUsed = state.abilityCooldowns?.[ability.id] || 0;
    const cooldownRemaining = Math.max(0, ability.cooldown - (now - lastUsed));
    const isActive = lastUsed > 0 && (now - lastUsed) < ability.duration;
    const activeRemaining = isActive ? ability.duration - (now - lastUsed) : 0;

    abilities[ability.id] = {
      ...ability,
      available: cooldownRemaining === 0 && state.prestigeLevel >= ability.unlockPrestige,
      cooldownRemaining,
      isActive,
      activeRemaining,
      unlocked: state.prestigeLevel >= ability.unlockPrestige
    };
  }

  return abilities;
}

/**
 * Activate an ability
 * @param {Object} state - Current state
 * @returns {Object} Result
 */
function activateAbility(state, abilityId) {
  const ability = ACTIVE_ABILITIES.find(a => a.id === abilityId);
  if (!ability) {
    return { success: false, error: 'Invalid ability' };
  }

  // Check prestige unlock requirement
  if ((state.prestigeLevel || 0) < ability.unlockPrestige) {
    return { success: false, error: `Requires Prestige ${ability.unlockPrestige}` };
  }

  // Check cooldown
  const now = Date.now();
  const lastUsed = state.abilityCooldowns?.[abilityId] || 0;
  if (now - lastUsed < ability.cooldown) {
    const remaining = Math.ceil((ability.cooldown - (now - lastUsed)) / 1000);
    return { success: false, error: `On cooldown. ${remaining}s remaining.` };
  }

  const newState = { ...state };
  newState.abilityCooldowns = {
    ...state.abilityCooldowns,
    [abilityId]: now
  };

  // For time_warp, also add offline essence
  let bonusEssence = 0;
  if (ability.id === 'time_warp' && ability.effects?.offlineMinutes) {
    const offlineMinutes = ability.effects.offlineMinutes;
    const productionPerSecond = calculateProductionPerSecond(state, []);
    bonusEssence = Math.floor(productionPerSecond * offlineMinutes * 60 * GAME_CONFIG.offlineEfficiency);
    newState.essence = (state.essence || 0) + bonusEssence;
    newState.lifetimeEssence = (state.lifetimeEssence || 0) + bonusEssence;
  }

  return {
    success: true,
    ability,
    duration: ability.duration,
    effects: ability.effects,
    bonusEssence,
    newState
  };
}

/**
 * Get current active ability effects
 * @param {Object} state - Current state
 * @returns {Object} Current active effects
 */
function getActiveAbilityEffects(state) {
  const now = Date.now();
  const effects = {
    productionMultiplier: 1,
    guaranteedCrits: false,
    goldenChanceMultiplier: 1
  };

  for (const ability of ACTIVE_ABILITIES) {
    const lastUsed = state.abilityCooldowns?.[ability.id] || 0;
    const isActive = lastUsed > 0 && (now - lastUsed) < ability.duration;

    if (isActive && ability.effects) {
      if (ability.effects.productionMultiplier) {
        effects.productionMultiplier *= ability.effects.productionMultiplier;
      }
      if (ability.effects.guaranteedCrits) {
        effects.guaranteedCrits = true;
      }
      if (ability.effects.goldenChanceMultiplier) {
        effects.goldenChanceMultiplier *= ability.effects.goldenChanceMultiplier;
      }
    }
  }

  return effects;
}

// ===========================================
// CHARACTER XP SYSTEM
// ===========================================

/**
 * Award XP to characters used in essence tap
 * @param {Object} state - Current state
 * @param {number} essenceEarned - Essence earned this session
 * @returns {Object} XP awards
 */
function awardCharacterXP(state, essenceEarned) {
  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return { xpAwarded: {}, newState: state };
  }

  const xpAwarded = {};
  const xpPerMillion = XP_REWARDS.perMillionEssence || 10;
  const baseXP = Math.floor((essenceEarned / 1000000) * xpPerMillion);

  // Each assigned character gets XP based on essence earned
  for (const charId of state.assignedCharacters) {
    const charXP = Math.max(1, Math.floor(baseXP / state.assignedCharacters.length));
    xpAwarded[charId] = charXP;
  }

  const newState = { ...state };
  newState.characterXP = { ...state.characterXP };

  for (const [charId, xp] of Object.entries(xpAwarded)) {
    newState.characterXP[charId] = (state.characterXP?.[charId] || 0) + xp;
  }

  return { xpAwarded, newState };
}

// ===========================================
// DAILY MODIFIER HELPERS
// ===========================================

/**
 * Get time until next daily modifier change
 * @returns {number} Milliseconds until next midnight UTC
 */
function getTimeUntilNextModifier() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime() - now.getTime();
}

// ===========================================
// REPEATABLE MILESTONES SYSTEM
// ===========================================

/**
 * Get current ISO week string (YYYY-WW)
 * @returns {string} ISO week identifier
 */
function getCurrentISOWeek() {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Get the end of the current ISO week (Sunday 23:59:59.999 UTC)
 * @returns {Date} End of current week
 */
function getWeekEndDate() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const endOfWeek = new Date(now);
  endOfWeek.setUTCDate(now.getUTCDate() + daysUntilSunday);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  return endOfWeek;
}

/**
 * Check and claim repeatable milestones
 * @param {Object} state - Current state
 * @returns {Object} Claimable repeatable milestones
 */
function checkRepeatableMilestones(state) {
  const claimable = [];
  const currentWeek = getCurrentISOWeek();

  // Check weekly essence milestone
  const weeklyMilestone = REPEATABLE_MILESTONES?.weeklyEssence;
  if (weeklyMilestone && state.weekly?.essenceEarned >= weeklyMilestone.threshold &&
      state.repeatableMilestones?.weeklyEssenceLastClaimed !== currentWeek) {
    claimable.push({
      type: 'weeklyEssence',
      fatePoints: weeklyMilestone.fatePoints,
      threshold: weeklyMilestone.threshold,
      currentProgress: state.weekly?.essenceEarned || 0
    });
  }

  // Check per-1T milestone (v3.0: renamed from essencePer100B, now uses essencePer1T)
  const per1TMilestone = REPEATABLE_MILESTONES?.essencePer1T || REPEATABLE_MILESTONES?.essencePer100B;
  if (per1TMilestone) {
    const claimedCount = state.repeatableMilestones?.per100BCount || 0;  // Keep state field for backwards compatibility
    const eligibleCount = Math.floor((state.lifetimeEssence || 0) / per1TMilestone.threshold);
    if (eligibleCount > claimedCount) {
      claimable.push({
        type: 'essencePer1T',
        fatePoints: per1TMilestone.fatePoints,
        count: eligibleCount - claimedCount,
        totalFatePoints: (eligibleCount - claimedCount) * per1TMilestone.fatePoints
      });
    }
  }

  return claimable;
}

/**
 * Claim a repeatable milestone
 * @param {Object} state - Current state
 * @param {string} milestoneType - Type of milestone to claim
 * @returns {Object} Result
 */
function claimRepeatableMilestone(state, milestoneType) {
  const currentWeek = getCurrentISOWeek();
  const newState = { ...state };
  newState.repeatableMilestones = { ...state.repeatableMilestones };

  if (milestoneType === 'weeklyEssence') {
    const weeklyMilestone = REPEATABLE_MILESTONES.weeklyEssence;
    if (state.weekly?.essenceEarned < weeklyMilestone.threshold) {
      return { success: false, error: 'Weekly essence milestone not reached' };
    }
    if (state.repeatableMilestones?.weeklyEssenceLastClaimed === currentWeek) {
      return { success: false, error: 'Already claimed this week' };
    }

    newState.repeatableMilestones.weeklyEssenceLastClaimed = currentWeek;
    return {
      success: true,
      newState,
      fatePoints: weeklyMilestone.fatePoints
    };
  }

  // v3.0: Support both old (essencePer100B) and new (essencePer1T) milestone types
  if (milestoneType === 'essencePer1T' || milestoneType === 'essencePer100B') {
    const per1TMilestone = REPEATABLE_MILESTONES?.essencePer1T || REPEATABLE_MILESTONES?.essencePer100B;
    if (!per1TMilestone) {
      return { success: false, error: 'Milestone config not found' };
    }
    const claimedCount = state.repeatableMilestones?.per100BCount || 0;
    const eligibleCount = Math.floor((state.lifetimeEssence || 0) / per1TMilestone.threshold);

    if (eligibleCount <= claimedCount) {
      return { success: false, error: 'No new 1T milestones to claim' };
    }

    const countToClaim = eligibleCount - claimedCount;
    newState.repeatableMilestones.per100BCount = eligibleCount;  // Keep field name for backwards compatibility

    return {
      success: true,
      newState,
      fatePoints: countToClaim * per1TMilestone.fatePoints,
      count: countToClaim
    };
  }

  return { success: false, error: 'Invalid milestone type' };
}

// ===========================================
// PROGRESSIVE JACKPOT SYSTEM (SHARED)
// ===========================================

/**
 * Get jackpot info from the shared jackpot
 * This fetches from the SharedJackpot model for server-wide jackpot
 * @param {Object} _state - Current state (unused, kept for API compatibility)
 * @returns {Object} Jackpot info (sync version for state calculation)
 */
function getJackpotInfo(_state) {
  const jackpotConfig = GAMBLE_CONFIG.jackpot;
  // This returns basic info - the actual amount comes from getSharedJackpotInfo async
  return {
    currentAmount: jackpotConfig.seedAmount, // Base amount, real value fetched async
    contributionRate: jackpotConfig.contributionRate,
    winChance: jackpotConfig.winChance,
    minBetToQualify: jackpotConfig.minBetToQualify,
    isShared: true
  };
}

/**
 * Get shared jackpot info from database (async)
 * @returns {Promise<Object>} Shared jackpot info
 */
async function getSharedJackpotInfo() {
  const { SharedJackpot, User } = require('../models');
  const jackpotConfig = GAMBLE_CONFIG.jackpot;

  let jackpot = await SharedJackpot.findOne({
    where: { jackpotType: 'essence_tap_main' },
    include: [{ model: User, as: 'lastWinner', attributes: ['id', 'username'] }]
  });

  // Create if doesn't exist
  if (!jackpot) {
    jackpot = await SharedJackpot.create({
      jackpotType: 'essence_tap_main',
      currentAmount: jackpotConfig.seedAmount,
      seedAmount: jackpotConfig.seedAmount
    });
  }

  return {
    currentAmount: Number(jackpot.currentAmount),
    seedAmount: Number(jackpot.seedAmount),
    totalContributions: Number(jackpot.totalContributions),
    totalWins: jackpot.totalWins,
    contributorCount: jackpot.contributorCount,
    lastWinner: jackpot.lastWinner ? {
      id: jackpot.lastWinner.id,
      username: jackpot.lastWinner.username
    } : null,
    lastWinAmount: jackpot.lastWinAmount ? Number(jackpot.lastWinAmount) : null,
    lastWinDate: jackpot.lastWinDate,
    largestWin: Number(jackpot.largestWin),
    contributionRate: jackpotConfig.contributionRate,
    winChance: jackpotConfig.winChance,
    minBetToQualify: jackpotConfig.minBetToQualify,
    isShared: true
  };
}

/**
 * Contribute to shared jackpot pool from gamble bet
 * @param {Object} state - Current state
 * @param {number} betAmount - Amount bet
 * @param {number} userId - User ID for tracking
 * @returns {Promise<Object>} Updated state and contribution amount
 */
async function contributeToJackpot(state, betAmount, userId = null) {
  const { SharedJackpot } = require('../models');
  const contribution = Math.floor(betAmount * GAMBLE_CONFIG.jackpot.contributionRate);

  // Update the shared jackpot in database
  const jackpot = await SharedJackpot.findOne({
    where: { jackpotType: 'essence_tap_main' }
  });

  if (jackpot) {
    await jackpot.update({
      currentAmount: Number(jackpot.currentAmount) + contribution,
      totalContributions: Number(jackpot.totalContributions) + contribution,
      contributorCount: jackpot.contributorCount + (userId ? 1 : 0)
    });
  }

  // Also track personal contributions in state for stats
  const newState = { ...state };
  newState.jackpotContributions = (state.jackpotContributions || 0) + contribution;

  return { newState, contribution };
}

/**
 * Check for jackpot win during gamble (uses shared jackpot)
 * @param {Object} state - Current state
 * @param {number} betAmount - Amount bet
 * @param {string} betType - Type of bet (safe/risky/extreme)
 * @returns {Promise<Object>} Jackpot result
 */
async function checkJackpotWin(state, betAmount, betType = 'safe') {
  const { SharedJackpot } = require('../models');
  const jackpotConfig = GAMBLE_CONFIG.jackpot;

  // Must meet minimum bet to qualify
  if (betAmount < jackpotConfig.minBetToQualify) {
    return { won: false, reason: 'bet_too_small' };
  }

  // Get bet type multiplier for win chance
  const chanceMultiplier = jackpotConfig.chanceMultipliers[betType] || 1.0;

  // Calculate win chance with streak bonus
  let winChance = jackpotConfig.winChance * chanceMultiplier;

  // Add streak bonus if applicable
  const gamblesInSession = state.daily?.gamblesUsed || 0;
  if (gamblesInSession >= jackpotConfig.streakBonus.threshold) {
    const extraGambles = gamblesInSession - jackpotConfig.streakBonus.threshold;
    winChance += extraGambles * jackpotConfig.streakBonus.bonusPerGamble;
  }

  const roll = Math.random();
  if (roll < winChance) {
    // Get the shared jackpot amount
    const jackpot = await SharedJackpot.findOne({
      where: { jackpotType: 'essence_tap_main' }
    });

    if (jackpot) {
      const jackpotAmount = Number(jackpot.currentAmount);
      return {
        won: true,
        amount: jackpotAmount,
        rewards: jackpotConfig.rewards
      };
    }
  }

  return { won: false };
}

/**
 * Reset shared jackpot after win and record winner
 * @param {Object} state - Current state
 * @param {number} userId - Winner's user ID
 * @param {number} winAmount - Amount won
 * @returns {Promise<Object>} Updated state
 */
async function resetJackpot(state, userId, winAmount) {
  const { SharedJackpot } = require('../models');
  const jackpotConfig = GAMBLE_CONFIG.jackpot;

  const jackpot = await SharedJackpot.findOne({
    where: { jackpotType: 'essence_tap_main' }
  });

  if (jackpot) {
    await jackpot.update({
      currentAmount: jackpotConfig.seedAmount,
      totalContributions: 0,
      contributorCount: 0,
      totalWins: jackpot.totalWins + 1,
      lastWinnerId: userId,
      lastWinAmount: winAmount,
      lastWinDate: new Date(),
      largestWin: Math.max(Number(jackpot.largestWin), winAmount)
    });
  }

  // Update player state
  const newState = { ...state };
  newState.jackpotContributions = 0;
  newState.stats = {
    ...state.stats,
    jackpotsWon: (state.stats?.jackpotsWon || 0) + 1,
    totalJackpotWinnings: (state.stats?.totalJackpotWinnings || 0) + winAmount
  };

  return newState;
}

// ===========================================
// WEEKLY TOURNAMENT SYSTEM (v4.0 ENHANCED)
// ===========================================

// Import tournament service for enhanced features
const tournamentService = require('./tournamentService');

// Import enhanced tournament config
const {
  BURNING_HOURS,
  TOURNAMENT_STREAKS,
  BRACKET_SYSTEM
} = require('../config/essenceTap');

/**
 * Update weekly tournament progress with v4.0 enhancements
 * Now includes: burning hour multipliers, streak bonuses, underdog bonuses
 * @param {Object} state - Current state
 * @param {number} essenceEarned - Base essence earned to add
 * @param {Object} options - Optional multiplier context
 * @returns {Object} Updated state
 */
function updateWeeklyProgress(state, essenceEarned, options = {}) {
  const currentWeek = getCurrentISOWeek();
  const newState = { ...state };

  // Ensure required state properties exist
  if (!newState.generators) newState.generators = state.generators || {};
  if (!newState.purchasedUpgrades) newState.purchasedUpgrades = state.purchasedUpgrades || [];
  if (!newState.daily) newState.daily = state.daily || {};
  if (!newState.stats) newState.stats = state.stats || {};

  // Initialize tournament state if needed
  if (!state.tournament) {
    newState.tournament = tournamentService.initializeTournamentState(state.tournament);
  }

  // Check if we need to reset for a new week
  if (state.weekly?.weekId !== currentWeek) {
    // Update streak before resetting
    const participated = (state.weekly?.essenceEarned || 0) >= TOURNAMENT_STREAKS.minimumEssenceToMaintain;
    const streakResult = tournamentService.updateStreak(state.tournament || {}, participated);

    newState.tournament = {
      ...tournamentService.initializeTournamentState(state.tournament),
      streak: streakResult.streak,
      lastParticipationWeek: streakResult.broken ? null : state.tournament?.lastParticipationWeek,
      totalTournamentsPlayed: (state.tournament?.totalTournamentsPlayed || 0) + (participated ? 1 : 0)
    };

    newState.weekly = {
      weekId: currentWeek,
      essenceEarned: 0,
      rank: null,
      bracketRank: null,
      rewardsClaimed: false,
      checkpointsClaimed: []
    };
  }

  // Calculate multipliers
  let totalMultiplier = 1.0;

  // Streak bonus
  const streakBonus = tournamentService.getStreakBonus(newState.tournament?.streak || 0);
  totalMultiplier += streakBonus;

  // Burning hour bonus (if active)
  if (options.burningHourActive) {
    totalMultiplier += (BURNING_HOURS.multiplier - 1);
  }

  // Underdog bonuses
  if (newState.tournament?.bracketRank && options.bracketSize) {
    const underdogBonuses = tournamentService.getUnderdogBonuses(newState.tournament, options.bracketSize);
    totalMultiplier += underdogBonuses.total;
  }

  // Cap multiplier
  totalMultiplier = Math.min(totalMultiplier, BURNING_HOURS.maxMultiplierStack);

  // Apply multiplier to essence
  const adjustedEssence = Math.floor(essenceEarned * totalMultiplier);

  newState.weekly = {
    ...newState.weekly,
    essenceEarned: (newState.weekly?.essenceEarned || 0) + adjustedEssence
  };

  // Update tournament essence as well
  if (newState.tournament) {
    newState.tournament.essenceEarned = newState.weekly.essenceEarned;
  }

  return {
    newState,
    adjustedEssence,
    multiplier: totalMultiplier,
    bonuses: {
      streak: streakBonus,
      burningHour: options.burningHourActive ? (BURNING_HOURS.multiplier - 1) : 0
    }
  };
}

/**
 * Get weekly tournament info with v4.0 enhancements
 * @param {Object} state - Current state
 * @returns {Object} Enhanced tournament info
 */
function getWeeklyTournamentInfo(state) {
  const currentWeek = getCurrentISOWeek();
  const isCurrentWeek = state.weekly?.weekId === currentWeek;

  // Calculate estimated tier based on essence earned
  let estimatedTier = null;
  const essenceEarned = isCurrentWeek ? (state.weekly?.essenceEarned || 0) : 0;

  for (const tier of WEEKLY_TOURNAMENT.tiers) {
    if (essenceEarned >= tier.minEssence) {
      estimatedTier = tier;
    }
  }

  // Get checkpoint status
  const checkpointsClaimed = state.weekly?.checkpointsClaimed || [];
  const checkpoints = tournamentService.getCheckpointStatus(essenceEarned, checkpointsClaimed);

  // Get streak info
  const streak = state.tournament?.streak || 0;
  const streakBonus = tournamentService.getStreakBonus(streak);

  // Get bracket info
  const bracket = state.tournament?.bracket || BRACKET_SYSTEM.defaultBracket;
  const bracketInfo = BRACKET_SYSTEM.brackets[bracket];

  return {
    weekId: currentWeek,
    essenceEarned,
    estimatedTier,
    tiers: WEEKLY_TOURNAMENT.tiers,
    rewards: WEEKLY_TOURNAMENT.rewards,
    isCurrentWeek,
    canClaimRewards: !isCurrentWeek && state.weekly?.weekId && !state.weekly?.rewardsClaimed,
    endsAt: getWeekEndDate().toISOString(),

    // v4.0 enhancements
    bracket,
    bracketInfo,
    bracketRank: state.weekly?.bracketRank || null,
    checkpoints,
    claimableCheckpoints: checkpoints.filter(c => c.claimable),
    streak,
    streakBonus,
    nextStreakMilestone: TOURNAMENT_STREAKS.milestones.find(m => m.weeks > streak),
    cosmetics: state.tournament?.cosmetics || { owned: [], equipped: {} },
    totalTournamentsPlayed: state.tournament?.totalTournamentsPlayed || 0,
    bestRank: state.tournament?.bestRank || null,
    podiumFinishes: state.tournament?.podiumFinishes || 0
  };
}

/**
 * Claim weekly tournament rewards with v4.0 enhancements
 * Now includes: tier rewards, rank rewards, streak rewards, cosmetics
 * @param {Object} state - Current state
 * @returns {Object} Result with combined rewards
 */
function claimWeeklyRewards(state) {
  const currentWeek = getCurrentISOWeek();

  // Can only claim rewards from previous weeks
  if (state.weekly?.weekId === currentWeek) {
    return { success: false, error: 'Cannot claim rewards for current week' };
  }

  if (!state.weekly?.weekId) {
    return { success: false, error: 'No weekly data to claim' };
  }

  if (state.weekly?.rewardsClaimed) {
    return { success: false, error: 'Rewards already claimed' };
  }

  // Determine tier achieved
  const essenceEarned = state.weekly?.essenceEarned || 0;
  let achievedTier = null;

  for (const tier of WEEKLY_TOURNAMENT.tiers) {
    if (essenceEarned >= tier.minEssence) {
      achievedTier = tier;
    }
  }

  if (!achievedTier) {
    return { success: false, error: 'No tier achieved' };
  }

  // Calculate total rewards using tournament service
  const tournamentState = {
    ...state.tournament,
    essenceEarned,
    bracketRank: state.weekly?.bracketRank || null,
    streak: state.tournament?.streak || 0
  };

  const totalRewards = tournamentService.calculateTotalRewards(tournamentState);

  const newState = { ...state };
  newState.weekly = {
    ...state.weekly,
    rewardsClaimed: true
  };

  // Update tournament state with new stats
  newState.tournament = {
    ...state.tournament,
    totalTournamentsPlayed: (state.tournament?.totalTournamentsPlayed || 0) + 1
  };

  // Update best rank if applicable
  const bracketRank = state.weekly?.bracketRank;
  if (bracketRank && (!newState.tournament.bestRank || bracketRank < newState.tournament.bestRank)) {
    newState.tournament.bestRank = bracketRank;
  }

  // Update podium finishes
  if (bracketRank && bracketRank <= 3) {
    newState.tournament.podiumFinishes = (newState.tournament.podiumFinishes || 0) + 1;
  }

  // Unlock cosmetics
  if (totalRewards.combined.cosmetics.length > 0) {
    const cosmeticResult = tournamentService.unlockCosmetics(newState.tournament, totalRewards.combined.cosmetics);
    newState.tournament.cosmetics = cosmeticResult.cosmetics;
  }

  return {
    success: true,
    newState,
    tier: achievedTier.name,
    rewards: totalRewards.combined,
    breakdown: {
      tierRewards: totalRewards.tierRewards,
      rankRewards: totalRewards.rankRewards,
      streakRewards: totalRewards.streakRewards
    },
    bracketRank,
    streak: tournamentState.streak
  };
}

/**
 * Claim a daily checkpoint reward
 * @param {Object} state - Current state
 * @param {number} day - Checkpoint day (1-7)
 * @returns {Object} Result with rewards
 */
function claimTournamentCheckpoint(state, day) {
  const currentWeek = getCurrentISOWeek();

  if (state.weekly?.weekId !== currentWeek) {
    return { success: false, error: 'No active tournament week' };
  }

  const tournamentState = {
    essenceEarned: state.weekly?.essenceEarned || 0,
    checkpointsClaimed: state.weekly?.checkpointsClaimed || []
  };

  const result = tournamentService.claimCheckpoint(tournamentState, day);

  if (!result.success) {
    return result;
  }

  const newState = { ...state };
  newState.weekly = {
    ...state.weekly,
    checkpointsClaimed: [...(state.weekly?.checkpointsClaimed || []), day]
  };

  return {
    success: true,
    newState,
    rewards: result.rewards,
    checkpointName: result.checkpointName,
    day
  };
}

/**
 * Get burning hour status for the current week
 * @returns {Object} Burning hour status
 */
function getBurningHourStatus() {
  // In production, schedule would be stored in database
  // For now, generate deterministically based on week
  const currentWeek = getCurrentISOWeek();
  const schedule = tournamentService.generateBurningHourSchedule(currentWeek);

  return tournamentService.getBurningHourStatus(schedule);
}

/**
 * Equip a tournament cosmetic
 * @param {Object} state - Current state
 * @param {string} cosmeticId - Cosmetic ID to equip
 * @returns {Object} Result
 */
function equipTournamentCosmetic(state, cosmeticId) {
  if (!state.tournament) {
    return { success: false, error: 'No tournament data' };
  }

  const result = tournamentService.equipCosmetic(state.tournament, cosmeticId);

  if (!result.success) {
    return result;
  }

  const newState = { ...state };
  newState.tournament = {
    ...state.tournament,
    cosmetics: result.cosmetics
  };

  return {
    success: true,
    newState,
    equippedSlot: result.equippedSlot
  };
}

/**
 * Unequip a tournament cosmetic from a slot
 * @param {Object} state - Current state
 * @param {string} slot - Slot to unequip
 * @returns {Object} Result
 */
function unequipTournamentCosmetic(state, slot) {
  if (!state.tournament) {
    return { success: false, error: 'No tournament data' };
  }

  const result = tournamentService.unequipCosmetic(state.tournament, slot);

  if (!result.success) {
    return result;
  }

  const newState = { ...state };
  newState.tournament = {
    ...state.tournament,
    cosmetics: result.cosmetics
  };

  return {
    success: true,
    newState
  };
}

// ===========================================
// ROLL TICKET GENERATION SYSTEM
// ===========================================

/**
 * Check and award daily streak tickets
 * @param {Object} state - Current state
 * @returns {Object} Result with ticket award info
 */
function checkDailyStreakTickets(state) {
  const today = new Date().toISOString().split('T')[0];
  const lastStreakDate = state.ticketGeneration?.lastStreakDate;
  const currentStreak = state.ticketGeneration?.dailyStreakDays || 0;

  // If already claimed today, no reward
  if (lastStreakDate === today) {
    return { awarded: false, reason: 'already_claimed' };
  }

  const newState = { ...state };
  newState.ticketGeneration = { ...state.ticketGeneration };

  // Check if streak continues (played yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak;
  if (lastStreakDate === yesterdayStr) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1; // Reset streak
  }

  newState.ticketGeneration.dailyStreakDays = newStreak;
  newState.ticketGeneration.lastStreakDate = today;

  // Check if we hit a ticket milestone
  const ticketMilestone = TICKET_GENERATION.dailyStreak.ticketMilestones.find(
    m => m.days === newStreak
  );

  if (ticketMilestone) {
    return {
      awarded: true,
      tickets: ticketMilestone.tickets,
      streakDays: newStreak,
      newState,
      nextMilestone: TICKET_GENERATION.dailyStreak.ticketMilestones.find(m => m.days > newStreak)
    };
  }

  return {
    awarded: false,
    reason: 'no_milestone',
    streakDays: newStreak,
    newState,
    nextMilestone: TICKET_GENERATION.dailyStreak.ticketMilestones.find(m => m.days > newStreak)
  };
}

/**
 * Exchange fate points for roll tickets
 * @param {Object} state - Current state
 * @param {number} userFatePoints - User's current fate points
 * @returns {Object} Exchange result
 */
function exchangeFatePointsForTickets(state, userFatePoints) {
  const currentWeek = getCurrentISOWeek();
  const exchangeConfig = TICKET_GENERATION.fatePointExchange;

  // Reset weekly limit if new week
  if (state.ticketGeneration?.lastExchangeWeek !== currentWeek) {
    const newState = { ...state };
    newState.ticketGeneration = {
      ...state.ticketGeneration,
      exchangedThisWeek: 0,
      lastExchangeWeek: currentWeek
    };
    state = newState;
  }

  const exchangedThisWeek = state.ticketGeneration?.exchangedThisWeek || 0;

  if (exchangedThisWeek >= exchangeConfig.weeklyLimit) {
    return { success: false, error: 'Weekly exchange limit reached' };
  }

  if (userFatePoints < exchangeConfig.cost) {
    return { success: false, error: `Need ${exchangeConfig.cost} Fate Points` };
  }

  const newState = { ...state };
  newState.ticketGeneration = {
    ...state.ticketGeneration,
    exchangedThisWeek: exchangedThisWeek + 1,
    lastExchangeWeek: currentWeek
  };

  return {
    success: true,
    newState,
    fatePointsCost: exchangeConfig.cost,
    ticketsReceived: exchangeConfig.tickets,
    exchangesRemaining: exchangeConfig.weeklyLimit - exchangedThisWeek - 1
  };
}

/**
 * Check daily challenge ticket rewards
 * @param {Object} state - Current state
 * @returns {Object} Available ticket rewards from challenges
 */
function checkDailyChallengeTickets(state) {
  const completedToday = state.daily?.ticketChallengesCompleted || 0;
  const challengeConfig = TICKET_GENERATION.dailyChallenges;

  if (completedToday >= challengeConfig.maxPerDay) {
    return { available: false, reason: 'daily_limit' };
  }

  // Check if any new challenges completed that give tickets
  const dailyChallenges = checkDailyChallenges(state);
  const ticketRewardChallenges = dailyChallenges.filter(c => c.ticketReward);

  return {
    available: ticketRewardChallenges.length > 0,
    challenges: ticketRewardChallenges,
    completedToday,
    maxPerDay: challengeConfig.maxPerDay
  };
}

// ===========================================
// ELEMENT DERIVATION FOR EXISTING CHARACTERS
// ===========================================

/**
 * Get derived element for a character (uses config's deriveElement)
 * @param {Object} character - Character object
 * @returns {string} Derived element
 */
function getCharacterElement(character) {
  // If character already has element set, use it
  if (character.element) {
    return character.element;
  }

  // Otherwise derive from character properties
  // FIX: deriveElement takes (characterId, rarity), not (id, name, series)
  return deriveElement(character.id, character.rarity || 'common');
}

/**
 * Get element breakdown for assigned characters
 * @param {Object} state - Current state
 * @param {Array} characters - User's character collection
 * @returns {Object} Element breakdown
 */
function getAssignedCharacterElements(state, characters = []) {
  const breakdown = {
    fire: [],
    water: [],
    earth: [],
    air: [],
    light: [],
    dark: [],
    neutral: []
  };

  if (!state.assignedCharacters || state.assignedCharacters.length === 0) {
    return breakdown;
  }

  for (const charId of state.assignedCharacters) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (!char) continue;

    const element = getCharacterElement(char);
    if (breakdown[element]) {
      breakdown[element].push({
        id: charId,
        name: char.name,
        element
      });
    }
  }

  return breakdown;
}

// ===========================================
// ESSENCE TYPE CONVERSION
// ===========================================

/**
 * Classify essence earned into types
 * @param {number} essenceEarned - Raw essence earned
 * @param {boolean} isGolden - Was it from a golden click
 * @param {boolean} isCrit - Was it a critical hit
 * @returns {Object} Essence type breakdown
 */
function classifyEssence(essenceEarned, isGolden = false, isCrit = false) {
  const result = {
    pure: 0,
    ambient: 0,
    golden: 0,
    prismatic: 0,
    total: essenceEarned
  };

  if (isGolden) {
    // Golden clicks give golden essence
    result.golden = essenceEarned;
  } else if (isCrit) {
    // Crits give a mix of pure and prismatic
    result.pure = Math.floor(essenceEarned * 0.7);
    result.prismatic = essenceEarned - result.pure;
  } else {
    // Normal clicks give ambient with some pure
    result.ambient = Math.floor(essenceEarned * 0.8);
    result.pure = essenceEarned - result.ambient;
  }

  return result;
}

/**
 * Update essence type totals
 * @param {Object} state - Current state
 * @param {Object} essenceTypes - Essence type breakdown to add
 * @returns {Object} Updated state
 */
function updateEssenceTypes(state, essenceTypes) {
  const newState = { ...state };
  newState.essenceTypes = {
    pure: (state.essenceTypes?.pure || 0) + (essenceTypes.pure || 0),
    ambient: (state.essenceTypes?.ambient || 0) + (essenceTypes.ambient || 0),
    golden: (state.essenceTypes?.golden || 0) + (essenceTypes.golden || 0),
    prismatic: (state.essenceTypes?.prismatic || 0) + (essenceTypes.prismatic || 0)
  };
  return newState;
}

/**
 * Get essence type bonuses (for future features)
 * @param {Object} state - Current state
 * @returns {Object} Bonuses from essence types
 */
function getEssenceTypeBonuses(state) {
  const types = state.essenceTypes || { pure: 0, ambient: 0, golden: 0, prismatic: 0 };

  // Prismatic essence gives permanent bonuses
  const prismaticBonus = Math.min(types.prismatic / ESSENCE_TYPES.prismatic.requirement, 0.5);

  return {
    productionBonus: prismaticBonus * 0.1,  // Up to 5% production
    critBonus: prismaticBonus * 0.02,       // Up to 1% crit chance
    goldenBonus: prismaticBonus * 0.005     // Up to 0.25% golden chance
  };
}

// ===========================================
// GAME CONFIG EXPORT FOR FRONTEND
// ===========================================

/**
 * Get game configuration for frontend display
 * This ensures frontend stays in sync with backend balance values
 * @returns {Object} Game configuration
 */
function getGameConfig() {
  return {
    characterBonuses: GAME_CONFIG.characterBonuses,
    underdogBonuses: GAME_CONFIG.underdogBonuses,
    maxAssignedCharacters: GAME_CONFIG.maxAssignedCharacters,
    goldenEssenceChance: GAME_CONFIG.goldenEssenceChance,
    goldenEssenceMultiplier: GAME_CONFIG.goldenEssenceMultiplier,
    comboDecayTime: GAME_CONFIG.comboDecayTime,
    maxComboMultiplier: GAME_CONFIG.maxComboMultiplier,
    comboGrowthRate: GAME_CONFIG.comboGrowthRate,
    characterAbilities: CHARACTER_ABILITIES,
    elementSynergies: ELEMENT_SYNERGIES,
    seriesSynergies: SERIES_SYNERGIES,
    essenceTypes: ESSENCE_TYPES,
    dailyModifiers: DAILY_MODIFIERS,
    dailyChallenges: DAILY_CHALLENGES,
    miniMilestones: MINI_MILESTONES,
    weeklyFpCap: WEEKLY_FP_CAP,
    prestigeConfig: {
      minimumEssence: PRESTIGE_CONFIG.minimumEssence,
      cooldownMs: PRESTIGE_CONFIG.cooldownMs
    },
    bossConfig: BOSS_CONFIG
  };
}

// ===========================================
// DAILY CHALLENGES SYSTEM
// ===========================================

/**
 * Get daily challenges with current progress
 * @param {Object} state - Current state
 * @returns {Array} Daily challenges with progress
 */
function getDailyChallengesWithProgress(state) {
  const daily = state.daily || {};

  return DAILY_CHALLENGES.map(challenge => {
    let progress = 0;

    switch (challenge.type) {
      case 'clicks':
        progress = daily.clicks || 0;
        break;
      case 'crits':
        progress = daily.crits || 0;
        break;
      case 'essence_earned':
        progress = daily.essenceEarned || 0;
        break;
      case 'generators_bought':
        progress = daily.generatorsBought || 0;
        break;
      case 'golden_clicks':
        progress = state.stats?.goldenEssenceClicks || 0;
        break;
    }

    const completed = progress >= challenge.target;
    const claimed = daily.claimedChallenges?.includes(challenge.id) || false;

    return {
      ...challenge,
      progress,
      completed,
      claimed,
      canClaim: completed && !claimed
    };
  });
}

/**
 * Claim a completed daily challenge
 * @param {Object} state - Current state
 * @param {string} challengeId - Challenge ID to claim
 * @returns {Object} Result with rewards
 */
function claimDailyChallenge(state, challengeId) {
  const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) {
    return { success: false, error: 'Invalid challenge' };
  }

  const daily = state.daily || {};
  if (daily.claimedChallenges?.includes(challengeId)) {
    return { success: false, error: 'Already claimed' };
  }

  // Check if challenge is completed
  let progress = 0;
  switch (challenge.type) {
    case 'clicks':
      progress = daily.clicks || 0;
      break;
    case 'crits':
      progress = daily.crits || 0;
      break;
    case 'essence_earned':
      progress = daily.essenceEarned || 0;
      break;
    case 'generators_bought':
      progress = daily.generatorsBought || 0;
      break;
    case 'golden_clicks':
      progress = state.stats?.goldenEssenceClicks || 0;
      break;
  }

  if (progress < challenge.target) {
    return { success: false, error: 'Challenge not completed' };
  }

  const newState = { ...state };
  newState.daily = {
    ...daily,
    claimedChallenges: [...(daily.claimedChallenges || []), challengeId]
  };

  // Add essence reward
  if (challenge.rewards.essence) {
    newState.essence = (newState.essence || 0) + challenge.rewards.essence;
    newState.lifetimeEssence = (newState.lifetimeEssence || 0) + challenge.rewards.essence;
  }

  return {
    success: true,
    newState,
    rewards: challenge.rewards,
    challenge
  };
}

// ===========================================
// BOSS ENCOUNTER SYSTEM
// ===========================================

/**
 * Boss configuration - uses shared constants as SINGLE SOURCE OF TRUTH
 * See shared/balanceConstants.js ESSENCE_TAP_DISPLAY.boss for authoritative values
 */
const BOSS_CONFIG = {
  // Use shared constants for all boss-related values
  spawnInterval: ESSENCE_TAP_DISPLAY.boss.spawnInterval,
  bosses: ESSENCE_TAP_DISPLAY.boss.tiers,
  cooldownMs: ESSENCE_TAP_DISPLAY.boss.cooldownMs,
  weaknessMultiplier: ESSENCE_TAP_DISPLAY.boss.weaknessMultiplier,
  rarityDamageBonus: ESSENCE_TAP_DISPLAY.boss.rarityDamageBonus
};

/**
 * Get boss encounter info
 * @param {Object} state - Current state
 * @returns {Object} Boss encounter status
 */
function getBossEncounterInfo(state) {
  const now = Date.now();
  const bossState = state.bossEncounter || {};

  // Check if there's an active boss
  if (bossState.active && bossState.expiresAt > now) {
    const boss = BOSS_CONFIG.bosses.find(b => b.id === bossState.bossId);
    return {
      active: true,
      boss: boss,
      currentHealth: bossState.currentHealth,
      maxHealth: bossState.maxHealth,
      timeRemaining: Math.max(0, bossState.expiresAt - now),
      damageDealt: bossState.damageDealt || 0
    };
  }

  // Check if on cooldown
  const lastDefeat = bossState.lastDefeatTime || 0;
  const cooldownRemaining = Math.max(0, (lastDefeat + BOSS_CONFIG.cooldownMs) - now);

  // Check if eligible to spawn a new boss
  const clicksSinceLastBoss = (state.totalClicks || 0) - (bossState.clicksAtLastSpawn || 0);
  const canSpawn = clicksSinceLastBoss >= BOSS_CONFIG.spawnInterval && cooldownRemaining === 0;

  // Auto-spawn if eligible
  if (canSpawn) {
    return {
      active: false,
      canSpawn: true,
      nextBossTier: getBossForPrestigeLevel(state.prestigeLevel || 0),
      cooldownRemaining: 0,
      clicksUntilSpawn: 0
    };
  }

  return {
    active: false,
    canSpawn: false,
    cooldownRemaining,
    clicksUntilSpawn: Math.max(0, BOSS_CONFIG.spawnInterval - clicksSinceLastBoss)
  };
}

/**
 * Get appropriate boss tier for prestige level
 * @param {number} prestigeLevel - Current prestige level
 * @returns {Object} Boss data
 */
function getBossForPrestigeLevel(prestigeLevel) {
  // Higher prestige = access to harder bosses
  let maxTier = 1;
  if (prestigeLevel >= 5) maxTier = 4;
  else if (prestigeLevel >= 3) maxTier = 3;
  else if (prestigeLevel >= 1) maxTier = 2;

  // Random tier up to max
  const tier = Math.floor(Math.random() * maxTier) + 1;
  return BOSS_CONFIG.bosses.find(b => b.tier === tier) || BOSS_CONFIG.bosses[0];
}

/**
 * Spawn a boss encounter
 * @param {Object} state - Current state
 * @returns {Object} Result with new state
 */
function spawnBoss(state) {
  const now = Date.now();
  const bossState = state.bossEncounter || {};

  // Check cooldown - cannot spawn if on cooldown
  const lastDefeat = bossState.lastDefeatTime || 0;
  const cooldownRemaining = Math.max(0, (lastDefeat + BOSS_CONFIG.cooldownMs) - now);
  if (cooldownRemaining > 0) {
    return {
      success: false,
      error: 'Boss on cooldown',
      cooldownRemaining
    };
  }

  // Check click requirement
  const clicksSinceLastBoss = (state.totalClicks || 0) - (bossState.clicksAtLastSpawn || 0);
  if (clicksSinceLastBoss < BOSS_CONFIG.spawnInterval) {
    return {
      success: false,
      error: 'Not enough clicks to spawn boss',
      clicksUntilSpawn: BOSS_CONFIG.spawnInterval - clicksSinceLastBoss
    };
  }

  const boss = getBossForPrestigeLevel(state.prestigeLevel || 0);

  // Scale health with prestige
  const healthMultiplier = 1 + (state.prestigeLevel || 0) * 0.5;
  const maxHealth = Math.floor(boss.baseHealth * healthMultiplier);

  const newState = { ...state };
  newState.bossEncounter = {
    ...bossState,
    active: true,
    bossId: boss.id,
    currentHealth: maxHealth,
    maxHealth: maxHealth,
    expiresAt: now + boss.timeLimit,
    spawnedAt: now,
    clicksAtLastSpawn: state.totalClicks || 0,
    damageDealt: 0
    // Preserve lastDefeatTime and totalDefeated from previous state
  };

  return {
    success: true,
    newState,
    boss
  };
}

/**
 * Attack the current boss
 * @param {Object} state - Current state
 * @param {number} damage - Base damage from clicks
 * @param {Array} characters - User's characters
 * @returns {Object} Result
 */
function attackBoss(state, damage, characters) {
  const now = Date.now();
  const bossState = state.bossEncounter || {};

  // Check if boss should spawn first
  if (!bossState.active || bossState.expiresAt <= now) {
    // Try to spawn a new boss
    const spawnResult = spawnBoss(state);
    if (spawnResult.success) {
      return {
        success: true,
        newState: spawnResult.newState,
        damageDealt: 0,
        bossHealth: spawnResult.newState.bossEncounter.currentHealth,
        defeated: false,
        bossSpawned: true,
        boss: spawnResult.boss
      };
    }
    return { success: false, error: 'No active boss encounter' };
  }

  const boss = BOSS_CONFIG.bosses.find(b => b.id === bossState.bossId);
  if (!boss) {
    return { success: false, error: 'Invalid boss' };
  }

  // Calculate actual damage with bonuses
  let totalDamage = damage || state.clickPower || 1;

  // Apply character damage bonuses
  const assignedChars = state.assignedCharacters || [];
  for (const charId of assignedChars) {
    const char = characters.find(c => c.id === charId || c.characterId === charId);
    if (!char) continue;

    // Rarity bonus
    const rarityBonus = BOSS_CONFIG.rarityDamageBonus[char.rarity] || 1.0;
    totalDamage *= rarityBonus;

    // Element weakness bonus
    const charElement = getCharacterElement(char);
    if (boss.elementWeakness && charElement === boss.elementWeakness) {
      totalDamage *= BOSS_CONFIG.weaknessMultiplier;
    }
  }

  totalDamage = Math.floor(totalDamage);

  const newState = { ...state };
  const newHealth = Math.max(0, bossState.currentHealth - totalDamage);

  newState.bossEncounter = {
    ...bossState,
    currentHealth: newHealth,
    damageDealt: (bossState.damageDealt || 0) + totalDamage
  };

  // Check if boss defeated
  if (newHealth <= 0) {
    // Scale rewards with prestige
    const rewardMultiplier = 1 + (state.prestigeLevel || 0) * 0.25;
    const scaledRewards = {
      essence: Math.floor((boss.rewards.essence || 0) * rewardMultiplier),
      fatePoints: boss.rewards.fatePoints || 0,
      rollTickets: boss.rewards.rollTickets || 0,
      prismaticEssence: boss.rewards.prismaticEssence || 0,
      xp: boss.rewards.xp || 0
    };

    // Update boss state
    newState.bossEncounter = {
      active: false,
      lastDefeatTime: now,
      clicksAtLastSpawn: state.totalClicks || 0,
      totalDefeated: (bossState.totalDefeated || 0) + 1
    };

    // Track stats
    newState.stats = {
      ...newState.stats,
      bossesDefeated: (newState.stats?.bossesDefeated || 0) + 1
    };

    return {
      success: true,
      newState,
      damageDealt: totalDamage,
      bossHealth: 0,
      defeated: true,
      rewards: scaledRewards,
      nextBossIn: BOSS_CONFIG.cooldownMs
    };
  }

  return {
    success: true,
    newState,
    damageDealt: totalDamage,
    bossHealth: newHealth,
    defeated: false,
    timeRemaining: bossState.expiresAt - now
  };
}

module.exports = {
  // Core functions
  getInitialState,
  getGeneratorCost,
  getBulkGeneratorCost,
  getMaxPurchasable,

  // Calculation functions
  calculateClickPower,
  calculateCritChance,
  calculateCritMultiplier,
  calculateProductionPerSecond,
  calculateGlobalMultiplier,
  calculateCharacterBonus,
  calculateOfflineProgress,
  calculateGoldenChance,
  calculateComboDecayTime,
  calculateElementBonuses,
  calculateElementSynergy,
  calculateSeriesSynergy,
  calculateCharacterMastery,
  calculateTotalMasteryBonus,
  calculateClickGeneratorScaling,
  calculateUnderdogBonus,
  calculateInfusionCost,

  // Game actions
  processClick,
  purchaseGenerator,
  purchaseUpgrade,
  calculatePrestigeShards,
  performPrestige,
  purchasePrestigeUpgrade,
  checkMilestones,
  claimMilestone,
  assignCharacter,
  unassignCharacter,
  resetDaily,
  checkDailyChallenges,

  // Gamble system
  getGambleInfo,
  performGamble,

  // Jackpot system (shared progressive)
  getJackpotInfo,
  getSharedJackpotInfo,
  contributeToJackpot,
  checkJackpotWin,
  resetJackpot,

  // Infusion system
  performInfusion,

  // Active abilities
  getActiveAbilitiesInfo,
  activateAbility,
  getActiveAbilityEffects,

  // Character XP & Mastery
  awardCharacterXP,
  updateCharacterMastery,

  // Daily modifiers
  getCurrentDailyModifier,
  getTimeUntilNextModifier,

  // Repeatable milestones
  checkRepeatableMilestones,
  claimRepeatableMilestone,
  getCurrentISOWeek,

  // Weekly tournament (v4.0 Enhanced)
  updateWeeklyProgress,
  getWeeklyTournamentInfo,
  claimWeeklyRewards,
  claimTournamentCheckpoint,
  getBurningHourStatus,
  equipTournamentCosmetic,
  unequipTournamentCosmetic,
  tournamentService,

  // Ticket generation
  checkDailyStreakTickets,
  exchangeFatePointsForTickets,
  checkDailyChallengeTickets,

  // Element derivation
  getCharacterElement,
  getAssignedCharacterElements,

  // Essence types
  classifyEssence,
  updateEssenceTypes,
  getEssenceTypeBonuses,

  // UI helpers
  getAvailableGenerators,
  getAvailableUpgrades,
  getPrestigeInfo,
  getGameState,

  // Weekly FP cap
  getCurrentWeekId,
  resetWeeklyFPIfNeeded,
  getWeeklyFPBudget,
  applyFPWithCap,

  // Mini-milestones
  checkSessionMilestones,
  checkComboMilestones,
  checkCritStreakMilestones,
  resetSessionStats,
  getSessionStats,

  // Config exports
  GENERATORS,
  GAME_CONFIG,
  CHARACTER_MASTERY,
  ESSENCE_TYPES,
  SERIES_SYNERGIES,
  WEEKLY_TOURNAMENT,
  TICKET_GENERATION,
  REPEATABLE_MILESTONES,
  WEEKLY_FP_CAP,
  MINI_MILESTONES,
  BOSS_CONFIG,

  // Game config for frontend
  getGameConfig,

  // Daily challenges
  getDailyChallengesWithProgress,
  claimDailyChallenge,

  // Boss encounters
  getBossEncounterInfo,
  getBossForPrestigeLevel,
  spawnBoss,
  attackBoss
};
