/**
 * useUploadService - Hook wrapper for upload service
 *
 * Provides a React-friendly interface to the upload service
 * with state management integration.
 */

import { useCallback, useRef } from 'react';
import { getToken } from '../utils/authStorage';
import {
  uploadBatch,
  createBatches,
  processBatchResult,
  validateFilesForUpload,
  estimateUploadTime,
} from '../services/uploadService';
import { FILE_STATUS } from './useUploadState';
import { DUPLICATE_STATUS } from '../utils/errorHandler';

/**
 * Hook for upload operations
 * @param {Object} options - Hook options
 * @param {Function} options.updateFileStatus - Function to update file status
 * @param {Function} options.addWarning - Function to add duplicate warning
 * @param {Function} options.updateProgress - Function to update upload progress
 * @param {Function} options.onBatchStart - Callback when batch starts
 * @param {Function} options.onBatchComplete - Callback when batch completes
 * @returns {Object} Upload service methods
 */
export const useUploadService = ({
  updateFileStatus,
  addWarning,
  updateProgress,
  onBatchStart,
  onBatchComplete,
} = {}) => {
  const abortControllerRef = useRef(null);

  /**
   * Execute the full upload flow
   * @param {Array} files - Files to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  const executeUpload = useCallback(async (files, options = {}) => {
    const {
      batchSize = 10,
      onProgress,
      onStepChange,
    } = options;

    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    const batches = createBatches(files, batchSize);
    let totalCreated = 0;
    const allErrors = [];
    const allWarnings = [];

    onStepChange?.('uploading');

    for (let i = 0; i < batches.length; i++) {
      // Check for cancellation
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      const batch = batches[i];
      onBatchStart?.(i, batches.length);
      updateProgress?.(i, batches.length);
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
              updateFileStatus?.(fileData.id, FILE_STATUS.WARNING, {
                warning: {
                  status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
                  explanation: result.warning || 'Possible duplicate detected',
                  similarity: char.similarity,
                  existingMatch: char.existingMatch,
                },
              });
            } else {
              updateFileStatus?.(fileData.id, FILE_STATUS.ACCEPTED);
            }
          });
        }

        // Process errors
        processed.errors.forEach((err) => {
          const matchingFile = batch.find((f) => f.file.name === err.filename);
          if (matchingFile) {
            if (err.isDuplicate) {
              updateFileStatus?.(matchingFile.id, FILE_STATUS.BLOCKED, {
                duplicate: {
                  status: DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
                  explanation: err.error,
                  existingMatch: { name: err.duplicateOf },
                },
              });
            } else {
              updateFileStatus?.(matchingFile.id, FILE_STATUS.ERROR, {
                error: err.error,
              });
            }
          }
          allErrors.push(err);
        });

        // Collect warnings
        processed.warnings.forEach((w) => {
          addWarning?.(w);
          allWarnings.push(w);
        });

        onBatchComplete?.(i, batches.length, processed);
      } catch (batchErr) {
        // Handle batch-level errors
        batch.forEach((f) => {
          if (batchErr.isDuplicate) {
            updateFileStatus?.(f.id, FILE_STATUS.BLOCKED, {
              duplicate: batchErr.duplicateInfo,
            });
          } else {
            updateFileStatus?.(f.id, FILE_STATUS.ERROR, {
              error: batchErr.message,
            });
          }
          allErrors.push({
            filename: f.file.name,
            error: batchErr.message,
            isDuplicate: batchErr.isDuplicate,
            fileId: f.id,
          });
        });
      }
    }

    onStepChange?.('finalizing');
    updateProgress?.(batches.length, batches.length);

    return {
      message: `Successfully created ${totalCreated} characters`,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      totalCreated,
      totalWarnings: allWarnings.length,
      totalErrors: allErrors.length,
    };
  }, [updateFileStatus, addWarning, updateProgress, onBatchStart, onBatchComplete]);

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * Validate files before upload
   */
  const validate = useCallback((files) => {
    return validateFilesForUpload(files);
  }, []);

  /**
   * Estimate upload time
   */
  const estimate = useCallback((files) => {
    return estimateUploadTime(files);
  }, []);

  return {
    executeUpload,
    cancelUpload,
    validate,
    estimate,
  };
};

export default useUploadService;
