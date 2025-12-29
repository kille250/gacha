/**
 * Game Engine Infrastructure
 *
 * Centralized game effects system for enhanced gacha experience.
 * Provides: Audio, Screen Effects, Particle Systems, and Animation Utilities
 */

// Audio System
export { AudioProvider, useAudio, SOUND_CATEGORIES } from './audio/AudioProvider';
export { GACHA_SOUNDS, WHEEL_SOUNDS, UI_SOUNDS } from './audio/soundRegistry';

// Screen Effects
export { useScreenShake } from './effects/useScreenShake';
export { useScreenFlash } from './effects/useScreenFlash';
export { useCountUp } from './effects/useCountUp';

// Pixi Overlay for particle effects
export { PixiOverlayProvider, usePixiOverlay } from './pixi/PixiOverlayProvider';
export { ParticleEmitter } from './pixi/ParticleEmitter';
export { PARTICLE_PRESETS } from './pixi/particlePresets';

// Haptic feedback
export { useHaptics } from './effects/useHaptics';

// Combined effects hook for gacha
export { useGachaEffects } from './effects/useGachaEffects';
