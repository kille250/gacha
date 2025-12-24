/**
 * useCollection - Composite hook for collection page state management
 *
 * Consolidates:
 * - Data fetching (collection + all characters)
 * - Filter state (rarity, series, ownership, search)
 * - Pagination
 * - Level up actions
 * - Preview modal state
 *
 * Reduces CollectionPage from 15+ useState calls to a single hook.
 */

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { getCollectionData } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useActionLock, useAutoDismissError } from './index';
import { executeLevelUp, executeUpgradeAll } from '../actions/gachaActions';

/**
 * @typedef {Object} FilterState
 * @property {string} rarity - Rarity filter ('all' or rarity name)
 * @property {string} series - Series filter ('all' or series name)
 * @property {string} ownership - Ownership filter ('all', 'owned', 'not-owned')
 * @property {string} search - Search query
 * @property {number} page - Current page number
 * @property {number} perPage - Items per page
 */

/**
 * @typedef {Object} CollectionData
 * @property {Array} collection - User's owned characters with level info
 * @property {Array} allCharacters - All available characters
 * @property {Array} uniqueSeries - Unique series names
 */

const DEFAULT_FILTERS = {
  rarity: 'all',
  series: 'all',
  ownership: 'all',
  search: '',
  page: 1,
  perPage: 24,
};

