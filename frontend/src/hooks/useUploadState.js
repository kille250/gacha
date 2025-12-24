/**
 * useUploadState - Centralized state machine for the upload flow
 *
 * Provides:
 * - Predictable flow states (IDLE -> SELECTING -> READY -> UPLOADING -> COMPLETE)
 * - Per-file status tracking with duplicate detection
 * - Batch metadata management
 * - Upload progress tracking
 *
 * Usage:
 * ```
 * const {
 *   flowState,
 *   files,
 *   fileStatus,
 *   uploadProgress,
 *   addFiles,
 *   removeFile,
 *   updateMetadata,
 *   startUpload,
 *   canSubmit,
 * } = useUploadState({ onUpload, onSuccess });
 * ```
 */
import { useReducer, useCallback, useMemo } from 'react';
import { parseDuplicateWarning, DUPLICATE_STATUS } from '../utils/errorHandler';

// Flow states for the upload process
export const UPLOAD_FLOW_STATES = {
  IDLE: 'idle',           // No files selected
  SELECTING: 'selecting', // User adding/editing files
  READY: 'ready',         // All files validated, ready to upload
  UPLOADING: 'uploading', // Upload in progress
  COMPLETE: 'complete',   // All files processed
  ERROR: 'error',         // Fatal error occurred
};

// Per-file status types
export const FILE_STATUS = {
  PENDING: 'pending',     // Not yet checked
  CHECKING: 'checking',   // Currently being checked/uploaded
  ACCEPTED: 'accepted',   // No duplicates found
  WARNING: 'warning',     // Possible duplicate, user can continue
  BLOCKED: 'blocked',     // Confirmed duplicate, must change media
  ERROR: 'error',         // Other error occurred
  UPLOADING: 'uploading', // Currently uploading
};

// Action types
const ACTIONS = {
  ADD_FILES: 'ADD_FILES',
  REMOVE_FILE: 'REMOVE_FILE',
  UPDATE_METADATA: 'UPDATE_METADATA',
  UPDATE_FILE_STATUS: 'UPDATE_FILE_STATUS',
  SET_BULK_DEFAULTS: 'SET_BULK_DEFAULTS',
  APPLY_BULK_TO_ALL: 'APPLY_BULK_TO_ALL',
  START_UPLOAD: 'START_UPLOAD',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  UPLOAD_COMPLETE: 'UPLOAD_COMPLETE',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  RESET: 'RESET',
  SET_FLOW_STATE: 'SET_FLOW_STATE',
  CLEAR_SUCCESSFUL: 'CLEAR_SUCCESSFUL',
  ADD_WARNING: 'ADD_WARNING',
  DISMISS_WARNING: 'DISMISS_WARNING',
  CLEAR_WARNINGS: 'CLEAR_WARNINGS',
  TOUCH_FIELD: 'TOUCH_FIELD',
  TOUCH_ALL_FIELDS: 'TOUCH_ALL_FIELDS',
};

// Generate unique ID for files
const generateFileId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Compute field-level validation for a file
const computeFileValidation = (file) => ({
  name: {
    valid: Boolean(file.name?.trim()),
    error: !file.name?.trim() ? 'Name is required' : null,
    touched: false,
  },
  series: {
    valid: Boolean(file.series?.trim()),
    error: !file.series?.trim() ? 'Series is required' : null,
    touched: false,
  },
  rarity: {
    valid: Boolean(file.rarity),
    error: !file.rarity ? 'Rarity is required' : null,
    touched: false,
  },
});

// Initial state
const createInitialState = (defaultBulk = {}) => ({
  flowState: UPLOAD_FLOW_STATES.IDLE,
  files: [],
  fileStatus: {},
  fileValidation: {}, // Field-level validation state per file
  uploadProgress: { current: 0, total: 0, percentage: 0 },
  error: null,
  bulkDefaults: {
    series: defaultBulk.series || '',
    rarity: defaultBulk.rarity || 'common',
    isR18: defaultBulk.isR18 || false,
  },
  duplicateWarnings: [],
  uploadResult: null,
  hasUnsavedChanges: false, // Track if user has made changes
  initialFileCount: 0, // Track initial file count for unsaved changes detection
});

