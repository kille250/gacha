/**
 * DailyMenuPanel - Daily activity menu with objectives
 *
 * Shows daily activities that need to be completed
 * to earn the daily bonus reward.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GiRollingDiceCup, GiCastle, GiFishingPole } from 'react-icons/gi';
import { FaBook, FaUsers, FaClipboardList, FaCheck, FaGift, FaCoins, FaTicketAlt } from 'react-icons/fa';
import { useDailyMenu } from '../../hooks/useGameEnhancements';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressBadge = styled.span`
  background: ${props => props.$complete ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$complete ? '#4caf50' : '#888'};
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const ActivityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const ActivityCard = styled(motion.div)`
  background: ${props => props.$completed
    ? 'rgba(76, 175, 80, 0.15)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.$completed
    ? 'rgba(76, 175, 80, 0.4)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: ${props => props.$completed ? 0.8 : 1};
`;

const ActivityIcon = styled.div`
  font-size: 1.5rem;
  color: ${props => props.$completed ? '#4caf50' : '#888'};
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
`;

const ActivityProgress = styled.div`
  color: ${props => props.$completed ? '#4caf50' : '#888'};
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const CheckMark = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.$completed
    ? 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const BonusSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const BonusCard = styled(motion.div)`
  background: ${props => props.$canClaim
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 171, 0, 0.1) 100%)'
    : props.$claimed
    ? 'rgba(76, 175, 80, 0.15)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.$canClaim
    ? 'rgba(255, 215, 0, 0.5)'
    : props.$claimed
    ? 'rgba(76, 175, 80, 0.4)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BonusIcon = styled.div`
  font-size: 2rem;
  color: ${props => props.$canClaim ? '#ffd700' : props.$claimed ? '#4caf50' : '#666'};
`;

const BonusInfo = styled.div`
  flex: 1;
`;

const BonusTitle = styled.div`
  color: ${props => props.$canClaim ? '#ffd700' : props.$claimed ? '#4caf50' : '#fff'};
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 4px;
`;

const BonusRewards = styled.div`
  display: flex;
  gap: 12px;
  color: #888;
  font-size: 0.85rem;
`;

const RewardItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ClaimButton = styled(motion.button)`
  background: ${props => props.$canClaim
    ? 'linear-gradient(135deg, #ffd700 0%, #ffab00 100%)'
    : '#444'};
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: ${props => props.$canClaim ? '#1a1a2e' : '#888'};
  font-weight: 700;
  cursor: ${props => props.$canClaim ? 'pointer' : 'default'};

  &:disabled {
    opacity: 0.6;
  }
`;

const ACTIVITY_ICONS = {
  collect_dojo: GiCastle,
  catch_10_fish: GiFishingPole,
  complete_training: GiCastle,
  catch_each_element: GiFishingPole,
  perfect_catch: GiFishingPole,
  discover_species: FaBook,
  upgrade_facility: GiCastle,
  trade_fish: GiFishingPole,
  gacha: GiRollingDiceCup,
  dojo: GiCastle,
  fishing: GiFishingPole,
  collection: FaBook,
  social: FaUsers
};

const DefaultIcon = FaClipboardList;

export function DailyMenuPanel() {
  const { t } = useTranslation();
  const { dailyMenu, loading, error, claiming, claimBonus } = useDailyMenu();

  if (loading) {
    return (
      <Container aria-busy="true" aria-label={t('dailyMenu.loading', 'Loading daily menu')}>
        <Title>{t('dailyMenu.loading', 'Loading daily menu...')}</Title>
      </Container>
    );
  }

  if (error || !dailyMenu) {
    return null;
  }

  const {
    activities,
    completedCount,
    requiredCount,
    canClaimDaily,
    dailyBonusClaimed,
    dailyBonus
  } = dailyMenu;

  const handleClaimBonus = async () => {
    if (!canClaimDaily || dailyBonusClaimed) return;
    await claimBonus();
  };

  const progressComplete = completedCount >= requiredCount;

  return (
    <Container
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      role="region"
      aria-label={t('dailyMenu.title', 'Daily Activity Menu')}
    >
      <Header>
        <Title>{t('dailyMenu.title', 'Daily Activities')}</Title>
        <ProgressBadge
          $complete={progressComplete}
          aria-label={t('dailyMenu.progress', '{{completed}} of {{required}} complete', {
            completed: completedCount,
            required: requiredCount
          })}
        >
          {completedCount}/{requiredCount}
        </ProgressBadge>
      </Header>

      <ActivityGrid role="list" aria-label={t('dailyMenu.activitiesList', 'Daily activities list')}>
        {(activities || []).map((activity) => {
          const IconComponent = ACTIVITY_ICONS[activity.id] || DefaultIcon;
          const isCompleted = activity.isCompleted;

          return (
            <ActivityCard
              key={activity.id}
              $completed={isCompleted}
              role="listitem"
              aria-label={`${activity.name}${isCompleted ? ` - ${t('common.completed', 'Completed')}` : ''}`}
            >
              <ActivityIcon $completed={isCompleted} aria-hidden="true">
                <IconComponent size={24} />
              </ActivityIcon>
              <ActivityContent>
                <ActivityName>{activity.name}</ActivityName>
                <ActivityProgress $completed={isCompleted}>
                  {isCompleted
                    ? t('dailyMenu.completed', 'Completed')
                    : activity.progress
                    ? `${activity.progress.current}/${activity.progress.target}`
                    : t('dailyMenu.notStarted', 'Not started')}
                </ActivityProgress>
              </ActivityContent>
              <CheckMark $completed={isCompleted} aria-hidden="true">
                {isCompleted && <FaCheck size={12} color="#fff" />}
              </CheckMark>
            </ActivityCard>
          );
        })}
      </ActivityGrid>

      <AnimatePresence>
        <BonusSection>
          <BonusCard
            $canClaim={canClaimDaily}
            $claimed={dailyBonusClaimed}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            role="region"
            aria-label={t('dailyMenu.bonusReward', 'Daily bonus reward')}
          >
            <BonusIcon $canClaim={canClaimDaily} $claimed={dailyBonusClaimed} aria-hidden="true">
              {dailyBonusClaimed ? <FaCheck size={32} /> : <FaGift size={32} />}
            </BonusIcon>
            <BonusInfo>
              <BonusTitle $canClaim={canClaimDaily} $claimed={dailyBonusClaimed}>
                {dailyBonusClaimed
                  ? t('dailyMenu.bonusClaimed', 'Bonus Claimed!')
                  : t('dailyMenu.dailyBonus', 'Daily Bonus')}
              </BonusTitle>
              <BonusRewards>
                {dailyBonus?.points > 0 && (
                  <RewardItem aria-label={`${dailyBonus.points} ${t('common.points', 'points')}`}>
                    <FaCoins aria-hidden="true" /> {dailyBonus.points}
                  </RewardItem>
                )}
                {dailyBonus?.rollTickets > 0 && (
                  <RewardItem aria-label={`${dailyBonus.rollTickets} ${t('common.rollTickets', 'roll tickets')}`}>
                    <FaTicketAlt aria-hidden="true" /> {dailyBonus.rollTickets}
                  </RewardItem>
                )}
              </BonusRewards>
            </BonusInfo>
            {!dailyBonusClaimed && (
              <ClaimButton
                $canClaim={canClaimDaily}
                onClick={handleClaimBonus}
                disabled={!canClaimDaily || claiming}
                whileHover={canClaimDaily ? { scale: 1.05 } : {}}
                whileTap={canClaimDaily ? { scale: 0.95 } : {}}
                aria-label={
                  canClaimDaily
                    ? t('dailyMenu.claimBonus', 'Claim bonus')
                    : t('dailyMenu.completeMore', 'Complete more activities')
                }
              >
                {claiming
                  ? t('common.claiming', 'Claiming...')
                  : canClaimDaily
                  ? t('dailyMenu.claim', 'Claim')
                  : t('dailyMenu.locked', 'Locked')}
              </ClaimButton>
            )}
          </BonusCard>
        </BonusSection>
      </AnimatePresence>
    </Container>
  );
}

export default DailyMenuPanel;
