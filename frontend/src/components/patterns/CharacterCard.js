/**
 * CharacterCard - Reusable character display card
 *
 * Used in Collection, Gacha results, and other character displays.
 * Supports owned/not-owned states, level display, and shard progress.
 * Includes accessibility features and reduced motion support.
 *
 * Enhanced with:
 * - Premium rarity effects (shimmer, glow)
 * - Improved spring physics
 * - Better focus states
 * - Subtle depth with layered shadows
 */

import React, { memo, useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, springs, useReducedMotion, VisuallyHidden } from '../../design-system';
import { PLACEHOLDER_IMAGE } from '../../utils/mediaUtils';
import { useVideoVisibility } from '../../hooks';
import { IconTrophy, IconMastery } from '../../constants/icons';

// Premium shimmer animation for legendary/epic cards
const shimmer = keyframes`
  0% {
    background-position: -200% 0;
    opacity: 0;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    background-position: 200% 0;
    opacity: 0;
  }
`;

// Subtle glow pulse for legendary items
const glowPulse = keyframes`
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
`;

// Animated border glow for legendary cards
const legendaryBorderGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 15px rgba(255, 215, 0, 0.4),
      0 0 30px rgba(255, 167, 38, 0.2),
      inset 0 0 15px rgba(255, 215, 0, 0.1);
  }
  50% {
    box-shadow:
      0 0 25px rgba(255, 215, 0, 0.6),
      0 0 50px rgba(255, 167, 38, 0.3),
      inset 0 0 20px rgba(255, 215, 0, 0.15);
  }
`;

// Holographic rainbow effect for legendary cards
const holographicShift = keyframes`
  0% {
    background-position: 0% 50%;
    filter: hue-rotate(0deg);
  }
  50% {
    background-position: 100% 50%;
    filter: hue-rotate(15deg);
  }
  100% {
    background-position: 0% 50%;
    filter: hue-rotate(0deg);
  }
`;

// Epic glow pulse
const epicGlowPulse = keyframes`
  0%, 100% {
    box-shadow:
      0 0 10px rgba(191, 90, 242, 0.3),
      0 0 20px rgba(191, 90, 242, 0.15);
  }
  50% {
    box-shadow:
      0 0 18px rgba(191, 90, 242, 0.45),
      0 0 35px rgba(191, 90, 242, 0.25);
  }
`;

// Rare glow on hover
const rareGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 8px rgba(10, 132, 255, 0.25),
      0 0 16px rgba(10, 132, 255, 0.1);
  }
  50% {
    box-shadow:
      0 0 14px rgba(10, 132, 255, 0.4),
      0 0 28px rgba(10, 132, 255, 0.2);
  }
`;

