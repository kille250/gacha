/**
 * useSummonAnimation
 *
 * Core state machine hook for managing summon animation phases.
 * Handles phase transitions, timing, skip logic, and cleanup.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  PHASES,
  PHASE_TIMINGS,
  REDUCED_MOTION_TIMINGS,
  getBuildupTime,
  getRevealDuration,
} from '../constants';

/**
 * @typedef {Object} UseSummonAnimationOptions
 * @property {boolean} isActive - Whether animation should be playing
 * @property {string} rarity - Rarity level for timing calculations
 * @property {number} timingMultiplier - Multiplier for multi-pull acceleration
 * @property {boolean} skipEnabled - Whether skip is allowed
 * @property {boolean} reducedMotion - Force reduced motion mode
 * @property {Function} onPhaseChange - Callback when phase changes
 * @property {Function} onReveal - Callback at reveal moment
 * @property {Function} onComplete - Callback when animation completes
 */

/**
 * @typedef {Object} UseSummonAnimationReturn
 * @property {string} phase - Current animation phase
 * @property {number} phaseProgress - Progress within current phase (0-1)
 * @property {boolean} canSkip - Whether skip is currently available
 * @property {boolean} showSkipHint - Whether to show skip hint
 * @property {boolean} isComplete - Whether animation has completed
 * @property {Function} skip - Trigger skip to showcase
 * @property {Function} complete - Mark animation as complete
 * @property {Function} reset - Reset animation state
 */

