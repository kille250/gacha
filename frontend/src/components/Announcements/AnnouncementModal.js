/**
 * AnnouncementModal - Modal for high-priority or acknowledgment-required announcements
 *
 * Features:
 * - Appears on app load for unacknowledged announcements
 * - Cannot be dismissed without acknowledgment if required
 * - Support for multiple announcements with pagination
 * - Rich content display with markdown support
 * - Type-based styling
 *
 * @example
 * <AnnouncementModal />
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styled, { css } from 'styled-components';
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
  MdCheckCircle,
  MdChevronLeft,
  MdChevronRight
} from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { useAnnouncements } from '../../context/AnnouncementContext';

// ============================================
// TYPE CONFIGURATION
// ============================================

const TYPE_CONFIG = {
  maintenance: {
    icon: MdBuild,
    color: theme.colors.warning,
    gradient: 'linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(200, 125, 8, 0.15) 100%)'
  },
  update: {
    icon: MdNewReleases,
    color: theme.colors.success,
    gradient: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(40, 160, 70, 0.15) 100%)'
  },
  event: {
    icon: MdCelebration,
    color: '#bf5af2',
    gradient: 'linear-gradient(135deg, rgba(191, 90, 242, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)'
  },
  patch_notes: {
    icon: MdDescription,
    color: theme.colors.primary,
    gradient: 'linear-gradient(135deg, rgba(10, 132, 255, 0.15) 0%, rgba(0, 113, 227, 0.15) 100%)'
  },
  promotion: {
    icon: MdLocalOffer,
    color: theme.colors.featured,
    gradient: 'linear-gradient(135deg, rgba(245, 166, 35, 0.15) 0%, rgba(255, 107, 0, 0.15) 100%)'
  },
  warning: {
    icon: MdWarning,
    color: theme.colors.warning,
    gradient: 'linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(230, 126, 34, 0.15) 100%)'
  },
  info: {
    icon: MdInfo,
    color: theme.colors.info,
    gradient: 'linear-gradient(135deg, rgba(90, 200, 250, 0.15) 0%, rgba(10, 132, 255, 0.15) 100%)'
  }
};

// ============================================
// STYLED COMPONENTS
// ============================================

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${theme.zIndex?.modal || 2000};
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: ${theme.spacing.md};
`;

const ModalContainer = styled(motion.div)`
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};

  ${props => props.$gradient && css`
    background: ${props.$gradient};
  `}
`;

const IconBadge = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radius.lg};
  font-size: 24px;
  flex-shrink: 0;

  ${props => css`
    background: ${props.$color}20;
    color: ${props.$color};
  `}
`;

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;

  ${props => css`
    color: ${props.$color};
  `}
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  line-height: 1.3;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.glassBorder};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    background: ${theme.colors.glassHover};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.lg};
`;

const Content = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.md};
  line-height: 1.6;
  white-space: pre-wrap;

  /* Basic markdown-like styling */
  strong, b {
    font-weight: ${theme.fontWeights.semibold};
    color: ${theme.colors.text};
  }

  em, i {
    font-style: italic;
  }

  code {
    background: ${theme.colors.glass};
    padding: 2px 6px;
    border-radius: ${theme.radius.sm};
    font-family: monospace;
    font-size: 0.9em;
  }

  a {
    color: ${theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundTertiary};
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const PageButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.glassBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${theme.colors.glassHover};
    color: ${theme.colors.text};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const PageIndicator = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  min-width: 60px;
  text-align: center;
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  ${props => props.$variant === 'primary' && css`
    background: ${theme.colors.primary};
    border: none;
    color: white;

    &:hover {
      background: ${theme.colors.primaryHover};
    }

    &:active {
      transform: scale(0.98);
    }
  `}

  ${props => props.$variant === 'secondary' && css`
    background: ${theme.colors.glass};
    border: 1px solid ${theme.colors.glassBorder};
    color: ${theme.colors.text};

    &:hover {
      background: ${theme.colors.glassHover};
    }
  `}

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

// ============================================
// ANIMATION VARIANTS
// ============================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 }
  }
};

const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } }
};

// ============================================
// COMPONENT
// ============================================

