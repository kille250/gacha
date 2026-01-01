/**
 * AnnouncementCenter - Dedicated announcement inbox/list view
 *
 * Features:
 * - List of all announcements (past and present)
 * - Filter by type and read/unread status
 * - Mark as read functionality
 * - Expandable content view
 * - Badge counter integration
 *
 * @example
 * <AnnouncementCenter />
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdBuild,
  MdNewReleases,
  MdCelebration,
  MdDescription,
  MdLocalOffer,
  MdWarning,
  MdInfo,
  MdCheckCircle,
  MdExpandMore,
  MdExpandLess,
  MdFilterList,
  MdInbox,
  MdMarkunread,
  MdDrafts
} from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { useAnnouncements } from '../../context/AnnouncementContext';

// ============================================
// TYPE CONFIGURATION
// ============================================

const TYPE_CONFIG = {
  maintenance: { icon: MdBuild, color: theme.colors.warning },
  update: { icon: MdNewReleases, color: theme.colors.success },
  event: { icon: MdCelebration, color: '#bf5af2' },
  patch_notes: { icon: MdDescription, color: theme.colors.primary },
  promotion: { icon: MdLocalOffer, color: theme.colors.featured },
  warning: { icon: MdWarning, color: theme.colors.warning },
  info: { icon: MdInfo, color: theme.colors.info }
};

const PRIORITY_CONFIG = {
  critical: { color: theme.colors.error, label: 'Critical' },
  high: { color: theme.colors.warning, label: 'High' },
  medium: { color: theme.colors.info, label: 'Medium' },
  low: { color: theme.colors.textTertiary, label: 'Low' }
};

// ============================================
// STYLED COMPONENTS
// ============================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: white;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? theme.colors.primaryMuted : theme.colors.glass};
  border: 1px solid ${props => props.$active ? theme.colors.primary : theme.colors.glassBorder};
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${props => props.$active ? theme.colors.primaryMuted : theme.colors.glassHover};
    color: ${props => props.$active ? theme.colors.primary : theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const AnnouncementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xxl};
  text-align: center;
  color: ${theme.colors.textTertiary};
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
  opacity: 0.5;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.md};
`;

const AnnouncementCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  transition: border-color ${theme.transitions.fast};

  ${props => !props.$isRead && css`
    border-left: 3px solid ${theme.colors.primary};
  `}

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }
`;

const CardHeader = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  width: 100%;
  padding: ${theme.spacing.md};
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -2px;
  }
`;

const IconBadge = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radius.md};
  font-size: 20px;
  flex-shrink: 0;

  ${props => css`
    background: ${props.$color}20;
    color: ${props.$color};
  `}
`;

const CardContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: 4px;
`;

const TypeLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => css`
    color: ${props.$color};
  `}
`;

const PriorityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background: ${props => props.$color}20;
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  font-weight: ${theme.fontWeights.semibold};
  text-transform: uppercase;

  ${props => css`
    color: ${props.$color};
  `}
`;

const DateText = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textTertiary};
  margin-left: auto;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  line-height: 1.4;

  ${props => props.$isRead && css`
    color: ${theme.colors.textSecondary};
  `}
`;

const ExpandIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${theme.colors.textTertiary};
  flex-shrink: 0;
`;

const ExpandedContent = styled(motion.div)`
  padding: 0 ${theme.spacing.md} ${theme.spacing.md};
  padding-left: calc(${theme.spacing.md} + 40px + ${theme.spacing.md});
`;

const ContentText = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorderSubtle};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.glassBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.glassHover};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  ${props => props.$primary && css`
    background: ${theme.colors.primaryMuted};
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};

    &:hover {
      background: ${theme.colors.primary};
      color: white;
    }
  `}
`;

// ============================================
// ANIMATION VARIANTS
// ============================================

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const expandVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.2 } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.15 } }
};

// ============================================
// ANNOUNCEMENT ITEM COMPONENT
// ============================================

const AnnouncementItem = ({ announcement, onMarkAsRead, onAcknowledge }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const priorityConfig = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.medium;
  const Icon = typeConfig.icon;

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);

    // Mark as read when expanding
    if (!isExpanded && !announcement.isRead) {
      onMarkAsRead(announcement.id);
    }
  }, [isExpanded, announcement.id, announcement.isRead, onMarkAsRead]);

  const handleAcknowledge = useCallback((e) => {
    e.stopPropagation();
    onAcknowledge(announcement.id);
  }, [announcement.id, onAcknowledge]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('common.today');
    } else if (diffDays === 1) {
      return t('common.yesterday');
    } else if (diffDays < 7) {
      return t('common.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <AnnouncementCard
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      $isRead={announcement.isRead}
    >
      <CardHeader onClick={handleToggle}>
        <IconBadge $color={typeConfig.color}>
          <Icon aria-hidden="true" />
        </IconBadge>

        <CardContent>
          <CardMeta>
            <TypeLabel $color={typeConfig.color}>
              {t(`announcements.types.${announcement.type}`)}
            </TypeLabel>
            {announcement.priority !== 'medium' && (
              <PriorityBadge $color={priorityConfig.color}>
                {t(`announcements.priority.${announcement.priority}`)}
              </PriorityBadge>
            )}
            <DateText>{formatDate(announcement.createdAt)}</DateText>
          </CardMeta>
          <CardTitle $isRead={announcement.isRead}>{announcement.title}</CardTitle>
        </CardContent>

        <ExpandIcon>
          {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
        </ExpandIcon>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <ExpandedContent
            variants={expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <ContentText>{announcement.content}</ContentText>

            <CardActions>
              {announcement.requiresAcknowledgment && !announcement.isAcknowledged && (
                <ActionButton $primary onClick={handleAcknowledge}>
                  <MdCheckCircle aria-hidden="true" />
                  {t('announcements.acknowledge')}
                </ActionButton>
              )}
              {announcement.isAcknowledged && (
                <span style={{ color: theme.colors.success, fontSize: theme.fontSizes.xs }}>
                  <MdCheckCircle style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {t('announcements.acknowledged')}
                </span>
              )}
            </CardActions>
          </ExpandedContent>
        )}
      </AnimatePresence>
    </AnnouncementCard>
  );
};

AnnouncementItem.propTypes = {
  announcement: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    priority: PropTypes.string.isRequired,
    isRead: PropTypes.bool,
    isAcknowledged: PropTypes.bool,
    requiresAcknowledgment: PropTypes.bool,
    createdAt: PropTypes.string,
  }).isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onAcknowledge: PropTypes.func.isRequired
};

// ============================================
// MAIN COMPONENT
// ============================================

const AnnouncementCenter = ({ className }) => {
  const { t } = useTranslation();
  const { announcements, unreadCount, markAsRead, acknowledge } = useAnnouncements();
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter] = useState(null);

  const filteredAnnouncements = useMemo(() => {
    let result = [...announcements];

    // Filter by read status
    if (filter === 'unread') {
      result = result.filter(a => !a.isRead);
    } else if (filter === 'read') {
      result = result.filter(a => a.isRead);
    }

    // Filter by type
    if (typeFilter) {
      result = result.filter(a => a.type === typeFilter);
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return result;
  }, [announcements, filter, typeFilter]);

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [markAsRead]);

  const handleAcknowledge = useCallback(async (id) => {
    try {
      await acknowledge(id);
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  }, [acknowledge]);

  return (
    <Container className={className}>
      <Header>
        <Title>
          <MdInbox aria-hidden="true" />
          {t('announcements.center')}
          {unreadCount > 0 && <UnreadBadge>{unreadCount}</UnreadBadge>}
        </Title>

        <FilterBar>
          <MdFilterList aria-hidden="true" style={{ color: theme.colors.textTertiary }} />

          <FilterButton
            $active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            {t('announcements.filterAll')}
          </FilterButton>

          <FilterButton
            $active={filter === 'unread'}
            onClick={() => setFilter('unread')}
          >
            <MdMarkunread aria-hidden="true" />
            {t('announcements.filterUnread')}
          </FilterButton>

          <FilterButton
            $active={filter === 'read'}
            onClick={() => setFilter('read')}
          >
            <MdDrafts aria-hidden="true" />
            {t('announcements.filterRead')}
          </FilterButton>
        </FilterBar>
      </Header>

      {filteredAnnouncements.length > 0 ? (
        <AnnouncementList>
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map(announcement => (
              <AnnouncementItem
                key={announcement.id}
                announcement={announcement}
                onMarkAsRead={handleMarkAsRead}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </AnimatePresence>
        </AnnouncementList>
      ) : (
        <EmptyState>
          <EmptyIcon>
            <MdInbox />
          </EmptyIcon>
          <EmptyText>
            {filter === 'unread'
              ? t('announcements.noUnread')
              : t('announcements.noAnnouncements')}
          </EmptyText>
        </EmptyState>
      )}
    </Container>
  );
};

AnnouncementCenter.propTypes = {
  className: PropTypes.string
};

export default AnnouncementCenter;
