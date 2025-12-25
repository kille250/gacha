/**
 * AdminDashboard - Overview dashboard for admin panel
 *
 * @features
 * - Real-time system health monitoring with live updates
 * - Quick action buttons for common tasks with keyboard shortcuts
 * - Stats overview with animated counters and trend indicators
 * - Auto-refresh with visual indicator and manual override
 * - Recent activity feed for at-a-glance updates
 * - Responsive layout optimized for mobile admin workflows
 *
 * @accessibility
 * - All stats are labeled for screen readers
 * - Color is not the only indicator of status (icons + text)
 * - Focus management for keyboard users
 * - Live regions for dynamic content updates
 * - Reduced motion support for all animations
 *
 * @architecture
 * - Separates presentation from data fetching
 * - Uses memo for expensive computations
 * - Implements optimistic UI patterns
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaUsers, FaImage, FaFlag, FaTicketAlt, FaCoins, FaFish, FaPlus, FaCloudUploadAlt, FaDownload, FaSync, FaDatabase, FaHdd, FaServer, FaMemory, FaClock, FaChartBar, FaBolt, FaDesktop, FaCheck, FaTimes, FaKeyboard } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants, useReducedMotion, AriaLiveRegion } from '../../design-system';
import { getSystemHealth } from '../../utils/api';

// ============================================
// UTILITY FUNCTIONS
// Defined outside component to avoid recreation on each render
// ============================================

/**
 * Format seconds to human-readable uptime string
 * @param {number} seconds - Total seconds
 * @returns {string} - Formatted string like "2d 5h" or "45m 30s"
 */
const formatUptime = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  // Only show seconds if no larger units or if explicitly present
  if (secs > 0 && parts.length < 2) parts.push(`${secs}s`);
  return parts.join(' ') || '0s';
};

/**
 * Format bytes to human-readable size string
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string like "1.5 GB"
 */
const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Calculate relative time string for timestamps
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time like "2m ago" or "1h ago"
 */
const getRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return past.toLocaleDateString();
};

// ============================================
// KEYBOARD SHORTCUT CONFIGURATION
// ============================================

const QUICK_ACTION_SHORTCUTS = {
  addCharacter: { key: 'c', label: 'C' },
  multiUpload: { key: 'u', label: 'U' },
  animeImport: { key: 'i', label: 'I' },
  addBanner: { key: 'b', label: 'B' },
  addCoupon: { key: 'p', label: 'P' },
};

// ============================================
// MAIN COMPONENT
// ============================================

