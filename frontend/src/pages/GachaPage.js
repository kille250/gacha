import React, { useState, useContext, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdFavorite, MdStars, MdLocalFireDepartment, MdCheckCircle, MdFastForward, MdAdd, MdRemove } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy } from 'react-icons/fa';
import axios from 'axios';
import { rollCharacter, claimCharacter } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import confetti from 'canvas-confetti';

// Custom API function for multi-roll
const rollMultipleCharacters = async (count = 10) => {
  try {
    const response = await axios.post(
      'https://gachaapi.solidbooru.online/api/characters/roll-multi',
      { count },
      {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

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
  const [multiRollResults, setMultiRollResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showMultiResults, setShowMultiResults] = useState(false);
  const [error, setError] = useState(null);
  const { user, setUser } = useContext(AuthContext);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);
  const [userCollection, setUserCollection] = useState([]);
  const [skipAnimations, setSkipAnimations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [multiPullCount, setMultiPullCount] = useState(10);
  const [multiPullMenuOpen, setMultiPullMenuOpen] = useState(false);
  
  // Calculate maximum possible pulls based on user points
  const maxPossiblePulls = Math.min(10, Math.floor((user?.points || 0) / 100));

  // Calculate multi-pull cost with discount
  const calculateMultiPullCost = (count) => {
    const baseCost = count * 100;
    // Apply 10% discount for 10 pulls, 5% for 5-9 pulls
    let discount = 0;
    if (count >= 10) discount = 0.1;
    else if (count >= 5) discount = 0.05;
    
    return Math.floor(baseCost * (1 - discount));
  };

  // Cost for current multi-pull setting
  const currentMultiPullCost = calculateMultiPullCost(multiPullCount);
  
  // Fetch user collection on page load
  useEffect(() => {
    fetchUserCollection();
  }, []);

  // Reset multi-pull count when user points change
  useEffect(() => {
    // Adjust multi-pull count if user doesn't have enough points
    if (multiPullCount > maxPossiblePulls) {
      setMultiPullCount(Math.max(1, maxPossiblePulls));
    }
  }, [user?.points, maxPossiblePulls]);

  useEffect(() => {
    window.addEventListener('user-updated', updateUserData);
    
    return () => {
      window.removeEventListener('user-updated', updateUserData);
    };
  }, [updateUserData]);
  
  useEffect(() => {
    updateUserData();
  }, []);

  // Fetch user collection
  const fetchUserCollection = async () => {
    try {
      const response = await axios.get('https://gachaapi.solidbooru.online/api/characters/collection', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      setUserCollection(response.data);
    } catch (err) {
      console.error("Error fetching user collection:", err);
    }
  };

  // Update user data from API
  const updateUserData = useCallback(async () => {
    try {
      const userResponse = await axios.get('https://gachaapi.solidbooru.online/api/auth/me', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      setUser(userResponse.data);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
    } catch (userErr) {
      console.error("Error updating user data:", userErr);
    }
  }, [setUser]);

  // Check if character is in collection
  const isCharacterInCollection = useCallback((character) => {
    if (!character || !userCollection.length) return false;
    return userCollection.some(char => char.id === character.id);
  }, [userCollection]);

  // Show confetti effect for rare pulls
  const showRarePullEffect = useCallback((rarity) => {
    if (rarity === 'legendary' || rarity === 'epic') {
      confetti({
        particleCount: rarity === 'legendary' ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [
          rarityColors[rarity], 
          '#ffffff', 
          '#gold'
        ]
      });
    }
  }, []);

  // Effect to show confetti for rare pulls
  useEffect(() => {
    if (currentChar && !skipAnimations) {
      showRarePullEffect(currentChar.rarity);
    }
  }, [currentChar, skipAnimations, showRarePullEffect]);

  // Single roll function
  const handleRoll = async () => {
    try {
      setIsRolling(true);
      setShowCard(false);
      setShowMultiResults(false);
      setError(null);
      setMultiRollResults([]);
      
      // Increment roll count
      setRollCount(prev => prev + 1);
      
      // Simulate spinning animation (shorter duration)
      const animationDuration = skipAnimations ? 0 : 1200;
      
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
          
          // Update user data after roll
          await updateUserData();
          setIsRolling(false);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to roll character');
          setIsRolling(false);
        }
      }, animationDuration);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll character');
      setIsRolling(false);
    }
  };

  // Multi roll function
  const handleMultiRoll = async () => {
    const cost = calculateMultiPullCost(multiPullCount);
    
    if (user?.points < cost) {
      setError(`Not enough points for a ${multiPullCount}× roll. Required: ${cost} points`);
      return;
    }

    try {
      setIsRolling(true);
      setShowCard(false);
      setShowMultiResults(false);
      setError(null);
      setMultiPullMenuOpen(false);
      
      // Increment roll count
      setRollCount(prev => prev + multiPullCount);
      
      // Shorter animation for multi-roll
      const animationDuration = skipAnimations ? 0 : 1200;
      
      setTimeout(async () => {
        try {
          // Call multi-roll API with dynamic count
          const characters = await rollMultipleCharacters(multiPullCount);
          setMultiRollResults(characters);
          setShowMultiResults(true);
          
          // Update rarities history with best pull
          const bestRarity = findBestRarity(characters);
          setLastRarities(prev => {
            const updated = [bestRarity, ...prev];
            return updated.slice(0, 5);
          });
          
          // Show confetti for good pulls
          const hasRare = characters.some(char => char.rarity === 'rare' || char.rarity === 'epic' || char.rarity === 'legendary');
          if (hasRare && !skipAnimations) {
            confetti({
              particleCount: 150,
              spread: 90,
              origin: { y: 0.5 },
            });
          }
          
          // Update user data after roll
          await updateUserData();
          setIsRolling(false);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to roll multiple characters');
          setIsRolling(false);
        }
      }, animationDuration);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll multiple characters');
      setIsRolling(false);
    }
  };

  // Increment/decrement multi-pull count
  const adjustMultiPullCount = (amount) => {
    const newCount = multiPullCount + amount;
    // Ensure count is between 1 and max possible pulls
    if (newCount >= 1 && newCount <= maxPossiblePulls) {
      setMultiPullCount(newCount);
    }
  };

  // Helper to find the best rarity from a list of characters
  const findBestRarity = (characters) => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    let bestRarityIndex = 0;
    
    characters.forEach(char => {
      const charRarityIndex = rarityOrder.indexOf(char.rarity);
      if (charRarityIndex > bestRarityIndex) {
        bestRarityIndex = charRarityIndex;
      }
    });
    
    return rarityOrder[bestRarityIndex];
  };

  // Claim character function
  const handleClaim = async (characterId) => {
    try {
      await claimCharacter(characterId);
      
      // Display success effect
      showClaimSuccess();
      
      // Update user data
      await updateUserData();
      
      // Update collection after claiming
      await fetchUserCollection();
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
  
  // Preview a character
  const openPreview = (character) => {
    if (character) {
      setPreviewChar(character);
      setPreviewOpen(true);
    }
  };
  
  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewChar(null);
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

  // Toggle animation skipping
  const toggleSkipAnimations = () => {
    setSkipAnimations(prev => !prev);
  };

  // Toggle multi-pull menu
  const toggleMultiPullMenu = () => {
    setMultiPullMenuOpen(prev => !prev);
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
          <SettingsButton onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </SettingsButton>
        </HeaderControls>
      </GachaHeader>

      {showSettings && (
        <SettingsPanel>
          <SettingItem>
            <label>Skip Animations</label>
            <Switch 
              checked={skipAnimations} 
              onChange={toggleSkipAnimations} 
            />
          </SettingItem>
          <CloseButton onClick={() => setShowSettings(false)}>×</CloseButton>
        </SettingsPanel>
      )}

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
          {showCard && !showMultiResults ? (
            <CharacterCard
              key="character"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: skipAnimations ? 0.2 : 0.4, type: "spring", stiffness: 70 }}
              rarity={currentChar?.rarity}
              whileHover={{ scale: 1.03 }}
            >
              <CardImageContainer>
                <RarityGlow rarity={currentChar?.rarity} />
                {isCharacterInCollection(currentChar) && <CollectionBadge>In Collection</CollectionBadge>}
                <CardImage 
                  src={getImagePath(currentChar?.image)} 
                  alt={currentChar?.name}
                  onClick={() => openPreview(currentChar)}
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
                  onClick={() => handleClaim(currentChar.id)} 
                  disabled={!currentChar || isCharacterInCollection(currentChar)}
                  primary={!isCharacterInCollection(currentChar)}
                  owned={isCharacterInCollection(currentChar)}
                  whileHover={{ scale: isCharacterInCollection(currentChar) ? 1.0 : 1.05 }}
                  whileTap={{ scale: isCharacterInCollection(currentChar) ? 1.0 : 0.95 }}
                >
                  {isCharacterInCollection(currentChar) ? (
                    <><MdCheckCircle /> Already Owned</>
                  ) : (
                    <><MdFavorite /> Claim</>
                  )}
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
          ) : showMultiResults ? (
            <MultiRollSection
              key="multiResults"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MultiRollHeader>
                <h2>{multiRollResults.length}× Roll Results</h2>
                <MultiRollCloseButton onClick={() => setShowMultiResults(false)}>×</MultiRollCloseButton>
              </MultiRollHeader>

              <MultiCharactersGrid>
                {multiRollResults.map((character, index) => (
                  <MultiCharacterCard 
                    key={index}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: skipAnimations ? 0 : index * 0.05 }}
                    rarity={character.rarity}
                    whileHover={{ scale: 1.05, zIndex: 5 }}
                  >
                    <MultiCardImageContainer onClick={() => openPreview(character)}>
                      <RarityGlowMulti rarity={character.rarity} />
                      {isCharacterInCollection(character) && <CollectionBadgeMini>✓</CollectionBadgeMini>}
                      <MultiCardImage 
                        src={getImagePath(character.image)} 
                        alt={character.name}
                        onError={(e) => {
                          if (!e.target.src.includes('placeholder.com')) {
                            e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                          }
                        }}
                      />
                    </MultiCardImageContainer>
                    
                    <MultiCardContent>
                      <MultiCharName>{character.name}</MultiCharName>
                      <MultiRarityBadge rarity={character.rarity}>
                        {rarityIcons[character.rarity]} {character.rarity}
                      </MultiRarityBadge>
                    </MultiCardContent>
                    
                    <MultiCardClaimButton
                      disabled={isCharacterInCollection(character)} 
                      onClick={() => handleClaim(character.id)}
                      owned={isCharacterInCollection(character)}
                      whileHover={isCharacterInCollection(character) ? {} : { scale: 1.05 }}
                    >
                      {isCharacterInCollection(character) ? "Owned" : "Claim"}
                    </MultiCardClaimButton>
                  </MultiCharacterCard>
                ))}
              </MultiCharactersGrid>
            </MultiRollSection>
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
              <LoadingText>Summoning character{multiRollResults.length > 0 ? 's' : ''}...</LoadingText>
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

        <RollButtonsContainer>
          <RollButton 
            onClick={handleRoll} 
            disabled={isRolling || (user?.points < 100)}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(110, 72, 170, 0.5)" }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isRolling ? 
              "Summoning..." : 
              <>💫 Single Pull <RollCost>(100 pts)</RollCost></>
            }
          </RollButton>

          <MultiPullContainer>
            <MultiRollButton 
              onClick={multiPullMenuOpen ? handleMultiRoll : toggleMultiPullMenu}
              disabled={isRolling || (user?.points < 100)}
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(110, 72, 170, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              active={multiPullMenuOpen}
            >
              {isRolling ? "Summoning..." : (
                <>
                  🎯 {multiPullCount}× Pull{" "}
                  <RollCost>
                    ({currentMultiPullCost} pts
                    {multiPullCount >= 10 ? " • 10% OFF" : multiPullCount >= 5 ? " • 5% OFF" : ""})
                  </RollCost>
                </>
              )}
            </MultiRollButton>

            {multiPullMenuOpen && (
              <MultiPullMenu
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <MultiPullAdjuster>
                  <AdjustButton 
                    onClick={() => adjustMultiPullCount(-1)}
                    disabled={multiPullCount <= 1}
                  >
                    <MdRemove />
                  </AdjustButton>
                  <PullCountDisplay>{multiPullCount}</PullCountDisplay>
                  <AdjustButton 
                    onClick={() => adjustMultiPullCount(1)}
                    disabled={multiPullCount >= maxPossiblePulls}
                  >
                    <MdAdd />
                  </AdjustButton>
                </MultiPullAdjuster>

                <PullSlider 
                  type="range" 
                  min="1" 
                  max={maxPossiblePulls}
                  value={multiPullCount}
                  onChange={(e) => setMultiPullCount(parseInt(e.target.value))}
                />

                <DiscountInfo>
                  {multiPullCount >= 10 ? (
                    <strong>10% discount applied!</strong>
                  ) : multiPullCount >= 5 ? (
                    <span>5% discount applied</span>
                  ) : multiPullCount > 1 ? (
                    <span>Pull 5+ for 5% discount</span>
                  ) : (
                    <span>Increase count for discounts</span>
                  )}
                </DiscountInfo>

                <ConfirmButton 
                  onClick={handleMultiRoll}
                  disabled={user?.points < currentMultiPullCost}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Pull {multiPullCount} for {currentMultiPullCost} points
                </ConfirmButton>
              </MultiPullMenu>
            )}
          </MultiPullContainer>
        </RollButtonsContainer>
        
        <RollHint>
          You have enough points for <strong>{Math.floor((user?.points || 0) / 100)}</strong> single pulls
          {maxPossiblePulls > 1 && ` or up to a ${maxPossiblePulls}× multi-pull`}
        </RollHint>

        {skipAnimations && (
          <SkipAnimationsIndicator>
            <MdFastForward /> Fast Mode Enabled
          </SkipAnimationsIndicator>
        )}
      </GachaSection>
      
      <ImagePreviewModal 
        isOpen={previewOpen}
        onClose={closePreview}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={previewChar ? isCharacterInCollection(previewChar) : false}
        onClaim={previewChar && !isCharacterInCollection(previewChar) ? 
          () => handleClaim(previewChar.id) : undefined}
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
  overflow-x: hidden;
  
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
  
  @media (max-width: 768px) {
    padding: 15px 10px;
  }
`;

const GachaHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  padding: 15px;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 15px;
  
  @media (max-width: 480px) {
    padding: 12px;
    flex-wrap: wrap;
  }
`;

const SiteTitle = styled.h1`
  margin: 0;
  font-size: 28px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 480px) {
    font-size: 24px;
  }
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
  gap: 10px;
  
  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const SettingsButton = styled.button`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.3s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.5);
  }
`;

const SettingsPanel = styled.div`
  position: relative;
  background: rgba(20, 30, 48, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  padding: 8px 0;
  
  label {
    font-weight: 500;
  }
`;

const Switch = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 50px;
  height: 26px;
  background-color: #555;
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:checked {
    background-color: #6e48aa;
  }
  
  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: white;
    top: 3px;
    left: 3px;
    transition: transform 0.3s;
  }
  
  &:checked::before {
    transform: translateX(24px);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const RollCountDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 14px;
  }
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
  
  @media (max-width: 480px) {
    padding: 6px 12px;
    font-size: 16px;
  }
`;

const CoinIcon = styled.span`
  font-size: 20px;
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
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 480px) {
    padding: 8px;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
`;

const HistoryLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  
  @media (max-width: 480px) {
    width: 100%;
    text-align: center;
    margin-bottom: 5px;
  }
`;

const RarityList = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

const RarityBubble = styled(motion.div)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => rarityColors[props.rarity]};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const GachaSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px 0 40px 0;
  min-height: 400px;
  
  @media (max-width: 768px) {
    padding-bottom: 80px;
  }
`;

const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 320px;
  max-width: 90vw;
  overflow: hidden;
  box-shadow: ${props => `0 15px 40px rgba(
    ${props.rarity === 'legendary' ? '255, 152, 0' : 
      props.rarity === 'epic' ? '156, 39, 176' : 
      props.rarity === 'rare' ? '33, 150, 243' : '0, 0, 0'}, 
    ${props.rarity === 'common' ? '0.3' : '0.5'})`};
  margin-bottom: 20px;
  border: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  transform-style: preserve-3d;
  perspective: 1000px;
  
  @media (max-width: 480px) {
    width: 280px;
    margin-bottom: 15px;
  }
`;

const CardImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: 480px) {
    height: 280px;
  }
`;

const CollectionBadge = styled.div`
  position: absolute;
  left: 10px;
  top: 10px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 30px;
  z-index: 5;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 5px;
  
  &::before {
    content: "✓";
    font-size: 14px;
    font-weight: bold;
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
  transition: transform 0.4s ease;
  
  &:hover {
    transform: scale(1.05);
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
  font-size: 28px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardContent = styled.div`
  padding: 15px;
  position: relative;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.8));
