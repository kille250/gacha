/**
 * HourlyReward - Reward button component for navigation
 *
 * Displays hourly reward status and allows claiming when available.
 * Uses useHourlyReward hook for state management.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaGift } from 'react-icons/fa';
import { MdAccessTimeFilled } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme, LoadingSpinner as SharedLoadingSpinner } from '../../styles/DesignSystem';

/**
 * HourlyReward Button Component
 *
 * @param {Object} props
 * @param {boolean} props.available - Whether reward can be claimed
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.canClaim - Combined claimability check
 * @param {string} props.timeRemaining - Time until next reward
 * @param {Function} props.onClaim - Callback when claim button is clicked
 * @param {string} props.variant - 'desktop' | 'mobile' (default: 'desktop')
 */
const HourlyReward = ({
  available,
  loading,
  canClaim,
  timeRemaining,
  onClaim,
  variant = 'desktop',
}) => {
  const { t } = useTranslation();

  if (variant === 'mobile') {
    return (
      <MobileRewardButton
        $available={canClaim}
        onClick={canClaim ? onClaim : undefined}
        disabled={!canClaim}
        type="button"
      >
        {loading ? (
          <LoadingSpinner />
        ) : canClaim ? (
          <>
            <FaGift />
            <span>{t('nav.claim')} {t('nav.hourlyReward')}</span>
          </>
        ) : (
          <>
            <MdAccessTimeFilled />
            <span>{t('nav.hourlyReward')}: {timeRemaining || t('nav.wait')}</span>
          </>
        )}
      </MobileRewardButton>
    );
  }

  return (
    <DesktopRewardButton
      $available={canClaim}
      onClick={canClaim ? onClaim : undefined}
      disabled={!canClaim}
      whileHover={canClaim ? { scale: 1.02 } : {}}
      whileTap={canClaim ? { scale: 0.98 } : {}}
      title={available ? t('nav.claim') : timeRemaining}
      type="button"
    >
      {loading ? (
        <LoadingSpinner />
      ) : canClaim ? (
        <>
          <FaGift />
          <RewardText>{t('nav.claim')}</RewardText>
        </>
      ) : (
        <>
          <MdAccessTimeFilled />
          <TimeRemaining>{timeRemaining || t('nav.wait')}</TimeRemaining>
        </>
      )}
    </DesktopRewardButton>
  );
};

// ==================== STYLED COMPONENTS ====================

const LoadingSpinner = styled(SharedLoadingSpinner).attrs({
  $size: '14px'
})``;

const DesktopRewardButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.$available
    ? `linear-gradient(135deg, ${theme.colors.warning}, #ff6b00)`
    : theme.colors.glass};
  border: 1px solid ${props => props.$available ? 'transparent' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: ${props => props.$available ? 'pointer' : 'default'};
  transition: all ${theme.transitions.fast};

  svg {
    font-size: 14px;
  }

  &:disabled {
    opacity: ${props => props.$available ? 0.7 : 1};
    cursor: ${props => props.$available ? 'not-allowed' : 'default'};
  }

  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const RewardText = styled.span`
  @media (max-width: ${theme.breakpoints.lg}) {
    display: none;
  }
`;

const TimeRemaining = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
`;

const MobileRewardButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  margin: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$available
    ? `linear-gradient(135deg, ${theme.colors.warning}, #ff6b00)`
    : theme.colors.glass};
  border: 1px solid ${props => props.$available ? 'transparent' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$available ? 'white' : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: ${props => props.$available ? 'pointer' : 'default'};
  transition: all ${theme.transitions.fast};

  svg {
    font-size: 18px;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default HourlyReward;
