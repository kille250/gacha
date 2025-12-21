const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Rarity Model
 * 
 * Defines rarity tiers for characters with configurable properties:
 * - Drop rates (standard single/multi, banner single/multi, premium, pity)
 * - Visual styling (color, glow, animation settings)
 * - Ordering for drop rate calculations
 */
const Rarity = sequelize.define('Rarity', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Internal name (e.g., "common", "legendary")'
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Display name shown to users'
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Sort order (higher = rarer, used for drop rate calculations)'
  },
  
  // Drop rate configuration
  dropRateStandardSingle: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Drop rate % for standard single pulls'
  },
  dropRateStandardMulti: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Drop rate % for standard multi pulls'
  },
  dropRateBannerSingle: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Base drop rate % for banner single pulls (before multiplier)'
  },
  dropRateBannerMulti: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Base drop rate % for banner multi pulls (before multiplier)'
  },
  dropRatePremiumSingle: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Drop rate % for premium ticket single pulls'
  },
  dropRatePremiumMulti: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Drop rate % for premium ticket multi pulls'
  },
  dropRatePity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Drop rate % for pity system (10+ pulls guaranteed)'
  },
  
  // Rate caps for banner multipliers
  capSingle: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Maximum rate cap for single pulls when applying banner multiplier'
  },
  capMulti: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Maximum rate cap for multi pulls when applying banner multiplier'
  },
  multiplierScaling: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    comment: 'Scaling factor when applying banner rate multiplier'
  },
  minimumRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Minimum guaranteed rate % for banner pulls (prevents rate from going below this). Used for common to ensure some "bad luck" chance.'
  },
  
  // Visual configuration
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#8e8e93',
    comment: 'Primary color for this rarity (hex)'
  },
  accentColor: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Accent color for this rarity (hex), defaults to lighter version of color'
  },
  
  // Animation configuration
  glowIntensity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.5,
    comment: 'Glow intensity for summon animation (0-1)'
  },
  buildupTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
    comment: 'Animation buildup time in ms'
  },
  confettiCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of confetti particles on reveal'
  },
  orbCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: 'Number of orbs in summon animation'
  },
  ringCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Number of rings in summon animation'
  },
  
  // Pity system
  isPityEligible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this rarity counts as "rare+" for pity system'
  },
  
  // System flags
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this is a default rarity (cannot be deleted)'
  }
});

/**
 * Default rarities to seed the database
 * These match the current hardcoded values in the codebase
 */
Rarity.DEFAULT_RARITIES = [
  {
    name: 'common',
    displayName: 'Common',
    order: 1,
    dropRateStandardSingle: 70,
    dropRateStandardMulti: 65,
    dropRateBannerSingle: 60,
    dropRateBannerMulti: 55,
    dropRatePremiumSingle: 0,
    dropRatePremiumMulti: 0,
    dropRatePity: 0,
    capSingle: null,
    capMulti: null,
    multiplierScaling: 0,
    minimumRate: 35,  // Ensures at least 35% common on banner pulls
    color: '#8e8e93',
    accentColor: '#a8a8ad',
    glowIntensity: 0.3,
    buildupTime: 800,
    confettiCount: 0,
    orbCount: 3,
    ringCount: 1,
    isPityEligible: false,
    isDefault: true
  },
  {
    name: 'uncommon',
    displayName: 'Uncommon',
    order: 2,
    dropRateStandardSingle: 20,
    dropRateStandardMulti: 22,
    dropRateBannerSingle: 22,
    dropRateBannerMulti: 24,
    dropRatePremiumSingle: 0,
    dropRatePremiumMulti: 0,
    dropRatePity: 0,
    capSingle: 25,
    capMulti: 28,
    multiplierScaling: 0.5,
    minimumRate: 0,
    color: '#30d158',
    accentColor: '#5fe07a',
    glowIntensity: 0.5,
    buildupTime: 1000,
    confettiCount: 30,
    orbCount: 4,
    ringCount: 1,
    isPityEligible: false,
    isDefault: true
  },
  {
    name: 'rare',
    displayName: 'Rare',
    order: 3,
    dropRateStandardSingle: 7,
    dropRateStandardMulti: 9,
    dropRateBannerSingle: 12,
    dropRateBannerMulti: 14,
    dropRatePremiumSingle: 70,
    dropRatePremiumMulti: 65,
    dropRatePity: 85,
    capSingle: 18,
    capMulti: 20,
    multiplierScaling: 1.0,
    minimumRate: 0,
    color: '#0a84ff',
    accentColor: '#409cff',
    glowIntensity: 0.7,
    buildupTime: 1400,
    confettiCount: 80,
    orbCount: 5,
    ringCount: 2,
    isPityEligible: true,
    isDefault: true
  },
  {
    name: 'epic',
    displayName: 'Epic',
    order: 4,
    dropRateStandardSingle: 2.5,
    dropRateStandardMulti: 3.5,
    dropRateBannerSingle: 5,
    dropRateBannerMulti: 6,
    dropRatePremiumSingle: 25,
    dropRatePremiumMulti: 28,
    dropRatePity: 14,
    capSingle: 10,
    capMulti: 12,
    multiplierScaling: 1.5,
    minimumRate: 0,
    color: '#bf5af2',
    accentColor: '#d183f5',
    glowIntensity: 0.85,
    buildupTime: 1800,
    confettiCount: 120,
    orbCount: 6,
    ringCount: 2,
    isPityEligible: true,
    isDefault: true
  },
  {
    name: 'legendary',
    displayName: 'Legendary',
    order: 5,
    dropRateStandardSingle: 0.5,
    dropRateStandardMulti: 0.5,
    dropRateBannerSingle: 1,
    dropRateBannerMulti: 1,
    dropRatePremiumSingle: 5,
    dropRatePremiumMulti: 7,
    dropRatePity: 1,
    capSingle: 3,
    capMulti: 3,
    multiplierScaling: 2.0,
    minimumRate: 0,
    color: '#ff9f0a',
    accentColor: '#ffc040',
    glowIntensity: 1.0,
    buildupTime: 2200,
    confettiCount: 200,
    orbCount: 8,
    ringCount: 3,
    isPityEligible: true,
    isDefault: true
  }
];

/**
 * Seed default rarities if none exist
 * Called during database sync
 */
Rarity.seedDefaults = async function() {
  const count = await Rarity.count();
  if (count === 0) {
    console.log('Seeding default rarities...');
    await Rarity.bulkCreate(Rarity.DEFAULT_RARITIES);
    console.log(`Created ${Rarity.DEFAULT_RARITIES.length} default rarities`);
  }
};

module.exports = Rarity;

