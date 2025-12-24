/**
 * ConfirmDialog - Confirmation dialog for destructive actions
 *
 * Use when an action requires explicit user confirmation.
 */

import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../design-system';
import Modal from './Modal';
import { Button, ActionButton } from '../buttons';

const Content = styled.div`
  text-align: center;
`;

const Icon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.lg};
`;

const Title = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.sm};
`;

const Description = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: center;
  margin-top: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column-reverse;
  }
`;

/**
 * ConfirmDialog Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {Function} props.onClose - Called when dialog should close
 * @param {Function} props.onConfirm - Called when user confirms
 * @param {string} props.title - Dialog title
 * @param {string} props.description - Dialog description
 * @param {string} props.icon - Optional icon/emoji
 * @param {string} props.confirmLabel - Confirm button label (default: 'Confirm')
 * @param {string} props.cancelLabel - Cancel button label (default: 'Cancel')
 * @param {'danger' | 'primary' | 'warning'} props.variant - Button variant for confirm
 * @param {boolean} props.loading - Whether confirmation is in progress
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="400px"
      showCloseButton={false}
    >
      <Content>
        {icon && <Icon>{icon}</Icon>}
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
        <Actions>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <ActionButton
            variant={variant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </ActionButton>
        </Actions>
      </Content>
    </Modal>
  );
};

export default ConfirmDialog;