// Subtle idle breathing animation for legendary cards
const legendaryIdle = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
`;

// Rarity-specific styles - legendary gets enhanced shimmer + glow + holographic
const rarityStyles = {
  legendary: css`
    /* Animated border glow + subtle idle breathing */
    animation:
      ${legendaryBorderGlow} 3s ease-in-out infinite,
      ${legendaryIdle} 4s ease-in-out infinite;
    border-color: rgba(255, 215, 0, 0.5);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
    }

    /* Holographic rainbow shimmer overlay */
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        125deg,
        transparent 0%,
        rgba(255, 0, 128, 0.08) 15%,
        rgba(255, 215, 0, 0.12) 30%,
        rgba(0, 255, 128, 0.08) 45%,
        rgba(0, 128, 255, 0.08) 60%,
        rgba(128, 0, 255, 0.08) 75%,
        rgba(255, 0, 128, 0.08) 90%,
        transparent 100%
      );
      background-size: 400% 400%;
      animation: ${holographicShift} 6s ease-in-out infinite;
      pointer-events: none;
      z-index: 3;
      border-radius: inherit;
      mix-blend-mode: overlay;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
        opacity: 0;
      }
    }

    /* Secondary golden sparkle layer */
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(
          circle at 30% 30%,
          rgba(255, 255, 255, 0.2) 0%,
          transparent 50%
        ),
        radial-gradient(
          circle at 70% 70%,
          rgba(255, 215, 0, 0.15) 0%,
          transparent 40%
        ),
        linear-gradient(
          110deg,
          transparent 20%,
          rgba(255, 215, 0, 0.15) 40%,
          rgba(255, 255, 255, 0.1) 50%,
          rgba(255, 215, 0, 0.15) 60%,
          transparent 80%
        );
      background-size: 100% 100%, 100% 100%, 200% 100%;
      animation: ${shimmer} 3s ease-in-out infinite;
      pointer-events: none;
      z-index: 4;
      border-radius: inherit;
      opacity: 0.9;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
        background: radial-gradient(
          circle at 50% 50%,
          rgba(255, 215, 0, 0.15) 0%,
          transparent 70%
        );
      }
    }
  `,

  // Epic gets animated purple glow + shimmer
  epic: css`
    animation: ${epicGlowPulse} 3.5s ease-in-out infinite;
    border-color: rgba(191, 90, 242, 0.4);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      box-shadow: 0 0 15px rgba(191, 90, 242, 0.3);
    }

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        110deg,
        transparent 30%,
        rgba(191, 90, 242, 0.12) 45%,
        rgba(156, 39, 176, 0.18) 50%,
        rgba(191, 90, 242, 0.12) 55%,
        transparent 70%
      );
      background-size: 200% 100%;
      animation: ${shimmer} 4s ease-in-out infinite;
      pointer-events: none;
      z-index: 3;
      border-radius: inherit;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
        opacity: 0;
      }
    }
  `,

  // Rare gets blue glow on hover
  rare: css`
    border-color: rgba(10, 132, 255, 0.25);

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        animation: ${rareGlow} 2s ease-in-out infinite;
        border-color: rgba(10, 132, 255, 0.5);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      &:hover {
        animation: none;
        box-shadow: 0 0 12px rgba(10, 132, 255, 0.3);
      }
    }
  `,

  // Uncommon gets subtle green tint on hover
  uncommon: css`
    @media (hover: hover) and (pointer: fine) {
      &:hover {
        border-color: rgba(52, 199, 89, 0.4);
        box-shadow:
          ${theme.shadows.cardHover},
          0 0 12px rgba(52, 199, 89, 0.2);
      }
    }
  `
};

const Card = styled(motion.div)`
  position: relative;
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};  /* Standardized to xl (20px) */
  overflow: hidden;
  cursor: pointer;
  border: 1px solid ${props => props.$isOwned
    ? theme.colors.surfaceBorder
    : theme.colors.surfaceBorderSubtle};
  box-shadow: ${theme.shadows.card};
  transition:
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut};

  /* Apply rarity-specific effects for owned cards */
  ${props => props.$isOwned && props.$rarity === 'legendary' && rarityStyles.legendary}
  ${props => props.$isOwned && props.$rarity === 'epic' && rarityStyles.epic}
  ${props => props.$isOwned && props.$rarity === 'rare' && rarityStyles.rare}
  ${props => props.$isOwned && props.$rarity === 'uncommon' && rarityStyles.uncommon}

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: ${props => props.$color};
      box-shadow:
        ${theme.shadows.cardHover},
        ${props => props.$glow || 'none'};
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing},
      ${props => props.$glow || theme.shadows.md};
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: ${theme.colors.backgroundTertiary};
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.55)'};
  transition:
    transform ${theme.timing.slow} ${theme.easing.appleSpring},
    filter ${theme.timing.slow} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    ${Card}:hover & {
      transform: scale(1.05);
      filter: ${props => props.$isOwned ? 'none' : 'grayscale(40%) brightness(0.7)'};
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: filter ${theme.timing.normal} ${theme.easing.easeOut};
    ${Card}:hover & {
      transform: none;
    }
  }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.55)'};
  transition: filter ${theme.timing.slow} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    ${Card}:hover & {
      filter: ${props => props.$isOwned ? 'none' : 'grayscale(40%) brightness(0.7)'};
    }
  }
