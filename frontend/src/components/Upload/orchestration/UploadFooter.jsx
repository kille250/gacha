/**
 * UploadFooter - Modal footer with action buttons
 *
 * Features:
 * - Keyboard shortcut hints
 * - Cancel and upload buttons
 * - Responsive layout
 * - Upload progress display
 */

import React, { memo, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaKeyboard } from 'react-icons/fa';
import { theme } from '../../../design-system';

const UploadFooter = memo(({
  fileCount,
  canSubmit,
  isUploading,
  uploadProgress,
  canUndo,
  onCancel,
  onUpload,
}) => {
  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');
  }, []);
  const modKey = isMac ? '\u2318' : 'Ctrl';

  return (
    <Footer>
      <FooterHint>
        <FaKeyboard aria-hidden="true" />
        <span>
          Paste: {modKey}+V | Upload: {modKey}+Enter
          {canUndo && ` | Undo: ${modKey}+Z`}
        </span>
      </FooterHint>
      <FooterButtons>
        <CancelButton onClick={onCancel} disabled={isUploading} type="button">
          Cancel
        </CancelButton>
        <UploadButton
          onClick={onUpload}
          disabled={!canSubmit || isUploading}
          title={`Upload (${modKey}+Enter)`}
          type="button"
        >
          {isUploading ? (
            <>
              <SpinnerIcon aria-hidden="true" />
              Uploading... {uploadProgress?.percentage || 0}%
            </>
          ) : (
            <>
              Upload {fileCount} Character{fileCount !== 1 ? 's' : ''}
            </>
          )}
        </UploadButton>
      </FooterButtons>
    </Footer>
  );
});

UploadFooter.displayName = 'UploadFooter';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
  flex-shrink: 0;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

const FooterHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};

  svg {
    font-size: 12px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    display: none;
  }
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column-reverse;
  }
`;

const CancelButton = styled.button`
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

const UploadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0, 113, 227, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

const SpinnerIcon = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export default UploadFooter;