// Reducer function
function uploadReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_FILES: {
      const newFiles = action.files.map((file) => ({
        id: generateFileId(),
        file,
        preview: URL.createObjectURL(file),
        name: '',
        series: state.bulkDefaults.series,
        rarity: state.bulkDefaults.rarity,
        isR18: state.bulkDefaults.isR18,
        isVideo: file.type.startsWith('video/'),
      }));

      const newFileStatus = {};
      const newFileValidation = {};
      newFiles.forEach(f => {
        newFileStatus[f.id] = { status: FILE_STATUS.PENDING };
        newFileValidation[f.id] = computeFileValidation(f);
      });

      const updatedFiles = [...state.files, ...newFiles];
      return {
        ...state,
        flowState: UPLOAD_FLOW_STATES.SELECTING,
        files: updatedFiles,
        fileStatus: { ...state.fileStatus, ...newFileStatus },
        fileValidation: { ...state.fileValidation, ...newFileValidation },
        hasUnsavedChanges: true,
        initialFileCount: state.initialFileCount || updatedFiles.length,
      };
    }

    case ACTIONS.REMOVE_FILE: {
      const fileToRemove = state.files.find(f => f.id === action.id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }

      const newFiles = state.files.filter(f => f.id !== action.id);
      const newFileStatus = { ...state.fileStatus };
      const newFileValidation = { ...state.fileValidation };
      delete newFileStatus[action.id];
      delete newFileValidation[action.id];

      return {
        ...state,
        flowState: newFiles.length === 0 ? UPLOAD_FLOW_STATES.IDLE : state.flowState,
        files: newFiles,
        fileStatus: newFileStatus,
        fileValidation: newFileValidation,
        duplicateWarnings: state.duplicateWarnings.filter(w => w.fileId !== action.id),
        hasUnsavedChanges: newFiles.length > 0,
      };
    }

    case ACTIONS.UPDATE_METADATA: {
      const updatedFiles = state.files.map(f =>
        f.id === action.id ? { ...f, [action.field]: action.value } : f
      );
      const updatedFile = updatedFiles.find(f => f.id === action.id);

      // Update validation for this file, marking the field as touched
      const currentValidation = state.fileValidation[action.id] || {};
      const newValidation = computeFileValidation(updatedFile);

      // Mark the changed field as touched
      if (newValidation[action.field]) {
        newValidation[action.field].touched = true;
      }
      // Preserve touched state for other fields
      Object.keys(currentValidation).forEach(field => {
        if (field !== action.field && newValidation[field]) {
          newValidation[field].touched = currentValidation[field]?.touched || false;
        }
      });

      return {
        ...state,
        flowState: UPLOAD_FLOW_STATES.SELECTING,
        files: updatedFiles,
        fileValidation: {
          ...state.fileValidation,
          [action.id]: newValidation,
        },
        hasUnsavedChanges: true,
      };
    }

    case ACTIONS.UPDATE_FILE_STATUS: {
      return {
        ...state,
        fileStatus: {
          ...state.fileStatus,
          [action.id]: {
            status: action.status,
            ...action.data,
            updatedAt: Date.now(),
          },
        },
      };
    }

    case ACTIONS.SET_BULK_DEFAULTS: {
      return {
        ...state,
        bulkDefaults: {
          ...state.bulkDefaults,
          ...action.defaults,
        },
      };
    }

    case ACTIONS.APPLY_BULK_TO_ALL: {
      const updatedFiles = state.files.map(f => ({
        ...f,
        series: state.bulkDefaults.series || f.series,
        rarity: state.bulkDefaults.rarity,
        isR18: state.bulkDefaults.isR18,
      }));

      // Recompute validation for all files
      const newFileValidation = {};
      updatedFiles.forEach(f => {
        const currentValidation = state.fileValidation[f.id] || {};
        const newValidation = computeFileValidation(f);
        // Mark series as touched if bulk applied
        if (state.bulkDefaults.series && newValidation.series) {
          newValidation.series.touched = true;
        }
        // Preserve name touched state
        if (newValidation.name) {
          newValidation.name.touched = currentValidation.name?.touched || false;
        }
        newFileValidation[f.id] = newValidation;
      });

      return {
        ...state,
        files: updatedFiles,
        fileValidation: newFileValidation,
        hasUnsavedChanges: true,
      };
    }

    case ACTIONS.START_UPLOAD: {
      const checkingStatus = {};
      state.files.forEach(f => {
        checkingStatus[f.id] = {
          status: FILE_STATUS.CHECKING,
          message: f.isVideo ? 'Analyzing video...' : 'Checking...',
        };
      });

      return {
        ...state,
        flowState: UPLOAD_FLOW_STATES.UPLOADING,
        fileStatus: checkingStatus,
        uploadProgress: { current: 0, total: state.files.length, percentage: 0 },
        error: null,
        duplicateWarnings: [],
        uploadResult: null,
      };
    }

    case ACTIONS.UPDATE_PROGRESS: {
      const percentage = action.total > 0
        ? Math.round((action.current / action.total) * 100)
        : 0;
      return {
        ...state,
        uploadProgress: {
          current: action.current,
          total: action.total,
          percentage,
        },
      };
    }

    case ACTIONS.UPLOAD_COMPLETE: {
      return {
        ...state,
        flowState: UPLOAD_FLOW_STATES.COMPLETE,
        uploadProgress: {
          current: state.uploadProgress.total,
          total: state.uploadProgress.total,
          percentage: 100
        },
        uploadResult: action.result,
      };
    }

    case ACTIONS.UPLOAD_ERROR: {
      return {
        ...state,
        flowState: UPLOAD_FLOW_STATES.ERROR,
        error: action.error,
      };
    }

    case ACTIONS.CLEAR_SUCCESSFUL: {
      const successfulIds = new Set(
        Object.entries(state.fileStatus)
          .filter(([, status]) => status.status === FILE_STATUS.ACCEPTED)
          .map(([id]) => id)
      );

      // Cleanup preview URLs
      state.files.forEach(f => {
        if (successfulIds.has(f.id)) {
          URL.revokeObjectURL(f.preview);
        }
      });

      const remainingFiles = state.files.filter(f => !successfulIds.has(f.id));
      const newFileStatus = { ...state.fileStatus };
      const newFileValidation = { ...state.fileValidation };
      successfulIds.forEach(id => {
        delete newFileStatus[id];
        delete newFileValidation[id];
      });

      return {
        ...state,
        files: remainingFiles,
        fileStatus: newFileStatus,
        fileValidation: newFileValidation,
        flowState: remainingFiles.length === 0
          ? UPLOAD_FLOW_STATES.IDLE
          : UPLOAD_FLOW_STATES.SELECTING,
        hasUnsavedChanges: remainingFiles.length > 0,
      };
    }

    case ACTIONS.ADD_WARNING: {
      const existing = state.duplicateWarnings.find(w => w.fileId === action.warning.fileId);
      if (existing) {
        return {
          ...state,
          duplicateWarnings: state.duplicateWarnings.map(w =>
            w.fileId === action.warning.fileId ? { ...w, ...action.warning } : w
          ),
        };
      }
      return {
        ...state,
        duplicateWarnings: [...state.duplicateWarnings, action.warning],
      };
    }

    case ACTIONS.DISMISS_WARNING: {
      return {
        ...state,
        duplicateWarnings: state.duplicateWarnings.filter(w => w.fileId !== action.id),
      };
    }

    case ACTIONS.CLEAR_WARNINGS: {
      return {
        ...state,
        duplicateWarnings: [],
      };
    }

    case ACTIONS.SET_FLOW_STATE: {
      return {
        ...state,
        flowState: action.flowState,
      };
    }

    case ACTIONS.TOUCH_FIELD: {
      const currentValidation = state.fileValidation[action.id] || {};
      const file = state.files.find(f => f.id === action.id);
      if (!file) return state;

      const newValidation = computeFileValidation(file);
      // Mark the specific field as touched
      if (newValidation[action.field]) {
        newValidation[action.field].touched = true;
      }
      // Preserve touched state for other fields
      Object.keys(currentValidation).forEach(field => {
        if (field !== action.field && newValidation[field]) {
          newValidation[field].touched = currentValidation[field]?.touched || false;
        }
      });

      return {
        ...state,
        fileValidation: {
          ...state.fileValidation,
          [action.id]: newValidation,
        },
      };
    }

    case ACTIONS.TOUCH_ALL_FIELDS: {
      const newFileValidation = {};
      state.files.forEach(f => {
        const validation = computeFileValidation(f);
        // Mark all fields as touched
        Object.keys(validation).forEach(field => {
          validation[field].touched = true;
        });
        newFileValidation[f.id] = validation;
      });

      return {
        ...state,
        fileValidation: newFileValidation,
      };
    }

    case ACTIONS.RESET: {
      // Cleanup all preview URLs
      state.files.forEach(f => URL.revokeObjectURL(f.preview));
      return createInitialState(state.bulkDefaults);
    }

    default:
      return state;
  }
}

