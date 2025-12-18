import React, { useState, useContext, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdCheckCircle, MdFastForward, MdAdd, MdRemove, MdHelp } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaArrowRight } from 'react-icons/fa';
import api, { rollCharacter, getActiveBanners, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

// Import centralized styles and components
import {
  rarityColors,
  cardVariants,
  cardVariantsFast,
  containerVariants,
  modalVariants,
  overlayVariants,
  gridItemVariants
} from '../components/PullAnimations';

import {
  theme,
  LoadingWrapper,
  SpinnerOrb,
  SpinnerRing,
  LoadingLabel,
  CoinEmoji,
  RarityDot,
  ModalBackdrop,
  PullSettingsPanel,
  PanelHead,
  PanelCloseBtn,
  PanelBody,
  SelectionDisplay,
  SelectionCount,
  SelectionCost,
  DiscountChip,
  PresetGrid,
  PresetChip,
  DiscountLabel,
  SliderBox,
  CountAdjuster,
  AdjustButton,
  CountDisplay,
  PullSliderInput,
  InfoCardRow,
  InfoCard,
  InfoIcon,
  InfoLabel,
  InfoValue,
  ConfirmPullBtn,
  ErrorHint
} from '../components/PullComponents';

// ==================== CONSTANTS ====================

const SINGLE_PULL_COST = 100;

const rarityIcons = {
  common: <FaDice />,
  uncommon: <MdHelp />,
  rare: <FaGem />,
  epic: <MdHelp />,
  legendary: <FaTrophy />
};

// ==================== API HELPERS ====================

const rollMultipleCharacters = async (count = 10) => {
  try {
    const response = await api.post('/characters/roll-multi', { count });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Check if a file is a video
const isVideo = (file) => {
  if (!file) return false;
  if (typeof file === 'string') {
    const lowerCasePath = file.toLowerCase();
    return lowerCasePath.endsWith('.mp4') || 
           lowerCasePath.endsWith('.webm') || 
           lowerCasePath.includes('video');
  }
  return false;
};

// ==================== MULTI PULL MENU COMPONENT ====================

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
  const getRecommendedPulls = () => {
    const recommendations = [1];
    if (maxPossiblePulls >= 5) recommendations.push(5);
    if (maxPossiblePulls >= 10) recommendations.push(10);
    if (maxPossiblePulls > 10 && !recommendations.includes(maxPossiblePulls)) {
      recommendations.push(maxPossiblePulls);
    }
    return recommendations;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalBackdrop
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <PullSettingsPanel
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <PanelHead>
              <h2>Multi Pull Settings</h2>
              <PanelCloseBtn onClick={onClose}>×</PanelCloseBtn>
            </PanelHead>
            <PanelBody>
              <SelectionDisplay>
                <SelectionCount>{multiPullCount}×</SelectionCount>
                <SelectionCost>
                  {currentMultiPullCost} points
                  {multiPullCount >= 10 && <DiscountChip>10% OFF</DiscountChip>}
                  {multiPullCount >= 5 && multiPullCount < 10 && <DiscountChip>5% OFF</DiscountChip>}
                </SelectionCost>
              </SelectionDisplay>
              
              <PresetGrid>
                {getRecommendedPulls().map(count => (
                  <PresetChip
                    key={count}
                    onClick={() => setMultiPullCount(count)}
                    active={multiPullCount === count}
                    disabled={userPoints < (count * 100 * (count >= 10 ? 0.9 : count >= 5 ? 0.95 : 1))}
                  >
                    {count}× Pull
                    {count >= 10 && <DiscountLabel>-10%</DiscountLabel>}
                    {count >= 5 && count < 10 && <DiscountLabel>-5%</DiscountLabel>}
                  </PresetChip>
                ))}
                <PresetChip
                  onClick={() => {}}
                  active={!getRecommendedPulls().includes(multiPullCount)}
                >
                  Custom
                </PresetChip>
              </PresetGrid>
              
              <SliderBox>
                <CountAdjuster>
                  <AdjustButton
                    onClick={() => setMultiPullCount(Math.max(1, multiPullCount - 1))}
                    disabled={multiPullCount <= 1}
                  >
                    <MdRemove />
                  </AdjustButton>
                  <CountDisplay>{multiPullCount}</CountDisplay>
                  <AdjustButton
                    onClick={() => setMultiPullCount(Math.min(maxPossiblePulls, multiPullCount + 1))}
                    disabled={multiPullCount >= maxPossiblePulls}
                  >
                    <MdAdd />
                  </AdjustButton>
                </CountAdjuster>
                <PullSliderInput
                  type="range"
                  min="1"
                  max={maxPossiblePulls || 1}
                  value={multiPullCount}
                  onChange={(e) => setMultiPullCount(parseInt(e.target.value))}
                />
              </SliderBox>
              
              <InfoCardRow>
                <InfoCard>
                  <InfoIcon>💰</InfoIcon>
                  <InfoLabel>Total Cost</InfoLabel>
                  <InfoValue>{currentMultiPullCost} pts</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoIcon>⭐</InfoIcon>
                  <InfoLabel>Pull Count</InfoLabel>
                  <InfoValue>{multiPullCount}×</InfoValue>
                </InfoCard>
                {multiPullCount >= 5 && (
                  <InfoCard accent>
                    <InfoIcon>🎁</InfoIcon>
                    <InfoLabel>Discount</InfoLabel>
                    <InfoValue>{multiPullCount >= 10 ? '10%' : '5%'}</InfoValue>
                  </InfoCard>
                )}
              </InfoCardRow>
              
              <ConfirmPullBtn
                onClick={onConfirm}
                disabled={userPoints < currentMultiPullCost}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <FaDice size={16} /> Pull {multiPullCount}× for {currentMultiPullCost} points
              </ConfirmPullBtn>
              
              {userPoints < currentMultiPullCost && (
                <ErrorHint>
                  <span>Not enough points.</span> You need {currentMultiPullCost - userPoints} more.
                </ErrorHint>
              )}
            </PanelBody>
          </PullSettingsPanel>
        </ModalBackdrop>
      )}
    </AnimatePresence>
  );
};

