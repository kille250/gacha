/**
 * useGachaRoll - Shared gacha roll logic extracted from BannerPage and RollPage
 * 
 * This hook encapsulates:
 * - Roll animation state management
 * - Single/multi roll flow
 * - Summoning animation orchestration
 * - Preview modal state
 * - Rarity tracking
 * - Confetti effects
 */
import { useState, useCallback, useContext } from 'react';
import confetti from 'canvas-confetti';
import { AuthContext } from '../context/AuthContext';
import { useRarity } from '../context/RarityContext';
import { getAssetUrl } from '../utils/api';
import { applyPointsUpdate } from '../utils/userStateUpdates';

// ==================== CONSTANTS ====================

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const MAX_RARITY_HISTORY = 5;

// ==================== TYPES ====================

/**
 * @typedef {Object} RollConfig
 * @property {boolean} [skipAnimations] - Whether to skip summoning animations
 */

/**
 * @typedef {Object} RollResult
 * @property {Object} character - The rolled character
 * @property {number} [updatedPoints] - User's new point balance
 * @property {Object} [tickets] - Updated ticket counts
 */

// ==================== HOOK ====================

/**
 * Custom hook for managing gacha roll state and animations
 * @param {Object} options - Hook configuration
 * @param {Function} options.onRollComplete - Callback when a roll completes (for collection refresh, etc.)
 * @returns {Object} Roll state and handlers
 */
