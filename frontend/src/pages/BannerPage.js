import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import api, { getBannerById, rollOnBanner, multiRollOnBanner, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { MdReplay, MdStars, MdLocalFireDepartment, MdCheckCircle, MdFastForward, MdAdd, MdRemove, MdArrowBack, MdInfo } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaPlay, FaPause, FaChevronRight } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

// Import centralized animations and components
import {
  rarityColors,
  cardVariants,
  cardVariantsFast,
  containerVariants,
  modalVariants,
  overlayVariants,
  gridItemVariants,
  slideVariants
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

const rarityIcons = {
  common: <FaDice />,
  uncommon: <MdStars />,
  rare: <FaGem />,
  epic: <MdLocalFireDepartment />,
  legendary: <FaTrophy />
};

// ==================== HELPERS ====================

const isVideo = (file) => {
  if (!file) return false;
  if (typeof file === 'string') {
    const lowerCasePath = file.toLowerCase();
    return lowerCasePath.endsWith('.mp4') || 
           lowerCasePath.endsWith('.webm') || 
           lowerCasePath.includes('video');
  }
  if (file.type && file.type.startsWith('video/')) {
    return true;
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
  userPoints,
  singlePullCost
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
            className="multi-pull-container"
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
                    disabled={userPoints < (count * singlePullCost * (count >= 10 ? 0.9 : count >= 5 ? 0.95 : 1))}
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

const BannerPage = () => {
  const videoRef = useRef(null);
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  
  // State
  const [banner, setBanner] = useState(null);
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
  const [multiPullCount, setMultiPullCount] = useState(10);
  const [multiPullMenuOpen, setMultiPullMenuOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Computed values
  const calculateSinglePullCost = useCallback(() => {
    if (!banner) return 100;
    return Math.floor(100 * (banner.costMultiplier || 1.5));
  }, [banner]);

  const calculateMultiPullCost = useCallback((count) => {
    if (!banner) return count * 100;
    const baseCost = count * calculateSinglePullCost();
    let discount = 0;
    if (count >= 10) discount = 0.1;
    else if (count >= 5) discount = 0.05;
    return Math.floor(baseCost * (1 - discount));
  }, [banner, calculateSinglePullCost]);

  const maxPossiblePulls = useCallback(() => {
    const singlePullCost = calculateSinglePullCost();
    return Math.max(1, Math.min(20, Math.floor((user?.points || 0) / singlePullCost)));
  }, [user?.points, calculateSinglePullCost]);

  const singlePullCost = calculateSinglePullCost();
  const currentMultiPullCost = calculateMultiPullCost(multiPullCount);
  const currentCardVariants = skipAnimations ? cardVariantsFast : cardVariants;

  // Effects
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        setLoading(true);
        const data = await getBannerById(bannerId);
        setBanner(data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load banner');
        setLoading(false);
      }
    };
    fetchBanner();
  }, [bannerId]);

  useEffect(() => {
    const defaultCount = Math.min(10, maxPossiblePulls());
    if (multiPullCount > maxPossiblePulls() || multiPullCount === 0) {
      setMultiPullCount(Math.max(1, defaultCount));
    }
  }, [user?.points, maxPossiblePulls, multiPullCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (multiPullMenuOpen && !event.target.closest('.multi-pull-container')) {
        setMultiPullMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [multiPullMenuOpen]);
  
  const fetchUserCollection = useCallback(async () => {
    try {
      const response = await api.get('/characters/collection');
      setUserCollection(response.data);
    } catch (err) {
      console.error("Error fetching user collection:", err);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    fetchUserCollection();
  }, [refreshUser, fetchUserCollection]);

  // Callbacks
  const isCharacterInCollection = useCallback((character) => {
    return userCollection.some(char => char.id === character.id);
  }, [userCollection]);

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
          const result = await rollOnBanner(bannerId);
          setCurrentChar(result.character);
          setShowCard(true);
          setLastRarities(prev => [result.character.rarity, ...prev.slice(0, 4)]);
          await refreshUser();
          await fetchUserCollection();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to roll on banner');
        } finally {
          setIsRolling(false);
        }
      }, animationDuration);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll on banner');
      setIsRolling(false);
    }
  };

  const handleMultiRoll = async () => {
    const cost = currentMultiPullCost;
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
          const result = await multiRollOnBanner(bannerId, multiPullCount);
          setMultiRollResults(result.characters);
          setShowMultiResults(true);
          const bestRarity = findBestRarity(result.characters);
          setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
          
          if (result.characters.some(char => ['rare', 'epic', 'legendary'].includes(char.rarity)) && !skipAnimations) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          }
          await refreshUser();
          await fetchUserCollection();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to multi-roll');
        } finally {
          setIsRolling(false);
        }
      }, animationDuration);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to multi-roll');
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

  const getBannerImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/1200x400?text=Banner';
    return getAssetUrl(imageSrc);
  };

  const getVideoPath = (videoSrc) => {
    if (!videoSrc) return null;
    return getAssetUrl(videoSrc);
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

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsVideoPlaying(true))
        .catch((error) => {
          console.error('Error playing video:', error);
          setIsVideoPlaying(false);
          setError('Video playback failed. Please try again.');
        });
    }
  };

  const handleVideoEnded = () => setIsVideoPlaying(false);

  // Loading state
  if (loading) {
    return (
      <LoadingPage>
        <LoadingWrapper>
          <SpinnerOrb>
            <SpinnerRing />
          </SpinnerOrb>
          <LoadingLabel>Loading banner...</LoadingLabel>
        </LoadingWrapper>
      </LoadingPage>
    );
  }

  // Error state
  if (!banner) {
    return (
      <ErrorPage>
        <ErrorMessage>Banner not found or has expired</ErrorMessage>
        <BackBtn onClick={() => navigate('/gacha')}>
          <MdArrowBack /> Back to Gacha
        </BackBtn>
      </ErrorPage>
    );
  }

  return (
    <PageContainer backgroundImage={getBannerImagePath(banner.image)}>
      {/* Navigation */}
      <NavBar>
        <BackBtn onClick={() => navigate('/gacha')}>
          <MdArrowBack /> Back to Gacha
        </BackBtn>
        <NavStats>
          <StatChip>
            <FaDice />
            <span>{rollCount} Pulls</span>
          </StatChip>
          <PointsChip>
            <CoinEmoji>🪙</CoinEmoji>
            <span>{user?.points || 0}</span>
          </PointsChip>
          <IconBtn onClick={() => setShowInfoPanel(true)} aria-label="Banner Info">
            <MdInfo />
          </IconBtn>
        </NavStats>
      </NavBar>
      
      {/* Banner Hero */}
      <BannerHero>
        <HeroContent>
          <BannerTitle>{banner.name}</BannerTitle>
          <BannerSeries>{banner.series}</BannerSeries>
          {banner.description && (
            <BannerDescription>{banner.description}</BannerDescription>
          )}
          <CostRow>
            <CostBadge>{singlePullCost} points per pull</CostBadge>
            <DateBadge>
              {banner.endDate 
                ? `Ends: ${new Date(banner.endDate).toLocaleDateString()}`
                : 'Limited-Time Banner'}
            </DateBadge>
          </CostRow>
        </HeroContent>
        
        {/* Featured Characters */}
        {banner.Characters && banner.Characters.length > 0 && (
          <FeaturedSection>
            <FeaturedLabel>
              <FeaturedIcon>✦</FeaturedIcon>
              <span>Featured Characters</span>
            </FeaturedLabel>
            <CharacterAvatars>
              {banner.Characters.slice(0, 6).map(char => (
                <CharAvatar
                  key={char.id}
                  rarity={char.rarity}
                  owned={isCharacterInCollection(char)}
                  onClick={() => openPreview({...char, isOwned: isCharacterInCollection(char)})}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isVideo(char.image) ? (
                    <AvatarVideo src={getImagePath(char.image)} autoPlay loop muted playsInline />
                  ) : (
                    <img
                      src={getImagePath(char.image)}
                      alt={char.name}
                      onError={(e) => {
                        if (!e.target.src.includes('placeholder.com')) {
                          e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                        }
                      }}
                    />
                  )}
                  {isCharacterInCollection(char) && <OwnedDot>✓</OwnedDot>}
                </CharAvatar>
              ))}
              {banner.Characters.length > 6 && (
                <MoreChars
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowInfoPanel(true)}
                >
                  +{banner.Characters.length - 6}
                </MoreChars>
              )}
            </CharacterAvatars>
          </FeaturedSection>
        )}
      </BannerHero>
      
      {/* Promotional Video */}
      {banner.videoUrl && (
        <VideoSection>
          <VideoContainer>
            <BannerVideo
              ref={videoRef}
              src={getVideoPath(banner.videoUrl)}
              poster={getBannerImagePath(banner.image)}
              onEnded={handleVideoEnded}
              playsInline
            />
            <VideoOverlay onClick={toggleVideoPlay}>
              {isVideoPlaying ? <FaPause /> : <FaPlay />}
            </VideoOverlay>
          </VideoContainer>
          <VideoCaption>Watch Promotional Video</VideoCaption>
        </VideoSection>
      )}
      
      {/* Error Display */}
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
      
      {/* Rarity History */}
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
      
      {/* Character Results */}
      <GachaSection>
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
                whileHover={{ scale: 1.02 }}
              >
                <CardMedia>
                  <RarityGlow rarity={currentChar?.rarity} />
                  <CollectedLabel>Added to Collection</CollectedLabel>
                  {currentChar?.isBannerCharacter && <BannerBadge>Banner Character</BannerBadge>}
                  
                  {isVideo(currentChar?.image) ? (
                    <CardVideo
                      src={getImagePath(currentChar?.image)}
                      autoPlay loop muted playsInline
                      onClick={() => openPreview(currentChar)}
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
                      onClick={() => openPreview(currentChar)}
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
                    disabled={isRolling || (user?.points < singlePullCost)}
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
                  <h2>{multiRollResults.length}× Roll Results • {banner.name}</h2>
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
                      isBanner={character.isBannerCharacter}
                      onClick={() => openPreview({...character, isOwned: isCharacterInCollection(character)})}
                    >
                      <MiniCardMedia>
                        {isVideo(character.image) ? (
                          <MiniCardVideo
                            src={getImagePath(character.image)}
                            autoPlay loop muted playsInline
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
                        {character.isBannerCharacter && <BannerStar>★</BannerStar>}
                      </MiniCardMedia>
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
                <h3>Roll on {banner.name}</h3>
                <p>{banner.series} Special Banner</p>
              </EmptyState>
            )}
          </AnimatePresence>
        </ResultsArea>
        
        {/* Roll Buttons */}
        <RollControls>
          <RollButton
            onClick={handleRoll}
            disabled={isRolling || (user?.points < singlePullCost)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {isRolling ? "Summoning..." : (
              <>💫 Single Pull <RollCost>({singlePullCost} pts)</RollCost></>
            )}
          </RollButton>
          <MultiRollBtn
            onClick={isRolling ? null : () => setMultiPullMenuOpen(true)}
            disabled={isRolling || (user?.points < singlePullCost)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            active={multiPullMenuOpen}
            className="multi-pull-container"
          >
            {isRolling ? "Summoning..." : (
              <>
                🎯 Multi Pull{" "}
                <RollCost>
                  ({multiPullCount}× for {currentMultiPullCost} pts
                  {multiPullCount >= 10 ? " • 10% OFF" : multiPullCount >= 5 ? " • 5% OFF" : ""})
                </RollCost>
              </>
            )}
          </MultiRollBtn>
          
          <MultiPullMenu
            isOpen={multiPullMenuOpen}
            onClose={() => setMultiPullMenuOpen(false)}
            multiPullCount={multiPullCount}
            setMultiPullCount={setMultiPullCount}
            maxPossiblePulls={maxPossiblePulls()}
            currentMultiPullCost={currentMultiPullCost}
            onConfirm={handleMultiRoll}
            userPoints={user?.points || 0}
            singlePullCost={singlePullCost}
          />
        </RollControls>
        
        <RollHint>
          You have enough points for <strong>{Math.floor((user?.points || 0) / singlePullCost)}</strong> single pulls
          {maxPossiblePulls() > 1 && ` or up to a ${maxPossiblePulls()}× multi-pull`}
        </RollHint>
        
        <FastModeTag onClick={() => setSkipAnimations(!skipAnimations)}>
          {skipAnimations ? (
            <><MdFastForward /> Fast Mode On</>
          ) : (
            <><MdFastForward style={{ opacity: 0.5 }} /> Animation Mode</>
          )}
        </FastModeTag>
      </GachaSection>
      
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
        isVideo={previewChar ? isVideo(previewChar.image) : false}
      />
      
      {/* Banner Info Panel */}
      <AnimatePresence>
        {showInfoPanel && (
          <InfoPanel
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <InfoPanelHeader>
              <h2>{banner.name} Details</h2>
              <PanelCloseBtn onClick={() => setShowInfoPanel(false)}>×</PanelCloseBtn>
            </InfoPanelHeader>
            <InfoPanelContent>
              <InfoBlock>
                <h3>About This Banner</h3>
                <p>{banner.description || 'Special banner featuring characters from ' + banner.series}.</p>
                {banner.endDate && (
                  <InfoNote>
                    <strong>Available Until:</strong> {new Date(banner.endDate).toLocaleDateString()}
                  </InfoNote>
                )}
                <InfoNote accent>
                  <strong>Pull Cost:</strong> {singlePullCost} points per pull
                  {banner.costMultiplier > 1 && ` (${banner.costMultiplier}× standard rate)`}
                </InfoNote>
              </InfoBlock>
              
              <InfoBlock>
                <h3>Featured Characters</h3>
                <FeaturedList>
                  {banner.Characters?.map(char => (
                    <FeaturedItem
                      key={char.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => openPreview({...char, isOwned: isCharacterInCollection(char)})}
                    >
                      <FeaturedThumb rarity={char.rarity}>
                        {isVideo(char.image) ? (
                          <FeaturedVideo src={getImagePath(char.image)} autoPlay loop muted playsInline />
                        ) : (
                          <img
                            src={getImagePath(char.image)}
                            alt={char.name}
                            onError={(e) => {
                              if (!e.target.src.includes('placeholder.com')) {
                                e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                              }
                            }}
                          />
                        )}
                      </FeaturedThumb>
                      <FeaturedInfo>
                        <FeaturedName>{char.name}</FeaturedName>
                        <FeaturedRarity rarity={char.rarity}>
                          {rarityIcons[char.rarity]} {char.rarity}
                        </FeaturedRarity>
                        {isCharacterInCollection(char) && (
                          <OwnedLabel>In Collection</OwnedLabel>
                        )}
                      </FeaturedInfo>
                      <FaChevronRight style={{ color: 'rgba(255,255,255,0.5)' }} />
                    </FeaturedItem>
                  ))}
                </FeaturedList>
              </InfoBlock>
              
              <RollFromPanelBtn
                onClick={() => {
                  setShowInfoPanel(false);
                  setTimeout(() => handleRoll(), 300);
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isRolling || (user?.points < singlePullCost)}
              >
                Roll Now
              </RollFromPanelBtn>
            </InfoPanelContent>
          </InfoPanel>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

// ==================== STYLED COMPONENTS ====================

// Page containers
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(20, 30, 48, 0.9) 50%,
    rgba(20, 30, 48, 1) 100%
  );
  position: relative;
  padding: 20px;
  
  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image: url(${props => props.backgroundImage});
    background-size: cover;
    background-position: center top;
    opacity: 0.3;
    z-index: -1;
  }
  
  @media (max-width: 768px) {
    padding: 15px 10px;
  }
`;

const LoadingPage = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #141e30, #243b55);
`;

const ErrorPage = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #141e30, #243b55);
  color: white;
  gap: 20px;
  padding: 20px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  font-weight: 500;
`;

// Navigation
const NavBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  @media (max-width: 480px) {
    margin-bottom: 15px;
  }
`;

const NavStats = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  @media (max-width: 480px) {
    gap: 6px;
  }
`;

const BackBtn = styled.button`
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 8px 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: translateX(-3px);
  }
`;

const StatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PointsChip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #4b6cb7, #182848);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const IconBtn = styled.button`
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
  transition: all 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.5);
  }
`;

// Banner Hero
const BannerHero = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 30px;
  padding: 25px 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const BannerTitle = styled.h1`
  font-size: 36px;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 480px) {
    font-size: 28px;
  }
`;

const BannerSeries = styled.h2`
  font-size: 20px;
  margin: 0 0 15px 0;
  color: #ffd700;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  
  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const BannerDescription = styled.p`
  font-size: 16px;
  max-width: 800px;
  margin: 0 auto 20px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
`;

const CostRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
`;

const CostBadge = styled.div`
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.5);
  color: #ffd700;
  padding: 8px 15px;
  border-radius: 50px;
  font-weight: bold;
