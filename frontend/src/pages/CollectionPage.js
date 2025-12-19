import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getCollection, getAllCharacters, getAssetUrl } from '../utils/api';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import {
  theme,
  PageWrapper,
  Container,
  Section,
  Heading2,
  Text,
  Spinner,
  RarityBadge,
  motionVariants,
  getRarityColor,
  getRarityGlow,
  scrollbarStyles
} from '../styles/DesignSystem';

const CollectionPage = () => {
  const [collection, setCollection] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rarityFilter, setRarityFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [uniqueSeries, setUniqueSeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [collectionData, allCharsData] = await Promise.all([
        getCollection(),
        getAllCharacters()
      ]);
      setCollection(collectionData);
      setAllCharacters(allCharsData);
      const allSeries = [...new Set(allCharsData.map(char => char.series).filter(Boolean))].sort();
      setUniqueSeries(allSeries);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
      setLoading(false);
    }
  };
  
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

  const openPreview = (character) => {
    setPreviewChar(character);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const isVideo = (src) => {
    if (!src) return false;
    if (typeof src === 'string') {
      const lowerCasePath = src.toLowerCase();
      return lowerCasePath.endsWith('.mp4') || 
             lowerCasePath.endsWith('.webm') || 
             lowerCasePath.includes('video');
    }
    return false;
  };

  const getImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/200?text=No+Image';
    return getAssetUrl(imageSrc);
  };

  const ownedCharIds = new Set(collection.map(char => char.id));

  const getFilteredCharacters = () => {
    let characters = [...allCharacters];
    
    if (ownershipFilter === 'owned') {
      characters = characters.filter(char => ownedCharIds.has(char.id));
    } else if (ownershipFilter === 'not-owned') {
      characters = characters.filter(char => !ownedCharIds.has(char.id));
    }
    
    if (rarityFilter !== 'all') {
      characters = characters.filter(char => char.rarity === rarityFilter);
    }
    
    if (seriesFilter !== 'all') {
      characters = characters.filter(char => char.series === seriesFilter);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      characters = characters.filter(char =>
        char.name.toLowerCase().includes(query) ||
        (char.series && char.series.toLowerCase().includes(query))
      );
    }
    
    return characters;
  };
  
  const filteredCharacters = getFilteredCharacters();
  const totalPages = Math.ceil(filteredCharacters.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCharacters = filteredCharacters.slice(indexOfFirstItem, indexOfLastItem);
  
  const ownedCount = collection.length;
  const totalCount = allCharacters.length;
  const completionPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  const clearFilters = () => {
    setRarityFilter('all');
    setSeriesFilter('all');
    setOwnershipFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = rarityFilter !== 'all' || seriesFilter !== 'all' || ownershipFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <StyledPageWrapper>
      <Container>
        {/* Header Section */}
        <HeaderSection>
          <HeaderContent>
            <PageTitle>Collection</PageTitle>
            <PageSubtitle>Track your character collection progress</PageSubtitle>
          </HeaderContent>
          
          {/* Progress Stats */}
          <StatsCard>
            <StatsRow>
              <StatItem>
                <StatValue>{ownedCount}</StatValue>
                <StatLabel>Owned</StatLabel>
              </StatItem>
              <StatDivider />
              <StatItem>
                <StatValue>{totalCount}</StatValue>
                <StatLabel>Total</StatLabel>
              </StatItem>
              <StatDivider />
              <StatItem>
                <StatValue>{completionPercentage}%</StatValue>
                <StatLabel>Complete</StatLabel>
              </StatItem>
            </StatsRow>
            <ProgressBar>
              <ProgressFill style={{ width: `${completionPercentage}%` }} />
            </ProgressBar>
          </StatsCard>
        </HeaderSection>
        
        {/* Search & Filter Bar */}
        <ControlsBar>
          <SearchWrapper>
            <SearchIcon><FaSearch /></SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <ClearSearch onClick={() => setSearchQuery('')}>
                <FaTimes />
              </ClearSearch>
            )}
          </SearchWrapper>
          
          <ControlsRight>
            <FilterToggle 
              onClick={() => setShowFilters(!showFilters)}
              active={showFilters || hasActiveFilters}
            >
              <FaFilter />
              <span>Filters</span>
              {hasActiveFilters && <FilterBadge />}
            </FilterToggle>
            
            <ItemsSelect value={itemsPerPage} onChange={handleItemsPerPageChange}>
              <option value="24">24 / page</option>
              <option value="48">48 / page</option>
              <option value="96">96 / page</option>
            </ItemsSelect>
          </ControlsRight>
        </ControlsBar>
        
        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <FiltersPanel
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FilterGroup>
                <FilterLabel>Ownership</FilterLabel>
                <FilterOptions>
                  {['all', 'owned', 'not-owned'].map(option => (
                    <FilterChip 
                      key={option}
                      active={ownershipFilter === option}
                      onClick={() => { setOwnershipFilter(option); setCurrentPage(1); }}
                    >
                      {option === 'all' ? 'All' : option === 'owned' ? 'Owned' : 'Missing'}
                    </FilterChip>
                  ))}
                </FilterOptions>
              </FilterGroup>
              
              <FilterGroup>
                <FilterLabel>Rarity</FilterLabel>
                <FilterOptions>
                  <FilterChip 
                    active={rarityFilter === 'all'}
                    onClick={() => { setRarityFilter('all'); setCurrentPage(1); }}
                  >
                    All
                  </FilterChip>
                  {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rarity => (
                    <FilterChip 
                      key={rarity}
                      active={rarityFilter === rarity}
                      onClick={() => { setRarityFilter(rarity); setCurrentPage(1); }}
                      color={getRarityColor(rarity)}
                    >
                      {rarity}
                    </FilterChip>
                  ))}
                </FilterOptions>
              </FilterGroup>
              
              {uniqueSeries.length > 0 && (
                <FilterGroup>
                  <FilterLabel>Series</FilterLabel>
                  <SeriesSelect 
                    value={seriesFilter}
                    onChange={(e) => { setSeriesFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">All Series</option>
                    {uniqueSeries.map(series => (
                      <option key={series} value={series}>{series}</option>
                    ))}
                  </SeriesSelect>
                </FilterGroup>
              )}
              
              {hasActiveFilters && (
                <ClearFiltersBtn onClick={clearFilters}>
                  <FaTimes /> Clear Filters
                </ClearFiltersBtn>
              )}
            </FiltersPanel>
          )}
        </AnimatePresence>
        
        {/* Results */}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        {loading ? (
          <LoadingContainer>
            <Spinner size="56px" />
            <Text secondary>Loading collection...</Text>
          </LoadingContainer>
        ) : filteredCharacters.length === 0 ? (
          <EmptyState>
            <EmptyIcon>🔍</EmptyIcon>
            <EmptyTitle>No characters found</EmptyTitle>
            <EmptyText>Try adjusting your filters to see more characters</EmptyText>
            {hasActiveFilters && (
              <ClearFiltersBtn onClick={clearFilters} style={{ marginTop: '16px' }}>
                <FaTimes /> Clear Filters
              </ClearFiltersBtn>
            )}
          </EmptyState>
        ) : (
          <>
            <ResultsInfo>
              Showing {currentCharacters.length} of {filteredCharacters.length} characters
            </ResultsInfo>
            
            <CharacterGrid
              variants={motionVariants.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {currentCharacters.map((char) => {
                const isOwned = ownedCharIds.has(char.id);
                const imagePath = getImagePath(char.image);
                const isVideoMedia = isVideo(char.image);
                
                return (
                  <CharacterCard
                    key={char.id}
                    variants={motionVariants.staggerItem}
                    rarity={char.rarity}
                    isOwned={isOwned}
                    onClick={() => openPreview({...char, isOwned, isVideo: isVideoMedia})}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CardImageWrapper>
                      {isVideoMedia ? (
                        <CardVideo
                          src={imagePath}
                          autoPlay
                          loop
                          muted
                          playsInline
                          isOwned={isOwned}
                        />
                      ) : (
                        <CardImage
                          src={imagePath}
                          alt={char.name}
                          isOwned={isOwned}
                          onError={(e) => {
                            if (!e.target.src.includes('placeholder.com')) {
                              e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                            }
                          }}
                        />
                      )}
                      {!isOwned && (
                        <NotOwnedOverlay>
                          <NotOwnedLabel>Not Owned</NotOwnedLabel>
                        </NotOwnedOverlay>
                      )}
                      <RarityIndicator rarity={char.rarity} />
                    </CardImageWrapper>
                    <CardContent>
                      <CharName isOwned={isOwned}>{char.name}</CharName>
                      <CharSeries isOwned={isOwned}>{char.series}</CharSeries>
                    </CardContent>
                  </CharacterCard>
                );
              })}
            </CharacterGrid>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PageButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </PageButton>
                <PageInfo>
                  Page {currentPage} of {totalPages}
                </PageInfo>
                <PageButton
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </PageButton>
              </Pagination>
            )}
          </>
        )}
      </Container>
      
      <ImagePreviewModal
        isOpen={previewOpen}
        onClose={closePreview}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={previewChar?.isOwned}
        isVideo={previewChar?.isVideo || isVideo(previewChar?.image)}
      />
    </StyledPageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const StyledPageWrapper = styled(PageWrapper)`
  padding: ${theme.spacing.xl} 0 ${theme.spacing['3xl']};
`;

