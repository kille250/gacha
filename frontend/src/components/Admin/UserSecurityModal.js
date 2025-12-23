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
  const [ipCollisions, setIpCollisions] = useState([]);
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
  
  // Perm ban confirmation
  const [showPermBanConfirm, setShowPermBanConfirm] = useState(false);
  const [permBanConfirmText, setPermBanConfirmText] = useState('');
  
  const fetchUserSecurity = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getUserSecurity(userId);
      setUserData(data.user);
      setAuditTrail(data.auditTrail || []);
      setIpCollisions(data.ipCollisions || []);
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
    
    // Require secondary confirmation for permanent bans
    if (restrictionForm.restrictionType === 'perm_ban') {
      setShowPermBanConfirm(true);
      return;
    }
    
    await executeRestriction();
  };
  
  const executeRestriction = async () => {
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
      setShowPermBanConfirm(false);
      setPermBanConfirmText('');
      fetchUserSecurity();
    } catch (err) {
      console.error('Failed to apply restriction:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleConfirmPermBan = async () => {
    if (permBanConfirmText !== 'PERMANENT BAN') {
      return;
    }
    await executeRestriction();
  };
  
  const handleCancelPermBan = () => {
    setShowPermBanConfirm(false);
    setPermBanConfirmText('');
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
              $active={activeTab === 'ip'} 
              onClick={() => setActiveTab('ip')}
            >
              <FaGlobe /> IP
              {ipCollisions.length > 0 && (
                <CollisionBadge $hasBanned={ipCollisions.some(u => u.isBanned)}>
                  {ipCollisions.length}
                </CollisionBadge>
              )}
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
                
                {activeTab === 'ip' && (
                  <TabContent>
                    <IPAnalysisSection>
                      <SectionHeader>
                        <FaGlobe /> IP Analysis
                      </SectionHeader>
                      
                      <IPInfoCard>
                        <IPLabel>Current IP Hash</IPLabel>
                        <IPValue>{userData.lastKnownIP || 'Unknown'}</IPValue>
                      </IPInfoCard>
                      
                      <CollisionSection>
                        <CollisionHeader>
                          IP Collisions ({ipCollisions.length} users)
                          {ipCollisions.some(u => u.isBanned) && (
                            <BanWarning>
                              <FaExclamationTriangle /> Shares IP with banned users!
                            </BanWarning>
                          )}
                        </CollisionHeader>
                        
                        {ipCollisions.length === 0 ? (
                          <NoCollisions>
                            ✓ No other users found with the same IP
                          </NoCollisions>
                        ) : (
                          <CollisionList>
                            {ipCollisions.map(user => (
                              <CollisionItem key={user.id} $isBanned={user.isBanned}>
                                <CollisionUser>
                                  <Username 
                                    as="button"
                                    onClick={() => onViewUser?.(user.id)}
                                    style={{ cursor: onViewUser ? 'pointer' : 'default' }}
                                  >
                                    {user.username}
                                  </Username>
                                  <CollisionRestriction $color={getRestrictionColor(user.restrictionType)}>
                                    {user.restrictionType}
                                  </CollisionRestriction>
                                </CollisionUser>
                                <CollisionMeta>
                                  <span>Risk: {user.riskScore}</span>
                                  <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                                </CollisionMeta>
                              </CollisionItem>
                            ))}
                          </CollisionList>
                        )}
                      </CollisionSection>
                      
                      <RiskNote>
                        <FaExclamationTriangle />
                        <span>
                          IP collisions may indicate ban evasion or shared networks (VPN, school, workplace).
                          Review audit logs and account creation dates for suspicious patterns.
                        </span>
                      </RiskNote>
                    </IPAnalysisSection>
                  </TabContent>
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
      
      {/* Permanent Ban Confirmation Modal */}
      {showPermBanConfirm && (
        <PermBanOverlay onClick={handleCancelPermBan}>
          <PermBanModal onClick={e => e.stopPropagation()}>
            <PermBanHeader>
              <FaBan style={{ color: '#ff3b30' }} />
              Confirm Permanent Ban
            </PermBanHeader>
            <PermBanBody>
              <PermBanWarning>
                <FaExclamationTriangle />
                <span>
                  You are about to <strong>permanently ban</strong> user <strong>{userData?.username}</strong>.
                  This action is severe and should only be used for serious violations.
                </span>
              </PermBanWarning>
              
              <PermBanReason>
                <strong>Reason:</strong> {restrictionForm.reason}
              </PermBanReason>
              
              <PermBanConfirmInput>
                <label>Type <strong>PERMANENT BAN</strong> to confirm:</label>
                <Input 
                  type="text"
                  value={permBanConfirmText}
                  onChange={(e) => setPermBanConfirmText(e.target.value)}
                  placeholder="PERMANENT BAN"
                  autoFocus
                />
              </PermBanConfirmInput>
            </PermBanBody>
            <PermBanFooter>
              <SecondaryButton onClick={handleCancelPermBan}>
                Cancel
              </SecondaryButton>
              <DangerButton 
                onClick={handleConfirmPermBan}
                disabled={permBanConfirmText !== 'PERMANENT BAN' || actionLoading}
              >
                {actionLoading ? 'Applying...' : 'Confirm Permanent Ban'}
              </DangerButton>
            </PermBanFooter>
          </PermBanModal>
        </PermBanOverlay>
      )}
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

// IP Analysis Tab Styles
const CollisionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: ${theme.spacing.xs};
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  background: ${props => props.$hasBanned ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)'};
  color: ${props => props.$hasBanned ? '#ff3b30' : '#ff9500'};
`;

const IPAnalysisSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const SectionHeader = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  
  svg { color: ${theme.colors.primary}; }
`;

const IPInfoCard = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const IPLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const IPValue = styled.div`
  font-family: monospace;
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.text};
  word-break: break-all;
`;

const CollisionSection = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
`;

const CollisionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const BanWarning = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: #ff3b30;
  
  svg { font-size: ${theme.fontSizes.xs}; }
`;

const NoCollisions = styled.div`
  padding: ${theme.spacing.md};
  text-align: center;
  color: ${theme.colors.success};
  font-size: ${theme.fontSizes.sm};
`;

const CollisionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  max-height: 300px;
  overflow-y: auto;
`;

const CollisionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$isBanned ? 'rgba(255, 59, 48, 0.08)' : theme.colors.surface};
  border: 1px solid ${props => props.$isBanned ? 'rgba(255, 59, 48, 0.3)' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
`;

const CollisionUser = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CollisionRestriction = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const CollisionMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const RiskNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(255, 149, 0, 0.1);
  border: 1px solid rgba(255, 149, 0, 0.2);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
  
  svg {
    flex-shrink: 0;
    color: #ff9500;
    margin-top: 2px;
  }
`;

// Permanent Ban Confirmation Modal Styles
const PermBanOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const PermBanModal = styled.div`
  background: ${theme.colors.surface};
  border: 2px solid #ff3b30;
  border-radius: ${theme.radius.xl};
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(255, 59, 48, 0.3);
`;

const PermBanHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: #ff3b30;
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const PermBanBody = styled.div`
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const PermBanWarning = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  line-height: 1.5;
  
  svg {
    flex-shrink: 0;
    color: #ff3b30;
    font-size: ${theme.fontSizes.lg};
    margin-top: 2px;
  }
  
  strong {
    color: #ff3b30;
  }
`;

const PermBanReason = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  
  strong {
    color: ${theme.colors.text};
  }
`;

const PermBanConfirmInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  
  label {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.textSecondary};
    
    strong {
      color: ${theme.colors.text};
      font-family: monospace;
    }
  }
  
  input {
    font-size: ${theme.fontSizes.md};
    text-align: center;
  }
`;

const PermBanFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const DangerButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: #ff3b30;
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover:not(:disabled) {
    background: #d63329;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default UserSecurityModal;

