/**
 * DojoClaimPopup - Reward claim success popup
 *
 * Shows claimed rewards with animation.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaCoins, FaTicketAlt, FaStar } from 'react-icons/fa';

import {
  ClaimPopup,
  ClaimPopupContent,
  ClaimPopupIcon,
  ClaimPopupTitle,
  ClaimPopupRewards,
  RewardItem,
  ActiveBonusTag,
  CatchUpBonusTag,
} from './DojoPage.styles';

const DojoClaimPopup = ({ claimResult, onDismiss }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {claimResult && (
        <ClaimPopup
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          role="dialog"
          aria-label={t('dojo.trainingComplete')}
        >
          <ClaimPopupContent onClick={(e) => e.stopPropagation()}>
            <ClaimPopupIcon aria-hidden="true">🎉</ClaimPopupIcon>
            <ClaimPopupTitle>{t('dojo.trainingComplete')}</ClaimPopupTitle>
            <ClaimPopupRewards>
              {claimResult.rewards.points > 0 && (
                <RewardItem>
                  <FaCoins color="#FFD700" aria-hidden="true" />
                  <span>+{claimResult.rewards.points.toLocaleString()} {t('common.points')}</span>
                </RewardItem>
              )}
              {claimResult.rewards.rollTickets > 0 && (
                <RewardItem>
                  <FaTicketAlt color="#0a84ff" aria-hidden="true" />
                  <span>+{claimResult.rewards.rollTickets} {t('dojo.rollTicketsLabel')}</span>
                </RewardItem>
              )}
              {claimResult.rewards.premiumTickets > 0 && (
                <RewardItem>
                  <FaStar color="#bf5af2" aria-hidden="true" />
                  <span>+{claimResult.rewards.premiumTickets} {t('dojo.premiumTicketsLabel')}</span>
                </RewardItem>
              )}
            </ClaimPopupRewards>
            {claimResult.activeBonus && (
              <ActiveBonusTag>{t('dojo.activeBonusApplied')}</ActiveBonusTag>
            )}
            {claimResult.catchUpBonus?.isActive && (
              <CatchUpBonusTag>
                🚀 {t('dojo.catchUpBonusApplied', {
                  bonus: Math.round((claimResult.catchUpBonus.multiplier - 1) * 100)
                })}
              </CatchUpBonusTag>
            )}
          </ClaimPopupContent>
        </ClaimPopup>
      )}
    </AnimatePresence>
  );
};

export default DojoClaimPopup;
