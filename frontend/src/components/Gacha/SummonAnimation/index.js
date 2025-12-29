/**
 * Summon Animation Module
 *
 * Complete rewrite of the summon animation system.
 * Premium 5-phase animation with Pixi.js particle effects.
 */

// Main components
export { SummonAnimation } from './SummonAnimation';
export { MultiSummonAnimation } from './MultiSummonAnimation';

// Hooks
export { useSummonAnimation } from './hooks/useSummonAnimation';
export { useParticleEffects } from './hooks/useParticleEffects';

// Constants
export {
  PHASES,
  PHASE_TIMINGS,
  EASINGS,
  RARITY_CONFIGS,
  PARTICLE_CONFIGS,
  FLASH_CONFIGS,
  SHAKE_CONFIGS,
  MULTI_PULL_CONFIGS,
  getRarityConfig,
  getBuildupTime,
  getRevealDuration,
  getTotalDuration,
} from './constants';

// Default export
export { SummonAnimation as default } from './SummonAnimation';
