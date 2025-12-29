/**
 * Summon Animation Constants
 *
 * All timing, easing, and configuration values for the summon animation system.
 * Extracted for maintainability and easy tuning.
 */

// ==================== ANIMATION PHASES ====================

export const PHASES = {
  IDLE: 'idle',
  INITIATION: 'initiation',
  BUILDUP: 'buildup',
  REVEAL: 'reveal',
  SHOWCASE: 'showcase',
  RESOLUTION: 'resolution',
  COMPLETE: 'complete'
};

// ==================== PHASE TIMINGS (in milliseconds) ====================

export const PHASE_TIMINGS = {
  INITIATION: {
    duration: 400,
    skipHintDelay: 600, // When to show "tap to skip"
  },

  // Buildup times vary by rarity - creates anticipation scaling
  BUILDUP: {
    common: 600,
    uncommon: 800,
    rare: 1000,
    epic: 1200,
    legendary: 1500,
  },

  // Reveal duration varies by rarity - more dramatic for higher rarities
  REVEAL: {
    common: 350,
    uncommon: 400,
    rare: 450,
    epic: 500,
    legendary: 600,
  },

  SHOWCASE: {
    duration: 700,
    statsDelay: 200, // Delay before stats fade in
  },

  RESOLUTION: {
    duration: 350,
  },

  // Skip animation fast-forward timing
  SKIP: {
    fastForwardDuration: 150,
    transitionToShowcase: 100,
  }
};

// ==================== EASING FUNCTIONS ====================

export const EASINGS = {
  // Standard easings
  easeOut: [0.0, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],

  // Dramatic easings for reveals
  dramaticReveal: [0.16, 1, 0.3, 1],
  anticipation: [0.68, -0.55, 0.265, 1.55],

  // Spring configs for Framer Motion
  spring: {
    reveal: { type: 'spring', damping: 20, stiffness: 300, mass: 1 },
    bounce: { type: 'spring', damping: 12, stiffness: 400, mass: 0.8 },
    settle: { type: 'spring', damping: 25, stiffness: 200, mass: 1.2 },
    gentle: { type: 'spring', damping: 30, stiffness: 150, mass: 1 },
  }
};

// ==================== RARITY VISUAL CONFIGS ====================

export const RARITY_CONFIGS = {
  common: {
    // Particles
    particleCount: 8,
    particleBurstCount: 20,

    // Visual effects
    ringCount: 1,
    orbCount: 3,
    glowIntensity: 0.25,

    // Behavior flags
    hasScreenShake: false,
    hasExtendedFlash: false,
    hasStarBurst: false,
  },

  uncommon: {
    particleCount: 12,
    particleBurstCount: 30,
    ringCount: 1,
    orbCount: 4,
    glowIntensity: 0.35,
    hasScreenShake: false,
    hasExtendedFlash: false,
    hasStarBurst: false,
  },

  rare: {
    particleCount: 18,
    particleBurstCount: 45,
    ringCount: 2,
    orbCount: 5,
    glowIntensity: 0.5,
    hasScreenShake: true,
    hasExtendedFlash: false,
    hasStarBurst: false,
  },

  epic: {
    particleCount: 24,
    particleBurstCount: 60,
    ringCount: 2,
    orbCount: 6,
    glowIntensity: 0.65,
    hasScreenShake: true,
    hasExtendedFlash: true,
    hasStarBurst: false,
  },

  legendary: {
    particleCount: 35,
    particleBurstCount: 80,
    ringCount: 3,
    orbCount: 8,
    glowIntensity: 0.85,
    hasScreenShake: true,
    hasExtendedFlash: true,
    hasStarBurst: true,
  }
};

// ==================== PARTICLE SYSTEM CONFIGS ====================

export const PARTICLE_CONFIGS = {
  // Initiation phase - energy gathering toward center
  initiation: {
    maxParticles: 40,
    emitRate: 25,
    life: { min: 0.4, max: 0.8 },
    speed: { min: 100, max: 200 },
    size: { min: 3, max: 6 },
    sizeEnd: { min: 1, max: 2 },
    alpha: 0.8,
    alphaEnd: 0.3,
    gravity: 0,
    friction: 0.96,
    spawnRadius: 250, // Spawn from outer edge
  },

  // Buildup phase - orbiting particles with increasing intensity
  buildup: {
    maxParticles: 60,
    emitRate: 20,
    life: { min: 0.8, max: 1.5 },
    speed: { min: 30, max: 80 },
    size: { min: 3, max: 7 },
    sizeEnd: { min: 0, max: 2 },
    alpha: 0.9,
    alphaEnd: 0,
    gravity: -15, // Slight upward float
    friction: 0.98,
    spawnRadius: 100,
  },

  // Reveal burst - explosive outward
  burst: {
    maxParticles: 100,
    burstCount: 60, // Base, scaled by rarity
    life: { min: 0.5, max: 1.2 },
    speed: { min: 200, max: 500 },
    size: { min: 4, max: 12 },
    sizeEnd: { min: 0, max: 3 },
    alpha: 1,
    alphaEnd: 0,
    gravity: 80,
    friction: 0.95,
    spawnRadius: 20,
  },

  // Star burst for legendary
  starBurst: {
    maxParticles: 50,
    burstCount: 35,
    life: { min: 0.8, max: 1.6 },
    speed: { min: 120, max: 280 },
    size: { min: 10, max: 20 },
    sizeEnd: { min: 2, max: 6 },
    alpha: 1,
    alphaEnd: 0,
    rotation: { min: 0, max: 360 },
    rotationSpeed: { min: -200, max: 200 },
    shape: 'star',
    gravity: 40,
    friction: 0.97,
    spawnRadius: 30,
  },

  // Showcase phase - subtle ambient particles
  showcase: {
    maxParticles: 25,
    emitRate: 6,
    life: { min: 1.5, max: 2.5 },
    speed: { min: 20, max: 50 },
    angle: { min: 250, max: 290 }, // Upward
    size: { min: 3, max: 6 },
    sizeEnd: { min: 0, max: 2 },
    alpha: 0.5,
    alphaEnd: 0,
    gravity: -25,
    friction: 0.99,
    spawnRadius: 120,
  }
};

