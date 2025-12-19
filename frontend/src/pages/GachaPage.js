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
  Heading2,
  Text,
  IconButton,
  RarityBadge,
  Spinner,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Alert,
  motionVariants,
  getRarityColor,
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
        
        {/* Netflix-Style Banners Section */}
        {banners.length > 0 && (
          <BannersSection>
            {/* Featured Hero Banner */}
            {banners.filter(b => b.featured).length > 0 && (
              <HeroBanner
                onClick={() => navigate(`/banner/${banners.find(b => b.featured).id}`)}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <HeroBannerImage src={getBannerImage(banners.find(b => b.featured).image)} alt="" />
                <HeroBannerOverlay />
                <HeroBannerContent>
                  <HeroBadge>
                    <FaStar /> Featured Event
                  </HeroBadge>
                  <HeroTitle>{banners.find(b => b.featured).name}</HeroTitle>
                  <HeroMeta>
                    <HeroSeries>{banners.find(b => b.featured).series}</HeroSeries>
                    <HeroDivider>•</HeroDivider>
                    <HeroStats>
                      {banners.find(b => b.featured).Characters?.length || 0} Characters
                    </HeroStats>
                  </HeroMeta>
                  <HeroDescription>
                    {banners.find(b => b.featured).description || 'Limited time banner with exclusive characters!'}
                  </HeroDescription>
                  <HeroCTA whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <span>Roll Now</span>
                    <span>{Math.floor(100 * (banners.find(b => b.featured).costMultiplier || 1.5))} pts</span>
                  </HeroCTA>
                </HeroBannerContent>
                <HeroGradient />
              </HeroBanner>
            )}
            
            {/* Horizontal Carousel */}
            <BannerCarouselSection>
              <CarouselHeader>
                <CarouselTitle>
                  <span>🎬</span>
                  All Banners
                </CarouselTitle>
                <CarouselNav>
                  <NavButton onClick={() => {
                    const el = document.getElementById('banner-carousel');
                    if (el) el.scrollBy({ left: -340, behavior: 'smooth' });
                  }}>
                    <FaChevronRight style={{ transform: 'rotate(180deg)' }} />
                  </NavButton>
                  <NavButton onClick={() => {
                    const el = document.getElementById('banner-carousel');
                    if (el) el.scrollBy({ left: 340, behavior: 'smooth' });
                  }}>
                    <FaChevronRight />
                  </NavButton>
                </CarouselNav>
              </CarouselHeader>
              
              <BannerCarousel id="banner-carousel">
                {banners.map((banner, index) => (
                  <NetflixBannerCard
                    key={banner.id}
                    featured={banner.featured}
                    onClick={() => navigate(`/banner/${banner.id}`)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover="hover"
                  >
                    <NetflixCardInner variants={{ hover: { scale: 1.05, y: -8 } }}>
                      <NetflixImageContainer>
                        <NetflixBannerImage src={getBannerImage(banner.image)} alt={banner.name} />
                        <NetflixImageOverlay />
                        {banner.featured && (
                          <NetflixFeaturedRibbon>
                            <FaStar /> Featured
                          </NetflixFeaturedRibbon>
                        )}
                        <NetflixPlayIcon variants={{ hover: { opacity: 1, scale: 1 } }}>
                          <FaChevronRight />
                        </NetflixPlayIcon>
                      </NetflixImageContainer>
                      
                      <NetflixCardInfo variants={{ hover: { opacity: 1, y: 0 } }}>
                        <NetflixCardTitle>{banner.name}</NetflixCardTitle>
                        <NetflixCardMeta>
                          <NetflixSeries>{banner.series}</NetflixSeries>
                          <NetflixCharCount>
                            {banner.Characters?.length || 0} chars
                          </NetflixCharCount>
                        </NetflixCardMeta>
                        <NetflixCardFooter>
                          <NetflixCost>
                            <span>🪙</span>
                            {Math.floor(100 * (banner.costMultiplier || 1.5))}
                          </NetflixCost>
                          {banner.rateMultiplier > 1 && (
                            <NetflixBoost>
                              {banner.rateMultiplier}× rates
                            </NetflixBoost>
                          )}
                        </NetflixCardFooter>
                      </NetflixCardInfo>
                    </NetflixCardInner>
                  </NetflixBannerCard>
                ))}
              </BannerCarousel>
            </BannerCarouselSection>
          </BannersSection>
        )}
        
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
// Apple-inspired design with subtle depth and refined aesthetics

const StyledPageWrapper = styled(PageWrapper)`
  padding-bottom: ${theme.spacing['3xl']};
`;

// Hero - Minimal and clean
const HeroSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing['2xl']} 0;
  gap: ${theme.spacing.xl};
  
  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    text-align: center;
  }
