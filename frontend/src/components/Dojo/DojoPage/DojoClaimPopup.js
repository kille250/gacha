/**
 * DojoClaimPopup - Reward claim success popup
 *
 * Shows claimed rewards with animation.
 * Includes close button and tap-to-dismiss functionality.
 */

import React, { useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaCoins, FaTicketAlt, FaStar } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import styled from 'styled-components';
import { theme } from '../../../design-system';

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

// Dismiss hint
const DismissHint = styled.div`
  margin-top: ${theme.spacing.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
`;

const DojoClaimPopup = ({ claimResult, onDismiss }) => {
  const { t } = useTranslation();

  // Handle escape key to dismiss
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onDismiss();
    }
  }, [onDismiss]);

  useEffect(() => {
    if (claimResult) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [claimResult, handleKeyDown]);

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
            <DismissHint>
              {t('dojo.tapToDismiss', { defaultValue: 'Tap anywhere to dismiss' })}
            </DismissHint>
          </ClaimPopupContent>
        </ClaimPopup>
      )}
    </AnimatePresence>
  );
};

export default DojoClaimPopup;
