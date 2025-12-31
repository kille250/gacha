import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FaImage, FaVideo, FaCalendar, FaSearch, FaTimes, FaSpinner, FaCheck } from 'react-icons/fa';
import { getAssetUrl, getCharactersForBanner } from '../../utils/api';
import { isVideo, PLACEHOLDER_IMAGE } from '../../utils/mediaUtils';
import { useRarity } from '../../context/RarityContext';

// Helper function to get image URL with fallback
const getImageUrl = (imagePath) => {
  if (!imagePath) return PLACEHOLDER_IMAGE;
  return getAssetUrl(imagePath);
};

// Rarity order for sorting (highest first)
const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
const ITEMS_PER_PAGE = 100;
const SEARCH_DEBOUNCE_MS = 300;

const BannerFormModal = ({ show, onClose, onSubmit, banner }) => {
  const { t } = useTranslation();
  const { getRarityColor } = useRarity();
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

  // Character selection state - now with server-side fetching
  const [characters, setCharacters] = useState([]);
  const [uniqueSeries, setUniqueSeries] = useState([]);
  const [characterSearch, setCharacterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, hasMore: false });
  const [loading, setLoading] = useState(false);
  const [showSelected, setShowSelected] = useState(false);

  // Refs for debouncing and preventing stale closures
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(characterSearch);
      setCurrentPage(1); // Reset to first page on search change
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [characterSearch]);

  // Fetch characters from server when filters change
  const fetchCharacters = useCallback(async (page = 1, append = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const data = await getCharactersForBanner({
        search: debouncedSearch,
        rarity: rarityFilter,
        series: seriesFilter,
        page,
        limit: ITEMS_PER_PAGE
      });

      if (append) {
        setCharacters(prev => [...prev, ...data.characters]);
      } else {
        setCharacters(data.characters);
      }
      setUniqueSeries(data.series || []);
      setPagination(data.pagination);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch characters:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, rarityFilter, seriesFilter]);

  // Fetch characters when modal opens or filters change
  useEffect(() => {
    if (show) {
      fetchCharacters(1, false);
    }
  }, [show, debouncedSearch, rarityFilter, seriesFilter, fetchCharacters]);

  // Reset filters when rarity or series filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rarityFilter, seriesFilter]);

  // Selected characters for summary display - merge from fetched and form data
  const selectedCharactersList = useMemo(() => {
    // Build a map of all known characters
    const charMap = new Map(characters.map(c => [c.id, c]));
    // Return only those that are selected and we have data for
    return formData.selectedCharacters
      .map(id => charMap.get(id))
      .filter(Boolean);
  }, [characters, formData.selectedCharacters]);

  // Reset and populate form when banner changes
  useEffect(() => {
    if (show) {
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
      setCharacterSearch('');
      setDebouncedSearch('');
      setRarityFilter('all');
      setSeriesFilter('all');
      setCurrentPage(1);
      setShowSelected(false);
    }
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

  const handleCharacterToggle = useCallback((charId) => {
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
  }, []);

  // Bulk action: Select all visible characters
  const handleSelectAllVisible = useCallback(() => {
    const visibleIds = characters.map(c => c.id);
    setFormData(prev => ({
      ...prev,
      selectedCharacters: [...new Set([...prev.selectedCharacters, ...visibleIds])]
    }));
  }, [characters]);

  // Bulk action: Clear all selections
  const handleClearAll = useCallback(() => {
    setFormData(prev => ({ ...prev, selectedCharacters: [] }));
  }, []);

  // Bulk action: Add all from banner's series (server-side fetch)
  const handleAddAllFromSeries = useCallback(async () => {
    if (!formData.series) return;
    setLoading(true);
    try {
      // Fetch all characters from this series
      const data = await getCharactersForBanner({
        series: formData.series,
        limit: 200,
        page: 1
      });
      const matchingIds = data.characters.map(c => c.id);
      setFormData(prev => ({
        ...prev,
        selectedCharacters: [...new Set([...prev.selectedCharacters, ...matchingIds])]
      }));
    } catch (err) {
      console.error('Failed to fetch series characters:', err);
    } finally {
      setLoading(false);
    }
  }, [formData.series]);

  // Load more characters
  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchCharacters(nextPage, true);
  }, [currentPage, fetchCharacters]);

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

  // Toggle show selected - no form submission, just UI toggle
  const handleToggleShowSelected = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSelected(prev => !prev);
  }, []);

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
          <ModalTitle>{banner ? t('admin.bannerForm.editBanner') : t('admin.bannerForm.createNewBanner')}</ModalTitle>
          <CloseButton type="button" onClick={onClose}><FaTimes /></CloseButton>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>{t('admin.bannerForm.bannerName')}</Label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('admin.bannerForm.enterBannerName')}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.bannerForm.seriesName')}</Label>
              <Input
                type="text"
                name="series"
                value={formData.series}
                onChange={handleChange}
                placeholder={t('admin.bannerForm.enterSeriesName')}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.bannerForm.description')}</Label>
              <TextArea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder={t('admin.bannerForm.optionalDescription')}
              />
            </FormGroup>
            <FormRow>
              <FormGroup>
                <Label>{t('admin.bannerForm.startDate')}</Label>
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
                <Label>{t('admin.bannerForm.endDate')}</Label>
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
                <Label>{t('admin.bannerForm.costMultiplier')}</Label>
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
                  {t('admin.bannerForm.costHint', { cost: Math.floor(100 * formData.costMultiplier) })}
                </FormHint>
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.bannerForm.rateMultiplier')}</Label>
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
                  {t('admin.bannerForm.rateHint')}
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
                <CheckboxLabel htmlFor="featured">{t('admin.bannerForm.featuredBanner')}</CheckboxLabel>
              </CheckboxControl>
              <CheckboxControl>
                <Checkbox
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <CheckboxLabel htmlFor="active">{t('admin.active')}</CheckboxLabel>
              </CheckboxControl>
              <CheckboxControl $r18>
                <Checkbox
                  type="checkbox"
                  id="isR18"
                  name="isR18"
                  checked={formData.isR18}
                  onChange={handleChange}
                />
                <CheckboxLabel htmlFor="isR18" $r18>{t('admin.r18Content')}</CheckboxLabel>
              </CheckboxControl>
            </CheckboxGroup>
            <FormGroup>
              <Label>{t('admin.bannerForm.bannerImage')}</Label>
              <FileInputWrapper>
                <FaImage />
                <FileInput
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!banner}
                />
                <FileInputText>{t('admin.bannerForm.chooseImageFile')}</FileInputText>
              </FileInputWrapper>
              {imagePreview && (
                <MediaPreview>
                  <img src={imagePreview} alt="Banner preview" />
                </MediaPreview>
              )}
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.bannerForm.promotionalVideo')}</Label>
              <FileInputWrapper>
                <FaVideo />
                <FileInput
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                />
                <FileInputText>{t('admin.bannerForm.chooseVideoFile')}</FileInputText>
              </FileInputWrapper>
              {videoPreview && (
                <MediaPreview>
                  <video src={videoPreview} controls />
                </MediaPreview>
              )}
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.bannerForm.bannerCharacters')}</Label>
              <FormHint style={{ marginBottom: '12px' }}>{t('admin.bannerForm.bannerCharactersHint')}</FormHint>

              {/* Selection Summary */}
              <SelectionSummary>
                <SummaryHeader>
                  <SelectedCount>
                    {formData.selectedCharacters.length} {t('admin.bannerForm.inPool', 'in pool')}
                  </SelectedCount>
                  {formData.selectedCharacters.length > 0 && (
                    <SummaryActions>
                      <SummaryToggle type="button" onClick={handleToggleShowSelected}>
                        {showSelected ? t('common.hide', 'Hide') : t('common.view', 'View')}
                      </SummaryToggle>
                      <ClearAllBtn type="button" onClick={handleClearAll}>
                        {t('common.clearAll', 'Clear all')}
                      </ClearAllBtn>
                    </SummaryActions>
                  )}
                </SummaryHeader>
                {showSelected && selectedCharactersList.length > 0 && (
                  <SelectedList>
                    {selectedCharactersList.map(char => (
                      <SelectedPill key={char.id} $color={getRarityColor(char.rarity)}>
                        <span>{char.name}</span>
                        <RemovePillBtn type="button" onClick={() => handleCharacterToggle(char.id)}>×</RemovePillBtn>
                      </SelectedPill>
                    ))}
                    {formData.selectedCharacters.length > selectedCharactersList.length && (
                      <SelectedPill $color="#666">
                        <span>+{formData.selectedCharacters.length - selectedCharactersList.length} more</span>
                      </SelectedPill>
                    )}
                  </SelectedList>
                )}
              </SelectionSummary>

              <CharacterSelector>
                <SelectorHeader>
                  {/* Filter Row */}
                  <FilterRow>
                    <FilterSelect
                      value={rarityFilter}
                      onChange={(e) => setRarityFilter(e.target.value)}
                    >
                      <option value="all">{t('admin.bannerForm.allRarities', 'All Rarities')}</option>
                      {RARITY_ORDER.map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                        </option>
                      ))}
                    </FilterSelect>
                    <FilterSelect
                      value={seriesFilter}
                      onChange={(e) => setSeriesFilter(e.target.value)}
                    >
                      <option value="all">{t('admin.bannerForm.allSeries', 'All Series')}</option>
                      {uniqueSeries.map(series => (
                        <option key={series} value={series}>{series}</option>
                      ))}
                    </FilterSelect>
                  </FilterRow>

                  {/* Search Row */}
                  <SearchWrapper>
                    <SearchIcon><FaSearch /></SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder={t('admin.bannerForm.searchByNameSeries')}
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                    />
                    {characterSearch && (
                      <ClearSearchBtn type="button" onClick={() => setCharacterSearch('')}>×</ClearSearchBtn>
                    )}
                    {loading && <LoadingIcon><FaSpinner /></LoadingIcon>}
                  </SearchWrapper>

                  {/* Bulk Actions Row */}
                  <BulkActionsRow>
                    <BulkActionBtn type="button" onClick={handleSelectAllVisible} disabled={loading}>
                      {t('admin.bannerForm.selectAllVisible', 'Select all visible')} ({characters.length})
                    </BulkActionBtn>
                    {formData.series && (
                      <BulkActionBtn type="button" onClick={handleAddAllFromSeries} disabled={loading}>
                        {t('admin.bannerForm.addAllFromSeries', 'Add all from')} "{formData.series}"
                      </BulkActionBtn>
                    )}
                  </BulkActionsRow>

                  {/* Results count */}
                  <ResultsCount>
                    {t('admin.bannerForm.showingOf', 'Showing {{visible}} of {{total}}', {
                      visible: characters.length,
                      total: pagination.total
                    })}
                  </ResultsCount>
                </SelectorHeader>

                <CharacterGrid>
                  {loading && characters.length === 0 ? (
                    <LoadingPlaceholder>
                      <FaSpinner className="spin" />
                      <span>{t('common.loading', 'Loading...')}</span>
                    </LoadingPlaceholder>
                  ) : characters.length > 0 ? (
                    characters.map(char => (
                      <CharacterOption
                        key={char.id}
                        $selected={formData.selectedCharacters.includes(char.id)}
                        $color={getRarityColor(char.rarity)}
                        onClick={() => handleCharacterToggle(char.id)}
                      >
                        {renderCharacterMedia(char)}
                        <CharOptionInfo>
                          <CharOptionName>{char.name}</CharOptionName>
                          <CharOptionSeries>{char.series}</CharOptionSeries>
                          <CharOptionBadges>
                            <CharOptionRarity $color={getRarityColor(char.rarity)}>{char.rarity}</CharOptionRarity>
                            {char.isR18 && <R18Badge>{t('admin.r18Content')}</R18Badge>}
                          </CharOptionBadges>
                        </CharOptionInfo>
                        <CharOptionCheck $selected={formData.selectedCharacters.includes(char.id)}>
                          {formData.selectedCharacters.includes(char.id) && <FaCheck />}
                        </CharOptionCheck>
                      </CharacterOption>
                    ))
                  ) : (
                    <NoResults>{t('admin.bannerForm.noCharactersMatching', { search: characterSearch })}</NoResults>
                  )}
                </CharacterGrid>

                {/* Load More Button */}
                {pagination.hasMore && (
                  <LoadMoreSection>
                    <LoadMoreBtn type="button" onClick={handleLoadMore} disabled={loading}>
                      {loading ? (
                        <><FaSpinner className="spin" /> {t('common.loading', 'Loading...')}</>
                      ) : (
                        t('admin.bannerForm.loadMore', 'Load more') + ` (${pagination.total - characters.length} ${t('admin.bannerForm.remaining', 'remaining')})`
                      )}
                    </LoadMoreBtn>
                  </LoadMoreSection>
                )}
              </CharacterSelector>
            </FormGroup>
            <ButtonGroup>
              <CancelButton type="button" onClick={onClose}>{t('common.cancel')}</CancelButton>
              <SubmitButton type="submit">
                {banner ? t('admin.bannerForm.updateBanner') : t('admin.bannerForm.createBanner')}
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

