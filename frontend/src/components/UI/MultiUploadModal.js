/**
 * MultiUploadModal - Batch character upload interface
 *
 * Refactored to use decomposed components:
 * - UploadHeader: Modal header with title and close button
 * - UploadContent: Main body content with file management
 * - UploadFooter: Action buttons and keyboard hints
 *
 * Uses extracted hooks:
 * - useUploadController: Centralized state management
 * - useUploadExecution: Upload execution logic
 * - useNetworkStatus: Network connectivity monitoring
 *
 * Features:
 * - Centralized state management via useUploadController
 * - Swipe-to-delete on mobile
 * - Reduced motion support
 * - Keyboard shortcuts
 * - Accessibility announcements
 * - Network status awareness
 */
import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../design-system';
import { useRarity } from '../../context/RarityContext';
import { prefersReducedMotion, isEnabled, FEATURES } from '../../utils/featureFlags';

// Import orchestration components
import { UploadHeader, UploadFooter, UploadContent } from '../Upload';
import { UndoToast, UPLOAD_STEPS } from '../Upload';
import { useUploadController } from '../../hooks/useUploadController';
import { useUploadExecution } from '../../hooks/useUploadExecution';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const MultiUploadModal = ({ show, onClose, onSuccess }) => {
  const { getOrderedRarities } = useRarity();
  const orderedRarities = getOrderedRarities();
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const reducedMotion = prefersReducedMotion();

  // Network status monitoring
  const { isOnline, isSlowConnection, getStatusMessage } = useNetworkStatus();
  const networkWarning = getStatusMessage();

  // Local UI state
  const [validationError, setValidationError] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [uploadStep, setUploadStep] = useState(UPLOAD_STEPS.PREPARING);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Use the enhanced upload controller
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
    estimatedTime,
    canUndo,
    lastRemovedFile,
    addFiles,
    removeFileWithUndo,
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
    undoRemove,
    clearUndoStack,
  } = useUploadController({
    defaultBulk: {
      series: '',
      rarity: 'common',
      isR18: false,
    },
  });

  // Show undo toast when file is removed
  useEffect(() => {
    if (canUndo && isEnabled(FEATURES.UNDO_REMOVAL)) {
      setShowUndoToast(true);
    }
  }, [canUndo, lastRemovedFile?.id]);

  // Focus management
  useEffect(() => {
    if (show) {
      previousFocusRef.current = document.activeElement;
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
    setLiveAnnouncement('Generating random names for all files...');
    const names = await fetchRandomNames(files.length);
    files.forEach((file, index) => {
      updateMetadata(file.id, 'name', names[index] || `Character ${index + 1}`);
    });
    setLiveAnnouncement('Random names generated for all files.');
  }, [files, updateMetadata]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const restored = undoRemove();
    if (restored) {
      setShowUndoToast(false);
      setLiveAnnouncement(`File restored: ${restored.name || restored.file?.name || 'Unknown file'}`);
    }
  }, [undoRemove]);

  // Handle undo dismiss
  const handleUndoDismiss = useCallback(() => {
    setShowUndoToast(false);
    clearUndoStack();
  }, [clearUndoStack]);

  // Upload execution hook
  const {
    execute: executeUpload,
    currentStep,
  } = useUploadExecution({
    onProgress: (current, total) => {
      updateProgress(current, total);
      setLiveAnnouncement(`Uploading batch ${current + 1} of ${total}...`);
    },
    onFileStatus: updateFileStatus,
    onWarning: addWarning,
    onComplete: (result) => {
      setUploadStep(UPLOAD_STEPS.COMPLETE);
      completeUpload(result);

      if (result.totalErrors === 0) {
        setLiveAnnouncement(`Upload complete! ${result.totalCreated} characters created successfully.`);
      } else {
        setLiveAnnouncement(`Upload complete with ${result.totalErrors} errors. ${result.totalCreated} characters created.`);
      }

      clearSuccessful();

      if (onSuccess && result.totalCreated > 0) {
        onSuccess(result);
      }
    },
    onError: (errorMessage) => {
      setUploadError(errorMessage);
      setLiveAnnouncement(`Upload failed: ${errorMessage}`);
    },
  });

  // Update upload step based on execution state
  useEffect(() => {
    if (currentStep) {
      const stepMap = {
        preparing: UPLOAD_STEPS.PREPARING,
        uploading: UPLOAD_STEPS.UPLOADING,
        finalizing: UPLOAD_STEPS.FINALIZING,
        complete: UPLOAD_STEPS.COMPLETE,
      };
      if (stepMap[currentStep]) {
        setUploadStep(stepMap[currentStep]);
      }
    }
  }, [currentStep]);

  // Handle upload using extracted hook
  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    // Check network status
    if (!isOnline) {
      setValidationError('You are offline. Please check your connection and try again.');
      setLiveAnnouncement('Upload blocked: No network connection.');
      return;
    }

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
      setLiveAnnouncement(`Validation failed: ${invalidFiles.length} files have missing fields.`);
      return;
    }

    // Warn about slow connection but allow upload
    if (isSlowConnection) {
      setLiveAnnouncement('Slow connection detected. Upload may take longer than usual.');
    }

    startUpload();
    setUploadStep(UPLOAD_STEPS.PREPARING);
    setLiveAnnouncement(`Starting upload of ${files.length} files...`);

    try {
      await executeUpload(files);
    } catch (err) {
      console.error('Upload error:', err);
    }
  }, [
    files,
    isOnline,
    isSlowConnection,
    touchAllFields,
    startUpload,
    executeUpload,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
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
    setShowUndoToast(false);
    setUploadStep(UPLOAD_STEPS.PREPARING);
    onClose();
  }, [hasUnsavedChanges, fileCount, duplicateWarnings.length, reset, onClose]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
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

    // Cmd/Ctrl + Z to undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && canUndo && !isUploading) {
      e.preventDefault();
      handleUndo();
    }
  }, [canSubmit, isUploading, canUndo, handleClose, handleUndo, handleUpload]);

  // Handle paste to upload
  const handlePaste = useCallback((e) => {
    if (isUploading) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      addFiles(pastedFiles);
      setLiveAnnouncement(`${pastedFiles.length} file(s) added from clipboard.`);
    }
  }, [isUploading, addFiles]);

  // Handle file removal with undo support
  const handleRemoveFile = useCallback((id) => {
    const file = files.find((f) => f.id === id);
    removeFileWithUndo(id);
    if (file) {
      setLiveAnnouncement(`File removed: ${file.name || file.file?.name || 'Unknown file'}. Press Ctrl+Z to undo.`);
    }
  }, [files, removeFileWithUndo]);

  // Motion variants based on reduced motion preference
  const modalVariants = useMemo(() => {
    if (reducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    }
    return {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
    };
  }, [reducedMotion]);

  if (!show) return null;

  return (
    <>
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
          {...modalVariants}
          transition={{ duration: reducedMotion ? 0.1 : 0.2 }}
        >
          <UploadHeader
            onClose={handleClose}
            disabled={isUploading}
          />

          <UploadContent
            flowState={flowState}
            files={files}
            fileStatus={fileStatus}
            fileValidation={fileValidation}
            uploadProgress={uploadProgress}
            error={error}
            bulkDefaults={bulkDefaults}
            duplicateWarnings={duplicateWarnings}
            uploadResult={uploadResult}
            estimatedTime={estimatedTime}
            uploadStep={uploadStep}
            validationError={validationError}
            liveAnnouncement={liveAnnouncement}
            networkWarning={networkWarning}
            fileCount={fileCount}
            isUploading={isUploading}
            isComplete={isComplete}
            hasWarnings={hasWarnings}
            warningCount={warningCount}
            onAddFiles={addFiles}
            onRemoveFile={handleRemoveFile}
            onUpdateMetadata={updateMetadata}
            onCopyToAll={copyToAll}
            onRegenerateName={handleRegenerateName}
            onDismissWarning={dismissWarning}
            onTouchField={touchField}
            onSetBulkDefaults={setBulkDefaults}
            onApplyBulkToAll={applyBulkToAll}
            onGenerateAllNames={handleGenerateAllNames}
            onClearWarnings={clearWarnings}
            onDismissValidationError={() => setValidationError(null)}
            orderedRarities={orderedRarities}
          />

          <UploadFooter
            fileCount={fileCount}
            canSubmit={canSubmit}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            canUndo={canUndo}
            onCancel={handleClose}
            onUpload={handleUpload}
          />
        </ModalContent>
      </ModalOverlay>

      {/* Undo Toast */}
      {isEnabled(FEATURES.UNDO_REMOVAL) && (
        <UndoToast
          isVisible={showUndoToast && canUndo}
          fileName={lastRemovedFile?.name || lastRemovedFile?.file?.name}
          onUndo={handleUndo}
          onDismiss={handleUndoDismiss}
        />
      )}
    </>
  );
};

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

export default MultiUploadModal;
