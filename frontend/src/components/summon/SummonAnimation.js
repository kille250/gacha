/**
 * SummonAnimation
 *
 * React wrapper component for the Pixi.js summon animation.
 * Provides lifecycle management, callbacks, and UI overlay.
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import { AnimatePresence } from 'framer-motion';

import { useTranslation } from 'react-i18next';
import { useRarity } from '../../context/RarityContext';
import { useGachaEffects } from '../../engine/effects/useGachaEffects';
import { SummonScene } from './pixi/SummonScene';
import { ANIMATION_PHASES } from './pixi/constants';
import * as S from './SummonAnimation.styles';

// ==================== UTILITIES ====================

// ==================== MAIN COMPONENT ====================

export const SummonAnimation = forwardRef(({
  isActive = false,
  entity,
  rarity,
  character, // Alias for entity (backwards compatibility)
  onAnimationStart,
  onBuildUpComplete,
  onReveal,
  onAnimationComplete,
  onComplete, // Alias (backwards compatibility)
  onSkip,
  autoPlay = true,
  allowSkip = true,
  skipEnabled = true, // Alias (backwards compatibility)
  getImagePath,
  isMultiPull = false,
  currentPull = 1,
  totalPulls = 1,
  onSkipAll,
  className,
}, ref) => {
  // Refs
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const buildupStopRef = useRef(null);
  const initErrorRef = useRef(null);
  // Track which entity the showcase is ready for (prevents name flash bug)
  const showcaseReadyForEntityRef = useRef(null);
  // Track previous entity for multi-pull reset detection
  const prevEntityIdRef = useRef(null);

  // State
  const [phase, setPhase] = useState(ANIMATION_PHASES.IDLE);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const [isShowcaseReady, setIsShowcaseReady] = useState(false);
  const [animationError, setAnimationError] = useState(null);

  // Normalize entity prop
  const normalizedEntity = useMemo(() => {
    const ent = entity || character;
    if (!ent) return null;
    return {
      id: ent.id,
      name: ent.name,
      image: ent.image,
      rarity: rarity || ent.rarity || 'common',
      series: ent.series,
    };
  }, [entity, character, rarity]);

  // Translation
  const { t } = useTranslation();

  // Get rarity context with animation config
  const { getRarityAnimation } = useRarity();
  const effectRarity = normalizedEntity?.rarity || 'common';

  // Get dynamic rarity config from context (admin-configurable)
  const rarityAnimConfig = useMemo(() => {
    return getRarityAnimation(effectRarity);
  }, [getRarityAnimation, effectRarity]);

  // Convert hex string color to number for Pixi
  const hexStringToNumber = (hexStr) => {
    if (typeof hexStr === 'number') return hexStr;
    if (typeof hexStr === 'string' && hexStr.startsWith('#')) {
      return parseInt(hexStr.slice(1), 16);
    }
    return 0xffffff;
  };

  // Build rarity colors object for Pixi from admin config
  const rarityColors = useMemo(() => {
    const primary = hexStringToNumber(rarityAnimConfig.color);
    const secondary = hexStringToNumber(rarityAnimConfig.accentColor || rarityAnimConfig.color);
    // Create a lighter glow color
    const glow = secondary;
    return { primary, secondary, glow };
  }, [rarityAnimConfig]);

  // Effects hook
  const {
    playPullStart,
    playBuildup,
    triggerRevealSequence,
    playContinue,
    stopAllEffects,
  } = useGachaEffects();

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        await sceneRef.current?.play(normalizedEntity);
      } catch (error) {
        console.error('Failed to play summon animation:', error);
        setAnimationError(error);
        setPhase(ANIMATION_PHASES.COMPLETE);
        // Set showcaseReadyForEntityRef so the UI will display for this entity
        showcaseReadyForEntityRef.current = normalizedEntity?.id;
        setIsShowcaseReady(true);
      }
    },
    skip: () => sceneRef.current?.skip(),
    pause: () => sceneRef.current?.pause(),
    resume: () => sceneRef.current?.resume(),
    destroy: () => {
      sceneRef.current?.destroy();
      sceneRef.current = null;
    },
    getPhase: () => phase,
  }), [normalizedEntity, phase]);

  // Store getImagePath in a ref to avoid re-initializing on every render
  const getImagePathRef = useRef(getImagePath);
  useEffect(() => {
    getImagePathRef.current = getImagePath;
  }, [getImagePath]);

  // Initialize scene - only once when canvas is available
  useEffect(() => {
    if (!canvasRef.current) return;
    // Don't re-initialize if already exists and is initialized and not destroyed
    if (sceneRef.current?.isInitialized && !sceneRef.current?.isDestroyed) return;

    // Clean up any existing scene that failed to initialize or was destroyed
    if (sceneRef.current) {
      try {
        sceneRef.current.destroy();
      } catch (_e) {
        // Ignore cleanup errors
      }
      sceneRef.current = null;
    }

    // Clear any previous error state on re-initialization
    initErrorRef.current = null;

    let mounted = true;
    const canvas = canvasRef.current;
    const scene = new SummonScene(canvas);
    sceneRef.current = scene;

    // Set image path resolver using ref
    scene.setImagePathResolver((path) => {
      return getImagePathRef.current ? getImagePathRef.current(path) : path;
    });

    // Initialize with proper error handling
    scene.initialize()
      .then(() => {
        if (mounted && !scene.isDestroyed) {
          // Clear any error state on successful init
          initErrorRef.current = null;
          setAnimationError(null);
        }
      })
      .catch((error) => {
        // Don't log error if scene was destroyed (expected in React strict mode)
        if (!scene.isDestroyed) {
          console.error('Failed to initialize summon animation:', error);
          if (mounted) {
            initErrorRef.current = error;
            setAnimationError(error);
          }
        }
      });

    return () => {
      mounted = false;
      if (sceneRef.current === scene) {
        scene.destroy();
        sceneRef.current = null;
      }
    };
  }, []); // Empty dependency - initialize only once

  // Handle activation
  useEffect(() => {
    if (!isActive || !normalizedEntity) {
      if (sceneRef.current) {
        sceneRef.current.reset();
      }
      setPhase(ANIMATION_PHASES.IDLE);
      setIsShowcaseReady(false);
      setShowSkipHint(false);
      setAnimationError(null);
      initErrorRef.current = null;
      showcaseReadyForEntityRef.current = null;
      return;
    }

    // Reset showcase tracking when entity changes (prevents name flash bug)
    showcaseReadyForEntityRef.current = null;

    // If there's already an initialization error, skip to showcase ready
    if (initErrorRef.current) {
      setAnimationError(initErrorRef.current);
      setPhase(ANIMATION_PHASES.COMPLETE);
      // Set showcaseReadyForEntityRef so the UI will display for this entity
      showcaseReadyForEntityRef.current = normalizedEntity?.id;
      setIsShowcaseReady(true);
      return;
    }

    // Handle case where scene doesn't exist or was destroyed
    // This can happen in React strict mode during the second mount
    const scene = sceneRef.current;
    if (!scene || scene.isDestroyed) {
      // Scene not ready yet - the initialization effect will handle it
      // For now, show error state so user isn't stuck
      console.warn('SummonAnimation: Scene not available, showing fallback UI');
      setPhase(ANIMATION_PHASES.COMPLETE);
      showcaseReadyForEntityRef.current = normalizedEntity?.id;
      setIsShowcaseReady(true);
      return;
    }

    // For multi-pull: reset scene and state when entity changes
    // This MUST happen before play() to ensure isPlaying is set correctly
    const entityId = normalizedEntity?.id;
    if (isMultiPull && prevEntityIdRef.current !== null && prevEntityIdRef.current !== entityId) {
      // Reset React state for new pull
      setShowSkipHint(false);
      setPhase(ANIMATION_PHASES.IDLE);
      setIsShowcaseReady(false);
      setAnimationError(null);
      stopAllEffects();

      // Reset scene before playing new animation
      scene.reset();
    }
    prevEntityIdRef.current = entityId;

    // Set callbacks
    scene.setCallbacks({
      onAnimationStart: () => {
        setPhase(ANIMATION_PHASES.INITIATION);
        playPullStart();
        buildupStopRef.current = playBuildup();
        onAnimationStart?.();

        // Show skip hint after delay
        setTimeout(() => {
          if (allowSkip || skipEnabled) {
            setShowSkipHint(true);
          }
        }, 600);
      },
      onBuildUpComplete: () => {
        onBuildUpComplete?.();
      },
      onReveal: () => {
        setPhase(ANIMATION_PHASES.REVEAL);
        setShowSkipHint(false);
        if (buildupStopRef.current) {
          buildupStopRef.current();
          buildupStopRef.current = null;
        }
        triggerRevealSequence(effectRarity);
        onReveal?.();
      },
      onShowcaseReady: () => {
        setPhase(ANIMATION_PHASES.SHOWCASE);
        // Track which entity this showcase is for (prevents name flash on entity change)
        showcaseReadyForEntityRef.current = normalizedEntity?.id;
        setIsShowcaseReady(true);
      },
      onAnimationComplete: () => {
        setPhase(ANIMATION_PHASES.COMPLETE);
      },
      onSkip: () => {
        setShowSkipHint(false);
        if (buildupStopRef.current) {
          buildupStopRef.current();
          buildupStopRef.current = null;
        }
        // Track which entity this showcase is for (prevents name flash on entity change)
        showcaseReadyForEntityRef.current = normalizedEntity?.id;
        setIsShowcaseReady(true);
        onSkip?.();
      },
    });

    // Play animation with error handling, passing dynamic config
    if (autoPlay) {
      scene.play(normalizedEntity, {
        colors: rarityColors,
        glowIntensity: rarityAnimConfig.glowIntensity,
        buildupTime: rarityAnimConfig.buildupTime,
        orbCount: rarityAnimConfig.orbCount,
        ringCount: rarityAnimConfig.ringCount,
      }).catch((error) => {
        console.error('Failed to play summon animation:', error);
        setAnimationError(error);
        // Skip to showcase ready state on error so user can continue
        setPhase(ANIMATION_PHASES.COMPLETE);
        // Set showcaseReadyForEntityRef so the UI will display for this entity
        showcaseReadyForEntityRef.current = normalizedEntity?.id;
        setIsShowcaseReady(true);
      });
    }

    return () => {
      if (buildupStopRef.current) {
        buildupStopRef.current();
        buildupStopRef.current = null;
      }
      stopAllEffects();
    };
  }, [
    isActive,
    normalizedEntity,
    autoPlay,
    allowSkip,
    skipEnabled,
    effectRarity,
    rarityColors,
    rarityAnimConfig,
    isMultiPull,
    playPullStart,
    playBuildup,
    triggerRevealSequence,
    stopAllEffects,
    onAnimationStart,
    onBuildUpComplete,
    onReveal,
    onSkip,
  ]);

  // Lock body scroll
  useEffect(() => {
    if (!isActive) return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isActive]);

  // Handle interaction
  const handleInteraction = useCallback((e) => {
    e?.stopPropagation?.();

    if (isShowcaseReady || animationError) {
      playContinue();
      setAnimationError(null);
      onComplete?.();
      onAnimationComplete?.();
    } else if ((allowSkip || skipEnabled) && showSkipHint) {
      sceneRef.current?.skip();
    }
  }, [isShowcaseReady, animationError, allowSkip, skipEnabled, showSkipHint, playContinue, onComplete, onAnimationComplete]);

  // Keyboard support
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleInteraction]);

  if (!isActive) return null;

  return (
    <S.Overlay
      onClick={handleInteraction}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={`Summoning ${normalizedEntity?.name || 'character'}`}
    >
      {/* Screen reader announcement */}
      <S.ScreenReaderOnly role="status" aria-live="polite">
        {isShowcaseReady && normalizedEntity
          ? `You summoned ${normalizedEntity.name}, ${effectRarity} rarity`
          : 'Summoning in progress'}
      </S.ScreenReaderOnly>

      {/* Pixi Canvas */}
      <S.CanvasContainer>
        <canvas ref={canvasRef} />
      </S.CanvasContainer>

      {/* UI Overlay */}
      <S.UIOverlay>
        <S.TopArea />

        {/* Skip Hint */}
        <AnimatePresence>
          {showSkipHint && !isShowcaseReady && (
            <S.SkipHint
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {t('summon.tapToSkip', 'Tap to skip')}
            </S.SkipHint>
          )}
        </AnimatePresence>

        {/* Character card is now rendered in Pixi.js CollectionCardLayer */}

        <S.BottomArea>
          {/* Multi-pull Progress */}
          {isMultiPull && (
            <S.ProgressBar>
              <S.ProgressText>{currentPull} / {totalPulls}</S.ProgressText>
              <S.ProgressTrack>
                <S.ProgressFill style={{ width: `${(currentPull / totalPulls) * 100}%` }} />
              </S.ProgressTrack>
            </S.ProgressBar>
          )}

          {/* Continue Button - also uses entity check to prevent flash */}
          <AnimatePresence>
            {isShowcaseReady && showcaseReadyForEntityRef.current === normalizedEntity?.id && (
              <S.ContinueButton
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInteraction}
              >
                {isMultiPull && currentPull < totalPulls
                  ? t('summon.next', 'Next')
                  : t('summon.continue', 'Continue')}
              </S.ContinueButton>
            )}
          </AnimatePresence>

          {/* Skip All Button (Multi-pull) */}
          {isMultiPull && onSkipAll && !isShowcaseReady && (
            <S.SkipAllButton
              onClick={(e) => {
                e.stopPropagation();
                stopAllEffects();
                sceneRef.current?.reset();
                onSkipAll();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t('summon.skipAll', 'Skip All')}
            </S.SkipAllButton>
          )}
        </S.BottomArea>
      </S.UIOverlay>
    </S.Overlay>
  );
});

SummonAnimation.displayName = 'SummonAnimation';

export default SummonAnimation;
