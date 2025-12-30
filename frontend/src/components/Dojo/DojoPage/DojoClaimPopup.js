/**
 * DojoClaimPopup - Reward claim success popup
 *
 * Shows claimed rewards with animation.
 * Includes close button and tap-to-dismiss functionality.
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaCoins, FaTicketAlt, FaStar } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import styled, { keyframes } from 'styled-components';
import { theme, Confetti, AnimatedValue } from '../../../design-system';
import { haptic } from '../../../design-system/utilities/microInteractions';

import {
  ClaimPopup,
  ClaimPopupContent,
  ClaimPopupIcon,
  ClaimPopupTitle,
  ClaimPopupRewards,
  ActiveBonusTag,
  CatchUpBonusTag,
} from './DojoPage.styles';

// Animations
const countUp = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.8); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Close button for popup
const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.full};
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all ${theme.transitions.fast};

  &:hover, &:focus {
    background: rgba(255, 255, 255, 0.2);
    color: ${theme.colors.text};
  }
`;

// Animated reward value with count-up effect
const AnimatedRewardValue = styled(motion.span)`
  font-weight: ${theme.fontWeights.bold};
  background: linear-gradient(
    90deg,
    ${theme.colors.text} 0%,
    #ffd700 50%,
    ${theme.colors.text} 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 2s ease-in-out infinite;
`;

// Staggered reward item wrapper
const AnimatedRewardItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  animation: ${countUp} 0.4s ease-out forwards;
  animation-delay: ${props => props.$delay || '0s'};
  opacity: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

// Dismiss hint
const DismissHint = styled.div`
  margin-top: ${theme.spacing.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
`;

const DojoClaimPopup = ({ claimResult, onDismiss }) => {
  const { t } = useTranslation();
  const hasTriggeredCelebration = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Determine celebration intensity based on rewards
  const getCelebrationIntensity = useCallback((result) => {
    if (!result?.rewards) return 'normal';
    const { points = 0, premiumTickets = 0 } = result.rewards;
    if (premiumTickets >= 2 || points >= 5000) return 'high';
    if (premiumTickets >= 1 || points >= 2000) return 'normal';
    return 'low';
  }, []);

  // Determine confetti variant based on rewards
  const getConfettiVariant = useCallback((result) => {
    if (!result?.rewards) return 'default';
    const { premiumTickets = 0 } = result.rewards;
    if (premiumTickets >= 2) return 'legendary';
    if (premiumTickets >= 1) return 'epic';
    return 'default';
  }, []);

  // Handle escape key to dismiss
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onDismiss();
    }
  }, [onDismiss]);

  // Fire celebration effects when popup appears
  useEffect(() => {
    if (claimResult && !hasTriggeredCelebration.current) {
      hasTriggeredCelebration.current = true;
      const intensity = getCelebrationIntensity(claimResult);

      // Haptic feedback
      if (intensity === 'high') {
        haptic.success();
      } else {
        haptic.medium();
      }

      // Trigger confetti for medium+ rewards
      if (intensity === 'high' || intensity === 'normal') {
        setShowConfetti(true);
      }
    }

    // Reset flags when popup closes
    if (!claimResult) {
      hasTriggeredCelebration.current = false;
      setShowConfetti(false);
    }
  }, [claimResult, getCelebrationIntensity]);

  useEffect(() => {
    if (claimResult) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [claimResult, handleKeyDown]);

  return (
    <AnimatePresence>
      {claimResult && (
        <>
          {/* Confetti celebration for premium rewards */}
          <Confetti
            active={showConfetti}
            particleCount={getCelebrationIntensity(claimResult) === 'high' ? 80 : 50}
            variant={getConfettiVariant(claimResult)}
            onComplete={() => setShowConfetti(false)}
          />

          <ClaimPopup
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            role="dialog"
            aria-label={t('dojo.trainingComplete')}
          >
          <ClaimPopupContent onClick={(e) => e.stopPropagation()}>
            <CloseButton
              onClick={onDismiss}
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              <MdClose aria-hidden="true" />
            </CloseButton>
            <ClaimPopupIcon aria-hidden="true">🎉</ClaimPopupIcon>
            <ClaimPopupTitle>{t('dojo.trainingComplete')}</ClaimPopupTitle>
            <ClaimPopupRewards>
              {claimResult.rewards.points > 0 && (
                <AnimatedRewardItem
                  $delay="0s"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <FaCoins color="#FFD700" aria-hidden="true" />
                  <AnimatedRewardValue>
                    +<AnimatedValue
                      value={claimResult.rewards.points}
                      animationDuration={800}
                      bold
                    />
                  </AnimatedRewardValue>
                  <span>{t('common.points')}</span>
                </AnimatedRewardItem>
              )}
              {claimResult.rewards.rollTickets > 0 && (
                <AnimatedRewardItem
                  $delay="0.1s"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <FaTicketAlt color="#0a84ff" aria-hidden="true" />
                  <AnimatedRewardValue>
                    +<AnimatedValue
                      value={claimResult.rewards.rollTickets}
                      animationDuration={600}
                      bold
                    />
                  </AnimatedRewardValue>
                  <span>{t('dojo.rollTicketsLabel')}</span>
                </AnimatedRewardItem>
              )}
              {claimResult.rewards.premiumTickets > 0 && (
                <AnimatedRewardItem
                  $delay="0.2s"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FaStar color="#bf5af2" aria-hidden="true" />
                  <AnimatedRewardValue>
                    +<AnimatedValue
                      value={claimResult.rewards.premiumTickets}
                      animationDuration={600}
                      bold
                    />
                  </AnimatedRewardValue>
                  <span>{t('dojo.premiumTicketsLabel')}</span>
                </AnimatedRewardItem>
              )}
            </ClaimPopupRewards>
            {claimResult.activeBonus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <ActiveBonusTag>{t('dojo.activeBonusApplied')}</ActiveBonusTag>
              </motion.div>
            )}
            {claimResult.catchUpBonus?.isActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <CatchUpBonusTag>
                  🚀 {t('dojo.catchUpBonusApplied', {
                    bonus: Math.round((claimResult.catchUpBonus.multiplier - 1) * 100)
                  })}
                </CatchUpBonusTag>
              </motion.div>
            )}
            <DismissHint>
              {t('dojo.tapToDismiss', { defaultValue: 'Tap anywhere to dismiss' })}
            </DismissHint>
          </ClaimPopupContent>
        </ClaimPopup>
        </>
      )}
    </AnimatePresence>
  );
};

export default DojoClaimPopup;
