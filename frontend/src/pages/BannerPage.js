import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowBack, MdClose, MdFastForward, MdInfo, MdRefresh } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaPlay, FaPause, FaChevronRight, FaStar } from 'react-icons/fa';
import confetti from 'canvas-confetti';

// API & Context
import api, { getBannerById, rollOnBanner, multiRollOnBanner, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Design System
import {
  theme,
  PageWrapper,
  Container,
  GlassCard,
  Section,
  Heading2,
  Text,
  IconButton,
  Chip,
  RarityBadge,
  Spinner,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Alert,
  Flex,
  motionVariants,
  getRarityColor,
  getRarityGlow,
  scrollbarStyles
} from '../styles/DesignSystem';

import { MultiPullMenu } from '../components/Gacha/MultiPullMenu';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

// ==================== CONSTANTS ====================

const rarityIcons = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />
};

// ==================== HELPERS ====================

const isVideo = (file) => {
  if (!file) return false;
  if (typeof file === 'string') {
    const lower = file.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.includes('video');
  }
  return file?.type?.startsWith('video/');
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
  const getSinglePullCost = useCallback(() => {
    if (!banner) return 100;
    return Math.floor(100 * (banner.costMultiplier || 1.5));
  }, [banner]);

  const getMultiPullCost = useCallback((count) => {
    if (!banner) return count * 100;
    const base = count * getSinglePullCost();
    let discount = 0;
    if (count >= 10) discount = 0.1;
    else if (count >= 5) discount = 0.05;
    return Math.floor(base * (1 - discount));
  }, [banner, getSinglePullCost]);

  const maxPossiblePulls = useCallback(() => {
    return Math.max(1, Math.min(20, Math.floor((user?.points || 0) / getSinglePullCost())));
  }, [user?.points, getSinglePullCost]);

  const singlePullCost = getSinglePullCost();
  const currentMultiPullCost = getMultiPullCost(multiPullCount);

  // Effects
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        setLoading(true);
        const data = await getBannerById(bannerId);
        setBanner(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load banner');
      } finally {
        setLoading(false);
      }
    };
    fetchBanner();
  }, [bannerId]);

  useEffect(() => {
    const max = maxPossiblePulls();
    const defaultCount = Math.min(10, max);
    if (multiPullCount > max || multiPullCount === 0) {
      setMultiPullCount(Math.max(1, defaultCount));
    }
  }, [user?.points, maxPossiblePulls, multiPullCount]);
  
  const fetchUserCollection = useCallback(async () => {
    try {
      const response = await api.get('/characters/collection');
      setUserCollection(response.data);
    } catch (err) {
      console.error("Error fetching collection:", err);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    fetchUserCollection();
  }, [refreshUser, fetchUserCollection]);

  // Callbacks
  const isInCollection = useCallback((char) => {
    return userCollection.some(c => c.id === char.id);
  }, [userCollection]);

  const showRarePullEffect = useCallback((rarity) => {
    if (['legendary', 'epic'].includes(rarity)) {
      confetti({
        particleCount: rarity === 'legendary' ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [getRarityColor(rarity), '#ffffff', '#ffd700']
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
      
      const delay = skipAnimations ? 0 : 1200;
      
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
      }, delay);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll on banner');
      setIsRolling(false);
    }
  };

  const handleMultiRoll = async () => {
    if (user?.points < currentMultiPullCost) {
      setError(`Not enough points for ${multiPullCount}× roll. Required: ${currentMultiPullCost} points`);
      return;
    }
    
    try {
      setIsRolling(true);
      setShowCard(false);
      setShowMultiResults(false);
      setError(null);
      setMultiPullMenuOpen(false);
      setRollCount(prev => prev + multiPullCount);
      
      const delay = skipAnimations ? 0 : 1200;
      
      setTimeout(async () => {
        try {
          const result = await multiRollOnBanner(bannerId, multiPullCount);
          setMultiRollResults(result.characters);
          setShowMultiResults(true);
          
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
          const bestRarity = result.characters.reduce((best, char) => {
            const idx = rarityOrder.indexOf(char.rarity);
            return idx > rarityOrder.indexOf(best) ? char.rarity : best;
          }, 'common');
          
          setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
          
          if (result.characters.some(c => ['rare', 'epic', 'legendary'].includes(c.rarity)) && !skipAnimations) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          }
          await refreshUser();
          await fetchUserCollection();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to multi-roll');
        } finally {
          setIsRolling(false);
        }
      }, delay);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to multi-roll');
      setIsRolling(false);
    }
  };

  const getImagePath = (src) => src ? getAssetUrl(src) : 'https://via.placeholder.com/300?text=No+Image';
  const getBannerImage = (src) => src ? getAssetUrl(src) : 'https://via.placeholder.com/1200x400?text=Banner';
  const getVideoPath = (src) => src ? getAssetUrl(src) : null;

  const openPreview = (char) => {
    if (char) {
      setPreviewChar(char);
      setPreviewOpen(true);
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsVideoPlaying(true))
        .catch(() => setIsVideoPlaying(false));
    }
  };

  // Loading state
  if (loading) {
    return (
      <LoadingPage>
        <Spinner size="56px" />
        <LoadingText>Loading banner...</LoadingText>
      </LoadingPage>
    );
  }

  // Error state
  if (!banner) {
    return (
      <ErrorPage>
        <ErrorBox>Banner not found or has expired</ErrorBox>
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack /> Back to Gacha
        </BackButton>
      </ErrorPage>
    );
  }

  return (
    <StyledPageWrapper>
      {/* Hero Background */}
      <HeroBackground style={{ backgroundImage: `url(${getBannerImage(banner.image)})` }} />
      
      <Container>
        {/* Navigation Bar */}
        <NavBar>
          <BackButton onClick={() => navigate('/gacha')}>
            <MdArrowBack />
            <span>Back</span>
          </BackButton>
          <NavStats>
            <StatPill>
              <span>🎲</span>
              <span>{rollCount} pulls</span>
            </StatPill>
            <PointsPill>
              <span>🪙</span>
              <span>{user?.points || 0}</span>
            </PointsPill>
            <IconButton onClick={() => setShowInfoPanel(true)}>
              <MdInfo />
            </IconButton>
          </NavStats>
        </NavBar>
        
        {/* Banner Hero Section */}
        <HeroSection>
          <HeroContent>
            <BannerTitle>{banner.name}</BannerTitle>
            <BannerSeries>{banner.series}</BannerSeries>
            {banner.description && <BannerDescription>{banner.description}</BannerDescription>}
            <BadgeRow>
              <CostBadge>{singlePullCost} pts/pull</CostBadge>
              <DateBadge>
                {banner.endDate 
                  ? `Ends: ${new Date(banner.endDate).toLocaleDateString()}`
                  : 'Limited-Time'}
              </DateBadge>
            </BadgeRow>
          </HeroContent>
          
          {/* Featured Characters Preview */}
          {banner.Characters?.length > 0 && (
            <FeaturedSection>
              <FeaturedLabel>Featured Characters</FeaturedLabel>
              <CharacterAvatars>
                {banner.Characters.slice(0, 6).map(char => (
                  <Avatar
                    key={char.id}
                    rarity={char.rarity}
                    owned={isInCollection(char)}
                    onClick={() => openPreview({...char, isOwned: isInCollection(char)})}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isVideo(char.image) ? (
                      <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                    ) : (
                      <img src={getImagePath(char.image)} alt={char.name} />
                    )}
                    {isInCollection(char) && <OwnedMark>✓</OwnedMark>}
                  </Avatar>
                ))}
                {banner.Characters.length > 6 && (
                  <MoreAvatar onClick={() => setShowInfoPanel(true)}>
                    +{banner.Characters.length - 6}
                  </MoreAvatar>
                )}
              </CharacterAvatars>
            </FeaturedSection>
          )}
        </HeroSection>
        
        {/* Promotional Video */}
        {banner.videoUrl && (
          <VideoSection>
            <VideoContainer>
              <BannerVideo
                ref={videoRef}
                src={getVideoPath(banner.videoUrl)}
                poster={getBannerImage(banner.image)}
                onEnded={() => setIsVideoPlaying(false)}
                playsInline
              />
              <VideoOverlay onClick={toggleVideo}>
                {isVideoPlaying ? <FaPause /> : <FaPlay />}
              </VideoOverlay>
            </VideoContainer>
            <VideoCaption>Watch Promotional Video</VideoCaption>
          </VideoSection>
        )}
        
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <Alert
              variant="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginBottom: '24px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}
            >
              <span>{error}</span>
              <CloseAlertBtn onClick={() => setError(null)}>
                <MdClose />
              </CloseAlertBtn>
            </Alert>
          )}
        </AnimatePresence>
        
        {/* Rarity History */}
        {lastRarities.length > 0 && (
          <RarityTracker>
            <RarityLabel>Recent:</RarityLabel>
            <RarityHistory>
              {lastRarities.map((rarity, i) => (
                <RarityDot key={i} rarity={rarity}>{rarityIcons[rarity]}</RarityDot>
              ))}
            </RarityHistory>
          </RarityTracker>
        )}
        
        {/* Gacha Section */}
        <GachaContainer>
          <ResultsArea>
            <AnimatePresence mode="wait">
              {showCard && !showMultiResults ? (
                <CharacterCard
                  key="char"
                  variants={motionVariants.card}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  rarity={currentChar?.rarity}
                >
                  <CardImageWrapper onClick={() => openPreview(currentChar)}>
                    <RarityGlowEffect rarity={currentChar?.rarity} />
                    {isVideo(currentChar?.image) ? (
                      <CardVideo src={getImagePath(currentChar?.image)} autoPlay loop muted playsInline />
                    ) : (
                      <CardImage src={getImagePath(currentChar?.image)} alt={currentChar?.name} />
                    )}
                    <CardOverlay>
                      <span>🔍 View</span>
                    </CardOverlay>
                    <CollectedBadge>✓ Collected</CollectedBadge>
                    {currentChar?.isBannerCharacter && <BannerCharBadge>★ Banner</BannerCharBadge>}
                  </CardImageWrapper>
                  <CardContent>
                    <CardMeta>
                      <CharName>{currentChar?.name}</CharName>
                      <CharSeries>{currentChar?.series}</CharSeries>
                    </CardMeta>
                    <RarityBadge rarity={currentChar?.rarity}>
                      {rarityIcons[currentChar?.rarity]} {currentChar?.rarity}
                    </RarityBadge>
                  </CardContent>
                  <CardActions>
                    <RollAgainBtn 
                      onClick={handleRoll} 
                      disabled={isRolling || user?.points < singlePullCost}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MdRefresh /> Roll Again
                    </RollAgainBtn>
                  </CardActions>
                </CharacterCard>
                
              ) : showMultiResults ? (
                <MultiResultsContainer
                  key="multi"
                  variants={motionVariants.scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <MultiResultsHeader>
                    <h2>{multiRollResults.length}× Pull • {banner.name}</h2>
                    <IconButton onClick={() => setShowMultiResults(false)}>
                      <MdClose />
                    </IconButton>
                  </MultiResultsHeader>
                  <MultiResultsGrid>
                    {multiRollResults.map((char, i) => (
                      <MiniCard
                        key={i}
                        variants={motionVariants.staggerItem}
                        custom={i}
                        whileHover={{ y: -4, scale: 1.02 }}
                        rarity={char.rarity}
                        isBanner={char.isBannerCharacter}
                        onClick={() => openPreview({...char, isOwned: isInCollection(char)})}
                      >
                        <MiniCardImage>
                          {isVideo(char.image) ? (
                            <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                          ) : (
                            <img src={getImagePath(char.image)} alt={char.name} />
                          )}
                          <MiniCollected>✓</MiniCollected>
                          {char.isBannerCharacter && <MiniBannerMark>★</MiniBannerMark>}
                        </MiniCardImage>
                        <MiniCardInfo>
                          <MiniName>{char.name}</MiniName>
                          <MiniRarityDot rarity={char.rarity}>{rarityIcons[char.rarity]}</MiniRarityDot>
                        </MiniCardInfo>
                      </MiniCard>
                    ))}
                  </MultiResultsGrid>
                </MultiResultsContainer>
                
              ) : isRolling ? (
                <LoadingState 
                  key="loading"
                  variants={motionVariants.fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Spinner size="56px" />
                  <LoadingStateText>Summoning...</LoadingStateText>
                </LoadingState>
                
              ) : (
                <EmptyState 
                  key="empty"
                  variants={motionVariants.slideUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <EmptyIcon>✨</EmptyIcon>
                  <EmptyTitle>Roll on {banner.name}</EmptyTitle>
                  <EmptyText>{banner.series} Special Banner</EmptyText>
                </EmptyState>
              )}
            </AnimatePresence>
          </ResultsArea>
          
          {/* Roll Controls */}
          <ControlsSection>
            <ButtonRow>
              <PrimaryRollButton 
                onClick={handleRoll} 
                disabled={isRolling || user?.points < singlePullCost}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRolling ? "Summoning..." : (
                  <>
                    <span>💫</span>
                    <span>Single Pull</span>
                    <CostLabel>{singlePullCost} pts</CostLabel>
                  </>
                )}
              </PrimaryRollButton>
              <SecondaryRollButton 
                onClick={() => setMultiPullMenuOpen(true)} 
                disabled={isRolling || user?.points < singlePullCost}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRolling ? "Summoning..." : (
                  <>
                    <span>🎯</span>
                    <span>Multi Pull</span>
                    <CostLabel>{multiPullCount}×</CostLabel>
                  </>
                )}
              </SecondaryRollButton>
            </ButtonRow>
            
            <ControlsFooter>
              <PullHint>
                Up to <strong>{Math.floor((user?.points || 0) / singlePullCost)}</strong> pulls available
              </PullHint>
              <FastModeToggle 
                active={skipAnimations}
                onClick={() => setSkipAnimations(!skipAnimations)}
              >
                <MdFastForward />
                {skipAnimations ? 'Fast Mode' : 'Normal'}
              </FastModeToggle>
            </ControlsFooter>
          </ControlsSection>
          
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
        </GachaContainer>
      </Container>
      
      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewChar(null); }}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={previewChar ? isInCollection(previewChar) : false}
        isBannerCharacter={previewChar?.isBannerCharacter}
        isVideo={previewChar ? isVideo(previewChar.image) : false}
      />
      
      {/* Info Panel */}
      <AnimatePresence>
        {showInfoPanel && (
          <ModalOverlay 
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowInfoPanel(false)}
          >
            <InfoPanel
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <InfoPanelHeader>
                <Heading2>{banner.name}</Heading2>
                <IconButton onClick={() => setShowInfoPanel(false)}>
                  <MdClose />
                </IconButton>
              </InfoPanelHeader>
              <InfoPanelContent>
                <InfoBlock>
                  <InfoBlockTitle>About This Banner</InfoBlockTitle>
                  <Text secondary>{banner.description || `Special banner featuring characters from ${banner.series}.`}</Text>
                  {banner.endDate && (
                    <InfoNote>Available until: {new Date(banner.endDate).toLocaleDateString()}</InfoNote>
                  )}
                  <InfoNoteAccent>Pull cost: {singlePullCost} points</InfoNoteAccent>
                </InfoBlock>
                
                <InfoBlock>
                  <InfoBlockTitle>Featured Characters</InfoBlockTitle>
                  <FeaturedList>
                    {banner.Characters?.map(char => (
                      <FeaturedItem 
                        key={char.id} 
                        onClick={() => openPreview({...char, isOwned: isInCollection(char)})}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                      >
                        <FeaturedThumb rarity={char.rarity}>
                          {isVideo(char.image) ? (
                            <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                          ) : (
                            <img src={getImagePath(char.image)} alt={char.name} />
                          )}
                        </FeaturedThumb>
                        <FeaturedInfo>
                          <FeaturedName>{char.name}</FeaturedName>
                          <FeaturedRarity rarity={char.rarity}>
                            {rarityIcons[char.rarity]} {char.rarity}
                          </FeaturedRarity>
                          {isInCollection(char) && <OwnedLabel>✓ Owned</OwnedLabel>}
                        </FeaturedInfo>
                        <FaChevronRight style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      </FeaturedItem>
                    ))}
                  </FeaturedList>
                </InfoBlock>
                
                <RollFromPanelBtn
                  onClick={() => { setShowInfoPanel(false); setTimeout(handleRoll, 300); }}
                  disabled={isRolling || user?.points < singlePullCost}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Roll Now
                </RollFromPanelBtn>
              </InfoPanelContent>
            </InfoPanel>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </StyledPageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
`;

// Hero Background
const HeroBackground = styled.div`
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center top;
  opacity: 0.15;
  z-index: 0;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, ${theme.colors.background} 100%);
  }
