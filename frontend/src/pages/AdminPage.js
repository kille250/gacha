import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaVideo, FaTicketAlt, FaCalendarAlt, FaCloudUploadAlt, FaCoins, FaUsers, FaImage, FaEdit, FaTrash, FaSearch, FaDownload, FaGripVertical } from 'react-icons/fa';
import api, { createBanner, updateBanner, deleteBanner, getAssetUrl, getAdminDashboard, invalidateAdminCache, clearCache } from '../utils/api';
import BannerFormModal from '../components/UI/BannerFormModal';
import CouponFormModal from '../components/UI/CouponFormModal';
import MultiUploadModal from '../components/UI/MultiUploadModal';
import AnimeImportModal from '../components/UI/AnimeImportModal';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  theme,
  PageWrapper,
  Container,
  getRarityColor
} from '../styles/DesignSystem';

// Sortable Banner Item Component
const SortableBannerItem = ({ banner, index, getBannerImageUrl, onToggleFeatured, onEdit, onDelete, t }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <BannerListItem ref={setNodeRef} style={style} $isDragging={isDragging}>
      <DragHandle {...attributes} {...listeners}>
        <FaGripVertical />
      </DragHandle>
      <BannerOrderNum>{index + 1}</BannerOrderNum>
      <BannerThumb src={getBannerImageUrl(banner.image)} alt={banner.name} />
      <BannerItemInfo>
        <BannerItemName>{banner.name}</BannerItemName>
        <BannerItemMeta>{banner.series} • {banner.Characters?.length || 0} chars</BannerItemMeta>
      </BannerItemInfo>
      <BannerItemTags>
        <FeaturedToggleBtn 
          $isFeatured={banner.featured}
          onClick={() => onToggleFeatured(banner)}
        >
          {banner.featured ? '⭐ Featured' : '☆ Feature'}
        </FeaturedToggleBtn>
        <StatusTag active={banner.active}>{banner.active ? 'Active' : 'Inactive'}</StatusTag>
      </BannerItemTags>
      <BannerItemActions>
        <ActionBtn onClick={() => onEdit(banner)}><FaEdit /></ActionBtn>
        <ActionBtn danger onClick={() => onDelete(banner.id)}><FaTrash /></ActionBtn>
      </BannerItemActions>
    </BannerListItem>
  );
};

