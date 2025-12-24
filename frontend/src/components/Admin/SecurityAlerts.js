/**
 * SecurityAlerts.js
 * 
 * Real-time security alerts widget for admin dashboard.
 * Shows recent security events, anomalies, and policy denials.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBell, FaExclamationCircle, FaShieldAlt, FaUserSecret,
  FaLock, FaSync, FaClock, FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { getSecurityAlerts } from '../../utils/api';
import { SEVERITY_COLORS } from '../../constants/securityConstants';

const ALERT_ICONS = {
  'security': FaShieldAlt,
  'anomaly': FaExclamationCircle,
  'policy': FaLock,
  'auth': FaUserSecret,
};

const SecurityAlerts = ({ maxAlerts = 10, autoRefresh = true, refreshInterval = 30000 }) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const data = await getSecurityAlerts({ limit: maxAlerts });
      setAlerts(data.alerts || []);
      setSummary(data.summary || null);
      setLastFetch(new Date());
    } catch (err) {
      console.error('Failed to fetch security alerts:', err);
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [maxAlerts]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAlerts]);

  const getAlertIcon = (eventType) => {
    const category = eventType.split('.')[0];
    return ALERT_ICONS[category] || FaBell;
  };

  const formatEventType = (eventType) => {
    // Convert 'security.device.collision' to 'Device Collision'
    const parts = eventType.split('.');
    return parts.slice(1).map(p => 
      p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ')
    ).join(' ');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const criticalCount = summary?.bySeverity?.critical || 0;
  const warningCount = summary?.bySeverity?.warning || 0;

  return (
    <AlertsContainer
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
    >
      <AlertsHeader onClick={() => setExpanded(!expanded)}>
        <HeaderLeft>
          <AlertIcon $hasCritical={criticalCount > 0}>
            <FaBell />
            {criticalCount > 0 && <CriticalBadge>{criticalCount}</CriticalBadge>}
          </AlertIcon>
          <HeaderTitle>
            {t('admin.security.securityAlerts', 'Security Alerts')}
          </HeaderTitle>
          <AlertCounts>
            {criticalCount > 0 && (
              <CountBadge $severity="critical">{criticalCount} {t('admin.security.critical')}</CountBadge>
            )}
            {warningCount > 0 && (
              <CountBadge $severity="warning">{warningCount} {t('admin.security.warnings')}</CountBadge>
            )}
          </AlertCounts>
        </HeaderLeft>
        <HeaderRight>
          {lastFetch && (
            <LastUpdated>
              <FaClock /> {formatTime(lastFetch)}
            </LastUpdated>
          )}
          <RefreshButton onClick={(e) => { e.stopPropagation(); fetchAlerts(); }} disabled={loading}>
            <FaSync className={loading ? 'spinning' : ''} />
          </RefreshButton>
          <ExpandButton>
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </ExpandButton>
        </HeaderRight>
      </AlertsHeader>

      <AnimatePresence>
        {expanded && (
          <AlertsContent
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error ? (
              <ErrorState>
                <FaExclamationCircle /> {error}
              </ErrorState>
            ) : alerts.length === 0 ? (
              <EmptyState>
                <FaShieldAlt />
                <span>{t('admin.security.noAlerts', 'No security alerts')}</span>
              </EmptyState>
            ) : (
              <AlertsList>
                {alerts.map((alert) => {
                  const Icon = getAlertIcon(alert.eventType);
                  return (
                    <AlertItem
                      key={alert.id}
                      $severity={alert.severity}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <AlertItemIcon $severity={alert.severity}>
                        <Icon />
                      </AlertItemIcon>
                      <AlertItemContent>
                        <AlertItemHeader>
                          <AlertType>{formatEventType(alert.eventType)}</AlertType>
                          <AlertTime>{formatTime(alert.createdAt)}</AlertTime>
                        </AlertItemHeader>
                        <AlertDetails>
                          {alert.username && <span>User: <strong>{alert.username}</strong></span>}
                          {alert.data?.reason && <span>• {alert.data.reason}</span>}
                          {alert.data?.policy && <span>• Policy: {alert.data.policy}</span>}
                        </AlertDetails>
                      </AlertItemContent>
                      <SeverityIndicator $severity={alert.severity} />
                    </AlertItem>
                  );
                })}
              </AlertsList>
            )}
          </AlertsContent>
        )}
      </AnimatePresence>
    </AlertsContainer>
  );
};

const AlertsContainer = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  margin-bottom: ${theme.spacing.lg};
`;

const AlertsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: ${theme.colors.backgroundTertiary};
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const AlertIcon = styled.div`
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$hasCritical 
    ? 'rgba(255, 59, 48, 0.15)' 
    : 'rgba(255, 149, 0, 0.15)'};
  border-radius: ${theme.radius.md};
  color: ${props => props.$hasCritical ? '#ff3b30' : '#ff9500'};
  font-size: 16px;
`;

const CriticalBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #ff3b30;
  color: white;
  font-size: 10px;
  font-weight: bold;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const AlertCounts = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const CountBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  background: ${props => `${SEVERITY_COLORS[props.$severity]}20`};
  color: ${props => SEVERITY_COLORS[props.$severity]};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const LastUpdated = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  padding: ${theme.spacing.xs};
  cursor: pointer;
  border-radius: ${theme.radius.md};
  transition: all 0.2s;
  
  &:hover {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.primary};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ExpandButton = styled.div`
  color: ${theme.colors.textSecondary};
  padding: ${theme.spacing.xs};
`;

const AlertsContent = styled(motion.div)`
  overflow: hidden;
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const AlertsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const AlertItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  position: relative;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${theme.colors.backgroundTertiary};
  }
`;

const AlertItemIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => `${SEVERITY_COLORS[props.$severity] || SEVERITY_COLORS.info}15`};
  border-radius: ${theme.radius.md};
  color: ${props => SEVERITY_COLORS[props.$severity] || SEVERITY_COLORS.info};
  font-size: 14px;
  flex-shrink: 0;
`;

const AlertItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const AlertItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xs};
`;

const AlertType = styled.span`
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
`;

const AlertTime = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const AlertDetails = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  
  strong {
    color: ${theme.colors.text};
  }
`;

const SeverityIndicator = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: ${props => SEVERITY_COLORS[props.$severity] || 'transparent'};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  
  svg {
    font-size: 24px;
    color: ${theme.colors.success};
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  color: ${theme.colors.error};
  
  svg {
    font-size: 18px;
  }
`;

export default SecurityAlerts;

