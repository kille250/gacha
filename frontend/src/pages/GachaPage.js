import React, { useState, useContext, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdReplay, MdCheckCircle, MdFastForward, MdHelp } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaArrowRight, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

// API & Context
import api, { rollCharacter, getActiveBanners, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Shared Components
import { 
  theme, 
  rarityColors,
  cardVariants,
  cardVariantsFast,
  containerVariants,
  modalVariants,
  overlayVariants,
  gridItemVariants
} from '../components/Gacha';

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
  const currentCardVariants = skipAnimations ? cardVariantsFast : cardVariants;
  
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
    <PageWrapper>
      <Container>
        {/* Header */}
        <Header>
          <Logo>
            <span>Gacha</span>
            <LogoHighlight>Master</LogoHighlight>
          </Logo>
          <HeaderStats>
            <StatChip><FaDice /> {rollCount} Rolls</StatChip>
            <PointsChip>🪙 {user?.points || 0}</PointsChip>
            <IconBtn onClick={() => setShowHelpModal(true)}><MdHelp /></IconBtn>
          </HeaderStats>
        </Header>
        
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <ErrorAlert
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>{error}</span>
              <CloseBtn onClick={() => setError(null)}>×</CloseBtn>
            </ErrorAlert>
          )}
        </AnimatePresence>
        
        {/* Main Content */}
        <MainGrid>
          {/* Gacha Section */}
          <GachaSection>
            <SectionHeader>
              <SectionIcon>🎲</SectionIcon>
              <SectionTitle>Standard Gacha</SectionTitle>
            </SectionHeader>
            
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
            
            {/* Results Display */}
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
                    <CardMedia onClick={() => openPreview({...currentChar, isVideo: isVideo(currentChar.image)})}>
                      <RarityGlow rarity={currentChar?.rarity} />
                      <CollectedTag>✓ Collected</CollectedTag>
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
                      <ActionBtn primary onClick={handleRoll} disabled={isRolling || user?.points < SINGLE_PULL_COST}>
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
                      <h2>{multiRollResults.length}× Pull Results</h2>
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
                          onClick={() => openPreview({...char, isVideo: isVideo(char.image)})}
                        >
                          <MiniMedia>
                            {isVideo(char.image) ? (
                              <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                            ) : (
                              <img src={getImagePath(char.image)} alt={char.name} />
                            )}
                            <MiniCollected>✓</MiniCollected>
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
                    <h3>Roll to Discover Characters!</h3>
                    <p>Try your luck and build your collection</p>
                  </EmptyState>
                )}
              </AnimatePresence>
            </ResultsArea>
            
            {/* Roll Controls */}
            <RollControls>
              <RollButton onClick={handleRoll} disabled={isRolling || user?.points < SINGLE_PULL_COST} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {isRolling ? "Summoning..." : <>💫 Single Pull <Cost>(100 pts)</Cost></>}
              </RollButton>
              <MultiRollButton onClick={() => setMultiPullMenuOpen(true)} disabled={isRolling || user?.points < SINGLE_PULL_COST} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {isRolling ? "Summoning..." : <>🎯 Multi Pull <Cost>({multiPullCount}×)</Cost></>}
              </MultiRollButton>
            </RollControls>
            
            <RollHint>
              You can make up to <strong>{Math.floor((user?.points || 0) / SINGLE_PULL_COST)}</strong> pulls
            </RollHint>
            
            <FastModeBtn onClick={() => setSkipAnimations(!skipAnimations)} active={skipAnimations}>
              <MdFastForward /> {skipAnimations ? 'Fast Mode On' : 'Enable Fast Mode'}
            </FastModeBtn>
            
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
          </GachaSection>
          
          {/* Banners Section */}
          <BannersSection>
            <SectionHeader>
              <SectionIcon>🏆</SectionIcon>
              <SectionTitle>Special Banners</SectionTitle>
            </SectionHeader>
            
            {banners.length > 0 ? (
              <BannersList>
                {banners.map(banner => (
                  <BannerCard
                    key={banner.id}
                    featured={banner.featured}
                    onClick={() => navigate(`/banner/${banner.id}`)}
                    whileHover={{ y: -4 }}
                  >
                    <BannerImage src={getBannerImage(banner.image)} alt={banner.name} />
                    <BannerInfo>
                      <BannerName>{banner.name}</BannerName>
                      <BannerSeries>{banner.series}</BannerSeries>
                      {banner.endDate && <BannerDate>Ends: {new Date(banner.endDate).toLocaleDateString()}</BannerDate>}
                      <BannerCost>{Math.floor(100 * (banner.costMultiplier || 1.5))} pts/pull</BannerCost>
                      <ViewBannerBtn>Roll on Banner <FaArrowRight /></ViewBannerBtn>
                    </BannerInfo>
                    {banner.featured && <FeaturedTag>Featured</FeaturedTag>}
                  </BannerCard>
                ))}
              </BannersList>
            ) : (
              <NoBanners>No special banners available</NoBanners>
            )}
          </BannersSection>
        </MainGrid>
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
          <ModalBackdrop variants={overlayVariants} initial="hidden" animate="visible" exit="exit" onClick={() => setShowHelpModal(false)}>
            <HelpModal variants={modalVariants} onClick={e => e.stopPropagation()}>
              <ModalHeader><h2>How to Play</h2><CloseBtn onClick={() => setShowHelpModal(false)}>×</CloseBtn></ModalHeader>
              <ModalContent>
                <HelpSection>
                  <h3>Getting Started</h3>
                  <ul>
                    <li>Single Pull costs 100 points</li>
                    <li>Multi Pulls: 5% off for 5+, 10% off for 10+</li>
                    <li>Special banners have unique characters</li>
                  </ul>
                </HelpSection>
                <HelpSection>
                  <h3>Rarities</h3>
                  <RarityList>
                    {Object.entries(rarityColors).map(([r, c]) => (
                      <RarityItem key={r}><RarityDot rarity={r}>{rarityIcons[r]}</RarityDot>{r}</RarityItem>
                    ))}
                  </RarityList>
                </HelpSection>
              </ModalContent>
            </HelpModal>
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

