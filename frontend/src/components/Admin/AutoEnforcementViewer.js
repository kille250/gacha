/**
 * AutoEnforcementViewer.js
 * 
 * Displays auto-enforcement events (automatic restrictions applied by the system).
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaSync, FaBan, FaEyeSlash, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { getAutoEnforcements } from '../../utils/api';
import { SecondaryButton } from './AdminStyles';

const ACTION_ICONS = {
  perm_ban: FaBan,
  temp_ban: FaClock,
  shadowban: FaEyeSlash,
  rate_limited: FaClock,
  warning: FaExclamationTriangle
};

const ACTION_COLORS = {
  perm_ban: '#ff3b30',
  temp_ban: '#ff9500',
  shadowban: '#8e8e93',
  rate_limited: '#af52de',
  warning: '#ffcc00'
};

const AutoEnforcementViewer = ({ onViewUser }) => {
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
          <FaRobot /> Auto-Enforcement Events
        </Title>
        <HeaderActions>
          <EventCount>{total} total event(s)</EventCount>
          <RefreshButton onClick={fetchEvents} disabled={loading}>
            <FaSync className={loading ? 'spin' : ''} />
          </RefreshButton>
        </HeaderActions>
      </Header>

      <Description>
        These are restrictions automatically applied by the system based on risk scores
        and suspicious behavior detection.
      </Description>

      {loading ? (
        <LoadingState>Loading...</LoadingState>
      ) : events.length === 0 ? (
        <EmptyState>
          <FaRobot />
          <span>No auto-enforcement events recorded</span>
        </EmptyState>
      ) : (
        <>
          <EventsList>
            <AnimatePresence>
              {events.map((event) => {
                const Icon = ACTION_ICONS[event.action] || FaExclamationTriangle;
                const color = ACTION_COLORS[event.action] || '#8e8e93';
                
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
                          {event.escalated && <EscalatedTag>ESCALATED</EscalatedTag>}
                        </ActionBadge>
                      </EventHeader>
                      <EventReason>{event.reason}</EventReason>
                      <EventMeta>
                        <MetaItem>
                          <strong>Previous:</strong> {event.previousRestriction || 'none'}
                        </MetaItem>
                        {event.expiresAt && (
                          <MetaItem>
                            <strong>Expires:</strong> {formatTimestamp(event.expiresAt)}
                          </MetaItem>
                        )}
                        <MetaItem>
                          <strong>Time:</strong> {formatTimestamp(event.timestamp)}
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
              ← Previous
            </SecondaryButton>
            <PageInfo>
              {offset + 1} - {Math.min(offset + limit, total)} of {total}
            </PageInfo>
            <SecondaryButton onClick={handleNextPage} disabled={offset + limit >= total}>
              Next →
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

