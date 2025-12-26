/**
 * LinkedAccountsModal.js
 * 
 * Modal showing potentially linked accounts for a user.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaLink, FaFingerprint, FaGlobe, FaSync, FaEye, FaBan, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import { theme } from '../../design-system';
import { getUserLinkedAccounts, bulkRestrictUsers } from '../../utils/api';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  PrimaryButton,
  SecondaryButton,
  Select,
  Input
} from './Admin.styles';

const RESTRICTION_COLORS = {
  perm_ban: '#ff3b30',
  temp_ban: '#ff9500',
  shadowban: '#8e8e93',
  rate_limited: '#af52de',
  warning: '#ffcc00',
  none: '#34c759'
};

const RESTRICTION_TYPES = [
  { value: 'warning', labelKey: 'admin.security.restrictionTypes.warning' },
  { value: 'rate_limited', labelKey: 'admin.security.restrictionTypes.rateLimited' },
  { value: 'shadowban', labelKey: 'admin.security.restrictionTypes.shadowban' },
  { value: 'temp_ban', labelKey: 'admin.security.restrictionTypes.tempBan' },
  { value: 'perm_ban', labelKey: 'admin.security.restrictionTypes.permBan' },
];

const LinkedAccountsModal = ({ show, userId, username, onClose, onViewUser, onSuccess }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [showBulkAction, setShowBulkAction] = useState(false);
  const [bulkAction, setBulkAction] = useState({
    type: 'shadowban',
    duration: '7d',
    reason: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  
  const fetchLinkedAccounts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getUserLinkedAccounts(userId);
      setData(result);
      setSelectedAccounts([]);
    } catch (err) {
      console.error('Failed to fetch linked accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    if (show && userId) {
      fetchLinkedAccounts();
      setShowBulkAction(false);
    }
  }, [show, userId, fetchLinkedAccounts]);
  
  const handleViewUser = (id) => {
    if (onViewUser) {
      onClose();
      setTimeout(() => onViewUser(id), 100);
    }
  };
  
  const toggleAccountSelection = (accountId) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };
  
  const selectAllLinked = () => {
    if (!data) return;
    const allIds = [
      ...(data.linkedByFingerprint || []).map(a => a.id),
      ...(data.linkedByIP || []).map(a => a.id)
    ];
    setSelectedAccounts([...new Set(allIds)]);
  };
  
  const clearSelection = () => {
    setSelectedAccounts([]);
  };
  
  const handleBulkRestrict = async () => {
    if (selectedAccounts.length === 0 || !bulkAction.reason) return;
    
    setActionLoading(true);
    try {
      await bulkRestrictUsers(
        selectedAccounts,
        bulkAction.type,
        bulkAction.type === 'temp_ban' || bulkAction.type === 'rate_limited' ? bulkAction.duration : null,
        bulkAction.reason
      );
      if (onSuccess) {
        onSuccess(t('admin.security.restrictedLinked', { count: selectedAccounts.length }));
      }
      setShowBulkAction(false);
      setSelectedAccounts([]);
      fetchLinkedAccounts();
    } catch (err) {
      console.error('Bulk restrict failed:', err);
    } finally {
      setActionLoading(false);
    }
  };
  
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
          $maxWidth="600px"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <ModalHeader>
            <ModalTitle>
              <FaLink /> {t('admin.security.linkedAccountsTitle', { username: username || `User ${userId}` })}
            </ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          <ModalBody>
            {loading ? (
              <LoadingState>
                <FaSync className="spin" /> {t('admin.security.loadingLinkedAccounts')}
              </LoadingState>
            ) : !data ? (
              <EmptyState>{t('admin.security.failedLoadLinkedAccounts')}</EmptyState>
            ) : (
              <>
                <SummaryCard>
                  <SummaryItem>
                    <SummaryLabel>{t('admin.security.totalLinked')}</SummaryLabel>
                    <SummaryValue>{data.totalLinked || 0}</SummaryValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>{t('admin.security.byFingerprint')}</SummaryLabel>
                    <SummaryValue>{data.linkedByFingerprint?.length || 0}</SummaryValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>{t('admin.security.byIP')}</SummaryLabel>
                    <SummaryValue>{data.linkedByIP?.length || 0}</SummaryValue>
                  </SummaryItem>
                </SummaryCard>

                {/* Bulk Action Bar */}
                {data.totalLinked > 0 && (
                  <ActionBar>
                    <SelectionControls>
                      <SmallButton onClick={selectAllLinked}>
                        <FaCheck /> {t('admin.security.selectAll')}
                      </SmallButton>
                      {selectedAccounts.length > 0 && (
                        <SmallButton onClick={clearSelection}>
                          {t('admin.security.clear')} ({selectedAccounts.length})
                        </SmallButton>
                      )}
                    </SelectionControls>
                    {selectedAccounts.length > 0 && (
                      <DangerButton onClick={() => setShowBulkAction(true)}>
                        <FaBan /> {t('admin.security.restrictAccounts', { count: selectedAccounts.length })}
                      </DangerButton>
                    )}
                  </ActionBar>
                )}
                
                {/* Bulk Action Panel */}
                {showBulkAction && (
                  <BulkActionPanel>
                    <BulkActionHeader>
                      <FaExclamationTriangle /> {t('admin.security.bulkRestrictTitle', { count: selectedAccounts.length })}
                    </BulkActionHeader>
                    <BulkActionForm>
                      <FormRow>
                        <FormLabel>{t('admin.security.type')}:</FormLabel>
                        <Select
                          value={bulkAction.type}
                          onChange={(e) => setBulkAction(prev => ({ ...prev, type: e.target.value }))}
                        >
                          {RESTRICTION_TYPES.map(rt => (
                            <option key={rt.value} value={rt.value}>{t(rt.labelKey)}</option>
                          ))}
                        </Select>
                      </FormRow>
                      {(bulkAction.type === 'temp_ban' || bulkAction.type === 'rate_limited') && (
                        <FormRow>
                          <FormLabel>{t('admin.security.duration')}:</FormLabel>
                          <Select
                            value={bulkAction.duration}
                            onChange={(e) => setBulkAction(prev => ({ ...prev, duration: e.target.value }))}
                          >
                            <option value="1h">{t('admin.security.durations.1h')}</option>
                            <option value="24h">{t('admin.security.durations.24h')}</option>
                            <option value="7d">{t('admin.security.durations.7d')}</option>
                            <option value="30d">{t('admin.security.durations.30d')}</option>
                          </Select>
                        </FormRow>
                      )}
                      <FormRow>
                        <FormLabel>{t('admin.security.reason')}:</FormLabel>
                        <Input
                          placeholder={t('admin.security.reasonPlaceholderBulk')}
                          value={bulkAction.reason}
                          onChange={(e) => setBulkAction(prev => ({ ...prev, reason: e.target.value }))}
                        />
                      </FormRow>
                      <BulkActionButtons>
                        <SecondaryButton onClick={() => setShowBulkAction(false)}>
                          {t('common.cancel')}
                        </SecondaryButton>
                        <PrimaryButton
                          onClick={handleBulkRestrict}
                          disabled={!bulkAction.reason || actionLoading}
                        >
                          {actionLoading ? t('admin.security.applying') : t('admin.security.applyRestrictions')}
                        </PrimaryButton>
                      </BulkActionButtons>
                    </BulkActionForm>
                  </BulkActionPanel>
                )}
                
                {data.linkedByFingerprint?.length > 0 && (
                  <Section>
                    <SectionHeader>
                      <FaFingerprint /> {t('admin.security.sameDeviceFingerprint')}
                    </SectionHeader>
                    <AccountList>
                      {data.linkedByFingerprint.map(account => (
                        <AccountItem
                          key={account.id}
                          $selected={selectedAccounts.includes(account.id)}
                        >
                          <Checkbox
                            type="checkbox"
                            checked={selectedAccounts.includes(account.id)}
                            onChange={() => toggleAccountSelection(account.id)}
                          />
                          <AccountInfo>
                            <AccountName>{account.username}</AccountName>
                            <AccountMeta>
                              <RestrictionBadge
                                $color={RESTRICTION_COLORS[account.restrictionType] || RESTRICTION_COLORS.none}
                              >
                                {account.restrictionType || t('admin.security.restrictionTypes.none')}
                              </RestrictionBadge>
                              <RiskBadge $score={account.riskScore}>
                                {t('admin.security.risk')}: {account.riskScore || 0}
                              </RiskBadge>
                              <SharedCount>
                                {account.sharedFingerprints} {t('admin.security.shared')}
                              </SharedCount>
                            </AccountMeta>
                          </AccountInfo>
                          <ViewButton onClick={() => handleViewUser(account.id)}>
                            <FaEye />
                          </ViewButton>
                        </AccountItem>
                      ))}
                    </AccountList>
                  </Section>
                )}

                {data.linkedByIP?.length > 0 && (
                  <Section>
                    <SectionHeader>
                      <FaGlobe /> {t('admin.security.sameIPAddress')}
                    </SectionHeader>
                    <AccountList>
                      {data.linkedByIP.map(account => (
                        <AccountItem
                          key={account.id}
                          $selected={selectedAccounts.includes(account.id)}
                        >
                          <Checkbox
                            type="checkbox"
                            checked={selectedAccounts.includes(account.id)}
                            onChange={() => toggleAccountSelection(account.id)}
                          />
                          <AccountInfo>
                            <AccountName>{account.username}</AccountName>
                            <AccountMeta>
                              <RestrictionBadge
                                $color={RESTRICTION_COLORS[account.restrictionType] || RESTRICTION_COLORS.none}
                              >
                                {account.restrictionType || t('admin.security.restrictionTypes.none')}
                              </RestrictionBadge>
                              <RiskBadge $score={account.riskScore}>
                                {t('admin.security.risk')}: {account.riskScore || 0}
                              </RiskBadge>
                            </AccountMeta>
                          </AccountInfo>
                          <ViewButton onClick={() => handleViewUser(account.id)}>
                            <FaEye />
                          </ViewButton>
                        </AccountItem>
                      ))}
                    </AccountList>
                  </Section>
                )}

                {data.totalLinked === 0 && (
                  <EmptyState>
                    {t('admin.security.noLinkedAccounts')}
                  </EmptyState>
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>
  );
};

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
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const SummaryCard = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const SummaryItem = styled.div`
  flex: 1;
  text-align: center;
`;

