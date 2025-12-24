/**
 * BannerRarityTracker - Displays recent roll rarity history
 *
 * Shows the last few rarities pulled as colored dots with icons.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaGem, FaDice, FaTrophy, FaStar } from 'react-icons/fa';

import {
  RarityTracker,
  RarityLabel,
  RarityHistory,
  RarityDot,
} from './BannerPage.styles';

const RARITY_ICONS = {
  common: <FaDice />,
  uncommon: <FaStar />,
  rare: <FaGem />,
  epic: <FaStar />,
  legendary: <FaTrophy />,
};

const BannerRarityTracker = ({
  lastRarities = [],
  getRarityColor,
  getRarityGlow,
}) => {
  const { t } = useTranslation();

  if (lastRarities.length === 0) return null;

  return (
    <RarityTracker role="region" aria-label={t('common.recentPulls', 'Recent pulls')}>
      <RarityLabel>{t('common.recent')}:</RarityLabel>
      <RarityHistory>
        {lastRarities.map((rarity, i) => (
          <RarityDot
            key={i}
            $color={getRarityColor(rarity)}
            $glow={getRarityGlow(rarity)}
            aria-label={rarity}
          >
            {RARITY_ICONS[rarity] || <FaDice />}
          </RarityDot>
        ))}
      </RarityHistory>
    </RarityTracker>
  );
};

export default BannerRarityTracker;
