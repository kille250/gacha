/**
 * MultiSummonAnimation
 *
 * Wrapper component for handling multi-pull summon animations.
 * Manages the sequence of individual animations and skip-all functionality.
 * Uses CharacterCard component for consistent styling with collection.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useRarity } from '../../context/RarityContext';
import { useGachaEffects } from '../../engine/effects/useGachaEffects';
import { isVideo } from '../../utils/mediaUtils';
import CharacterCard from '../patterns/CharacterCard';

import { SummonAnimation } from './SummonAnimation';
import * as S from './SummonAnimation.styles';
import { ResultNewBadge, ResultDuplicateBadge } from './SummonAnimation.styles';

// ==================== MAIN COMPONENT ====================

export const MultiSummonAnimation = ({
  isActive = false,
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

  // Context hooks - use getRarityColor/Glow for CharacterCard
  const { getRarityColor, getRarityGlow } = useRarity();
  const { stopAllEffects } = useGachaEffects();

  // Current character
  const currentCharacter = characters[currentIndex];

  // Reset on deactivation
  useEffect(() => {
    if (!isActive) {
      setCurrentIndex(0);
      setShowSkippedResults(false);
      hasCompletedRef.current = false;
      stopAllEffects();
    }
  }, [isActive, stopAllEffects]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAllEffects();
    };
  }, [stopAllEffects]);

  // Lock scroll for results grid
  useEffect(() => {
    if (!showSkippedResults) return;

    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [showSkippedResults]);

  // Handle single complete
  const handleSingleComplete = useCallback(() => {
    stopAllEffects();

    if (currentIndex < characters.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      onComplete?.();
    }
  }, [currentIndex, characters.length, onComplete, stopAllEffects]);

  // Handle skip all
  const handleSkipAll = useCallback(() => {
    stopAllEffects();
    setShowSkippedResults(true);
  }, [stopAllEffects]);

  // Handle close results
  const handleCloseResults = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  if (!isActive || characters.length === 0) return null;

  // Show results grid if skipped
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
          onClick={(e) => e.stopPropagation()}
        >
          <S.ResultsHeader>
            <S.ResultsTitle>
              {t('summon.complete', 'Summon Complete!')}
            </S.ResultsTitle>
            <S.ResultsSubtitle>
              {t(
                'summon.charactersObtained',
                { count: characters.length },
                `${characters.length} characters obtained`
              )}
            </S.ResultsSubtitle>
          </S.ResultsHeader>

          <S.ResultsGrid>
            {characters.map((char, index) => {
              // Use CharacterCard for consistent styling with collection
              const imagePath = getImagePath ? getImagePath(char.image) : char.image;
              const isVideoMedia = isVideo(char.image);
              // Check if this is a new acquisition or a duplicate
              const isNewAcquisition = char.acquisition?.isNew !== false;

              return (
                <S.ResultCardWrapper
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.1 + index * 0.03,
                    duration: 0.25,
                  }}
                >
                  {/* Show NEW or DUPLICATE badge based on acquisition status */}
                  {isNewAcquisition ? (
                    <ResultNewBadge>NEW</ResultNewBadge>
                  ) : (
                    <ResultDuplicateBadge>DUP</ResultDuplicateBadge>
                  )}
                  <CharacterCard
                    character={char}
                    isOwned={true}
                    isVideo={isVideoMedia}
                    imageSrc={imagePath}
                    rarityColor={getRarityColor(char.rarity)}
                    rarityGlow={getRarityGlow(char.rarity)}
                    levelInfo={{ level: 1 }}
                  />
                </S.ResultCardWrapper>
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

  // Show individual animation
  return (
    <SummonAnimation
      isActive={true}
      entity={currentCharacter}
      rarity={currentCharacter?.rarity || 'common'}
      onComplete={handleSingleComplete}
      skipEnabled={skipEnabled}
      getImagePath={getImagePath}
      isMultiPull={true}
      currentPull={currentIndex + 1}
      totalPulls={characters.length}
      onSkipAll={handleSkipAll}
    />
  );
};

export default MultiSummonAnimation;
