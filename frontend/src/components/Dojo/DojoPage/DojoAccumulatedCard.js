/**
 * DojoAccumulatedCard - Accumulated rewards display
 *
 * Shows training progress, accumulated rewards, and claim button.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAccessTime, MdAutorenew } from 'react-icons/md';
import { FaCoins, FaTicketAlt, FaStar } from 'react-icons/fa';

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

      <ClaimButton
        onClick={handleClaimClick}
        disabled={!canClaim || claiming || locked}
        $canClaim={canClaim && !locked}
        title={getClaimDisabledReason()}
        whileHover={canClaim && !locked ? { scale: 1.02 } : {}}
        whileTap={canClaim && !locked ? { scale: 0.98 } : {}}
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