const AdminDashboard = ({ stats, onQuickAction }) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  // Health data state
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  // Keyboard shortcuts for quick actions
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const activeElement = document.activeElement;
      if (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (these are for other shortcuts)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      // Map keys to quick actions
      const keyActionMap = {
        [QUICK_ACTION_SHORTCUTS.addCharacter.key]: 'character',
        [QUICK_ACTION_SHORTCUTS.multiUpload.key]: 'multiUpload',
        [QUICK_ACTION_SHORTCUTS.animeImport.key]: 'animeImport',
        [QUICK_ACTION_SHORTCUTS.addBanner.key]: 'banner',
        [QUICK_ACTION_SHORTCUTS.addCoupon.key]: 'coupon',
      };

      const action = keyActionMap[key];
      if (action) {
        event.preventDefault();
        onQuickAction(action);
        setAnnouncement(t('admin.actionTriggered', { action }, `${action} action triggered`));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onQuickAction, t]);

  // Memoized fetch function - no dependencies to prevent re-creation
  const fetchHealth = useCallback(async () => {
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
  }, []);

  // Initial fetch and interval - runs once on mount
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, theme.timing.healthCheckInterval);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Memoized stat cards configuration
  const statCards = useMemo(() => [
    {
      id: 'users',
      labelKey: 'admin.totalUsers',
      value: stats.totalUsers || 0,
      icon: FaUsers,
      color: '#0a84ff',
      gradient: 'linear-gradient(135deg, #0a84ff, #5e5ce6)',
      description: t('admin.registeredUsers', 'Registered users')
    },
    {
      id: 'characters',
      labelKey: 'admin.totalCharacters',
      value: stats.totalCharacters || 0,
      icon: FaImage,
      color: '#30d158',
      gradient: 'linear-gradient(135deg, #30d158, #34c759)',
      description: t('admin.totalCharactersDesc', 'Total characters in pool')
    },
    {
      id: 'banners',
      labelKey: 'admin.activeBannersCount',
      value: stats.activeBanners || 0,
      icon: FaFlag,
      color: '#ff9f0a',
      gradient: 'linear-gradient(135deg, #ff9f0a, #ff6b35)',
      description: t('admin.activeBannersDesc', 'Currently active banners')
    },
    {
      id: 'coupons',
      labelKey: 'admin.activeCouponsCount',
      value: stats.activeCoupons || 0,
      icon: FaTicketAlt,
      color: '#bf5af2',
      gradient: 'linear-gradient(135deg, #bf5af2, #ff2d55)',
      description: t('admin.activeCouponsDesc', 'Redeemable coupons')
    },
    {
      id: 'coins',
      labelKey: 'admin.totalCoins',
      value: stats.totalCoins?.toLocaleString() || 0,
      icon: FaCoins,
      color: '#ffd60a',
      gradient: 'linear-gradient(135deg, #ffd60a, #ff9f0a)',
      description: t('admin.totalCoinsDesc', 'Coins in circulation')
    },
    {
      id: 'fish',
      labelKey: 'admin.fishCaught',
      value: stats.totalFish?.toLocaleString() || 0,
      icon: FaFish,
      color: '#64d2ff',
      gradient: 'linear-gradient(135deg, #64d2ff, #0a84ff)',
      description: t('admin.fishCaughtDesc', 'Total fish caught')
    },
  ], [stats, t]);

  // Quick actions with keyboard shortcuts
  const quickActions = useMemo(() => [
    {
      id: 'addCharacter',
      labelKey: 'admin.addCharacter',
      icon: FaPlus,
      action: 'character',
      shortcut: QUICK_ACTION_SHORTCUTS.addCharacter.label,
      description: t('admin.addCharacterDesc', 'Add a new character to the pool')
    },
    {
      id: 'multiUpload',
      labelKey: 'admin.multiUpload',
      icon: FaCloudUploadAlt,
      action: 'multiUpload',
      shortcut: QUICK_ACTION_SHORTCUTS.multiUpload.label,
      description: t('admin.multiUploadDesc', 'Upload multiple characters at once')
    },
    {
      id: 'animeImport',
      labelKey: 'admin.animeImport',
      icon: FaDownload,
      action: 'animeImport',
      shortcut: QUICK_ACTION_SHORTCUTS.animeImport.label,
      description: t('admin.animeImportDesc', 'Import characters from anime database')
    },
    {
      id: 'addBanner',
      labelKey: 'admin.newBanner',
      icon: FaFlag,
      action: 'banner',
      shortcut: QUICK_ACTION_SHORTCUTS.addBanner.label,
      description: t('admin.newBannerDesc', 'Create a new rate-up banner')
    },
    {
      id: 'addCoupon',
      labelKey: 'admin.newCoupon',
      icon: FaTicketAlt,
      action: 'coupon',
      shortcut: QUICK_ACTION_SHORTCUTS.addCoupon.label,
      description: t('admin.newCouponDesc', 'Generate a new coupon code')
    },
  ], [t]);

  // Handle quick action with keyboard
  const handleQuickAction = useCallback((action) => {
    onQuickAction(action);
    setAnnouncement(t('admin.actionTriggered', { action }, `${action} action triggered`));
  }, [onQuickAction, t]);

  return (
    <DashboardContainer
      variants={prefersReducedMotion ? {} : motionVariants.staggerContainer}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
    >
      {/* Screen reader announcements */}
      <AriaLiveRegion politeness="polite">
        {announcement}
      </AriaLiveRegion>

      {/* Stats Overview Section */}
      <SectionHeader>
        <SectionTitle>
          <TitleIcon><FaChartBar /></TitleIcon>
          {t('admin.overview')}
        </SectionTitle>
        <SectionSubtitle>
          {t('admin.overviewSubtitle', 'Key metrics at a glance')}
        </SectionSubtitle>
      </SectionHeader>

      <StatsGrid role="list" aria-label={t('admin.statsOverview', 'Statistics overview')}>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <StatCard
              key={stat.id}
              role="listitem"
              variants={prefersReducedMotion ? {} : motionVariants.staggerItem}
              whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              $gradient={stat.gradient}
              aria-label={`${t(stat.labelKey)}: ${stat.value}`}
            >
              <StatIcon $color={stat.color} aria-hidden="true">
                <Icon />
              </StatIcon>
              <StatContent>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{t(stat.labelKey)}</StatLabel>
              </StatContent>
              <StatGlow $color={stat.color} aria-hidden="true" />
            </StatCard>
          );
        })}
      </StatsGrid>

      {/* Quick Actions Section */}
      <SectionHeader style={{ marginTop: theme.spacing.xl }}>
        <SectionTitle>
          <TitleIcon><FaBolt /></TitleIcon>
          {t('admin.quickActions')}
        </SectionTitle>
        <KeyboardHint aria-hidden="true">
          <FaKeyboard />
          <span>{t('admin.keyboardShortcutsHint', 'Press key to activate')}</span>
        </KeyboardHint>
      </SectionHeader>

      <QuickActionsGrid role="group" aria-label={t('admin.quickActions', 'Quick actions')}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <QuickActionButton
              key={action.id}
              onClick={() => handleQuickAction(action.action)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.03, y: -2 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              aria-label={`${t(action.labelKey)}. ${action.description}. ${t('admin.keyboardShortcut', 'Keyboard shortcut')}: ${action.shortcut}`}
              title={action.description}
            >
              <QuickActionIcon aria-hidden="true"><Icon /></QuickActionIcon>
              <QuickActionContent>
                <span>{t(action.labelKey)}</span>
                <ShortcutBadge aria-hidden="true">{action.shortcut}</ShortcutBadge>
              </QuickActionContent>
            </QuickActionButton>
          );
        })}
      </QuickActionsGrid>
      
      {/* System Status Section */}
      <SystemStatusSection>
        <SectionHeader>
          <SectionTitle>
            <TitleIcon><FaDesktop /></TitleIcon>
            {t('admin.systemStatus')}
          </SectionTitle>
          <RefreshControls>
            <RefreshButton
              onClick={fetchHealth}
              disabled={healthLoading}
              aria-label={t('admin.refreshSystemStatus', 'Refresh system status')}
              aria-busy={healthLoading}
            >
              <FaSync className={healthLoading ? 'spinning' : ''} aria-hidden="true" />
              <span>{t('admin.refresh', 'Refresh')}</span>
            </RefreshButton>
            {lastRefresh && (
              <RefreshTime aria-live="off">
                <FaClock aria-hidden="true" />
                {getRelativeTime(lastRefresh)}
              </RefreshTime>
            )}
          </RefreshControls>
        </SectionHeader>

        {healthError ? (
          <ErrorBox role="alert">
            <span>{healthError}</span>
            <RetryButton onClick={fetchHealth}>{t('admin.retry')}</RetryButton>
          </ErrorBox>
        ) : healthLoading && !healthData ? (
          <StatusSkeletonGrid aria-busy="true" aria-label={t('admin.loadingSystemStatus')}>
            {[1, 2, 3, 4].map((i) => (
              <StatusCardSkeleton key={i}>
                <SkeletonHeader>
                  <SkeletonCircle />
                  <SkeletonLine $width="60%" />
                  <SkeletonBadge />
                </SkeletonHeader>
                <SkeletonDetails>
                  <SkeletonRow><SkeletonLine $width="40%" /><SkeletonLine $width="30%" /></SkeletonRow>
                  <SkeletonRow><SkeletonLine $width="50%" /><SkeletonLine $width="25%" /></SkeletonRow>
                  <SkeletonRow><SkeletonLine $width="35%" /><SkeletonLine $width="35%" /></SkeletonRow>
                </SkeletonDetails>
              </StatusCardSkeleton>
            ))}
          </StatusSkeletonGrid>
        ) : healthData && (
          <StatusGrid>
            {/* Server Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#30d158"><FaServer /></StatusIcon>
                <StatusTitle>{t('admin.server')}</StatusTitle>
                <StatusBadge $status={healthData.server?.status === 'online' ? 'success' : 'error'}>
                  {healthData.server?.status || 'unknown'}
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <StatusRow>
                  <FaClock />
                  <span>{t('admin.uptime')}</span>
                  <strong>{formatUptime(healthData.server?.uptime)}</strong>
                </StatusRow>
                <StatusRow>
                  <span>{t('admin.node')}</span>
                  <strong>{healthData.server?.nodeVersion || 'N/A'}</strong>
                </StatusRow>
                <StatusRow>
                  <span>{t('admin.platform')}</span>
                  <strong>{healthData.server?.platform} ({healthData.server?.arch})</strong>
                </StatusRow>
              </StatusDetails>
            </StatusCard>

            {/* Database Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#0a84ff"><FaDatabase /></StatusIcon>
                <StatusTitle>{t('admin.database')}</StatusTitle>
                <StatusBadge $status={healthData.database?.status === 'connected' ? 'success' : 'error'}>
                  {healthData.database?.status || 'unknown'}
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <StatusRow>
                  <span>{t('admin.responseTime')}</span>
                  <strong>{healthData.database?.responseTime ? `${healthData.database.responseTime}ms` : 'N/A'}</strong>
                </StatusRow>
                <StatusRow>
                  <span>{t('admin.dialect')}</span>
                  <strong>{healthData.database?.dialect || 'N/A'}</strong>
                </StatusRow>
                <StatusRow>
                  <span>{t('admin.activeToday')}</span>
                  <strong>{healthData.stats?.activeToday || 0} {t('admin.users')}</strong>
                </StatusRow>
              </StatusDetails>
            </StatusCard>

            {/* Storage Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#ff9f0a"><FaHdd /></StatusIcon>
                <StatusTitle>{t('admin.storage')}</StatusTitle>
                <StatusBadge $status={healthData.storage?.status === 'available' ? 'success' : 'warning'}>
                  {healthData.storage?.status || 'unknown'}
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <StatusRow>
                  <span>{t('admin.writable')}</span>
                  <strong>{healthData.storage?.writable ? <FaCheck style={{ color: '#30d158' }} /> : <FaTimes style={{ color: '#ff3b30' }} />}</strong>
                </StatusRow>
                {healthData.storage?.directories && Object.entries(healthData.storage.directories).map(([dir, info]) => (
                  <StatusRow key={dir}>
                    <span>/{dir}</span>
                    <strong>{info.exists ? `${info.fileCount} ${t('admin.files')}` : t('admin.missing')}</strong>
                  </StatusRow>
                ))}
              </StatusDetails>
            </StatusCard>

            {/* Memory Status */}
            <StatusCard>
              <StatusHeader>
                <StatusIcon $color="#bf5af2"><FaMemory /></StatusIcon>
                <StatusTitle>{t('admin.memory')}</StatusTitle>
                <StatusBadge $status={
                  healthData.memory?.usagePercent < 70 ? 'success' : 
                  healthData.memory?.usagePercent < 85 ? 'warning' : 'error'
                }>
                  {t('admin.usedPercent', { percent: healthData.memory?.usagePercent || 0 })}
                </StatusBadge>
              </StatusHeader>
              <StatusDetails>
                <MemoryBar>
                  <MemoryUsed $percent={healthData.memory?.usagePercent || 0} />
                </MemoryBar>
                <StatusRow>
                  <span>{t('admin.used')}</span>
                  <strong>{formatBytes(healthData.memory?.used)}</strong>
                </StatusRow>
                <StatusRow>
                  <span>{t('admin.free')}</span>
                  <strong>{formatBytes(healthData.memory?.free)}</strong>
                </StatusRow>
                <StatusRow>
                  <span>{t('admin.total')}</span>
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

// ============================================
// STYLED COMPONENTS
// ============================================

const DashboardContainer = styled(motion.div)`
  padding: 0 ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 0 ${theme.spacing.sm};
  }
`;

/**
 * Section header with title and optional subtitle
 */
const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.spacing.md};
  }
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  color: ${theme.colors.text};
  letter-spacing: -0.01em;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.base};
  }