// Header
const HeaderSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderContent = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const PageTitle = styled.h1`
  font-size: ${theme.fontSizes['4xl']};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.02em;
  margin: 0 0 ${theme.spacing.xs};
`;

const PageSubtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// Stats Card
const StatsCard = styled(Section)`
  padding: ${theme.spacing.lg};
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.lg};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`;

const StatDivider = styled.div`
  width: 1px;
  height: 40px;
  background: ${theme.colors.surfaceBorder};
`;

const ProgressBar = styled.div`
  height: 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.success}, #4ade80);
  border-radius: ${theme.radius.full};
  transition: width 0.5s ease;
`;

// Controls Bar
const ControlsBar = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
  }
`;

const SearchWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: 0 ${theme.spacing.md};
  min-width: 250px;
`;

const SearchIcon = styled.span`
  color: ${theme.colors.textTertiary};
  margin-right: ${theme.spacing.sm};
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: ${theme.spacing.md} 0;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  
  &::placeholder {
    color: ${theme.colors.textMuted};
  }
  
  &:focus {
    outline: none;
  }
`;

const ClearSearch = styled.button`
  color: ${theme.colors.textTertiary};
  padding: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  
  &:hover {
    color: ${theme.colors.text};
  }
`;

const ControlsRight = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.active ? 'rgba(88, 86, 214, 0.15)' : theme.colors.surface};
  border: 1px solid ${props => props.active ? theme.colors.accent : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.active ? theme.colors.accent : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  position: relative;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

const FilterBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: ${theme.colors.primary};
  border-radius: 50%;
`;

const ItemsSelect = styled.select`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  
  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

// Filters Panel
const FiltersPanel = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

const FilterGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
  
  &:last-of-type {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

const FilterOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const FilterChip = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.active 
    ? props.color ? `${props.color}20` : 'rgba(88, 86, 214, 0.15)'
    : theme.colors.glass};
  border: 1px solid ${props => props.active 
    ? props.color || theme.colors.accent 
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${props => props.active 
    ? props.color || theme.colors.accent 
    : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  text-transform: capitalize;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${props => props.color ? `${props.color}30` : 'rgba(88, 86, 214, 0.2)'};
    border-color: ${props => props.color || theme.colors.accent};
  }
`;

const SeriesSelect = styled.select`
  width: 100%;
  max-width: 300px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  
  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

const ClearFiltersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: rgba(255, 59, 48, 0.2);
  }
`;

// Results
const ResultsInfo = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin-bottom: ${theme.spacing.lg};
`;

const ErrorMessage = styled.div`
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']};
  gap: ${theme.spacing.lg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
`;

const EmptyTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
`;

const EmptyText = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// Character Grid
const CharacterGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
`;

const CharacterCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  cursor: pointer;
  border: 1px solid ${props => props.isOwned 
    ? theme.colors.surfaceBorder 
    : 'rgba(255, 255, 255, 0.03)'};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    border-color: ${props => getRarityColor(props.rarity)};
    box-shadow: ${props => getRarityGlow(props.rarity)};
  }
`;

const CardImageWrapper = styled.div`
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: all ${theme.transitions.slow};
  
  ${CharacterCard}:hover & {
    transform: scale(1.05);
    filter: ${props => props.isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: filter ${theme.transitions.slow};
  
  ${CharacterCard}:hover & {
    filter: ${props => props.isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

const NotOwnedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NotOwnedLabel = styled.div`
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: white;
`;

const RarityIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => getRarityColor(props.rarity)};
`;

const CardContent = styled.div`
  padding: ${theme.spacing.md};
`;

const CharName = styled.h3`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.isOwned ? theme.colors.text : theme.colors.textSecondary};
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CharSeries = styled.p`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.isOwned ? theme.colors.textSecondary : theme.colors.textMuted};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Pagination
const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  min-width: 120px;
  text-align: center;
`;

export default CollectionPage;
