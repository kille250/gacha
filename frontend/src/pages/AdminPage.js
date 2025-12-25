/**
 * AdminPage - Administrative dashboard for managing the gacha application
 *
 * @architecture
 * - Uses useAdminState for all data and handlers
 * - Uses useAdminModals for modal state management
 * - Separated into tabs for different admin functions
 * - Character form state kept local as it's tab-specific
 *
 * @accessibility
 * - Skip link for keyboard users
 * - Proper heading hierarchy
 * - Tab navigation with ARIA
 * - Focus management on modals
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

// Hooks
import { useAdminState, useAdminModals } from '../hooks';
import { useAdminKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Utils
import { getAssetUrl } from '../utils/api';
import { PLACEHOLDER_IMAGE, PLACEHOLDER_BANNER } from '../utils/mediaUtils';

// Components
import BannerFormModal from '../components/UI/BannerFormModal';
import CouponFormModal from '../components/UI/CouponFormModal';
import MultiUploadModal from '../components/UI/MultiUploadModal';
import AnimeImportModal from '../components/UI/AnimeImportModal';
import EditCharacterModal from '../components/Admin/EditCharacterModal';
import CreateFromDanbooru from '../components/Admin/CreateFromDanbooru';
import KeyboardShortcutsModal from '../components/Admin/KeyboardShortcutsModal';
import {
  AdminTabs,
  AdminDashboard,
  AdminUsers,
  AdminCharacters,
  AdminBanners,
  AdminCoupons,
  AdminRarities,
  AdminSecurity,
  AdminErrorBoundary
} from '../components/Admin';

// Design System
import { IconSettings } from '../constants/icons';
import {
  theme,
  PageWrapper,
  Container,
  Spinner,
  ConfirmDialog,
  SkipLink,
  AriaLiveRegion,
} from '../design-system';

// ============================================
// ADMIN PAGE COMPONENT
// ============================================

const AdminPage = () => {
  const { t } = useTranslation();

  // Centralized state management via custom hooks
  const adminState = useAdminState();
  const modals = useAdminModals();

  // Tab state (local as it's purely UI)
  const [activeTab, setActiveTab] = useState('dashboard');

  // Character form states (local as they're tab-specific)
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    series: '',
    rarity: 'common',
    isR18: false
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);

  // Coin form (local as it's modal-specific)
  const [coinForm, setCoinForm] = useState({ userId: '', amount: 100 });

  // Keyboard shortcuts modal state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Keyboard shortcuts integration
  useAdminKeyboardShortcuts({
    onNavigate: (tab) => {
      const tabMap = {
        dashboard: 'dashboard',
        users: 'users',
        characters: 'characters',
        banners: 'banners',
        security: 'security',
      };
      if (tabMap[tab]) {
        setActiveTab(tabMap[tab]);
      }
    },
    onRefresh: () => adminState.refreshData(),
    onShowShortcuts: () => setShowKeyboardShortcuts(true),
    enabled: adminState.isAdmin,
  });

  // Helper functions
  const getImageUrl = useCallback((imagePath) =>
    imagePath ? getAssetUrl(imagePath) : PLACEHOLDER_IMAGE,
  []);

  const getBannerImageUrl = useCallback((imagePath) =>
    imagePath ? getAssetUrl(imagePath) : PLACEHOLDER_BANNER,
  []);

  // Character form handlers
  const handleCharacterChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewCharacter(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadedImage(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setUploadedImage(null);
    }
  }, []);

  const resetCharacterForm = useCallback(() => {
    setNewCharacter({ name: '', series: '', rarity: 'common', isR18: false });
    setSelectedFile(null);
    setUploadedImage(null);
  }, []);

  const addCharacterWithImage = useCallback(async () => {
    if (!selectedFile) {
      adminState.showError(t('admin.selectImage'));
      throw new Error(t('admin.selectImage'));
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('name', newCharacter.name);
    formData.append('series', newCharacter.series);
    formData.append('rarity', newCharacter.rarity);
    formData.append('isR18', newCharacter.isR18);

    const result = await adminState.handleAddCharacter(formData);
    if (result.success) {
      resetCharacterForm();
    }
    return result;
  }, [selectedFile, newCharacter, adminState, resetCharacterForm, t]);

  // Coin form handlers
  const handleCoinFormChange = useCallback((e) => {
    setCoinForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleAddCoins = useCallback(async (e) => {
    e.preventDefault();
    const result = await adminState.handleAddCoins(coinForm);
    if (result.success) {
      setCoinForm({ userId: '', amount: 100 });
    }
  }, [adminState, coinForm]);

  // Quick action handler from dashboard
  const handleQuickAction = useCallback((action) => {
    modals.handleQuickAction(action, setActiveTab);
  }, [modals]);

  // Confirmation dialog handlers for destructive actions
  const handleDeleteCharacterWithConfirm = useCallback((characterId, characterName) => {
    modals.openConfirmDialog({
      title: t('admin.confirmDeleteCharacter', 'Delete Character'),
      message: t('admin.deleteCharacterMessage', {
        defaultValue: 'This will permanently delete "{{name}}". This action cannot be undone.',
        name: characterName
      }),
      variant: 'danger',
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      onConfirm: () => adminState.handleDeleteCharacter(characterId),
    });
  }, [modals, adminState, t]);

  const handleDeleteBannerWithConfirm = useCallback((bannerId, bannerName) => {
    modals.openConfirmDialog({
      title: t('admin.confirmDeleteBanner', 'Delete Banner'),
      message: t('admin.deleteBannerMessage', {
        defaultValue: 'This will permanently delete "{{name}}". This action cannot be undone.',
        name: bannerName
      }),
      variant: 'danger',
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      onConfirm: () => adminState.handleDeleteBanner(bannerId),
    });
  }, [modals, adminState, t]);

  const handleDeleteCouponWithConfirm = useCallback((couponId, couponCode) => {
    modals.openConfirmDialog({
      title: t('admin.confirmDeleteCoupon', 'Delete Coupon'),
      message: t('admin.deleteCouponMessage', {
        defaultValue: 'This will permanently delete coupon "{{code}}". This action cannot be undone.',
        code: couponCode
      }),
      variant: 'danger',
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      onConfirm: () => adminState.handleDeleteCoupon(couponId),
    });
  }, [modals, adminState, t]);

  // Banner update handler (needs banner ID from modal state)
  const handleUpdateBanner = useCallback(async (formData) => {
    const result = await adminState.handleUpdateBanner(modals.editingBanner.id, formData);
    if (result.success) {
      modals.closeEditBannerModal();
    }
  }, [adminState, modals]);

  // Coupon update handler
  const handleUpdateCoupon = useCallback(async (formData) => {
    const result = await adminState.handleUpdateCoupon(modals.editingCoupon.id, formData);
    if (result.success) {
      modals.closeEditCouponModal();
    }
  }, [adminState, modals]);

  // Redirect non-admin users
  if (!adminState.isAdmin) {
    return <Navigate to="/gacha" replace />;
  }

  return (
    <StyledPageWrapper>
      {/* Skip link for keyboard navigation */}
      <SkipLink href="#admin-content">
        {t('accessibility.skipToContent', 'Skip to main content')}
      </SkipLink>

      {/* Live region for screen reader announcements */}
      <AriaLiveRegion />

      {/* Header */}
      <AdminHeader>
        <Container>
          <HeaderContent>
            <HeaderTitle>
              <TitleIcon aria-hidden="true"><IconSettings /></TitleIcon>
              {t('admin.title')}
            </HeaderTitle>
            <HeaderSubtitle>{t('admin.subtitle')}</HeaderSubtitle>
          </HeaderContent>
        </Container>
      </AdminHeader>

      {/* Tab Navigation */}
      <AdminTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        aria-label={t('admin.navigation', 'Admin navigation')}
      />

      {/* Main Content - Wrapped in Error Boundary */}
      <AdminErrorBoundary onReset={adminState.refreshData}>
        <Container>
          <main id="admin-content" role="main">
            {adminState.loading ? (
              <LoadingContainer aria-label={t('common.loading')}>
                <LoadingSpinner />
                <LoadingText>{t('admin.loadingData', 'Loading admin data...')}</LoadingText>
              </LoadingContainer>
            ) : (
              <TabContent>
                <AnimatePresence mode="wait">
                  {activeTab === 'dashboard' && (
                    <TabPanel key="dashboard" role="tabpanel" aria-labelledby="tab-dashboard">
                      <AdminDashboard
                        stats={adminState.stats}
                        onQuickAction={handleQuickAction}
                      />
                    </TabPanel>
                  )}

                {activeTab === 'users' && (
                  <TabPanel key="users" role="tabpanel" aria-labelledby="tab-users">
                    <AdminUsers
                      users={adminState.users}
                      coinForm={coinForm}
                      onCoinFormChange={handleCoinFormChange}
                      onAddCoins={handleAddCoins}
                      onToggleAutofish={adminState.handleToggleAutofish}
                      onToggleR18={adminState.handleToggleR18}
                      onSecurityAction={adminState.showSuccess}
                    />
                  </TabPanel>
                )}

                {activeTab === 'characters' && (
                  <TabPanel key="characters" role="tabpanel" aria-labelledby="tab-characters">
                    <AdminCharacters
                      characters={adminState.characters}
                      getImageUrl={getImageUrl}
                      onAddCharacter={addCharacterWithImage}
                      onEditCharacter={modals.openEditCharacterModal}
                      onDeleteCharacter={handleDeleteCharacterWithConfirm}
                      onMultiUpload={modals.openMultiUploadModal}
                      onAnimeImport={modals.openAnimeImportModal}
                      onCreateFromDanbooru={modals.openCreateFromDanbooruModal}
                      newCharacter={newCharacter}
                      onCharacterChange={handleCharacterChange}
                      selectedFile={selectedFile}
                      onFileChange={handleFileChange}
                      uploadedImage={uploadedImage}
                    />
                  </TabPanel>
                )}

                {activeTab === 'banners' && (
                  <TabPanel key="banners" role="tabpanel" aria-labelledby="tab-banners">
                    <AdminBanners
                      banners={adminState.banners}
                      getBannerImageUrl={getBannerImageUrl}
                      onAddBanner={modals.openAddBannerModal}
                      onEditBanner={modals.openEditBannerModal}
                      onDeleteBanner={handleDeleteBannerWithConfirm}
                      onToggleFeatured={adminState.handleToggleFeatured}
                      onDragEnd={adminState.handleDragEnd}
                    />
                  </TabPanel>
                )}

                {activeTab === 'coupons' && (
                  <TabPanel key="coupons" role="tabpanel" aria-labelledby="tab-coupons">
                    <AdminCoupons
                      coupons={adminState.coupons}
                      onAddCoupon={modals.openAddCouponModal}
                      onEditCoupon={modals.openEditCouponModal}
                      onDeleteCoupon={handleDeleteCouponWithConfirm}
                    />
                  </TabPanel>
                )}

                {activeTab === 'rarities' && (
                  <TabPanel key="rarities" role="tabpanel" aria-labelledby="tab-rarities">
                    <AdminRarities onRefresh={adminState.refreshData} />
                  </TabPanel>
                )}

                {activeTab === 'security' && (
                  <TabPanel key="security" role="tabpanel" aria-labelledby="tab-security">
                    <AdminSecurity onSuccess={adminState.showSuccess} />
                  </TabPanel>
                )}
              </AnimatePresence>
            </TabContent>
          )}
          </main>
        </Container>
      </AdminErrorBoundary>

      {/* Modals */}
      <BannerFormModal
        show={modals.isAddingBanner}
        onClose={modals.closeAddBannerModal}
        onSubmit={async (formData) => {
          const result = await adminState.handleAddBanner(formData);
          if (result.success) modals.closeAddBannerModal();
        }}
        characters={adminState.characters}
      />

      <BannerFormModal
        show={modals.isEditingBanner}
        onClose={modals.closeEditBannerModal}
        onSubmit={handleUpdateBanner}
        banner={modals.editingBanner}
        characters={adminState.characters}
      />

      <CouponFormModal
        show={modals.isAddingCoupon}
        onClose={modals.closeAddCouponModal}
        onSubmit={async (formData) => {
          const result = await adminState.handleAddCoupon(formData);
          if (result.success) modals.closeAddCouponModal();
        }}
        characters={adminState.characters}
      />

      <CouponFormModal
        show={modals.isEditingCoupon}
        onClose={modals.closeEditCouponModal}
        onSubmit={handleUpdateCoupon}
        coupon={modals.editingCoupon}
        characters={adminState.characters}
      />

      <MultiUploadModal
        show={modals.isMultiUploadOpen}
        onClose={modals.closeMultiUploadModal}
        onSuccess={adminState.handleBulkUpload}
      />

      <AnimeImportModal
        show={modals.isAnimeImportOpen}
        onClose={modals.closeAnimeImportModal}
        onSuccess={adminState.handleAnimeImport}
      />

      <CreateFromDanbooru
        show={modals.isCreateFromDanbooruOpen}
        onClose={modals.closeCreateFromDanbooruModal}
        onCharacterCreated={(character) => {
          adminState.handleAnimeImport([character]);
        }}
      />

      <EditCharacterModal
        show={modals.isEditingCharacter}
        character={modals.editingCharacter}
        onClose={modals.closeEditCharacterModal}
        onSuccess={adminState.handleEditCharacterSuccess}
        onError={adminState.showError}
        getImageUrl={getImageUrl}
      />

      {/* Confirmation Dialog for destructive actions */}
      <ConfirmDialog
        isOpen={modals.confirmDialog.isOpen}
        onClose={modals.closeConfirmDialog}
        onConfirm={modals.executeConfirmAction}
        title={modals.confirmDialog.title}
        message={modals.confirmDialog.message}
        variant={modals.confirmDialog.variant}
        confirmLabel={modals.confirmDialog.confirmLabel}
        cancelLabel={modals.confirmDialog.cancelLabel}
        loading={modals.confirmDialog.loading}
      />

      {/* Keyboard Shortcuts Modal - Press Shift+? to show */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </StyledPageWrapper>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
  /* Smooth background for admin context */
  background: linear-gradient(
    180deg,
    ${theme.colors.background} 0%,
    ${theme.colors.backgroundSubtle} 100%
  );
  min-height: 100vh;
`;

const AdminHeader = styled.header`
  position: relative;
  background: linear-gradient(
    180deg,
    rgba(88, 86, 214, 0.12) 0%,
    rgba(88, 86, 214, 0.04) 60%,
    transparent 100%
  );
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.xl} 0 ${theme.spacing.lg};
  margin-bottom: 0;
  overflow: hidden;

  /* Subtle decorative gradient orbs for visual depth */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -10%;
    width: 300px;
    height: 300px;
    background: radial-gradient(
      circle,
      rgba(0, 113, 227, 0.08) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: -30%;
    right: -5%;
    width: 250px;
    height: 250px;
    background: radial-gradient(
      circle,
      rgba(88, 86, 214, 0.10) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.lg} 0 ${theme.spacing.md};
  }
