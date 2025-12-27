/**
 * MilestoneRewards - Gacha pull milestone display
 *
 * Shows progress toward milestone rewards based on
 * total pull count.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaGift, FaGem, FaStar, FaCrown, FaTrophy, FaCheck } from 'react-icons/fa';
import { useMilestones } from '../../hooks/useGameEnhancements';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h3`
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PullCounter = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

const PullCount = styled.div`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700 0%, #ffab00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PullLabel = styled.div`
  color: #888;
  font-size: 0.85rem;
`;

const MilestoneTrack = styled.div`
  position: relative;
  padding: 0 20px;
`;

const TrackLine = styled.div`
  position: absolute;
  top: 20px;
  left: 40px;
  right: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
`;

const TrackProgress = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
  border-radius: 2px;
`;

const MilestoneList = styled.div`
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
`;

const MilestoneNode = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const NodeCircle = styled(motion.div)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => {
    if (props.$claimed) return 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)';
    if (props.$reached) return 'linear-gradient(135deg, #ffd700 0%, #ffab00 100%)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  border: 3px solid ${props => {
    if (props.$claimed) return '#4caf50';
    if (props.$reached) return '#ffd700';
    return 'rgba(255, 255, 255, 0.2)';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: ${props => props.$reached && !props.$claimed ? 'pointer' : 'default'};
  transition: transform 0.2s ease;

  &:hover {
    ${props => props.$reached && !props.$claimed && `
      transform: scale(1.1);
    `}
  }
`;

const NodePulls = styled.div`
  color: ${props => props.$reached ? '#fff' : '#666'};
  font-size: 0.8rem;
  font-weight: 600;
`;

const RewardInfo = styled.div`
  text-align: center;
  color: #888;
  font-size: 0.7rem;
  max-width: 60px;
`;

const ClaimableIndicator = styled(motion.div)`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #ff5722;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #fff;
  font-weight: 700;
`;

const ClaimModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const RewardIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
`;

const RewardTitle = styled.div`
  color: #ffd700;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const RewardDesc = styled.div`
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 20px;
`;

const ClaimButton = styled(motion.button)`
  background: linear-gradient(135deg, #ffd700 0%, #ffab00 100%);
  border: none;
  border-radius: 12px;
  padding: 12px 32px;
  color: #1a1a2e;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
`;

const MILESTONE_ICONS = {
  10: FaGift,
  30: FaGem,
  50: FaGem,
  100: FaStar,
  150: FaStar,
  200: FaCrown,
  250: FaTrophy
};

// Milestone rewards aligned with backend gameDesign.js configuration
const MILESTONE_REWARDS = {
  10: { name: 'Starter Bonus', desc: '500 Points' },
  30: { name: 'Rod Skin', desc: 'Starlight Rod cosmetic' },
  50: { name: 'Ticket Pack', desc: '3 Roll Tickets' },
  100: { name: 'Veteran Pack', desc: '5 Roll Tickets' },
  150: { name: 'Premium Pack', desc: '5 Premium Tickets' },
  200: { name: 'Elite Pack', desc: '10 Premium Tickets' },
  250: { name: 'Champion Bonus', desc: '10,000 Points' }
};

export function MilestoneRewards({ bannerId = null }) {
  const { t } = useTranslation();
  const { milestones, loading, error, claimMilestone } = useMilestones(bannerId);
  const [selectedMilestone, setSelectedMilestone] = React.useState(null);

  if (loading) {
    return (
      <Container>
        <Title>Loading milestones...</Title>
      </Container>
    );
  }

  if (error || !milestones) {
    return null;
  }

  const { totalPulls, rewards = [], nextMilestone } = milestones;

  const handleClaim = async (milestone) => {
    const reward = rewards.find(r => r.threshold === milestone);
    if (reward && reward.reached && !reward.claimed) {
      setSelectedMilestone(milestone);
    }
  };

  const confirmClaim = async () => {
    if (selectedMilestone) {
      await claimMilestone(selectedMilestone);
      setSelectedMilestone(null);
    }
  };

  // Calculate progress percentage toward next milestone
  const milestoneThresholds = rewards.map(r => r.threshold);
  const maxMilestone = milestoneThresholds.length > 0 ? Math.max(...milestoneThresholds) : 1;
  const progressPercent = Math.min((totalPulls / maxMilestone) * 100, 100);

  return (
    <>
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Title>{t('milestones.title')}</Title>

        <PullCounter>
          <PullCount>{totalPulls}</PullCount>
          <PullLabel>{t('milestones.totalPulls')}</PullLabel>
        </PullCounter>

        <MilestoneTrack>
          <TrackLine>
            <TrackProgress
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </TrackLine>

          <MilestoneList>
            {rewards.map((reward) => {
              const isClaimable = reward.reached && !reward.claimed;

              return (
                <MilestoneNode
                  key={reward.threshold}
                  onClick={() => handleClaim(reward.threshold)}
                >
                  <div style={{ position: 'relative' }}>
                    <NodeCircle
                      $reached={reward.reached}
                      $claimed={reward.claimed}
                      whileHover={isClaimable ? { scale: 1.1 } : {}}
                      whileTap={isClaimable ? { scale: 0.95 } : {}}
                    >
                      {reward.claimed
                        ? <FaCheck size={16} />
                        : React.createElement(MILESTONE_ICONS[reward.threshold] || FaGift, { size: 18 })}
                    </NodeCircle>
                    {isClaimable && (
                      <ClaimableIndicator
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        !
                      </ClaimableIndicator>
                    )}
                  </div>
                  <NodePulls $reached={reward.reached}>{reward.threshold}</NodePulls>
                  <RewardInfo>
                    {MILESTONE_REWARDS[reward.threshold]?.name || `${reward.threshold} Pulls`}
                  </RewardInfo>
                </MilestoneNode>
              );
            })}
          </MilestoneList>
        </MilestoneTrack>

        {nextMilestone && (
          <div style={{ textAlign: 'center', marginTop: 24, color: '#888', fontSize: '0.85rem' }}>
            {nextMilestone.pullsRemaining} pulls until {MILESTONE_REWARDS[nextMilestone.threshold]?.name || 'next reward'}
          </div>
        )}
      </Container>

      <AnimatePresence>
        {selectedMilestone && (
          <ClaimModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMilestone(null)}
          >
            <ModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <RewardIcon>
                {React.createElement(MILESTONE_ICONS[selectedMilestone] || FaGift, { size: 64 })}
              </RewardIcon>
              <RewardTitle>{MILESTONE_REWARDS[selectedMilestone]?.name}</RewardTitle>
              <RewardDesc>{MILESTONE_REWARDS[selectedMilestone]?.desc}</RewardDesc>
              <ClaimButton
                onClick={confirmClaim}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Claim Reward
              </ClaimButton>
            </ModalContent>
          </ClaimModal>
        )}
      </AnimatePresence>
    </>
  );
}

export default MilestoneRewards;
