/**
 * Enhancement Actions Helper Module
 *
 * Centralizes enhancement action handlers with built-in cache invalidation and state updates.
 * Use these functions instead of calling enhancementsApi + invalidateFor separately to ensure
 * consistent cache behavior and reduce the chance of forgetting invalidation.
 *
 * USAGE:
 * import { upgradeFacility, applySpecialization, claimMilestone } from '../actions/enhancementActions';
 *
 * const result = await upgradeFacility(tierId, setUser);
 */

import api from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';
import { applyPointsUpdate, applyRewards } from '../utils/userStateUpdates';

// ===========================================
// DOJO ENHANCEMENTS
// ===========================================

/**
 * Get current facility tier and available upgrades
 * @returns {Promise<Object>} Facility data from API
 */
export const getFacility = async () => {
  const response = await api.get('/enhancements/dojo/facility');
  return response.data;
};

/**
 * Upgrade to next facility tier with proper cache invalidation and state updates.
 *
 * @param {string} tierId - The tier to upgrade to
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Upgrade result from API
 * @throws {Error} If upgrade fails
 */
export const upgradeFacility = async (tierId, setUser) => {
  // Defensive revalidation before spending currency
  invalidateFor(CACHE_ACTIONS.PRE_PURCHASE);

  const response = await api.post('/enhancements/dojo/facility/upgrade', { tierId });
  const result = response.data;

  // Update user state from response
  if (result.newPoints !== undefined) {
    applyPointsUpdate(setUser, result.newPoints);
  }

  // Invalidate facility and dojo caches
  invalidateFor(CACHE_ACTIONS.ENHANCEMENT_DOJO_FACILITY_UPGRADE);

  return result;
};

/**
 * Get available specializations for a character
 * @param {string} characterId - The character ID
 * @returns {Promise<Object>} Specialization options from API
 */
export const getSpecializations = async (characterId) => {
  const response = await api.get(`/enhancements/dojo/character/${characterId}/specialization`);
  return response.data;
};

/**
 * Apply specialization to a character (permanent) with proper cache invalidation.
 *
 * @param {string} characterId - The character to specialize
 * @param {string} specializationId - The specialization to apply
 * @returns {Promise<Object>} Specialization result from API
 * @throws {Error} If specialization fails
 */
export const applySpecialization = async (characterId, specializationId) => {
  const response = await api.post(`/enhancements/dojo/character/${characterId}/specialize`, {
    specializationId
  });
  const result = response.data;

  // Invalidate dojo character caches
  invalidateFor(CACHE_ACTIONS.ENHANCEMENT_DOJO_SPECIALIZE);

  return result;
};

// ===========================================
// GACHA ENHANCEMENTS
// ===========================================

/**
 * Get detailed pity state
 * @param {string|null} bannerId - Optional banner ID
 * @returns {Promise<Object>} Pity state from API
 */
export const getPityState = async (bannerId = null) => {
  const params = bannerId ? { bannerId } : {};
  const response = await api.get('/enhancements/gacha/pity', { params });
  return response.data;
};

/**
 * Get milestone rewards status
 * @param {string} bannerId - Banner ID (defaults to 'standard')
 * @returns {Promise<Object>} Milestones data from API
 */
export const getMilestones = async (bannerId = 'standard') => {
  const response = await api.get('/enhancements/gacha/milestones', {
    params: { bannerId }
  });
  return response.data;
};

/**
 * Claim a milestone reward with proper cache invalidation and state updates.
 *
 * @param {string} bannerId - The banner ID
 * @param {number} milestonePulls - The milestone pull count to claim
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Claim result from API
 * @throws {Error} If claim fails
 */
export const claimMilestone = async (bannerId, milestonePulls, setUser) => {
  const response = await api.post('/enhancements/gacha/milestones/claim', {
    bannerId,
    milestonePulls
  });
  const result = response.data;

  // Update user state from response (may include points and tickets)
  if (result.rewards) {
    applyRewards(setUser, result.rewards);
  }

  // Invalidate milestone and user caches
  invalidateFor(CACHE_ACTIONS.ENHANCEMENT_CLAIM_MILESTONE);

  return result;
};

/**
 * Get fate points status
 * @param {string|null} bannerId - Optional banner ID
 * @returns {Promise<Object>} Fate points data from API
 */
export const getFatePoints = async (bannerId = null) => {
  const params = bannerId ? { bannerId } : {};
  const response = await api.get('/enhancements/gacha/fate-points', { params });
  return response.data;
};

/**
 * Exchange fate points for rewards with proper cache invalidation and state updates.
 *
 * @param {string} exchangeType - Type of exchange: 'rare_selector', 'epic_selector', 'legendary_selector', 'banner_pity_reset'
 * @param {string|null} bannerId - Optional banner ID (used for pity reset context)
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Exchange result from API
 * @throws {Error} If exchange fails
 */
