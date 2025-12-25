/**
 * Standard Banner Service
 *
 * Manages the Standard Banner pool - the permanent banner that contains
 * characters explicitly assigned to it.
 *
 * Key concepts:
 * - Characters are ONLY pullable if explicitly assigned to a banner
 * - The Standard Banner is treated as a first-class banner, not a fallback
 * - Limited characters on time-limited banners are NOT in the Standard pool
 * - Characters can be on multiple banners (e.g., Standard + a featured banner)
 */

const { Banner, Character } = require('../models');

// Cache for standard banner characters (invalidated on changes)
let standardBannerCache = null;
let standardBannerCacheTime = null;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get the Standard Banner record
 * @returns {Promise<Banner|null>} The Standard Banner or null if not found
 */
const getStandardBanner = async () => {
  return await Banner.findOne({
    where: { isStandard: true }
  });
};

/**
 * Get the Standard Banner with its characters
 * @returns {Promise<Banner|null>} The Standard Banner with Characters included
 */
const getStandardBannerWithCharacters = async () => {
  return await Banner.findOne({
    where: { isStandard: true },
    include: [{ model: Character }]
  });
};

/**
 * Get all characters assigned to the Standard Banner
 * Uses caching to avoid repeated DB queries during high-volume rolling
 *
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Character[]>} Array of characters on the Standard Banner
 */
const getStandardBannerCharacters = async (forceRefresh = false) => {
  const now = Date.now();

  // Check cache validity
  if (!forceRefresh && standardBannerCache && standardBannerCacheTime) {
    if (now - standardBannerCacheTime < CACHE_TTL_MS) {
      return standardBannerCache;
    }
  }

  const standardBanner = await getStandardBannerWithCharacters();

  if (!standardBanner) {
    console.warn('Standard Banner not found - returning empty pool');
    return [];
  }

  standardBannerCache = standardBanner.Characters || [];
  standardBannerCacheTime = now;

  return standardBannerCache;
};

/**
 * Invalidate the standard banner cache
 * Should be called when characters are added/removed from the Standard Banner
 */
const invalidateStandardBannerCache = () => {
  standardBannerCache = null;
  standardBannerCacheTime = null;
};

/**
 * Get the Standard Banner ID
 * @returns {Promise<number|null>} The Standard Banner ID or null
 */
const getStandardBannerId = async () => {
  const banner = await getStandardBanner();
  return banner ? banner.id : null;
};

/**
 * Add a character to the Standard Banner
 * @param {number} characterId - The character ID to add
 * @returns {Promise<boolean>} True if successful
 */
const addCharacterToStandardBanner = async (characterId) => {
  const standardBanner = await getStandardBanner();
  if (!standardBanner) {
    throw new Error('Standard Banner not found');
  }

  const character = await Character.findByPk(characterId);
  if (!character) {
    throw new Error('Character not found');
  }

  await standardBanner.addCharacter(character);
  invalidateStandardBannerCache();
  return true;
};

/**
 * Remove a character from the Standard Banner
 * @param {number} characterId - The character ID to remove
 * @returns {Promise<boolean>} True if successful
 */
const removeCharacterFromStandardBanner = async (characterId) => {
  const standardBanner = await getStandardBanner();
  if (!standardBanner) {
    throw new Error('Standard Banner not found');
  }

  const character = await Character.findByPk(characterId);
  if (!character) {
    throw new Error('Character not found');
  }

  await standardBanner.removeCharacter(character);
  invalidateStandardBannerCache();
  return true;
};

/**
 * Bulk add characters to the Standard Banner
 * @param {number[]} characterIds - Array of character IDs to add
 * @returns {Promise<number>} Number of characters added
 */
const bulkAddToStandardBanner = async (characterIds) => {
  const standardBanner = await getStandardBanner();
  if (!standardBanner) {
    throw new Error('Standard Banner not found');
  }

  const characters = await Character.findAll({
    where: { id: characterIds }
  });

  if (characters.length > 0) {
    await standardBanner.addCharacters(characters);
    invalidateStandardBannerCache();
  }

  return characters.length;
};

/**
 * Check if a character is on the Standard Banner
 * @param {number} characterId - The character ID to check
 * @returns {Promise<boolean>} True if character is on Standard Banner
 */
const isCharacterOnStandardBanner = async (characterId) => {
  const characters = await getStandardBannerCharacters();
  return characters.some(c => c.id === characterId);
};

/**
 * Get all characters NOT assigned to any banner
 * Useful for admin tools to find "orphaned" characters
 * @returns {Promise<Character[]>} Array of unassigned characters
 */
const getUnassignedCharacters = async () => {
  const { sequelize } = require('../models');

  const [results] = await sequelize.query(`
    SELECT c.*
    FROM "Characters" c
    LEFT JOIN "BannerCharacters" bc ON c.id = bc."CharacterId"
    WHERE bc."CharacterId" IS NULL
  `);

  return results;
};

module.exports = {
  getStandardBanner,
  getStandardBannerWithCharacters,
  getStandardBannerCharacters,
  getStandardBannerId,
  addCharacterToStandardBanner,
  removeCharacterFromStandardBanner,
  bulkAddToStandardBanner,
  isCharacterOnStandardBanner,
  getUnassignedCharacters,
  invalidateStandardBannerCache
};
