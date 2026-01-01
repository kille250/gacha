/**
 * Roll Engine
 * 
 * Centralized gacha roll execution logic
 * Extracts common patterns from banners.js and characters.js
 * 
 * Responsibilities:
 * - Execute single and multi rolls
 * - Handle pity mechanics
 * - Manage pool selection (banner vs standard)
 * - Track roll state during multi-pulls
 */

const {
  getRarities,
  rollRarity,
  getStandardRates,
  getPremiumRates,
  getPityRates,
  calculateBannerRates,
  getBannerPullChance,
  applyLuckBonus,
  PRICING_CONFIG
} = require('../config/pricing');

const { GACHA_PITY_CONFIG } = require('../config/gameDesign');

const {
  groupCharactersByRarity,
  selectCharacterWithFallback,
  filterR18Characters,
  isRarePlus
} = require('./rollHelpers');

const {
  getStandardBannerCharacters
} = require('../services/standardBannerService');

// ===========================================
// PITY SYSTEM (SOFT + HARD)
// ===========================================

/**
 * Check if hard pity should force a specific rarity
 * Hard pity guarantees the rarity when counter reaches threshold
 *
 * @param {number} pullsSinceLegendary - Pulls since last legendary
 * @param {number} pullsSinceEpic - Pulls since last epic
 * @returns {{ forcedRarity: string|null, isHardPity: boolean }}
 */
const checkHardPity = (pullsSinceLegendary, pullsSinceEpic) => {
  const legendaryConfig = GACHA_PITY_CONFIG.standard.legendary;
  const epicConfig = GACHA_PITY_CONFIG.standard.epic;

  // Legendary hard pity takes priority
  if (pullsSinceLegendary >= legendaryConfig.hardPity) {
    return { forcedRarity: 'legendary', isHardPity: true };
  }

  // Epic hard pity
  if (pullsSinceEpic >= epicConfig.hardPity) {
    return { forcedRarity: 'epic', isHardPity: true };
  }

  return { forcedRarity: null, isHardPity: false };
};

/**
 * Calculate soft pity progress for a given rarity
 * Returns a value between 0 and 1 representing how far into soft pity range
 *
 * @param {number} pullsSince - Current pulls since last hit of this rarity
 * @param {string} rarity - 'legendary' or 'epic'
 * @returns {number} - 0 if not in soft pity, 0-1 if in soft pity range (capped before hard pity)
 */
const getSoftPityProgress = (pullsSince, rarity) => {
  const config = GACHA_PITY_CONFIG.standard[rarity];
  if (!config) return 0;

  const { softPity, hardPity } = config;
  if (pullsSince < softPity) return 0;
  // Cap at just below hard pity - hard pity is handled separately by checkHardPity
  if (pullsSince >= hardPity - 1) return 0.99;

  return (pullsSince - softPity) / (hardPity - softPity);
};

/**
 * Apply soft pity rate boost by interpolating between base and pity rates
 * The boost increases linearly from soft pity threshold to hard pity
 *
 * @param {Object} baseRates - Normal drop rates
 * @param {Object} pityRates - Guaranteed pity rates (rare+ only)
 * @param {number} softPityProgress - 0-1 value from getSoftPityProgress
 * @param {string} targetRarity - The rarity being boosted ('legendary' or 'epic')
 * @returns {Object} - Interpolated rates
 */
const applySoftPityBoost = (baseRates, pityRates, softPityProgress, targetRarity) => {
  if (softPityProgress <= 0) return baseRates;

  const boostedRates = { ...baseRates };

  // Calculate the boost factor (scales with soft pity progress)
  // At soft pity start: 0% boost, at hard pity: approaches pity rates
  const boostFactor = softPityProgress * 0.5; // Max 50% interpolation toward pity rates

  // Boost the target rarity
  if (baseRates[targetRarity] !== undefined && pityRates[targetRarity] !== undefined) {
    const baseRate = baseRates[targetRarity];
    const pityRate = pityRates[targetRarity];
    boostedRates[targetRarity] = baseRate + (pityRate - baseRate) * boostFactor;
  }

  // Reduce common/uncommon to compensate
  const rateIncrease = boostedRates[targetRarity] - baseRates[targetRarity];
  const commonRarities = ['common', 'uncommon'];
  let totalCommon = 0;

  for (const r of commonRarities) {
    if (boostedRates[r]) totalCommon += boostedRates[r];
  }

  if (totalCommon > 0) {
    for (const r of commonRarities) {
      if (boostedRates[r]) {
        const proportion = boostedRates[r] / totalCommon;
        boostedRates[r] = Math.max(0, boostedRates[r] - rateIncrease * proportion);
      }
    }
  }

  return boostedRates;
};