`;

const DateBadge = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 15px;
  border-radius: 50px;
`;

// Featured Characters
const FeaturedSection = styled.div`
  margin: 25px auto 0;
  max-width: 800px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const FeaturedLabel = styled.div`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const FeaturedIcon = styled.span`
  color: #ffd700;
  font-size: 18px;
`;

const CharacterAvatars = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const CharAvatar = styled(motion.div)`
  width: 65px;
  height: 65px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  position: relative;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &:hover {
    box-shadow: 0 0 15px ${props => rarityColors[props.rarity]};
  }
  
  ${props => props.owned && `
    &::after {
      content: "";
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
    }
  `}
`;

const AvatarVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const OwnedDot = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  z-index: 2;
`;

const MoreChars = styled(motion.div)`
  width: 65px;
  height: 65px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

// Video Section
const VideoSection = styled.div`
  margin: 0 auto 30px;
  max-width: 800px;
`;

const VideoContainer = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const BannerVideo = styled.video`
  width: 100%;
  display: block;
`;

const VideoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.3s;
  cursor: pointer;
  
  svg {
    font-size: 50px;
    color: white;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
  
  &:hover {
    opacity: 1;
  }
`;

const VideoCaption = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-top: 10px;
`;

// Error Bar
const ErrorBar = styled(motion.div)`
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin: 15px auto;
  max-width: 600px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const CloseErrorBtn = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  margin-left: 10px;
`;

// Rarity Tracker
const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 480px) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
`;

const TrackerLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
`;

