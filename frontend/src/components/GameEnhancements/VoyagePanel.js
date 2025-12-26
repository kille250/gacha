/**
 * VoyagePanel - Weekly voyage progress display
 *
 * Shows the current weekly voyage with chapter progress,
 * objectives, and rewards.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaGift, FaTrophy, FaCoins, FaCheck } from 'react-icons/fa';
import { useVoyage } from '../../hooks/useGameEnhancements';

const PanelContainer = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 16px 0;
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
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TimeRemaining = styled.span`
  color: #888;
  font-size: 0.85rem;
`;

const VoyageName = styled.div`
  color: #ffd700;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
`;

const ChaptersContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChapterCard = styled(motion.div)`
  background: ${props => props.$completed
    ? 'rgba(76, 175, 80, 0.2)'
    : props.$current
      ? 'rgba(33, 150, 243, 0.2)'
      : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${props => props.$completed
    ? 'rgba(76, 175, 80, 0.3)'
    : props.$current
      ? 'rgba(33, 150, 243, 0.3)'
      : 'rgba(255, 255, 255, 0.1)'};
`;

const ChapterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ChapterTitle = styled.span`
  color: #fff;
  font-weight: 600;
`;

const ChapterStatus = styled.span`
  font-size: 0.85rem;
  color: ${props => props.$completed ? '#4caf50' : props.$current ? '#2196f3' : '#888'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ObjectiveText = styled.p`
  color: #ccc;
  margin: 0 0 12px 0;
  font-size: 0.9rem;
`;

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressFill = styled(motion.div)`
  background: ${props => props.$completed ? '#4caf50' : '#2196f3'};
  height: 100%;
  border-radius: 8px;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #888;
`;

const RewardBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-top: 8px;
`;

const ClaimButton = styled(motion.button)`
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;

  &:disabled {
    background: #555;
    cursor: not-allowed;
  }
`;

const VoyageCompleteCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  margin-top: 16px;
  border: 1px solid rgba(255, 215, 0, 0.3);
`;

const TreasureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 8px;
  color: #ffd700;
`;

const LoadingState = styled.div`
  color: #888;
  text-align: center;
  padding: 40px;
`;

const ErrorState = styled.div`
  color: #f44336;
  text-align: center;
  padding: 20px;
`;

function formatReward(reward, t) {
  if (!reward) return null;
  const parts = [];

  if (reward.points) parts.push(`${reward.points} ${t('common.points', 'Points')}`);
  if (reward.spiritEssence) parts.push(`${reward.spiritEssence} ${t('voyage.spiritEssence', 'Spirit Essence')}`);
  if (reward.rollTickets) parts.push(`${reward.rollTickets} ${t('common.rollTickets', 'Roll Tickets')}`);
  if (reward.premiumTickets) parts.push(`${reward.premiumTickets} ${t('common.premiumTickets', 'Premium Tickets')}`);
  if (reward.weeklyBannerTicket) parts.push(`${reward.weeklyBannerTicket} ${t('voyage.weeklyBannerTicket', 'Weekly Banner Ticket')}`);
  if (reward.voyageChest) parts.push(t('voyage.treasureChest', 'Voyage Treasure Chest'));
  if (reward.item) parts.push(reward.item);
  if (reward.characterSelector) parts.push(`${reward.characterSelector} ${t('voyage.characterSelector', 'Character Selector')}`);

  return parts.join(', ');
}

export function VoyagePanel() {
  const { t } = useTranslation();
  const {
    voyage,
    loading,
    error,
    claiming,
    claimChapter,
    claimComplete
  } = useVoyage();

  if (loading) {
    return (
      <PanelContainer aria-busy="true" aria-label={t('voyage.loading', 'Loading voyage')}>
        <LoadingState>{t('voyage.loading', 'Loading voyage...')}</LoadingState>
      </PanelContainer>
    );
  }

  if (error) {
    return (
      <PanelContainer role="alert" aria-live="polite">
        <ErrorState>{error}</ErrorState>
      </PanelContainer>
    );
  }

  if (!voyage) {
    return null;
  }

  return (
    <PanelContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-label={t('voyage.title', 'Weekly Voyage')}
    >
      <Header>
        <Title>{t('voyage.title', 'Weekly Voyage')}</Title>
        <TimeRemaining aria-label={t('voyage.timeRemaining', '{{time}} remaining', { time: voyage.timeRemaining?.formatted })}>
          {voyage.timeRemaining?.formatted} {t('voyage.remaining', 'remaining')}
        </TimeRemaining>
      </Header>

      <VoyageName>{voyage.voyage.name}</VoyageName>

      <ChaptersContainer role="list" aria-label={t('voyage.chapters', 'Voyage chapters')}>
        {voyage.chapters.map((chapter, index) => {
          const progressPercent = Math.min(100, (chapter.progress / chapter.target) * 100);

          return (
            <ChapterCard
              key={index}
              $completed={chapter.isCompleted}
              $current={chapter.isCurrent}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              role="listitem"
              aria-label={`${t('voyage.chapter', 'Chapter')} ${index + 1}: ${chapter.description}`}
            >
              <ChapterHeader>
                <ChapterTitle>{t('voyage.chapter', 'Chapter')} {index + 1}</ChapterTitle>
                <ChapterStatus $completed={chapter.isCompleted} $current={chapter.isCurrent}>
                  {chapter.isCompleted && <FaCheck size={12} aria-hidden="true" />}
                  {chapter.isCompleted
                    ? t('voyage.complete', 'Complete')
                    : chapter.isCurrent
                    ? t('voyage.active', 'Active')
                    : t('voyage.locked', 'Locked')}
                </ChapterStatus>
              </ChapterHeader>

              <ObjectiveText>{chapter.description}</ObjectiveText>

              <ProgressBar
                role="progressbar"
                aria-valuenow={chapter.progress}
                aria-valuemin={0}
                aria-valuemax={chapter.target}
                aria-label={t('voyage.progress', 'Progress: {{current}} of {{target}}', {
                  current: chapter.progress,
                  target: chapter.target
                })}
              >
                <ProgressFill
                  $completed={chapter.isCompleted}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </ProgressBar>

              <ProgressText>
                <span>{chapter.progress} / {chapter.target}</span>
                <span>{Math.round(progressPercent)}%</span>
              </ProgressText>

              <RewardBadge aria-label={t('voyage.reward', 'Reward: {{reward}}', { reward: formatReward(chapter.reward, t) })}>
                <FaCoins size={12} aria-hidden="true" /> {formatReward(chapter.reward, t)}
              </RewardBadge>

              {chapter.canClaim && (
                <ClaimButton
                  onClick={() => claimChapter(index)}
                  disabled={claiming}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={claiming
                    ? t('common.claiming', 'Claiming...')
                    : t('voyage.claimReward', 'Claim Reward')}
                >
                  {claiming ? t('common.claiming', 'Claiming...') : t('voyage.claimReward', 'Claim Reward')}
                </ClaimButton>
              )}
            </ChapterCard>
          );
        })}
      </ChaptersContainer>

      <AnimatePresence>
        {voyage.allChaptersComplete && (
          <VoyageCompleteCard
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            role="region"
            aria-label={voyage.canClaimVoyageReward
              ? t('voyage.voyageComplete', 'Voyage Complete')
              : t('voyage.voyageClaimed', 'Voyage Claimed')}
          >
            <TreasureIcon aria-hidden="true">
              {voyage.canClaimVoyageReward ? <FaGift size={48} /> : <FaTrophy size={48} />}
            </TreasureIcon>
            <h4 style={{ color: '#ffd700', margin: '0 0 8px 0' }}>
              {voyage.canClaimVoyageReward
                ? t('voyage.voyageComplete', 'Voyage Complete!')
                : t('voyage.voyageClaimed', 'Voyage Claimed!')}
            </h4>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              {voyage.canClaimVoyageReward
                ? formatReward(voyage.voyageReward, t)
                : t('voyage.comeBackNextWeek', 'Come back next week for a new voyage!')}
            </p>
            {voyage.canClaimVoyageReward && (
              <ClaimButton
                onClick={claimComplete}
                disabled={claiming}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ marginTop: 16 }}
                aria-label={claiming
                  ? t('voyage.opening', 'Opening...')
                  : t('voyage.openChest', 'Open Treasure Chest')}
              >
                {claiming ? t('voyage.opening', 'Opening...') : t('voyage.openChest', 'Open Treasure Chest')}
              </ClaimButton>
            )}
          </VoyageCompleteCard>
        )}
      </AnimatePresence>
    </PanelContainer>
  );
}

export default VoyagePanel;
