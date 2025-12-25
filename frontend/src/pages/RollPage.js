import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdClose, MdFastForward, MdRefresh, MdArrowBack } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

// API & Context
import { getStandardPricing, getAssetUrl } from '../utils/api';
import { isVideo } from '../utils/mediaUtils';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError, useSkipAnimations, getErrorSeverity } from '../hooks';
import { onVisibilityChange, VISIBILITY_CALLBACK_IDS } from '../cache';
import { executeStandardRoll, executeStandardMultiRoll } from '../actions/gachaActions';

// Design System
import {
  Container,
  IconButton,
  Spinner,
  Alert,
  motionVariants,
  RarityBadge,
} from '../design-system';

// Styled Components
import {
  StyledPageWrapper,
  BackgroundGradient,
  NavBar,
  BackButton,
  NavStats,
  StatPill,
  PointsPill,
  HeroSection,
  HeroTitle,
  HeroSubtitle,
  CloseAlertBtn,
  RarityTracker,
  RarityLabel,
  RarityHistoryContainer,
  RarityDot,
  GachaContainer,
  ResultsArea,
  CharacterCard,
  CardImageWrapper,
  RarityGlow,
  CardImage,
  CardVideo,
  CardOverlay,
  CollectedBadge,
  CardContent,
  CardMeta,
  CharName,
  CharSeries,
  CardActions,
  RollAgainBtn,
  MultiResultsContainer,
  MultiResultsHeader,
  MultiResultsGrid,
  MiniCard,
  MiniCardImage,
  MiniCollected,
  MiniCardInfo,
  MiniName,
  MiniRarityDot,
  LoadingState,
  LoadingText,
  EmptyState,
  EmptyIcon,
  EmptyTitle,
  EmptyText,
  ControlsSection,
  PullActionsContainer,
  PrimaryPullCard,
  PullCardIcon,
  PullCardContent,
  PullCardTitle,
  PullCardCost,
  CostAmount,
  CostUnit,
  PullCardArrow,
  MultiPullGrid,
  MultiPullCard,
  RecommendedTag,
  MultiPullCount,
  MultiPullCost,
  MultiPullDiscount,
  ControlsFooter,
  PointsDisplay,
  PointsIcon,
  PointsValue,
  PointsLabel,
  FastModeToggle,
} from './RollPage.styles';

import { SummonAnimation, MultiSummonAnimation } from '../components/Gacha/SummonAnimation';

