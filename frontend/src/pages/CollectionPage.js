import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getCollection, getAllCharacters } from '../utils/api';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

const CollectionPage = () => {
  const [collection, setCollection] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rarityFilter, setRarityFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [showNotOwned, setShowNotOwned] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [uniqueSeries, setUniqueSeries] = useState([]);
  
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
  
  const openPreview = (character) => {
    setPreviewChar(character);
    setPreviewOpen(true);
  };
  
  const closePreview = () => {
    setPreviewOpen(false);
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
    
    // Filter by ownership if needed
    if (!showNotOwned) {
      characters = characters.filter(char => ownedCharIds.has(char.id));
    }
    
    // Apply rarity filter
    if (rarityFilter !== 'all') {
      characters = characters.filter(char => char.rarity === rarityFilter);
    }
    
    // Apply series filter
    if (seriesFilter !== 'all') {
      characters = characters.filter(char => char.series === seriesFilter);
    }
    
    return characters;
  };

  const filteredCharacters = getFilteredCharacters();
  
  return (
    <CollectionContainer>
      <CollectionHeader>
        <h1>Character Collection</h1>
        
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
        
        <FilterSection>
          <FilterLabel>Show Characters:</FilterLabel>
          <ToggleContainer>
            <ToggleButton 
              active={showNotOwned} 
              onClick={() => setShowNotOwned(true)}>
              All Characters
            </ToggleButton>
            <ToggleButton 
              active={!showNotOwned} 
              onClick={() => setShowNotOwned(false)}>
              Owned Only
            </ToggleButton>
          </ToggleContainer>
        </FilterSection>
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
        <CharacterGrid>
          {filteredCharacters.map((char) => {
            const isOwned = ownedCharIds.has(char.id);
            return (
              <CharacterItem
                key={char.id}
                rarity={char.rarity}
                isOwned={isOwned}
                whileHover={{ y: -5, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <CharImage 
                  src={getImagePath(char.image)} 
                  alt={char.name}
                  onClick={() => openPreview({...char, isOwned})}
                  isOwned={isOwned}
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                    }
                  }}
                />
                <CharDetails isOwned={isOwned}>
                  <CharName isOwned={isOwned}>{char.name}</CharName>
                  <CharSeries isOwned={isOwned}>{char.series}</CharSeries>
                  <RarityTag rarity={char.rarity}>{char.rarity}</RarityTag>
                  {!isOwned && <NotOwnedOverlay>Not Owned</NotOwnedOverlay>}
                </CharDetails>
              </CharacterItem>
            );
          })}
        </CharacterGrid>
      )}
      
      <ImagePreviewModal 
        isOpen={previewOpen}
        onClose={closePreview}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={previewChar?.isOwned}
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
  margin-bottom: 40px;
  color: white;
  
  h1 {
    font-size: 32px;
    margin: 0 0 20px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

const FilterSection = styled.div`
  margin-bottom: 15px;
`;

const FilterLabel = styled.div`
  font-size: 14px;
  margin-bottom: 8px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
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

const ToggleContainer = styled.div`
  display: flex;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 30px;
  padding: 4px;
  width: fit-content;
  margin: 0 auto;
`;

const ToggleButton = styled.button`
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.9)' : 'transparent'};
  color: ${props => props.active ? '#333' : 'white'};
  border: none;
  border-radius: 30px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.active ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.1)'};
  }
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

const CharImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease;
  filter: ${props => props.isOwned ? 'none' : 'grayscale(80%)'};
  
  &:hover {
    transform: scale(1.05);
    filter: ${props => props.isOwned ? 'none' : 'grayscale(40%)'};
  }
`;

const CharDetails = styled.div`
  padding: 15px;
  position: relative;
  opacity: ${props => props.isOwned ? 1 : 0.7};
`;

const CharName = styled.h3`
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #333;
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

const NotOwnedOverlay = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
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

export default CollectionPage;