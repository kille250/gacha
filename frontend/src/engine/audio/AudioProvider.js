/**
 * AudioProvider
 *
 * Centralized audio management using Howler.js
 * Features:
 * - Lazy loading of audio assets
 * - Volume control per category
 * - Mute/unmute support
 * - Synthesized sounds for immediate feedback (no asset loading required)
 * - Respects user preferences (reduced motion = reduced audio)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Howl, Howler } from 'howler';

// Sound categories for granular volume control
export const SOUND_CATEGORIES = {
  MASTER: 'master',
  SFX: 'sfx',
  MUSIC: 'music',
  UI: 'ui'
};

const STORAGE_KEY = 'gacha_audio_settings';

// Default settings
const DEFAULT_SETTINGS = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  uiVolume: 0.6,
  muted: false
};

// Audio context for synthesis
let audioContext = null;

const getAudioContext = () => {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Synthesize sounds without external files
const synthesizeSound = (type, volume = 0.5) => {
  const ctx = getAudioContext();
  if (!ctx) return null;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);

  switch (type) {
    case 'click': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gainNode.gain.setValueAtTime(volume * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case 'hover': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(volume * 0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.03);
      break;
    }

    case 'whoosh': {
      // Noise-based whoosh
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.3);
      filter.Q.value = 1;

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.gain.setValueAtTime(volume * 0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      noise.start(now);
      break;
    }

    case 'impact': {
      // Deep impact sound
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(80, now);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.2);

      gainNode.gain.setValueAtTime(volume * 0.6, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gainNode);
      osc2.connect(gainNode);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.2);
      osc2.stop(now + 0.2);
      break;
    }

    case 'chime_low': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gainNode.gain.setValueAtTime(volume * 0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }

    case 'chime_medium': {
      const frequencies = [523, 659];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(volume * 0.35, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.08);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + 0.5 + i * 0.08);
      });
      break;
    }

    case 'chime_high': {
      const frequencies = [659, 784, 880];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(volume * 0.35, now + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.07);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + 0.6 + i * 0.07);
      });
      break;
    }

    case 'fanfare_short': {
      // Epic reveal - ascending arpeggio
      const frequencies = [523, 659, 784, 1047];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(volume * 0.4, now + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + 0.8);
      });
      break;
    }

    case 'fanfare_full': {
      // Legendary reveal - full fanfare with harmony
      const chords = [
        [523, 659, 784],
        [587, 740, 880],
        [659, 784, 1047]
      ];
      chords.forEach((chord, ci) => {
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = ci === 2 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now + ci * 0.15);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.setValueAtTime(volume * 0.3, now + ci * 0.15);
          g.gain.setValueAtTime(volume * 0.3, now + ci * 0.15 + 0.3);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + ci * 0.15);
          osc.stop(now + 1.2);
        });
      });
      break;
    }

    case 'swoosh': {
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.15);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.gain.setValueAtTime(volume * 0.3, now);
      noise.start(now);
      break;
    }

    case 'tick': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      gainNode.gain.setValueAtTime(volume * 0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.02);
      break;
    }

    case 'coin': {
      const frequencies = [1319, 1568, 1319];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        const g = ctx.createGain();
        g.gain.setValueAtTime(volume * 0.3, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.3);
      });
      break;
    }

    case 'jackpot': {
      // Exciting jackpot sound
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        const freq = 440 * Math.pow(2, i / 6);
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(volume * 0.35, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + 1.0);
      }
      break;
    }

    case 'success': {
      const frequencies = [523, 659, 784];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(volume * 0.3, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + 0.5);
      });
      break;
    }

    case 'error': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(150, now + 0.1);
      gainNode.gain.setValueAtTime(volume * 0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'level_up': {
      // Triumphant ascending scale
      const scale = [523, 587, 659, 698, 784, 880, 988, 1047];
      scale.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        const g = ctx.createGain();
        g.gain.setValueAtTime(volume * 0.3, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.8);
      });
      break;
    }

    case 'reward': {
      const frequencies = [784, 988, 1175, 1319];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        const g = ctx.createGain();
        g.gain.setValueAtTime(volume * 0.35, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + 0.6);
      });
      break;
    }

    case 'tension': {
      // Low rumbling tension
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, now);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4, now);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(10, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gainNode.gain.setValueAtTime(volume * 0.2, now);
      osc.connect(gainNode);
      lfo.start(now);
      osc.start(now);

      // Return stop function for looping sounds
      return () => {
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        setTimeout(() => {
          osc.stop();
          lfo.stop();
        }, 100);
      };
    }

    default:
      console.warn(`Unknown sound type: ${type}`);
  }

  return null;
};

const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const soundsRef = useRef(new Map());
  const activeLoopsRef = useRef(new Map());

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore localStorage errors
    }
  }, [settings]);

  // Update Howler global volume
  useEffect(() => {
    Howler.volume(settings.muted ? 0 : settings.masterVolume);
  }, [settings.masterVolume, settings.muted]);

  // Calculate effective volume
  const getEffectiveVolume = useCallback((baseVolume, category = SOUND_CATEGORIES.SFX) => {
    if (settings.muted) return 0;

    let categoryMultiplier = 1;
    switch (category) {
      case SOUND_CATEGORIES.SFX:
        categoryMultiplier = settings.sfxVolume;
        break;
      case SOUND_CATEGORIES.MUSIC:
        categoryMultiplier = settings.musicVolume;
        break;
      case SOUND_CATEGORIES.UI:
        categoryMultiplier = settings.uiVolume;
        break;
      default:
        categoryMultiplier = 1;
    }

    return baseVolume * settings.masterVolume * categoryMultiplier;
  }, [settings]);

  // Play a sound
  const play = useCallback((soundConfig, options = {}) => {
    if (settings.muted) return null;
    if (prefersReducedMotion && !options.ignoreReducedMotion) return null;

    const { volume = 0.5, category = SOUND_CATEGORIES.SFX, loop = false } = {
      ...soundConfig,
      ...options
    };

    const effectiveVolume = getEffectiveVolume(volume, category);

    // Use synthesized sound if configured
    if (soundConfig.synthesize) {
      const stopFn = synthesizeSound(soundConfig.type, effectiveVolume);
      if (loop && stopFn) {
        const loopId = soundConfig.id || Math.random().toString();
        activeLoopsRef.current.set(loopId, stopFn);
        return loopId;
      }
      return null;
    }

    // Use Howler for file-based sounds
    const soundId = soundConfig.id || soundConfig.src;
    let howl = soundsRef.current.get(soundId);

    if (!howl && soundConfig.src) {
      howl = new Howl({
        src: [soundConfig.src],
        volume: effectiveVolume,
        loop,
        preload: true
      });
      soundsRef.current.set(soundId, howl);
    }

    if (howl) {
      howl.volume(effectiveVolume);
      return howl.play();
    }

    return null;
  }, [settings.muted, prefersReducedMotion, getEffectiveVolume]);

  // Stop a sound
  const stop = useCallback((soundIdOrConfig) => {
    const soundId = typeof soundIdOrConfig === 'string'
      ? soundIdOrConfig
      : soundIdOrConfig?.id;

    // Check for active synthesized loop
    const stopFn = activeLoopsRef.current.get(soundId);
    if (stopFn) {
      stopFn();
      activeLoopsRef.current.delete(soundId);
      return;
    }

    // Check for Howler sound
    const howl = soundsRef.current.get(soundId);
    if (howl) {
      howl.stop();
    }
  }, []);

  // Stop all sounds
  const stopAll = useCallback(() => {
    // Stop all synthesized loops
    activeLoopsRef.current.forEach(stopFn => stopFn());
    activeLoopsRef.current.clear();

    // Stop all Howler sounds
    Howler.stop();
  }, []);

  // Update volume settings
  const setVolume = useCallback((category, value) => {
    setSettings(prev => {
      switch (category) {
        case SOUND_CATEGORIES.MASTER:
          return { ...prev, masterVolume: value };
        case SOUND_CATEGORIES.SFX:
          return { ...prev, sfxVolume: value };
        case SOUND_CATEGORIES.MUSIC:
          return { ...prev, musicVolume: value };
        case SOUND_CATEGORIES.UI:
          return { ...prev, uiVolume: value };
        default:
          return prev;
      }
    });
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setSettings(prev => ({ ...prev, muted: !prev.muted }));
  }, []);

  // Set mute directly
  const setMuted = useCallback((muted) => {
    setSettings(prev => ({ ...prev, muted }));
  }, []);

  const value = useMemo(() => ({
    play,
    stop,
    stopAll,
    setVolume,
    toggleMute,
    setMuted,
    settings,
    isMuted: settings.muted
  }), [play, stop, stopAll, setVolume, toggleMute, setMuted, settings]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    // Return no-op functions if provider not available
    return {
      play: () => null,
      stop: () => {},
      stopAll: () => {},
      setVolume: () => {},
      toggleMute: () => {},
      setMuted: () => {},
      settings: DEFAULT_SETTINGS,
      isMuted: false
    };
  }
  return context;
};

export default AudioProvider;
