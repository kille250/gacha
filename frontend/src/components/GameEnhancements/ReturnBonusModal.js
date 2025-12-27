/**
 * ReturnBonusModal - Welcome back bonus for returning players
 *
 * Shows accumulated offline rewards when a player returns
 * after being away.
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useReturnBonus } from '../../hooks/useGameEnhancements';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 24px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  border: 2px solid rgba(76, 175, 80, 0.3);
  box-shadow: 0 0 60px rgba(76, 175, 80, 0.3);
  overflow: hidden;
  position: relative;
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
`;

const Sparkle = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;
  background: #ffd700;
  border-radius: 50%;
  animation: ${sparkle} 2s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
  top: ${props => props.$top}%;
  left: ${props => props.$left}%;
`;

const WelcomeIcon = styled(motion.div)`
  font-size: 5rem;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  color: #fff;
  margin: 0 0 8px 0;
  font-size: 1.8rem;
`;

const Subtitle = styled.div`
  color: #4caf50;
  font-size: 1rem;
  margin-bottom: 24px;
`;

const TimeAwayBadge = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 20px;
  border-radius: 20px;
  color: #888;
  font-size: 0.9rem;
  display: inline-block;
  margin-bottom: 24px;
`;

const RewardsContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`;

const RewardsTitle = styled.div`
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 16px;
`;

const RewardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RewardItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  border-radius: 10px;
`;

const RewardInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const RewardIcon = styled.span`
  font-size: 1.5rem;
`;

const RewardName = styled.span`
  color: #fff;
  font-weight: 500;
`;

const RewardValue = styled.span`
  color: #4caf50;
  font-weight: 700;
  font-size: 1.1rem;
`;

const BonusMultiplier = styled(motion.div)`
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 171, 0, 0.2) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
`;

const MultiplierLabel = styled.div`
  color: #ffd700;
  font-size: 0.85rem;
  margin-bottom: 4px;
`;

const MultiplierValue = styled.div`
  color: #fff;
  font-size: 1.8rem;
  font-weight: 700;
`;

const ClaimButton = styled(motion.button)`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border: none;
  border-radius: 14px;
  padding: 16px 48px;
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  width: 100%;
  box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
`;

const ClaimedState = styled(motion.div)`
  padding: 40px 20px;
`;

const ClaimedIcon = styled(motion.div)`
  font-size: 4rem;
  margin-bottom: 16px;
`;

const ClaimedText = styled.div`
  color: #4caf50;
  font-size: 1.2rem;
  font-weight: 600;
`;

export function ReturnBonusModal({ onClose, autoShow = true }) {
  const { returnBonus, loading, claimBonus } = useReturnBonus();
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Generate random sparkles
  const sparkles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    top: Math.random() * 100,
    left: Math.random() * 100
  }));

  if (loading || !returnBonus?.eligible) {
    return null;
  }

  const { daysAway, rewards, multiplier, message } = returnBonus;

  const formatTimeAway = (days) => {
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1 week';
    return `${weeks} weeks`;
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);

    try {
      await claimBonus();
      setClaimed(true);

      // Auto-close after showing success
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (err) {
      console.error('Failed to claim return bonus:', err);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Modal
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        {sparkles.map(s => (
          <Sparkle
            key={s.id}
            $delay={s.delay}
            $top={s.top}
            $left={s.left}
          />
        ))}

        <AnimatePresence mode="wait">
          {!claimed ? (
            <motion.div
              key="unclaimed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <WelcomeIcon
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
              >
                🎊
              </WelcomeIcon>

              <Title>Welcome Back!</Title>
              <Subtitle>{message || "We missed you!"}</Subtitle>

              <TimeAwayBadge>
                Away for {formatTimeAway(daysAway)}
              </TimeAwayBadge>

              <RewardsContainer>
                <RewardsTitle>Your Return Rewards</RewardsTitle>
                <RewardsList>
                  {rewards?.points > 0 && (
                    <RewardItem
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <RewardInfo>
                        <RewardIcon>💰</RewardIcon>
                        <RewardName>Bonus Points</RewardName>
                      </RewardInfo>
                      <RewardValue>+{rewards.points.toLocaleString()}</RewardValue>
                    </RewardItem>
                  )}

                  {rewards?.tickets > 0 && (
                    <RewardItem
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <RewardInfo>
                        <RewardIcon>🎟️</RewardIcon>
                        <RewardName>Pull Tickets</RewardName>
                      </RewardInfo>
                      <RewardValue>+{rewards.tickets}</RewardValue>
                    </RewardItem>
                  )}

                  {rewards?.dojoBoost && (
                    <RewardItem
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <RewardInfo>
                        <RewardIcon>🏯</RewardIcon>
                        <RewardName>Dojo Boost</RewardName>
                      </RewardInfo>
                      <RewardValue>2x for 24h</RewardValue>
                    </RewardItem>
                  )}
                </RewardsList>
              </RewardsContainer>

              {multiplier > 1 && (
                <BonusMultiplier
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <MultiplierLabel>Loyalty Bonus Applied</MultiplierLabel>
                  <MultiplierValue>{multiplier}x Rewards!</MultiplierValue>
                </BonusMultiplier>
              )}

              <ClaimButton
                onClick={handleClaim}
                disabled={claiming}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {claiming ? 'Claiming...' : 'Claim Rewards!'}
              </ClaimButton>
            </motion.div>
          ) : (
            <ClaimedState
              key="claimed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <ClaimedIcon
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                ✅
              </ClaimedIcon>
              <ClaimedText>Rewards Claimed!</ClaimedText>
            </ClaimedState>
          )}
        </AnimatePresence>
      </Modal>
    </Overlay>
  );
}

export default ReturnBonusModal;
