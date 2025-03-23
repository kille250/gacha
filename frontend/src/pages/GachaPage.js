import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdFavorite, MdStars, MdLocalFireDepartment } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy } from 'react-icons/fa';
import axios from 'axios';
import { rollCharacter, claimCharacter } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import confetti from 'canvas-confetti';

const rarityColors = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800'
};

const rarityIcons = {
  common: <FaDice />,
  uncommon: <MdStars />,
  rare: <FaGem />,
  epic: <MdLocalFireDepartment />,
  legendary: <FaTrophy />
};

const GachaPage = () => {
  const [currentChar, setCurrentChar] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [error, setError] = useState(null);
  const { user, setUser } = useContext(AuthContext);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);

  // Effect to show confetti for rare pulls
  useEffect(() => {
    if (currentChar && (currentChar.rarity === 'legendary' || currentChar.rarity === 'epic')) {
      setTimeout(() => {
        confetti({
          particleCount: currentChar.rarity === 'legendary' ? 200 : 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [
            rarityColors[currentChar.rarity], 
            '#ffffff', 
            '#gold'
          ]
        });
      }, 300);
    }
  }, [currentChar]);

  const handleRoll = async () => {
    try {
      setIsRolling(true);
      setShowCard(false);
      setError(null);
      
      // Increment roll count
      setRollCount(prev => prev + 1);
      
      // Simulate spinning animation
      setTimeout(async () => {
        try {
          const character = await rollCharacter();
          setCurrentChar(character);
          setShowCard(true);
          
          // Update rarities history (keep last 5)
          setLastRarities(prev => {
            const updated = [character.rarity, ...prev];
            return updated.slice(0, 5);
          });
          
          // User data update after roll
          try {
            const userResponse = await axios.get('https://gachaapi.solidbooru.online/api/auth/me', {
              headers: {
                'x-auth-token': localStorage.getItem('token')
              }
            });
            
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
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll character');
      setIsRolling(false);
    }
  };

  const handleClaim = async () => {
    if (!currentChar) return;
    
    try {
      await claimCharacter(currentChar.id);
      
      // Display success effect
      showClaimSuccess();
      
      // Update user data
      const userResponse = await axios.get('https://gachaapi.solidbooru.online/api/auth/me', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      setUser(userResponse.data);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to claim character');
    }
  };

  const showClaimSuccess = () => {
    // Simple confetti to confirm the claim
    confetti({
      particleCount: 50,
      spread: 30,
      origin: { y: 0.7 },
      colors: ['#1abc9c', '#3498db', '#2ecc71']
    });
  };
  
  const openPreview = () => {
    if (currentChar) {
      setPreviewOpen(true);
    }
  };
  
  const closePreview = () => {
    setPreviewOpen(false);
  };
  
  const getImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/300?text=No+Image';
    
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

  return (
    <GachaContainer>
      <ParticlesBackground />
      
      <GachaHeader>
        <SiteTitle>
          <span>Gacha</span>
          <GlowingSpan>Master</GlowingSpan>
        </SiteTitle>
        <HeaderControls>
          <RollCountDisplay>
            <FaDice /> {rollCount} Rolls
          </RollCountDisplay>
          <PointsCounter>
            <CoinIcon>🪙</CoinIcon> 
            <PointsAmount>{user?.points || 0}</PointsAmount>
          </PointsCounter>
        </HeaderControls>
      </GachaHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <RarityHistoryBar>
        {lastRarities.length > 0 && (
          <>
            <HistoryLabel>Recent pulls:</HistoryLabel>
            <RarityList>
              {lastRarities.map((rarity, index) => (
                <RarityBubble 
                  key={index} 
                  rarity={rarity}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {rarityIcons[rarity] || rarityIcons.common}
                </RarityBubble>
              ))}
            </RarityList>
          </>
        )}
      </RarityHistoryBar>

      <GachaSection>
        <AnimatePresence mode="wait">
          {showCard ? (
            <CharacterCard
              key="character"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.7, type: "spring", stiffness: 70 }}
              rarity={currentChar?.rarity}
              whileHover={{ scale: 1.03 }}
            >
              <CardImageContainer>
                <RarityGlow rarity={currentChar?.rarity} />
                <CardImage 
                  src={getImagePath(currentChar?.image)} 
                  alt={currentChar?.name}
                  onClick={openPreview}
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                    }
                  }}
                />
                <ZoomIconOverlay>
                  <ZoomIcon>🔍</ZoomIcon>
                </ZoomIconOverlay>
              </CardImageContainer>
              
              <CardContent>
                <CharName>{currentChar?.name}</CharName>
                <CharSeries>{currentChar?.series}</CharSeries>
                <RarityBadge rarity={currentChar?.rarity}>
                  {rarityIcons[currentChar?.rarity]} {currentChar?.rarity}
                </RarityBadge>
              </CardContent>
              
              <CardActions>
                <ActionButton 
                  onClick={handleClaim} 
                  disabled={!currentChar}
                  primary
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MdFavorite /> Claim
                </ActionButton>
                <ActionButton 
                  onClick={handleRoll} 
                  disabled={isRolling || (user?.points < 100)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
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
              <SpinnerContainer>
                <Spinner />
              </SpinnerContainer>
              <LoadingText>Summoning character...</LoadingText>
            </LoadingContainer>
          ) : (
            <EmptyState
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EmptyStateIcon>✨</EmptyStateIcon>
              <h3>Roll to Discover Characters!</h3>
              <p>Try your luck and build your collection</p>
            </EmptyState>
          )}
        </AnimatePresence>

        <RollButton 
          onClick={handleRoll} 
          disabled={isRolling || (user?.points < 100)}
          whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(110, 72, 170, 0.5)" }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {isRolling ? 
            "Summoning..." : 
            <>💫 Roll Character <RollCost>(100 points)</RollCost></>
          }
        </RollButton>
        
        <RollHint>
          You have enough points for <strong>{Math.floor((user?.points || 0) / 100)}</strong> more rolls
        </RollHint>
      </GachaSection>
      
      <ImagePreviewModal 
        isOpen={previewOpen}
        onClose={closePreview}
        image={currentChar ? getImagePath(currentChar.image) : ''}
        name={currentChar?.name || ''}
        series={currentChar?.series || ''}
        rarity={currentChar?.rarity || 'common'}
      />
    </GachaContainer>
  );
};

