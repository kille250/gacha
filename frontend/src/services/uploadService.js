/**
 * Upload Service - Pure functions for file upload operations
 *
 * Extracted from MultiUploadModal for better testability and separation of concerns.
 * Handles all API communication for the upload flow.
 */

import { API_URL } from '../utils/api';
import { DUPLICATE_STATUS } from '../utils/errorHandler';

/**
 * Upload result structure
 * @typedef {Object} UploadResult
 * @property {Array} characters - Successfully created characters
 * @property {Array} errors - Per-file errors
 * @property {string} [warning] - Overall warning message
 */

/**
 * Batch result structure
 * @typedef {Object} BatchResult
 * @property {number} created - Number of characters created
 * @property {Array} errors - Errors from this batch
 * @property {Array} warnings - Warnings from this batch
 */

/**
 * Parse upload response and extract structured data
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>} Parsed result with status info
 */
export const parseUploadResponse = async (response) => {
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

/**
 * Upload a single batch of files
 * @param {Array} batchFiles - Files to upload with metadata
 * @param {string} token - Authentication token
 * @returns {Promise<UploadResult>}
 */
export const uploadBatch = async (batchFiles, token) => {
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

  return parseUploadResponse(response);
};

/**
 * Split files into optimal batch sizes
 * @param {Array} files - All files to upload
 * @param {number} batchSize - Maximum files per batch
 * @returns {Array<Array>} Array of file batches
 */
export const createBatches = (files, batchSize = 10) => {
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  return batches;
};

/**
 * Process batch result and categorize outcomes
 * @param {Object} result - Raw API result
 * @param {Array} batchFiles - Original batch files for matching
 * @returns {BatchResult}
 */
export const processBatchResult = (result, batchFiles) => {
  const created = result.characters?.length || 0;
  const errors = [];
  const warnings = [];

  // Process each character in the result
  if (result.characters) {
    result.characters.forEach((char, charIndex) => {
      const fileData = batchFiles[charIndex];
      if (!fileData) return;

      // Check for duplicate warnings
      if (result.warning || char.duplicateWarning) {
        warnings.push({
          fileId: fileData.id,
          filename: fileData.file.name,
          characterName: char.name,
          status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
          explanation: result.warning || 'Possible duplicate detected',
          similarity: char.similarity,
          existingMatch: char.existingMatch,
        });
      }
    });
  }

  // Collect any per-file errors
  if (result.errors) {
    result.errors.forEach((err) => {
      const matchingFile = batchFiles.find((f) => f.file.name === err.filename);
      errors.push({
        ...err,
        fileId: matchingFile?.id,
        isDuplicate: Boolean(err.duplicateOf || err.error?.includes('duplicate')),
      });
    });
  }

  return { created, errors, warnings };
};

/**
 * Calculate smooth progress percentage
 * @param {number} batchIndex - Current batch index (0-based)
 * @param {number} totalBatches - Total number of batches
 * @param {number} percentWithinBatch - Progress within current batch (0-100)
 * @returns {number} Overall progress percentage (0-100)
 */
export const calculateSmoothProgress = (batchIndex, totalBatches, percentWithinBatch = 100) => {
  if (totalBatches === 0) return 0;
  const batchWeight = 100 / totalBatches;
  const baseProgress = batchIndex * batchWeight;
  const withinBatchProgress = (percentWithinBatch / 100) * batchWeight;
  return Math.round(baseProgress + withinBatchProgress);
};

/**
 * Estimate upload time based on file sizes
 * @param {Array} files - Files to upload
 * @param {number} averageBytesPerSecond - Estimated upload speed (default 500KB/s)
 * @returns {Object} Time estimation
 */
export const estimateUploadTime = (files, averageBytesPerSecond = 500000) => {
  const totalBytes = files.reduce((sum, f) => sum + (f.file?.size || 0), 0);
  const seconds = Math.ceil(totalBytes / averageBytesPerSecond);

  return {
    seconds,
    formatted: seconds < 60
      ? `${seconds} seconds`
      : `${Math.ceil(seconds / 60)} minute${seconds >= 120 ? 's' : ''}`,
    totalBytes,
  };
};

/**
 * Validate files before upload
 * @param {Array} files - Files to validate
 * @returns {Object} Validation result
 */
export const validateFilesForUpload = (files) => {
  const invalidFiles = files.filter((f) => !f.name || !f.series || !f.rarity);
  const blockedFiles = files.filter((f) => f.status === 'blocked');

  return {
    isValid: invalidFiles.length === 0 && blockedFiles.length === 0,
    invalidCount: invalidFiles.length,
    blockedCount: blockedFiles.length,
    invalidFiles,
    blockedFiles,
    message: invalidFiles.length > 0
      ? `Please fill in all required fields (Name, Series, Rarity) for ${invalidFiles.length} file(s)`
      : blockedFiles.length > 0
        ? `${blockedFiles.length} file(s) are blocked due to duplicates`
        : null,
  };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const uploadService = {
  uploadBatch,
  createBatches,
  processBatchResult,
  parseUploadResponse,
  calculateSmoothProgress,
  estimateUploadTime,
  validateFilesForUpload,
  formatFileSize,
};

export default uploadService;
