import {
	LoadingContainer, SpinnerContainer, Spinner, LoadingText,
	ErrorMessage, PointsCounter, CoinIcon, PointsAmount,
	RarityHistoryBar, HistoryLabel, RarityList, RarityBubble,
	GachaSection, CharacterCard, CardImageContainer, RarityGlow,
	CollectionBadge, CardImage, ZoomIconOverlay, ZoomIcon,
	CardContent, CharName, CharSeries, RarityBadge, CardActions,
	ActionButton, MultiRollSection, MultiRollHeader, MultiRollCloseButton,
	MultiCharactersGrid, MultiCardImageContainer, RarityGlowMulti,
	CollectionBadgeMini, MultiCardImage, MultiCardContent, MultiCharName,
	MultiRarityBadge, MultiCardClaimButton, EmptyState, EmptyStateIcon,
	RollButtonsContainer, RollButton, RollCost, MultiPullContainer,
	MultiRollButton, MultiPullMenu, ClosePullMenuButton, MultiPullAdjuster,
	AdjustButton, PullCountDisplay, PullSlider, DiscountInfo, ConfirmButton,
	RollHint, rarityColors
  } from '../components/GachaStyles';
import axios from 'axios';
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getBannerById, rollOnBanner, multiRollOnBanner, claimCharacter } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { MdReplay, MdFavorite, MdStars, MdLocalFireDepartment, MdCheckCircle, MdFastForward, MdAdd, MdRemove, MdClose, MdArrowBack } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaPlay, FaPause } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';


const rarityIcons = {
  common: <FaDice />,
  uncommon: <MdStars />,
  rare: <FaGem />,
  epic: <MdLocalFireDepartment />,
  legendary: <FaTrophy />
};

