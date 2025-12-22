/**
 * Fishing Configuration Index
 * 
 * Re-exports all fishing configuration modules from a single entry point.
 */

// Import main config
const mainConfig = require('../fishing');

// Import sub-modules
const prestigeConfig = require('./prestige');
const collectionConfig = require('./collection');

// Re-export everything
module.exports = {
  // Main config exports
  ...mainConfig,
  
  // Prestige system
  PRESTIGE_LEVELS: prestigeConfig.PRESTIGE_LEVELS,
  checkPrestigeRequirements: prestigeConfig.checkPrestigeRequirements,
  getPrestigeBonuses: prestigeConfig.getPrestigeBonuses,
  getPrestigeProgress: prestigeConfig.getPrestigeProgress,
  
  // Collection system
  STAR_THRESHOLDS: collectionConfig.STAR_THRESHOLDS,
  STAR_REWARDS: collectionConfig.STAR_REWARDS,
  RARITY_COMPLETION_BONUSES: collectionConfig.RARITY_COMPLETION_BONUSES,
  COLLECTION_MILESTONES: collectionConfig.COLLECTION_MILESTONES,
  TOTAL_STAR_MILESTONES: collectionConfig.TOTAL_STAR_MILESTONES,
  calculateStarLevel: collectionConfig.calculateStarLevel,
  getNextStarProgress: collectionConfig.getNextStarProgress,
  buildCollectionData: collectionConfig.buildCollectionData,
  checkNewMilestones: collectionConfig.checkNewMilestones,
  checkStarRewards: collectionConfig.checkStarRewards,
  getCollectionBonuses: collectionConfig.getCollectionBonuses
};

