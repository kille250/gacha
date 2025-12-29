/**
 * SummonAnimation
 *
 * Premium summon animation component with 5-phase animation system.
 * Phases: INITIATION -> BUILDUP -> REVEAL -> SHOWCASE -> RESOLUTION -> COMPLETE
 *
 * Features:
 * - Rarity-based visual differentiation
 * - Pixi.js particle effects
 * - Screen shake and flash effects
 * - Full accessibility support (reduced motion, screen readers)
 * - Skip functionality with graceful fast-forward
 * - Keyboard navigation support
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FaStar, FaGem, FaTrophy, FaDice } from 'react-icons/fa';

import { useRarity } from '../../../context/RarityContext';
import { useGachaEffects } from '../../../engine/effects/useGachaEffects';
import { isVideo } from '../../../utils/mediaUtils';

import { useSummonAnimation } from './hooks/useSummonAnimation';
import { useParticleEffects } from './hooks/useParticleEffects';
import { PHASES, EASINGS, getRarityConfig, PHASE_TIMINGS } from './constants';
import * as S from './styles';

// ==================== ICON MAPPING ====================

/**
 * Get rarity icon by order level
 */
const getIconByOrder = (order) => {
  if (order >= 5) return <FaTrophy />;
  if (order >= 4) return <FaStar />;
  if (order >= 3) return <FaGem />;
  if (order >= 2) return <FaStar />;
  return <FaDice />;
};

/**
 * Convert hex color to RGB string for CSS custom properties
 */
const hexToRgb = (hex) => {
  if (!hex) return '142, 142, 147';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '142, 142, 147';
};

// ==================== MAIN COMPONENT ====================

