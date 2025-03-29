import {
  LoadingContainer, SpinnerContainer, Spinner, LoadingText,
  ErrorMessage, PointsCounter, CoinIcon, PointsAmount,
  RarityHistoryBar, HistoryLabel, RarityList, RarityBubble,
  CardContent, CharName, CharSeries, RarityBadge, CardActions,
  ActionButton, MultiRollHeader, MultiRollCloseButton,
  MultiCardContent, MultiCharName,
  MultiRarityBadge, MultiCardClaimButton, EmptyState, EmptyStateIcon,
  RollButtonsContainer, RollButton, RollCost,
  MultiRollButton, PullCountDisplay,
  PullSlider, DiscountInfo, ConfirmButton,
  RollHint, rarityColors, ModalOverlay, NewMultiPullPanel, PanelHeader, 
  CloseButton, PanelContent, CurrentSelection, SelectionValue, SelectionCost,
  DiscountTag, PresetOptions, PresetButton, DiscountBadge, SliderContainer,
  PullCountAdjuster, AdjustBtn, PullInfoGraphic, PullInfoCard, PullInfoIcon,
  PullInfoLabel, PullInfoValue, ErrorNote
} from '../components/GachaStyles';
import React, { useState, useContext, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdCheckCircle, MdFastForward, MdAdd, MdRemove, MdClose, MdHelp } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaArrowRight } from 'react-icons/fa';
import axios from 'axios';
import { rollCharacter, getActiveBanners } from '../utils/api';
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
  uncommon: <MdHelp />,
  rare: <FaGem />,
  epic: <MdHelp />,
  legendary: <FaTrophy />
};