const AdminPage = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [banners, setBanners] = useState([]);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isMultiUploadOpen, setIsMultiUploadOpen] = useState(false);
  const [isAnimeImportOpen, setIsAnimeImportOpen] = useState(false);

  // Filtered and paginated characters
  const filteredCharacters = characters.filter(character => {
    const query = searchQuery.toLowerCase();
    return (
      character.name.toLowerCase().includes(query) ||
      character.series.toLowerCase().includes(query)
    );
  });
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCharacters = filteredCharacters.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCharacters.length / itemsPerPage);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, newPage)));
  };

  // Edit Character State
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    series: '',
    rarity: 'common',
    isR18: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  // New character fields
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    series: '',
    rarity: 'common',
    isR18: false
  });

  // Coin management
  const [coinForm, setCoinForm] = useState({
    userId: '',
    amount: 100
  });
  const [coinMessage, setCoinMessage] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch all admin data in a single request
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const data = await getAdminDashboard();
      setUsers(data.users || []);
      setCharacters(data.characters || []);
      setBanners(data.banners || []);
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.error || t('admin.failedLoadDashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAllData();
    }
  }, [user]);

  // Individual refresh functions (for after mutations)
  const refreshData = async () => {
    invalidateAdminCache();
    await fetchAllData();
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedLoadUsers'));
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await api.get('/characters');
      setCharacters(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedLoadCharacters'));
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await api.get('/banners?showAll=true');
      setBanners(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedLoadBanners'));
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons/admin');
      setCoupons(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedLoadCoupons'));
    }
  };

  // Character Functions
  const handleCharacterChange = (e) => {
    setNewCharacter({
      ...newCharacter,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedImage(null);
    }
  };

  const addCharacterWithImage = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
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
      fetchCharacters();
      
      setNewCharacter({
        name: '',
        series: '',
        rarity: 'common',
        isR18: false
      });
      setSelectedFile(null);
      setUploadedImage(null);
      
      const fileInput = document.getElementById('character-image');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Error adding character:', err);
      setError(err.response?.data?.error || t('admin.failedAddCharacter'));
    }
  };

  // Edit Character Functions
  const handleEditCharacter = (character) => {
    setEditingCharacter(character);
    setEditForm({
      name: character.name,
      series: character.series,
      rarity: character.rarity || 'common',
      isR18: character.isR18 || false
    });
    setEditImagePreview(getImageUrl(character.image));
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
    setEditingCharacter(null);
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleEditFormChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    setEditImageFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setEditImagePreview(editingCharacter ? getImageUrl(editingCharacter.image) : null);
    }
  };

  const handleSaveCharacter = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
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
      fetchCharacters();
      handleCloseEdit();
    } catch (err) {
      console.error('Error updating character:', err);
      setError(err.response?.data?.error || t('admin.failedUpdateCharacter'));
    }
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!window.confirm(t('admin.confirmDeleteCharacter'))) {
      return;
    }
    
    setError(null);
    setSuccessMessage(null);
    
    try {
      await api.delete(`/admin/characters/${characterId}`);
      setSuccessMessage(t('admin.characterDeleted'));
      fetchCharacters();
    } catch (err) {
      console.error('Error deleting character:', err);
      setError(err.response?.data?.error || t('admin.failedDeleteCharacter'));
    }
  };

  // Coins Functions
  const handleCoinFormChange = (e) => {
    setCoinForm({
      ...coinForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddCoins = async (e) => {
    e.preventDefault();
    setCoinMessage(null);
    setError(null);
    
    try {
      const response = await api.post('/admin/add-coins', coinForm);
      setCoinMessage(response.data.message);
      await fetchUsers();
      
      if (coinForm.userId === user?.id) {
        await refreshUser();
      }
      
      setCoinForm({
        userId: '',
        amount: 100
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add coins');
    }
  };

  // Autofish Functions
  const handleToggleAutofish = async (userId, enabled) => {
    try {
      const response = await api.post('/fishing/admin/toggle-autofish', { userId, enabled });
      setSuccessMessage(response.data.message);
      
      // Update local state
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, autofishEnabled: enabled } : u
      ));
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling autofish:', err);
      setError(err.response?.data?.error || 'Failed to toggle autofishing');
    }
  };

  // R18 Toggle Functions
  const handleToggleR18 = async (userId, enabled) => {
    try {
      const response = await api.post('/admin/toggle-r18', { userId, enabled });
      setSuccessMessage(response.data.message);
      
      // Update local state
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, allowR18: enabled } : u
      ));
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling R18:', err);
      setError(err.response?.data?.error || 'Failed to toggle R18 access');
    }
  };

  // Banner Functions
  const getBannerImageUrl = (imagePath) => {
    if (!imagePath) return 'https://via.placeholder.com/300x150?text=Banner';
    return getAssetUrl(imagePath);
  };

  const handleEditBanner = (banner) => {
    setEditingBanner(banner);
    setIsEditingBanner(true);
  };

  const handleAddBanner = async (formData) => {
    try {
      setSuccessMessage(null);
      setError(null);
      await createBanner(formData);
      await fetchBanners();
      setSuccessMessage(t('admin.bannerAdded'));
      setIsAddingBanner(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedAddBanner'));
    }
  };

  const handleUpdateBanner = async (formData) => {
    try {
      setSuccessMessage(null);
      setError(null);
      await updateBanner(editingBanner.id, formData);
      await fetchBanners();
      setSuccessMessage(t('admin.bannerUpdated'));
      setIsEditingBanner(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedUpdateBanner'));
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm(t('admin.confirmDeleteBanner'))) {
      return;
    }
    
    try {
      setSuccessMessage(null);
      setError(null);
      await deleteBanner(bannerId);
      await fetchBanners();
      setSuccessMessage(t('admin.bannerDeleted'));
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedDeleteBanner'));
    }
  };

  // Banner drag-and-drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms touch hold before drag starts
        tolerance: 5, // 5px movement allowed during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = banners.findIndex(b => b.id === active.id);
      const newIndex = banners.findIndex(b => b.id === over.id);
      
      const newBanners = arrayMove(banners, oldIndex, newIndex);
      setBanners(newBanners);
      
      // Save new order to backend
      try {
        await api.post('/banners/update-order', {
          bannerOrder: newBanners.map(b => b.id)
        });
        setSuccessMessage(t('admin.bannerOrderUpdated'));
      } catch (err) {
        // Revert on error
        setBanners(banners);
        setError(err.response?.data?.error || t('admin.failedUpdateBannerOrder'));
      }
    }
  };

  const handleToggleFeatured = async (banner) => {
    const newFeaturedStatus = !banner.featured;
    
    // Update local state immediately for responsive UI
    setBanners(prev => prev.map(b => 
      b.id === banner.id ? { ...b, featured: newFeaturedStatus } : b
    ));
    
    try {
      setSuccessMessage(null);
      setError(null);
      await api.patch(`/banners/${banner.id}/featured`, {
        featured: newFeaturedStatus
      });
      setSuccessMessage(`${banner.name} ${newFeaturedStatus ? t('admin.markedAsFeatured') : t('admin.unmarkedAsFeatured')}`);
    } catch (err) {
      // Revert on error
      setBanners(prev => prev.map(b => 
        b.id === banner.id ? { ...b, featured: !newFeaturedStatus } : b
      ));
      setError(err.response?.data?.error || t('admin.failedUpdateBanner'));
    }
  };

  // Coupon Functions
  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setIsEditingCoupon(true);
  };

  const handleAddCoupon = async (formData) => {
    try {
      setSuccessMessage(null);
      setError(null);
      await api.post('/coupons/admin', formData);
      clearCache('/coupons');
      await fetchCoupons();
      setSuccessMessage(t('admin.couponCreated'));
      setIsAddingCoupon(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedCreateCoupon'));
    }
  };

  const handleUpdateCoupon = async (formData) => {
    try {
      setSuccessMessage(null);
      setError(null);
      await api.put(`/coupons/admin/${editingCoupon.id}`, formData);
      clearCache('/coupons');
      await fetchCoupons();
      setSuccessMessage(t('admin.couponUpdated'));
      setIsEditingCoupon(false);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedUpdateCoupon'));
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm(t('admin.confirmDeleteCoupon'))) {
      return;
    }
    
    try {
      setSuccessMessage(null);
      setError(null);
      await api.delete(`/coupons/admin/${couponId}`);
      clearCache('/coupons');
      await fetchCoupons();
      setSuccessMessage(t('admin.couponDeleted'));
    } catch (err) {
      setError(err.response?.data?.error || t('admin.failedDeleteCoupon'));
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
    return getAssetUrl(imagePath);
  };

  const isVideo = (file) => {
    if (!file) return false;
    if (file.type && file.type.startsWith('video/')) return true;
    if (typeof file === 'string') {
      const lowerCasePath = file.toLowerCase();
      return lowerCasePath.endsWith('.mp4') || lowerCasePath.endsWith('.webm') || lowerCasePath.includes('video');
    }
    return false;
  };

  if (!user?.isAdmin) {
    return <Navigate to="/gacha" />;
  }

  return (
    <StyledPageWrapper>
      <Container>
        <AdminHeader>
          <HeaderTitle>{t('admin.title')}</HeaderTitle>
          <HeaderSubtitle>{t('admin.subtitle')}</HeaderSubtitle>
        </AdminHeader>
        
        <AnimatePresence>
          {error && (
            <AlertBox variant="error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {error}
              <CloseBtn onClick={() => setError(null)}>×</CloseBtn>
            </AlertBox>
          )}
          {successMessage && (
            <AlertBox variant="success" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {successMessage}
              <CloseBtn onClick={() => setSuccessMessage(null)}>×</CloseBtn>
            </AlertBox>
          )}
        </AnimatePresence>
        
        <AdminGrid>
          {/* Add Coins Section */}
          <AdminSection>
            <SectionTitle><FaCoins /> {t('admin.addCoins')}</SectionTitle>
            <form onSubmit={handleAddCoins}>
              <FormGroup>
                <Label>{t('admin.selectUser')}</Label>
                <Select name="userId" value={coinForm.userId} onChange={handleCoinFormChange} required>
                  <option value="">{t('admin.selectUserPlaceholder')}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.points} coins)</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.amount')}</Label>
                <Input type="number" name="amount" min="1" max="10000" value={coinForm.amount} onChange={handleCoinFormChange} required />
              </FormGroup>
              <SubmitButton type="submit"><FaCoins /> {t('admin.addCoins')}</SubmitButton>
            </form>
            {coinMessage && <SuccessText>{coinMessage}</SuccessText>}
          </AdminSection>
          
          {/* Add Character Section */}
          <AdminSection>
            <SectionTitle><FaImage /> {t('admin.addCharacter')}</SectionTitle>
            <UploadButtonsRow>
              <MultiUploadBtn onClick={() => setIsMultiUploadOpen(true)}>
                <FaCloudUploadAlt /> {t('admin.multiUpload')}
              </MultiUploadBtn>
              <AnimeImportBtn onClick={() => setIsAnimeImportOpen(true)}>
                <FaDownload /> {t('admin.animeImport')}
              </AnimeImportBtn>
            </UploadButtonsRow>
            <form onSubmit={addCharacterWithImage}>
              <FormGroup>
                <Label>{t('admin.name')}</Label>
                <Input type="text" name="name" value={newCharacter.name} onChange={handleCharacterChange} required />
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.series')}</Label>
                <Input type="text" name="series" value={newCharacter.series} onChange={handleCharacterChange} required />
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rarity')}</Label>
                <Select name="rarity" value={newCharacter.rarity} onChange={handleCharacterChange}>
                  <option value="common">{t('gacha.common')}</option>
                  <option value="uncommon">{t('gacha.uncommon')}</option>
                  <option value="rare">{t('gacha.rare')}</option>
                  <option value="epic">{t('gacha.epic')}</option>
                  <option value="legendary">{t('gacha.legendary')}</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <CheckboxLabel>
                  <input type="checkbox" checked={newCharacter.isR18} onChange={(e) => setNewCharacter({...newCharacter, isR18: e.target.checked})} />
                  <span>🔞 {t('admin.r18Content')}</span>
                </CheckboxLabel>
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.imageVideo')}</Label>
                <Input type="file" id="character-image" accept="image/*,video/mp4,video/webm" onChange={handleFileChange} required />
                {uploadedImage && !isVideo(selectedFile) && (
                  <ImagePreview><img src={uploadedImage} alt="Preview" /></ImagePreview>
                )}
                {uploadedImage && isVideo(selectedFile) && (
                  <ImagePreview><video controls src={uploadedImage} /></ImagePreview>
                )}
              </FormGroup>
              <SubmitButton type="submit"><FaImage /> {t('admin.addCharacter')}</SubmitButton>
            </form>
          </AdminSection>
        </AdminGrid>
        
        {/* User Management */}
        <AdminSection>
          <SectionTitle><FaUsers /> {t('admin.userManagement')}</SectionTitle>
          {loading ? (
            <LoadingText>{t('admin.loadingUsers')}</LoadingText>
          ) : (
            <TableWrapper>
              <StyledTable>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('admin.username')}</th>
                    <th>{t('admin.points')}</th>
                    <th>{t('admin.isAdmin')}</th>
                    <th>🔞 R18</th>
                    <th>{t('admin.autofish')}</th>
                    <th>{t('admin.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => {
                    const rank = index + 1;
                    const qualifiesByRank = rank <= 10;
                    const canAutofish = u.autofishEnabled || qualifiesByRank;
                    return (
                      <tr key={u.id}>
                        <td>
                          <RankCell $qualifies={qualifiesByRank}>
                            {qualifiesByRank ? '👑' : ''} #{rank}
                          </RankCell>
                        </td>
                        <td>{u.username}</td>
                        <td>{u.points?.toLocaleString()}</td>
                        <td>{u.isAdmin ? '✅' : '❌'}</td>
                        <td>
                          <R18Cell>
                            <R18Status $active={u.allowR18}>
                              {u.allowR18 ? '✅' : '❌'}
                            </R18Status>
                            <R18Toggle 
                              $enabled={u.allowR18}
                              onClick={() => handleToggleR18(u.id, !u.allowR18)}
                              title={u.allowR18 ? t('admin.disableR18') : t('admin.enableR18')}
                            >
                              {u.allowR18 ? 'Disable' : 'Enable'}
                            </R18Toggle>
                          </R18Cell>
                        </td>
                        <td>
                          <AutofishCell>
                            <AutofishStatus $active={canAutofish}>
                              {canAutofish ? '✅' : '❌'}
                            </AutofishStatus>
                            {qualifiesByRank && (
                              <AutofishBadge $type="rank">Top 10</AutofishBadge>
                            )}
                            {u.autofishEnabled && !qualifiesByRank && (
                              <AutofishBadge $type="manual">Manual</AutofishBadge>
                            )}
                            <AutofishToggle 
                              $enabled={u.autofishEnabled}
                              onClick={() => handleToggleAutofish(u.id, !u.autofishEnabled)}
                              title={u.autofishEnabled ? t('admin.disableAutofish') : t('admin.enableAutofish')}
                            >
                              {u.autofishEnabled ? 'Disable' : 'Enable'}
                            </AutofishToggle>
                          </AutofishCell>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </StyledTable>
            </TableWrapper>
          )}
        </AdminSection>
        
        {/* Character Management */}
        <AdminSection>
          <SectionHeader>
            <SectionTitle><FaUsers /> {t('admin.characterManagement')}</SectionTitle>
            <SearchRow>
              <SearchWrapper>
                <FaSearch />
                <SearchInput type="text" placeholder="Search..." value={searchQuery} onChange={handleSearchChange} />
              </SearchWrapper>
              <Select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                <option value="10">{t('admin.itemsPerPage', { count: 10 })}</option>
                <option value="20">{t('admin.itemsPerPage', { count: 20 })}</option>
                <option value="50">{t('admin.itemsPerPage', { count: 50 })}</option>
              </Select>
            </SearchRow>
          </SectionHeader>
          
          {currentCharacters.length === 0 ? (
            <EmptyMessage>{t('admin.noCharactersFound')}</EmptyMessage>
          ) : (
            <>
              <CharacterGrid>
                {currentCharacters.map(char => (
                  <CharacterCard key={char.id}>
                    {isVideo(char.image) ? (
                      <video autoPlay loop muted playsInline>
                        <source src={getImageUrl(char.image)} type={char.image.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                      </video>
                    ) : (
                      <img src={getImageUrl(char.image)} alt={char.name} onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }} />
                    )}
                    <CharacterInfo>
                      <CharacterName>{char.name} {char.isR18 && <R18Badge>🔞</R18Badge>}</CharacterName>
                      <CharacterSeries>{char.series}</CharacterSeries>
                      <RarityTag rarity={char.rarity}>{char.rarity}</RarityTag>
                      <CardActions>
                        <ActionBtn onClick={() => handleEditCharacter(char)}><FaEdit /> {t('common.edit')}</ActionBtn>
                        <ActionBtn danger onClick={() => handleDeleteCharacter(char.id)}><FaTrash /> {t('common.delete')}</ActionBtn>
                      </CardActions>
                    </CharacterInfo>
                  </CharacterCard>
                ))}
              </CharacterGrid>
              
              <Pagination>
                <PaginationBtn onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>{t('common.previous')}</PaginationBtn>
                <PageInfo>{t('common.page')} {currentPage} {t('common.of')} {totalPages}</PageInfo>
                <PaginationBtn onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>{t('common.next')}</PaginationBtn>
              </Pagination>
            </>
          )}
        </AdminSection>
        
        {/* Banner Management */}
        <AdminSection>
          <SectionHeader>
            <SectionTitle><FaImage /> {t('admin.bannerManagement')}</SectionTitle>
            <AddButton onClick={() => setIsAddingBanner(true)}><FaPlus /> {t('admin.addBanner')}</AddButton>
          </SectionHeader>
          
          <DragHint>💡 {t('admin.dragToReorder')}</DragHint>
          
          {banners.length === 0 ? (
            <EmptyMessage>{t('admin.noBannersFound')}</EmptyMessage>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={banners.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <BannerList>
                  {banners.map((banner, index) => (
                    <SortableBannerItem
                      key={banner.id}
                      banner={banner}
                      index={index}
                      getBannerImageUrl={getBannerImageUrl}
                      onToggleFeatured={handleToggleFeatured}
                      onEdit={handleEditBanner}
                      onDelete={handleDeleteBanner}
                      t={t}
                    />
                  ))}
                </BannerList>
              </SortableContext>
            </DndContext>
          )}
        </AdminSection>
        
        {/* Coupon Management */}
        <AdminSection>
          <SectionHeader>
            <SectionTitle><FaTicketAlt /> {t('admin.couponManagement')}</SectionTitle>
            <AddButton onClick={() => setIsAddingCoupon(true)}><FaPlus /> {t('admin.createCoupon')}</AddButton>
          </SectionHeader>
          
          {coupons.length === 0 ? (
            <EmptyMessage>{t('admin.noCouponsFound')}</EmptyMessage>
          ) : (
            <CouponGrid>
              {coupons.map(coupon => (
                <CouponCard key={coupon.id}>
                  <CouponHeader>
                    <CouponCode>{coupon.code}</CouponCode>
                    <StatusDot active={coupon.isActive} />
                  </CouponHeader>
                  <CouponInfo>
                    <CouponDesc>{coupon.description || t('admin.noDescription')}</CouponDesc>
                    <CouponTypeTag type={coupon.type}>
                      {coupon.type === 'coins' ? <><FaCoins /> {coupon.value} {t('coupon.coins')}</> : <><FaUsers /> {coupon.Character?.name || t('admin.character')}</>}
                    </CouponTypeTag>
                    <CouponDetails>
                      <CouponDetail><strong>{t('admin.uses')}:</strong> {coupon.currentUses}/{coupon.maxUses === -1 ? '∞' : coupon.maxUses}</CouponDetail>
                      <CouponDetail><strong>{t('admin.perUser')}:</strong> {coupon.usesPerUser === -1 ? '∞' : coupon.usesPerUser}</CouponDetail>
                      {coupon.endDate && <CouponDetail><FaCalendarAlt /> {new Date(coupon.endDate).toLocaleDateString()}</CouponDetail>}
                    </CouponDetails>
                    <CardActions>
                      <ActionBtn onClick={() => handleEditCoupon(coupon)}><FaEdit /> {t('common.edit')}</ActionBtn>
                      <ActionBtn danger onClick={() => handleDeleteCoupon(coupon.id)}><FaTrash /> {t('common.delete')}</ActionBtn>
                    </CardActions>
                  </CouponInfo>
                </CouponCard>
              ))}
            </CouponGrid>
          )}
        </AdminSection>
      </Container>
      
      {/* Modals */}
      <BannerFormModal show={isAddingBanner} onClose={() => setIsAddingBanner(false)} onSubmit={handleAddBanner} characters={characters} />
      <BannerFormModal show={isEditingBanner} onClose={() => setIsEditingBanner(false)} onSubmit={handleUpdateBanner} banner={editingBanner} characters={characters} />
      <CouponFormModal show={isAddingCoupon} onClose={() => setIsAddingCoupon(false)} onSubmit={handleAddCoupon} characters={characters} />
      <CouponFormModal show={isEditingCoupon} onClose={() => setIsEditingCoupon(false)} onSubmit={handleUpdateCoupon} coupon={editingCoupon} characters={characters} />
      <MultiUploadModal show={isMultiUploadOpen} onClose={() => setIsMultiUploadOpen(false)} onSuccess={(result) => { setSuccessMessage(result.message); fetchCharacters(); }} />
      <AnimeImportModal show={isAnimeImportOpen} onClose={() => setIsAnimeImportOpen(false)} onSuccess={(result) => { setSuccessMessage(result.message); fetchCharacters(); }} />

      {/* Edit Character Modal */}
      {isEditing && editingCharacter && (
        <ModalOverlay onClick={handleCloseEdit}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{t('common.edit')}: {editingCharacter.name}</ModalTitle>
              <CloseBtn onClick={handleCloseEdit}>×</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleSaveCharacter}>
                <FormGroup>
                  <Label>{t('admin.name')}</Label>
                  <Input type="text" name="name" value={editForm.name} onChange={handleEditFormChange} required />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.series')}</Label>
                  <Input type="text" name="series" value={editForm.series} onChange={handleEditFormChange} required />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.rarity')}</Label>
                  <Select name="rarity" value={editForm.rarity} onChange={handleEditFormChange}>
                    <option value="common">{t('gacha.common')}</option>
                    <option value="uncommon">{t('gacha.uncommon')}</option>
                    <option value="rare">{t('gacha.rare')}</option>
                    <option value="epic">{t('gacha.epic')}</option>
                    <option value="legendary">{t('gacha.legendary')}</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <CheckboxLabel>
                    <input type="checkbox" checked={editForm.isR18} onChange={(e) => setEditForm({...editForm, isR18: e.target.checked})} />
                    <span>🔞 {t('admin.r18Content')}</span>
                  </CheckboxLabel>
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.imageVideo')}</Label>
                  <Input type="file" accept="image/*,video/mp4,video/webm" onChange={handleEditImageChange} />
                  {editImagePreview && (
                    <ImagePreview>
                      {isVideo(editImageFile) || isVideo(editingCharacter.image) ? (
                        <video controls src={editImagePreview} />
                      ) : (
                        <img src={editImagePreview} alt="Preview" />
                      )}
                    </ImagePreview>
                  )}
                </FormGroup>
                <ButtonRow>
                  <SubmitButton type="submit">{t('admin.saveChanges')}</SubmitButton>
                  <CancelButton type="button" onClick={handleCloseEdit}>{t('common.cancel')}</CancelButton>
                </ButtonRow>
              </form>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </StyledPageWrapper>
  );
};

// Styled Components
const StyledPageWrapper = styled(PageWrapper)`
  padding: ${theme.spacing.lg} 0;
`;

const AdminHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderTitle = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeaderSubtitle = styled.p`
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.xs} 0 0;
`;

const AlertBox = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.md};
  background: ${props => props.variant === 'error' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(52, 199, 89, 0.15)'};
  border: 1px solid ${props => props.variant === 'error' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 199, 89, 0.3)'};
  color: ${props => props.variant === 'error' ? theme.colors.error : theme.colors.success};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
`;

const AdminGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
`;

const AdminSection = styled.section`
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
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
  transition: all ${theme.transitions.fast};
  
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

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover { opacity: 0.9; }
`;

const CancelButton = styled(SubmitButton)`
  background: ${theme.colors.backgroundTertiary};
  color: ${theme.colors.textSecondary};
`;

const UploadButtonsRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const MultiUploadBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  flex: 1;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  
  &:hover { opacity: 0.9; }
`;

const AnimeImportBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  flex: 1;
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, #ff6b9d, #c44569);
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  
  &:hover { opacity: 0.9; }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.full};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  
  &:hover { opacity: 0.9; }
`;

const SuccessText = styled.p`
  color: ${theme.colors.success};
  margin-top: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
`;

const LoadingText = styled.p`
  color: ${theme.colors.textSecondary};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: ${theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${theme.colors.surfaceBorder};
  }
  
  th {
    background: ${theme.colors.backgroundTertiary};
    font-weight: ${theme.fontWeights.semibold};
    color: ${theme.colors.textSecondary};
    font-size: ${theme.fontSizes.sm};
  }
  
  tr:hover td { background: ${theme.colors.backgroundTertiary}; }
`;

const RankCell = styled.span`
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$qualifies ? '#ffd700' : 'inherit'};
`;

const AutofishCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const AutofishStatus = styled.span`
  font-size: 16px;
`;

const AutofishBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  background: ${props => props.$type === 'rank' 
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.2))' 
    : 'rgba(10, 132, 255, 0.2)'};
  color: ${props => props.$type === 'rank' ? '#ffd700' : '#0a84ff'};
  border: 1px solid ${props => props.$type === 'rank' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(10, 132, 255, 0.4)'};
`;

const AutofishToggle = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$enabled 
    ? 'rgba(255, 69, 58, 0.2)' 
    : 'rgba(48, 209, 88, 0.2)'};
  color: ${props => props.$enabled ? '#ff453a' : '#30d158'};
  border: 1px solid ${props => props.$enabled ? 'rgba(255, 69, 58, 0.4)' : 'rgba(48, 209, 88, 0.4)'};
  
  &:hover {
    opacity: 0.85;
    transform: scale(1.02);
  }
`;

const R18Cell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const R18Status = styled.span`
  font-size: 16px;
`;

const R18Toggle = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$enabled 
    ? 'rgba(255, 69, 58, 0.2)' 
    : 'rgba(255, 45, 85, 0.2)'};
  color: ${props => props.$enabled ? '#ff453a' : '#ff2d55'};
  border: 1px solid ${props => props.$enabled ? 'rgba(255, 69, 58, 0.4)' : 'rgba(255, 45, 85, 0.4)'};
  
  &:hover {
    opacity: 0.85;
    transform: scale(1.02);
  }
