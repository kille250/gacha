/**
 * SummonAnimation Types (JSDoc)
 *
 * Type definitions for the Pixi.js summon animation system.
 */

/**
 * @typedef {'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'} Rarity
 */

/**
 * @typedef {Object} SummonedEntity
 * @property {string} id - Unique identifier
 * @property {string} name - Character name
 * @property {Rarity} rarity - Rarity tier
 * @property {string} image - Image URL or path
 * @property {string} [series] - Series/origin name
 */

/**
 * @typedef {Object} SummonAnimationProps
 * @property {SummonedEntity} entity - The entity being summoned
 * @property {() => void} [onAnimationStart] - Called when animation starts
 * @property {() => void} [onBuildUpComplete] - Called when buildup phase ends
 * @property {() => void} [onReveal] - Called at reveal moment
 * @property {() => void} [onAnimationComplete] - Called when animation finishes
 * @property {() => void} [onSkip] - Called when animation is skipped
 * @property {boolean} [autoPlay=true] - Start animation automatically
 * @property {boolean} [allowSkip=true] - Allow skipping animation
 * @property {string} [className] - Additional CSS class
 * @property {boolean} [isActive=true] - Whether animation is active
 * @property {(path: string) => string} [getImagePath] - Function to resolve image paths
 * @property {boolean} [isMultiPull=false] - Multi-pull mode
 * @property {number} [currentPull=1] - Current pull number in multi-pull
 * @property {number} [totalPulls=1] - Total pulls in multi-pull
 * @property {() => void} [onSkipAll] - Skip all in multi-pull
 */

/**
 * @typedef {Object} SummonAnimationHandle
 * @property {() => void} play - Start animation
 * @property {() => void} skip - Skip to result
 * @property {() => void} pause - Pause animation
 * @property {() => void} resume - Resume animation
 * @property {() => void} destroy - Clean up resources
 */

/**
 * @typedef {'idle' | 'initiation' | 'build_up' | 'reveal' | 'showcase' | 'complete'} AnimationPhase
 */

/**
 * @typedef {Object} SceneConfig
 * @property {number} width - Canvas width
 * @property {number} height - Canvas height
 * @property {number} [resolution] - Device pixel ratio
 * @property {boolean} [antialias=true] - Enable antialiasing
 */

/**
 * @typedef {Object} RarityColors
 * @property {number} primary - Primary color (hex number)
 * @property {number} secondary - Secondary color (hex number)
 * @property {number} glow - Glow color (hex number)
 */

// Re-export ANIMATION_PHASES from the single source of truth
export { ANIMATION_PHASES } from './pixi/constants';
export { ANIMATION_PHASES as default } from './pixi/constants';
