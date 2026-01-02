/**
 * DailyChallengesPanel - Shows daily challenges with progress
 *
 * Features:
 * - Displays all daily challenges
 * - Shows progress bars
 * - Allows claiming completed challenges
 * - Displays rewards
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../../design-system';
import api from '../../utils/api';
import { formatNumber } from '../../hooks/useEssenceTap';
import { IconCheckmark, IconGem, IconStar } from '../../constants/icons';
import { invalidateFor, CACHE_ACTIONS } from '../../cache/manager';

const Container = styled.div`
  padding: ${theme.spacing.md};
`;

const ChallengeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const ChallengeCard = styled(motion.div)`
  padding: ${theme.spacing.md};
  background: ${props => props.$completed
    ? 'rgba(16, 185, 129, 0.1)'
    : props.$claimed
    ? 'rgba(107, 114, 128, 0.1)'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$completed
    ? 'rgba(16, 185, 129, 0.5)'
    : props.$claimed
    ? 'rgba(107, 114, 128, 0.3)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.lg};
  opacity: ${props => props.$claimed ? 0.6 : 1};
`;

const ChallengeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.sm};
`;

const ChallengeInfo = styled.div`
  flex: 1;
`;

const ChallengeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ChallengeDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const ChallengeStatus = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const ClaimedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(16, 185, 129, 0.2);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: #10B981;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin: ${theme.spacing.sm} 0;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.$completed
    ? 'linear-gradient(90deg, #10B981, #34D399)'
    : 'linear-gradient(90deg, #A855F7, #C084FC)'};
  border-radius: 4px;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const RewardsContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const RewardBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$color || theme.colors.text};
`;

const ClaimButton = styled(Button)`
  margin-top: ${theme.spacing.sm};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const DailyChallengesPanel = memo(({ isOpen, onClose, onChallengeComplete }) => {
  const { t } = useTranslation();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  // Fetch challenges
  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/essence-tap/daily-challenges');
      setChallenges(response.data.challenges || []);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchChallenges();
    }
  }, [isOpen, fetchChallenges]);

  const handleClaim = async (challengeId) => {
    try {
      setClaiming(challengeId);
      const response = await api.post('/essence-tap/daily-challenges/claim', { challengeId });
      if (response.data.success) {
        // Invalidate cache - daily challenges can award FP, tickets, and essence
        invalidateFor(CACHE_ACTIONS.ESSENCE_TAP_DAILY_CHALLENGE_CLAIM);

        // Update local state
        setChallenges(prev =>
          prev.map(c =>
            c.id === challengeId ? { ...c, claimed: true, canClaim: false } : c
          )
        );
        onChallengeComplete?.(response.data.rewards);
      }
    } catch (err) {
      console.error('Failed to claim challenge:', err);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        {t('essenceTap.dailyChallenges', { defaultValue: 'Daily Challenges' })}
      </ModalHeader>

      <ModalBody>
        <Container>
          {loading ? (
            <EmptyState>{t('common.loading', { defaultValue: 'Loading...' })}</EmptyState>
          ) : challenges.length === 0 ? (
            <EmptyState>
              {t('essenceTap.noChallenges', { defaultValue: 'No challenges available' })}
            </EmptyState>
          ) : (
            <ChallengeList>
              <AnimatePresence>
                {challenges.map(challenge => (
                  <ChallengeCard
                    key={challenge.id}
                    $completed={challenge.completed}
                    $claimed={challenge.claimed}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ChallengeHeader>
                      <ChallengeInfo>
                        <ChallengeName>
                          {challenge.name}
                          {challenge.claimed && (
                            <ClaimedBadge>
                              <IconCheckmark size={14} />
                              Claimed
                            </ClaimedBadge>
                          )}
                        </ChallengeName>
                        <ChallengeDescription>{challenge.description}</ChallengeDescription>
                      </ChallengeInfo>
                    </ChallengeHeader>

                    <ProgressBar>
                      <ProgressFill
                        $completed={challenge.completed}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </ProgressBar>

                    <ProgressText>
                      <span>{formatNumber(challenge.progress)}</span>
                      <span>{formatNumber(challenge.target)}</span>
                    </ProgressText>

                    <RewardsContainer>
                      {challenge.rewards.essence && (
                        <RewardBadge $color="#A855F7">
                          <IconGem size={14} />
                          {formatNumber(challenge.rewards.essence)} Essence
                        </RewardBadge>
                      )}
                      {challenge.rewards.fatePoints && (
                        <RewardBadge $color="#FCD34D">
                          <IconStar size={14} />
                          {challenge.rewards.fatePoints} FP
                        </RewardBadge>
                      )}
                      {challenge.rewards.rollTickets && (
                        <RewardBadge $color="#10B981">
                          {challenge.rewards.rollTickets} Tickets
                        </RewardBadge>
                      )}
                    </RewardsContainer>

                    {challenge.canClaim && (
                      <ClaimButton
                        variant="primary"
                        onClick={() => handleClaim(challenge.id)}
                        disabled={claiming === challenge.id}
                      >
                        {claiming === challenge.id ? 'Claiming...' : 'Claim Reward'}
                      </ClaimButton>
                    )}
                  </ChallengeCard>
                ))}
              </AnimatePresence>
            </ChallengeList>
          )}
        </Container>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

DailyChallengesPanel.displayName = 'DailyChallengesPanel';

export default DailyChallengesPanel;
