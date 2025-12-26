// ===========================================
// PRICING CONFIGURATION (Single source of truth)
// ===========================================

// Named constants - eliminates magic numbers
const RATE_CONSTANTS = {
  TOTAL_PERCENTAGE: 100,
  RATE_ADJUSTMENT_FACTOR: 0.1,  // How much each multiplier point affects rates
  FLOATING_POINT_EPSILON: 1e-10 // For floating-point comparison safety
};

const PRICING_CONFIG = {
  baseCost: 100,                    // Base cost per single pull
  maxPulls: 20,                     // Maximum pulls per multi-roll
  pityThreshold: 10,                // Minimum pulls for pity guarantee
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
 * @returns {Promise<Array>} - Array of rarity objects ordered by 'order' field (DESC)
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
 * Get ordered list of rarity names (highest to lowest by DB order)
 * @returns {Promise<Array<string>>}
 */
const getOrderedRarities = async () => {
  const rarities = await getRarities();
  return rarities.map(r => r.name);
};

// ===========================================
// PURE FUNCTIONS: Rate Building & Normalization
// ===========================================

/**
 * Build drop rates object from rarity records
 * @param {Array} rarities - Rarity records from database
 * @param {string} type - 'standardSingle', 'standardMulti', 'bannerSingle', 'bannerMulti', 'premiumSingle', 'premiumMulti', 'pity'
 * @returns {Object} - Rates object { rarityName: percentage }
 */
const buildRatesFromRarities = (rarities, type) => {
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
  
  const rates = {};
  for (const r of rarities) {
    rates[r.name] = r[field] || 0;
  }
  
  return rates;
};

/**
 * Normalize rates to sum to exactly 100%
 * Pure function - no side effects
 * 
 * @param {Object} rates - Object with rarity keys and percentage values
 * @returns {Object} - Normalized rates that sum to 100
 */
const normalizeRates = (rates) => {
  const total = Object.values(rates).reduce((sum, rate) => sum + (rate || 0), 0);
  
  if (total <= 0) {
    // Return empty rates if no valid rates
    return { ...rates };
  }
  
  if (Math.abs(total - RATE_CONSTANTS.TOTAL_PERCENTAGE) < RATE_CONSTANTS.FLOATING_POINT_EPSILON) {
    // Already normalized
    return { ...rates };
  }
  
  const normalized = {};
  const scaleFactor = RATE_CONSTANTS.TOTAL_PERCENTAGE / total;
  
  for (const [key, value] of Object.entries(rates)) {
    normalized[key] = (value || 0) * scaleFactor;
  }
  
  return normalized;
};

/**
 * Validate that rates sum to approximately 100%
 * @param {Object} rates - Rates object
 * @param {string} context - Context for error message
 * @returns {boolean} - True if valid
 */
const validateRatesSum = (rates, context = 'unknown') => {
  const total = Object.values(rates).reduce((sum, rate) => sum + (rate || 0), 0);
  const isValid = Math.abs(total - RATE_CONSTANTS.TOTAL_PERCENTAGE) < 0.01;
  
  if (!isValid && process.env.NODE_ENV !== 'production') {
    console.warn(`[validateRatesSum] Rates for ${context} sum to ${total.toFixed(2)}%, not 100%`);
  }
  
  return isValid;
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get discount for a given count
 * @param {number} count - Number of pulls
 * @returns {number} - Discount rate (0-1)
 */
const getDiscountForCount = (count) => {
  for (const tier of PRICING_CONFIG.discountTiers) {
    if (count >= tier.minCount) return tier.discount;
  }
  return 0;
};

/**
 * Calculate banner-specific rates with multiplier applied
 * 
 * Rate calculation flow:
 * 1. Start with base banner rates from DB
 * 2. Apply multiplier scaling per rarity (respecting caps)
 * 3. Enforce minimum rates (floor values)
 * 4. Normalize to 100% using common rarity as buffer
 * 
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
  
  // Clamp multiplier to configured maximum
  const effectiveMultiplier = Math.min(rateMultiplier || 1, PRICING_CONFIG.maxMultiplier);
  
  // Calculate rate adjustment based on multiplier
  // Formula: each point of multiplier adds RATE_ADJUSTMENT_FACTOR * scaling to the rate
  const rateAdjustment = (effectiveMultiplier - 1) * RATE_CONSTANTS.RATE_ADJUSTMENT_FACTOR;
  
  // Identify common rarity (lowest order) - this absorbs remaining probability
  let commonRarity = null;
  for (const r of rarities) {
    if (!commonRarity || r.order < commonRarity.order) {
      commonRarity = r;
    }
  }
  
  // Phase 1: Calculate adjusted rates for each rarity
  const adjustedRates = {};
  let nonCommonTotal = 0;
  
  for (const r of rarities) {
    const baseRate = baseRates[r.name] || 0;
    const minimumRate = r.minimumRate || 0;
    
    if (r.name === commonRarity.name) {
      // Common rarity handled separately as buffer
      continue;
    }
    
    // Apply multiplier scaling with cap
    let adjustedRate;
    if (r.multiplierScaling > 0) {
      const scaledRate = baseRate * (1 + rateAdjustment * r.multiplierScaling);
      const cap = r[capField];
      
      // Apply cap if defined, but never go below base rate
      adjustedRate = cap ? Math.max(baseRate, Math.min(scaledRate, cap)) : scaledRate;
    } else {
      adjustedRate = baseRate;
    }
    
    // Enforce minimum rate floor
    adjustedRates[r.name] = Math.max(adjustedRate, minimumRate);
    nonCommonTotal += adjustedRates[r.name];
  }
  
  // Phase 2: Calculate common rate as remaining probability
  const commonMinimum = commonRarity.minimumRate || 0;
  const remainingForCommon = RATE_CONSTANTS.TOTAL_PERCENTAGE - nonCommonTotal;
  
  // Common gets whatever is left, but at least its minimum
  adjustedRates[commonRarity.name] = Math.max(remainingForCommon, commonMinimum);
  
  // Phase 3: If total exceeds 100%, normalize proportionally
  const currentTotal = Object.values(adjustedRates).reduce((sum, rate) => sum + rate, 0);
  
  if (currentTotal > RATE_CONSTANTS.TOTAL_PERCENTAGE) {
    // Calculate how much we need to reduce
    const excess = currentTotal - RATE_CONSTANTS.TOTAL_PERCENTAGE;
    
    // Collect rates that can be reduced (above their minimum)
    const reducibleRarities = [];
    let totalReducible = 0;
    
    for (const r of rarities) {
      const minimum = r.minimumRate || 0;
      const current = adjustedRates[r.name];
      const reducibleAmount = current - minimum;
      
      if (reducibleAmount > 0) {
        reducibleRarities.push({ name: r.name, reducible: reducibleAmount });
        totalReducible += reducibleAmount;
      }
    }
    
    // Proportionally reduce rates
    if (totalReducible > 0) {
      for (const { name, reducible } of reducibleRarities) {
        const reduction = (reducible / totalReducible) * excess;
        adjustedRates[name] -= reduction;
      }
    }
  }
  
  // Validate final rates in development
  validateRatesSum(adjustedRates, `banner-${type}-x${rateMultiplier}`);
  
  return adjustedRates;
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
  for (const [key, value] of Object.entries(rates)) {
    rounded[key] = Math.round(value * 100) / 100;
  }
  return rounded;
};

// ===========================================
// PURE FUNCTION: Weighted Random Selection
// ===========================================

/**
 * Roll a rarity based on weighted rates
 * 
 * Algorithm:
 * 1. Normalize rates to handle cases where they don't sum to 100%
 * 2. Generate random value in range [0, total)
 * 3. Walk through rarities in order, accumulating probability
 * 4. Return first rarity where cumulative >= random value
 * 
 * Order matters: orderedRarities should be rarest-first to ensure
 * proper fallback behavior (common is always last)
 * 
 * @param {Object} rates - Object with rarity keys and percentage values
 * @param {Array<string>} orderedRarities - Rarity names in order (rarest first, from DB order DESC)
 * @returns {string} - The rolled rarity name
 */
const rollRarity = (rates, orderedRarities = null) => {
  // Determine order: prefer provided order, otherwise sort by rate (ascending = rarest first)
  const order = orderedRarities || Object.keys(rates).sort((a, b) => {
    return (rates[a] || 0) - (rates[b] || 0);
  });
  
  // Calculate total for normalization
  let total = 0;
  for (const rarity of order) {
    const rate = rates[rarity];
    if (rate !== undefined && rate > 0) {
      total += rate;
    }
  }
  
  // Edge case: no valid rates
  if (total <= RATE_CONSTANTS.FLOATING_POINT_EPSILON) {
    // Return the last rarity in order (should be common/lowest)
    return order[order.length - 1] || 'common';
  }
  
  // Generate random value in [0, total)
  // Using total instead of 100 normalizes the distribution
  const roll = Math.random() * total;
  
  // Accumulate probabilities and find the selected rarity
  let cumulative = 0;
  for (const rarity of order) {
    const rate = rates[rarity];
    if (rate !== undefined && rate > 0) {
      cumulative += rate;
      // Use <= instead of < to handle floating-point edge case where roll === total
      if (roll < cumulative || cumulative >= total - RATE_CONSTANTS.FLOATING_POINT_EPSILON) {
        return rarity;
      }
    }
  }
  
  // Fallback: should not reach here, but return common as safety
  return order[order.length - 1] || 'common';
};

/**
 * Apply luck bonus to rates (increases rare+ chances)
 * Takes percentage from common/uncommon and adds to rare/epic/legendary
 *
 * @param {Object} rates - Original rates object
 * @param {number} luckBonus - Luck bonus as decimal (0.05 = 5%)
 * @returns {Object} - Modified rates with luck bonus applied
 */
const applyLuckBonus = (rates, luckBonus = 0) => {
  if (!luckBonus || luckBonus <= 0) {
    return rates;
  }

  const modifiedRates = { ...rates };

  // Calculate total of rare+ rates
  const rareRarities = ['rare', 'epic', 'legendary'];
  const commonRarities = ['common', 'uncommon'];

  // Take from common pool
  let availableToMove = 0;
  for (const rarity of commonRarities) {
    if (modifiedRates[rarity]) {
      const toMove = modifiedRates[rarity] * luckBonus;
      availableToMove += toMove;
      modifiedRates[rarity] -= toMove;
    }
  }

  // Distribute to rare+ proportionally based on original rates
  let totalRarePlus = 0;
  for (const rarity of rareRarities) {
    if (modifiedRates[rarity]) {
      totalRarePlus += modifiedRates[rarity];
    }
  }

  if (totalRarePlus > 0) {
    for (const rarity of rareRarities) {
      if (modifiedRates[rarity]) {
        const proportion = modifiedRates[rarity] / totalRarePlus;
        modifiedRates[rarity] += availableToMove * proportion;
      }
    }
  }

  return modifiedRates;
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
  RATE_CONSTANTS,
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
  isRarePlusSync,
  applyLuckBonus,
  // Export pure functions for testing
  normalizeRates,
  validateRatesSum,
  buildRatesFromRarities
};