export const useSummonAnimation = ({
  isActive = false,
  rarity = 'common',
  timingMultiplier = 1.0,
  skipEnabled = true,
  reducedMotion: forceReducedMotion = false,
  onPhaseChange,
  onReveal,
  onComplete,
} = {}) => {
  // State
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [showSkipHint, setShowSkipHint] = useState(false);

  // Refs for cleanup and guards
  const timersRef = useRef([]);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const phaseStartTimeRef = useRef(0);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (forceReducedMotion) return true;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [forceReducedMotion]);

  // Calculate timings based on rarity and multiplier
  const timings = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        initiation: REDUCED_MOTION_TIMINGS.INITIATION,
        buildup: 0, // Skip buildup in reduced motion
        reveal: REDUCED_MOTION_TIMINGS.REVEAL,
        showcase: REDUCED_MOTION_TIMINGS.SHOWCASE,
        resolution: REDUCED_MOTION_TIMINGS.RESOLUTION,
      };
    }

    return {
      initiation: PHASE_TIMINGS.INITIATION.duration,
      buildup: getBuildupTime(rarity, timingMultiplier),
      reveal: getRevealDuration(rarity),
      showcase: PHASE_TIMINGS.SHOWCASE.duration,
      resolution: PHASE_TIMINGS.RESOLUTION.duration,
    };
  }, [rarity, timingMultiplier, prefersReducedMotion]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  // Add a timer to the tracked list
  const addTimer = useCallback((callback, delay) => {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  // Change phase with callback
  const changePhase = useCallback((newPhase) => {
    setPhase(newPhase);
    phaseStartTimeRef.current = Date.now();
    onPhaseChange?.(newPhase);

    if (newPhase === PHASES.REVEAL) {
      onReveal?.();
    }
  }, [onPhaseChange, onReveal]);

  // Skip to showcase phase
  const skip = useCallback(() => {
    if (!skipEnabled || phase === PHASES.IDLE || phase === PHASES.COMPLETE) {
      return;
    }

    // Can only skip during initiation or buildup
    if (phase !== PHASES.INITIATION && phase !== PHASES.BUILDUP) {
      return;
    }

    clearTimers();
    setShowSkipHint(false);

    // Fast forward through reveal
    changePhase(PHASES.REVEAL);

    addTimer(() => {
      changePhase(PHASES.SHOWCASE);
    }, PHASE_TIMINGS.SKIP.fastForwardDuration);

    addTimer(() => {
      changePhase(PHASES.RESOLUTION);
    }, PHASE_TIMINGS.SKIP.fastForwardDuration + timings.showcase);

    addTimer(() => {
      changePhase(PHASES.COMPLETE);
    }, PHASE_TIMINGS.SKIP.fastForwardDuration + timings.showcase + timings.resolution);
  }, [skipEnabled, phase, clearTimers, changePhase, addTimer, timings]);

  // Mark animation as complete and trigger callback
  const complete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  // Reset animation state
  const reset = useCallback(() => {
    clearTimers();
    setPhase(PHASES.IDLE);
    setShowSkipHint(false);
    hasStartedRef.current = false;
    hasCompletedRef.current = false;
    phaseStartTimeRef.current = 0;
  }, [clearTimers]);

  // Start animation sequence
  useEffect(() => {
    if (!isActive || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    // Reduced motion: simplified sequence
    if (prefersReducedMotion) {
      changePhase(PHASES.REVEAL);

      addTimer(() => {
        changePhase(PHASES.SHOWCASE);
      }, timings.reveal);

      addTimer(() => {
        changePhase(PHASES.RESOLUTION);
      }, timings.reveal + timings.showcase);

      addTimer(() => {
        changePhase(PHASES.COMPLETE);
      }, timings.reveal + timings.showcase + timings.resolution);

      return;
    }

    // Full animation sequence
    let elapsed = 0;

    // Phase 1: Initiation
    changePhase(PHASES.INITIATION);

    // Show skip hint during initiation
    addTimer(() => {
      if (skipEnabled) {
        setShowSkipHint(true);
      }
    }, PHASE_TIMINGS.INITIATION.skipHintDelay);

    elapsed += timings.initiation;

    // Phase 2: Buildup
    addTimer(() => {
      changePhase(PHASES.BUILDUP);
    }, elapsed);

    elapsed += timings.buildup;

    // Phase 3: Reveal
    addTimer(() => {
      changePhase(PHASES.REVEAL);
      setShowSkipHint(false);
    }, elapsed);

    elapsed += timings.reveal;

    // Phase 4: Showcase
    addTimer(() => {
      changePhase(PHASES.SHOWCASE);
    }, elapsed);

    elapsed += timings.showcase;

    // Phase 5: Resolution
    addTimer(() => {
      changePhase(PHASES.RESOLUTION);
    }, elapsed);

    elapsed += timings.resolution;

    // Complete
    addTimer(() => {
      changePhase(PHASES.COMPLETE);
    }, elapsed);

  }, [
    isActive,
    prefersReducedMotion,
    skipEnabled,
    timings,
    changePhase,
    addTimer,
  ]);

  // Reset when inactive
  useEffect(() => {
    if (!isActive) {
      reset();
    }
  }, [isActive, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Calculate phase progress (0-1)
  const phaseProgress = useMemo(() => {
    if (phase === PHASES.IDLE || phase === PHASES.COMPLETE) {
      return phase === PHASES.COMPLETE ? 1 : 0;
    }

    const elapsed = Date.now() - phaseStartTimeRef.current;
    let duration;

    switch (phase) {
      case PHASES.INITIATION:
        duration = timings.initiation;
        break;
      case PHASES.BUILDUP:
        duration = timings.buildup;
        break;
      case PHASES.REVEAL:
        duration = timings.reveal;
        break;
      case PHASES.SHOWCASE:
        duration = timings.showcase;
        break;
      case PHASES.RESOLUTION:
        duration = timings.resolution;
        break;
      default:
        duration = 1000;
    }

    return Math.min(1, elapsed / duration);
  }, [phase, timings]);

  // Derived states
  const canSkip = useMemo(() => {
    return skipEnabled && (phase === PHASES.INITIATION || phase === PHASES.BUILDUP);
  }, [skipEnabled, phase]);

  const isComplete = phase === PHASES.COMPLETE;

  return {
    // State
    phase,
    phaseProgress,
    canSkip,
    showSkipHint,
    isComplete,
    prefersReducedMotion,
    timings,

    // Actions
    skip,
    complete,
    reset,

    // Phase checks
    isIdle: phase === PHASES.IDLE,
    isInitiation: phase === PHASES.INITIATION,
    isBuildup: phase === PHASES.BUILDUP,
    isReveal: phase === PHASES.REVEAL,
    isShowcase: phase === PHASES.SHOWCASE,
    isResolution: phase === PHASES.RESOLUTION,

    // Compound checks
    isPreReveal: phase === PHASES.INITIATION || phase === PHASES.BUILDUP,
    isPostReveal: phase === PHASES.SHOWCASE || phase === PHASES.RESOLUTION || phase === PHASES.COMPLETE,
    isRevealed: phase === PHASES.REVEAL || phase === PHASES.SHOWCASE || phase === PHASES.RESOLUTION || phase === PHASES.COMPLETE,
  };
};

export default useSummonAnimation;
