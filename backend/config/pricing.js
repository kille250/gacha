// ===========================================
// PRICING CONFIGURATION (Single source of truth)
// ===========================================

const PRICING_CONFIG = {
  baseCost: 100,                    // Base cost per single pull
  maxPulls: 20,                     // Maximum pulls per multi-roll
  discountTiers: [
    { minCount: 20, discount: 0.15, label: '20×' },  // 15% for 20+ pulls
    { minCount: 10, discount: 0.10, label: '10×' },  // 10% for 10-19 pulls
    { minCount: 5, discount: 0.05, label: '5×' },    // 5% for 5-9 pulls
  ],
  quickSelectOptions: [1, 5, 10, 20], // Quick select buttons to show
  
  // Banner configuration
  bannerPullChance: 0.70,           // 70% chance to pull from banner pool
  bannerPullChanceLast3: 0.85,      // 85% for last 3 pulls in multi
  maxMultiplier: 5.0                // Max effective multiplier
};

// ===========================================
// DYNAMIC RARITY SYSTEM (Database-backed with caching)
// ===========================================

// Cache for rarities loaded from database
let raritiesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute cache TTL

/**
 * Get rarities from database with caching
 * Lazy-loads on first call to avoid circular dependencies
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} - Array of rarity objects ordered by 'order' field
 */
const getRarities = async (forceRefresh = false) => {
  const now = Date.now();
  
  if (!forceRefresh && raritiesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return raritiesCache;
  }
  
  try {
    // Lazy load to avoid circular dependency issues at module load time
    const { Rarity } = require('../models');
    const rarities = await Rarity.findAll({ order: [['order', 'DESC']] });
    raritiesCache = rarities.map(r => r.get({ plain: true }));
    cacheTimestamp = now;
    return raritiesCache;
  } catch (err) {
    console.error('Error loading rarities from database:', err);
    // Return cached data if available, even if stale
    if (raritiesCache) return raritiesCache;
    // Ultimate fallback - use hardcoded defaults
    return getFallbackRarities();
  }
};

/**
 * Invalidate the rarities cache (call after updating rarities)
 */
const invalidateRaritiesCache = () => {
  raritiesCache = null;
  cacheTimestamp = 0;
};

/**
 * Get ordered list of rarity names (highest to lowest)
 * @returns {Promise<Array<string>>}
 */
const getOrderedRarities = async () => {
  const rarities = await getRarities();
  return rarities.map(r => r.name);
};

/**
 * Build drop rates object from rarity records
 * @param {Array} rarities - Rarity records from database
 * @param {string} type - 'standardSingle', 'standardMulti', 'bannerSingle', 'bannerMulti', 'premiumSingle', 'premiumMulti', 'pity'
 * @returns {Object} - Rates object { rarityName: percentage }
 */
