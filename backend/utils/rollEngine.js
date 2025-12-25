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
  PRICING_CONFIG
} = require('../config/pricing');

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
 * @returns {Promise<BannerRollContext>}
 */
const buildBannerRollContext = async (_allCharacters, bannerCharacters, rateMultiplier, allowR18) => {
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
    rateMultiplier
  };
};

// ===========================================
// RATE SELECTION
// ===========================================

/**
 * Select appropriate rates for a roll
 * Handles priority: premium > pity > banner/standard
 * 
 * @param {Object} options
 * @param {boolean} options.isPremium - Whether this is a premium roll
 * @param {boolean} options.needsPity - Whether pity is triggered
 * @param {boolean} options.isMulti - Whether this is part of a multi-pull
 * @param {boolean} options.isBanner - Whether this is a banner roll
 * @param {number} options.rateMultiplier - Banner rate multiplier (if banner)
 * @param {Array} options.raritiesData - Pre-loaded rarities
 * @returns {Promise<Object>} - Rates object
 */
const selectRates = async ({
  isPremium = false,
  needsPity = false,
  isMulti = false,
  isBanner = false,
  rateMultiplier = 1,
  raritiesData
}) => {
  if (isPremium) {
    return getPremiumRates(isMulti, raritiesData);
  }
  
  if (needsPity) {
    return getPityRates(raritiesData);
  }
  
  if (isBanner) {
    return calculateBannerRates(rateMultiplier, isMulti, raritiesData);
  }
  
  return getStandardRates(isMulti, raritiesData);
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
 * @param {boolean} options.needsPity - Pity trigger flag
 * @param {boolean} options.isMulti - Multi-pull flag
 * @param {boolean} options.isLast3 - Whether this is one of the last 3 rolls (higher banner pool chance)
 * @returns {Promise<RollResult>}
 */
const executeSingleBannerRoll = async (context, { isPremium = false, needsPity = false, isMulti = false, isLast3 = false } = {}) => {
  const { 
    allCharacters, 
    raritiesData, 
    orderedRarities, 
    charactersByRarity,
    bannerCharactersByRarity,
    rateMultiplier 
  } = context;
  
  // Select rates based on roll type
  const rates = await selectRates({
    isPremium,
    needsPity,
    isMulti,
    isBanner: true,
    rateMultiplier,
    raritiesData
  });
  
  // Roll for rarity
  const selectedRarity = rollRarity(rates, orderedRarities);
  
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
    wasPity: needsPity
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
 * @returns {Promise<Array<RollResult & { isBannerCharacter: boolean }>>}
 */
const executeBannerMultiRoll = async (context, count, premiumCount = 0) => {
  const { 
    raritiesData, 
    orderedRarities, 
    charactersByRarity, 
    allCharacters,
    bannerCharacters,
    bannerCharactersByRarity,
    rateMultiplier 
  } = context;
  
  // Pre-fetch all rate tables
  const bannerRates = await calculateBannerRates(rateMultiplier, true, raritiesData);
  const premiumRates = await getPremiumRates(true, raritiesData);
  const pityRates = await getPityRates(raritiesData);
  
  const guaranteedRare = count >= PRICING_CONFIG.pityThreshold;
  
  const results = [];
  let hasRarePlus = false;
  
  for (let i = 0; i < count; i++) {
    const isLastRoll = i === count - 1;
    const isPremiumRoll = i < premiumCount;
    const needsPity = guaranteedRare && isLastRoll && !hasRarePlus;
    const isLast3 = i >= count - 3;
    
    // Select rates: premium > pity > banner
    let currentRates;
    if (isPremiumRoll) {
      currentRates = premiumRates;
    } else if (needsPity) {
      currentRates = pityRates;
    } else {
      currentRates = bannerRates;
    }
    
    const selectedRarity = rollRarity(currentRates, orderedRarities);
    
    if (isRarePlus(selectedRarity, raritiesData)) {
      hasRarePlus = true;
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
        wasPity: needsPity,
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
  
  // Single roll
  executeSingleStandardRoll,
  executeSingleBannerRoll,
  
  // Multi roll
  executeStandardMultiRoll,
  executeBannerMultiRoll
};

