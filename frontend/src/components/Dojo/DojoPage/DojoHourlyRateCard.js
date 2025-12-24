/**
 * DojoHourlyRateCard - Hourly earnings display
 *
 * Shows current earning rates with bonuses and synergies.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdTrendingUp } from 'react-icons/md';
import { FaCoins, FaTicketAlt, FaStar } from 'react-icons/fa';

import {
  HourlyRateCard,
  HourlyRateHeader,
  HourlyRateStats,
  HourlyStat,
  LevelBonusSection,
  LevelBonusLabel,
  LevelBonusBadges,
  LevelBonusBadge,
  SynergyBadges,
  SynergyBadge,
  CatchUpBonusBadge,
  EfficiencyIndicator,
} from './DojoPage.styles';

const DojoHourlyRateCard = ({ status }) => {
  const { t } = useTranslation();

  if (!status?.hourlyRate) return null;

  const leveledCharacters = status?.slots?.filter(s => s?.character?.level > 1) || [];
  const hasSynergies = status.hourlyRate.synergies?.length > 0;
  const hasCatchUpBonus = status.hourlyRate.catchUpBonus?.isActive;
  const hasDiminishingReturns = status.hourlyRate.diminishingReturnsApplied;

  return (
    <HourlyRateCard role="region" aria-label={t('dojo.hourlyRate')}>
      <HourlyRateHeader>
        <MdTrendingUp aria-hidden="true" />
        <span>{t('dojo.hourlyRate')}</span>
      </HourlyRateHeader>

      <HourlyRateStats>
        <HourlyStat aria-label={`${status.hourlyRate.points || 0} ${t('common.points')} per hour`}>
          <FaCoins aria-hidden="true" />
          <span>{status.hourlyRate.points || 0}/h</span>
        </HourlyStat>
        <HourlyStat aria-label={`${(status.hourlyRate.rollTickets || 0).toFixed(2)} roll tickets per hour`}>
          <FaTicketAlt aria-hidden="true" />
          <span>~{(status.hourlyRate.rollTickets || 0).toFixed(2)}/h</span>
        </HourlyStat>
        <HourlyStat $premium aria-label={`${(status.hourlyRate.premiumTickets || 0).toFixed(2)} premium tickets per hour`}>
          <FaStar aria-hidden="true" />
          <span>~{(status.hourlyRate.premiumTickets || 0).toFixed(2)}/h</span>
        </HourlyStat>
      </HourlyRateStats>

      {/* Level Bonuses */}
      {leveledCharacters.length > 0 && (
        <LevelBonusSection>
          <LevelBonusLabel>⚔️ {t('dojo.levelBonuses')}:</LevelBonusLabel>
          <LevelBonusBadges>
            {leveledCharacters.map((slot, idx) => {
              const char = slot.character;
              const bonus = Math.round((char.levelMultiplier - 1) * 100);
              return (
                <LevelBonusBadge key={idx}>
                  {char.name} {t('dojo.characterLevelBonus', { level: char.level, bonus })}
                </LevelBonusBadge>
              );
            })}
          </LevelBonusBadges>
        </LevelBonusSection>
      )}

      {/* Catch-Up Bonus */}
      {hasCatchUpBonus && (
        <CatchUpBonusBadge>
          🚀 {t('dojo.catchUpBonus', {
            bonus: Math.round((status.hourlyRate.catchUpBonus.multiplier - 1) * 100)
          })}
        </CatchUpBonusBadge>
      )}

      {/* Synergies */}
      {hasSynergies && (
        <SynergyBadges>
          {status.hourlyRate.synergies.map((syn, idx) => (
            <SynergyBadge key={idx}>
              {t('dojo.synergyBonus', {
                series: syn.series,
                count: syn.count,
                bonus: Math.round((syn.bonus - 1) * 100)
              })}
            </SynergyBadge>
          ))}
        </SynergyBadges>
      )}

      {/* Diminishing Returns Indicator */}
      {hasDiminishingReturns && (
        <EfficiencyIndicator>
          ⚖️ {t('dojo.efficiency', { percent: status.hourlyRate.efficiency || 100 })}
        </EfficiencyIndicator>
      )}
    </HourlyRateCard>
  );
};

export default DojoHourlyRateCard;
