/**
 * AdminSecurity.js
 *
 * Main security tab container for admin dashboard.
 * Combines security overview, high-risk users, audit log, and appeals.
 *
 * @accessibility
 * - Full keyboard navigation with arrow keys between sub-views
 * - ARIA tablist pattern for view switching
 * - Live region announcements for view changes
 * - Focus management on view transitions
 * - Escape key to close modals
 *
 * @architecture
 * - Centralized state for all security data
 * - Auto-refresh with visibility-aware optimization
 * - Modal stack management with proper focus trapping
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShieldAlt, FaCog, FaBan, FaChevronLeft, FaChevronRight, FaKeyboard } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants, AriaLiveRegion } from '../../design-system';
import { getSecurityOverview, getAppealStats } from '../../utils/api';
import { onVisibilityChange, REFRESH_INTERVALS } from '../../cache';
import { AdminContainer, SectionTitle, SkeletonBox } from './AdminStyles';
import SecurityOverview from './SecurityOverview';
import SecurityAlerts from './SecurityAlerts';
import HighRiskUsersList from './HighRiskUsersList';
import AuditLogViewer from './AuditLogViewer';
import AppealsList from './AppealsList';
import RestrictedUsersList from './RestrictedUsersList';
import SecurityConfigPanel from './SecurityConfigPanel';
import SecurityConfigEditor from './SecurityConfigEditor';
import UserSecurityModal from './UserSecurityModal';
import AppealReviewModal from './AppealReviewModal';
import RiskDecayPanel from './RiskDecayPanel';
import AutoEnforcementViewer from './AutoEnforcementViewer';

const VIEWS = {
  OVERVIEW: 'overview',
  HIGH_RISK: 'highRisk',
  RESTRICTED: 'restricted',
  AUTO_ENFORCE: 'autoEnforce',
  AUDIT: 'audit',
  APPEALS: 'appeals',
  CONFIG: 'config'
};

// View order for keyboard navigation
const VIEW_ORDER = [
  VIEWS.OVERVIEW,
  VIEWS.HIGH_RISK,
  VIEWS.RESTRICTED,
  VIEWS.AUTO_ENFORCE,
  VIEWS.AUDIT,
  VIEWS.APPEALS,
  VIEWS.CONFIG
];

const AdminSecurity = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState(VIEWS.OVERVIEW);
  const [securityData, setSecurityData] = useState(null);
  const [appealStats, setAppealStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  // Refs for focus management
  const tabRefs = useRef({});
  const contentRef = useRef(null);
  const tabsContainerRef = useRef(null);

  // Modal states
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  
  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const [security, appeals] = await Promise.all([
        getSecurityOverview(),
        getAppealStats()
      ]);
      setSecurityData(security);
      setAppealStats(appeals);
    } catch (err) {
      console.error('Failed to fetch security data:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);
  
  // Visibility change handler - refresh security data when tab becomes visible after being hidden
  useEffect(() => {
    return onVisibilityChange('admin-security', (staleLevel, elapsed) => {
      // Refresh if tab was hidden longer than admin staleness threshold
      if (elapsed > REFRESH_INTERVALS.adminStaleThresholdMs) {
        fetchSecurityData();
      }
    });
  }, [fetchSecurityData]);

  // Get view label for announcements
  const getViewLabel = useCallback((view) => {
    const labels = {
      [VIEWS.OVERVIEW]: t('admin.security.overview'),
      [VIEWS.HIGH_RISK]: t('admin.security.highRiskUsers'),
      [VIEWS.RESTRICTED]: t('admin.security.restricted'),
      [VIEWS.AUTO_ENFORCE]: t('admin.security.autoEnforce'),
      [VIEWS.AUDIT]: t('admin.security.auditLog'),
      [VIEWS.APPEALS]: t('admin.security.appeals'),
      [VIEWS.CONFIG]: t('admin.security.config'),
    };
    return labels[view] || view;
  }, [t]);

  // Enhanced view change with announcement
  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
    const label = getViewLabel(view);
    setAnnouncement(`${label} ${t('common.selected', 'selected')}`);

    // Focus content area after view change for better keyboard flow
    setTimeout(() => {
      contentRef.current?.focus();
    }, 100);
  }, [getViewLabel, t]);

  // Keyboard navigation for tabs
  const handleTabKeyDown = useCallback((e, currentViewId) => {
    const currentIndex = VIEW_ORDER.indexOf(currentViewId);
    let nextIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % VIEW_ORDER.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + VIEW_ORDER.length) % VIEW_ORDER.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = VIEW_ORDER.length - 1;
        break;
      default:
        return;
    }

    const nextView = VIEW_ORDER[nextIndex];
    handleViewChange(nextView);
    tabRefs.current[nextView]?.focus();
  }, [handleViewChange]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Escape closes modals in order
      if (e.key === 'Escape') {
        if (showConfigEditor) {
          setShowConfigEditor(false);
        } else if (selectedAppeal) {
          setSelectedAppeal(null);
        } else if (selectedUserId) {
          setSelectedUserId(null);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showConfigEditor, selectedAppeal, selectedUserId]);

  // Scroll active tab into view
  useEffect(() => {
    const activeTab = tabRefs.current[currentView];
    if (activeTab && tabsContainerRef.current) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentView]);

  const handleViewUser = (userId) => {
    setSelectedUserId(userId);
  };
  
  const handleReviewAppeal = (appeal) => {
    setSelectedAppeal(appeal);
  };
  
  const handleModalSuccess = (message) => {
    if (onSuccess) onSuccess(message);
    fetchSecurityData();
  };
  
  const handleAppealSuccess = (message) => {
    if (onSuccess) onSuccess(message);
    setSelectedAppeal(null);
    fetchSecurityData();
  };
  
  const handleConfigSuccess = (message) => {
    if (onSuccess) onSuccess(message);
    setShowConfigEditor(false);
  };
  
  return (
    <AdminContainer
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Screen reader announcements */}
      <AriaLiveRegion politeness="polite">
        {announcement}
      </AriaLiveRegion>

      <Header>
        <HeaderTop>
          <SectionTitle $iconColor="#ff9500">
            <FaShieldAlt /> {t('admin.security.title')}
          </SectionTitle>
          <KeyboardHint aria-hidden="true">
            <FaKeyboard /> {t('admin.security.keyboardHint', 'Use arrow keys to navigate')}
          </KeyboardHint>
        </HeaderTop>

        <ViewTabsWrapper>
          <ScrollIndicator $direction="left" aria-hidden="true">
            <FaChevronLeft />
          </ScrollIndicator>

          <ViewTabs
            ref={tabsContainerRef}
            role="tablist"
            aria-label={t('admin.security.views', 'Security views')}
          >
            <ViewTab
              ref={(el) => { tabRefs.current[VIEWS.OVERVIEW] = el; }}
              role="tab"
              id={`security-tab-${VIEWS.OVERVIEW}`}
              aria-selected={currentView === VIEWS.OVERVIEW}
              aria-controls={`security-panel-${VIEWS.OVERVIEW}`}
              tabIndex={currentView === VIEWS.OVERVIEW ? 0 : -1}
              $active={currentView === VIEWS.OVERVIEW}
              onClick={() => handleViewChange(VIEWS.OVERVIEW)}
              onKeyDown={(e) => handleTabKeyDown(e, VIEWS.OVERVIEW)}
            >
              {t('admin.security.overview')}
            </ViewTab>
            <ViewTab
              ref={(el) => { tabRefs.current[VIEWS.HIGH_RISK] = el; }}
              role="tab"
              id={`security-tab-${VIEWS.HIGH_RISK}`}
              aria-selected={currentView === VIEWS.HIGH_RISK}
              aria-controls={`security-panel-${VIEWS.HIGH_RISK}`}
              tabIndex={currentView === VIEWS.HIGH_RISK ? 0 : -1}
              $active={currentView === VIEWS.HIGH_RISK}
              onClick={() => handleViewChange(VIEWS.HIGH_RISK)}
              onKeyDown={(e) => handleTabKeyDown(e, VIEWS.HIGH_RISK)}
            >
              {t('admin.security.highRiskUsers')}
            </ViewTab>
            <ViewTab
              ref={(el) => { tabRefs.current[VIEWS.RESTRICTED] = el; }}
              role="tab"
              id={`security-tab-${VIEWS.RESTRICTED}`}
              aria-selected={currentView === VIEWS.RESTRICTED}
              aria-controls={`security-panel-${VIEWS.RESTRICTED}`}
              tabIndex={currentView === VIEWS.RESTRICTED ? 0 : -1}
              $active={currentView === VIEWS.RESTRICTED}
              onClick={() => handleViewChange(VIEWS.RESTRICTED)}
              onKeyDown={(e) => handleTabKeyDown(e, VIEWS.RESTRICTED)}
            >
              <FaBan aria-hidden="true" /> {t('admin.security.restricted')}
              {securityData?.totalRestricted > 0 && (
                <CountBadge aria-label={`${securityData.totalRestricted} restricted`}>
                  {securityData.totalRestricted}
                </CountBadge>
              )}
            </ViewTab>
            <ViewTab
              ref={(el) => { tabRefs.current[VIEWS.AUTO_ENFORCE] = el; }}
              role="tab"
              id={`security-tab-${VIEWS.AUTO_ENFORCE}`}
              aria-selected={currentView === VIEWS.AUTO_ENFORCE}
              aria-controls={`security-panel-${VIEWS.AUTO_ENFORCE}`}
              tabIndex={currentView === VIEWS.AUTO_ENFORCE ? 0 : -1}
              $active={currentView === VIEWS.AUTO_ENFORCE}
              onClick={() => handleViewChange(VIEWS.AUTO_ENFORCE)}
              onKeyDown={(e) => handleTabKeyDown(e, VIEWS.AUTO_ENFORCE)}
            >
              {t('admin.security.autoEnforce')}
            </ViewTab>
            <ViewTab
              ref={(el) => { tabRefs.current[VIEWS.AUDIT] = el; }}
              role="tab"
              id={`security-tab-${VIEWS.AUDIT}`}
              aria-selected={currentView === VIEWS.AUDIT}
              aria-controls={`security-panel-${VIEWS.AUDIT}`}
              tabIndex={currentView === VIEWS.AUDIT ? 0 : -1}
              $active={currentView === VIEWS.AUDIT}
              onClick={() => handleViewChange(VIEWS.AUDIT)}
              onKeyDown={(e) => handleTabKeyDown(e, VIEWS.AUDIT)}
            >
              {t('admin.security.auditLog')}
            </ViewTab>
            <ViewTab
              ref={(el) => { tabRefs.current[VIEWS.APPEALS] = el; }}
              role="tab"
              id={`security-tab-${VIEWS.APPEALS}`}
              aria-selected={currentView === VIEWS.APPEALS}
              aria-controls={`security-panel-${VIEWS.APPEALS}`}
              tabIndex={currentView === VIEWS.APPEALS ? 0 : -1}
              $active={currentView === VIEWS.APPEALS}
              onClick={() => handleViewChange(VIEWS.APPEALS)}
              onKeyDown={(e) => handleTabKeyDown(e, VIEWS.APPEALS)}
            >
              {t('admin.security.appeals')}
              {appealStats?.pending > 0 && (
                <PendingBadge aria-label={`${appealStats.pending} pending`}>
                  {appealStats.pending}
                </PendingBadge>
              )}
            </ViewTab>
            <ViewTab
              ref={(el) => { tabRefs.current[VIEWS.CONFIG] = el; }}
              role="tab"
              id={`security-tab-${VIEWS.CONFIG}`}
              aria-selected={currentView === VIEWS.CONFIG}
              aria-controls={`security-panel-${VIEWS.CONFIG}`}
              tabIndex={currentView === VIEWS.CONFIG ? 0 : -1}
              $active={currentView === VIEWS.CONFIG}
              onClick={() => handleViewChange(VIEWS.CONFIG)}
              onKeyDown={(e) => handleTabKeyDown(e, VIEWS.CONFIG)}
            >
              <FaCog aria-hidden="true" /> {t('admin.security.config')}
            </ViewTab>
          </ViewTabs>

          <ScrollIndicator $direction="right" aria-hidden="true">
            <FaChevronRight />
          </ScrollIndicator>
        </ViewTabsWrapper>
      </Header>
      
      <ContentArea
        ref={contentRef}
        tabIndex={-1}
        aria-label={getViewLabel(currentView)}
      >
        <AnimatePresence mode="wait">
          {loading && currentView === VIEWS.OVERVIEW ? (
            <LoadingContainer
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingState>{t('common.loading')}</LoadingState>
              <SkeletonGrid>
                <SkeletonBox $height="120px" $width="100%" />
                <SkeletonBox $height="120px" $width="100%" />
                <SkeletonBox $height="200px" $width="100%" />
              </SkeletonGrid>
            </LoadingContainer>
          ) : (
            <ContentPanel
              key={currentView}
              id={`security-panel-${currentView}`}
              role="tabpanel"
              aria-labelledby={`security-tab-${currentView}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {currentView === VIEWS.OVERVIEW && (
                <>
                  <SecurityAlerts maxAlerts={10} autoRefresh={true} refreshInterval={30000} />
                  <SecurityOverview
                    data={securityData}
                    appealStats={appealStats}
                    onViewHighRisk={() => handleViewChange(VIEWS.HIGH_RISK)}
                    onViewAppeals={() => handleViewChange(VIEWS.APPEALS)}
                  />
                </>
              )}

              {currentView === VIEWS.HIGH_RISK && (
                <HighRiskUsersList onViewUser={handleViewUser} />
              )}

              {currentView === VIEWS.AUDIT && (
                <AuditLogViewer />
              )}

              {currentView === VIEWS.APPEALS && (
                <AppealsList onReviewAppeal={handleReviewAppeal} />
              )}

              {currentView === VIEWS.RESTRICTED && (
                <RestrictedUsersList
                  onViewUser={handleViewUser}
                  onSuccess={handleModalSuccess}
                />
              )}

              {currentView === VIEWS.AUTO_ENFORCE && (
                <AutoEnforcementViewer onViewUser={handleViewUser} />
              )}

              {currentView === VIEWS.CONFIG && (
                <>
                  <RiskDecayPanel onSuccess={handleModalSuccess} />
                  <SecurityConfigPanel onEdit={() => setShowConfigEditor(true)} />
                </>
              )}
            </ContentPanel>
          )}
        </AnimatePresence>
      </ContentArea>
      
      {/* Modals */}
      <UserSecurityModal 
        show={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onSuccess={handleModalSuccess}
        onViewUser={handleViewUser}
      />
      
      <AppealReviewModal 
        show={!!selectedAppeal}
        appeal={selectedAppeal}
        onClose={() => setSelectedAppeal(null)}
        onSuccess={handleAppealSuccess}
      />
      
      <SecurityConfigEditor
        show={showConfigEditor}
        onClose={() => setShowConfigEditor(false)}
        onSuccess={handleConfigSuccess}
      />
    </AdminContainer>
  );
};

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const KeyboardHint = styled.span`
  display: none;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};

  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
  }

  svg {
    font-size: 12px;
  }
`;

const ViewTabsWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const ScrollIndicator = styled.div`
  position: absolute;
  ${props => props.$direction === 'left' ? 'left: 0;' : 'right: 0;'}
  top: 0;
  bottom: 0;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    ${props => props.$direction === 'left' ? 'to right' : 'to left'},
    ${theme.colors.backgroundTertiary} 0%,
    transparent 100%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity ${theme.transitions.fast};
  z-index: 2;

  svg {
    color: ${theme.colors.textSecondary};
    font-size: 14px;
  }

  /* Show on scroll capability (enhanced via JS if needed) */
  @media (max-width: ${theme.breakpoints.lg}) {
    opacity: 0.7;
  }
`;

const ViewTabs = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: 4px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }

  /* Fade edges on scroll (visual hint) */
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 24px,
    black calc(100% - 24px),
    transparent 100%
  );

  @media (min-width: ${theme.breakpoints.lg}) {
    mask-image: none;
  }
`;

const ViewTab = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  min-height: 44px;
  background: ${props => props.$active ? theme.colors.surface : 'transparent'};
  border: 1px solid ${props => props.$active ? theme.colors.primary : 'transparent'};
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? theme.colors.text : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${theme.transitions.fast};
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;

  svg {
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    color: ${theme.colors.text};
    background: ${props => props.$active ? theme.colors.surface : theme.colors.hoverOverlay};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  /* Touch-friendly on mobile */
  @media (pointer: coarse) {
    min-height: 48px;
    padding: ${theme.spacing.md} ${theme.spacing.lg};
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const PendingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: ${theme.colors.error};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: white;
  animation: pulse-subtle 2s ease-in-out infinite;

  @keyframes pulse-subtle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: white;
`;

const ContentArea = styled.div`
  min-height: 400px;
  outline: none;

  &:focus-visible {
    /* Subtle focus indicator for content area */
    box-shadow: inset 0 0 0 2px ${theme.colors.focusRing};
    border-radius: ${theme.radius.lg};
  }
`;

const LoadingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const SkeletonGrid = styled.div`
  display: grid;
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);

    & > *:last-child {
      grid-column: 1 / -1;
    }
  }
`;

const ContentPanel = styled(motion.div)`
  /* Ensures smooth transitions between panels */
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']};
  color: ${theme.colors.textSecondary};
`;

export default AdminSecurity;