// New MultiPullMenu component
const MultiPullMenu = ({ 
  isOpen, 
  onClose, 
  multiPullCount, 
  setMultiPullCount, 
  maxPossiblePulls, 
  currentMultiPullCost, 
  onConfirm,
  userPoints
}) => {
  // Get recommended pull counts based on maxPossiblePulls
  const getRecommendedPulls = () => {
    const recommendations = [];
    
    // Always recommend single pull
    recommendations.push(1);
    
    // Add 5-pull if possible (first discount tier)
    if (maxPossiblePulls >= 5) recommendations.push(5);
    
    // Add 10-pull if possible (max discount tier)
    if (maxPossiblePulls >= 10) recommendations.push(10);
    
    // Add max possible if it's not already included and is greater than 10
    if (maxPossiblePulls > 10 && !recommendations.includes(maxPossiblePulls)) {
      recommendations.push(maxPossiblePulls);
    }
    
    return recommendations;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <NewMultiPullPanel
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <PanelHeader>
              <h2>Multi Pull Settings</h2>
              <CloseButton onClick={onClose}>×</CloseButton>
            </PanelHeader>
            
            <PanelContent>
              <CurrentSelection>
                <SelectionValue>{multiPullCount}×</SelectionValue>
                <SelectionCost>
                  {currentMultiPullCost} points
                  {multiPullCount >= 10 && <DiscountTag>10% OFF</DiscountTag>}
                  {multiPullCount >= 5 && multiPullCount < 10 && <DiscountTag>5% OFF</DiscountTag>}
                </SelectionCost>
              </CurrentSelection>
              
              <PresetOptions>
                {getRecommendedPulls().map(count => (
                  <PresetButton 
                    key={count} 
                    onClick={() => setMultiPullCount(count)}
                    active={multiPullCount === count}
                    disabled={userPoints < (count * 100 * (count >= 10 ? 0.9 : count >= 5 ? 0.95 : 1))}
                  >
                    {count}× Pull
                    {count >= 10 && <DiscountBadge>-10%</DiscountBadge>}
                    {count >= 5 && count < 10 && <DiscountBadge>-5%</DiscountBadge>}
                  </PresetButton>
                ))}
                <PresetButton 
                  onClick={() => {}}
                  active={!getRecommendedPulls().includes(multiPullCount)}
                  disabled={false}
                >
                  Custom
                </PresetButton>
              </PresetOptions>
              
              <SliderContainer>
                <PullCountAdjuster>
                  <AdjustBtn
                    onClick={() => setMultiPullCount(Math.max(1, multiPullCount - 1))}
                    disabled={multiPullCount <= 1}
                  >
                    <MdRemove />
                  </AdjustBtn>
                  <PullCountDisplay>{multiPullCount}</PullCountDisplay>
                  <AdjustBtn
                    onClick={() => setMultiPullCount(Math.min(maxPossiblePulls, multiPullCount + 1))}
                    disabled={multiPullCount >= maxPossiblePulls}
                  >
                    <MdAdd />
                  </AdjustBtn>
                </PullCountAdjuster>
                
                <PullSlider
                  type="range"
                  min="1"
                  max={maxPossiblePulls || 1}
                  value={multiPullCount}
                  onChange={(e) => setMultiPullCount(parseInt(e.target.value))}
                />
              </SliderContainer>
              
              <PullInfoGraphic>
                <PullInfoCard>
                  <PullInfoIcon>💰</PullInfoIcon>
                  <PullInfoLabel>Total Cost</PullInfoLabel>
                  <PullInfoValue>{currentMultiPullCost} pts</PullInfoValue>
                </PullInfoCard>
                
                <PullInfoCard>
                  <PullInfoIcon>⭐</PullInfoIcon>
                  <PullInfoLabel>Pull Count</PullInfoLabel>
                  <PullInfoValue>{multiPullCount}×</PullInfoValue>
                </PullInfoCard>
                
                {multiPullCount >= 5 && (
                  <PullInfoCard accent={true}>
                    <PullInfoIcon>🎁</PullInfoIcon>
                    <PullInfoLabel>Discount</PullInfoLabel>
                    <PullInfoValue>{multiPullCount >= 10 ? '10%' : '5%'}</PullInfoValue>
                  </PullInfoCard>
                )}
              </PullInfoGraphic>
              
              <ConfirmButton
                onClick={onConfirm}
                disabled={userPoints < currentMultiPullCost}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaDice size={16} /> Pull {multiPullCount}× for {currentMultiPullCost} points
              </ConfirmButton>
              
              {userPoints < currentMultiPullCost && (
                <ErrorNote>
                  <span>Not enough points.</span> You need {currentMultiPullCost - userPoints} more.
                </ErrorNote>
              )}
            </PanelContent>
          </NewMultiPullPanel>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
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
  const maxPossiblePulls = Math.min(20, Math.floor((user?.points || 0) / 100));
  
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
          await fetchUserCollection();
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
          await fetchUserCollection();
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
  
  const findBestRarity = (characters) => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    return characters.reduce((best, char) => {
      const currentIndex = rarityOrder.indexOf(char.rarity);
      return currentIndex > rarityOrder.indexOf(best) ? char.rarity : best;
    }, 'common');
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
    <MainContainer>
      <Dashboard>
        {/* Header bar with points and other info */}
        <Header>
          <Logo>
            <span>Gacha</span>
            <GlowingText>Master</GlowingText>
          </Logo>
          <UserStats>
            <StatsBadge>
              <FaDice />
              <span>{rollCount} Rolls</span>
            </StatsBadge>
            <PointsDisplay>
              <CoinIcon>🪙</CoinIcon>
              <PointsAmount>{user?.points || 0}</PointsAmount>
            </PointsDisplay>
            <ControlButtons>
              <CircleButton onClick={toggleHelpModal} title="Help">
                <MdHelp />
              </CircleButton>
              <CircleButton onClick={() => setShowSettings(!showSettings)} title="Settings">
                ⚙️
              </CircleButton>
            </ControlButtons>
          </UserStats>
        </Header>
    
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <SettingsPanel
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingGroup>
                <SettingLabel>Skip Animations</SettingLabel>
                <ToggleSwitch
                  checked={skipAnimations}
                  onChange={toggleSkipAnimations}
                />
              </SettingGroup>
              <PanelCloseBtn onClick={() => setShowSettings(false)}>×</PanelCloseBtn>
            </SettingsPanel>
          )}
        </AnimatePresence>
        
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <ErrorAlert
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
              <ErrorCloseBtn onClick={() => setError(null)}>×</ErrorCloseBtn>
            </ErrorAlert>
          )}
        </AnimatePresence>
        
        {/* Content area with 2-column layout for desktop */}
        <ContentArea>
          {/* Left column for gacha pulls */}
          <GachaColumn>
            <SectionHeading>
              <SectionIcon>🎲</SectionIcon>
              <span>Standard Gacha</span>
            </SectionHeading>
            
            <RarityTracker>
              {lastRarities.length > 0 && (
                <>
                  <TrackerLabel>Recent pulls:</TrackerLabel>
                  <RarityBubbles>
                    {lastRarities.map((rarity, index) => (
                      <RarityDot
                        key={index}
                        rarity={rarity}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {rarityIcons[rarity] || rarityIcons.common}
                      </RarityDot>
                    ))}
                  </RarityBubbles>
                </>
              )}
            </RarityTracker>
            
            {/* Character/Results Display */}
            <ResultsDisplay>
              <AnimatePresence mode="wait">
                {showCard && !showMultiResults ? (
                  <CharacterCardContainer
                    key="character"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: skipAnimations ? 0.2 : 0.4 }}
                    rarity={currentChar?.rarity}
                  >
                    <CardImageWrapper onClick={() => openPreview(currentChar)}>
                      <RarityIndicator rarity={currentChar?.rarity} />
                      <CollectionLabel>Added to Collection</CollectionLabel>
                      <CharacterImage
                        src={getImagePath(currentChar?.image)}
                        alt={currentChar?.name}
                        onError={(e) => {
                          if (!e.target.src.includes('placeholder.com')) {
                            e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                          }
                        }}
                      />
                      <ZoomIndicator>🔍</ZoomIndicator>
                    </CardImageWrapper>
                    <CardContent>
                      <CharName>{currentChar?.name}</CharName>
                      <CharSeries>{currentChar?.series}</CharSeries>
                      <RarityBadge rarity={currentChar?.rarity}>
                        {rarityIcons[currentChar?.rarity]} {currentChar?.rarity}
                      </RarityBadge>
                    </CardContent>
                    <CardActions>
                      <ActionButton
                        primary={true}
                        disabled={true}
                      >
                        <><MdCheckCircle /> Added to Collection</>
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
                  </CharacterCardContainer>
                ) : showMultiResults ? (
                  <MultiRollDisplayScroller
                    key="multiResults"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <MultiRollHeader>
                      <h2>{multiRollResults.length}× Pull Results</h2>
                      <MultiRollCloseButton onClick={() => setShowMultiResults(false)}>×</MultiRollCloseButton>
                    </MultiRollHeader>
                    <MultiCardsGrid>
                      {multiRollResults.map((character, index) => (
                        <MultiCardContainer
                          key={index}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: skipAnimations ? 0 : index * 0.05 }}
                          rarity={character.rarity}
                          onClick={() => openPreview(character)}
                        >
                          <MultiCardImage
                            src={getImagePath(character.image)}
                            alt={character.name}
                            onError={(e) => {
                              if (!e.target.src.includes('placeholder.com')) {
                                e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                              }
                            }}
                          />
                          <MultiCharBadge>✓</MultiCharBadge>
                          <MultiCardContent>
                            <MultiCharName>{character.name}</MultiCharName>
                            <MultiRarityBadge rarity={character.rarity}>
                              {rarityIcons[character.rarity]} {character.rarity}
                            </MultiRarityBadge>
                          </MultiCardContent>
                        </MultiCardContainer>
                      ))}
                    </MultiCardsGrid>
                  </MultiRollDisplayScroller>
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <EmptyStateIcon>✨</EmptyStateIcon>
                    <h3>Roll to Discover Characters!</h3>
                    <p>Try your luck and build your collection</p>
                  </EmptyState>
                )}
              </AnimatePresence>
            </ResultsDisplay>
            
            {/* Roll Buttons */}
            <RollControls>
              <RollButton
                onClick={handleRoll}
                disabled={isRolling || (user?.points < 100)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isRolling ? "Summoning..." : (
                  <>💫 Single Pull <RollCost>(100 pts)</RollCost></>
                )}
              </RollButton>
              
              <MultiRollButton
                onClick={isRolling ? null : () => setMultiPullMenuOpen(true)}
                disabled={isRolling || (user?.points < 100)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isRolling ? "Summoning..." : (
                  <>🎯 Multi Pull <RollCost>(100+ pts)</RollCost></>
                )}
              </MultiRollButton>
              
              {/* New Multi Pull Menu as a Modal */}
              <MultiPullMenu 
                isOpen={multiPullMenuOpen}
                onClose={() => setMultiPullMenuOpen(false)}
                multiPullCount={multiPullCount}
                setMultiPullCount={setMultiPullCount}
                maxPossiblePulls={maxPossiblePulls}
                currentMultiPullCost={currentMultiPullCost}
                onConfirm={handleMultiRoll}
                userPoints={user?.points || 0}
              />
            </RollControls>
            
            <RollHint>
              You have enough points for <strong>{Math.floor((user?.points || 0) / 100)}</strong> single pulls
              {maxPossiblePulls > 1 && ` or up to a ${maxPossiblePulls}× multi-pull`}
            </RollHint>
            
            {skipAnimations && (
              <FastModeIndicator>
                <MdFastForward /> Fast Mode Enabled
              </FastModeIndicator>
            )}
          </GachaColumn>
          
          {/* Right column for banners */}
          <BannersColumn>
            <SectionHeading>
              <SectionIcon>🏆</SectionIcon>
              <span>Special Banners</span>
            </SectionHeading>
            
            {banners.length > 0 ? (
              <BannersListWrapper>
                <BannersList>
                  {banners.map(banner => (
                    <BannerCard
                      key={banner.id}
                      featured={banner.featured}
                      onClick={() => navigate(`/banner/${banner.id}`)}
                      whileHover={{ y: -5 }}
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
                      <BannerInfo>
                        <BannerTitle>{banner.name}</BannerTitle>
                        <BannerSeries>{banner.series}</BannerSeries>
                        {banner.endDate && (
                          <BannerEnd>
                            Ends: {new Date(banner.endDate).toLocaleDateString()}
                          </BannerEnd>
                        )}
                        <BannerCost>
                          {Math.floor(100 * (banner.costMultiplier || 1.5))} points per pull
                        </BannerCost>
                        <ViewBannerBtn>
                          Roll on Banner <FaArrowRight size={14} />
                        </ViewBannerBtn>
                      </BannerInfo>
                    </BannerCard>
                  ))}
                </BannersList>
              </BannersListWrapper>
            ) : (
              <EmptyBanners>
                <p>No special banners available right now.</p>
              </EmptyBanners>
            )}
          </BannersColumn>
        </ContentArea>
      </Dashboard>
      
      {/* Character Preview Modal */}
      <ImagePreviewModal
        isOpen={previewOpen}
        onClose={closePreview}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={true}
        isBannerCharacter={previewChar?.isBannerCharacter}
      />
      
      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleHelpModal}
          >
            <HelpModal
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
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
                        <RarityDot rarity={rarity}>{rarityIcons[rarity]}</RarityDot>
                        <span>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>
                      </RarityItem>
                    ))}
                  </RarityGuide>
                </HelpSection>
                <HelpSection>
                  <h3>Tips</h3>
                  <ul>
                    <li>Toggle Fast Mode to skip animations</li>
                    <li>Check special banners for featured characters</li>
                  </ul>
                </HelpSection>
              </HelpModalContent>
            </HelpModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </MainContainer>
  );
};