`;

const HeroContent = styled.div``;

const LogoText = styled.h1`
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  margin: 0;
  line-height: 1.1;
`;

const LogoAccent = styled.span`
  background: linear-gradient(135deg, #007AFF, #5856D6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeroSubtitle = styled.p`
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.textTertiary};
  margin: ${theme.spacing.sm} 0 0;
  font-weight: 400;
  letter-spacing: -0.01em;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const StatsRow = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const StatPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
  backdrop-filter: blur(10px);
`;

const PointsPill = styled(StatPill)`
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
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

// Main Layout - Now single column since banners have their own section
const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing['2xl']};
  max-width: 900px;
  margin: 0 auto;
`;

// Gacha Container - Clean card with subtle depth
const GachaContainer = styled.section`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(40px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: ${theme.spacing.xl};
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 20px 50px -12px rgba(0, 0, 0, 0.4);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
  padding-bottom: ${theme.spacing.lg};
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.02em;
`;

const RarityHistory = styled.div`
  display: flex;
  gap: 6px;
`;

const RarityDot = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${props => getRarityColor(props.rarity)};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  box-shadow: 0 2px 8px ${props => getRarityColor(props.rarity)}50;
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }
`;

// Results Area - Centered with proper spacing
const ResultsArea = styled.div`
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.xl};
`;

// Character Card - Clean with subtle rarity indication
const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  overflow: hidden;
  width: 100%;
  max-width: 320px;
  border: 1px solid ${props => getRarityColor(props.rarity)}60;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 40px ${props => getRarityColor(props.rarity)}20;
`;

const CardImageWrapper = styled.div`
  position: relative;
  height: 280px;
  cursor: pointer;
  overflow: hidden;
`;

const RarityGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 100%, ${props => getRarityColor(props.rarity)}30 0%, transparent 60%);
  pointer-events: none;
  z-index: 1;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
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
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
  
  span {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px);
    padding: 10px 20px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
  }
  
  ${CardImageWrapper}:hover & {
    opacity: 1;
  }
`;

const CollectedBadge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(52, 199, 89, 0.9);
  backdrop-filter: blur(10px);
  color: white;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  z-index: 3;
  letter-spacing: 0.02em;
`;

const CardContent = styled.div`
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
`;

const CardMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const CharName = styled.h3`
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 4px;
  color: ${theme.colors.text};
  letter-spacing: -0.02em;
`;

const CharSeries = styled.p`
  font-size: 13px;
  color: ${theme.colors.textTertiary};
  margin: 0;
`;

const CardActions = styled.div`
  padding: 0 20px 20px;
  background: rgba(0, 0, 0, 0.2);
`;

const RollAgainBtn = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #0056CC;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.4;
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

// Loading & Empty States - Minimal and elegant
const LoadingState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const LoadingText = styled.p`
  font-size: 17px;
  color: ${theme.colors.textTertiary};
  font-weight: 500;
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  padding: 48px 40px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  max-width: 300px;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.9;
  animation: float 4s ease-in-out infinite;
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
`;

const EmptyTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
`;

const EmptyText = styled.p`
  font-size: 15px;
  color: ${theme.colors.textTertiary};
  margin: 0;
  line-height: 1.5;
`;

// Controls Section - Apple-style buttons
const ControlsSection = styled.div`
  margin-top: 8px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const PrimaryRollButton = styled(motion.button)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 24px;
  background: linear-gradient(180deg, #007AFF 0%, #0056CC 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.1) inset,
    0 4px 12px rgba(0, 122, 255, 0.4);
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 
      0 1px 0 rgba(255, 255, 255, 0.1) inset,
      0 6px 20px rgba(0, 122, 255, 0.5);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const SecondaryRollButton = styled(motion.button)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.06);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const CostLabel = styled.span`
  font-size: 14px;
  opacity: 0.7;
  margin-left: auto;
  font-weight: 500;
`;

const ControlsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 4px;
`;

const PullHint = styled.p`
  font-size: 13px;
  color: ${theme.colors.textTertiary};
  margin: 0;
  
  strong {
    color: ${theme.colors.textSecondary};
    font-weight: 600;
  }
`;

const FastModeToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${props => props.active ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${props => props.active ? 'rgba(0, 122, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 100px;
  color: ${props => props.active ? '#007AFF' : theme.colors.textTertiary};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? 'rgba(0, 122, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'};
  }
`;

// ==================== NETFLIX-STYLE BANNERS ====================

const BannersSection = styled.section`
  margin-bottom: ${theme.spacing['3xl']};
`;

// Hero Featured Banner
const HeroBanner = styled(motion.div)`
  position: relative;
  height: 400px;
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: ${theme.spacing['2xl']};
  
  @media (max-width: ${theme.breakpoints.md}) {
    height: 320px;
  }
`;

const HeroBannerImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 8s ease-out;
  
  ${HeroBanner}:hover & {
    transform: scale(1.05);
  }
`;

const HeroBannerOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.6) 40%,
    rgba(0, 0, 0, 0.2) 70%,
    transparent 100%
  );