// ===========================================
// TYPES (documented for clarity)
// ===========================================

/**
 * @typedef {Object} RollContext
 * @property {Array} allCharacters - All available characters (R18-filtered)
 * @property {Array} raritiesData - Pre-loaded rarity data from DB
 * @property {Array<string>} orderedRarities - Rarity names ordered rarest-first
 * @property {Object} charactersByRarity - Characters grouped by rarity
 */

/**
 * @typedef {Object} BannerRollContext
 * @extends RollContext
 * @property {Array} bannerCharacters - Banner-specific characters (R18-filtered)
 * @property {Object} bannerCharactersByRarity - Banner characters grouped by rarity
 * @property {number} rateMultiplier - Banner's rate multiplier
 */

/**
 * @typedef {Object} RollResult
 * @property {Object} character - The rolled character
 * @property {string} actualRarity - The actual rarity (may differ from rolled if fallback)
 * @property {boolean} isPremium - Whether this was a premium roll
 * @property {boolean} wasPity - Whether pity was triggered
 */

/**
 * @typedef {Object} MultiRollState
 * @property {boolean} hasRarePlus - Whether a rare+ has been rolled
 * @property {number} currentIndex - Current roll index
 * @property {number} premiumCount - Number of premium rolls to use
 */

// ===========================================
// ROLL CONTEXT BUILDERS
// ===========================================

/**
 * Build standard roll context
 * Uses ONLY characters explicitly assigned to the Standard Banner
 *
 * @param {Array} _allCharacters - Deprecated: no longer used, kept for backward compatibility
 * @param {boolean} allowR18 - Whether R18 content is allowed
 * @returns {Promise<RollContext>}
 */
const buildStandardRollContext = async (_allCharacters, allowR18) => {
  const raritiesData = await getRarities();
  const orderedRarities = raritiesData.map(r => r.name);

  // Get only characters from the Standard Banner (explicit assignment)
  const standardBannerCharacters = await getStandardBannerCharacters();
  const filteredCharacters = filterR18Characters(standardBannerCharacters, allowR18);
  const charactersByRarity = groupCharactersByRarity(filteredCharacters, orderedRarities);

  return {
    allCharacters: filteredCharacters,
    raritiesData,
    orderedRarities,
    charactersByRarity
  };
};

/**
 * Build banner roll context
 * Uses banner characters as primary pool, Standard Banner as fallback
 *
 * @param {Array} _allCharacters - Deprecated: no longer used, kept for backward compatibility
 * @param {Array} bannerCharacters - Characters associated with the banner
 * @param {number} rateMultiplier - Banner's rate multiplier
 * @param {boolean} allowR18 - Whether R18 content is allowed
 * @param {number} luckBonus - Luck bonus from specializations (optional)
 * @returns {Promise<BannerRollContext>}
 */
const buildBannerRollContext = async (_allCharacters, bannerCharacters, rateMultiplier, allowR18, luckBonus = 0) => {
  // Standard context now uses only Standard Banner characters as fallback
  const standardContext = await buildStandardRollContext(null, allowR18);

  const filteredBannerCharacters = filterR18Characters(bannerCharacters, allowR18);
  const bannerCharactersByRarity = groupCharactersByRarity(
    filteredBannerCharacters,
    standardContext.orderedRarities
  );

  return {
    ...standardContext,
    bannerCharacters: filteredBannerCharacters,
    bannerCharactersByRarity,
    rateMultiplier,
    luckBonus
  };
};

// ===========================================
// RATE SELECTION
// ===========================================