`;

// Loading & Error Pages
const LoadingPage = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background};
  gap: ${theme.spacing.lg};
`;

const LoadingText = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
`;

const ErrorPage = styled(LoadingPage)``;

const ErrorBox = styled.div`
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: ${theme.colors.error};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-radius: ${theme.radius.lg};
  font-weight: ${theme.fontWeights.medium};
  margin-bottom: ${theme.spacing.lg};
`;

// Navigation
const NavBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg} 0;
  position: relative;
  z-index: 10;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.glass};
  backdrop-filter: blur(${theme.blur.md});
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
    transform: translateX(-2px);
  }
`;

const NavStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const StatPill = styled(Chip)`
  font-size: ${theme.fontSizes.sm};
`;

const PointsPill = styled(StatPill)`
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  border-color: transparent;
  color: white;
  font-weight: ${theme.fontWeights.semibold};
`;

// Hero Section
const HeroSection = styled(Section)`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const BannerTitle = styled.h1`
  font-size: ${theme.fontSizes.hero};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.03em;
  margin: 0 0 ${theme.spacing.sm};
  
  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['3xl']};
  }
`;

const BannerSeries = styled.h2`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.warning};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 ${theme.spacing.md};
`;

const BannerDescription = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  line-height: ${theme.lineHeights.relaxed};
  margin: 0 0 ${theme.spacing.lg};
`;

