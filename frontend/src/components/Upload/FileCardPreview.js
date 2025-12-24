/**
 * FileCardPreview - Preview section of a file card
 *
 * Features:
 * - Shows media preview with loading states
 * - Index badge for file number
 * - Status badge for upload status
 * - Remove button (visible on hover/touch)
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { FaTrash } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import MediaPreview from './MediaPreview';
import StatusBadge from './StatusBadge';
import { FILE_STATUS } from '../../hooks/useUploadState';

const FileCardPreview = memo(({
  file,
  index,
  status = FILE_STATUS.PENDING,
  statusData = {},
  onRemove,
  aspectRatio,
}) => {
  return (
    <PreviewSection $aspectRatio={aspectRatio}>
      <MediaPreview
        src={file.preview}
        isVideo={file.isVideo}
        status={status}
        alt={file.name}
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

      {/* Remove button - visible on hover/focus */}
      <RemoveButton
        onClick={onRemove}
        aria-label="Remove file"
        title="Remove file"
      >
        <FaTrash />
      </RemoveButton>
    </PreviewSection>
  );
});

FileCardPreview.displayName = 'FileCardPreview';

// Styled components
const PreviewSection = styled.div`
  position: relative;
  aspect-ratio: ${props => props.$aspectRatio || '4/3'};

  @media (min-width: ${theme.breakpoints.md}) {
    aspect-ratio: ${props => props.$aspectRatio || '16/10'};
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
  width: 32px;
  height: 32px;
  background: rgba(255, 59, 48, 0.9);
  border: none;
  border-radius: ${theme.radius.sm};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  /* Show on parent hover */
  *:hover > &,
  *:focus-within > & {
    opacity: 1;
  }

  &:hover {
    background: ${theme.colors.error};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid white;
    outline-offset: 2px;
  }

  /* Always visible on touch devices */
  @media (hover: none) {
    opacity: 1;
  }
`;

export default FileCardPreview;
