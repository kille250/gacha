/**
 * SummonScene
 *
 * Main Pixi.js scene orchestrator for the summon animation.
 * Coordinates all layers and effects for a premium animation experience.
 */

import { Application, Container } from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { CharacterLayer } from './layers/CharacterLayer';
import { ForegroundLayer } from './layers/ForegroundLayer';
import { VortexEffect } from './effects/VortexEffect';
import { SparkEffect } from './effects/SparkEffect';
import { ShockwaveEffect } from './effects/ShockwaveEffect';
import { GlowEffect } from './effects/GlowEffect';
import { ParticleSystem } from './ParticleSystem';
import {
  ANIMATION_PHASES,
  PHASE_DURATIONS,
  RARITY_COLORS,
  REDUCED_MOTION_TIMINGS,
  getRarityConfig,
} from './constants';

export class SummonScene {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.config = {
      width: config.width || window.innerWidth,
      height: config.height || window.innerHeight,
      resolution: config.resolution || window.devicePixelRatio || 1,
      antialias: config.antialias !== false,
    };

    // Pixi Application
    this.app = null;
    this.isInitialized = false;

    // Layers
    this.layers = {
      background: null,
      effects: null,
      character: null,
      foreground: null,
    };

    // Effects
    this.effects = {
      vortex: null,
      sparks: null,
      shockwave: null,
      glow: null,
      particles: null,
    };

    // Animation state
    this.phase = ANIMATION_PHASES.IDLE;
    this.phaseStartTime = 0;
    this.entity = null;
    this.rarityConfig = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.timers = [];

    // Callbacks
    this.callbacks = {
      onAnimationStart: null,
      onBuildUpComplete: null,
      onReveal: null,
      onShowcaseReady: null,
      onAnimationComplete: null,
      onSkip: null,
    };