export const SummonAnimation = ({
  isActive,
  rarity = 'common',
  character,
  onComplete,
  skipEnabled = true,
  getImagePath,
  isMultiPull = false,
  currentPull = 1,
  totalPulls = 1,
  onSkipAll,
  ambientRarity = null,
  timingMultiplier = 1.0,
}) => {
  // Refs
  const buildupStopRef = useRef(null);
  const containerRef = useRef(null);

  // Get rarity configuration from context
  const { getRarityAnimation, getRarityColor, ordered } = useRarity();

  // Determine effective rarity for ambient effects
  const effectRarity = ambientRarity || rarity;

  // Get colors from context
  const effectRarityColor = getRarityColor(effectRarity);

  // Get animation config
  const animConfig = useMemo(() => {
    const config = getRarityAnimation(effectRarity);
    const rarityInfo = ordered.find(r => r.name === rarity?.toLowerCase());
    const visualConfig = getRarityConfig(effectRarity);

    return {
      ...config,
      ...visualConfig,
      icon: getIconByOrder(rarityInfo?.order || 1),
    };
  }, [effectRarity, rarity, getRarityAnimation, ordered]);

  // Game effects
  const {
    playPullStart,
    playBuildup,
    triggerRevealSequence,
    playContinue,
    stopAllEffects,
  } = useGachaEffects();

  // Animation state machine
  const {
    phase,
    canSkip,
    showSkipHint,
    isComplete,
    skip,
    complete,
    reset,
    prefersReducedMotion,
    isPreReveal,
    isRevealed,
    isReveal,
  } = useSummonAnimation({
    isActive,
    rarity: effectRarity,
    timingMultiplier,
    skipEnabled,
    onPhaseChange: (newPhase) => {
      // Handle phase-specific effects
      if (newPhase === PHASES.INITIATION) {
        playPullStart();
        if (!prefersReducedMotion) {
          buildupStopRef.current = playBuildup();
        }
      }

      if (newPhase === PHASES.REVEAL) {
        // Stop buildup sound
        if (buildupStopRef.current) {
          buildupStopRef.current();
          buildupStopRef.current = null;
        }
        // Trigger reveal effects
        triggerRevealSequence(effectRarity);
      }
    },
    onComplete: () => {
      // Animation complete, ready for user interaction
    },
  });

  // Particle effects
  const { handlePhaseChange: handleParticlePhase } = useParticleEffects({
    rarity: effectRarity,
    color: effectRarityColor,
    accentColor: animConfig.accentColor,
    enabled: !prefersReducedMotion,
  });

  // Sync particle effects with phase
  useEffect(() => {
    handleParticlePhase(phase);
  }, [phase, handleParticlePhase]);

  // Handle user interaction (skip or continue)
  const handleInteraction = useCallback((e) => {
    e?.stopPropagation?.();

    if (isComplete) {
      playContinue();
      complete();
      onComplete?.();
    } else if (canSkip) {
      // Stop buildup sound
      if (buildupStopRef.current) {
        buildupStopRef.current();
        buildupStopRef.current = null;
      }
      triggerRevealSequence(effectRarity);
      skip();
    }
  }, [isComplete, canSkip, complete, skip, playContinue, onComplete, triggerRevealSequence, effectRarity]);

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

  // Lock body scroll when animation is active (prevents mobile viewport jumping)
  useEffect(() => {
    if (!isActive) return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    // Lock body scroll - prevents background scrolling and mobile address bar issues
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isActive]);

  // Cleanup on unmount or deactivation
  useEffect(() => {
    if (!isActive) {
      if (buildupStopRef.current) {
        buildupStopRef.current();
        buildupStopRef.current = null;
      }
      stopAllEffects();
      reset();
    }

    return () => {
      if (buildupStopRef.current) {
        buildupStopRef.current();
        buildupStopRef.current = null;
      }
      stopAllEffects();
    };
  }, [isActive, stopAllEffects, reset]);

  // Reset effects when character changes (multi-pull)
  useEffect(() => {
    stopAllEffects();
  }, [currentPull, stopAllEffects]);

  // Don't render if not active
  if (!isActive) return null;

  // Prepare CSS custom property values
  const colorRgb = hexToRgb(effectRarityColor);

  return (
    <S.Overlay
      onClick={handleInteraction}
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Summoning ${character?.name || 'character'}`}
    >
      <S.Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        $color={effectRarityColor}
        $colorRgb={colorRgb}
        $glowIntensity={animConfig.glowIntensity}
      >
        {/* Screen reader announcement */}
        <S.ScreenReaderOnly role="status" aria-live="polite">
          {isRevealed && character
            ? `You summoned ${character.name}, ${rarity} rarity`
            : 'Summoning in progress'}
        </S.ScreenReaderOnly>

        {/* Ambient Background */}
        <S.AmbientGlow
          initial={{ opacity: 0 }}
          animate={{ opacity: isPreReveal ? 1 : 0.6 }}
          transition={{ duration: 0.5 }}
        />
        <S.Vignette />

        {/* Dim overlay during buildup */}
        <AnimatePresence>
          {isPreReveal && (
            <S.DimOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Buildup Animation */}
        <AnimatePresence>
          {isPreReveal && !prefersReducedMotion && (
            <S.BuildupContainer
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.3 }}
            >
              {/* Central Orb */}
              <S.CentralOrb>
                <S.OrbCore $accentColor={animConfig.accentColor} />
                <S.OrbPulseRing />
                <S.OrbPulseRing $delay={0.5} />
              </S.CentralOrb>

              {/* Rotating Rings */}
              {[...Array(animConfig.ringCount || 1)].map((_, i) => (
                <S.Ring key={i} $index={i} />
              ))}

              {/* Floating Orbs */}
              <S.OrbField>
                {[...Array(animConfig.orbCount || 3)].map((_, i) => (
                  <S.FloatingOrb
                    key={i}
                    $index={i}
                    $total={animConfig.orbCount || 3}
                  />
                ))}
              </S.OrbField>

              {/* Rarity Icon */}
              <S.RarityIconContainer
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={EASINGS.spring.bounce}
              >
                {animConfig.icon}
              </S.RarityIconContainer>
            </S.BuildupContainer>
          )}
        </AnimatePresence>

        {/* Flash Effect */}
        <AnimatePresence>
          {isReveal && (
            <S.FlashOverlay
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.15,
                ease: EASINGS.easeOut,
              }}
            />
          )}
        </AnimatePresence>

        {/* Character Card Reveal */}
        <AnimatePresence>
          {isRevealed && character && (
            <S.ShowcaseContainer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <S.CardContainer
                initial={{
                  scale: 0.85,
                  opacity: 0,
                  x: '-50%',
                  y: '-50%',
                  filter: 'blur(12px)',
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  x: '-50%',
                  y: '-50%',
                  filter: 'blur(0px)',
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                  x: '-50%',
                  y: '-50%',
                }}
                transition={{
                  ...EASINGS.spring.reveal,
                  x: { duration: 0 },
                  y: { duration: 0 },
                  filter: { duration: 0.35, ease: EASINGS.easeOut },
                }}
              >
                <S.CardFloat>
                  <S.CharacterCard>
                    <S.CardShine />

                    <S.CardImageContainer>
                      {isVideo(character.image) ? (
                        <S.CardVideo
                          src={getImagePath(character.image)}
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <S.CardImage
                          src={getImagePath(character.image)}
                          alt={character.name}
                        />
                      )}
                      <S.ImageGradient />
                    </S.CardImageContainer>

                    <S.CardInfo
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: PHASE_TIMINGS.SHOWCASE.statsDelay / 1000,
                        duration: 0.3,
                      }}
                    >
                      <S.RarityBadge>
                        {animConfig.icon}
                        <span>{rarity.toUpperCase()}</span>
                      </S.RarityBadge>
                      <S.CharacterName>{character.name}</S.CharacterName>
                      <S.CharacterSeries>{character.series}</S.CharacterSeries>
                    </S.CardInfo>

                    <S.CardGlowBorder $rarity={rarity} />
                  </S.CharacterCard>
                </S.CardFloat>
              </S.CardContainer>
            </S.ShowcaseContainer>
          )}
        </AnimatePresence>

        {/* Skip Hint */}
        <AnimatePresence>
          {showSkipHint && canSkip && (
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

        {/* Bottom Controls */}
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
                transition={EASINGS.spring.gentle}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInteraction}
              >
                {isMultiPull && currentPull < totalPulls ? 'Next' : 'Continue'}
              </S.ContinueButton>
            )}
          </AnimatePresence>

          {/* Skip All for Multi-pull */}
          {isMultiPull && onSkipAll && !isComplete && (
            <S.SkipAllButton
              onClick={(e) => {
                e.stopPropagation();
                stopAllEffects();
                onSkipAll();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Skip All
            </S.SkipAllButton>
          )}
        </S.BottomArea>
      </S.Container>
    </S.Overlay>
  );
};

export default SummonAnimation;
