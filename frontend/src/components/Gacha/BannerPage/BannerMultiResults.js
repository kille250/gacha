/**
 * BannerMultiResults - Displays multi-roll results grid
 *
 * Shows all characters from a multi-pull in a grid layout.
 */

import React from 'react';
import { MdClose } from 'react-icons/md';
import { FaGem, FaDice, FaTrophy, FaStar } from 'react-icons/fa';

import { IconButton, motionVariants } from '../../../design-system';
import { isVideo } from '../../../utils/mediaUtils';
import { IconCheckmark, IconStarFilled } from '../../../constants/icons';

import {
  MultiResultsContainer,
  MultiResultsHeader,
  MultiResultsGrid,
  MiniCard,
  MiniCardImage,
  MiniCollected,
  MiniBannerMark,
  MiniCardInfo,
  MiniName,
  MiniRarityDot,
} from './BannerPage.styles';

const RARITY_ICONS = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />,
};

const BannerMultiResults = ({
  characters = [],
  bannerName,
  getRarityColor,
  getImagePath,
  isInCollection,
  onCharacterClick,
  onClose,
}) => {
  if (characters.length === 0) return null;

  return (
    <MultiResultsContainer
      variants={motionVariants.scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="dialog"
      aria-label={`${characters.length} pull results`}
    >
      <MultiResultsHeader>
        <h2>{characters.length}× Pull • {bannerName}</h2>
        <IconButton
          onClick={onClose}
          label="Close results"
          aria-label="Close results"
        >
          <MdClose />
        </IconButton>
      </MultiResultsHeader>

      <MultiResultsGrid role="list">
        {characters.map((char, i) => (
          <MiniCard
            key={i}
            variants={motionVariants.staggerItem}
            custom={i}
            whileHover={{ y: -4, scale: 1.02 }}
            $color={getRarityColor(char.rarity)}
            $isBanner={char.isBannerCharacter}
            onClick={() => onCharacterClick({ ...char, isOwned: isInCollection(char) })}
            role="listitem"
            aria-label={`${char.name} - ${char.rarity}`}
          >
            <MiniCardImage>
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
              <MiniCollected aria-hidden="true"><IconCheckmark /></MiniCollected>
              {char.isBannerCharacter && (
                <MiniBannerMark aria-hidden="true"><IconStarFilled /></MiniBannerMark>
              )}
            </MiniCardImage>
            <MiniCardInfo>
              <MiniName>{char.name}</MiniName>
              <MiniRarityDot
                $color={getRarityColor(char.rarity)}
                aria-label={char.rarity}
              >
                {RARITY_ICONS[char.rarity]}
              </MiniRarityDot>
            </MiniCardInfo>
          </MiniCard>
        ))}
      </MultiResultsGrid>
    </MultiResultsContainer>
  );
};

export default BannerMultiResults;