`;

const CharName = styled.h2`
  margin: 0 0 5px 0;
  font-size: 22px;
  color: #333;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const CharSeries = styled.p`
  margin: 0;
  color: #666;
  font-style: italic;
  font-size: 14px;
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
  z-index: 5;
  
  @keyframes shiny {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
    100% { filter: brightness(1); }
  }
  
  animation: ${props => ['legendary', 'epic'].includes(props.rarity) ? 'shiny 2s infinite' : 'none'};
  
  @media (max-width: 480px) {
    right: 10px;
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
  background: ${props => {
    if (props.owned) return '#f1f8f1';
    return props.primary ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'none';
  }};
  color: ${props => {
    if (props.owned) return '#28a745';
    return props.primary ? 'white' : '#555';
  }};
  border: none;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s;
  font-weight: ${props => (props.primary || props.owned) ? 'bold' : 'normal'};
  
  &:hover {
    background-color: ${props => {
      if (props.owned) return '#f1f8f1';
      return props.primary ? 'none' : '#f0f0f0';
    }};
  }
  
  &:first-child {
    border-right: 1px solid #eee;
  }
  
  &:disabled {
    opacity: ${props => props.owned ? 1 : 0.5};
  }
  
  @media (max-width: 480px) {
    font-size: 13px;
    padding: 10px 6px;
  }
`;

// Multi-Roll Components
const MultiRollSection = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 100%;
  max-width: 820px;
  margin: 0 auto 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  
  @media (max-width: 768px) {
    max-width: 95%;
  }
`;

const MultiRollHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
  padding: 15px 20px;
  color: white;
  
  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }
