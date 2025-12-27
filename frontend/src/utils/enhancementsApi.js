/**
 * Game Enhancements API
 *
 * Client-side API calls for the enhanced game features:
 * - Dojo enhancements (specializations, breakthroughs, facilities)
 * - Fishing enhancements (double-or-nothing)
 * - Gacha enhancements (milestones, fate points, pity)
 * - Retention systems (mastery, return bonus)
 */

import api from './api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';

// ===========================================
// DOJO ENHANCEMENTS
// ===========================================

export const dojoEnhancements = {
  /**
   * Get current facility tier and available upgrades
   */
  getFacility: async () => {
    const response = await api.get('/enhancements/dojo/facility');
    return response.data;
  },

  /**
   * Upgrade to next facility tier
   * NOTE: Cache invalidation is handled via invalidateFor for consistency
   */
  upgradeFacility: async (tierId) => {
    const response = await api.post('/enhancements/dojo/facility/upgrade', { tierId });
    invalidateFor(CACHE_ACTIONS.ENHANCEMENT_DOJO_FACILITY_UPGRADE);
    return response.data;
  },

  /**
   * Get available specializations for a character
   */
  getSpecializations: async (characterId) => {
    const response = await api.get(`/enhancements/dojo/character/${characterId}/specialization`);
    return response.data;
  },

  /**
   * Apply specialization to a character (permanent)
   * NOTE: Cache invalidation is handled via invalidateFor for consistency
   */
  applySpecialization: async (characterId, specializationId) => {
    const response = await api.post(`/enhancements/dojo/character/${characterId}/specialize`, {
      specializationId
    });
    invalidateFor(CACHE_ACTIONS.ENHANCEMENT_DOJO_SPECIALIZE);
    return response.data;
  }
};

// ===========================================
// FISHING ENHANCEMENTS
// ===========================================

export const fishingEnhancements = {
  /**
   * Execute double-or-nothing gamble
   */
  doubleOrNothing: async (fish, originalQuantity) => {
    const response = await api.post('/enhancements/fishing/double-or-nothing', {
      fish,
      originalQuantity
    });
    return response.data;
  },

  /**
   * Get visual configuration for a rarity
   */
  getVisualConfig: async (rarity) => {
    const response = await api.get(`/enhancements/fishing/visual-config/${rarity}`);
    return response.data;
  }
};

// ===========================================
// GACHA ENHANCEMENTS
// ===========================================

export const gachaEnhancements = {
  /**
   * Get detailed pity state
   */
  getPityState: async (bannerId = null) => {
    const params = bannerId ? { bannerId } : {};
    const response = await api.get('/enhancements/gacha/pity', { params });
    return response.data;
  },

  /**
   * Get milestone rewards status
   */
  getMilestones: async (bannerId = 'standard') => {
    const response = await api.get('/enhancements/gacha/milestones', {
      params: { bannerId }
    });
    return response.data;
  },

  /**
   * Claim a milestone reward
   * NOTE: Cache invalidation is handled via invalidateFor for consistency
   */
  claimMilestone: async (bannerId, milestonePulls) => {
    const response = await api.post('/enhancements/gacha/milestones/claim', {
      bannerId,
      milestonePulls
    });
    invalidateFor(CACHE_ACTIONS.ENHANCEMENT_CLAIM_MILESTONE);
    return response.data;
  },

  /**
   * Get fate points status
   */
  getFatePoints: async (bannerId) => {
    const response = await api.get('/enhancements/gacha/fate-points', {
      params: { bannerId }
    });
    return response.data;
  },

  /**
   * Exchange fate points for rewards (selectors, pity reset)
   * @param {string} exchangeType - Type of exchange: 'rare_selector', 'epic_selector', 'legendary_selector', 'banner_pity_reset'
   * @param {string} bannerId - Banner ID (optional, used for pity reset context)
   * NOTE: Cache invalidation is handled via invalidateFor for consistency
   */
  exchangeFatePoints: async (exchangeType, bannerId = null) => {
    const response = await api.post('/enhancements/gacha/fate-points/exchange', {
      exchangeType,
      bannerId
    });
    invalidateFor(CACHE_ACTIONS.ENHANCEMENT_EXCHANGE_FATE_POINTS);
    return response.data;
  }
};

// ===========================================
// RETENTION SYSTEMS
// ===========================================

export const retentionSystems = {
  /**
   * Get character mastery progress
   */
  getCharacterMastery: async (characterId) => {
    const response = await api.get(`/enhancements/mastery/character/${characterId}`);
    return response.data;
  },

  /**
   * Get fish codex progress
   */
  getFishCodex: async () => {
    const response = await api.get('/enhancements/mastery/codex');
    return response.data;
  },

  /**
   * Check for rest-and-return bonus
   */
  getReturnBonus: async () => {
    const response = await api.get('/enhancements/return-bonus');
    return response.data;
  },

  /**
   * Claim rest-and-return bonus
   * NOTE: Cache invalidation is handled via invalidateFor for consistency
   */
  claimReturnBonus: async () => {
    const response = await api.post('/enhancements/return-bonus/claim');
    invalidateFor(CACHE_ACTIONS.ENHANCEMENT_CLAIM_RETURN_BONUS);
    return response.data;
  }
};

// ===========================================
// ACCOUNT LEVEL SYSTEM
// ===========================================

export const accountLevelApi = {
  /**
   * Get current account level status
   */
  getStatus: async () => {
    const response = await api.get('/enhancements/account-level');
    return response.data;
  },

  /**
   * Recalculate account XP from progression data
   * Useful for fixing inconsistencies or initializing existing users
   */
  recalculate: async () => {
    const response = await api.post('/enhancements/account-level/recalculate');
    return response.data;
  },

  /**
   * Check if user meets a specific level requirement
   */
  checkRequirement: async (level) => {
    const response = await api.get('/enhancements/account-level/check-requirement', {
      params: { level }
    });
    return response.data;
  }
};

// ===========================================
// CHARACTER SELECTORS
// ===========================================

export const selectorApi = {
  /**
   * Get user's character selectors inventory
   */
  getSelectors: async () => {
    const response = await api.get('/enhancements/selectors');
    return response.data;
  },

  /**
   * Get available characters for a given rarity (for selector redemption)
   * @param {string} rarity - 'rare', 'epic', or 'legendary'
   * @param {string} bannerId - Optional banner ID to fetch banner-specific characters
   */
  getCharactersForRarity: async (rarity, bannerId = null) => {
    const params = { rarity };
    if (bannerId) {
      params.bannerId = bannerId;
    }
    const response = await api.get('/enhancements/selectors/characters', {
      params
    });
    return response.data;
  },

  /**
   * Use a selector to claim a specific character
   * @param {number} selectorIndex - Index of the selector to use
   * @param {number} characterId - ID of the character to claim
   * NOTE: Cache invalidation is handled via invalidateFor for consistency
   */
  useSelector: async (selectorIndex, characterId) => {
    const response = await api.post('/enhancements/selectors/use', {
      selectorIndex,
      characterId
    });
    invalidateFor(CACHE_ACTIONS.ENHANCEMENT_USE_SELECTOR);
    return response.data;
  }
};

// ===========================================
// COMBINED EXPORT
// ===========================================

const enhancementsApi = {
  dojo: dojoEnhancements,
  fishing: fishingEnhancements,
  gacha: gachaEnhancements,
  retention: retentionSystems,
  accountLevel: accountLevelApi,
  selectors: selectorApi
};

export default enhancementsApi;
