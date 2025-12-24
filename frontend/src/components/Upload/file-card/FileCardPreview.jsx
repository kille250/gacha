/**
 * FileCardPreview - Preview section of a file card
 *
 * Extracted from FileCard for single responsibility.
 *
 * Features:
 * - Media preview with loading states
 * - Index badge for file number
 * - Status badge for upload status
 * - Remove button (WCAG-compliant 44x44 touch target)
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { FaTrash } from 'react-icons/fa';
import { theme } from '../../../styles/DesignSystem';
import MediaPreview from '../MediaPreview';
import StatusBadge from '../StatusBadge';
import { FILE_STATUS } from '../../../hooks/useUploadState';

const FileCardPreview = memo(({
  file,
  index,
  status = FILE_STATUS.PENDING,
  statusData = {},
  onRemove,
  disabled = false,
}) => {
  return (
    <PreviewSection>
      <MediaPreview
        src={file.preview}
        isVideo={file.isVideo}
        status={status === FILE_STATUS.CHECKING ? 'checking' : status === FILE_STATUS.UPLOADING ? 'uploading' : undefined}
        progress={statusData?.progress}
        alt={file.name || `File ${index + 1}`}
        fileSize={file.file?.size}
      />

      {/* Index badge */}
      <IndexBadge aria-label={`File number ${index + 1}`}>
        {index + 1}
      </IndexBadge>

      {/* Status badge */}
      <StatusBadgeWrapper>
        <StatusBadge
          status={status}
          compact
          title={statusData?.error || statusData?.message}
        />
      </StatusBadgeWrapper>

      {/* Remove button - WCAG compliant 44x44 touch target */}
      <RemoveButton
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.(file.id);
        }}
        aria-label={`Remove file ${file.name || index + 1}`}
        title="Remove file"
        type="button"
        disabled={disabled}
      >
        <FaTrash aria-hidden="true" />
      </RemoveButton>
    </PreviewSection>
  );
});

FileCardPreview.displayName = 'FileCardPreview';

// Styled components
const PreviewSection = styled.div`
  position: relative;
  aspect-ratio: 4/3;

  @media (min-width: ${theme.breakpoints.md}) {
    aspect-ratio: 16/10;
  }
`;

const IndexBadge = styled.div`
  position: absolute;
  bottom: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  width: 28px;
  height: 28px;
  background: ${theme.colors.primary};
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const StatusBadgeWrapper = styled.div`
  position: absolute;
  bottom: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
`;

const RemoveButton = styled.button`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  width: 44px;
  height: 44px;
  background: rgba(255, 59, 48, 0.9);
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
  /* Ensure minimum touch target size for WCAG compliance */
  min-width: 44px;
  min-height: 44px;

  /* Show on parent hover */
  ${PreviewSection}:hover &,
  ${PreviewSection}:focus-within & {
    opacity: 1;
  }

  &:hover:not(:disabled) {
    background: ${theme.colors.error};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid white;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Always visible on touch devices */
  @media (hover: none) {
    opacity: 1;
  }
`;

export default FileCardPreview;