const SummaryLabel = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const SummaryValue = styled.div`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
  
  svg {
    color: ${theme.colors.primary};
  }
`;

const AccountList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const SelectionControls = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const SmallButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  
  &:hover {
    color: ${theme.colors.text};
    background: ${theme.colors.surfaceBorder};
  }
`;

const DangerButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  color: #ff3b30;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 59, 48, 0.25);
  }
`;

const BulkActionPanel = styled.div`
  background: rgba(255, 59, 48, 0.08);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const BulkActionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: #ff3b30;
  margin-bottom: ${theme.spacing.md};
`;

const BulkActionForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FormRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  
  select, input {
    flex: 1;
  }
`;

const FormLabel = styled.label`
  width: 70px;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  flex-shrink: 0;
`;

const BulkActionButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${theme.colors.primary};
  cursor: pointer;
  flex-shrink: 0;
`;

const AccountItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$selected ? 'rgba(0, 122, 255, 0.1)' : theme.colors.surface};
  border: 1px solid ${props => props.$selected ? 'rgba(0, 122, 255, 0.3)' : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
`;

const AccountInfo = styled.div``;

const AccountName = styled.div`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const AccountMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

const RestrictionBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const RiskBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => {
    if (props.$score >= 70) return '#ff3b30';
    if (props.$score >= 50) return '#ff9500';
    return theme.colors.textSecondary;
  }};
`;

const SharedCount = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
`;

const ViewButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  background: rgba(0, 122, 255, 0.15);
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 122, 255, 0.25);
  }
`;

export default LinkedAccountsModal;

