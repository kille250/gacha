import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdClose, MdFastForward, MdRefresh, MdArrowBack } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

// API & Context
import { rollCharacter, rollMultipleCharacters, getStandardPricing, getAssetUrl } from '../utils/api';
import { isVideo } from '../utils/mediaUtils';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock } from '../hooks';

// Design System
import {
  theme,
  PageWrapper,
  Container,
  Section,
  IconButton,
  Chip,
  RarityBadge,
  Spinner,
  Alert,
  motionVariants,
  scrollbarStyles
} from '../styles/DesignSystem';

import { SummonAnimation, MultiSummonAnimation } from '../components/Gacha/SummonAnimation';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

// ==================== CONSTANTS ====================

// Default pricing (will be overridden by server data)
const DEFAULT_SINGLE_PULL_COST = 100;

const rarityIcons = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />
};

// ==================== MAIN COMPONENT ====================

const RollPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser, setUser } = useContext(AuthContext);
  
  // Action lock to prevent rapid double-clicks
  const { withLock, locked } = useActionLock(300);
  
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
  
  // Summoning animation state
  const [showSummonAnimation, setShowSummonAnimation] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState(null);
  const [showMultiSummonAnimation, setShowMultiSummonAnimation] = useState(false);
  const [pendingMultiResults, setPendingMultiResults] = useState([]);
  
  // Pricing from server (single source of truth)
  const [pricing, setPricing] = useState(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  
  // Computed values from pricing
  const singlePullCost = pricing?.singlePullCost || DEFAULT_SINGLE_PULL_COST;
  const pullOptions = useMemo(() => pricing?.pullOptions || [], [pricing]);
  
  const calculateMultiPullCost = useCallback((count) => {
    const option = pullOptions.find(o => o.count === count);
    return option?.finalCost || count * singlePullCost;
  }, [pullOptions, singlePullCost]);
  
  // Effects
  useEffect(() => { refreshUser(); }, [refreshUser]);
  
  // Fetch pricing from server
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const data = await getStandardPricing();
        setPricing(data);
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
        // Will use defaults
      } finally {
        setPricingLoaded(true);
      }
    };
    fetchPricing();
  }, []);
  
  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Cleanup animation state on unmount to prevent stuck states
  useEffect(() => {
    return () => {
      setIsRolling(false);
      setShowSummonAnimation(false);
      setShowMultiSummonAnimation(false);
      setPendingCharacter(null);
      setPendingMultiResults([]);
    };
  }, []);
  
  // Check if animation is currently showing
  const isAnimating = showSummonAnimation || showMultiSummonAnimation;
  
  // Get dynamic rarity colors from context
  const { getRarityColor } = useRarity();

  // Callbacks
  const showRarePullEffect = useCallback((rarity) => {
    if (['legendary', 'epic'].includes(rarity)) {
      confetti({
        particleCount: rarity === 'legendary' ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [getRarityColor(rarity), '#ffffff', '#ffd700']
      });
    }
  }, [getRarityColor]);
  
  // Handlers
  const handleRoll = async () => {
    // Use action lock to prevent rapid double-clicks
    await withLock(async () => {
      try {
        setIsRolling(true);
        setShowCard(false);
        setShowMultiResults(false);
        setError(null);
        setMultiRollResults([]);
        setRollCount(prev => prev + 1);
        
        // Fetch character immediately
        const result = await rollCharacter();
        const { updatedPoints, ...character } = result;
        
        // Update points immediately from response
        if (updatedPoints !== undefined && user) {
          setUser({ ...user, points: updatedPoints });
        }
        
        if (skipAnimations) {
          // Skip animation - show card directly
          setCurrentChar(character);
          setShowCard(true);
          setLastRarities(prev => [character.rarity, ...prev.slice(0, 4)]);
          showRarePullEffect(character.rarity);
          setIsRolling(false);
        } else {
          // Show summoning animation
          setPendingCharacter(character);
          setShowSummonAnimation(true);
        }
      } catch (err) {
        setError(err.response?.data?.error || t('roll.failedRoll'));
        setIsRolling(false);
        // Refresh user data to sync points after failure (handles stale data)
        await refreshUser();
      }
    });
  };
  
  const handleSummonComplete = useCallback(() => {
    if (pendingCharacter) {
      // Don't show the card again - animation already revealed it
      // Just update the rarity history
      setLastRarities(prev => [pendingCharacter.rarity, ...prev.slice(0, 4)]);
    }
    setShowSummonAnimation(false);
    setPendingCharacter(null);
    setCurrentChar(null);
    setShowCard(false);
    setIsRolling(false);
  }, [pendingCharacter]);
  
  const handleMultiRoll = async (count) => {
    // Use action lock to prevent rapid double-clicks
    // All validation happens INSIDE the lock to prevent race conditions
    await withLock(async () => {
      try {
        // Validate INSIDE the lock to prevent race conditions from rapid clicks
        const cost = calculateMultiPullCost(count);
        if (user?.points < cost) {
          setError(t('roll.notEnoughPoints', { count, cost }));
          return;
        }
        
        setIsRolling(true);
        setShowCard(false);
        setShowMultiResults(false);
        setError(null);
        setRollCount(prev => prev + count);
        
        const result = await rollMultipleCharacters(count);
        const { characters, updatedPoints } = result;
        
        // Update points immediately from response
        if (updatedPoints !== undefined && user) {
          setUser({ ...user, points: updatedPoints });
        }
        
        if (skipAnimations) {
          // Skip animation - show results directly
          setMultiRollResults(characters);
          setShowMultiResults(true);
          
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
          const bestRarity = characters.reduce((best, char) => {
            const idx = rarityOrder.indexOf(char.rarity);
            return idx > rarityOrder.indexOf(best) ? char.rarity : best;
          }, 'common');
          
          setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
          
          if (characters.some(c => ['rare', 'epic', 'legendary'].includes(c.rarity))) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          }
          setIsRolling(false);
        } else {
          // Show multi-summon animation
          setPendingMultiResults(characters);
          setShowMultiSummonAnimation(true);
        }
      } catch (err) {
        setError(err.response?.data?.error || t('roll.failedMultiRoll'));
        setIsRolling(false);
        // Refresh user data to sync points after failure (handles stale data)
        await refreshUser();
      }
    });
  };
  
  const handleMultiSummonComplete = useCallback(() => {
    // Don't show results grid - animation already revealed each character
    // Just update the rarity history with the best pull
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const bestRarity = pendingMultiResults.reduce((best, char) => {
      const idx = rarityOrder.indexOf(char.rarity);
      return idx > rarityOrder.indexOf(best) ? char.rarity : best;
    }, 'common');
    
    setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
    setShowMultiSummonAnimation(false);
    setPendingMultiResults([]);
    setMultiRollResults([]);
    setShowMultiResults(false);
    setIsRolling(false);
  }, [pendingMultiResults]);
  
  const getImagePath = (src) => src ? getAssetUrl(src) : 'https://via.placeholder.com/300?text=No+Image';
  
  const openPreview = (character) => {
    if (character) {
      setPreviewChar(character);
      setPreviewOpen(true);
    }
  };
  
  return (
    <StyledPageWrapper>
      {/* Background Effect */}
      <BackgroundGradient />
      
      <Container>
        {/* Navigation */}
        <NavBar>
          <BackButton onClick={() => navigate('/gacha')}>
            <MdArrowBack />
            <span>{t('common.banners')}</span>
          </BackButton>
          <NavStats>
            <StatPill>
              <span>🎲</span>
              <span>{rollCount} {t('common.pulls')}</span>
            </StatPill>
            <PointsPill>
              <span>🪙</span>
              <span>{user?.points || 0}</span>
            </PointsPill>
          </NavStats>
        </NavBar>
        
        {/* Hero Section */}
        <HeroSection>
          <HeroTitle>{t('roll.title')}</HeroTitle>
          <HeroSubtitle>{t('roll.subtitle')}</HeroSubtitle>
        </HeroSection>
        
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
            <RarityLabel>{t('common.recent')}:</RarityLabel>
            <RarityHistoryContainer>
              {lastRarities.map((rarity, i) => (
                <RarityDot key={i} $color={getRarityColor(rarity)} style={{ animationDelay: `${i * 0.1}s` }}>
                  {rarityIcons[rarity]}
                </RarityDot>
              ))}
            </RarityHistoryContainer>
          </RarityTracker>
        )}
        
        {/* Main Gacha Area */}
        <GachaContainer>
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
                  $color={getRarityColor(currentChar?.rarity)}
                >
                  <CardImageWrapper onClick={() => openPreview({...currentChar, isVideo: isVideo(currentChar.image)})}>
                    <RarityGlow $color={getRarityColor(currentChar?.rarity)} />
                    {isVideo(currentChar?.image) ? (
                      <CardVideo src={getImagePath(currentChar?.image)} autoPlay loop muted playsInline />
                    ) : (
                      <CardImage src={getImagePath(currentChar?.image)} alt={currentChar?.name} />
                    )}
                    <CardOverlay>
                      <span>🔍 {t('common.view')}</span>
                    </CardOverlay>
                    <CollectedBadge>✓ {t('common.collected')}</CollectedBadge>
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
                      disabled={isRolling || locked || user?.points < singlePullCost}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MdRefresh /> {t('common.rollAgain')}
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
                    <h2>{multiRollResults.length}× {t('common.pullResults')}</h2>
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
                        $color={getRarityColor(char.rarity)}
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
                          <MiniRarityDot $color={getRarityColor(char.rarity)}>{rarityIcons[char.rarity]}</MiniRarityDot>
                        </MiniCardInfo>
                      </MiniCard>
                    ))}
                  </MultiResultsGrid>
                </MultiResultsContainer>
                
              ) : isRolling && skipAnimations ? (
                <LoadingState 
                  key="loading" 
                  variants={motionVariants.fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Spinner size="56px" />
                  <LoadingText>{t('common.summoning')}</LoadingText>
                </LoadingState>
                
              ) : !isRolling ? (
                <EmptyState 
                  key="empty"
                  variants={motionVariants.slideUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <EmptyIcon>✨</EmptyIcon>
                  <EmptyTitle>{t('common.readyToRoll')}</EmptyTitle>
                  <EmptyText>{t('common.tryYourLuck')}</EmptyText>
                </EmptyState>
              ) : null}
            </AnimatePresence>
          </ResultsArea>
          
          {/* Roll Controls - Hidden during animation */}
          {!isAnimating && (
            <ControlsSection
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {/* Main Pull Actions */}
              <PullActionsContainer>
                {/* Primary Single Pull - Most Prominent */}
                <PrimaryPullCard
                  onClick={handleRoll} 
                  disabled={isRolling || !pricingLoaded || locked || user?.points < singlePullCost}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PullCardIcon>💫</PullCardIcon>
                  <PullCardContent>
                    <PullCardTitle>{isRolling ? t('common.summoning') : t('common.single')}</PullCardTitle>
                    <PullCardCost>
                      <CostAmount>{singlePullCost}</CostAmount>
                      <CostUnit>{t('common.points')}</CostUnit>
                    </PullCardCost>
                  </PullCardContent>
                  <PullCardArrow>→</PullCardArrow>
                </PrimaryPullCard>

                {/* Multi-Pull Options Grid */}
                <MultiPullGrid>
                  {pullOptions.filter(opt => opt.count > 1).map((option) => {
                    const canAfford = (user?.points || 0) >= option.finalCost;
                    
                    return (
                      <MultiPullCard
                        key={option.count}
                        onClick={() => handleMultiRoll(option.count)}
                        disabled={isRolling || !pricingLoaded || locked || !canAfford}
                        $canAfford={canAfford && pricingLoaded}
                        $isRecommended={option.count === 10}
                        whileHover={{ scale: canAfford ? 1.03 : 1, y: canAfford ? -3 : 0 }}
                        whileTap={{ scale: canAfford ? 0.97 : 1 }}
                      >
                        {option.count === 10 && <RecommendedTag>{t('common.best') || 'BEST'}</RecommendedTag>}
                        <MultiPullCount>{option.count}×</MultiPullCount>
                        <MultiPullCost>
                          <span>{option.finalCost}</span>
                          <small>pts</small>
                        </MultiPullCost>
                        {option.discountPercent > 0 && (
                          <MultiPullDiscount>-{option.discountPercent}%</MultiPullDiscount>
                        )}
                      </MultiPullCard>
                    );
                  })}
                </MultiPullGrid>
              </PullActionsContainer>
              
              {/* Footer with points and fast mode */}
              <ControlsFooter>
                <PointsDisplay>
                  <PointsIcon>🪙</PointsIcon>
                  <PointsValue>{user?.points || 0}</PointsValue>
                  <PointsLabel>{t('common.pointsAvailable')}</PointsLabel>
                </PointsDisplay>
                <FastModeToggle 
                  $active={skipAnimations}
                  onClick={() => setSkipAnimations(!skipAnimations)}
                >
                  <MdFastForward />
                  <span>{skipAnimations ? t('common.fastMode') : t('common.normal')}</span>
                </FastModeToggle>
              </ControlsFooter>
            </ControlsSection>
          )}
        </GachaContainer>
      </Container>
      
      {/* Summoning Animation for Single Pull */}
      <AnimatePresence>
        {showSummonAnimation && pendingCharacter && (
          <SummonAnimation
            isActive={showSummonAnimation}
            rarity={pendingCharacter.rarity}
            character={pendingCharacter}
            onComplete={handleSummonComplete}
            skipEnabled={true}
            getImagePath={getImagePath}
          />
        )}
      </AnimatePresence>
      
      {/* Multi-Summon Animation */}
      <AnimatePresence>
        {showMultiSummonAnimation && pendingMultiResults.length > 0 && (
          <MultiSummonAnimation
            isActive={showMultiSummonAnimation}
            characters={pendingMultiResults}
            onComplete={handleMultiSummonComplete}
            skipEnabled={true}
            getImagePath={getImagePath}
          />
        )}
      </AnimatePresence>
      
      {/* Image Preview Modal */}
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
    </StyledPageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const StyledPageWrapper = styled(PageWrapper)`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
`;

const BackgroundGradient = styled.div`
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(ellipse at 20% 0%, rgba(88, 86, 214, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(175, 82, 222, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
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

const HeroTitle = styled.h1`
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: ${theme.fontWeights.bold};
  margin: 0 0 ${theme.spacing.sm};
  background: linear-gradient(135deg, ${theme.colors.text} 0%, ${theme.colors.textSecondary} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.03em;
`;

const HeroSubtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;
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
  justify-content: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

const RarityLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
`;

const RarityHistoryContainer = styled.div`
  display: flex;
  gap: 6px;
`;

const RarityDot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  box-shadow: 0 2px 10px ${props => props.$color}50;
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }
`;

// Main Gacha Container
const GachaContainer = styled.section`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(40px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: ${theme.spacing.xl};
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 20px 50px -12px rgba(0, 0, 0, 0.4);
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const ResultsArea = styled.div`
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.xl};
`;

// Character Card
const CharacterCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  overflow: hidden;
  width: 100%;
  max-width: 320px;
  border: 1px solid ${props => props.$color}60;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 40px ${props => props.$color}20;
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
  background: radial-gradient(ellipse at 50% 100%, ${props => props.$color}30 0%, transparent 60%);
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
  border: 2px solid ${props => props.$color};
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
  background: ${props => props.$color};
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

// Controls Section - Redesigned for better UX
const ControlsSection = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 16px;
    border-radius: 20px;
  }
`;

const PullActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// Primary Pull Card - The main CTA
const PrimaryPullCard = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px 24px;
  background: linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accentSecondary} 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 
    0 8px 32px rgba(88, 86, 214, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 16px 20px;
    gap: 12px;
  }
`;

const PullCardIcon = styled.span`
  font-size: 32px;
  flex-shrink: 0;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 28px;
  }
`;

const PullCardContent = styled.div`
  flex: 1;
  text-align: left;
`;

const PullCardTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin-bottom: 2px;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 16px;
  }
