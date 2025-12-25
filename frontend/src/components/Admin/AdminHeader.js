/**
 * AdminHeader - Enhanced admin page header with context awareness
 *
 * Features:
 * - Breadcrumb navigation for deep admin sections
 * - Context-aware title and description
 * - Quick stats summary
 * - Keyboard shortcut indicator
 * - Last updated timestamp
 * - Responsive design with mobile optimization
 *
 * @accessibility
 * - Semantic HTML with proper heading hierarchy
 * - Breadcrumb uses nav with aria-label
 * - Focus management for keyboard users
 * - Screen reader announcements for context changes
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaCog,
  FaChevronRight,
  FaKeyboard,
  FaUsers,
  FaImage,
  FaFlag,
  FaTicketAlt,
  FaStar,
  FaShieldAlt,
  FaChartBar,
  FaClock,
  FaSync
} from 'react-icons/fa';
import { theme, useReducedMotion, AriaLiveRegion } from '../../design-system';

// Tab configuration for breadcrumb and context
const TAB_META = {
  dashboard: {
    icon: FaChartBar,
    labelKey: 'admin.tabs.dashboard',
    descKey: 'admin.descriptions.dashboard',
    color: '#0a84ff'
  },
  users: {
    icon: FaUsers,
    labelKey: 'admin.tabs.users',
    descKey: 'admin.descriptions.users',
    color: '#30d158'
  },
  characters: {
    icon: FaImage,
    labelKey: 'admin.tabs.characters',
    descKey: 'admin.descriptions.characters',
    color: '#bf5af2'
  },
  banners: {
    icon: FaFlag,
    labelKey: 'admin.tabs.banners',
    descKey: 'admin.descriptions.banners',
    color: '#ff9f0a'
  },
  coupons: {
    icon: FaTicketAlt,
    labelKey: 'admin.tabs.coupons',
    descKey: 'admin.descriptions.coupons',
    color: '#ff2d55'
  },
  rarities: {
    icon: FaStar,
    labelKey: 'admin.tabs.rarities',
    descKey: 'admin.descriptions.rarities',
    color: '#ffd60a'
  },
  security: {
    icon: FaShieldAlt,
    labelKey: 'admin.tabs.security',
    descKey: 'admin.descriptions.security',
    color: '#ff3b30'
  }
};

const AdminHeader = ({
  activeTab = 'dashboard',
  stats,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  onShowShortcuts
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  // Get current tab metadata
  const currentMeta = useMemo(() => TAB_META[activeTab] || TAB_META.dashboard, [activeTab]);
  const TabIcon = currentMeta.icon;

  // Format last updated time
  const formattedTime = useMemo(() => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diff = now - lastUpdated;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return t('admin.justNow', 'Just now');
    if (minutes < 60) return t('admin.minutesAgo', '{{count}} min ago', { count: minutes });
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated, t]);

  // Quick stats for the current tab
  const quickStats = useMemo(() => {
    if (!stats) return [];

    switch (activeTab) {
      case 'dashboard':
        return [
          { label: t('admin.users'), value: stats.totalUsers || 0 },
          { label: t('admin.characters'), value: stats.totalCharacters || 0 },
          { label: t('admin.banners'), value: stats.activeBanners || 0 }
        ];
      case 'users':
        return [
          { label: t('admin.total'), value: stats.totalUsers || 0 },
          { label: t('admin.coins'), value: (stats.totalCoins || 0).toLocaleString() }
        ];
      case 'characters':
        return [
          { label: t('admin.total'), value: stats.totalCharacters || 0 }
        ];
      case 'banners':
        return [
          { label: t('admin.active'), value: stats.activeBanners || 0 }
        ];
      case 'coupons':
        return [
          { label: t('admin.active'), value: stats.activeCoupons || 0 }
        ];
      default:
        return [];
    }
  }, [activeTab, stats, t]);

  return (
    <HeaderContainer>
      {/* Screen reader announcement for tab changes */}
      <AriaLiveRegion politeness="polite">
        {t(currentMeta.labelKey)} {t('common.section', 'section')}
      </AriaLiveRegion>

      <HeaderContent>
        {/* Breadcrumb Navigation */}
        <Breadcrumb aria-label={t('admin.breadcrumb', 'Admin navigation')}>
          <BreadcrumbItem>
            <BreadcrumbLink
              as="span"
              $isRoot
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            >
              <FaCog aria-hidden="true" />
              <span>{t('admin.title', 'Admin')}</span>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <AnimatePresence mode="wait">
            {activeTab !== 'dashboard' && (
              <BreadcrumbItem
                key={activeTab}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                <BreadcrumbSeparator aria-hidden="true">
                  <FaChevronRight />
                </BreadcrumbSeparator>
                <BreadcrumbLink
                  as="span"
                  $color={currentMeta.color}
                  aria-current="page"
                >
                  <TabIcon aria-hidden="true" />
                  <span>{t(currentMeta.labelKey)}</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
          </AnimatePresence>
        </Breadcrumb>

        {/* Title and Description */}
        <TitleSection>
          <TitleRow>
            <Title>
              <TitleIcon $color={currentMeta.color}>
                <TabIcon aria-hidden="true" />
              </TitleIcon>
              {t(currentMeta.labelKey)}
            </Title>

            {/* Quick Stats Pills */}
            {quickStats.length > 0 && (
              <QuickStatsRow aria-label={t('admin.quickStats', 'Quick stats')}>
                {quickStats.map((stat, index) => (
                  <StatPill key={index}>
                    <StatValue>{stat.value}</StatValue>
                    <StatLabel>{stat.label}</StatLabel>
                  </StatPill>
                ))}
              </QuickStatsRow>
            )}
          </TitleRow>

          <Description>{t(currentMeta.descKey, '')}</Description>
        </TitleSection>

        {/* Action Row */}
        <ActionRow>
          {/* Last Updated */}
          {formattedTime && (
            <LastUpdated>
              <FaClock aria-hidden="true" />
              <span>{t('admin.lastUpdated', 'Updated')}: {formattedTime}</span>
            </LastUpdated>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <RefreshButton
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={t('admin.refresh', 'Refresh data')}
              title={t('admin.refresh', 'Refresh data')}
            >
              <FaSync className={isRefreshing ? 'spinning' : ''} aria-hidden="true" />
            </RefreshButton>
          )}

          {/* Keyboard Shortcuts Button */}
          {onShowShortcuts && (
            <ShortcutsButton
              onClick={onShowShortcuts}
              aria-label={t('admin.keyboardShortcuts', 'Keyboard shortcuts')}
              title={t('admin.keyboardShortcuts', 'Keyboard shortcuts (Shift + ?)')}
            >
              <FaKeyboard aria-hidden="true" />
              <ShortcutHint>?</ShortcutHint>
            </ShortcutsButton>
          )}
        </ActionRow>
      </HeaderContent>
    </HeaderContainer>
  );
};