const BadgeRow = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const CostBadge = styled.div`
  background: rgba(255, 159, 10, 0.15);
  border: 1px solid rgba(255, 159, 10, 0.3);
  color: ${theme.colors.warning};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
`;

const DateBadge = styled.div`
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.textSecondary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
`;

// Featured Characters
const FeaturedSection = styled.div`
  margin-top: ${theme.spacing.xl};
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const FeaturedLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: ${theme.spacing.md};
`;

const CharacterAvatars = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const Avatar = styled(motion.div)`
  width: 56px;
  height: 56px;
  border-radius: ${theme.radius.full};
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => getRarityColor(props.rarity)};
  position: relative;
  box-shadow: ${props => getRarityGlow(props.rarity)};
  
  img, video { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
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

const OwnedMark = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${theme.fontWeights.bold};
  font-size: 12px;
  z-index: 2;
`;

const MoreAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${theme.radius.full};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

// Video Section
const VideoSection = styled.div`
  max-width: 800px;
  margin: 0 auto ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

const VideoContainer = styled.div`
  position: relative;
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorder};
`;

const BannerVideo = styled.video`
  width: 100%;
  display: block;
`;

const VideoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  svg { 
    font-size: 48px; 
    color: white;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
  }
  
  &:hover { 
    background: rgba(0, 0, 0, 0.5); 
  }
`;

