import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaCheck, FaExclamationTriangle, FaDownload, FaStar, FaUsers, FaSpinner, FaImage, FaVideo, FaPlay, FaUser, FaTv, FaTag } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useRarity } from '../../context/RarityContext';

// Category icons for tag display
const CATEGORY_ICON_MAP = {
  4: <FaUser />,  // Character
  3: <FaTv />,    // Series
};
const getCategoryIconComponent = (category) => CATEGORY_ICON_MAP[category] || <FaTag />;

const AnimeImportModal = ({ show, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { getOrderedRarities } = useRarity();
  const orderedRarities = getOrderedRarities();
  
  // Hover preview state for alt media
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  
  // Long press for mobile preview
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  // Selected anime state
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [animeCharacters, setAnimeCharacters] = useState([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  
  // Alternative media search (for Danbooru images/videos)
  const [altMediaCharacter, setAltMediaCharacter] = useState(null); // Character being searched
  const [altMediaResults, setAltMediaResults] = useState([]);
  const [altMediaLoading, setAltMediaLoading] = useState(false);
  const [altMediaTags, setAltMediaTags] = useState([]); // Tag suggestions
  const [altMediaSelectedTag, setAltMediaSelectedTag] = useState(null); // Selected tag
  const [altMediaSort, setAltMediaSort] = useState('score'); // score, favorites, newest
  const [altMediaSearchQuery, setAltMediaSearchQuery] = useState('');
  const [altMediaPage, setAltMediaPage] = useState(1); // Pagination
  const [altMediaHasMore, setAltMediaHasMore] = useState(false);
  const [altMediaLoadingMore, setAltMediaLoadingMore] = useState(false);
  const [altMediaExtraTags, setAltMediaExtraTags] = useState(''); // Additional filter tags
  const [altMediaTypeFilter, setAltMediaTypeFilter] = useState('all'); // all, animated, static
  
  // Selected characters for import
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  
  // Import settings
  const [seriesName, setSeriesName] = useState('');
  const [defaultRarity, setDefaultRarity] = useState('common');
  const [autoRarity, setAutoRarity] = useState(true); // Auto-calculate rarity from MAL favorites
  
  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Search for matching Danbooru tags
  const searchAltMediaTags = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setAltMediaTags([]);
      return;
    }
    
    setAltMediaLoading(true);
    try {
      // Search for character tags (category 4)
      const response = await api.get(`/anime-import/sakuga-tags?q=${encodeURIComponent(query)}`);
      setAltMediaTags(response.data.tags || []);
    } catch (err) {
      console.error('Tag search failed:', err);
    } finally {
      setAltMediaLoading(false);
    }
  }, []);

  // Search for anime (images mode - MAL)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedAnime(null);
    setAnimeCharacters([]);
    setSelectedCharacters([]);
    
    try {
      const response = await api.get(`/anime-import/search-anime?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.results || []);
    } catch (err) {
      setSearchError(err.response?.data?.error || t('animeImport.failedSearch'));
    } finally {
      setSearching(false);
    }
  }, [searchQuery, t]);

  // Open alt media picker for a character
  const openAltMediaPicker = useCallback((character) => {
    // Prepare initial search query from character name
    let searchName = character.name;
    if (searchName.includes(',')) {
      // "Monkey D., Luffy" -> "Luffy"
      const parts = searchName.split(',').map(p => p.trim());
      searchName = parts.reverse()[0]; // Get first name
    }
    searchName = searchName.split(' ')[0]; // Just first word
    
    setAltMediaCharacter(character);
    setAltMediaSearchQuery(searchName);
    setAltMediaTags([]);
    setAltMediaSelectedTag(null);
    setAltMediaResults([]);
    
    // Auto-search for tags
    searchAltMediaTags(searchName);
  }, [searchAltMediaTags]);


  // Select a tag and load images
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

  // Change sort and reload
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

  // Load more results
  const loadMoreAltMedia = useCallback(() => {
    if (altMediaSelectedTag && altMediaHasMore && !altMediaLoadingMore) {
      selectAltMediaTag(altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, altMediaPage + 1, true);
    }
  }, [altMediaSelectedTag, altMediaHasMore, altMediaLoadingMore, altMediaPage, altMediaExtraTags, altMediaTypeFilter, selectAltMediaTag]);

  // Apply extra filters
  const applyExtraFilters = useCallback(() => {
    if (altMediaSelectedTag) {
      selectAltMediaTag(altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, 1, false);
    }
  }, [altMediaSelectedTag, altMediaExtraTags, altMediaTypeFilter, selectAltMediaTag]);

  // Select alternative media for a character
  const selectAltMedia = useCallback((media) => {
    if (!altMediaCharacter) return;
    
    // Update the selected character with the new media
    setSelectedCharacters(prev => 
      prev.map(c => c.mal_id === altMediaCharacter.mal_id 
        ? { ...c, image: media.file, altMedia: media, isVideo: true }
        : c
      )
    );
    
    // Also update in animeCharacters for display
    setAnimeCharacters(prev =>
      prev.map(c => c.mal_id === altMediaCharacter.mal_id
        ? { ...c, image: media.file, altMedia: media, isVideo: true }
        : c
      )
    );
    
    // Close the alt media picker
    setAltMediaCharacter(null);
    setAltMediaResults([]);
  }, [altMediaCharacter]);

  // Close alt media picker
  const closeAltMediaPicker = useCallback(() => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setHoveredMedia(null);
    setAltMediaCharacter(null);
    setAltMediaResults([]);
    setAltMediaTags([]);
    setAltMediaSelectedTag(null);
    setAltMediaSearchQuery('');
    setAltMediaPage(1);
    setAltMediaHasMore(false);
    setAltMediaExtraTags('');
    setAltMediaTypeFilter('all');
  }, []);

  // Select an anime and fetch its characters
  const handleSelectAnime = useCallback(async (anime) => {
    setSelectedAnime(anime);
    setSeriesName(anime.title_english || anime.title);
    setLoadingCharacters(true);
    setAnimeCharacters([]);
    setSelectedCharacters([]);
    
    try {
      const response = await api.get(`/anime-import/anime/${anime.mal_id}/characters`);
      setAnimeCharacters(response.data.characters || []);
    } catch (err) {
      console.error('Failed to fetch characters:', err);
    } finally {
      setLoadingCharacters(false);
    }
  }, []);

  // Toggle character selection
  const toggleCharacter = useCallback((character) => {
    setSelectedCharacters(prev => {
      const exists = prev.find(c => c.mal_id === character.mal_id);
      if (exists) {
        return prev.filter(c => c.mal_id !== character.mal_id);
      }
      return [...prev, character];
    });
  }, []);

  // Select all characters
  const selectAllCharacters = useCallback(() => {
    setSelectedCharacters([...animeCharacters]);
  }, [animeCharacters]);

  // Deselect all characters
  const deselectAllCharacters = useCallback(() => {
    setSelectedCharacters([]);
  }, []);

  // Set rarity for individual character
  const setCharacterRarity = useCallback((mal_id, rarity) => {
    setSelectedCharacters(prev => 
      prev.map(c => c.mal_id === mal_id ? { ...c, rarity } : c)
    );
  }, []);

  // Import selected characters
  const handleImport = async () => {
    if (selectedCharacters.length === 0 || !seriesName.trim()) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Include mal_id, role, and favorites for auto-rarity calculation
      const charactersToImport = selectedCharacters.map(c => ({
        name: c.name,
        image: c.image,
        mal_id: c.mal_id,
        role: c.role,
        favorites: c.favorites,
        rarity: autoRarity ? undefined : (c.rarity || defaultRarity) // Only send rarity if not using auto
      }));

      const response = await api.post('/anime-import/import', {
        characters: charactersToImport,
        series: seriesName.trim(),
        rarity: defaultRarity,
        autoRarity: autoRarity
      });

      setImportResult(response.data);

      if (onSuccess && response.data.characters?.length > 0) {
        onSuccess(response.data);
      }

      // Clear selections on success
      setSelectedCharacters([]);
      setAnimeCharacters([]);
      setSelectedAnime(null);
    } catch (err) {
      setImportResult({ error: err.response?.data?.error || t('animeImport.importFailed') });
    } finally {
      setImporting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAnime(null);
    setAnimeCharacters([]);
    setSelectedCharacters([]);
    setSeriesName('');
    setImportResult(null);
    setAltMediaCharacter(null);
    setAltMediaResults([]);
    onClose();
  };

  // Handle search on Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!show) return null;

  return (
    <ModalOverlay onMouseDown={handleClose}>
      <ModalContent onMouseDown={e => e.stopPropagation()}>
        <ModalHeader>
          <h2><FaDownload /> {t('animeImport.title')}</h2>
          <CloseButton onClick={handleClose}><FaTimes /></CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Search Section */}
          <SearchSection>
            <SectionTitle>{t('animeImport.searchAnime')}</SectionTitle>
            <SearchRow>
              <SearchInput
                type="text"
                placeholder={t('animeImport.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <SearchButton onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
                {searching ? <FaSpinner className="spin" /> : <FaSearch />}
                {searching ? t('animeImport.searching') : t('common.search')}
              </SearchButton>
            </SearchRow>
            {searchError && <ErrorText>{searchError}</ErrorText>}
          </SearchSection>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedAnime && (
            <ResultsSection>
              <SectionTitle>{t('animeImport.selectAnime', { count: searchResults.length })}</SectionTitle>
              <AnimeGrid>
                {searchResults.map(anime => (
                  <AnimeCard 
                    key={anime.mal_id} 
                    onClick={() => handleSelectAnime(anime)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <AnimeImage src={anime.image} alt={anime.title} />
                    <AnimeInfo>
                      <AnimeTitle>{anime.title_english || anime.title}</AnimeTitle>
                      {anime.title_japanese && (
                        <AnimeSubtitle>{anime.title_japanese}</AnimeSubtitle>
                      )}
                      <AnimeMeta>
                        {anime.score && <MetaItem><FaStar /> {anime.score}</MetaItem>}
                        {anime.episodes && <MetaItem>{anime.episodes} eps</MetaItem>}
                        {anime.year && <MetaItem>{anime.year}</MetaItem>}
                      </AnimeMeta>
                    </AnimeInfo>
                  </AnimeCard>
                ))}
              </AnimeGrid>
            </ResultsSection>
          )}

          {/* Selected Anime Characters */}
          {selectedAnime && (
            <CharactersSection>
              <CharactersHeader>
                <div>
                  <SectionTitle>
                    <FaUsers /> {t('animeImport.charactersFrom', { anime: selectedAnime.title_english || selectedAnime.title })}
                  </SectionTitle>
                  <BackButton onClick={() => {
                    setSelectedAnime(null);
                    setAnimeCharacters([]);
                    setSelectedCharacters([]);
                  }}>
                    ← {t('animeImport.backToResults')}
                  </BackButton>
                </div>
                <SelectionButtons>
                  <SmallButton onClick={selectAllCharacters}>{t('animeImport.selectAll')}</SmallButton>
                  <SmallButton onClick={deselectAllCharacters}>{t('animeImport.deselectAll')}</SmallButton>
                </SelectionButtons>
              </CharactersHeader>

              {loadingCharacters ? (
                <LoadingText><FaSpinner className="spin" /> {t('animeImport.loadingCharacters')}</LoadingText>
              ) : animeCharacters.length === 0 ? (
                <EmptyText>{t('animeImport.noCharactersFound')}</EmptyText>
              ) : (
                <CharactersGrid>
                  <AnimatePresence>
                    {animeCharacters.map(char => {
                      const isSelected = selectedCharacters.find(c => c.mal_id === char.mal_id);
                      const hasAltMedia = isSelected?.altMedia || char.altMedia;
                      return (
                        <CharacterCard
                          key={char.mal_id}
                          $selected={isSelected}
                          onClick={() => toggleCharacter(char)}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.03 }}
                        >
                          <CharacterImageWrapper>
                            {hasAltMedia ? (
                              <>
                                <CharacterImage src={hasAltMedia.preview || hasAltMedia.file} alt={char.name} />
                                <VideoIndicator><FaVideo /></VideoIndicator>
                              </>
                            ) : (
                              <CharacterImage src={char.image} alt={char.name} />
                            )}
                          </CharacterImageWrapper>
                          {isSelected && (
                            <SelectedOverlay>
                              <FaCheck />
                            </SelectedOverlay>
                          )}
                          <CharacterInfo>
                            <CharacterName>{char.name}</CharacterName>
                            <CharacterRole $main={char.role === 'Main'}>
                              {char.role === 'Main' ? t('animeImport.main') : t('animeImport.supporting')}
                            </CharacterRole>
                            {isSelected && (
                              <>
                                <FindVideoButton
                                  onClick={e => {
                                    e.stopPropagation();
                                    openAltMediaPicker(char);
                                  }}
                                  $hasAlt={hasAltMedia}
                                >
                                  <FaImage /> {hasAltMedia ? t('animeImport.changeAltImage') : t('animeImport.findAltImage')}
                                </FindVideoButton>
                                {!autoRarity && (
                                  <RaritySelect
                                    onClick={e => e.stopPropagation()}
                                    value={isSelected.rarity || defaultRarity}
                                    onChange={e => setCharacterRarity(char.mal_id, e.target.value)}
                                  >
                                    {orderedRarities.map(r => (
                                      <option key={r.id} value={r.name.toLowerCase()}>
                                        {t(`gacha.${r.name.toLowerCase()}`, r.name)}
                                      </option>
                                    ))}
                                  </RaritySelect>
                                )}
                              </>
                            )}
                          </CharacterInfo>
                        </CharacterCard>
                      );
                    })}
                  </AnimatePresence>
                </CharactersGrid>
              )}
            </CharactersSection>
          )}


          {/* Import Settings */}
          {selectedCharacters.length > 0 && (
            <ImportSettingsSection>
              <SectionTitle>{t('animeImport.importSettings', { count: selectedCharacters.length })}</SectionTitle>
              <SettingsGrid>
                <SettingsField>
                  <label>{t('animeImport.seriesName')}</label>
                  <input
                    type="text"
                    value={seriesName}
                    onChange={e => setSeriesName(e.target.value)}
                    placeholder={t('animeImport.enterSeriesName')}
                  />
                </SettingsField>
                <SettingsField>
                  <label>{t('animeImport.defaultRarity')}</label>
                  <select
                    value={defaultRarity}
                    onChange={e => setDefaultRarity(e.target.value)}
                    disabled={autoRarity}
                    style={{ opacity: autoRarity ? 0.5 : 1 }}
                  >
                    {orderedRarities.map(r => (
                      <option key={r.id} value={r.name.toLowerCase()}>
                        {t(`gacha.${r.name.toLowerCase()}`, r.name)}
                      </option>
                    ))}
                  </select>
                </SettingsField>
              </SettingsGrid>
              <AutoRarityToggle>
                <AutoRarityCheckbox
                  type="checkbox"
                  id="autoRarity"
                  checked={autoRarity}
                  onChange={e => setAutoRarity(e.target.checked)}
                />
                <AutoRarityLabel htmlFor="autoRarity">
                  <FaStar style={{ color: '#ffc107' }} />
                  {t('animeImport.autoRarity', 'Auto-calculate rarity from MAL popularity')}
                </AutoRarityLabel>
                <AutoRarityHint>
                  {t('animeImport.autoRarityHint', 'Uses character favorites count to determine rarity (50k+ = Legendary, 10k+ = Epic, etc.)')}
                </AutoRarityHint>
              </AutoRarityToggle>
            </ImportSettingsSection>
          )}

          {/* Import Result */}
          {importResult && (
            <ResultSection $error={!!importResult.error}>
              {importResult.error ? (
                <>
                  <FaExclamationTriangle />
                  <span>{t('common.error')}: {importResult.error}</span>
                </>
              ) : (
                <>
                  <FaCheck />
                  <span>{importResult.message}</span>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <ErrorList>
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err.name}: {err.error}</li>
                      ))}
                    </ErrorList>
                  )}
                </>
              )}
            </ResultSection>
          )}

          {/* Alt Media Picker Modal */}
          <AnimatePresence>
            {altMediaCharacter && (
              <AltMediaOverlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={closeAltMediaPicker}
              >
                <AltMediaModal
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <AltMediaHeader>
                    <h3><FaImage /> {t('animeImport.findAltImageFor', { name: altMediaCharacter.name })}</h3>
                    <CloseButton onClick={closeAltMediaPicker}><FaTimes /></CloseButton>
                  </AltMediaHeader>
                  
                  <AltMediaBody>
                    {/* Tag Search */}
                    <AltMediaSearchRow>
                      <AltMediaSearchInput
                        type="text"
                        placeholder={t('animeImport.searchTagPlaceholder')}
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
                          <option value="score">{t('animeImport.sortScore')}</option>
                          <option value="favorites">{t('animeImport.sortFavorites')}</option>
                          <option value="newest">{t('animeImport.sortNewest')}</option>
                        </AltMediaSortSelect>
                      )}
                    </AltMediaSearchRow>

                    {/* Tag Suggestions */}
                    {!altMediaSelectedTag && altMediaTags.length > 0 && (
                      <AltMediaTagList>
                        <AltMediaTagLabel>{t('animeImport.selectTag')}</AltMediaTagLabel>
                        {altMediaTags.map(tag => (
                          <AltMediaTagChip
                            key={tag.name}
                            onClick={() => selectAltMediaTag(tag)}
                            $category={tag.category}
                          >
                            <span>{tag.displayName}</span>
                            <AltMediaTagMeta>
                              <span>{getCategoryIconComponent(tag.category)}</span>
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
                            {getCategoryIconComponent(altMediaSelectedTag.category)}
                            {altMediaSelectedTag.displayName}
                          </SelectedTagName>
                          <SmallButton onClick={() => {
                            setAltMediaSelectedTag(null);
                            setAltMediaResults([]);
                            setAltMediaExtraTags('');
                            setAltMediaTypeFilter('all');
                          }}>
                            {t('animeImport.changeTag')}
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
                            onChange={e => {
                              setAltMediaTypeFilter(e.target.value);
                            }}
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
                      <LoadingText><FaSpinner className="spin" /> {t('animeImport.searchingVideos')}</LoadingText>
                    ) : altMediaSelectedTag && altMediaResults.length === 0 ? (
                      <EmptyText>{t('animeImport.noVideosFound')}</EmptyText>
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
                                // Don't select if long press was triggered (preview shown)
                                if (longPressTriggered.current) {
                                  longPressTriggered.current = false;
                                  return;
                                }
                                selectAltMedia(media);
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverPosition({ 
                                  x: rect.left + rect.width / 2, 
                                  y: rect.top 
                                });
                                setHoveredMedia(media);
                              }}
                              onMouseLeave={() => setHoveredMedia(null)}
                              onTouchStart={(e) => {
                                longPressTriggered.current = false;
                                const rect = e.currentTarget.getBoundingClientRect();
                                longPressTimer.current = setTimeout(() => {
                                  longPressTriggered.current = true;
                                  setHoverPosition({ 
                                    x: rect.left + rect.width / 2, 
                                    y: rect.top 
                                  });
                                  setHoveredMedia(media);
                                }, 500);
                              }}
                              onTouchEnd={() => {
                                if (longPressTimer.current) {
                                  clearTimeout(longPressTimer.current);
                                  longPressTimer.current = null;
                                }
                                // Small delay before closing preview so user can see it
                                if (longPressTriggered.current) {
                                  setTimeout(() => setHoveredMedia(null), 100);
                                }
                              }}
                              onTouchMove={() => {
                                // Cancel long press if user moves finger
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
                              <img src={media.preview} alt={`Media option ${media.id} - ${media.isAnimated ? 'animated' : 'static'} ${media.fileExt?.toUpperCase() || ''}`} />
                              <AltMediaFormat $isAnimated={media.isAnimated}>
                                {media.isAnimated ? <><FaPlay /> {media.fileExt?.toUpperCase()}</> : media.fileExt?.toUpperCase()}
                              </AltMediaFormat>
                              <AltMediaScore>
                                <FaStar /> {media.score}
                              </AltMediaScore>
                              <AltMediaSelectOverlay>
                                <FaCheck /> {t('animeImport.selectThis')}
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
                                <HoverPreviewVideo
                                  src={hoveredMedia.file}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                />
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
                      <EmptyText>{t('animeImport.typeToSearch')}</EmptyText>
                    ) : null}
                  </AltMediaBody>
                  
                  <AltMediaFooter>
                    <SourceNote>{t('animeImport.danbooru')}</SourceNote>
                    <SmallButton onClick={closeAltMediaPicker}>{t('common.cancel')}</SmallButton>
                  </AltMediaFooter>
                </AltMediaModal>
              </AltMediaOverlay>
            )}
          </AnimatePresence>
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={handleClose} disabled={importing}>
            {t('common.cancel')}
          </CancelButton>
          <ImportButton 
            onClick={handleImport} 
            disabled={importing || selectedCharacters.length === 0 || !seriesName.trim()}
          >
            {importing ? (
              <><FaSpinner className="spin" /> {t('animeImport.importing')}</>
            ) : (
              <><FaDownload /> {t('animeImport.importCount', { count: selectedCharacters.length })}</>
            )}
          </ImportButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h2 {
    margin: 0;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.5rem;
    
    svg {
      color: #ff6b9d;
    }
  }
`;

const CloseButton = styled.button`
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

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 25px;
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SearchSection = styled.div`
  margin-bottom: 25px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #ff6b9d;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SearchRow = styled.div`
  display: flex;
  gap: 12px;
`;

const SearchInput = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 14px 18px;
  color: #fff;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #ff6b9d;
    box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.15);
  }
  
  &::placeholder {
    color: #666;
  }
`;

const SearchButton = styled.button`
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  border: none;
  color: #fff;
  padding: 14px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(255, 107, 157, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  color: #e74c3c;
  margin: 10px 0 0;
  font-size: 0.9rem;
`;

const ResultsSection = styled.div`
  margin-bottom: 25px;
`;

const AnimeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
`;

const AnimeCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  transition: border-color 0.2s;
  
  &:hover {
    border-color: #ff6b9d;
  }
`;

const AnimeImage = styled.img`
  width: 80px;
  height: 110px;
  object-fit: cover;
  flex-shrink: 0;
`;

const AnimeInfo = styled.div`
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const AnimeTitle = styled.h4`
  margin: 0;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const AnimeSubtitle = styled.p`
  margin: 0;
  color: #888;
  font-size: 0.8rem;
`;

const AnimeMeta = styled.div`
  display: flex;
  gap: 10px;
  margin-top: auto;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #aaa;
  font-size: 0.75rem;
  
  svg {
    color: #ffc107;
    font-size: 10px;
  }
`;

const CharactersSection = styled.div`
  margin-bottom: 25px;
`;

const CharactersHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #888;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  margin-top: 5px;
  
  &:hover {
    color: #ff6b9d;
  }
`;

const SelectionButtons = styled.div`
  display: flex;
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

const LoadingText = styled.p`
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

const CharactersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 15px;
`;

const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid ${props => props.$selected ? '#ff6b9d' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s;
  
  &:hover {
    border-color: ${props => props.$selected ? '#ff6b9d' : 'rgba(255, 107, 157, 0.5)'};
  }
`;

const CharacterImageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 180px;
`;

const CharacterImage = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
`;

const VideoIndicator = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const FindVideoButton = styled.button`
  width: 100%;
  margin-top: 6px;
  padding: 6px 8px;
  background: ${props => props.$hasAlt 
    ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' 
    : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'};
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(155, 89, 182, 0.3);
  }
`;

const SelectedOverlay = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: #ff6b9d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
`;

const CharacterInfo = styled.div`
  padding: 12px;
`;

const CharacterName = styled.h5`
  margin: 0 0 4px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CharacterRole = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${props => props.$main ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$main ? '#ffc107' : '#888'};
`;

const RaritySelect = styled.select`
  width: 100%;
  margin-top: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #ff6b9d;
  }
  
  option {
    background: #1a1a2e;
    color: #fff;
  }
`;

const ImportSettingsSection = styled.div`
  background: rgba(255, 107, 157, 0.05);
  border: 1px solid rgba(255, 107, 157, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;

const SettingsField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  label {
    color: #aaa;
    font-size: 0.85rem;
  }
  
  input, select {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 14px;
    color: #fff;
    font-size: 0.95rem;
    
    &:focus {
      outline: none;
      border-color: #ff6b9d;
    }
    
    &::placeholder {
      color: #666;
    }
  }
  
  select {
    cursor: pointer;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 16px;
    padding-right: 35px;
    
    option {
      background: #1a1a2e;
      color: #fff;
    }
  }
`;

const AutoRarityToggle = styled.div`
  margin-top: 15px;
  padding: 12px 16px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.25);
  border-radius: 10px;
`;

const AutoRarityCheckbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #ffc107;
  cursor: pointer;
`;

const AutoRarityLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;

  svg {
    font-size: 1rem;
  }
`;

const AutoRarityHint = styled.p`
  margin: 8px 0 0 26px;
  color: #aaa;
  font-size: 0.8rem;
  line-height: 1.4;
`;

const ResultSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px 20px;
  border-radius: 10px;
  margin-top: 20px;
  background: ${props => props.$error ? 'rgba(231, 76, 60, 0.15)' : 'rgba(46, 204, 113, 0.15)'};
  border: 1px solid ${props => props.$error ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.3)'};

  > div:first-child {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  svg {
    color: ${props => props.$error ? '#e74c3c' : '#2ecc71'};
    flex-shrink: 0;
  }
  
  span {
    color: ${props => props.$error ? '#e74c3c' : '#2ecc71'};
    font-weight: 500;
  }
`;

const ErrorList = styled.ul`
  margin: 10px 0 0 0;
  padding-left: 20px;
  color: #f39c12;
  font-size: 0.85rem;
  
  li {
    margin-bottom: 4px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px 25px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const CancelButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  padding: 12px 25px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ImportButton = styled.button`
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  border: none;
  color: #fff;
  padding: 12px 30px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 25px rgba(255, 107, 157, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SourceNote = styled.span`
  display: inline-block;
  color: #888;
  font-size: 0.75rem;
  margin-top: 4px;
`;

// Alt Media Picker Modal
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
    
    svg {
      color: #9b59b6;
    }
  }
`;

const AltMediaBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 200px;
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

const AltMediaFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  
  &::placeholder {
    color: #666;
  }
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
  
  &::placeholder {
    color: #666;
  }
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

const AltMediaResultsInfo = styled.div`
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 10px;
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

// Hover Preview Components
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

export default AnimeImportModal;

