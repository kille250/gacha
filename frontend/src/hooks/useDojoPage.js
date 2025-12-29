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
import { useToast } from '../context/ToastContext';
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

// Fetch timeout constant (15 seconds)
const FETCH_TIMEOUT_MS = 15000;

/**
 * Wrapper to add timeout to fetch operations
 * @param {Promise} fetchPromise - The fetch promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} - Resolves with fetch result or rejects on timeout
 */
const withTimeout = (fetchPromise, timeoutMs = FETCH_TIMEOUT_MS) => {
  return Promise.race([
    fetchPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeoutMs)
    )
  ]);
};

// Undo window for character assignment (5 seconds)
const UNDO_WINDOW_MS = 5000;

export const useDojoPage = () => {
  const { t } = useTranslation();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();
  const toast = useToast();

  // Action lock to prevent rapid double-clicks
  const { withLock, locked } = useActionLock(300);

  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();

  // Undo state for character assignments
  const undoTimeoutRef = useRef(null);
  const [lastAssignment, setLastAssignment] = useState(null);

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

  // Fetch dojo status with timeout
  const fetchStatus = useCallback(async () => {
    try {
      const data = await withTimeout(getDojoStatus());
      if (!isMountedRef.current) return;
      setStatus(data);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch dojo status:', err);
      const errorMessage = err.message?.includes('timed out')
        ? t('dojo.requestTimeout', { defaultValue: 'Request timed out. Please try again.' })
        : t('dojo.failedLoadStatus');
      setError(errorMessage);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [t, setError]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Pre-fetch available characters on mount for Quick Fill functionality (with timeout)
  const fetchAvailableCharacters = useCallback(async () => {
    try {
      const data = await withTimeout(getDojoAvailableCharacters());
      if (isMountedRef.current) {
        setAvailableCharacters(data.characters || []);
      }
    } catch (err) {
      console.error('Failed to pre-fetch available characters:', err);
    }
  }, []);

  useEffect(() => {
    fetchAvailableCharacters();
  }, [fetchAvailableCharacters]);

  // Auto-refresh timer for idle game rewards
  // Uses centralized visibility handler instead of manual event listeners
  const wasInteractingRef = useRef(isInteracting);
  const visibilityDebounceRef = useRef(null);

  // Start/stop polling helpers
  const startPolling = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    if (!isInteracting && document.visibilityState === 'visible') {
      refreshIntervalRef.current = setInterval(fetchStatus, 30000);
    }
  }, [isInteracting, fetchStatus]);

  const stopPolling = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Manage polling based on interaction state
  useEffect(() => {
    if (!isInteracting) {
      if (wasInteractingRef.current) {
        fetchStatus();
      }
      startPolling();
    } else {
      stopPolling();
    }

    wasInteractingRef.current = isInteracting;

    return () => {
      stopPolling();
    };
  }, [fetchStatus, isInteracting, startPolling, stopPolling]);

  // Centralized visibility change handler - replaces manual event listener
  // Handles both polling control and stale data refresh
  useEffect(() => {
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.DOJO_STATUS, (staleLevel) => {
      // Stop polling when tab is hidden (staleLevel is null on first call after hidden)
      if (document.visibilityState === 'hidden') {
        stopPolling();
        return;
      }

      // Resume polling when visible and not interacting
      if (!isInteracting) {
        startPolling();
      }

      // Clear any pending debounced fetch
      if (visibilityDebounceRef.current) {
        clearTimeout(visibilityDebounceRef.current);
      }

      // Debounce the refetch by 500ms to prevent rapid tab switching issues
      visibilityDebounceRef.current = setTimeout(() => {
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastFetch > STALE_THRESHOLDS.normal) {
          fetchStatus();
        }
        visibilityDebounceRef.current = null;
      }, 500);
    });
  }, [fetchStatus, isInteracting, startPolling, stopPolling]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (visibilityDebounceRef.current) {
        clearTimeout(visibilityDebounceRef.current);
      }
    };
  }, []);

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

  // Undo the last character assignment
  const undoAssignment = useCallback(async () => {
    if (!lastAssignment) return;

    // Clear the undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const { slotIndex, previousStatus, characterName } = lastAssignment;

    try {
      // Revert to previous status optimistically
      setStatus(previousStatus);

      // Unassign from server
      await dojoUnassignCharacter(slotIndex);

      if (!isMountedRef.current) return;

      toast.success(
        t('dojo.assignmentUndone', {
          name: characterName,
          defaultValue: `${characterName} removed from training`
        })
      );

      fetchStatus();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to undo assignment:', err);
      toast.error(t('dojo.undoFailed', { defaultValue: 'Failed to undo. Please try again.' }));
      fetchStatus();
    } finally {
      setLastAssignment(null);
    }
  }, [lastAssignment, fetchStatus, t, toast]);

  // Assign character to slot with toast notification and undo option
  const handleAssign = useCallback(async (characterId) => {
    if (selectedSlot === null) return;

    await withLock(async () => {
      const selectedCharacter = availableCharacters.find(c => c.id === characterId);
      const previousStatus = status;
      const slotIndex = selectedSlot;

      // Optimistic update
      if (selectedCharacter) {
        setStatus(prev => ({
          ...prev,
          slots: prev.slots.map((s, i) =>
            i === slotIndex ? { ...s, character: selectedCharacter } : s
          ),
          usedSlots: (prev.usedSlots || 0) + 1
        }));
      }
      setShowCharacterPicker(false);
      setSelectedSlot(null);

      try {
        await dojoAssignCharacter(characterId, slotIndex);
        if (!isMountedRef.current) return;

        // Store assignment for undo
        setLastAssignment({
          slotIndex,
          characterId,
          characterName: selectedCharacter?.name || 'Character',
          previousStatus,
          timestamp: Date.now()
        });

        // Show success toast with undo option
        toast.success(
          t('dojo.characterAssigned', {
            name: selectedCharacter?.name || 'Character',
            defaultValue: `${selectedCharacter?.name || 'Character'} is now training!`
          }),
          t('dojo.pressToUndo', { defaultValue: 'Undo available for 5 seconds' })
        );

        // Clear undo after window expires
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
        undoTimeoutRef.current = setTimeout(() => {
          setLastAssignment(null);
        }, UNDO_WINDOW_MS);

        fetchStatus();
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Failed to assign character:', err);
        setStatus(previousStatus);
        setError(err.response?.data?.error || t('dojo.failedAssign'));
      }
    });
  }, [selectedSlot, availableCharacters, status, withLock, fetchStatus, t, setError, toast]);

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

        // Auto-hide after 10 seconds (increased from 5 for better readability)
        setTimeout(() => {
          if (isMountedRef.current) setClaimResult(null);
        }, 10000);
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

  // Quick Fill - auto-assign best available characters to empty slots
  const [quickFilling, setQuickFilling] = useState(false);
  const [quickFillResult, setQuickFillResult] = useState(null);
  const quickFillUndoRef = useRef(null);

  /**
   * Smart character scoring algorithm for Quick Fill
   * Prioritizes: Power (rarity×level) > Synergy potential > Diversity
   */
  const scoreCharacterForQuickFill = useCallback((char, currentTeam, alreadySelected) => {
    // Rarity power values (base points per hour from dojo config)
    const RARITY_POWER = { 'Legendary': 70, 'Epic': 35, 'Rare': 18, 'Uncommon': 10, 'Common': 6 };

    // Base power score from rarity and level
    const basePower = RARITY_POWER[char.rarity] || 6;
    const levelMultiplier = 1 + ((char.level || 1) - 1) * 0.1; // +10% per level above 1
    let score = basePower * levelMultiplier;

    // Synergy bonus: check if character matches series of current team or selected chars
    const teamSeries = [...currentTeam, ...alreadySelected]
      .filter(c => c?.series)
      .map(c => c.series);

    if (char.series && teamSeries.includes(char.series)) {
      // Count how many chars share this series (including this one)
      const seriesCount = teamSeries.filter(s => s === char.series).length + 1;
      // Synergy multipliers from backend config
      const SYNERGY_BONUS = { 2: 1.15, 3: 1.35, 4: 1.55, 5: 1.75, 6: 2.0 };
      const synergyMult = SYNERGY_BONUS[Math.min(seriesCount, 6)] || 1;
      score *= synergyMult;
    }

    // Specialization bonus: strength and spirit boost dojo output
    if (char.specialization === 'strength') {
      score *= 1.1; // Strength is best for raw power
    } else if (char.specialization === 'spirit') {
      score *= 1.25; // Spirit gives +25% dojo points
    }
    // Wisdom gives ticket bonus but -10% points, so no score adjustment

    return score;
  }, []);

  /**
   * Select optimal characters for empty slots using greedy scoring
   */
  const selectOptimalCharacters = useCallback((available, emptyCount, currentTeam) => {
    if (available.length === 0 || emptyCount === 0) return [];

    const selected = [];
    const remaining = [...available];

    for (let i = 0; i < emptyCount && remaining.length > 0; i++) {
      // Score all remaining characters considering already selected
      const scored = remaining.map(char => ({
        char,
        score: scoreCharacterForQuickFill(char, currentTeam, selected)
      }));

      // Sort by score descending and take best
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      selected.push(best.char);
      remaining.splice(remaining.indexOf(best.char), 1);
    }

    return selected;
  }, [scoreCharacterForQuickFill]);

  const handleQuickFill = useCallback(async () => {
    if (quickFilling || !status) return;

    // Find empty slot indices
    const emptySlotIndices = [];
    for (let i = 0; i < (status.maxSlots || 3); i++) {
      if (!status.slots?.[i]?.character) {
        emptySlotIndices.push(i);
      }
    }

    if (emptySlotIndices.length === 0 || availableCharacters.length === 0) {
      toast.info(t('dojo.noCharactersAvailable', { defaultValue: 'No characters available to assign' }));
      return;
    }

    // Get currently assigned characters for synergy calculation
    const currentTeam = (status.slots || [])
      .map(s => s?.character)
      .filter(Boolean);

    // Use smart selection algorithm
    const charsToAssign = selectOptimalCharacters(
      availableCharacters,
      emptySlotIndices.length,
      currentTeam
    );

    if (charsToAssign.length === 0) {
      toast.info(t('dojo.noCharactersAvailable', { defaultValue: 'No characters available to assign' }));
      return;
    }

    // Store previous status for undo
    const previousStatus = JSON.parse(JSON.stringify(status));
    const previousAvailable = [...availableCharacters];

    setQuickFilling(true);

    // Optimistic UI update with staggered animation data
    const assignmentPairs = charsToAssign.map((char, i) => ({
      char,
      slotIdx: emptySlotIndices[i],
      animationDelay: i * 80 // 80ms stagger
    }));

    // Apply optimistic update
    setStatus(prev => {
      const newSlots = [...(prev.slots || [])];
      assignmentPairs.forEach(({ char, slotIdx }) => {
        newSlots[slotIdx] = { ...newSlots[slotIdx], character: char };
      });
      return {
        ...prev,
        slots: newSlots,
        usedSlots: (prev.usedSlots || 0) + assignmentPairs.length
      };
    });

    // Update available characters optimistically
    setAvailableCharacters(prev =>
      prev.filter(c => !charsToAssign.some(selected => selected.id === c.id))
    );

    try {
      // Assign characters sequentially to ensure transaction safety.
      // The backend uses row-level locking (LOCK.UPDATE) which prevents race conditions.
      for (let i = 0; i < assignmentPairs.length; i++) {
        const { char, slotIdx } = assignmentPairs[i];
        await dojoAssignCharacter(char.id, slotIdx, setUser);
      }

      if (!isMountedRef.current) return;

      // Store result for undo functionality
      setQuickFillResult({
        assignedCharacters: charsToAssign,
        slotIndices: emptySlotIndices.slice(0, charsToAssign.length),
        previousStatus,
        previousAvailable,
        timestamp: Date.now()
      });

      // Show success toast with character names
      const charNames = charsToAssign.slice(0, 3).map(c => c.name).join(', ');
      const moreCount = charsToAssign.length - 3;
      const namesDisplay = moreCount > 0
        ? `${charNames} +${moreCount}`
        : charNames;

      toast.success(
        t('dojo.quickFillSuccess', {
          count: charsToAssign.length,
          names: namesDisplay,
          defaultValue: `Team assembled! ${namesDisplay}`
        }),
        t('dojo.undoAvailable', { defaultValue: 'Undo available for 5 seconds' })
      );

      // Clear undo after 5 seconds
      if (quickFillUndoRef.current) {
        clearTimeout(quickFillUndoRef.current);
      }
      quickFillUndoRef.current = setTimeout(() => {
        setQuickFillResult(null);
      }, UNDO_WINDOW_MS);

      // Refresh to ensure consistency
      fetchStatus();
      fetchAvailableCharacters();
    } catch (err) {
      if (!isMountedRef.current) return;

      // Revert optimistic updates on error
      setStatus(previousStatus);
      setAvailableCharacters(previousAvailable);

      console.error('Quick fill error:', err);
      setError(err.response?.data?.error || t('dojo.quickFillError', { defaultValue: 'Failed to quick fill' }));
    } finally {
      if (isMountedRef.current) {
        setQuickFilling(false);
      }
    }
  }, [quickFilling, status, availableCharacters, setUser, fetchStatus, fetchAvailableCharacters, t, setError, toast, selectOptimalCharacters]);

  // Undo Quick Fill
  const undoQuickFill = useCallback(async () => {
    if (!quickFillResult) return;

    // Clear undo timeout
    if (quickFillUndoRef.current) {
      clearTimeout(quickFillUndoRef.current);
      quickFillUndoRef.current = null;
    }

    const { slotIndices, assignedCharacters, previousStatus, previousAvailable } = quickFillResult;

    // Optimistic revert
    setStatus(previousStatus);
    setAvailableCharacters(previousAvailable);
    setQuickFillResult(null);

    try {
      // Unassign all quick-filled characters
      for (const slotIdx of slotIndices) {
        await dojoUnassignCharacter(slotIdx);
      }

      if (!isMountedRef.current) return;

      const charNames = assignedCharacters.slice(0, 2).map(c => c.name).join(', ');
      toast.success(
        t('dojo.quickFillUndone', {
          defaultValue: `Quick Fill undone - ${charNames}${assignedCharacters.length > 2 ? '...' : ''} removed`
        })
      );

      fetchStatus();
      fetchAvailableCharacters();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to undo quick fill:', err);
      toast.error(t('dojo.undoFailed', { defaultValue: 'Failed to undo. Please try again.' }));
      fetchStatus();
    }
  }, [quickFillResult, fetchStatus, fetchAvailableCharacters, t, toast]);

  // Check if there are empty slots
  const hasEmptySlots = status ? (status.usedSlots || 0) < (status.maxSlots || 3) : false;

  return {
    // Core state
    user,
    setUser,
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

    // Undo functionality
    lastAssignment,
    undoAssignment,
    canUndo: !!lastAssignment,

    // Computed values
    progressPercent,

    // Quick Fill
    quickFilling,
    handleQuickFill,
    hasEmptySlots,
    quickFillResult,
    undoQuickFill,
    canUndoQuickFill: !!quickFillResult,

    // Refresh function for external components
    refreshStatus: fetchStatus,
  };
};

export default useDojoPage;