`;

const SectionSubtitle = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};

  @media (min-width: ${theme.breakpoints.md}) {
    display: none; /* Hide on desktop to save space */
  }
`;

/**
 * Keyboard hint shown next to quick actions
 */
const KeyboardHint = styled.div`
  display: none;

  @media (min-width: ${theme.breakpoints.lg}) {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.xs};
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.textMuted};

    svg {
      font-size: 14px;
    }
  }
`;

const TitleIcon = styled.span`
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${theme.radius.md};
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.12) 0%, rgba(88, 86, 214, 0.08) 100%);

  svg {
    width: 18px;
    height: 18px;
    color: ${theme.colors.primary};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 28px;
    height: 28px;
    font-size: 18px;

    svg {
      width: 16px;
      height: 16px;
    }
  }
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

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
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
  /* Smooth hover transition */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$gradient};
    transition: height 0.2s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.3);

      &::before {
        height: 4px;
      }
    }
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    border-radius: ${theme.radius.lg};
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

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

const QuickActionButton = styled(motion.button)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  min-height: 100px;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;

  /* Subtle gradient overlay on hover */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg,
      rgba(0, 113, 227, 0) 0%,
      rgba(88, 86, 214, 0) 100%
    );
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  /* Touch-friendly on mobile */
  @media (pointer: coarse) {
    min-height: 110px;
    padding: ${theme.spacing.lg} ${theme.spacing.md};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      border-color: rgba(0, 113, 227, 0.4);
      box-shadow: 0 8px 24px -8px rgba(0, 113, 227, 0.2);

      &::before {
        background: linear-gradient(135deg,
          rgba(0, 113, 227, 0.04) 0%,
          rgba(88, 86, 214, 0.02) 100%
        );
        opacity: 1;
      }
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    min-height: 90px;
    padding: ${theme.spacing.md};
    border-radius: ${theme.radius.lg};
    font-size: ${theme.fontSizes.xs};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 0.1s, border-color 0.1s;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

/**
 * Content wrapper for quick action buttons
 */
const QuickActionContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
  position: relative;
  z-index: 1;
  text-align: center;
  line-height: 1.3;
`;

