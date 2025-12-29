/**
 * DeviceHistoryPanel.js
 * 
 * Displays detailed device history for a user with timestamps and usage data.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFingerprint, FaSync, FaDesktop, FaGlobe, FaExclamationTriangle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { getUserDeviceHistory } from '../../utils/api';

const DeviceHistoryPanel = ({ userId, username }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await getUserDeviceHistory(userId);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch device history:', err);
      setError(t('adminSecurity.deviceHistory.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatTimestamp = (ts) => ts ? new Date(ts).toLocaleString() : t('common.unknown', 'Unknown');

  const formatRelativeTime = (ts) => {
    if (!ts) return t('common.unknown', 'Unknown');
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return t('time.today');
    if (days === 1) return t('time.yesterday');
    if (days < 7) return t('time.daysAgo', { count: days });
    if (days < 30) return t('time.weeksAgo', { count: Math.floor(days / 7) });
    return t('time.monthsAgo', { count: Math.floor(days / 30) });
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <FaSync className="spin" /> {t('adminSecurity.deviceHistory.loadingHistory')}
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
          <FaFingerprint /> {t('admin.security.deviceHistory', 'Device History')}
        </Title>
        <RefreshButton onClick={fetchData}>
          <FaSync />
        </RefreshButton>
      </Header>

      <Summary>
        <SummaryItem>
          <SummaryLabel>{t('admin.security.currentDevices', 'Current Devices')}</SummaryLabel>
          <SummaryValue>{data.currentDevices?.length || 0}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>{t('admin.security.totalEverSeen', 'Total Ever Seen')}</SummaryLabel>
          <SummaryValue>{data.totalDevicesEverSeen || 0}</SummaryValue>
        </SummaryItem>
      </Summary>

      {data.deviceHistory?.length > 0 ? (
        <DeviceList>
          <AnimatePresence>
            {data.deviceHistory.map((device, index) => (
              <DeviceCard
                key={device.fullFingerprint || index}
                variants={motionVariants.staggerItem}
              >
                <DeviceIcon>
                  <FaDesktop />
                </DeviceIcon>
                <DeviceInfo>
                  <DeviceFingerprint>{device.fingerprint}</DeviceFingerprint>
                  <DeviceMeta>
                    <MetaItem>
                      <strong>{t('admin.security.firstSeen', 'First seen')}:</strong> {formatTimestamp(device.firstSeen)}
                    </MetaItem>
                    <MetaItem>
                      <strong>{t('admin.security.lastSeen', 'Last seen')}:</strong> {formatRelativeTime(device.lastSeen)}
                    </MetaItem>
                    <MetaItem>
                      <strong>{t('admin.security.logins', 'Logins')}:</strong> {device.loginCount || 0}
                    </MetaItem>
                    {device.ipCount > 1 && (
                      <MetaItem $warning>
                        <FaGlobe /> {t('admin.security.differentIPs', '{{count}} different IPs', { count: device.ipCount })}
                      </MetaItem>
                    )}
                  </DeviceMeta>
                </DeviceInfo>
              </DeviceCard>
            ))}
          </AnimatePresence>
        </DeviceList>
      ) : (
        <EmptyState>{t('adminSecurity.deviceHistory.noHistory')}</EmptyState>
      )}

      {data.deviceEvents?.length > 0 && (
        <EventsSection>
          <EventsTitle>
            <FaExclamationTriangle /> {t('adminSecurity.deviceHistory.recentEvents')}
          </EventsTitle>
          <EventsList>
            {data.deviceEvents.slice(0, 10).map((event) => (
              <EventItem key={event.id}>
                <EventType $type={event.type}>
                  {event.type.replace('security.device.', '')}
                </EventType>
                <EventDetails>
                  <span>{event.fingerprint}</span>
                  <EventTime>{formatTimestamp(event.timestamp)}</EventTime>
                </EventDetails>
              </EventItem>
            ))}
          </EventsList>
        </EventsSection>
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

const Summary = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const SummaryItem = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  text-align: center;
  flex: 1;
`;

const SummaryLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const SummaryValue = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const DeviceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const DeviceCard = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
`;

const DeviceIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.primary};
  flex-shrink: 0;
`;

const DeviceInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DeviceFingerprint = styled.div`
  font-family: monospace;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const DeviceMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const MetaItem = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$warning ? theme.colors.warning : theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  
  strong {
    color: ${theme.colors.text};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const EventsSection = styled.div`
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const EventsTitle = styled.h5`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.md} 0;
  
  svg { color: ${theme.colors.warning}; }
`;

const EventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const EventItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.md};
`;

const EventType = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  background: ${props => 
    props.$type?.includes('collision') ? 'rgba(255, 59, 48, 0.15)' :
    props.$type?.includes('mismatch') ? 'rgba(255, 149, 0, 0.15)' :
    'rgba(0, 122, 255, 0.15)'
  };
  color: ${props => 
    props.$type?.includes('collision') ? '#ff3b30' :
    props.$type?.includes('mismatch') ? '#ff9500' :
    '#007aff'
  };
`;

const EventDetails = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  span {
    font-family: monospace;
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.textSecondary};
  }
`;

const EventTime = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

export default DeviceHistoryPanel;

