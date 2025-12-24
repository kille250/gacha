/**
 * CharacterCard - Reusable character display card
 *
 * Used in Collection, Gacha results, and other character displays.
 * Supports owned/not-owned states, level display, and shard progress.
 * Includes accessibility features and reduced motion support.
 */

import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, motionVariants, useReducedMotion, VisuallyHidden } from '../../design-system';
import { PLACEHOLDER_IMAGE } from '../../utils/mediaUtils';

const Card = styled(motion.div)`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  cursor: pointer;
  border: 1px solid ${props => props.$isOwned
    ? theme.colors.surfaceBorder
    : 'rgba(255, 255, 255, 0.03)'};
  transition: all ${theme.transitions.fast};

  &:hover {
    border-color: ${props => props.$color};
    box-shadow: ${props => props.$glow};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
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
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: all ${theme.transitions.slow};

  ${Card}:hover & {
    transform: scale(1.05);
    filter: ${props => props.$isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${props => props.$isOwned ? 'none' : 'grayscale(70%) brightness(0.6)'};
  transition: filter ${theme.transitions.slow};

  ${Card}:hover & {
    filter: ${props => props.$isOwned ? 'none' : 'grayscale(30%) brightness(0.8)'};
  }
`;

const NotOwnedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NotOwnedLabel = styled.div`
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: white;
`;

const RarityIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${props => props.$color};
`;

const LevelBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: ${props => {
    if (props.$isMaxLevel) return 'linear-gradient(135deg, #ffd700, #ff8c00)';
    if (props.$canLevelUp) return 'linear-gradient(135deg, #34C759, #30B350)';
    return 'rgba(0, 0, 0, 0.75)';
  }};
  backdrop-filter: blur(4px);
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => (props.$isMaxLevel || props.$canLevelUp) ? '#fff' : 'rgba(255,255,255,0.9)'};
  box-shadow: ${props => {
    if (props.$isMaxLevel) return '0 0 10px rgba(255, 215, 0, 0.5)';
    if (props.$canLevelUp) return '0 0 10px rgba(52, 199, 89, 0.5)';
    return '0 2px 4px rgba(0, 0, 0, 0.3)';
  }};
  z-index: 2;
`;

const ShardBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 6px;
  background: ${props => props.$canLevelUp
    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.95), rgba(48, 179, 80, 0.95))'
    : 'rgba(175, 82, 222, 0.9)'};
  backdrop-filter: blur(4px);
  border-radius: ${theme.radius.full};
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  color: white;
  z-index: 2;
  ${props => props.$canLevelUp && `
    box-shadow: 0 0 8px rgba(52, 199, 89, 0.5);
  `}
`;

const CardContent = styled.div`
  padding: ${theme.spacing.md};
`;

const CharName = styled.h3`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$isOwned ? theme.colors.text : theme.colors.textSecondary};
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CharSeries = styled.p`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$isOwned ? theme.colors.textSecondary : theme.colors.textMuted};
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
  notOwnedLabel = 'Not Owned',
  onClick,
  ...props
}) => {
  const { level = 1, isMaxLevel = false, shards = 0, shardsToNextLevel, canLevelUp = false } = levelInfo;
  const prefersReducedMotion = useReducedMotion();

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
    `${character.rarity} rarity`,
    isOwned ? `Level ${level}` : 'Not owned',
    isOwned && canLevelUp ? 'Ready to level up' : '',
    isOwned && isMaxLevel ? 'Max level' : '',
  ].filter(Boolean).join(', ');

  return (
    <Card
      $color={rarityColor}
      $glow={rarityGlow}
      $isOwned={isOwned}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      variants={motionVariants.staggerItem}
      whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.02 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      tabIndex={0}
      role="button"
      aria-label={accessibleLabel}
      {...props}
    >
      <ImageWrapper>
        {isVideo ? (
          <CardVideo
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
            <NotOwnedLabel aria-hidden="true">{notOwnedLabel}</NotOwnedLabel>
          </NotOwnedOverlay>
        )}
        {isOwned && (
          <>
            <LevelBadge $isMaxLevel={isMaxLevel} $canLevelUp={canLevelUp} aria-hidden="true">
              Lv.{level}{isMaxLevel ? '★' : ''}{canLevelUp && ' ⬆'}
            </LevelBadge>
            {!isMaxLevel && shards > 0 && (
              <ShardBadge $canLevelUp={canLevelUp} aria-hidden="true">
                ◆{shards}/{shardsToNextLevel}
              </ShardBadge>
            )}
          </>
        )}
        <RarityIndicator $color={rarityColor} aria-hidden="true" />
      </ImageWrapper>
      <CardContent>
        <CharName $isOwned={isOwned}>
          <span aria-hidden="true">{raritySymbol}</span> {character.name}
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
    prevProps.levelInfo?.canLevelUp === nextProps.levelInfo?.canLevelUp
  );
});

CharacterCard.displayName = 'CharacterCard';

export default CharacterCard;
