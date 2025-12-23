/**
 * LinkedAccountsModal.js
 * 
 * Modal showing potentially linked accounts for a user.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { FaLink, FaFingerprint, FaGlobe, FaSync, FaEye } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import { getUserLinkedAccounts } from '../../utils/api';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
} from './AdminStyles';

const RESTRICTION_COLORS = {
  perm_ban: '#ff3b30',
  temp_ban: '#ff9500',
  shadowban: '#8e8e93',
  rate_limited: '#af52de',
  warning: '#ffcc00',
  none: '#34c759'
};

const LinkedAccountsModal = ({ show, userId, username, onClose, onViewUser }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchLinkedAccounts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getUserLinkedAccounts(userId);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch linked accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    if (show && userId) {
      fetchLinkedAccounts();
    }
  }, [show, userId, fetchLinkedAccounts]);
  
  const handleViewUser = (id) => {
    if (onViewUser) {
      onClose();
      setTimeout(() => onViewUser(id), 100);
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
              <FaLink /> Linked Accounts — {username || `User ${userId}`}
            </ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>
          
          <ModalBody>
            {loading ? (
              <LoadingState>
                <FaSync className="spin" /> Loading linked accounts...
              </LoadingState>
            ) : !data ? (
              <EmptyState>Failed to load linked accounts</EmptyState>
            ) : (
              <>
                <SummaryCard>
                  <SummaryItem>
                    <SummaryLabel>Total Linked</SummaryLabel>
                    <SummaryValue>{data.totalLinked || 0}</SummaryValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>By Fingerprint</SummaryLabel>
                    <SummaryValue>{data.linkedByFingerprint?.length || 0}</SummaryValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>By IP</SummaryLabel>
                    <SummaryValue>{data.linkedByIP?.length || 0}</SummaryValue>
                  </SummaryItem>
                </SummaryCard>
                
                {data.linkedByFingerprint?.length > 0 && (
                  <Section>
                    <SectionHeader>
                      <FaFingerprint /> Same Device Fingerprint
                    </SectionHeader>
                    <AccountList>
                      {data.linkedByFingerprint.map(account => (
                        <AccountItem key={account.id}>
                          <AccountInfo>
                            <AccountName>{account.username}</AccountName>
                            <AccountMeta>
                              <RestrictionBadge 
                                $color={RESTRICTION_COLORS[account.restrictionType] || RESTRICTION_COLORS.none}
                              >
                                {account.restrictionType || 'none'}
                              </RestrictionBadge>
                              <RiskBadge $score={account.riskScore}>
                                Risk: {account.riskScore || 0}
                              </RiskBadge>
                              <SharedCount>
                                {account.sharedFingerprints} shared
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
                      <FaGlobe /> Same IP Address
                    </SectionHeader>
                    <AccountList>
                      {data.linkedByIP.map(account => (
                        <AccountItem key={account.id}>
                          <AccountInfo>
                            <AccountName>{account.username}</AccountName>
                            <AccountMeta>
                              <RestrictionBadge 
                                $color={RESTRICTION_COLORS[account.restrictionType] || RESTRICTION_COLORS.none}
                              >
                                {account.restrictionType || 'none'}
                              </RestrictionBadge>
                              <RiskBadge $score={account.riskScore}>
                                Risk: {account.riskScore || 0}
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
                    No linked accounts detected
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

const AccountItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
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