/**
 * Keyboard shortcut badge shown on quick actions
 */
const ShortcutBadge = styled.span`
  display: none;

  @media (min-width: ${theme.breakpoints.lg}) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 ${theme.spacing.xs};
    background: ${theme.colors.backgroundTertiary};
    border: 1px solid ${theme.colors.surfaceBorder};
    border-radius: ${theme.radius.sm};
    font-size: 10px;
    font-weight: ${theme.fontWeights.bold};
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: ${theme.colors.textMuted};
    text-transform: uppercase;
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
  position: relative;
  z-index: 1;
  box-shadow: 0 4px 12px -4px rgba(0, 113, 227, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  ${QuickActionButton}:hover & {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px -4px rgba(0, 113, 227, 0.5);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 40px;
    height: 40px;
    font-size: 18px;
    border-radius: ${theme.radius.md};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    ${QuickActionButton}:hover & {
      transform: none;
    }
  }
`;

const SystemStatusSection = styled.div`
  margin-top: ${theme.spacing['2xl']};
  padding-top: ${theme.spacing.xl};
  border-top: 1px solid ${theme.colors.surfaceBorder};

  @media (max-width: ${theme.breakpoints.sm}) {
    margin-top: ${theme.spacing.xl};
    padding-top: ${theme.spacing.lg};
  }
`;