export const exchangeFatePoints = async (exchangeType, bannerId, setUser) => {
  // Defensive revalidation before spending fate points
  invalidateFor(CACHE_ACTIONS.PRE_PURCHASE);

  const response = await api.post('/enhancements/gacha/fate-points/exchange', {
    exchangeType,
    bannerId
  });
  const result = response.data;

  // Update user state if points changed
  if (result.newPoints !== undefined) {
    applyPointsUpdate(setUser, result.newPoints);
  }

  // Invalidate fate points and related caches
  invalidateFor(CACHE_ACTIONS.ENHANCEMENT_EXCHANGE_FATE_POINTS);

  return result;
};

// ===========================================
// RETENTION SYSTEMS
// ===========================================

/**
 * Get character mastery progress
 * @param {string} characterId - The character ID
 * @returns {Promise<Object>} Mastery data from API
 */
export const getCharacterMastery = async (characterId) => {
  const response = await api.get(`/enhancements/mastery/character/${characterId}`);
  return response.data;
};

/**
 * Get fish codex progress
 * @returns {Promise<Object>} Codex data from API
 */
export const getFishCodex = async () => {
  const response = await api.get('/enhancements/mastery/codex');
  return response.data;
};

/**
 * Check for rest-and-return bonus
 * @returns {Promise<Object>} Return bonus data from API
 */
export const getReturnBonus = async () => {
  const response = await api.get('/enhancements/return-bonus');
  return response.data;
};

/**
 * Claim rest-and-return bonus with proper cache invalidation and state updates.
 *
 * @param {Function} setUser - React state setter for user
 * @returns {Promise<Object>} Claim result from API
 * @throws {Error} If claim fails
 */
export const claimReturnBonus = async (setUser) => {
  const response = await api.post('/enhancements/return-bonus/claim');
  const result = response.data;

  // Update user state from response
  if (result.rewards) {
    applyRewards(setUser, result.rewards);
  }

  // Invalidate return bonus cache
  invalidateFor(CACHE_ACTIONS.ENHANCEMENT_CLAIM_RETURN_BONUS);

  return result;
};

// ===========================================
// CHARACTER SELECTORS
// ===========================================

/**
 * Get user's character selectors inventory
 * @returns {Promise<Object>} Selectors data from API
 */
export const getSelectors = async () => {
  const response = await api.get('/enhancements/selectors');
  return response.data;
};

/**
 * Get available characters for a given rarity (for selector redemption)
 * @param {string} rarity - 'rare', 'epic', or 'legendary'
 * @param {string|null} bannerId - Optional banner ID
 * @returns {Promise<Object>} Characters data from API
 */
export const getCharactersForRarity = async (rarity, bannerId = null) => {
  const params = { rarity };
  if (bannerId) {
    params.bannerId = bannerId;
  }
  const response = await api.get('/enhancements/selectors/characters', { params });
  return response.data;
};

/**
 * Use a selector to claim a specific character with proper cache invalidation.
 *
 * @param {number} selectorIndex - Index of the selector to use
 * @param {number} characterId - ID of the character to claim
 * @returns {Promise<Object>} Use result from API
 * @throws {Error} If use fails
 */
export const useSelector = async (selectorIndex, characterId) => {
  // Defensive revalidation before using selector
  invalidateFor(CACHE_ACTIONS.PRE_PURCHASE);

  const response = await api.post('/enhancements/selectors/use', {
    selectorIndex,
    characterId
  });
  const result = response.data;

  // Invalidate selector and collection caches
  invalidateFor(CACHE_ACTIONS.ENHANCEMENT_USE_SELECTOR);

  return result;
};

// ===========================================
// ACCOUNT LEVEL SYSTEM
// ===========================================

/**
 * Get current account level status
 * @returns {Promise<Object>} Account level data from API
 */
export const getAccountLevelStatus = async () => {
  const response = await api.get('/enhancements/account-level');
  return response.data;
};

/**
 * Recalculate account XP from progression data
 * @returns {Promise<Object>} Recalculation result from API
 */
export const recalculateAccountLevel = async () => {
  const response = await api.post('/enhancements/account-level/recalculate');
  return response.data;
};

/**
 * Check if user meets a specific level requirement
 * @param {number} level - The level to check
 * @returns {Promise<Object>} Requirement check result from API
 */
export const checkLevelRequirement = async (level) => {
  const response = await api.get('/enhancements/account-level/check-requirement', {
    params: { level }
  });
  return response.data;
};

// ===========================================
// FISHING ENHANCEMENTS
// ===========================================

/**
 * Execute double-or-nothing gamble
 * @param {string} fish - The fish type
 * @param {number} originalQuantity - Original quantity
 * @returns {Promise<Object>} Gamble result from API
 */
export const doubleOrNothing = async (fish, originalQuantity) => {
  const response = await api.post('/enhancements/fishing/double-or-nothing', {
    fish,
    originalQuantity
  });
  return response.data;
};

/**
 * Get visual configuration for a rarity
 * @param {string} rarity - The rarity level
 * @returns {Promise<Object>} Visual config from API
 */
export const getVisualConfig = async (rarity) => {
  const response = await api.get(`/enhancements/fishing/visual-config/${rarity}`);
  return response.data;
};

// NOTE: Use named exports instead of default for better tree-shaking