const LoadingIcon = styled.div`
  padding: 0 12px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
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

const LoadingPlaceholder = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
  gap: 12px;

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const NoResults = styled.div`
  padding: 30px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  grid-column: 1 / -1;
`;

const CharacterOption = styled.div`
  border: 2px solid ${props => props.$selected ? props.$color : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  overflow: hidden;
  background: ${props => props.$selected ? `${props.$color}15` : 'rgba(255, 255, 255, 0.03)'};
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 90px;

  &:hover {
    border-color: ${props => props.$color};
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
  color: ${props => props.$color};
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.3px;
  padding: 2px 6px;
  background: ${props => `${props.$color}25`};
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

// New styled components for filters, pagination, and selection summary

const SelectionSummary = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
`;

const SummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SummaryActions = styled.div`
  display: flex;
  gap: 8px;
`;

const SummaryToggle = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #007AFF;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 122, 255, 0.15);
  }
`;

const ClearAllBtn = styled.button`
  background: rgba(255, 69, 58, 0.15);
  border: none;
  color: #FF453A;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 69, 58, 0.25);
  }
`;

const SelectedList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  max-height: 120px;
  overflow-y: auto;
`;

const SelectedPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${props => `${props.$color}20`};
  border: 1px solid ${props => `${props.$color}40`};
  color: ${props => props.$color};
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 16px;

  span {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const RemovePillBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
`;

const FilterSelect = styled.select`
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #007AFF;
  }

  option {
    background: #1c1c1e;
    color: #fff;
  }
`;

const BulkActionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const BulkActionBtn = styled.button`
  background: rgba(0, 122, 255, 0.15);
  border: 1px solid rgba(0, 122, 255, 0.3);
  color: #007AFF;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(0, 122, 255, 0.25);
    border-color: rgba(0, 122, 255, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultsCount = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: right;
`;

const LoadMoreSection = styled.div`
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: center;
`;

const LoadMoreBtn = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default BannerFormModal;