/**
 * Select appropriate rates for a roll
 * Handles priority: premium > pity > soft pity > banner/standard
 *
 * @param {Object} options
 * @param {boolean} options.isPremium - Whether this is a premium roll
 * @param {boolean} options.needsPity - Whether pity is triggered (hard pity)
 * @param {boolean} options.isMulti - Whether this is part of a multi-pull
 * @param {boolean} options.isBanner - Whether this is a banner roll
 * @param {number} options.rateMultiplier - Banner rate multiplier (if banner)
 * @param {Array} options.raritiesData - Pre-loaded rarities
 * @param {number} options.luckBonus - Luck bonus from specializations (0-1)
 * @param {Object} options.softPityState - Current soft pity state { legendary: 0-1, epic: 0-1 }
 * @returns {Promise<Object>} - Rates object
 */
const selectRates = async ({
  isPremium = false,
  needsPity = false,
  isMulti = false,
  isBanner = false,
  rateMultiplier = 1,
  raritiesData,
  luckBonus = 0,
  softPityState = null
}) => {
  let rates;

  if (isPremium) {
    rates = await getPremiumRates(isMulti, raritiesData);
  } else if (needsPity) {
    rates = await getPityRates(raritiesData);
  } else if (isBanner) {
    rates = await calculateBannerRates(rateMultiplier, isMulti, raritiesData);
  } else {
    rates = await getStandardRates(isMulti, raritiesData);
  }

  // Apply soft pity boost if in soft pity range (not for premium or hard pity)
  if (!isPremium && !needsPity && softPityState) {
    const pityRates = await getPityRates(raritiesData);

    // Apply legendary soft pity first (higher priority)
    if (softPityState.legendary > 0) {
      rates = applySoftPityBoost(rates, pityRates, softPityState.legendary, 'legendary');
    }
    // Apply epic soft pity
    if (softPityState.epic > 0) {
      rates = applySoftPityBoost(rates, pityRates, softPityState.epic, 'epic');
    }
  }

  // Apply luck bonus from specializations (wisdom path)
  if (luckBonus > 0) {
    rates = applyLuckBonus(rates, luckBonus);
  }

  return rates;
};

// ===========================================
// SINGLE ROLL EXECUTION
// ===========================================

/**
 * Execute a single standard roll
 * 
 * @param {RollContext} context - Roll context with all prepared data
 * @param {boolean} isMulti - Whether this is part of a multi-pull (affects rates)
 * @returns {Promise<RollResult>}
 */
const executeSingleStandardRoll = async (context, isMulti = false) => {
  const { allCharacters, raritiesData, orderedRarities, charactersByRarity } = context;
  
  const rates = await getStandardRates(isMulti, raritiesData);
  const selectedRarity = rollRarity(rates, orderedRarities);
  
  const { character, actualRarity } = selectCharacterWithFallback(
    null, // No primary pool for standard rolls
    charactersByRarity,
    selectedRarity,
    allCharacters,
    raritiesData
  );
  
  return {
    character,
    actualRarity,
    isPremium: false,
    wasPity: false
  };
};

/**
 * Execute a single banner roll
 *
 * @param {BannerRollContext} context - Banner roll context
 * @param {Object} options
 * @param {boolean} options.isPremium - Premium roll flag
 * @param {boolean} options.needsPity - Pity trigger flag (for 10-pull rare+ guarantee)
 * @param {boolean} options.isMulti - Multi-pull flag
 * @param {boolean} options.isLast3 - Whether this is one of the last 3 rolls (higher banner pool chance)
 * @param {Object} options.softPityState - Current soft pity state { legendary: 0-1, epic: 0-1 }
 * @param {Object} options.pityCounters - Raw pity counters for hard pity check { pullsSinceLegendary, pullsSinceEpic }
 * @returns {Promise<RollResult>}
 */
