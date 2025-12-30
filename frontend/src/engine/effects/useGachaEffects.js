/**
 * useGachaEffects
 *
 * Combined effects hook specifically for gacha/summon animations.
 * Orchestrates screen shake, flash, audio, and haptics together.
 */

import { useCallback, useMemo } from 'react';
import { useScreenShake, RARITY_SHAKE_MAP } from './useScreenShake';
import { useScreenFlash, RARITY_FLASH_MAP } from './useScreenFlash';
import { useHaptics } from './useHaptics';
import { useAudio, SOUND_CATEGORIES } from '../audio/AudioProvider';
import { GACHA_SOUNDS } from '../audio/soundRegistry';

// Effect intensity levels
export const EFFECT_INTENSITY = {
  MINIMAL: 0.3,  // Reduced effects
  NORMAL: 1.0,   // Full effects
  INTENSE: 1.5   // Extra dramatic
};

// Rarity tiers for effect scaling
const RARITY_TIERS = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4
};

export const useGachaEffects = (options = {}) => {
  const {
    intensity = EFFECT_INTENSITY.NORMAL,
    enableShake = true,
    enableFlash = true,
    enableSound = true,
    enableHaptics = true
  } = options;

  const { shake, stopShake } = useScreenShake();
  const { flash, stopFlash } = useScreenFlash();
  const { vibrate, revealRarity, impact, stop: stopHaptics } = useHaptics();
  const { play, stop: stopSound, stopAll: stopAllSounds } = useAudio();

  // Check for reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /**
   * Play the pull start effect (when user initiates a pull)
   */
  const playPullStart = useCallback(() => {
    if (enableSound) {
      play(GACHA_SOUNDS.PULL_START, { category: SOUND_CATEGORIES.SFX });
    }
    if (enableHaptics) {
      impact('light');
    }
  }, [play, impact, enableSound, enableHaptics]);

  /**
   * Play buildup tension effects
   * @returns {Function} Stop function to end the buildup
   */
  const playBuildup = useCallback(() => {
    let stopFn = null;

    if (enableSound) {
      stopFn = play(GACHA_SOUNDS.BUILDUP_LOOP, {
        category: SOUND_CATEGORIES.SFX,
        loop: true
      });
    }

    // Return function to stop buildup
    return () => {
      if (stopFn) {
        stopSound(GACHA_SOUNDS.BUILDUP_LOOP);
      }
    };
  }, [play, stopSound, enableSound]);

  /**
   * Play the reveal flash and associated effects
   * @param {string} rarity - Rarity of revealed character
   */
  const playReveal = useCallback((rarity) => {
    const rarityLower = rarity?.toLowerCase() || 'common';

    // Stop buildup sound
    stopSound(GACHA_SOUNDS.BUILDUP_LOOP);

    // Flash effect (scaled by intensity)
    if (enableFlash && !prefersReducedMotion) {
      const flashConfig = RARITY_FLASH_MAP[rarityLower] || RARITY_FLASH_MAP.common;
      flash({
        ...flashConfig,
        opacity: flashConfig.opacity * intensity
      });
    }

    // Screen shake disabled for summon animations
    // The shake transforms the app-shake-container which includes the fixed-position
    // summon overlay (due to CSS transform creating a new containing block).
    // This causes a visible "snap" when the shake ends.
    // The Pixi.js shockwave and flash effects already provide sufficient visual feedback.

    // Impact sound
    if (enableSound) {
      play(GACHA_SOUNDS.REVEAL_FLASH, { category: SOUND_CATEGORIES.SFX });
    }

    // Haptic feedback
    if (enableHaptics) {
      revealRarity(rarityLower);
    }
  }, [
    flash, play, stopSound, revealRarity,
    enableFlash, enableSound, enableHaptics,
    intensity, prefersReducedMotion
  ]);

  /**
   * Play character appearance effects
   * @param {string} rarity - Rarity of the character
   */
  const playCharacterAppear = useCallback((rarity) => {
    const rarityLower = rarity?.toLowerCase() || 'common';

    // Play rarity-specific reveal sound
    if (enableSound) {
      const soundMap = {
        common: GACHA_SOUNDS.REVEAL_COMMON,
        uncommon: GACHA_SOUNDS.REVEAL_UNCOMMON,
        rare: GACHA_SOUNDS.REVEAL_RARE,
        epic: GACHA_SOUNDS.REVEAL_EPIC,
        legendary: GACHA_SOUNDS.REVEAL_LEGENDARY
      };
      const sound = soundMap[rarityLower] || soundMap.common;
      play(sound, { category: SOUND_CATEGORIES.SFX });
    }

    // Card swoosh sound
    if (enableSound) {
      play(GACHA_SOUNDS.CARD_APPEAR, { category: SOUND_CATEGORIES.SFX });
    }
  }, [play, enableSound]);

  /**
   * Play continue/dismiss effect
   */
  const playContinue = useCallback(() => {
    if (enableSound) {
      play(GACHA_SOUNDS.CONTINUE, { category: SOUND_CATEGORIES.UI });
    }
    if (enableHaptics) {
      impact('light');
    }
  }, [play, impact, enableSound, enableHaptics]);

  /**
   * Complete reveal sequence - call this during the reveal phase
   * Combines flash, shake, and reveal sound in one orchestrated call
   * @param {string} rarity - Rarity of revealed character
   */
  const triggerRevealSequence = useCallback((rarity) => {
    // Play all reveal effects
    playReveal(rarity);

    // Slight delay then play character appear
    setTimeout(() => {
      playCharacterAppear(rarity);
    }, 100);
  }, [playReveal, playCharacterAppear]);

  /**
   * Stop all active effects
   */
  const stopAllEffects = useCallback(() => {
    stopShake();
    stopFlash();
    stopAllSounds();
    stopHaptics();
  }, [stopShake, stopFlash, stopAllSounds, stopHaptics]);

  /**
   * Get effect configuration based on rarity
   * Useful for conditional rendering based on what effects will play
   */
  const getEffectsForRarity = useCallback((rarity) => {
    const rarityLower = rarity?.toLowerCase() || 'common';
    const tier = RARITY_TIERS[rarityLower] || 0;

    return {
      hasShake: tier >= 2 && enableShake,
      hasFlash: enableFlash,
      hasSound: enableSound,
      hasHaptics: enableHaptics,
      tier,
      intensity: intensity * (1 + tier * 0.1)
    };
  }, [enableShake, enableFlash, enableSound, enableHaptics, intensity]);

  return {
    // Individual effect triggers
    playPullStart,
    playBuildup,
    playReveal,
    playCharacterAppear,
    playContinue,

    // Orchestrated sequences
    triggerRevealSequence,

    // Control functions
    stopAllEffects,

    // Utilities
    getEffectsForRarity,

    // Direct access to individual effect hooks
    shake,
    stopShake,
    flash,
    vibrate,
    play,

    // Settings
    intensity,
    prefersReducedMotion
  };
};

export default useGachaEffects;
