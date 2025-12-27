/**
 * useGameEnhancements Hook
 *
 * Manages state and actions for all game enhancement features:
 * - Pity system visibility
 * - Milestone rewards
 * - Fate points
 * - Return bonuses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import enhancementsApi from '../utils/enhancementsApi';

// ===========================================
// PITY STATE HOOK
// ===========================================

export function usePityState(bannerId = null) {
  const [pityState, setPityState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPityState = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancementsApi.gacha.getPityState(bannerId);
      setPityState(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load pity state');
    } finally {
      setLoading(false);
    }
  }, [bannerId]);

  useEffect(() => {
    fetchPityState();
  }, [fetchPityState]);

  return {
    pityState,
    loading,
    error,
    refresh: fetchPityState
  };
}

// ===========================================
// MILESTONES HOOK
// ===========================================

export function useMilestones(bannerId = 'standard') {
  const [milestones, setMilestones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancementsApi.gacha.getMilestones(bannerId);
      setMilestones(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [bannerId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const claimMilestone = useCallback(async (milestonePulls) => {
    try {
      setClaiming(true);
      const result = await enhancementsApi.gacha.claimMilestone(bannerId, milestonePulls);
      await fetchMilestones(); // Refresh
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to claim milestone');
      throw err;
    } finally {
      setClaiming(false);
    }
  }, [bannerId, fetchMilestones]);

  return {
    milestones,
    loading,
    error,
    claiming,
    claimMilestone,
    refresh: fetchMilestones
  };
}

// ===========================================
// FATE POINTS HOOK
// ===========================================

/**
 * Hook to manage Fate Points state
 * Note: Fate Points are a GLOBAL pool. The bannerId parameter is optional
 * and kept for backwards compatibility (e.g., for pity reset context).
 */
export function useFatePoints(bannerId = null) {
  const [fatePoints, setFatePoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exchanging, setExchanging] = useState(false);
  // Guard against concurrent fetches (e.g., from visibility change + manual refresh)
  const isFetchingRef = useRef(false);

  const fetchFatePoints = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      // bannerId is optional - Fate Points are global across all banners
      const data = await enhancementsApi.gacha.getFatePoints(bannerId);
      setFatePoints(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load fate points');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [bannerId]);

  useEffect(() => {
    fetchFatePoints();
  }, [fetchFatePoints]);

  /**
   * Exchange fate points for a reward
   * @param {string} exchangeType - Type: 'rare_selector', 'epic_selector', 'legendary_selector', 'banner_pity_reset'
   */
  const exchange = useCallback(async (exchangeType) => {
    try {
      setExchanging(true);
      const result = await enhancementsApi.gacha.exchangeFatePoints(exchangeType, bannerId);
      // Update local state with the returned fate points status
      if (result.fatePoints) {
        setFatePoints(result.fatePoints);
      } else {
        await fetchFatePoints(); // Fallback refresh
      }
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to exchange fate points');
      throw err;
    } finally {
      setExchanging(false);
    }
  }, [bannerId, fetchFatePoints]);

  return {
    fatePoints,
    loading,
    error,
    exchanging,
    exchangePoints: exchange,
    refreshFatePoints: fetchFatePoints
  };
}

// ===========================================
// RETURN BONUS HOOK
// ===========================================

export function useReturnBonus() {
  const [returnBonus, setReturnBonus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const fetchReturnBonus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancementsApi.retention.getReturnBonus();
      setReturnBonus(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check return bonus');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturnBonus();
  }, [fetchReturnBonus]);

  const claim = useCallback(async () => {
    try {
      setClaiming(true);
      const result = await enhancementsApi.retention.claimReturnBonus();
      setReturnBonus({ hasBonus: false, bonus: null });
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to claim return bonus');
      throw err;
    } finally {
      setClaiming(false);
    }
  }, []);

  return {
    returnBonus,
    hasBonus: returnBonus?.hasBonus || false,
    loading,
    error,
    claiming,
    claim,
    refresh: fetchReturnBonus
  };
}

// ===========================================
// FISH CODEX HOOK
// ===========================================

export function useFishCodex() {
  const [codex, setCodex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCodex = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancementsApi.retention.getFishCodex();
      setCodex(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load fish codex');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodex();
  }, [fetchCodex]);

  return {
    codex,
    loading,
    error,
    refresh: fetchCodex
  };
}

// ===========================================
// DOJO FACILITY HOOK
// ===========================================

export function useDojoFacility() {
  const [facility, setFacility] = useState(null);
  const [trainingMethods, setTrainingMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upgrading, setUpgrading] = useState(false);

  const fetchFacility = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancementsApi.dojo.getFacility();
      setFacility(data.facility);
      setTrainingMethods(data.trainingMethods);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load facility');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacility();
  }, [fetchFacility]);

  const upgrade = useCallback(async (tierId) => {
    try {
      setUpgrading(true);
      const result = await enhancementsApi.dojo.upgradeFacility(tierId);
      await fetchFacility(); // Refresh
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upgrade facility');
      throw err;
    } finally {
      setUpgrading(false);
    }
  }, [fetchFacility]);

  return {
    facility,
    trainingMethods,
    loading,
    error,
    upgrading,
    upgrade,
    refresh: fetchFacility
  };
}

