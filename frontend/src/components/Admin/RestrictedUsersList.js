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
import { theme, motionVariants } from '../../styles/DesignSystem';
import { getRestrictedUsers } from '../../utils/api';
import {
  HeaderRow,
  SectionTitle,
  ItemCount,
  SecondaryButton,
  Select,
} from './AdminStyles';
import BulkActionsModal from './BulkActionsModal';

const RESTRICTION_COLORS = {
  perm_ban: '#ff3b30',
  temp_ban: '#ff9500',
  shadowban: '#8e8e93',
  rate_limited: '#af52de',
  warning: '#ffcc00'
};

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
          <FaBan /> Restricted Users
          <ItemCount>{users.length} users</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <TypeFilter 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="perm_ban">Permanent Ban ({stats.perm_ban || 0})</option>
            <option value="temp_ban">Temporary Ban ({stats.temp_ban || 0})</option>
            <option value="shadowban">Shadowban ({stats.shadowban || 0})</option>
            <option value="rate_limited">Rate Limited ({stats.rate_limited || 0})</option>
            <option value="warning">Warning ({stats.warning || 0})</option>
          </TypeFilter>
          {selectedUsers.length > 0 && (
            <BulkButton onClick={() => setShowBulkActions(true)}>
              <FaUsers /> Bulk Action ({selectedUsers.length})
            </BulkButton>
          )}
          <SecondaryButton onClick={fetchUsers} disabled={loading}>
            <FaSync className={loading ? 'spin' : ''} />
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
          <HeaderCell $width="120px">Type</HeaderCell>
          <HeaderCell $width="150px">Reason</HeaderCell>
          <HeaderCell $width="100px">Expires</HeaderCell>
          <HeaderCell $width="80px">Risk</HeaderCell>
          <HeaderCell $width="80px">Warnings</HeaderCell>
          <HeaderCell $width="80px">Actions</HeaderCell>
        </TableHeader>
        
        <TableBody>
          {loading ? (
            <LoadingRow>
              <FaSync className="spin" /> Loading...
            </LoadingRow>
          ) : users.length === 0 ? (
            <EmptyRow>No restricted users found</EmptyRow>
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
                      {user.warningCount > 0 ? `⚠️ ${user.warningCount}` : '—'}
                    </Cell>
                    <Cell $width="80px">
                      <ActionButton onClick={() => onViewUser(user.id)}>
                        <FaEye />
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
  background: ${props => {
    if (props.$score >= 70) return 'rgba(255, 59, 48, 0.15)';
    if (props.$score >= 50) return 'rgba(255, 149, 0, 0.15)';
    return 'rgba(52, 199, 89, 0.15)';
  }};
  color: ${props => {
    if (props.$score >= 70) return '#ff3b30';
    if (props.$score >= 50) return '#ff9500';
    return '#34c759';
  }};
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

