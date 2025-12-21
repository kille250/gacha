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
  quickSelectOptions: [1, 5, 10, 20] // Quick select buttons to show
};

// ===========================================
// DROP RATES CONFIGURATION (Single source of truth)
// ===========================================

const DROP_RATES = {
  // Standard pool rates (off-banner pulls)
  standard: {
    single: { common: 70, uncommon: 20, rare: 7, epic: 2.5, legendary: 0.5 },
    multi:  { common: 65, uncommon: 22, rare: 9, epic: 3.5, legendary: 0.5 }
  },
  
  // Base banner rates (before multiplier is applied)
  bannerBase: {
    single: { common: 60, uncommon: 22, rare: 12, epic: 5, legendary: 1 },
    multi:  { common: 55, uncommon: 24, rare: 14, epic: 6, legendary: 1 }
  },
  
  // Premium ticket rates (guaranteed rare+)
  premium: {
    single: { common: 0, uncommon: 0, rare: 70, epic: 25, legendary: 5 },
    multi:  { common: 0, uncommon: 0, rare: 65, epic: 28, legendary: 7 }
  },
  
  // Pity rates for 10+ pulls (rare+ guaranteed)
  pity: { rare: 85, epic: 14, legendary: 1 },
  
  // Rate caps when applying multiplier
  caps: {
    single: { legendary: 3, epic: 10, rare: 18, uncommon: 25, commonMin: 40 },
    multi:  { legendary: 3, epic: 12, rare: 20, uncommon: 28, commonMin: 35 }
  },
  
  // Multiplier scaling factors for each rarity
  multiplierScaling: { legendary: 2, epic: 1.5, rare: 1, uncommon: 0.5 },
  
  // Banner pull chance (vs standard pool)
  bannerPullChance: 0.70,           // 70% chance to pull from banner pool
  bannerPullChanceLast3: 0.85,      // 85% for last 3 pulls in multi
  
  // Max effective multiplier
  maxMultiplier: 5.0
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

// Calculate banner-specific rates with multiplier applied
const calculateBannerRates = (rateMultiplier, isMulti = false) => {
  const type = isMulti ? 'multi' : 'single';
  const base = DROP_RATES.bannerBase[type];
  const caps = DROP_RATES.caps[type];
  const scaling = DROP_RATES.multiplierScaling;
  
  const effectiveMultiplier = Math.min(rateMultiplier || 1, DROP_RATES.maxMultiplier);
  const rateAdjustment = (effectiveMultiplier - 1) * 0.1;
  
  const rates = {};
  rates.legendary = Math.min(base.legendary * (1 + rateAdjustment * scaling.legendary), caps.legendary);
  rates.epic = Math.min(base.epic * (1 + rateAdjustment * scaling.epic), caps.epic);
  rates.rare = Math.min(base.rare * (1 + rateAdjustment * scaling.rare), caps.rare);
  rates.uncommon = Math.min(base.uncommon * (1 + rateAdjustment * scaling.uncommon), caps.uncommon);
  
  // Calculate common to ensure total is 100%
  const totalHigher = rates.legendary + rates.epic + rates.rare + rates.uncommon;
  rates.common = Math.max(100 - totalHigher, caps.commonMin);
  
  return rates;
};

// Get standard rates for single or multi
const getStandardRates = (isMulti = false) => {
  return isMulti ? DROP_RATES.standard.multi : DROP_RATES.standard.single;
};

// Get premium rates for single or multi
const getPremiumRates = (isMulti = false) => {
  return isMulti ? DROP_RATES.premium.multi : DROP_RATES.premium.single;
};

// Get pity rates
const getPityRates = () => DROP_RATES.pity;

// Get banner pull chance
const getBannerPullChance = (isLast3 = false) => {
  return isLast3 ? DROP_RATES.bannerPullChanceLast3 : DROP_RATES.bannerPullChance;
};

// Round rates for display (to 2 decimal places)
const roundRatesForDisplay = (rates) => {
  const rounded = {};
  Object.keys(rates).forEach(key => {
    rounded[key] = Math.round(rates[key] * 100) / 100;
  });
  return rounded;
};

/**
 * Roll a rarity based on rates
 * Uses explicit ordering to ensure consistent behavior regardless of object key order
 * @param {Object} rates - Object with rarity keys and percentage values
 * @returns {string} - The rolled rarity
 */
const rollRarity = (rates) => {
  const roll = Math.random() * 100;
  let cumulative = 0;
  
  // Explicit order to ensure consistent behavior (rarest first for proper cumulative calculation)
  const orderedRarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  
  for (const rarity of orderedRarities) {
    if (rates[rarity] !== undefined) {
      cumulative += rates[rarity];
      if (roll < cumulative) return rarity;
    }
  }
  
  return 'common'; // Fallback
};

module.exports = {
  PRICING_CONFIG,
  getDiscountForCount,
  calculateBannerRates,
  getStandardRates,
  getPremiumRates,
  getPityRates,
  getBannerPullChance,
  roundRatesForDisplay,
  rollRarity
};