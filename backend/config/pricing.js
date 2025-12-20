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

// Helper to get discount for a given count
const getDiscountForCount = (count) => {
  for (const tier of PRICING_CONFIG.discountTiers) {
    if (count >= tier.minCount) return tier.discount;
  }
  return 0;
};

// Helper to calculate cost for a given count and cost multiplier
const calculateCost = (count, costMultiplier = 1) => {
  const singlePullCost = Math.floor(PRICING_CONFIG.baseCost * costMultiplier);
  const baseCost = count * singlePullCost;
  const discount = getDiscountForCount(count);
  return Math.floor(baseCost * (1 - discount));
};

module.exports = {
  PRICING_CONFIG,
  getDiscountForCount,
  calculateCost
};

