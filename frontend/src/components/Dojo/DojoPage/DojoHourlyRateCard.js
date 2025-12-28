/**
 * DojoHourlyRateCard - Hourly earnings display
 *
 * Shows current earning rates with bonuses and synergies.
 * Includes help tooltips explaining each mechanic.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdTrendingUp, MdInfo, MdClose } from 'react-icons/md';
import { FaCoins, FaTicketAlt, FaStar, FaQuestionCircle } from 'react-icons/fa';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../../design-system';

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

// Help button
const HelpButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${theme.radius.full};
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  margin-left: auto;
  transition: all ${theme.transitions.fast};

  &:hover, &:focus {
    background: rgba(255, 255, 255, 0.15);
    color: ${theme.colors.text};
  }

  svg {
    font-size: 14px;
  }
`;

// Tooltip overlay
const TooltipOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const TooltipCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.xl};
  max-width: 400px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const TooltipClose = styled.button`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  width: 28px;
  height: 28px;
  border-radius: ${theme.radius.full};
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: ${theme.colors.text};
  }
`;

const TooltipTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  svg {
    color: ${theme.colors.primary};
  }
`;

const TooltipSection = styled.div`
  margin-bottom: ${theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
`;

const TooltipSectionTitle = styled.h4`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const TooltipText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

/**
 * Format ticket rate to show meaningful decimals
 * - Shows at least 2 significant digits
 * - Avoids showing 0.00 for very small values
 */
const formatTicketRate = (rate) => {
  if (!rate || rate === 0) return '0';

  // For rates >= 0.01, show 2 decimal places
  if (rate >= 0.01) {
    return rate.toFixed(2);
  }

  // For very small rates, show as percentage chance
  // e.g., 0.005 = 0.5% chance per hour
  const percentChance = rate * 100;
  if (percentChance >= 0.1) {
    return `${percentChance.toFixed(1)}%`;
  }

  // For extremely small rates, show scientific notation
  return rate.toExponential(1);
};