const BannerPage = () => {
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  
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
  const [showSettings, setShowSettings] = useState(false);
  const [multiPullCount, setMultiPullCount] = useState(10);
  const [multiPullMenuOpen, setMultiPullMenuOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Calculate cost based on banner's multiplier
  const calculateSinglePullCost = useCallback(() => {
    if (!banner) return 100;
    return Math.floor(100 * (banner.costMultiplier || 1.5));
  }, [banner]);
  
  // Calculate multi-pull cost with discount
  const calculateMultiPullCost = useCallback((count) => {
    if (!banner) return count * 100;
    
    const baseCost = count * calculateSinglePullCost();
    let discount = 0;
    if (count >= 10) discount = 0.1;
    else if (count >= 5) discount = 0.05;
    return Math.floor(baseCost * (1 - discount));
  }, [banner, calculateSinglePullCost]);
  
  // Calculate max possible pulls
  const maxPossiblePulls = useCallback(() => {
    const singlePullCost = calculateSinglePullCost();
    return Math.max(1, Math.min(10, Math.floor((user?.points || 0) / singlePullCost)));
  }, [user?.points, calculateSinglePullCost]);
  
  // Update costs when banner changes
  const currentMultiPullCost = useCallback(() => {
    return calculateMultiPullCost(multiPullCount);
  }, [calculateMultiPullCost, multiPullCount]);
  
  // Fetch banner data
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
  
  // Update possible pull count when user points change
  useEffect(() => {
    if (multiPullCount > maxPossiblePulls()) {
      setMultiPullCount(Math.max(1, maxPossiblePulls()));
    }
  }, [user?.points, maxPossiblePulls, multiPullCount]);
  
  // Handle clicks outside of multi-pull menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (multiPullMenuOpen && !event.target.closest('.multi-pull-container')) {
        setMultiPullMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [multiPullMenuOpen]);
  
  // Refresh user data and fetch collection
  useEffect(() => {
    refreshUser();
    fetchUserCollection();
  }, [refreshUser]);
  
  const fetchUserCollection = async () => {
    try {
      const response = await axios.get('https://gachaapi.solidbooru.online/api/characters/collection', {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setUserCollection(response.data);
    } catch (err) {
      console.error("Error fetching user collection:", err);
    }
  };
  
  const isCharacterInCollection = useCallback((character) => {
    return userCollection.some(char => char.id === character.id);
  }, [userCollection]);
  
  const showRarePullEffect = useCallback((rarity) => {
    if (['legendary', 'epic'].includes(rarity)) {
      confetti({
        particleCount: rarity === 'legendary' ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [rarityColors[rarity], '#ffffff', '#gold']
      });
    }
  }, []);
  
  // Show confetti effect for rare pulls
  useEffect(() => {
    if (currentChar && !skipAnimations) {
      showRarePullEffect(currentChar.rarity);
    }
  }, [currentChar, skipAnimations, showRarePullEffect]);
  
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
          // Roll on banner instead of standard gacha
          const result = await rollOnBanner(bannerId);
          setCurrentChar(result.character);
          setShowCard(true);
          setLastRarities(prev => [result.character.rarity, ...prev.slice(0, 4)]);
          await refreshUser();
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
    const cost = currentMultiPullCost();
    
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
          
          // Find best rarity
          const bestRarity = findBestRarity(result.characters);
          setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
          
          if (result.characters.some(char => ['rare', 'epic', 'legendary'].includes(char.rarity)) && !skipAnimations) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          }
          
          await refreshUser();
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
  
  const adjustMultiPullCount = (amount) => {
    const newCount = multiPullCount + amount;
    if (newCount >= 1 && newCount <= maxPossiblePulls()) {
      setMultiPullCount(newCount);
    }
  };
  
  const findBestRarity = (characters) => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    return characters.reduce((best, char) => {
      const currentIndex = rarityOrder.indexOf(char.rarity);
      return currentIndex > rarityOrder.indexOf(best) ? char.rarity : best;
    }, 'common');
  };
  
  const handleClaim = async (characterId) => {
    try {
      await claimCharacter(characterId);
      confetti({ particleCount: 50, spread: 30, origin: { y: 0.7 }, colors: ['#1abc9c', '#3498db', '#2ecc71'] });
      await refreshUser();
      await fetchUserCollection();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to claim character');
    }
  };
  
  const getImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/300?text=No+Image';
    if (imageSrc.startsWith('http')) return imageSrc;
    if (imageSrc.startsWith('/uploads')) return `https://gachaapi.solidbooru.online${imageSrc}`;
    if (imageSrc.startsWith('image-')) return `https://gachaapi.solidbooru.online/uploads/characters/${imageSrc}`;
    return imageSrc.includes('/') ? imageSrc : `/images/characters/${imageSrc}`;
  };
  
  const getBannerImagePath = (imageSrc) => {
    if (!imageSrc) return 'https://via.placeholder.com/1200x400?text=Banner';
    if (imageSrc.startsWith('http')) return imageSrc;
    if (imageSrc.startsWith('/uploads')) return `https://gachaapi.solidbooru.online${imageSrc}`;
    return `/images/banners/${imageSrc}`;
  };
  
  const getVideoPath = (videoSrc) => {
    if (!videoSrc) return null;
    if (videoSrc.startsWith('http')) return videoSrc;
    if (videoSrc.startsWith('/uploads')) return `https://gachaapi.solidbooru.online${videoSrc}`;
    return `/videos/${videoSrc}`;
  };
  
  const toggleSkipAnimations = () => setSkipAnimations(prev => !prev);
  const toggleMultiPullMenu = () => setMultiPullMenuOpen(prev => !prev);
  
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
    setIsVideoPlaying(!isVideoPlaying);
    
    const video = document.getElementById('banner-video');
    if (video) {
      if (isVideoPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  };
  
  // Handle video ended event
  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
  };
  
  if (loading) {
    return (
      <LoadingContainer>
        <SpinnerContainer>
          <Spinner />
        </SpinnerContainer>
        <LoadingText>Loading banner...</LoadingText>
      </LoadingContainer>
    );
  }
  
  if (!banner) {
    return (
      <ErrorContainer>
        <ErrorMessage>Banner not found or has expired</ErrorMessage>
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack /> Back to Gacha
        </BackButton>
      </ErrorContainer>
    );
  }
  
  // Calculate single and multi pull costs
  const singlePullCost = calculateSinglePullCost();
  const multiPullCostValue = currentMultiPullCost();
  
  return (
    <BannerContainer backgroundImage={getBannerImagePath(banner.image)}>
      <NavBar>
        <BackButton onClick={() => navigate('/gacha')}>
          <MdArrowBack /> Back
        </BackButton>
        
        <PointsCounter>
          <CoinIcon>🪙</CoinIcon> 
          <PointsAmount>{user?.points || 0}</PointsAmount>
        </PointsCounter>
      </NavBar>
      
      <BannerHero>
        <BannerTitle>{banner.name}</BannerTitle>
        <BannerSeries>{banner.series}</BannerSeries>
        
        {banner.description && (
          <BannerDescription>{banner.description}</BannerDescription>
        )}
        
        <PullCost>
          <CostBadge>{singlePullCost} points per pull</CostBadge>
          <DateBadge>
            {banner.endDate ? (
              `Ends: ${new Date(banner.endDate).toLocaleDateString()}`
            ) : (
              'Limited-Time Banner'
            )}
          </DateBadge>
        </PullCost>
        
        {banner.Characters && banner.Characters.length > 0 && (
          <FeaturedCharacters>
            <FeaturedLabel>Featured Characters</FeaturedLabel>
            <CharacterAvatars>
              {banner.Characters.slice(0, 6).map(char => (
                <CharacterAvatar 
                  key={char.id} 
                  rarity={char.rarity}
                  onClick={() => openPreview({...char, isOwned: isCharacterInCollection(char)})}
                >
                  <img src={getImagePath(char.image)} alt={char.name} />
                </CharacterAvatar>
              ))}
              {banner.Characters.length > 6 && (
                <MoreCharacters>+{banner.Characters.length - 6} more</MoreCharacters>
              )}
            </CharacterAvatars>
          </FeaturedCharacters>
        )}
        
        {banner.videoUrl && (
          <VideoSection>
            <VideoContainer>
              <BannerVideo 
                id="banner-video"
                src={getVideoPath(banner.videoUrl)}
                poster={getBannerImagePath(banner.image)}
                onEnded={handleVideoEnded}
              />
              <VideoControls onClick={toggleVideoPlay}>
                {isVideoPlaying ? <FaPause /> : <FaPlay />}
              </VideoControls>
            </VideoContainer>
            <VideoCaption>Watch Promotional Video</VideoCaption>
          </VideoSection>
        )}
      </BannerHero>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <RarityHistoryBar>
        {lastRarities.length > 0 && (
          <>
            <HistoryLabel>Recent banner pulls:</HistoryLabel>
            <RarityList>
              {lastRarities.map((rarity, index) => (
                <RarityBubble 
                  key={index} 
                  rarity={rarity}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {rarityIcons[rarity] || rarityIcons.common}
                </RarityBubble>
              ))}
            </RarityList>
          </>
        )}
      </RarityHistoryBar>
      
      <GachaSection>
        <AnimatePresence mode="wait">
          {showCard && !showMultiResults ? (
            <CharacterCard
              key="character"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: skipAnimations ? 0.2 : 0.4, type: "spring", stiffness: 70 }}
              rarity={currentChar?.rarity}
              whileHover={{ scale: 1.03 }}
              isBannerCharacter={currentChar?.isBannerCharacter}
            >
              <CardImageContainer>
                <RarityGlow rarity={currentChar?.rarity} />
                {isCharacterInCollection(currentChar) && <CollectionBadge>In Collection</CollectionBadge>}
                {currentChar?.isBannerCharacter && <BannerBadge>Banner Character</BannerBadge>}
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
                <ZoomIconOverlay>
                  <ZoomIcon>🔍</ZoomIcon>
                </ZoomIconOverlay>
              </CardImageContainer>
              
              <CardContent>
                <CharName>{currentChar?.name}</CharName>
                <CharSeries>{currentChar?.series}</CharSeries>
                <RarityBadge rarity={currentChar?.rarity}>
                  {rarityIcons[currentChar?.rarity]} {currentChar?.rarity}
                </RarityBadge>
              </CardContent>
              
              <CardActions>
                <ActionButton 
                  onClick={() => handleClaim(currentChar.id)} 
                  disabled={!currentChar || isCharacterInCollection(currentChar)}
                  primary={!isCharacterInCollection(currentChar)}
                  owned={isCharacterInCollection(currentChar)}
                  whileHover={{ scale: isCharacterInCollection(currentChar) ? 1.0 : 1.05 }}
                  whileTap={{ scale: isCharacterInCollection(currentChar) ? 1.0 : 0.95 }}
                >
                  {isCharacterInCollection(currentChar) ? (
                    <><MdCheckCircle /> Already Owned</>
                  ) : (
                    <><MdFavorite /> Claim</>
                  )}
                </ActionButton>
                <ActionButton 
                  onClick={handleRoll} 
                  disabled={isRolling || (user?.points < singlePullCost)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MdReplay /> Roll Again
                </ActionButton>
              </CardActions>
            </CharacterCard>
          ) : showMultiResults ? (
            <MultiRollSection
              key="multiResults"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MultiRollHeader>
                <h2>{multiRollResults.length}× Roll Results • {banner.name}</h2>
                <MultiRollCloseButton onClick={() => setShowMultiResults(false)}>×</MultiRollCloseButton>
              </MultiRollHeader>
              
              <MultiCharactersGrid>
                {multiRollResults.map((character, index) => (
                  <MultiCharacterCard 
                    key={index}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: skipAnimations ? 0 : index * 0.05 }}
                    rarity={character.rarity}
                    isBannerCharacter={character.isBannerCharacter}
                    whileHover={{ scale: 1.05, zIndex: 5 }}
                  >
                    <MultiCardImageContainer onClick={() => openPreview({...character, isOwned: isCharacterInCollection(character)})}>
                      <RarityGlowMulti rarity={character.rarity} />
                      {isCharacterInCollection(character) && <CollectionBadgeMini>✓</CollectionBadgeMini>}
                      {character.isBannerCharacter && <BannerBadgeMini>★</BannerBadgeMini>}
                      <MultiCardImage 
                        src={getImagePath(character.image)} 
                        alt={character.name}
                        onError={(e) => {
                          if (!e.target.src.includes('placeholder.com')) {
                            e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                          }
                        }}
                      />
                    </MultiCardImageContainer>
                    
                    <MultiCardContent>
                      <MultiCharName>{character.name}</MultiCharName>
                      <MultiRarityBadge rarity={character.rarity}>
                        {rarityIcons[character.rarity]} {character.rarity}
                      </MultiRarityBadge>
                    </MultiCardContent>
                    
                    <MultiCardClaimButton
                      disabled={isCharacterInCollection(character)} 
                      onClick={() => handleClaim(character.id)}
                      owned={isCharacterInCollection(character)}
                      whileHover={isCharacterInCollection(character) ? {} : { scale: 1.05 }}
                    >
                      {isCharacterInCollection(character) ? "Owned" : "Claim"}
                    </MultiCardClaimButton>
                  </MultiCharacterCard>
                ))}
              </MultiCharactersGrid>
            </MultiRollSection>
          ) : isRolling ? (
            <LoadingContainer
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SpinnerContainer>
                <Spinner />
              </SpinnerContainer>
              <LoadingText>Summoning character{multiRollResults.length > 0 ? 's' : ''}...</LoadingText>
            </LoadingContainer>
          ) : (
            <EmptyState
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EmptyStateIcon>✨</EmptyStateIcon>
              <h3>Roll on {banner.name}</h3>
              <p>A special banner featuring {banner.series} characters</p>
            </EmptyState>
          )}
        </AnimatePresence>
        
        <RollButtonsContainer>
          <RollButton 
            onClick={handleRoll} 
            disabled={isRolling || (user?.points < singlePullCost)}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(110, 72, 170, 0.5)" }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isRolling ? 
              "Summoning..." : 
              <>💫 Single Pull <RollCost>({singlePullCost} pts)</RollCost></>
            }
          </RollButton>
          
          <MultiPullContainer className="multi-pull-container">
            <MultiRollButton 
              onClick={multiPullMenuOpen ? handleMultiRoll : toggleMultiPullMenu}
              disabled={isRolling || (user?.points < singlePullCost)}
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(110, 72, 170, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              active={multiPullMenuOpen}
            >
              {isRolling ? "Summoning..." : (
                <>
                  🎯 {multiPullCount}× Pull{" "}
                  <RollCost>
                    ({multiPullCostValue} pts
                    {multiPullCount >= 10 ? " • 10% OFF" : multiPullCount >= 5 ? " • 5% OFF" : ""})
                  </RollCost>
                </>
              )}
            </MultiRollButton>
            
            <AnimatePresence>
              {multiPullMenuOpen && (
                <MultiPullMenu
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <ClosePullMenuButton onClick={toggleMultiPullMenu}>
                    <MdClose />
                  </ClosePullMenuButton>
                  
                  <MultiPullAdjuster>
                    <AdjustButton 
                      onClick={() => adjustMultiPullCount(-1)}
                      disabled={multiPullCount <= 1}
                    >
                      <MdRemove />
                    </AdjustButton>
                    <PullCountDisplay>{multiPullCount}</PullCountDisplay>
                    <AdjustButton 
                      onClick={() => adjustMultiPullCount(1)}
                      disabled={multiPullCount >= maxPossiblePulls()}
                    >
                      <MdAdd />
                    </AdjustButton>
                  </MultiPullAdjuster>
                  
                  <PullSlider 
                    type="range" 
                    min="1" 
                    max={maxPossiblePulls() || 1}
                    value={multiPullCount}
                    onChange={(e) => setMultiPullCount(parseInt(e.target.value))}
                  />
                  
                  <DiscountInfo>
                    {multiPullCount >= 10 ? (
                      <strong>10% discount applied!</strong>
                    ) : multiPullCount >= 5 ? (
                      <span>5% discount applied</span>
                    ) : multiPullCount > 1 ? (
                      <span>Pull 5+ for 5% discount</span>
                    ) : (
                      <span>Increase count for discounts</span>
                    )}
                  </DiscountInfo>
                  
                  <ConfirmButton 
                    onClick={handleMultiRoll}
                    disabled={user?.points < multiPullCostValue}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Pull {multiPullCount} for {multiPullCostValue} points
                  </ConfirmButton>
                </MultiPullMenu>
              )}
            </AnimatePresence>
          </MultiPullContainer>
        </RollButtonsContainer>
        
        <RollHint>
          You have enough points for <strong>{Math.floor((user?.points || 0) / singlePullCost)}</strong> single pulls
          {maxPossiblePulls() > 1 && ` or up to a ${maxPossiblePulls()}× multi-pull`}
        </RollHint>
        
        <SettingsButton onClick={toggleSkipAnimations}>
          {skipAnimations ? (
            <><MdFastForward /> Fast Mode On</>
          ) : (
            <><MdFastForward style={{ opacity: 0.5 }} /> Animation Mode</>
          )}
        </SettingsButton>
      </GachaSection>
      
      <ImagePreviewModal 
        isOpen={previewOpen}
        onClose={closePreview}
        image={previewChar ? getImagePath(previewChar.image) : ''}
        name={previewChar?.name || ''}
        series={previewChar?.series || ''}
        rarity={previewChar?.rarity || 'common'}
        isOwned={previewChar ? isCharacterInCollection(previewChar) : false}
        isBannerCharacter={previewChar?.isBannerCharacter}
        onClaim={previewChar && !isCharacterInCollection(previewChar) ? 
          () => handleClaim(previewChar.id) : undefined}
      />
    </BannerContainer>
  );
};