// Styled Components
const ParticlesBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(216, 241, 230, 0.1) 0%, transparent 80%),
    radial-gradient(circle at 90% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
`;

const GachaContainer = styled.div`
  min-height: 100vh;
  background-image: linear-gradient(135deg, #141e30 0%, #243b55 100%);
  background-size: cover;
  background-position: center;
  padding: 20px;
  position: relative;
  overflow-x: hidden; /* Horizontales Scrollen verhindern */
  
  &::after {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('/images/backgrounds/gacha-bg.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.15;
    z-index: -2;
    pointer-events: none;
  }
  
  @media (max-width: 480px) {
    padding: 15px 10px; /* Kleinere Seitenränder auf kleinen Bildschirmen */
  }
`;

const GachaHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  padding: 20px;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
`;

const SiteTitle = styled.h1`
  margin: 0;
  font-size: 32px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GlowingSpan = styled.span`
  background: linear-gradient(90deg, #6e48aa, #9e5594);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  position: relative;
  
  &::after {
    content: "";
    position: absolute;
    bottom: -5px;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6e48aa, #9e5594);
    border-radius: 3px;
  }
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const RollCountDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PointsCounter = styled.div`
  background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;

const CoinIcon = styled.span`
  font-size: 22px;
  animation: coinPulse 3s infinite;
  
  @keyframes coinPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const PointsAmount = styled.span`
  font-weight: bold;
`;

const RarityHistoryBar = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 480px) {
    padding: 10px;
    flex-wrap: wrap; /* Erlaubt Umbrüche bei kleinen Bildschirmen */
    justify-content: center;
  }
`;

const HistoryLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  
  @media (max-width: 480px) {
    width: 100%; /* Volle Breite, damit die Bubbles darunter angezeigt werden*/
    text-align: center;
    margin-bottom: 5px;
  }
`;

const RarityList = styled.div`
  display: flex;
  gap: 8px;
`;

const RarityBubble = styled(motion.div)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => rarityColors[props.rarity]};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const GachaSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Geändert von center zu flex-start */
  padding: 20px 0 40px 0;
  min-height: 400px;
  overflow-y: auto; /* Erlaubt Scrollen wenn nötig */
  
  @media (max-width: 768px) {
    padding-bottom: 80px; /* Mehr Platz am unteren Rand auf Mobilgeräten */
    height: auto; /* Höhe nicht fixieren */
    min-height: 0; /* Keine Mindesthöhe erzwingen */
  }
`;

const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 320px;
  max-width: 90vw; /* Niemals breiter als der Viewport */
  overflow: hidden;
  box-shadow: ${props => `0 15px 40px rgba(
    ${props.rarity === 'legendary' ? '255, 152, 0' : 
      props.rarity === 'epic' ? '156, 39, 176' : 
      props.rarity === 'rare' ? '33, 150, 243' : '0, 0, 0'}, 
    ${props.rarity === 'common' ? '0.3' : '0.5'})`};
  margin-bottom: 30px;
  border: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  transform-style: preserve-3d;
  perspective: 1000px;
  
  @media (max-width: 480px) {
    width: 280px; /* Etwas schmaler auf sehr kleinen Bildschirmen */
    margin-bottom: 20px;
  }
`;

const CardImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 340px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: 480px) {
    height: 280px; /* Weniger Bildhöhe auf sehr kleinen Bildschirmen */
  }
`;

const RarityGlow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => {
    const color = rarityColors[props.rarity] || rarityColors.common;
    return props.rarity === 'legendary' || props.rarity === 'epic' ? 
      `linear-gradient(45deg, ${color}33, transparent, ${color}33)` : 
      'none';
  }};
  pointer-events: none;
  z-index: 1;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
  
  &:hover {
    transform: scale(1.07);
  }
`;

const ZoomIconOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  
  ${CardImageContainer}:hover & {
    opacity: 1;
  }
`;

const ZoomIcon = styled.div`
  font-size: 32px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardContent = styled.div`
  padding: 20px;
  position: relative;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.8));
`;

const CharName = styled.h2`
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #333;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const CharSeries = styled.p`
  margin: 0;
  color: #666;
  font-style: italic;
`;

const RarityBadge = styled.div`
  position: absolute;
  top: -15px;
  right: 20px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 6px 12px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 5; /* Höherer z-index um Sichtbarkeit zu gewährleisten */
  
  @keyframes shiny {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
    100% { filter: brightness(1); }
  }
  
  animation: ${props => ['legendary', 'epic'].includes(props.rarity) ? 'shiny 2s infinite' : 'none'};
  
  @media (max-width: 480px) {
    right: 10px; /* Etwas näher am Rand auf kleinen Bildschirmen */
    top: -12px;
    padding: 4px 10px;
    font-size: 10px;
  }
`;

const CardActions = styled.div`
  display: flex;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`;

const ActionButton = styled(motion.button)`
  flex: 1;
  background: ${props => props.primary ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'none'};
  color: ${props => props.primary ? 'white' : '#555'};
  border: none;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: ${props => props.primary ? 'bold' : 'normal'};
  
  &:hover {
    background-color: ${props => props.primary ? 'none' : '#f0f0f0'};
  }
  
  &:first-child {
    border-right: 1px solid #eee;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RollButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa 0%, #9e5594 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 18px 36px;
  font-size: 22px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 5px 20px rgba(110, 72, 170, 0.4);
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -10%;
    left: -10%;
    right: -10%;
    bottom: -10%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }
  
  &:hover::before {
    transform: translateX(100%);
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
  
  @media (max-width: 480px) {
    padding: 14px 28px;
    font-size: 18px;
    width: 85%; /* Breite begrenzen */
    max-width: 300px;
    justify-content: center;
  }
`;

const RollCost = styled.span`
  font-size: 14px;
  opacity: 0.8;
  margin-left: 5px;
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const RollHint = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 15px;
  text-align: center;
`;

const LoadingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
`;

const SpinnerContainer = styled.div`
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(110, 72, 170, 0.5);
`;

const Spinner = styled.div`
  width: 80px;
  height: 80px;
  border: 8px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  border-top-color: #9e5594;
  border-left-color: #6e48aa;
  animation: spin 1.2s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  margin-top: 25px;
  color: white;
  font-size: 20px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  color: white;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  margin-bottom: 30px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 350px;
  
  h3 {
    font-size: 28px;
    margin: 0 0 15px 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    font-weight: 700;
    background: linear-gradient(135deg, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
    line-height: 1.5;
  }
`;

const EmptyStateIcon = styled.div`
  font-size: 42px;
  margin-bottom: 15px;
  animation: float 3s ease-in-out infinite;
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 600px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  font-weight: 500;
  border-left: 5px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  &::before {
    content: "⚠️";
    font-size: 18px;
  }
`;

export default GachaPage;