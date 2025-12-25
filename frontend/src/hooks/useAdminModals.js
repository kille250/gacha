/**
 * useAdminModals - Modal state management for the Admin page
 *
 * Centralizes all modal-related state and handlers for the admin interface.
 * Provides a clean API for opening, closing, and managing modal content.
 *
 * @architecture
 * - Each modal type has open/close handlers
 * - Editing modals track the item being edited
 * - Confirmation dialogs for destructive actions
 */

import { useState, useCallback } from 'react';

/**
 * Modal types for type safety and documentation
 */
export const ADMIN_MODAL_TYPES = {
  ADD_BANNER: 'addBanner',
  EDIT_BANNER: 'editBanner',
  ADD_COUPON: 'addCoupon',
  EDIT_COUPON: 'editCoupon',
  EDIT_CHARACTER: 'editCharacter',
  MULTI_UPLOAD: 'multiUpload',
  ANIME_IMPORT: 'animeImport',
  CREATE_FROM_DANBOORU: 'createFromDanbooru',
  CONFIRM_DELETE: 'confirmDelete',
};

/**
 * Admin modals hook with centralized modal state management
 *
 * @returns {Object} Modal state and handlers
 */
export const useAdminModals = () => {
  // Banner modals
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Coupon modals
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  // Character modals
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);

  // Upload modals
  const [isMultiUploadOpen, setIsMultiUploadOpen] = useState(false);
  const [isAnimeImportOpen, setIsAnimeImportOpen] = useState(false);
  const [isCreateFromDanbooruOpen, setIsCreateFromDanbooruOpen] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: null,
    loading: false,
  });

  // ==================== BANNER MODAL HANDLERS ====================

  const openAddBannerModal = useCallback(() => {
    setIsAddingBanner(true);
  }, []);

  const closeAddBannerModal = useCallback(() => {
    setIsAddingBanner(false);
  }, []);

  const openEditBannerModal = useCallback((banner) => {
    setEditingBanner(banner);
    setIsEditingBanner(true);
  }, []);

  const closeEditBannerModal = useCallback(() => {
    setIsEditingBanner(false);
    // Delay clearing the banner to allow animation to complete
    setTimeout(() => setEditingBanner(null), 200);
  }, []);

  // ==================== COUPON MODAL HANDLERS ====================

  const openAddCouponModal = useCallback(() => {
    setIsAddingCoupon(true);
  }, []);

  const closeAddCouponModal = useCallback(() => {
    setIsAddingCoupon(false);
  }, []);

  const openEditCouponModal = useCallback((coupon) => {
    setEditingCoupon(coupon);
    setIsEditingCoupon(true);
  }, []);

  const closeEditCouponModal = useCallback(() => {
    setIsEditingCoupon(false);
    setTimeout(() => setEditingCoupon(null), 200);
  }, []);

  // ==================== CHARACTER MODAL HANDLERS ====================

  const openEditCharacterModal = useCallback((character) => {
    setEditingCharacter(character);
    setIsEditingCharacter(true);
  }, []);

  const closeEditCharacterModal = useCallback(() => {
    setIsEditingCharacter(false);
    setTimeout(() => setEditingCharacter(null), 200);
  }, []);

  // ==================== UPLOAD MODAL HANDLERS ====================

  const openMultiUploadModal = useCallback(() => {
    setIsMultiUploadOpen(true);
  }, []);

  const closeMultiUploadModal = useCallback(() => {
    setIsMultiUploadOpen(false);
  }, []);

  const openAnimeImportModal = useCallback(() => {
    setIsAnimeImportOpen(true);
  }, []);

  const closeAnimeImportModal = useCallback(() => {
    setIsAnimeImportOpen(false);
  }, []);

  const openCreateFromDanbooruModal = useCallback(() => {
    setIsCreateFromDanbooruOpen(true);
  }, []);

  const closeCreateFromDanbooruModal = useCallback(() => {
    setIsCreateFromDanbooruOpen(false);
  }, []);

  // ==================== CONFIRMATION DIALOG HANDLERS ====================

  /**
   * Open a confirmation dialog for destructive actions
   *
   * @param {Object} options - Dialog options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {'danger' | 'warning'} options.variant - Visual variant
   * @param {Function} options.onConfirm - Async callback when confirmed
   * @param {string} options.confirmLabel - Confirm button text
   * @param {string} options.cancelLabel - Cancel button text
   */
  const openConfirmDialog = useCallback(({
    title,
    message,
    variant = 'danger',
    onConfirm,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
  }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      variant,
      onConfirm,
      confirmLabel,
      cancelLabel,
      loading: false,
    });
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
  }, []);

  /**
   * Execute the confirm action with loading state
   */
  const executeConfirmAction = useCallback(async () => {
    if (!confirmDialog.onConfirm) return;

    setConfirmDialog(prev => ({ ...prev, loading: true }));

    try {
      await confirmDialog.onConfirm();
      closeConfirmDialog();
    } catch (error) {
      // Keep dialog open on error, let handler show error toast
      setConfirmDialog(prev => ({ ...prev, loading: false }));
    }
  }, [confirmDialog.onConfirm, closeConfirmDialog]);

  // ==================== QUICK ACTIONS (from Dashboard) ====================

  /**
   * Handle quick actions from the dashboard
   * Opens appropriate modals or navigates to tabs
   *
   * @param {string} action - Action type
   * @param {Function} setActiveTab - Tab setter from parent
   */
  const handleQuickAction = useCallback((action, setActiveTab) => {
    switch (action) {
      case 'character':
        setActiveTab('characters');
        break;
      case 'multiUpload':
        openMultiUploadModal();
        break;
      case 'animeImport':
        openAnimeImportModal();
        break;
      case 'createFromDanbooru':
        openCreateFromDanbooruModal();
        break;
      case 'banner':
        setActiveTab('banners');
        // Delay to allow tab change animation
        setTimeout(openAddBannerModal, 100);
        break;
      case 'coupon':
        setActiveTab('coupons');
        setTimeout(openAddCouponModal, 100);
        break;
      default:
        break;
    }
  }, [openAddBannerModal, openAddCouponModal, openMultiUploadModal, openAnimeImportModal, openCreateFromDanbooruModal]);

  // ==================== CLOSE ALL MODALS ====================

  /**
   * Close all open modals (useful for navigation or escape key)
   */
  const closeAllModals = useCallback(() => {
    closeAddBannerModal();
    closeEditBannerModal();
    closeAddCouponModal();
    closeEditCouponModal();
    closeEditCharacterModal();
    closeMultiUploadModal();
    closeAnimeImportModal();
    closeCreateFromDanbooruModal();
    closeConfirmDialog();
  }, [
    closeAddBannerModal,
    closeEditBannerModal,
    closeAddCouponModal,
    closeEditCouponModal,
    closeEditCharacterModal,
    closeMultiUploadModal,
    closeAnimeImportModal,
    closeCreateFromDanbooruModal,
    closeConfirmDialog,
  ]);

  /**
   * Check if any modal is currently open
   */
  const isAnyModalOpen = isAddingBanner ||
    isEditingBanner ||
    isAddingCoupon ||
    isEditingCoupon ||
    isEditingCharacter ||
    isMultiUploadOpen ||
    isAnimeImportOpen ||
    isCreateFromDanbooruOpen ||
    confirmDialog.isOpen;

  return {
    // Banner modal state
    isAddingBanner,
    isEditingBanner,
    editingBanner,
    openAddBannerModal,
    closeAddBannerModal,
    openEditBannerModal,
    closeEditBannerModal,

    // Coupon modal state
    isAddingCoupon,
    isEditingCoupon,
    editingCoupon,
    openAddCouponModal,
    closeAddCouponModal,
    openEditCouponModal,
    closeEditCouponModal,

    // Character modal state
    isEditingCharacter,
    editingCharacter,
    openEditCharacterModal,
    closeEditCharacterModal,

    // Upload modal state
    isMultiUploadOpen,
    isAnimeImportOpen,
    isCreateFromDanbooruOpen,
    openMultiUploadModal,
    closeMultiUploadModal,
    openAnimeImportModal,
    closeAnimeImportModal,
    openCreateFromDanbooruModal,
    closeCreateFromDanbooruModal,

    // Confirmation dialog
    confirmDialog,
    openConfirmDialog,
    closeConfirmDialog,
    executeConfirmAction,

    // Utilities
    handleQuickAction,
    closeAllModals,
    isAnyModalOpen,
  };
};

export default useAdminModals;
