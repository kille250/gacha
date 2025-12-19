import React, { useState, useContext, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose, MdFastForward, MdHelpOutline, MdRefresh } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaStar, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

// API & Context
import api, { rollCharacter, getActiveBanners, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Design System
import {
  theme,
  PageWrapper,
  Container,
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
  motionVariants,
  getRarityColor,
  getRarityGlow,
  scrollbarStyles
} from '../styles/DesignSystem';

import { MultiPullMenu } from '../components/Gacha/MultiPullMenu';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

// ==================== CONSTANTS ====================

const SINGLE_PULL_COST = 100;

const rarityIcons = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />
};

// ==================== HELPERS ====================

const rollMultipleCharacters = async (count = 10) => {
  const response = await api.post('/characters/roll-multi', { count });
  return response.data;
};

const isVideo = (file) => {
  if (!file) return false;
  if (typeof file === 'string') {
    const lower = file.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.includes('video');
  }
  return false;
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
  useEffect(() => { refreshUser(); }, [refreshUser]);
  useEffect(() => { fetchBanners(); }, []);
  
  useEffect(() => {
    const defaultCount = Math.min(10, maxPossiblePulls);
    setMultiPullCount(Math.max(1, defaultCount));
  }, [user?.points, maxPossiblePulls]);
  
  // Callbacks
  const fetchBanners = async () => {
    try {
      const data = await getActiveBanners();
      setBanners(data);
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
      }, delay);
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
      
      const delay = skipAnimations ? 0 : 1200;
      
      setTimeout(async () => {
        try {
          const characters = await rollMultipleCharacters(multiPullCount);
          setMultiRollResults(characters);
          setShowMultiResults(true);
          
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
          const bestRarity = characters.reduce((best, char) => {
            const idx = rarityOrder.indexOf(char.rarity);
            return idx > rarityOrder.indexOf(best) ? char.rarity : best;
          }, 'common');
          
          setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
          
          if (characters.some(c => ['rare', 'epic', 'legendary'].includes(c.rarity)) && !skipAnimations) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          }
          await refreshUser();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to roll');
        } finally {
          setIsRolling(false);
        }
      }, delay);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to roll');
      setIsRolling(false);
    }
  };
  
  const getImagePath = (src) => src ? getAssetUrl(src) : 'https://via.placeholder.com/300?text=No+Image';
  const getBannerImage = (src) => src ? getAssetUrl(src) : 'https://via.placeholder.com/300x150?text=Banner';
  
  const openPreview = (character) => {
    if (character) {
      setPreviewChar(character);
      setPreviewOpen(true);
    }
  };
  
  return (
    <StyledPageWrapper>
      <Container>
        {/* Hero Section */}
        <HeroSection>
          <HeroContent>
            <LogoText>
              Gacha<LogoAccent>Master</LogoAccent>
            </LogoText>
            <HeroSubtitle>Discover rare characters. Build your collection.</HeroSubtitle>
          </HeroContent>
          <HeaderControls>
            <StatsRow>
              <StatPill>
                <span>🎲</span>
                <span>{rollCount} pulls</span>
              </StatPill>
              <PointsPill>
                <span>🪙</span>
                <span>{user?.points || 0}</span>
              </PointsPill>
            </StatsRow>
            <IconButton 
              onClick={() => setShowHelpModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MdHelpOutline />
            </IconButton>
          </HeaderControls>
        </HeroSection>
        
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <Alert
              variant="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginBottom: '24px' }}
            >
              <span>{error}</span>
              <CloseAlertBtn onClick={() => setError(null)}>
                <MdClose />
              </CloseAlertBtn>
            </Alert>
          )}
        </AnimatePresence>
        
        {/* Main Content */}
        <MainLayout>
          {/* Gacha Section */}
          <GachaContainer>
            <SectionHeader>
              <SectionTitle>
                <span>✨</span>
                Standard Gacha
              </SectionTitle>
              {lastRarities.length > 0 && (
                <RarityHistory>
                  {lastRarities.map((rarity, i) => (
                    <RarityDot key={i} rarity={rarity} style={{ animationDelay: `${i * 0.1}s` }}>
                      {rarityIcons[rarity]}
                    </RarityDot>
                  ))}
                </RarityHistory>
              )}
            </SectionHeader>
            
            {/* Results Display */}
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
                    <CardImageWrapper onClick={() => openPreview({...currentChar, isVideo: isVideo(currentChar.image)})}>
                      <RarityGlow rarity={currentChar?.rarity} />
                      {isVideo(currentChar?.image) ? (
                        <CardVideo src={getImagePath(currentChar?.image)} autoPlay loop muted playsInline />
                      ) : (
                        <CardImage src={getImagePath(currentChar?.image)} alt={currentChar?.name} />
                      )}
                      <CardOverlay>
                        <span>🔍 View</span>
                      </CardOverlay>
                      <CollectedBadge>✓ Collected</CollectedBadge>
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
                        disabled={isRolling || user?.points < SINGLE_PULL_COST}
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
                      <h2>{multiRollResults.length}× Pull Results</h2>
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
                          onClick={() => openPreview({...char, isVideo: isVideo(char.image)})}
                        >
                          <MiniCardImage>
                            {isVideo(char.image) ? (
                              <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                            ) : (
                              <img src={getImagePath(char.image)} alt={char.name} />
                            )}
                            <MiniCollected>✓</MiniCollected>
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
                    <LoadingText>Summoning...</LoadingText>
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
                    <EmptyTitle>Ready to Roll?</EmptyTitle>
                    <EmptyText>Try your luck and discover rare characters</EmptyText>
                  </EmptyState>
                )}
              </AnimatePresence>
            </ResultsArea>
            
            {/* Roll Controls */}
            <ControlsSection>
              <ButtonRow>
                <PrimaryRollButton 
                  onClick={handleRoll} 
                  disabled={isRolling || user?.points < SINGLE_PULL_COST}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isRolling ? "Summoning..." : (
                    <>
                      <span>💫</span>
                      <span>Single Pull</span>
                      <CostLabel>100 pts</CostLabel>
                    </>
                  )}
                </PrimaryRollButton>
                <SecondaryRollButton 
                  onClick={() => setMultiPullMenuOpen(true)} 
                  disabled={isRolling || user?.points < SINGLE_PULL_COST}
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
                  Up to <strong>{Math.floor((user?.points || 0) / SINGLE_PULL_COST)}</strong> pulls available
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
              maxPossiblePulls={maxPossiblePulls}
              currentMultiPullCost={currentMultiPullCost}
              onConfirm={handleMultiRoll}
              userPoints={user?.points || 0}
              singlePullCost={SINGLE_PULL_COST}
            />
          </GachaContainer>
          
          {/* Banners Sidebar */}
          <BannersSidebar>
            <SectionHeader>
              <SectionTitle>
                <span>🏆</span>
                Special Banners
              </SectionTitle>
            </SectionHeader>
            
            {banners.length > 0 ? (
              <BannersList>
                {banners.map(banner => (
                  <BannerCard
                    key={banner.id}
                    featured={banner.featured}
                    onClick={() => navigate(`/banner/${banner.id}`)}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <BannerImageWrapper>
                      <BannerImage src={getBannerImage(banner.image)} alt={banner.name} />
                      {banner.featured && <FeaturedBadge>Featured</FeaturedBadge>}
                    </BannerImageWrapper>
                    <BannerContent>
                      <BannerMeta>
                        <BannerName>{banner.name}</BannerName>
                        <BannerSeries>{banner.series}</BannerSeries>
                      </BannerMeta>
                      <BannerFooter>
                        <BannerCost>{Math.floor(100 * (banner.costMultiplier || 1.5))} pts</BannerCost>
                        <BannerArrow><FaChevronRight /></BannerArrow>
                      </BannerFooter>
                    </BannerContent>
                  </BannerCard>
                ))}
              </BannersList>
            ) : (
              <NoBannersMessage>
                <Text secondary>No special banners available</Text>
              </NoBannersMessage>
            )}
          </BannersSidebar>
        </MainLayout>
      </Container>
      
      {/* Modals */}
      <ImagePreviewModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewChar(null); }}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={true}
        isVideo={previewChar?.isVideo || isVideo(previewChar?.image)}
      />
      
      <AnimatePresence>
        {showHelpModal && (
          <ModalOverlay 
            variants={motionVariants.overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowHelpModal(false)}
          >
            <HelpModalContent
              variants={motionVariants.modal}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <Heading2>How to Play</Heading2>
                <IconButton onClick={() => setShowHelpModal(false)}>
                  <MdClose />
                </IconButton>
              </ModalHeader>
              <ModalBody>
                <HelpSection>
                  <HelpTitle>Getting Started</HelpTitle>
                  <HelpList>
                    <li>Single Pull costs 100 points</li>
                    <li>Multi Pulls: 5% off for 5+, 10% off for 10+</li>
                    <li>Special banners have unique characters</li>
                  </HelpList>
                </HelpSection>
                <HelpSection>
                  <HelpTitle>Rarities</HelpTitle>
                  <RarityGuide>
                    {Object.entries(theme.colors.rarity).map(([rarity, color]) => (
                      <RarityGuideItem key={rarity}>
                        <RarityDot rarity={rarity}>{rarityIcons[rarity]}</RarityDot>
                        <span>{rarity}</span>
                      </RarityGuideItem>
                    ))}
                  </RarityGuide>
                </HelpSection>
              </ModalBody>
            </HelpModalContent>
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

// Hero
const HeroSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.xl} 0;
  gap: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    text-align: center;
  }
