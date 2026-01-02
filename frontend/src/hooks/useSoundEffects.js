/**
 * useSoundEffects - Hook for managing game sound effects
 *
 * Provides a simple API for playing game sounds with volume control,
 * muting, and preloading support.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { SOUND_EFFECTS } from '../config/essenceTapConfig';

// Sound file paths - these would be placed in public/sounds/
const SOUND_PATHS = {
  click: '/sounds/essence-tap/click',
  crit: '/sounds/essence-tap/crit',
  golden: '/sounds/essence-tap/golden',
  levelUp: '/sounds/essence-tap/level-up',
  prestige: '/sounds/essence-tap/prestige',
  purchase: '/sounds/essence-tap/purchase',
  milestone: '/sounds/essence-tap/milestone',
  abilityActivate: '/sounds/essence-tap/ability',
  bossHit: '/sounds/essence-tap/boss-hit',
  bossDefeat: '/sounds/essence-tap/boss-defeat',
  jackpot: '/sounds/essence-tap/jackpot'
};

// Storage key for sound preferences
const STORAGE_KEY = 'essenceTap_soundPrefs';

/**
 * Get stored sound preferences
 */
function getStoredPrefs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return { muted: false, volume: 0.5 };
}

/**
 * Save sound preferences
 */
function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore errors
  }
}

/**
 * Sound effects hook
 */
export function useSoundEffects() {
  const audioContextRef = useRef(null);
  const audioBuffersRef = useRef({});
  const [muted, setMuted] = useState(() => getStoredPrefs().muted);
  const [volume, setVolume] = useState(() => getStoredPrefs().volume);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize AudioContext
  useEffect(() => {
    // Create AudioContext on first user interaction (browser requirement)
    const initAudio = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
          console.warn('Web Audio API not supported');
        }
      }
      // Remove listeners after init
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Preload sounds
  useEffect(() => {
    const preloadSounds = async () => {
      if (!audioContextRef.current) return;

      const loadPromises = Object.entries(SOUND_PATHS).map(async ([key, path]) => {
        const soundConfig = SOUND_EFFECTS[key];
        const variations = soundConfig?.variations || 1;

        for (let i = 0; i < variations; i++) {
          const filePath = variations > 1 ? `${path}-${i + 1}.mp3` : `${path}.mp3`;
          const bufferKey = variations > 1 ? `${key}_${i + 1}` : key;

          try {
            const response = await fetch(filePath);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
              audioBuffersRef.current[bufferKey] = audioBuffer;
            }
          } catch {
            // Sound file not found, continue silently
          }
        }
      });

      await Promise.allSettled(loadPromises);
      setIsLoaded(true);
    };

    // Delay preload to avoid blocking initial render
    const timer = setTimeout(preloadSounds, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Helper to play fallback audio when Web Audio buffer not loaded
  const playFallbackAudio = useCallback((soundId, vol, variation) => {
    const path = SOUND_PATHS[soundId];
    if (!path) return;

    const filePath = variation ? `${path}-${variation}.mp3` : `${path}.mp3`;

    try {
      const audio = new Audio(filePath);
      audio.volume = vol;
      audio.play().catch(() => {
        // Ignore playback errors
      });
    } catch {
      // Ignore errors
    }
  }, []);

  // Play a sound
  const playSound = useCallback((soundId, options = {}) => {
    if (muted || !audioContextRef.current) return;

    const soundConfig = SOUND_EFFECTS[soundId];
    if (!soundConfig) return;

    const variations = soundConfig.variations || 1;
    const variation = variations > 1 ? Math.floor(Math.random() * variations) + 1 : null;
    const bufferKey = variation ? `${soundId}_${variation}` : soundId;

    const buffer = audioBuffersRef.current[bufferKey];
    if (!buffer) {
      // Fallback to simple audio if buffer not loaded
      playFallbackAudio(soundId, soundConfig.volume * volume, variation);
      return;
    }

    try {
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();

      source.buffer = buffer;
      gainNode.gain.value = (options.volume ?? soundConfig.volume) * volume;

      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      // Optional pitch variation
      if (options.pitchVariation) {
        source.playbackRate.value = 1 + (Math.random() - 0.5) * options.pitchVariation;
      }

      source.start(0);
    } catch (err) {
      console.warn('Failed to play sound:', err);
    }
  }, [muted, volume, playFallbackAudio]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newValue = !prev;
      savePrefs({ muted: newValue, volume });
      return newValue;
    });
  }, [volume]);

  // Set volume (0-1)
  const setMasterVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    savePrefs({ muted, volume: clampedVolume });
  }, [muted]);

  // Specific sound functions for convenience
  const playClick = useCallback((isCrit = false, isGolden = false) => {
    if (isGolden) {
      playSound('golden');
    } else if (isCrit) {
      playSound('crit');
    } else {
      playSound('click', { pitchVariation: 0.1 });
    }
  }, [playSound]);

  const playPurchase = useCallback(() => {
    playSound('purchase');
  }, [playSound]);

  const playLevelUp = useCallback(() => {
    playSound('levelUp');
  }, [playSound]);

  const playPrestige = useCallback(() => {
    playSound('prestige');
  }, [playSound]);

  const playMilestone = useCallback(() => {
    playSound('milestone');
  }, [playSound]);

  const playAbility = useCallback(() => {
    playSound('abilityActivate');
  }, [playSound]);

  const playBossHit = useCallback(() => {
    playSound('bossHit', { pitchVariation: 0.2 });
  }, [playSound]);

  const playBossDefeat = useCallback(() => {
    playSound('bossDefeat');
  }, [playSound]);

  const playJackpot = useCallback(() => {
    playSound('jackpot');
  }, [playSound]);

  return {
    // State
    muted,
    volume,
    isLoaded,

    // Controls
    toggleMute,
    setMasterVolume,

    // Generic play
    playSound,

    // Specific sounds
    playClick,
    playPurchase,
    playLevelUp,
    playPrestige,
    playMilestone,
    playAbility,
    playBossHit,
    playBossDefeat,
    playJackpot
  };
}

export default useSoundEffects;