const DojoHourlyRateCard = ({ status }) => {
  const { t } = useTranslation();
  const [showHelp, setShowHelp] = useState(false);

  if (!status?.hourlyRate) return null;

  const leveledCharacters = status?.slots?.filter(s => s?.character?.level > 1) || [];
  const hasSynergies = status.hourlyRate.synergies?.length > 0;
  const hasCatchUpBonus = status.hourlyRate.catchUpBonus?.isActive;
  const hasDiminishingReturns = status.hourlyRate.diminishingReturnsApplied;

  return (
    <>
    <HourlyRateCard role="region" aria-label={t('dojo.hourlyRate')}>
      <HourlyRateHeader>
        <MdTrendingUp aria-hidden="true" />
        <span>{t('dojo.hourlyRate')}</span>
        <HelpButton
          onClick={() => setShowHelp(true)}
          aria-label={t('dojo.showHelp', { defaultValue: 'Show help' })}
        >
          <FaQuestionCircle aria-hidden="true" />
        </HelpButton>
      </HourlyRateHeader>

      <HourlyRateStats>
        <HourlyStat aria-label={`${status.hourlyRate.points || 0} ${t('common.points')} per hour`}>
          <FaCoins aria-hidden="true" />
          <span>{status.hourlyRate.points || 0}/h</span>
        </HourlyStat>
        <HourlyStat aria-label={`${formatTicketRate(status.hourlyRate.rollTickets)} roll tickets per hour`}>
          <FaTicketAlt aria-hidden="true" />
          <span>~{formatTicketRate(status.hourlyRate.rollTickets)}/h</span>
        </HourlyStat>
        <HourlyStat $premium aria-label={`${formatTicketRate(status.hourlyRate.premiumTickets)} premium tickets per hour`}>
          <FaStar aria-hidden="true" />
          <span>~{formatTicketRate(status.hourlyRate.premiumTickets)}/h</span>
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

    {/* Help Modal */}
    <AnimatePresence>
      {showHelp && (
        <TooltipOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowHelp(false)}
        >
          <TooltipCard
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TooltipClose onClick={() => setShowHelp(false)} aria-label={t('common.close')}>
              <MdClose />
            </TooltipClose>

            <TooltipTitle>
              <MdInfo />
              {t('dojo.helpTitle', { defaultValue: 'How Dojo Works' })}
            </TooltipTitle>

            <TooltipSection>
              <TooltipSectionTitle>
                <FaCoins style={{ color: '#FFD700' }} />
                {t('dojo.helpBaseRates', { defaultValue: 'Base Rates' })}
              </TooltipSectionTitle>
              <TooltipText>
                {t('dojo.helpBaseRatesDesc', {
                  defaultValue: 'Each character generates points based on their rarity: Common (6/h), Uncommon (10/h), Rare (18/h), Epic (35/h), Legendary (70/h).'
                })}
              </TooltipText>
            </TooltipSection>

            <TooltipSection>
              <TooltipSectionTitle>
                ⚔️ {t('dojo.helpLevels', { defaultValue: 'Character Levels' })}
              </TooltipSectionTitle>
              <TooltipText>
                {t('dojo.helpLevelsDesc', {
                  defaultValue: 'Duplicate characters increase level (max 5). Higher levels give increasing bonuses: Lv2 +15%, Lv3 +30%, Lv4 +50%, Lv5 +75%!'
                })}
              </TooltipText>
            </TooltipSection>

            <TooltipSection>
              <TooltipSectionTitle>
                👥 {t('dojo.helpSynergy', { defaultValue: 'Series Synergy' })}
              </TooltipSectionTitle>
              <TooltipText>
                {t('dojo.helpSynergyDesc', {
                  defaultValue: 'Training multiple characters from the same series grants bonus earnings. 2 chars = +15%, 3 = +35%, 4 = +55%, 5 = +75%, 6+ = +100%.'
                })}
              </TooltipText>
            </TooltipSection>

            <TooltipSection>
              <TooltipSectionTitle>
                🚀 {t('dojo.helpCatchUp', { defaultValue: 'Catch-Up Bonus' })}
              </TooltipSectionTitle>
              <TooltipText>
                {t('dojo.helpCatchUpDesc', {
                  defaultValue: 'New players with fewer characters get a bonus multiplier to help catch up. The bonus decreases as you grow your collection.'
                })}
              </TooltipText>
            </TooltipSection>

            <TooltipSection>
              <TooltipSectionTitle>
                ⚖️ {t('dojo.helpDiminishing', { defaultValue: 'Efficiency Scaling' })}
              </TooltipSectionTitle>
              <TooltipText>
                {t('dojo.helpDiminishingDesc', {
                  defaultValue: 'To keep the game balanced, earnings scale progressively: 0-350 pts/h (100%), 350-800 (90%), 800-1800 (75%), 1800-3500 (55%), 3500+ (35%). Efficiency shows your effective rate.'
                })}
              </TooltipText>
            </TooltipSection>

            <TooltipSection>
              <TooltipSectionTitle>
                🎫 {t('dojo.helpTickets', { defaultValue: 'Ticket Generation' })}
              </TooltipSectionTitle>
              <TooltipText>
                {t('dojo.helpTicketsDesc', {
                  defaultValue: 'Characters have a small chance to generate roll and premium tickets. Progress accumulates over time via the pity system.'
                })}
              </TooltipText>
            </TooltipSection>

            <TooltipSection>
              <TooltipSectionTitle>
                📊 {t('dojo.helpDailyCaps', { defaultValue: 'Daily Limits' })}
              </TooltipSectionTitle>
              <TooltipText>
                {t('dojo.helpDailyCapsDesc', {
                  defaultValue: 'Daily caps: 25,000 points, 30 roll tickets, 8 premium tickets. Limits reset at midnight.'
                })}
              </TooltipText>
            </TooltipSection>
          </TooltipCard>
        </TooltipOverlay>
      )}
    </AnimatePresence>
    </>
  );
};

export default DojoHourlyRateCard;
