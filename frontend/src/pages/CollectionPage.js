import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getCollection } from '../utils/api';

const CollectionPage = () => {
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchCollection();
  }, []);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const data = await getCollection();
      setCollection(data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load collection');
      setLoading(false);
    }
  };
  
  // Hilfsfunktion für Bildpfade
  const getImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/200?text=No+Image';
    
    if (imageSrc.startsWith('/uploads')) {
      // Vollständiger Pfad für hochgeladene Bilder
      return `http://https://gachaapi.solidbooru.online${imageSrc}`;
    } else {
      // Relativer Pfad für vorhandene Bilder
      return `/images/characters/${imageSrc}`;
    }
  };

  const filteredCollection = filter === 'all' 
    ? collection 
    : collection.filter(char => char.rarity === filter);

  return (
    <CollectionContainer>
      <CollectionHeader>
        <h1>My Character Collection</h1>
        <FilterContainer>
          <FilterButton 
            active={filter === 'all'} 
            onClick={() => setFilter('all')}>
            All
          </FilterButton>
          <FilterButton 
            active={filter === 'common'} 
            onClick={() => setFilter('common')}>
            Common
          </FilterButton>
          <FilterButton 
            active={filter === 'uncommon'} 
            onClick={() => setFilter('uncommon')}>
            Uncommon
          </FilterButton>
          <FilterButton 
            active={filter === 'rare'} 
            onClick={() => setFilter('rare')}>
            Rare
          </FilterButton>
          <FilterButton 
            active={filter === 'epic'} 
            onClick={() => setFilter('epic')}>
            Epic
          </FilterButton>
          <FilterButton 
            active={filter === 'legendary'} 
            onClick={() => setFilter('legendary')}>
            Legendary
          </FilterButton>
        </FilterContainer>
      </CollectionHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading ? (
        <LoadingContainer>
          <Spinner />
          <p>Loading collection...</p>
        </LoadingContainer>
      ) : filteredCollection.length === 0 ? (
        <EmptyCollection>
          <h3>{filter === 'all' ? 'Your collection is empty' : `No ${filter} characters in your collection`}</h3>
          <p>Roll characters to build your collection!</p>
        </EmptyCollection>
      ) : (
        <CharacterGrid>
          {filteredCollection.map((char) => (
            <CharacterItem
              key={char.id}
              rarity={char.rarity}
              whileHover={{ y: -10, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <CharImage 
                src={getImagePath(char.image)} 
                alt={char.name}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/200?text=Image+Not+Found';
                }}
              />
              <CharDetails>
                <CharName>{char.name}</CharName>
                <CharSeries>{char.series}</CharSeries>
                <RarityTag rarity={char.rarity}>{char.rarity}</RarityTag>
              </CharDetails>
            </CharacterItem>
          ))}
        </CharacterGrid>
      )}
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

const FilterContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
`;

const FilterButton = styled.button`
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  color: white;
  border: 2px solid ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  border-bottom: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  transition: transform 0.3s;
`;

const CharImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const CharDetails = styled.div`
  padding: 15px;
  position: relative;
`;

const CharName = styled.h3`
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #333;
`;

const CharSeries = styled.p`
  margin: 0;
  font-size: 14px;
  color: #777;
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

export default CollectionPage;