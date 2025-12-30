/**
 * Summon Animation Module
 *
 * Complete Pixi.js-based summon animation system.
 */

// Main components
export { SummonAnimation } from './SummonAnimation';
export { MultiSummonAnimation } from './MultiSummonAnimation';

// Types
export { ANIMATION_PHASES } from './SummonAnimation.types';

// Constants
export {
  ANIMATION_PHASES as PHASES,
  PHASE_DURATIONS,
  RARITY_COLORS,
  PARTICLE_COUNTS,
  EFFECT_INTENSITY,
  REDUCED_MOTION_TIMINGS,
  getRarityConfig,
  getTotalDuration,
} from './pixi/constants';

// Default export
export { SummonAnimation as default } from './SummonAnimation';
