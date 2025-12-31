/**
 * BannerCharacterAvatars - Featured characters avatar grid
 *
 * Displays a row of character avatars sorted by rarity.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isVideo } from '../../../utils/mediaUtils';
import { IconCheckmark } from '../../../constants/icons';

import {
  FeaturedSection,
  FeaturedLabel,
  CharacterAvatars,
  Avatar,
  OwnedMark,
  MoreAvatar,
} from './BannerPage.styles';

const RARITY_ORDER = {
  legendary: 0,
  epic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
};

const BannerCharacterAvatars = ({
  characters = [],
  maxVisible = 6,
  getRarityColor,
  getRarityGlow,
  getImagePath,
  isInCollection,
  onCharacterClick,
  onShowMore,
}) => {
  const { t } = useTranslation();

  const sortedCharacters = useMemo(() => {
    return [...characters].sort((a, b) => {
      const orderA = RARITY_ORDER[a.rarity] ?? 5;
      const orderB = RARITY_ORDER[b.rarity] ?? 5;
      return orderA - orderB;
    });
  }, [characters]);

  const visibleCharacters = sortedCharacters.slice(0, maxVisible);
  const remainingCount = characters.length - maxVisible;

  if (characters.length === 0) return null;

  return (
    <FeaturedSection>
      <FeaturedLabel>{t('banner.featuredCharacters')}</FeaturedLabel>
      <CharacterAvatars>
        {visibleCharacters.map((char) => {
          const owned = isInCollection(char);
          return (
            <Avatar
              key={char.id}
              $color={getRarityColor(char.rarity)}
              $glow={getRarityGlow(char.rarity)}
              $owned={owned}
              onClick={() => onCharacterClick({ ...char, isOwned: owned })}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              role="button"
              aria-label={`${char.name} - ${char.rarity}${owned ? ' (owned)' : ''}`}
            >
              {isVideo(char.image) ? (
                <video
                  src={getImagePath(char.image)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                />
              ) : (
                <img
                  src={getImagePath(char.image)}
                  alt={char.name}
                />
              )}
              {owned && <OwnedMark aria-hidden="true"><IconCheckmark /></OwnedMark>}
            </Avatar>
          );
        })}
        {remainingCount > 0 && (
          <MoreAvatar
            onClick={onShowMore}
            role="button"
            aria-label={t('common.showMore', { count: remainingCount })}
          >
            +{remainingCount}
          </MoreAvatar>
        )}
      </CharacterAvatars>
    </FeaturedSection>
  );
};

export default BannerCharacterAvatars;
