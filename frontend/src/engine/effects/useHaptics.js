/**
 * useHaptics
 *
 * Haptic feedback for mobile devices using the Vibration API.
 * Falls back gracefully on unsupported devices.
 */

import { useCallback, useMemo } from 'react';

// Haptic patterns (duration in ms or pattern array)
export const HAPTIC_PATTERNS = {
  // Light tap - button clicks
  TAP: 10,

  // Double tap - confirmations
  DOUBLE_TAP: [10, 50, 10],

  // Success - achievements, rewards
  SUCCESS: [10, 30, 10, 30, 20],

  // Error - invalid action
  ERROR: [50, 50, 50],

  // Impact - screen shake companion
  IMPACT_LIGHT: 15,
  IMPACT_MEDIUM: 30,
  IMPACT_HEAVY: 50,

  // Rarity reveals
  REVEAL_COMMON: 10,
  REVEAL_UNCOMMON: [10, 20, 10],
  REVEAL_RARE: [15, 30, 15],
  REVEAL_EPIC: [20, 40, 20, 40, 30],
  REVEAL_LEGENDARY: [30, 50, 30, 50, 30, 50, 50],

  // Fortune wheel
  WHEEL_TICK: 5,
  WHEEL_WIN: [20, 30, 20, 30, 40],
  WHEEL_JACKPOT: [30, 40, 30, 40, 30, 40, 60],

  // UI feedback
  BUTTON_PRESS: 8,
  TOGGLE: 12,
  SLIDER: 5,

  // Level up / milestone
  LEVEL_UP: [20, 30, 20, 30, 20, 30, 40],
  MILESTONE: [15, 25, 15, 25, 30]
};

// Map rarity to haptic pattern
const RARITY_HAPTIC_MAP = {
  common: HAPTIC_PATTERNS.REVEAL_COMMON,
  uncommon: HAPTIC_PATTERNS.REVEAL_UNCOMMON,
  rare: HAPTIC_PATTERNS.REVEAL_RARE,
  epic: HAPTIC_PATTERNS.REVEAL_EPIC,
  legendary: HAPTIC_PATTERNS.REVEAL_LEGENDARY
};

export const useHaptics = () => {
  // Check if Vibration API is supported
  const isSupported = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return 'vibrate' in navigator;
  }, []);

  // Check user preferences (some users disable haptics)
  const isEnabled = useMemo(() => {
    if (!isSupported) return false;
    // Could add a user preference check here
    return true;
  }, [isSupported]);

  /**
   * Trigger haptic feedback
   * @param {number|number[]} pattern - Duration in ms or pattern array
   */
  const vibrate = useCallback((pattern) => {
    if (!isEnabled) return false;

    try {
      return navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Haptic feedback failed:', e);
      return false;
    }
  }, [isEnabled]);

  /**
   * Stop any ongoing vibration
   */
  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      navigator.vibrate(0);
    } catch (_e) {
      // Ignore errors
    }
  }, [isSupported]);

  /**
   * Light tap feedback
   */
  const tap = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.TAP);
  }, [vibrate]);

  /**
   * Double tap feedback
   */
  const doubleTap = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.DOUBLE_TAP);
  }, [vibrate]);

  /**
   * Success feedback
   */
  const success = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.SUCCESS);
  }, [vibrate]);

  /**
   * Error feedback
   */
  const error = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.ERROR);
  }, [vibrate]);

  /**
   * Impact feedback with intensity
   * @param {'light'|'medium'|'heavy'} intensity
   */
  const impact = useCallback((intensity = 'medium') => {
    const patterns = {
      light: HAPTIC_PATTERNS.IMPACT_LIGHT,
      medium: HAPTIC_PATTERNS.IMPACT_MEDIUM,
      heavy: HAPTIC_PATTERNS.IMPACT_HEAVY
    };
    return vibrate(patterns[intensity] || patterns.medium);
  }, [vibrate]);

  /**
   * Haptic feedback for rarity reveal
   * @param {string} rarity - Rarity level
   */
  const revealRarity = useCallback((rarity) => {
    const pattern = RARITY_HAPTIC_MAP[rarity?.toLowerCase()] || HAPTIC_PATTERNS.REVEAL_COMMON;
    return vibrate(pattern);
  }, [vibrate]);

  /**
   * Wheel tick feedback
   */
  const wheelTick = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.WHEEL_TICK);
  }, [vibrate]);

  /**
   * Level up feedback
   */
  const levelUp = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.LEVEL_UP);
  }, [vibrate]);

  /**
   * Button press feedback
   */
  const buttonPress = useCallback(() => {
    return vibrate(HAPTIC_PATTERNS.BUTTON_PRESS);
  }, [vibrate]);

  return {
    isSupported,
    isEnabled,
    vibrate,
    stop,
    tap,
    doubleTap,
    success,
    error,
    impact,
    revealRarity,
    wheelTick,
    levelUp,
    buttonPress,
    patterns: HAPTIC_PATTERNS
  };
};

export default useHaptics;