const AnnouncementModal = () => {
  const { t } = useTranslation();
  const { unacknowledgedAnnouncements, modalAnnouncements, acknowledge, dismiss } = useAnnouncements();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Combine unacknowledged (priority) and modal display mode announcements
  const announcements = useMemo(() => {
    const unackSet = new Set(unacknowledgedAnnouncements.map(a => a.id));
    const combined = [
      ...unacknowledgedAnnouncements,
      ...modalAnnouncements.filter(a => !unackSet.has(a.id) && !a.isDismissed)
    ];
    return combined;
  }, [unacknowledgedAnnouncements, modalAnnouncements]);

  // Auto-open when there are announcements to show
  useEffect(() => {
    if (announcements.length > 0 && !isOpen) {
      setIsOpen(true);
      setCurrentIndex(0);
    } else if (announcements.length === 0 && isOpen) {
      setIsOpen(false);
    }
  }, [announcements.length, isOpen]);

  const currentAnnouncement = announcements[currentIndex];
  const typeConfig = currentAnnouncement
    ? (TYPE_CONFIG[currentAnnouncement.type] || TYPE_CONFIG.info)
    : null;

  const canClose = currentAnnouncement
    ? (!currentAnnouncement.requiresAcknowledgment || currentAnnouncement.isAcknowledged)
    : true;

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(announcements.length - 1, prev + 1));
  }, [announcements.length]);

  const handleAcknowledge = useCallback(async () => {
    if (!currentAnnouncement) return;

    try {
      await acknowledge(currentAnnouncement.id);

      // Move to next or close
      if (currentIndex < announcements.length - 1) {
        // Don't increment index, the current one will be removed from list
      } else if (announcements.length === 1) {
        setIsOpen(false);
      } else {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  }, [currentAnnouncement, currentIndex, announcements.length, acknowledge]);

  const handleDismiss = useCallback(async () => {
    if (!currentAnnouncement || !canClose) return;

    try {
      await dismiss(currentAnnouncement.id);

      if (announcements.length === 1) {
        setIsOpen(false);
      } else if (currentIndex >= announcements.length - 1) {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to dismiss:', err);
    }
  }, [currentAnnouncement, canClose, currentIndex, announcements.length, dismiss]);

  const handleClose = useCallback(() => {
    if (canClose) {
      setIsOpen(false);
    }
  }, [canClose]);

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!isOpen || !currentAnnouncement) {
    return null;
  }

  const Icon = typeConfig.icon;

  return (
    <AnimatePresence>
      <Overlay
        variants={prefersReducedMotion ? reducedMotionVariants : overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={canClose ? handleClose : undefined}
      >
        <ModalContainer
          variants={prefersReducedMotion ? reducedMotionVariants : modalVariants}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
        >
          <ModalHeader $gradient={typeConfig.gradient}>
            <IconBadge $color={typeConfig.color}>
              <Icon aria-hidden="true" />
            </IconBadge>

            <HeaderContent>
              <TypeBadge $color={typeConfig.color}>
                {t(`announcements.types.${currentAnnouncement.type}`)}
              </TypeBadge>
              <Title id="announcement-modal-title">{currentAnnouncement.title}</Title>
            </HeaderContent>

            <CloseButton
              onClick={handleClose}
              disabled={!canClose}
              aria-label={t('common.close')}
              title={!canClose ? t('announcements.mustAcknowledge') : undefined}
            >
              <MdClose aria-hidden="true" />
            </CloseButton>
          </ModalHeader>

          <ModalBody>
            <Content>{currentAnnouncement.content}</Content>
          </ModalBody>

          <ModalFooter>
            {announcements.length > 1 ? (
              <Pagination>
                <PageButton
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  aria-label={t('common.previous')}
                >
                  <MdChevronLeft />
                </PageButton>
                <PageIndicator>
                  {currentIndex + 1} / {announcements.length}
                </PageIndicator>
                <PageButton
                  onClick={handleNext}
                  disabled={currentIndex === announcements.length - 1}
                  aria-label={t('common.next')}
                >
                  <MdChevronRight />
                </PageButton>
              </Pagination>
            ) : (
              <div />
            )}

            <ActionButtons>
              {currentAnnouncement.requiresAcknowledgment && !currentAnnouncement.isAcknowledged ? (
                <Button $variant="primary" onClick={handleAcknowledge}>
                  <MdCheckCircle aria-hidden="true" />
                  {t('announcements.acknowledge')}
                </Button>
              ) : (
                <Button $variant="secondary" onClick={handleDismiss}>
                  {t('announcements.gotIt')}
                </Button>
              )}
            </ActionButtons>
          </ModalFooter>
        </ModalContainer>
      </Overlay>
    </AnimatePresence>
  );
};

export default AnnouncementModal;
