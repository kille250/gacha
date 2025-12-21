import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaImage, FaVideo, FaCalendar, FaSearch, FaTimes } from 'react-icons/fa';
import { getAssetUrl } from '../../utils/api';
import { isVideo, PLACEHOLDER_IMAGE } from '../../utils/mediaUtils';
  
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
    <ModalOverlay onMouseDown={onClose}>
      <ModalContent onMouseDown={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{banner ? 'Edit Banner' : 'Create New Banner'}</ModalTitle>
          <CloseButton onClick={onClose}><FaTimes /></CloseButton>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Banner Name*</Label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter banner name"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Series*</Label>
              <Input
                type="text"
                name="series"
                value={formData.series}
                onChange={handleChange}
                placeholder="Enter series name"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Description</Label>
              <TextArea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Optional description..."
              />
            </FormGroup>
            <FormRow>
              <FormGroup>
                <Label>Start Date*</Label>
                <DateInputWrapper>
                  <FaCalendar />
                  <Input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </DateInputWrapper>
              </FormGroup>
              <FormGroup>
                <Label>End Date (optional)</Label>
                <DateInputWrapper>
                  <FaCalendar />
                  <Input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </DateInputWrapper>
              </FormGroup>
            </FormRow>
            <FormRow>
              <FormGroup>
                <Label>Cost Multiplier</Label>
                <Input
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
                <Label>Rate Multiplier</Label>
                <Input
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
                <Checkbox
                  type="checkbox"
                  id="featured"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                />
                <CheckboxLabel htmlFor="featured">Featured Banner</CheckboxLabel>
              </CheckboxControl>
              <CheckboxControl>
                <Checkbox
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <CheckboxLabel htmlFor="active">Active</CheckboxLabel>
              </CheckboxControl>
              <CheckboxControl $r18>
                <Checkbox
                  type="checkbox"
                  id="isR18"
                  name="isR18"
                  checked={formData.isR18}
                  onChange={handleChange}
                />
                <CheckboxLabel htmlFor="isR18" $r18>🔞 R18 Content</CheckboxLabel>
              </CheckboxControl>
            </CheckboxGroup>
            <FormGroup>
              <Label>Banner Image</Label>
              <FileInputWrapper>
                <FaImage />
                <FileInput
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!banner}
                />
                <FileInputText>Choose image file...</FileInputText>
              </FileInputWrapper>
              {imagePreview && (
                <MediaPreview>
                  <img src={imagePreview} alt="Banner preview" />
                </MediaPreview>
              )}
            </FormGroup>
            <FormGroup>
              <Label>Promotional Video (optional)</Label>
              <FileInputWrapper>
                <FaVideo />
                <FileInput
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                />
                <FileInputText>Choose video file...</FileInputText>
              </FileInputWrapper>
              {videoPreview && (
                <MediaPreview>
                  <video src={videoPreview} controls />
                </MediaPreview>
              )}
            </FormGroup>
            <FormGroup>
              <Label>Banner Characters</Label>
              <FormHint style={{ marginBottom: '12px' }}>Select characters that are featured in this banner</FormHint>
              <CharacterSelector>
                <SelectorHeader>
                  <SelectedCount>
                    {formData.selectedCharacters.length} characters selected
                  </SelectedCount>
                  <SearchWrapper>
                    <SearchIcon><FaSearch /></SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Search by name or series..."
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                    />
                    {characterSearch && (
                      <ClearSearchBtn onClick={() => setCharacterSearch('')}>×</ClearSearchBtn>
                    )}
                  </SearchWrapper>
                </SelectorHeader>
                <CharacterGrid>
                  {filteredCharacters.length > 0 ? (
                    filteredCharacters.map(char => (
                      <CharacterOption
                        key={char.id}
                        $selected={formData.selectedCharacters.includes(char.id)}
                        $rarity={char.rarity}
                        onClick={() => handleCharacterToggle(char.id)}
                      >
                        {renderCharacterMedia(char)}
                        <CharOptionInfo>
                          <CharOptionName>{char.name}</CharOptionName>
                          <CharOptionSeries>{char.series}</CharOptionSeries>
                          <CharOptionBadges>
                            <CharOptionRarity $rarity={char.rarity}>{char.rarity}</CharOptionRarity>
                            {char.isR18 && <R18Badge>🔞 R18</R18Badge>}
                          </CharOptionBadges>
                        </CharOptionInfo>
                        <CharOptionCheck $selected={formData.selectedCharacters.includes(char.id)}>
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
              <CancelButton type="button" onClick={onClose}>Cancel</CancelButton>
              <SubmitButton type="submit">
                {banner ? 'Update Banner' : 'Create Banner'}
              </SubmitButton>
            </ButtonGroup>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};
  
// ==================== STYLED COMPONENTS ====================

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;
  
const ModalContent = styled.div`
  background: #1c1c1e;
  border-radius: 20px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 25px 80px rgba(0, 0, 0, 0.5);
`;
  
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
`;
  
const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
`;
  
const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;
  
const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 15px;
  color: #fff;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #007AFF;
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 15px;
  color: #fff;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #007AFF;
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;
  
const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
  
  ${FormGroup} {
    margin-bottom: 0;
  }
`;
  
const DateInputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 14px;
  
  svg {
    color: rgba(255, 255, 255, 0.4);
    margin-right: 10px;
    flex-shrink: 0;
  }
  
  input {
    border: none;
    background: transparent;
    padding: 12px 0;
    flex: 1;
    
    &:focus {
      outline: none;
    }
    
    &::-webkit-calendar-picker-indicator {
      filter: invert(1);
      opacity: 0.5;
      cursor: pointer;
    }
  }
`;

const FileInputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  svg {
    color: rgba(255, 255, 255, 0.4);
    margin-right: 10px;
    font-size: 18px;
  }
`;

const FileInput = styled.input`
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
`;

const FileInputText = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
`;
  
const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
`;
  
const CheckboxControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #007AFF;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  color: ${props => props.$r18 ? '#FF453A' : 'rgba(255, 255, 255, 0.8)'};
  font-size: 14px;
  cursor: pointer;
  font-weight: ${props => props.$r18 ? '500' : '400'};
`;
  
const FormHint = styled.p`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 6px;
  margin-bottom: 0;
`;
  
const MediaPreview = styled.div`
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  
  img, video {
    max-width: 100%;
    max-height: 200px;
    display: block;
  }
`;
  
const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;
  
const SubmitButton = styled.button`
  background: #007AFF;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #0056CC;
  }
`;
  
const CancelButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;
  
const CharacterSelector = styled.div`
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  max-height: 450px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;
  
const SelectorHeader = styled.div`
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
  
const SelectedCount = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
`;
  
const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
`;
  
const SearchIcon = styled.div`
  padding: 0 12px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
`;
  
const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 0;
  font-size: 14px;
  color: #fff;
  
  &:focus {
    outline: none;
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;
  
const ClearSearchBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 20px;
  cursor: pointer;
  padding: 0 12px;
  
  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
`;
  
const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 12px;
  overflow-y: auto;
  max-height: 350px;
  
  @media (min-width: 700px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;
  
const NoResults = styled.div`
  padding: 30px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  grid-column: 1 / -1;
`;
  
const rarityColors = {
  common: '#8E8E93',
  uncommon: '#34C759',
  rare: '#007AFF',
  epic: '#AF52DE',
  legendary: '#FF9F0A'
};
  
const CharacterOption = styled.div`
  border: 2px solid ${props => props.$selected ? rarityColors[props.$rarity] : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  overflow: hidden;
  background: ${props => props.$selected ? `${rarityColors[props.$rarity]}15` : 'rgba(255, 255, 255, 0.03)'};
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 90px;
  
  &:hover {
    border-color: ${props => rarityColors[props.$rarity]};
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.06);
  }
`;
  
const CharOptionImage = styled.img`
  width: 72px;
  height: 72px;
  object-fit: cover;
  display: block;
  flex-shrink: 0;
  border-radius: 8px;
  margin: 9px;
`;

const CharOptionVideo = styled.video`
  width: 72px;
  height: 72px;
  object-fit: cover;
  display: block;
  flex-shrink: 0;
  border-radius: 8px;
  margin: 9px;
`;
  
const CharOptionInfo = styled.div`
  flex: 1;
  padding: 12px 8px 12px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
`;
  
const CharOptionName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;
  
const CharOptionSeries = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;
  
const CharOptionBadges = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const CharOptionRarity = styled.div`
  display: inline-flex;
  align-items: center;
  font-size: 9px;
  color: ${props => rarityColors[props.$rarity]};
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.3px;
  padding: 2px 6px;
  background: ${props => `${rarityColors[props.$rarity]}25`};
  border-radius: 3px;
`;

const R18Badge = styled.span`
  font-size: 9px;
  color: #FF453A;
  background: rgba(255, 69, 58, 0.2);
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 600;
`;
  
const CharOptionCheck = styled.div`
  width: 26px;
  height: 26px;
  background: ${props => props.$selected ? '#34C759' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #fff;
  font-size: 14px;
  border: 2px solid ${props => props.$selected ? '#34C759' : 'rgba(255, 255, 255, 0.2)'};
  flex-shrink: 0;
  margin-right: 10px;
  transition: all 0.2s;
`;
  
const getImageUrl = (imagePath) => {
  if (!imagePath) return PLACEHOLDER_IMAGE;
  return getAssetUrl(imagePath);
};
  
export default BannerFormModal;
