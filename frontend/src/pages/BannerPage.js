import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdArrowBack, MdClose, MdFastForward, MdInfo, MdRefresh } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaPlay, FaPause, FaChevronRight, FaStar } from 'react-icons/fa';

// API & Context
import api, { getBannerById, getBannerPricing, getAssetUrl } from '../utils/api';
import { isVideo } from '../utils/mediaUtils';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError, useSkipAnimations, getErrorSeverity, useConfetti } from '../hooks';
import { onVisibilityChange, invalidateFor, VISIBILITY_CALLBACK_IDS, CACHE_ACTIONS } from '../cache';
import { executeBannerRoll, executeBannerMultiRoll } from '../actions/gachaActions';
import { fetchWithRetry, createFetchGuard } from '../utils/fetchWithRetry';

// Design System
import {
  Container,
  IconButton,
  Spinner,
  Alert,
  motionVariants,
  Heading2,
  Text,
  RarityBadge,
  ModalOverlay,
} from '../design-system';

// Styled Components
import {
  StyledPageWrapper,
  HeroBackground,
  LoadingPage,
  LoadingText,
  ErrorPage,
  ErrorBox,
  NavBar,
  BackButton,
  NavStats,
  StatPill,
  HeroSection,
  HeroContent,
  BannerTitle,
  BannerSeries,
  BannerDescription,
  BadgeRow,
  CostBadge,
  DateBadge,
  FeaturedSection,
  FeaturedLabel,
  CharacterAvatars,
  Avatar,
  OwnedMark,
  MoreAvatar,
  VideoSection,
  VideoContainer,
  BannerVideo,
  VideoOverlay,
  VideoCaption,
  CloseAlertBtn,
  RarityTracker,
  RarityLabel,
  RarityHistory,
  RarityDot,
  GachaContainer,
  ResultsArea,
  CharacterCard,
  CardImageWrapper,
  RarityGlowEffect,
  CardImage,
  CardVideo,
  CardOverlay,
  CollectedBadge,
  BannerCharBadge,
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
  MiniBannerMark,
  MiniCardInfo,
  MiniName,
  MiniRarityDot,
  LoadingState,
  LoadingStateText,
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
  TicketWarning,
  TicketSection,
  TicketSectionHeader,
  TicketSectionTitle,
  TicketCounts,
  TicketCount,
  TicketButtonsGrid,
  TicketPullButton,
  PremiumPullButton,
  TicketButtonIcon,
  TicketButtonText,
  ControlsFooter,
  PointsDisplay,
  PointsIcon,
  PointsValue,
  PointsLabel,
  FastModeToggle,
  InfoPanel,
  InfoPanelHeader,
  InfoPanelContent,
  InfoBlock,
  InfoBlockTitle,
  InfoNote,
  InfoNoteAccent,
  DropRatesContainer,
  DropRateSection,
  DropRateSectionTitle,
  DropRateGrid,
  DropRateItem,
  RarityIcon,
  DropRateLabel,
  DropRateValue,
  PremiumNote,
  FeaturedList,
  FeaturedItem,
  FeaturedThumb,
  FeaturedInfo,
  FeaturedName,
  FeaturedRarity,
  OwnedLabel,
  RollFromPanelBtn,
} from './BannerPage.styles';

import { SummonAnimation, MultiSummonAnimation } from '../components/Gacha/SummonAnimation';
import ImagePreviewModal from '../components/UI/ImagePreviewModal';

// Game Enhancement Components
import { PityDisplay, MilestoneRewards, FatePointsDisplay } from '../components/GameEnhancements';

