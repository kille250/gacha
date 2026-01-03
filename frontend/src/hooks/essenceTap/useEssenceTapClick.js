/**
 * useEssenceTapClick - Click/tap handling hook
 *
 * Manages click processing, combo system, and visual feedback.
 */

import { useState, useCallback, useRef } from 'react';
import {
  COMBO_CONFIG,
  GOLDEN_CONFIG,
  UI_TIMING
} from '../../config/essenceTapConfig';

/**
 * Click handling hook for Essence Tap
 * @param {Object} options - Hook options
 * @param {Object} options.gameState - Current game state
 * @param {function} options.onEssenceGain - Callback when essence is gained
 * @param {function} options.onSendTap - Callback to send tap to server
 * @param {function} options.playSound - Sound effect callback
 * @returns {Object} Click state and handlers
 */
export function useEssenceTapClick(options = {}) {
  const {
    gameState,
    onEssenceGain,
    onSendTap,
    playSound
  } = options;

  // Combo state
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboTimeoutRef = useRef(null);

  // Click feedback
  const [lastClickResult, setLastClickResult] = useState(null);
  const [clicksThisSecond, setClicksThisSecond] = useState(0);

  // Rate limiting
  const CLICKS_PER_SECOND_LIMIT = 20;

  /**
   * Handle a click/tap event
   */
  const handleClick = useCallback(() => {
    if (!gameState) return;

    // Rate limit clicks
    if (clicksThisSecond >= CLICKS_PER_SECOND_LIMIT) return;
    setClicksThisSecond(prev => prev + 1);
    setTimeout(() => setClicksThisSecond(prev => Math.max(0, prev - 1)), 1000);

    // Reset combo timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    // Update combo
    setComboMultiplier(prev => {
      const newCombo = Math.min(prev + COMBO_CONFIG.growthRate, COMBO_CONFIG.maxMultiplier);
      return newCombo;
    });

    // Set decay timeout
    comboTimeoutRef.current = setTimeout(() => {
      setComboMultiplier(1);
    }, COMBO_CONFIG.decayTime);

    // Calculate local click result (optimistic)
    const clickPower = gameState.clickPower || 1;
    const critChance = gameState.critChance || 0.01;
    const critMultiplier = gameState.critMultiplier || 10;

    const isCrit = Math.random() < critChance;
    const isGolden = Math.random() < GOLDEN_CONFIG.chance;

    let essenceGained = Math.floor(clickPower * comboMultiplier);
    if (isCrit) essenceGained = Math.floor(essenceGained * critMultiplier);
    if (isGolden) essenceGained = Math.floor(essenceGained * GOLDEN_CONFIG.multiplier);

    // Play sound effect
    if (playSound) {
      playSound(isCrit, isGolden);
    }

    // Set click result for visual feedback
    const clickTimestamp = Date.now();
    setLastClickResult({
      essenceGained,
      isCrit,
      isGolden,
      comboMultiplier,
      timestamp: clickTimestamp
    });

    // Clear click result after animation
    setTimeout(() => {
      setLastClickResult(prev =>
        prev?.timestamp === clickTimestamp ? null : prev
      );
    }, UI_TIMING.clickFeedbackDuration || 500);

    // Apply optimistic update
    if (onEssenceGain) {
      onEssenceGain(essenceGained);
    }

    // Send to server
    if (onSendTap) {
      onSendTap(1, comboMultiplier);
    }

    return {
      essenceGained,
      isCrit,
      isGolden,
      comboMultiplier
    };
  }, [gameState, comboMultiplier, clicksThisSecond, onEssenceGain, onSendTap, playSound]);

  /**
   * Reset combo to 1
   */
  const resetCombo = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    setComboMultiplier(1);
  }, []);

  /**
   * Get current combo info
   */
  const getComboInfo = useCallback(() => {
    return {
      multiplier: comboMultiplier,
      max: COMBO_CONFIG.maxMultiplier,
      decayTime: COMBO_CONFIG.decayTime,
      isActive: comboMultiplier > 1
    };
  }, [comboMultiplier]);

  /**
   * Cleanup
   */
  const cleanup = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
  }, []);

  return {
    // State
    comboMultiplier,
    lastClickResult,
    clicksThisSecond,

    // Handlers
    handleClick,
    resetCombo,
    getComboInfo,
    cleanup
  };
}

export default useEssenceTapClick;