// ============================================
// STYLED COMPONENTS
// ============================================

const HeaderContainer = styled.header`
  background: linear-gradient(
    180deg,
    rgba(88, 86, 214, 0.08) 0%,
    rgba(88, 86, 214, 0.02) 60%,
    transparent 100%
  );
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.lg} 0;

  @media (max-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.md} 0;
  }
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.md}) {
    padding: 0 ${theme.spacing.md};
  }
`;

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.md};
`;

const BreadcrumbItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const BreadcrumbSeparator = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.colors.textMuted};
  font-size: 10px;
  margin: 0 ${theme.spacing.xs};
`;

const BreadcrumbLink = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => props.$isRoot ? theme.colors.textSecondary : props.$color || theme.colors.primary};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.md};
  background: ${props => props.$isRoot ? 'transparent' : `${props.$color || theme.colors.primary}15`};
  transition: all ${theme.transitions.fast};

  svg {
    font-size: 14px;
    opacity: 0.9;
  }

  &:hover {
    background: ${theme.colors.hoverOverlay};
  }
`;

const TitleSection = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xs};

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  margin: 0;
  color: ${theme.colors.text};

  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes.xl};
  }
`;

const TitleIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: ${props => `${props.$color || theme.colors.primary}20`};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$color || theme.colors.primary};
  font-size: 20px;

  @media (max-width: ${theme.breakpoints.md}) {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
`;

const Description = styled.p`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  margin: 0;
  max-width: 600px;

  @media (max-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes.xs};
  }
`;

const QuickStatsRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};

  @media (max-width: ${theme.breakpoints.md}) {
    width: 100%;
    overflow-x: auto;
    padding-bottom: ${theme.spacing.xs};
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const StatPill = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  white-space: nowrap;
`;

const StatValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const StatLabel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const LastUpdated = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};

  svg {
    font-size: 12px;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${theme.colors.surface};
    color: ${theme.colors.text};
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
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

const ShortcutsButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.surface};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const ShortcutHint = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  background: ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.sm};
  font-size: 11px;
  font-weight: ${theme.fontWeights.bold};
  font-family: ${theme.fonts.mono};
`;

// PropTypes
AdminHeader.propTypes = {
  /** Currently active tab ID */
  activeTab: PropTypes.oneOf(['dashboard', 'users', 'characters', 'banners', 'coupons', 'rarities', 'security']),
  /** Statistics object for quick stats display */
  stats: PropTypes.shape({
    totalUsers: PropTypes.number,
    totalCharacters: PropTypes.number,
    activeBanners: PropTypes.number,
    activeCoupons: PropTypes.number,
    totalCoins: PropTypes.number
  }),
  /** Date object of last data refresh */
  lastUpdated: PropTypes.instanceOf(Date),
  /** Callback for refresh button */
  onRefresh: PropTypes.func,
  /** Whether data is currently refreshing */
  isRefreshing: PropTypes.bool,
  /** Callback to show keyboard shortcuts modal */
  onShowShortcuts: PropTypes.func
};

export default AdminHeader;
