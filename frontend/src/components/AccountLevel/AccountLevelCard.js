/**
 * AccountLevelCard - Detailed account level display
 *
 * Shows account level, XP progress, and upcoming unlocks.
 * Used in profile page or as an expandable view from the badge.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaStar, FaLock, FaUnlock, FaBuilding } from 'react-icons/fa';

const CardContainer = styled(motion.div)`
  background: rgba(28, 28, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  /* Desktop: Horizontal layout with more space */
  @media (min-width: 768px) {
    gap: 24px;
  }
`;

const LevelCircle = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #5856d6 0%, #af52de 100%);
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
`;

const LevelNumber = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: white;
`;

const LevelDetails = styled.div`
  flex: 1;
`;

const LevelTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
`;

const LevelSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
`;

const ProgressSection = styled.div`
  margin-bottom: 20px;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ProgressLabel = styled.span`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
`;

const ProgressValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
`;

const ProgressBarContainer = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #5856d6 0%, #af52de 100%);
  border-radius: 4px;
`;

const UnlocksSection = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 16px;
`;

const UnlocksTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UnlockItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: ${props => props.$unlocked
    ? 'rgba(52, 199, 89, 0.1)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$unlocked
    ? 'rgba(52, 199, 89, 0.3)'
    : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 10px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const UnlockIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$unlocked
    ? 'rgba(52, 199, 89, 0.2)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  color: ${props => props.$unlocked ? '#34c759' : 'rgba(255, 255, 255, 0.62)'};
`;

const UnlockInfo = styled.div`
  flex: 1;
`;

const UnlockName = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
`;

const UnlockRequirement = styled.span`
  font-size: 12px;
  color: ${props => props.$unlocked ? '#34c759' : 'rgba(255, 255, 255, 0.62)'};
`;

const MaxLevelBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #ffd700 0%, #ff9500 100%);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  color: #000;
  text-transform: uppercase;
`;

const AccountLevelCard = ({
  level = 1,
  xp: _xp = 0,
  xpToNext = 100,
  xpInLevel = 0,
  xpNeededForLevel = 100,
  progress = 0,
  isMaxLevel = false,
  upcomingUnlocks: _upcomingUnlocks = []
}) => {
  const { t } = useTranslation();

  // Define facility unlocks and major milestones for display
  // Must match backend/config/accountLevel.js majorMilestones (v8.0 sync)
  const facilityUnlocks = [
    { level: 1, name: t('dojo.facility.tiers.basic.name', 'Basic Dojo'), unlocked: level >= 1, type: 'facility' },
    { level: 10, name: t('dojo.facility.tiers.warriors_hall.name', "Warrior's Hall"), unlocked: level >= 10, type: 'facility' },
    { level: 25, name: t('dojo.facility.tiers.masters_temple.name', "Master's Temple"), unlocked: level >= 25, type: 'facility' },
    { level: 50, name: t('dojo.facility.tiers.grandmasters_sanctum.name', "Grandmaster's Sanctum"), unlocked: level >= 50, type: 'facility' },
    { level: 60, name: t('accountLevel.milestones.legendary_trainer', 'Legendary Trainer (+10% Dojo)'), unlocked: level >= 60, type: 'bonus' },
    { level: 75, name: t('accountLevel.milestones.mythic_champion', 'Mythic Champion (+10% XP)'), unlocked: level >= 75, type: 'bonus' },
    { level: 85, name: t('accountLevel.milestones.elite_commander', 'Elite Commander (+3% XP)'), unlocked: level >= 85, type: 'bonus' },
    { level: 90, name: t('accountLevel.milestones.grand_warden', 'Grand Warden (+5% Dojo, +2% Fishing)'), unlocked: level >= 90, type: 'bonus' },
    { level: 95, name: t('accountLevel.milestones.supreme_master', 'Supreme Master (+5% XP)'), unlocked: level >= 95, type: 'bonus' },
    { level: 100, name: t('accountLevel.milestones.ultimate_master', 'Ultimate Master (All bonuses!)'), unlocked: level >= 100, type: 'prestige' }
  ];

  return (
    <CardContainer
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Header>
        <LevelCircle>
          <LevelNumber>{level}</LevelNumber>
        </LevelCircle>
        <LevelDetails>
          <LevelTitle>
            {t('accountLevel.title', 'Account Level')}
            {isMaxLevel && (
              <MaxLevelBadge style={{ marginLeft: 8 }}>
                <FaStar aria-hidden="true" />
                MAX
              </MaxLevelBadge>
            )}
          </LevelTitle>
          <LevelSubtitle>
            {isMaxLevel
              ? t('accountLevel.maxLevelReached', 'Maximum level reached!')
              : t('accountLevel.xpToNext', '{{xp}} XP to next level', { xp: xpToNext?.toLocaleString() || 0 })}
          </LevelSubtitle>
        </LevelDetails>
      </Header>

      {!isMaxLevel && (
        <ProgressSection>
          <ProgressHeader>
            <ProgressLabel id="level-progress-label">{t('accountLevel.progress', 'Progress')}</ProgressLabel>
            <ProgressValue>
              {xpInLevel?.toLocaleString() || 0} / {xpNeededForLevel?.toLocaleString() || 0} XP
            </ProgressValue>
          </ProgressHeader>
          <ProgressBarContainer
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="level-progress-label"
            aria-valuetext={t('accountLevel.progressText', '{{current}} of {{total}} XP', {
              current: xpInLevel?.toLocaleString() || 0,
              total: xpNeededForLevel?.toLocaleString() || 0
            })}
          >
            <ProgressBarFill
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </ProgressBarContainer>
        </ProgressSection>
      )}

      <UnlocksSection>
        <UnlocksTitle>
          <FaBuilding aria-hidden="true" />
          {t('accountLevel.facilityUnlocks', 'Facility Unlocks')}
        </UnlocksTitle>
        {facilityUnlocks.map((unlock) => (
          <UnlockItem key={unlock.level} $unlocked={unlock.unlocked}>
            <UnlockIcon $unlocked={unlock.unlocked}>
              {unlock.unlocked ? <FaUnlock aria-hidden="true" /> : <FaLock aria-hidden="true" />}
            </UnlockIcon>
            <UnlockInfo>
              <UnlockName>{unlock.name}</UnlockName>
              <UnlockRequirement $unlocked={unlock.unlocked}>
                {unlock.unlocked
                  ? t('accountLevel.unlocked', 'Unlocked')
                  : t('accountLevel.requiresLevel', 'Requires Level {{level}}', { level: unlock.level })}
              </UnlockRequirement>
            </UnlockInfo>
          </UnlockItem>
        ))}
      </UnlocksSection>
    </CardContainer>
  );
};

export default AccountLevelCard;