// Icon Constants
import {
  IconDice,
  IconPoints,
  IconSearch,
  IconSparkle,
  IconMagic,
  IconTicket,
  IconPremiumTicket,
  IconWarning,
  IconStar,
} from '../constants/icons';

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
  const collectionFetchGuard = useRef(createFetchGuard());
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, setUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();

  // Confetti with shared canvas (prevents layout shifts)
  const { fireRarePull, fireMultiPull } = useConfetti();

  // Action lock to prevent rapid double-clicks
  const { withLock, locked } = useActionLock(300);
  
  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();
  
  // State
  const [banner, setBanner] = useState(null);
  const [currentChar, setCurrentChar] = useState(null);
  const [multiRollResults, setMultiRollResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showMultiResults, setShowMultiResults] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);
  const [userCollection, setUserCollection] = useState([]);
  // Centralized animation skip preference (shared across gacha pages)
  const [skipAnimations, setSkipAnimations] = useSkipAnimations();
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
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  
  // Ticket state
  const [tickets, setTickets] = useState({ rollTickets: 0, premiumTickets: 0 });
  const [ticketLoadError, setTicketLoadError] = useState(false);
  
  // NOTE: Ticket refresh on visibility change is handled by the centralized visibility handler below.
  // Removed redundant window.focus handler - onVisibilityChange provides the same functionality
  // with better staleness detection and consistency with other pages.
  
  // Computed values from pricing
  const singlePullCost = pricing?.singlePullCost || 100;
  const pullOptions = useMemo(() => pricing?.pullOptions || [], [pricing?.pullOptions]);
  
  const getMultiPullCost = useCallback((count) => {
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

  // Memoize sorted featured characters to avoid sorting on every render
  const sortedFeaturedCharacters = useMemo(() => {
    if (!banner?.Characters?.length) return [];
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    return [...banner.Characters]
      .sort((a, b) => (rarityOrder[a.rarity] ?? 5) - (rarityOrder[b.rarity] ?? 5))
      .slice(0, 6);
  }, [banner?.Characters]);

  // Check if animation is currently showing
  const isAnimating = showSummonAnimation || showMultiSummonAnimation;
  
  // Helper to get disabled reason for tooltips
  // Accepts requiredCount for multi-ticket validation (default 1 for single pulls)
  const getDisabledReason = useCallback((cost, isTicket = false, ticketCount = 0, requiredCount = 1) => {
    if (!pricingLoaded && !pricingError) return t('common.loading') || 'Loading...';
    if (pricingError) return pricingError;
    if (isRolling) return t('common.summoning') || 'Summoning...';
    if (locked) return t('common.processing') || 'Processing...';
    if (isTicket && ticketLoadError) return t('banner.ticketLoadError') || 'Ticket data unavailable';
    if (isTicket && ticketCount < requiredCount) {
      return t('banner.notEnoughTickets', { required: requiredCount, have: ticketCount }) || 
        `Not enough tickets (need ${requiredCount}, have ${ticketCount})`;
    }
    if (!isTicket && user?.points < cost) {
      const needed = cost - (user?.points || 0);
      return t('banner.needMorePoints', { count: needed }) || `Need ${needed} more points`;
    }
    return undefined;
  }, [pricingLoaded, pricingError, isRolling, locked, ticketLoadError, user?.points, t]);

  // Effects
  useEffect(() => {
    const fetchBannerAndPricing = async () => {
      try {
        setLoading(true);
        setTicketLoadError(false);
        setPricingError(null);
        
        // Fetch banner data first (required)
        const bannerData = await getBannerById(bannerId);
        setBanner(bannerData);
        
        // Fetch pricing separately to handle errors gracefully
        try {
          const pricingData = await getBannerPricing(bannerId);
          setPricing(pricingData);
          setPricingLoaded(true);
        } catch (pricingErr) {
          console.error('Failed to load pricing:', pricingErr);
          setPricingError(t('common.pricingUnavailable') || 'Pricing unavailable. Please refresh.');
          setPricingLoaded(true); // Set to true so UI doesn't show loading forever
        }
        
        // Fetch tickets separately - don't block on failure but show warning
        // Note: Cache invalidation happens via visibility handler for subsequent refreshes
        try {
          const ticketsData = await api.get('/banners/user/tickets').then(res => res.data);
          setTickets(ticketsData);
        } catch (ticketErr) {
          console.warn('Failed to load tickets:', ticketErr);
          setTicketLoadError(true);
          // Keep existing tickets or default to 0
        }
      } catch (err) {
        setError(err.response?.data?.error || t('admin.failedLoadBanners'));
      } finally {
        setLoading(false);
      }
    };
    fetchBannerAndPricing();
  }, [bannerId, t, setError]);
  
  // Refresh pricing and tickets when tab regains visibility
  // Uses centralized cacheManager.onVisibilityChange() instead of scattered event listeners
  // 
  // NOTE: Both pricing and tickets are refreshed on any visibility change:
  // - Pricing may have been updated by admin
  // - Tickets may have been used in another tab or earned elsewhere
  useEffect(() => {
    if (!bannerId) return;
    
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.BANNER_PRICING, async (staleLevel) => {
      // Only refresh on staleness detection
      if (!staleLevel) return;

      // Refresh both pricing and tickets in parallel on visibility change
      // Invalidate cache first to ensure fresh data
      try {
        invalidateFor(CACHE_ACTIONS.PRE_ROLL);
        const [pricingData, ticketsData] = await Promise.all([
          getBannerPricing(bannerId),
          api.get('/banners/user/tickets').then(res => res.data)
        ]);
        setPricing(pricingData);
        setTickets(ticketsData);
        setTicketLoadError(false);
      } catch (err) {
        console.warn('Failed to refresh data on visibility:', err);
      }
    });
  }, [bannerId]);
  
  // Cross-tab ticket synchronization using BroadcastChannel with localStorage fallback
  useEffect(() => {
    // Try BroadcastChannel first (not available in Safari/older browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('gacha_ticket_sync');
      
      channel.onmessage = (event) => {
        if (event.data.type === 'TICKETS_UPDATED') {
          setTickets(event.data.tickets);
        }
      };
      
      return () => channel.close();
    }
    
    // Fallback: use localStorage storage event for cross-tab sync (Safari, etc.)
    const handleStorage = (e) => {
      if (e.key === 'gacha_tickets_sync' && e.newValue) {
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData.tickets) {
            setTickets(syncData.tickets);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  // Broadcast ticket changes to other tabs (with localStorage fallback for Safari)
  const broadcastTicketUpdate = useCallback((newTickets) => {
    // Try BroadcastChannel first
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('gacha_ticket_sync');
        channel.postMessage({ type: 'TICKETS_UPDATED', tickets: newTickets });
        channel.close();
        return;
      } catch (err) {
        // Fall through to localStorage fallback
      }
    }
    
    // Fallback: use localStorage for cross-tab sync (Safari, etc.)
    try {
      // Write with timestamp to ensure storage event fires even with same data
      localStorage.setItem('gacha_tickets_sync', JSON.stringify({ 
        tickets: newTickets, 
        timestamp: Date.now() 
      }));
    } catch {
      // Ignore localStorage errors
    }
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

  // Fetch user collection callback - defined before effects that use it
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
    
    const handleOnline = async () => {
      // Refresh user data and tickets when coming back online
      refreshUser();
      fetchUserCollection();
      // Also refresh tickets to ensure sync with cache invalidation
      invalidateFor(CACHE_ACTIONS.PRE_ROLL);
      const freshTickets = await fetchWithRetry(
        () => api.get('/banners/user/tickets').then(res => res.data),
        { silent: true }
      );
      if (freshTickets) {
        setTickets(freshTickets);
      }
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [isRolling, showSummonAnimation, showMultiSummonAnimation, t, refreshUser, fetchUserCollection, setError]);
  
  // Check for pending roll on mount (handles page reload during roll)
  useEffect(() => {
    try {
      const pendingRoll = sessionStorage.getItem('gacha_pendingRoll');
      if (pendingRoll) {
        const { bannerId: pendingBannerId, timestamp } = JSON.parse(pendingRoll);
        // Only process if it's recent (within 30 seconds) and matches current banner
        if (pendingBannerId === bannerId && Date.now() - timestamp < 30000) {
          setError(t('banner.rollInterrupted') || 'A roll may have been interrupted. Your collection has been refreshed.');
          fetchUserCollection();
          refreshUser();
          // Also refresh tickets to ensure sync
          api.get('/banners/user/tickets').then(res => setTickets(res.data)).catch(() => {});
        }
        sessionStorage.removeItem('gacha_pendingRoll');
      }
      
      // Check for unviewed roll results (user navigated away during animation)
      const unviewedRoll = sessionStorage.getItem('gacha_unviewedRoll');
      if (unviewedRoll) {
        const { bannerId: unviewedBannerId, timestamp } = JSON.parse(unviewedRoll);
        // Only notify if it's recent (within 5 minutes)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          const message = unviewedBannerId === bannerId 
            ? t('banner.unviewedRoll') || 'You have an unviewed pull! Check your collection.'
            : t('banner.unviewedRollOtherBanner') || 'You have unviewed pulls from another banner. Check your collection!';
          setError(message);
        }
        sessionStorage.removeItem('gacha_unviewedRoll');
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [bannerId, t, fetchUserCollection, refreshUser, setError]);

  // Callbacks
  const isInCollection = useCallback((char) => {
    return userCollection.some(c => c.id === char.id);
  }, [userCollection]);

  const showRarePullEffect = useCallback((rarity) => {
    fireRarePull(rarity, getRarityColor(rarity));
  }, [getRarityColor, fireRarePull]);

  // Handlers
  const handleRoll = async (useTicket = false, ticketType = 'roll') => {
    // Use action lock to prevent rapid double-clicks
    // All validation happens INSIDE the lock to prevent race conditions
    await withLock(async () => {
      try {
        // Validate INSIDE the lock to prevent race conditions from rapid clicks
        if (useTicket) {
          if (ticketType === 'premium' && tickets.premiumTickets < 1) {
            setError(t('banner.noPremiumTickets'));
            return;
          }
          if (ticketType === 'roll' && tickets.rollTickets < 1) {
            setError(t('banner.noRollTickets'));
            return;
          }
        } else if (user?.points < singlePullCost) {
          setError(t('banner.notEnoughPoints', { count: 1, cost: singlePullCost }));
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
          sessionStorage.setItem('gacha_pendingRoll', JSON.stringify({ 
            bannerId, 
            timestamp: Date.now(),
            type: 'single'
          }));
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Use gachaActions helper - handles API call + cache invalidation + user state update
        const result = await executeBannerRoll(bannerId, useTicket, ticketType, setUser);
        const { character, tickets: newTickets } = result;
        
        // Clear pending roll state on success
        try {
          sessionStorage.removeItem('gacha_pendingRoll');
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Update tickets if returned and broadcast to other tabs
        if (newTickets) {
          setTickets(newTickets);
          broadcastTicketUpdate(newTickets);
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
            sessionStorage.setItem('gacha_unviewedRoll', JSON.stringify({
              bannerId,
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
        
        // Non-blocking collection refresh with concurrency guard
        fetchWithRetry(fetchUserCollection, { guard: collectionFetchGuard.current });
      } catch (err) {
        // Clear pending roll state on error
        try {
          sessionStorage.removeItem('gacha_pendingRoll');
        } catch {
          // Ignore sessionStorage errors
        }

        const errorMessage = err.response?.data?.error || t('roll.failedRoll');
        setError(errorMessage);
        setIsRolling(false);

        // Refresh user data and tickets to sync state after failure
        const refreshResult = await refreshUser();
        if (!refreshResult.success) {
          console.warn('Failed to refresh user after roll error:', refreshResult.error);
        }

        // Also refresh tickets with cache invalidation to ensure fresh data
        invalidateFor(CACHE_ACTIONS.PRE_ROLL);
        const freshTickets = await fetchWithRetry(
          () => api.get('/banners/user/tickets').then(res => res.data),
          { silent: true }
        );
        if (freshTickets) {
          setTickets(freshTickets);
          broadcastTicketUpdate(freshTickets);
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
      sessionStorage.removeItem('gacha_unviewedRoll');
    } catch {
      // Ignore sessionStorage errors
    }
    setShowSummonAnimation(false);
    setPendingCharacter(null);
    setCurrentChar(null);
    setShowCard(false);
    setIsRolling(false);
  }, [pendingCharacter]);

  const handleMultiRoll = async (count, useTickets = false, ticketType = 'roll') => {
    // Use action lock to prevent rapid double-clicks
    // All validation happens INSIDE the lock to prevent race conditions
    await withLock(async () => {
      try {
        // Validate INSIDE the lock to prevent race conditions from rapid clicks
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
        
        setIsRolling(true);
        setShowCard(false);
        setShowMultiResults(false);
        setError(null);
        setRollCount(prev => prev + count);
        
        // Save pending roll state for recovery after page reload
        try {
          sessionStorage.setItem('gacha_pendingRoll', JSON.stringify({ 
            bannerId, 
            timestamp: Date.now(),
            type: 'multi',
            count
          }));
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Use gachaActions helper - handles API call + cache invalidation + user state update
        const result = await executeBannerMultiRoll(bannerId, count, useTickets, ticketType, setUser);
        const { characters, tickets: newTickets } = result;
        
        // Clear pending roll state on success
        try {
          sessionStorage.removeItem('gacha_pendingRoll');
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Update tickets if returned and broadcast to other tabs
        if (newTickets) {
          setTickets(newTickets);
          broadcastTicketUpdate(newTickets);
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

          const hasRare = characters.some(c => ['rare', 'epic', 'legendary'].includes(c.rarity));
          fireMultiPull(hasRare);
          setIsRolling(false);
        } else {
          // Persist roll results before animation for recovery if user navigates away
          try {
            sessionStorage.setItem('gacha_unviewedRoll', JSON.stringify({
              bannerId,
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
        
        // Non-blocking collection refresh with concurrency guard
        fetchWithRetry(fetchUserCollection, { guard: collectionFetchGuard.current });
      } catch (err) {
        // Clear pending roll state on error
        try {
          sessionStorage.removeItem('gacha_pendingRoll');
        } catch {
          // Ignore sessionStorage errors
        }

        const errorMessage = err.response?.data?.error || t('roll.failedMultiRoll');
        setError(errorMessage);
        setIsRolling(false);

        // Refresh user data and tickets to sync state after failure
        const refreshResult = await refreshUser();
        if (!refreshResult.success) {
          console.warn('Failed to refresh user after roll error:', refreshResult.error);
        }

        // Also refresh tickets with cache invalidation to ensure fresh data
        invalidateFor(CACHE_ACTIONS.PRE_ROLL);
        const freshTickets = await fetchWithRetry(
          () => api.get('/banners/user/tickets').then(res => res.data),
          { silent: true }
        );
        if (freshTickets) {
          setTickets(freshTickets);
          broadcastTicketUpdate(freshTickets);
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
      sessionStorage.removeItem('gacha_unviewedRoll');
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
          setError(t('banner.animationTimeout') || 'Animation timed out, but your pull was successful! Check your collection.');
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
          setError(t('banner.animationTimeout') || 'Animation timed out, but your pulls were successful! Check your collection.');
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
              <span><IconDice /></span>
              <span>{rollCount} {t('common.pulls')}</span>
            </StatPill>
            <IconButton onClick={() => setShowInfoPanel(true)} label="Show banner info">
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
                {sortedFeaturedCharacters.map(char => (
                  <Avatar
                    key={char.id}
                    $color={getRarityColor(char.rarity)}
                    $glow={getRarityGlow(char.rarity)}
                    $owned={isInCollection(char)}
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
            <RarityHistory>
              {lastRarities.map((rarity, i) => (
                <RarityDot key={i} $color={getRarityColor(rarity)} $glow={getRarityGlow(rarity)}>{rarityIcons[rarity]}</RarityDot>
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
                  $color={getRarityColor(currentChar?.rarity)}
                  $glow={getRarityGlow(currentChar?.rarity)}
                >
                  <CardImageWrapper onClick={() => openPreview(currentChar)}>
                    <RarityGlowEffect $color={getRarityColor(currentChar?.rarity)} />
                    {isVideo(currentChar?.image) ? (
                      <CardVideo src={getImagePath(currentChar?.image)} autoPlay loop muted playsInline />
                    ) : (
                      <CardImage src={getImagePath(currentChar?.image)} alt={currentChar?.name} />
                    )}
                    <CardOverlay>
                      <span><IconSearch /> {t('common.view')}</span>
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
                      onClick={() => handleRoll(false)} 
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
                    <h2>{multiRollResults.length}× Pull • {banner.name}</h2>
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
                        $isBanner={char.isBannerCharacter}
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
                  <EmptyIcon><IconSparkle /></EmptyIcon>
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
                  onClick={() => {
                    const reason = getDisabledReason(singlePullCost);
                    if (reason) {
                      // Show feedback for disabled state (especially for mobile)
                      setError(reason);
                      return;
                    }
                    handleRoll(false);
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
                          handleMultiRoll(option.count, false);
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
              
              {/* Ticket load warning */}
              {ticketLoadError && (
                <TicketWarning>
                  <IconWarning /> {t('banner.ticketLoadError') || 'Could not load ticket count. Ticket options may be unavailable.'}
                </TicketWarning>
              )}
              
              {/* Ticket Section - Only show if user has tickets */}
              {(tickets.rollTickets > 0 || tickets.premiumTickets > 0) && (
                <TicketSection>
                  <TicketSectionHeader>
                    <TicketSectionTitle><IconTicket /> {t('common.tickets') || 'Your Tickets'}</TicketSectionTitle>
                    <TicketCounts>
                      {tickets.rollTickets > 0 && (
                        <TicketCount>
                          <span><IconTicket /></span>
                          <strong>{tickets.rollTickets}</strong>
                        </TicketCount>
                      )}
                      {tickets.premiumTickets > 0 && (
                        <TicketCount $premium>
                          <span><IconPremiumTicket /></span>
                          <strong>{tickets.premiumTickets}</strong>
                        </TicketCount>
                      )}
                    </TicketCounts>
                  </TicketSectionHeader>
                  
                  <TicketButtonsGrid>
                    {tickets.rollTickets > 0 && (
                      <TicketPullButton
                        onClick={() => {
                          const reason = getDisabledReason(0, true, tickets.rollTickets);
                          if (reason) {
                            setError(reason);
                            return;
                          }
                          handleRoll(true, 'roll');
                        }}
                        disabled={isRolling || locked || tickets.rollTickets < 1 || ticketLoadError}
                        title={getDisabledReason(0, true, tickets.rollTickets)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon><IconTicket /></TicketButtonIcon>
                        <TicketButtonText>
                          <span>{t('common.use') || 'Use'} 1×</span>
                          <small>{t('common.rollTicket') || 'Roll Ticket'}</small>
                        </TicketButtonText>
                      </TicketPullButton>
                    )}
                    {tickets.premiumTickets > 0 && (
                      <PremiumPullButton
                        onClick={() => {
                          const reason = getDisabledReason(0, true, tickets.premiumTickets);
                          if (reason) {
                            setError(reason);
                            return;
                          }
                          handleRoll(true, 'premium');
                        }}
                        disabled={isRolling || locked || tickets.premiumTickets < 1 || ticketLoadError}
                        title={getDisabledReason(0, true, tickets.premiumTickets)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon><IconPremiumTicket /></TicketButtonIcon>
                        <TicketButtonText>
                          <span>{t('common.premium') || 'Premium'}</span>
                          <small>{t('common.guaranteedRare') || 'Rare+ Guaranteed!'}</small>
                        </TicketButtonText>
                      </PremiumPullButton>
                    )}
                    {tickets.rollTickets >= 10 && (
                      <TicketPullButton
                        onClick={() => {
                          const reason = getDisabledReason(0, true, tickets.rollTickets, 10);
                          if (reason) {
                            setError(reason);
                            return;
                          }
                          handleMultiRoll(10, true, 'roll');
                        }}
                        disabled={isRolling || locked || tickets.rollTickets < 10 || ticketLoadError}
                        title={getDisabledReason(0, true, tickets.rollTickets, 10)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon><IconTicket /></TicketButtonIcon>
                        <TicketButtonText>
                          <span>{t('common.use') || 'Use'} 10×</span>
                          <small>{t('common.rollTickets') || 'Roll Tickets'}</small>
                        </TicketButtonText>
                      </TicketPullButton>
                    )}
                    {tickets.premiumTickets >= 10 && (
                      <PremiumPullButton
                        onClick={() => {
                          const reason = getDisabledReason(0, true, tickets.premiumTickets, 10);
                          if (reason) {
                            setError(reason);
                            return;
                          }
                          handleMultiRoll(10, true, 'premium');
                        }}
                        disabled={isRolling || locked || tickets.premiumTickets < 10 || ticketLoadError}
                        title={getDisabledReason(0, true, tickets.premiumTickets, 10)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TicketButtonIcon><IconPremiumTicket /></TicketButtonIcon>
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
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowInfoPanel(false); }}
          >
            <InfoPanel
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <InfoPanelHeader>
                <Heading2>{banner.name}</Heading2>
                <IconButton onClick={() => setShowInfoPanel(false)} label="Close info panel">
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
                      {pricing.dropRates.banner && (
                        <DropRateSection>
                          <DropRateSectionTitle>
                            <IconStar /> {t('banner.bannerRates') || 'Banner Pool'} ({pricing.dropRates.bannerPullChance}%)
                          </DropRateSectionTitle>
                          <DropRateGrid>
                            {['legendary', 'epic', 'rare', 'uncommon', 'common'].map(rarity => (
                              <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                                <RarityIcon $color={getRarityColor(rarity)}>{rarityIcons[rarity]}</RarityIcon>
                                <DropRateLabel>{rarity}</DropRateLabel>
                                <DropRateValue $color={getRarityColor(rarity)}>{pricing.dropRates.banner[rarity] ?? 0}%</DropRateValue>
                              </DropRateItem>
                            ))}
                          </DropRateGrid>
                        </DropRateSection>
                      )}

                      {pricing.dropRates.standard && (
                        <DropRateSection>
                          <DropRateSectionTitle>
                            <FaDice aria-hidden="true" /> {t('banner.standardRates') || 'Standard Pool'} ({100 - pricing.dropRates.bannerPullChance}%)
                          </DropRateSectionTitle>
                          <DropRateGrid>
                            {['legendary', 'epic', 'rare', 'uncommon', 'common'].map(rarity => (
                              <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                                <RarityIcon $color={getRarityColor(rarity)}>{rarityIcons[rarity]}</RarityIcon>
                                <DropRateLabel>{rarity}</DropRateLabel>
                                <DropRateValue $color={getRarityColor(rarity)}>{pricing.dropRates.standard[rarity] ?? 0}%</DropRateValue>
                              </DropRateItem>
                            ))}
                          </DropRateGrid>
                        </DropRateSection>
                      )}

                      {pricing.dropRates.premium && (
                        <DropRateSection $premium>
                          <DropRateSectionTitle>
                            <IconPremiumTicket /> {t('banner.premiumRates') || 'Premium Ticket'}
                          </DropRateSectionTitle>
                          <DropRateGrid>
                            {['legendary', 'epic', 'rare'].map(rarity => (
                              <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                                <RarityIcon $color={getRarityColor(rarity)}>{rarityIcons[rarity]}</RarityIcon>
                                <DropRateLabel>{rarity}</DropRateLabel>
                                <DropRateValue $color={getRarityColor(rarity)}>{pricing.dropRates.premium[rarity] ?? 0}%</DropRateValue>
                              </DropRateItem>
                            ))}
                          </DropRateGrid>
                          <PremiumNote><IconSparkle /> {t('banner.guaranteedRare') || 'Guaranteed Rare or better!'}</PremiumNote>
                        </DropRateSection>
                      )}
                    </DropRatesContainer>
                  </InfoBlock>
                )}

                {/* Pity Progress Display - includes pity system explanation with actual user data */}
                <PityDisplay bannerId={bannerId} compact={false} />

                {/* Pull Milestones */}
                <MilestoneRewards bannerId={bannerId} />

                {/* Fate Points (for banner pulls) */}
                <FatePointsDisplay bannerId={bannerId} />

                <InfoBlock>
                  <InfoBlockTitle>{t('banner.featuredCharacters')}</InfoBlockTitle>
                  <FeaturedList>
                    {banner.Characters?.map(char => (
                      <FeaturedItem 
                        key={char.id} 
                        onClick={() => openPreview({...char, isOwned: isInCollection(char)})}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                      >
                        <FeaturedThumb $color={getRarityColor(char.rarity)}>
                          {isVideo(char.image) ? (
                            <video src={getImagePath(char.image)} autoPlay loop muted playsInline />
                          ) : (
                            <img src={getImagePath(char.image)} alt={char.name} />
                          )}
                        </FeaturedThumb>
                        <FeaturedInfo>
                          <FeaturedName>{char.name}</FeaturedName>
                          <FeaturedRarity $color={getRarityColor(char.rarity)}>
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
                  onClick={() => { setShowInfoPanel(false); setTimeout(() => handleRoll(false), 300); }}
                  disabled={isRolling || locked || user?.points < singlePullCost}
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

export default BannerPage;
