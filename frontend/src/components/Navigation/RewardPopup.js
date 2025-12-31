/**
 * RewardPopup - Celebration popup for claimed rewards
 *
 * Shows an animated popup when user claims hourly reward.
 * User must click to dismiss, ensuring they can read the notification.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCelebration, MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { IconPoints } from '../../constants/icons';

/**
 * RewardPopup Component
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether popup is visible
 * @param {number} props.amount - Reward amount to display
 * @param {Function} props.onDismiss - Callback to dismiss the popup
 */
const RewardPopup = ({ show, amount, onDismiss }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <PopupContainer onClick={onDismiss}>
          <Popup
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            role="alertdialog"
            aria-live="polite"
            aria-label={t('nav.hourlyReward')}
            onClick={(e) => e.stopPropagation()}
          >
            <CelebrationIcon />
            <Content>
              <Title>{t('nav.hourlyReward')}</Title>
              <Amount>+{amount} <IconPoints /></Amount>
            </Content>
            <DismissButton
              onClick={onDismiss}
              aria-label={t('common.close', 'Close')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <MdClose />
            </DismissButton>
          </Popup>
          <DismissHint>{t('common.clickToDismiss', 'Click anywhere to dismiss')}</DismissHint>
        </PopupContainer>
      )}
    </AnimatePresence>
  );
};

// ==================== STYLED COMPONENTS ====================

const PopupContainer = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100px;
  /* Safe area insets for notched devices */
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
  z-index: ${theme.zIndex.modal};
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  cursor: pointer;
`;

const Popup = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  padding-right: ${theme.spacing.md};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadows.lg};
  cursor: default;
`;

const DismissButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: ${theme.spacing.sm};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: color ${theme.transitions.fast}, background ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.surfaceBorder};
    color: ${theme.colors.text};
  }

  svg {
    font-size: 16px;
  }
`;

const DismissHint = styled(motion.div)`
  margin-top: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const CelebrationIcon = styled(MdCelebration)`
  font-size: 28px;
  color: ${theme.colors.warning};
  animation: bounce 1s infinite alternate;

  @keyframes bounce {
    from { transform: scale(1); }
    to { transform: scale(1.2); }
  }
`;

const Content = styled.div``;

const Title = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: 2px;
`;

const Amount = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.warning};
`;

export default RewardPopup;
