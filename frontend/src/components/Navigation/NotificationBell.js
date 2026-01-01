/**
 * NotificationBell - Notification bell icon with unread count badge
 *
 * Shows a bell icon with a badge indicating unread announcements.
 * Clicking opens a dropdown with recent announcements or links to
 * the full Announcement Center.
 *
 * Features:
 * - Animated badge for new notifications
 * - Dropdown with recent announcements
 * - Link to full Announcement Center
 * - Keyboard accessible
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell, FaCheck, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { useAnnouncements } from '../../context/AnnouncementContext';

const NotificationBell = ({ variant = 'desktop' }) => {
  const { t } = useTranslation();
  const { announcements, unreadCount, markAsRead, acknowledge } = useAnnouncements();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const cleanupRef = useRef(null);

  // Get recent unread announcements (max 5)
  const recentAnnouncements = announcements
    .filter(a => !a.isRead)
    .slice(0, 5);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to avoid catching the opening click
    const timeoutId = setTimeout(() => {
      const handleClickOutside = (event) => {
        const isOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target);
        const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);

        if (isOutsideButton && isOutsideDropdown) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      // Store cleanup function
      cleanupRef.current = () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      cleanupRef.current?.();
    };
  }, [isOpen]);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  }, []);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Handle announcement click with error handling
  const handleAnnouncementClick = useCallback(async (announcement) => {
    try {
      if (!announcement.isRead) {
        await markAsRead(announcement.id);
      }
      if (announcement.requiresAcknowledgment && !announcement.isAcknowledged) {
        await acknowledge(announcement.id);
      }
    } catch (err) {
      // Silently handle error - don't crash the navigation
      console.error('Error handling announcement click:', err);
    }
  }, [markAsRead, acknowledge]);

  // Get type icon color
  const getTypeColor = (type) => {
    switch (type) {
      case 'maintenance': return theme.colors.warning;
      case 'update': return theme.colors.success;
      case 'event': return theme.colors.accent;
      case 'warning': return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  if (variant === 'mobile') {
    return (
      <MobileBellButton
        ref={buttonRef}
        onClick={toggleDropdown}
        aria-label={t('announcements.notifications', 'Notifications')}
        aria-expanded={isOpen}
        $hasUnread={unreadCount > 0}
      >
        <FaBell />
        {unreadCount > 0 && (
          <MobileBadge>
            {unreadCount > 99 ? '99+' : unreadCount}
          </MobileBadge>
        )}
      </MobileBellButton>
    );
  }

  return (
    <BellWrapper>
      <BellButton
        ref={buttonRef}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        aria-label={t('announcements.notifications', 'Notifications')}
        aria-expanded={isOpen}
        aria-haspopup="true"
        $hasUnread={unreadCount > 0}
      >
        <BellIcon $hasUnread={unreadCount > 0}>
          <FaBell />
        </BellIcon>
        <AnimatePresence>
          {unreadCount > 0 && (
            <Badge
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </AnimatePresence>
      </BellButton>

      <AnimatePresence>
        {isOpen && createPortal(
          <DropdownPortal
            ref={dropdownRef}
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
            }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="menu"
            onKeyDown={handleKeyDown}
          >
            <DropdownHeader>
              <DropdownTitle>{t('announcements.title', 'Announcements')}</DropdownTitle>
              {unreadCount > 0 && (
                <UnreadBadge>{unreadCount} {t('announcements.unread', 'unread')}</UnreadBadge>
              )}
            </DropdownHeader>

            <DropdownContent>
              {recentAnnouncements.length === 0 ? (
                <EmptyState>
                  <EmptyIcon><FaBell /></EmptyIcon>
                  <EmptyText>{t('announcements.noNew', 'No new announcements')}</EmptyText>
                </EmptyState>
              ) : (
                recentAnnouncements.map(announcement => (
                  <AnnouncementItem
                    key={announcement.id}
                    onClick={() => handleAnnouncementClick(announcement)}
                    role="menuitem"
                    $isRead={announcement.isRead}
                  >
                    <TypeIndicator $color={getTypeColor(announcement.type)} />
                    <AnnouncementContent>
                      <AnnouncementTitle>{announcement.title}</AnnouncementTitle>
                      <AnnouncementMeta>
                        {t(`announcements.types.${announcement.type}`, announcement.type)}
                        {announcement.requiresAcknowledgment && !announcement.isAcknowledged && (
                          <RequiresAction>{t('announcements.actionRequired', 'Action required')}</RequiresAction>
                        )}
                      </AnnouncementMeta>
                    </AnnouncementContent>
                    {announcement.isRead ? (
                      <CheckIcon><FaCheck /></CheckIcon>
                    ) : (
                      <UnreadDot />
                    )}
                  </AnnouncementItem>
                ))
              )}
            </DropdownContent>

            {announcements.length > 0 && (
              <DropdownFooter>
                <ViewAllLink to="/announcements" onClick={() => setIsOpen(false)}>
                  {t('announcements.viewAll', 'View all announcements')}
                  <FaChevronRight />
                </ViewAllLink>
              </DropdownFooter>
            )}
          </DropdownPortal>,
          document.body
        )}
      </AnimatePresence>
    </BellWrapper>
  );
};

// ==================== ANIMATIONS ====================

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

// ==================== STYLED COMPONENTS ====================

const BellWrapper = styled.div`
  position: relative;
`;

const BellButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: ${theme.radius.md};
  background: ${props => props.$hasUnread ? theme.colors.primarySubtle : 'transparent'};
  cursor: pointer;
  position: relative;
  transition: all ${theme.timing.fast} ${theme.easing.easeOut};
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${theme.colors.glass};
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.focusRing};
  }

  /* Compact mode for narrower desktop screens */
  @media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
    width: 36px;
    height: 36px;
  }
