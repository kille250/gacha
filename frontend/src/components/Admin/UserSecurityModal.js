/**
 * UserSecurityModal.js
 * 
 * Modal for viewing user security details and applying restrictions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { 
  FaUserShield, FaBan, FaExclamationTriangle, FaHistory,
  FaFingerprint, FaGlobe, FaClock, FaUndo, FaTrash, FaSync, FaLink
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/DesignSystem';
import { 
  getUserSecurity, restrictUser, unrestrictUser, 
  warnUser, resetUserWarnings, clearUserDevices,
  recalculateUserRisk, resetUserRisk
} from '../../utils/api';
import LinkedAccountsModal from './LinkedAccountsModal';
import DeviceHistoryPanel from './DeviceHistoryPanel';
import SessionActivityPanel from './SessionActivityPanel';
import RiskScoreHistoryPanel from './RiskScoreHistoryPanel';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  Label,
  Input,
  Select,
  PrimaryButton,
  SecondaryButton,
} from './AdminStyles';

const RESTRICTION_TYPES = [
  { value: 'none', label: 'No Restriction', color: '#34c759' },
  { value: 'warning', label: 'Warning', color: '#ffcc00' },
  { value: 'rate_limited', label: 'Rate Limited', color: '#af52de' },
  { value: 'shadowban', label: 'Shadowban', color: '#8e8e93' },
  { value: 'temp_ban', label: 'Temporary Ban', color: '#ff9500' },
  { value: 'perm_ban', label: 'Permanent Ban', color: '#ff3b30' },
];

const DURATION_OPTIONS = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

const UserSecurityModal = ({ show, userId, onClose, onSuccess, onViewUser }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Restriction form
  const [restrictionForm, setRestrictionForm] = useState({
    restrictionType: 'none',
    duration: '24h',
    reason: ''
  });
  
  // Warning form
  const [warningReason, setWarningReason] = useState('');
  
  // Linked accounts modal
  const [showLinkedAccounts, setShowLinkedAccounts] = useState(false);
  
  const fetchUserSecurity = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getUserSecurity(userId);
      setUserData(data.user);
      setAuditTrail(data.auditTrail || []);
      setRestrictionForm(prev => ({
        ...prev,
        restrictionType: data.user?.restriction?.type || 'none'
      }));
    } catch (err) {
      console.error('Failed to fetch user security:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    if (show && userId) {
      fetchUserSecurity();
    }
  }, [show, userId, fetchUserSecurity]);
  
  const handleApplyRestriction = async () => {
    if (!restrictionForm.reason && restrictionForm.restrictionType !== 'none') {
      return;
    }
    
    setActionLoading(true);
    try {
      if (restrictionForm.restrictionType === 'none') {
        await unrestrictUser(userId, restrictionForm.reason || 'Restriction removed');
      } else {
        await restrictUser(userId, {
          restrictionType: restrictionForm.restrictionType,
          duration: ['temp_ban', 'rate_limited'].includes(restrictionForm.restrictionType) 
            ? restrictionForm.duration : null,
          reason: restrictionForm.reason
        });
      }
      onSuccess(t('admin.security.restrictionApplied'));
      fetchUserSecurity();
    } catch (err) {
      console.error('Failed to apply restriction:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleIssueWarning = async () => {
    if (!warningReason) return;
    
    setActionLoading(true);
    try {
      await warnUser(userId, warningReason);
      onSuccess(t('admin.security.warningIssued'));
      setWarningReason('');
      fetchUserSecurity();
    } catch (err) {
      console.error('Failed to issue warning:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleResetWarnings = async () => {
    if (!window.confirm(t('admin.security.confirmResetWarnings'))) return;
    
    setActionLoading(true);
    try {
      await resetUserWarnings(userId);
      onSuccess(t('admin.security.warningsReset'));
      fetchUserSecurity();
    } catch (err) {
      console.error('Failed to reset warnings:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleClearDevices = async () => {
    if (!window.confirm('Clear all device fingerprints for this user? They will need to re-authenticate on their devices.')) return;
    
    setActionLoading(true);
    try {
      const result = await clearUserDevices(userId);
      onSuccess(result.message || 'Device fingerprints cleared');
      fetchUserSecurity();
    } catch (err) {
      console.error('Failed to clear devices:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleRecalculateRisk = async () => {
    setActionLoading(true);
    try {
      const result = await recalculateUserRisk(userId);
      onSuccess(`Risk score recalculated: ${result.oldScore} → ${result.newScore}`);
      fetchUserSecurity();
    } catch (err) {
      console.error('Failed to recalculate risk:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleResetRisk = async () => {
    if (!window.confirm('Reset risk score to 0? This is typically used after reviewing a false positive.')) return;
    
    setActionLoading(true);
    try {
      const result = await resetUserRisk(userId, 'Manual reset by admin');
      onSuccess(result.message || 'Risk score reset to 0');
      fetchUserSecurity();
    } catch (err) {
      console.error('Failed to reset risk:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const getRestrictionColor = (type) => {
    const found = RESTRICTION_TYPES.find(r => r.value === type);
    return found?.color || theme.colors.textSecondary;
  };
  
  const formatTimestamp = (ts) => new Date(ts).toLocaleString();
  
  if (!show) return null;
  
  return (
    <AnimatePresence>
      <ModalOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <ModalContent
          $maxWidth="700px"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <ModalHeader>
            <ModalTitle>
              <FaUserShield /> {t('admin.security.userSecurity')}
              {userData && <Username>— {userData.username}</Username>}
            </ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>
          
          <TabsContainer>
            <Tab 
              $active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')}
            >
              {t('admin.security.overview')}
            </Tab>
            <Tab 
              $active={activeTab === 'devices'} 
              onClick={() => setActiveTab('devices')}
            >
              Devices
            </Tab>
            <Tab 
              $active={activeTab === 'sessions'} 
              onClick={() => setActiveTab('sessions')}
            >
              Sessions
            </Tab>
            <Tab 
              $active={activeTab === 'risk'} 
              onClick={() => setActiveTab('risk')}
            >
              Risk History
            </Tab>
            <Tab 
              $active={activeTab === 'actions'} 
              onClick={() => setActiveTab('actions')}
            >
              {t('admin.security.actions')}
            </Tab>
            <Tab 
              $active={activeTab === 'audit'} 
              onClick={() => setActiveTab('audit')}
            >
              {t('admin.security.auditTrail')}
            </Tab>
          </TabsContainer>
          
          <ModalBody>
            {loading ? (
              <LoadingState>{t('common.loading')}</LoadingState>
            ) : !userData ? (
              <ErrorState>{t('admin.security.userNotFound')}</ErrorState>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab>
                    <InfoGrid>
                      <InfoCard>
                        <InfoLabel>{t('admin.security.currentRestriction')}</InfoLabel>
                        <RestrictionBadge $color={getRestrictionColor(userData.restriction?.type)}>
                          {userData.restriction?.type || 'none'}
                        </RestrictionBadge>
                        {userData.restriction?.reason && (
                          <InfoDetail>{userData.restriction.reason}</InfoDetail>
                        )}
                        {userData.restriction?.until && (
                          <InfoDetail>
                            <FaClock /> {t('admin.security.until')}: {formatTimestamp(userData.restriction.until)}
                          </InfoDetail>
                        )}
                      </InfoCard>
                      
                      <InfoCard>
                        <InfoLabel>{t('admin.security.riskScore')}</InfoLabel>
                        <RiskScore $score={userData.riskScore}>
                          {userData.riskScore || 0}
                        </RiskScore>
                        <RiskActions>
                          <MiniButton onClick={handleRecalculateRisk} disabled={actionLoading} title="Recalculate">
                            <FaSync />
                          </MiniButton>
                          <MiniButton onClick={handleResetRisk} disabled={actionLoading} title="Reset to 0">
                            <FaUndo />
                          </MiniButton>
                        </RiskActions>
                      </InfoCard>
                      
                      <InfoCard>
                        <InfoLabel>{t('admin.security.warnings')}</InfoLabel>
                        <WarningCount>
                          ⚠️ {userData.warningCount || 0}
                        </WarningCount>
                        {userData.warningCount > 0 && (
                          <ResetButton onClick={handleResetWarnings} disabled={actionLoading}>
                            <FaUndo /> {t('admin.security.reset')}
                          </ResetButton>
                        )}
                      </InfoCard>
                      
                      <InfoCard>
                        <InfoLabel>{t('admin.security.accountAge')}</InfoLabel>
                        <InfoValue>
                          {Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))} {t('admin.security.days')}
                        </InfoValue>
                      </InfoCard>
                    </InfoGrid>
                    
                    <DeviceSection>
                      <DeviceSectionHeader>
                        <SectionLabel>
                          <FaFingerprint /> {t('admin.security.knownDevices')} ({userData.deviceFingerprints?.length || 0})
                        </SectionLabel>
                        <DeviceActions>
                          <MiniButton onClick={() => setShowLinkedAccounts(true)} title="View linked accounts">
                            <FaLink />
                          </MiniButton>
                          {userData.deviceFingerprints?.length > 0 && (
                            <MiniButton onClick={handleClearDevices} disabled={actionLoading} title="Clear all devices" $danger>
                              <FaTrash />
                            </MiniButton>
                          )}
                        </DeviceActions>
                      </DeviceSectionHeader>
                      <DeviceList>
                        {userData.deviceFingerprints?.slice(0, 5).map((fp, i) => (
                          <DeviceItem key={i}>
                            {fp.substring(0, 16)}...
                          </DeviceItem>
                        ))}
                        {(!userData.deviceFingerprints || userData.deviceFingerprints.length === 0) && (
                          <EmptyDevices>{t('admin.security.noDevices')}</EmptyDevices>
                        )}
                      </DeviceList>
                      
                      {userData.lastKnownIP && (
                        <IPInfo>
                          <FaGlobe /> {t('admin.security.lastIP')}: {userData.lastKnownIP.substring(0, 8)}...
                        </IPInfo>
                      )}
                    </DeviceSection>
                  </OverviewTab>
                )}
                
                {activeTab === 'devices' && (
                  <TabContent>
                    <DeviceHistoryPanel userId={userId} username={userData?.username} />
                  </TabContent>
                )}
                
                {activeTab === 'sessions' && (
                  <TabContent>
                    <SessionActivityPanel userId={userId} />
                  </TabContent>
                )}
                
                {activeTab === 'risk' && (
                  <TabContent>
                    <RiskScoreHistoryPanel userId={userId} />
                  </TabContent>
                )}
                
                {activeTab === 'actions' && (
                  <ActionsTab>
                    <ActionSection>
                      <SectionLabel>
                        <FaBan /> {t('admin.security.applyRestriction')}
                      </SectionLabel>
                      <FormGroup>
                        <Label>{t('admin.security.restrictionType')}</Label>
                        <Select 
                          value={restrictionForm.restrictionType}
                          onChange={(e) => setRestrictionForm(prev => ({ 
                            ...prev, 
                            restrictionType: e.target.value 
                          }))}
                        >
                          {RESTRICTION_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Select>
                      </FormGroup>
                      
                      {['temp_ban', 'rate_limited'].includes(restrictionForm.restrictionType) && (
                        <FormGroup>
                          <Label>{t('admin.security.duration')}</Label>
                          <Select 
                            value={restrictionForm.duration}
                            onChange={(e) => setRestrictionForm(prev => ({ 
                              ...prev, 
                              duration: e.target.value 
                            }))}
                          >
                            {DURATION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        </FormGroup>
                      )}
                      
                      <FormGroup>
                        <Label>{t('admin.security.reason')}</Label>
                        <Input 
                          type="text"
                          placeholder={t('admin.security.reasonPlaceholder')}
                          value={restrictionForm.reason}
                          onChange={(e) => setRestrictionForm(prev => ({ 
                            ...prev, 
                            reason: e.target.value 
                          }))}
                        />
                      </FormGroup>
                      
                      <PrimaryButton 
                        onClick={handleApplyRestriction} 
                        disabled={actionLoading || (!restrictionForm.reason && restrictionForm.restrictionType !== 'none')}
                      >
                        {actionLoading ? t('common.saving') : t('admin.security.applyRestriction')}
                      </PrimaryButton>
                    </ActionSection>
                    
                    <ActionSection>
                      <SectionLabel>
                        <FaExclamationTriangle /> {t('admin.security.issueWarning')}
                      </SectionLabel>
                      <FormGroup>
                        <Label>{t('admin.security.warningReason')}</Label>
                        <Input 
                          type="text"
                          placeholder={t('admin.security.warningPlaceholder')}
                          value={warningReason}
                          onChange={(e) => setWarningReason(e.target.value)}
                        />
                      </FormGroup>
                      <SecondaryButton 
                        onClick={handleIssueWarning} 
                        disabled={actionLoading || !warningReason}
                      >
                        <FaExclamationTriangle /> {t('admin.security.issueWarning')}
                      </SecondaryButton>
                    </ActionSection>
                  </ActionsTab>
                )}
                
                {activeTab === 'audit' && (
                  <AuditTab>
                    <SectionLabel>
                      <FaHistory /> {t('admin.security.recentActivity')}
                    </SectionLabel>
                    {auditTrail.length === 0 ? (
                      <EmptyAudit>{t('admin.security.noAuditEvents')}</EmptyAudit>
                    ) : (
                      <AuditList>
                        {auditTrail.slice(0, 20).map((event) => (
                          <AuditItem key={event.id}>
                            <AuditTime>{formatTimestamp(event.createdAt)}</AuditTime>
                            <AuditEvent>{event.eventType}</AuditEvent>
                            <AuditSeverity $severity={event.severity}>
                              {event.severity}
                            </AuditSeverity>
                          </AuditItem>
                        ))}
                      </AuditList>
                    )}
                  </AuditTab>
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
      
      <LinkedAccountsModal
        show={showLinkedAccounts}
        userId={userId}
        username={userData?.username}
        onClose={() => setShowLinkedAccounts(false)}
        onViewUser={onViewUser}
      />
    </AnimatePresence>
  );
};

const Username = styled.span`
  font-weight: ${theme.fontWeights.normal};
  color: ${theme.colors.textSecondary};
  margin-left: ${theme.spacing.sm};
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const Tab = styled.button`
  flex: 1;
  padding: ${theme.spacing.md};
  background: ${props => props.$active ? theme.colors.surface : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    color: ${theme.colors.text};
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.error};
`;

const OverviewTab = styled.div``;

const TabContent = styled.div`
  padding: ${theme.spacing.xs} 0;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const InfoCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const InfoLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const InfoValue = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const InfoDetail = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const RestrictionBadge = styled.div`
  display: inline-block;
  padding: 4px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const RiskScore = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => {
    if (props.$score >= 70) return '#ff3b30';
    if (props.$score >= 50) return '#ff9500';
    if (props.$score >= 30) return '#ffcc00';
    return theme.colors.success;
  }};
`;

const WarningCount = styled.div`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
  padding: 4px 8px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  
  &:hover { color: ${theme.colors.text}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeviceSection = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const DeviceSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const DeviceActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const RiskActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
`;

const MiniButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0, 122, 255, 0.15)'};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${props => props.$danger ? '#ff3b30' : theme.colors.primary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    background: ${props => props.$danger ? 'rgba(255, 59, 48, 0.25)' : 'rgba(0, 122, 255, 0.25)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
  
  svg { color: ${theme.colors.primary}; }
`;

const DeviceList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const DeviceItem = styled.span`
  padding: 4px 10px;
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.xs};
  font-family: monospace;
  color: ${theme.colors.textSecondary};
`;

const EmptyDevices = styled.span`
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.sm};
`;

const IPInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ActionsTab = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const ActionSection = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
`;

const AuditTab = styled.div``;

const EmptyAudit = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const AuditList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  max-height: 400px;
  overflow-y: auto;
`;

const AuditItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
`;

const AuditTime = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  font-family: monospace;
  flex: 0 0 150px;
`;

const AuditEvent = styled.span`
  flex: 1;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
`;

const AuditSeverity = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  background: ${props => 
    props.$severity === 'critical' ? 'rgba(255, 59, 48, 0.15)' :
    props.$severity === 'warning' ? 'rgba(255, 149, 0, 0.15)' :
    'rgba(0, 122, 255, 0.15)'
  };
  color: ${props => 
    props.$severity === 'critical' ? '#ff3b30' :
    props.$severity === 'warning' ? '#ff9500' :
    '#007aff'
  };
`;

export default UserSecurityModal;

