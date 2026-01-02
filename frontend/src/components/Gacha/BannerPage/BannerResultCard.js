/**
 * BannerResultCard - Displays a single roll result
 *
 * Shows the character card with image, name, series, and rarity.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdRefresh } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaStar } from 'react-icons/fa';

import { RarityBadge, motionVariants } from '../../../design-system';
import { isVideo } from '../../../utils/mediaUtils';
import { IconSearch, IconCheckmark, IconStarFilled } from '../../../constants/icons';
import { ElementBadge } from '../../patterns';

import styled from 'styled-components';
import {
  CharacterCard,
  CardImageWrapper,
  RarityGlowEffect,
  CardImage,
  CardVideo,
  CardOverlay,
  CollectedBadge,
  BannerCharBadge,
  CardContent,
  CardMeta,
  CharName,
  CharSeries,
  CardActions,
  RollAgainBtn,
} from './BannerPage.styles';

// Element badge positioned in bottom-right of the card image
const ElementBadgeWrapper = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 3;
`;

const RARITY_ICONS = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />,
};

const BannerResultCard = ({
  character,
  getRarityColor,
  getRarityGlow,
  getImagePath,
  onPreview,
  onRollAgain,
  isRolling,
  locked,
  canAfford,
}) => {
  const { t } = useTranslation();

  if (!character) return null;

  const rarityColor = getRarityColor(character.rarity);
  const rarityGlow = getRarityGlow(character.rarity);

  return (
    <CharacterCard
      variants={motionVariants.card}
      initial="hidden"
      animate="visible"
      exit="exit"
      $color={rarityColor}
      $glow={rarityGlow}
    >
      <CardImageWrapper
        onClick={() => onPreview(character)}
        role="button"
        aria-label={t('common.viewDetails', 'View character details')}
      >
        <RarityGlowEffect $color={rarityColor} />
        {isVideo(character.image) ? (
          <CardVideo
            src={getImagePath(character.image)}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
          />
        ) : (
          <CardImage
            src={getImagePath(character.image)}
            alt={character.name}
          />
        )}
        <CardOverlay>
          <span><IconSearch /> {t('common.view')}</span>
        </CardOverlay>
        <CollectedBadge aria-label={t('common.collected')}>
          <IconCheckmark /> {t('common.collected')}
        </CollectedBadge>
        {character.isBannerCharacter && (
          <BannerCharBadge aria-label={t('banner.bannerChar')}>
            <IconStarFilled /> {t('banner.bannerChar')}
          </BannerCharBadge>
        )}
        {character.element && (
          <ElementBadgeWrapper>
            <ElementBadge
              element={character.element}
              size="md"
              variant="backdrop"
            />
          </ElementBadgeWrapper>
        )}
      </CardImageWrapper>

      <CardContent>
        <CardMeta>
          <CharName>{character.name}</CharName>
          <CharSeries>{character.series}</CharSeries>
        </CardMeta>
        <RarityBadge rarity={character.rarity}>
          {RARITY_ICONS[character.rarity]} {character.rarity}
        </RarityBadge>
      </CardContent>

      <CardActions>
        <RollAgainBtn
          onClick={onRollAgain}
          disabled={isRolling || locked || !canAfford}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={t('common.rollAgain')}
        >
          <MdRefresh aria-hidden="true" /> {t('common.rollAgain')}
        </RollAgainBtn>
      </CardActions>
    </CharacterCard>
  );
};

export default BannerResultCard;
