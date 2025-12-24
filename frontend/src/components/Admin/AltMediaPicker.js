import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaImage, FaTimes, FaSearch, FaStar, FaSpinner, FaCheck, FaPlay, FaUser, FaTv, FaTag } from 'react-icons/fa';
import api from '../../utils/api';

/**
 * AltMediaPicker - Modal for searching and selecting alternative images/videos from Danbooru
 * Used in character editing to find replacement media
 */
const AltMediaPicker = ({ 
  show, 
  onClose, 
  characterName,
  onSelectMedia 
}) => {
  const { t } = useTranslation();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [results, setResults] = useState([]);
  const [extraTags, setExtraTags] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('score');
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // Hover preview state
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  
  // Long press handling for mobile
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  // Search for tags matching query
  const searchTags = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setTags([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get(`/anime-import/sakuga-tags?q=${encodeURIComponent(query)}`);
      setTags(response.data.tags || []);
    } catch (err) {
      console.error('Tag search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize search when modal opens
  useEffect(() => {
    if (show && characterName) {
      // Prepare initial search query from character name
      let searchName = characterName;
      if (searchName.includes(',')) {
        const parts = searchName.split(',').map(p => p.trim());
        searchName = parts.reverse()[0];
      }
      searchName = searchName.split(' ')[0];
      
      setSearchQuery(searchName);
      setTags([]);
      setSelectedTag(null);
      setResults([]);
      setExtraTags('');
      setTypeFilter('all');
      
      // Auto-search for tags
      searchTags(searchName);
    }
  }, [show, characterName, searchTags]);

  // Select a tag and fetch images
  const selectTag = useCallback(async (tag, currentExtraTags = '', currentTypeFilter = 'all', currentPage = 1, append = false) => {
    if (!append) {
      setSelectedTag(tag);
      setLoading(true);
      setResults([]);
      setPage(1);
    } else {
      setLoadingMore(true);
    }
    
    try {
      let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(tag.name)}&sort=${sort}&page=${currentPage}`;
      if (currentExtraTags.trim()) {
        url += `&extraTags=${encodeURIComponent(currentExtraTags.trim())}`;
      }
      if (currentTypeFilter !== 'all') {
        url += `&typeFilter=${currentTypeFilter}`;
      }
      
      const response = await api.get(url);
      const newResults = response.data.results || [];
      
      if (append) {
        setResults(prev => [...prev, ...newResults]);
      } else {
        setResults(newResults);
      }
      setHasMore(response.data.hasMore || false);
      setPage(currentPage);
    } catch (err) {
      console.error('Image search failed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort]);

  // Change sort order and refresh results
  const changeSort = useCallback(async (newSort) => {
    setSort(newSort);
    if (selectedTag) {
      setLoading(true);
      setResults([]);
      setPage(1);
      try {
        let url = `/anime-import/search-danbooru-tag?tag=${encodeURIComponent(selectedTag.name)}&sort=${newSort}&page=1`;
        if (extraTags.trim()) {
          url += `&extraTags=${encodeURIComponent(extraTags.trim())}`;
        }
        if (typeFilter !== 'all') {
          url += `&typeFilter=${typeFilter}`;
        }
        const response = await api.get(url);
        setResults(response.data.results || []);
        setHasMore(response.data.hasMore || false);
      } catch (err) {
        console.error('Image search failed:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [selectedTag, extraTags, typeFilter]);

  // Load more results
  const loadMore = useCallback(() => {
    if (selectedTag && hasMore && !loadingMore) {
      selectTag(selectedTag, extraTags, typeFilter, page + 1, true);
    }
  }, [selectedTag, hasMore, loadingMore, page, extraTags, typeFilter, selectTag]);

  // Apply extra filters
  const applyFilters = useCallback(() => {
    if (selectedTag) {
      selectTag(selectedTag, extraTags, typeFilter, 1, false);
    }
  }, [selectedTag, extraTags, typeFilter, selectTag]);

  // Close and reset state
  const handleClose = useCallback((clearSelection = false) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setHoveredMedia(null);
    onClose(clearSelection);
  }, [onClose]);

  // Select media and close
  const handleSelectMedia = useCallback((media) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onSelectMedia(media);
    handleClose();
  }, [onSelectMedia, handleClose]);

  // Clear selected tag
  const clearSelectedTag = useCallback(() => {
    setSelectedTag(null);
    setResults([]);
    setExtraTags('');
    setTypeFilter('all');
  }, []);

  // Category icons mapping for react-icons rendering
  const CATEGORY_ICON_COMPONENTS = {
    4: <FaUser />,  // Person/character
    3: <FaTv />,    // Series/show
  };
  const getCategoryIconComponent = (category) => CATEGORY_ICON_COMPONENTS[category] || <FaTag />;

  if (!show) return null;

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={() => handleClose(true)}
    >
      <Modal
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onMouseDown={e => e.stopPropagation()}
      >
        <Header>
          <h3>
            <FaImage /> {t('animeImport.findAltImageFor', { name: characterName }) || `Find Alt Image for ${characterName}`}
          </h3>
          <CloseButton onClick={() => handleClose(true)}>
            <FaTimes />
          </CloseButton>
        </Header>
        
        <Body>
          {/* Tag Search */}
          <SearchRow>
            <SearchInput
              type="text"
              placeholder={t('animeImport.searchTagPlaceholder') || 'Search for character tag...'}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                searchTags(e.target.value);
              }}
            />
            {selectedTag && (
              <SortSelect
                value={sort}
                onChange={e => changeSort(e.target.value)}
              >
                <option value="score">{t('animeImport.sortScore') || 'By Score'}</option>
                <option value="favorites">{t('animeImport.sortFavorites') || 'By Favorites'}</option>
                <option value="newest">{t('animeImport.sortNewest') || 'Newest'}</option>
              </SortSelect>
            )}
          </SearchRow>

          {/* Tag Suggestions */}
          {!selectedTag && tags.length > 0 && (
            <TagList>
              <TagLabel>{t('animeImport.selectTag') || 'Select a tag:'}</TagLabel>
              {tags.map(tag => (
                <TagChip
                  key={tag.name}
                  onClick={() => selectTag(tag)}
                  $category={tag.category}
                >
                  <span>{tag.displayName}</span>
                  <TagMeta>
                    <span>{getCategoryIconComponent(tag.category)}</span>
                    <span>{tag.count.toLocaleString()}</span>
                  </TagMeta>
                </TagChip>
              ))}
            </TagList>
          )}

          {/* Selected Tag Info */}
          {selectedTag && (
            <>
              <SelectedTagBar>
                <SelectedTagName>
                  {getCategoryIconComponent(selectedTag.category)}
                  {selectedTag.displayName}
                </SelectedTagName>
                <SmallButton onClick={clearSelectedTag}>
                  {t('animeImport.changeTag') || 'Change Tag'}
                </SmallButton>
              </SelectedTagBar>
              
              {/* Extra Filters Row */}
              <FilterRow>
                <ExtraTagsInput
                  type="text"
                  placeholder={t('animeImport.extraTagsPlaceholder') || 'Additional tags (e.g. solo, 1girl)'}
                  value={extraTags}
                  onChange={e => setExtraTags(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                />
                <TypeSelect
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                >
                  <option value="all">{t('animeImport.typeAll') || 'All Types'}</option>
                  <option value="animated">{t('animeImport.typeAnimated') || 'Animated Only'}</option>
                  <option value="static">{t('animeImport.typeStatic') || 'Static Only'}</option>
                </TypeSelect>
                <FilterApplyButton onClick={applyFilters}>
                  <FaSearch /> {t('animeImport.applyFilters') || 'Apply'}
                </FilterApplyButton>
              </FilterRow>
            </>
          )}

          {/* Results */}
          {loading ? (
            <LoadingText>
              <FaSpinner className="spin" /> {t('animeImport.searchingVideos') || 'Searching...'}
            </LoadingText>
          ) : selectedTag && results.length === 0 ? (
            <EmptyText>{t('animeImport.noVideosFound') || 'No results found'}</EmptyText>
          ) : results.length > 0 ? (
            <>
              <ResultsInfo>
                {t('animeImport.showingResults') || 'Showing'} {results.length} {t('animeImport.results') || 'results'}
                {hasMore && ` (${t('animeImport.moreAvailable') || 'more available'})`}
              </ResultsInfo>
              <MediaGrid>
                {results.map(media => (
                  <MediaCard
                    key={media.id}
                    onClick={() => handleSelectMedia(media)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                      setHoveredMedia(media);
                    }}
                    onMouseLeave={() => setHoveredMedia(null)}
                    onTouchStart={(e) => {
                      longPressTriggered.current = false;
                      const rect = e.currentTarget.getBoundingClientRect();
                      longPressTimer.current = setTimeout(() => {
                        longPressTriggered.current = true;
                        setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                        setHoveredMedia(media);
                      }, 500);
                    }}
                    onTouchEnd={() => {
                      if (longPressTimer.current) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                      }
                      if (longPressTriggered.current) {
                        setTimeout(() => setHoveredMedia(null), 100);
                      }
                    }}
                    onTouchMove={() => {
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
                    <img src={media.preview} alt={`Option ${media.id}`} />
                    <MediaFormat $isAnimated={media.isAnimated}>
                      {media.isAnimated ? <><FaPlay /> {media.fileExt?.toUpperCase()}</> : media.fileExt?.toUpperCase()}
                    </MediaFormat>
                    <MediaScore>
                      <FaStar /> {media.score}
                    </MediaScore>
                    <SelectOverlay>
                      <FaCheck /> {t('animeImport.selectThis') || 'Select'}
                    </SelectOverlay>
                  </MediaCard>
                ))}
              </MediaGrid>
              
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
                      <HoverPreviewVideo src={hoveredMedia.file} autoPlay loop muted playsInline />
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
              
              {hasMore && (
                <LoadMoreButton onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <><FaSpinner className="spin" /> {t('animeImport.loadingMore') || 'Loading...'}</>
                  ) : (
                    <>{t('animeImport.loadMore') || 'Load More'}</>
                  )}
                </LoadMoreButton>
              )}
            </>
          ) : !selectedTag && tags.length === 0 && !loading ? (
            <EmptyText>{t('animeImport.typeToSearch') || 'Type to search for character tags'}</EmptyText>
          ) : null}
        </Body>
        
        <Footer>
          <SourceNote>{t('animeImport.danbooru') || 'Images from Danbooru'}</SourceNote>
          <SmallButton onClick={() => handleClose(true)}>{t('common.cancel')}</SmallButton>
        </Footer>
      </Modal>
    </Overlay>
  );
};

// Styled Components
const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
`;

const Modal = styled(motion.div)`
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

const Header = styled.div`
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
    
    svg { color: #9b59b6; }
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

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 200px;
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SearchRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
`;

const SearchInput = styled.input`
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
  
  &::placeholder { color: #666; }
`;

const SortSelect = styled.select`
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

const TagList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
`;

const TagLabel = styled.span`
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const TagChip = styled.button`
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

const TagMeta = styled.span`
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

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
`;

const ExtraTagsInput = styled.input`
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
  
  &::placeholder { color: #666; }
`;

const TypeSelect = styled.select`
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

const ResultsInfo = styled.div`
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 10px;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const MediaCard = styled(motion.div)`
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

const MediaFormat = styled.span`
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

const MediaScore = styled.div`
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

const SelectOverlay = styled.div`
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
  
  ${MediaCard}:hover & {
    opacity: 1;
  }
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

const HoverPreviewContainer = styled(motion.div)`
  position: fixed;
  z-index: 10002;
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

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SourceNote = styled.span`
  display: inline-block;
  color: #888;
  font-size: 0.75rem;
`;

export default AltMediaPicker;
