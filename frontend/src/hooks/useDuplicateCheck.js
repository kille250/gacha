/**
 * useDuplicateCheck - Hook for managing duplicate detection state during uploads
 *
 * Provides:
 * - Per-file duplicate status tracking
 * - Accumulated warnings for batch uploads
 * - Helper functions for updating status
 *
 * Usage:
 * ```
 * const {
 *   fileStatus,
 *   duplicateWarnings,
 *   updateFileStatus,
 *   addWarning,
 *   clearWarnings,
 *   hasBlockingDuplicates,
 *   hasPendingWarnings,
 * } = useDuplicateCheck();
 * ```
 */
import { useState, useCallback, useMemo } from 'react';
import { parseDuplicateWarning } from '../utils/errorHandler';

/**
 * File status types for duplicate checking
 */
export const FILE_CHECK_STATUS = {
  PENDING: 'pending',           // Not yet checked
  CHECKING: 'checking',         // Currently being checked/uploaded
  ACCEPTED: 'accepted',         // No duplicates found
  WARNING: 'warning',           // Possible duplicate, user can continue
  BLOCKED: 'blocked',           // Confirmed duplicate, must change media
  ERROR: 'error',               // Other error occurred
};

/**
 * Custom hook for managing duplicate detection state
 *
 * @param {Object} options - Hook options
 * @param {boolean} [options.autoAcknowledge=false] - Auto-acknowledge warnings
 * @returns {Object} Duplicate check state and helpers
 */