`;

const SearchRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  flex: 1;
  min-width: 200px;
  
  svg { color: ${theme.colors.textMuted}; }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${theme.colors.text};
  margin-left: ${theme.spacing.sm};
  flex: 1;
  outline: none;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: ${theme.spacing['2xl']};
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${theme.spacing.md};
`;

const CharacterCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorder};
  
  img, video {
    width: 100%;
    height: 180px;
    object-fit: cover;
  }
`;

const CharacterInfo = styled.div`
  padding: ${theme.spacing.md};
`;

const CharacterName = styled.h4`
  margin: 0 0 ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
`;

const CharacterSeries = styled.p`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const R18Badge = styled.span`
  font-size: 12px;
`;

const RarityTag = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  background: ${props => getRarityColor(props.rarity)};
  color: white;
`;

const CardActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

const ActionBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: ${theme.spacing.sm};
  background: ${props => props.danger ? theme.colors.error : theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  min-height: 36px; /* Touch-friendly height */
  min-width: 36px; /* Touch-friendly width */
  
  &:hover { opacity: 0.9; }
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex: 0 0 auto;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
`;

const PaginationBtn = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  
  &:disabled {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.textMuted};
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

const DragHint = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 159, 10, 0.1);
  border-radius: ${theme.radius.md};
  border-left: 3px solid ${theme.colors.warning};
