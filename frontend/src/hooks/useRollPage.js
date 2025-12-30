/**
 * useRollPage - Custom hook for roll page state and logic
 *
 * Extracts all state management and side effects from RollPage
 * to improve maintainability and testability.
 *
 * @returns {Object} Roll page state and handlers
 */

import { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { getStandardPricing, getAssetUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { useActionLock, useAutoDismissError, useSkipAnimations } from '../hooks';
import { onVisibilityChange, VISIBILITY_CALLBACK_IDS } from '../cache';
import { executeStandardRoll, executeStandardMultiRoll } from '../actions/gachaActions';

const DEFAULT_SINGLE_PULL_COST = 100;

export const useRollPage = () => {
  const { t } = useTranslation();
  const { user, refreshUser, setUser } = useContext(AuthContext);
  const { getRarityColor } = useRarity();

  // Action lock to prevent rapid double-clicks
  const { withLock, locked } = useActionLock(300);

  // Auto-dismissing error state
  const [error, setError] = useAutoDismissError();

  // Unmount guard for async operations
  const isMountedRef = useRef(true);

  // Core state
  const [currentChar, setCurrentChar] = useState(null);
  const [multiRollResults, setMultiRollResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showMultiResults, setShowMultiResults] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);

  // Animation skip preference (shared across gacha pages)
  const [skipAnimations, setSkipAnimations] = useSkipAnimations();

  // Summoning animation state
  const [showSummonAnimation, setShowSummonAnimation] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState(null);
  const [showMultiSummonAnimation, setShowMultiSummonAnimation] = useState(false);
  const [pendingMultiResults, setPendingMultiResults] = useState([]);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);

  // Pricing from server
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

  // Derive best value option from highest discount percentage
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      setIsRolling(false);
      setShowSummonAnimation(false);
      setShowMultiSummonAnimation(false);
      setPendingCharacter(null);
      setPendingMultiResults([]);
    };
  }, []);

  // Fetch pricing from server
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setPricingError(null);
        const data = await getStandardPricing();
        if (isMountedRef.current) {
          setPricing(data);
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
        if (isMountedRef.current) {
          setPricingError(t('common.pricingUnavailable') || 'Pricing unavailable. Please refresh.');
        }
      } finally {
        if (isMountedRef.current) {
          setPricingLoaded(true);
        }
      }
    };
    fetchPricing();
  }, [t]);

  // Refresh pricing when tab regains focus
  useEffect(() => {
    return onVisibilityChange(VISIBILITY_CALLBACK_IDS.ROLL_PRICING, async () => {
      try {
        const data = await getStandardPricing();
        if (isMountedRef.current) {
          setPricing(data);
        }
      } catch (err) {
        console.warn('Failed to refresh pricing on visibility:', err);
      }
    });
  }, []);

  // Warn user before leaving during a roll
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
      refreshUser();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [isRolling, showSummonAnimation, showMultiSummonAnimation, t, refreshUser, setError]);

  // Check for pending roll on mount
  useEffect(() => {
    try {
      const pendingRoll = sessionStorage.getItem('gacha_pendingRoll_standard');
      if (pendingRoll) {
        const { timestamp } = JSON.parse(pendingRoll);
        if (Date.now() - timestamp < 30000) {
          setError(t('roll.rollInterrupted') || 'A roll may have been interrupted. Your data has been refreshed.');
          refreshUser();
        }
        sessionStorage.removeItem('gacha_pendingRoll_standard');
      }

      const unviewedRoll = sessionStorage.getItem('gacha_unviewedRoll_standard');
      if (unviewedRoll) {
        const { timestamp } = JSON.parse(unviewedRoll);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setError(t('roll.unviewedRoll') || 'You have unviewed pulls! Check your collection.');
        }
        sessionStorage.removeItem('gacha_unviewedRoll_standard');
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [t, refreshUser, setError]);

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

  // Handle single roll
  const handleRoll = async () => {
    await withLock(async () => {
      try {
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

        try {
          sessionStorage.setItem('gacha_pendingRoll_standard', JSON.stringify({
            timestamp: Date.now(),
            type: 'single'
          }));
        } catch {
          // Ignore sessionStorage errors
        }

        const result = await executeStandardRoll(setUser);
        const { updatedPoints, ...character } = result;

        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
        }

        if (!isMountedRef.current) return;

        if (skipAnimations) {
          setCurrentChar(character);
          setShowCard(true);
          setLastRarities(prev => [character.rarity, ...prev.slice(0, 4)]);
          setIsRolling(false);
        } else {
          try {
            sessionStorage.setItem('gacha_unviewedRoll_standard', JSON.stringify({
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
      } catch (err) {
        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
        }

        if (!isMountedRef.current) return;
        setError(err.response?.data?.error || t('roll.failedRoll'));
        setIsRolling(false);
        await refreshUser();
      }
    });
  };

  // Handle summon animation complete
  const handleSummonComplete = useCallback(() => {
    if (pendingCharacter) {
      setLastRarities(prev => [pendingCharacter.rarity, ...prev.slice(0, 4)]);
    }
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

  // Handle multi roll
  const handleMultiRoll = async (count) => {
    await withLock(async () => {
      try {
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

        try {
          sessionStorage.setItem('gacha_pendingRoll_standard', JSON.stringify({
            timestamp: Date.now(),
            type: 'multi',
            count
          }));
        } catch {
          // Ignore sessionStorage errors
        }

        const result = await executeStandardMultiRoll(count, setUser);
        const { characters } = result;

        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
        }

        if (!isMountedRef.current) return;

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
            sessionStorage.setItem('gacha_unviewedRoll_standard', JSON.stringify({
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
      } catch (err) {
        try {
          sessionStorage.removeItem('gacha_pendingRoll_standard');
        } catch {
          // Ignore sessionStorage errors
        }

        if (!isMountedRef.current) return;
        setError(err.response?.data?.error || t('roll.failedMultiRoll'));
        setIsRolling(false);
        await refreshUser();
      }
    });
  };

  // Handle multi summon animation complete
  const handleMultiSummonComplete = useCallback(() => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const bestRarity = pendingMultiResults.reduce((best, char) => {
      const idx = rarityOrder.indexOf(char.rarity);
      return idx > rarityOrder.indexOf(best) ? char.rarity : best;
    }, 'common');

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

  // Get image path helper
  const getImagePath = useCallback((src) => {
    return src ? getAssetUrl(src) : 'https://via.placeholder.com/300?text=No+Image';
  }, []);

  // Preview handlers
  const openPreview = useCallback((character) => {
    if (character) {
      setPreviewChar(character);
      setPreviewOpen(true);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewChar(null);
  }, []);

  // Close multi results
  const closeMultiResults = useCallback(() => {
    setShowMultiResults(false);
  }, []);

  return {
    // Core state
    user,
    error,
    setError,
    isRolling,
    locked,

    // Roll results
    currentChar,
    multiRollResults,
    showCard,
    showMultiResults,
    closeMultiResults,
    rollCount,
    lastRarities,

    // Animation state
    skipAnimations,
    setSkipAnimations,
    showSummonAnimation,
    pendingCharacter,
    showMultiSummonAnimation,
    pendingMultiResults,
    isAnimating,
    handleSummonComplete,
    handleMultiSummonComplete,

    // Preview state
    previewOpen,
    previewChar,
    openPreview,
    closePreview,

    // Pricing
    pricing,
    pricingLoaded,
    pricingError,
    singlePullCost,
    pullOptions,
    bestValueCount,

    // Helpers
    getRarityColor,
    getImagePath,
    getDisabledReason,

    // Handlers
    handleRoll,
    handleMultiRoll,
  };
};

export default useRollPage;
