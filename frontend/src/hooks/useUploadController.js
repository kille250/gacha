/**
 * useUploadController - Unified upload controller hook
 *
 * Wraps useUploadState with additional features:
 * - Aggregate validation
 * - Undo file removal
 * - Queue position tracking
 * - Time estimates
 * - Batch operations
 */
import { useCallback, useMemo, useState, useRef } from 'react';
import { useUploadState, FILE_STATUS } from './useUploadState';

// Estimate upload time based on file sizes
const estimateUploadTime = (files, bytesPerSecond = 500000) => {
  if (files.length === 0) return 0;

  const totalBytes = files.reduce((sum, file) => sum + (file.file?.size || 0), 0);
  const seconds = Math.ceil(totalBytes / bytesPerSecond);

  return {
    seconds,
    formatted: seconds < 60
      ? `${seconds} seconds`
      : `${Math.ceil(seconds / 60)} minute${seconds >= 120 ? 's' : ''}`,
  };
};

// Compute queue positions for files
const computeQueuePositions = (files, fileStatus) => {
  const positions = {};
  let position = 1;

  files.forEach((file) => {
    const status = fileStatus[file.id]?.status;
    if (status === FILE_STATUS.PENDING || status === FILE_STATUS.CHECKING) {
      positions[file.id] = position++;
    } else {
      positions[file.id] = null;
    }
  });

  return positions;
};

// Compute all validation issues
const computeAllIssues = (files, fileValidation, fileStatus) => {
  const issues = {
    missingFields: [],
    errors: [],
    warnings: [],
    total: 0,
  };

  files.forEach((file, index) => {
    const validation = fileValidation[file.id] || {};
    const status = fileStatus[file.id];

    // Missing fields
    const missing = [];
    if (!validation.name?.valid) missing.push('name');
    if (!validation.series?.valid) missing.push('series');
    if (!validation.rarity?.valid) missing.push('rarity');

    if (missing.length > 0) {
      issues.missingFields.push({
        fileId: file.id,
        index: index + 1,
        fileName: file.name || file.file?.name || `File ${index + 1}`,
        fields: missing,
      });
    }

    // Errors (blocked files)
    if (status?.status === FILE_STATUS.BLOCKED || status?.status === FILE_STATUS.ERROR) {
      issues.errors.push({
        fileId: file.id,
        index: index + 1,
        fileName: file.name || file.file?.name || `File ${index + 1}`,
        message: status.error || status.duplicate?.explanation || 'Cannot upload',
        isDuplicate: status?.status === FILE_STATUS.BLOCKED,
      });
    }

    // Warnings
    if (status?.status === FILE_STATUS.WARNING) {
      issues.warnings.push({
        fileId: file.id,
        index: index + 1,
        fileName: file.name || file.file?.name || `File ${index + 1}`,
        message: status.warning?.explanation || 'Possible duplicate',
        similarity: status.warning?.similarity,
      });
    }
  });

  issues.total = issues.missingFields.length + issues.errors.length + issues.warnings.length;

  return issues;
};

/**
 * Enhanced upload controller hook
 * @param {Object} options - Hook options
 * @param {Object} options.defaultBulk - Default bulk settings
 * @param {Function} options.onUndo - Callback when file is restored via undo
 * @returns {Object} Enhanced upload state and actions
 */
export const useUploadController = (options = {}) => {
  const { defaultBulk = {}, onUndo } = options;

  // Base upload state
  const uploadState = useUploadState({ defaultBulk });

  // Undo state - stores recently removed files
  const [undoStack, setUndoStack] = useState([]);
  const undoTimeoutRef = useRef(null);

  // Remove file with undo capability
  const removeFileWithUndo = useCallback((id, skipUndo = false) => {
    const file = uploadState.files.find((f) => f.id === id);
    if (!file) return;

    // Store file for undo
    if (!skipUndo) {
      const fileData = {
        ...file,
        removedAt: Date.now(),
      };

      setUndoStack((prev) => [...prev, fileData]);

      // Auto-clear undo after 10 seconds
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        setUndoStack((prev) => prev.filter((f) => Date.now() - f.removedAt < 10000));
      }, 10000);
    }

    uploadState.removeFile(id);
  }, [uploadState]);

  // Restore last removed file
  const undoRemove = useCallback(() => {
    if (undoStack.length === 0) return null;

    const lastRemoved = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    // Re-add the file
    if (lastRemoved.file) {
      uploadState.addFiles([lastRemoved.file]);
      onUndo?.(lastRemoved);
    }

    return lastRemoved;
  }, [undoStack, uploadState, onUndo]);

  // Clear undo stack
  const clearUndoStack = useCallback(() => {
    setUndoStack([]);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  }, []);

  // Remove all files with warnings
  const removeAllWarned = useCallback(() => {
    const warnedFiles = uploadState.files.filter(
      (f) => uploadState.fileStatus[f.id]?.status === FILE_STATUS.WARNING
    );
    warnedFiles.forEach((f) => removeFileWithUndo(f.id, true));
    return warnedFiles.length;
  }, [uploadState, removeFileWithUndo]);

  // Remove all files with errors
  const removeAllErrors = useCallback(() => {
    const errorFiles = uploadState.files.filter((f) => {
      const status = uploadState.fileStatus[f.id]?.status;
      return status === FILE_STATUS.BLOCKED || status === FILE_STATUS.ERROR;
    });
    errorFiles.forEach((f) => removeFileWithUndo(f.id, true));
    return errorFiles.length;
  }, [uploadState, removeFileWithUndo]);

  // Retry failed uploads
  const retryFailed = useCallback(() => {
    const failedFiles = uploadState.files.filter(
      (f) => uploadState.fileStatus[f.id]?.status === FILE_STATUS.ERROR
    );
    failedFiles.forEach((f) => {
      uploadState.updateFileStatus(f.id, FILE_STATUS.PENDING, {});
    });
    return failedFiles.length;
  }, [uploadState]);

  // Enhanced computed state
  const enhanced = useMemo(() => {
    const allIssues = computeAllIssues(
      uploadState.files,
      uploadState.fileValidation,
      uploadState.fileStatus
    );

    const queuePositions = computeQueuePositions(
      uploadState.files,
      uploadState.fileStatus
    );

    const estimatedTime = estimateUploadTime(uploadState.files);

    // Count by status
    const statusCounts = {
      pending: 0,
      checking: 0,
      uploading: 0,
      accepted: 0,
      warning: 0,
      blocked: 0,
      error: 0,
    };

    uploadState.files.forEach((file) => {
      const status = uploadState.fileStatus[file.id]?.status || FILE_STATUS.PENDING;
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    return {
      allIssues,
      queuePositions,
      estimatedTime,
      statusCounts,
      canUndo: undoStack.length > 0,
      lastRemovedFile: undoStack[undoStack.length - 1] || null,
      readyCount: uploadState.files.length - allIssues.missingFields.length - allIssues.errors.length,
    };
  }, [uploadState, undoStack]);

  return {
    // Original state
    ...uploadState,

    // Enhanced computed
    ...enhanced,

    // Enhanced actions
    removeFileWithUndo,
    undoRemove,
    clearUndoStack,
    removeAllWarned,
    removeAllErrors,
    retryFailed,
  };
};

export default useUploadController;
