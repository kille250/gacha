/**
 * AutoEnforcementViewer.js
 * 
 * Displays auto-enforcement events (automatic restrictions applied by the system).
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaSync, FaBan, FaEyeSlash, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { getAutoEnforcements } from '../../utils/api';
import { RESTRICTION_COLORS } from '../../constants/securityConstants';
import { SecondaryButton } from './AdminStyles';

const ACTION_ICONS = {
  perm_ban: FaBan,
  temp_ban: FaClock,
  shadowban: FaEyeSlash,
  rate_limited: FaClock,
  warning: FaExclamationTriangle
};

const AutoEnforcementViewer = ({ onViewUser }) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAutoEnforcements({ limit, offset });
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch auto-enforcements:', err);
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleNextPage = () => {
    setOffset(prev => prev + limit);
  };

  const handlePrevPage = () => {
    setOffset(prev => Math.max(0, prev - limit));
  };

  const formatTimestamp = (ts) => new Date(ts).toLocaleString();

  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <Header>
        <Title>
          <FaRobot /> {t('admin.security.autoEnforcementEvents')}
        </Title>
        <HeaderActions>
          <EventCount>{total} {t('admin.security.totalEvents')}</EventCount>
          <RefreshButton onClick={fetchEvents} disabled={loading} aria-label={t('admin.security.refresh')}>
            <FaSync className={loading ? 'spin' : ''} aria-hidden="true" />
          </RefreshButton>
        </HeaderActions>
      </Header>

      <Description>
        {t('admin.security.autoEnforcementDesc')}
      </Description>

      {loading ? (
        <LoadingState>{t('common.loading')}</LoadingState>
      ) : events.length === 0 ? (
        <EmptyState>
          <FaRobot />
          <span>{t('admin.security.noAutoEnforcements')}</span>
        </EmptyState>
      ) : (
        <>
          <EventsList>
            <AnimatePresence>
              {events.map((event) => {
                const Icon = ACTION_ICONS[event.action] || FaExclamationTriangle;
                const color = RESTRICTION_COLORS[event.action] || '#8e8e93';
                
                return (
                  <EventCard
                    key={event.id}
                    variants={motionVariants.staggerItem}
                    initial="hidden"
                    animate="visible"
                    $borderColor={color}
                  >
                    <EventIcon $color={color}>
                      <Icon />
                    </EventIcon>
                    <EventContent>
                      <EventHeader>
                        <Username onClick={() => onViewUser?.(event.userId)}>
                          {event.username}
                        </Username>
                        <ActionBadge $color={color}>
                          {event.action?.replace('_', ' ')}
                          {event.escalated && <EscalatedTag>{t('admin.security.escalated')}</EscalatedTag>}
                        </ActionBadge>
                      </EventHeader>
                      <EventReason>{event.reason}</EventReason>
                      <EventMeta>
                        <MetaItem>
                          <strong>{t('admin.security.previousRestriction')}:</strong> {event.previousRestriction || t('admin.security.restrictionTypes.none')}
                        </MetaItem>
                        {event.expiresAt && (
                          <MetaItem>
                            <strong>{t('admin.security.expires')}:</strong> {formatTimestamp(event.expiresAt)}
                          </MetaItem>
                        )}
                        <MetaItem>
                          <strong>{t('admin.security.time')}:</strong> {formatTimestamp(event.timestamp)}
                        </MetaItem>
                      </EventMeta>
                    </EventContent>
                  </EventCard>
                );
              })}
            </AnimatePresence>
          </EventsList>

          <Pagination>
            <SecondaryButton onClick={handlePrevPage} disabled={offset === 0}>
              ← {t('admin.security.previous')}
            </SecondaryButton>
            <PageInfo>
              {offset + 1} - {Math.min(offset + limit, total)} {t('common.of')} {total}
            </PageInfo>
            <SecondaryButton onClick={handleNextPage} disabled={offset + limit >= total}>
              {t('common.next')} →
            </SecondaryButton>
          </Pagination>
        </>
      )}
    </Container>
  );
};

const Container = styled(motion.div)``;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin: 0;
  
  svg { color: ${theme.colors.warning}; }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const EventCount = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  
  &:hover:not(:disabled) {
    color: ${theme.colors.text};
  }
  
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const Description = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.lg};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing['3xl']};
  color: ${theme.colors.textSecondary};
  
  svg {
    font-size: 48px;
    color: ${theme.colors.success};
  }
`;

const EventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const EventCard = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-left: 4px solid ${props => props.$borderColor};
  border-radius: ${theme.radius.lg};
`;

const EventIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${props => props.$color}20;
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color};
  flex-shrink: 0;
`;

const EventContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const EventHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.xs};
`;

const Username = styled.span`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.primary};
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ActionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const EscalatedTag = styled.span`
  background: ${theme.colors.error};
  color: white;
  padding: 1px 4px;
  border-radius: ${theme.radius.sm};
  font-size: 9px;
  margin-left: ${theme.spacing.xs};
`;

const EventReason = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
`;

const EventMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const MetaItem = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  
  strong {
    color: ${theme.colors.text};
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.lg};
  margin-top: ${theme.spacing.lg};
`;

const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export default AutoEnforcementViewer;

