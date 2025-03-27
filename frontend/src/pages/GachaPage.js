import {
  LoadingContainer, SpinnerContainer, Spinner, LoadingText,
  ErrorMessage, PointsCounter, CoinIcon, PointsAmount,
  RarityHistoryBar, HistoryLabel, RarityList, RarityBubble,
  GachaSection, CharacterCard, CardImageContainer, RarityGlow,
  CollectionBadge, CardImage, ZoomIconOverlay, ZoomIcon,
  CardContent, CharName, CharSeries, RarityBadge, CardActions,
  ActionButton, MultiRollSection, MultiRollHeader, MultiRollCloseButton,
  MultiCharactersGrid, MultiCardImageContainer, RarityGlowMulti,
  CollectionBadgeMini, MultiCardImage, MultiCardContent, MultiCharName,
  MultiRarityBadge, MultiCardClaimButton, EmptyState, EmptyStateIcon,
  RollButtonsContainer, RollButton, RollCost, MultiPullContainer,
  MultiRollButton, MultiPullMenu, ClosePullMenuButton, MultiPullAdjuster,
  AdjustButton, PullCountDisplay, PullSlider, DiscountInfo, ConfirmButton,
  RollHint, rarityColors
} from '../components/GachaStyles';
import React, { useState, useContext, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdFavorite, MdStars, MdLocalFireDepartment, MdCheckCircle, MdFastForward, MdAdd, MdRemove, MdClose, MdHelp } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaArrowRight } from 'react-icons/fa';
import axios from 'axios';
import { rollCharacter, claimCharacter, getActiveBanners } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

