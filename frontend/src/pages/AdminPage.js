import React, { useState, useEffect, useContext, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaImage, FaSpinner, FaCheck } from 'react-icons/fa';
import api, { createBanner, updateBanner, deleteBanner, getAssetUrl, getAdminDashboard, clearCache, invalidateAdminCache } from '../utils/api';
import { isVideo, PLACEHOLDER_IMAGE, PLACEHOLDER_BANNER } from '../utils/mediaUtils';
import BannerFormModal from '../components/UI/BannerFormModal';
import CouponFormModal from '../components/UI/CouponFormModal';
import MultiUploadModal from '../components/UI/MultiUploadModal';
import AnimeImportModal from '../components/UI/AnimeImportModal';
import AltMediaPicker from '../components/Admin/AltMediaPicker';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { AdminTabs, AdminDashboard, AdminUsers, AdminCharacters, AdminBanners, AdminCoupons } from '../components/Admin';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  Label,
  Input,
  Select,
  CheckboxLabel,
  ImagePreview,
  PrimaryButton,
  SecondaryButton,
  ButtonRow,
} from '../components/Admin/AdminStyles';
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
  
  // Alt media picker states
  const [showAltMediaPicker, setShowAltMediaPicker] = useState(false);
  const [selectedAltMedia, setSelectedAltMedia] = useState(null);
  const [altMediaSaving, setAltMediaSaving] = useState(false);
  
  // Coin form
  const [coinForm, setCoinForm] = useState({ userId: '', amount: 100 });
  const [coinMessage, setCoinMessage] = useState(null);
  
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
      closeEditCharacterModal();
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

  const closeEditCharacterModal = () => {
    setIsEditingCharacter(false);
    setEditingCharacter(null);
    setEditImageFile(null);
    setEditImagePreview(null);
    setSelectedAltMedia(null);
  };

  // Alt media picker handlers
  const openAltMediaPicker = useCallback(() => {
    if (!editingCharacter) return;
    setShowAltMediaPicker(true);
  }, [editingCharacter]);

  const handleAltMediaSelect = useCallback((media) => {
    setSelectedAltMedia(media);
    setEditImagePreview(media.isAnimated ? media.file : (media.preview || media.file));
    setEditImageFile(null);
    setShowAltMediaPicker(false);
  }, []);

  const handleAltMediaPickerClose = useCallback((clearSelection = false) => {
    setShowAltMediaPicker(false);
    if (clearSelection) {
      setSelectedAltMedia(null);
    }
  }, []);

  const saveAltMediaToCharacter = useCallback(async () => {
    if (!editingCharacter || !selectedAltMedia) return;
    
    setAltMediaSaving(true);
    try {
      await api.put(`/admin/characters/${editingCharacter.id}`, editForm);
      await api.put(`/admin/characters/${editingCharacter.id}/image-url`, {
        imageUrl: selectedAltMedia.file
      });
      
      invalidateAdminCache();
      setSuccessMessage(t('admin.characterUpdated'));
      await fetchAllData();
      closeEditCharacterModal();
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

  // Handle edit image file change
  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    setEditImageFile(file);
    setSelectedAltMedia(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setEditImagePreview(e.target.result);
      reader.readAsDataURL(file);
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
              <NotificationClose onClick={() => setError(null)}>×</NotificationClose>
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
              <NotificationClose onClick={() => setSuccessMessage(null)}>×</NotificationClose>
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
            onClick={closeEditCharacterModal}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle><FaEdit /> Edit: {editingCharacter.name}</ModalTitle>
                <CloseButton onClick={closeEditCharacterModal}>×</CloseButton>
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
                          onChange={handleEditImageChange} 
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
                          selectedAltMedia.isAnimated ? (
                            <video controls src={editImagePreview} autoPlay loop muted />
                          ) : (
                            <img src={editImagePreview} alt="Preview" />
                          )
                        ) : editImageFile ? (
                          isVideo(editImageFile) ? (
                            <video controls src={editImagePreview} autoPlay loop muted />
                          ) : (
                            <img src={editImagePreview} alt="Preview" />
                          )
                        ) : (
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
                      <PrimaryButton type="button" onClick={saveAltMediaToCharacter} disabled={altMediaSaving} style={{ flex: 1 }}>
                        {altMediaSaving ? <><FaSpinner className="spin" /> {t('common.saving') || 'Saving...'}</> : t('admin.saveChanges')}
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton type="submit" style={{ flex: 1 }}>{t('admin.saveChanges')}</PrimaryButton>
                    )}
                    <SecondaryButton type="button" onClick={closeEditCharacterModal} style={{ flex: 1 }}>
                      {t('common.cancel')}
                    </SecondaryButton>
                  </ButtonRow>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Alt Media Picker Modal */}
      <AltMediaPicker
        show={showAltMediaPicker}
        onClose={handleAltMediaPickerClose}
        characterName={editingCharacter?.name}
        onSelectMedia={handleAltMediaSelect}
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

const NotificationClose = styled.button`
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

// Alt Media Picker styled components
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

export default AdminPage;
