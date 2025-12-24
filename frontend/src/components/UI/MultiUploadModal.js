/**
 * MultiUploadModal - Batch character upload interface
 *
 * Refactored to use:
 * - useUploadState hook for centralized state management
 * - Modular Upload components for better maintainability
 * - Mobile-first responsive design
 * - Accessibility enhancements
 */
import React, { useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCloudUploadAlt, FaTimes, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/authStorage';
import { useRarity } from '../../context/RarityContext';
import { DUPLICATE_STATUS } from '../../utils/errorHandler';

// Import new modular components
import { DropZone, FileCard, BulkSettingsBar, UploadSummary } from '../Upload';
import { useUploadState, FILE_STATUS, UPLOAD_FLOW_STATES } from '../../hooks/useUploadState';

const MultiUploadModal = ({ show, onClose, onSuccess }) => {
  const { getOrderedRarities } = useRarity();
  const orderedRarities = getOrderedRarities();
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Use the centralized upload state hook
  const {
    flowState,
    files,
    fileStatus,
    fileValidation,
    uploadProgress,
    error,
    bulkDefaults,
    duplicateWarnings,
    uploadResult,
    fileCount,
    isUploading,
    isComplete,
    canSubmit,
    hasWarnings,
    warningCount,
    hasUnsavedChanges,
    addFiles,
    removeFile,
    updateMetadata,
    updateFileStatus,
    setBulkDefaults,
    applyBulkToAll,
    startUpload,
    updateProgress,
    completeUpload,
    setUploadError,
    clearSuccessful,
    addWarning,
    dismissWarning,
    clearWarnings,
    reset,
    copyToAll,
    touchField,
    touchAllFields,
  } = useUploadState({
    defaultBulk: {
      series: '',
      rarity: 'common',
      isR18: false,
    },
  });

  // Validation error state
  const [validationError, setValidationError] = React.useState(null);

  // Focus management
  useEffect(() => {
    if (show) {
      previousFocusRef.current = document.activeElement;
      // Focus the modal after animation
      const timer = setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [show]);

  // Fetch random names from API
  const fetchRandomNames = async (count) => {
    try {
      const response = await fetch(
        `https://randomuser.me/api/?results=${count}&nat=us,gb,jp,de,fr&inc=name`
      );
      const data = await response.json();
      return data.results.map((user) => {
        const { first, last } = user.name;
        return `${first} ${last}`;
      });
    } catch (err) {
      console.error('Failed to fetch random names:', err);
      const fallbackNames = [
        'Sakura', 'Hikari', 'Yuki', 'Luna', 'Aria', 'Nova', 'Ember', 'Iris',
        'Kai', 'Ryu', 'Hiro', 'Akira', 'Ren', 'Sora', 'Yuto', 'Haruki',
      ];
      return Array(count)
        .fill(null)
        .map(() => fallbackNames[Math.floor(Math.random() * fallbackNames.length)]);
    }
  };

  // Generate random name for a single file
  const handleRegenerateName = useCallback(async (id) => {
    const names = await fetchRandomNames(1);
    updateMetadata(id, 'name', names[0]);
  }, [updateMetadata]);

  // Generate names for all files
  const handleGenerateAllNames = useCallback(async () => {
    if (files.length === 0) return;
    const names = await fetchRandomNames(files.length);
    files.forEach((file, index) => {
      updateMetadata(file.id, 'name', names[index] || `Character ${index + 1}`);
    });
  }, [files, updateMetadata]);

  // Upload a single batch of files
  const uploadBatch = async (batchFiles, token) => {
    const formData = new FormData();

    batchFiles.forEach((f) => {
      formData.append('images', f.file);
    });

    const metadata = batchFiles.map((f) => ({
      name: f.name,
      series: f.series,
      rarity: f.rarity,
      isR18: f.isR18,
    }));
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${API_URL}/admin/characters/multi-upload`, {
      method: 'POST',
      headers: {
        'x-auth-token': token,
      },
      body: formData,
    });

    const text = await response.text();

    if (!text) {
      throw new Error('Server returned empty response');
    }

    const result = JSON.parse(text);

    if (!response.ok) {
      if (response.status === 409 && result.duplicateType) {
        const error = new Error(result.error || 'Duplicate detected');
        error.isDuplicate = true;
        error.duplicateInfo = {
          status: DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
          explanation: result.error,
          duplicateType: result.duplicateType,
          existingMatch: result.existingCharacter,
        };
        throw error;
      }
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  };

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) return;

    // Clear previous validation error
    setValidationError(null);

    // Touch all fields to show validation errors
    touchAllFields();

    // Validate all files have required fields
    const invalidFiles = files.filter((f) => !f.name || !f.series || !f.rarity);
    if (invalidFiles.length > 0) {
      setValidationError(
        `Please fill in all required fields (Name, Series, Rarity) for ${invalidFiles.length} file(s)`
      );
      return;
    }

    startUpload();

    const token = getToken();
    const BATCH_SIZE = 10;
    const batches = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    let totalCreated = 0;
    const allErrors = [];
    const allWarnings = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        updateProgress(i, batches.length);

        try {
          const result = await uploadBatch(batch, token);
          totalCreated += result.characters?.length || 0;

          // Process each character in the result
          if (result.characters) {
            result.characters.forEach((char, charIndex) => {
              const fileData = batch[charIndex];
              if (!fileData) return;

              // Check for duplicate warnings
              if (result.warning || char.duplicateWarning) {
                updateFileStatus(fileData.id, FILE_STATUS.WARNING, {
                  warning: {
                    status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
                    explanation: result.warning || 'Possible duplicate detected',
                    similarity: char.similarity,
                    existingMatch: char.existingMatch,
                  },
                });
                allWarnings.push({
                  fileId: fileData.id,
                  filename: fileData.file.name,
                  characterName: char.name,
                  status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
                  explanation: result.warning,
                });
              } else {
                updateFileStatus(fileData.id, FILE_STATUS.ACCEPTED);
              }
            });
          }

          // Collect any per-file errors
          if (result.errors) {
            result.errors.forEach((err) => {
              const matchingFile = batch.find((f) => f.file.name === err.filename);
              if (matchingFile) {
                if (err.duplicateOf || err.error?.includes('duplicate')) {
                  updateFileStatus(matchingFile.id, FILE_STATUS.BLOCKED, {
                    duplicate: {
                      status: DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
                      explanation: err.error,
                      existingMatch: { name: err.duplicateOf },
                    },
                  });
                } else {
                  updateFileStatus(matchingFile.id, FILE_STATUS.ERROR, {
                    error: err.error,
                  });
                }
              }
              allErrors.push(err);
            });
          }
        } catch (batchErr) {
          batch.forEach((f) => {
            if (batchErr.isDuplicate) {
              updateFileStatus(f.id, FILE_STATUS.BLOCKED, {
                duplicate: batchErr.duplicateInfo,
              });
            } else {
              updateFileStatus(f.id, FILE_STATUS.ERROR, {
                error: batchErr.message,
              });
            }
            allErrors.push({
              filename: f.file.name,
              error: batchErr.message,
              isDuplicate: batchErr.isDuplicate,
            });
          });
        }
      }

      updateProgress(batches.length, batches.length);

      // Add warnings to state
      allWarnings.forEach((w) => addWarning(w));

      const finalResult = {
        message: `Successfully created ${totalCreated} characters`,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        totalCreated,
        totalWarnings: allWarnings.length,
        totalErrors: allErrors.length,
      };

      completeUpload(finalResult);

      // Clear successfully uploaded files
      clearSuccessful();

      if (onSuccess && totalCreated > 0) {
        onSuccess(finalResult);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message);
    }
  };

  // Handle close
  const handleClose = () => {
    // Warn if there are unsaved changes or files selected
    if (hasUnsavedChanges && fileCount > 0) {
      const proceed = window.confirm(
        'You have unsaved changes. Are you sure you want to close? All files and metadata will be lost.'
      );
      if (!proceed) return;
    }
    // Warn if there are unacknowledged warnings
    else if (duplicateWarnings.length > 0) {
      const proceed = window.confirm('You have duplicate warnings. Close anyway?');
      if (!proceed) return;
    }

    reset();
    setValidationError(null);
    onClose();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Escape to close
    if (e.key === 'Escape') {
      handleClose();
      return;
    }

    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit && !isUploading) {
      e.preventDefault();
      handleUpload();
    }
  };

  // Handle paste to upload
  const handlePaste = useCallback((e) => {
    if (isUploading) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  }, [isUploading, addFiles]);

  if (!show) return null;

  return (
    <ModalOverlay
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <ModalContent
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        <ModalHeader>
          <HeaderTitle id="upload-modal-title">
            <FaCloudUploadAlt aria-hidden="true" />
            <span>Multi-Upload Characters</span>
          </HeaderTitle>
          <CloseButton
            onClick={handleClose}
            aria-label="Close modal"
            disabled={isUploading}
          >
            <FaTimes />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Validation Error */}
          <AnimatePresence>
            {validationError && (
              <ValidationError
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
              >
                <FaExclamationTriangle aria-hidden="true" />
                <span>{validationError}</span>
                <DismissButton
                  onClick={() => setValidationError(null)}
                  aria-label="Dismiss error"
                >
                  ×
                </DismissButton>
              </ValidationError>
            )}
          </AnimatePresence>

          {/* Bulk Settings */}
          <BulkSettingsBar
            bulkDefaults={bulkDefaults}
            onBulkDefaultsChange={setBulkDefaults}
            onApplyToAll={applyBulkToAll}
            onGenerateNames={handleGenerateAllNames}
            orderedRarities={orderedRarities}
            fileCount={fileCount}
            disabled={isUploading}
          />

          {/* Drop Zone */}
          <DropZoneWrapper>
            <DropZone
              onFilesSelected={addFiles}
              disabled={isUploading}
              maxFiles={50}
              currentFileCount={fileCount}
            />
          </DropZoneWrapper>

          {/* Files Grid */}
          {files.length > 0 && (
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

              <FilesGrid>
                <AnimatePresence>
                  {files.map((file, index) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      index={index}
                      fileStatus={fileStatus[file.id]}
                      fileValidation={fileValidation[file.id]}
                      orderedRarities={orderedRarities}
                      onUpdateMetadata={updateMetadata}
                      onRemove={removeFile}
                      onCopyToAll={copyToAll}
                      onRegenerateName={handleRegenerateName}
                      onDismissWarning={dismissWarning}
                      onTouchField={touchField}
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
                onDismissWarnings={clearWarnings}
              />
            </ResultSection>
          )}

          {/* Error State */}
          {flowState === UPLOAD_FLOW_STATES.ERROR && error && (
            <ErrorSection role="alert">
              <FaExclamationTriangle />
              <span>Error: {error}</span>
            </ErrorSection>
          )}
        </ModalBody>

        <ModalFooter>
          <FooterHint>
            Paste images from clipboard or press {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to upload
          </FooterHint>
          <FooterButtons>
            <CancelButton onClick={handleClose} disabled={isUploading}>
              Cancel
            </CancelButton>
            <UploadButton
              onClick={handleUpload}
              disabled={!canSubmit || isUploading}
              title={`Upload (${navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter)`}
            >
              {isUploading ? (
                <>
                  <FaSpinner className="spin" aria-hidden="true" />
                  Uploading... {uploadProgress.percentage}%
                </>
              ) : (
                <>
                  Upload {fileCount} Character{fileCount !== 1 ? 's' : ''}
                </>
              )}
            </UploadButton>
          </FooterButtons>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

// Keyframes
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.md};
  overflow-y: auto;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: 0;
    align-items: flex-end;
  }
`;

const ModalContent = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl};
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadows.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  overflow: hidden;

  &:focus {
    outline: none;
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    max-height: 95vh;
    border-radius: ${theme.radius.xl} ${theme.radius.xl} 0 0;
  }
`;

const ModalHeader = styled.div`
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

const ModalBody = styled.div`
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

  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ResultSection = styled.div``;

const ErrorSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};

  svg {
    flex-shrink: 0;
  }
`;

const ModalFooter = styled.div`
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
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  text-align: center;

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

  .spin {
    animation: ${spin} 1s linear infinite;
  }

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

export default MultiUploadModal;
