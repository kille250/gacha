/**
 * RestrictedUsersList.js
 * 
 * List of all currently restricted users with filtering.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBan, FaSync, FaEye, FaUsers } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { getRestrictedUsers } from '../../utils/api';
import { RESTRICTION_COLORS, getRiskColor } from '../../constants/securityConstants';
import {
  HeaderRow,
  SectionTitle,
  ItemCount,
  SecondaryButton,
  Select,
} from './Admin.styles';
import BulkActionsModal from './BulkActionsModal';

const RestrictedUsersList = ({ onViewUser, onSuccess }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRestrictedUsers(typeFilter || undefined);
      setUsers(data.users || []);
      setStats(data.byType || {});
    } catch (err) {
      console.error('Failed to fetch restricted users:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const toggleSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  };
  
  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers([...users]);
    }
  };
  
  const handleBulkSuccess = (message) => {
    if (onSuccess) onSuccess(message);
    setSelectedUsers([]);
    fetchUsers();
  };
  
  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };
  
  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaBan /> {t('admin.security.restrictedUsers')}
          <ItemCount>{users.length} {t('admin.users')}</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <TypeFilter 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label={t('admin.security.restrictionType')}
          >
            <option value="">{t('admin.security.allTypes')}</option>
            <option value="perm_ban">{t('admin.security.permanentBan')} ({stats.perm_ban || 0})</option>
            <option value="temp_ban">{t('admin.security.temporaryBan')} ({stats.temp_ban || 0})</option>
            <option value="shadowban">{t('admin.security.shadowban')} ({stats.shadowban || 0})</option>
            <option value="rate_limited">{t('admin.security.rateLimited')} ({stats.rate_limited || 0})</option>
            <option value="warning">{t('admin.security.warning')} ({stats.warning || 0})</option>
          </TypeFilter>
          {selectedUsers.length > 0 && (
            <BulkButton onClick={() => setShowBulkActions(true)} aria-label={t('admin.security.bulkActionSelected', { count: selectedUsers.length })}>
              <FaUsers aria-hidden="true" /> {t('admin.security.bulkAction')} ({selectedUsers.length})
            </BulkButton>
          )}
          <SecondaryButton onClick={fetchUsers} disabled={loading} aria-label={t('admin.security.refresh')}>
            <FaSync className={loading ? 'spin' : ''} aria-hidden="true" />
          </SecondaryButton>
        </HeaderActions>
      </HeaderRow>
      
      <UsersTable>
        <TableHeader>
          <HeaderCell $width="40px">
            <Checkbox 
              type="checkbox"
              checked={selectedUsers.length === users.length && users.length > 0}
              onChange={toggleSelectAll}
            />
          </HeaderCell>
          <HeaderCell>{t('admin.username')}</HeaderCell>
          <HeaderCell $width="120px">{t('admin.security.restrictionType')}</HeaderCell>
          <HeaderCell $width="150px">{t('admin.security.reason')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.expires')}</HeaderCell>
          <HeaderCell $width="80px">{t('admin.security.risk')}</HeaderCell>
          <HeaderCell $width="80px">{t('admin.security.warnings')}</HeaderCell>
          <HeaderCell $width="80px">{t('admin.security.actions')}</HeaderCell>
        </TableHeader>
        
        <TableBody>
          {loading ? (
            <LoadingRow>
              <FaSync className="spin" /> {t('common.loading')}
            </LoadingRow>
          ) : users.length === 0 ? (
            <EmptyRow>{t('admin.security.noRestrictedUsers')}</EmptyRow>
          ) : (
            <AnimatePresence>
              {users.map((user) => {
                const isSelected = selectedUsers.some(u => u.id === user.id);
                return (
                  <TableRow
                    key={user.id}
                    variants={motionVariants.staggerItem}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -20 }}
                    $selected={isSelected}
                  >
                    <Cell $width="40px">
                      <Checkbox 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(user)}
                      />
                    </Cell>
                    <Cell>
                      <Username>{user.username}</Username>
                    </Cell>
                    <Cell $width="120px">
                      <RestrictionBadge $color={RESTRICTION_COLORS[user.restrictionType]}>
                        {user.restrictionType.replace('_', ' ')}
                      </RestrictionBadge>
                    </Cell>
                    <Cell $width="150px">
                      <ReasonText>{user.restrictionReason || '—'}</ReasonText>
                    </Cell>
                    <Cell $width="100px">
                      <DateText>{formatDate(user.restrictedUntil)}</DateText>
                    </Cell>
                    <Cell $width="80px">
                      <RiskBadge $score={user.riskScore}>
                        {user.riskScore || 0}
                      </RiskBadge>
                    </Cell>
                    <Cell $width="80px">
                      {user.warningCount > 0 ? `${user.warningCount}` : '—'}
                    </Cell>
                    <Cell $width="80px">
                      <ActionButton onClick={() => onViewUser(user.id)} aria-label={t('admin.security.viewUserDetails')}>
                        <FaEye aria-hidden="true" />
                      </ActionButton>
                    </Cell>
                  </TableRow>
                );
              })}
            </AnimatePresence>
          )}
        </TableBody>
      </UsersTable>
      
      <BulkActionsModal
        show={showBulkActions}
        selectedUsers={selectedUsers}
        onClose={() => setShowBulkActions(false)}
        onSuccess={handleBulkSuccess}
      />
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

const TypeFilter = styled(Select)`
  width: auto;
  min-width: 180px;
`;

const BulkButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
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
`;

const HeaderCell = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
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
  background: ${props => props.$selected ? 'rgba(0, 122, 255, 0.1)' : 'transparent'};
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
`;

const EmptyRow = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
  color: ${theme.colors.textSecondary};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const Username = styled.span`
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const RestrictionBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const ReasonText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DateText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const RiskBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  background: ${props => `${getRiskColor(props.$score)}20`};
  color: ${props => getRiskColor(props.$score)};
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
  
  &:hover {
    background: rgba(0, 122, 255, 0.25);
  }
`;

export default RestrictedUsersList;

