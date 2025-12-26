/**
 * Game Enhancements API
 *
 * Client-side API calls for the enhanced game features:
 * - Dojo enhancements (specializations, breakthroughs, facilities)
 * - Fishing enhancements (bait, double-or-nothing)
 * - Gacha enhancements (milestones, fate points, pity)
 * - Retention systems (voyages, mastery, daily menu)
 */

import api, { clearCache } from './api';

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
   */
  upgradeFacility: async (tierId) => {
    const response = await api.post('/enhancements/dojo/facility/upgrade', { tierId });
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
   */
  applySpecialization: async (characterId, specializationId) => {
    const response = await api.post(`/enhancements/dojo/character/${characterId}/specialize`, {
      specializationId
    });
    // Clear cache for this character's specialization endpoint so next GET gets fresh data
    clearCache(`/enhancements/dojo/character/${characterId}/specialization`);
    return response.data;
  }
};

// ===========================================
// FISHING ENHANCEMENTS
// ===========================================

export const fishingEnhancements = {
  /**
   * Get available baits and inventory
   */
  getBaits: async () => {
    const response = await api.get('/enhancements/fishing/bait');
    return response.data;
  },

  /**
   * Purchase bait
   */
  purchaseBait: async (baitId, quantity = 1) => {
    const response = await api.post('/enhancements/fishing/bait/purchase', {
      baitId,
      quantity
    });
    return response.data;
  },

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
   */
  claimMilestone: async (bannerId, milestonePulls) => {
    const response = await api.post('/enhancements/gacha/milestones/claim', {
      bannerId,
      milestonePulls
    });
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
   * Exchange fate points for guaranteed featured character
   */
  exchangeFatePoints: async (bannerId) => {
    const response = await api.post('/enhancements/gacha/fate-points/exchange', {
      bannerId
    });
    return response.data;
  }
};

// ===========================================
// RETENTION SYSTEMS
// ===========================================

export const retentionSystems = {
  /**
   * Get current weekly voyage
   */
  getVoyage: async () => {
    const response = await api.get('/enhancements/voyage');
    return response.data;
  },

  /**
   * Claim voyage chapter reward
   */
  claimVoyageChapter: async (chapterIndex) => {
    const response = await api.post('/enhancements/voyage/claim-chapter', {
      chapterIndex
    });
    return response.data;
  },

  /**
   * Claim voyage completion reward
   */
  claimVoyageComplete: async () => {
    const response = await api.post('/enhancements/voyage/claim-complete');
    return response.data;
  },

  /**
   * Get daily activity menu
   */
  getDailyMenu: async () => {
    const response = await api.get('/enhancements/daily-menu');
    return response.data;
  },

  /**
   * Claim daily bonus
   */
  claimDailyBonus: async () => {
    const response = await api.post('/enhancements/daily-menu/claim');
    return response.data;
  },

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
   */
  claimReturnBonus: async () => {
    const response = await api.post('/enhancements/return-bonus/claim');
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
  retention: retentionSystems
};

export default enhancementsApi;