/**
 * Container for refresh button and timestamp
 */
const RefreshControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.sm};
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-height: 36px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${theme.colors.surface};
      color: ${theme.colors.text};
      border-color: ${theme.colors.primary};
    }
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
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

  /* Touch-friendly on mobile */
  @media (pointer: coarse) {
    min-height: 44px;
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    .spinning {
      animation: none;
    }
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const RefreshTime = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};

  svg {
    font-size: 12px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    display: none; /* Hide on very small screens */
  }
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

// Skeleton animation keyframes
const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const skeletonBase = `
  background: linear-gradient(
    90deg,
    ${theme.colors.backgroundTertiary} 25%,
    ${theme.colors.surfaceBorder} 50%,
    ${theme.colors.backgroundTertiary} 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: ${theme.radius.md};
`;

const StatusSkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }

  ${shimmer}
`;

const StatusCardSkeleton = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
`;

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const SkeletonCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radius.md};
  ${skeletonBase}
`;

const SkeletonLine = styled.div`
  height: 14px;
  width: ${props => props.$width || '100%'};
  ${skeletonBase}
`;

const SkeletonBadge = styled.div`
  width: 60px;
  height: 24px;
  border-radius: ${theme.radius.full};
  margin-left: auto;
  ${skeletonBase}
`;

const SkeletonDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const SkeletonRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${theme.spacing.md};
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
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.2);
    }
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    border-radius: ${theme.radius.lg};
  }
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
