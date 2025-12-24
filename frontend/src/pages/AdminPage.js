import React, { useState, useEffect, useContext, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getAssetUrl, getAdminDashboard } from '../utils/api';
import { invalidateFor, CACHE_ACTIONS, onVisibilityChange, REFRESH_INTERVALS, VISIBILITY_CALLBACK_IDS } from '../cache';
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
import { PLACEHOLDER_IMAGE, PLACEHOLDER_BANNER } from '../utils/mediaUtils';
import BannerFormModal from '../components/UI/BannerFormModal';
import CouponFormModal from '../components/UI/CouponFormModal';
import MultiUploadModal from '../components/UI/MultiUploadModal';
import AnimeImportModal from '../components/UI/AnimeImportModal';
import EditCharacterModal from '../components/Admin/EditCharacterModal';
import { AuthContext } from '../context/AuthContext';

// Icon Constants
import { ICON_SETTINGS } from '../constants/icons';
import { useToast } from '../context/ToastContext';
import { Navigate } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { AdminTabs, AdminDashboard, AdminUsers, AdminCharacters, AdminBanners, AdminCoupons, AdminRarities, AdminSecurity } from '../components/Admin';
import { theme, PageWrapper, Container, Spinner } from '../design-system';

const AdminPage = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useContext(AuthContext);
  const toast = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data states
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [banners, setBanners] = useState([]);
  const [coupons, setCoupons] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);

  // Toast helper functions for backwards compatibility
  const showSuccess = useCallback((message) => {
    toast.success(message);
  }, [toast]);

  const showError = useCallback((message) => {
    toast.error(message);
  }, [toast]);
  
  // Modal states
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isMultiUploadOpen, setIsMultiUploadOpen] = useState(false);
  const [isAnimeImportOpen, setIsAnimeImportOpen] = useState(false);
  
  // Character form states
  const [newCharacter, setNewCharacter] = useState({ name: '', series: '', rarity: 'common', isR18: false });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // Edit character state (modal is now a separate component)
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  
  // Coin form
  const [coinForm, setCoinForm] = useState({ userId: '', amount: 100 });
  
  // API stats
  const [apiStats, setApiStats] = useState({ totalFishCaught: 0 });

  // Computed stats for dashboard
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

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAllData();
    }
  }, [user?.isAdmin, fetchAllData]);

  // Visibility change handler - refresh admin data when tab becomes visible after being hidden
  // Uses centralized cacheManager.onVisibilityChange() instead of scattered event listeners
  useEffect(() => {
    if (!user?.isAdmin) return;
    
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.ADMIN_DASHBOARD, (staleLevel, elapsed) => {
      // Refresh if tab was hidden longer than admin staleness threshold
      if (elapsed > REFRESH_INTERVALS.adminStaleThresholdMs) {
        invalidateFor(CACHE_ACTIONS.ADMIN_VISIBILITY_CHANGE);
        fetchAllData();
      }
    });
  }, [user?.isAdmin, fetchAllData]);

  // Helper functions
  const getImageUrl = (imagePath) => imagePath ? getAssetUrl(imagePath) : PLACEHOLDER_IMAGE;
  const getBannerImageUrl = (imagePath) => imagePath ? getAssetUrl(imagePath) : PLACEHOLDER_BANNER;

  // Character handlers
  const handleCharacterChange = (e) => {
    const { name, value } = e.target;
    setNewCharacter(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setUploadedImage(null);
    }
  };

  const addCharacterWithImage = async (e) => {
    // Note: e.preventDefault() is now called by AdminCharacters
    if (!selectedFile) {
      showError(t('admin.selectImage'));
      throw new Error(t('admin.selectImage'));
    }
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('name', newCharacter.name);
      formData.append('series', newCharacter.series);
      formData.append('rarity', newCharacter.rarity);
      formData.append('isR18', newCharacter.isR18);

      // Use centralized action helper for consistent cache invalidation
      await addCharacterAction(formData);

      showSuccess(t('admin.characterAdded'));
      fetchAllData();
      setNewCharacter({ name: '', series: '', rarity: 'common', isR18: false });
      setSelectedFile(null);
      setUploadedImage(null);
    } catch (err) {
      // Check if this is a duplicate error - re-throw for AdminCharacters to handle
      if (err.response?.status === 409 && err.response?.data?.duplicateType) {
        throw err;
      }
      // Other errors - show generic message
      showError(err.response?.data?.error || t('admin.failedAddCharacter'));
      throw err;
    }
  };

  const handleEditCharacter = (character) => {
    setEditingCharacter(character);
    setIsEditingCharacter(true);
  };

  const handleEditCharacterClose = useCallback(() => {
    setIsEditingCharacter(false);
    setEditingCharacter(null);
  }, []);

  const handleEditCharacterSuccess = useCallback((message) => {
    // Cache invalidation handled by adminActions
    invalidateFor(CACHE_ACTIONS.ADMIN_CHARACTER_EDIT);
    showSuccess(message);
    fetchAllData();
  }, [fetchAllData, showSuccess]);

  const handleDeleteCharacter = async (characterId) => {
    if (!window.confirm(t('admin.confirmDeleteCharacter'))) return;
    
    try {
      // Use centralized action helper for consistent cache invalidation
      await deleteCharacterAction(characterId);
      showSuccess(t('admin.characterDeleted'));
      fetchAllData();
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedDeleteCharacter'));
    }
  };

  // Coin handlers
  const handleCoinFormChange = (e) => {
    setCoinForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddCoins = async (e) => {
    e.preventDefault();
    try {
      // Use centralized action helper for consistent cache invalidation
      const result = await addCoinsAction(coinForm, refreshUser, user?.id);
      showSuccess(result.message);
      fetchAllData();
      setCoinForm({ userId: '', amount: 100 });
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to add coins');
    }
  };

  // User toggle handlers
  const handleToggleAutofish = async (userId, enabled) => {
    try {
      // Use centralized action helper for consistent cache invalidation
      const result = await toggleAutofishAction(userId, enabled);
      showSuccess(result.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, autofishEnabled: enabled } : u));
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to toggle autofishing');
    }
  };

  const handleToggleR18 = async (userId, enabled) => {
    try {
      // Use centralized action helper for consistent cache invalidation
      const result = await toggleR18Action(userId, enabled);
      showSuccess(result.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, allowR18: enabled } : u));
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to toggle R18 access');
    }
  };

  // Banner handlers
  const handleAddBanner = async (formData) => {
    try {
      // Use centralized action helper for consistent cache invalidation
      await addBannerAction(formData);
      fetchAllData();
      showSuccess(t('admin.bannerAdded'));
      setIsAddingBanner(false);
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedAddBanner'));
    }
  };

  const handleUpdateBanner = async (formData) => {
    try {
      // Use centralized action helper for consistent cache invalidation
      await editBannerAction(editingBanner.id, formData);
      fetchAllData();
      showSuccess(t('admin.bannerUpdated'));
      setIsEditingBanner(false);
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedUpdateBanner'));
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm(t('admin.confirmDeleteBanner'))) return;
    try {
      // Use centralized action helper for consistent cache invalidation
      await removeBannerAction(bannerId);
      fetchAllData();
      showSuccess(t('admin.bannerDeleted'));
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedDeleteBanner'));
    }
  };

  const handleToggleFeatured = async (banner) => {
    const newFeaturedStatus = !banner.featured;
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, featured: newFeaturedStatus } : b));
    
    try {
      // Use centralized action helper for consistent cache invalidation
      await toggleBannerFeaturedAction(banner.id, newFeaturedStatus);
      showSuccess(`${banner.name} ${newFeaturedStatus ? t('admin.markedAsFeatured') : t('admin.unmarkedAsFeatured')}`);
    } catch (err) {
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, featured: !newFeaturedStatus } : b));
      showError(err.response?.data?.error || t('admin.failedUpdateBanner'));
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = banners.findIndex(b => b.id === active.id);
      const newIndex = banners.findIndex(b => b.id === over.id);
      const newBanners = arrayMove(banners, oldIndex, newIndex);
      setBanners(newBanners);
      
      try {
        // Use centralized action helper for consistent cache invalidation
        await updateBannerOrderAction(newBanners.map(b => b.id));
        showSuccess(t('admin.bannerOrderUpdated'));
      } catch (err) {
        setBanners(banners);
        showError(err.response?.data?.error || t('admin.failedUpdateBannerOrder'));
      }
    }
  };

  // Coupon handlers
  const handleAddCoupon = async (formData) => {
    try {
      // Use centralized action helper for consistent cache invalidation
      await addCouponAction(formData);
      fetchAllData();
      showSuccess(t('admin.couponCreated'));
      setIsAddingCoupon(false);
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedCreateCoupon'));
    }
  };

  const handleUpdateCoupon = async (formData) => {
    try {
      // Use centralized action helper for consistent cache invalidation
      await editCouponAction(editingCoupon.id, formData);
      fetchAllData();
      showSuccess(t('admin.couponUpdated'));
      setIsEditingCoupon(false);
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedUpdateCoupon'));
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm(t('admin.confirmDeleteCoupon'))) return;
    try {
      // Use centralized action helper for consistent cache invalidation
      await removeCouponAction(couponId);
      fetchAllData();
      showSuccess(t('admin.couponDeleted'));
    } catch (err) {
      showError(err.response?.data?.error || t('admin.failedDeleteCoupon'));
    }
  };

  // Quick action handler from dashboard
  const handleQuickAction = (action) => {
    switch (action) {
      case 'character':
        setActiveTab('characters');
        break;
      case 'multiUpload':
        setIsMultiUploadOpen(true);
        break;
      case 'animeImport':
        setIsAnimeImportOpen(true);
        break;
      case 'banner':
        setActiveTab('banners');
        setTimeout(() => setIsAddingBanner(true), 100);
        break;
      case 'coupon':
        setActiveTab('coupons');
        setTimeout(() => setIsAddingCoupon(true), 100);
        break;
      default:
        break;
    }
  };

  if (!user?.isAdmin) {
    return <Navigate to="/gacha" />;
  }

  return (
    <StyledPageWrapper>
      <AdminHeader>
        <Container>
          <HeaderContent>
            <HeaderTitle>
              <TitleIcon>{ICON_SETTINGS}</TitleIcon>
              {t('admin.title')}
            </HeaderTitle>
            <HeaderSubtitle>{t('admin.subtitle')}</HeaderSubtitle>
          </HeaderContent>
        </Container>
      </AdminHeader>
      
      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <Container>
        {/* Loading State */}
        {loading ? (
          <LoadingContainer>
            <LoadingSpinner />
            <LoadingText>Loading admin data...</LoadingText>
          </LoadingContainer>
        ) : (
          <TabContent>
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <TabPanel key="dashboard">
                  <AdminDashboard stats={stats} onQuickAction={handleQuickAction} />
                </TabPanel>
              )}
              
              {activeTab === 'users' && (
                <TabPanel key="users">
                  <AdminUsers 
                    users={users}
                    coinForm={coinForm}
                    onCoinFormChange={handleCoinFormChange}
                    onAddCoins={handleAddCoins}
                    onToggleAutofish={handleToggleAutofish}
                    onToggleR18={handleToggleR18}
                    onSecurityAction={showSuccess}
                  />
                </TabPanel>
              )}
              
              {activeTab === 'characters' && (
                <TabPanel key="characters">
                  <AdminCharacters 
                    characters={characters}
                    getImageUrl={getImageUrl}
                    onAddCharacter={addCharacterWithImage}
                    onEditCharacter={handleEditCharacter}
                    onDeleteCharacter={handleDeleteCharacter}
                    onMultiUpload={() => setIsMultiUploadOpen(true)}
                    onAnimeImport={() => setIsAnimeImportOpen(true)}
                    newCharacter={newCharacter}
                    onCharacterChange={handleCharacterChange}
                    selectedFile={selectedFile}
                    onFileChange={handleFileChange}
                    uploadedImage={uploadedImage}
                  />
                </TabPanel>
              )}
              
              {activeTab === 'banners' && (
                <TabPanel key="banners">
                  <AdminBanners 
                    banners={banners}
                    getBannerImageUrl={getBannerImageUrl}
                    onAddBanner={() => setIsAddingBanner(true)}
                    onEditBanner={(banner) => { setEditingBanner(banner); setIsEditingBanner(true); }}
                    onDeleteBanner={handleDeleteBanner}
                    onToggleFeatured={handleToggleFeatured}
                    onDragEnd={handleDragEnd}
                  />
                </TabPanel>
              )}
              
              {activeTab === 'coupons' && (
                <TabPanel key="coupons">
                  <AdminCoupons 
                    coupons={coupons}
                    onAddCoupon={() => setIsAddingCoupon(true)}
                    onEditCoupon={(coupon) => { setEditingCoupon(coupon); setIsEditingCoupon(true); }}
                    onDeleteCoupon={handleDeleteCoupon}
                  />
                </TabPanel>
              )}
              
              {activeTab === 'rarities' && (
                <TabPanel key="rarities">
                  <AdminRarities onRefresh={fetchAllData} />
                </TabPanel>
              )}
              
              {activeTab === 'security' && (
                <TabPanel key="security">
                  <AdminSecurity onSuccess={showSuccess} />
                </TabPanel>
              )}
            </AnimatePresence>
          </TabContent>
        )}
      </Container>
      
      {/* Modals */}
      <BannerFormModal 
        show={isAddingBanner} 
        onClose={() => setIsAddingBanner(false)} 
        onSubmit={handleAddBanner} 
        characters={characters} 
      />
      <BannerFormModal 
        show={isEditingBanner} 
        onClose={() => setIsEditingBanner(false)} 
        onSubmit={handleUpdateBanner} 
        banner={editingBanner} 
        characters={characters} 
      />
      <CouponFormModal 
        show={isAddingCoupon} 
        onClose={() => setIsAddingCoupon(false)} 
        onSubmit={handleAddCoupon} 
        characters={characters} 
      />
      <CouponFormModal 
        show={isEditingCoupon} 
        onClose={() => setIsEditingCoupon(false)} 
        onSubmit={handleUpdateCoupon} 
        coupon={editingCoupon} 
        characters={characters} 
      />
      <MultiUploadModal 
        show={isMultiUploadOpen} 
        onClose={() => setIsMultiUploadOpen(false)} 
        onSuccess={(result) => { handleBulkUploadSuccess(() => { showSuccess(result.message); fetchAllData(); }, result); }} 
      />
      <AnimeImportModal 
        show={isAnimeImportOpen} 
        onClose={() => setIsAnimeImportOpen(false)} 
        onSuccess={(result) => { handleAnimeImportSuccess(() => { showSuccess(result.message); fetchAllData(); }, result); }} 
      />

      {/* Edit Character Modal */}
      <EditCharacterModal
        show={isEditingCharacter}
        character={editingCharacter}
        onClose={handleEditCharacterClose}
        onSuccess={handleEditCharacterSuccess}
        onError={showError}
        getImageUrl={getImageUrl}
      />
    </StyledPageWrapper>
  );
};

// ============================================
// PAGE-SPECIFIC STYLED COMPONENTS
// ============================================

const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
`;

const AdminHeader = styled.header`
  background: linear-gradient(180deg, rgba(88, 86, 214, 0.1) 0%, transparent 100%);
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.xl} 0;
  margin-bottom: 0;
`;

const HeaderContent = styled.div`
  text-align: center;
`;

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const TitleIcon = styled.span`
  font-size: 36px;
  -webkit-text-fill-color: initial;
`;

const HeaderSubtitle = styled.p`
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.sm} 0 0;
  font-size: ${theme.fontSizes.base};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['4xl']};
`;

// Use shared Spinner from DesignSystem (48px default)
const LoadingSpinner = Spinner;

const LoadingText = styled.p`
  margin-top: ${theme.spacing.lg};
  color: ${theme.colors.textSecondary};
`;

const TabContent = styled.div`
  min-height: 400px;
`;

const TabPanel = styled(motion.div).attrs({
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 }
})``;

export default AdminPage;