/**
 * Main upload state hook
 * @param {Object} options - Hook options
 * @param {Object} options.defaultBulk - Default bulk settings
 * @returns {Object} Upload state and actions
 */
export const useUploadState = (options = {}) => {
  const { defaultBulk = {} } = options;

  const [state, dispatch] = useReducer(
    uploadReducer,
    defaultBulk,
    createInitialState
  );

  // Actions
  const addFiles = useCallback((rawFiles) => {
    const validFiles = Array.from(rawFiles).filter(file =>
      file.type.startsWith('image/') ||
      file.type === 'video/mp4' ||
      file.type === 'video/webm'
    );

    if (validFiles.length > 0) {
      dispatch({ type: ACTIONS.ADD_FILES, files: validFiles });
    }

    return validFiles.length;
  }, []);

  const removeFile = useCallback((id) => {
    dispatch({ type: ACTIONS.REMOVE_FILE, id });
  }, []);

  const updateMetadata = useCallback((id, field, value) => {
    dispatch({ type: ACTIONS.UPDATE_METADATA, id, field, value });
  }, []);

  const updateFileStatus = useCallback((id, status, data = {}) => {
    dispatch({ type: ACTIONS.UPDATE_FILE_STATUS, id, status, data });
  }, []);

  const setBulkDefaults = useCallback((defaults) => {
    dispatch({ type: ACTIONS.SET_BULK_DEFAULTS, defaults });
  }, []);

  const applyBulkToAll = useCallback(() => {
    dispatch({ type: ACTIONS.APPLY_BULK_TO_ALL });
  }, []);

  const startUpload = useCallback(() => {
    dispatch({ type: ACTIONS.START_UPLOAD });
  }, []);

  const updateProgress = useCallback((current, total) => {
    dispatch({ type: ACTIONS.UPDATE_PROGRESS, current, total });
  }, []);

  const completeUpload = useCallback((result) => {
    dispatch({ type: ACTIONS.UPLOAD_COMPLETE, result });
  }, []);

  const setUploadError = useCallback((error) => {
    dispatch({ type: ACTIONS.UPLOAD_ERROR, error });
  }, []);

  const clearSuccessful = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SUCCESSFUL });
  }, []);

  const addWarning = useCallback((warning) => {
    dispatch({ type: ACTIONS.ADD_WARNING, warning });
  }, []);

  const dismissWarning = useCallback((id) => {
    dispatch({ type: ACTIONS.DISMISS_WARNING, id });
  }, []);

  const clearWarnings = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_WARNINGS });
  }, []);

  const setFlowState = useCallback((flowState) => {
    dispatch({ type: ACTIONS.SET_FLOW_STATE, flowState });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: ACTIONS.RESET });
  }, []);

  // Touch a specific field to show validation errors
  const touchField = useCallback((id, field) => {
    dispatch({ type: ACTIONS.TOUCH_FIELD, id, field });
  }, []);

  // Touch all fields for all files (used before submission)
  const touchAllFields = useCallback(() => {
    dispatch({ type: ACTIONS.TOUCH_ALL_FIELDS });
  }, []);

  // Process upload response for a file
  const processFileResponse = useCallback((fileId, responseData, isError = false) => {
    if (isError) {
      const error = responseData;
      if (error.isDuplicate || error.duplicateInfo) {
        updateFileStatus(fileId, FILE_STATUS.BLOCKED, {
          duplicate: error.duplicateInfo || {
            status: DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
            explanation: error.message || 'Duplicate detected',
          },
        });
      } else {
        updateFileStatus(fileId, FILE_STATUS.ERROR, {
          error: error.message || 'Upload failed',
        });
      }
      return { status: FILE_STATUS.ERROR };
    }

    const warning = parseDuplicateWarning(responseData);
    if (warning) {
      updateFileStatus(fileId, FILE_STATUS.WARNING, { warning });
      addWarning({ fileId, ...warning });
      return { status: FILE_STATUS.WARNING, warning };
    }

    updateFileStatus(fileId, FILE_STATUS.ACCEPTED);
    return { status: FILE_STATUS.ACCEPTED };
  }, [updateFileStatus, addWarning]);

  // Copy metadata from one file to all others
  const copyToAll = useCallback((sourceId, field) => {
    const sourceFile = state.files.find(f => f.id === sourceId);
    if (sourceFile) {
      state.files.forEach(f => {
        if (f.id !== sourceId) {
          dispatch({
            type: ACTIONS.UPDATE_METADATA,
            id: f.id,
            field,
            value: sourceFile[field]
          });
        }
      });
    }
  }, [state.files]);

  // Computed state
  const computed = useMemo(() => {
    const filesWithStatus = state.files.map(f => ({
      ...f,
      status: state.fileStatus[f.id]?.status || FILE_STATUS.PENDING,
      statusData: state.fileStatus[f.id] || {},
    }));

    const invalidFiles = state.files.filter(f => !f.name || !f.series || !f.rarity);
    const hasBlockedFiles = Object.values(state.fileStatus).some(
      s => s.status === FILE_STATUS.BLOCKED
    );
    const hasErrors = Object.values(state.fileStatus).some(
      s => s.status === FILE_STATUS.ERROR
    );
    const isUploading = state.flowState === UPLOAD_FLOW_STATES.UPLOADING;
    const canSubmit =
      state.files.length > 0 &&
      invalidFiles.length === 0 &&
      !hasBlockedFiles &&
      !isUploading;

    return {
      filesWithStatus,
      fileCount: state.files.length,
      invalidCount: invalidFiles.length,
      hasBlockedFiles,
      hasErrors,
      hasWarnings: state.duplicateWarnings.length > 0,
      warningCount: state.duplicateWarnings.length,
      isUploading,
      isIdle: state.flowState === UPLOAD_FLOW_STATES.IDLE,
      isComplete: state.flowState === UPLOAD_FLOW_STATES.COMPLETE,
      canSubmit,
    };
  }, [state.files, state.fileStatus, state.flowState, state.duplicateWarnings]);

  return {
    // State
    flowState: state.flowState,
    files: state.files,
    fileStatus: state.fileStatus,
    fileValidation: state.fileValidation,
    uploadProgress: state.uploadProgress,
    error: state.error,
    bulkDefaults: state.bulkDefaults,
    duplicateWarnings: state.duplicateWarnings,
    uploadResult: state.uploadResult,
    hasUnsavedChanges: state.hasUnsavedChanges,

    // Computed
    ...computed,

    // Actions
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
    setFlowState,
    reset,
    processFileResponse,
    copyToAll,
    touchField,
    touchAllFields,
  };
};

export default useUploadState;