`;

const MultiRollCloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const MultiCharactersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-gap: 15px;
  padding: 20px;
  
  @media (max-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    padding: 15px;
    grid-gap: 10px;
  }
`;

const MultiCharacterCard = styled(motion.div)`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  height: 250px;
  
  @media (max-width: 480px) {
    height: 220px;
  }
`;

const MultiCardImageContainer = styled.div`
  position: relative;
  height: 160px;
  overflow: hidden;
  cursor: pointer;
  
  @media (max-width: 480px) {
    height: 140px;
  }
`;

const RarityGlowMulti = styled.div`
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

const MultiCardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const CollectionBadgeMini = styled.div`
  position: absolute;
  top: 5px;
  left: 5px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  font-size: 11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

const MultiCardContent = styled.div`
  padding: 10px;
  position: relative;
`;

const MultiCharName = styled.h3`
  margin: 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MultiRarityBadge = styled.div`
  position: absolute;
  top: -10px;
  right: 10px;
  background: ${props => rarityColors[props.rarity] || rarityColors.common};
  color: white;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 3px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 5;
  
  @keyframes shiny {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
    100% { filter: brightness(1); }
  }
  
  animation: ${props => ['legendary', 'epic'].includes(props.rarity) ? 'shiny 2s infinite' : 'none'};
