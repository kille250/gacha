// src/pages/AdminPage.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const AdminPage = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // Neue Charakter-Felder
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    series: '',
    rarity: 'common'
  });
  
  // Datei-Feld
  const [selectedFile, setSelectedFile] = useState(null);
  
  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers();
      fetchCharacters();
    }
  }, [user]);
  
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
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
      const response = await axios.get('http://localhost:5000/api/characters', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      setCharacters(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load characters');
    }
  };
  
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
        'http://localhost:5000/api/admin/characters/upload', 
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

  // Füge diese Hilfsfunktion zur AdminPage.js hinzu
const getImageUrl = (imagePath) => {
	if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
	
	// Prüfe, ob es eine volle URL ist
	if (imagePath.startsWith('http')) {
	  return imagePath;
	}
	
	// Prüfe auf hochgeladene Bilder im uploads-Verzeichnis
	if (imagePath.startsWith('/uploads')) {
	  return `http://localhost:5000${imagePath}`;
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
      
      <AdminSection>
        <h2>Add New Character</h2>
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
            <input 
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
          
          <Button type="submit">Add Character</Button>
        </CharacterForm>
      </AdminSection>
      
      <AdminSection>
        <h2>User Management</h2>
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
		<h2>Character Management</h2>
		{characters.length === 0 ? (
			<p>No characters found.</p>
		) : (
			<CharacterGrid>
			{characters.map(char => (
				<CharacterCard key={char.id}>
				{/* Verbesserte Bildpfadverarbeitung */}
				<img 
					src={getImageUrl(char.image)}
					alt={char.name} 
					onError={(e) => {
					// Nur einmal zum Placeholder umleiten, um Endlosschleifen zu vermeiden
					if (!e.target.src.includes('placeholder.com')) {
						e.target.src = 'https://via.placeholder.com/150?text=No+Image';
					}
					}}
				/>
				<CharacterInfo>
					<h3>{char.name}</h3>
					<p>{char.series}</p>
					<RarityTag rarity={char.rarity}>{char.rarity}</RarityTag>
				</CharacterInfo>
				</CharacterCard>
			))}
			</CharacterGrid>
		)}
		</AdminSection>
    </AdminContainer>
  );
};

const AdminContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
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

const AdminSection = styled.section`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  
  h2 {
    margin-top: 0;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
`;

const CharacterForm = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  label {
    font-weight: bold;
    color: #555;
  }
  
  input, select {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
`;

const Button = styled.button`
  grid-column: 1 / -1;
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const UserTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
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
  margin-bottom: 20px;
`;

const ImagePreview = styled.div`
  margin-top: 10px;
  
  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
`;

const ImagePreviewLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
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
    font-size: 18px;
  }
  
  p {
    margin: 0;
    color: #666;
    font-size: 14px;
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

export default AdminPage;