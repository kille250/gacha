/**
 * UploadHeader - Modal header component
 *
 * Displays the modal title and close button.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import { theme } from '../../../design-system';

const UploadHeader = memo(({ onClose, disabled = false }) => {
  return (
    <Header>
      <HeaderTitle id="upload-modal-title">
        <FaCloudUploadAlt aria-hidden="true" />
        <span>Multi-Upload Characters</span>
      </HeaderTitle>
      <CloseButton
        onClick={onClose}
        aria-label="Close modal"
        disabled={disabled}
        type="button"
      >
        <FaTimes />
      </CloseButton>
    </Header>
  );
});

UploadHeader.displayName = 'UploadHeader';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const HeaderTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};

  svg {
    color: ${theme.colors.primary};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.lg};
  }
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    color: ${theme.colors.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default UploadHeader;