`;

const MultiCardClaimButton = styled(motion.button)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.owned ? '#f1f8f1' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  color: ${props => props.owned ? '#28a745' : 'white'};
  border: none;
  padding: 8px 0;
  font-weight: 600;
  font-size: 13px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:disabled {
    opacity: ${props => props.owned ? 1 : 0.5};
  }
  
  &:before {
    content: ${props => props.owned ? '"✓ "' : '""'};
  }
`;

const RollButtonsContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 10px;
  }
`;

const RollButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa 0%, #9e5594 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 15px 30px;
  font-size: 18px;
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
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 300px;
    padding: 12px 25px;
    font-size: 16px;
  }
`;

const MultiPullContainer = styled.div`
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 300px;
  }
`;

const MultiRollButton = styled(RollButton)`
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #2c5282, #0f2942)' 
    : 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)'};
  width: 100%;
  position: relative;
  z-index: 2;
  
  ${props => props.active && `
    border-radius: 15px 15px 0 0;
    box-shadow: 0 5px 20px rgba(16, 29, 59, 0.4);
  `}
`;

const MultiPullMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #1a365d 0%, #2c5282 100%);
  border-radius: 0 0 15px 15px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 1;
`;

const MultiPullAdjuster = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const AdjustButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover {
    background: ${props => props.disabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'};
  }
`;

const PullCountDisplay = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: white;
  width: 50px;
  text-align: center;
`;

const PullSlider = styled.input`
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: linear-gradient(90deg, #0f2942, #6e48aa);
  border-radius: 10px;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #9e5594;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }
  
  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #9e5594;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }
`;

const DiscountInfo = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  
  strong {
    color: #ffda44;
  }
`;

const ConfirmButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa 0%, #9e5594 100%);
  color: white;
  border: none;
  border-radius: 30px;
  padding: 12px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    opacity: 0.7;
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

const SkipAnimationsIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  color: #9e5594;
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  margin-top: 15px;
`;

const LoadingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
`;

const SpinnerContainer = styled.div`
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(110, 72, 170, 0.5);
`;

const Spinner = styled.div`
  width: 70px;
  height: 70px;
  border: 6px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  border-top-color: #9e5594;
  border-left-color: #6e48aa;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  margin-top: 20px;
  color: white;
  font-size: 18px;
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
    font-size: 24px;
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
  font-size: 36px;
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
  padding: 12px 20px;
  border-radius: 8px;
  margin: 15px auto;
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
  
  @media (max-width: 480px) {
    padding: 10px 15px;
    font-size: 14px;
    margin: 10px auto;
  }
`;

export default GachaPage;