    // Preferences
    this.prefersReducedMotion = false;
    this.getImagePath = (path) => path;
  }

  /**
   * Initialize the scene
   */
  async initialize() {
    if (this.isInitialized) return;

    // Check for reduced motion preference
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Check WebGL support
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported, using reduced motion mode');
      this.prefersReducedMotion = true;
    }

    // Create Pixi Application
    this.app = new Application();

    try {
      await this.app.init({
        canvas: this.canvas,
        width: this.config.width,
        height: this.config.height,
        resolution: this.config.resolution,
        autoDensity: true,
        antialias: this.config.antialias,
        backgroundAlpha: 0,
        powerPreference: 'high-performance',
        // Fallback for devices with limited WebGL support
        preferWebGLVersion: 2,
        failIfMajorPerformanceCaveat: false,
      });
    } catch (initError) {
      console.error('Pixi.js initialization failed:', initError);
      // Force reduced motion mode on initialization failure
      this.prefersReducedMotion = true;
      // Try with minimal settings
      try {
        await this.app.init({
          canvas: this.canvas,
          width: this.config.width,
          height: this.config.height,
          resolution: 1,
          antialias: false,
          backgroundAlpha: 0,
        });
      } catch (fallbackError) {
        console.error('Pixi.js fallback initialization also failed:', fallbackError);
        throw fallbackError;
      }
    }

    // Create layers
    this.createLayers();

    // Create effects
    this.createEffects();

    // Setup resize handler
    this.setupResize();

    // Start render loop
    this.app.ticker.add(this.update.bind(this));

    this.isInitialized = true;
  }

  /**
   * Create layer hierarchy
   */
  createLayers() {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;

    // Background layer
    this.layers.background = new BackgroundLayer({
      width,
      height,
    });
    this.app.stage.addChild(this.layers.background.container);

    // Effects container
    this.layers.effects = new Container();
    this.layers.effects.label = 'effects-container';
    this.app.stage.addChild(this.layers.effects);

    // Character layer
    this.layers.character = new CharacterLayer({
      x: centerX,
      y: centerY,
      maxWidth: Math.min(width * 0.6, 350),
      maxHeight: Math.min(height * 0.6, 450),
    });
    this.app.stage.addChild(this.layers.character.container);

    // Foreground layer
    this.layers.foreground = new ForegroundLayer({
      width,
      height,
    });
    this.app.stage.addChild(this.layers.foreground.container);
  }

  /**
   * Create effect instances
   */
  createEffects() {
    const { width, height } = this.config;
    const centerX = width / 2;
    const centerY = height / 2;

    // Vortex effect (buildup)
    this.effects.vortex = new VortexEffect({
      x: centerX,
      y: centerY,
      maxRadius: Math.min(width, height) * 0.4,
      particleCount: 60,
    });
    this.layers.effects.addChild(this.effects.vortex.container);

    // Spark effect (reveal)
    this.effects.sparks = new SparkEffect({
      x: centerX,
      y: centerY,
    });
    this.layers.effects.addChild(this.effects.sparks.container);

    // Shockwave effect (reveal)
    this.effects.shockwave = new ShockwaveEffect({
      x: centerX,
      y: centerY,
    });
    this.layers.effects.addChild(this.effects.shockwave.container);

    // Glow effect (showcase)
    this.effects.glow = new GlowEffect({
      x: centerX,
      y: centerY,
      radius: 150,
    });
    this.layers.effects.addChild(this.effects.glow.container);

    // Ambient particle system (showcase)
    this.effects.particles = new ParticleSystem({
      x: centerX,
      y: centerY + 100,
      maxParticles: 30,
      emitRate: 5,
      life: { min: 1.5, max: 2.5 },
      speed: { min: 20, max: 50 },
      angle: { min: 250, max: 290 },
      size: { min: 3, max: 6 },
      gravity: -30,
      friction: 0.99,
      spawnRadius: 150,
    });
    this.layers.effects.addChild(this.effects.particles.container);
  }

  /**
   * Setup resize observer
   */
  setupResize() {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      // Don't resize if destroyed
      if (!this.isInitialized || !this.app) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      this.config.width = width;
      this.config.height = height;

      // Resize renderer
      if (this.app?.renderer) {
        this.app.renderer.resize(width, height);
      }

      // Resize layers (with safety checks)
      try {
        this.layers.background?.resize?.(width, height);
        this.layers.foreground?.resize?.(width, height);

        // Update positions
        const centerX = width / 2;
        const centerY = height / 2;

        this.layers.character?.setPosition?.(centerX, centerY);
        this.effects.vortex?.setPosition?.(centerX, centerY);
        this.effects.sparks?.setPosition?.(centerX, centerY);
        this.effects.shockwave?.setPosition?.(centerX, centerY);
        this.effects.glow?.setPosition?.(centerX, centerY);
        this.effects.particles?.setPosition?.(centerX, centerY + 100);
      } catch (e) {
        console.warn('Error during resize:', e);
      }
    };

    window.addEventListener('resize', handleResize);
    this.resizeHandler = handleResize;
  }

  /**
   * Set image path resolver
   */
  setImagePathResolver(fn) {
    this.getImagePath = fn || ((path) => path);
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Play animation for entity
   * @param {Object} entity - The entity to display
   * @param {Object} animConfig - Dynamic animation config from admin (optional)
   * @param {Object} animConfig.colors - { primary, secondary, glow } as hex numbers
   * @param {number} animConfig.glowIntensity - Glow intensity 0-1
   * @param {number} animConfig.buildupTime - Buildup phase duration in ms
   * @param {number} animConfig.orbCount - Number of orbs
   * @param {number} animConfig.ringCount - Number of shockwave rings
   */
  async play(entity, animConfig = {}) {
    try {
      if (!this.isInitialized) {
        // Add timeout to initialization to prevent hanging
        const initPromise = this.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Scene initialization timeout')), 5000);
        });
        await Promise.race([initPromise, timeoutPromise]);
      }

      // Verify initialization succeeded
      if (!this.app || !this.layers.character) {
        throw new Error('Scene not properly initialized');
      }

      this.entity = entity;

      // Get base config from constants, then override with dynamic admin config
      const baseConfig = getRarityConfig(entity?.rarity);
      this.rarityConfig = {
        ...baseConfig,
        effects: {
          ...baseConfig.effects,
          glowIntensity: animConfig.glowIntensity ?? baseConfig.effects.glowIntensity,
          ringCount: animConfig.ringCount ?? baseConfig.effects.ringCount,
          orbCount: animConfig.orbCount ?? baseConfig.effects.orbCount,
        },
        durations: {
          ...baseConfig.durations,
          // Override buildUp with admin-defined buildupTime if provided
          buildUp: animConfig.buildupTime ?? baseConfig.durations.buildUp,
        },
      };

      this.isPlaying = true;
      this.isPaused = false;

      // Use dynamic colors from admin config, fallback to constants
      const colors = animConfig.colors || RARITY_COLORS[entity?.rarity?.toLowerCase()] || RARITY_COLORS.common;

      this.effects.vortex?.setColors(colors.primary, colors.secondary);
      this.effects.sparks?.setColors(colors.primary, colors.glow);
      this.effects.shockwave?.setColor(colors.primary);
      this.effects.glow?.setColor(colors.glow);
      if (this.effects.particles?.config) {
        this.effects.particles.config.color = colors.primary;
        this.effects.particles.config.colorEnd = colors.glow;
      }
      this.layers.background?.setRarityColor(colors.primary);

      // Load character image with timeout
      if (entity?.image) {
        try {
          const imagePromise = this.layers.character?.setImage(entity.image, this.getImagePath);
          const imageTimeout = new Promise((resolve) => {
            setTimeout(() => {
              console.warn('Character image load timeout, continuing without image');
              resolve();
            }, 8000);
          });
          await Promise.race([imagePromise, imageTimeout]);
        } catch (imgError) {
          console.warn('Failed to load character image, continuing:', imgError);
        }
      }

      // Bug fix: Explicitly ensure character is hidden before animation starts
      // This prevents any premature flash of the character image/name
      this.layers.character?.hide();

      // Callback
      this.callbacks.onAnimationStart?.();

      // Start animation phases
      if (this.prefersReducedMotion) {
        this.playReducedMotion();
      } else {
        this.playFullAnimation();
      }
    } catch (error) {
      console.error('Error in SummonScene.play():', error);
      throw error; // Re-throw so React component can handle it
    }
  }

  /**
   * Play full animation sequence
   */
  playFullAnimation() {
    const durations = this.rarityConfig?.durations || PHASE_DURATIONS.common;

    // Phase 1: Initiation
    this.setPhase(ANIMATION_PHASES.INITIATION);
    this.layers.background.setIntensity(0.3);
    this.layers.foreground.setDim(0.3);

    // Phase 2: Build Up
    this.addTimer(() => {
      this.setPhase(ANIMATION_PHASES.BUILD_UP);
      this.effects.vortex.start();
      this.layers.background.setIntensity(0.6);
    }, durations.initiation);

    // Increase intensity during buildup
    this.addTimer(() => {
      this.effects.vortex.setIntensity(0.5);
      this.layers.background.setIntensity(0.8);
    }, durations.initiation + durations.buildUp * 0.5);

    this.addTimer(() => {
      this.effects.vortex.setIntensity(1);
      this.layers.background.setIntensity(1);
      this.callbacks.onBuildUpComplete?.();
    }, durations.initiation + durations.buildUp * 0.9);

    // Phase 3: Reveal
    this.addTimer(() => {
      this.triggerReveal();
    }, durations.initiation + durations.buildUp);

    // Phase 4: Showcase - stays here until user taps to continue
    this.addTimer(() => {
      this.setPhase(ANIMATION_PHASES.SHOWCASE);
      this.layers.character.setShowcase();
      this.effects.particles.start();
      this.layers.foreground.setDim(0);
      this.callbacks.onShowcaseReady?.();
    }, durations.initiation + durations.buildUp + durations.reveal);

    // No auto-complete timer - user controls when to proceed
  }

  /**
   * Play reduced motion version
   */
  playReducedMotion() {
    const timings = REDUCED_MOTION_TIMINGS;

    // Skip to reveal immediately with simple fade
    this.setPhase(ANIMATION_PHASES.REVEAL);
    this.layers.character.reveal({ glowIntensity: 0.3 });
    this.callbacks.onReveal?.();

    this.addTimer(() => {
      this.setPhase(ANIMATION_PHASES.SHOWCASE);
      this.layers.character.setShowcase();
      this.callbacks.onShowcaseReady?.();
    }, timings.reveal);

    // No auto-complete timer - user controls when to proceed
  }

  /**
   * Trigger reveal moment
   */
  triggerReveal() {
    this.setPhase(ANIMATION_PHASES.REVEAL);

    // Stop buildup effects
    this.effects.vortex.stop();

    // Flash
    this.layers.foreground.flash({
      color: this.rarityConfig?.colors?.glow || 0xffffff,
      alpha: this.rarityConfig?.effects?.flashOpacity || 0.8,
      decay: 0.15,
    });

    // Shockwave
    const ringCount = this.rarityConfig?.effects?.ringCount || 1;
    this.effects.shockwave.triggerMultiple(ringCount, {
      maxRadius: Math.min(this.config.width, this.config.height) * 0.5,
    });

    // Spark burst
    this.effects.sparks.radialBurst(this.rarityConfig?.particles?.burst || 60, {
      speedMin: 300,
      speedMax: 800,
    });

    // Reveal character
    this.layers.character.reveal({
      glowIntensity: this.rarityConfig?.effects?.glowIntensity || 0.5,
    });

    // Start glow effect
    this.effects.glow.start({
      intensity: this.rarityConfig?.effects?.glowIntensity || 0.5,
      showRays: this.entity?.rarity?.toLowerCase() === 'legendary',
    });

    this.callbacks.onReveal?.();
  }

  /**
   * Skip to showcase
   */
  skip() {
    if (!this.isPlaying || this.phase === ANIMATION_PHASES.COMPLETE) return;

    // Clear pending timers
    this.clearTimers();

    // If not yet revealed, trigger quick reveal
    if (this.phase !== ANIMATION_PHASES.SHOWCASE && this.phase !== ANIMATION_PHASES.COMPLETE) {
      this.effects.vortex.stop();
      this.layers.foreground.flash({ alpha: 0.6, decay: 0.2 });
      this.effects.shockwave.trigger();
      this.effects.sparks.radialBurst(40);
      this.layers.character.reveal({
        glowIntensity: this.rarityConfig?.effects?.glowIntensity || 0.5,
      });
      this.effects.glow.start({
        intensity: this.rarityConfig?.effects?.glowIntensity || 0.5,
      });
    }

    // Jump to showcase
    this.setPhase(ANIMATION_PHASES.SHOWCASE);
    this.layers.character.setShowcase();
    this.effects.particles.start();
    this.layers.foreground.setDim(0);

    // Then complete
    this.addTimer(() => {
      this.setPhase(ANIMATION_PHASES.COMPLETE);
      this.callbacks.onSkip?.();
      this.callbacks.onAnimationComplete?.();
    }, 300);
  }

  /**
   * Pause animation
   */
  pause() {
    this.isPaused = true;
    this.app?.ticker?.stop();
  }

  /**
   * Resume animation
   */
  resume() {
    this.isPaused = false;
    this.app?.ticker?.start();
  }

  /**
   * Set current phase
   */
  setPhase(phase) {
    this.phase = phase;
    this.phaseStartTime = performance.now();
  }

  /**
   * Add a timer
   */
  addTimer(callback, delay) {
    const timer = setTimeout(callback, delay);
    this.timers.push(timer);
    return timer;
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }

  /**
   * Update loop
   */
  update() {
    if (this.isPaused) return;

    const dt = this.app.ticker.deltaTime;

    // Update layers
    this.layers.background?.update(dt);
    this.layers.character?.update(dt);
    this.layers.foreground?.update(dt);

    // Update effects
    this.effects.vortex?.update(dt);
    this.effects.sparks?.update(dt);
    this.effects.shockwave?.update(dt);
    this.effects.glow?.update(dt);
    this.effects.particles?.update(dt);
  }

  /**
   * Reset scene
   */
  reset() {
    this.clearTimers();
    this.phase = ANIMATION_PHASES.IDLE;
    this.isPlaying = false;
    this.entity = null;

    // Reset layers
    this.layers.background?.setIntensity(0);
    this.layers.character?.reset();
    this.layers.foreground?.clear();

    // Reset effects
    this.effects.vortex?.clear();
    this.effects.sparks?.clear();
    this.effects.shockwave?.clear();
    this.effects.glow?.stop();
    this.effects.particles?.stop();
    this.effects.particles?.clear();
  }

  /**
   * Destroy scene and clean up resources
   */
  destroy() {
    this.clearTimers();

    // Remove resize handler
    if (this.resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
    }

    // Destroy effects
    Object.values(this.effects).forEach((effect) => {
      try {
        effect?.destroy?.();
      } catch (e) {
        console.warn('Error destroying effect:', e);
      }
    });

    // Destroy layers
    Object.values(this.layers).forEach((layer) => {
      try {
        layer?.destroy?.();
      } catch (e) {
        console.warn('Error destroying layer:', e);
      }
    });

    // Destroy app safely
    if (this.app) {
      try {
        // Stop the ticker first
        this.app.ticker?.stop();
        // Only destroy if the app was fully initialized
        if (this.app.renderer) {
          this.app.destroy(true, { children: true, texture: true });
        }
      } catch (e) {
        console.warn('Error destroying Pixi app:', e);
      }
      this.app = null;
    }

    this.isInitialized = false;
  }

  /**
   * Get current phase
   */
  getPhase() {
    return this.phase;
  }

  /**
   * Check if animation is complete
   */
  isComplete() {
    return this.phase === ANIMATION_PHASES.COMPLETE;
  }
}

export default SummonScene;
