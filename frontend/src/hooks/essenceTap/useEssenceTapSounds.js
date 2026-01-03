/**
 * useEssenceTapSounds - Manages sound effects for Essence Tap
 *
 * Handles:
 * - Sound effect triggers for clicks, crits, golden clicks
 * - Purchase sound effects
 * - Prestige and milestone sounds
 * - Volume controls
 * - Mute functionality
 *
 * This is a wrapper around the useSoundEffects hook that provides
 * a simplified interface specifically for Essence Tap game actions.
 *
 * @returns {Object} Sound control functions
 */

import { useSoundEffects } from '../useSoundEffects';

export const useEssenceTapSounds = () => {
  const sounds = useSoundEffects();

  /**
   * Play click sound based on click type
   * @param {boolean} isCrit - Whether this was a critical hit
   * @param {boolean} isGolden - Whether this was a golden essence click
   */
  const playClickSound = (isCrit = false, isGolden = false) => {
    sounds.playClick(isCrit, isGolden);
  };

  /**
   * Play sound for generator/upgrade purchase
   */
  const playPurchaseSound = () => {
    sounds.playPurchase();
  };

  /**
   * Play sound for prestige action
   */
  const playPrestigeSound = () => {
    sounds.playPrestige();
  };

  /**
   * Play sound for milestone achievement
   */
  const playMilestoneSound = () => {
    sounds.playMilestone();
  };

  /**
   * Play sound for ability activation
   */
  const playAbilitySound = () => {
    // Using milestone sound as placeholder for ability activation
    sounds.playMilestone();
  };

  /**
   * Play sound for gamble win
   */
  const playGambleWinSound = () => {
    sounds.playMilestone();
  };

  /**
   * Play sound for gamble loss
   */
  const playGambleLossSound = () => {
    // Using a subtle click sound for loss
    sounds.playClick(false, false);
  };

  /**
   * Toggle all sound effects on/off
   */
  const toggleMute = () => {
    sounds.toggleMute();
  };

  /**
   * Set master volume (0-1)
   * @param {number} volume - Volume level between 0 and 1
   */
  const setVolume = (volume) => {
    sounds.setVolume(volume);
  };

  /**
   * Get current mute status
   * @returns {boolean} True if sounds are muted
   */
  const isMuted = () => {
    return sounds.isMuted;
  };

  /**
   * Get current volume level
   * @returns {number} Volume level between 0 and 1
   */
  const getVolume = () => {
    return sounds.volume;
  };

  return {
    // Sound playback
    playClickSound,
    playPurchaseSound,
    playPrestigeSound,
    playMilestoneSound,
    playAbilitySound,
    playGambleWinSound,
    playGambleLossSound,

    // Volume controls
    toggleMute,
    setVolume,
    isMuted,
    getVolume,

    // Direct access to underlying sounds hook if needed
    sounds,
  };
};