`;

const NotOwnedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
`;

const NotOwnedLabel = styled.div`
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 6px 14px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: ${theme.letterSpacing.wide};
`;

const RarityIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => props.$color};
  box-shadow: ${props => props.$isOwned ? `0 0 8px ${props.$color}60` : 'none'};
  transition: box-shadow ${theme.timing.normal} ${theme.easing.easeOut};

  @media (hover: hover) and (pointer: fine) {
    ${Card}:hover & {
      box-shadow: 0 0 12px ${props => props.$color}80;
    }
  }
`;

const LevelBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 5px 10px;
  background: ${props => {
    if (props.$isMaxLevel) return 'linear-gradient(135deg, #ffd700, #ff8c00)';
    if (props.$canLevelUp) return 'linear-gradient(135deg, #34C759, #2FB64E)';
    return 'rgba(0, 0, 0, 0.8)';
  }};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: white;
  letter-spacing: ${theme.letterSpacing.wide};
  box-shadow: ${props => {
    if (props.$isMaxLevel) return `0 2px 8px rgba(255, 215, 0, 0.4), ${theme.shadows.sm}`;
    if (props.$canLevelUp) return `0 2px 8px rgba(52, 199, 89, 0.4), ${theme.shadows.sm}`;
    return theme.shadows.sm;
  }};
  z-index: 2;

  ${props => props.$isMaxLevel && css`
    animation: ${glowPulse} 2s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const ShardBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background: ${props => props.$canLevelUp
    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.95), rgba(45, 175, 75, 0.95))'
    : 'rgba(175, 82, 222, 0.92)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: ${theme.radius.full};
  font-size: 11px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
  letter-spacing: ${theme.letterSpacing.wide};
  z-index: 2;
  box-shadow: ${props => props.$canLevelUp
    ? `0 2px 8px rgba(52, 199, 89, 0.4), ${theme.shadows.xs}`
    : theme.shadows.xs};
`;

// Mastery progress indicator - shows character mastery XP progress (v6.0)
const MasteryBadge = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: ${props => props.$isMaxMastery
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 165, 0, 0.95))'
    : 'rgba(88, 86, 214, 0.9)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  color: white;
  z-index: 2;
  box-shadow: ${props => props.$isMaxMastery
    ? `0 2px 8px rgba(255, 215, 0, 0.4), ${theme.shadows.xs}`
    : theme.shadows.xs};

  ${props => props.$isMaxMastery && css`
    animation: ${glowPulse} 3s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const MasteryProgressBar = styled.div`
  width: 24px;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
`;

const MasteryProgressFill = styled.div`
  height: 100%;
  background: white;
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const CardContent = styled.div`
  padding: ${theme.spacing.md};
