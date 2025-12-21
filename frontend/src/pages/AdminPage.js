import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaImage, FaTimes, FaSearch, FaStar, FaSpinner, FaCheck, FaPlay } from 'react-icons/fa';
import api, { createBanner, updateBanner, deleteBanner, getAssetUrl, getAdminDashboard, clearCache, invalidateAdminCache } from '../utils/api';
import { isVideo, PLACEHOLDER_IMAGE, PLACEHOLDER_BANNER } from '../utils/mediaUtils';
import BannerFormModal from '../components/UI/BannerFormModal';
import CouponFormModal from '../components/UI/CouponFormModal';
import MultiUploadModal from '../components/UI/MultiUploadModal';
import AnimeImportModal from '../components/UI/AnimeImportModal';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { AdminTabs, AdminDashboard, AdminUsers, AdminCharacters, AdminBanners, AdminCoupons } from '../components/Admin';
import { theme, PageWrapper, Container } from '../styles/DesignSystem';

const AdminPage = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useContext(AuthContext);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [banners, setBanners] = useState([]);
  const [coupons, setCoupons] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
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
  
  // Edit character states
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', series: '', rarity: 'common', isR18: false });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  
  // Alt media picker states (for editing existing characters)
  const [showAltMediaPicker, setShowAltMediaPicker] = useState(false);
  const [altMediaSearchQuery, setAltMediaSearchQuery] = useState('');
  const [altMediaTags, setAltMediaTags] = useState([]);
  const [altMediaSelectedTag, setAltMediaSelectedTag] = useState(null);
  const [altMediaResults, setAltMediaResults] = useState([]);
  const [altMediaLoading, setAltMediaLoading] = useState(false);
  const [altMediaLoadingMore, setAltMediaLoadingMore] = useState(false);
  const [altMediaSort, setAltMediaSort] = useState('score');
  const [altMediaPage, setAltMediaPage] = useState(1);
  const [altMediaHasMore, setAltMediaHasMore] = useState(false);
  const [altMediaExtraTags, setAltMediaExtraTags] = useState('');
  const [altMediaTypeFilter, setAltMediaTypeFilter] = useState('all');
  const [selectedAltMedia, setSelectedAltMedia] = useState(null);
  const [altMediaSaving, setAltMediaSaving] = useState(false);
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  
  // Coin form
  const [coinForm, setCoinForm] = useState({ userId: '', amount: 100 });
  const [coinMessage, setCoinMessage] = useState(null);
  
  // API stats (from backend)
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
      setError(err.response?.data?.error || t('admin.failedLoadDashboard'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAllData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isAdmin]);

  // Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
    e.preventDefault();
    if (!selectedFile) {
      setError(t('admin.selectImage'));
      return;
    }
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('name', newCharacter.name);
      formData.append('series', newCharacter.series);
      formData.append('rarity', newCharacter.rarity);
      formData.append('isR18', newCharacter.isR18);
      
      await api.post('/admin/characters/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccessMessage(t('admin.characterAdded'));
      fetchAllData();
      setNewCharacter({ name: '', series: '', rarity: 'common', isR18: false });
      setSelectedFile(null);
      setUploadedImage(null);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedAddCharacter'));
    }
  };

  const handleEditCharacter = (character) => {
    setEditingCharacter(character);
    setEditForm({
      name: character.name,
      series: character.series,
      rarity: character.rarity || 'common',
      isR18: character.isR18 || false
    });
    setEditImagePreview(getImageUrl(character.image));
    setIsEditingCharacter(true);
  };

  const handleSaveCharacter = async (e) => {
    e.preventDefault();
    if (!editingCharacter) return;
    
    try {
      await api.put(`/admin/characters/${editingCharacter.id}`, editForm);
      
      if (editImageFile) {
        const formData = new FormData();
        formData.append('image', editImageFile);
        await api.put(`/admin/characters/${editingCharacter.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setSuccessMessage(t('admin.characterUpdated'));
      fetchAllData();
      setIsEditingCharacter(false);
      setEditingCharacter(null);
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedUpdateCharacter'));
    }
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!window.confirm(t('admin.confirmDeleteCharacter'))) return;
    
    try {
      await api.delete(`/admin/characters/${characterId}`);
      setSuccessMessage(t('admin.characterDeleted'));
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedDeleteCharacter'));
    }
  };

  // Alt media picker handlers
  const searchAltMediaTags = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setAltMediaTags([]);
      return;
    }
    
    setAltMediaLoading(true);
    try {
      const response = await api.get(`/anime-import/sakuga-tags?q=${encodeURIComponent(query)}`);
      setAltMediaTags(response.data.tags || []);
    } catch (err) {
      console.error('Tag search failed:', err);
    } finally {
      setAltMediaLoading(false);
    }
  }, []);

  const openAltMediaPicker = useCallback(() => {
    if (!editingCharacter) return;
    
    // Prepare initial search query from character name
    let searchName = editingCharacter.name;
    if (searchName.includes(',')) {
      const parts = searchName.split(',').map(p => p.trim());
      searchName = parts.reverse()[0];
    }
    searchName = searchName.split(' ')[0];
    
    setAltMediaSearchQuery(searchName);
    setAltMediaTags([]);
    setAltMediaSelectedTag(null);
    setAltMediaResults([]);
    setSelectedAltMedia(null);
    setAltMediaExtraTags('');
    setAltMediaTypeFilter('all');
    setShowAltMediaPicker(true);
    
    // Auto-search for tags
    searchAltMediaTags(searchName);
  }, [editingCharacter, searchAltMediaTags]);

  const selectAltMediaTag = useCallback(async (tag, extraTags = '', typeFilter = 'all', page = 1, append = false) => {
    if (!append) {
      setAltMediaSelectedTag(tag);
      setAltMediaLoading(true);
      setAltMediaResults([]);
      setAltMediaPage(1);
    } else {
      setAltMediaLoadingMore(true);
    }
    
    try {
      let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(tag.name)}&sort=${altMediaSort}&page=${page}`;
      if (extraTags.trim()) {
        url += `&extraTags=${encodeURIComponent(extraTags.trim())}`;
      }
      if (typeFilter !== 'all') {
        url += `&typeFilter=${typeFilter}`;
      }
      
      const response = await api.get(url);
      const newResults = response.data.results || [];
      
      if (append) {
        setAltMediaResults(prev => [...prev, ...newResults]);
      } else {
        setAltMediaResults(newResults);
      }
      setAltMediaHasMore(response.data.hasMore || false);
      setAltMediaPage(page);
    } catch (err) {
      console.error('Image search failed:', err);
    } finally {
      setAltMediaLoading(false);
      setAltMediaLoadingMore(false);
    }
  }, [altMediaSort]);

  const changeAltMediaSort = useCallback(async (newSort) => {
    setAltMediaSort(newSort);
    if (altMediaSelectedTag) {
      setAltMediaLoading(true);
      setAltMediaResults([]);
      setAltMediaPage(1);
      try {
        let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(altMediaSelectedTag.name)}&sort=${newSort}&page=1`;
        if (altMediaExtraTags.trim()) {
          url += `&extraTags=${encodeURIComponent(altMediaExtraTags.trim())}`;
        }
        if (altMediaTypeFilter !== 'all') {
          url += `&typeFilter=${altMediaTypeFilter}`;
        }
        const response = await api.get(url);
        setAltMediaResults(response.data.results || []);
        setAltMediaHasMore(response.data.hasMore || false);
      } catch (err) {
        console.error('Image search failed:', err);
      } finally {
        setAltMediaLoading(false);
      }
    }
  }, [altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter]);

  const loadMoreAltMedia = useCallback(() => {
    if (altMediaSelectedTag && altMediaHasMore && !altMediaLoadingMore) {
      selectAltMediaTag(altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, altMediaPage + 1, true);
    }
  }, [altMediaSelectedTag, altMediaHasMore, altMediaLoadingMore, altMediaPage, altMediaExtraTags, altMediaTypeFilter, selectAltMediaTag]);

  const applyExtraFilters = useCallback(() => {
    if (altMediaSelectedTag) {
      selectAltMediaTag(altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, 1, false);
    }
  }, [altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, selectAltMediaTag]);

  const closeAltMediaPicker = useCallback((clearSelection = false) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setHoveredMedia(null);
    setShowAltMediaPicker(false);
    setAltMediaResults([]);
    setAltMediaTags([]);
    setAltMediaSelectedTag(null);
    setAltMediaSearchQuery('');
    setAltMediaPage(1);
    setAltMediaHasMore(false);
    setAltMediaExtraTags('');
    setAltMediaTypeFilter('all');
    // Only clear selectedAltMedia if explicitly requested (e.g., when canceling)
    if (clearSelection) {
      setSelectedAltMedia(null);
    }
  }, []);

  const selectAltMedia = useCallback((media) => {
    setSelectedAltMedia(media);
    // For animated content, use the actual file URL so the video plays
    // For static images, use preview (higher quality thumbnail) or file
    setEditImagePreview(media.isAnimated ? media.file : (media.preview || media.file));
    setEditImageFile(null); // Clear local file if alt media is selected
  }, []);

  const saveAltMediaToCharacter = useCallback(async () => {
    if (!editingCharacter || !selectedAltMedia) return;
    
    setAltMediaSaving(true);
    try {
      // Save metadata first
      await api.put(`/admin/characters/${editingCharacter.id}`, editForm);
      
      // Then save the image from URL
      await api.put(`/admin/characters/${editingCharacter.id}/image-url`, {
        imageUrl: selectedAltMedia.file
      });
      
      // Clear cache to ensure fresh data
      invalidateAdminCache();
      
      setSuccessMessage(t('admin.characterUpdated'));
      await fetchAllData();
      setIsEditingCharacter(false);
      setSelectedAltMedia(null);
      setEditingCharacter(null);
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedUpdateCharacter'));
    } finally {
      setAltMediaSaving(false);
    }
  }, [editingCharacter, selectedAltMedia, editForm, t, fetchAllData]);

  // Coin handlers
  const handleCoinFormChange = (e) => {
    setCoinForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddCoins = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/add-coins', coinForm);
      setCoinMessage(response.data.message);
      fetchAllData();
      if (coinForm.userId === user?.id) await refreshUser();
      setCoinForm({ userId: '', amount: 100 });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add coins');
    }
  };

  // User toggle handlers
  const handleToggleAutofish = async (userId, enabled) => {
    try {
      const response = await api.post('/fishing/admin/toggle-autofish', { userId, enabled });
      setSuccessMessage(response.data.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, autofishEnabled: enabled } : u));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle autofishing');
    }
  };

  const handleToggleR18 = async (userId, enabled) => {
    try {
      const response = await api.post('/admin/toggle-r18', { userId, enabled });
      setSuccessMessage(response.data.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, allowR18: enabled } : u));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle R18 access');
    }
  };

  // Banner handlers
  const handleAddBanner = async (formData) => {
    try {
      await createBanner(formData);
      fetchAllData();
      setSuccessMessage(t('admin.bannerAdded'));
      setIsAddingBanner(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedAddBanner'));
    }
  };

  const handleUpdateBanner = async (formData) => {
    try {
      await updateBanner(editingBanner.id, formData);
      fetchAllData();
      setSuccessMessage(t('admin.bannerUpdated'));
      setIsEditingBanner(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedUpdateBanner'));
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm(t('admin.confirmDeleteBanner'))) return;
    try {
      await deleteBanner(bannerId);
      fetchAllData();
      setSuccessMessage(t('admin.bannerDeleted'));
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedDeleteBanner'));
    }
  };

  const handleToggleFeatured = async (banner) => {
    const newFeaturedStatus = !banner.featured;
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, featured: newFeaturedStatus } : b));
    
    try {
      await api.patch(`/banners/${banner.id}/featured`, { featured: newFeaturedStatus });
      setSuccessMessage(`${banner.name} ${newFeaturedStatus ? t('admin.markedAsFeatured') : t('admin.unmarkedAsFeatured')}`);
    } catch (err) {
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, featured: !newFeaturedStatus } : b));
      setError(err.response?.data?.error || t('admin.failedUpdateBanner'));
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
        await api.post('/banners/update-order', { bannerOrder: newBanners.map(b => b.id) });
        setSuccessMessage(t('admin.bannerOrderUpdated'));
      } catch (err) {
        setBanners(banners);
        setError(err.response?.data?.error || t('admin.failedUpdateBannerOrder'));
      }
    }
  };

  // Coupon handlers
  const handleAddCoupon = async (formData) => {
    try {
      await api.post('/coupons/admin', formData);
      clearCache('/coupons');
      fetchAllData();
      setSuccessMessage(t('admin.couponCreated'));
      setIsAddingCoupon(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedCreateCoupon'));
    }
  };

  const handleUpdateCoupon = async (formData) => {
    try {
      await api.put(`/coupons/admin/${editingCoupon.id}`, formData);
      clearCache('/coupons');
      fetchAllData();
      setSuccessMessage(t('admin.couponUpdated'));
      setIsEditingCoupon(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedUpdateCoupon'));
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm(t('admin.confirmDeleteCoupon'))) return;
    try {
      await api.delete(`/coupons/admin/${couponId}`);
      clearCache('/coupons');
      fetchAllData();
      setSuccessMessage(t('admin.couponDeleted'));
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedDeleteCoupon'));
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
              <TitleIcon>⚙️</TitleIcon>
              {t('admin.title')}
            </HeaderTitle>
            <HeaderSubtitle>{t('admin.subtitle')}</HeaderSubtitle>
          </HeaderContent>
        </Container>
      </AdminHeader>
      
      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <Container>
        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <Notification 
              $variant="error" 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
            >
              <span>{error}</span>
              <CloseBtn onClick={() => setError(null)}>×</CloseBtn>
            </Notification>
          )}
          {successMessage && (
            <Notification 
              $variant="success" 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
            >
              <span>{successMessage}</span>
              <CloseBtn onClick={() => setSuccessMessage(null)}>×</CloseBtn>
            </Notification>
          )}
        </AnimatePresence>
        
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
                    coinMessage={coinMessage}
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
        onSuccess={(result) => { setSuccessMessage(result.message); fetchAllData(); }} 
      />
      <AnimeImportModal 
        show={isAnimeImportOpen} 
        onClose={() => setIsAnimeImportOpen(false)} 
        onSuccess={(result) => { setSuccessMessage(result.message); fetchAllData(); }} 
      />

      {/* Edit Character Modal */}
      <AnimatePresence>
        {isEditingCharacter && editingCharacter && (
          <ModalOverlay 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setIsEditingCharacter(false)}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle><FaEdit /> Edit: {editingCharacter.name}</ModalTitle>
                <CloseBtn onClick={() => setIsEditingCharacter(false)}>×</CloseBtn>
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSaveCharacter}>
                  <FormGroup>
                    <Label>{t('admin.name')}</Label>
                    <Input 
                      type="text" 
                      name="name" 
                      value={editForm.name} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                      required 
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('admin.series')}</Label>
                    <Input 
                      type="text" 
                      name="series" 
                      value={editForm.series} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, series: e.target.value }))} 
                      required 
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('admin.rarity')}</Label>
                    <Select 
                      name="rarity" 
                      value={editForm.rarity} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, rarity: e.target.value }))}
                    >
                      <option value="common">{t('gacha.common')}</option>
                      <option value="uncommon">{t('gacha.uncommon')}</option>
                      <option value="rare">{t('gacha.rare')}</option>
                      <option value="epic">{t('gacha.epic')}</option>
                      <option value="legendary">{t('gacha.legendary')}</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <CheckboxLabel>
                      <input 
                        type="checkbox" 
                        checked={editForm.isR18} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, isR18: e.target.checked }))} 
                      />
                      <span>🔞 {t('admin.r18Content')}</span>
                    </CheckboxLabel>
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('admin.imageVideo')}</Label>
                    <ImageOptionsRow>
                      <FileInputWrapper>
                        <Input 
                          type="file" 
                          accept="image/*,video/mp4,video/webm" 
                          onChange={(e) => {
                            const file = e.target.files[0];
                            setEditImageFile(file);
                            setSelectedAltMedia(null); // Clear alt media when local file is selected
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => setEditImagePreview(e.target.result);
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </FileInputWrapper>
                      <AltImageButton type="button" onClick={openAltMediaPicker}>
                        <FaImage /> {t('animeImport.findAltImage') || 'Find Alt Image'}
                      </AltImageButton>
                    </ImageOptionsRow>
                    {selectedAltMedia && (
                      <SelectedAltInfo>
                        <FaCheck /> {t('animeImport.altImageSelected') || 'Alternative image selected from Danbooru'}
                      </SelectedAltInfo>
                    )}
                    {editImagePreview && (
                      <ImagePreview>
                        {selectedAltMedia ? (
                          // Alt media selected - check if it's animated
                          selectedAltMedia.isAnimated ? (
                            <video controls src={editImagePreview} autoPlay loop muted />
                          ) : (
                            <img src={editImagePreview} alt="Preview" />
                          )
                        ) : editImageFile ? (
                          // Local file selected - check if it's a video
                          isVideo(editImageFile) ? (
                            <video controls src={editImagePreview} autoPlay loop muted />
                          ) : (
                            <img src={editImagePreview} alt="Preview" />
                          )
                        ) : (
                          // No new selection - show original character image
                          isVideo(editingCharacter.image) ? (
                            <video controls src={editImagePreview} autoPlay loop muted />
                          ) : (
                            <img src={editImagePreview} alt="Preview" />
                          )
                        )}
                      </ImagePreview>
                    )}
                  </FormGroup>
                  <ButtonRow>
                    {selectedAltMedia ? (
                      <SubmitButton type="button" onClick={saveAltMediaToCharacter} disabled={altMediaSaving}>
                        {altMediaSaving ? <><FaSpinner className="spin" /> {t('common.saving') || 'Saving...'}</> : t('admin.saveChanges')}
                      </SubmitButton>
                    ) : (
                      <SubmitButton type="submit">{t('admin.saveChanges')}</SubmitButton>
                    )}
                    <CancelButton type="button" onClick={() => setIsEditingCharacter(false)}>
                      {t('common.cancel')}
                    </CancelButton>
                  </ButtonRow>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Alt Media Picker Modal */}
      <AnimatePresence>
        {showAltMediaPicker && (
          <AltMediaOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => closeAltMediaPicker(true)}
          >
            <AltMediaModal
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onMouseDown={e => e.stopPropagation()}
            >
              <AltMediaHeader>
                <h3><FaImage /> {t('animeImport.findAltImageFor', { name: editingCharacter?.name }) || `Find Alt Image for ${editingCharacter?.name}`}</h3>
                <AltMediaCloseButton onClick={() => closeAltMediaPicker(true)}><FaTimes /></AltMediaCloseButton>
              </AltMediaHeader>
              
              <AltMediaBody>
                {/* Tag Search */}
                <AltMediaSearchRow>
                  <AltMediaSearchInput
                    type="text"
                    placeholder={t('animeImport.searchTagPlaceholder') || 'Search for character tag...'}
                    value={altMediaSearchQuery}
                    onChange={e => {
                      setAltMediaSearchQuery(e.target.value);
                      searchAltMediaTags(e.target.value);
                    }}
                  />
                  {altMediaSelectedTag && (
                    <AltMediaSortSelect
                      value={altMediaSort}
                      onChange={e => changeAltMediaSort(e.target.value)}
                    >
                      <option value="score">{t('animeImport.sortScore') || 'By Score'}</option>
                      <option value="favorites">{t('animeImport.sortFavorites') || 'By Favorites'}</option>
                      <option value="newest">{t('animeImport.sortNewest') || 'Newest'}</option>
                    </AltMediaSortSelect>
                  )}
                </AltMediaSearchRow>

                {/* Tag Suggestions */}
                {!altMediaSelectedTag && altMediaTags.length > 0 && (
                  <AltMediaTagList>
                    <AltMediaTagLabel>{t('animeImport.selectTag') || 'Select a tag:'}</AltMediaTagLabel>
                    {altMediaTags.map(tag => (
                      <AltMediaTagChip
                        key={tag.name}
                        onClick={() => selectAltMediaTag(tag)}
                        $category={tag.category}
                      >
                        <span>{tag.displayName}</span>
                        <AltMediaTagMeta>
                          <span>{tag.category === 4 ? '👤' : tag.category === 3 ? '📺' : '🏷️'}</span>
                          <span>{tag.count.toLocaleString()}</span>
                        </AltMediaTagMeta>
                      </AltMediaTagChip>
                    ))}
                  </AltMediaTagList>
                )}

                {/* Selected Tag Info */}
                {altMediaSelectedTag && (
                  <>
                    <SelectedTagBar>
                      <SelectedTagName>
                        {altMediaSelectedTag.category === 4 ? '👤' : altMediaSelectedTag.category === 3 ? '📺' : '🏷️'}
                        {altMediaSelectedTag.displayName}
                      </SelectedTagName>
                      <SmallButton onClick={() => {
                        setAltMediaSelectedTag(null);
                        setAltMediaResults([]);
                        setAltMediaExtraTags('');
                        setAltMediaTypeFilter('all');
                      }}>
                        {t('animeImport.changeTag') || 'Change Tag'}
                      </SmallButton>
                    </SelectedTagBar>
                    
                    {/* Extra Filters Row */}
                    <AltMediaFilterRow>
                      <AltMediaExtraTagsInput
                        type="text"
                        placeholder={t('animeImport.extraTagsPlaceholder') || 'Additional tags (e.g. solo, 1girl)'}
                        value={altMediaExtraTags}
                        onChange={e => setAltMediaExtraTags(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applyExtraFilters()}
                      />
                      <AltMediaTypeSelect
                        value={altMediaTypeFilter}
                        onChange={e => setAltMediaTypeFilter(e.target.value)}
                      >
                        <option value="all">{t('animeImport.typeAll') || 'All Types'}</option>
                        <option value="animated">{t('animeImport.typeAnimated') || 'Animated Only'}</option>
                        <option value="static">{t('animeImport.typeStatic') || 'Static Only'}</option>
                      </AltMediaTypeSelect>
                      <FilterApplyButton onClick={applyExtraFilters}>
                        <FaSearch /> {t('animeImport.applyFilters') || 'Apply'}
                      </FilterApplyButton>
                    </AltMediaFilterRow>
                  </>
                )}

                {/* Results */}
                {altMediaLoading ? (
                  <LoadingTextCenter><FaSpinner className="spin" /> {t('animeImport.searchingVideos') || 'Searching...'}</LoadingTextCenter>
                ) : altMediaSelectedTag && altMediaResults.length === 0 ? (
                  <EmptyText>{t('animeImport.noVideosFound') || 'No results found'}</EmptyText>
                ) : altMediaResults.length > 0 ? (
                  <>
                    <AltMediaResultsInfo>
                      {t('animeImport.showingResults') || 'Showing'} {altMediaResults.length} {t('animeImport.results') || 'results'}
                      {altMediaHasMore && ` (${t('animeImport.moreAvailable') || 'more available'})`}
                    </AltMediaResultsInfo>
                    <AltMediaGrid>
                      {altMediaResults.map(media => (
                        <AltMediaCard
                          key={media.id}
                          onClick={() => {
                            if (longPressTriggered.current) {
                              longPressTriggered.current = false;
                              return;
                            }
                            selectAltMedia(media);
                            closeAltMediaPicker();
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                            setHoveredMedia(media);
                          }}
                          onMouseLeave={() => setHoveredMedia(null)}
                          onTouchStart={(e) => {
                            longPressTriggered.current = false;
                            const rect = e.currentTarget.getBoundingClientRect();
                            longPressTimer.current = setTimeout(() => {
                              longPressTriggered.current = true;
                              setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                              setHoveredMedia(media);
                            }, 500);
                          }}
                          onTouchEnd={() => {
                            if (longPressTimer.current) {
                              clearTimeout(longPressTimer.current);
                              longPressTimer.current = null;
                            }
                            if (longPressTriggered.current) {
                              setTimeout(() => setHoveredMedia(null), 100);
                            }
                          }}
                          onTouchMove={() => {
                            if (longPressTimer.current) {
                              clearTimeout(longPressTimer.current);
                              longPressTimer.current = null;
                            }
                            setHoveredMedia(null);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          $isAnimated={media.isAnimated}
                        >
                          <img src={media.preview} alt={`Option ${media.id}`} />
                          <AltMediaFormat $isAnimated={media.isAnimated}>
                            {media.isAnimated ? <><FaPlay /> {media.fileExt?.toUpperCase()}</> : media.fileExt?.toUpperCase()}
                          </AltMediaFormat>
                          <AltMediaScore>
                            <FaStar /> {media.score}
                          </AltMediaScore>
                          <AltMediaSelectOverlay>
                            <FaCheck /> {t('animeImport.selectThis') || 'Select'}
                          </AltMediaSelectOverlay>
                        </AltMediaCard>
                      ))}
                    </AltMediaGrid>
                    
                    {/* Hover Preview */}
                    <AnimatePresence>
                      {hoveredMedia && (
                        <HoverPreviewContainer
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            left: Math.min(hoverPosition.x, window.innerWidth - 340),
                            top: Math.max(hoverPosition.y - 280, 10)
                          }}
                        >
                          {hoveredMedia.isAnimated ? (
                            <HoverPreviewVideo src={hoveredMedia.file} autoPlay loop muted playsInline />
                          ) : (
                            <HoverPreviewImage src={hoveredMedia.file} alt="Preview" />
                          )}
                          <HoverPreviewInfo>
                            <span><FaStar /> {hoveredMedia.score}</span>
                            <span>{hoveredMedia.fileExt?.toUpperCase()}</span>
                          </HoverPreviewInfo>
                        </HoverPreviewContainer>
                      )}
                    </AnimatePresence>
                    {altMediaHasMore && (
                      <LoadMoreButton onClick={loadMoreAltMedia} disabled={altMediaLoadingMore}>
                        {altMediaLoadingMore ? (
                          <><FaSpinner className="spin" /> {t('animeImport.loadingMore') || 'Loading...'}</>
                        ) : (
                          <>{t('animeImport.loadMore') || 'Load More'}</>
                        )}
                      </LoadMoreButton>
                    )}
                  </>
                ) : !altMediaSelectedTag && altMediaTags.length === 0 && !altMediaLoading ? (
                  <EmptyText>{t('animeImport.typeToSearch') || 'Type to search for character tags'}</EmptyText>
                ) : null}
              </AltMediaBody>
              
              <AltMediaFooter>
                <SourceNote>{t('animeImport.danbooru') || 'Images from Danbooru'}</SourceNote>
                <SmallButton onClick={() => closeAltMediaPicker(true)}>{t('common.cancel')}</SmallButton>
              </AltMediaFooter>
            </AltMediaModal>
          </AltMediaOverlay>
        )}
      </AnimatePresence>
    </StyledPageWrapper>
  );
};

// Styled Components
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

const Notification = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  background: ${props => props.$variant === 'error' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(52, 199, 89, 0.15)'};
  border: 1px solid ${props => props.$variant === 'error' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 199, 89, 0.3)'};
  color: ${props => props.$variant === 'error' ? theme.colors.error : theme.colors.success};
  font-weight: ${theme.fontWeights.medium};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.7;
  
  &:hover { opacity: 1; }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['4xl']};
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid ${theme.colors.surfaceBorder};
  border-top-color: ${theme.colors.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

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

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.md};
`;

const ModalContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const ModalTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  
  svg { color: ${theme.colors.primary}; }
`;

const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  cursor: pointer;
  
  input { width: 18px; height: 18px; }
  span { color: ${theme.colors.error}; font-weight: ${theme.fontWeights.medium}; }
`;

const ImagePreview = styled.div`
  margin-top: ${theme.spacing.md};
  
  img, video {
    max-width: 100%;
    max-height: 200px;
    border-radius: ${theme.radius.md};
    border: 1px solid ${theme.colors.surfaceBorder};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

const SubmitButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.bold};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  
  &:hover { opacity: 0.9; }
`;

const CancelButton = styled.button`
  flex: 1;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  
  &:hover { background: ${theme.colors.surface}; }
`;

// Alt Media Picker Styled Components
const ImageOptionsRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: stretch;
`;

const FileInputWrapper = styled.div`
  flex: 1;
`;

const AltImageButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(155, 89, 182, 0.3);
  }
`;

const SelectedAltInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(46, 204, 113, 0.15);
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
`;

const AltMediaOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
`;

const AltMediaModal = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(155, 89, 182, 0.3);
`;

const AltMediaHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    margin: 0;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
    
    svg { color: #9b59b6; }
  }
`;

const AltMediaCloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #aaa;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
`;

const AltMediaBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 200px;
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const AltMediaSearchRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
`;

const AltMediaSearchInput = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #9b59b6;
  }
  
  &::placeholder { color: #666; }
`;

const AltMediaSortSelect = styled.select`
  background: rgba(155, 89, 182, 0.2);
  border: 1px solid rgba(155, 89, 182, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #9b59b6;
  }
  
  option {
    background: #1a1a2e;
    color: #fff;
  }
`;

const AltMediaTagList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
`;

const AltMediaTagLabel = styled.span`
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const AltMediaTagChip = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => 
    props.$category === 4 ? 'rgba(46, 204, 113, 0.15)' : 
    props.$category === 3 ? 'rgba(52, 152, 219, 0.15)' : 
    'rgba(255, 255, 255, 0.08)'};
  border: 1px solid ${props => 
    props.$category === 4 ? 'rgba(46, 204, 113, 0.3)' : 
    props.$category === 3 ? 'rgba(52, 152, 219, 0.3)' : 
    'rgba(255, 255, 255, 0.15)'};
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  
  &:hover {
    background: ${props => 
      props.$category === 4 ? 'rgba(46, 204, 113, 0.25)' : 
      props.$category === 3 ? 'rgba(52, 152, 219, 0.25)' : 
      'rgba(255, 255, 255, 0.12)'};
    transform: translateX(4px);
  }
`;

const AltMediaTagMeta = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 0.8rem;
`;

const SelectedTagBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(155, 89, 182, 0.15);
  border: 1px solid rgba(155, 89, 182, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 15px;
`;

const SelectedTagName = styled.span`
  color: #fff;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SmallButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
`;

const AltMediaFilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
`;

const AltMediaExtraTagsInput = styled.input`
  flex: 1;
  min-width: 150px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 0.85rem;
  
  &:focus {
    outline: none;
    border-color: #9b59b6;
  }
  
  &::placeholder { color: #666; }
`;

const AltMediaTypeSelect = styled.select`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #9b59b6;
  }
  
  option {
    background: #1a1a2e;
    color: #fff;
  }
`;

const FilterApplyButton = styled.button`
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  border: none;
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(155, 89, 182, 0.3);
  }
`;

const LoadingTextCenter = styled.p`
  color: #888;
  text-align: center;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const EmptyText = styled.p`
  color: #666;
  text-align: center;
  padding: 30px;
`;

const AltMediaResultsInfo = styled.div`
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 10px;
`;

const AltMediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const AltMediaCard = styled(motion.div)`
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => props.$isAnimated ? 'rgba(155, 89, 182, 0.5)' : 'transparent'};
  transition: border-color 0.2s;
  
  &:hover {
    border-color: #9b59b6;
  }
  
  img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
  }
`;

const AltMediaFormat = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  background: ${props => props.$isAnimated 
    ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' 
    : 'rgba(0, 0, 0, 0.7)'};
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const AltMediaScore = styled.div`
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffc107;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const AltMediaSelectOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(155, 89, 182, 0.9));
  color: #fff;
  padding: 20px 8px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${AltMediaCard}:hover & {
    opacity: 1;
  }
`;

const LoadMoreButton = styled.button`
  width: 100%;
  background: rgba(155, 89, 182, 0.2);
  border: 1px solid rgba(155, 89, 182, 0.4);
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    background: rgba(155, 89, 182, 0.3);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HoverPreviewContainer = styled(motion.div)`
  position: fixed;
  z-index: 2000;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(155, 89, 182, 0.4);
  transform: translateX(-50%);
  pointer-events: none;
  max-width: 320px;
  max-height: 280px;
`;

const HoverPreviewImage = styled.img`
  display: block;
  max-width: 300px;
  max-height: 240px;
  width: auto;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
`;

const HoverPreviewVideo = styled.video`
  display: block;
  max-width: 300px;
  max-height: 240px;
  width: auto;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
`;

const HoverPreviewInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px 2px;
  color: #aaa;
  font-size: 0.75rem;
  
  span {
    display: flex;
    align-items: center;
    gap: 4px;
    
    svg {
      color: #ffc107;
      font-size: 10px;
    }
  }
`;

const AltMediaFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SourceNote = styled.span`
  display: inline-block;
  color: #888;
  font-size: 0.75rem;
`;

export default AdminPage;
