/**
 * useCollectionPage - Hook for Collection page logic
 *
 * Encapsulates all data fetching, filtering, and actions for the Collection page.
 * This reduces the page component to pure rendering concerns.
 */

import { useState, useCallback, useContext, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError } from './index';
import { getCollectionData, getAssetUrl } from '../utils/api';
import { isVideo, PLACEHOLDER_IMAGE } from '../utils/mediaUtils';
import { executeLevelUp, executeUpgradeAll } from '../actions/gachaActions';

/**
 * useCollectionPage Hook
 *
 * @returns {Object} Collection page state and handlers
 */
export function useCollectionPage() {
  const { t } = useTranslation();
  const { setUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();
  const { withLock } = useActionLock(200);

  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();

  // Data state
  const [collection, setCollection] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uniqueSeries, setUniqueSeries] = useState([]);

  // Filter state
  const [rarityFilter, setRarityFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [isUpgradingAll, setIsUpgradingAll] = useState(false);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);

  // Fetch collection data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCollectionData();
      setCollection(data.collection || []);
      setAllCharacters(data.allCharacters || []);
      const allSeries = [...new Set((data.allCharacters || []).map(char => char.series).filter(Boolean))].sort();
      setUniqueSeries(allSeries);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedLoadDashboard'));
      setLoading(false);
    }
  }, [t, setError]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Network status handling
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

  // Derived data - memoized to prevent recreating on every render
  const ownedCharIds = useMemo(() => new Set(collection.map(char => char.id)), [collection]);

  const charLevels = useMemo(() => new Map(collection.map(char => [char.id, {
    level: char.level || 1,
    isMaxLevel: char.isMaxLevel,
    shards: char.shards || 0,
    shardsToNextLevel: char.shardsToNextLevel,
    canLevelUp: char.canLevelUp
  }])), [collection]);

  // Filtering logic
  const getFilteredCharacters = useCallback(() => {
    let characters = [...allCharacters];

    if (ownershipFilter === 'owned') {
      characters = characters.filter(char => ownedCharIds.has(char.id));
    } else if (ownershipFilter === 'not-owned') {
      characters = characters.filter(char => !ownedCharIds.has(char.id));
    }

    if (rarityFilter !== 'all') {
      characters = characters.filter(char => char.rarity === rarityFilter);
    }

    if (seriesFilter !== 'all') {
      characters = characters.filter(char => char.series === seriesFilter);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      characters = characters.filter(char =>
        char.name.toLowerCase().includes(query) ||
        (char.series && char.series.toLowerCase().includes(query))
      );
    }

    return characters;
  }, [allCharacters, ownedCharIds, ownershipFilter, rarityFilter, seriesFilter, searchQuery]);

  const filteredCharacters = getFilteredCharacters();
  const totalPages = Math.ceil(filteredCharacters.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCharacters = filteredCharacters.slice(indexOfFirstItem, indexOfLastItem);

  const ownedCount = collection.length;
  const totalCount = allCharacters.length;
  const completionPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  const upgradableCount = collection.filter(char => char.canLevelUp).length;

  const hasActiveFilters = rarityFilter !== 'all' || seriesFilter !== 'all' || ownershipFilter !== 'all' || searchQuery.trim() !== '';

  // Handlers
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleItemsPerPageChange = useCallback((value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, newPage)));
  }, [totalPages]);

  const handleFilterChange = useCallback((filterType, value) => {
    switch (filterType) {
      case 'rarity':
        setRarityFilter(value);
        break;
      case 'series':
        setSeriesFilter(value);
        break;
      case 'ownership':
        setOwnershipFilter(value);
        break;
      default:
        break;
    }
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setRarityFilter('all');
    setSeriesFilter('all');
    setOwnershipFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const openPreview = useCallback((character) => {
    setPreviewChar(character);
    setPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const handleLevelUp = useCallback(async (characterId) => {
    await withLock(async () => {
      try {
        const result = await executeLevelUp(characterId, setUser);

        if (result.success) {
          setCollection(prev => prev.map(char =>
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
          ));

          if (previewChar?.id === characterId) {
            setPreviewChar(prev => ({
              ...prev,
              level: result.newLevel,
              shards: result.shardsRemaining,
              isMaxLevel: result.isMaxLevel,
              shardsToNextLevel: result.shardsToNextLevel,
              canLevelUp: result.shardsToNextLevel && result.shardsRemaining >= result.shardsToNextLevel
            }));
          }
        }
      } catch (err) {
        console.error('Level up failed:', err);
        setError(err.response?.data?.error || t('collection.levelUpFailed') || 'Level up failed. Please try again.');
        fetchData();
      }
    });
  }, [withLock, setUser, previewChar, setError, t, fetchData]);

  const handleUpgradeAll = useCallback(async () => {
    if (isUpgradingAll || upgradableCount === 0) return;

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
  }, [isUpgradingAll, upgradableCount, fetchData, setError, t]);

  // Utility functions
  const getImagePath = useCallback((imageSrc) => {
    if (!imageSrc) return PLACEHOLDER_IMAGE;
    return getAssetUrl(imageSrc);
  }, []);

  const isCharacterOwned = useCallback((charId) => {
    return ownedCharIds.has(charId);
  }, [ownedCharIds]);

  const getLevelInfo = useCallback((charId) => {
    return charLevels.get(charId) || { level: 1, isMaxLevel: false, shards: 0 };
  }, [charLevels]);

  return {
    // Data
    collection,
    allCharacters,
    currentCharacters,
    filteredCharacters,
    uniqueSeries,
    loading,
    error,

    // Stats
    ownedCount,
    totalCount,
    completionPercentage,
    upgradableCount,

    // Pagination
    currentPage,
    totalPages,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,

    // Filters
    searchQuery,
    rarityFilter,
    seriesFilter,
    ownershipFilter,
    showFilters,
    setShowFilters,
    hasActiveFilters,
    handleSearchChange,
    handleFilterChange,
    clearFilters,

    // Preview
    previewOpen,
    previewChar,
    openPreview,
    closePreview,

    // Actions
    handleLevelUp,
    handleUpgradeAll,
    isUpgradingAll,
    refetch: fetchData,

    // Utilities
    getImagePath,
    isCharacterOwned,
    getLevelInfo,
    isVideo,
    getRarityColor,
    getRarityGlow,
  };
}

export default useCollectionPage;
