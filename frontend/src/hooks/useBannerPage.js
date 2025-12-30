/**
 * useBannerPage - Custom hook for banner page state and logic
 *
 * Extracts all state management and side effects from BannerPage
 * to improve maintainability and testability.
 *
 * @param {string} bannerId - The ID of the banner to load
 * @returns {Object} Banner page state and handlers
 */

import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import api, { getBannerById, getBannerPricing, getAssetUrl } from '../utils/api';
import { isVideo } from '../utils/mediaUtils';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError, useSkipAnimations } from '../hooks';
import { onVisibilityChange, invalidateFor, VISIBILITY_CALLBACK_IDS, CACHE_ACTIONS } from '../cache';
import { executeBannerRoll, executeBannerMultiRoll } from '../actions/gachaActions';
import { fetchWithRetry, createFetchGuard } from '../utils/fetchWithRetry';

/**
 * Broadcast ticket update to other tabs
 */
const broadcastTicketUpdate = (newTickets) => {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('gacha_ticket_sync');
      channel.postMessage({ type: 'TICKETS_UPDATED', tickets: newTickets });
      channel.close();
      return;
    } catch {
      // Fall through to localStorage fallback
    }
  }

  try {
    localStorage.setItem('gacha_tickets_sync', JSON.stringify({
      tickets: newTickets,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore localStorage errors
  }
};

export const useBannerPage = (bannerId) => {
  const { t } = useTranslation();
  const { user, refreshUser, setUser } = useContext(AuthContext);
  const { getRarityColor, getRarityGlow } = useRarity();

  // Action lock to prevent rapid double-clicks
  const { withLock, locked } = useActionLock(300);

  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();

  // Core state
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userCollection, setUserCollection] = useState([]);

  // Animation preferences
  const [skipAnimations, setSkipAnimations] = useSkipAnimations();

  // Roll state
  const [isRolling, setIsRolling] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);

  // Single roll state
  const [currentChar, setCurrentChar] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [showSummonAnimation, setShowSummonAnimation] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState(null);

  // Multi-roll state
  const [multiRollResults, setMultiRollResults] = useState([]);
  const [showMultiResults, setShowMultiResults] = useState(false);
  const [showMultiSummonAnimation, setShowMultiSummonAnimation] = useState(false);
  const [pendingMultiResults, setPendingMultiResults] = useState([]);

  // Character preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);

  // UI state
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Pricing and tickets
  const [pricing, setPricing] = useState(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  const [tickets, setTickets] = useState({ rollTickets: 0, premiumTickets: 0 });
  const [ticketLoadError, setTicketLoadError] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const collectionFetchGuard = useRef(createFetchGuard());

  // Computed values
  const singlePullCost = pricing?.singlePullCost || 100;
  const pullOptions = useMemo(() => pricing?.pullOptions || [], [pricing?.pullOptions]);
  const isAnimating = showSummonAnimation || showMultiSummonAnimation;

  const getMultiPullCost = useCallback((count) => {
    const option = pullOptions.find(o => o.count === count);
    return option?.finalCost || count * singlePullCost;
  }, [pullOptions, singlePullCost]);

  const bestValueCount = useMemo(() => {
    const multiOptions = pullOptions.filter(o => o.count > 1);
    if (multiOptions.length === 0) return null;
    const best = multiOptions.reduce((acc, opt) =>
      (opt.discountPercent || 0) > (acc.discountPercent || 0) ? opt : acc
      , multiOptions[0]);
    return best?.count || null;
  }, [pullOptions]);

  // Helper functions
  const getImagePath = useCallback((src) =>
    src ? getAssetUrl(src) : 'https://via.placeholder.com/300?text=No+Image'
    , []);

  const getBannerImage = useCallback((src) =>
    src ? getAssetUrl(src) : 'https://via.placeholder.com/1200x400?text=Banner'
    , []);

  const getVideoPath = useCallback((src) =>
    src ? getAssetUrl(src) : null
    , []);

  const isInCollection = useCallback((char) =>
    userCollection.some(c => c.id === char.id)
    , [userCollection]);

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

  // Fetch user collection
  const fetchUserCollection = useCallback(async () => {
    try {
      const response = await api.get('/characters/collection');
      setUserCollection(response.data);
    } catch (err) {
      console.error("Error fetching collection:", err);
    }
  }, []);

  // Character preview handlers
  const openPreview = useCallback((char) => {
    if (char) {
      setPreviewChar(char);
      setPreviewOpen(true);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewChar(null);
  }, []);

  // Video toggle
  const toggleVideo = useCallback(() => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsVideoPlaying(true))
        .catch(() => setIsVideoPlaying(false));
    }
  }, [isVideoPlaying]);

  // Single roll handler
  const handleRoll = useCallback(async (useTicket = false, ticketType = 'roll') => {
    await withLock(async () => {
      try {
        // Validate inside lock
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

        const result = await executeBannerRoll(bannerId, useTicket, ticketType, setUser);
        const { character, tickets: newTickets } = result;

        if (newTickets) {
          setTickets(newTickets);
          broadcastTicketUpdate(newTickets);
        }

        if (skipAnimations) {
          setCurrentChar(character);
          setShowCard(true);
          setLastRarities(prev => [character.rarity, ...prev.slice(0, 4)]);
          setIsRolling(false);
        } else {
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
          setPendingCharacter(character);
          setShowSummonAnimation(true);
        }

        // Non-blocking collection refresh with concurrency guard
        fetchWithRetry(fetchUserCollection, { guard: collectionFetchGuard.current });
      } catch (err) {
        setError(err.response?.data?.error || t('roll.failedRoll'));
        setIsRolling(false);

        await refreshUser();
        // Fetch tickets with cache invalidation to ensure fresh data
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
  }, [withLock, tickets, user?.points, singlePullCost, bannerId, setUser, skipAnimations, fetchUserCollection, refreshUser, t, setError]);

  // Multi-roll handler
  const handleMultiRoll = useCallback(async (count, useTickets = false, ticketType = 'roll') => {
    await withLock(async () => {
      try {
        // Validate inside lock
        if (useTickets) {
          if (ticketType === 'premium' && tickets.premiumTickets < count) {
            setError(t('banner.notEnoughTicketsMulti', { required: count, have: tickets.premiumTickets }));
            return;
          }
          if (ticketType === 'roll' && tickets.rollTickets < count) {
            setError(t('banner.notEnoughRollTicketsMulti', { required: count, have: tickets.rollTickets }));
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

        const result = await executeBannerMultiRoll(bannerId, count, useTickets, ticketType, setUser);
        const { characters, tickets: newTickets } = result;

        if (newTickets) {
          setTickets(newTickets);
          broadcastTicketUpdate(newTickets);
        }

        if (skipAnimations) {
          setMultiRollResults(characters);
          setShowMultiResults(true);

          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
          const bestRarity = characters.reduce((best, char) => {
            const idx = rarityOrder.indexOf(char.rarity);
            return idx > rarityOrder.indexOf(best) ? char.rarity : best;
          }, 'common');

          setLastRarities(prev => [bestRarity, ...prev.slice(0, 4)]);
          setIsRolling(false);
        } else {
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
          setPendingMultiResults(characters);
          setShowMultiSummonAnimation(true);
        }

        // Non-blocking collection refresh with concurrency guard
        fetchWithRetry(fetchUserCollection, { guard: collectionFetchGuard.current });
      } catch (err) {
        setError(err.response?.data?.error || t('roll.failedMultiRoll'));
        setIsRolling(false);

        await refreshUser();
        // Fetch tickets with cache invalidation to ensure fresh data
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
  }, [withLock, tickets, getMultiPullCost, user?.points, bannerId, setUser, skipAnimations, fetchUserCollection, refreshUser, t, setError]);

  // Animation complete handlers
  const handleSummonComplete = useCallback(() => {
    if (pendingCharacter) {
      setLastRarities(prev => [pendingCharacter.rarity, ...prev.slice(0, 4)]);
    }
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

  const handleMultiSummonComplete = useCallback(() => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const bestRarity = pendingMultiResults.reduce((best, char) => {
      const idx = rarityOrder.indexOf(char.rarity);
      return idx > rarityOrder.indexOf(best) ? char.rarity : best;
    }, 'common');

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

  // Close multi results
  const closeMultiResults = useCallback(() => {
    setShowMultiResults(false);
  }, []);

  // Effects

  // Initial data fetch
  useEffect(() => {
    const fetchBannerAndPricing = async () => {
      try {
        setLoading(true);
        setTicketLoadError(false);
        setPricingError(null);

        const bannerData = await getBannerById(bannerId);
        setBanner(bannerData);

        try {
          const pricingData = await getBannerPricing(bannerId);
          setPricing(pricingData);
          setPricingLoaded(true);
        } catch (pricingErr) {
          console.error('Failed to load pricing:', pricingErr);
          setPricingError(t('common.pricingUnavailable') || 'Pricing unavailable. Please refresh.');
          setPricingLoaded(true);
        }

        try {
          // Invalidate cache before fetching tickets to ensure fresh data
          invalidateFor(CACHE_ACTIONS.PRE_ROLL);
          const ticketsData = await api.get('/banners/user/tickets').then(res => res.data);
          setTickets(ticketsData);
        } catch {
          setTicketLoadError(true);
        }
      } catch (err) {
        setError(err.response?.data?.error || t('admin.failedLoadBanners'));
      } finally {
        setLoading(false);
      }
    };
    fetchBannerAndPricing();
  }, [bannerId, t, setError]);

  // Visibility change handler
  useEffect(() => {
    if (!bannerId) return;

    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.BANNER_PRICING, async (staleLevel) => {
      // Only refresh on critical staleness or worse
      if (!staleLevel) return;

      try {
        // Invalidate cache before fetching to ensure fresh data
        invalidateFor(CACHE_ACTIONS.PRE_ROLL);
        const [pricingData, ticketsData] = await Promise.all([
          getBannerPricing(bannerId),
          api.get('/banners/user/tickets').then(res => res.data)
        ]);
        setPricing(pricingData);
        setTickets(ticketsData);
        setTicketLoadError(false);
      } catch {
        // Ignore refresh errors
      }
    });
  }, [bannerId]);

  // Cross-tab ticket sync and same-tab ticket change notifications
  useEffect(() => {
    // Helper to refetch tickets from server
    const refetchTickets = async () => {
      try {
        invalidateFor(CACHE_ACTIONS.PRE_ROLL);
        const freshTickets = await api.get('/banners/user/tickets').then(res => res.data);
        if (freshTickets) {
          setTickets(freshTickets);
        }
      } catch {
        // Ignore refetch errors
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('gacha_ticket_sync');
      channel.onmessage = (event) => {
        if (event.data.type === 'TICKETS_UPDATED') {
          // Direct ticket update from roll actions
          setTickets(event.data.tickets);
        } else if (event.data.type === 'TICKETS_CHANGED') {
          // Tickets changed from FP exchange - refetch from server
          refetchTickets();
        }
      };
      return () => channel.close();
    }

    const handleStorage = (e) => {
      if (e.key === 'gacha_tickets_sync' && e.newValue) {
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData.tickets) {
            // Direct ticket update
            setTickets(syncData.tickets);
          } else if (syncData.type === 'TICKETS_CHANGED') {
            // Tickets changed from FP exchange - refetch from server
            refetchTickets();
          }
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Warn before unload during roll
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsRolling(false);
      setShowSummonAnimation(false);
      setShowMultiSummonAnimation(false);
      setPendingCharacter(null);
      setPendingMultiResults([]);
    };
  }, []);

  // Fetch initial collection
  useEffect(() => {
    refreshUser();
    fetchUserCollection();
  }, [refreshUser, fetchUserCollection]);

  // Network offline detection
  useEffect(() => {
    const handleOffline = () => {
      if (isRolling || showSummonAnimation || showMultiSummonAnimation) {
        setError(t('common.networkDisconnected') || 'Network disconnected. Please check your connection.');
        setIsRolling(false);
        setShowSummonAnimation(false);
        setShowMultiSummonAnimation(false);
        setPendingCharacter(null);
        setPendingMultiResults([]);
      }
    };

    const handleOnline = async () => {
      refreshUser();
      fetchUserCollection();
      // Fetch tickets with cache invalidation to ensure fresh data
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

  return {
    // State
    banner,
    loading,
    error,
    setError,
    user,
    userCollection,

    // Roll state
    isRolling,
    rollCount,
    lastRarities,
    currentChar,
    showCard,
    multiRollResults,
    showMultiResults,

    // Animation state
    skipAnimations,
    setSkipAnimations,
    showSummonAnimation,
    pendingCharacter,
    showMultiSummonAnimation,
    pendingMultiResults,
    isAnimating,

    // Preview state
    previewOpen,
    previewChar,
    openPreview,
    closePreview,

    // UI state
    showInfoPanel,
    setShowInfoPanel,
    isVideoPlaying,
    videoRef,
    toggleVideo,

    // Pricing and tickets
    pricing,
    pricingLoaded,
    pricingError,
    singlePullCost,
    pullOptions,
    bestValueCount,
    tickets,
    ticketLoadError,

    // Rarity helpers
    getRarityColor,
    getRarityGlow,

    // Path helpers
    getImagePath,
    getBannerImage,
    getVideoPath,
    isVideo,
    isInCollection,

    // Computed helpers
    getMultiPullCost,
    getDisabledReason,
    locked,

    // Handlers
    handleRoll,
    handleMultiRoll,
    handleSummonComplete,
    handleMultiSummonComplete,
    closeMultiResults,
  };
};

export default useBannerPage;
