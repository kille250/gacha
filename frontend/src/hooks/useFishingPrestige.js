/**
 * Fishing Prestige Hook
 * 
 * Handles prestige data fetching and claim operations.
 * Extracted from useFishingModals for better separation of concerns.
 * 
 * USAGE:
 * const prestige = useFishingPrestige({ showNotification, refreshUser });
 * prestige.claim();
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { claimPrestige, getFishingPrestige } from '../actions/fishingActions';

/**
 * Hook for managing fishing prestige operations
 * @param {Object} options - Configuration options
 * @param {Function} options.showNotification - Notification display function
 * @param {Function} options.refreshUser - Refresh user data function
 * @returns {Object} Prestige state and controls
 */
export function useFishingPrestige({
  showNotification,
  refreshUser,
}) {
  const { t } = useTranslation();
  
  const [data, setData] = useState(null);
  const [claiming, setClaiming] = useState(false);
  
  /**
   * Fetch prestige data from server
   */
  const fetchData = useCallback(async () => {
    try {
      const prestigeData = await getFishingPrestige();
      setData(prestigeData);
    } catch (err) {
      console.error('Failed to fetch prestige data:', err);
    }
  }, []);
  
  /**
   * Claim prestige level
   */
  const claim = useCallback(async () => {
    setClaiming(true);
    try {
      const result = await claimPrestige();
      
      // Optimistic update
      setData(prev => ({
        ...prev,
        currentLevel: result.newLevel,
        currentName: result.levelName,
        currentEmoji: result.levelEmoji,
        currentBonuses: result.newBonuses,
        canPrestige: false
      }));
      
      showNotification(result.message, 'success');
      
      // Refresh with fresh data
      const freshData = await getFishingPrestige();
      setData(freshData);
      await refreshUser();
    } catch (err) {
      showNotification(err.response?.data?.message || t('fishing.errors.claimFailed'), 'error');
    } finally {
      setClaiming(false);
    }
  }, [showNotification, t, refreshUser]);
  
  return {
    data,
    setData,
    claiming,
    fetchData,
    claim,
  };
}

export default useFishingPrestige;

