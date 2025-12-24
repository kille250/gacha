/**
 * useUploadExecution - Hook for executing batch file uploads
 *
 * Extracts upload execution logic from MultiUploadModal for better
 * separation of concerns and testability.
 *
 * Features:
 * - Batch upload execution
 * - Progress tracking
 * - Per-file status updates
 * - Duplicate detection handling
 * - Cancellation support
 * - Network error handling
 */
import { useCallback, useRef, useState } from 'react';
import { uploadBatch, processBatchResult, createBatches } from '../services/uploadService';
import { FILE_STATUS } from './useUploadState';
import { DUPLICATE_STATUS } from '../utils/errorHandler';
import { getToken } from '../utils/authStorage';

/**
 * Upload execution states
 */
export const EXECUTION_STATE = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  FINALIZING: 'finalizing',
  COMPLETE: 'complete',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

/**
 * @param {Object} options
 * @param {Function} options.onProgress - Callback for progress updates (current, total)
 * @param {Function} options.onFileStatus - Callback for per-file status updates (fileId, status, data)
 * @param {Function} options.onWarning - Callback for duplicate warnings
 * @param {Function} options.onComplete - Callback on completion with results
 * @param {Function} options.onError - Callback on fatal error
 * @param {number} options.batchSize - Files per batch (default: 10)
 */
export const useUploadExecution = (options = {}) => {
  const {
    onProgress,
    onFileStatus,
    onWarning,
    onComplete,
    onError,
    batchSize = 10,
  } = options;

  const [executionState, setExecutionState] = useState(EXECUTION_STATE.IDLE);
  const [currentStep, setCurrentStep] = useState(null);
  const abortControllerRef = useRef(null);
  const isExecutingRef = useRef(false);

  /**
   * Execute upload for a list of files
   * @param {Array} files - Files to upload with metadata
   * @returns {Promise<Object>} Upload results
   */
  const execute = useCallback(async (files) => {
    if (isExecutingRef.current || files.length === 0) {
      return null;
    }

    isExecutingRef.current = true;
    abortControllerRef.current = new AbortController();

    setExecutionState(EXECUTION_STATE.PREPARING);
    setCurrentStep('preparing');

    const token = getToken();
    const batches = createBatches(files, batchSize);

    let totalCreated = 0;
    const allErrors = [];
    const allWarnings = [];

    try {
      setExecutionState(EXECUTION_STATE.UPLOADING);
      setCurrentStep('uploading');

      for (let i = 0; i < batches.length; i++) {
        // Check for cancellation
        if (abortControllerRef.current?.signal.aborted) {
          setExecutionState(EXECUTION_STATE.CANCELLED);
          isExecutingRef.current = false;
          return { cancelled: true };
        }

        const batch = batches[i];
        onProgress?.(i, batches.length);

        try {
          const result = await uploadBatch(batch, token);
          const processed = processBatchResult(result, batch);

          totalCreated += processed.created;

          // Update file statuses
          if (result.characters) {
            result.characters.forEach((char, charIndex) => {
              const fileData = batch[charIndex];
              if (!fileData) return;

              if (result.warning || char.duplicateWarning) {
                onFileStatus?.(fileData.id, FILE_STATUS.WARNING, {
                  warning: {
                    status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
                    explanation: result.warning || 'Possible duplicate detected',
                    similarity: char.similarity,
                    existingMatch: char.existingMatch,
                  },
                });
              } else {
                onFileStatus?.(fileData.id, FILE_STATUS.ACCEPTED);
              }
            });
          }

          // Process errors
          processed.errors.forEach((err) => {
            const matchingFile = batch.find((f) => f.file.name === err.filename);
            if (matchingFile) {
              if (err.isDuplicate) {
                onFileStatus?.(matchingFile.id, FILE_STATUS.BLOCKED, {
                  duplicate: {
                    status: DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
                    explanation: err.error,
                    existingMatch: { name: err.duplicateOf },
                  },
                });
              } else {
                onFileStatus?.(matchingFile.id, FILE_STATUS.ERROR, {
                  error: err.error,
                });
              }
            }
            allErrors.push(err);
          });

          // Collect warnings
          processed.warnings.forEach((w) => {
            onWarning?.(w);
            allWarnings.push(w);
          });
        } catch (batchErr) {
          // Handle batch-level errors
          batch.forEach((f) => {
            if (batchErr.isDuplicate) {
              onFileStatus?.(f.id, FILE_STATUS.BLOCKED, {
                duplicate: batchErr.duplicateInfo,
              });
            } else {
              onFileStatus?.(f.id, FILE_STATUS.ERROR, {
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

      setExecutionState(EXECUTION_STATE.FINALIZING);
      setCurrentStep('finalizing');
      onProgress?.(batches.length, batches.length);

      const finalResult = {
        message: `Successfully created ${totalCreated} characters`,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        totalCreated,
        totalWarnings: allWarnings.length,
        totalErrors: allErrors.length,
      };

      setExecutionState(EXECUTION_STATE.COMPLETE);
      setCurrentStep('complete');
      onComplete?.(finalResult);

      isExecutingRef.current = false;
      return finalResult;
    } catch (err) {
      console.error('Upload execution error:', err);
      setExecutionState(EXECUTION_STATE.ERROR);
      setCurrentStep(null);
      onError?.(err.message);
      isExecutingRef.current = false;
      throw err;
    }
  }, [batchSize, onProgress, onFileStatus, onWarning, onComplete, onError]);

  /**
   * Cancel ongoing upload
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setExecutionState(EXECUTION_STATE.CANCELLED);
    isExecutingRef.current = false;
  }, []);

  /**
   * Reset execution state
   */
  const reset = useCallback(() => {
    setExecutionState(EXECUTION_STATE.IDLE);
    setCurrentStep(null);
    isExecutingRef.current = false;
    abortControllerRef.current = null;
  }, []);

  return {
    execute,
    cancel,
    reset,
    executionState,
    currentStep,
    isExecuting: isExecutingRef.current,
    isIdle: executionState === EXECUTION_STATE.IDLE,
    isComplete: executionState === EXECUTION_STATE.COMPLETE,
    isCancelled: executionState === EXECUTION_STATE.CANCELLED,
    hasError: executionState === EXECUTION_STATE.ERROR,
  };
};

export default useUploadExecution;