`;

const HeroContent = styled.div``;

const LogoText = styled.h1`
  font-size: ${theme.fontSizes.hero};
  font-weight: ${theme.fontWeights.bold};
  letter-spacing: -0.03em;
  margin: 0;
  
  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['4xl']};
  }
`;

const LogoAccent = styled.span`
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeroSubtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: ${theme.spacing.sm} 0 0;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const StatsRow = styled.div`
  display: flex;
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

const CloseAlertBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 18px;
`;

// Main Layout
const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

// Gacha Container
const GachaContainer = styled(Section)``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0;
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
  animation: fadeIn 0.3s ease-out backwards;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
`;

// Results Area
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
  height: 300px;
  cursor: pointer;
  overflow: hidden;
`;

const RarityGlow = styled.div`
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
  max-width: 900px;
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
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  max-height: 60vh;
  overflow-y: auto;
  ${scrollbarStyles}
`;

const MiniCard = styled(motion.div)`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => getRarityColor(props.rarity)};
  cursor: pointer;
`;

const MiniCardImage = styled.div`
  position: relative;
  height: 120px;
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

const LoadingText = styled.p`
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

// Controls Section
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

// Banners Sidebar
const BannersSidebar = styled(Section)`
  height: fit-content;
  position: sticky;
  top: 80px;
  
  @media (max-width: ${theme.breakpoints.lg}) {
    position: static;
  }
`;

const BannersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  max-height: 600px;
  overflow-y: auto;
  ${scrollbarStyles}
`;

const BannerCard = styled(motion.div)`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  cursor: pointer;
  border: 1px solid ${props => props.featured ? theme.colors.warning : theme.colors.surfaceBorder};
`;

const BannerImageWrapper = styled.div`
  position: relative;
  height: 100px;
  overflow: hidden;
`;

const BannerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.transitions.slow};
  
  ${BannerCard}:hover & {
    transform: scale(1.05);
  }
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  background: linear-gradient(135deg, ${theme.colors.warning}, #ff6b00);
  color: white;
  padding: 4px 10px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
`;

const BannerContent = styled.div`
  padding: ${theme.spacing.md};
`;

const BannerMeta = styled.div`
  margin-bottom: ${theme.spacing.sm};
`;

const BannerName = styled.h4`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  margin: 0 0 4px;
`;

const BannerSeries = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.warning};
  margin: 0;
`;

const BannerFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BannerCost = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const BannerArrow = styled.span`
  color: ${theme.colors.textTertiary};
  font-size: 12px;
`;

const NoBannersMessage = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

// Help Modal
const HelpModalContent = styled(ModalContent)`
  width: 100%;
  max-width: 480px;
`;

const HelpSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const HelpTitle = styled.h3`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.accent};
  margin: 0 0 ${theme.spacing.md};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const HelpList = styled.ul`
  margin: 0;
  padding-left: ${theme.spacing.lg};
  
  li {
    margin-bottom: ${theme.spacing.sm};
    color: ${theme.colors.textSecondary};
    line-height: 1.5;
  }
`;

const RarityGuide = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const RarityGuideItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  text-transform: capitalize;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export default GachaPage;