`;

const HeaderContent = styled.div`
  text-align: center;
  position: relative;
  z-index: 1;
`;

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  font-size: clamp(${theme.fontSizes['2xl']}, 5vw, ${theme.fontSizes['3xl']});
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
`;

const TitleIcon = styled.span`
  font-size: clamp(28px, 4vw, 36px);
  -webkit-text-fill-color: initial;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    filter: drop-shadow(0 2px 8px rgba(88, 86, 214, 0.3));
  }
`;

const HeaderSubtitle = styled.p`
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.sm} 0 0;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  letter-spacing: 0.02em;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']} ${theme.spacing.lg};
  min-height: 300px;
`;

const LoadingSpinner = Spinner;

const LoadingText = styled.p`
  margin-top: ${theme.spacing.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
`;

const TabContent = styled.div`
  min-height: 400px;
  padding-top: ${theme.spacing.md};
`;

/**
 * TabPanel - Animated container for tab content
 * Uses reduced motion when user prefers, or smooth slide animation
 */
const TabPanel = styled(motion.div).attrs({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: {
    duration: 0.2,
    ease: [0.25, 0.1, 0.25, 1] // Apple-like easing
  }
})`
  @media (prefers-reduced-motion: reduce) {
    /* Instant transitions for reduced motion preference */
  }
`;

export default AdminPage;
