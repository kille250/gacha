import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdArrowBack, MdClose, MdFastForward, MdInfo, MdRefresh } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaPlay, FaPause, FaChevronRight, FaStar } from 'react-icons/fa';
import confetti from 'canvas-confetti';

// API & Context
import api, { getBannerById, getBannerPricing, getAssetUrl } from '../utils/api';
import { isVideo } from '../utils/mediaUtils';
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
  Alert,
  motionVariants,
  getRarityColor,
  getRarityGlow,
  scrollbarStyles
} from '../styles/DesignSystem';

import { SummonAnimation, MultiSummonAnimation } from '../components/Gacha/SummonAnimation';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

// ==================== CONSTANTS ====================

const rarityIcons = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />
};

// ==================== MAIN COMPONENT ====================

const BannerPage = () => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, setUser } = useContext(AuthContext);
  
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  
  // Summoning animation state
  const [showSummonAnimation, setShowSummonAnimation] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState(null);
  const [showMultiSummonAnimation, setShowMultiSummonAnimation] = useState(false);
  const [pendingMultiResults, setPendingMultiResults] = useState([]);

  // Pricing from server (single source of truth)
  const [pricing, setPricing] = useState(null);
  
  // Ticket state
  const [tickets, setTickets] = useState({ rollTickets: 0, premiumTickets: 0 });
  
  // Computed values from pricing
  const singlePullCost = pricing?.singlePullCost || 100;
  const pullOptions = useMemo(() => pricing?.pullOptions || [], [pricing?.pullOptions]);
  
  const getMultiPullCost = useCallback((count) => {
    const option = pullOptions.find(o => o.count === count);
    return option?.finalCost || count * singlePullCost;
  }, [pullOptions, singlePullCost]);
  
  // Check if animation is currently showing
  const isAnimating = showSummonAnimation || showMultiSummonAnimation;

  // Effects
  useEffect(() => {
    const fetchBannerAndPricing = async () => {
      try {
        setLoading(true);
        // Fetch banner data, pricing, and tickets in parallel
        const [bannerData, pricingData, ticketsData] = await Promise.all([
          getBannerById(bannerId),
          getBannerPricing(bannerId),
          api.get('/banners/user/tickets').then(res => res.data).catch(() => ({ rollTickets: 0, premiumTickets: 0 }))
        ]);
        setBanner(bannerData);
        setPricing(pricingData);
        setTickets(ticketsData);
      } catch (err) {
        setError(err.response?.data?.error || t('admin.failedLoadBanners'));
      } finally {
        setLoading(false);
      }
    };
    fetchBannerAndPricing();
  }, [bannerId, t]);

  
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

  // Handlers
  const handleRoll = async (useTicket = false, ticketType = 'roll') => {
    // Check if can afford
    if (useTicket) {
      if (ticketType === 'premium' && tickets.premiumTickets < 1) {
        setError('No premium tickets available');
        return;
      }
      if (ticketType === 'roll' && tickets.rollTickets < 1) {
        setError('No roll tickets available');
        return;
      }
    } else if (user?.points < singlePullCost) {
      setError(t('banner.notEnoughPoints', { count: 1, cost: singlePullCost }));
      return;
    }
    
    try {
      setIsRolling(true);
      setShowCard(false);
      setShowMultiResults(false);
      setError(null);
      setMultiRollResults([]);
      setRollCount(prev => prev + 1);
      
      // Call API with ticket params if using tickets
      const payload = useTicket ? { useTicket: true, ticketType } : {};
      const response = await api.post(`/banners/${bannerId}/roll`, payload);
      const result = response.data;
      const { character, updatedPoints, tickets: newTickets } = result;
      
      // Update points immediately from response
      if (updatedPoints !== undefined && user) {
        setUser({ ...user, points: updatedPoints });
      }
      
      // Update tickets if returned
      if (newTickets) {
        setTickets(newTickets);
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
      
      await fetchUserCollection();
    } catch (err) {
      setError(err.response?.data?.error || t('roll.failedRoll'));
      setIsRolling(false);
    }
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

  const handleMultiRoll = async (count, useTickets = false, ticketType = 'roll') => {
    // Check if can afford
    if (useTickets) {
      if (ticketType === 'premium' && tickets.premiumTickets < count) {
        setError(`Not enough premium tickets. Need ${count}, have ${tickets.premiumTickets}`);
        return;
      }
      if (ticketType === 'roll' && tickets.rollTickets < count) {
        setError(`Not enough roll tickets. Need ${count}, have ${tickets.rollTickets}`);
        return;
      }
    } else {
      const cost = getMultiPullCost(count);
      if (user?.points < cost) {
        setError(t('banner.notEnoughPoints', { count, cost }));
        return;
      }
    }
    
    try {
      setIsRolling(true);
      setShowCard(false);
      setShowMultiResults(false);
      setError(null);
      setRollCount(prev => prev + count);
      
      // Call API with ticket params if using tickets
      const payload = useTickets 
        ? { count, useTickets: true, ticketType } 
        : { count };
      const response = await api.post(`/banners/${bannerId}/roll-multi`, payload);
      const result = response.data;
      const { characters, updatedPoints, tickets: newTickets } = result;
      
      // Update points immediately from response
      if (updatedPoints !== undefined && user) {
        setUser({ ...user, points: updatedPoints });
      }
      
      // Update tickets if returned
      if (newTickets) {
        setTickets(newTickets);
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
      
      await fetchUserCollection();
    } catch (err) {
      setError(err.response?.data?.error || t('roll.failedMultiRoll'));
      setIsRolling(false);
    }
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
        <LoadingText>{t('banner.loadingBanner')}</LoadingText>
      </LoadingPage>
    );
  }

  // Error state
  if (!banner) {
    return (
      <ErrorPage>
        <ErrorBox>{t('banner.bannerNotFound')}</ErrorBox>
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack /> {t('banner.backToGacha')}
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
            <span>{t('banner.back')}</span>
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
              <CostBadge>{singlePullCost} {t('banner.ptsPerPull')}</CostBadge>
              <DateBadge>
                {banner.endDate 
                  ? `${t('common.ends')}: ${new Date(banner.endDate).toLocaleDateString()}`
                  : t('common.limitedTime')}
              </DateBadge>
            </BadgeRow>
          </HeroContent>
          
          {/* Featured Characters Preview */}
          {banner.Characters?.length > 0 && (
            <FeaturedSection>
              <FeaturedLabel>{t('banner.featuredCharacters')}</FeaturedLabel>
              <CharacterAvatars>
                {[...banner.Characters].sort((a, b) => {
                  const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
                  return (rarityOrder[a.rarity] ?? 5) - (rarityOrder[b.rarity] ?? 5);
                }).slice(0, 6).map(char => (
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
            <VideoCaption>{t('common.watchVideo')}</VideoCaption>
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
            <RarityLabel>{t('common.recent')}:</RarityLabel>
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
                      <span>🔍 {t('common.view')}</span>
                    </CardOverlay>
                    <CollectedBadge>✓ {t('common.collected')}</CollectedBadge>
                    {currentChar?.isBannerCharacter && <BannerCharBadge>★ {t('banner.bannerChar')}</BannerCharBadge>}
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
                
              ) : isRolling && skipAnimations ? (
                <LoadingState 
                  key="loading"
                  variants={motionVariants.fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Spinner size="56px" />
                  <LoadingStateText>{t('common.summoning')}</LoadingStateText>
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
                  <EmptyTitle>{t('banner.rollOn')} {banner.name}</EmptyTitle>
                  <EmptyText>{banner.series} {t('banner.specialBanner')}</EmptyText>
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
                  onClick={() => handleRoll(false)} 
                  disabled={isRolling || user?.points < singlePullCost}
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
                        onClick={() => handleMultiRoll(option.count, false)}
                        disabled={isRolling || !canAfford}
                        $canAfford={canAfford}
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
              
              {/* Ticket Section - Only show if user has tickets */}
              {(tickets.rollTickets > 0 || tickets.premiumTickets > 0) && (
                <TicketSection>
                  <TicketSectionHeader>
                    <TicketSectionTitle>🎟️ {t('common.tickets') || 'Your Tickets'}</TicketSectionTitle>
                    <TicketCounts>
                      {tickets.rollTickets > 0 && (
                        <TicketCount>
                          <span>🎟️</span>
                          <strong>{tickets.rollTickets}</strong>
                        </TicketCount>
                      )}
                      {tickets.premiumTickets > 0 && (
                        <TicketCount $premium>
                          <span>🌟</span>
                          <strong>{tickets.premiumTickets}</strong>
                        </TicketCount>
                      )}
                    </TicketCounts>
                  </TicketSectionHeader>
                  
                  <TicketButtonsGrid>
                    {tickets.rollTickets > 0 && (
                      <TicketPullButton
                        onClick={() => handleRoll(true, 'roll')}
                        disabled={isRolling}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon>🎟️</TicketButtonIcon>
                        <TicketButtonText>
                          <span>{t('common.use') || 'Use'} 1×</span>
                          <small>{t('common.rollTicket') || 'Roll Ticket'}</small>
                        </TicketButtonText>
                      </TicketPullButton>
                    )}
                    {tickets.premiumTickets > 0 && (
                      <PremiumPullButton
                        onClick={() => handleRoll(true, 'premium')}
                        disabled={isRolling}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon>🌟</TicketButtonIcon>
                        <TicketButtonText>
                          <span>{t('common.premium') || 'Premium'}</span>
                          <small>{t('common.guaranteedRare') || 'Rare+ Guaranteed!'}</small>
                        </TicketButtonText>
                      </PremiumPullButton>
                    )}
                    {tickets.rollTickets >= 10 && (
                      <TicketPullButton
                        onClick={() => handleMultiRoll(10, true, 'roll')}
                        disabled={isRolling}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon>🎟️</TicketButtonIcon>
                        <TicketButtonText>
                          <span>{t('common.use') || 'Use'} 10×</span>
                          <small>{t('common.rollTickets') || 'Roll Tickets'}</small>
                        </TicketButtonText>
                      </TicketPullButton>
                    )}
                    {tickets.premiumTickets >= 10 && (
                      <PremiumPullButton
                        onClick={() => handleMultiRoll(10, true, 'premium')}
                        disabled={isRolling}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon>🌟</TicketButtonIcon>
                        <TicketButtonText>
                          <span>10× {t('common.premium') || 'Premium'}</span>
                          <small>{t('common.allRarePlus') || 'All Rare+!'}</small>
                        </TicketButtonText>
                      </PremiumPullButton>
                    )}
                  </TicketButtonsGrid>
                </TicketSection>
              )}
              
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
                  <InfoBlockTitle>{t('common.aboutBanner')}</InfoBlockTitle>
                  <Text secondary>{banner.description || `${t('banner.specialBanner')} - ${banner.series}.`}</Text>
                  {banner.endDate && (
                    <InfoNote>{t('common.availableUntil')}: {new Date(banner.endDate).toLocaleDateString()}</InfoNote>
                  )}
                  <InfoNoteAccent>{t('common.pullCost')}: {singlePullCost} {t('common.points')}</InfoNoteAccent>
                </InfoBlock>
                
                {/* Drop Rates Section */}
                {pricing?.dropRates && (
                  <InfoBlock>
                    <InfoBlockTitle>{t('banner.dropRates') || 'Drop Rates'}</InfoBlockTitle>
                    <DropRatesContainer>
                      <DropRateSection>
                        <DropRateSectionTitle>
                          ⭐ {t('banner.bannerRates') || 'Banner Pool'} ({pricing.dropRates.bannerPullChance}%)
                        </DropRateSectionTitle>
                        <DropRateGrid>
                          {['legendary', 'epic', 'rare', 'uncommon', 'common'].map(rarity => (
                            <DropRateItem key={rarity} rarity={rarity}>
                              <RarityIcon rarity={rarity}>{rarityIcons[rarity]}</RarityIcon>
                              <DropRateLabel>{rarity}</DropRateLabel>
                              <DropRateValue rarity={rarity}>{pricing.dropRates.banner[rarity]}%</DropRateValue>
                            </DropRateItem>
                          ))}
                        </DropRateGrid>
                      </DropRateSection>
                      
                      <DropRateSection>
                        <DropRateSectionTitle>
                          📦 {t('banner.standardRates') || 'Standard Pool'} ({100 - pricing.dropRates.bannerPullChance}%)
                        </DropRateSectionTitle>
                        <DropRateGrid>
                          {['legendary', 'epic', 'rare', 'uncommon', 'common'].map(rarity => (
                            <DropRateItem key={rarity} rarity={rarity}>
                              <RarityIcon rarity={rarity}>{rarityIcons[rarity]}</RarityIcon>
                              <DropRateLabel>{rarity}</DropRateLabel>
                              <DropRateValue rarity={rarity}>{pricing.dropRates.standard[rarity]}%</DropRateValue>
                            </DropRateItem>
                          ))}
                        </DropRateGrid>
                      </DropRateSection>
                      
                      <DropRateSection $premium>
                        <DropRateSectionTitle>
                          🌟 {t('banner.premiumRates') || 'Premium Ticket'}
                        </DropRateSectionTitle>
                        <DropRateGrid>
                          {['legendary', 'epic', 'rare'].map(rarity => (
                            <DropRateItem key={rarity} rarity={rarity}>
                              <RarityIcon rarity={rarity}>{rarityIcons[rarity]}</RarityIcon>
                              <DropRateLabel>{rarity}</DropRateLabel>
                              <DropRateValue rarity={rarity}>{pricing.dropRates.premium[rarity]}%</DropRateValue>
                            </DropRateItem>
                          ))}
                        </DropRateGrid>
                        <PremiumNote>✨ {t('banner.guaranteedRare') || 'Guaranteed Rare or better!'}</PremiumNote>
                      </DropRateSection>
                      
                      <PityInfoBox>
                        <PityInfoTitle>🎯 {t('banner.pitySystem') || '10-Pull Pity'}</PityInfoTitle>
                        <PityInfoText>
                          {t('banner.pityDescription') || 'Every 10-pull guarantees at least one Rare or higher character!'}
                        </PityInfoText>
                      </PityInfoBox>
                    </DropRatesContainer>
                  </InfoBlock>
                )}
                
                <InfoBlock>
                  <InfoBlockTitle>{t('banner.featuredCharacters')}</InfoBlockTitle>
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
                          {isInCollection(char) && <OwnedLabel>✓ {t('common.owned')}</OwnedLabel>}
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
                  {t('common.rollNow')}
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

// Ticket Section
const TicketSection = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const TicketSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
`;

const TicketSectionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
`;

const TicketCounts = styled.div`
  display: flex;
  gap: 12px;
`;

const TicketCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${props => props.$premium ? '#ffc107' : '#e1bee7'};
  
  strong {
    font-size: 16px;
    font-weight: 800;
  }
`;

const TicketButtonsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
`;

const TicketPullButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.25), rgba(103, 58, 183, 0.2));
  border: 1px solid rgba(156, 39, 176, 0.4);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(156, 39, 176, 0.35), rgba(103, 58, 183, 0.3));
    border-color: rgba(186, 104, 200, 0.6);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 10px 12px;
  }
`;

const PremiumPullButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.25), rgba(255, 152, 0, 0.2));
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.15);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.35), rgba(255, 152, 0, 0.3));
    border-color: rgba(255, 215, 0, 0.7);
    box-shadow: 0 0 30px rgba(255, 193, 7, 0.25);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 10px 12px;
  }
`;

const TicketButtonIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`;

const TicketButtonText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  
  span {
    font-size: 14px;
    font-weight: 600;
    color: white;
  }
  
  small {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    span {
      font-size: 12px;
    }
    small {
      font-size: 10px;
    }
  }
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

// Drop Rates Styled Components
const DropRatesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const DropRateSection = styled.div`
  background: ${props => props.$premium 
    ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.05))'
    : theme.colors.glass};
  border: 1px solid ${props => props.$premium 
    ? 'rgba(255, 193, 7, 0.3)' 
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const DropRateSectionTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const DropRateGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

const DropRateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: ${theme.radius.md};
  border: 1px solid ${props => getRarityColor(props.rarity)}40;
`;

const RarityIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: ${props => getRarityColor(props.rarity)};
  font-size: 10px;
`;

const DropRateLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  text-transform: capitalize;
  color: ${theme.colors.textSecondary};
`;

const DropRateValue = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => getRarityColor(props.rarity)};
  margin-left: auto;
`;

const PremiumNote = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.warning};
  margin-top: ${theme.spacing.sm};
  text-align: center;
  font-weight: ${theme.fontWeights.medium};
`;

const PityInfoBox = styled.div`
  background: linear-gradient(135deg, rgba(88, 86, 214, 0.15), rgba(175, 82, 222, 0.1));
  border: 1px solid rgba(88, 86, 214, 0.3);
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  text-align: center;
`;

const PityInfoTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.accent};
  margin-bottom: ${theme.spacing.xs};
`;

const PityInfoText = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  line-height: ${theme.lineHeights.relaxed};
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