export const useDuplicateCheck = (options = {}) => {
  const { autoAcknowledge = false } = options;

  // Per-file status: { [fileId]: { status, warning?, error? } }
  const [fileStatus, setFileStatus] = useState({});

  // Accumulated warnings across all files
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);

  // Track which warnings have been acknowledged
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState(new Set());

  /**
   * Update status for a specific file
   */
  const updateFileStatus = useCallback((fileId, status, data = {}) => {
    setFileStatus(prev => ({
      ...prev,
      [fileId]: {
        status,
        ...data,
        updatedAt: Date.now(),
      },
    }));
  }, []);

  /**
   * Set file to checking state
   */
  const setFileChecking = useCallback((fileId, message) => {
    updateFileStatus(fileId, FILE_CHECK_STATUS.CHECKING, { message });
  }, [updateFileStatus]);

  /**
   * Set file to accepted state (no duplicates)
   */
  const setFileAccepted = useCallback((fileId) => {
    updateFileStatus(fileId, FILE_CHECK_STATUS.ACCEPTED);
  }, [updateFileStatus]);

  /**
   * Set file to warning state (possible duplicate)
   */
  const setFileWarning = useCallback((fileId, warningInfo) => {
    updateFileStatus(fileId, FILE_CHECK_STATUS.WARNING, {
      warning: warningInfo,
    });

    // Add to accumulated warnings
    setDuplicateWarnings(prev => {
      // Avoid duplicates
      if (prev.some(w => w.fileId === fileId)) {
        return prev.map(w => w.fileId === fileId ? { ...w, ...warningInfo, fileId } : w);
      }
      return [...prev, { ...warningInfo, fileId }];
    });

    // Auto-acknowledge if enabled
    if (autoAcknowledge) {
      setAcknowledgedWarnings(prev => new Set([...prev, fileId]));
    }
  }, [updateFileStatus, autoAcknowledge]);

  /**
   * Set file to blocked state (confirmed duplicate)
   */
  const setFileBlocked = useCallback((fileId, duplicateInfo) => {
    updateFileStatus(fileId, FILE_CHECK_STATUS.BLOCKED, {
      duplicate: duplicateInfo,
    });
  }, [updateFileStatus]);

  /**
   * Set file to error state
   */
  const setFileError = useCallback((fileId, error) => {
    updateFileStatus(fileId, FILE_CHECK_STATUS.ERROR, {
      error: typeof error === 'string' ? error : error.message,
    });
  }, [updateFileStatus]);

  /**
   * Process a successful upload response and extract duplicate warnings
   */
  const processUploadResponse = useCallback((fileId, responseData) => {
    const warning = parseDuplicateWarning(responseData);

    if (warning) {
      setFileWarning(fileId, warning);
      return { status: FILE_CHECK_STATUS.WARNING, warning };
    }

    setFileAccepted(fileId);
    return { status: FILE_CHECK_STATUS.ACCEPTED };
  }, [setFileWarning, setFileAccepted]);

  /**
   * Add a warning manually
   */
  const addWarning = useCallback((warning) => {
    setDuplicateWarnings(prev => [...prev, warning]);
  }, []);

  /**
   * Remove a warning for a specific file
   */
  const removeWarning = useCallback((fileId) => {
    setDuplicateWarnings(prev => prev.filter(w => w.fileId !== fileId));
    setAcknowledgedWarnings(prev => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  /**
   * Acknowledge a warning (user has seen it)
   */
  const acknowledgeWarning = useCallback((fileId) => {
    setAcknowledgedWarnings(prev => new Set([...prev, fileId]));
  }, []);

  /**
   * Acknowledge all current warnings
   */
  const acknowledgeAllWarnings = useCallback(() => {
    const allIds = duplicateWarnings.map(w => w.fileId);
    setAcknowledgedWarnings(new Set(allIds));
  }, [duplicateWarnings]);

  /**
   * Clear all warnings
   */
  const clearWarnings = useCallback(() => {
    setDuplicateWarnings([]);
    setAcknowledgedWarnings(new Set());
  }, []);

  /**
   * Clear status for a specific file
   */
  const clearFileStatus = useCallback((fileId) => {
    setFileStatus(prev => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
    removeWarning(fileId);
  }, [removeWarning]);

  /**
   * Clear all status
   */
  const clearAllStatus = useCallback(() => {
    setFileStatus({});
    clearWarnings();
  }, [clearWarnings]);

  /**
   * Reset status for a file (allow retry)
   */
  const resetFileStatus = useCallback((fileId) => {
    updateFileStatus(fileId, FILE_CHECK_STATUS.PENDING);
    removeWarning(fileId);
  }, [updateFileStatus, removeWarning]);

  // Computed properties
  const computedState = useMemo(() => {
    const statuses = Object.values(fileStatus);

    return {
      // Are there any files blocked by duplicates?
      hasBlockingDuplicates: statuses.some(f => f.status === FILE_CHECK_STATUS.BLOCKED),

      // Are there unacknowledged warnings?
      hasPendingWarnings: duplicateWarnings.some(w => !acknowledgedWarnings.has(w.fileId)),

      // Are any files currently being checked?
      isChecking: statuses.some(f => f.status === FILE_CHECK_STATUS.CHECKING),

      // Count of warnings
      warningCount: duplicateWarnings.length,

      // Count of blocked files
      blockedCount: statuses.filter(f => f.status === FILE_CHECK_STATUS.BLOCKED).length,

      // Unacknowledged warnings
      unacknowledgedWarnings: duplicateWarnings.filter(w => !acknowledgedWarnings.has(w.fileId)),
    };
  }, [fileStatus, duplicateWarnings, acknowledgedWarnings]);

  /**
   * Get status for a specific file
   */
  const getFileStatus = useCallback((fileId) => {
    return fileStatus[fileId]?.status || FILE_CHECK_STATUS.PENDING;
  }, [fileStatus]);

  /**
   * Get full info for a specific file
   */
  const getFileInfo = useCallback((fileId) => {
    return fileStatus[fileId] || { status: FILE_CHECK_STATUS.PENDING };
  }, [fileStatus]);

  /**
   * Check if a file has a warning
   */
  const fileHasWarning = useCallback((fileId) => {
    return fileStatus[fileId]?.status === FILE_CHECK_STATUS.WARNING;
  }, [fileStatus]);

  /**
   * Check if a file is blocked
   */
  const fileIsBlocked = useCallback((fileId) => {
    return fileStatus[fileId]?.status === FILE_CHECK_STATUS.BLOCKED;
  }, [fileStatus]);

  return {
    // State
    fileStatus,
    duplicateWarnings,
    acknowledgedWarnings,

    // Status updates
    updateFileStatus,
    setFileChecking,
    setFileAccepted,
    setFileWarning,
    setFileBlocked,
    setFileError,

    // Response processing
    processUploadResponse,

    // Warning management
    addWarning,
    removeWarning,
    acknowledgeWarning,
    acknowledgeAllWarnings,
    clearWarnings,

    // File status management
    clearFileStatus,
    clearAllStatus,
    resetFileStatus,

    // Getters
    getFileStatus,
    getFileInfo,
    fileHasWarning,
    fileIsBlocked,

    // Computed state
    ...computedState,
  };
};

export default useDuplicateCheck;
