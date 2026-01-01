/**
 * AnnouncementBanner - Top/bottom bar for important system announcements
 *
 * Features:
 * - Sticky positioning at top of viewport
 * - Type-based coloring (maintenance=orange, critical=red, event=purple, etc.)
 * - Countdown timer for maintenance windows
 * - Dismiss functionality with local storage persistence
 * - Respects prefers-reduced-motion
 * - Accessible with proper ARIA attributes
 *
 * @example
 * <AnnouncementBanner />
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdClose,
  MdBuild,
  MdNewReleases,
  MdCelebration,
  MdDescription,
  MdLocalOffer,
  MdWarning,
  MdInfo,
  MdAccessTime,
  MdCheckCircle
} from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { useAnnouncements } from '../../context/AnnouncementContext';
import { useCountdown } from '../../hooks/useCountdown';

// ============================================
// TYPE CONFIGURATION
// ============================================

const TYPE_CONFIG = {
  maintenance: {
    icon: MdBuild,
    gradient: 'linear-gradient(135deg, rgba(255, 159, 10, 0.95) 0%, rgba(200, 125, 8, 0.95) 100%)',
    borderColor: 'rgba(255, 159, 10, 0.3)',
    iconColor: '#fff'
  },
  update: {
    icon: MdNewReleases,
    gradient: 'linear-gradient(135deg, rgba(52, 199, 89, 0.95) 0%, rgba(40, 160, 70, 0.95) 100%)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
    iconColor: '#fff'
  },
  event: {
    icon: MdCelebration,
    gradient: 'linear-gradient(135deg, rgba(191, 90, 242, 0.95) 0%, rgba(156, 39, 176, 0.95) 100%)',
    borderColor: 'rgba(191, 90, 242, 0.3)',
    iconColor: '#fff'
  },
  patch_notes: {
    icon: MdDescription,
    gradient: 'linear-gradient(135deg, rgba(10, 132, 255, 0.95) 0%, rgba(0, 113, 227, 0.95) 100%)',
    borderColor: 'rgba(10, 132, 255, 0.3)',
    iconColor: '#fff'
  },
  promotion: {
    icon: MdLocalOffer,
    gradient: 'linear-gradient(135deg, rgba(245, 166, 35, 0.95) 0%, rgba(255, 107, 0, 0.95) 100%)',
    borderColor: 'rgba(245, 166, 35, 0.3)',
    iconColor: '#fff'
  },
  warning: {
    icon: MdWarning,
    gradient: 'linear-gradient(135deg, rgba(255, 159, 10, 0.95) 0%, rgba(230, 126, 34, 0.95) 100%)',
    borderColor: 'rgba(255, 159, 10, 0.3)',
    iconColor: '#fff'
  },
  info: {
    icon: MdInfo,
    gradient: 'linear-gradient(135deg, rgba(90, 200, 250, 0.95) 0%, rgba(10, 132, 255, 0.95) 100%)',
    borderColor: 'rgba(90, 200, 250, 0.3)',
    iconColor: '#fff'
  }
};

const PRIORITY_CONFIG = {
  critical: {
    gradient: 'linear-gradient(135deg, rgba(255, 59, 48, 0.95) 0%, rgba(200, 45, 38, 0.95) 100%)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
    pulse: true
  },
  high: {
    pulse: false
  },
  medium: {
    pulse: false
  },
  low: {
    pulse: false
  }
};

// ============================================
// ANIMATIONS
// ============================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
`;

// ============================================
// STYLED COMPONENTS
// ============================================

const BannerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${theme.zIndex?.banner || 1000};
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: ${theme.spacing.xs};
  padding-top: calc(${theme.spacing.xs} + env(safe-area-inset-top, 0px));
  pointer-events: none;

  @supports (padding: max(0px)) {
    padding-left: max(${theme.spacing.xs}, env(safe-area-inset-left));
    padding-right: max(${theme.spacing.xs}, env(safe-area-inset-right));
  }
`;

const BannerWrapper = styled(motion.div)`
  pointer-events: auto;
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radius.lg};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  color: white;

  ${props => css`
    background: ${props.$gradient};
    border: 1px solid ${props.$borderColor};
  `}

  ${props => props.$pulse && css`
    animation: ${pulse} 2s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}

  @media (max-width: 480px) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};
    gap: ${theme.spacing.xs};
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const ContentWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.span`
  font-weight: ${theme.fontWeights.semibold};
  margin-right: ${theme.spacing.xs};
`;

const Message = styled.span`
  opacity: 0.9;

  @media (max-width: 480px) {
    display: none;
  }
`;

const CountdownWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  background: rgba(0, 0, 0, 0.2);
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
  white-space: nowrap;

  @media (max-width: 480px) {
    font-size: 10px;
    padding: 2px 6px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  flex-shrink: 0;
`;

const AcknowledgeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 480px) {
    padding: 4px 8px;
    font-size: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: ${theme.radius.full};
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
  }
`;

// ============================================
// ANIMATION VARIANTS
// ============================================

const bannerVariants = {
  hidden: {
    y: -100,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ============================================
// SINGLE BANNER ITEM
// ============================================

const AnnouncementBannerItem = ({ announcement, onDismiss, onAcknowledge }) => {
  const { t } = useTranslation();
  const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const priorityConfig = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.medium;

  // Use priority gradient for critical, otherwise type gradient
  const gradient = announcement.priority === 'critical'
    ? priorityConfig.gradient
    : typeConfig.gradient;
  const borderColor = announcement.priority === 'critical'
    ? priorityConfig.borderColor
    : typeConfig.borderColor;
  const shouldPulse = priorityConfig.pulse;

  const Icon = typeConfig.icon;

  // Calculate countdown for maintenance announcements
  const expiresAt = announcement.expiresAt ? new Date(announcement.expiresAt) : null;
  const countdown = useCountdown(
    announcement.type === 'maintenance' && expiresAt ? expiresAt : null
  );

  const handleDismiss = useCallback((e) => {
    e.stopPropagation();
    onDismiss(announcement.id);
  }, [announcement.id, onDismiss]);

  const handleAcknowledge = useCallback((e) => {
    e.stopPropagation();
    onAcknowledge(announcement.id);
  }, [announcement.id, onAcknowledge]);

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Truncate content for banner display
  const truncatedContent = announcement.content.length > 100
    ? announcement.content.substring(0, 100) + '...'
    : announcement.content;

  return (
    <BannerWrapper
      variants={prefersReducedMotion ? reducedMotionVariants : bannerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="alert"
      aria-live={announcement.priority === 'critical' ? 'assertive' : 'polite'}
    >
      <BannerContent
        $gradient={gradient}
        $borderColor={borderColor}
        $pulse={shouldPulse}
      >
        <IconWrapper>
          <Icon aria-hidden="true" />
        </IconWrapper>

        <ContentWrapper>
          <Title>{announcement.title}</Title>
          <Message>{truncatedContent}</Message>
        </ContentWrapper>

        {/* Countdown for maintenance */}
        {announcement.type === 'maintenance' && countdown && (
          <CountdownWrapper>
            <MdAccessTime aria-hidden="true" />
            <span>{countdown}</span>
          </CountdownWrapper>
        )}

        <ActionButtons>
          {/* Acknowledge button for required acknowledgments */}
          {announcement.requiresAcknowledgment && !announcement.isAcknowledged && (
            <AcknowledgeButton
              onClick={handleAcknowledge}
              aria-label={t('announcements.acknowledge')}
            >
              <MdCheckCircle aria-hidden="true" />
              {t('announcements.acknowledge')}
            </AcknowledgeButton>
          )}

          {/* Close button for dismissible announcements */}
          {announcement.dismissible && (
            <CloseButton
              onClick={handleDismiss}
              aria-label={t('announcements.dismiss')}
            >
              <MdClose aria-hidden="true" />
            </CloseButton>
          )}
        </ActionButtons>
      </BannerContent>
    </BannerWrapper>
  );
};

