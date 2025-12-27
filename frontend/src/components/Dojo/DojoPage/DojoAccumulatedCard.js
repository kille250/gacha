/**
 * DojoAccumulatedCard - Accumulated rewards display
 *
 * Shows training progress, accumulated rewards, and claim button.
 * Includes visual indicator when accumulation cap is reached.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAccessTime, MdAutorenew, MdWarning } from 'react-icons/md';
import { FaCoins, FaTicketAlt, FaStar } from 'react-icons/fa';
import styled, { keyframes } from 'styled-components';
import { theme, useReducedMotion } from '../../../design-system';

import {
  AccumulatedCard,
  AccumulatedHeader,
  AccumulatedTitle,
  AccumulatedTime,
  ProgressBar,
  ProgressFill,
  AccumulatedRewards,
  AccumulatedReward,
  ClaimButton,
} from './DojoPage.styles';

// Pulsing animation for capped warning
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// Warning badge for capped state - using darker color for WCAG AA contrast (4.5:1 ratio)
const CappedWarning = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 159, 10, 0.15);
  border: 1px solid rgba(255, 159, 10, 0.3);
  border-radius: ${theme.radius.md};
  color: #b36b00; /* Darker orange for WCAG AA contrast */
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  margin-top: ${theme.spacing.sm};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${pulse} 2s ease-in-out infinite;
  }

  svg {
    font-size: 14px;
    color: #b36b00;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const DojoAccumulatedCard = ({
  status,
  progressPercent,
  canClaim,
  claiming,
  locked,
  onClaim,
  getClaimDisabledReason,
  setError,
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  // Motion props that respect reduced motion preference
  const buttonMotion = prefersReducedMotion ? {} : {
    whileHover: canClaim && !locked ? { scale: 1.02 } : {},
    whileTap: canClaim && !locked ? { scale: 0.98 } : {},
  };

  const handleClaimClick = () => {
    const reason = getClaimDisabledReason();
    if (reason) {
      setError(reason);
      return;
    }
    onClaim();
  };

  return (
    <AccumulatedCard
      $isCapped={status?.accumulated?.isCapped}
      role="region"
      aria-label={t('dojo.accumulatedRewards')}
    >
      <AccumulatedHeader>
        <AccumulatedTitle>
          <MdAccessTime aria-hidden="true" />
          <span>{t('dojo.accumulatedRewards')}</span>
        </AccumulatedTitle>
        <AccumulatedTime aria-label={`${status?.accumulated?.hours?.toFixed(1) || 0} of ${status?.accumulated?.capHours || 8} hours`}>
          {status?.accumulated?.hours?.toFixed(1) || 0}h / {status?.accumulated?.capHours || 8}h
        </AccumulatedTime>
      </AccumulatedHeader>

      <ProgressBar
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${status?.accumulated?.hours?.toFixed(1) || 0} hours of ${status?.accumulated?.capHours || 8} hours accumulated`}
      >
        <ProgressFill
          style={{ width: `${progressPercent}%` }}
          $isCapped={status?.accumulated?.isCapped}
        />
      </ProgressBar>

      <AccumulatedRewards>
        <AccumulatedReward aria-label={`${status?.accumulated?.rewards?.points?.toLocaleString() || 0} ${t('common.points')}`}>
          <FaCoins aria-hidden="true" />
          <span>{status?.accumulated?.rewards?.points?.toLocaleString() || 0}</span>
        </AccumulatedReward>
        <AccumulatedReward aria-label={`${status?.accumulated?.rewards?.rollTickets || 0} ${t('dojo.rollTicketsLabel')}`}>
          <FaTicketAlt aria-hidden="true" />
          <span>{status?.accumulated?.rewards?.rollTickets || 0}</span>
        </AccumulatedReward>
        <AccumulatedReward $premium aria-label={`${status?.accumulated?.rewards?.premiumTickets || 0} ${t('dojo.premiumTicketsLabel')}`}>
          <FaStar aria-hidden="true" />
          <span>{status?.accumulated?.rewards?.premiumTickets || 0}</span>
        </AccumulatedReward>
      </AccumulatedRewards>

      {/* Capped warning - shows when accumulation is full */}
      {status?.accumulated?.isCapped && (
        <CappedWarning role="alert">
          <MdWarning aria-hidden="true" />
          <span>{t('dojo.cappedWarning', { defaultValue: 'Storage full! Claim now to avoid losing rewards.' })}</span>
        </CappedWarning>
      )}

      <ClaimButton
        onClick={handleClaimClick}
        disabled={!canClaim || claiming || locked}
        $canClaim={canClaim && !locked}
        title={getClaimDisabledReason()}
        {...buttonMotion}
        aria-label={claiming ? t('dojo.claiming') : canClaim ? t('dojo.claimRewards') : t('dojo.noRewardsYet')}
      >
        {claiming ? (
          <>
            <MdAutorenew className="spin" aria-hidden="true" />
            {t('dojo.claiming')}
          </>
        ) : locked ? (
          <>
            <MdAutorenew className="spin" aria-hidden="true" />
            {t('common.processing') || 'Processing...'}
          </>
        ) : canClaim ? (
          t('dojo.claimRewards')
        ) : (
          t('dojo.noRewardsYet')
        )}
      </ClaimButton>
    </AccumulatedCard>
  );
};

export default DojoAccumulatedCard;