// ==================== MAIN COMPONENT ====================

const GachaPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  
  // State
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
  const [skipAnimations, setSkipAnimations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [multiPullCount, setMultiPullCount] = useState(10);
  const [multiPullMenuOpen, setMultiPullMenuOpen] = useState(false);
  const [banners, setBanners] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Computed values
  const maxPossiblePulls = Math.min(20, Math.floor((user?.points || 0) / SINGLE_PULL_COST));
  
  const calculateMultiPullCost = (count) => {
    const baseCost = count * SINGLE_PULL_COST;
    let discount = 0;
    if (count >= 10) discount = 0.1;
    else if (count >= 5) discount = 0.05;
    return Math.floor(baseCost * (1 - discount));
  };
  
  const currentMultiPullCost = calculateMultiPullCost(multiPullCount);
  
  // Effects
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  
  useEffect(() => {
    fetchBanners();
  }, []);
  
  useEffect(() => {
    const defaultCount = Math.min(10, maxPossiblePulls);
    setMultiPullCount(Math.max(1, defaultCount));
  }, [user?.points, maxPossiblePulls]);
  
  // Callbacks
  const fetchBanners = async () => {
    try {
      const bannersData = await getActiveBanners();
      setBanners(bannersData);
    } catch (err) {
      console.error("Error fetching banners:", err);
    }
  };
  
  const showRarePullEffect = useCallback((rarity) => {
    if (['legendary', 'epic'].includes(rarity)) {
      confetti({
        particleCount: rarity === 'legendary' ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [rarityColors[rarity], '#ffffff', '#ffd700']
      });
    }
  }, []);
  
  useEffect(() => {
    if (currentChar && !skipAnimations) {
      showRarePullEffect(currentChar.rarity);
    }
  }, [currentChar, skipAnimations, showRarePullEffect]);
  
  // Handlers
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
  
  const findBestRarity = (characters) => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    return characters.reduce((best, char) => {
      const currentIndex = rarityOrder.indexOf(char.rarity);
      return currentIndex > rarityOrder.indexOf(best) ? char.rarity : best;
    }, 'common');
  };
  
  const getImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/300?text=No+Image';
    return getAssetUrl(imageSrc);
  };
  
  const getBannerImageUrl = (imagePath) => {
    if (!imagePath) return 'https://via.placeholder.com/300x150?text=Banner';
    return getAssetUrl(imagePath);
  };
  
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
  
  // Animation variants based on skip mode
  const currentCardVariants = skipAnimations ? cardVariantsFast : cardVariants;
  
  return (
    <PageContainer>
      <Dashboard>
        {/* Header */}
        <Header>
          <Logo>
            <span>Gacha</span>
            <LogoAccent>Master</LogoAccent>
          </Logo>
          <HeaderStats>
            <StatChip>
              <FaDice />
              <span>{rollCount} Rolls</span>
            </StatChip>
            <PointsChip>
              <CoinEmoji>🪙</CoinEmoji>
              <span>{user?.points || 0}</span>
            </PointsChip>
            <ControlButtons>
              <IconBtn onClick={() => setShowHelpModal(true)} title="Help">
                <MdHelp />
              </IconBtn>
              <IconBtn onClick={() => setShowSettings(!showSettings)} title="Settings">
                ⚙️
              </IconBtn>
            </ControlButtons>
          </HeaderStats>
        </Header>
        
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <SettingsBar
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingRow>
                <span>Skip Animations</span>
                <ToggleSwitch
                  type="checkbox"
                  checked={skipAnimations}
                  onChange={() => setSkipAnimations(prev => !prev)}
                />
              </SettingRow>
              <CloseSettingsBtn onClick={() => setShowSettings(false)}>×</CloseSettingsBtn>
            </SettingsBar>
          )}
        </AnimatePresence>
        
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <ErrorBar
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
              <CloseErrorBtn onClick={() => setError(null)}>×</CloseErrorBtn>
            </ErrorBar>
          )}
        </AnimatePresence>
        
        {/* Main Content */}
        <ContentGrid>
          {/* Gacha Section */}
          <GachaSection>
            <SectionTitle>
              <SectionIcon>🎲</SectionIcon>
              <span>Standard Gacha</span>
            </SectionTitle>
            
            {/* Rarity Tracker */}
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
            
            {/* Results Display */}
            <ResultsArea>
              <AnimatePresence mode="wait">
                {showCard && !showMultiResults ? (
                  <CharacterCard
                    key="character"
                    variants={currentCardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    rarity={currentChar?.rarity}
                  >
                    <CardMedia onClick={() => openPreview({...currentChar, isVideo: isVideo(currentChar.image)})}>
                      <RarityGlow rarity={currentChar?.rarity} />
                      <CollectedLabel>Added to Collection</CollectedLabel>
                      
                      {isVideo(currentChar?.image) ? (
                        <CardVideo
                          src={getImagePath(currentChar?.image)}
                          autoPlay
                          loop
                          muted
                          playsInline
                          onError={(e) => {
                            if (!e.target.src.includes('placeholder.com')) {
                              e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                            }
                          }}
                        />
                      ) : (
                        <CardImage
                          src={getImagePath(currentChar?.image)}
                          alt={currentChar?.name}
                          onError={(e) => {
                            if (!e.target.src.includes('placeholder.com')) {
                              e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                            }
                          }}
                        />
                      )}
                      
                      <ZoomHint>🔍</ZoomHint>
                    </CardMedia>
                    
                    <CardDetails>
                      <CharName>{currentChar?.name}</CharName>
                      <CharSeries>{currentChar?.series}</CharSeries>
                      <RarityBadge rarity={currentChar?.rarity}>
                        {rarityIcons[currentChar?.rarity]} {currentChar?.rarity}
                      </RarityBadge>
                    </CardDetails>
                    
                    <CardActions>
                      <ActionBtn primary disabled>
                        <MdCheckCircle /> Added to Collection
                      </ActionBtn>
                      <ActionBtn
                        onClick={handleRoll}
                        disabled={isRolling || (user?.points < SINGLE_PULL_COST)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <MdReplay /> Roll Again
                      </ActionBtn>
                    </CardActions>
                  </CharacterCard>
                  
                ) : showMultiResults ? (
                  <MultiResultsPanel
                    key="multiResults"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <MultiHeader>
                      <h2>{multiRollResults.length}× Pull Results</h2>
                      <CloseMultiBtn onClick={() => setShowMultiResults(false)}>×</CloseMultiBtn>
                    </MultiHeader>
                    <MultiGrid>
                      {multiRollResults.map((character, index) => (
                        <MiniCard
                          key={index}
                          custom={index}
                          variants={gridItemVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                          rarity={character.rarity}
                          onClick={() => openPreview({...character, isVideo: isVideo(character.image)})}
                        >
                          {isVideo(character.image) ? (
                            <MiniCardVideo
                              src={getImagePath(character.image)}
                              autoPlay
                              loop
                              muted
                              playsInline
                              onError={(e) => {
                                if (!e.target.src.includes('placeholder.com')) {
                                  e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                                }
                              }}
                            />
                          ) : (
                            <MiniCardImage
                              src={getImagePath(character.image)}
                              alt={character.name}
                              onError={(e) => {
                                if (!e.target.src.includes('placeholder.com')) {
                                  e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                                }
                              }}
                            />
                          )}
                          
                          <CollectedDot>✓</CollectedDot>
                          <MiniCardInfo>
                            <MiniCharName>{character.name}</MiniCharName>
                            <MiniRarityBadge rarity={character.rarity}>
                              {rarityIcons[character.rarity]} {character.rarity}
                            </MiniRarityBadge>
                          </MiniCardInfo>
                        </MiniCard>
                      ))}
                    </MultiGrid>
                  </MultiResultsPanel>
                  
                ) : isRolling ? (
                  <LoadingWrapper
                    key="loading"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <SpinnerOrb>
                      <SpinnerRing />
                    </SpinnerOrb>
                    <LoadingLabel>Summoning character{multiRollResults.length > 0 ? 's' : ''}...</LoadingLabel>
                  </LoadingWrapper>
                  
                ) : (
                  <EmptyState
                    key="empty"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <EmptyIcon>✨</EmptyIcon>
                    <h3>Roll to Discover Characters!</h3>
                    <p>Try your luck and build your collection</p>
                  </EmptyState>
                )}
              </AnimatePresence>
            </ResultsArea>
            
            {/* Roll Buttons */}
            <RollControls>
              <RollButton
                onClick={handleRoll}
                disabled={isRolling || (user?.points < SINGLE_PULL_COST)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isRolling ? "Summoning..." : (
                  <>💫 Single Pull <RollCost>(100 pts)</RollCost></>
                )}
              </RollButton>
              <MultiRollBtn
                onClick={isRolling ? null : () => setMultiPullMenuOpen(true)}
                disabled={isRolling || (user?.points < SINGLE_PULL_COST)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isRolling ? "Summoning..." : (
                  <>🎯 Multi Pull <RollCost>(100+ pts)</RollCost></>
                )}
              </MultiRollBtn>
              
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
              You have enough points for <strong>{Math.floor((user?.points || 0) / SINGLE_PULL_COST)}</strong> single pulls
              {maxPossiblePulls > 1 && ` or up to a ${maxPossiblePulls}× multi-pull`}
            </RollHint>
            
            {skipAnimations && (
              <FastModeTag>
                <MdFastForward /> Fast Mode Enabled
              </FastModeTag>
            )}
          </GachaSection>
          
          {/* Banners Section */}
          <BannersSection>
            <SectionTitle>
              <SectionIcon>🏆</SectionIcon>
              <span>Special Banners</span>
            </SectionTitle>
            
            {banners.length > 0 ? (
              <BannersScroller>
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
              </BannersScroller>
            ) : (
              <EmptyBanners>
                <p>No special banners available right now.</p>
              </EmptyBanners>
            )}
          </BannersSection>
        </ContentGrid>
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
        isVideo={previewChar?.isVideo || isVideo(previewChar?.image)}
      />
      
      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <ModalBackdrop
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowHelpModal(false)}
          >
            <HelpModal
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <HelpHeader>
                <h2>How to Play</h2>
                <PanelCloseBtn onClick={() => setShowHelpModal(false)}>×</PanelCloseBtn>
              </HelpHeader>
              <HelpContent>
                <HelpBlock>
                  <h3>Getting Started</h3>
                  <p>Use your points to pull characters and build your collection!</p>
                  <ul>
                    <li>Single Pull costs 100 points</li>
                    <li>Multi Pulls offer discounts (5% for 5+ pulls, 10% for 10+ pulls)</li>
                    <li>Special banners have unique characters with different rates</li>
                  </ul>
                </HelpBlock>
                <HelpBlock>
                  <h3>Rarities</h3>
                  <RarityGuide>
                    {Object.entries(rarityColors).map(([rarity, color]) => (
                      <RarityItem key={rarity}>
                        <RarityDot rarity={rarity}>{rarityIcons[rarity]}</RarityDot>
                        <span>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>
                      </RarityItem>
                    ))}
                  </RarityGuide>
                </HelpBlock>
                <HelpBlock>
                  <h3>Tips</h3>
                  <ul>
                    <li>Toggle Fast Mode to skip animations</li>
                    <li>Check special banners for featured characters</li>
                  </ul>
                </HelpBlock>
              </HelpContent>
            </HelpModal>
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

// ==================== STYLED COMPONENTS ====================

// Layout
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #141e30 0%, #243b55 100%);
  color: white;
  display: flex;
  justify-content: center;
  
  &::after {
    content: "";
    position: fixed;
    inset: 0;
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

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

// Header
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

const LogoAccent = styled.span`
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

const HeaderStats = styled.div`
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

const StatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PointsChip = styled.div`
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

const IconBtn = styled.button`
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

// Settings
const SettingsBar = styled(motion.div)`
  background: rgba(20, 30, 48, 0.9);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  position: relative;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ToggleSwitch = styled.input`
  appearance: none;
  width: 46px;
  height: 24px;
  background: #555;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  
  &:checked {
    background: #6e48aa;
  }
  
  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    top: 3px;
    left: 3px;
    transition: transform 0.3s;
  }
  
  &:checked::before {
    transform: translateX(22px);
  }
`;

const CloseSettingsBtn = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
`;

// Error
const ErrorBar = styled(motion.div)`
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

const CloseErrorBtn = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
`;

// Section
const SectionTitle = styled.h2`
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

// Gacha Section
const GachaSection = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 25px;
  
  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

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

const ResultsArea = styled.div`
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    min-height: 300px;
  }
`;

// Character Card
const CharacterCard = styled(motion.div)`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  max-width: 350px;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.2),
    0 0 15px ${props => rarityColors[props.rarity] || 'transparent'};
  border: 2px solid ${props => rarityColors[props.rarity] || '#ddd'};
  
  @media (max-width: 480px) {
    max-width: 300px;
  }
