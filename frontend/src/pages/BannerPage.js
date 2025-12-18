import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdCheckCircle, MdFastForward, MdArrowBack, MdInfo } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaPlay, FaPause, FaChevronRight, FaStar } from 'react-icons/fa';
import confetti from 'canvas-confetti';

// API & Context
import api, { getBannerById, rollOnBanner, multiRollOnBanner, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Shared Components
import { 
  rarityColors,
  cardVariants,
  cardVariantsFast,
  containerVariants,
  gridItemVariants,
  slideVariants,
  overlayVariants
} from '../components/Gacha';

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
  const currentCardVariants = skipAnimations ? cardVariantsFast : cardVariants;

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
        <Spinner />
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
    <PageWrapper bgImage={getBannerImage(banner.image)}>
      {/* Navigation */}
      <NavBar>
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack /> Back
        </BackButton>
        <NavStats>
          <StatChip><FaDice /> {rollCount} Pulls</StatChip>
          <PointsChip>🪙 {user?.points || 0}</PointsChip>
          <IconBtn onClick={() => setShowInfoPanel(true)}><MdInfo /></IconBtn>
        </NavStats>
      </NavBar>
      
      {/* Banner Hero */}
      <HeroSection>
        <HeroContent>
          <BannerTitle>{banner.name}</BannerTitle>
          <BannerSeries>{banner.series}</BannerSeries>
          {banner.description && <BannerDesc>{banner.description}</BannerDesc>}
          <BadgeRow>
            <CostBadge>{singlePullCost} pts/pull</CostBadge>
            <DateBadge>
              {banner.endDate 
                ? `Ends: ${new Date(banner.endDate).toLocaleDateString()}`
                : 'Limited-Time'}
            </DateBadge>
          </BadgeRow>
        </HeroContent>
        
        {/* Featured Characters */}
        {banner.Characters?.length > 0 && (
          <FeaturedSection>
            <FeaturedLabel>✦ Featured Characters</FeaturedLabel>
            <CharacterAvatars>
              {banner.Characters.slice(0, 6).map(char => (
                <Avatar
                  key={char.id}
                  rarity={char.rarity}
                  owned={isInCollection(char)}
                  onClick={() => openPreview({...char, isOwned: isInCollection(char)})}
                  whileHover={{ scale: 1.1 }}
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
          <ErrorAlert initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span>{error}</span>
            <CloseBtn onClick={() => setError(null)}>×</CloseBtn>
          </ErrorAlert>
        )}
      </AnimatePresence>
      
      {/* Rarity History */}
      {lastRarities.length > 0 && (
        <RarityTracker>
          <TrackerLabel>Recent:</TrackerLabel>
          <RarityBubbles>
            {lastRarities.map((rarity, i) => (
              <RarityDot key={i} rarity={rarity}>{rarityIcons[rarity]}</RarityDot>
            ))}
          </RarityBubbles>
        </RarityTracker>
      )}
      
      {/* Gacha Section */}
      <GachaSection>
        <ResultsArea>
          <AnimatePresence mode="wait">
            {showCard && !showMultiResults ? (
              <CharacterCard
                key="char"
                variants={currentCardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                rarity={currentChar?.rarity}
              >
                <CardMedia onClick={() => openPreview(currentChar)}>
                  <RarityGlow rarity={currentChar?.rarity} />
                  <CollectedTag>✓ Collected</CollectedTag>
                  {currentChar?.isBannerCharacter && <BannerTag>★ Banner</BannerTag>}
                  {isVideo(currentChar?.image) ? (
                    <CardVideo src={getImagePath(currentChar?.image)} autoPlay loop muted playsInline />
                  ) : (
                    <CardImage src={getImagePath(currentChar?.image)} alt={currentChar?.name} />
                  )}
                  <ZoomHint>🔍</ZoomHint>
                </CardMedia>
                <CardInfo>
                  <CharName>{currentChar?.name}</CharName>
                  <CharSeries>{currentChar?.series}</CharSeries>
                  <RarityBadge rarity={currentChar?.rarity}>
                    {rarityIcons[currentChar?.rarity]} {currentChar?.rarity}
                  </RarityBadge>
                </CardInfo>
                <CardActions>
                  <ActionBtn disabled><MdCheckCircle /> Collected</ActionBtn>
                  <ActionBtn primary onClick={handleRoll} disabled={isRolling || user?.points < singlePullCost}>
                    <MdReplay /> Roll Again
                  </ActionBtn>
                </CardActions>
              </CharacterCard>
              
            ) : showMultiResults ? (
              <MultiResultsPanel
                key="multi"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <MultiHeader>
                  <h2>{multiRollResults.length}× Pull • {banner.name}</h2>
                  <CloseMultiBtn onClick={() => setShowMultiResults(false)}>×</CloseMultiBtn>
                </MultiHeader>
                <MultiGrid>
                  {multiRollResults.map((char, i) => (
                    <MiniCard
                      key={i}
                      custom={i}
                      variants={gridItemVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover="hover"
                      rarity={char.rarity}
                      isBanner={char.isBannerCharacter}
                      onClick={() => openPreview({...char, isOwned: isInCollection(char)})}
                    >
                      <MiniMedia>
                        {isVideo(char.image) ? (
                          <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                        ) : (
                          <img src={getImagePath(char.image)} alt={char.name} />
                        )}
                        <MiniCollected>✓</MiniCollected>
                        {char.isBannerCharacter && <MiniBanner>★</MiniBanner>}
                      </MiniMedia>
                      <MiniInfo>
                        <MiniName>{char.name}</MiniName>
                        <MiniRarity rarity={char.rarity}>{rarityIcons[char.rarity]}</MiniRarity>
                      </MiniInfo>
                    </MiniCard>
                  ))}
                </MultiGrid>
              </MultiResultsPanel>
              
            ) : isRolling ? (
              <LoadingState key="loading" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <Spinner />
                <LoadingText>Summoning...</LoadingText>
              </LoadingState>
              
            ) : (
              <EmptyState key="empty" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <EmptyIcon>✨</EmptyIcon>
                <h3>Roll on {banner.name}</h3>
                <p>{banner.series} Special Banner</p>
              </EmptyState>
            )}
          </AnimatePresence>
        </ResultsArea>
        
        {/* Roll Controls */}
        <RollControls>
          <RollButton onClick={handleRoll} disabled={isRolling || user?.points < singlePullCost} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            {isRolling ? "Summoning..." : <>💫 Single Pull <Cost>({singlePullCost} pts)</Cost></>}
          </RollButton>
          <MultiRollButton onClick={() => setMultiPullMenuOpen(true)} disabled={isRolling || user?.points < singlePullCost} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            {isRolling ? "Summoning..." : <>🎯 Multi Pull <Cost>({multiPullCount}×)</Cost></>}
          </MultiRollButton>
        </RollControls>
        
        <RollHint>
          You can make up to <strong>{Math.floor((user?.points || 0) / singlePullCost)}</strong> pulls
        </RollHint>
        
        <FastModeBtn onClick={() => setSkipAnimations(!skipAnimations)} active={skipAnimations}>
          <MdFastForward /> {skipAnimations ? 'Fast Mode On' : 'Enable Fast Mode'}
        </FastModeBtn>
        
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
      </GachaSection>
      
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
          <InfoPanelBackdrop variants={overlayVariants} initial="hidden" animate="visible" exit="exit" onClick={() => setShowInfoPanel(false)}>
            <InfoPanel
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
            >
              <InfoHeader>
                <h2>{banner.name}</h2>
                <CloseBtn onClick={() => setShowInfoPanel(false)}>×</CloseBtn>
              </InfoHeader>
              <InfoContent>
                <InfoBlock>
                  <h3>About This Banner</h3>
                  <p>{banner.description || `Special banner featuring characters from ${banner.series}.`}</p>
                  {banner.endDate && <InfoNote>Available until: {new Date(banner.endDate).toLocaleDateString()}</InfoNote>}
                  <InfoNote accent>Pull cost: {singlePullCost} points</InfoNote>
                </InfoBlock>
                
                <InfoBlock>
                  <h3>Featured Characters</h3>
                  <FeaturedList>
                    {banner.Characters?.map(char => (
                      <FeaturedItem key={char.id} onClick={() => openPreview({...char, isOwned: isInCollection(char)})}>
                        <FeaturedThumb rarity={char.rarity}>
                          {isVideo(char.image) ? (
                            <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                          ) : (
                            <img src={getImagePath(char.image)} alt={char.name} />
                          )}
                        </FeaturedThumb>
                        <FeaturedInfo>
                          <div>{char.name}</div>
                          <FeaturedRarity rarity={char.rarity}>
                            {rarityIcons[char.rarity]} {char.rarity}
                          </FeaturedRarity>
                          {isInCollection(char) && <OwnedLabel>✓ Owned</OwnedLabel>}
                        </FeaturedInfo>
                        <FaChevronRight style={{ color: 'rgba(255,255,255,0.4)' }} />
                      </FeaturedItem>
                    ))}
                  </FeaturedList>
                </InfoBlock>
                
                <RollFromPanelBtn
                  onClick={() => { setShowInfoPanel(false); setTimeout(handleRoll, 300); }}
                  disabled={isRolling || user?.points < singlePullCost}
                >
                  Roll Now
                </RollFromPanelBtn>
              </InfoContent>
            </InfoPanel>
          </InfoPanelBackdrop>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(15, 23, 42, 0.95));
  color: white;
  padding: 20px;
  position: relative;
  
  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image: url(${p => p.bgImage});
    background-size: cover;
    background-position: center top;
    opacity: 0.25;
    z-index: -1;
  }
`;

const LoadingPage = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  gap: 20px;
`;

const ErrorPage = styled(LoadingPage)``;

const ErrorBox = styled.div`
  background: rgba(229, 57, 53, 0.9);
  padding: 16px 28px;
  border-radius: 12px;
  font-weight: 500;
`;

// Navigation
const NavBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const NavStats = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const BackButton = styled.button`
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 99px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover { background: rgba(0, 0, 0, 0.7); transform: translateX(-2px); }
`;

const StatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 500;
`;

const PointsChip = styled(StatChip)`
  background: linear-gradient(135deg, #6e48aa, #9e5594);
  font-weight: 700;
`;

const IconBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
  
  &:hover { background: rgba(255, 255, 255, 0.1); }
`;

// Hero Section
const HeroSection = styled.div`
  text-align: center;
  padding: 28px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const BannerTitle = styled.h1`
  font-size: 36px;
  margin: 0 0 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 480px) { font-size: 28px; }
`;

const BannerSeries = styled.h2`
  font-size: 18px;
  margin: 0 0 12px;
  color: #ffd700;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const BannerDesc = styled.p`
  font-size: 15px;
  margin: 0 0 16px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
`;

const BadgeRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const CostBadge = styled.div`
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.4);
  color: #ffd700;
  padding: 8px 16px;
  border-radius: 99px;
  font-weight: 700;
`;

const DateBadge = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 8px 16px;
  border-radius: 99px;
`;

// Featured Characters
const FeaturedSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const FeaturedLabel = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const CharacterAvatars = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const Avatar = styled(motion.div)`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid ${p => rarityColors[p.rarity] || '#555'};
  position: relative;
  
  img, video { width: 100%; height: 100%; object-fit: cover; }
  
  ${p => p.owned && `
    &::after {
      content: "";
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
    }
  `}
  
  &:hover { box-shadow: 0 0 15px ${p => rarityColors[p.rarity]}80; }
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
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  z-index: 2;
`;

const MoreAvatar = styled(motion.div)`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  
  &:hover { background: rgba(255, 255, 255, 0.15); }
`;

// Video Section
const VideoSection = styled.div`
  max-width: 800px;
  margin: 0 auto 28px;
`;

const VideoContainer = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
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
  cursor: pointer;
  transition: opacity 0.2s;
  
  svg { font-size: 48px; color: white; }
  
  &:hover { background: rgba(0, 0, 0, 0.5); }
`;

const VideoCaption = styled.div`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-top: 10px;
`;

// Error & Alerts
const ErrorAlert = styled(motion.div)`
  background: linear-gradient(135deg, #e53935, #c62828);
  padding: 14px 20px;
  border-radius: 12px;
  margin: 0 auto 20px;
  max-width: 600px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
`;

// Rarity Tracker
const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 20px;
  border-radius: 99px;
  margin-bottom: 20px;
  max-width: fit-content;
`;

const TrackerLabel = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
`;

const RarityBubbles = styled.div`
  display: flex;
  gap: 8px;
`;

const RarityDot = styled(motion.div)`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${p => rarityColors[p.rarity] || '#555'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  box-shadow: 0 2px 10px ${p => rarityColors[p.rarity]}60;
`;

// Gacha Section
const GachaSection = styled.section`
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const ResultsArea = styled.div`
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
`;

// Character Card
const CharacterCard = styled(motion.div)`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  max-width: 340px;
  border: 3px solid ${p => rarityColors[p.rarity] || '#ccc'};
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 0 30px ${p => rarityColors[p.rarity]}40;
`;

const CardMedia = styled.div`
  position: relative;
  height: 300px;
  cursor: pointer;
  overflow: hidden;
`;

const RarityGlow = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 100%, ${p => rarityColors[p.rarity]}50 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
  &:hover { transform: scale(1.05); }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CollectedTag = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  z-index: 5;
`;

const BannerTag = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #ffd700, #ff9500);
  color: white;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  z-index: 5;
`;

const ZoomHint = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.2s;
  ${CardMedia}:hover & { opacity: 1; }
`;

const CardInfo = styled.div`
  padding: 16px;
  position: relative;
  background: linear-gradient(to bottom, white, #fafafa);
`;

const CharName = styled.h2`
  margin: 0 0 4px;
  font-size: 20px;
  color: #1a1a2e;
  font-weight: 800;
`;

const CharSeries = styled.p`
  margin: 0;
  color: #666;
  font-size: 14px;
  font-style: italic;
`;

const RarityBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 16px;
  background: ${p => rarityColors[p.rarity]};
  color: white;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 3px 10px ${p => rarityColors[p.rarity]}60;
  z-index: 10;
`;

const CardActions = styled.div`
  display: flex;
  border-top: 1px solid #eee;
`;

const ActionBtn = styled(motion.button)`
  flex: 1;
  padding: 14px;
  border: none;
  font-size: 14px;
  font-weight: ${p => p.primary ? '700' : '500'};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  background: ${p => p.primary ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'white'};
  color: ${p => p.primary ? 'white' : '#555'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  &:first-child { border-right: 1px solid #eee; }
  &:disabled { opacity: 0.5; }
`;

// Multi Results
const MultiResultsPanel = styled(motion.div)`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 1000px;
  overflow: hidden;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
`;

const MultiHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4b6cb7, #182848);
  padding: 16px 24px;
  color: white;
  h2 { margin: 0; font-size: 18px; }
`;

const CloseMultiBtn = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  &:hover { background: rgba(255, 255, 255, 0.25); }
`;

const MultiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
`;

const MiniCard = styled(motion.div)`
  background: ${p => p.isBanner ? 'linear-gradient(to bottom, rgba(255, 215, 0, 0.08), white)' : 'white'};
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid ${p => p.isBanner ? '#ffd700' : rarityColors[p.rarity] || '#ddd'};
  cursor: pointer;
`;

const MiniMedia = styled.div`
  position: relative;
  height: 140px;
  overflow: hidden;
  img, video { width: 100%; height: 100%; object-fit: cover; }
`;

const MiniCollected = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
`;

const MiniBanner = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: linear-gradient(135deg, #ffd700, #ff9500);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const MiniInfo = styled.div`
  padding: 10px;
  position: relative;
`;

const MiniName = styled.h3`
  margin: 0;
  font-size: 13px;
  color: #1a1a2e;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MiniRarity = styled.div`
  position: absolute;
  top: -10px;
  right: 8px;
  background: ${p => rarityColors[p.rarity]};
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
`;

// Loading & Empty
const LoadingState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const Spinner = styled.div`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #9e5594;
  border-left-color: #6e48aa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const LoadingText = styled.p`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
`;

const EmptyState = styled(motion.div)`
  text-align: center;
  padding: 48px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  max-width: 350px;
  
  h3 { margin: 0 0 8px; font-size: 22px; }
  p { margin: 0; color: rgba(255, 255, 255, 0.6); }
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
`;

// Roll Controls
const RollControls = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 12px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const RollButton = styled(motion.button)`
  background: linear-gradient(135deg, #6e48aa, #9e5594);
  color: white;
  border: none;
  border-radius: 99px;
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 20px rgba(110, 72, 170, 0.4);
  
  &:disabled {
    background: linear-gradient(135deg, #4a5568, #2d3748);
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const MultiRollButton = styled(RollButton)`
  background: linear-gradient(135deg, #4b6cb7, #182848);
  box-shadow: 0 4px 20px rgba(75, 108, 183, 0.4);
`;

const Cost = styled.span`
  font-size: 13px;
  opacity: 0.8;
`;

const RollHint = styled.p`
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 0;
  strong { color: white; }
`;

const FastModeBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 16px auto 0;
  padding: 8px 16px;
  border-radius: 99px;
  border: none;
  background: ${p => p.active ? 'rgba(158, 85, 148, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${p => p.active ? '#9e5594' : 'rgba(255, 255, 255, 0.5)'};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover { background: rgba(158, 85, 148, 0.2); }
`;

// Info Panel
const InfoPanelBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
`;

const InfoPanel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 90%;
  max-width: 420px;
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
`;

const InfoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  
  h2 { margin: 0; font-size: 20px; }
`;

const InfoContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const InfoBlock = styled.div`
  margin-bottom: 28px;
  
  h3 {
    margin: 0 0 14px;
    font-size: 16px;
    color: #9e5594;
    padding-bottom: 10px;
    border-bottom: 2px solid rgba(158, 85, 148, 0.3);
  }
  
  p {
    margin: 0 0 14px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
  }
`;

const InfoNote = styled.div`
  padding: 12px;
  background: ${p => p.accent ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 0, 0, 0.2)'};
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 10px;
  ${p => p.accent && `border: 1px solid rgba(255, 215, 0, 0.2);`}
`;

const FeaturedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FeaturedItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover { background: rgba(255, 255, 255, 0.1); }
`;

const FeaturedThumb = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid ${p => rarityColors[p.rarity] || '#555'};
  flex-shrink: 0;
  
  img, video { width: 100%; height: 100%; object-fit: cover; }
`;

const FeaturedInfo = styled.div`
  flex: 1;
  min-width: 0;
  
  > div:first-child {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const FeaturedRarity = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 99px;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  color: ${p => rarityColors[p.rarity] || '#999'};
  text-transform: capitalize;
`;

const OwnedLabel = styled.div`
  font-size: 12px;
  color: #10b981;
  margin-top: 4px;
`;

const RollFromPanelBtn = styled(motion.button)`
  width: 100%;
  background: linear-gradient(135deg, #6e48aa, #9e5594);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 20px;
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export default BannerPage;