// ===========================================
// CHARACTER SPECIALIZATION HOOK
// ===========================================

export function useCharacterSpecialization(characterId) {
  const [specInfo, setSpecInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);

  const fetchSpecInfo = useCallback(async () => {
    if (!characterId) return;
    try {
      setLoading(true);
      const data = await enhancementsApi.dojo.getSpecializations(characterId);
      setSpecInfo(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load specializations');
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    fetchSpecInfo();
  }, [fetchSpecInfo]);

  const apply = useCallback(async (specializationId) => {
    try {
      setApplying(true);
      const result = await enhancementsApi.dojo.applySpecialization(characterId, specializationId);
      await fetchSpecInfo(); // Refresh
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply specialization');
      throw err;
    } finally {
      setApplying(false);
    }
  }, [characterId, fetchSpecInfo]);

  return {
    specialization: specInfo,
    loading,
    error,
    applying,
    applySpecialization: apply,
    refresh: fetchSpecInfo
  };
}

// ===========================================
// ACCOUNT LEVEL HOOK
// ===========================================

export function useAccountLevel() {
  const [accountLevel, setAccountLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const fetchAccountLevel = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancementsApi.accountLevel.getStatus();
      setAccountLevel(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load account level');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountLevel();
  }, [fetchAccountLevel]);

  const recalculate = useCallback(async () => {
    try {
      setRecalculating(true);
      const result = await enhancementsApi.accountLevel.recalculate();
      if (result.status) {
        setAccountLevel(result.status);
      }
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to recalculate account level');
      throw err;
    } finally {
      setRecalculating(false);
    }
  }, []);

  const checkRequirement = useCallback(async (level) => {
    try {
      return await enhancementsApi.accountLevel.checkRequirement(level);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check requirement');
      throw err;
    }
  }, []);

  return {
    accountLevel,
    loading,
    error,
    recalculating,
    recalculate,
    checkRequirement,
    refresh: fetchAccountLevel
  };
}

// ===========================================
// CHARACTER SELECTORS HOOK
// ===========================================

export function useSelectors() {
  const [selectors, setSelectors] = useState(null);
  const [characters, setCharacters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [using, setUsing] = useState(false);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  const fetchSelectors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancementsApi.selectors.getSelectors();
      setSelectors(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load selectors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSelectors();
  }, [fetchSelectors]);

  const fetchCharactersForRarity = useCallback(async (rarity, bannerId = null) => {
    try {
      setLoadingCharacters(true);
      const data = await enhancementsApi.selectors.getCharactersForRarity(rarity, bannerId);
      setCharacters(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load characters');
      throw err;
    } finally {
      setLoadingCharacters(false);
    }
  }, []);

  const useSelector = useCallback(async (selectorIndex, characterId) => {
    try {
      setUsing(true);
      const result = await enhancementsApi.selectors.useSelector(selectorIndex, characterId);
      // Refresh selectors after use
      await fetchSelectors();
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to use selector');
      throw err;
    } finally {
      setUsing(false);
    }
  }, [fetchSelectors]);

  return {
    selectors,
    characters,
    loading,
    loadingCharacters,
    error,
    using,
    fetchCharactersForRarity,
    useSelector,
    refresh: fetchSelectors
  };
}

// ===========================================
// COMBINED HOOK
// ===========================================

export function useGameEnhancements() {
  return {
    usePityState,
    useMilestones,
    useFatePoints,
    useReturnBonus,
    useFishCodex,
    useDojoFacility,
    useCharacterSpecialization,
    useAccountLevel,
    useSelectors
  };
}

export default useGameEnhancements;
