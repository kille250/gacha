/**
 * useDojoPage - Custom hook for dojo page state and logic
 *
 * Extracts all state management and side effects from DojoPage
 * to improve maintainability and testability.
 *
 * @returns {Object} Dojo page state and handlers
 */

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError } from '../hooks';
import {
  getDojoStatus,
  getDojoAvailableCharacters,
  getAssetUrl
} from '../utils/api';
import { onVisibilityChange, STALE_THRESHOLDS, VISIBILITY_CALLBACK_IDS } from '../cache';
import {
  assignCharacter as dojoAssignCharacter,
  unassignCharacter as dojoUnassignCharacter,
  claimRewards as dojoClaimRewards,
  purchaseUpgrade as dojoPurchaseUpgrade
} from '../actions/dojoActions';

export const useDojoPage = () => {
  const { t } = useTranslation();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();

  // Action lock to prevent rapid double-clicks
  const { withLock, locked } = useActionLock(300);

  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();

  // Unmount guard for async operations
  const isMountedRef = useRef(true);

  // Core state
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [upgrading, setUpgrading] = useState(null);

  // Character picker state
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Claim result state
  const [claimResult, setClaimResult] = useState(null);

  // Refs for intervals and tracking
  const refreshIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(Date.now());

  // Track if user is actively interacting
  const isInteracting = showCharacterPicker || claiming || upgrading || locked;

  // Computed values
  const canClaim = status?.accumulated?.rewards?.points > 0 ||
    status?.accumulated?.rewards?.rollTickets > 0 ||
    status?.accumulated?.rewards?.premiumTickets > 0;

  const progressPercent = status?.accumulated ?
    Math.min((status.accumulated.hours / status.accumulated.capHours) * 100, 100) : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch dojo status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await getDojoStatus();
      if (!isMountedRef.current) return;
      setStatus(data);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch dojo status:', err);
      setError(t('dojo.failedLoadStatus'));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [t, setError]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh timer for idle game rewards
  const wasInteractingRef = useRef(isInteracting);

  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (!isInteracting) {
      if (wasInteractingRef.current) {
        fetchStatus();
      }
      refreshIntervalRef.current = setInterval(fetchStatus, 30000);
    }

    wasInteractingRef.current = isInteracting;

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchStatus, isInteracting]);

  // Visibility change handler
  useEffect(() => {
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.DOJO_STATUS, () => {
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > STALE_THRESHOLDS.normal) {
        fetchStatus();
      }
    });
  }, [fetchStatus]);

  // Network offline detection
  useEffect(() => {
    const handleOffline = () => {
      if (claiming || upgrading || locked) {
        setError(t('common.networkDisconnected') || 'Network disconnected. Please check your connection.');
        setClaiming(false);
        setUpgrading(null);
      }
    };

    const handleOnline = () => {
      fetchStatus();
      refreshUser();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [claiming, upgrading, locked, t, fetchStatus, refreshUser, setError]);

  // Helper to get disabled reason for claim button
  const getClaimDisabledReason = useCallback(() => {
    if (claiming) return t('dojo.claiming') || 'Claiming...';
    if (locked) return t('common.processing') || 'Processing...';
    if (status?.usedSlots === 0) {
      return t('dojo.assignCharactersFirst') || 'Assign characters to training slots first!';
    }
    if (!canClaim) return t('dojo.noRewardsAccumulated') || 'No rewards accumulated yet. Keep training!';
    return undefined;
  }, [claiming, locked, canClaim, status?.usedSlots, t]);

  // Helper to get disabled reason for upgrade button
  const getUpgradeDisabledReason = useCallback((upgrade, isUpgrading, canAfford) => {
    if (isUpgrading) return t('common.processing') || 'Processing...';
    if (locked) return t('common.processing') || 'Processing...';
    if (!canAfford) return t('dojo.notEnoughPoints', { cost: upgrade.cost.toLocaleString() }) || `Need ${upgrade.cost.toLocaleString()} points`;
    return undefined;
  }, [locked, t]);

  // Open character picker for a slot
  const openCharacterPicker = useCallback(async (slotIndex) => {
    setSelectedSlot(slotIndex);
    setShowCharacterPicker(true);
    setCharactersLoading(true);
    setSearchQuery('');

    try {
      const data = await getDojoAvailableCharacters();
      if (isMountedRef.current) {
        setAvailableCharacters(data.characters || []);
      }
    } catch (err) {
      console.error('Failed to fetch available characters:', err);
      if (isMountedRef.current) {
        setAvailableCharacters([]);
      }
    } finally {
      if (isMountedRef.current) {
        setCharactersLoading(false);
      }
    }
  }, []);

  // Close character picker
  const closeCharacterPicker = useCallback(() => {
    setShowCharacterPicker(false);
    setSelectedSlot(null);
  }, []);

  // Assign character to slot
  const handleAssign = useCallback(async (characterId) => {
    if (selectedSlot === null) return;

    await withLock(async () => {
      const selectedCharacter = availableCharacters.find(c => c.id === characterId);
      const previousStatus = status;

      // Optimistic update
      if (selectedCharacter) {
        setStatus(prev => ({
          ...prev,
          slots: prev.slots.map((s, i) =>
            i === selectedSlot ? { ...s, character: selectedCharacter } : s
          ),
          usedSlots: (prev.usedSlots || 0) + 1
        }));
      }
      setShowCharacterPicker(false);
      setSelectedSlot(null);

      try {
        await dojoAssignCharacter(characterId, selectedSlot);
        if (!isMountedRef.current) return;
        fetchStatus();
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Failed to assign character:', err);
        setStatus(previousStatus);
        setError(err.response?.data?.error || t('dojo.failedAssign'));
      }
    });
  }, [selectedSlot, availableCharacters, status, withLock, fetchStatus, t, setError]);

  // Remove character from slot
  const handleUnassign = useCallback(async (slotIndex) => {
    await withLock(async () => {
      const previousStatus = status;

      // Optimistic update
      setStatus(prev => ({
        ...prev,
        slots: prev.slots.map((s, i) =>
          i === slotIndex ? { ...s, character: null } : s
        ),
        usedSlots: Math.max(0, (prev.usedSlots || 1) - 1)
      }));

      try {
        await dojoUnassignCharacter(slotIndex);
        if (!isMountedRef.current) return;
        fetchStatus();
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Failed to unassign character:', err);
        setStatus(previousStatus);
        setError(err.response?.data?.error || t('dojo.failedUnassign'));
      }
    });
  }, [status, withLock, fetchStatus, t, setError]);

  // Claim rewards
  const handleClaim = useCallback(async () => {
    if (claiming) return;

    await withLock(async () => {
      setClaiming(true);

      try {
        const result = await dojoClaimRewards(setUser);
        if (!isMountedRef.current) return;

        setClaimResult(result);
        fetchStatus();

        // Auto-hide after 5 seconds
        setTimeout(() => {
          if (isMountedRef.current) setClaimResult(null);
        }, 5000);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Failed to claim rewards:', err);
        setError(err.response?.data?.error || t('dojo.failedClaim'));
        await refreshUser();
      } finally {
        if (isMountedRef.current) setClaiming(false);
      }
    });
  }, [claiming, withLock, setUser, fetchStatus, t, refreshUser, setError]);

  // Purchase upgrade
  const handleUpgrade = useCallback(async (upgradeType, rarity = null) => {
    if (upgrading) return;

    await withLock(async () => {
      setUpgrading(upgradeType + (rarity || ''));

      try {
        await dojoPurchaseUpgrade(upgradeType, rarity, setUser);
        if (!isMountedRef.current) return;
        fetchStatus();
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Failed to purchase upgrade:', err);
        setError(err.response?.data?.error || t('dojo.failedUpgrade'));
        await refreshUser();
      } finally {
        if (isMountedRef.current) setUpgrading(null);
      }
    });
  }, [upgrading, withLock, setUser, fetchStatus, t, refreshUser, setError]);

  // Filter characters by search
  const filteredCharacters = availableCharacters.filter(char => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return char.name.toLowerCase().includes(query) ||
      char.series?.toLowerCase().includes(query);
  });

  // Group by series for display
  const charactersBySeries = filteredCharacters.reduce((acc, char) => {
    const series = char.series || 'Unknown';
    if (!acc[series]) acc[series] = [];
    acc[series].push(char);
    return acc;
  }, {});

  // Dismiss claim result
  const dismissClaimResult = useCallback(() => {
    setClaimResult(null);
  }, []);

  return {
    // Core state
    user,
    status,
    loading,
    error,
    setError,

    // Rarity helpers
    getRarityColor,
    getRarityGlow,
    getAssetUrl,

    // Claim state
    claiming,
    canClaim,
    claimResult,
    dismissClaimResult,
    handleClaim,
    getClaimDisabledReason,

    // Upgrade state
    upgrading,
    handleUpgrade,
    getUpgradeDisabledReason,
    locked,

    // Character picker state
    showCharacterPicker,
    selectedSlot,
    availableCharacters,
    filteredCharacters,
    charactersBySeries,
    charactersLoading,
    searchQuery,
    setSearchQuery,
    openCharacterPicker,
    closeCharacterPicker,
    handleAssign,
    handleUnassign,

    // Computed values
    progressPercent,
  };
};

export default useDojoPage;
