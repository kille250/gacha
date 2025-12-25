// utils/rarityCalculator.js - Auto-calculate character rarity based on popularity data

/**
 * Rarity thresholds based on MAL favorites count
 * These are calibrated against real MAL data:
 * - Legendary: Top characters like Levi (200k+), Lelouch (150k+), L (140k+)
 * - Epic: Popular characters like most main protagonists (10k-50k)
 * - Rare: Well-known supporting characters (2k-10k)
 * - Uncommon: Recognized characters (500-2k)
 * - Common: Minor/side characters (<500)
 */
const FAVORITES_THRESHOLDS = {
  legendary: 50000,
  epic: 10000,
  rare: 2000,
  uncommon: 500
};

/**
 * Role-based score bonuses
 * Main characters get a significant boost, supporting characters get a small boost
 */
const ROLE_BONUSES = {
  Main: 15,
  Supporting: 5
};

/**
 * Calculate rarity based on favorites count alone
 * @param {number} favorites - Number of MAL favorites
 * @returns {string} - Rarity tier (common, uncommon, rare, epic, legendary)
 */
function getRarityFromFavorites(favorites) {
  const count = favorites || 0;

  if (count >= FAVORITES_THRESHOLDS.legendary) return 'legendary';
  if (count >= FAVORITES_THRESHOLDS.epic) return 'epic';
  if (count >= FAVORITES_THRESHOLDS.rare) return 'rare';
  if (count >= FAVORITES_THRESHOLDS.uncommon) return 'uncommon';
  return 'common';
}

/**
 * Calculate a popularity score using logarithmic scaling
 * This provides better distribution across the wide range of favorites counts
 * @param {number} favorites - Number of MAL favorites
 * @returns {number} - Normalized score (0-100+)
 */
function calculatePopularityScore(favorites) {
  const count = Math.max(favorites || 0, 1);
  // Log10 scale: 1 fav = 0, 10 = 20, 100 = 40, 1000 = 60, 10000 = 80, 100000 = 100
  return Math.log10(count) * 20;
}

/**
 * Calculate rarity using both favorites count and character role
 * This hybrid approach gives main characters a boost while still
 * respecting overall popularity
 *
 * @param {number} favorites - Number of MAL favorites
 * @param {string} role - Character role ('Main', 'Supporting', or null)
 * @returns {string} - Rarity tier (common, uncommon, rare, epic, legendary)
 */
function calculateRarity(favorites, role = null) {
  let score = calculatePopularityScore(favorites);

  // Apply role bonus if available
  if (role && ROLE_BONUSES[role]) {
    score += ROLE_BONUSES[role];
  }

  // Map score to rarity
  // Score thresholds (approximate favorites equivalents with Main role bonus):
  // - 100+: legendary (~50k+ favorites, or ~30k+ for main characters)
  // - 80+: epic (~10k+ favorites, or ~5k+ for main characters)
  // - 60+: rare (~2k+ favorites, or ~1k+ for main characters)
  // - 40+: uncommon (~500+ favorites, or ~100+ for main characters)
  // - <40: common
  if (score >= 100) return 'legendary';
  if (score >= 80) return 'epic';
  if (score >= 60) return 'rare';
  if (score >= 40) return 'uncommon';
  return 'common';
}

/**
 * Get rarity calculation details for debugging/display
 * @param {number} favorites - Number of MAL favorites
 * @param {string} role - Character role
 * @returns {Object} - Detailed breakdown of rarity calculation
 */
function getRarityDetails(favorites, role = null) {
  const baseScore = calculatePopularityScore(favorites);
  const roleBonus = (role && ROLE_BONUSES[role]) || 0;
  const totalScore = baseScore + roleBonus;
  const rarity = calculateRarity(favorites, role);

  return {
    favorites: favorites || 0,
    role: role || 'Unknown',
    baseScore: Math.round(baseScore * 10) / 10,
    roleBonus,
    totalScore: Math.round(totalScore * 10) / 10,
    rarity,
    thresholds: {
      legendary: '100+ score (~50k+ favorites)',
      epic: '80-99 score (~10k+ favorites)',
      rare: '60-79 score (~2k+ favorites)',
      uncommon: '40-59 score (~500+ favorites)',
      common: '<40 score (<500 favorites)'
    }
  };
}

/**
 * Batch calculate rarities for multiple characters
 * Useful for bulk imports
 * @param {Array} characters - Array of {favorites, role} objects
 * @returns {Array} - Array of calculated rarities
 */
function batchCalculateRarities(characters) {
  return characters.map(char => ({
    ...char,
    calculatedRarity: calculateRarity(char.favorites, char.role)
  }));
}

module.exports = {
  calculateRarity,
  getRarityFromFavorites,
  calculatePopularityScore,
  getRarityDetails,
  batchCalculateRarities,
  FAVORITES_THRESHOLDS,
  ROLE_BONUSES
};