`;

const CardMedia = styled.div`
  position: relative;
  height: 300px;
  cursor: pointer;
  overflow: hidden;
  
  @media (max-width: 480px) {
    height: 250px;
  }
`;

const RarityGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 80%,
    ${props => rarityColors[props.rarity] || 'transparent'} 0%,
    transparent 60%
  );
  opacity: 0.7;
  z-index: 1;
  pointer-events: none;
`;

const CollectedLabel = styled.div`
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

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const ZoomHint = styled.div`
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

const CardDetails = styled.div`
  padding: 15px;
  position: relative;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.8));
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
  
  ${props => ['legendary', 'epic'].includes(props.rarity) && `
    animation: shiny 2s infinite;
    
    @keyframes shiny {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }
  `}
`;

const CardActions = styled.div`
  display: flex;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`;

const ActionBtn = styled(motion.button)`
  flex: 1;
  background: ${props => props.primary ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent'};
  color: ${props => props.primary ? 'white' : '#555'};
  border: none;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: ${props => props.primary ? 'bold' : 'normal'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  
  &:first-child {
    border-right: 1px solid #eee;
  }
  
  &:hover:not(:disabled) {
    background: ${props => props.primary ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f5f5f5'};
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

// Multi-roll
const MultiResultsPanel = styled(motion.div)`
  background: white;
  border-radius: 16px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  color: #333;
  max-height: 70vh;
