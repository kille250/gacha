/**
 * useParticleEffects
 *
 * Manages Pixi.js particle effects for the summon animation.
 * Handles creation, updating, and cleanup of particle emitters.
 */

import { useCallback, useRef, useEffect } from 'react';
import { usePixiOverlay } from '../../../../engine/pixi/PixiOverlayProvider';
import { ParticleEmitter } from '../../../../engine/pixi/ParticleEmitter';
import { PHASES, PARTICLE_CONFIGS, getRarityConfig } from '../constants';

/**
 * Convert hex color string to number
 * @param {string} color - Hex color string (e.g., '#ff0000')
 * @returns {number} - Color as number
 */
const colorToNumber = (color) => {
  if (typeof color === 'number') return color;
  if (!color) return 0xffffff;
  return parseInt(color.replace('#', ''), 16);
};

/**
 * @typedef {Object} UseParticleEffectsOptions
 * @property {string} rarity - Rarity level for particle scaling
 * @property {string} color - Primary color for particles
 * @property {string} accentColor - Secondary color for particles
 * @property {boolean} enabled - Whether particles are enabled
 */

export const useParticleEffects = ({
  rarity = 'common',
  color = '#ffffff',
  accentColor = '#ffffff',
  enabled = true,
} = {}) => {
  const { isReady, getApp, addToEffects, clearEffects, getDimensions, prefersReducedMotion } = usePixiOverlay();

  // Track active emitters
  const emittersRef = useRef({
    initiation: null,
    buildup: null,
    showcase: null,
  });

  // RAF for updates
  const rafRef = useRef(null);
  const isRunningRef = useRef(false);

  // Get rarity-specific config
  const rarityConfig = getRarityConfig(rarity);

  // Convert colors
  const primaryColor = colorToNumber(color);
  const secondaryColor = colorToNumber(accentColor);

  /**
   * Start the particle update loop
   */
  const startUpdateLoop = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const app = getApp();
    if (!app) return;

    const update = () => {
      if (!isRunningRef.current) return;

      // Update all active emitters
      Object.values(emittersRef.current).forEach(emitter => {
        if (emitter && emitter.isActive) {
          emitter.update(1);
        }
      });

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
  }, [getApp]);

  /**
   * Stop the update loop
   */
  const stopUpdateLoop = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /**
   * Create initiation particles - energy gathering toward center
   */
  const startInitiationParticles = useCallback(() => {
    if (!isReady || !enabled || prefersReducedMotion) return;

    const { centerX, centerY } = getDimensions();

    // Stop any existing initiation emitter
    if (emittersRef.current.initiation) {
      emittersRef.current.initiation.stop();
    }

    const config = {
      ...PARTICLE_CONFIGS.initiation,
      x: centerX,
      y: centerY,
      color: primaryColor,
      colorEnd: secondaryColor,
      // Scale particle count by rarity
      maxParticles: Math.round(PARTICLE_CONFIGS.initiation.maxParticles * (0.6 + rarityConfig.glowIntensity * 0.6)),
    };

    const emitter = new ParticleEmitter(config);
    addToEffects(emitter.container);
    emitter.start();

    emittersRef.current.initiation = emitter;
    startUpdateLoop();

    return emitter;
  }, [isReady, enabled, prefersReducedMotion, getDimensions, primaryColor, secondaryColor, rarityConfig, addToEffects, startUpdateLoop]);

  /**
   * Create buildup particles - orbiting with increasing intensity
   */
  const startBuildupParticles = useCallback(() => {
    if (!isReady || !enabled || prefersReducedMotion) return;

    const { centerX, centerY } = getDimensions();

    // Stop initiation particles
    if (emittersRef.current.initiation) {
      emittersRef.current.initiation.stop();
    }

    const config = {
      ...PARTICLE_CONFIGS.buildup,
      x: centerX,
      y: centerY,
      color: primaryColor,
      colorEnd: 0xffffff,
      maxParticles: Math.round(rarityConfig.particleCount * 2.5),
      emitRate: Math.round(PARTICLE_CONFIGS.buildup.emitRate * (0.8 + rarityConfig.glowIntensity * 0.4)),
    };

    const emitter = new ParticleEmitter(config);
    addToEffects(emitter.container);
    emitter.start();

    emittersRef.current.buildup = emitter;
    startUpdateLoop();

    return emitter;
  }, [isReady, enabled, prefersReducedMotion, getDimensions, primaryColor, rarityConfig, addToEffects, startUpdateLoop]);

  /**
   * Trigger reveal burst - explosive particles
   */
  const triggerRevealBurst = useCallback(() => {
    if (!isReady || !enabled || prefersReducedMotion) return;

    const { centerX, centerY } = getDimensions();

    // Stop buildup particles
    if (emittersRef.current.buildup) {
      emittersRef.current.buildup.stop();
    }

    // Main burst
    const burstConfig = {
      ...PARTICLE_CONFIGS.burst,
      x: centerX,
      y: centerY,
      color: primaryColor,
      colorEnd: 0xffffff,
      burstCount: rarityConfig.particleBurstCount,
      autoDestroy: true,
    };

    const burstEmitter = new ParticleEmitter(burstConfig);
    addToEffects(burstEmitter.container);
    burstEmitter.burst();

    // Star burst for legendary
    if (rarityConfig.hasStarBurst) {
      const starConfig = {
        ...PARTICLE_CONFIGS.starBurst,
        x: centerX,
        y: centerY,
        color: primaryColor,
        colorEnd: secondaryColor,
        autoDestroy: true,
      };

      const starEmitter = new ParticleEmitter(starConfig);
      addToEffects(starEmitter.container);
      starEmitter.burst();
    }

    startUpdateLoop();
  }, [isReady, enabled, prefersReducedMotion, getDimensions, primaryColor, secondaryColor, rarityConfig, addToEffects, startUpdateLoop]);

  /**
   * Start showcase ambient particles
   */
  const startShowcaseParticles = useCallback(() => {
    if (!isReady || !enabled || prefersReducedMotion) return;

    const { centerX, centerY } = getDimensions();

    const config = {
      ...PARTICLE_CONFIGS.showcase,
      x: centerX,
      y: centerY + 100, // Below the card
      color: primaryColor,
      colorEnd: 0xffffff,
      maxParticles: Math.round(PARTICLE_CONFIGS.showcase.maxParticles * rarityConfig.glowIntensity),
      spawnRadius: 150,
    };

    const emitter = new ParticleEmitter(config);
    addToEffects(emitter.container);
    emitter.start();

    emittersRef.current.showcase = emitter;
    startUpdateLoop();

    return emitter;
  }, [isReady, enabled, prefersReducedMotion, getDimensions, primaryColor, rarityConfig, addToEffects, startUpdateLoop]);

  /**
   * Stop all particle effects
   */
  const stopAllParticles = useCallback(() => {
    Object.keys(emittersRef.current).forEach(key => {
      const emitter = emittersRef.current[key];
      if (emitter) {
        emitter.stop();
        emitter.destroy();
      }
      emittersRef.current[key] = null;
    });

    clearEffects();
    stopUpdateLoop();
  }, [clearEffects, stopUpdateLoop]);

  /**
   * Handle phase transitions
   */
  const handlePhaseChange = useCallback((phase) => {
    switch (phase) {
      case PHASES.INITIATION:
        startInitiationParticles();
        break;

      case PHASES.BUILDUP:
        startBuildupParticles();
        break;

      case PHASES.REVEAL:
        triggerRevealBurst();
        break;

      case PHASES.SHOWCASE:
        startShowcaseParticles();
        break;

      case PHASES.RESOLUTION:
      case PHASES.COMPLETE:
        // Let showcase particles fade naturally
        if (emittersRef.current.showcase) {
          emittersRef.current.showcase.stop();
        }
        break;

      case PHASES.IDLE:
        stopAllParticles();
        break;

      default:
        break;
    }
  }, [
    startInitiationParticles,
    startBuildupParticles,
    triggerRevealBurst,
    startShowcaseParticles,
    stopAllParticles,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllParticles();
    };
  }, [stopAllParticles]);

  return {
    // Phase handler
    handlePhaseChange,

    // Direct controls
    startInitiationParticles,
    startBuildupParticles,
    triggerRevealBurst,
    startShowcaseParticles,
    stopAllParticles,

    // State
    isReady,
    prefersReducedMotion,
  };
};

export default useParticleEffects;