const RarityBubbles = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

// Gacha Section
const GachaSection = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ResultsArea = styled.div`
  width: 100%;
  min-height: 450px;
  max-height: calc(70vh - 60px);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  overflow-y: auto;
`;

// Character Card
const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 320px;
  max-width: 90vw;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  border: 3px solid ${props => rarityColors[props.rarity] || rarityColors.common};
`;

const CardMedia = styled.div`
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  cursor: pointer;
`;

const RarityGlow = styled.div`
  position: absolute;
  inset: 0;
  background: ${props => {
    const color = rarityColors[props.rarity] || 'transparent';
    return props.rarity === 'legendary' || props.rarity === 'epic' 
      ? `linear-gradient(45deg, ${color}33, transparent, ${color}33)` 
      : 'none';
  }};
  pointer-events: none;
  z-index: 1;
`;

const CollectedLabel = styled.div`
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
`;

const BannerBadge = styled.div`
  position: absolute;
  right: 10px;
  top: 10px;
  background: linear-gradient(135deg, #ffd700, #ff9500);
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 5px 12px;
  border-radius: 30px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &::before {
    content: "★";
  }
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

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  
  &:disabled {
    opacity: 0.5;
  }
`;

// Multi-roll
const MultiResultsPanel = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  width: 100%;
  max-width: 1000px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
  padding: 20px;
  overflow-y: auto;
  max-height: calc(70vh - 130px);
`;

const MiniCard = styled(motion.div)`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  height: 210px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid ${props => props.isBanner ? '#ffd700' : rarityColors[props.rarity] || '#ddd'};
  background: ${props => props.isBanner ? 'linear-gradient(to bottom, rgba(255, 215, 0, 0.05), white)' : 'white'};
  cursor: pointer;
`;

const MiniCardMedia = styled.div`
  position: relative;
  height: 160px;
  overflow: hidden;
`;

const MiniCardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MiniCardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CollectedDot = styled.div`
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
`;

const BannerStar = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  background: linear-gradient(135deg, #ffd700, #ff9500);
  color: white;
  font-size: 11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
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
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #2c5282, #0f2942)' 
    : 'linear-gradient(135deg, #4b6cb7, #182848)'};
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

const FastModeTag = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin: 15px auto 0;
  font-size: 13px;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

// Info Panel
const InfoPanel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 90%;
  max-width: 450px;
  background: rgba(20, 30, 48, 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 100;
  display: flex;
  flex-direction: column;
`;

const InfoPanelHeader = styled.div`
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

const InfoPanelContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const InfoBlock = styled.div`
  margin-bottom: 30px;
  
  h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #9e5594;
    position: relative;
    padding-bottom: 10px;
    
    &::after {
      content: "";
      position: absolute;
      left: 0;
      bottom: 0;
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, #6e48aa, #9e5594);
    }
  }
  
  p {
    margin: 0 0 15px 0;
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
  }
`;

const InfoNote = styled.div`
  margin-bottom: 10px;
  padding: 10px;
  background: ${props => props.accent ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 0, 0, 0.2)'};
  border-radius: 8px;
  font-size: 14px;
  border: ${props => props.accent ? '1px solid rgba(255, 215, 0, 0.2)' : 'none'};
`;

const FeaturedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FeaturedItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const FeaturedThumb = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid ${props => rarityColors[props.rarity] || rarityColors.common};
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const FeaturedVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FeaturedInfo = styled.div`
  flex: 1;
`;

const FeaturedName = styled.div`
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
`;

const FeaturedRarity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.2);
  color: ${props => rarityColors[props.rarity] || rarityColors.common};
`;

const OwnedLabel = styled.div`
  font-size: 12px;
  color: #2ecc71;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &::before {
    content: "✓";
  }
`;

const RollFromPanelBtn = styled(motion.button)`
  width: 100%;
  background: linear-gradient(135deg, #6e48aa, #9e5594);
  color: white;
  border: none;
  padding: 14px 0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(110, 72, 170, 0.4);
  margin-top: 30px;
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export default BannerPage;