const buildRatesFromRarities = (rarities, type) => {
  const rates = {};
  const fieldMap = {
    standardSingle: 'dropRateStandardSingle',
    standardMulti: 'dropRateStandardMulti',
    bannerSingle: 'dropRateBannerSingle',
    bannerMulti: 'dropRateBannerMulti',
    premiumSingle: 'dropRatePremiumSingle',
    premiumMulti: 'dropRatePremiumMulti',
    pity: 'dropRatePity'
  };
  
  const field = fieldMap[type];
  if (!field) throw new Error(`Unknown rate type: ${type}`);
  
  rarities.forEach(r => {
    rates[r.name] = r[field] || 0;
  });
  
  return rates;
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

// Helper to get discount for a given count
const getDiscountForCount = (count) => {
  for (const tier of PRICING_CONFIG.discountTiers) {
    if (count >= tier.minCount) return tier.discount;
  }
  return 0;
};

/**
 * Calculate banner-specific rates with multiplier applied
 * @param {number} rateMultiplier - Banner rate multiplier
 * @param {boolean} isMulti - Whether this is a multi-pull
 * @param {Array} raritiesData - Optional pre-loaded rarities (avoids async if provided)
 * @returns {Object|Promise<Object>} - Rates object
 */
const calculateBannerRates = async (rateMultiplier, isMulti = false, raritiesData = null) => {
  const rarities = raritiesData || await getRarities();
  const type = isMulti ? 'bannerMulti' : 'bannerSingle';
  const capField = isMulti ? 'capMulti' : 'capSingle';
  const baseRates = buildRatesFromRarities(rarities, type);
  
  const effectiveMultiplier = Math.min(rateMultiplier || 1, PRICING_CONFIG.maxMultiplier);
  const rateAdjustment = (effectiveMultiplier - 1) * 0.1;
  
  // First pass: calculate total minimumRate to see if it consumes all probability
  let totalMinimumRate = 0;
  let commonRarity = null;
  
  rarities.forEach(r => {
    if (!commonRarity || r.order < commonRarity.order) {
      commonRarity = r;
    }
    totalMinimumRate += (r.minimumRate || 0);
  });
  
  // Debug: log minimumRate values
  console.log('[calculateBannerRates] minimumRates:', rarities.map(r => `${r.name}:${r.minimumRate || 0}`).join(', '), `total:${totalMinimumRate}`);
  
  const rates = {};
  
  // If minimumRates consume 100% or more, ONLY use minimumRates (ignore calculated rates)
  if (totalMinimumRate >= 100) {
    rarities.forEach(r => {
      rates[r.name] = r.minimumRate || 0;
    });
    console.log('[calculateBannerRates] Using ONLY minimumRates:', rates);
    return rates;
  }
  
  // Otherwise, calculate rates normally with minimumRate as floors
  // Available space after reserving minimumRates
  const availableSpace = 100 - totalMinimumRate;
  
  let totalCalculated = 0;
  const calculatedRates = {};
  
  // Calculate base rates for non-common rarities
  rarities.forEach(r => {
    if (r.multiplierScaling > 0) {
      const cap = r[capField];
      const baseRate = baseRates[r.name];
      const adjusted = baseRate * (1 + rateAdjustment * r.multiplierScaling);
      let finalRate = cap ? Math.max(baseRate, Math.min(adjusted, cap)) : adjusted;
      // Subtract this rarity's minimumRate since that's already reserved
      const calculatedPortion = Math.max(0, finalRate - (r.minimumRate || 0));
      calculatedRates[r.name] = calculatedPortion;
      totalCalculated += calculatedPortion;
    }
  });
  
  // Add common's base rate to calculated portion
  const commonBaseRate = baseRates[commonRarity.name] || 0;
  const commonCalculatedPortion = Math.max(0, commonBaseRate - (commonRarity.minimumRate || 0));
  calculatedRates[commonRarity.name] = commonCalculatedPortion;
  totalCalculated += commonCalculatedPortion;
  
  // Distribute available space proportionally based on calculated rates
  rarities.forEach(r => {
    const minRate = r.minimumRate || 0;
    let additionalRate = 0;
    
    if (totalCalculated > 0 && calculatedRates[r.name] > 0) {
      // Proportional share of available space
      additionalRate = (calculatedRates[r.name] / totalCalculated) * availableSpace;
    } else if (totalCalculated === 0 && r.name === commonRarity.name) {
      // If no calculated rates, give all available space to common
      additionalRate = availableSpace;
    }
    
    rates[r.name] = minRate + additionalRate;
  });
  
  return rates;
};

/**
 * Get standard rates for single or multi (async version)
 * @param {boolean} isMulti
 * @param {Array} raritiesData - Optional pre-loaded rarities
 * @returns {Promise<Object>}
 */
const getStandardRates = async (isMulti = false, raritiesData = null) => {
  const rarities = raritiesData || await getRarities();
  const type = isMulti ? 'standardMulti' : 'standardSingle';
  return buildRatesFromRarities(rarities, type);
};

/**
 * Get premium rates for single or multi
 * @param {boolean} isMulti
 * @param {Array} raritiesData - Optional pre-loaded rarities
 * @returns {Promise<Object>}
 */
const getPremiumRates = async (isMulti = false, raritiesData = null) => {
  const rarities = raritiesData || await getRarities();
  const type = isMulti ? 'premiumMulti' : 'premiumSingle';
  return buildRatesFromRarities(rarities, type);
};

/**
 * Get pity rates
 * @param {Array} raritiesData - Optional pre-loaded rarities
 * @returns {Promise<Object>}
 */
const getPityRates = async (raritiesData = null) => {
  const rarities = raritiesData || await getRarities();
  return buildRatesFromRarities(rarities, 'pity');
};

/**
 * Get banner pull chance
 * @param {boolean} isLast3
 * @returns {number}
 */
const getBannerPullChance = (isLast3 = false) => {
  return isLast3 ? PRICING_CONFIG.bannerPullChanceLast3 : PRICING_CONFIG.bannerPullChance;
};

/**
 * Round rates for display (to 2 decimal places)
 * @param {Object} rates
 * @returns {Object}
 */
const roundRatesForDisplay = (rates) => {
  const rounded = {};
  Object.keys(rates).forEach(key => {
    rounded[key] = Math.round(rates[key] * 100) / 100;
  });
  return rounded;
};

/**
 * Roll a rarity based on rates
 * Uses ordering from database (highest order = rarest, checked first)
 * Normalizes rates to handle cases where they don't sum to 100%
 * @param {Object} rates - Object with rarity keys and percentage values
 * @param {Array} orderedRarities - Array of rarity names in order (rarest first)
 * @returns {string} - The rolled rarity
 */
const rollRarity = (rates, orderedRarities = null) => {
  // If ordered rarities provided, use them; otherwise use rates keys
  const order = orderedRarities || Object.keys(rates).sort((a, b) => {
    // Sort by rate ascending (rarest first for cumulative check)
    return (rates[a] || 0) - (rates[b] || 0);
  });
  
  // Calculate total to normalize rates (handles cases where sum != 100)
  let total = 0;
  for (const rarity of order) {
    if (rates[rarity] !== undefined && rates[rarity] > 0) {
      total += rates[rarity];
    }
  }
  
  // If no valid rates, return fallback
  if (total <= 0) {
    return order[order.length - 1] || 'common';
  }
  
  // Roll against the actual total (normalizes the probability distribution)
  const roll = Math.random() * total;
  let cumulative = 0;
  
  for (const rarity of order) {
    if (rates[rarity] !== undefined && rates[rarity] > 0) {
      cumulative += rates[rarity];
      if (roll < cumulative) return rarity;
    }
  }
  
  // Fallback to last rarity in order (should be common)
  return order[order.length - 1] || 'common';
};

/**
 * Check if a rarity is "pity eligible" (rare or better)
 * @param {string} rarityName
 * @param {Array} raritiesData - Optional pre-loaded rarities
 * @returns {Promise<boolean>}
 */
const isRarePlus = async (rarityName, raritiesData = null) => {
  const rarities = raritiesData || await getRarities();
  const rarity = rarities.find(r => r.name === rarityName);
  return rarity?.isPityEligible || false;
};

/**
 * Synchronous check for pity eligibility when rarities are pre-loaded
 * @param {string} rarityName
 * @param {Array} rarities - Pre-loaded rarities array
 * @returns {boolean}
 */
const isRarePlusSync = (rarityName, rarities) => {
  const rarity = rarities.find(r => r.name === rarityName);
  return rarity?.isPityEligible || false;
};

// ===========================================
// FALLBACK RARITIES (used when DB is unavailable)
// ===========================================

const getFallbackRarities = () => [
  { name: 'legendary', order: 5, dropRateStandardSingle: 0.5, dropRateStandardMulti: 0.5, dropRateBannerSingle: 1, dropRateBannerMulti: 1, dropRatePremiumSingle: 5, dropRatePremiumMulti: 7, dropRatePity: 1, capSingle: 3, capMulti: 3, multiplierScaling: 2, minimumRate: 0, isPityEligible: true },
  { name: 'epic', order: 4, dropRateStandardSingle: 2.5, dropRateStandardMulti: 3.5, dropRateBannerSingle: 5, dropRateBannerMulti: 6, dropRatePremiumSingle: 25, dropRatePremiumMulti: 28, dropRatePity: 14, capSingle: 10, capMulti: 12, multiplierScaling: 1.5, minimumRate: 0, isPityEligible: true },
  { name: 'rare', order: 3, dropRateStandardSingle: 7, dropRateStandardMulti: 9, dropRateBannerSingle: 12, dropRateBannerMulti: 14, dropRatePremiumSingle: 70, dropRatePremiumMulti: 65, dropRatePity: 85, capSingle: 18, capMulti: 20, multiplierScaling: 1, minimumRate: 0, isPityEligible: true },
  { name: 'uncommon', order: 2, dropRateStandardSingle: 20, dropRateStandardMulti: 22, dropRateBannerSingle: 22, dropRateBannerMulti: 24, dropRatePremiumSingle: 0, dropRatePremiumMulti: 0, dropRatePity: 0, capSingle: 25, capMulti: 28, multiplierScaling: 0.5, minimumRate: 0, isPityEligible: false },
  { name: 'common', order: 1, dropRateStandardSingle: 70, dropRateStandardMulti: 65, dropRateBannerSingle: 60, dropRateBannerMulti: 55, dropRatePremiumSingle: 0, dropRatePremiumMulti: 0, dropRatePity: 0, capSingle: null, capMulti: null, multiplierScaling: 0, minimumRate: 35, isPityEligible: false }
];

module.exports = {
  PRICING_CONFIG,
  getDiscountForCount,
  calculateBannerRates,
  getStandardRates,
  getPremiumRates,
  getPityRates,
  getBannerPullChance,
  roundRatesForDisplay,
  rollRarity,
  getRarities,
  getOrderedRarities,
  invalidateRaritiesCache,
  isRarePlus,
  isRarePlusSync
};
