/**
 * FileCardStatus - Status and warning display for a file card
 *
 * Extracted from FileCard for single responsibility.
 *
 * Features:
 * - Duplicate warning/error display
 * - Error message display
 * - Dismissible warnings
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { theme } from '../../../design-system';
import DuplicateWarningBanner from '../../UI/DuplicateWarningBanner';
import { FILE_STATUS } from '../../../hooks/useUploadState';
import { DUPLICATE_STATUS } from '../../../utils/errorHandler';

const FileCardStatus = memo(({
  file,
  fileStatus,
  onDismissWarning,
}) => {
  const status = fileStatus?.status || FILE_STATUS.PENDING;
  const hasWarning = status === FILE_STATUS.WARNING;
  const isBlocked = status === FILE_STATUS.BLOCKED;
  const hasError = status === FILE_STATUS.ERROR;

  // Determine duplicate info for warning/blocked states
  const duplicateInfo = fileStatus?.warning || fileStatus?.duplicate;
  const duplicateStatus = isBlocked
    ? DUPLICATE_STATUS.CONFIRMED_DUPLICATE
    : hasWarning
    ? DUPLICATE_STATUS.POSSIBLE_DUPLICATE
    : null;

  // Show nothing if no warning, error, or blocked state
  if (!hasWarning && !isBlocked && !hasError) {
    return null;
  }

  return (
    <StatusSection>
      {/* Duplicate Warning or Block */}
      {duplicateInfo && (hasWarning || isBlocked) && (
        <DuplicateWarningBanner
          status={duplicateStatus}
          message={duplicateInfo.explanation}
          similarity={duplicateInfo.similarity}
          existingMatch={duplicateInfo.existingMatch}
          onDismiss={hasWarning && onDismissWarning ? () => onDismissWarning(file.id) : undefined}
          compact
        />
      )}

      {/* Error Message (non-duplicate) */}
      {hasError && fileStatus?.error && !duplicateInfo && (
        <ErrorMessage role="alert">
          {fileStatus.error}
        </ErrorMessage>
      )}
    </StatusSection>
  );
});

FileCardStatus.displayName = 'FileCardStatus';

// Styled components
const StatusSection = styled.div`
  padding: ${theme.spacing.sm};
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const ErrorMessage = styled.div`
  padding: ${theme.spacing.sm};
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.sm};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.xs};
`;

export default FileCardStatus;
