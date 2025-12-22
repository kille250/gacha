import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getRarityConfig } from '../utils/api';
import { onVisibilityChange, STALE_THRESHOLDS } from '../utils/cacheManager';

/**
 * RarityContext
 * 
 * Provides dynamic rarity configuration (colors, animation settings, drop rates)
 * fetched from the backend. Falls back to default values if fetch fails.
 */

const RarityContext = createContext(null);

// Default fallback values (matches the backend defaults)
const DEFAULT_RARITY_CONFIG = {
  colors: {
    common: '#8e8e93',
    uncommon: '#30d158',
    rare: '#0a84ff',
    epic: '#bf5af2',
    legendary: '#ff9f0a'
  },
  animation: {
    common: {
      color: '#8e8e93',
      accentColor: '#a8a8ad',
      glowIntensity: 0.3,
      buildupTime: 800,
      confettiCount: 0,
      orbCount: 3,
      ringCount: 1
    },
    uncommon: {
      color: '#30d158',
      accentColor: '#5fe07a',
      glowIntensity: 0.5,
      buildupTime: 1000,
      confettiCount: 30,
      orbCount: 4,
      ringCount: 1
    },
    rare: {
      color: '#0a84ff',
      accentColor: '#409cff',
      glowIntensity: 0.7,
      buildupTime: 1400,
      confettiCount: 80,
      orbCount: 5,
      ringCount: 2
    },
    epic: {
      color: '#bf5af2',
      accentColor: '#d183f5',
      glowIntensity: 0.85,
      buildupTime: 1800,
      confettiCount: 120,
      orbCount: 6,
      ringCount: 2
    },
    legendary: {
      color: '#ff9f0a',
      accentColor: '#ffc040',
      glowIntensity: 1.0,
      buildupTime: 2200,
      confettiCount: 200,
      orbCount: 8,
      ringCount: 3
    }
  },
  ordered: [
    { name: 'common', displayName: 'Common', color: '#8e8e93', order: 1, isPityEligible: false },
    { name: 'uncommon', displayName: 'Uncommon', color: '#30d158', order: 2, isPityEligible: false },
    { name: 'rare', displayName: 'Rare', color: '#0a84ff', order: 3, isPityEligible: true },
    { name: 'epic', displayName: 'Epic', color: '#bf5af2', order: 4, isPityEligible: true },
    { name: 'legendary', displayName: 'Legendary', color: '#ff9f0a', order: 5, isPityEligible: true }
  ],
  dropRates: {
    standard: { single: {}, multi: {} },
    banner: { single: {}, multi: {} },
    premium: { single: {}, multi: {} },
    pity: {}
  }
};

export const RarityProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_RARITY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRarityConfig();
      setConfig(data);
      setError(null);
    } catch (err) {
      console.warn('Failed to load rarity config, using defaults:', err);
      setError(err);
      // Keep using default config
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Track when config was last fetched
  const lastFetchRef = useRef(Date.now());
  
  // Refetch rarity config when tab regains focus after being hidden for 5+ minutes
  // This handles admin updates to rarity colors/settings while user is idle
  // Uses centralized visibility handler from cacheManager for consistency
  useEffect(() => {
    return onVisibilityChange('rarity-config', (staleLevel, elapsed) => {
      // Refresh when static threshold is reached (5 minutes)
      // or if staleLevel is 'static' (already categorized by cacheManager)
      if (staleLevel === 'static' || elapsed > STALE_THRESHOLDS.static) {
        const timeSinceLastFetch = Date.now() - lastFetchRef.current;
        // Only refetch if we haven't fetched recently (prevents duplicate calls)
        if (timeSinceLastFetch > STALE_THRESHOLDS.static) {
          fetchConfig();
          lastFetchRef.current = Date.now();
        }
      }
    });
  }, [fetchConfig]);

  // Helper functions
  const getRarityColor = useCallback((rarity) => {
    return config.colors[rarity?.toLowerCase()] || config.colors.common || '#8e8e93';
  }, [config.colors]);

  const getRarityAnimation = useCallback((rarity) => {
    return config.animation[rarity?.toLowerCase()] || config.animation.common || DEFAULT_RARITY_CONFIG.animation.common;
  }, [config.animation]);

  const getOrderedRarities = useCallback(() => {
    return config.ordered || DEFAULT_RARITY_CONFIG.ordered;
  }, [config.ordered]);

  const getRarityGlow = useCallback((rarity) => {
    const color = getRarityColor(rarity);
    return `0 0 20px ${color}50, 0 0 40px ${color}30`;
  }, [getRarityColor]);

  const value = {
    config,
    loading,
    error,
    refetch: fetchConfig,
    getRarityColor,
    getRarityAnimation,
    getOrderedRarities,
    getRarityGlow,
    // Direct access to config parts
    colors: config.colors,
    animation: config.animation,
    ordered: config.ordered,
    dropRates: config.dropRates
  };

  return (
    <RarityContext.Provider value={value}>
      {children}
    </RarityContext.Provider>
  );
};

export const useRarity = () => {
  const context = useContext(RarityContext);
  if (!context) {
    // Return default utilities if used outside provider
    return {
      config: DEFAULT_RARITY_CONFIG,
      loading: false,
      error: null,
      refetch: () => {},
      getRarityColor: (rarity) => DEFAULT_RARITY_CONFIG.colors[rarity?.toLowerCase()] || '#8e8e93',
      getRarityAnimation: (rarity) => DEFAULT_RARITY_CONFIG.animation[rarity?.toLowerCase()] || DEFAULT_RARITY_CONFIG.animation.common,
      getOrderedRarities: () => DEFAULT_RARITY_CONFIG.ordered,
      getRarityGlow: (rarity) => {
        const color = DEFAULT_RARITY_CONFIG.colors[rarity?.toLowerCase()] || '#8e8e93';
        return `0 0 20px ${color}50, 0 0 40px ${color}30`;
      },
      colors: DEFAULT_RARITY_CONFIG.colors,
      animation: DEFAULT_RARITY_CONFIG.animation,
      ordered: DEFAULT_RARITY_CONFIG.ordered,
      dropRates: DEFAULT_RARITY_CONFIG.dropRates
    };
  }
  return context;
};

export default RarityContext;

