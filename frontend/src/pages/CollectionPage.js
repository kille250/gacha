import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getCollection, getAllCharacters } from '../utils/api';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import { FaSearch } from 'react-icons/fa';
  
const CollectionPage = () => {
  const [collection, setCollection] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rarityFilter, setRarityFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // New filter: all, owned, not-owned
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [uniqueSeries, setUniqueSeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch owned collection and all available characters
      const [collectionData, allCharsData] = await Promise.all([
        getCollection(),
        getAllCharacters()
      ]);
      setCollection(collectionData);
      setAllCharacters(allCharsData);
      // Extract unique series from all characters
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

  // Check if media is a video
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
    if (imageSrc.startsWith('http')) {
      return imageSrc;
    }
    if (imageSrc.startsWith('/uploads')) {
      return `https://gachaapi.solidbooru.online${imageSrc}`;
    }
    if (imageSrc.startsWith('image-')) {
      return `https://gachaapi.solidbooru.online/uploads/characters/${imageSrc}`;
    }
    return `/images/characters/${imageSrc}`;
  };

  // Create a map of owned character IDs for quick lookup
  const ownedCharIds = new Set(collection.map(char => char.id));

  // Get all characters or filtered ones based on current filters
  const getFilteredCharacters = () => {
    // First, decide which dataset to use
    let characters = [...allCharacters];
    
    // Filter by ownership
    if (ownershipFilter === 'owned') {
      characters = characters.filter(char => ownedCharIds.has(char.id));
    } else if (ownershipFilter === 'not-owned') {
      characters = characters.filter(char => !ownedCharIds.has(char.id));
    }
    
    // Apply rarity filter
    if (rarityFilter !== 'all') {
      characters = characters.filter(char => char.rarity === rarityFilter);
    }
    
    // Apply series filter
    if (seriesFilter !== 'all') {
      characters = characters.filter(char => char.series === seriesFilter);
    }
    
    // Apply search filter
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

  // Media content component for displaying images or videos
  const MediaContent = ({ src, alt, onClick, onError, isOwned }) => {
    if (isVideo(src)) {
      return (
        <CharVideo
          src={src}
          autoPlay
          loop
          muted
          playsInline
          onClick={onClick}
          onError={onError}
          isOwned={isOwned}
        />
      );
    }
    
    return (
      <CharImage
        src={src}
        alt={alt}
        onClick={onClick}
        onError={onError}
        isOwned={isOwned}
      />
    );
  };

  return (
    <CollectionContainer>
      <CollectionHeader>
        <h1>Character Collection</h1>
        <CollectionStats>
          <StatItem>
            <StatValue>{ownedCount}/{totalCount}</StatValue>
            <StatLabel>Characters Collected</StatLabel>
          </StatItem>
          <StatItem>
            <ProgressBar percentage={completionPercentage}>
              <ProgressText>{completionPercentage}% Complete</ProgressText>
            </ProgressBar>
          </StatItem>
        </CollectionStats>
        
        <FilterSection>
          <FilterLabel>Show:</FilterLabel>
          <OwnershipToggle>
            <OwnershipButton
              active={ownershipFilter === 'all'}
              onClick={() => setOwnershipFilter('all')}>
              All Characters
            </OwnershipButton>
            <OwnershipButton
              active={ownershipFilter === 'owned'}
              onClick={() => setOwnershipFilter('owned')}
              color="rgba(46, 204, 113, 0.8)">
              Owned Only
            </OwnershipButton>
            <OwnershipButton
              active={ownershipFilter === 'not-owned'}
              onClick={() => setOwnershipFilter('not-owned')}
              color="rgba(231, 76, 60, 0.8)">
              Missing Only
            </OwnershipButton>
          </OwnershipToggle>
        </FilterSection>
        
        <FilterSection>
          <FilterLabel>Rarity:</FilterLabel>
          <FilterContainer>
            <FilterButton
              active={rarityFilter === 'all'}
              onClick={() => setRarityFilter('all')}>
              All
            </FilterButton>
            <FilterButton
              active={rarityFilter === 'common'}
              onClick={() => setRarityFilter('common')}
              color={rarityColors.common}>
              Common
            </FilterButton>
            <FilterButton
              active={rarityFilter === 'uncommon'}
              onClick={() => setRarityFilter('uncommon')}
              color={rarityColors.uncommon}>
              Uncommon
            </FilterButton>
            <FilterButton
              active={rarityFilter === 'rare'}
              onClick={() => setRarityFilter('rare')}
              color={rarityColors.rare}>
              Rare
            </FilterButton>
            <FilterButton
              active={rarityFilter === 'epic'}
              onClick={() => setRarityFilter('epic')}
              color={rarityColors.epic}>
              Epic
            </FilterButton>
            <FilterButton
              active={rarityFilter === 'legendary'}
              onClick={() => setRarityFilter('legendary')}
              color={rarityColors.legendary}>
              Legendary
            </FilterButton>
          </FilterContainer>
        </FilterSection>
        
        <FilterSection>
          <FilterLabel>Series:</FilterLabel>
          <SeriesFilterContainer>
            <SeriesFilterButton
              active={seriesFilter === 'all'}
              onClick={() => setSeriesFilter('all')}>
              All Series
            </SeriesFilterButton>
            {uniqueSeries.map(series => (
              <SeriesFilterButton
                key={series}
                active={seriesFilter === series}
                onClick={() => setSeriesFilter(series)}>
                {series}
              </SeriesFilterButton>
            ))}
          </SeriesFilterContainer>
        </FilterSection>
        
        <SearchFilterSection>
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
            <option value="20">20 per page</option>
            <option value="40">40 per page</option>
            <option value="60">60 per page</option>
            <option value="100">100 per page</option>
          </ItemsPerPageSelect>
        </SearchFilterSection>
      </CollectionHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {loading ? (
        <LoadingContainer>
          <Spinner />
          <p>Loading collection...</p>
        </LoadingContainer>
      ) : filteredCharacters.length === 0 ? (
        <EmptyCollection>
          <h3>No characters match your filters</h3>
          <p>Try adjusting your filters to see more characters</p>
        </EmptyCollection>
      ) : (
        <>
          <ResultCount>
            Showing {currentCharacters.length} of {filteredCharacters.length} character{filteredCharacters.length !== 1 ? 's' : ''}
          </ResultCount>
          <CharacterGrid>
            {currentCharacters.map((char) => {
              const isOwned = ownedCharIds.has(char.id);
              const imagePath = getImagePath(char.image);
              const isVideoMedia = isVideo(char.image);
              
              return (
                <CharacterItem
                  key={char.id}
                  rarity={char.rarity}
                  isOwned={isOwned}
                  whileHover={{ y: -5, scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {!isOwned && (
                    <NotOwnedBadge>
                      <NotOwnedIcon>⛔</NotOwnedIcon>
                      <span>Not Owned</span>
                    </NotOwnedBadge>
                  )}
                  
                  {isVideoMedia ? (
                    <CharVideo
                      src={imagePath}
                      autoPlay
                      loop
                      muted
                      playsInline
                      onClick={() => openPreview({...char, isOwned, isVideo: true})}
                      isOwned={isOwned}
                      onError={(e) => {
                        if (!e.target.src.includes('placeholder.com')) {
                          e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                        }
                      }}
                    />
                  ) : (
                    <CharImage
                      src={imagePath}
                      alt={char.name}
                      onClick={() => openPreview({...char, isOwned})}
                      isOwned={isOwned}
                      onError={(e) => {
                        if (!e.target.src.includes('placeholder.com')) {
                          e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                        }
                      }}
                    />
                  )}
                  
                  <CharDetails isOwned={isOwned}>
                    <CharName isOwned={isOwned}>{char.name}</CharName>
                    <CharSeries isOwned={isOwned}>{char.series}</CharSeries>
                    <RarityTag rarity={char.rarity}>{char.rarity}</RarityTag>
                  </CharDetails>
                </CharacterItem>
              );
            })}
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
    </CollectionContainer>
  );
};

// Styled Components
const CollectionContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  padding: 20px;
`;

const CollectionHeader = styled.div`
  text-align: center;
  margin-bottom: 30px;
  color: white;
  
  h1 {
    font-size: 32px;
    margin: 0 0 20px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

const CollectionStats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 15px;
  max-width: 600px;
  margin: 0 auto 25px auto;
`;

const StatItem = styled.div`
  margin: 5px 0;
  width: 100%;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  opacity: 0.8;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-top: 5px;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.percentage}%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.5s ease;
  }
`;

const ProgressText = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
`;

const FilterSection = styled.div`
  margin-bottom: 20px;
  background: rgba(0, 0, 0, 0.1);
  padding: 15px;
  border-radius: 10px;
`;

const FilterLabel = styled.div`
  font-size: 14px;
  margin-bottom: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const SeriesFilterContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 800px;
  margin: 0 auto;
`;

const OwnershipToggle = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 auto;
  max-width: 600px;
`;

const OwnershipButton = styled.button`
  background: ${props => props.active ?
    (props.color || 'rgba(255, 255, 255, 0.3)') :
    'rgba(255, 255, 255, 0.05)'};
  color: white;
  border: 2px solid ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 20px;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: ${props => props.active ? 1 : 0.7};
  flex: 1;
  max-width: 180px;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  
  &:hover {
    background: ${props => props.color || 'rgba(255, 255, 255, 0.1)'};
    opacity: 1;
  }
`;

const FilterButton = styled.button`
  background: ${props => props.active ?
    (props.color ? props.color : 'rgba(255, 255, 255, 0.2)') :
    'rgba(255, 255, 255, 0.05)'};
  color: white;
  border: 2px solid ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: ${props => props.active ? 1 : 0.7};
  
  &:hover {
    background: ${props => props.color ? props.color : 'rgba(255, 255, 255, 0.1)'};
    opacity: 1;
  }
`;

const SeriesFilterButton = styled(FilterButton)`
  font-size: 12px;
  padding: 6px 12px;
  margin-bottom: 5px;
`;

const ResultCount = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
  font-size: 14px;
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const rarityColors = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800'
};

const CharacterItem = styled(motion.div)`
  background: rgba(255, 255, 255, ${props => props.isOwned ? 0.9 : 0.5});
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  border-bottom: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  transition: transform 0.3s;
  position: relative;
`;

const NotOwnedBadge = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 0;
  font-size: 12px;
  text-align: center;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const NotOwnedIcon = styled.span`
  font-size: 14px;
`;

const CharImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.3s ease;
  filter: ${props => props.isOwned ? 'none' : 'grayscale(80%)'};
  
  &:hover {
    transform: scale(1.05);
    filter: ${props => props.isOwned ? 'none' : 'grayscale(40%)'};
  }
`;

const CharVideo = styled.video`
  width: 100%;
  height: 200px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.3s ease;
  filter: ${props => props.isOwned ? 'none' : 'grayscale(80%)'};
  
  &:hover {
    transform: scale(1.05);
    filter: ${props => props.isOwned ? 'none' : 'grayscale(40%)'};
  }
`;

const CharDetails = styled.div`
  padding: 15px;
  position: relative;
  opacity: ${props => props.isOwned ? 1 : 0.8};
`;

const CharName = styled.h3`
  margin: 0 0 5px 0;
  font-size: 18px;
  color: ${props => props.isOwned ? '#333' : '#555'};
`;

const CharSeries = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${props => props.isOwned ? '#777' : '#999'};
  font-style: italic;
`;

const RarityTag = styled.span`
  position: absolute;
  top: -12px;
  right: 10px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: bold;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  
  p {
    margin-top: 20px;
    color: white;
    font-size: 18px;
  }
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyCollection = styled.div`
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 40px;
  border-radius: 16px;
  color: white;
  max-width: 600px;
  margin: 80px auto;
  
  h3 {
    font-size: 24px;
    margin: 0 0 10px 0;
  }
  
  p {
    margin: 0;
    opacity: 0.8;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 600px;
  text-align: center;
`;
  
const SearchFilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 15px;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;
  
const SearchInputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 25px;
  padding: 8px 15px;
  flex-grow: 1;
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
  
  svg {
    color: #555;
    margin-right: 8px;
  }
  
  @media (min-width: 768px) {
    margin: 0;
  }
`;
  
const SearchInput = styled.input`
  background: transparent;
  border: none;
  outline: none;
  color: #333;
  font-size: 16px;
  width: 100%;
  padding: 5px 0;
  
  &::placeholder {
    color: #999;
  }
`;
  
const ItemsPerPageSelect = styled.select`
  padding: 10px 15px;
  border-radius: 25px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  max-width: 200px;
  margin: 0 auto;
  width: 100%;
  
  @media (min-width: 768px) {
    margin: 0;
    width: auto;
  }
`;
  
const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin: 30px 0;
  flex-wrap: wrap;
`;
  
const PaginationButton = styled.button`
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
  
const PageInfo = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  min-width: 120px;
  text-align: center;
`;
  
export default CollectionPage;