import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaCheck, FaExclamationTriangle, FaDownload, FaStar, FaUsers, FaSpinner, FaImage, FaVideo, FaPlay } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

const AnimeImportModal = ({ show, onClose, onSuccess }) => {
  const { t } = useTranslation();
  
  // Media source toggle: 'images' (MAL) or 'videos' (Sakugabooru)
  const [mediaSource, setMediaSource] = useState('images');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  // Selected anime state (for images mode)
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [animeCharacters, setAnimeCharacters] = useState([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  
  // Video search state (for videos mode - Sakugabooru)
  const [videoResults, setVideoResults] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [videoPage, setVideoPage] = useState(1);
  const [hasMoreVideos, setHasMoreVideos] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  
  // Selected characters for import
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  
  // Import settings
  const [seriesName, setSeriesName] = useState('');
  const [defaultRarity, setDefaultRarity] = useState('common');
  
  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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

  // Search for videos (videos mode - Sakugabooru)
  const handleVideoSearch = useCallback(async (page = 1) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    setSearching(true);
    setSearchError(null);
    if (page === 1) {
      setVideoResults([]);
      setSelectedVideos([]);
    }
    
    try {
      const response = await api.get(`/anime-import/search-sakuga?q=${encodeURIComponent(searchQuery)}&page=${page}`);
      const newResults = response.data.results || [];
      
      if (page === 1) {
        setVideoResults(newResults);
      } else {
        setVideoResults(prev => [...prev, ...newResults]);
      }
      
      setVideoPage(page);
      setHasMoreVideos(response.data.hasMore);
    } catch (err) {
      setSearchError(err.response?.data?.error || t('animeImport.failedVideoSearch'));
    } finally {
      setSearching(false);
    }
  }, [searchQuery, t]);

  // Fetch tag suggestions from Sakugabooru
  const fetchTagSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestedTags([]);
      return;
    }
    
    try {
      const response = await api.get(`/anime-import/sakuga-tags?q=${encodeURIComponent(query)}`);
      setSuggestedTags(response.data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tag suggestions:', err);
    }
  }, []);

  // Handle unified search based on mode
  const handleUnifiedSearch = useCallback(() => {
    if (mediaSource === 'images') {
      handleSearch();
    } else {
      handleVideoSearch(1);
    }
  }, [mediaSource, handleSearch, handleVideoSearch]);

  // Load more videos
  const loadMoreVideos = useCallback(() => {
    handleVideoSearch(videoPage + 1);
  }, [handleVideoSearch, videoPage]);

  // Toggle video selection
  const toggleVideo = useCallback((video) => {
    setSelectedVideos(prev => {
      const exists = prev.find(v => v.id === video.id);
      if (exists) {
        return prev.filter(v => v.id !== video.id);
      }
      return [...prev, video];
    });
  }, []);

  // Select all videos
  const selectAllVideos = useCallback(() => {
    setSelectedVideos([...videoResults]);
  }, [videoResults]);

  // Deselect all videos
  const deselectAllVideos = useCallback(() => {
    setSelectedVideos([]);
  }, []);

  // Set rarity for individual video
  const setVideoRarity = useCallback((id, rarity) => {
    setSelectedVideos(prev => 
      prev.map(v => v.id === id ? { ...v, rarity } : v)
    );
  }, []);

  // Set name for individual video
  const setVideoName = useCallback((id, name) => {
    setSelectedVideos(prev => 
      prev.map(v => v.id === id ? { ...v, customName: name } : v)
    );
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

  // Import selected characters or videos
  const handleImport = async () => {
    const hasCharacters = selectedCharacters.length > 0;
    const hasVideos = selectedVideos.length > 0;
    
    if ((!hasCharacters && !hasVideos) || !seriesName.trim()) return;
    
    setImporting(true);
    setImportResult(null);
    
    try {
      // Prepare items based on mode
      let charactersToImport = [];
      
      if (mediaSource === 'images' && hasCharacters) {
        charactersToImport = selectedCharacters.map(c => ({
          name: c.name,
          image: c.image,
          rarity: c.rarity || defaultRarity
        }));
      } else if (mediaSource === 'videos' && hasVideos) {
        charactersToImport = selectedVideos.map(v => ({
          // Use custom name or generate from tags
          name: v.customName || extractNameFromTags(v.tags) || `Video ${v.id}`,
          image: v.file, // The video URL goes into the image field
          rarity: v.rarity || defaultRarity
        }));
      }
      
      const response = await api.post('/anime-import/import', {
        characters: charactersToImport,
        series: seriesName.trim(),
        rarity: defaultRarity
      });
      
      setImportResult(response.data);
      
      if (onSuccess && response.data.characters?.length > 0) {
        onSuccess(response.data);
      }
      
      // Clear selections on success
      setSelectedCharacters([]);
      setSelectedVideos([]);
      setAnimeCharacters([]);
      setVideoResults([]);
      setSelectedAnime(null);
    } catch (err) {
      setImportResult({ error: err.response?.data?.error || t('animeImport.importFailed') });
    } finally {
      setImporting(false);
    }
  };

  // Helper to extract a meaningful name from Sakugabooru tags
  const extractNameFromTags = (tagsString) => {
    if (!tagsString) return null;
    const tags = tagsString.split(' ');
    // Look for character tags (type 4) or just use first meaningful tag
    // Common patterns: character names are usually multi-word with underscores
    const characterTag = tags.find(t => t.includes('_') && !t.startsWith('animated') && !t.startsWith('effects'));
    if (characterTag) {
      // Convert underscore_name to Title Case Name
      return characterTag.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    return null;
  };

  // Handle close
  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAnime(null);
    setAnimeCharacters([]);
    setSelectedCharacters([]);
    setVideoResults([]);
    setSelectedVideos([]);
    setSuggestedTags([]);
    setSeriesName('');
    setImportResult(null);
    onClose();
  };

  // Handle mode switch
  const handleModeSwitch = (mode) => {
    setMediaSource(mode);
    // Clear results when switching modes
    setSearchResults([]);
    setVideoResults([]);
    setSelectedCharacters([]);
    setSelectedVideos([]);
    setSelectedAnime(null);
    setAnimeCharacters([]);
    setSearchError(null);
    setImportResult(null);
  };

  // Handle search on Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleUnifiedSearch();
    }
  };

  // Get item count for import button
  const getImportCount = () => {
    return mediaSource === 'images' ? selectedCharacters.length : selectedVideos.length;
  };

  if (!show) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h2><FaDownload /> {t('animeImport.title')}</h2>
          <CloseButton onClick={handleClose}><FaTimes /></CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Media Source Toggle */}
          <SourceToggle>
            <SourceButton 
              $active={mediaSource === 'images'} 
              onClick={() => handleModeSwitch('images')}
            >
              <FaImage /> {t('animeImport.imagesMode')}
            </SourceButton>
            <SourceButton 
              $active={mediaSource === 'videos'} 
              onClick={() => handleModeSwitch('videos')}
            >
              <FaVideo /> {t('animeImport.videosMode')}
            </SourceButton>
          </SourceToggle>

          {/* Search Section */}
          <SearchSection>
            <SectionTitle>
              {mediaSource === 'images' 
                ? t('animeImport.searchAnime') 
                : t('animeImport.searchVideos')}
            </SectionTitle>
            <SearchRow>
              <SearchInput
                type="text"
                placeholder={mediaSource === 'images' 
                  ? t('animeImport.searchPlaceholder')
                  : t('animeImport.searchVideoPlaceholder')}
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (mediaSource === 'videos') {
                    fetchTagSuggestions(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
              />
              <SearchButton onClick={handleUnifiedSearch} disabled={searching || searchQuery.length < 2}>
                {searching ? <FaSpinner className="spin" /> : <FaSearch />}
                {searching ? t('animeImport.searching') : t('common.search')}
              </SearchButton>
            </SearchRow>
            
            {/* Tag suggestions for video mode */}
            {mediaSource === 'videos' && suggestedTags.length > 0 && (
              <TagSuggestions>
                {suggestedTags.slice(0, 6).map(tag => (
                  <TagChip 
                    key={tag.name}
                    onClick={() => {
                      setSearchQuery(tag.name.replace(/_/g, ' '));
                      setSuggestedTags([]);
                    }}
                  >
                    {tag.name.replace(/_/g, ' ')} ({tag.count})
                  </TagChip>
                ))}
              </TagSuggestions>
            )}
            
            {searchError && <ErrorText>{searchError}</ErrorText>}
          </SearchSection>

          {/* Search Results - Images Mode */}
          {mediaSource === 'images' && searchResults.length > 0 && !selectedAnime && (
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

          {/* Selected Anime Characters - Images Mode */}
          {mediaSource === 'images' && selectedAnime && (
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
                      return (
                        <CharacterCard
                          key={char.mal_id}
                          $selected={isSelected}
                          onClick={() => toggleCharacter(char)}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.03 }}
                        >
                          <CharacterImage src={char.image} alt={char.name} />
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
                              <RaritySelect 
                                onClick={e => e.stopPropagation()}
                                value={isSelected.rarity || defaultRarity}
                                onChange={e => setCharacterRarity(char.mal_id, e.target.value)}
                              >
                                <option value="common">{t('gacha.common')}</option>
                                <option value="uncommon">{t('gacha.uncommon')}</option>
                                <option value="rare">{t('gacha.rare')}</option>
                                <option value="epic">{t('gacha.epic')}</option>
                                <option value="legendary">{t('gacha.legendary')}</option>
                              </RaritySelect>
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

          {/* Video Results - Videos Mode (Sakugabooru) */}
          {mediaSource === 'videos' && videoResults.length > 0 && (
            <VideoResultsSection>
              <CharactersHeader>
                <div>
                  <SectionTitle>
                    <FaVideo /> {t('animeImport.videoResults', { count: videoResults.length })}
                  </SectionTitle>
                  <SourceNote>{t('animeImport.danbooru')}</SourceNote>
                </div>
                <SelectionButtons>
                  <SmallButton onClick={selectAllVideos}>{t('animeImport.selectAll')}</SmallButton>
                  <SmallButton onClick={deselectAllVideos}>{t('animeImport.deselectAll')}</SmallButton>
                </SelectionButtons>
              </CharactersHeader>

              <VideoGrid>
                <AnimatePresence>
                  {videoResults.map(video => {
                    const isSelected = selectedVideos.find(v => v.id === video.id);
                    return (
                      <VideoCard
                        key={video.id}
                        $selected={isSelected}
                        onClick={() => toggleVideo(video)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.03 }}
                      >
                        <VideoPreview>
                          <img src={video.preview} alt={`Video ${video.id}`} />
                          <VideoPlayIcon>
                            <FaPlay />
                          </VideoPlayIcon>
                          <VideoFormat>{video.fileExt?.toUpperCase()}</VideoFormat>
                        </VideoPreview>
                        {isSelected && (
                          <SelectedOverlay>
                            <FaCheck />
                          </SelectedOverlay>
                        )}
                        <VideoInfo>
                          {isSelected && (
                            <>
                              <VideoNameInput
                                type="text"
                                placeholder={t('animeImport.characterName')}
                                value={isSelected.customName || ''}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setVideoName(video.id, e.target.value)}
                              />
                              <RaritySelect 
                                onClick={e => e.stopPropagation()}
                                value={isSelected.rarity || defaultRarity}
                                onChange={e => setVideoRarity(video.id, e.target.value)}
                              >
                                <option value="common">{t('gacha.common')}</option>
                                <option value="uncommon">{t('gacha.uncommon')}</option>
                                <option value="rare">{t('gacha.rare')}</option>
                                <option value="epic">{t('gacha.epic')}</option>
                                <option value="legendary">{t('gacha.legendary')}</option>
                              </RaritySelect>
                            </>
                          )}
                          {!isSelected && (
                            <VideoScore>
                              {video.score > 0 && <><FaStar /> {video.score}</>}
                            </VideoScore>
                          )}
                        </VideoInfo>
                      </VideoCard>
                    );
                  })}
                </AnimatePresence>
              </VideoGrid>

              {hasMoreVideos && (
                <LoadMoreButton onClick={loadMoreVideos} disabled={searching}>
                  {searching ? <FaSpinner className="spin" /> : null}
                  {t('animeImport.loadMore')}
                </LoadMoreButton>
              )}
            </VideoResultsSection>
          )}

          {/* Import Settings */}
          {(selectedCharacters.length > 0 || selectedVideos.length > 0) && (
            <ImportSettingsSection>
              <SectionTitle>{t('animeImport.importSettings', { count: getImportCount() })}</SectionTitle>
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
                  <select value={defaultRarity} onChange={e => setDefaultRarity(e.target.value)}>
                    <option value="common">{t('gacha.common')}</option>
                    <option value="uncommon">{t('gacha.uncommon')}</option>
                    <option value="rare">{t('gacha.rare')}</option>
                    <option value="epic">{t('gacha.epic')}</option>
                    <option value="legendary">{t('gacha.legendary')}</option>
                  </select>
                </SettingsField>
              </SettingsGrid>
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
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={handleClose} disabled={importing}>
            {t('common.cancel')}
          </CancelButton>
          <ImportButton 
            onClick={handleImport} 
            disabled={importing || getImportCount() === 0 || !seriesName.trim()}
          >
            {importing ? (
              <><FaSpinner className="spin" /> {t('animeImport.importing')}</>
            ) : (
              <><FaDownload /> {t('animeImport.importCount', { count: getImportCount() })}</>
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

const CharacterImage = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
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

// Media Source Toggle
const SourceToggle = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  width: fit-content;
`;

const SourceButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)' 
    : 'transparent'};
  color: ${props => props.$active ? '#fff' : '#888'};
  
  &:hover {
    color: #fff;
    background: ${props => props.$active 
      ? 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)' 
      : 'rgba(255, 255, 255, 0.1)'};
  }
  
  svg {
    font-size: 1rem;
  }
`;

// Tag Suggestions
const TagSuggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const TagChip = styled.button`
  background: rgba(255, 107, 157, 0.15);
  border: 1px solid rgba(255, 107, 157, 0.3);
  color: #ff6b9d;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 107, 157, 0.25);
    border-color: #ff6b9d;
  }
`;

// Video Results
const VideoResultsSection = styled.div`
  margin-bottom: 25px;
`;

const SourceNote = styled.span`
  display: inline-block;
  color: #888;
  font-size: 0.75rem;
  margin-top: 4px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
`;

const VideoCard = styled(motion.div)`
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

const VideoPreview = styled.div`
  position: relative;
  width: 100%;
  height: 120px;
  background: #000;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const VideoPlayIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  pointer-events: none;
`;

const VideoFormat = styled.span`
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
`;

const VideoInfo = styled.div`
  padding: 10px;
  min-height: 40px;
`;

const VideoNameInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 6px 8px;
  color: #fff;
  font-size: 0.8rem;
  margin-bottom: 6px;
  
  &:focus {
    outline: none;
    border-color: #ff6b9d;
  }
  
  &::placeholder {
    color: #666;
  }
`;

const VideoScore = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #888;
  font-size: 0.75rem;
  
  svg {
    color: #ffc107;
    font-size: 10px;
  }
`;

const LoadMoreButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #ccc;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default AnimeImportModal;