`;

const MultiHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4b6cb7, #182848);
  padding: 15px 20px;
  color: white;
  
  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }
`;

const CloseMultiBtn = styled.button`
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

const MultiGrid = styled.div`
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

const MiniCard = styled(motion.div)`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid ${props => rarityColors[props.rarity] || '#ddd'};
  background: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
`;

const MiniCardImage = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`;

const MiniCardVideo = styled.video`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`;

const CollectedDot = styled.div`
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

const MiniCardInfo = styled.div`
  padding: 10px;
  position: relative;
`;

const MiniCharName = styled.h3`
  margin: 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MiniRarityBadge = styled.div`
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
`;

// Empty State
const EmptyState = styled(motion.div)`
  text-align: center;
  color: white;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 350px;
  
  h3 {
    font-size: 24px;
    margin: 0 0 15px 0;
    background: linear-gradient(135deg, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
  }
`;

const EmptyIcon = styled.div`
  font-size: 36px;
  margin-bottom: 15px;
  animation: float 3s ease-in-out infinite;
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;

// Roll Controls
const RollControls = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  justify-content: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
`;

const RollButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa, #9e5594);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(110, 72, 170, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
    box-shadow: none;
    
    &::before { display: none; }
  }
  
  @media (max-width: 768px) {
    width: 80%;
    max-width: 280px;
    padding: 10px 20px;
    font-size: 14px;
  }
`;

const MultiRollBtn = styled(RollButton)`
  background: linear-gradient(135deg, #4b6cb7, #182848);
`;

const RollCost = styled.span`
  font-size: 14px;
  opacity: 0.8;
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const RollHint = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 15px;
  text-align: center;
  
  strong {
    color: white;
  }
`;

const FastModeTag = styled.div`
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

// Banners Section
const BannersSection = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 25px;
  display: flex;
  flex-direction: column;
  max-height: 800px;
  
  @media (max-width: 768px) {
    padding: 20px 15px;
    max-height: 600px;
  }
`;

const BannersScroller = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  
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

const BannersList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  overflow-y: auto;
  padding-right: 10px;
  max-height: 100%;
  padding-bottom: 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(158, 85, 148, 0.5) rgba(0, 0, 0, 0.2);
  
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

const BannerCard = styled(motion.div)`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  border: ${props => props.featured 
    ? '2px solid rgba(255, 215, 0, 0.7)' 
    : '1px solid rgba(255, 255, 255, 0.1)'};
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
`;

const BannerInfo = styled.div`
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
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
  }
`;

const EmptyBanners = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.7);
`;

// Help Modal
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

const HelpHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h2 { margin: 0; }
`;

const HelpContent = styled.div`
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
`;

const HelpBlock = styled.div`
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
