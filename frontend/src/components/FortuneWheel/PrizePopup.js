/**
 * PrizePopup Component
 *
 * Celebration modal shown after spinning the wheel.
 * Displays the won prize with animation.
 */

import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import {
  IconStar,
  IconPoints,
  IconPoolPremium,
  IconTicket,
  IconPremiumTicket,
  IconBoost,
  IconDice,
  IconGift,
} from '../../constants/icons';
import {
  PrizePopupOverlay,
  PrizePopupContent,
  PrizeIcon,
  PrizeTitle,
  PrizeDescription,
  PrizeValue,
  PrizeCloseButton
} from './FortuneWheel.styles';

// Animation variants for framer-motion
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 300
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50
  }
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      damping: 10,
      stiffness: 200,
      delay: 0.2
    }
  }
};

/**
 * Get prize icon component based on reward type
 */
const getPrizeIcon = (segment, rewards) => {
  if (!segment || !rewards) {
    return <IconGift size={48} />;
  }

  if (rewards.isJackpot) {
    return <IconStar size={48} color="#ffd700" />;
  }

  switch (segment.type) {
    case 'points':
      return rewards.points >= 200 ? <IconPoolPremium size={48} /> : <IconPoints size={48} />;
    case 'tickets':
      return <IconTicket size={48} />;
    case 'premium':
      return <IconPremiumTicket size={48} />;
    case 'multiplier':
      return <IconBoost size={48} />;
    case 'nothing':
      return <IconDice size={48} />;
    default:
      return <IconGift size={48} />;
  }
};

const PrizePopup = ({
  isOpen,
  onClose,
  segment,
  rewards
}) => {
  const { t } = useTranslation();
  const isJackpot = rewards?.isJackpot;

  /**
   * Get prize display info based on reward type
   */
  const getPrizeDisplay = useCallback(() => {
    if (!segment || !rewards) {
      return {
        title: t('fortuneWheel.prize.default', 'Prize!'),
        description: '',
        value: ''
      };
    }

    if (isJackpot) {
      return {
        title: t('fortuneWheel.prize.jackpot', 'JACKPOT!'),
        description: t('fortuneWheel.prize.jackpotDesc', 'You hit the big one!'),
        value: t('fortuneWheel.prize.pointsValue', '+{{count}} Points', { count: rewards.points })
      };
    }

    switch (segment.type) {
      case 'points':
        return {
          title: t('fortuneWheel.prize.points', 'Points Won!'),
          description: t('fortuneWheel.prize.niceSpin', 'Nice spin!'),
          value: t('fortuneWheel.prize.pointsValue', '+{{count}} Points', { count: rewards.points })
        };

      case 'tickets':
        return {
          title: t('fortuneWheel.prize.tickets', 'Tickets Won!'),
          description: t('fortuneWheel.prize.ticketsDesc', 'Use them for gacha pulls!'),
          value: t('fortuneWheel.prize.ticketsValue', '+{{count}} Ticket', { count: rewards.tickets })
        };

      case 'premium':
        return {
          title: t('fortuneWheel.prize.premium', 'Premium Ticket!'),
          description: t('fortuneWheel.prize.premiumDesc', 'A rare prize!'),
          value: t('fortuneWheel.prize.premiumValue', '+{{count}} Premium Ticket', { count: rewards.premium })
        };

      case 'multiplier':
        return {
          title: t('fortuneWheel.prize.multiplier', 'XP Boost!'),
          description: t('fortuneWheel.prize.multiplierDesc', 'Your XP is doubled!'),
          value: t('fortuneWheel.prize.multiplierValue', '2x XP for {{minutes}} min', {
            minutes: rewards.multiplier?.duration || 60
          })
        };

      case 'nothing':
        return {
          title: t('fortuneWheel.prize.nothing', 'Try Again'),
          description: t('fortuneWheel.prize.nothingDesc', 'Better luck next time!'),
          value: ''
        };

      default:
        return {
          title: segment.label || t('fortuneWheel.prize.default', 'Prize!'),
          description: '',
          value: ''
        };
    }
  }, [segment, rewards, isJackpot, t]);

  const display = getPrizeDisplay();

  // Close on escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Close on overlay click
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <PrizePopupOverlay
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <PrizePopupContent
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            $isJackpot={isJackpot}
          >
            <PrizeIcon
              variants={iconVariants}
              initial="hidden"
              animate="visible"
            >
              {getPrizeIcon(segment, rewards)}
            </PrizeIcon>

            <PrizeTitle $isJackpot={isJackpot}>
              {display.title}
            </PrizeTitle>

            {display.description && (
              <PrizeDescription>
                {display.description}
              </PrizeDescription>
            )}

            {display.value && (
              <PrizeValue>
                {display.value}
              </PrizeValue>
            )}

            <PrizeCloseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
            >
              {t('fortuneWheel.awesome', 'Awesome!')}
            </PrizeCloseButton>
          </PrizePopupContent>
        </PrizePopupOverlay>
      )}
    </AnimatePresence>
  );
};

PrizePopup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  segment: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    type: PropTypes.string,
    icon: PropTypes.string
  }),
  rewards: PropTypes.shape({
    points: PropTypes.number,
    tickets: PropTypes.number,
    premium: PropTypes.number,
    isJackpot: PropTypes.bool,
    multiplier: PropTypes.object
  })
};

export default PrizePopup;