const executeSingleBannerRoll = async (context, { isPremium = false, needsPity = false, isMulti = false, isLast3 = false, softPityState = null, pityCounters = null } = {}) => {
  const {
    allCharacters,
    raritiesData,
    orderedRarities,
    charactersByRarity,
    bannerCharactersByRarity,
    rateMultiplier,
    luckBonus = 0
  } = context;

  let selectedRarity;
  let wasHardPity = false;

  // Check for hard pity FIRST - this takes absolute priority
  if (pityCounters) {
    const { forcedRarity, isHardPity } = checkHardPity(
      pityCounters.pullsSinceLegendary || 0,
      pityCounters.pullsSinceEpic || 0
    );
    if (isHardPity && forcedRarity) {
      selectedRarity = forcedRarity;
      wasHardPity = true;
    }
  }

  // If not hard pity, do normal roll
  if (!selectedRarity) {
    // Select rates based on roll type (with luck bonus and soft pity from specializations)
    const rates = await selectRates({
      isPremium,
      needsPity,
      isMulti,
      isBanner: true,
      rateMultiplier,
      raritiesData,
      luckBonus,
      softPityState
    });

    // Roll for rarity
    selectedRarity = rollRarity(rates, orderedRarities);
  }

  // Determine pool: banner vs standard
  // This is separate from rates - affects which CHARACTER you get, not the rarity odds
  const pullFromBannerPool = Math.random() < getBannerPullChance(isLast3);

  // Select character with appropriate pool priority
  const primaryPool = pullFromBannerPool ? bannerCharactersByRarity : null;
  const { character, actualRarity } = selectCharacterWithFallback(
    primaryPool,
    charactersByRarity,
    selectedRarity,
    allCharacters,
    raritiesData
  );

  return {
    character,
    actualRarity,
    isPremium,
    wasPity: needsPity || wasHardPity,
    wasHardPity
  };
};

// ===========================================
// MULTI-ROLL EXECUTION
// ===========================================

/**
 * Execute a standard multi-roll
 * 
 * @param {RollContext} context - Roll context
 * @param {number} count - Number of rolls
 * @returns {Promise<Array<RollResult>>}
 */
const executeStandardMultiRoll = async (context, count) => {
  const { raritiesData, orderedRarities, charactersByRarity, allCharacters } = context;
  
  const rates = await getStandardRates(true, raritiesData);
  const pityRates = await getPityRates(raritiesData);
  
  const guaranteedRare = count >= PRICING_CONFIG.pityThreshold;
  
  const results = [];
  let hasRarePlus = false;
  
  for (let i = 0; i < count; i++) {
    const isLastRoll = i === count - 1;
    const needsPity = guaranteedRare && isLastRoll && !hasRarePlus;
    
    const currentRates = needsPity ? pityRates : rates;
    const selectedRarity = rollRarity(currentRates, orderedRarities);
    
    if (isRarePlus(selectedRarity, raritiesData)) {
      hasRarePlus = true;
    }
    
    const { character, actualRarity } = selectCharacterWithFallback(
      null,
      charactersByRarity,
      selectedRarity,
      allCharacters,
      raritiesData
    );
    
    if (character) {
      results.push({
        character,
        actualRarity,
        isPremium: false,
        wasPity: needsPity
      });
    }
  }
  
  return results;
};

/**
 * Execute a banner multi-roll
 *
 * @param {BannerRollContext} context - Banner roll context
 * @param {number} count - Number of rolls
 * @param {number} premiumCount - Number of premium rolls (used first)
 * @param {Object} initialPityState - Initial pity counters { pullsSinceLegendary, pullsSinceEpic }
 * @returns {Promise<Array<RollResult & { isBannerCharacter: boolean }>>}
 */
