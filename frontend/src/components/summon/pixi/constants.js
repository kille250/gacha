/**
 * Summon Animation Constants
 *
 * Timing, sizing, and configuration values for the Pixi.js summon animation.
 */

export const ANIMATION_PHASES = {
  IDLE: 'idle',
  INITIATION: 'initiation',
  BUILD_UP: 'build_up',
  REVEAL: 'reveal',
  SHOWCASE: 'showcase',
  COMPLETE: 'complete',
};

/**
 * Phase durations in milliseconds by rarity
 */
export const PHASE_DURATIONS = {
  common: {
    initiation: 300,
    buildUp: 600,
    reveal: 400,
    showcase: 800,
  },
  uncommon: {
    initiation: 350,
    buildUp: 800,
    reveal: 450,
    showcase: 900,
  },
  rare: {
    initiation: 400,
    buildUp: 1000,
    reveal: 500,
    showcase: 1000,
  },
  epic: {
    initiation: 450,
    buildUp: 1400,
    reveal: 600,
    showcase: 1200,
  },
  legendary: {
    initiation: 600,
    buildUp: 2500,
    reveal: 1000,
    showcase: 1800,
  },
};

/**
 * Rarity color palettes
 */
export const RARITY_COLORS = {
  common: { primary: 0x9CA3AF, secondary: 0x6B7280, glow: 0xD1D5DB },
  uncommon: { primary: 0x22C55E, secondary: 0x16A34A, glow: 0x86EFAC },
  rare: { primary: 0x3B82F6, secondary: 0x2563EB, glow: 0x93C5FD },
  epic: { primary: 0xA855F7, secondary: 0x9333EA, glow: 0xD8B4FE },
  legendary: { primary: 0xF59E0B, secondary: 0xD97706, glow: 0xFDE047 },
};

/**
 * Particle count scaling by rarity
 */
export const PARTICLE_COUNTS = {
  common: { base: 20, burst: 40 },
  uncommon: { base: 30, burst: 60 },
  rare: { base: 45, burst: 90 },
  epic: { base: 60, burst: 120 },
  legendary: { base: 120, burst: 240 },
};

/**
 * Effect intensity by rarity
 */
export const EFFECT_INTENSITY = {
  common: {
    glowIntensity: 0.3,
    shakeIntensity: 0,
    flashOpacity: 0.5,
    ringCount: 1,
    orbCount: 4,
  },
  uncommon: {
    glowIntensity: 0.4,
    shakeIntensity: 0,
    flashOpacity: 0.6,
    ringCount: 1,
    orbCount: 5,
  },
  rare: {
    glowIntensity: 0.55,
    shakeIntensity: 4,
    flashOpacity: 0.7,
    ringCount: 2,
    orbCount: 6,
  },
  epic: {
    glowIntensity: 0.7,
    shakeIntensity: 8,
    flashOpacity: 0.8,
    ringCount: 2,
    orbCount: 8,
  },
  legendary: {
    glowIntensity: 1.0,
    shakeIntensity: 18,
    flashOpacity: 1.0,
    ringCount: 4,
    orbCount: 16,
  },
};

/**
 * Reduced motion timings
 */
export const REDUCED_MOTION_TIMINGS = {
  initiation: 100,
  reveal: 200,
  showcase: 400,
};

/**
 * Z-index layers for proper rendering order
 */
export const Z_LAYERS = {
  background: 0,
  vortex: 1,
  particles: 2,
  sparks: 3,
  shockwave: 4,
  cardFrame: 5,
  character: 6,
  cardShine: 7,
  glow: 8,
  foreground: 9,
};

/**
 * Card frame styling by rarity
 */
export const CARD_FRAME_SETTINGS = {
  common: {
    showFrame: true,
    showShine: false,
    shineSpeed: 0,
    framePadding: 16,
  },
  uncommon: {
    showFrame: true,
    showShine: true,
    shineSpeed: 0.8,
    framePadding: 16,
  },
  rare: {
    showFrame: true,
    showShine: true,
    shineSpeed: 1.0,
    framePadding: 18,
  },
  epic: {
    showFrame: true,
    showShine: true,
    shineSpeed: 1.2,
    framePadding: 20,
  },
  legendary: {
    showFrame: true,
    showShine: true,
    shineSpeed: 2.0,
    framePadding: 24,
  },
};

/**
 * Performance tiers
 */
export const PERFORMANCE_TIERS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Get configuration for a rarity
 */
export const getRarityConfig = (rarity) => {
  const normalized = rarity?.toLowerCase() || 'common';
  return {
    durations: PHASE_DURATIONS[normalized] || PHASE_DURATIONS.common,
    colors: RARITY_COLORS[normalized] || RARITY_COLORS.common,
    particles: PARTICLE_COUNTS[normalized] || PARTICLE_COUNTS.common,
    effects: EFFECT_INTENSITY[normalized] || EFFECT_INTENSITY.common,
    cardFrame: CARD_FRAME_SETTINGS[normalized] || CARD_FRAME_SETTINGS.common,
  };
};

/**
 * Get total animation duration for a rarity
 */
export const getTotalDuration = (rarity) => {
  const config = getRarityConfig(rarity);
  const { durations } = config;
  return durations.initiation + durations.buildUp + durations.reveal + durations.showcase;
};

const summonConstants = {
  ANIMATION_PHASES,
  PHASE_DURATIONS,
  RARITY_COLORS,
  PARTICLE_COUNTS,
  EFFECT_INTENSITY,
  REDUCED_MOTION_TIMINGS,
  Z_LAYERS,
  CARD_FRAME_SETTINGS,
  PERFORMANCE_TIERS,
  getRarityConfig,
  getTotalDuration,
};

export default summonConstants;
