/**
 * BulkActionsModal.js
 * 
 * Modal for performing bulk actions on multiple users.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
} from './Admin.styles';

const RESTRICTION_TYPES = [
  { value: 'warning', labelKey: 'admin.security.restrictionTypes.warning', color: '#ffcc00' },
  { value: 'rate_limited', labelKey: 'admin.security.restrictionTypes.rateLimited', color: '#af52de' },
  { value: 'shadowban', labelKey: 'admin.security.restrictionTypes.shadowban', color: '#8e8e93' },
  { value: 'temp_ban', labelKey: 'admin.security.restrictionTypes.tempBan', color: '#ff9500' },
  { value: 'perm_ban', labelKey: 'admin.security.restrictionTypes.permBan', color: '#ff3b30' },
];

const DURATION_OPTIONS = [
  { value: '1h', labelKey: 'admin.security.durations.1h' },
  { value: '6h', labelKey: 'admin.security.durations.6h' },
  { value: '24h', labelKey: 'admin.security.durations.24h' },
  { value: '7d', labelKey: 'admin.security.durations.7d' },
  { value: '30d', labelKey: 'admin.security.durations.30d' },
];

const BulkActionsModal = ({ show, selectedUsers, onClose, onSuccess }) => {
  const { t } = useTranslation();
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
        onSuccess(t('admin.security.bulkActionApplied', { type: restrictionType, count: userIds.length }));
      } else {
        await bulkUnrestrictUsers(userIds, reason);
        onSuccess(t('admin.security.bulkActionRemoved', { count: userIds.length }));
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
              <FaUsers /> {t('admin.security.bulkActionTitle', { count: selectedUsers.length })}
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
                  <FaBan /> {t('admin.security.bulkActionRestrict')}
                </ActionTab>
                <ActionTab
                  $active={action === 'unrestrict'}
                  onClick={() => setAction('unrestrict')}
                >
                  <FaUndo /> {t('admin.security.bulkActionUnrestrict')}
                </ActionTab>
              </ActionTabs>
              
              {action === 'restrict' && (
                <>
                  <FormGroup>
                    <Label>{t('admin.security.restrictionType')}</Label>
                    <Select
                      value={restrictionType}
                      onChange={(e) => setRestrictionType(e.target.value)}
                    >
                      {RESTRICTION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {t(type.labelKey)}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>

                  {['temp_ban', 'rate_limited'].includes(restrictionType) && (
                    <FormGroup>
                      <Label>{t('admin.security.duration')}</Label>
                      <Select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      >
                        {DURATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                  )}
                </>
              )}
              
              <FormGroup>
                <Label>{t('admin.security.reason')}</Label>
                <Input
                  type="text"
                  placeholder={t('admin.security.reasonPlaceholderBulk')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormGroup>

              <ButtonRow>
                <SecondaryButton onClick={onClose}>{t('common.cancel')}</SecondaryButton>
                <PrimaryButton
                  onClick={() => setShowConfirm(true)}
                  disabled={!reason.trim()}
                >
                  {t('admin.security.continue')}
                </PrimaryButton>
              </ButtonRow>
            </ModalBody>
          ) : (
            <ConfirmPanel>
              <WarningIcon>
                <FaExclamationTriangle />
              </WarningIcon>
              <ConfirmTitle>{t('admin.security.bulkActionConfirm')}</ConfirmTitle>
              <ConfirmText>
                {action === 'restrict'
                  ? t('admin.security.bulkActionApplyRestrict', { type: restrictionType, count: selectedUsers.length })
                  : t('admin.security.bulkActionApplyUnrestrict', { count: selectedUsers.length })
                }
              </ConfirmText>

              <ConfirmButtons>
                <SecondaryButton onClick={() => setShowConfirm(false)}>
                  {t('common.back')}
                </SecondaryButton>
                <DangerButton onClick={handleSubmit} disabled={loading}>
                  {loading ? t('admin.security.processing') : t('common.confirm')}
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