// Styled components (use most of them from GachaPage but add these new styles)

const BannerContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(20, 30, 48, 0.9) 60%,
    rgba(20, 30, 48, 1) 100%
  );
  background-size: cover;
  background-position: center top;
  background-attachment: fixed;
  position: relative;
  padding: 20px;
  
  &::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url(${props => props.backgroundImage});
    background-size: cover;
    background-position: center top;
    opacity: 0.3;
    z-index: -1;
  }
`;

const NavBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const BackButton = styled.button`
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
  }
`;

const BannerHero = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const BannerTitle = styled.h1`
  font-size: 32px;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 480px) {
    font-size: 24px;
  }
`;

const BannerSeries = styled.h2`
  font-size: 18px;
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
  
  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const PullCost = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 10px;
  }
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

const FeaturedCharacters = styled.div`
  margin: 20px auto;
  max-width: 800px;
`;

const FeaturedLabel = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const CharacterAvatars = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const CharacterAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => rarityColors[props.rarity]};
  transition: all 0.2s;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 15px ${props => rarityColors[props.rarity]};
  }
  
  @media (max-width: 480px) {
    width: 50px;
    height: 50px;
  }
`;

const MoreCharacters = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 12px;
  font-weight: bold;
  
  @media (max-width: 480px) {
    width: 50px;
    height: 50px;
    font-size: 10px;
  }
`;

const VideoSection = styled.div`
  margin: 20px auto;
  max-width: 600px;
`;

const VideoContainer = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
`;

const BannerVideo = styled.video`
  width: 100%;
  display: block;
`;

const VideoControls = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

const BannerBadge = styled.div`
  position: absolute;
  right: 10px;
  top: 10px;
  background: linear-gradient(135deg, #ffd700, #ff9500);
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 30px;
  z-index: 5;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 5px;
  
  &::before {
    content: "★";
    font-size: 14px;
  }
`;

const BannerBadgeMini = styled.div`
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
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

const MultiCharacterCard = styled(motion.div)`
  /* Add special border for banner characters in multi-roll view */
  border: ${props => props.isBannerCharacter ? 
    `2px solid #ffd700` : 
    `2px solid ${rarityColors[props.rarity] || rarityColors.common}`};
  
  /* If it's a banner character, add a subtle gold background */
  background: ${props => props.isBannerCharacter ? 
    'linear-gradient(to bottom, rgba(255, 215, 0, 0.05), white)' : 
    'white'};
`;

const SettingsButton = styled.button`
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

const ErrorContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #141e30 0%, #243b55 100%);
  color: white;
  gap: 20px;
  padding: 20px;
  text-align: center;
`;

export default BannerPage;