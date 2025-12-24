/**
 * RewardPopup - Celebration popup for claimed rewards
 *
 * Shows a brief animated popup when user claims hourly reward.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCelebration } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/DesignSystem';

/**
 * RewardPopup Component
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether popup is visible
 * @param {number} props.amount - Reward amount to display
 */
const RewardPopup = ({ show, amount }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <PopupContainer>
          <Popup
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            role="alert"
            aria-live="polite"
          >
            <CelebrationIcon />
            <Content>
              <Title>{t('nav.hourlyReward')}</Title>
              <Amount>+{amount} 🪙</Amount>
            </Content>
          </Popup>
        </PopupContainer>
      )}
    </AnimatePresence>
  );
};

// ==================== STYLED COMPONENTS ====================

const PopupContainer = styled.div`
  position: fixed;
  top: 100px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: ${theme.zIndex.toast};
  pointer-events: none;
`;

const Popup = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadows.lg};
  pointer-events: auto;
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
