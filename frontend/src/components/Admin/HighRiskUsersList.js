/**
 * HighRiskUsersList.js
 * 
 * Table view of high-risk users with filtering and actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserShield, FaSync, FaEye } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { getHighRiskUsers } from '../../utils/api';
import { getRiskColor } from '../../constants/securityConstants';
import {
  HeaderRow,
  SectionTitle,
  ItemCount,
  SecondaryButton,
  Select,
} from './Admin.styles';

const HighRiskUsersList = ({ onViewUser }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(30);
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHighRiskUsers(threshold, 100);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch high-risk users:', err);
    } finally {
      setLoading(false);
    }
  }, [threshold]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const getRiskLevel = (score) => {
    if (score >= 70) return t('admin.security.riskHigh');
    if (score >= 50) return t('admin.security.riskMedium');
    return t('admin.security.riskLow');
  };
  
  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaUserShield /> {t('admin.security.highRiskUsers')}
          <ItemCount>{users.length} {t('admin.users')}</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <ThresholdSelect 
            value={threshold} 
            onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
            aria-label={t('admin.security.threshold')}
          >
            <option value={30}>{t('admin.security.threshold')} 30+</option>
            <option value={50}>{t('admin.security.threshold')} 50+</option>
            <option value={70}>{t('admin.security.threshold')} 70+</option>
          </ThresholdSelect>
          <SecondaryButton onClick={fetchUsers} disabled={loading} aria-label={t('admin.security.refresh')}>
            <FaSync className={loading ? 'spin' : ''} aria-hidden="true" />
          </SecondaryButton>
        </HeaderActions>
      </HeaderRow>
      
      <UsersTable>
        <TableHeader>
          <HeaderCell $width="60px">#</HeaderCell>
          <HeaderCell>{t('admin.username')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.riskScore')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.riskLevel')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.warnings')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.devices')}</HeaderCell>
          <HeaderCell $width="120px">{t('admin.joined')}</HeaderCell>
          <HeaderCell $width="80px">{t('admin.security.actions')}</HeaderCell>
        </TableHeader>
        
        <TableBody>
          {loading ? (
            <LoadingRow>
              <FaSync className="spin" /> {t('common.loading')}
            </LoadingRow>
          ) : users.length === 0 ? (
            <EmptyRow>
              {t('admin.security.noHighRiskUsers')}
            </EmptyRow>
          ) : (
            <AnimatePresence>
              {users.map((user, index) => (
                <TableRow
                  key={user.id}
                  variants={motionVariants.staggerItem}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Cell $width="60px">#{index + 1}</Cell>
                  <Cell>
                    <Username>{user.username}</Username>
                  </Cell>
                  <Cell $width="100px">
                    <RiskScoreBadge $color={getRiskColor(user.riskScore)}>
                      {user.riskScore}
                    </RiskScoreBadge>
                  </Cell>
                  <Cell $width="100px">
                    <RiskLevel $color={getRiskColor(user.riskScore)}>
                      {getRiskLevel(user.riskScore)}
                    </RiskLevel>
                  </Cell>
                  <Cell $width="100px">
                    {user.warningCount > 0 ? (
                      <WarningBadge>⚠️ {user.warningCount}</WarningBadge>
                    ) : (
                      <span>—</span>
                    )}
                  </Cell>
                  <Cell $width="100px">{user.deviceCount || 0}</Cell>
                  <Cell $width="120px">
                    <DateText>{new Date(user.createdAt).toLocaleDateString()}</DateText>
                  </Cell>
                  <Cell $width="80px">
                    <ActionButton onClick={() => onViewUser(user.id)} aria-label={t('admin.security.viewUserDetails')}>
                      <FaEye aria-hidden="true" />
                    </ActionButton>
                  </Cell>
                </TableRow>
              ))}
            </AnimatePresence>
          )}
        </TableBody>
      </UsersTable>
    </Container>
  );
};

const Container = styled(motion.div)``;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ThresholdSelect = styled(Select)`
  width: auto;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
`;

const UsersTable = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: flex;
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const HeaderCell = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
`;

const TableBody = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const TableRow = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  transition: background ${theme.transitions.fast};
  
  &:hover { background: ${theme.colors.backgroundTertiary}; }
  &:last-child { border-bottom: none; }
`;

const Cell = styled.div`
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
  min-width: 0;
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;

const EmptyRow = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
  color: ${theme.colors.textSecondary};
`;

const Username = styled.span`
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const RiskScoreBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const RiskLevel = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${props => props.$color};
`;

const WarningBadge = styled.span`
  font-size: ${theme.fontSizes.sm};
`;

const DateText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.sm};
  background: rgba(0, 122, 255, 0.15);
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.primary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: rgba(0, 122, 255, 0.25);
  }
`;

export default HighRiskUsersList;