const rollMultipleCharacters = async (count = 10) => {
  try {
    const response = await axios.post(
      'https://gachaapi.solidbooru.online/api/characters/roll-multi',
      { count },
      { headers: { 'x-auth-token': localStorage.getItem('token') } }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

const rarityIcons = {
  common: <FaDice />,
  uncommon: <MdStars />,
  rare: <FaGem />,
  epic: <MdLocalFireDepartment />,
  legendary: <FaTrophy />
};

const GachaPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  const [currentChar, setCurrentChar] = useState(null);
  const [multiRollResults, setMultiRollResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showMultiResults, setShowMultiResults] = useState(false);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);
  const [userCollection, setUserCollection] = useState([]);
  const [skipAnimations, setSkipAnimations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [multiPullCount, setMultiPullCount] = useState(10);
  const [multiPullMenuOpen, setMultiPullMenuOpen] = useState(false);
  const [banners, setBanners] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Calculate maximum possible pulls based on user points
  const maxPossiblePulls = Math.min(100, Math.floor((user?.points || 0) / 100));
  
  const calculateMultiPullCost = (count) => {
    const baseCost = count * 100;
    let discount = 0;
    if (count >= 10) discount = 0.1;
    else if (count >= 5) discount = 0.05;
    return Math.floor(baseCost * (1 - discount));
  };
  
  const currentMultiPullCost = calculateMultiPullCost(multiPullCount);
  
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  
  useEffect(() => {
    fetchUserCollection();
    fetchBanners();
  }, []);
  
  // Set default multiPullCount based on user points
  useEffect(() => {
    const defaultCount = Math.min(10, maxPossiblePulls);
    setMultiPullCount(Math.max(1, defaultCount));
  }, [user?.points, maxPossiblePulls]);
  
  // Handle clicks outside of multi-pull menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (multiPullMenuOpen && !event.target.closest('.multi-pull-container')) {
        setMultiPullMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [multiPullMenuOpen]);
  
  const fetchUserCollection = async () => {
    try {
      const response = await axios.get('https://gachaapi.solidbooru.online/api/characters/collection', {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setUserCollection(response.data);
    } catch (err) {
      console.error("Error fetching user collection:", err);
    }
  };
  
  const fetchBanners = async () => {
    try {
      const bannersData = await getActiveBanners();
      setBanners(bannersData);
    } catch (err) {
      console.error("Error fetching banners:", err);
    }
  };
  
  const isCharacterInCollection = useCallback((character) => {
    return userCollection.some(char => char.id === character.id);
  }, [userCollection]);
  
  const showRarePullEffect = useCallback((rarity) => {
    if (['legendary', 'epic'].includes(rarity)) {
      confetti({
        particleCount: rarity === 'legendary' ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [rarityColors[rarity], '#ffffff', '#gold']
      });
    }
  }, []);
  
  useEffect(() => {
    if (currentChar && !skipAnimations) {
      showRarePullEffect(currentChar.rarity);
    }
  }, [currentChar, skipAnimations, showRarePullEffect]);
  
  const handleRoll = async () => {
    try {
      setIsRolling(true);
      setShowCard(false);
      setShowMultiResults(false);
      setError(null);
      setMultiRollResults([]);
      setRollCount(prev => prev + 1);
      const animationDuration = skipAnimations ? 0 : 1200;
      
      setTimeout(async () => {
        try {
          const character = await rollCharacter();
          setCurrentChar(character);
          setShowCard(true);
          setLastRarities(prev => [character.rarity, ...prev.slice(0, 4)]);
          await refreshUser();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to roll character');
        } finally {
          setIsRolling(false);
        }
      }, animationDuration);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll character');
      setIsRolling(false);
    }
  };
  
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
      setRollCount(prev => prev + multiPullCount);
      const animationDuration = skipAnimations ? 0 : 1200;
      
      setTimeout(async () => {
        try {
          const characters = await rollMultipleCharacters(multiPullCount);
          setMultiRollResults(characters);
          setShowMultiResults(true);
          const bestRarity = findBestRarity(characters);
          setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
          
          if (characters.some(char => ['rare', 'epic', 'legendary'].includes(char.rarity)) && !skipAnimations) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          }
          
          await refreshUser();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to roll multiple characters');
        } finally {
          setIsRolling(false);
        }
      }, animationDuration);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll multiple characters');
      setIsRolling(false);
    }
  };
  
  const adjustMultiPullCount = (amount) => {
    const newCount = multiPullCount + amount;
    if (newCount >= 1 && newCount <= maxPossiblePulls) {
      setMultiPullCount(newCount);
    }
  };
  
  const findBestRarity = (characters) => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    return characters.reduce((best, char) => {
      const currentIndex = rarityOrder.indexOf(char.rarity);
      return currentIndex > rarityOrder.indexOf(best) ? char.rarity : best;
    }, 'common');
  };
  
  const handleClaim = async (characterId) => {
    try {
      await claimCharacter(characterId);
      confetti({ particleCount: 50, spread: 30, origin: { y: 0.7 }, colors: ['#1abc9c', '#3498db', '#2ecc71'] });
      await refreshUser();
      await fetchUserCollection();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to claim character');
    }
  };
  
  const getImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/300?text=No+Image';
    if (imageSrc.startsWith('http')) return imageSrc;
    if (imageSrc.startsWith('/uploads')) return `https://gachaapi.solidbooru.online${imageSrc}`;
    if (imageSrc.startsWith('image-')) return `https://gachaapi.solidbooru.online/uploads/characters/${imageSrc}`;
    return imageSrc.includes('/') ? imageSrc : `/images/characters/${imageSrc}`;
  };
  
  const getBannerImageUrl = (imagePath) => {
    if (!imagePath) return 'https://via.placeholder.com/300x150?text=Banner';
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads')) {
      return `https://gachaapi.solidbooru.online${imagePath}`;
    }
    
    return `/images/banners/${imagePath}`;
  };
  
  const toggleSkipAnimations = () => setSkipAnimations(prev => !prev);
  const toggleMultiPullMenu = () => setMultiPullMenuOpen(prev => !prev);
  const toggleHelpModal = () => setShowHelpModal(prev => !prev);
  
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
  
  return (
    <GachaContainer>
      <ParticlesBackground />
      
      {/* App Header */}
      <GachaHeader>
        <SiteTitle>
          <span>Gacha</span>
          <GlowingSpan>Master</GlowingSpan>
        </SiteTitle>
        <HeaderControls>
          <HeaderStats>
            <StatsItem>
              <FaDice />
              <span>{rollCount} Rolls</span>
            </StatsItem>
            <PointsCounter>
              <CoinIcon>🪙</CoinIcon> 
              <PointsAmount>{user?.points || 0}</PointsAmount>
            </PointsCounter>
          </HeaderStats>
          <HeaderButtons>
            <IconButton onClick={toggleHelpModal} aria-label="Help">
              <MdHelp />
            </IconButton>
            <IconButton onClick={() => setShowSettings(!showSettings)} aria-label="Settings">
              ⚙️
            </IconButton>
          </HeaderButtons>
        </HeaderControls>
      </GachaHeader>
      
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
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
      </AnimatePresence>
      
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <ErrorMessage 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
            <CloseErrorButton onClick={() => setError(null)}>×</CloseErrorButton>
          </ErrorMessage>
        )}
      </AnimatePresence>
      
      {/* Rarity History */}
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
      
      {/* Special Banners Section */}
      {banners.length > 0 && (
        <BannersSection>
          <SectionTitle>
            <SectionIcon>🏆</SectionIcon>
            <span>Special Banners</span>
          </SectionTitle>
          
          <BannersScroller>
            {banners.map(banner => (
              <BannerCard 
                key={banner.id}
                featured={banner.featured}
                onClick={() => navigate(`/banner/${banner.id}`)}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <BannerImage
                  src={getBannerImageUrl(banner.image)}
                  alt={banner.name}
                  onError={(e) => {
                    if (!e.target.src.includes('placeholder.com')) {
                      e.target.src = 'https://via.placeholder.com/300x150?text=Banner';
                    }
                  }}
                />
                <BannerCardInfo>
                  <BannerName>{banner.name}</BannerName>
                  <BannerSeriesName>{banner.series}</BannerSeriesName>
                  
                  {banner.endDate && (
                    <BannerEndDate>
                      Ends: {new Date(banner.endDate).toLocaleDateString()}
                    </BannerEndDate>
                  )}
                  
                  <BannerCostLabel>
                    {Math.floor(100 * (banner.costMultiplier || 1.5))} points per pull
                  </BannerCostLabel>
                  
                  <BannerButton>
                    Roll on Banner <FaArrowRight size={14} />
                  </BannerButton>
                </BannerCardInfo>
              </BannerCard>
            ))}
          </BannersScroller>
        </BannersSection>
      )}
      
      {/* Standard Gacha Section - Enhanced for better width management */}
      <EnhancedGachaSection>
        <SectionTitle>
          <SectionIcon>🎲</SectionIcon>
          <span>Standard Gacha</span>
        </SectionTitle>
        
        {/* Character Display Area - Enhanced for better width utilization */}
        <EnhancedCharacterResultsArea>
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
              <EnhancedMultiRollSection
                key="multiResults"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MultiRollHeader>
                  <h2>{multiRollResults.length}× Roll Results</h2>
                  <MultiRollCloseButton onClick={() => setShowMultiResults(false)}>×</MultiRollCloseButton>
                </MultiRollHeader>
                <EnhancedMultiCharactersGrid>
                  {multiRollResults.map((character, index) => (
                    <EnhancedMultiCharacterCard 
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
                    </EnhancedMultiCharacterCard>
                  ))}
                </EnhancedMultiCharactersGrid>
              </EnhancedMultiRollSection>
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
        </EnhancedCharacterResultsArea>
        
        {/* Roll Buttons */}
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
          
          <MultiPullContainer className="multi-pull-container">
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
            
            <AnimatePresence>
              {multiPullMenuOpen && (
                <MultiPullMenu
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <ClosePullMenuButton onClick={toggleMultiPullMenu}>
                    <MdClose />
                  </ClosePullMenuButton>
                  
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
                    max={maxPossiblePulls || 1}
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
            </AnimatePresence>
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
      </EnhancedGachaSection>
      
      {/* Character Preview Modal */}
      <ImagePreviewModal 
        isOpen={previewOpen}
        onClose={closePreview}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={previewChar ? isCharacterInCollection(previewChar) : false}
        isBannerCharacter={previewChar?.isBannerCharacter}
        onClaim={previewChar && !isCharacterInCollection(previewChar) ? 
          () => handleClaim(previewChar.id) : undefined}
      />
      
      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <HelpModal
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <HelpModalHeader>
              <h2>How to Play</h2>
              <CloseButton onClick={toggleHelpModal}>×</CloseButton>
            </HelpModalHeader>
            
            <HelpModalContent>
              <HelpSection>
                <h3>Getting Started</h3>
                <p>Use your points to pull characters and build your collection!</p>
                <ul>
                  <li>Single Pull costs 100 points</li>
                  <li>Multi Pulls offer discounts (5% for 5+ pulls, 10% for 10+ pulls)</li>
                  <li>Special banners have unique characters with different rates</li>
                </ul>
              </HelpSection>
              
              <HelpSection>
                <h3>Rarities</h3>
                <RarityGuide>
                  {Object.entries(rarityColors).map(([rarity, color]) => (
                    <RarityItem key={rarity}>
                      <RarityBubble rarity={rarity}>{rarityIcons[rarity]}</RarityBubble>
                      <span>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>
                    </RarityItem>
                  ))}
                </RarityGuide>
              </HelpSection>
              
              <HelpSection>
                <h3>Tips</h3>
                <ul>
                  <li>Characters must be claimed to add them to your collection</li>
                  <li>Toggle Fast Mode to skip animations</li>
                  <li>Check special banners for featured characters</li>
                </ul>
              </HelpSection>
            </HelpModalContent>
          </HelpModal>
        )}
      </AnimatePresence>
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

const GachaHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  padding: 15px;
  backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 15px;
  
  @media (max-width: 480px) {
    padding: 12px;
    flex-direction: column;
    gap: 10px;
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
  gap: 15px;
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const HeaderStats = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const StatsItem = styled.div`
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

const HeaderButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
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

const SettingsPanel = styled(motion.div)`
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

const CloseErrorButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  margin-left: 10px;
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

// Section Title Components
const SectionTitle = styled.h2`
  color: white;
  font-size: 22px;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 480px) {
    font-size: 20px;
  }
`;

const SectionIcon = styled.span`
  font-size: 24px;
  
  @media (max-width: 480px) {
    font-size: 20px;
  }
`;

// Banner Section Components
const BannersSection = styled.section`
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const BannersScroller = styled.div`
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding: 10px 5px 20px;
  -webkit-overflow-scrolling: touch;
  
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
  }
`;

const BannerCard = styled(motion.div)`
  width: 300px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  border: ${props => props.featured ? 
    '2px solid rgba(255, 215, 0, 0.7)' : 
    '1px solid rgba(255, 255, 255, 0.1)'};
  
  ${props => props.featured && `
    position: relative;
    
    &::after {
      content: "Featured";
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #ffd700, #ff9500);
      color: white;
      font-size: 11px;
      font-weight: bold;
      padding: 3px 10px;
      border-radius: 20px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
  `}
  
  @media (max-width: 480px) {
    width: 280px;
  }
