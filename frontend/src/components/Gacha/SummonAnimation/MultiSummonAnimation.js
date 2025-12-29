/**
 * MultiSummonAnimation
 *
 * Wrapper component for handling multi-pull summon animations.
 * Manages the sequence of individual summon animations and provides
 * a skip-all option to view all results at once.
 *
 * Features:
 * - Progressive timing acceleration (first few pulls are full speed, then faster)
 * - Skip all functionality with results grid
 * - Tracks highest rarity for ambient effects
 * - Clean state management between pulls
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useRarity } from '../../../context/RarityContext';
import { useGachaEffects } from '../../../engine/effects/useGachaEffects';
import { isVideo } from '../../../utils/mediaUtils';

import { SummonAnimation } from './SummonAnimation';
import { MULTI_PULL_CONFIGS } from './constants';
import * as S from './styles';

// ==================== RARITY UTILITIES ====================

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/**
 * Get the highest rarity from a list of characters
 */
const getHighestRarity = (characters) => {
  if (!characters || characters.length === 0) return 'common';

  let highestIndex = 0;
  characters.forEach(char => {
    const index = RARITY_ORDER.indexOf(char.rarity?.toLowerCase());
    if (index > highestIndex) highestIndex = index;
  });

  return RARITY_ORDER[highestIndex];
};

/**
 * Convert hex color to RGB string
 */
const hexToRgb = (hex) => {
  if (!hex) return '142, 142, 147';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '142, 142, 147';
};

// ==================== MAIN COMPONENT ====================

export const MultiSummonAnimation = ({
  isActive,
  characters = [],
  onComplete,
  skipEnabled = true,
  getImagePath,
}) => {
  const { t } = useTranslation();

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkippedResults, setShowSkippedResults] = useState(false);

  // Refs
  const hasCompletedRef = useRef(false);

  // Context hooks
  const { getRarityColor } = useRarity();
  const { stopAllEffects } = useGachaEffects();

  // Calculate highest rarity for ambient effects
  const highestRarity = useMemo(() => getHighestRarity(characters), [characters]);

  // Calculate timing multiplier for current pull
  const timingMultiplier = useMemo(() =>
    MULTI_PULL_CONFIGS.getTimingMultiplier(currentIndex, characters.length),
    [currentIndex, characters.length]
  );

  // Current character
  const currentCharacter = characters[currentIndex];

  // Reset state when animation becomes inactive
  useEffect(() => {
    if (!isActive) {
      setCurrentIndex(0);
      setShowSkippedResults(false);
      hasCompletedRef.current = false;
      stopAllEffects();
    }
  }, [isActive, stopAllEffects]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllEffects();
    };
  }, [stopAllEffects]);

  // Lock body scroll when showing results grid (prevents mobile viewport jumping)
  useEffect(() => {
    if (!showSkippedResults) return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    // Lock body scroll
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
  }, [showSkippedResults]);

  /**
   * Handle completion of a single summon animation
   */
  const handleSingleComplete = useCallback(() => {
    // Clear effects before state update to prevent visual artifacts
    stopAllEffects();

    if (currentIndex < characters.length - 1) {
      // Move to next character
      setCurrentIndex(prev => prev + 1);
    } else {
      // All characters shown, complete the multi-pull
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      onComplete?.();
    }
  }, [currentIndex, characters.length, onComplete, stopAllEffects]);

  /**
   * Handle skip all - show results grid
   */
  const handleSkipAll = useCallback(() => {
    stopAllEffects();
    setShowSkippedResults(true);
  }, [stopAllEffects]);

  /**
   * Handle closing the results grid
   */
  const handleCloseResults = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  // Don't render if not active or no characters
  if (!isActive || characters.length === 0) return null;

  // Show results grid if user skipped
  if (showSkippedResults) {
    return (
      <S.ResultsOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleCloseResults}
        role="dialog"
        aria-modal="true"
        aria-label="Summon results"
      >
        <S.ResultsContent
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
        >
          <S.ResultsHeader>
            <S.ResultsTitle>{t('summon.complete', 'Summon Complete!')}</S.ResultsTitle>
            <S.ResultsSubtitle>
              {t('summon.charactersObtained', { count: characters.length }, `${characters.length} characters obtained`)}
            </S.ResultsSubtitle>
          </S.ResultsHeader>

          <S.ResultsGrid>
            {characters.map((char, index) => {
              const color = getRarityColor(char.rarity);
              const colorRgb = hexToRgb(color);

              return (
                <S.ResultCard
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.1 + index * 0.03,
                    duration: 0.25,
                  }}
                  style={{
                    '--rarity-color': color,
                    '--rarity-color-rgb': colorRgb,
                  }}
                >
                  <S.ResultImageWrapper>
                    {isVideo(char.image) ? (
                      <video
                        src={getImagePath(char.image)}
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={getImagePath(char.image)}
                        alt={char.name}
                      />
                    )}
                  </S.ResultImageWrapper>
                  <S.ResultInfo>
                    <S.ResultName>{char.name}</S.ResultName>
                    <S.ResultRarity>{char.rarity}</S.ResultRarity>
                  </S.ResultInfo>
                </S.ResultCard>
              );
            })}
          </S.ResultsGrid>

          <S.CloseButton
            onClick={handleCloseResults}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('common.continue', 'Continue')}
          </S.CloseButton>
        </S.ResultsContent>
      </S.ResultsOverlay>
    );
  }

  // Show individual summon animation
  return (
    <SummonAnimation
      isActive={true}
      rarity={currentCharacter?.rarity || 'common'}
      character={currentCharacter}
      onComplete={handleSingleComplete}
      skipEnabled={skipEnabled}
      getImagePath={getImagePath}
      isMultiPull={true}
      currentPull={currentIndex + 1}
      totalPulls={characters.length}
      onSkipAll={handleSkipAll}
      ambientRarity={highestRarity}
      timingMultiplier={timingMultiplier}
    />
  );
};

export default MultiSummonAnimation;