`;

const BannerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const BannerListItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$isDragging ? theme.colors.surface : theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  border: 1px solid ${props => props.$isDragging ? theme.colors.primary : theme.colors.surfaceBorder};
  transition: all 0.2s;
  
  &:hover {
    background: ${theme.colors.surface};
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-wrap: wrap;
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.sm};
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  cursor: grab;
  touch-action: none; /* Prevents scroll interference on touch */
  min-width: 44px; /* Minimum touch target size */
  min-height: 44px;
  
  &:active {
    cursor: grabbing;
  }
  
  &:hover {
    color: ${theme.colors.text};
    background: rgba(255, 255, 255, 0.05);
    border-radius: ${theme.radius.md};
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.sm};
    min-width: 40px;
    min-height: 40px;
  }
`;

const BannerOrderNum = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.primary};
  color: white;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  flex-shrink: 0;
`;

const BannerThumb = styled.img`
  width: 80px;
  height: 50px;
  object-fit: cover;
  border-radius: ${theme.radius.md};
  flex-shrink: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    width: 60px;
    height: 40px;
  }
`;

const BannerItemInfo = styled.div`
  flex: 1;
  min-width: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-basis: calc(100% - 160px); /* Leave room for drag handle, order num, and thumbnail */
  }
`;

const BannerItemName = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.base};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

const BannerItemMeta = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  
  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

const BannerItemTags = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-basis: 100%;
    order: 3;
    margin-left: 40px; /* Align with content after drag handle */
    flex-wrap: wrap;
  }
`;

const BannerItemActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  flex-shrink: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    order: 4;
    margin-left: auto;
  }
`;

const FeaturedToggleBtn = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  border: none;
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 36px; /* Touch-friendly height */
  font-size: ${theme.fontSizes.sm};
  
  background: ${props => props.$isFeatured 
    ? 'linear-gradient(135deg, #ffd700, #ffb300)' 
    : theme.colors.backgroundTertiary};
  color: ${props => props.$isFeatured ? '#1a1a1a' : theme.colors.text};
  box-shadow: ${props => props.$isFeatured 
    ? '0 4px 12px rgba(255, 215, 0, 0.4)' 
    : 'none'};
  
  &:hover {
    transform: scale(1.05);
    ${props => !props.$isFeatured && `background: ${theme.colors.primary}; color: white;`}
  }
  
  @media (max-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};
  }
`;

const BannerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.lg};
`;

const BannerCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => props.$selected ? theme.colors.primary : theme.colors.surfaceBorder};
  transition: all 0.2s;
  ${props => props.$selected && `
    box-shadow: 0 0 20px rgba(0, 113, 227, 0.3);
  `}
`;

const BannerImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`;

const BannerInfo = styled.div`
  padding: ${theme.spacing.md};
`;

const BannerName = styled.h4`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.sm};
`;

const SeriesTag = styled.span`
  padding: 2px 8px;
  background: rgba(0, 113, 227, 0.15);
  color: ${theme.colors.primary};
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
`;

const FeaturedTag = styled.span`
  padding: 2px 8px;
  background: rgba(255, 159, 10, 0.15);
  color: ${theme.colors.warning};
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
`;

const StatusTag = styled.span`
  padding: 2px 8px;
  background: ${props => props.active ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)'};
  color: ${props => props.active ? theme.colors.success : theme.colors.error};
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
`;

const BannerDesc = styled.p`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const DateInfo = styled.p`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

const BannerStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.sm};
`;

const StatItem = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  
  strong { color: ${theme.colors.text}; }
`;

const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${theme.spacing.lg};
`;

const CouponCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorder};
`;

const CouponHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.background};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const CouponCode = styled.h4`
  margin: 0;
  font-family: monospace;
  font-size: ${theme.fontSizes.md};
  letter-spacing: 1px;
`;

const StatusDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.active ? theme.colors.success : theme.colors.error};
`;

const CouponInfo = styled.div`
  padding: ${theme.spacing.md};
`;

const CouponDesc = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const CouponTypeTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.type === 'coins' ? theme.colors.warning : theme.colors.primary};
  color: white;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  margin-bottom: ${theme.spacing.md};
`;

const CouponDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const CouponDetail = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: ${theme.colors.background};
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  
  strong { color: ${theme.colors.text}; }
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

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(${theme.blur.sm});
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.md};
`;

const ModalContent = styled.div`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
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
  margin: 0;
  font-size: ${theme.fontSizes.lg};
`;

const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

export default AdminPage;