`;

const BellIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: ${props => props.$hasUnread ? theme.colors.primary : theme.colors.textSecondary};
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};

  ${props => props.$hasUnread && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;

const Badge = styled(motion.span)`
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.error};
  color: white;
  font-size: 10px;
  font-weight: ${theme.fontWeights.bold};
  border-radius: ${theme.radius.full};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const MobileBellButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: ${theme.radius.md};
  background: ${props => props.$hasUnread ? theme.colors.primarySubtle : 'transparent'};
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;

  svg {
    font-size: 20px;
    color: ${props => props.$hasUnread ? theme.colors.primary : theme.colors.textSecondary};
  }
`;

const MobileBadge = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.error};
  color: white;
  font-size: 9px;
  font-weight: ${theme.fontWeights.bold};
  border-radius: ${theme.radius.full};
`;

const DropdownPortal = styled(motion.div)`
  position: fixed;
  width: 340px;
  max-width: calc(100vw - ${theme.spacing.lg} * 2);
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadows.xl};
  overflow: hidden;
  z-index: ${theme.zIndex.stickyDropdown};
`;

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  background: ${theme.colors.backgroundSecondary};
`;

const DropdownTitle = styled.h3`
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const UnreadBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.primary};
  background: ${theme.colors.primarySubtle};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.full};
`;

const DropdownContent = styled.div`
  max-height: 320px;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 32px;
  color: ${theme.colors.textTertiary};
  margin-bottom: ${theme.spacing.sm};
  opacity: 0.5;
`;

const EmptyText = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const AnnouncementItem = styled.button`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  border: none;
  background: ${props => props.$isRead ? 'transparent' : 'rgba(0, 113, 227, 0.04)'};
  cursor: pointer;
  text-align: left;
  transition: background ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    background: ${theme.colors.glass};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.surfaceBorder};
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${theme.colors.focusRing};
  }
`;

const TypeIndicator = styled.div`
  width: 4px;
  height: 100%;
  min-height: 40px;
  background: ${props => props.$color};
  border-radius: ${theme.radius.full};
  flex-shrink: 0;
`;

const AnnouncementContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const AnnouncementTitle = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AnnouncementMeta = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const RequiresAction = styled.span`
  color: ${theme.colors.warning};
  font-weight: ${theme.fontWeights.medium};
`;

const CheckIcon = styled.span`
  font-size: 12px;
  color: ${theme.colors.success};
  flex-shrink: 0;
`;

const UnreadDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${theme.colors.primary};
  border-radius: 50%;
  flex-shrink: 0;
`;

const DropdownFooter = styled.div`
  border-top: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.primary};
  text-decoration: none;
  border-radius: ${theme.radius.md};
  transition: background ${theme.timing.fast} ${theme.easing.easeOut};

  &:hover {
    background: ${theme.colors.primarySubtle};
  }

  svg {
    font-size: 12px;
  }
`;

export default React.memo(NotificationBell);
