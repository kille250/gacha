/**
 * AdminSecurity.js
 * 
 * Main security tab container for admin dashboard.
 * Combines security overview, high-risk users, audit log, and appeals.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaShieldAlt, FaCog, FaBan } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { getSecurityOverview, getAppealStats } from '../../utils/api';
import { onVisibilityChange, REFRESH_INTERVALS } from '../../cache';
import { AdminContainer, SectionTitle } from './AdminStyles';
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

const AdminSecurity = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState(VIEWS.OVERVIEW);
  const [securityData, setSecurityData] = useState(null);
  const [appealStats, setAppealStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
      <Header>
        <SectionTitle $iconColor="#ff9500">
          <FaShieldAlt /> {t('admin.security.title')}
        </SectionTitle>
        
        <ViewTabs>
          <ViewTab 
            $active={currentView === VIEWS.OVERVIEW}
            onClick={() => setCurrentView(VIEWS.OVERVIEW)}
          >
            {t('admin.security.overview')}
          </ViewTab>
          <ViewTab 
            $active={currentView === VIEWS.HIGH_RISK}
            onClick={() => setCurrentView(VIEWS.HIGH_RISK)}
          >
            {t('admin.security.highRiskUsers')}
          </ViewTab>
          <ViewTab 
            $active={currentView === VIEWS.RESTRICTED}
            onClick={() => setCurrentView(VIEWS.RESTRICTED)}
          >
            <FaBan /> {t('admin.security.restricted')}
            {securityData?.totalRestricted > 0 && (
              <CountBadge>{securityData.totalRestricted}</CountBadge>
            )}
          </ViewTab>
          <ViewTab 
            $active={currentView === VIEWS.AUTO_ENFORCE}
            onClick={() => setCurrentView(VIEWS.AUTO_ENFORCE)}
          >
            {t('admin.security.autoEnforce')}
          </ViewTab>
          <ViewTab 
            $active={currentView === VIEWS.AUDIT}
            onClick={() => setCurrentView(VIEWS.AUDIT)}
          >
            {t('admin.security.auditLog')}
          </ViewTab>
          <ViewTab 
            $active={currentView === VIEWS.APPEALS}
            onClick={() => setCurrentView(VIEWS.APPEALS)}
          >
            {t('admin.security.appeals')}
            {appealStats?.pending > 0 && (
              <PendingBadge>{appealStats.pending}</PendingBadge>
            )}
          </ViewTab>
          <ViewTab 
            $active={currentView === VIEWS.CONFIG}
            onClick={() => setCurrentView(VIEWS.CONFIG)}
          >
            <FaCog /> {t('admin.security.config')}
          </ViewTab>
        </ViewTabs>
      </Header>
      
      <ContentArea>
        {loading && currentView === VIEWS.OVERVIEW ? (
          <LoadingState>{t('common.loading')}</LoadingState>
        ) : (
          <>
            {currentView === VIEWS.OVERVIEW && (
              <>
                <SecurityAlerts maxAlerts={10} autoRefresh={true} refreshInterval={30000} />
                <SecurityOverview 
                  data={securityData}
                  appealStats={appealStats}
                  onViewHighRisk={() => setCurrentView(VIEWS.HIGH_RISK)}
                  onViewAppeals={() => setCurrentView(VIEWS.APPEALS)}
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
          </>
        )}
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
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  
  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const ViewTabs = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: 4px;
  overflow-x: auto;
`;

const ViewTab = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$active ? theme.colors.surface : 'transparent'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$active ? theme.colors.text : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    color: ${theme.colors.text};
  }
`;

const PendingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ff3b30;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  color: white;
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
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']};
  color: ${theme.colors.textSecondary};
`;

export default AdminSecurity;

