/**
 * BulkActionsModal.js
 * 
 * Modal for performing bulk actions on multiple users.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { FaUsers, FaBan, FaUndo, FaExclamationTriangle } from 'react-icons/fa';
import { theme } from '../../design-system';
import { bulkRestrictUsers, bulkUnrestrictUsers } from '../../utils/api';
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

const BulkActionsModal = ({ show, selectedUsers, onClose, onSuccess }) => {
  const [action, setAction] = useState('restrict'); // 'restrict' or 'unrestrict'
  const [restrictionType, setRestrictionType] = useState('warning');
  const [duration, setDuration] = useState('24h');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;
    
    setLoading(true);
    try {
      const userIds = selectedUsers.map(u => u.id);
      
      if (action === 'restrict') {
        await bulkRestrictUsers(userIds, restrictionType, duration, reason);
        onSuccess(`Applied ${restrictionType} to ${userIds.length} user(s)`);
      } else {
        await bulkUnrestrictUsers(userIds, reason);
        onSuccess(`Removed restrictions from ${userIds.length} user(s)`);
      }
      
      setShowConfirm(false);
      onClose();
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (!show) return null;
  
  return (
    <AnimatePresence>
      <ModalOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => { if (e.target === e.currentTarget && !showConfirm) onClose(); }}
      >
        <ModalContent
          $maxWidth="500px"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <ModalHeader>
            <ModalTitle>
              <FaUsers /> Bulk Action ({selectedUsers.length} users)
            </ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>
          
          {!showConfirm ? (
            <ModalBody>
              <SelectedUsers>
                {selectedUsers.slice(0, 5).map(user => (
                  <UserBadge key={user.id}>{user.username}</UserBadge>
                ))}
                {selectedUsers.length > 5 && (
                  <UserBadge>+{selectedUsers.length - 5} more</UserBadge>
                )}
              </SelectedUsers>
              
              <ActionTabs>
                <ActionTab 
                  $active={action === 'restrict'}
                  onClick={() => setAction('restrict')}
                >
                  <FaBan /> Restrict
                </ActionTab>
                <ActionTab 
                  $active={action === 'unrestrict'}
                  onClick={() => setAction('unrestrict')}
                >
                  <FaUndo /> Unrestrict
                </ActionTab>
              </ActionTabs>
              
              {action === 'restrict' && (
                <>
                  <FormGroup>
                    <Label>Restriction Type</Label>
                    <Select 
                      value={restrictionType}
                      onChange={(e) => setRestrictionType(e.target.value)}
                    >
                      {RESTRICTION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  
                  {['temp_ban', 'rate_limited'].includes(restrictionType) && (
                    <FormGroup>
                      <Label>Duration</Label>
                      <Select 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      >
                        {DURATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                  )}
                </>
              )}
              
              <FormGroup>
                <Label>Reason</Label>
                <Input
                  type="text"
                  placeholder="Enter reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormGroup>
              
              <ButtonRow>
                <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                <PrimaryButton 
                  onClick={() => setShowConfirm(true)}
                  disabled={!reason.trim()}
                >
                  Continue
                </PrimaryButton>
              </ButtonRow>
            </ModalBody>
          ) : (
            <ConfirmPanel>
              <WarningIcon>
                <FaExclamationTriangle />
              </WarningIcon>
              <ConfirmTitle>Confirm Bulk Action</ConfirmTitle>
              <ConfirmText>
                {action === 'restrict' 
                  ? `Apply "${restrictionType}" to ${selectedUsers.length} user(s)?`
                  : `Remove restrictions from ${selectedUsers.length} user(s)?`
                }
              </ConfirmText>
              
              <ConfirmButtons>
                <SecondaryButton onClick={() => setShowConfirm(false)}>
                  Back
                </SecondaryButton>
                <DangerButton onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Processing...' : 'Confirm'}
                </DangerButton>
              </ConfirmButtons>
            </ConfirmPanel>
          )}
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>
  );
};

const SelectedUsers = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const UserBadge = styled.span`
  padding: 4px 10px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
`;

const ActionTabs = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const ActionTab = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${props => props.$active ? theme.colors.primary : theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: ${props => props.$active ? 'white' : theme.colors.textSecondary};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background: ${props => props.$active ? theme.colors.primaryHover : theme.colors.surface};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

const ConfirmPanel = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
`;

const WarningIcon = styled.div`
  font-size: 48px;
  color: ${theme.colors.warning};
  margin-bottom: ${theme.spacing.lg};
`;

const ConfirmTitle = styled.h3`
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const ConfirmText = styled.p`
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xl};
`;

const ConfirmButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.lg};
`;

const DangerButton = styled(PrimaryButton)`
  background: ${theme.colors.error};
  
  &:hover:not(:disabled) {
    background: #e0342a;
  }
`;

export default BulkActionsModal;

