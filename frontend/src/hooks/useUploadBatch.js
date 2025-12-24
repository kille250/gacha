/**
 * useUploadBatch - Hook for managing batch file uploads
 *
 * Features:
 * - Batch processing with configurable batch size
 * - Progress tracking
 * - Cancel support via AbortController
 * - Retry failed uploads
 * - Per-file status updates
 */
import { useState, useCallback, useRef } from 'react';
import { API_URL } from '../utils/api';
import { getToken } from '../utils/authStorage';
import { DUPLICATE_STATUS } from '../utils/errorHandler';

// Upload states
export const BATCH_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
  ERROR: 'error',
};

/**
 * @param {Object} options
 * @param {number} options.batchSize - Files per batch (default: 10)
 * @param {Function} options.onFileProgress - Callback for per-file progress
 * @param {Function} options.onBatchComplete - Callback when a batch completes
 * @returns {Object} upload state and controls
 */
export const useUploadBatch = ({
  batchSize = 10,
  onFileProgress,
  onBatchComplete,
} = {}) => {
  const [status, setStatus] = useState(BATCH_STATUS.IDLE);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const abortControllerRef = useRef(null);

  // Helper to chunk array
  const chunk = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // Upload a single batch
  const uploadSingleBatch = async (batchFiles, token, signal) => {
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
      signal,
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

  // Start upload
  const startUpload = useCallback(async (files) => {
    if (files.length === 0) return { success: false, error: 'No files to upload' };

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setStatus(BATCH_STATUS.UPLOADING);
    setProgress({ current: 0, total: files.length, percentage: 0 });
    setResults([]);
    setErrors([]);
    setWarnings([]);

    const token = getToken();
    const batches = chunk(files, batchSize);

    let totalCreated = 0;
    const allResults = [];
    const allErrors = [];
    const allWarnings = [];
    let filesProcessed = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        // Check if cancelled
        if (signal.aborted) {
          setStatus(BATCH_STATUS.CANCELLED);
          return { success: false, cancelled: true };
        }

        const batch = batches[i];

        try {
          const result = await uploadSingleBatch(batch, token, signal);
          totalCreated += result.characters?.length || 0;

          // Process each character in the result
          if (result.characters) {
            for (let charIndex = 0; charIndex < result.characters.length; charIndex++) {
              const char = result.characters[charIndex];
              const fileData = batch[charIndex];
              if (!fileData) continue;

              filesProcessed++;

              // Check for duplicate warnings
              if (result.warning || char.duplicateWarning) {
                const warning = {
                  fileId: fileData.id,
                  filename: fileData.file.name,
                  characterName: char.name,
                  status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
                  explanation: result.warning || 'Possible duplicate detected',
                  similarity: char.similarity,
                  existingMatch: char.existingMatch,
                };
                allWarnings.push(warning);

                if (onFileProgress) {
                  onFileProgress(fileData.id, 'warning', warning);
                }
              } else {
                allResults.push({
                  fileId: fileData.id,
                  character: char,
                });

                if (onFileProgress) {
                  onFileProgress(fileData.id, 'accepted');
                }
              }

              // Update progress
              const pct = Math.round((filesProcessed / files.length) * 100);
              setProgress({ current: filesProcessed, total: files.length, percentage: pct });
            }
          }

          // Collect any per-file errors
          if (result.errors) {
            result.errors.forEach((err) => {
              const matchingFile = batch.find((f) => f.file.name === err.filename);
              if (matchingFile) {
                allErrors.push({
                  fileId: matchingFile.id,
                  filename: err.filename,
                  error: err.error,
                  isDuplicate: err.duplicateOf || err.error?.includes('duplicate'),
                });

                if (onFileProgress) {
                  onFileProgress(
                    matchingFile.id,
                    err.duplicateOf ? 'blocked' : 'error',
                    { error: err.error }
                  );
                }
              }
            });
          }

          if (onBatchComplete) {
            onBatchComplete(i + 1, batches.length, result);
          }
        } catch (batchErr) {
          if (batchErr.name === 'AbortError') {
            setStatus(BATCH_STATUS.CANCELLED);
            return { success: false, cancelled: true };
          }

          // Mark all files in batch as failed
          batch.forEach((f) => {
            allErrors.push({
              fileId: f.id,
              filename: f.file.name,
              error: batchErr.message,
              isDuplicate: batchErr.isDuplicate,
              duplicateInfo: batchErr.duplicateInfo,
            });

            if (onFileProgress) {
              onFileProgress(
                f.id,
                batchErr.isDuplicate ? 'blocked' : 'error',
                { error: batchErr.message, duplicate: batchErr.duplicateInfo }
              );
            }
          });
        }
      }

      setResults(allResults);
      setErrors(allErrors);
      setWarnings(allWarnings);
      setProgress({ current: files.length, total: files.length, percentage: 100 });
      setStatus(BATCH_STATUS.COMPLETE);

      return {
        success: true,
        totalCreated,
        results: allResults,
        errors: allErrors,
        warnings: allWarnings,
      };
    } catch (err) {
      setStatus(BATCH_STATUS.ERROR);
      setErrors([{ error: err.message }]);
      return { success: false, error: err.message };
    }
  }, [batchSize, onFileProgress, onBatchComplete]);

  // Cancel upload
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus(BATCH_STATUS.CANCELLED);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setStatus(BATCH_STATUS.IDLE);
    setProgress({ current: 0, total: 0, percentage: 0 });
    setResults([]);
    setErrors([]);
    setWarnings([]);
    abortControllerRef.current = null;
  }, []);

  // Retry failed uploads
  const retryFailed = useCallback(async (files) => {
    const failedFileIds = new Set(errors.map(e => e.fileId));
    const failedFiles = files.filter(f => failedFileIds.has(f.id));

    if (failedFiles.length === 0) return { success: true, message: 'No failed files to retry' };

    // Clear previous errors for these files
    setErrors(prev => prev.filter(e => !failedFileIds.has(e.fileId)));

    return startUpload(failedFiles);
  }, [errors, startUpload]);

  return {
    // State
    status,
    progress,
    results,
    errors,
    warnings,
    isUploading: status === BATCH_STATUS.UPLOADING,
    isComplete: status === BATCH_STATUS.COMPLETE,
    isCancelled: status === BATCH_STATUS.CANCELLED,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,

    // Actions
    startUpload,
    cancel,
    reset,
    retryFailed,
  };
};

export default useUploadBatch;
