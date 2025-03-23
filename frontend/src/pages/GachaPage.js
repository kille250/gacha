import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdFavorite } from 'react-icons/md';
import axios from 'axios';
import { rollCharacter, claimCharacter } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const rarityColors = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800'
};

const GachaPage = () => {
  const [currentChar, setCurrentChar] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [error, setError] = useState(null);
  const { user, setUser } = useContext(AuthContext);

  const handleRoll = async () => {
	try {
	  setIsRolling(true);
	  setShowCard(false);
	  setError(null);
	  
	  // Simulate spinning animation
	  setTimeout(async () => {
		try {
		  const character = await rollCharacter();
		  setCurrentChar(character);
		  setShowCard(true);
		  
		  // WICHTIG: Benutzerdaten aktualisieren nach dem Würfeln
		  try {
			const userResponse = await axios.get('http://https://gachaapi.solidbooru.online/api/auth/me', {
			  headers: {
				'x-auth-token': localStorage.getItem('token')
			  }
			});
			
			// Benutzerstatus aktualisieren mit aktuellen Daten vom Server
			setUser(userResponse.data);
			localStorage.setItem('user', JSON.stringify(userResponse.data));
		  } catch (userErr) {
			console.error("Error updating user data after roll:", userErr);
		  }
		  
		  setIsRolling(false);
		} catch (err) {
		  setError(err.response?.data?.error || 'Failed to roll character');
		  setIsRolling(false);
		}
	  }, 1500);
	} catch (err) {
	  setError(err.response?.data?.error || 'Failed to roll character');
	  setIsRolling(false);
	}
  };

  const handleClaim = async () => {
	if (!currentChar) return;
	
	try {
	  await claimCharacter(currentChar.id);
	  
	  // Benutzerdaten aktualisieren
	  const userResponse = await axios.get('http://https://gachaapi.solidbooru.online/api/auth/me', {
		headers: {
		  'x-auth-token': localStorage.getItem('token')
		}
	  });
	  
	  // Benutzerstatus aktualisieren mit aktuellen Daten vom Server
	  setUser(userResponse.data);
	  localStorage.setItem('user', JSON.stringify(userResponse.data));
	} catch (err) {
	  setError(err.response?.data?.error || 'Failed to claim character');
	}
  };

  // In GachaPage.js und CollectionPage.js - Bildanzeige anpassen
const getImagePath = (imageSrc) => {
	if (!imageSrc) return 'https://via.placeholder.com/300?text=No+Image';
	
	if (imageSrc.startsWith('/uploads')) {
	  // Vollständiger Pfad für hochgeladene Bilder
	  return `http://https://gachaapi.solidbooru.online${imageSrc}`;
	} else {
	  // Relativer Pfad für vorhandene Bilder
	  return `/images/characters/${imageSrc}`;
	}
  };

  return (
    <GachaContainer>
      <GachaHeader>
        <h1>Summon Characters</h1>
        <PointsCounter>🪙 {user?.points || 0} points</PointsCounter>
      </GachaHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <GachaSection>
        <AnimatePresence mode="wait">
          {showCard ? (
            <CharacterCard
              key="character"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.5 }}
              rarity={currentChar?.rarity}
            >
              <CardImage 
				src={getImagePath(currentChar?.image)} 
				alt={currentChar?.name}
				onError={(e) => {
			    e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
			  }}
			  />
              <CardContent>
                <CharName>{currentChar?.name}</CharName>
                <CharSeries>{currentChar?.series}</CharSeries>
                <RarityBadge rarity={currentChar?.rarity}>{currentChar?.rarity}</RarityBadge>
              </CardContent>
              <CardActions>
                <ActionButton onClick={handleClaim} disabled={!currentChar}>
                  <MdFavorite /> Claim
                </ActionButton>
                <ActionButton onClick={handleRoll} disabled={isRolling}>
                  <MdReplay /> Roll Again
                </ActionButton>
              </CardActions>
            </CharacterCard>
          ) : isRolling ? (
            <LoadingContainer
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Spinner />
              <p>Rolling...</p>
            </LoadingContainer>
          ) : (
            <EmptyState
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3>Try your luck!</h3>
              <p>Roll to discover new characters</p>
            </EmptyState>
          )}
        </AnimatePresence>

        <RollButton 
          onClick={handleRoll} 
          disabled={isRolling || (user?.points < 100)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          💫 Roll Character (100 points)
        </RollButton>
      </GachaSection>
    </GachaContainer>
  );
};

const GachaContainer = styled.div`
  min-height: 100vh;
  background-image: url('/images/backgrounds/gacha-bg.jpg');
  background-size: cover;
  background-position: center;
  padding: 20px;
`;

const GachaHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  padding: 20px;
  
  h1 {
    margin: 0;
    font-size: 32px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
`;

const PointsCounter = styled.div`
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 18px;
`;

const GachaSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
`;

const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  width: 300px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  margin-bottom: 30px;
  border: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
`;

const CardImage = styled.img`
  width: 100%;
  height: 300px;
  object-fit: cover;
`;

const CardContent = styled.div`
  padding: 20px;
  position: relative;
`;

const CharName = styled.h2`
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #333;
`;

const CharSeries = styled.p`
  margin: 0;
  color: #666;
  font-style: italic;
`;

const RarityBadge = styled.span`
  position: absolute;
  top: -15px;
  right: 20px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 5px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
`;

const CardActions = styled.div`
  display: flex;
  border-top: 1px solid #eee;
`;

const ActionButton = styled.button`
  flex: 1;
  background: none;
  border: none;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 16px;
  color: #555;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &:first-child {
    border-right: 1px solid #eee;
  }
`;

const RollButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa 0%, #9e5594 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  
  &:disabled {
    background: #aaa;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  
  p {
    margin-top: 20px;
    color: white;
    font-size: 18px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
`;

const Spinner = styled.div`
  width: 80px;
  height: 80px;
  border: 8px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  color: white;
  padding: 40px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  margin-bottom: 30px;
  
  h3 {
    font-size: 24px;
    margin: 0 0 10px 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  p {
    margin: 0;
    font-size: 16px;
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
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

export default GachaPage;