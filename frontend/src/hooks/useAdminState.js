/**
 * useAdminState - Centralized state management for the Admin page
 *
 * Extracts all data state, loading, and handlers from AdminPage
 * to reduce component complexity and improve maintainability.
 *
 * @architecture
 * - Data: users, characters, banners, coupons
 * - API Stats: totalFishCaught, etc.
 * - Computed: stats derived from data
 * - Handlers: CRUD operations for all entities
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { getAdminDashboard } from '../utils/api';
import {
  invalidateFor,
  CACHE_ACTIONS,
  onVisibilityChange,
  REFRESH_INTERVALS,
  VISIBILITY_CALLBACK_IDS
} from '../cache';
import {
  addCharacter as addCharacterAction,
  deleteCharacter as deleteCharacterAction,
  addCoins as addCoinsAction,
  toggleAutofish as toggleAutofishAction,
  toggleR18 as toggleR18Action,
  addBanner as addBannerAction,
  editBanner as editBannerAction,
  removeBanner as removeBannerAction,
  toggleBannerFeatured as toggleBannerFeaturedAction,
  updateBannerOrder as updateBannerOrderAction,
  addCoupon as addCouponAction,
  editCoupon as editCouponAction,
  removeCoupon as removeCouponAction,
  handleBulkUploadSuccess,
  handleAnimeImportSuccess
} from '../actions/adminActions';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Admin state hook with all data management logic
 *
 * @returns {Object} Admin state and handlers
 */
