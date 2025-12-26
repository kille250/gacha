/**
 * FishingStatsBar Component
 * 
 * Extracted from FishingPage.js - Stats bar showing catches, casts, best catch, and pity.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRarity } from '../../../context/RarityContext';

import {
  StatsBar,
  StatItem,
  StatValue,
  StatLabel,
  StatDivider,
  PityBar,
  PityFill,
} from '../Fishing.styles';

/**
 * FishingStatsBar component
 * @param {Object} props
 * @param {Object} props.sessionStats - Session statistics { casts, catches, bestCatch }
 * @param {Object} props.fishInfo - Fish info including pity data
 */
export const FishingStatsBar = ({ sessionStats, fishInfo }) => {
  const { t } = useTranslation();
  const { getRarityColor } = useRarity();

  return (
    <StatsBar>
      <StatItem $primary>
        <StatValue $success>{sessionStats.catches}</StatValue>
        <StatLabel>{t('fishing.catches')}</StatLabel>
      </StatItem>
      <StatDivider />
      <StatItem $secondary>
        <StatValue>{sessionStats.casts}</StatValue>
        <StatLabel>{t('fishing.casts')}</StatLabel>
      </StatItem>
      {sessionStats.bestCatch && (
        <>
          <StatDivider className="hide-on-tiny" />
          <StatItem $highlight className="hide-on-tiny">
            <StatValue style={{ color: getRarityColor(sessionStats.bestCatch.fish.rarity) }}>
              {sessionStats.bestCatch.fish.emoji}
            </StatValue>
            <StatLabel>{t('fishing.best')}</StatLabel>
          </StatItem>
        </>
      )}
      {fishInfo?.pity?.legendary?.inSoftPity && (
        <>
          <StatDivider />
          <StatItem $pity title={`${fishInfo.pity.legendary.current}/${fishInfo.pity.legendary.hardPity} ${t('fishing.casts').toLowerCase()}`}>
            <PityBar>
              <PityFill 
                $progress={fishInfo.pity.legendary.progress} 
                $inSoftPity={fishInfo.pity.legendary.inSoftPity}
                $color="#ffc107"
              />
            </PityBar>
            <StatLabel>🐋 {t('fishing.pity')}</StatLabel>
          </StatItem>
        </>
      )}
    </StatsBar>
  );
};

export default FishingStatsBar;

