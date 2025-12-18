import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaImage, FaVideo, FaCalendar, FaSearch } from 'react-icons/fa';
import { getAssetUrl } from '../../utils/api';
  
const BannerFormModal = ({ show, onClose, onSubmit, banner, characters }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    series: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    featured: false,
    costMultiplier: 1.5,
    rateMultiplier: 5.0,
    active: true,
    isR18: false,
    selectedCharacters: []
  });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [characterSearch, setCharacterSearch] = useState('');
  
  // Check if a file is a video
  const isVideo = (src) => {
    if (!src) return false;
    
    if (typeof src === 'string') {
      const lowerCasePath = src.toLowerCase();
      return lowerCasePath.endsWith('.mp4') || 
             lowerCasePath.endsWith('.webm') || 
             lowerCasePath.includes('video');
    }
    
    return src.type && src.type.startsWith('video/');
  };

  // Filter characters based on search term (match name OR series)
  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(characterSearch.toLowerCase()) ||
    (char.series && char.series.toLowerCase().includes(characterSearch.toLowerCase()))
  );
  
  // Reset and populate form when banner changes
  useEffect(() => {
    if (banner) {
      // Format dates for input fields
      const startDate = banner.startDate
        ? new Date(banner.startDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const endDate = banner.endDate
        ? new Date(banner.endDate).toISOString().split('T')[0]
        : '';
      setFormData({
        name: banner.name || '',
        description: banner.description || '',
        series: banner.series || '',
        startDate,
        endDate,
        featured: banner.featured || false,
        costMultiplier: banner.costMultiplier || 1.5,
        rateMultiplier: banner.rateMultiplier || 5.0,
        active: banner.active !== false,
        isR18: banner.isR18 || false,
        selectedCharacters: banner.Characters?.map(char => char.id) || []
      });
      // Set previews if available
      if (banner.image) {
        setImagePreview(getAssetUrl(banner.image));
      } else {
        setImagePreview(null);
      }
      if (banner.videoUrl) {
        setVideoPreview(getAssetUrl(banner.videoUrl));
      } else {
        setVideoPreview(null);
      }
    } else {
      // Reset form for new banner
      setFormData({
        name: '',
        description: '',
        series: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        featured: false,
        costMultiplier: 1.5,
        rateMultiplier: 5.0,
        active: true,
        isR18: false,
        selectedCharacters: []
      });
      setImagePreview(null);
      setVideoPreview(null);
    }
    setImageFile(null);
    setVideoFile(null);
    setCharacterSearch(''); // Reset search when modal opens/changes
  }, [banner, show]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCharacterToggle = (charId) => {
    setFormData(prev => {
      const selectedCharacters = [...prev.selectedCharacters];
      if (selectedCharacters.includes(charId)) {
        return {
          ...prev,
          selectedCharacters: selectedCharacters.filter(id => id !== charId)
        };
      } else {
        return {
          ...prev,
          selectedCharacters: [...selectedCharacters, charId]
        };
      }
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = new FormData();
    // Add all form fields
    Object.keys(formData).forEach(key => {
      if (key === 'selectedCharacters') {
        submitData.append('characterIds', JSON.stringify(formData.selectedCharacters));
      } else if (key === 'costMultiplier' || key === 'rateMultiplier') {
        submitData.append(key, parseFloat(formData[key]));
      } else {
        submitData.append(key, formData[key]);
      }
    });
    // Add files if present
    if (imageFile) {
      submitData.append('image', imageFile);
    }
    if (videoFile) {
      submitData.append('video', videoFile);
    }
    onSubmit(submitData);
  };
  
  // Render character media (image or video)
  const renderCharacterMedia = (char) => {
    const mediaSrc = getImageUrl(char.image);
    
    if (isVideo(char.image)) {
      return (
        <CharOptionVideo
          src={mediaSrc}
          autoPlay
          loop
          muted
          playsInline
          onError={(e) => {
            if (!e.target.src.includes('placeholder.com')) {
              e.target.src = 'https://via.placeholder.com/150?text=No+Media';
            }
          }}
        />
      );
    }
    
    return (
      <CharOptionImage
        src={mediaSrc}
        alt={char.name}
        onError={(e) => {
          if (!e.target.src.includes('placeholder.com')) {
            e.target.src = 'https://via.placeholder.com/150?text=No+Image';
          }
        }}
      />
    );
  };
  
  if (!show) return null;
  
  return (
    <ModalOverlay>
      <ModalContent>
        <ModalHeader>
          <h3>{banner ? 'Edit Banner' : 'Create New Banner'}</h3>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <label>Banner Name*</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </FormGroup>
            <FormGroup>
              <label>Series*</label>
              <input
                type="text"
                name="series"
                value={formData.series}
                onChange={handleChange}
                required
              />
            </FormGroup>
            <FormGroup>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </FormGroup>
            <FormRow>
              <FormGroup>
                <label>Start Date*</label>
                <DateInput>
                  <FaCalendar />
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </DateInput>
              </FormGroup>
              <FormGroup>
                <label>End Date (optional)</label>
                <DateInput>
                  <FaCalendar />
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </DateInput>
              </FormGroup>
            </FormRow>
            <FormRow>
              <FormGroup>
                <label>Cost Multiplier</label>
                <input
                  type="number"
                  name="costMultiplier"
                  value={formData.costMultiplier}
                  onChange={handleChange}
                  step="0.1"
                  min="1"
                  max="10"
                />
                <FormHint>
                  Standard pull = 100 points, this banner = {Math.floor(100 * formData.costMultiplier)} points
                </FormHint>
              </FormGroup>
              <FormGroup>
                <label>Rate Multiplier</label>
                <input
                  type="number"
                  name="rateMultiplier"
                  value={formData.rateMultiplier}
                  onChange={handleChange}
                  step="0.1"
                  min="1"
                  max="10"
                />
                <FormHint>
                  Higher value increases the chance of getting banner characters
                </FormHint>
              </FormGroup>
            </FormRow>
            <CheckboxGroup>
              <CheckboxControl>
                <input
                  type="checkbox"
                  id="featured"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                />
                <label htmlFor="featured">Featured Banner (shown first)</label>
              </CheckboxControl>
              <CheckboxControl>
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <label htmlFor="active">Active</label>
              </CheckboxControl>
              <CheckboxControl $r18>
                <input
                  type="checkbox"
                  id="isR18"
                  name="isR18"
                  checked={formData.isR18}
                  onChange={handleChange}
                />
                <label htmlFor="isR18">🔞 R18 Content (Adult Only)</label>
              </CheckboxControl>
            </CheckboxGroup>
            <FormGroup>
              <label>Banner Image</label>
              <FileInput>
                <FaImage />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!banner} // Required only for new banner
                />
              </FileInput>
              {imagePreview && (
                <ImagePreview>
                  <img src={imagePreview} alt="Banner preview" />
                </ImagePreview>
              )}
            </FormGroup>
            <FormGroup>
              <label>Promotional Video (optional)</label>
              <FileInput>
                <FaVideo />
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                />
              </FileInput>
              {videoPreview && (
                <VideoPreview>
                  <video src={videoPreview} controls />
                </VideoPreview>
              )}
            </FormGroup>
            <FormGroup>
              <label>Banner Characters</label>
              <FormHint>Select characters that are featured in this banner</FormHint>
              <CharacterSelector>
                <SelectorHeader>
                  <SelectedCount>
                    {formData.selectedCharacters.length} characters selected
                  </SelectedCount>
                  <SearchWrapper>
                    <SearchIcon>
                      <FaSearch />
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Search by character name or series..."
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                    />
                    {characterSearch && (
                      <ClearButton onClick={() => setCharacterSearch('')}>×</ClearButton>
                    )}
                  </SearchWrapper>
                </SelectorHeader>
                <CharacterGrid>
                  {filteredCharacters.length > 0 ? (
                    filteredCharacters.map(char => (
                      <CharacterOption
                        key={char.id}
                        selected={formData.selectedCharacters.includes(char.id)}
                        rarity={char.rarity}
                        onClick={() => handleCharacterToggle(char.id)}
                      >
                        {renderCharacterMedia(char)}
                        <CharOptionInfo>
                          <CharOptionName>{char.name}</CharOptionName>
                          <CharOptionSeries>{char.series}</CharOptionSeries>
                          <CharOptionRarity>{char.rarity}</CharOptionRarity>
                        </CharOptionInfo>
                        <CharOptionCheck>
                          {formData.selectedCharacters.includes(char.id) && '✓'}
                        </CharOptionCheck>
                      </CharacterOption>
                    ))
                  ) : (
                    <NoResults>No characters found matching "{characterSearch}"</NoResults>
                  )}
                </CharacterGrid>
              </CharacterSelector>
            </FormGroup>
            <ButtonGroup>
              <SubmitButton type="submit">
                {banner ? 'Update Banner' : 'Create Banner'}
              </SubmitButton>
              <CancelButton type="button" onClick={onClose}>
                Cancel
              </CancelButton>
            </ButtonGroup>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};
  
// Styled components
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
  overflow-y: auto;
  padding: 20px;
`;
  
const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 95%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;
  
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  
  h3 {
    margin: 0;
    color: #333;
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
  
const FormGroup = styled.div`
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
  }
  
  input[type="text"],
  input[type="number"],
  input[type="date"],
  textarea,
  select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  textarea {
    resize: vertical;
    min-height: 80px;
  }
`;
  
const FormRow = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
  
  ${FormGroup} {
    flex: 1;
    margin-bottom: 0;
  }
`;
  
const DateInput = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 10px;
  
  svg {
    color: #666;
    margin-right: 10px;
  }
  
  input {
    border: none;
    flex: 1;
    padding: 10px 0;
    
    &:focus {
      outline: none;
    }
  }
`;
  
const FileInput = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 10px;
  
  svg {
    color: #666;
    margin-right: 10px;
    font-size: 18px;
  }
  
  input {
    flex: 1;
    padding: 10px 0;
  }
`;
  
const CheckboxGroup = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;
  
const CheckboxControl = styled.div`
  display: flex;
  align-items: center;
  
  input {
    margin-right: 8px;
  }
  
  label {
    margin: 0;
    display: inline;
    ${props => props.$r18 && `
      color: #e74c3c;
      font-weight: 500;
    `}
  }
`;
  
const FormHint = styled.p`
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  margin-bottom: 0;
`;
  
const ImagePreview = styled.div`
  margin-top: 10px;
  width: 100%;
  
  img {
    max-width: 100%;
    max-height: 250px;
    border-radius: 4px;
    border: 1px solid #eee;
  }
`;
  
const VideoPreview = styled.div`
  margin-top: 10px;
  width: 100%;
  
  video {
    max-width: 100%;
    max-height: 250px;
    border-radius: 4px;
    border: 1px solid #eee;
  }
`;
  
const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;
  
const BaseButton = styled.button`
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  font-size: 14px;
  transition: background-color 0.2s;
`;
  
const SubmitButton = styled(BaseButton)`
  background-color: #3498db;
  color: white;
  
  &:hover {
    background-color: #2980b9;
  }
`;
  
const CancelButton = styled(BaseButton)`
  background-color: #f1f1f1;
  color: #333;
  
  &:hover {
    background-color: #ddd;
  }
`;
  
const CharacterSelector = styled.div`
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
`;
  
const SelectorHeader = styled.div`
  padding: 10px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
  
const SelectedCount = styled.div`
  font-size: 13px;
  color: #666;
`;
  
const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  overflow: hidden;
`;
  
const SearchIcon = styled.div`
  padding: 0 10px;
  color: #666;
  display: flex;
  align-items: center;
`;
  
const SearchInput = styled.input`
  flex: 1;
  border: none;
  padding: 8px 0;
  font-size: 14px;
  
  &:focus {
    outline: none;
  }
`;
  
const ClearButton = styled.button`
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 0 10px;
  
  &:hover {
    color: #666;
  }
`;
  
const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  padding: 10px;
`;
  
const NoResults = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
  grid-column: 1 / -1;
`;
  
const rarityColors = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800'
};
  
const CharacterOption = styled.div`
  border: 2px solid ${props => props.selected ? rarityColors[props.rarity] : '#ddd'};
  border-radius: 8px;
  overflow: hidden;
  background-color: ${props => props.selected ? `${rarityColors[props.rarity]}22` : 'white'};
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;
  
const CharOptionImage = styled.img`
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
`;

const CharOptionVideo = styled.video`
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
`;
  
const CharOptionInfo = styled.div`
  padding: 8px;
`;
  
const CharOptionName = styled.div`
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
  
const CharOptionSeries = styled.div`
  font-size: 11px;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;
  
const CharOptionRarity = styled.div`
  font-size: 11px;
  color: #777;
  text-transform: capitalize;
  margin-top: 2px;
`;
  
const CharOptionCheck = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #4caf50;
  font-size: 14px;
`;
  
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
  return getAssetUrl(imagePath);
};
  
export default BannerFormModal;