`;

const BannerImage = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
`;

const BannerCardInfo = styled.div`
  padding: 15px;
`;

const BannerName = styled.h3`
  margin: 0 0 5px 0;
  color: white;
  font-size: 18px;
`;

const BannerSeriesName = styled.p`
  margin: 0 0 10px 0;
  color: #ffd700;
  font-size: 14px;
`;

const BannerEndDate = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
`;

const BannerCostLabel = styled.div`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 15px;
  font-weight: 500;
`;

const BannerButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  padding: 8px 0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  }
`;

// Enhanced GachaSection with better width management
const EnhancedGachaSection = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  
  @media (max-width: 768px) {
    padding: 15px 10px;
    padding-bottom: 80px;
  }
`;

// Enhanced Character Results Area for better width
const EnhancedCharacterResultsArea = styled.div`
  width: 100%;
  min-height: 450px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  
  @media (max-width: 480px) {
    min-height: 350px;
  }
`;

// Enhanced Multi Roll Section for better width
const EnhancedMultiRollSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
`;

// Enhanced Multi Characters Grid for consistent layout
const EnhancedMultiCharactersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
  padding: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
    padding: 15px;
  }
`;

// Enhanced Multi Character Card
const EnhancedMultiCharacterCard = styled(motion.div)`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  height: 250px;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    height: 230px;
  }
  
  @media (max-width: 480px) {
    height: 210px;
  }
`;

// Animation Indicator
const SkipAnimationsIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #9e5594;
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  margin-top: 15px;
`;

// Help Modal Components
const HelpModal = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 500px;
  background: rgba(20, 30, 48, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  color: white;
  z-index: 1000; /* Increased z-index to ensure it appears above other elements */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  /* Adding margin: 0 auto ensures it's centered horizontally */
  margin: 0 auto;
  
  @media (max-width: 480px) {
    width: 95%;
    max-height: 90vh;
  }
`;

const HelpModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h2 {
    margin: 0;
    font-size: 22px;
  }
`;

const HelpModalContent = styled.div`
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
  
  @media (max-width: 480px) {
    padding: 15px;
  }
`;

const HelpSection = styled.div`
  margin-bottom: 20px;
  
  h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
    color: #9e5594;
  }
  
  p, ul {
    margin: 0 0 10px 0;
    font-size: 14px;
    line-height: 1.6;
  }
  
  ul {
    padding-left: 20px;
    
    li {
      margin-bottom: 5px;
    }
  }
`;

const RarityGuide = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const RarityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;

export default GachaPage;