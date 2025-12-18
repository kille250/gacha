import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { FaPlus, FaVideo, FaTicketAlt, FaCalendarAlt, FaCloudUploadAlt } from 'react-icons/fa';
import api, { createBanner, updateBanner, deleteBanner, getAssetUrl } from '../utils/api';
import BannerFormModal from '../components/UI/BannerFormModal';
import CouponFormModal from '../components/UI/CouponFormModal';
import MultiUploadModal from '../components/UI/MultiUploadModal';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCoins, FaUsers, FaImage, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';

const AdminPage = () => {
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

  // Gefilterte und paginierte Charaktere
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

  // Suchfunktion Handler
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Items pro Seite Handler
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Pagination Handler
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

  // Neue Charakter-Felder
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    series: '',
    rarity: 'common',
    isR18: false
  });

  // Coin-Management
  const [coinForm, setCoinForm] = useState({
    userId: '',
    amount: 100
  });
  const [coinMessage, setCoinMessage] = useState(null);

  // Datei-Feld
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers();
      fetchCharacters();
      fetchBanners();
      fetchCoupons();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await api.get('/characters');
      setCharacters(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load characters');
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await api.get('/banners?showAll=true');
      setBanners(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load banners');
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons/admin');
      setCoupons(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load coupons');
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
    
    // Zeige Vorschau des Bildes an
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
      setError('Please select an image or video file');
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
      
      // Zeige Erfolgsmeldung
      setSuccessMessage('Character added successfully!');
      
      // Aktualisiere Charakterliste
      fetchCharacters();
      
      // Formular zurücksetzen
      setNewCharacter({
        name: '',
        series: '',
        rarity: 'common',
        isR18: false
      });
      setSelectedFile(null);
      setUploadedImage(null);
      
      // Setze Datei-Input zurück
      const fileInput = document.getElementById('character-image');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Error adding character:', err);
      setError(err.response?.data?.error || 'Failed to add character');
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
    
    // Bildvorschau aktualisieren
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
      // Aktualisiere die Charakterdetails
      await api.put(`/admin/characters/${editingCharacter.id}`, editForm);
      
      // Wenn ein neues Bild ausgewählt wurde, lade es hoch
      if (editImageFile) {
        const formData = new FormData();
        formData.append('image', editImageFile);
        
        await api.put(`/admin/characters/${editingCharacter.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setSuccessMessage('Character updated successfully!');
      
      // Aktualisiere die Charakterliste
      fetchCharacters();
      
      // Schließe das Bearbeitungsformular
      handleCloseEdit();
    } catch (err) {
      console.error('Error updating character:', err);
      setError(err.response?.data?.error || 'Failed to update character');
    }
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!window.confirm('Are you sure you want to delete this character?')) {
      return;
    }
    
    setError(null);
    setSuccessMessage(null);
    
    try {
      await api.delete(`/admin/characters/${characterId}`);
      
      setSuccessMessage('Character deleted successfully!');
      
      // Aktualisiere die Charakterliste
      fetchCharacters();
    } catch (err) {
      console.error('Error deleting character:', err);
      setError(err.response?.data?.error || 'Failed to delete character');
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
      
      // If we add coins to the current user, refresh user data
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
      setSuccessMessage('Banner added successfully!');
      setIsAddingBanner(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add banner');
    }
  };

  const handleUpdateBanner = async (formData) => {
    try {
      setSuccessMessage(null);
      setError(null);
      await updateBanner(editingBanner.id, formData);
      await fetchBanners();
      setSuccessMessage('Banner updated successfully!');
      setIsEditingBanner(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update banner');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return;
    }
    
    try {
      setSuccessMessage(null);
      setError(null);
      await deleteBanner(bannerId);
      await fetchBanners();
      setSuccessMessage('Banner deleted successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete banner');
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
      await fetchCoupons();
      setSuccessMessage('Coupon created successfully!');
      setIsAddingCoupon(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create coupon');
    }
  };

  const handleUpdateCoupon = async (formData) => {
    try {
      setSuccessMessage(null);
      setError(null);
      await api.put(`/coupons/admin/${editingCoupon.id}`, formData);
      await fetchCoupons();
      setSuccessMessage('Coupon updated successfully!');
      setIsEditingCoupon(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }
    
    try {
      setSuccessMessage(null);
      setError(null);
      await api.delete(`/coupons/admin/${couponId}`);
      await fetchCoupons();
      setSuccessMessage('Coupon deleted successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete coupon');
    }
  };

  // Hilfsfunktion für Bildpfade
  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
    return getAssetUrl(imagePath);
  };

  // Check if a file is a video
  const isVideo = (file) => {
    if (!file) return false;
    
    // If it's a File object with type property
    if (file.type && file.type.startsWith('video/')) {
      return true;
    }
    
    // If it's a string (path/URL)
    if (typeof file === 'string') {
      const lowerCasePath = file.toLowerCase();
      return lowerCasePath.endsWith('.mp4') || 
             lowerCasePath.endsWith('.webm') || 
             lowerCasePath.includes('video');
    }
    
    return false;
  };

  // Nur Admin-Zugriff erlauben
  if (!user?.isAdmin) {
    return <Navigate to="/gacha" />;
  }

  return (
    <AdminContainer>
      <AdminHeader>
        <h1>Admin Dashboard</h1>
      </AdminHeader>
      
      {error && (
        <ErrorMessage
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {error}
        </ErrorMessage>
      )}
      
      {successMessage && (
        <SuccessMessage
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {successMessage}
        </SuccessMessage>
      )}
      
      <AdminGrid>
        <AdminSection>
          <h2><FaCoins /> Add Coins to User</h2>
          <form onSubmit={handleAddCoins}>
            <CoinFormGrid>
              <FormGroup>
                <label>Select User</label>
                <select
                  name="userId"
                  value={coinForm.userId}
                  onChange={handleCoinFormChange}
                  required
                >
                  <option value="">-- Select User --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} (Current: {user.points} coins)
                    </option>
                  ))}
                </select>
              </FormGroup>
              
              <FormGroup>
                <label>Amount to Add</label>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  max="10000"
                  value={coinForm.amount}
                  onChange={handleCoinFormChange}
                  required
                />
              </FormGroup>
              
              <Button type="submit" color="#27ae60">
                <FaCoins /> <span>Add Coins</span>
              </Button>
            </CoinFormGrid>
          </form>
          
          {coinMessage && (
            <SuccessMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {coinMessage}
            </SuccessMessage>
          )}
        </AdminSection>
        
        <AdminSection>
          <h2><FaImage /> Add New Character</h2>
          <MultiUploadButton onClick={() => setIsMultiUploadOpen(true)}>
            <FaCloudUploadAlt /> Multi-Upload Characters
          </MultiUploadButton>
          <CharacterForm onSubmit={addCharacterWithImage}>
            <FormGroup>
              <label>Character Name</label>
              <input
                type="text"
                name="name"
                value={newCharacter.name}
                onChange={handleCharacterChange}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <label>Series</label>
              <input
                type="text"
                name="series"
                value={newCharacter.series}
                onChange={handleCharacterChange}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <label>Rarity</label>
              <select
                name="rarity"
                value={newCharacter.rarity}
                onChange={handleCharacterChange}
              >
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </FormGroup>
            
            <FormGroup>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  name="isR18"
                  checked={newCharacter.isR18}
                  onChange={(e) => setNewCharacter({...newCharacter, isR18: e.target.checked})}
                />
                <span>🔞 R18 Content (Adult Only)</span>
              </CheckboxLabel>
            </FormGroup>
            
            <FormGroup>
              <label>Character Image/Video</label>
              <FileInput
                type="file"
                id="character-image"
                accept="image/*,video/mp4,video/webm"
                onChange={handleFileChange}
                required
              />
              
              {uploadedImage && !isVideo(selectedFile) && (
                <ImagePreview>
                  <ImagePreviewLabel>Preview:</ImagePreviewLabel>
                  <img src={uploadedImage} alt="Preview" />
                </ImagePreview>
              )}
              
              {uploadedImage && isVideo(selectedFile) && (
                <ImagePreview>
                  <ImagePreviewLabel>Video Preview:</ImagePreviewLabel>
                  <MediaTag as="video" controls>
                    <source src={uploadedImage} type={selectedFile.type} />
                    Your browser does not support the video tag.
                  </MediaTag>
                </ImagePreview>
              )}
            </FormGroup>
            
            <Button type="submit" fullWidth color="#3498db">
              <FaImage /> <span>Add Character</span>
            </Button>
          </CharacterForm>
        </AdminSection>
      </AdminGrid>
      
      <AdminSection>
        <h2><FaUsers /> User Management</h2>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <UserTable>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Points</th>
                <th>Admin</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.points}</td>
                  <td>{user.isAdmin ? '✅' : '❌'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </UserTable>
        )}
      </AdminSection>
      
      <AdminSection>
        <ManagementHeader>
          <h2><FaUsers /> Character Management</h2>
          <SearchContainer>
            <SearchInputWrapper>
              <FaSearch />
              <SearchInput
                type="text"
                placeholder="Search characters..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </SearchInputWrapper>
            <ItemsPerPageSelect
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </ItemsPerPageSelect>
          </SearchContainer>
        </ManagementHeader>
        
        {currentCharacters.length === 0 ? (
          <EmptyMessage>No characters found</EmptyMessage>
        ) : (
          <>
            <CharacterGrid>
              {currentCharacters.map(char => (
                <CharacterCard key={char.id}>
                  {isVideo(char.image) ? (
                    <MediaTag as="video" autoPlay loop muted playsInline>
                      <source src={getImageUrl(char.image)} 
                              type={char.image.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                      Your browser does not support the video tag.
                    </MediaTag>
                  ) : (
                    <img
                      src={getImageUrl(char.image)}
                      alt={char.name}
                      onError={(e) => {
                        if (!e.target.src.includes('placeholder.com')) {
                          e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                        }
                      }}
                    />
                  )}
                  <CharacterInfo>
                    <h3>{char.name} {char.isR18 && <R18Badge>🔞</R18Badge>}</h3>
                    <p>{char.series}</p>
                    <RarityTag rarity={char.rarity}>{char.rarity}</RarityTag>
                    <CardActions>
                      <ActionButton type="button" onClick={() => handleEditCharacter(char)}>
                        <FaEdit /> Edit
                      </ActionButton>
                      <ActionButton type="button" danger onClick={() => handleDeleteCharacter(char.id)}>
                        <FaTrash /> Delete
                      </ActionButton>
                    </CardActions>
                  </CharacterInfo>
                </CharacterCard>
              ))}
            </CharacterGrid>
            
            <PaginationContainer>
              <PaginationButton
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </PaginationButton>
              <PageInfo>
                Page {currentPage} of {totalPages}
              </PageInfo>
              <PaginationButton
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </PaginationButton>
            </PaginationContainer>
          </>
        )}
      </AdminSection>
      
      <AdminSection>
        <h2><FaImage /> Banner Management</h2>
        <ManagementHeader>
          <Button
            onClick={() => setIsAddingBanner(true)}
            color="#3498db"
            style={{ marginBottom: '20px' }}
          >
            <FaPlus /> <span>Add New Banner</span>
          </Button>
        </ManagementHeader>
        
        {banners.length === 0 ? (
          <EmptyMessage>No banners found</EmptyMessage>
        ) : (
          <BannerGrid>
            {banners.map(banner => (
              <BannerCard key={banner.id}>
                <BannerImage
                  src={getBannerImageUrl(banner.image)}
                  alt={banner.name}
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/300x150?text=Banner';
                    }
                  }}
                />
                <BannerInfo>
                  <h3>{banner.name}</h3>
                  <SeriesTag>{banner.series}</SeriesTag>
                  {banner.featured && <FeaturedTag>Featured</FeaturedTag>}
                  <StatusTag active={banner.active}>
                    {banner.active ? 'Active' : 'Inactive'}
                  </StatusTag>
                  <p>{banner.description}</p>
                  {banner.endDate && (
                    <DateInfo>
                      Ends: {new Date(banner.endDate).toLocaleDateString()}
                    </DateInfo>
                  )}
                  <BannerFeatures>
                    <FeatureItem>
                      <strong>Cost:</strong> {Math.floor(100 * banner.costMultiplier)} per pull
                    </FeatureItem>
                    <FeatureItem>
                      <strong>Characters:</strong> {banner.Characters.length}
                    </FeatureItem>
                    {banner.videoUrl && (
                      <FeatureItem>
                        <FaVideo /> Has Video
                      </FeatureItem>
                    )}
                  </BannerFeatures>
                  <CardActions>
                    <ActionButton onClick={() => handleEditBanner(banner)}>
                      <FaEdit /> Edit
                    </ActionButton>
                    <ActionButton danger onClick={() => handleDeleteBanner(banner.id)}>
                      <FaTrash /> Delete
                    </ActionButton>
                  </CardActions>
                </BannerInfo>
              </BannerCard>
            ))}
          </BannerGrid>
        )}
      </AdminSection>
      
      <AdminSection>
        <h2><FaTicketAlt /> Coupon Management</h2>
        <ManagementHeader>
          <Button
            onClick={() => setIsAddingCoupon(true)}
            color="#3498db"
            style={{ marginBottom: '20px' }}
          >
            <FaPlus /> <span>Create New Coupon</span>
          </Button>
        </ManagementHeader>
        
        {coupons.length === 0 ? (
          <EmptyMessage>No coupons found</EmptyMessage>
        ) : (
          <CouponGrid>
            {coupons.map(coupon => (
              <CouponCard key={coupon.id}>
                <CouponHeader>
                  <h3>{coupon.code}</h3>
                  <StatusDot active={coupon.isActive} />
                </CouponHeader>
                <CouponInfo>
                  <p>{coupon.description || 'No description'}</p>
                  <CouponTypeTag type={coupon.type}>
                    {coupon.type === 'coins' ? (
                      <><FaCoins /> {coupon.value} Coins</>
                    ) : coupon.type === 'character' ? (
                      <><FaUsers /> Character: {coupon.Character?.name || 'Unknown'}</>
                    ) : (
                      <>{coupon.type}</>
                    )}
                  </CouponTypeTag>
                  <CouponDetails>
                    <CouponDetail>
                      <strong>Uses:</strong> {coupon.currentUses}/{coupon.maxUses === -1 ? '∞' : coupon.maxUses}
                    </CouponDetail>
                    <CouponDetail>
                      <strong>Per User:</strong> {coupon.usesPerUser === -1 ? '∞' : coupon.usesPerUser}
                    </CouponDetail>
                    {(coupon.startDate || coupon.endDate) && (
                      <CouponDetail>
                        <FaCalendarAlt />
                        {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : 'Any'} - {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'No Expiry'}
                      </CouponDetail>
                    )}
                  </CouponDetails>
                  <CardActions>
                    <ActionButton onClick={() => handleEditCoupon(coupon)}>
                      <FaEdit /> Edit
                    </ActionButton>
                    <ActionButton danger onClick={() => handleDeleteCoupon(coupon.id)}>
                      <FaTrash /> Delete
                    </ActionButton>
                  </CardActions>
                </CouponInfo>
              </CouponCard>
            ))}
          </CouponGrid>
        )}
      </AdminSection>
      
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
        onSuccess={(result) => {
          setSuccessMessage(result.message);
          fetchCharacters();
        }}
      />

      {/* Edit Character Modal */}
      <EditCharacterModal
        show={isEditing}
        onClose={handleCloseEdit}
        character={editingCharacter}
        editForm={editForm}
        onEditFormChange={handleEditFormChange}
        onR18Change={(e) => setEditForm({...editForm, isR18: e.target.checked})}
        onImageChange={handleEditImageChange}
        onSubmit={handleSaveCharacter}
        imagePreview={editImagePreview}
        isVideo={isVideo}
        editImageFile={editImageFile}
      />
    </AdminContainer>
  );
};

// Edit Character Modal
const EditCharacterModal = ({ show, onClose, character, editForm, onEditFormChange, onR18Change, onImageChange, onSubmit, imagePreview, isVideo, editImageFile }) => {
  if (!show || !character) return null;
  
  return (
    <ModalOverlay>
      <ModalContent>
        <ModalHeader>
          <h3>Edit Character: {character.name}</h3>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={onSubmit}>
            <FormGroup>
              <label>Character Name</label>
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={onEditFormChange}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <label>Series</label>
              <input
                type="text"
                name="series"
                value={editForm.series}
                onChange={onEditFormChange}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <label>Rarity</label>
              <select
                name="rarity"
                value={editForm.rarity}
                onChange={onEditFormChange}
              >
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </FormGroup>
            
            <FormGroup>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  name="isR18"
                  checked={editForm.isR18}
                  onChange={onR18Change}
                />
                <span>🔞 R18 Content (Adult Only)</span>
              </CheckboxLabel>
            </FormGroup>
            
            <FormGroup>
              <label>Character Image/Video</label>
              <FileInput
                type="file"
                accept="image/*,video/mp4,video/webm"
                onChange={onImageChange}
              />
              
              {imagePreview && !isVideo(editImageFile) && !isVideo(character.image) && (
                <ImagePreview>
                  <ImagePreviewLabel>Current/New Image:</ImagePreviewLabel>
                  <img src={imagePreview} alt="Character preview" />
                </ImagePreview>
              )}
              
              {imagePreview && (isVideo(editImageFile) || isVideo(character.image)) && (
                <ImagePreview>
                  <ImagePreviewLabel>Current/New Video:</ImagePreviewLabel>
                  <MediaTag as="video" controls playsInline>
                    <source src={imagePreview} 
                            type={editImageFile ? 
                                  editImageFile.type : 
                                  imagePreview.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                    Your browser does not support the video tag.
                  </MediaTag>
                </ImagePreview>
              )}
            </FormGroup>
            
            <ButtonGroup>
              <Button type="submit" color="#27ae60">
                <span>Save Changes</span>
              </Button>
              <Button type="button" onClick={onClose} color="#7f8c8d">
                <span>Cancel</span>
              </Button>
            </ButtonGroup>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

// Styled Components
const AdminContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 10px;
  max-width: 100vw;
  overflow-x: hidden;
  
  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const AdminHeader = styled.div`
  background-color: #2c3e50;
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  
  h1 {
    margin: 0;
  }
`;

const AdminGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (min-width: 992px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
`;

const AdminSection = styled.section`
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
  
  @media (min-width: 768px) {
    padding: 20px;
    margin-bottom: 30px;
  }
  
  h2 {
    margin-top: 0;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.2rem;
    word-wrap: break-word;
  }
`;

const CharacterForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const MultiUploadButton = styled.button`
  background-color: #9b59b6;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
  width: 100%;
  font-size: 0.9rem;
  margin-bottom: 15px;
  
  svg {
    flex-shrink: 0;
  }
  
  &:hover {
    opacity: 0.8;
  }
`;

const CoinFormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  
  label {
    font-weight: bold;
    color: #555;
    font-size: 0.9rem;
  }
  
  input, select {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 100%;
    font-size: 0.9rem;
    max-width: 100%;
    box-sizing: border-box;
  }
`;

const FileInput = styled.input`
  font-size: 0.9rem;
  width: 100%;
  
  &::file-selector-button {
    font-size: 0.8rem;
    padding: 8px;
  }
`;

const Button = styled.button`
  grid-column: ${props => props.fullWidth ? "1 / -1" : "auto"};
  background-color: ${props => props.color || "#3498db"};
  color: white;
  border: none;
  padding: 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
  text-align: center;
  width: 100%;
  font-size: 0.9rem;
  
  svg {
    flex-shrink: 0;
  }
  
  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &:hover {
    opacity: 0.8;
  }
`;

const UserTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
  white-space: nowrap;
  
  @media (min-width: 768px) {
    display: table;
    white-space: normal;
  }
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  th {
    background-color: #f8f9fa;
    font-weight: bold;
  }
  
  tr:hover {
    background-color: #f8f9fa;
  }
`;

const ErrorMessage = styled(motion.div)`
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const SuccessMessage = styled(motion.div)`
  background-color: #d4edda;
  color: #155724;
  padding: 12px;
  border-radius: 4px;
  margin: 10px 0;
`;

const ImagePreview = styled.div`
  margin-top: 10px;
  width: 100%;
  
  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 4px;
    border: 1px solid #ddd;
    object-fit: contain;
  }
`;

const MediaTag = styled.img`
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  border: 1px solid #ddd;
  object-fit: contain;
`;

const ImagePreviewLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  width: 100%;
  
  @media (min-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  }
`;

const CharacterCard = styled.div`
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  img, video {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
`;

const CharacterInfo = styled.div`
  padding: 12px;
  position: relative;
  
  h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    word-break: break-word;
    padding-right: 10px;
  }
  
  p {
    margin: 0;
    color: #666;
    font-size: 12px;
    word-break: break-word;
    margin-bottom: 6px;
  }
`;

const rarityColors = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800'
};

const RarityTag = styled.div`
  position: absolute;
  top: -12px;
  right: 12px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  text-transform: uppercase;
  font-weight: bold;
`;

const R18Badge = styled.span`
  font-size: 14px;
  margin-left: 4px;
  vertical-align: middle;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
  
  span {
    color: #e74c3c;
    font-weight: 500;
  }
`;

const CardActions = styled.div`
  display: flex;
  margin-top: 12px;
  gap: 8px;
`;

const ActionButton = styled.button`
  background-color: ${props => props.danger ? '#e74c3c' : '#3498db'};
  color: white;
  border: none;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
  
  &:hover {
    opacity: 0.8;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 95%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  margin: 10px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  
  h3 {
    margin: 0;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #777;
  
  &:hover {
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
  width: 100%;
  
  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: flex-end;
  }
  
  button {
    width: 100%;
    @media (min-width: 480px) {
      width: auto;
      min-width: 120px;
    }
  }
`;

const ManagementHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const SearchInputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  flex-grow: 1;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  margin-left: 8px;
  flex-grow: 1;
  font-size: 14px;
`;

const ItemsPerPageSelect = styled.select`
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: white;
  font-size: 14px;
  width: 100%;
  
  @media (min-width: 768px) {
    width: auto;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
  flex-wrap: wrap;
`;

const PaginationButton = styled.button`
  padding: 8px 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  
  &:hover:not(:disabled) {
    background-color: #2980b9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const PageInfo = styled.span`
  font-size: 14px;
  color: #666;
  min-width: 100px;
  text-align: center;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 18px;
  background: #f8f9fa;
  border-radius: 12px;
`;

const BannerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  width: 100%;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BannerCard = styled.div`
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
`;

const BannerImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`;

const BannerInfo = styled.div`
  padding: 15px;
  flex: 1;
  
  h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
  }
  
  p {
    font-size: 14px;
    color: #666;
    margin-top: 10px;
    margin-bottom: 10px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const SeriesTag = styled.span`
  display: inline-block;
  background-color: #e9f7fe;
  color: #3498db;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 5px;
  margin-bottom: 5px;
`;

const FeaturedTag = styled.span`
  display: inline-block;
  background-color: #fff8e1;
  color: #ffa000;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 5px;
  margin-bottom: 5px;
  font-weight: bold;
`;

const StatusTag = styled.span`
  display: inline-block;
  background-color: ${props => props.active ? '#e8f5e9' : '#ffebee'};
  color: ${props => props.active ? '#4caf50' : '#f44336'};
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 5px;
`;

const DateInfo = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 5px;
`;

const BannerFeatures = styled.div`
  margin: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const FeatureItem = styled.div`
  font-size: 13px;
  color: #555;
  
  strong {
    color: #333;
    margin-right: 5px;
  }
`;

// Coupon styled components
const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CouponCard = styled.div`
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const CouponHeader = styled.div`
  background-color: #f9f9f9;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-family: monospace;
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 1px;
  }
`;

const StatusDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.active ? '#4caf50' : '#f44336'};
`;

const CouponInfo = styled.div`
  padding: 15px;
  
  p {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 14px;
    color: #555;
  }
`;

const CouponTypeTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  color: white;
  background-color: ${props => {
    switch(props.type) {
      case 'coins': return '#f39c12';
      case 'character': return '#3498db';
      default: return '#95a5a6';
    }
  }};
`;

const CouponDetails = styled.div`
  margin: 10px 0 15px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CouponDetail = styled.div`
  font-size: 13px;
  color: #666;
  border: 1px solid #eee;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  
  strong {
    color: #333;
  }
`;

export default AdminPage;