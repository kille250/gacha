import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MdArrowBack, MdClose, MdFastForward, MdInfo, MdRefresh } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaPlay, FaPause, FaChevronRight, FaStar } from 'react-icons/fa';
import confetti from 'canvas-confetti';

// API & Context
import api, { getBannerById, getBannerPricing, getAssetUrl, rollOnBanner, multiRollOnBanner } from '../utils/api';
import { isVideo } from '../utils/mediaUtils';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError, useSkipAnimations, getErrorSeverity } from '../hooks';
import { clearCache } from '../utils/api';

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
  const { getRarityColor, getRarityGlow } = useRarity();
  
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
  
  // Refresh tickets when tab regains focus to prevent stale ticket validation
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const ticketsData = await api.get('/banners/user/tickets').then(res => res.data);
        setTickets(ticketsData);
        setTicketLoadError(false);
      } catch (err) {
        console.warn('Failed to refresh tickets on focus:', err);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
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
  
  // Refresh pricing when tab regains focus (handles admin pricing changes during session)
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && bannerId) {
        try {
          const pricingData = await getBannerPricing(bannerId);
          setPricing(pricingData);
        } catch (err) {
          console.warn('Failed to refresh pricing on visibility:', err);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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
      // Also refresh tickets to ensure sync
      try {
        const freshTickets = await api.get('/banners/user/tickets').then(res => res.data);
        setTickets(freshTickets);
      } catch (err) {
        console.warn('Failed to refresh tickets on reconnect:', err);
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
  const handleRoll = async (useTicket = false, ticketType = 'roll') => {
    // Use action lock to prevent rapid double-clicks
    // All validation happens INSIDE the lock to prevent race conditions
    await withLock(async () => {
      try {
        // Validate INSIDE the lock to prevent race conditions from rapid clicks
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
        
        setIsRolling(true);
        setShowCard(false);
        setShowMultiResults(false);
        setError(null);
        setMultiRollResults([]);
        setRollCount(prev => prev + 1);
        
        // Invalidate pricing cache to ensure server charges current price
        clearCache(`/banners/${bannerId}/pricing`);
        
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
        
        // Use helper function with cache invalidation
        const result = await rollOnBanner(bannerId, useTicket, ticketType);
        const { character, updatedPoints, tickets: newTickets } = result;
        
        // Clear pending roll state on success
        try {
          sessionStorage.removeItem('gacha_pendingRoll');
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Update points immediately from response using functional update to avoid stale closure
        if (typeof updatedPoints === 'number') {
          setUser(prev => prev ? { ...prev, points: updatedPoints } : prev);
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
        
        // Non-blocking collection refresh with retry
        const refreshWithRetry = async (retries = 2) => {
          try {
            await fetchUserCollection();
          } catch (err) {
            console.warn(`Failed to refresh collection (${retries} retries left):`, err);
            if (retries > 0) {
              setTimeout(() => refreshWithRetry(retries - 1), 1000);
            }
          }
        };
        refreshWithRetry();
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
        
        // Also refresh tickets to ensure sync (especially for ticket-related errors)
        try {
          const freshTickets = await api.get('/banners/user/tickets').then(res => res.data);
          setTickets(freshTickets);
          broadcastTicketUpdate(freshTickets);
        } catch (ticketErr) {
          console.warn('Failed to refresh tickets after error:', ticketErr);
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
        
        // Invalidate pricing cache to ensure server charges current price
        clearCache(`/banners/${bannerId}/pricing`);
        
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
        
        // Use helper function with cache invalidation
        const result = await multiRollOnBanner(bannerId, count, useTickets, ticketType);
        const { characters, updatedPoints, tickets: newTickets } = result;
        
        // Clear pending roll state on success
        try {
          sessionStorage.removeItem('gacha_pendingRoll');
        } catch {
          // Ignore sessionStorage errors
        }
        
        // Update points immediately from response using functional update to avoid stale closure
        if (typeof updatedPoints === 'number') {
          setUser(prev => prev ? { ...prev, points: updatedPoints } : prev);
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
          
          if (characters.some(c => ['rare', 'epic', 'legendary'].includes(c.rarity))) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          }
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
        
        // Non-blocking collection refresh with retry
        const refreshWithRetry = async (retries = 2) => {
          try {
            await fetchUserCollection();
          } catch (err) {
            console.warn(`Failed to refresh collection (${retries} retries left):`, err);
            if (retries > 0) {
              setTimeout(() => refreshWithRetry(retries - 1), 1000);
            }
          }
        };
        refreshWithRetry();
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
        
        // Also refresh tickets to ensure sync (especially for ticket-related errors)
        try {
          const freshTickets = await api.get('/banners/user/tickets').then(res => res.data);
          setTickets(freshTickets);
          broadcastTicketUpdate(freshTickets);
        } catch (ticketErr) {
          console.warn('Failed to refresh tickets after error:', ticketErr);
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
                  ⚠️ {t('banner.ticketLoadError') || 'Could not load ticket count. Ticket options may be unavailable.'}
                </TicketWarning>
              )}
              
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
                        <TicketButtonIcon>🎟️</TicketButtonIcon>
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
                        <TicketButtonIcon>🌟</TicketButtonIcon>
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
                        <TicketButtonIcon>🎟️</TicketButtonIcon>
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
                            <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                              <RarityIcon $color={getRarityColor(rarity)}>{rarityIcons[rarity]}</RarityIcon>
                              <DropRateLabel>{rarity}</DropRateLabel>
                              <DropRateValue $color={getRarityColor(rarity)}>{pricing.dropRates.banner[rarity]}%</DropRateValue>
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
                            <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                              <RarityIcon $color={getRarityColor(rarity)}>{rarityIcons[rarity]}</RarityIcon>
                              <DropRateLabel>{rarity}</DropRateLabel>
                              <DropRateValue $color={getRarityColor(rarity)}>{pricing.dropRates.standard[rarity]}%</DropRateValue>
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
                            <DropRateItem key={rarity} $color={getRarityColor(rarity)}>
                              <RarityIcon $color={getRarityColor(rarity)}>{rarityIcons[rarity]}</RarityIcon>
                              <DropRateLabel>{rarity}</DropRateLabel>
                              <DropRateValue $color={getRarityColor(rarity)}>{pricing.dropRates.premium[rarity]}%</DropRateValue>
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
  border: 2px solid ${props => props.$color};
  position: relative;
  box-shadow: ${props => props.$glow};
  
  img, video { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
  }
  
  ${props => props.$owned && `
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
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  box-shadow: ${props => props.$glow};
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
  border: 2px solid ${props => props.$color};
  box-shadow: ${props => props.$glow}, ${theme.shadows.lg};
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
  background: radial-gradient(circle at 50% 100%, ${props => props.$color}40 0%, transparent 70%);
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
  background: ${props => props.$isBanner 
    ? `linear-gradient(to bottom, rgba(255, 159, 10, 0.1), ${theme.colors.backgroundTertiary})`
    : theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  border: 2px solid ${props => props.$isBanner ? theme.colors.warning : props.$color};
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
const TicketWarning = styled.div`
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  color: ${theme.colors.warning || '#ffa500'};
  background: rgba(255, 165, 0, 0.1);
  border-radius: 6px;
  text-align: center;
`;

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
  border: 1px solid ${props => props.$color}40;
`;

const RarityIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: ${props => props.$color};
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
  color: ${props => props.$color};
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
  border: 2px solid ${props => props.$color};
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
  color: ${props => props.$color};
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