const VideoCaption = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  text-align: center;
  margin-top: ${theme.spacing.sm};
`;

// Error Alert
const CloseAlertBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 18px;
`;

// Rarity Tracker
const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  background: ${theme.colors.glass};
  backdrop-filter: blur(${theme.blur.md});
  border: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.radius.full};
  margin-bottom: ${theme.spacing.lg};
  width: fit-content;
  position: relative;
  z-index: 1;
`;

const RarityLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
`;

const RarityHistory = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const RarityDot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.full};
  background: ${props => getRarityColor(props.rarity)};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  box-shadow: ${props => getRarityGlow(props.rarity)};
`;

// Gacha Container
const GachaContainer = styled(Section)`
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const ResultsArea = styled.div`
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.xl};
`;

// Character Card
const CharacterCard = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  width: 100%;
  max-width: 340px;
  border: 2px solid ${props => getRarityColor(props.rarity)};
  box-shadow: ${props => getRarityGlow(props.rarity)}, ${theme.shadows.lg};
`;

const CardImageWrapper = styled.div`
  position: relative;
  height: 320px;
  cursor: pointer;
  overflow: hidden;
`;

const RarityGlowEffect = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 100%, ${props => getRarityColor(props.rarity)}40 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.transitions.slow};
  
  ${CardImageWrapper}:hover & {
    transform: scale(1.05);
  }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CardOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity ${theme.transitions.fast};
  z-index: 2;
  
  span {
    background: ${theme.colors.glass};
    backdrop-filter: blur(${theme.blur.sm});
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.radius.full};
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
  }
  
  ${CardImageWrapper}:hover & {
    opacity: 1;
  }
`;

const CollectedBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  background: ${theme.colors.success};
  color: white;
  padding: 6px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  z-index: 3;
`;

const BannerCharBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  padding: 6px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  z-index: 3;
`;

const CardContent = styled.div`
  padding: ${theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${theme.spacing.md};
`;

const CardMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const CharName = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 4px;
  color: ${theme.colors.text};
`;

const CharSeries = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const CardActions = styled.div`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
`;

const RollAgainBtn = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Multi Results
const MultiResultsContainer = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  width: 100%;
  max-width: 1000px;
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.lg};
`;

const MultiResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  
  h2 {
    margin: 0;
    font-size: ${theme.fontSizes.lg};
    font-weight: ${theme.fontWeights.semibold};
  }
`;

const MultiResultsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  max-height: 60vh;
  overflow-y: auto;
  ${scrollbarStyles}
`;

const MiniCard = styled(motion.div)`
  background: ${props => props.isBanner 
    ? `linear-gradient(to bottom, rgba(255, 159, 10, 0.1), ${theme.colors.backgroundTertiary})`
    : theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => props.isBanner ? theme.colors.warning : getRarityColor(props.rarity)};
  cursor: pointer;
`;

const MiniCardImage = styled.div`
  position: relative;
  height: 140px;
  overflow: hidden;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const MiniCollected = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: ${theme.colors.success};
  color: white;
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: ${theme.fontWeights.bold};
`;