`;

const HeroGradient = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 150px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  pointer-events: none;
`;

const HeroBannerContent = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 48px;
  max-width: 500px;
  z-index: 2;
  
  @media (max-width: ${theme.breakpoints.md}) {
    padding: 32px;
  }
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(135deg, #E50914 0%, #B20710 100%);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
  
  svg {
    font-size: 10px;
  }
`;

const HeroTitle = styled.h2`
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 800;
  margin: 0 0 12px;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
`;

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const HeroSeries = styled.span`
  font-size: 15px;
  color: #46D369;
  font-weight: 600;
`;

const HeroDivider = styled.span`
  color: rgba(255, 255, 255, 0.4);
`;

const HeroStats = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const HeroDescription = styled.p`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 24px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const HeroCTA = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 28px;
  background: white;
  color: #141414;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  
  span:last-child {
    opacity: 0.6;
    font-weight: 500;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.85);
  }
`;

// Carousel Section
const BannerCarouselSection = styled.div``;

const CarouselHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CarouselTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
`;

const CarouselNav = styled.div`
  display: flex;
  gap: 8px;
`;

const NavButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const BannerCarousel = styled.div`
  display: flex;
  gap: 20px;
  overflow-x: auto;
  overflow-y: visible;
  padding: 20px 4px 40px;
  margin: -20px -4px -40px;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const NetflixBannerCard = styled(motion.div)`
  flex: 0 0 320px;
  scroll-snap-align: start;
  cursor: pointer;
  perspective: 1000px;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex: 0 0 280px;
  }
`;

const NetflixCardInner = styled(motion.div)`
  border-radius: 12px;
  overflow: hidden;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  
  ${NetflixBannerCard}:hover & {
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.6),
      0 0 40px rgba(229, 9, 20, 0.15);
  }
`;

const NetflixImageContainer = styled.div`
  position: relative;
  height: 180px;
  overflow: hidden;
`;

const NetflixBannerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  ${NetflixBannerCard}:hover & {
    transform: scale(1.1);
  }
`;

const NetflixImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(20, 20, 20, 1) 0%,
    rgba(20, 20, 20, 0.4) 50%,
    transparent 100%
  );
`;

const NetflixFeaturedRibbon = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: linear-gradient(135deg, #E50914 0%, #B20710 100%);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  svg {
    font-size: 9px;
  }
`;

const NetflixPlayIcon = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #141414;
  font-size: 18px;
  opacity: 0;
  z-index: 2;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  
  svg {
    margin-left: 3px;
  }
`;

const NetflixCardInfo = styled(motion.div)`
  padding: 16px;
`;

const NetflixCardTitle = styled.h4`
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 8px;
  color: white;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NetflixCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const NetflixSeries = styled.span`
  font-size: 13px;
  color: #46D369;
  font-weight: 600;
`;

const NetflixCharCount = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
`;

const NetflixCardFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const NetflixCost = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  color: white;
`;

const NetflixBoost = styled.span`
  padding: 5px 10px;
  background: linear-gradient(135deg, #46D369 0%, #2EBD4E 100%);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.03em;
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
