import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCoins, FaUsers, FaImage, FaEdit, FaTrash, FaSearch} from 'react-icons/fa';

const AdminPage = () => {
  const { user, setUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
    rarity: 'common'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  
  // Neue Charakter-Felder
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    series: '',
    rarity: 'common'
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
    }
  }, [user]);

const updateUserData = async () => {
  try {
    const userResponse = await axios.get('https://gachaapi.solidbooru.online/api/auth/me', {
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    });
    
    if (setUser) {
      setUser(userResponse.data);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
    }
  } catch (err) {
    console.error("Error updating user data:", err);
  }
};
  
  const fetchUsers = async () => {
    try {
      const response = await axios.get('https://gachaapi.solidbooru.online/api/admin/users', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCharacters = async () => {
    try {
      const response = await axios.get('https://gachaapi.solidbooru.online/api/characters', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      setCharacters(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load characters');
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
      setError('Please select an image file');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('name', newCharacter.name);
      formData.append('series', newCharacter.series);
      formData.append('rarity', newCharacter.rarity);
      
      const response = await axios.post(
        'https://gachaapi.solidbooru.online/api/admin/characters/upload', 
        formData, 
        {
          headers: {
            'x-auth-token': localStorage.getItem('token'),
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Zeige Erfolgsmeldung
      setSuccessMessage('Character added successfully!');
      
      // Aktualisiere Charakterliste
      fetchCharacters();
      
      // Formular zurücksetzen
      setNewCharacter({
        name: '',
        series: '',
        rarity: 'common'
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
      rarity: character.rarity || 'common'
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
      const response = await axios.put(
        `https://gachaapi.solidbooru.online/api/admin/characters/${editingCharacter.id}`,
        editForm,
        {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        }
      );
      
      // Wenn ein neues Bild ausgewählt wurde, lade es hoch
      if (editImageFile) {
        const formData = new FormData();
        formData.append('image', editImageFile);
        
        await axios.put(
          `https://gachaapi.solidbooru.online/api/admin/characters/${editingCharacter.id}/image`,
          formData,
          {
            headers: {
              'x-auth-token': localStorage.getItem('token'),
              'Content-Type': 'multipart/form-data'
            }
          }
        );
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
      await axios.delete(
        `https://gachaapi.solidbooru.online/api/admin/characters/${characterId}`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        }
      );
      
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
      const response = await axios.post(
        'https://gachaapi.solidbooru.online/api/admin/add-coins',
        coinForm,
        {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        }
      );
      
      // Zeige Erfolgsmeldung
      setCoinMessage(response.data.message);
      
      // Aktualisiere Benutzerliste
      await fetchUsers();
      
      // Aktualisiere auch die Benutzerdaten im Kontext
      if (coinForm.userId === user?.id) {
        await updateUserData();
      }
      
      // Formular zurücksetzen
      setCoinForm({
        userId: '',
        amount: 100
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add coins');
    }
  };
  
  // Hilfsfunktion für Bildpfade
  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
    
    // Prüfe, ob es eine volle URL ist
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Prüfe auf hochgeladene Bilder im uploads-Verzeichnis
    if (imagePath.startsWith('/uploads')) {
      return `https://gachaapi.solidbooru.online${imagePath}`;
    }
    
    // Prüfe auf image- Präfix, was auf ein hochgeladenes Bild hinweist
    if (imagePath.startsWith('image-')) {
      return `https://gachaapi.solidbooru.online/uploads/characters/${imagePath}`;
    }
    
    // Prüfe, ob es ein einfacher Dateiname oder ein vollständiger Pfad ist
    return imagePath.includes('/') 
      ? imagePath 
      : `/images/characters/${imagePath}`;
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
              <label>Character Image</label>
              <FileInput 
                type="file" 
                id="character-image"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
              {uploadedImage && (
                <ImagePreview>
                  <ImagePreviewLabel>Preview:</ImagePreviewLabel>
                  <img src={uploadedImage} alt="Preview" />
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
                <img 
                  src={getImageUrl(char.image)}
                  alt={char.name} 
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                    }
                  }}
                />
                <CharacterInfo>
                  <h3>{char.name}</h3>
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
      
      {/* Edit Character Modal */}
      <EditCharacterModal 
        show={isEditing} 
        onClose={handleCloseEdit} 
        character={editingCharacter} 
        editForm={editForm} 
        onEditFormChange={handleEditFormChange} 
        onImageChange={handleEditImageChange}
        onSubmit={handleSaveCharacter}
        imagePreview={editImagePreview}
      />
    </AdminContainer>
  );
};

// Edit Character Modal
const EditCharacterModal = ({ show, onClose, character, editForm, onEditFormChange, onImageChange, onSubmit, imagePreview }) => {
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
              <label>Character Image</label>
              <FileInput 
                type="file" 
                accept="image/*"
                onChange={onImageChange}
              />
              {imagePreview && (
                <ImagePreview>
                  <ImagePreviewLabel>Current/New Image:</ImagePreviewLabel>
                  <img src={imagePreview} alt="Character preview" />
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

const ImagePreviewLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); // Even smaller on mobile 
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
  
  img {
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
    padding-right: 10px; // Give space for the rarity tag
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

export default AdminPage;