const executeBannerMultiRoll = async (context, count, premiumCount = 0, initialPityState = null) => {
  const {
    raritiesData,
    orderedRarities,
    charactersByRarity,
    allCharacters,
    bannerCharacters,
    bannerCharactersByRarity,
    rateMultiplier,
    luckBonus = 0
  } = context;

  // Pre-fetch all rate tables and apply luck bonus
  let bannerRates = await calculateBannerRates(rateMultiplier, true, raritiesData);
  let premiumRates = await getPremiumRates(true, raritiesData);
  const pityRates = await getPityRates(raritiesData);

  // Apply luck bonus from specializations
  if (luckBonus > 0) {
    bannerRates = applyLuckBonus(bannerRates, luckBonus);
    premiumRates = applyLuckBonus(premiumRates, luckBonus);
  }

  const guaranteedRare = count >= PRICING_CONFIG.pityThreshold;

  const results = [];
  let hasRarePlus = false;

  // Track pity state during multi-roll for hard pity and soft pity calculations
  let currentPullsSinceLegendary = initialPityState?.pullsSinceLegendary || 0;
  let currentPullsSinceEpic = initialPityState?.pullsSinceEpic || 0;

  // Track if we've already given a hard pity legendary/epic in this multi-roll
  // Only the FIRST hard pity trigger should be marked as guaranteed
  let hardPityLegendaryGiven = false;
  let hardPityEpicGiven = false;

  for (let i = 0; i < count; i++) {
    const isLastRoll = i === count - 1;
    const isPremiumRoll = i < premiumCount;
    const needsRarePlusPity = guaranteedRare && isLastRoll && !hasRarePlus;
    const isLast3 = i >= count - 3;

    // Check for hard pity FIRST - this takes absolute priority
    const { forcedRarity, isHardPity } = checkHardPity(currentPullsSinceLegendary, currentPullsSinceEpic);

    let selectedRarity;
    let wasHardPity = false;

    if (isHardPity && forcedRarity) {
      // Hard pity forces this rarity - no RNG involved
      selectedRarity = forcedRarity;
      wasHardPity = true;

      // Only mark as "guaranteed" pity if this is the first hard pity of this type
      if (forcedRarity === 'legendary' && !hardPityLegendaryGiven) {
        hardPityLegendaryGiven = true;
      } else if (forcedRarity === 'epic' && !hardPityEpicGiven) {
        hardPityEpicGiven = true;
      } else {
        // Subsequent hard pity triggers in same multi-roll are not marked as "wasPity"
        wasHardPity = false;
      }
    } else {
      // Normal roll with soft pity boost
      // Calculate soft pity state for this roll
      const softPityState = {
        legendary: getSoftPityProgress(currentPullsSinceLegendary, 'legendary'),
        epic: getSoftPityProgress(currentPullsSinceEpic, 'epic')
      };

      // Select rates: premium > rare+ pity (10-pull guarantee) > soft pity > banner
      let currentRates;
      if (isPremiumRoll) {
        currentRates = premiumRates;
      } else if (needsRarePlusPity) {
        currentRates = pityRates;
      } else {
        // Apply soft pity boost to banner rates
        currentRates = bannerRates;
        if (softPityState.legendary > 0) {
          currentRates = applySoftPityBoost(currentRates, pityRates, softPityState.legendary, 'legendary');
        }
        if (softPityState.epic > 0) {
          currentRates = applySoftPityBoost(currentRates, pityRates, softPityState.epic, 'epic');
        }
      }

      selectedRarity = rollRarity(currentRates, orderedRarities);
    }

    if (isRarePlus(selectedRarity, raritiesData)) {
      hasRarePlus = true;
    }

    // Update pity counters for tracking within this multi-roll
    if (selectedRarity === 'legendary') {
      currentPullsSinceLegendary = 0;
      currentPullsSinceEpic = 0;
    } else if (selectedRarity === 'epic') {
      currentPullsSinceLegendary++;
      currentPullsSinceEpic = 0;
    } else {
      currentPullsSinceLegendary++;
      currentPullsSinceEpic++;
    }

    // Pool selection
    const pullFromBannerPool = Math.random() < getBannerPullChance(isLast3);
    const primaryPool = pullFromBannerPool ? bannerCharactersByRarity : null;

    const { character, actualRarity } = selectCharacterWithFallback(
      primaryPool,
      charactersByRarity,
      selectedRarity,
      allCharacters,
      raritiesData
    );

    if (character) {
      results.push({
        character,
        actualRarity,
        isPremium: isPremiumRoll,
        wasPity: needsRarePlusPity || wasHardPity,
        wasHardPity: wasHardPity,
        isBannerCharacter: bannerCharacters.some(c => c.id === character.id)
      });
    }
  }

  return results;
};

module.exports = {
  // Context builders
  buildStandardRollContext,
  buildBannerRollContext,

  // Rate selection
  selectRates,

  // Pity utilities
  checkHardPity,
  getSoftPityProgress,
  applySoftPityBoost,

  // Single roll
  executeSingleStandardRoll,
  executeSingleBannerRoll,

  // Multi roll
  executeStandardMultiRoll,
  executeBannerMultiRoll
};