AnnouncementBannerItem.propTypes = {
  announcement: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    priority: PropTypes.string.isRequired,
    dismissible: PropTypes.bool,
    requiresAcknowledgment: PropTypes.bool,
    isAcknowledged: PropTypes.bool,
    expiresAt: PropTypes.string,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
  onAcknowledge: PropTypes.func.isRequired,
};

// ============================================
// MAIN COMPONENT
// ============================================

const AnnouncementBanner = ({ maxBanners = 3 }) => {
  const { bannerAnnouncements, dismiss, acknowledge } = useAnnouncements();
  const [dismissedIds, setDismissedIds] = useState(() => {
    // Load dismissed IDs from localStorage
    try {
      const stored = localStorage.getItem('dismissedAnnouncements');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Filter out locally dismissed announcements
  const visibleAnnouncements = useMemo(() => {
    return bannerAnnouncements
      .filter(a => !dismissedIds.has(a.id))
      .slice(0, maxBanners);
  }, [bannerAnnouncements, dismissedIds, maxBanners]);

  const handleDismiss = useCallback(async (id) => {
    // Optimistically update UI
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      // Persist to localStorage
      localStorage.setItem('dismissedAnnouncements', JSON.stringify([...next]));
      return next;
    });

    // Update server
    try {
      await dismiss(id);
    } catch (err) {
      console.error('Failed to dismiss announcement:', err);
    }
  }, [dismiss]);

  const handleAcknowledge = useCallback(async (id) => {
    try {
      await acknowledge(id);
    } catch (err) {
      console.error('Failed to acknowledge announcement:', err);
    }
  }, [acknowledge]);

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <BannerContainer>
      <AnimatePresence mode="popLayout">
        {visibleAnnouncements.map(announcement => (
          <AnnouncementBannerItem
            key={announcement.id}
            announcement={announcement}
            onDismiss={handleDismiss}
            onAcknowledge={handleAcknowledge}
          />
        ))}
      </AnimatePresence>
    </BannerContainer>
  );
};

AnnouncementBanner.propTypes = {
  /** Maximum number of banners to show at once */
  maxBanners: PropTypes.number,
};

export default AnnouncementBanner;
