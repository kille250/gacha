/**
 * SessionActivityPanel.js
 * 
 * Displays session/login activity for a user.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSignInAlt, FaSync, FaGoogle, FaKey, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { getUserSessions } from '../../utils/api';

const SessionActivityPanel = ({ userId }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await getUserSessions(userId);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError(t('adminSecurity.sessionActivity.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatTimestamp = (ts) => ts ? new Date(ts).toLocaleString() : t('time.never');

  const formatRelativeTime = (ts) => {
    if (!ts) return t('time.never');
    const diff = Date.now() - new Date(ts).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('time.daysAgo', { count: days });
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <FaSync className="spin" /> {t('adminSecurity.sessionActivity.loadingActivity')}
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>{error}</ErrorState>
      </Container>
    );
  }

  if (!data) return null;

  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <Header>
        <Title>
          <FaSignInAlt /> {t('admin.security.sessionActivity', 'Session Activity')}
        </Title>
        <RefreshButton onClick={fetchData}>
          <FaSync />
        </RefreshButton>
      </Header>

      <SummaryGrid>
        <SummaryCard>
          <SummaryLabel>{t('adminSecurity.sessionActivity.lastLogin')}</SummaryLabel>
          <SummaryValue>
            {data.lastSuccessfulLogin
              ? formatRelativeTime(data.lastSuccessfulLogin.timestamp)
              : t('time.never')
            }
          </SummaryValue>
          {data.lastSuccessfulLogin && (
            <SummaryMeta>
              {t('adminSecurity.sessionActivity.via')} {data.lastSuccessfulLogin.method === 'google' ? t('adminSecurity.loginMethod.google') : t('adminSecurity.loginMethod.password')}
            </SummaryMeta>
          )}
        </SummaryCard>
        
        <SummaryCard>
          <SummaryLabel>{t('adminSecurity.sessionActivity.failedLogins24h')}</SummaryLabel>
          <SummaryValue $warning={data.recentFailedLogins > 0}>
            {data.recentFailedLogins || 0}
          </SummaryValue>
          {data.recentFailedLogins > 2 && (
            <SummaryMeta $warning>{t('adminSecurity.sessionActivity.possibleAttack')}</SummaryMeta>
          )}
        </SummaryCard>

        <SummaryCard>
          <SummaryLabel>{t('adminSecurity.sessionActivity.sessionInvalidated')}</SummaryLabel>
          <SummaryValue $small>
            {data.sessionInvalidatedAt
              ? formatTimestamp(data.sessionInvalidatedAt)
              : t('time.never')
            }
          </SummaryValue>
        </SummaryCard>

        <SummaryCard>
          <SummaryLabel>{t('adminSecurity.sessionActivity.accountCreated')}</SummaryLabel>
          <SummaryValue $small>
            {formatTimestamp(data.accountCreated)}
          </SummaryValue>
        </SummaryCard>
      </SummaryGrid>

      {data.loginHistory?.length > 0 && (
        <HistorySection>
          <HistoryTitle>{t('adminSecurity.sessionActivity.loginHistory')}</HistoryTitle>
          <HistoryList>
            <AnimatePresence>
              {data.loginHistory.map((event, index) => (
                <HistoryItem
                  key={event.id || index}
                  variants={motionVariants.staggerItem}
                  $success={event.success}
                >
                  <StatusIcon $success={event.success}>
                    {event.success ? <FaCheckCircle /> : <FaTimes />}
                  </StatusIcon>
                  <EventInfo>
                    <EventMethod>
                      {event.type === 'auth.google.login' ? (
                        <>
                          <FaGoogle /> {t('adminSecurity.loginMethod.google')}
                        </>
                      ) : (
                        <>
                          <FaKey /> {event.success ? t('adminSecurity.loginMethod.password') : t('adminSecurity.sessionActivity.failedAttempt')}
                        </>
                      )}
                    </EventMethod>
                    {event.ipHash && (
                      <EventDetail>IP: {event.ipHash?.substring(0, 12)}...</EventDetail>
                    )}
                  </EventInfo>
                  <EventTime>
                    {formatRelativeTime(event.timestamp)}
                  </EventTime>
                </HistoryItem>
              ))}
            </AnimatePresence>
          </HistoryList>
        </HistorySection>
      )}

      {(!data.loginHistory || data.loginHistory.length === 0) && (
        <EmptyState>{t('adminSecurity.sessionActivity.noHistory')}</EmptyState>
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

const Title = styled.h4`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  
  svg { color: ${theme.colors.primary}; }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: ${theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  
  &:hover {
    color: ${theme.colors.text};
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.error};
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const SummaryLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const SummaryValue = styled.div`
  font-size: ${props => props.$small ? theme.fontSizes.sm : theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$warning ? theme.colors.warning : theme.colors.text};
`;

const SummaryMeta = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$warning ? theme.colors.warning : theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const HistorySection = styled.div``;

const HistoryTitle = styled.h5`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.md} 0;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  max-height: 300px;
  overflow-y: auto;
`;

const HistoryItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.md};
  border-left: 3px solid ${props => props.$success ? theme.colors.success : theme.colors.error};
`;

const StatusIcon = styled.div`
  color: ${props => props.$success ? theme.colors.success : theme.colors.error};
  font-size: ${theme.fontSizes.md};
  flex-shrink: 0;
`;

const EventInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const EventMethod = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  
  svg { color: ${theme.colors.textSecondary}; }
`;

const EventDetail = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  font-family: monospace;
  margin-top: 2px;
`;

const EventTime = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

export default SessionActivityPanel;