// ==================== STYLED COMPONENTS ====================
// Main container styles
const MainContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #141e30 0%, #243b55 100%);
  color: white;
  display: flex;
  justify-content: center;
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
    z-index: -1;
    pointer-events: none;
  }
`;
  
const Dashboard = styled.div`
  width: 100%;
  max-width: 1400px;
  padding: 20px;
  @media (max-width: 768px) {
    padding: 15px 10px;
  }
`;
  
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;
  
const Logo = styled.div`
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;
  
const GlowingText = styled.span`
  background: linear-gradient(90deg, #6e48aa, #9e5594);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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
  
const UserStats = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
  @media (max-width: 480px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;
  
const StatsBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;
  
const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 16px;
`;
  
const ControlButtons = styled.div`
  display: flex;
  gap: 8px;
`;
  
const CircleButton = styled.button`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
  &:hover {
    background: rgba(0, 0, 0, 0.5);
    transform: translateY(-2px);
  }
`;
  
const SettingsPanel = styled(motion.div)`
  background: rgba(20, 30, 48, 0.9);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  position: relative;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;
  
const SettingGroup = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
  
const SettingLabel = styled.span`
  font-weight: 500;
`;
  
const ToggleSwitch = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 46px;
  height: 24px;
  background-color: #555;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  &:checked {
    background-color: #6e48aa;
  }
  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: white;
    top: 3px;
    left: 3px;
    transition: transform 0.3s;
  }
  &:checked::before {
    transform: translateX(22px);
  }
`;
  