// Icon Constants
import { IconDice, IconPoints, IconSearch, IconSparkle, IconMagic } from '../constants/icons';
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
  
  // Action lock to prevent rapid double-clicks (reduced from 300ms for snappier feel)
  const { withLock, locked } = useActionLock(200);
  
  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();
  
  // State
  const [currentChar, setCurrentChar] = useState(null);
  const [multiRollResults, setMultiRollResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showMultiResults, setShowMultiResults] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);
  // Centralized animation skip preference (shared across gacha pages)
  const [skipAnimations, setSkipAnimations] = useSkipAnimations();
  
  // Summoning animation state
  const [showSummonAnimation, setShowSummonAnimation] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState(null);
  const [showMultiSummonAnimation, setShowMultiSummonAnimation] = useState(false);
  const [pendingMultiResults, setPendingMultiResults] = useState([]);
  
  // Pricing from server (single source of truth)
  const [pricing, setPricing] = useState(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  
  // Computed values from pricing
  const singlePullCost = pricing?.singlePullCost || DEFAULT_SINGLE_PULL_COST;
  const pullOptions = useMemo(() => pricing?.pullOptions || [], [pricing]);
  
  const calculateMultiPullCost = useCallback((count) => {
    const option = pullOptions.find(o => o.count === count);
    return option?.finalCost || count * singlePullCost;
  }, [pullOptions, singlePullCost]);
  
  // Derive best value option from highest discount percentage (not hardcoded)
  const bestValueCount = useMemo(() => {
    const multiOptions = pullOptions.filter(o => o.count > 1);
    if (multiOptions.length === 0) return null;
    const best = multiOptions.reduce((acc, opt) => 
      (opt.discountPercent || 0) > (acc.discountPercent || 0) ? opt : acc
    , multiOptions[0]);
    return best?.count || null;
  }, [pullOptions]);
  
  // NOTE: refreshUser on mount removed - AuthContext already fetches fresh data on initial load.
  // User data is refreshed via visibility handler or after actions that change currency.
  
  // Fetch pricing from server
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setPricingError(null);
        const data = await getStandardPricing();
        setPricing(data);
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
        setPricingError(t('common.pricingUnavailable') || 'Pricing unavailable. Please refresh.');
        // Will use defaults
      } finally {
        setPricingLoaded(true);
      }
    };
    fetchPricing();
  }, [t]);
  
  // Refresh pricing when tab regains focus (handles admin pricing changes during session)
  // Uses centralized cacheManager.onVisibilityChange() instead of scattered event listeners
  // 
  // NOTE: Pricing is always refreshed on any visibility change (not just stale threshold)
  // because admin pricing updates should be reflected immediately for accurate costs.
  useEffect(() => {
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.ROLL_PRICING, async () => {
      // Always refresh pricing on visibility change (pricing may have been updated by admin)
      try {
        const data = await getStandardPricing();
        setPricing(data);
      } catch (err) {
        console.warn('Failed to refresh pricing on visibility:', err);
      }
    });
  }, []);
  
  // Warn user before leaving during a roll to prevent lost data
  useEffect(() => {
    if (isRolling || showSummonAnimation || showMultiSummonAnimation) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isRolling, showSummonAnimation, showMultiSummonAnimation]);
  
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
  
  // Note: skipAnimations persistence and cross-tab sync is handled by useSkipAnimations hook
  
  // Network offline detection during roll animations
  useEffect(() => {
    const handleOffline = () => {
      if (isRolling || showSummonAnimation || showMultiSummonAnimation) {
        setError(t('common.networkDisconnected') || 'Network disconnected. Please check your connection and refresh.');
        setIsRolling(false);
        setShowSummonAnimation(false);
        setShowMultiSummonAnimation(false);
        setPendingCharacter(null);
        setPendingMultiResults([]);
      }
    };
    
    const handleOnline = () => {
      // Refresh user data when coming back online
      refreshUser();
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [isRolling, showSummonAnimation, showMultiSummonAnimation, t, refreshUser, setError]);
  
  // Check for pending roll on mount (handles page reload during roll)
  useEffect(() => {
    try {
      const pendingRoll = sessionStorage.getItem('gacha_pendingRoll_standard');
      if (pendingRoll) {
        const { timestamp } = JSON.parse(pendingRoll);
        // Only process if it's recent (within 30 seconds)
        if (Date.now() - timestamp < 30000) {
          setError(t('roll.rollInterrupted') || 'A roll may have been interrupted. Your data has been refreshed.');
          refreshUser();
        }
        sessionStorage.removeItem('gacha_pendingRoll_standard');
      }
      
      // Check for unviewed roll results (user navigated away during animation)
      const unviewedRoll = sessionStorage.getItem('gacha_unviewedRoll_standard');
      if (unviewedRoll) {
        const { timestamp } = JSON.parse(unviewedRoll);
        // Only notify if it's recent (within 5 minutes)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setError(t('roll.unviewedRoll') || 'You have unviewed pulls! Check your collection.');
        }
        sessionStorage.removeItem('gacha_unviewedRoll_standard');
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [t, refreshUser, setError]);
  
  // Check if animation is currently showing
  const isAnimating = showSummonAnimation || showMultiSummonAnimation;
  
  // Helper to get disabled reason for tooltips
  const getDisabledReason = useCallback((cost) => {
    if (!pricingLoaded && !pricingError) return t('common.loading') || 'Loading...';
    if (pricingError) return pricingError;
    if (isRolling) return t('common.summoning') || 'Summoning...';
    if (locked) return t('common.processing') || 'Processing...';
    if (user?.points < cost) {
      const needed = cost - (user?.points || 0);
      return t('roll.needMorePoints', { count: needed }) || `Need ${needed} more points`;
    }
    return undefined;
  }, [pricingLoaded, pricingError, isRolling, locked, user?.points, t]);
  
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
        // Validate INSIDE the lock to prevent race conditions from rapid clicks
        if (user?.points < singlePullCost) {
          setError(t('roll.notEnoughPoints', { count: 1, cost: singlePullCost }));
          return;
        }
        
        setIsRolling(true);
        setShowCard(false);
        setShowMultiResults(false);
        setError(null);
        setMultiRollResults([]);
        setRollCount(prev => prev + 1);
        
        // Save pending roll state for recovery after page reload
        try {
          sessionStorage.setItem('gacha_pendingRoll_standard', JSON.stringify({ 
            timestamp: Date.now(),
            type: 'single'
          }));
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Use gachaActions helper - handles API call + cache invalidation + user state update
        const result = await executeStandardRoll(setUser);
        const { updatedPoints, ...character } = result;
        
        // Clear pending roll state on success
        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
        }
        
        if (skipAnimations) {
          // Skip animation - show card directly
          setCurrentChar(character);
          setShowCard(true);
          setLastRarities(prev => [character.rarity, ...prev.slice(0, 4)]);
          showRarePullEffect(character.rarity);
          setIsRolling(false);
        } else {
          // Persist roll result before animation for recovery if user navigates away
          try {
            sessionStorage.setItem('gacha_unviewedRoll_standard', JSON.stringify({
              character,
              timestamp: Date.now(),
              type: 'single'
            }));
          } catch {
            // Ignore sessionStorage errors
          }
          // Show summoning animation
          setPendingCharacter(character);
          setShowSummonAnimation(true);
        }
      } catch (err) {
        // Clear pending roll state on error
        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
        }
        
        setError(err.response?.data?.error || t('roll.failedRoll'));
        setIsRolling(false);
        // Refresh user data to sync points after failure (handles stale data)
        const refreshResult = await refreshUser();
        if (!refreshResult.success) {
          console.warn('Failed to refresh user after roll error:', refreshResult.error);
        }
      }
    });
  };
  
  const handleSummonComplete = useCallback(() => {
    if (pendingCharacter) {
      // Don't show the card again - animation already revealed it
      // Just update the rarity history
      setLastRarities(prev => [pendingCharacter.rarity, ...prev.slice(0, 4)]);
    }
    // Clear unviewed roll since animation was viewed
    try {
      sessionStorage.removeItem('gacha_unviewedRoll_standard');
    } catch {
      // Ignore sessionStorage errors
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
        
        // Save pending roll state for recovery after page reload
        try {
          sessionStorage.setItem('gacha_pendingRoll_standard', JSON.stringify({ 
            timestamp: Date.now(),
            type: 'multi',
            count
          }));
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Use gachaActions helper - handles API call + cache invalidation + user state update
        const result = await executeStandardMultiRoll(count, setUser);
        const { characters } = result;
        
        // Clear pending roll state on success
        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
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
          // Persist roll results before animation for recovery if user navigates away
          try {
            sessionStorage.setItem('gacha_unviewedRoll_standard', JSON.stringify({
              characters,
              timestamp: Date.now(),
              type: 'multi'
            }));
          } catch {
            // Ignore sessionStorage errors
          }
          // Show multi-summon animation
          setPendingMultiResults(characters);
          setShowMultiSummonAnimation(true);
        }
      } catch (err) {
        // Clear pending roll state on error
        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
        }
        
        setError(err.response?.data?.error || t('roll.failedMultiRoll'));
        setIsRolling(false);
        // Refresh user data to sync points after failure (handles stale data)
        const refreshResult = await refreshUser();
        if (!refreshResult.success) {
          console.warn('Failed to refresh user after roll error:', refreshResult.error);
        }
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
    
    // Clear unviewed roll since animation was viewed
    try {
      sessionStorage.removeItem('gacha_unviewedRoll_standard');
    } catch {
      // Ignore sessionStorage errors
    }
    
    setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
    setShowMultiSummonAnimation(false);
    setPendingMultiResults([]);
    setMultiRollResults([]);
    setShowMultiResults(false);
    setIsRolling(false);
  }, [pendingMultiResults]);
  
  // Animation timeout fallback - prevents stuck states if animation fails
  useEffect(() => {
    if (showSummonAnimation && pendingCharacter) {
      const timeout = setTimeout(() => {
        try {
          console.warn('[Animation] Single summon timeout - forcing completion');
          // Notify user that animation timed out but pull was successful
          setError(t('roll.animationTimeout') || 'Animation timed out, but your pull was successful! Check your collection.');
          handleSummonComplete();
        } catch (e) {
          console.error('[Animation] Force complete failed:', e);
          setIsRolling(false);
          setShowSummonAnimation(false);
          setPendingCharacter(null);
        }
      }, 15000); // Max 15 seconds for single animation
      return () => clearTimeout(timeout);
    }
  }, [showSummonAnimation, pendingCharacter, handleSummonComplete, t, setError]);
  
  useEffect(() => {
    if (showMultiSummonAnimation && pendingMultiResults.length > 0) {
      // Multi-summon can take longer: base 15s + 2s per character
      const maxTime = 15000 + (pendingMultiResults.length * 2000);
      const timeout = setTimeout(() => {
        try {
          console.warn('[Animation] Multi-summon timeout - forcing completion');
          // Notify user that animation timed out but pulls were successful
          setError(t('roll.animationTimeout') || 'Animation timed out, but your pulls were successful! Check your collection.');
          handleMultiSummonComplete();
        } catch (e) {
          console.error('[Animation] Multi-summon force complete failed:', e);
          setIsRolling(false);
          setShowMultiSummonAnimation(false);
          setPendingMultiResults([]);
        }
      }, maxTime);
      return () => clearTimeout(timeout);
    }
  }, [showMultiSummonAnimation, pendingMultiResults, handleMultiSummonComplete, t, setError]);
  
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
              <span><IconDice /></span>
              <span>{rollCount} {t('common.pulls')}</span>
            </StatPill>
            <PointsPill>
              <span><IconPoints /></span>
              <span>{user?.points || 0}</span>
            </PointsPill>
          </NavStats>
        </NavBar>
        
        {/* Hero Section */}
        <HeroSection>
          <HeroTitle>{t('roll.title')}</HeroTitle>
          <HeroSubtitle>{t('roll.subtitle')}</HeroSubtitle>
        </HeroSection>
        
        {/* Error Alert - uses severity to distinguish recoverable vs critical errors */}
        <AnimatePresence>
          {error && (
            <Alert
              variant={getErrorSeverity(error)}
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
                      <span><IconSearch /> {t('common.view')}</span>
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
                    <IconButton onClick={() => setShowMultiResults(false)} label="Close results">
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
                  <EmptyIcon><IconSparkle /></EmptyIcon>
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
                  onClick={() => {
                    const reason = getDisabledReason(singlePullCost);
                    if (reason) {
                      // Show feedback for disabled state (especially for mobile)
                      setError(reason);
                      return;
                    }
                    handleRoll();
                  }}
                  disabled={isRolling || (!pricingLoaded && !pricingError) || pricingError || locked || user?.points < singlePullCost}
                  title={getDisabledReason(singlePullCost)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PullCardIcon><IconMagic /></PullCardIcon>
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
                        onClick={() => {
                          const reason = getDisabledReason(option.finalCost);
                          if (reason) {
                            setError(reason);
                            return;
                          }
                          handleMultiRoll(option.count);
                        }}
                        disabled={isRolling || (!pricingLoaded && !pricingError) || pricingError || locked || !canAfford}
                        title={getDisabledReason(option.finalCost)}
                        $canAfford={canAfford && pricingLoaded && !pricingError}
                        $isRecommended={option.count === bestValueCount}
                        whileHover={{ scale: canAfford ? 1.03 : 1, y: canAfford ? -3 : 0 }}
                        whileTap={{ scale: canAfford ? 0.97 : 1 }}
                      >
                        {option.count === bestValueCount && option.discountPercent > 0 && (
                          <RecommendedTag>{t('common.best') || 'BEST'}</RecommendedTag>
                        )}
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
                  <PointsIcon><IconPoints /></PointsIcon>
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

export default RollPage;