// ==================== STYLED COMPONENTS ====================

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: white;
  
  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at 20% 0%, rgba(110, 72, 170, 0.15), transparent 50%),
                radial-gradient(ellipse at 80% 100%, rgba(158, 85, 148, 0.1), transparent 50%);
    pointer-events: none;
  }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const Logo = styled.div`
  font-size: 28px;
  font-weight: 800;
  display: flex;
  gap: 8px;
`;

const LogoHighlight = styled.span`
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeaderStats = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
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

const ErrorAlert = styled(motion.div)`
  background: linear-gradient(135deg, #e53935, #c62828);
  padding: 14px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
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

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const GachaSection = styled.section`
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 28px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const SectionIcon = styled.span`
  font-size: 28px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
`;

const RarityTracker = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px 20px;
  border-radius: 99px;
  margin-bottom: 20px;
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

const ResultsArea = styled.div`
  min-height: 400px;
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
  height: 280px;
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
  max-width: 900px;
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
  h2 { margin: 0; font-size: 20px; }
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
`;

const MiniCard = styled(motion.div)`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid ${p => rarityColors[p.rarity] || '#ddd'};
  cursor: pointer;
`;

const MiniMedia = styled.div`
  position: relative;
  height: 120px;
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

// Banners Section
const BannersSection = styled.section`
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 24px;
  max-height: 800px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const BannersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 8px;
  
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(158, 85, 148, 0.5); border-radius: 3px; }
`;

const BannerCard = styled(motion.div)`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: ${p => p.featured ? '2px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.08)'};
  position: relative;
`;

const BannerImage = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
`;

const BannerInfo = styled.div`
  padding: 14px;
`;

const BannerName = styled.h3`
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
`;

const BannerSeries = styled.div`
  color: #ffd700;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
`;

const BannerDate = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
`;

const BannerCost = styled.div`
  font-size: 13px;
  margin-bottom: 12px;
`;

const ViewBannerBtn = styled.button`
  background: linear-gradient(135deg, rgba(110, 72, 170, 0.4), rgba(158, 85, 148, 0.4));
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  padding: 8px 14px;
  border-radius: 99px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  
  &:hover { background: linear-gradient(135deg, rgba(110, 72, 170, 0.6), rgba(158, 85, 148, 0.6)); }
`;

const FeaturedTag = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: linear-gradient(135deg, #ffd700, #ff9500);
  color: white;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
`;

const NoBanners = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 40px;
`;

// Modal
const ModalBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
`;

const HelpModal = styled(motion.div)`
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border-radius: 16px;
  width: 100%;
  max-width: 450px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  h2 { margin: 0; font-size: 20px; }
`;

const ModalContent = styled.div`
  padding: 20px;
`;

const HelpSection = styled.div`
  margin-bottom: 24px;
  
  h3 { margin: 0 0 12px; font-size: 16px; color: #9e5594; }
  ul { margin: 0; padding-left: 20px; li { margin-bottom: 8px; color: rgba(255, 255, 255, 0.8); } }
`;

const RarityList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const RarityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: capitalize;
  font-size: 14px;
`;

export default GachaPage;