const PanelCloseBtn = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  &:hover {
    opacity: 0.8;
  }
`;
  
const ErrorAlert = styled(motion.div)`
  background: #d32f2f;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
`;
  
const ErrorCloseBtn = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
`;
  
// Content area with responsive layout
const ContentArea = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;
  
const SectionHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px 0;
  font-size: 22px;
  position: relative;
  padding-bottom: 10px;
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #6e48aa, #9e5594);
    border-radius: 3px;
  }
  @media (max-width: 768px) {
    font-size: 20px;
  }
`;
  
const SectionIcon = styled.span`
  font-size: 24px;
`;
  
// Left column (Gacha rolling area)
const GachaColumn = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 25px;
  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;
  
// Rarity tracker component
const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 25px;
  padding: 10px 20px;
  margin-bottom: 20px;
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 15px;
  }
`;
  
const TrackerLabel = styled.span`
  font-weight: 500;
  white-space: nowrap;
`;
  
const RarityBubbles = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;
  
const RarityDot = styled(motion.div)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => rarityColors[props.rarity] || '#555'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;
  
// Results display area
const ResultsDisplay = styled.div`
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  @media (max-width: 768px) {
    min-height: 300px;
  }
`;
  
// Character card components
const CharacterCardContainer = styled(motion.div)`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  max-width: 350px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2),
    0 0 15px ${props => rarityColors[props.rarity] || 'rgba(0,0,0,0)'};
  border: 2px solid ${props => rarityColors[props.rarity] || '#ddd'};
  @media (max-width: 480px) {
    max-width: 300px;
  }
`;
  