export function useCollection() {
  const { t } = useTranslation();
  const { setUser } = useContext(AuthContext);
  const { withLock } = useActionLock(200);
  const [error, setError] = useAutoDismissError();

  // Data state
  const [data, setData] = useState({
    collection: [],
    allCharacters: [],
    uniqueSeries: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Preview state
  const [preview, setPreview] = useState({
    isOpen: false,
    character: null,
  });

  // Upgrade all state
  const [isUpgradingAll, setIsUpgradingAll] = useState(false);

  // Fetch collection data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getCollectionData();
      const collection = result.collection || [];
      const allCharacters = result.allCharacters || [];
      const uniqueSeries = [...new Set(allCharacters.map(char => char.series).filter(Boolean))].sort();

      setData({ collection, allCharacters, uniqueSeries });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedLoadDashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [t, setError]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle network disconnect/reconnect
  useEffect(() => {
    const handleOffline = () => {
      setError(t('common.connectionLost') || 'Connection lost. Please check your network.');
    };

    const handleOnline = () => {
      setError(null);
      fetchData();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [t, fetchData, setError]);

  // Owned character IDs set for quick lookup
  const ownedCharIds = useMemo(
    () => new Set(data.collection.map(char => char.id)),
    [data.collection]
  );

  // Character level info map
  const charLevels = useMemo(
    () => new Map(data.collection.map(char => [char.id, {
      level: char.level || 1,
      isMaxLevel: char.isMaxLevel,
      shards: char.shards || 0,
      shardsToNextLevel: char.shardsToNextLevel,
      canLevelUp: char.canLevelUp
    }])),
    [data.collection]
  );

  // Filtered characters
  const filteredCharacters = useMemo(() => {
    let characters = [...data.allCharacters];

    // Ownership filter
    if (filters.ownership === 'owned') {
      characters = characters.filter(char => ownedCharIds.has(char.id));
    } else if (filters.ownership === 'not-owned') {
      characters = characters.filter(char => !ownedCharIds.has(char.id));
    }

    // Rarity filter
    if (filters.rarity !== 'all') {
      characters = characters.filter(char => char.rarity === filters.rarity);
    }

    // Series filter
    if (filters.series !== 'all') {
      characters = characters.filter(char => char.series === filters.series);
    }

    // Search filter
    if (filters.search.trim() !== '') {
      const query = filters.search.toLowerCase();
      characters = characters.filter(char =>
        char.name.toLowerCase().includes(query) ||
        (char.series && char.series.toLowerCase().includes(query))
      );
    }

    return characters;
  }, [data.allCharacters, filters, ownedCharIds]);

  // Pagination
  const totalPages = Math.ceil(filteredCharacters.length / filters.perPage);
  const currentPage = Math.min(filters.page, Math.max(1, totalPages));
  const indexOfLastItem = currentPage * filters.perPage;
  const indexOfFirstItem = indexOfLastItem - filters.perPage;
  const currentCharacters = filteredCharacters.slice(indexOfFirstItem, indexOfLastItem);

  // Stats
  const stats = useMemo(() => ({
    owned: data.collection.length,
    total: data.allCharacters.length,
    completionPercentage: data.allCharacters.length > 0
      ? Math.round((data.collection.length / data.allCharacters.length) * 100)
      : 0,
    upgradableCount: data.collection.filter(char => char.canLevelUp).length,
  }), [data.collection, data.allCharacters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => (
    filters.rarity !== 'all' ||
    filters.series !== 'all' ||
    filters.ownership !== 'all' ||
    filters.search.trim() !== ''
  ), [filters]);

  // Filter setters
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset page when filter changes
      page: key === 'page' || key === 'perPage' ? (key === 'page' ? value : 1) : 1,
    }));
  }, []);

  const setSearch = useCallback((value) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters(prev => ({ ...prev, page: Math.max(1, Math.min(page, totalPages)) }));
  }, [totalPages]);

  const setPerPage = useCallback((perPage) => {
    setFilters(prev => ({ ...prev, perPage, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Preview handlers
  const openPreview = useCallback((character) => {
    setPreview({ isOpen: true, character });
  }, []);

  const closePreview = useCallback(() => {
    setPreview({ isOpen: false, character: null });
  }, []);

  // Level up handler
  const handleLevelUp = useCallback(async (characterId) => {
    await withLock(async () => {
      try {
        const result = await executeLevelUp(characterId, setUser);

        if (result.success) {
          // Update collection state with new level
          setData(prev => ({
            ...prev,
            collection: prev.collection.map(char =>
              char.id === characterId
                ? {
                    ...char,
                    level: result.newLevel,
                    shards: result.shardsRemaining,
                    isMaxLevel: result.isMaxLevel,
                    shardsToNextLevel: result.shardsToNextLevel,
                    canLevelUp: result.shardsToNextLevel && result.shardsRemaining >= result.shardsToNextLevel
                  }
                : char
            )
          }));

          // Update preview character if it's the same one
          if (preview.character?.id === characterId) {
            setPreview(prev => ({
              ...prev,
              character: {
                ...prev.character,
                level: result.newLevel,
                shards: result.shardsRemaining,
                isMaxLevel: result.isMaxLevel,
                shardsToNextLevel: result.shardsToNextLevel,
                canLevelUp: result.shardsToNextLevel && result.shardsRemaining >= result.shardsToNextLevel
              }
            }));
          }
        }
      } catch (err) {
        console.error('Level up failed:', err);
        setError(err.response?.data?.error || t('collection.levelUpFailed') || 'Level up failed. Please try again.');

        // Refresh with retry
        const refreshWithRetry = async (retries = 2) => {
          try {
            await fetchData();
          } catch (refreshErr) {
            console.warn(`Failed to refresh collection (${retries} retries left):`, refreshErr);
            if (retries > 0) {
              setTimeout(() => refreshWithRetry(retries - 1), 1000);
            }
          }
        };
        refreshWithRetry();
      }
    });
  }, [withLock, setUser, preview.character?.id, setError, t, fetchData]);

  // Upgrade all handler
  const handleUpgradeAll = useCallback(async () => {
    if (isUpgradingAll || stats.upgradableCount === 0) return;

    setIsUpgradingAll(true);
    try {
      const result = await executeUpgradeAll();

      if (result.success && result.upgraded > 0) {
        await fetchData();
      }
    } catch (err) {
      console.error('Upgrade all failed:', err);
      setError(err.response?.data?.error || t('collection.upgradeAllFailed') || 'Failed to upgrade characters. Please try again.');
      fetchData();
    } finally {
      setIsUpgradingAll(false);
    }
  }, [isUpgradingAll, stats.upgradableCount, fetchData, setError, t]);

  return {
    // Data
    collection: data.collection,
    allCharacters: data.allCharacters,
    uniqueSeries: data.uniqueSeries,
    filteredCharacters,
    currentCharacters,
    isLoading,
    error,

    // Lookup helpers
    ownedCharIds,
    charLevels,
    isOwned: (charId) => ownedCharIds.has(charId),
    getLevelInfo: (charId) => charLevels.get(charId),

    // Stats
    stats,

    // Filters
    filters,
    hasActiveFilters,
    setFilter,
    setSearch,
    setPage,
    setPerPage,
    clearFilters,

    // Pagination
    totalPages,
    currentPage,

    // Preview
    preview,
    openPreview,
    closePreview,

    // Actions
    handleLevelUp,
    handleUpgradeAll,
    isUpgradingAll,
    refetch: fetchData,
  };
}

export default useCollection;
