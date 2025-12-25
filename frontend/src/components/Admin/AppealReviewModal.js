/**
 * AppealReviewModal.js
 * 
 * Modal for reviewing and deciding on an appeal.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { FaGavel, FaCheck, FaTimes, FaUser, FaClock, FaShieldAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';
import { approveAppeal, denyAppeal } from '../../utils/api';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  FormGroup,
  Label,
  PrimaryButton,
} from './AdminStyles';

const AppealReviewModal = ({ show, appeal, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  if (!show || !appeal) return null;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await approveAppeal(appeal.id, notes || 'Appeal approved');
      onSuccess(t('admin.security.appealApproved'));
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.security.appealApproveError', 'Failed to approve appeal'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!notes || notes.length < 10) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await denyAppeal(appeal.id, notes);
      onSuccess(t('admin.security.appealDenied'));
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.security.appealDenyError', 'Failed to deny appeal'));
    } finally {
      setLoading(false);
    }
  };
  
  const getRestrictionColor = (type) => {
    switch (type) {
      case 'perm_ban': return '#ff3b30';
      case 'temp_ban': return '#ff9500';
      case 'shadowban': return '#8e8e93';
      case 'rate_limited': return '#af52de';
      default: return theme.colors.textSecondary;
    }
  };
  
  const formatDate = (ts) => new Date(ts).toLocaleString();
  
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
              <FaGavel /> {t('admin.security.reviewAppeal')}
            </ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>
          
          <ModalBody>
            {error && (
              <ErrorMessage>
                {error}
              </ErrorMessage>
            )}

            {/* User Info */}
            <InfoSection>
              <InfoRow>
                <FaUser />
                <InfoLabel>{t('admin.username')}:</InfoLabel>
                <InfoValue>{appeal.user?.username || `User ${appeal.userId}`}</InfoValue>
              </InfoRow>
              <InfoRow>
                <FaShieldAlt />
                <InfoLabel>{t('admin.security.restriction')}:</InfoLabel>
                <RestrictionBadge $color={getRestrictionColor(appeal.restrictionType)}>
                  {appeal.restrictionType}
                </RestrictionBadge>
              </InfoRow>
              <InfoRow>
                <FaClock />
                <InfoLabel>{t('admin.security.submitted')}:</InfoLabel>
                <InfoValue>{formatDate(appeal.createdAt)}</InfoValue>
              </InfoRow>
              {appeal.user?.warningCount > 0 && (
                <InfoRow>
                  <span>⚠️</span>
                  <InfoLabel>{t('admin.security.warnings')}:</InfoLabel>
                  <InfoValue>{appeal.user.warningCount}</InfoValue>
                </InfoRow>
              )}
              {appeal.user?.riskScore > 0 && (
                <InfoRow>
                  <span>📊</span>
                  <InfoLabel>{t('admin.security.riskScore')}:</InfoLabel>
                  <RiskScore $score={appeal.user.riskScore}>
                    {appeal.user.riskScore}
                  </RiskScore>
                </InfoRow>
              )}
            </InfoSection>
            
            {/* Appeal Text */}
            <AppealSection>
              <SectionLabel>{t('admin.security.userAppeal')}</SectionLabel>
              <AppealText>{appeal.appealText}</AppealText>
            </AppealSection>
            
            {/* Admin Notes */}
            <FormGroup>
              <Label>{t('admin.security.adminNotes')}</Label>
              <NotesTextarea 
                placeholder={t('admin.security.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <HelperText>
                {t('admin.security.denialNotesRequired')}
              </HelperText>
            </FormGroup>
            
            {/* Action Buttons */}
            <ActionButtons>
              <DenyButton 
                onClick={handleDeny} 
                disabled={loading || notes.length < 10}
              >
                <FaTimes /> {t('admin.security.denyAppeal')}
              </DenyButton>
              <ApproveButton 
                onClick={handleApprove} 
                disabled={loading}
              >
                <FaCheck /> {t('admin.security.approveAppeal')}
              </ApproveButton>
            </ActionButtons>
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>
  );
};

const ErrorMessage = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.md};
`;

const InfoSection = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} 0;
  
  svg {
    color: ${theme.colors.textSecondary};
    width: 16px;
  }
`;

const InfoLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const InfoValue = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const RestrictionBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: capitalize;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const RiskScore = styled.span`
  font-weight: ${theme.fontWeights.bold};
  color: ${props => {
    if (props.$score >= 70) return '#ff3b30';
    if (props.$score >= 50) return '#ff9500';
    return '#ffcc00';
  }};
`;

const AppealSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
`;

const AppealText = styled.div`
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
`;

const NotesTextarea = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

const HelperText = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  margin-top: ${theme.spacing.xs};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

const ApproveButton = styled(PrimaryButton)`
  flex: 1;
  background: linear-gradient(135deg, #34c759, #30d158);
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DenyButton = styled(PrimaryButton)`
  flex: 1;
  background: linear-gradient(135deg, #ff3b30, #ff6b6b);
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default AppealReviewModal;