const CardImageWrapper = styled.div`
  position: relative;
  height: 300px;
  cursor: pointer;
  overflow: hidden;
  @media (max-width: 480px) {
    height: 250px;
  }
`;
  
const RarityIndicator = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 80%,
    ${props => rarityColors[props.rarity] || 'transparent'} 0%,
    transparent 60%);
  opacity: 0.7;
  z-index: 1;
  pointer-events: none;
`;
  
const CollectionLabel = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: #43a047;
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  z-index: 2;
  font-weight: 500;
`;
  
const CharacterImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
  &:hover {
    transform: scale(1.05);
  }
`;
  
const ZoomIndicator = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
`;
  
// Multi roll components
const MultiRollDisplayScroller = styled(motion.div)`
  background: white;
  border-radius: 16px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  color: #333;
  max-height: 70vh;
`;
  
const MultiCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  padding: 20px;
  overflow-y: auto;
  max-height: calc(70vh - 60px);
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }
`;
  
const MultiCardContainer = styled(motion.div)`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid ${props => rarityColors[props.rarity] || '#ddd'};
  background: white;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
`;
  
const MultiCardImage = styled.img`
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
`;
  
const MultiCharBadge = styled.div`
  position: absolute;
  top: 5px;
  left: 5px;
  background: #43a047;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;
  