`;

const CharName = styled.h3`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  line-height: ${theme.lineHeights.snug};
  color: ${props => props.$isOwned ? theme.colors.text : theme.colors.textSecondary};
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CharSeries = styled.p`
  font-size: ${theme.fontSizes.xs};
  line-height: ${theme.lineHeights.snug};
  color: ${props => props.$isOwned ? theme.colors.textTertiary : theme.colors.textMuted};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Rarity symbols for accessibility (visible alongside color indicator)
const RARITY_SYMBOLS = {
  common: '●',
  uncommon: '◆',
  rare: '★',
  epic: '✦',
  legendary: '✧',
};

// Mastery level thresholds (matches backend gameDesign.js MASTERY_TRACKS)
const MASTERY_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];
const MAX_MASTERY_LEVEL = 10;

/**
 * Calculate mastery level from XP
 * @param {number} masteryXp - Current mastery XP
 * @returns {Object} - { level, progress, isMax }
 */
function calculateMasteryLevel(masteryXp = 0) {
  let level = 1;
  for (let i = 1; i < MASTERY_THRESHOLDS.length; i++) {
    if (masteryXp >= MASTERY_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const isMax = level >= MAX_MASTERY_LEVEL;
  const currentThreshold = MASTERY_THRESHOLDS[level - 1] || 0;
  const nextThreshold = MASTERY_THRESHOLDS[level] || MASTERY_THRESHOLDS[MASTERY_THRESHOLDS.length - 1];
  const progress = isMax ? 1 : (masteryXp - currentThreshold) / (nextThreshold - currentThreshold);

  return { level, progress: Math.min(1, Math.max(0, progress)), isMax };
}

/**
 * CharacterCard Component
 *
 * @param {Object} props
 * @param {Object} props.character - Character data object
 * @param {boolean} props.isOwned - Whether user owns this character
 * @param {boolean} props.isVideo - Whether the image is a video
 * @param {string} props.imageSrc - Full image URL
 * @param {string} props.rarityColor - Color for rarity indicator
 * @param {string} props.rarityGlow - Glow effect for rarity
 * @param {Object} props.levelInfo - Level, shards, canLevelUp info
 * @param {Object} props.masteryInfo - Mastery XP and level info (optional)
 * @param {string} props.notOwnedLabel - Label for not-owned state
 * @param {Function} props.onClick - Click handler
 */
const CharacterCard = memo(({
  character,
  isOwned = false,
  isVideo = false,
  imageSrc,
  rarityColor,
  rarityGlow,
  levelInfo = {},
  masteryInfo = {},
  notOwnedLabel,
  onClick,
  ...props
}) => {
  const { t } = useTranslation();
  const { level = 1, isMaxLevel = false, shards = 0, shardsToNextLevel, canLevelUp = false } = levelInfo;

  // Calculate mastery level from XP if provided
  const masteryXp = masteryInfo?.masteryXp || character?.masteryXp || 0;
  const masteryData = calculateMasteryLevel(masteryXp);
  const showMastery = isOwned && masteryXp > 0;
  const prefersReducedMotion = useReducedMotion();
  const videoRef = useRef(null);

  // Use intersection observer to pause/play video based on visibility
  useVideoVisibility(videoRef, { disabled: !isVideo });

  const handleImageError = useCallback((e) => {
    if (!e.target.src.includes('placeholder')) {
      e.target.src = PLACEHOLDER_IMAGE;
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  }, [onClick]);

  // Get rarity symbol for accessibility
  const raritySymbol = RARITY_SYMBOLS[character.rarity] || RARITY_SYMBOLS.common;

  // Build accessible label
  const accessibleLabel = [
    character.name,
    character.series,
    t('patterns.rarityLabel', { rarity: character.rarity }),
    isOwned ? t('patterns.levelNumber', { level }) : t('patterns.notOwned'),
    isOwned && canLevelUp ? t('patterns.readyToLevelUp') : '',
    isOwned && isMaxLevel ? t('patterns.maxLevel') : '',
  ].filter(Boolean).join(', ');

  return (
    <Card
      $color={rarityColor}
      $glow={rarityGlow}
      $isOwned={isOwned}
      $rarity={character.rarity}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      whileHover={prefersReducedMotion ? undefined : {
        y: -8,
        scale: 1.02,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
      }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
      transition={springs.gentle}
      tabIndex={0}
      role="button"
      aria-label={accessibleLabel}
      {...props}
    >
      <ImageWrapper>
        {isVideo ? (
          <CardVideo
            ref={videoRef}
            src={imageSrc}
            autoPlay
            loop
            muted
            playsInline
            $isOwned={isOwned}
            aria-hidden="true"
          />
        ) : (
          <CardImage
            src={imageSrc}
            alt="" // Decorative, name is in aria-label
            $isOwned={isOwned}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
          />
        )}
        {!isOwned && (
          <NotOwnedOverlay>
            <NotOwnedLabel aria-hidden="true">{notOwnedLabel || t('patterns.notOwned')}</NotOwnedLabel>
          </NotOwnedOverlay>
        )}
        {isOwned && (
          <>
            <LevelBadge $isMaxLevel={isMaxLevel} $canLevelUp={canLevelUp} aria-hidden="true">
              Lv.{level}{isMaxLevel ? ' ★' : ''}{canLevelUp && ' ⬆'}
            </LevelBadge>
            {!isMaxLevel && shards > 0 && (
              <ShardBadge $canLevelUp={canLevelUp} aria-hidden="true">
                ◆ {shards}/{shardsToNextLevel}
              </ShardBadge>
            )}
            {showMastery && (
              <MasteryBadge
                $isMaxMastery={masteryData.isMax}
                aria-hidden="true"
                title={t('patterns.masteryLevel', {
                  level: masteryData.level,
                  max: MAX_MASTERY_LEVEL,
                  defaultValue: `Mastery ${masteryData.level}/${MAX_MASTERY_LEVEL}`
                })}
              >
                {masteryData.isMax ? <IconTrophy size={10} /> : <IconMastery size={10} />}
                {' '}M{masteryData.level}
                {!masteryData.isMax && (
                  <MasteryProgressBar>
                    <MasteryProgressFill style={{ width: `${masteryData.progress * 100}%` }} />
                  </MasteryProgressBar>
                )}
              </MasteryBadge>
            )}
          </>
        )}
        <RarityIndicator $color={rarityColor} $isOwned={isOwned} aria-hidden="true" />
      </ImageWrapper>
      <CardContent>
        <CharName $isOwned={isOwned}>
          <span aria-hidden="true" style={{ marginRight: '4px', opacity: 0.7 }}>{raritySymbol}</span>
          {character.name}
        </CharName>
        <CharSeries $isOwned={isOwned}>{character.series}</CharSeries>
        {/* Screen reader only: rarity text */}
        <VisuallyHidden>{character.rarity} rarity</VisuallyHidden>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render when relevant props change
  return (
    prevProps.character.id === nextProps.character.id &&
    prevProps.isOwned === nextProps.isOwned &&
    prevProps.levelInfo?.level === nextProps.levelInfo?.level &&
    prevProps.levelInfo?.shards === nextProps.levelInfo?.shards &&
    prevProps.levelInfo?.canLevelUp === nextProps.levelInfo?.canLevelUp &&
    // Include mastery info in comparison
    (prevProps.masteryInfo?.masteryXp || prevProps.character?.masteryXp) ===
    (nextProps.masteryInfo?.masteryXp || nextProps.character?.masteryXp)
  );
});

CharacterCard.displayName = 'CharacterCard';

/**
 * CharacterCardSkeleton - Loading placeholder for CharacterCard
 *
 * Shows a shimmer loading state while character data is loading.
 */
const SkeletonShimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const SkeletonCard = styled.div`
  position: relative;
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  border: 1px solid ${theme.colors.surfaceBorderSubtle};
`;

const SkeletonImage = styled.div`
  aspect-ratio: 1;
  background: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 0%,
    ${theme.colors.backgroundSecondary} 50%,
    ${theme.colors.backgroundTertiary} 100%
  );
  background-size: 200% 100%;
  animation: ${SkeletonShimmer} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${theme.colors.backgroundTertiary};
  }
`;

const SkeletonContent = styled.div`
  padding: ${theme.spacing.md};
`;

const SkeletonLine = styled.div`
  height: ${props => props.$height || '14px'};
  width: ${props => props.$width || '100%'};
  background: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 0%,
    ${theme.colors.backgroundSecondary} 50%,
    ${theme.colors.backgroundTertiary} 100%
  );
  background-size: 200% 100%;
  animation: ${SkeletonShimmer} 1.5s ease-in-out infinite;
  border-radius: ${theme.radius.sm};
  margin-bottom: ${props => props.$mb || '0'};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${theme.colors.backgroundTertiary};
  }
`;

export const CharacterCardSkeleton = () => (
  <SkeletonCard aria-hidden="true">
    <SkeletonImage />
    <SkeletonContent>
      <SkeletonLine $height="16px" $width="80%" $mb="8px" />
      <SkeletonLine $height="12px" $width="60%" />
    </SkeletonContent>
  </SkeletonCard>
);

export default CharacterCard;
