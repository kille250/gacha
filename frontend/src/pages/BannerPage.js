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
	MultiRarityBadge, EmptyState, EmptyStateIcon,
	RollButtonsContainer, RollButton, RollCost, MultiPullContainer,
	MultiRollButton, PullCountDisplay, PullSlider, ConfirmButton,
	RollHint, rarityColors, ModalOverlay, NewMultiPullPanel, PanelHeader,
	CloseButton, PanelContent, CurrentSelection, SelectionValue, SelectionCost,
	DiscountTag, PresetOptions, PresetButton, DiscountBadge, SliderContainer,
	PullCountAdjuster, AdjustBtn, PullInfoGraphic, PullInfoCard, PullInfoIcon,
	PullInfoLabel, PullInfoValue, ErrorNote
  } from '../components/GachaStyles';
  import axios from 'axios';
  import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import styled from 'styled-components';
  import { motion, AnimatePresence } from 'framer-motion';
  import { getBannerById, rollOnBanner, multiRollOnBanner } from '../utils/api';
  import { AuthContext } from '../context/AuthContext';
  import { MdReplay, MdStars, MdLocalFireDepartment, MdCheckCircle, MdFastForward, MdAdd, MdRemove, MdArrowBack, MdInfo } from 'react-icons/md';
  import { FaGem, FaDice, FaTrophy, FaPlay, FaPause, FaChevronRight } from 'react-icons/fa';
  import confetti from 'canvas-confetti';
  import ImagePreviewModal from '../components/UI/ImagePreviewModal';
  
  const rarityIcons = {
	common: <FaDice />,
	uncommon: <MdStars />,
	rare: <FaGem />,
	epic: <MdLocalFireDepartment />,
	legendary: <FaTrophy />
  };
  
  // Check if a file is a video
  const isVideo = (file) => {
	if (!file) return false;
	
	// If it's a string (path/URL)
	if (typeof file === 'string') {
	  const lowerCasePath = file.toLowerCase();
	  return lowerCasePath.endsWith('.mp4') || 
			 lowerCasePath.endsWith('.webm') || 
			 lowerCasePath.includes('video');
	}
	
	// If it's a File object with type property
	if (file.type && file.type.startsWith('video/')) {
	  return true;
	}
	
	return false;
  };
  
  // New MultiPullMenu component for BannerPage
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
	// Get recommended pull counts based on maxPossiblePulls
	const getRecommendedPulls = () => {
	  const recommendations = [];
	  // Always recommend single pull
	  recommendations.push(1);
	  // Add 5-pull if possible (first discount tier)
	  if (maxPossiblePulls >= 5) recommendations.push(5);
	  // Add 10-pull if possible (max discount tier)
	  if (maxPossiblePulls >= 10) recommendations.push(10);
	  // Add max possible if it's not already included and is greater than 10
	  if (maxPossiblePulls > 10 && !recommendations.includes(maxPossiblePulls)) {
		recommendations.push(maxPossiblePulls);
	  }
	  return recommendations;
	};
	
	return (
	  <AnimatePresence>
		{isOpen && (
		  <ModalOverlay
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			onClick={onClose}
		  >
			<NewMultiPullPanel
			  onClick={(e) => e.stopPropagation()}
			  initial={{ scale: 0.9, opacity: 0 }}
			  animate={{ scale: 1, opacity: 1 }}
			  exit={{ scale: 0.9, opacity: 0 }}
			  className="multi-pull-container"
			>
			  <PanelHeader>
				<h2>Multi Pull Settings</h2>
				<CloseButton onClick={onClose}>×</CloseButton>
			  </PanelHeader>
			  <PanelContent>
				<CurrentSelection>
				  <SelectionValue>{multiPullCount}×</SelectionValue>
				  <SelectionCost>
					{currentMultiPullCost} points
					{multiPullCount >= 10 && <DiscountTag>10% OFF</DiscountTag>}
					{multiPullCount >= 5 && multiPullCount < 10 && <DiscountTag>5% OFF</DiscountTag>}
				  </SelectionCost>
				</CurrentSelection>
				<PresetOptions>
				  {getRecommendedPulls().map(count => (
					<PresetButton
					  key={count}
					  onClick={() => setMultiPullCount(count)}
					  active={multiPullCount === count}
					  disabled={userPoints < (count * singlePullCost * (count >= 10 ? 0.9 : count >= 5 ? 0.95 : 1))}
					>
					  {count}× Pull
					  {count >= 10 && <DiscountBadge>-10%</DiscountBadge>}
					  {count >= 5 && count < 10 && <DiscountBadge>-5%</DiscountBadge>}
					</PresetButton>
				  ))}
				  <PresetButton
					onClick={() => {}}
					active={!getRecommendedPulls().includes(multiPullCount)}
					disabled={false}
				  >
					Custom
				  </PresetButton>
				</PresetOptions>
				<SliderContainer>
				  <PullCountAdjuster>
					<AdjustBtn
					  onClick={() => setMultiPullCount(Math.max(1, multiPullCount - 1))}
					  disabled={multiPullCount <= 1}
					>
					  <MdRemove />
					</AdjustBtn>
					<PullCountDisplay>{multiPullCount}</PullCountDisplay>
					<AdjustBtn
					  onClick={() => setMultiPullCount(Math.min(maxPossiblePulls, multiPullCount + 1))}
					  disabled={multiPullCount >= maxPossiblePulls}
					>
					  <MdAdd />
					</AdjustBtn>
				  </PullCountAdjuster>
				  <PullSlider
					type="range"
					min="1"
					max={maxPossiblePulls || 1}
					value={multiPullCount}
					onChange={(e) => setMultiPullCount(parseInt(e.target.value))}
				  />
				</SliderContainer>
				<PullInfoGraphic>
				  <PullInfoCard>
					<PullInfoIcon>💰</PullInfoIcon>
					<PullInfoLabel>Total Cost</PullInfoLabel>
					<PullInfoValue>{currentMultiPullCost} pts</PullInfoValue>
				  </PullInfoCard>
				  <PullInfoCard>
					<PullInfoIcon>⭐</PullInfoIcon>
					<PullInfoLabel>Pull Count</PullInfoLabel>
					<PullInfoValue>{multiPullCount}×</PullInfoValue>
				  </PullInfoCard>
				  {multiPullCount >= 5 && (
					<PullInfoCard accent={true}>
					  <PullInfoIcon>🎁</PullInfoIcon>
					  <PullInfoLabel>Discount</PullInfoLabel>
					  <PullInfoValue>{multiPullCount >= 10 ? '10%' : '5%'}</PullInfoValue>
					</PullInfoCard>
				  )}
				</PullInfoGraphic>
				<ConfirmButton
				  onClick={onConfirm}
				  disabled={userPoints < currentMultiPullCost}
				  whileHover={{ scale: 1.05 }}
				  whileTap={{ scale: 0.95 }}
				>
				  <FaDice size={16} /> Pull {multiPullCount}× for {currentMultiPullCost} points
				</ConfirmButton>
				{userPoints < currentMultiPullCost && (
				  <ErrorNote>
					<span>Not enough points.</span> You need {currentMultiPullCost - userPoints} more.
				  </ErrorNote>
				)}
			  </PanelContent>
			</NewMultiPullPanel>
		  </ModalOverlay>
		)}
	  </AnimatePresence>
	);
  };
  
  const BannerPage = () => {
	const videoRef = useRef(null);
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
	// Removed the unused state variables: showSettings, setShowSettings
	const [multiPullCount, setMultiPullCount] = useState(10);
	const [multiPullMenuOpen, setMultiPullMenuOpen] = useState(false);
	const [isVideoPlaying, setIsVideoPlaying] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showInfoPanel, setShowInfoPanel] = useState(false);
  
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
	  return Math.max(1, Math.min(20, Math.floor((user?.points || 0) / singlePullCost)));
	}, [user?.points, calculateSinglePullCost]);
  
	// Current costs
	const singlePullCost = calculateSinglePullCost();
	const currentMultiPullCost = calculateMultiPullCost(multiPullCount);
  
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
	  const defaultCount = Math.min(10, maxPossiblePulls());
	  if (multiPullCount > maxPossiblePulls() || multiPullCount === 0) {
		setMultiPullCount(Math.max(1, defaultCount));
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
	
	const fetchUserCollection = useCallback(async () => {
	  try {
		const response = await axios.get('https://gachaapi.solidbooru.online/api/characters/collection', {
		  headers: { 'x-auth-token': localStorage.getItem('token') }
		});
		setUserCollection(response.data);
	  } catch (err) {
		console.error("Error fetching user collection:", err);
	  }
	}, []);
  
	// Refresh user data and fetch collection
	useEffect(() => {
	  refreshUser();
	  fetchUserCollection();
	}, [refreshUser, fetchUserCollection]);
  
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
			// Find best rarity
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
	const toggleInfoPanel = () => setShowInfoPanel(prev => !prev);
  
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
		.then(() => {
		  setIsVideoPlaying(true);
		})
		.catch((error) => {
		  console.error('Error playing video:', error);
		  setIsVideoPlaying(false);
		  // Optional: Show error to user
		  setError('Video playback failed. Please try again.');
		});
	  }
	};
  
	// Handle video ended event
	const handleVideoEnded = () => {
	  setIsVideoPlaying(false);
	};
  
	// Media content component for displaying images or videos
	const MediaContent = ({ src, alt, onClick, onError }) => {
	  if (isVideo(src)) {
		return (
		  <CardVideo 
			src={getImagePath(src)}
			autoPlay
			loop
			muted
			playsInline
			onClick={onClick}
			onError={onError}
		  />
		);
	  }
	  
	  return (
		<CardImage
		  src={src}
		  alt={alt}
		  onClick={onClick}
		  onError={onError}
		/>
	  );
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
  
	return (
	  <BannerContainer backgroundImage={getBannerImagePath(banner.image)}>
		{/* Navigation Bar */}
		<NavBar>
		  <BackButton onClick={() => navigate('/gacha')}>
			<MdArrowBack /> Back to Gacha
		  </BackButton>
		  <NavControls>
			<StatsItem>
			  <FaDice />
			  <span>{rollCount} Pulls</span>
			</StatsItem>
			<PointsCounter>
			  <CoinIcon>🪙</CoinIcon>
			  <PointsAmount>{user?.points || 0}</PointsAmount>
			</PointsCounter>
			<IconButton onClick={toggleInfoPanel} aria-label="Banner Info">
			  <MdInfo />
			</IconButton>
		  </NavControls>
		</NavBar>
		
		{/* Banner Hero */}
		<BannerHero>
		  <HeroContent>
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
		  </HeroContent>
		  
		  {/* Featured Characters Preview */}
		  {banner.Characters && banner.Characters.length > 0 && (
			<FeaturedCharacters>
			  <FeaturedLabel>
				<FeaturedIcon>✦</FeaturedIcon>
				<span>Featured Characters</span>
			  </FeaturedLabel>
			  <CharacterAvatars>
				{banner.Characters.slice(0, 6).map(char => (
				  <CharacterAvatar
					key={char.id}
					rarity={char.rarity}
					owned={isCharacterInCollection(char)}
					onClick={() => openPreview({...char, isOwned: isCharacterInCollection(char)})}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
				  >
					{isVideo(char.image) ? (
					  <AvatarVideo
						src={getImagePath(char.image)}
						autoPlay
						loop
						muted
						playsInline
					  />
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
					{isCharacterInCollection(char) && (
					  <OwnedIndicator>✓</OwnedIndicator>
					)}
				  </CharacterAvatar>
				))}
				{banner.Characters.length > 6 && (
				  <MoreCharacters
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
					onClick={toggleInfoPanel}
				  >
					+{banner.Characters.length - 6}
				  </MoreCharacters>
				)}
			  </CharacterAvatars>
			</FeaturedCharacters>
		  )}
		</BannerHero>
		
		{/* Promotional Video */}
		{banner.videoUrl && (
		  <VideoSection>
			<VideoContainer>
			  <BannerVideo
				ref={videoRef}
				id="banner-video"
				src={getVideoPath(banner.videoUrl)}
				poster={getBannerImagePath(banner.image)}
				onEnded={handleVideoEnded}
				playsInline // Required for iOS
				webkit-playsinline="true" // For older iOS
			  />
			  <VideoControls onClick={toggleVideoPlay}>
				{isVideoPlaying ? <FaPause /> : <FaPlay />}
			  </VideoControls>
			</VideoContainer>
			<VideoCaption>Watch Promotional Video</VideoCaption>
		  </VideoSection>
		)}
		
		{/* Error Display */}
		<AnimatePresence>
		  {error && (
			<ErrorMessage
			  initial={{ opacity: 0, y: -10 }}
			  animate={{ opacity: 1, y: 0 }}
			  exit={{ opacity: 0 }}
			>
			  {error}
			  <CloseErrorButton onClick={() => setError(null)}>×</CloseErrorButton>
			</ErrorMessage>
		  )}
		</AnimatePresence>
		
		{/* Rarity History */}
		<RarityHistoryBar>
		  {lastRarities.length > 0 && (
			<>
			  <HistoryLabel>Recent pulls:</HistoryLabel>
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
		
		{/* Character Results Section - Modified for better width usage */}
		<EnhancedGachaSection>
		  <CharacterResultsArea>
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
					<CollectionBadge>Added to Collection</CollectionBadge>
					{currentChar?.isBannerCharacter && <BannerBadge>Banner Character</BannerBadge>}
					
					{isVideo(currentChar?.image) ? (
					  <CardVideo
						src={getImagePath(currentChar?.image)}
						autoPlay
						loop
						muted
						playsInline
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
					  primary={true}
					  disabled={true}
					>
					  <><MdCheckCircle /> Added to Collection</>
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
				<EnhancedMultiRollSection
				  key="multiResults"
				  initial={{ opacity: 0, y: 20 }}
				  animate={{ opacity: 1, y: 0 }}
				  exit={{ opacity: 0, y: -20 }}
				>
				  <MultiRollHeader>
					<h2>{multiRollResults.length}× Roll Results • {banner.name}</h2>
					<MultiRollCloseButton onClick={() => setShowMultiResults(false)}>×</MultiRollCloseButton>
				  </MultiRollHeader>
				  <EnhancedMultiCharactersGrid>
					{multiRollResults.map((character, index) => (
					  <EnhancedMultiCharacterCard
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
						  <CollectionBadgeMini>✓</CollectionBadgeMini>
						  {character.isBannerCharacter && <BannerBadgeMini>★</BannerBadgeMini>}
						  
						  {isVideo(character.image) ? (
							<MultiCardVideo
							  src={getImagePath(character.image)}
							  autoPlay
							  loop
							  muted
							  playsInline
							  onError={(e) => {
								if (!e.target.src.includes('placeholder.com')) {
								  e.target.src = 'https://via.placeholder.com/300?text=No+Image';
								}
							  }}
							/>
						  ) : (
							<MultiCardImage
							  src={getImagePath(character.image)}
							  alt={character.name}
							  onError={(e) => {
								if (!e.target.src.includes('placeholder.com')) {
								  e.target.src = 'https://via.placeholder.com/300?text=No+Image';
								}
							  }}
							/>
						  )}
						</MultiCardImageContainer>
						<MultiCardContent>
						  <MultiCharName>{character.name}</MultiCharName>
						  <MultiRarityBadge rarity={character.rarity}>
							{rarityIcons[character.rarity]} {character.rarity}
						  </MultiRarityBadge>
						</MultiCardContent>
					  </EnhancedMultiCharacterCard>
					))}
				  </EnhancedMultiCharactersGrid>
				</EnhancedMultiRollSection>
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
				  <p>{banner.series} Special Banner</p>
				</EmptyState>
			  )}
			</AnimatePresence>
		  </CharacterResultsArea>
		  
		  {/* Roll Buttons */}
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
				onClick={isRolling ? null : toggleMultiPullMenu}
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
					🎯 Multi Pull{" "}
					<RollCost>
					  ({multiPullCount}× for {currentMultiPullCost} pts
					  {multiPullCount >= 10 ? " • 10% OFF" : multiPullCount >= 5 ? " • 5% OFF" : ""})
					</RollCost>
				  </>
				)}
			  </MultiRollButton>
			  
			  {/* New MultiPullMenu implementation */}
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
			</MultiPullContainer>
		  </RollButtonsContainer>
		  <RollHint>
			You have enough points for <strong>{Math.floor((user?.points || 0) / singlePullCost)}</strong> single pulls
			{maxPossiblePulls() > 1 && ` or up to a ${maxPossiblePulls()}× multi-pull`}
		  </RollHint>
		  <AnimationToggle onClick={toggleSkipAnimations}>
			{skipAnimations ? (
			  <><MdFastForward /> Fast Mode On</>
			) : (
			  <><MdFastForward style={{ opacity: 0.5 }} /> Animation Mode</>
			)}
		  </AnimationToggle>
		</EnhancedGachaSection>
		
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
			<BannerInfoPanel
			  initial={{ x: '100%', opacity: 0 }}
			  animate={{ x: 0, opacity: 1 }}
			  exit={{ x: '100%', opacity: 0 }}
			  transition={{ type: 'spring', damping: 30 }}
			>
			  <InfoPanelHeader>
				<h2>{banner.name} Details</h2>
				<CloseButtonStyled onClick={toggleInfoPanel}>×</CloseButtonStyled>
			  </InfoPanelHeader>
			  <InfoPanelContent>
				<InfoSection>
				  <h3>About This Banner</h3>
				  <p>{banner.description || 'Special banner featuring characters from ' + banner.series}.</p>
				  {banner.endDate && (
					<EndDateInfo>
					  <strong>Available Until:</strong> {new Date(banner.endDate).toLocaleDateString()}
					</EndDateInfo>
				  )}
				  <PullRateInfo>
					<strong>Pull Cost:</strong> {singlePullCost} points per pull
					{banner.costMultiplier > 1 && ` (${banner.costMultiplier}× standard rate)`}
				  </PullRateInfo>
				</InfoSection>
				<FeaturedSection>
				  <h3>Featured Characters</h3>
				  <FeaturedCharactersList>
					{banner.Characters?.map(char => (
					  <FeaturedCharacterItem
						key={char.id}
						whileHover={{ scale: 1.03 }}
						onClick={() => openPreview({...char, isOwned: isCharacterInCollection(char)})}
					  >
						<FeaturedCharThumb rarity={char.rarity}>
						  {isVideo(char.image) ? (
							<FeaturedVideo
							  src={getImagePath(char.image)}
							  autoPlay
							  loop
							  muted
							  playsInline
							/>
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
						</FeaturedCharThumb>
						<FeaturedCharInfo>
						  <FeaturedCharName>{char.name}</FeaturedCharName>
						  <FeaturedCharRarity rarity={char.rarity}>
							{rarityIcons[char.rarity]} {char.rarity}
						  </FeaturedCharRarity>
						  {isCharacterInCollection(char) && (
							<OwnedLabel>In Collection</OwnedLabel>
						  )}
						</FeaturedCharInfo>
						<FeaturedCharViewIcon>
						  <FaChevronRight />
						</FeaturedCharViewIcon>
					  </FeaturedCharacterItem>
					))}
				  </FeaturedCharactersList>
				</FeaturedSection>
				<RollButtonContainer>
				  <RollFromInfoButton
					onClick={() => {
					  toggleInfoPanel();
					  setTimeout(() => handleRoll(), 300);
					}}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					disabled={isRolling || (user?.points < singlePullCost)}
				  >
					Roll Now
				  </RollFromInfoButton>
				</RollButtonContainer>
			  </InfoPanelContent>
			</BannerInfoPanel>
		  )}
		</AnimatePresence>
	  </BannerContainer>
	);
  };
  
  // New video-specific styled components
  const CardVideo = styled.video`
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 12px;
  `;
  
  const MultiCardVideo = styled.video`
	width: 100%;
	height: 100%;
	object-fit: cover;
  `;
  
  const AvatarVideo = styled.video`
	width: 100%;
	height: 100%;
	object-fit: cover;
  `;
  
  const FeaturedVideo = styled.video`
	width: 100%;
	height: 100%;
	object-fit: cover;
  `;
  
  // New and enhanced styled components for better width management
  const EnhancedGachaSection = styled(GachaSection)`
	width: 100%;
	max-width: 1200px;
	margin: 0 auto;
	padding: 20px;
	background: rgba(0, 0, 0, 0.2);
	border-radius: 16px;
	backdrop-filter: blur(5px);
	border: 1px solid rgba(255, 255, 255, 0.05);
	
	@media (max-width: 768px) {
	  padding: 15px 10px;
	}
  `;
  
  const EnhancedMultiRollSection = styled(MultiRollSection)`
	width: 100%;
	max-width: 1000px;
	margin: 0 auto;
	
	display: flex;
	flex-direction: column;
	max-height: calc(70vh - 60px);
  `;
  
  const EnhancedMultiCharactersGrid = styled(MultiCharactersGrid)`
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	overflow-y: auto;
	max-height: calc(70vh - 130px); /* Platz für Header berücksichtigen */
	padding: 10px;
	
	@media (max-width: 600px) {
	  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	}
  `;
  
  const EnhancedMultiCharacterCard = styled(motion.div)`
	background: white;
	border-radius: 12px;
	overflow: hidden;
	position: relative;
	height: 210px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	border: 2px solid ${props => rarityColors[props.rarity] || rarityColors.common};
	/* Add special border for banner characters in multi-roll view */
	border: ${props => props.isBannerCharacter ?
	  `2px solid #ffd700` :
	  `2px solid ${rarityColors[props.rarity] || rarityColors.common}`};
	/* If it's a banner character, add a subtle gold background */
	background: ${props => props.isBannerCharacter ?
	  'linear-gradient(to bottom, rgba(255, 215, 0, 0.05), white)' :
	  'white'};

  `;
  
  const CharacterResultsArea = styled.div`
	width: 100%;
	min-height: 450px;
	max-height: calc(70vh - 60px);
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 20px;
	overflow-y: auto;
	
	@media (max-width: 480px) {
	  min-height: 350px;
	}
  `;
  
  // Styled components from original BannerPage.js
  const BannerContainer = styled.div`
	min-height: 100vh;
	background: linear-gradient(
	  to bottom,
	  rgba(0, 0, 0, 0.7) 0%,
	  rgba(20, 30, 48, 0.9) 50%,
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
	
	@media (max-width: 768px) {
	  padding: 15px 10px;
	}
  `;
  
  const NavBar = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
	
	@media (max-width: 480px) {
	  margin-bottom: 15px;
	}
  `;
  
  const NavControls = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
	
	@media (max-width: 480px) {
	  gap: 6px;
	}
  `;
  
  const StatsItem = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	background: rgba(0, 0, 0, 0.3);
	color: white;
	padding: 8px 12px;
	border-radius: 20px;
	font-weight: 500;
	border: 1px solid rgba(255, 255, 255, 0.1);
	
	@media (max-width: 480px) {
	  padding: 6px 10px;
	  font-size: 14px;
	}
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
	  transform: translateX(-3px);
	}
	
	@media (max-width: 480px) {
	  padding: 6px 12px;
	  font-size: 13px;
	}
  `;
  
  const IconButton = styled.button`
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
	transition: all 0.3s;
	
	&:hover {
	  background: rgba(0, 0, 0, 0.5);
	}
	
	@media (max-width: 480px) {
	  width: 36px;
	  height: 36px;
	}
  `;
  
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
	
	@media (max-width: 768px) {
	  padding: 20px 15px;
	}
  `;
  
  const HeroContent = styled.div`
	max-width: 800px;
	margin: 0 auto;
  `;
  
  const BannerTitle = styled.h1`
	font-size: 36px;
	margin: 0 0 10px 0;
	text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
	line-height: 1.2;
	
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
	
	@media (max-width: 480px) {
	  font-size: 14px;
	}
  `;
  
  const PullCost = styled.div`
	display: flex;
	justify-content: center;
	gap: 15px;
	margin-bottom: 5px;
	flex-wrap: wrap;
	
	@media (max-width: 480px) {
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
	
	@media (max-width: 480px) {
	  padding: 6px 12px;
	  font-size: 14px;
	}
  `;
  
  const DateBadge = styled.div`
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.2);
	color: white;
	padding: 8px 15px;
	border-radius: 50px;
	
	@media (max-width: 480px) {
	  padding: 6px 12px;
	  font-size: 14px;
	}
  `;
  
  const FeaturedCharacters = styled.div`
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
  
  const CharacterAvatar = styled(motion.div)`
	width: 65px;
	height: 65px;
	border-radius: 50%;
	overflow: hidden;
	cursor: pointer;
	border: 2px solid ${props => rarityColors[props.rarity] || rarityColors.common};
	transition: all 0.2s;
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
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
	  }
	`}
	
	@media (max-width: 480px) {
	  width: 55px;
	  height: 55px;
	}
  `;
  
  const OwnedIndicator = styled.div`
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
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  `;
  
  const MoreCharacters = styled(motion.div)`
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
	
	@media (max-width: 480px) {
	  width: 55px;
	  height: 55px;
	  font-size: 11px;
	}
  `;
  
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
  
  // Animation indicator
  const AnimationToggle = styled.button`
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
  
  const CloseErrorButton = styled.button`
	background: none;
	border: none;
	color: white;
	font-size: 18px;
	cursor: pointer;
	margin-left: 10px;
	opacity: 0.7;
	transition: opacity 0.2s;
	
	&:hover {
	  opacity: 1;
	}
  `;
  
  // Banner Info Panel
  const BannerInfoPanel = styled(motion.div)`
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
	  
	  @media (max-width: 480px) {
		font-size: 18px;
	  }
	}
  `;
  
  const CloseButtonStyled = styled.button`
	position: absolute;
	top: 10px;
	right: 10px;
	background: none;
	border: none;
	color: white;
	font-size: 24px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	border-radius: 50%;
	
	&:hover {
	  background: rgba(255, 255, 255, 0.1);
	}
  `;
  
  const InfoPanelContent = styled.div`
	flex: 1;
	padding: 20px;
	overflow-y: auto;
  `;
  
  const InfoSection = styled.div`
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
  
  const EndDateInfo = styled.div`
	margin-bottom: 10px;
	padding: 10px;
	background: rgba(0, 0, 0, 0.2);
	border-radius: 8px;
	font-size: 14px;
  `;
  
  const PullRateInfo = styled.div`
	padding: 10px;
	background: rgba(255, 215, 0, 0.1);
	border-radius: 8px;
	font-size: 14px;
	border: 1px solid rgba(255, 215, 0, 0.2);
  `;
  
  const FeaturedSection = styled(InfoSection)`
	h3 {
	  margin-bottom: 20px;
	}
  `;
  
  const FeaturedCharactersList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
  `;
  
  const FeaturedCharacterItem = styled(motion.div)`
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
  
  const FeaturedCharThumb = styled.div`
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
  
  const FeaturedCharInfo = styled.div`
	flex: 1;
  `;
  
  const FeaturedCharName = styled.div`
	font-weight: 500;
	font-size: 16px;
	margin-bottom: 5px;
  `;
  
  const FeaturedCharRarity = styled.div`
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
  
  const FeaturedCharViewIcon = styled.div`
	color: rgba(255, 255, 255, 0.5);
	font-size: 14px;
  `;
  
  const RollButtonContainer = styled.div`
	margin-top: 30px;
	padding-top: 20px;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
  `;
  
  const RollFromInfoButton = styled(motion.button)`
	width: 100%;
	background: linear-gradient(135deg, #6e48aa, #9e5594);
	color: white;
	border: none;
	padding: 12px 0;
	border-radius: 8px;
	font-size: 16px;
	font-weight: 500;
	cursor: pointer;
	box-shadow: 0 4px 15px rgba(110, 72, 170, 0.4);
	
	&:disabled {
	  background: #555;
	  cursor: not-allowed;
	  opacity: 0.7;
	}
  `;
  
  export default BannerPage;