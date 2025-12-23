/**
 * Fishing Equipment Hook
 * 
 * Handles areas and rods - fetching, unlocking, selecting, buying, equipping.
 * Extracted from useFishingModals for better separation of concerns.
 * 
 * USAGE:
 * const equipment = useFishingEquipment({ setUser, showNotification, refreshUser });
 * equipment.selectArea(areaId);
 * equipment.buyRod(rodId);
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { buyRod, equipRod, unlockArea, selectArea, getFishingInfo } from '../actions/fishingActions';
import { getFishingAreas, getFishingRods } from '../utils/api';

/**
 * Hook for managing fishing equipment operations
 * @param {Object} options - Configuration options
 * @param {Function} options.setUser - React state setter for user
 * @param {Function} options.showNotification - Notification display function
 * @param {Function} options.refreshUser - Refresh user data function
 * @param {Function} options.onFishInfoUpdate - Callback when fish info updates
 * @returns {Object} Equipment state and controls
 */
export function useFishingEquipment({
  setUser,
  showNotification,
  refreshUser,
  onFishInfoUpdate,
}) {
  const { t } = useTranslation();
  
  const [areas, setAreas] = useState(null);
  const [rods, setRods] = useState(null);
  const [tab, setTab] = useState('areas');
  const [loading, setLoading] = useState(false);
  
  /**
   * Fetch equipment data (areas and rods)
   */
  const fetchData = useCallback(async () => {
    try {
      const [areasData, rodsData] = await Promise.all([
        getFishingAreas(),
        getFishingRods()
      ]);
      setAreas(areasData);
      setRods(rodsData);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    }
  }, []);
  
  /**
   * Select a fishing area
   * @param {string} areaId - ID of the area to select
   */
  const handleSelectArea = useCallback(async (areaId) => {
    if (loading) return;
    setLoading(true);
    try {
      await selectArea(areaId);
      const [areasData, fishInfoData] = await Promise.all([
        getFishingAreas(),
        getFishingInfo()
      ]);
      setAreas(areasData);
      onFishInfoUpdate?.(fishInfoData);
      
      const areaName = areasData.areas.find(a => a.id === areaId)?.name || areaId;
      showNotification(t('fishing.switchedTo', { area: areaName }), 'success');
    } catch (err) {
      showNotification(err.response?.data?.error || t('fishing.errors.switchAreaFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification, loading, t, onFishInfoUpdate]);
  
  /**
   * Unlock a fishing area
   * @param {string} areaId - ID of the area to unlock
   */
  const handleUnlockArea = useCallback(async (areaId) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await unlockArea(areaId, setUser);
      showNotification(result.message, 'success');
      const [areasData, fishInfoData] = await Promise.all([
        getFishingAreas(),
        getFishingInfo()
      ]);
      setAreas(areasData);
      onFishInfoUpdate?.(fishInfoData);
    } catch (err) {
      showNotification(err.response?.data?.message || t('fishing.errors.unlockAreaFailed'), 'error');
      await refreshUser();
    } finally {
      setLoading(false);
    }
  }, [setUser, showNotification, loading, t, refreshUser, onFishInfoUpdate]);
  
  /**
   * Buy a fishing rod
   * @param {string} rodId - ID of the rod to buy
   */
  const handleBuyRod = useCallback(async (rodId) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await buyRod(rodId, setUser);
      showNotification(result.message, 'success');
      const [rodsData, fishInfoData] = await Promise.all([
        getFishingRods(),
        getFishingInfo()
      ]);
      setRods(rodsData);
      onFishInfoUpdate?.(fishInfoData);
    } catch (err) {
      showNotification(err.response?.data?.message || t('fishing.errors.buyRodFailed'), 'error');
      await refreshUser();
    } finally {
      setLoading(false);
    }
  }, [setUser, showNotification, loading, t, refreshUser, onFishInfoUpdate]);
  
  /**
   * Equip a fishing rod
   * @param {string} rodId - ID of the rod to equip
   */
  const handleEquipRod = useCallback(async (rodId) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await equipRod(rodId);
      showNotification(t('fishing.equippedRod', { rod: result.rod?.name || t('fishing.rods') }), 'success');
      const [rodsData, fishInfoData] = await Promise.all([
        getFishingRods(),
        getFishingInfo()
      ]);
      setRods(rodsData);
      onFishInfoUpdate?.(fishInfoData);
    } catch (err) {
      showNotification(err.response?.data?.message || t('fishing.errors.equipRodFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification, loading, t, onFishInfoUpdate]);
  
  return {
    areas,
    setAreas,
    rods,
    setRods,
    tab,
    setTab,
    loading,
    fetchData,
    selectArea: handleSelectArea,
    unlockArea: handleUnlockArea,
    buyRod: handleBuyRod,
    equipRod: handleEquipRod,
  };
}

export default useFishingEquipment;

