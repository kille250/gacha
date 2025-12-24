/**
 * ConfirmDialog - Confirmation modal for destructive actions
 */

import React from 'react';
import styled from 'styled-components';
import { MdWarning } from 'react-icons/md';
import { theme } from '../tokens';
import { Button } from '../primitives';
import Modal from './Modal';

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} 0;
`;

const IconWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${props => props.$variant === 'danger'
    ? 'rgba(255, 59, 48, 0.15)'
    : 'rgba(255, 159, 10, 0.15)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$variant === 'danger'
    ? theme.colors.error
    : theme.colors.warning};
  font-size: 28px;
`;

const Title = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const Message = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
  max-width: 320px;
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  width: 100%;
  margin-top: ${theme.spacing.md};

  > * {
    flex: 1;
  }
`;

/**
 * ConfirmDialog Component
 *
 * @param {boolean} isOpen - Whether dialog is visible
 * @param {Function} onClose - Cancel callback
 * @param {Function} onConfirm - Confirm callback
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmLabel - Confirm button label
 * @param {string} cancelLabel - Cancel button label
 * @param {'danger' | 'warning'} variant - Dialog variant
 * @param {boolean} loading - Show loading state on confirm
 * @param {React.ReactNode} icon - Custom icon
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  icon
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="400px"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      showCloseButton={false}
    >
      <Content>
        <IconWrapper $variant={variant}>
          {icon || <MdWarning />}
        </IconWrapper>
        <Title>{title}</Title>
        {message && <Message>{message}</Message>}
        <Actions>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </Actions>
      </Content>
    </Modal>
  );
};

export default ConfirmDialog;
