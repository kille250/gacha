import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaUsers, FaImage, FaFlag, FaTicketAlt, FaCoins, FaFish, FaPlus, FaCloudUploadAlt, FaDownload, FaSync, FaDatabase, FaHdd, FaServer, FaMemory, FaClock } from 'react-icons/fa';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { getSystemHealth } from '../../utils/api';

const AdminDashboard = ({ stats, onQuickAction }) => {
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchHealth = async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      const data = await getSystemHealth();
      setHealthData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Health check error:', err);
      setHealthError(err.response?.data?.error || 'Failed to fetch system health');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 && parts.length < 2) parts.push(`${secs}s`);
    return parts.join(' ') || '0s';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const statCards = [
    { 
      id: 'users', 
      label: 'Total Users', 
      value: stats.totalUsers || 0, 
      icon: FaUsers, 
      color: '#0a84ff',
      gradient: 'linear-gradient(135deg, #0a84ff, #5e5ce6)'
    },
    { 
      id: 'characters', 
      label: 'Characters', 
      value: stats.totalCharacters || 0, 
      icon: FaImage, 
      color: '#30d158',
      gradient: 'linear-gradient(135deg, #30d158, #34c759)'
    },
    { 
      id: 'banners', 
      label: 'Active Banners', 
      value: stats.activeBanners || 0, 
      icon: FaFlag, 
      color: '#ff9f0a',
      gradient: 'linear-gradient(135deg, #ff9f0a, #ff6b35)'
    },
    { 
      id: 'coupons', 
      label: 'Active Coupons', 
      value: stats.activeCoupons || 0, 
      icon: FaTicketAlt, 
      color: '#bf5af2',
      gradient: 'linear-gradient(135deg, #bf5af2, #ff2d55)'
    },
    { 
      id: 'coins', 
      label: 'Total Coins', 
      value: stats.totalCoins?.toLocaleString() || 0, 
      icon: FaCoins, 
      color: '#ffd60a',
      gradient: 'linear-gradient(135deg, #ffd60a, #ff9f0a)'
    },
    { 
      id: 'fish', 
      label: 'Fish Caught', 
      value: stats.totalFish?.toLocaleString() || 0, 
      icon: FaFish, 
      color: '#64d2ff',
      gradient: 'linear-gradient(135deg, #64d2ff, #0a84ff)'
    },
  ];

  const quickActions = [
    { id: 'addCharacter', label: 'Add Character', icon: FaPlus, action: 'character' },
    { id: 'multiUpload', label: 'Multi Upload', icon: FaCloudUploadAlt, action: 'multiUpload' },
    { id: 'animeImport', label: 'Anime Import', icon: FaDownload, action: 'animeImport' },
    { id: 'addBanner', label: 'New Banner', icon: FaFlag, action: 'banner' },
    { id: 'addCoupon', label: 'New Coupon', icon: FaTicketAlt, action: 'coupon' },
  ];

  return (
    <DashboardContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <SectionTitle>
        <TitleIcon>📊</TitleIcon>
        Overview
      </SectionTitle>
      
      <StatsGrid>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <StatCard
              key={stat.id}
              variants={motionVariants.staggerItem}
              whileHover={{ y: -4, scale: 1.02 }}
              $gradient={stat.gradient}
            >
              <StatIcon $color={stat.color}>
                <Icon />
              </StatIcon>
              <StatContent>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{stat.label}</StatLabel>
              </StatContent>
              <StatGlow $color={stat.color} />
            </StatCard>
          );
        })}
      </StatsGrid>
      
      <SectionTitle style={{ marginTop: theme.spacing.xl }}>
        <TitleIcon>⚡</TitleIcon>
        Quick Actions
      </SectionTitle>
      
      <QuickActionsGrid>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <QuickActionButton
              key={action.id}
              onClick={() => onQuickAction(action.action)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <QuickActionIcon><Icon /></QuickActionIcon>
              <span>{action.label}</span>
            </QuickActionButton>
          );
        })}
      </QuickActionsGrid>
      
      <SystemStatusSection>
        <SectionHeader>
          <SectionTitle>
            <TitleIcon>🖥️</TitleIcon>
            System Status
          </SectionTitle>
          <RefreshButton onClick={fetchHealth} disabled={healthLoading}>
            <FaSync className={healthLoading ? 'spinning' : ''} />
            {lastRefresh && (
              <RefreshTime>
                Updated {lastRefresh.toLocaleTimeString()}
              </RefreshTime>
            )}
          </RefreshButton>
        </SectionHeader>

        {healthError ? (
          <ErrorBox>
            <span>⚠️ {healthError}</span>
            <RetryButton onClick={fetchHealth}>Retry</RetryButton>
          </ErrorBox>
        ) : healthLoading && !healthData ? (
          <LoadingBox>Loading system status...</LoadingBox>
        ) : healthData && (
          <StatusGrid>
            {/* Server Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#30d158"><FaServer /></StatusIcon>
                <StatusTitle>Server</StatusTitle>
                <StatusBadge $status={healthData.server?.status === 'online' ? 'success' : 'error'}>
                  {healthData.server?.status || 'unknown'}
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <StatusRow>
                  <FaClock />
                  <span>Uptime</span>
                  <strong>{formatUptime(healthData.server?.uptime)}</strong>
                </StatusRow>
                <StatusRow>
                  <span>Node</span>
                  <strong>{healthData.server?.nodeVersion || 'N/A'}</strong>
                </StatusRow>
                <StatusRow>
                  <span>Platform</span>
                  <strong>{healthData.server?.platform} ({healthData.server?.arch})</strong>
                </StatusRow>
              </StatusDetails>
            </StatusCard>

            {/* Database Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#0a84ff"><FaDatabase /></StatusIcon>
                <StatusTitle>Database</StatusTitle>
                <StatusBadge $status={healthData.database?.status === 'connected' ? 'success' : 'error'}>
                  {healthData.database?.status || 'unknown'}
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <StatusRow>
                  <span>Response Time</span>
                  <strong>{healthData.database?.responseTime ? `${healthData.database.responseTime}ms` : 'N/A'}</strong>
                </StatusRow>
                <StatusRow>
                  <span>Dialect</span>
                  <strong>{healthData.database?.dialect || 'N/A'}</strong>
                </StatusRow>
                <StatusRow>
                  <span>Active Today</span>
                  <strong>{healthData.stats?.activeToday || 0} users</strong>
                </StatusRow>
              </StatusDetails>
            </StatusCard>

            {/* Storage Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#ff9f0a"><FaHdd /></StatusIcon>
                <StatusTitle>Storage</StatusTitle>
                <StatusBadge $status={healthData.storage?.status === 'available' ? 'success' : 'warning'}>
                  {healthData.storage?.status || 'unknown'}
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <StatusRow>
                  <span>Writable</span>
                  <strong>{healthData.storage?.writable ? '✅ Yes' : '❌ No'}</strong>
                </StatusRow>
                {healthData.storage?.directories && Object.entries(healthData.storage.directories).map(([dir, info]) => (
                  <StatusRow key={dir}>
                    <span>/{dir}</span>
                    <strong>{info.exists ? `${info.fileCount} files` : 'Missing'}</strong>
                  </StatusRow>
                ))}
              </StatusDetails>
            </StatusCard>

            {/* Memory Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#bf5af2"><FaMemory /></StatusIcon>
                <StatusTitle>Memory</StatusTitle>
                <StatusBadge $status={
                  healthData.memory?.usagePercent < 70 ? 'success' : 
                  healthData.memory?.usagePercent < 85 ? 'warning' : 'error'
                }>
                  {healthData.memory?.usagePercent || 0}% used
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <MemoryBar>
                  <MemoryUsed $percent={healthData.memory?.usagePercent || 0} />
                </MemoryBar>
                <StatusRow>
                  <span>Used</span>
                  <strong>{formatBytes(healthData.memory?.used)}</strong>
                </StatusRow>
                <StatusRow>
                  <span>Free</span>
                  <strong>{formatBytes(healthData.memory?.free)}</strong>
                </StatusRow>
                <StatusRow>
                  <span>Total</span>
                  <strong>{formatBytes(healthData.memory?.total)}</strong>
                </StatusRow>
              </StatusDetails>
            </StatusCard>
          </StatusGrid>
        )}
      </SystemStatusSection>
    </DashboardContainer>
  );
};

const DashboardContainer = styled(motion.div)`
  padding: 0 ${theme.spacing.md};
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  margin: 0 0 ${theme.spacing.lg};
  color: ${theme.colors.text};
`;

const TitleIcon = styled.span`
  font-size: 24px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const StatCard = styled(motion.div)`
  position: relative;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  overflow: hidden;
  cursor: default;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$gradient};
  }
`;

const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color};
  font-size: 20px;
  margin-bottom: ${theme.spacing.md};
`;

const StatContent = styled.div`
  position: relative;
  z-index: 1;
`;

const StatValue = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
`;

const StatGlow = styled.div`
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  background: ${props => props.$color}15;
  border-radius: 50%;
  filter: blur(20px);
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const QuickActionButton = styled(motion.button)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${theme.colors.surface};
    border-color: ${theme.colors.primary};
  }
`;

const QuickActionIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: ${theme.radius.lg};
  color: white;
  font-size: 20px;
`;

const SystemStatusSection = styled.div`
  margin-top: ${theme.spacing.xl};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  
  ${SectionTitle} {
    margin-bottom: 0;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.surface};
    color: ${theme.colors.text};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const RefreshTime = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.error};
`;

const RetryButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.error};
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
`;

const LoadingBox = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatusCard = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const StatusIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  border-radius: ${theme.radius.md};
  color: ${props => props.$color};
  font-size: 16px;
`;

const StatusTitle = styled.span`
  flex: 1;
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const StatusBadge = styled.span`
  padding: 4px 10px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  
  background: ${props => 
    props.$status === 'success' ? 'rgba(48, 209, 88, 0.15)' :
    props.$status === 'warning' ? 'rgba(255, 159, 10, 0.15)' :
    'rgba(255, 59, 48, 0.15)'
  };
  color: ${props => 
    props.$status === 'success' ? theme.colors.success :
    props.$status === 'warning' ? theme.colors.warning :
    theme.colors.error
  };
  border: 1px solid ${props => 
    props.$status === 'success' ? 'rgba(48, 209, 88, 0.3)' :
    props.$status === 'warning' ? 'rgba(255, 159, 10, 0.3)' :
    'rgba(255, 59, 48, 0.3)'
  };
`;

const StatusDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${theme.fontSizes.sm};
  
  span {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.xs};
    color: ${theme.colors.textSecondary};
    
    svg { font-size: 12px; }
  }
  
  strong {
    color: ${theme.colors.text};
    font-weight: ${theme.fontWeights.medium};
  }
`;

const MemoryBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  overflow: hidden;
  margin-bottom: ${theme.spacing.sm};
`;

const MemoryUsed = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => 
    props.$percent < 70 ? theme.colors.success :
    props.$percent < 85 ? theme.colors.warning :
    theme.colors.error
  };
  border-radius: ${theme.radius.full};
  transition: width 0.5s ease;
`;

export default AdminDashboard;
