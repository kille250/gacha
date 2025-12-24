/**
 * useGachaPage - Hook for Gacha page logic
 *
 * Encapsulates banner fetching and carousel state for the Gacha page.
 */

import { useState, useCallback, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getActiveBanners, getAssetUrl } from '../utils/api';

/**
 * useGachaPage Hook
 *
 * @returns {Object} Gacha page state and handlers
 */
export function useGachaPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Data state
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Fetch banners
  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getActiveBanners();
      setBanners(data);
    } catch (err) {
      console.error("Error fetching banners:", err);
      setError(err.response?.data?.error || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Derived data
  const featuredBanners = banners.filter(b => b.featured);
  const otherBanners = banners.filter(b => !b.featured);

  // Ensure index stays in bounds
  const safeFeaturedIndex = featuredBanners.length > 0
    ? Math.min(featuredIndex, featuredBanners.length - 1)
    : 0;
  const currentFeaturedBanner = featuredBanners[safeFeaturedIndex];

  // Navigation handlers
  const handlePrevFeatured = useCallback(() => {
    setFeaturedIndex(prev => (prev > 0 ? prev - 1 : featuredBanners.length - 1));
  }, [featuredBanners.length]);

  const handleNextFeatured = useCallback(() => {
    setFeaturedIndex(prev => (prev < featuredBanners.length - 1 ? prev + 1 : 0));
  }, [featuredBanners.length]);

  const handleDotClick = useCallback((index) => {
    setFeaturedIndex(index);
  }, []);

  // Banner navigation
  const navigateToBanner = useCallback((bannerId) => {
    navigate(`/banner/${bannerId}`);
  }, [navigate]);

  const navigateToStandardRoll = useCallback(() => {
    navigate('/roll');
  }, [navigate]);

  // Help modal
  const openHelp = useCallback(() => {
    setShowHelpModal(true);
  }, []);

  const closeHelp = useCallback(() => {
    setShowHelpModal(false);
  }, []);

  // Utility functions
  const getBannerImage = useCallback((src) => {
    return src ? getAssetUrl(src) : 'https://via.placeholder.com/300x150?text=Banner';
  }, []);

  const getBannerCost = useCallback((banner) => {
    return Math.floor(100 * (banner.costMultiplier || 1.5));
  }, []);

  const getBannerBoostLabel = useCallback((banner) => {
    if (!banner.rateBoost) return null;
    return `+${Math.round((banner.rateBoost - 1) * 100)}%`;
  }, []);

  return {
    // Data
    banners,
    featuredBanners,
    otherBanners,
    currentFeaturedBanner,
    loading,
    error,
    user,

    // Featured carousel state
    featuredIndex: safeFeaturedIndex,
    handlePrevFeatured,
    handleNextFeatured,
    handleDotClick,

    // Help modal
    showHelpModal,
    openHelp,
    closeHelp,

    // Navigation
    navigateToBanner,
    navigateToStandardRoll,

    // Utilities
    getBannerImage,
    getBannerCost,
    getBannerBoostLabel,
    refetch: fetchBanners,
  };
}

export default useGachaPage;
