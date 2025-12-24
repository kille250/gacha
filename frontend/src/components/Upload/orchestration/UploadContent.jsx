/**
 * UploadContent - Modal body content
 *
 * Renders the appropriate content based on upload flow state.
 * Handles progressive disclosure of UI elements.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle } from 'react-icons/fa';
import { theme } from '../../../styles/DesignSystem';
import { UPLOAD_FLOW_STATES } from '../../../hooks/useUploadState';
import { isEnabled, FEATURES, prefersReducedMotion } from '../../../utils/featureFlags';

import {
  DropZone,
  FileCard,
  BulkSettingsBar,
  UploadSummary,
  ValidationSummary,
  ProgressIndicator,
  AriaLiveRegion,
} from '../index';

const UploadContent = memo(({
  // State
  flowState,
  files,
  fileStatus,
  fileValidation,
  uploadProgress,
  error,
  bulkDefaults,
  duplicateWarnings,
  uploadResult,
  estimatedTime,
  uploadStep,
  validationError,
  liveAnnouncement,
  // Computed
  fileCount,
  isUploading,
  isComplete,
  hasWarnings,
  warningCount,
  // Actions
  onAddFiles,
  onRemoveFile,
  onUpdateMetadata,
  onCopyToAll,
  onRegenerateName,
  onDismissWarning,
  onTouchField,
  onSetBulkDefaults,
  onApplyBulkToAll,
  onGenerateAllNames,
  onClearWarnings,
  onDismissValidationError,
  // Props
  orderedRarities,
}) => {
  const reducedMotion = prefersReducedMotion();

  return (
    <Body>
      {/* Aria Live Region for announcements */}
      <AriaLiveRegion message={liveAnnouncement} />

      {/* Validation Error */}
      <AnimatePresence>
        {validationError && (
          <ValidationError
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            role="alert"
          >
            <FaExclamationTriangle aria-hidden="true" />
            <span>{validationError}</span>
            <DismissButton
              onClick={onDismissValidationError}
              aria-label="Dismiss error"
              type="button"
            >
              &times;
            </DismissButton>
          </ValidationError>
        )}
      </AnimatePresence>

      {/* Validation Summary */}
      {isEnabled(FEATURES.NEW_VALIDATION_UI) && files.length > 0 && !isUploading && (
        <ValidationSummary
          files={files}
          fileValidation={fileValidation}
          fileStatus={fileStatus}
        />
      )}

      {/* Progress Indicator - shown during upload */}
      {isUploading && isEnabled(FEATURES.ENHANCED_PROGRESS) && (
        <ProgressIndicator
          step={uploadStep}
          progress={uploadProgress.percentage}
          filesCompleted={uploadProgress.current}
          filesTotal={uploadProgress.total}
          estimatedTime={estimatedTime}
        />
      )}

      {/* Bulk Settings */}
      {!isUploading && (
        <BulkSettingsBar
          bulkDefaults={bulkDefaults}
          onBulkDefaultsChange={onSetBulkDefaults}
          onApplyToAll={onApplyBulkToAll}
          onGenerateNames={onGenerateAllNames}
          orderedRarities={orderedRarities}
          fileCount={fileCount}
          disabled={isUploading}
        />
      )}

      {/* Drop Zone */}
      {!isUploading && (
        <DropZoneWrapper>
          <DropZone
            onFilesSelected={onAddFiles}
            disabled={isUploading}
            maxFiles={50}
            currentFileCount={fileCount}
          />
        </DropZoneWrapper>
      )}

      {/* Files Grid */}
      {files.length > 0 && !isUploading && (
        <FilesSection>
          <FilesSectionHeader>
            <SectionTitle>
              {fileCount} File{fileCount !== 1 ? 's' : ''} Ready
            </SectionTitle>
            {hasWarnings && (
              <WarningBadge>
                <FaExclamationTriangle />
                {warningCount} warning{warningCount !== 1 ? 's' : ''}
              </WarningBadge>
            )}
          </FilesSectionHeader>

          <FilesGrid role="list" aria-label="Uploaded files">
            <AnimatePresence>
              {files.map((file, index) => (
                <FileCard
                  key={file.id}
                  file={file}
                  index={index}
                  fileStatus={fileStatus[file.id]}
                  fileValidation={fileValidation[file.id]}
                  orderedRarities={orderedRarities}
                  onUpdateMetadata={onUpdateMetadata}
                  onRemove={onRemoveFile}
                  onCopyToAll={onCopyToAll}
                  onRegenerateName={onRegenerateName}
                  onDismissWarning={onDismissWarning}
                  onTouchField={onTouchField}
                />
              ))}
            </AnimatePresence>
          </FilesGrid>
        </FilesSection>
      )}

      {/* Upload Result */}
      {isComplete && uploadResult && (
        <ResultSection>
          <UploadSummary
            result={uploadResult}
            duplicateWarnings={duplicateWarnings}
            onDismissWarnings={onClearWarnings}
          />
        </ResultSection>
      )}

      {/* Error State */}
      {flowState === UPLOAD_FLOW_STATES.ERROR && error && (
        <ErrorSection role="alert">
          <FaExclamationTriangle />
          <ErrorContent>
            <ErrorTitle>Upload failed</ErrorTitle>
            <ErrorMessage>{error}</ErrorMessage>
            <RetryHint>Please check your connection and try again.</RetryHint>
          </ErrorContent>
        </ErrorSection>
      )}
    </Body>
  );
});

UploadContent.displayName = 'UploadContent';

// Styled Components
const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.md};
  }
`;

const ValidationError = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.lg};

  svg {
    color: ${theme.colors.error};
    flex-shrink: 0;
  }

  span {
    flex: 1;
    color: ${theme.colors.error};
    font-size: ${theme.fontSizes.sm};
  }
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textMuted};
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const DropZoneWrapper = styled.div``;

const FilesSection = styled.section``;

const FilesSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.md};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const WarningBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 159, 10, 0.15);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.warning};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};

  svg {
    font-size: 10px;
  }
`;

const FilesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: ${theme.breakpoints.xl}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const ResultSection = styled.div``;

const ErrorSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.lg};

  > svg {
    color: ${theme.colors.error};
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.error};
  margin-bottom: ${theme.spacing.xs};
`;

const ErrorMessage = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
`;

const RetryHint = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

export default UploadContent;