export const useGachaRoll = ({ onRollComplete } = {}) => {
  const { setUser } = useContext(AuthContext);
  const { getRarityColor } = useRarity();

  // ==================== STATE ====================
  
  // Core roll state
  const [currentChar, setCurrentChar] = useState(null);
  const [multiRollResults, setMultiRollResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showMultiResults, setShowMultiResults] = useState(false);
  const [error, setError] = useState(null);
  
  // Animation state - persist fast mode preference
  const [skipAnimations, setSkipAnimationsState] = useState(() => {
    try {
      return localStorage.getItem('gacha_skipAnimations') === 'true';
    } catch {
      return false;
    }
  });
  
  // Persist skipAnimations to localStorage when it changes
  const setSkipAnimations = useCallback((value) => {
    setSkipAnimationsState(value);
    try {
      localStorage.setItem('gacha_skipAnimations', value.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, []);
  const [showSummonAnimation, setShowSummonAnimation] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState(null);
  const [showMultiSummonAnimation, setShowMultiSummonAnimation] = useState(false);
  const [pendingMultiResults, setPendingMultiResults] = useState([]);
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState(null);
  
  // Roll tracking
  const [rollCount, setRollCount] = useState(0);
  const [lastRarities, setLastRarities] = useState([]);

  // ==================== COMPUTED ====================
  
  const isAnimating = showSummonAnimation || showMultiSummonAnimation;

  // ==================== HELPERS ====================

  /**
   * Show confetti effect for rare pulls
   */
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

  /**
   * Get the highest rarity from a list of characters
   */
  const getBestRarity = useCallback((characters) => {
    return characters.reduce((best, char) => {
      const idx = RARITY_ORDER.indexOf(char.rarity);
      return idx > RARITY_ORDER.indexOf(best) ? char.rarity : best;
    }, 'common');
  }, []);

  /**
   * Add rarity to history (most recent first, max 5)
   */
  const addToRarityHistory = useCallback((rarity) => {
    setLastRarities(prev => [rarity, ...prev.slice(0, MAX_RARITY_HISTORY - 1)]);
  }, []);

  /**
   * Get image path with fallback
   */
  const getImagePath = useCallback((src) => {
    return src ? getAssetUrl(src) : 'https://via.placeholder.com/300?text=No+Image';
  }, []);

  // ==================== RESET HELPERS ====================

  /**
   * Reset state before a new roll
   */
  const resetForNewRoll = useCallback(() => {
    setShowCard(false);
    setShowMultiResults(false);
    setError(null);
    setMultiRollResults([]);
  }, []);

  /**
   * Reset all roll state (for cleanup)
   */
  const resetAll = useCallback(() => {
    setCurrentChar(null);
    setMultiRollResults([]);
    setIsRolling(false);
    setShowCard(false);
    setShowMultiResults(false);
    setShowSummonAnimation(false);
    setShowMultiSummonAnimation(false);
    setPendingCharacter(null);
    setPendingMultiResults([]);
    setError(null);
  }, []);

  // ==================== SINGLE ROLL ====================

  /**
   * Process a single roll result
   * @param {Object} result - The roll result from API
   * @param {Object} result.character - The rolled character
   * @param {number} [result.updatedPoints] - User's new point balance
   * @param {Object} [result.tickets] - Updated ticket counts
   * @returns {Object} Processed result with ticket data
   */
  const processSingleRoll = useCallback(async (result) => {
    const { character, updatedPoints, tickets } = result;
    
    // Update points immediately from response
    applyPointsUpdate(setUser, updatedPoints);
    
    if (skipAnimations) {
      // Skip animation - show card directly
      setCurrentChar(character);
      setShowCard(true);
      addToRarityHistory(character.rarity);
      showRarePullEffect(character.rarity);
      setIsRolling(false);
    } else {
      // Show summoning animation
      setPendingCharacter(character);
      setShowSummonAnimation(true);
    }
    
    // Notify parent for side effects (e.g., collection refresh)
    onRollComplete?.();
    
    return { character, tickets };
  }, [setUser, skipAnimations, addToRarityHistory, showRarePullEffect, onRollComplete]);

  /**
   * Start a single roll
   * Call this to begin the roll process, then pass API result to processSingleRoll
   */
  const startSingleRoll = useCallback(() => {
    setIsRolling(true);
    resetForNewRoll();
    setRollCount(prev => prev + 1);
  }, [resetForNewRoll]);

  /**
   * Handle single roll error
   */
  const handleRollError = useCallback((err, fallbackMessage = 'Roll failed') => {
    setError(err.response?.data?.error || fallbackMessage);
    setIsRolling(false);
  }, []);

  // ==================== MULTI ROLL ====================

  /**
   * Process multi-roll results
   * @param {Object} result - The roll result from API
   * @param {Array} result.characters - Array of rolled characters
   * @param {number} [result.updatedPoints] - User's new point balance
   * @param {Object} [result.tickets] - Updated ticket counts
   * @returns {Object} Processed result with ticket data
   */
  const processMultiRoll = useCallback(async (result) => {
    const { characters, updatedPoints, tickets } = result;
    
    // Update points immediately from response
    applyPointsUpdate(setUser, updatedPoints);
    
    if (skipAnimations) {
      // Skip animation - show results directly
      setMultiRollResults(characters);
      setShowMultiResults(true);
      
      const bestRarity = getBestRarity(characters);
      addToRarityHistory(bestRarity);
      
      // Celebrate if any rare+ pulls
      if (characters.some(c => ['rare', 'epic', 'legendary'].includes(c.rarity))) {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      }
      setIsRolling(false);
    } else {
      // Show multi-summon animation
      setPendingMultiResults(characters);
      setShowMultiSummonAnimation(true);
    }
    
    // Notify parent for side effects
    onRollComplete?.();
    
    return { characters, tickets };
  }, [setUser, skipAnimations, getBestRarity, addToRarityHistory, onRollComplete]);

  /**
   * Start a multi-roll
   * @param {number} count - Number of rolls
   */
  const startMultiRoll = useCallback((count) => {
    setIsRolling(true);
    resetForNewRoll();
    setRollCount(prev => prev + count);
  }, [resetForNewRoll]);

  // ==================== ANIMATION CALLBACKS ====================

  /**
   * Called when single summon animation completes
   */
  const handleSummonComplete = useCallback(() => {
    if (pendingCharacter) {
      addToRarityHistory(pendingCharacter.rarity);
    }
    setShowSummonAnimation(false);
    setPendingCharacter(null);
    setCurrentChar(null);
    setShowCard(false);
    setIsRolling(false);
  }, [pendingCharacter, addToRarityHistory]);

  /**
   * Called when multi-summon animation completes
   */
  const handleMultiSummonComplete = useCallback(() => {
    const bestRarity = getBestRarity(pendingMultiResults);
    addToRarityHistory(bestRarity);
    
    setShowMultiSummonAnimation(false);
    setPendingMultiResults([]);
    setMultiRollResults([]);
    setShowMultiResults(false);
    setIsRolling(false);
  }, [pendingMultiResults, getBestRarity, addToRarityHistory]);

  // ==================== PREVIEW MODAL ====================

  /**
   * Open character preview modal
   */
  const openPreview = useCallback((character) => {
    if (character) {
      setPreviewChar(character);
      setPreviewOpen(true);
    }
  }, []);

  /**
   * Close character preview modal
   */
  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewChar(null);
  }, []);

  // ==================== RETURN ====================

  return {
    // Core state
    currentChar,
    multiRollResults,
    isRolling,
    showCard,
    showMultiResults,
    error,
    setError,
    
    // Animation state
    skipAnimations,
    setSkipAnimations,
    showSummonAnimation,
    pendingCharacter,
    showMultiSummonAnimation,
    pendingMultiResults,
    isAnimating,
    
    // Preview modal
    previewOpen,
    previewChar,
    openPreview,
    closePreview,
    
    // Roll tracking
    rollCount,
    lastRarities,
    
    // Single roll
    startSingleRoll,
    processSingleRoll,
    handleRollError,
    
    // Multi roll
    startMultiRoll,
    processMultiRoll,
    
    // Animation callbacks
    handleSummonComplete,
    handleMultiSummonComplete,
    
    // Helpers
    getImagePath,
    showRarePullEffect,
    resetAll
  };
};

export default useGachaRoll;

