/**
 * Particle Effect Presets
 *
 * Pre-configured particle emitter settings for common effects.
 */

// Rarity colors
const RARITY_COLORS = {
  common: 0x8e8e93,
  uncommon: 0x34c759,
  rare: 0x5856d6,
  epic: 0xaf52de,
  legendary: 0xffd700
};

/**
 * Particle Presets
 */
export const PARTICLE_PRESETS = {
  /**
   * Summon buildup - orbiting particles
   */
  SUMMON_BUILDUP: (color = RARITY_COLORS.rare) => ({
    maxParticles: 50,
    emitRate: 15,
    burst: false,

    life: { min: 0.8, max: 1.5 },
    speed: { min: 30, max: 60 },
    angle: { min: 0, max: 360 },
    size: { min: 3, max: 6 },
    sizeEnd: { min: 0, max: 1 },
    color: color,
    colorEnd: 0xffffff,
    alpha: 0.8,
    alphaEnd: 0,
    shape: 'circle',
    gravity: -20, // Float upward
    friction: 0.98,

    spawnRadius: 80
  }),

  /**
   * Summon burst - explosion on reveal
   */
  SUMMON_BURST: (color = RARITY_COLORS.legendary) => ({
    maxParticles: 80,
    burst: true,
    burstCount: 60,

    life: { min: 0.5, max: 1.2 },
    speed: { min: 150, max: 400 },
    angle: { min: 0, max: 360 },
    size: { min: 4, max: 10 },
    sizeEnd: { min: 0, max: 2 },
    color: color,
    colorEnd: 0xffffff,
    alpha: 1,
    alphaEnd: 0,
    shape: 'circle',
    gravity: 100,
    friction: 0.96,

    spawnRadius: 10,
    autoDestroy: true
  }),

  /**
   * Star burst - for legendary reveals
   */
  STAR_BURST: (color = RARITY_COLORS.legendary) => ({
    maxParticles: 40,
    burst: true,
    burstCount: 30,

    life: { min: 0.8, max: 1.5 },
    speed: { min: 100, max: 250 },
    angle: { min: 0, max: 360 },
    size: { min: 8, max: 16 },
    sizeEnd: { min: 0, max: 4 },
    color: color,
    colorEnd: 0xffffff,
    alpha: 1,
    alphaEnd: 0,
    rotation: { min: 0, max: 360 },
    rotationSpeed: { min: -180, max: 180 },
    shape: 'star',
    gravity: 50,
    friction: 0.97,

    spawnRadius: 20,
    autoDestroy: true
  }),

  /**
   * Sparkle - continuous subtle effect
   */
  SPARKLE: (color = 0xffffff) => ({
    maxParticles: 30,
    emitRate: 8,
    burst: false,

    life: { min: 0.3, max: 0.8 },
    speed: { min: 20, max: 50 },
    angle: { min: 240, max: 300 }, // Mostly upward
    size: { min: 2, max: 4 },
    sizeEnd: 0,
    color: color,
    alpha: 0.9,
    alphaEnd: 0,
    shape: 'circle',
    gravity: -30,
    friction: 0.99,

    spawnRadius: 50
  }),

  /**
   * Rising orbs - for card glow effects
   */
  RISING_ORBS: (color = RARITY_COLORS.epic) => ({
    maxParticles: 20,
    emitRate: 5,
    burst: false,

    life: { min: 1.5, max: 2.5 },
    speed: { min: 40, max: 80 },
    angle: { min: 250, max: 290 }, // Upward
    size: { min: 4, max: 8 },
    sizeEnd: { min: 0, max: 2 },
    color: color,
    colorEnd: 0xffffff,
    alpha: 0.6,
    alphaEnd: 0,
    shape: 'circle',
    gravity: -15,
    friction: 0.99,

    spawnRadius: 100
  }),

  /**
   * Reward particles - for claiming rewards
   */
  REWARD_BURST: (color = 0xffd700) => ({
    maxParticles: 50,
    burst: true,
    burstCount: 40,

    life: { min: 0.6, max: 1.2 },
    speed: { min: 100, max: 250 },
    angle: { min: 0, max: 360 },
    size: { min: 5, max: 10 },
    sizeEnd: 0,
    color: color,
    colorEnd: 0xffffff,
    alpha: 1,
    alphaEnd: 0,
    shape: 'circle',
    gravity: 150,
    friction: 0.96,

    spawnRadius: 10,
    autoDestroy: true
  }),

  /**
   * Level up fountain - dramatic upward burst
   */
  LEVEL_UP: (color = 0xffd700) => ({
    maxParticles: 60,
    burst: true,
    burstCount: 50,

    life: { min: 0.8, max: 1.5 },
    speed: { min: 200, max: 400 },
    angle: { min: 250, max: 290 }, // Upward
    size: { min: 6, max: 12 },
    sizeEnd: { min: 2, max: 4 },
    color: color,
    colorEnd: 0xffffff,
    alpha: 1,
    alphaEnd: 0,
    shape: 'star',
    gravity: 300,
    friction: 0.97,

    spawnRadius: 30,
    autoDestroy: true
  }),

  /**
   * Wheel spin particles - trail effect
   */
  WHEEL_TRAIL: (color = 0x5856d6) => ({
    maxParticles: 40,
    emitRate: 20,
    burst: false,

    life: { min: 0.2, max: 0.5 },
    speed: { min: 10, max: 30 },
    angle: { min: 0, max: 360 },
    size: { min: 3, max: 6 },
    sizeEnd: 0,
    color: color,
    alpha: 0.7,
    alphaEnd: 0,
    shape: 'circle',
    gravity: 0,
    friction: 0.95,

    spawnRadius: 5
  }),

  /**
   * Energy gathering - particles moving inward
   */
  ENERGY_GATHER: (color = RARITY_COLORS.epic, targetX = 0, targetY = 0) => ({
    maxParticles: 40,
    emitRate: 12,
    burst: false,

    life: { min: 0.5, max: 1.0 },
    speed: { min: 150, max: 250 },
    // Particles will be redirected toward target in update loop
    angle: { min: 0, max: 360 },
    size: { min: 4, max: 8 },
    sizeEnd: { min: 1, max: 2 },
    color: color,
    colorEnd: 0xffffff,
    alpha: 0.8,
    alphaEnd: 0.2,
    shape: 'circle',
    gravity: 0,
    friction: 0.98,

    spawnRadius: 200,

    // Custom data for gather effect
    _targetX: targetX,
    _targetY: targetY
  })
};

/**
 * Get preset for a specific rarity
 */
export const getRarityPreset = (rarity, presetType = 'SUMMON_BURST') => {
  const color = RARITY_COLORS[rarity?.toLowerCase()] || RARITY_COLORS.common;
  const preset = PARTICLE_PRESETS[presetType];

  if (typeof preset === 'function') {
    return preset(color);
  }

  return { ...preset, color };
};

/**
 * Get rarity color
 */
export const getRarityParticleColor = (rarity) => {
  return RARITY_COLORS[rarity?.toLowerCase()] || RARITY_COLORS.common;
};

export default PARTICLE_PRESETS;
