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
import { FaStar, FaGem, FaTrophy, FaDice } from 'react-icons/fa';

import { useRarity } from '../../context/RarityContext';
import { useGachaEffects } from '../../engine/effects/useGachaEffects';
import { SummonScene } from './pixi/SummonScene';
import { ANIMATION_PHASES, RARITY_COLORS } from './pixi/constants';
import * as S from './SummonAnimation.styles';

// ==================== UTILITIES ====================

const getIconByRarity = (rarity) => {
  const rarityLower = rarity?.toLowerCase();
  if (rarityLower === 'legendary') return <FaTrophy />;
  if (rarityLower === 'epic') return <FaGem />;
  if (rarityLower === 'rare') return <FaStar />;
  if (rarityLower === 'uncommon') return <FaStar />;
  return <FaDice />;
};

const hexToString = (hex) => {
  if (typeof hex === 'string') return hex;
  return '#' + hex.toString(16).padStart(6, '0');
};

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

  // State
  const [phase, setPhase] = useState(ANIMATION_PHASES.IDLE);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
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

  // Get rarity context
  const { getRarityColor } = useRarity();
  const effectRarity = normalizedEntity?.rarity || 'common';
  getRarityColor(effectRarity); // Validate rarity exists

  // Get rarity colors
  const rarityColors = useMemo(() => {
    return RARITY_COLORS[effectRarity?.toLowerCase()] || RARITY_COLORS.common;
  }, [effectRarity]);

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
        setIsComplete(true);
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
    // Don't re-initialize if already exists
    if (sceneRef.current) return;

    let mounted = true;
    const scene = new SummonScene(canvasRef.current);
    sceneRef.current = scene;

    // Set image path resolver using ref
    scene.setImagePathResolver((path) => {
      return getImagePathRef.current ? getImagePathRef.current(path) : path;
    });

    // Initialize with proper error handling and timeout
    const initTimeout = setTimeout(() => {
      if (mounted && !scene.isInitialized) {
        console.error('Summon animation initialization timeout');
        initErrorRef.current = new Error('Initialization timeout');
        setAnimationError(new Error('Initialization timeout'));
      }
    }, 5000);

    scene.initialize()
      .then(() => {
        clearTimeout(initTimeout);
      })
      .catch((error) => {
        clearTimeout(initTimeout);
        console.error('Failed to initialize summon animation:', error);
        if (mounted) {
          initErrorRef.current = error;
          setAnimationError(error);
        }
      });

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
    };
  }, []); // Empty dependency - initialize only once

  // Handle activation
  useEffect(() => {
    if (!isActive || !sceneRef.current || !normalizedEntity) {
      if (sceneRef.current) {
        sceneRef.current.reset();
      }
      setPhase(ANIMATION_PHASES.IDLE);
      setIsComplete(false);
      setShowSkipHint(false);
      setAnimationError(null);
      initErrorRef.current = null;
      return;
    }

    // If there's already an initialization error, skip to complete
    if (initErrorRef.current) {
      setAnimationError(initErrorRef.current);
      setPhase(ANIMATION_PHASES.COMPLETE);
      setIsComplete(true);
      return;
    }

    const scene = sceneRef.current;

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
      onAnimationComplete: () => {
        setPhase(ANIMATION_PHASES.COMPLETE);
        setIsComplete(true);
      },
      onSkip: () => {
        setShowSkipHint(false);
        if (buildupStopRef.current) {
          buildupStopRef.current();
          buildupStopRef.current = null;
        }
        onSkip?.();
      },
    });

    // Play animation with error handling
    if (autoPlay) {
      scene.play(normalizedEntity).catch((error) => {
        console.error('Failed to play summon animation:', error);
        setAnimationError(error);
        // Skip to completion state on error so user can continue
        setPhase(ANIMATION_PHASES.COMPLETE);
        setIsComplete(true);
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
    playPullStart,
    playBuildup,
    triggerRevealSequence,
    stopAllEffects,
    onAnimationStart,
    onBuildUpComplete,
    onReveal,
    onSkip,
  ]);

  // Reset on currentPull change (multi-pull)
  useEffect(() => {
    if (isMultiPull && sceneRef.current) {
      sceneRef.current.reset();
      setPhase(ANIMATION_PHASES.IDLE);
      setIsComplete(false);
      setAnimationError(null);
      stopAllEffects();
    }
  }, [currentPull, isMultiPull, stopAllEffects]);

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

    if (isComplete || animationError) {
      playContinue();
      setAnimationError(null);
      onComplete?.();
      onAnimationComplete?.();
    } else if ((allowSkip || skipEnabled) && showSkipHint) {
      sceneRef.current?.skip();
    }
  }, [isComplete, animationError, allowSkip, skipEnabled, showSkipHint, playContinue, onComplete, onAnimationComplete]);

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
        {isComplete && normalizedEntity
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
          {showSkipHint && !isComplete && (
            <S.SkipHint
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              Tap to skip
            </S.SkipHint>
          )}
        </AnimatePresence>

        {/* Character Info (shown on complete) */}
        <AnimatePresence>
          {isComplete && normalizedEntity && (
            <S.CharacterInfo
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <S.RarityBadge $color={hexToString(rarityColors.primary)}>
                {getIconByRarity(effectRarity)}
                <span>{effectRarity.toUpperCase()}</span>
              </S.RarityBadge>
              <S.CharacterName>{normalizedEntity.name}</S.CharacterName>
              {normalizedEntity.series && (
                <S.CharacterSeries>{normalizedEntity.series}</S.CharacterSeries>
              )}
            </S.CharacterInfo>
          )}
        </AnimatePresence>

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

          {/* Continue Button */}
          <AnimatePresence>
            {isComplete && (
              <S.ContinueButton
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInteraction}
              >
                {isMultiPull && currentPull < totalPulls ? 'Next' : 'Continue'}
              </S.ContinueButton>
            )}
          </AnimatePresence>

          {/* Skip All Button (Multi-pull) */}
          {isMultiPull && onSkipAll && !isComplete && (
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
              Skip All
            </S.SkipAllButton>
          )}
        </S.BottomArea>
      </S.UIOverlay>
    </S.Overlay>
  );
});

SummonAnimation.displayName = 'SummonAnimation';

export default SummonAnimation;