// ==================== VISUAL EFFECT CONFIGS ====================

export const FLASH_CONFIGS = {
  common: { opacity: 0.5, duration: 120 },
  uncommon: { opacity: 0.6, duration: 140 },
  rare: { opacity: 0.7, duration: 160 },
  epic: { opacity: 0.8, duration: 200 },
  legendary: { opacity: 0.95, duration: 280 },
};

export const SHAKE_CONFIGS = {
  rare: { intensity: 4, duration: 0.3, frequency: 22 },
  epic: { intensity: 8, duration: 0.45, frequency: 28 },
  legendary: { intensity: 14, duration: 0.6, frequency: 35 },
};

// ==================== MULTI-PULL CONFIGS ====================

export const MULTI_PULL_CONFIGS = {
  // Speed multipliers - accelerate as multi-pull progresses
  getTimingMultiplier: (index, total) => {
    if (total <= 3) return 1.0;
    if (index < 2) return 1.0;      // First 2: full speed
    if (index < 5) return 0.75;     // Next 3: 75% time
    return 0.6;                      // Remaining: 60% time
  },

  // Animation simplification for speed
  shouldSimplifyAnimation: (index, total) => {
    return total > 5 && index >= 3;
  },
};

// ==================== ACCESSIBILITY ====================

export const REDUCED_MOTION_TIMINGS = {
  // Simplified timings for reduced motion preference
  INITIATION: 100,
  REVEAL: 200,
  SHOWCASE: 300,
  RESOLUTION: 150,
};

// ==================== Z-INDEX LAYERS ====================

export const Z_LAYERS = {
  background: 0,
  particles: 1,
  rings: 2,
  orb: 3,
  flash: 4,
  card: 5,
  ui: 6,
  skipHint: 7,
};

// ==================== CARD REVEAL CONFIGS ====================

export const CARD_CONFIGS = {
  // Card dimensions
  width: 300,
  widthMobile: 260,
  imageHeight: 320,
  imageHeightMobile: 280,

  // Animation values
  initialScale: 0.85,
  initialBlur: 12,
  revealSpring: { damping: 22, stiffness: 280, mass: 1.2 },

  // Shine animation
  shimmerDuration: 4,
  shimmerDelay: 1,
};

// ==================== ORB & RING CONFIGS ====================

export const ORB_CONFIG = {
  baseSize: 80,
  baseSizeMobile: 60,
  pulseScale: 1.15,
  pulseDuration: 1.2,
};

export const RING_CONFIG = {
  baseSize: 180,
  sizeIncrement: 60,
  baseSizeMobile: 140,
  sizeIncrementMobile: 45,
  rotationDuration: 6, // Base duration, increases per ring
  dotSize: 8,
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get configuration for a specific rarity
 */
export const getRarityConfig = (rarity) => {
  const normalizedRarity = rarity?.toLowerCase() || 'common';
  return RARITY_CONFIGS[normalizedRarity] || RARITY_CONFIGS.common;
};

/**
 * Get buildup time for a rarity
 */
export const getBuildupTime = (rarity, multiplier = 1.0) => {
  const normalizedRarity = rarity?.toLowerCase() || 'common';
  const baseTime = PHASE_TIMINGS.BUILDUP[normalizedRarity] || PHASE_TIMINGS.BUILDUP.common;
  return Math.round(baseTime * multiplier);
};

/**
 * Get reveal duration for a rarity
 */
export const getRevealDuration = (rarity) => {
  const normalizedRarity = rarity?.toLowerCase() || 'common';
  return PHASE_TIMINGS.REVEAL[normalizedRarity] || PHASE_TIMINGS.REVEAL.common;
};

/**
 * Get total animation duration for a rarity
 */
export const getTotalDuration = (rarity, multiplier = 1.0) => {
  return (
    PHASE_TIMINGS.INITIATION.duration +
    getBuildupTime(rarity, multiplier) +
    getRevealDuration(rarity) +
    PHASE_TIMINGS.SHOWCASE.duration +
    PHASE_TIMINGS.RESOLUTION.duration
  );
};

const summonAnimationConstants = {
  PHASES,
  PHASE_TIMINGS,
  EASINGS,
  RARITY_CONFIGS,
  PARTICLE_CONFIGS,
  FLASH_CONFIGS,
  SHAKE_CONFIGS,
  MULTI_PULL_CONFIGS,
  REDUCED_MOTION_TIMINGS,
  Z_LAYERS,
  CARD_CONFIGS,
  ORB_CONFIG,
  RING_CONFIG,
  getRarityConfig,
  getBuildupTime,
  getRevealDuration,
  getTotalDuration,
};

export default summonAnimationConstants;