// Roll controls
const RollControls = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  justify-content: center;
  max-width: 600px; // Add a max-width to constrain button size
  margin-left: auto;
  margin-right: auto;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

// Fast mode indicator
const FastModeIndicator = styled.div`
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
  
// Right column (Banners)
const BannersColumn = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 25px;
  display: flex;
  flex-direction: column;
  max-height: 800px; /* Limit the maximum height */
  @media (max-width: 768px) {
    padding: 20px 15px;
    /* Adjust height for mobile to ensure it doesn't take too much space */
    max-height: 600px;
  }
`;
  
const BannersList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  overflow-y: auto;
  padding-right: 10px; /* Add space for scrollbar */
  max-height: 100%;
  padding-bottom: 20px; /* Space for the fade effect */
  scrollbar-width: thin;
  scrollbar-color: rgba(158, 85, 148, 0.5) rgba(0, 0, 0, 0.2);
  /* Custom scrollbar for webkit browsers */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(158, 85, 148, 0.5);
    border-radius: 10px;
    &:hover {
      background: rgba(158, 85, 148, 0.7);
    }
  }
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;
  
const BannersListWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  /* Add fade effect at the bottom to indicate scrollable content */
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.3));
    pointer-events: none;
    border-bottom-left-radius: 16px;
    border-bottom-right-radius: 16px;
  }
`;
  
const BannerCard = styled(motion.div)`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column; /* Always use vertical layout like mobile */
  cursor: pointer;
  border: ${props => props.featured ?
    '2px solid rgba(255, 215, 0, 0.7)' :
    '1px solid rgba(255, 255, 255, 0.1)'
  };
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
  ${props => props.featured && `
    position: relative;
    &::after {
      content: "Featured";
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #ffd700, #ff9500);
      color: white;
      font-size: 12px;
      font-weight: bold;
      padding: 3px 10px;
      border-radius: 20px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      z-index: 1;
    }
  `}
`;
  
const BannerImage = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
  object-position: center;
`;
  
const BannerInfo = styled.div`
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;
  
const BannerTitle = styled.h3`
  margin: 0 0 5px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
`;
  
const BannerSeries = styled.div`
  margin: 0 0 10px 0;
  color: #ffd700;
  font-size: 14px;
  font-weight: 500;
`;
  
const BannerEnd = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
`;
  
const BannerCost = styled.div`
  font-size: 13px;
  margin-bottom: 15px;
`;
  
const ViewBannerBtn = styled.button`
  background: linear-gradient(135deg, rgba(110, 72, 170, 0.5), rgba(158, 85, 148, 0.5));
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 15px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
  align-self: flex-start;
  margin-top: auto;
  &:hover {
    background: linear-gradient(135deg, rgba(110, 72, 170, 0.7), rgba(158, 85, 148, 0.7));
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;
  
const EmptyBanners = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.7);
`;

// Modal components
const HelpModal = styled(motion.div)`
  background: rgba(20, 30, 48, 0.95);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;
  
const HelpModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  h2 {
    margin: 0;
  }
`;
  
const HelpModalContent = styled.div`
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
`;
  
const HelpSection = styled.div`
  margin-bottom: 25px;
  h3 {
    margin: 0 0 10px 0;
    color: #9e5594;
  }
  ul {
    padding-left: 20px;
    li {
      margin-bottom: 8px;
    }
  }
`;
  
const RarityGuide = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
`;
  
const RarityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export default GachaPage;