`;

const PullCardCost = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const CostAmount = styled.span`
  font-size: 24px;
  font-weight: 800;
  color: white;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 20px;
  }
`;

const CostUnit = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const PullCardArrow = styled.span`
  font-size: 24px;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
`;

// Multi Pull Grid
const MultiPullGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
`;

const MultiPullCard = styled(motion.button)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  min-height: 90px;
  background: ${props => props.$canAfford 
    ? props.$isRecommended 
      ? 'linear-gradient(135deg, rgba(255, 159, 10, 0.2), rgba(255, 120, 0, 0.15))'
      : 'rgba(255, 255, 255, 0.06)'
    : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$canAfford 
    ? props.$isRecommended 
      ? 'rgba(255, 159, 10, 0.5)'
      : 'rgba(255, 255, 255, 0.12)'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 14px;
  cursor: ${props => props.$canAfford ? 'pointer' : 'not-allowed'};
  transition: all 0.2s ease;
  overflow: hidden;
  
  &:disabled {
    opacity: ${props => props.$canAfford ? 1 : 0.4};
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 12px 8px;
    min-height: 80px;
  }
`;

const RecommendedTag = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #ff9f0a, #ff6b00);
  color: white;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 3px 0;
  text-align: center;
`;

const MultiPullCount = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: white;
  margin-top: 4px;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 18px;
  }
`;

const MultiPullCost = styled.div`
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-top: 4px;
  
  span {
    font-size: 15px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    
    @media (max-width: ${theme.breakpoints.sm}) {
      font-size: 13px;
    }
  }
  
  small {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const MultiPullDiscount = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.success};
  background: rgba(48, 209, 88, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 6px;
`;

// Footer
const ControlsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PointsIcon = styled.span`
  font-size: 20px;
`;

const PointsValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: white;
`;

const PointsLabel = styled.span`
  font-size: 13px;
  color: ${theme.colors.textTertiary};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const FastModeToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${props => props.$active ? 'rgba(88, 86, 214, 0.25)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${props => props.$active ? 'rgba(88, 86, 214, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 100px;
  color: ${props => props.$active ? theme.colors.accent : 'rgba(255, 255, 255, 0.6)'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(88, 86, 214, 0.2);
    border-color: rgba(88, 86, 214, 0.4);
  }
  
  svg {
    font-size: 16px;
  }
`;

export default RollPage;