const MiniBannerMark = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const MiniCardInfo = styled.div`
  padding: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.xs};
`;

const MiniName = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const MiniRarityDot = styled.div`
  width: 20px;
  height: 20px;
  border-radius: ${theme.radius.full};
  background: ${props => getRarityColor(props.rarity)};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 9px;
  flex-shrink: 0;
`;

// Loading & Empty States
const LoadingState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const LoadingStateText = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  padding: ${theme.spacing['2xl']};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  max-width: 320px;
`;

const EmptyIcon = styled.div`
  font-size: 56px;
  margin-bottom: ${theme.spacing.md};
  animation: float 3s ease-in-out infinite;
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
`;

const EmptyTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 ${theme.spacing.xs};
`;

const EmptyText = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

// Controls
const ControlsSection = styled.div``;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const PrimaryRollButton = styled(motion.button)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: ${theme.radius.xl};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const SecondaryRollButton = styled(motion.button)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.glass};
  color: white;
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CostLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  opacity: 0.8;
  margin-left: auto;
`;

const ControlsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const PullHint = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
  margin: 0;
  
  strong {
    color: ${theme.colors.text};
  }
`;

const FastModeToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.active ? 'rgba(88, 86, 214, 0.2)' : theme.colors.glass};
  border: 1px solid ${props => props.active ? theme.colors.accent : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${props => props.active ? theme.colors.accent : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: rgba(88, 86, 214, 0.15);
  }
`;

// Info Panel
const InfoPanel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 90%;
  max-width: 420px;
  background: ${theme.colors.backgroundSecondary};
  border-left: 1px solid ${theme.colors.surfaceBorder};
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadows.xl};
`;

const InfoPanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const InfoPanelContent = styled.div`
  flex: 1;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  ${scrollbarStyles}
`;

const InfoBlock = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

const InfoBlockTitle = styled.h3`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.accent};
  margin: 0 0 ${theme.spacing.md};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const InfoNote = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  margin-top: ${theme.spacing.md};
  color: ${theme.colors.textSecondary};
`;

const InfoNoteAccent = styled(InfoNote)`
  background: rgba(255, 159, 10, 0.1);
  border: 1px solid rgba(255, 159, 10, 0.2);
  color: ${theme.colors.warning};
`;

const FeaturedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const FeaturedItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.lg};
  cursor: pointer;
  transition: background ${theme.transitions.fast};
`;

const FeaturedThumb = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${theme.radius.md};
  overflow: hidden;
  border: 2px solid ${props => getRarityColor(props.rarity)};
  flex-shrink: 0;
  
  img, video { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
  }
`;

const FeaturedInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FeaturedName = styled.div`
  font-weight: ${theme.fontWeights.medium};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FeaturedRarity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  background: rgba(0, 0, 0, 0.3);
  color: ${props => getRarityColor(props.rarity)};
  text-transform: capitalize;
`;

const OwnedLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.success};
  margin-top: 4px;
`;

const RollFromPanelBtn = styled(motion.button)`
  width: 100%;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary});
  color: white;
  border: none;
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  margin-top: ${theme.spacing.lg};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default BannerPage;