export const useAdminState = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useContext(AuthContext);
  const toast = useToast();

  // Data states
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [banners, setBanners] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [apiStats, setApiStats] = useState({ totalFishCaught: 0 });

  // UI states
  const [loading, setLoading] = useState(true);

  // Track which operations are in progress for optimistic UI
  const [pendingOperations, setPendingOperations] = useState(new Set());

  // Helper to track operation state
  const startOperation = useCallback((opId) => {
    setPendingOperations(prev => new Set([...prev, opId]));
  }, []);

  const endOperation = useCallback((opId) => {
    setPendingOperations(prev => {
      const next = new Set(prev);
      next.delete(opId);
      return next;
    });
  }, []);

  const isOperationPending = useCallback((opId) => {
    return pendingOperations.has(opId);
  }, [pendingOperations]);

  // Toast helpers
  const showSuccess = useCallback((message) => {
    toast.success(message);
  }, [toast]);

  const showError = useCallback((message) => {
    toast.error(message);
  }, [toast]);

  // Computed stats
  const stats = {
    totalUsers: users.length,
    totalCharacters: characters.length,
    activeBanners: banners.filter(b => b.active).length,
    activeCoupons: coupons.filter(c => c.isActive).length,
    totalCoins: users.reduce((sum, u) => sum + (u.points || 0), 0),
    totalFish: apiStats.totalFishCaught || 0,
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminDashboard();
      setUsers(data.users || []);
      setCharacters(data.characters || []);
      setBanners(data.banners || []);
      setCoupons(data.coupons || []);
      setApiStats(data.stats || { totalFishCaught: 0 });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      showError(err.response?.data?.error || t('admin.failedLoadDashboard'));
    } finally {
      setLoading(false);
    }
  }, [t, showError]);

  // Initial data fetch
  useEffect(() => {
    if (user?.isAdmin) {
      fetchAllData();
    }
  }, [user?.isAdmin, fetchAllData]);

  // Visibility change handler - refresh admin data when tab becomes visible
  useEffect(() => {
    if (!user?.isAdmin) return;

    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.ADMIN_DASHBOARD, (staleLevel, elapsed) => {
      if (elapsed > REFRESH_INTERVALS.adminStaleThresholdMs) {
        invalidateFor(CACHE_ACTIONS.ADMIN_VISIBILITY_CHANGE);
        fetchAllData();
      }
    });
  }, [user?.isAdmin, fetchAllData]);

  // ==================== USER HANDLERS ====================

  const handleAddCoins = useCallback(async (coinForm) => {
    const opId = `coins-${coinForm.userId}`;
    startOperation(opId);
    try {
      const result = await addCoinsAction(coinForm, refreshUser, user?.id);
      showSuccess(result.message);
      await fetchAllData();
      return { success: true, message: result.message };
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to add coins');
      return { success: false, error: err.response?.data?.error };
    } finally {
      endOperation(opId);
    }
  }, [refreshUser, user?.id, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleToggleAutofish = useCallback(async (userId, enabled) => {
    const opId = `autofish-${userId}`;
    startOperation(opId);

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, autofishEnabled: enabled } : u));

    try {
      const result = await toggleAutofishAction(userId, enabled);
      showSuccess(result.message);
      return { success: true };
    } catch (err) {
      // Revert on failure
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, autofishEnabled: !enabled } : u));
      showError(err.response?.data?.error || 'Failed to toggle autofishing');
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [showSuccess, showError, startOperation, endOperation]);

  const handleToggleR18 = useCallback(async (userId, enabled) => {
    const opId = `r18-${userId}`;
    startOperation(opId);

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, allowR18: enabled } : u));

    try {
      const result = await toggleR18Action(userId, enabled);
      showSuccess(result.message);
      return { success: true };
    } catch (err) {
      // Revert on failure
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, allowR18: !enabled } : u));
      showError(err.response?.data?.error || 'Failed to toggle R18 access');
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [showSuccess, showError, startOperation, endOperation]);

  // ==================== CHARACTER HANDLERS ====================

  const handleAddCharacter = useCallback(async (formData) => {
    const opId = 'add-character';
    startOperation(opId);
    try {
      await addCharacterAction(formData);
      showSuccess(t('admin.characterAdded'));
      await fetchAllData();
      return { success: true };
    } catch (err) {
      // Check for duplicate error - let caller handle
      if (err.response?.status === 409 && err.response?.data?.duplicateType) {
        endOperation(opId);
        throw err;
      }
      showError(err.response?.data?.error || t('admin.failedAddCharacter'));
      return { success: false, error: err.response?.data?.error };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleDeleteCharacter = useCallback(async (characterId) => {
    const opId = `delete-character-${characterId}`;
    startOperation(opId);
    try {
      await deleteCharacterAction(characterId);
      showSuccess(t('admin.characterDeleted'));
      await fetchAllData();
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedDeleteCharacter'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleEditCharacterSuccess = useCallback((message) => {
    invalidateFor(CACHE_ACTIONS.ADMIN_CHARACTER_EDIT);
    showSuccess(message);
    fetchAllData();
  }, [fetchAllData, showSuccess]);

  // ==================== BANNER HANDLERS ====================

  const handleAddBanner = useCallback(async (formData) => {
    const opId = 'add-banner';
    startOperation(opId);
    try {
      await addBannerAction(formData);
      await fetchAllData();
      showSuccess(t('admin.bannerAdded'));
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedAddBanner'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleUpdateBanner = useCallback(async (bannerId, formData) => {
    const opId = `update-banner-${bannerId}`;
    startOperation(opId);
    try {
      await editBannerAction(bannerId, formData);
      await fetchAllData();
      showSuccess(t('admin.bannerUpdated'));
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedUpdateBanner'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleDeleteBanner = useCallback(async (bannerId) => {
    const opId = `delete-banner-${bannerId}`;
    startOperation(opId);
    try {
      await removeBannerAction(bannerId);
      await fetchAllData();
      showSuccess(t('admin.bannerDeleted'));
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedDeleteBanner'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleToggleFeatured = useCallback(async (banner) => {
    const newFeaturedStatus = !banner.featured;
    const opId = `featured-${banner.id}`;
    startOperation(opId);

    // Optimistic update
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, featured: newFeaturedStatus } : b));

    try {
      await toggleBannerFeaturedAction(banner.id, newFeaturedStatus);
      showSuccess(`${banner.name} ${newFeaturedStatus ? t('admin.markedAsFeatured') : t('admin.unmarkedAsFeatured')}`);
      return { success: true };
    } catch (err) {
      // Revert on failure
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, featured: !newFeaturedStatus } : b));
      showError(err.response?.data?.error || t('admin.failedUpdateBanner'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, startOperation, endOperation]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = banners.findIndex(b => b.id === active.id);
      const newIndex = banners.findIndex(b => b.id === over.id);
      const newBanners = arrayMove(banners, oldIndex, newIndex);
      const oldBanners = banners;

      // Optimistic update
      setBanners(newBanners);

      try {
        await updateBannerOrderAction(newBanners.map(b => b.id));
        showSuccess(t('admin.bannerOrderUpdated'));
        return { success: true };
      } catch (err) {
        // Revert on failure
        setBanners(oldBanners);
        showError(err.response?.data?.error || t('admin.failedUpdateBannerOrder'));
        return { success: false };
      }
    }
    return { success: true };
  }, [banners, t, showSuccess, showError]);

  // ==================== COUPON HANDLERS ====================

  const handleAddCoupon = useCallback(async (formData) => {
    const opId = 'add-coupon';
    startOperation(opId);
    try {
      await addCouponAction(formData);
      await fetchAllData();
      showSuccess(t('admin.couponCreated'));
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedCreateCoupon'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleUpdateCoupon = useCallback(async (couponId, formData) => {
    const opId = `update-coupon-${couponId}`;
    startOperation(opId);
    try {
      await editCouponAction(couponId, formData);
      await fetchAllData();
      showSuccess(t('admin.couponUpdated'));
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedUpdateCoupon'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  const handleDeleteCoupon = useCallback(async (couponId) => {
    const opId = `delete-coupon-${couponId}`;
    startOperation(opId);
    try {
      await removeCouponAction(couponId);
      await fetchAllData();
      showSuccess(t('admin.couponDeleted'));
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedDeleteCoupon'));
      return { success: false };
    } finally {
      endOperation(opId);
    }
  }, [t, showSuccess, showError, fetchAllData, startOperation, endOperation]);

  // ==================== BULK UPLOAD HANDLERS ====================

  const handleBulkUpload = useCallback((result) => {
    handleBulkUploadSuccess(() => {
      showSuccess(result.message);
      fetchAllData();
    }, result);
  }, [showSuccess, fetchAllData]);

  const handleAnimeImport = useCallback((result) => {
    handleAnimeImportSuccess(() => {
      showSuccess(result.message);
      fetchAllData();
    }, result);
  }, [showSuccess, fetchAllData]);

  return {
    // Data
    users,
    characters,
    banners,
    coupons,
    stats,

    // State
    loading,
    isAdmin: user?.isAdmin,
    isOperationPending,

    // Refresh
    refreshData: fetchAllData,

    // User handlers
    handleAddCoins,
    handleToggleAutofish,
    handleToggleR18,

    // Character handlers
    handleAddCharacter,
    handleDeleteCharacter,
    handleEditCharacterSuccess,

    // Banner handlers
    handleAddBanner,
    handleUpdateBanner,
    handleDeleteBanner,
    handleToggleFeatured,
    handleDragEnd,

    // Coupon handlers
    handleAddCoupon,
    handleUpdateCoupon,
    handleDeleteCoupon,

    // Bulk upload handlers
    handleBulkUpload,
    handleAnimeImport,

    // Toast helpers
    showSuccess,
    showError,
  };
};

export default useAdminState;
