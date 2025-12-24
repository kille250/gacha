import React, { useState, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCloudUploadAlt, FaTimes, FaImage, FaVideo, FaTrash, FaCopy, FaCheck, FaExclamationTriangle, FaMagic, FaSpinner, FaTimesCircle } from 'react-icons/fa';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/authStorage';
import { useRarity } from '../../context/RarityContext';
import { parseDuplicateWarning, DUPLICATE_STATUS } from '../../utils/errorHandler';
import DuplicateWarningBanner from './DuplicateWarningBanner';

// File check status constants
const FILE_STATUS = {
  PENDING: 'pending',
  CHECKING: 'checking',
  ACCEPTED: 'accepted',
  WARNING: 'warning',
  BLOCKED: 'blocked',
  ERROR: 'error',
};

const MultiUploadModal = ({ show, onClose, onSuccess }) => {
  const { getOrderedRarities } = useRarity();
  const orderedRarities = getOrderedRarities();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [generatingNames, setGeneratingNames] = useState(false);
  const fileInputRef = useRef(null);

  // Default values for bulk apply
  const [bulkSeries, setBulkSeries] = useState('');
  const [bulkRarity, setBulkRarity] = useState('common');
  const [bulkIsR18, setBulkIsR18] = useState(false);

  // Duplicate detection state
  const [fileStatus, setFileStatus] = useState({}); // { [fileId]: { status, warning?, duplicate? } }
  const [duplicateWarnings, setDuplicateWarnings] = useState([]); // Accumulated warnings
  const [showDuplicateSummary, setShowDuplicateSummary] = useState(false);

  // Validation error state (replaces alert)
  const [validationError, setValidationError] = useState(null);

  // Fetch random names from online API
  const fetchRandomNames = async (count) => {
    try {
      const response = await fetch(`https://randomuser.me/api/?results=${count}&nat=us,gb,jp,de,fr&inc=name`);
      const data = await response.json();
      return data.results.map(user => {
        const { first, last } = user.name;
        return `${first} ${last}`;
      });
    } catch (error) {
      console.error('Failed to fetch random names:', error);
      // Fallback names if API fails
      const fallbackNames = [
        'Sakura', 'Hikari', 'Yuki', 'Luna', 'Aria', 'Nova', 'Ember', 'Iris',
        'Kai', 'Ryu', 'Hiro', 'Akira', 'Ren', 'Sora', 'Yuto', 'Haruki'
      ];
      return Array(count).fill(null).map(() =>
        fallbackNames[Math.floor(Math.random() * fallbackNames.length)]
      );
    }
  };

  // Generate random name for a single file
  const regenerateName = useCallback(async (id) => {
    const names = await fetchRandomNames(1);
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, name: names[0] };
      }
      return f;
    }));
  }, []);

  // Regenerate all names with random names from API
  const regenerateAllNames = useCallback(async () => {
    if (files.length === 0) return;
    setGeneratingNames(true);
    try {
      const names = await fetchRandomNames(files.length);
      setFiles(prev => prev.map((f, index) => ({
        ...f,
        name: names[index] || `Character ${index + 1}`
      })));
    } finally {
      setGeneratingNames(false);
    }
  }, [files.length]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFiles = useCallback((newFiles) => {
    const validFiles = Array.from(newFiles).filter(file =>
      file.type.startsWith('image/') ||
      file.type === 'video/mp4' ||
      file.type === 'video/webm'
    );

    const filesWithMetadata = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      name: '', // Empty - user clicks "Generate Names" to fill
      series: bulkSeries,
      rarity: bulkRarity,
      isR18: bulkIsR18,
      isVideo: file.type.startsWith('video/')
    }));

    setFiles(prev => [...prev, ...filesWithMetadata]);

    // Initialize status for new files
    const newStatus = {};
    filesWithMetadata.forEach(f => {
      newStatus[f.id] = { status: FILE_STATUS.PENDING };
    });
    setFileStatus(prev => ({ ...prev, ...newStatus }));
  }, [bulkSeries, bulkRarity, bulkIsR18]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const updateFileMetadata = (id, field, value) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
    // Remove status
    setFileStatus(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Remove from warnings
    setDuplicateWarnings(prev => prev.filter(w => w.fileId !== id));
  };

  const applyBulkToAll = () => {
    setFiles(prev => prev.map(f => ({
      ...f,
      series: bulkSeries || f.series,
      rarity: bulkRarity,
      isR18: bulkIsR18
    })));
  };

  const copyToAll = (id, field) => {
    const sourceFile = files.find(f => f.id === id);
    if (sourceFile) {
      setFiles(prev => prev.map(f => ({
        ...f,
        [field]: sourceFile[field]
      })));
    }
  };

  // Update file status helper
  const updateFileCheckStatus = (fileId, status, data = {}) => {
    setFileStatus(prev => ({
      ...prev,
      [fileId]: { status, ...data }
    }));
  };

  // Upload a single batch of files
  const uploadBatch = async (batchFiles, token) => {
    const formData = new FormData();

    batchFiles.forEach(f => {
      formData.append('images', f.file);
    });

    const metadata = batchFiles.map(f => ({
      name: f.name,
      series: f.series,
      rarity: f.rarity,
      isR18: f.isR18
    }));
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${API_URL}/admin/characters/multi-upload`, {
      method: 'POST',
      headers: {
        'x-auth-token': token
      },
      body: formData
    });

    const text = await response.text();

    if (!text) {
      throw new Error('Server returned empty response');
    }

    const result = JSON.parse(text);

    if (!response.ok) {
      // Check if this is a duplicate error
      if (response.status === 409 && result.duplicateType) {
        const error = new Error(result.error || 'Duplicate detected');
        error.isDuplicate = true;
        error.duplicateInfo = {
          status: DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
          explanation: result.error,
          duplicateType: result.duplicateType,
          existingMatch: result.existingCharacter
        };
        throw error;
      }
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    // Clear previous validation error
    setValidationError(null);

    // Validate all files have required fields
    const invalidFiles = files.filter(f => !f.name || !f.series || !f.rarity);
    if (invalidFiles.length > 0) {
      setValidationError(`Please fill in all required fields (Name, Series, Rarity) for ${invalidFiles.length} file(s)`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setDuplicateWarnings([]);

    // Set all files to checking status
    const checkingStatus = {};
    files.forEach(f => {
      checkingStatus[f.id] = {
        status: FILE_STATUS.CHECKING,
        message: f.isVideo ? 'Analyzing video...' : 'Checking...'
      };
    });
    setFileStatus(checkingStatus);

    const token = getToken();
    const BATCH_SIZE = 10; // Upload 10 files at a time
    const batches = [];

    // Split files into batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    let totalCreated = 0;
    const allErrors = [];
    const allWarnings = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setUploadProgress(Math.round((i / batches.length) * 100));

        try {
          const result = await uploadBatch(batch, token);
          totalCreated += result.characters?.length || 0;

          // Process each character in the result
          if (result.characters) {
            result.characters.forEach((char, charIndex) => {
              const fileData = batch[charIndex];
              if (!fileData) return;

              // Check for duplicate warnings in the response
              const warning = parseDuplicateWarning({
                warning: result.warning,
                duplicateWarning: result.duplicateWarning,
                similarCharacters: result.similarCharacters
              });

              if (warning || char.duplicateWarning) {
                // File uploaded but has a duplicate warning
                updateFileCheckStatus(fileData.id, FILE_STATUS.WARNING, {
                  warning: warning || {
                    status: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
                    explanation: 'Possible duplicate detected'
                  }
                });
                allWarnings.push({
                  fileId: fileData.id,
                  filename: fileData.file.name,
                  characterName: char.name,
                  ...warning
                });
              } else {
                // File uploaded successfully with no issues
                updateFileCheckStatus(fileData.id, FILE_STATUS.ACCEPTED);
              }
            });
          }

          // Also collect any per-file errors from the batch
          if (result.errors) {
            result.errors.forEach(err => {
              // Find the matching file
              const matchingFile = batch.find(f => f.file.name === err.filename);
              if (matchingFile) {
                // Check if this is a duplicate error
                if (err.duplicateOf || err.error?.includes('duplicate')) {
                  updateFileCheckStatus(matchingFile.id, FILE_STATUS.BLOCKED, {
                    duplicate: {
                      status: DUPLICATE_STATUS.CONFIRMED_DUPLICATE,
                      explanation: err.error,
                      existingMatch: { name: err.duplicateOf }
                    }
                  });
                } else {
                  updateFileCheckStatus(matchingFile.id, FILE_STATUS.ERROR, {
                    error: err.error
                  });
                }
              }
              allErrors.push(err);
            });
          }
        } catch (batchErr) {
          // Handle batch-level errors
          batch.forEach(f => {
            if (batchErr.isDuplicate) {
              updateFileCheckStatus(f.id, FILE_STATUS.BLOCKED, {
                duplicate: batchErr.duplicateInfo
              });
            } else {
              updateFileCheckStatus(f.id, FILE_STATUS.ERROR, {
                error: batchErr.message
              });
            }
            allErrors.push({
              filename: f.file.name,
              error: batchErr.message,
              isDuplicate: batchErr.isDuplicate
            });
          });
        }
      }

      setUploadProgress(100);

      // Store warnings for display
      setDuplicateWarnings(allWarnings);

      const finalResult = {
        message: `Successfully created ${totalCreated} characters`,
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        totalCreated,
        totalWarnings: allWarnings.length,
        totalErrors: allErrors.length
      };

      setUploadResult(finalResult);

      // Show duplicate summary if there are warnings
      if (allWarnings.length > 0) {
        setShowDuplicateSummary(true);
      }

      // Clean up previews only for successfully uploaded files
      const successfulIds = new Set();
      Object.entries(fileStatus).forEach(([id, status]) => {
        if (status.status === FILE_STATUS.ACCEPTED) {
          successfulIds.add(id);
        }
      });

      setFiles(prev => {
        prev.forEach(f => {
          if (successfulIds.has(f.id)) {
            URL.revokeObjectURL(f.preview);
          }
        });
        // Keep files that weren't successfully uploaded
        return prev.filter(f => !successfulIds.has(f.id));
      });

      if (onSuccess && totalCreated > 0) {
        onSuccess(finalResult);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadResult({ error: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Warn if there are unacknowledged warnings
    if (duplicateWarnings.length > 0 && !showDuplicateSummary) {
      const proceed = window.confirm('You have duplicate warnings. Close anyway?');
      if (!proceed) return;
    }

    // Clean up previews
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploadResult(null);
    setFileStatus({});
    setDuplicateWarnings([]);
    setShowDuplicateSummary(false);
    setValidationError(null);
    onClose();
  };

  // Handle dismissing a duplicate warning for a specific file
  const handleDismissWarning = (fileId) => {
    setDuplicateWarnings(prev => prev.filter(w => w.fileId !== fileId));
  };

  // Get status badge for a file
  const renderStatusBadge = (fileData) => {
    const status = fileStatus[fileData.id];
    if (!status) return null;

    switch (status.status) {
      case FILE_STATUS.CHECKING:
        return (
          <StatusBadge $status="checking">
            <FaSpinner className="spin" />
          </StatusBadge>
        );
      case FILE_STATUS.ACCEPTED:
        return (
          <StatusBadge $status="accepted">
            <FaCheck />
          </StatusBadge>
        );
      case FILE_STATUS.WARNING:
        return (
          <StatusBadge $status="warning" title="Possible duplicate detected">
            <FaExclamationTriangle />
          </StatusBadge>
        );
      case FILE_STATUS.BLOCKED:
        return (
          <StatusBadge $status="blocked" title="Duplicate blocked">
            <FaTimesCircle />
          </StatusBadge>
        );
      case FILE_STATUS.ERROR:
        return (
          <StatusBadge $status="error" title={status.error}>
            <FaTimesCircle />
          </StatusBadge>
        );
      default:
        return null;
    }
  };

  // Render inline duplicate warning for a file
  const renderFileWarning = (fileData) => {
    const status = fileStatus[fileData.id];
    if (!status) return null;

    if (status.status === FILE_STATUS.WARNING && status.warning) {
      return (
        <FileWarningBanner>
          <DuplicateWarningBanner
            status={status.warning.status}
            explanation={status.warning.explanation}
            similarity={status.warning.similarity}
            existingMatch={status.warning.existingMatch}
            mediaType={fileData.isVideo ? 'video' : 'image'}
            compact
            onDismiss={() => handleDismissWarning(fileData.id)}
          />
        </FileWarningBanner>
      );
    }

    if (status.status === FILE_STATUS.BLOCKED && status.duplicate) {
      return (
        <FileWarningBanner>
          <DuplicateWarningBanner
            status={DUPLICATE_STATUS.CONFIRMED_DUPLICATE}
            explanation={status.duplicate.explanation}
            similarity={status.duplicate.similarity}
            existingMatch={status.duplicate.existingMatch}
            mediaType={fileData.isVideo ? 'video' : 'image'}
            compact
            onChangeMedia={() => removeFile(fileData.id)}
          />
        </FileWarningBanner>
      );
    }

    return null;
  };

  if (!show) return null;

  return (
    <ModalOverlay onMouseDown={handleClose}>
      <ModalContent onMouseDown={e => e.stopPropagation()}>
        <ModalHeader>
          <h2><FaCloudUploadAlt /> Multi-Upload Characters</h2>
          <CloseButton onClick={handleClose}><FaTimes /></CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Validation Error */}
          {validationError && (
            <ValidationErrorBanner>
              <FaExclamationTriangle />
              <span>{validationError}</span>
              <DismissValidationButton onClick={() => setValidationError(null)}>×</DismissValidationButton>
            </ValidationErrorBanner>
          )}

          {/* Bulk Settings */}
          <BulkSettingsSection>
            <SectionTitle>Default Values (Apply to New Files)</SectionTitle>
            <BulkSettingsGrid>
              <BulkInput>
                <label>Series</label>
                <input
                  type="text"
                  value={bulkSeries}
                  onChange={e => setBulkSeries(e.target.value)}
                  placeholder="e.g., Anime Name"
                />
              </BulkInput>
              <BulkInput>
                <label>Rarity</label>
                <select value={bulkRarity} onChange={e => setBulkRarity(e.target.value)}>
                  {orderedRarities.map(r => (
                    <option key={r.id} value={r.name.toLowerCase()}>
                      {r.name.charAt(0).toUpperCase() + r.name.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </BulkInput>
              <BulkInput>
                <label>
                  <input
                    type="checkbox"
                    checked={bulkIsR18}
                    onChange={e => setBulkIsR18(e.target.checked)}
                  />
                  R18
                </label>
              </BulkInput>
              <ApplyBulkButton onClick={applyBulkToAll} disabled={files.length === 0}>
                Apply to All ({files.length})
              </ApplyBulkButton>
              <RegenerateNamesButton onClick={regenerateAllNames} disabled={files.length === 0 || generatingNames}>
                <FaMagic /> {generatingNames ? 'Generating...' : 'Generate Names'}
              </RegenerateNamesButton>
            </BulkSettingsGrid>
          </BulkSettingsSection>

          {/* Drop Zone */}
          <DropZone
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            $active={dragActive}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <FaCloudUploadAlt size={48} />
            <p>Drag & drop images/videos here or click to select</p>
            <small>Supports: JPG, PNG, GIF, WEBP, MP4, WEBM (max 50 files)</small>
          </DropZone>

          {/* Files Grid with Inline Editing */}
          {files.length > 0 && (
            <FilesSection>
              <SectionTitle>
                {files.length} File{files.length !== 1 ? 's' : ''} Ready
                {duplicateWarnings.length > 0 && (
                  <WarningCount>
                    <FaExclamationTriangle /> {duplicateWarnings.length} warning{duplicateWarnings.length !== 1 ? 's' : ''}
                  </WarningCount>
                )}
              </SectionTitle>
              <FilesGrid>
                <AnimatePresence>
                  {files.map((fileData, index) => (
                    <FileCard
                      key={fileData.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      $hasWarning={fileStatus[fileData.id]?.status === FILE_STATUS.WARNING}
                      $isBlocked={fileStatus[fileData.id]?.status === FILE_STATUS.BLOCKED}
                    >
                      <FilePreview>
                        {fileData.isVideo ? (
                          <video src={fileData.preview} muted loop autoPlay playsInline />
                        ) : (
                          <img src={fileData.preview} alt={fileData.name} />
                        )}
                        <FileTypeIcon>
                          {fileData.isVideo ? <FaVideo /> : <FaImage />}
                        </FileTypeIcon>
                        <RemoveButton onClick={() => removeFile(fileData.id)}>
                          <FaTrash />
                        </RemoveButton>
                        <FileIndex>{index + 1}</FileIndex>
                        {renderStatusBadge(fileData)}
                      </FilePreview>

                      {/* Inline duplicate warning */}
                      {renderFileWarning(fileData)}

                      <FileMetadata>
                        <MetaField>
                          <label>
                            Name *
                            <CopyButton onClick={() => regenerateName(fileData.id)} title="Regenerate from filename">
                              <FaMagic />
                            </CopyButton>
                          </label>
                          <input
                            type="text"
                            value={fileData.name}
                            onChange={e => updateFileMetadata(fileData.id, 'name', e.target.value)}
                            placeholder="Character name"
                          />
                        </MetaField>

                        <MetaFieldRow>
                          <MetaField $small>
                            <label>
                              Series *
                              <CopyButton onClick={() => copyToAll(fileData.id, 'series')} title="Apply to all">
                                <FaCopy />
                              </CopyButton>
                            </label>
                            <input
                              type="text"
                              value={fileData.series}
                              onChange={e => updateFileMetadata(fileData.id, 'series', e.target.value)}
                              placeholder="Series"
                            />
                          </MetaField>
                        </MetaFieldRow>

                        <MetaFieldRow>
                          <MetaField $small>
                            <label>
                              Rarity
                              <CopyButton onClick={() => copyToAll(fileData.id, 'rarity')} title="Apply to all">
                                <FaCopy />
                              </CopyButton>
                            </label>
                            <select
                              value={fileData.rarity}
                              onChange={e => updateFileMetadata(fileData.id, 'rarity', e.target.value)}
                            >
                              {orderedRarities.map(r => (
                                <option key={r.id} value={r.name.toLowerCase()}>
                                  {r.name.charAt(0).toUpperCase() + r.name.slice(1).toLowerCase()}
                                </option>
                              ))}
                            </select>
                          </MetaField>

                          <MetaField $tiny>
                            <label>
                              <input
                                type="checkbox"
                                checked={fileData.isR18}
                                onChange={e => updateFileMetadata(fileData.id, 'isR18', e.target.checked)}
                              />
                              R18
                            </label>
                          </MetaField>
                        </MetaFieldRow>
                      </FileMetadata>
                    </FileCard>
                  ))}
                </AnimatePresence>
              </FilesGrid>
            </FilesSection>
          )}

          {/* Duplicate Warnings Summary */}
          {showDuplicateSummary && duplicateWarnings.length > 0 && (
            <DuplicateSummarySection>
              <SectionTitle>
                <FaExclamationTriangle /> Duplicate Warnings ({duplicateWarnings.length})
              </SectionTitle>
              <DuplicateSummaryText>
                The following characters were uploaded but appear similar to existing ones.
                This is just a heads up - no action is required.
              </DuplicateSummaryText>
              <DuplicateList>
                {duplicateWarnings.map((warning, i) => (
                  <DuplicateListItem key={i}>
                    <DuplicateItemName>{warning.characterName || warning.filename}</DuplicateItemName>
                    <DuplicateItemInfo>
                      {warning.similarity && <span>{warning.similarity}% similar</span>}
                      {warning.existingMatch?.name && (
                        <span>Similar to: {warning.existingMatch.name}</span>
                      )}
                    </DuplicateItemInfo>
                  </DuplicateListItem>
                ))}
              </DuplicateList>
              <DismissSummaryButton onClick={() => setShowDuplicateSummary(false)}>
                Got it, dismiss warnings
              </DismissSummaryButton>
            </DuplicateSummarySection>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <ResultSection $error={!!uploadResult.error} $hasWarnings={uploadResult.totalWarnings > 0}>
              {uploadResult.error ? (
                <>
                  <FaExclamationTriangle />
                  <span>Error: {uploadResult.error}</span>
                </>
              ) : (
                <>
                  <FaCheck />
                  <ResultContent>
                    <span>{uploadResult.message}</span>
                    {uploadResult.totalWarnings > 0 && (
                      <WarningNote>
                        <FaExclamationTriangle /> {uploadResult.totalWarnings} possible duplicate{uploadResult.totalWarnings !== 1 ? 's' : ''} flagged
                      </WarningNote>
                    )}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <ErrorList>
                        {uploadResult.errors.map((err, i) => (
                          <li key={i}>
                            {err.filename}: {err.error}
                            {err.isDuplicate && <DuplicateTag>Duplicate</DuplicateTag>}
                          </li>
                        ))}
                      </ErrorList>
                    )}
                  </ResultContent>
                </>
              )}
            </ResultSection>
          )}
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={handleClose} disabled={uploading}>
            Cancel
          </CancelButton>
          <UploadButton onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? (
              <>
                <FaSpinner className="spin" /> Uploading... {uploadProgress}%
              </>
            ) : (
              <>Upload {files.length} Character{files.length !== 1 ? 's' : ''}</>
            )}
          </UploadButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

// Keyframes
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h2 {
    margin: 0;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.5rem;

    svg {
      color: #00d9ff;
    }
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #aaa;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 25px;
`;

const ValidationErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 10px;
  margin-bottom: 20px;

  svg {
    color: #e74c3c;
    flex-shrink: 0;
  }

  span {
    flex: 1;
    color: #e74c3c;
    font-weight: 500;
  }
`;

const DismissValidationButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #fff;
  }
`;

const BulkSettingsSection = styled.div`
  background: rgba(0, 217, 255, 0.05);
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #00d9ff;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const WarningCount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #f39c12;
  background: rgba(243, 156, 18, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
`;

const BulkSettingsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: flex-end;
`;

const BulkInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    color: #aaa;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 8px;

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }
  }

  input[type="text"], select {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 14px;
    color: #fff;
    font-size: 0.95rem;
    min-width: 180px;

    &:focus {
      outline: none;
      border-color: #00d9ff;
      box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.15);
    }

    &::placeholder {
      color: #666;
    }
  }

  select {
    cursor: pointer;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 16px;
    padding-right: 35px;

    option {
      background: #1a1a2e;
      color: #fff;
      padding: 10px;
    }
  }
`;

const ApplyBulkButton = styled.button`
  background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
  border: none;
  color: #000;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 217, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RegenerateNamesButton = styled.button`
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  border: none;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(155, 89, 182, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.$active ? '#00d9ff' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: ${props => props.$active ? 'rgba(0, 217, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'};
  margin-bottom: 25px;

  &:hover {
    border-color: #00d9ff;
    background: rgba(0, 217, 255, 0.05);
  }

  svg {
    color: ${props => props.$active ? '#00d9ff' : '#666'};
    margin-bottom: 15px;
    transition: color 0.3s;
  }

  p {
    color: #ccc;
    margin: 0 0 8px 0;
    font-size: 1.1rem;
  }

  small {
    color: #666;
    font-size: 0.85rem;
  }
`;

const FilesSection = styled.div`
  margin-top: 20px;
`;

const FilesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const FileCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid ${props =>
    props.$isBlocked ? 'rgba(231, 76, 60, 0.5)' :
    props.$hasWarning ? 'rgba(241, 196, 15, 0.5)' :
    'rgba(255, 255, 255, 0.1)'};
  transition: border-color 0.2s;

  &:hover {
    border-color: ${props =>
      props.$isBlocked ? 'rgba(231, 76, 60, 0.7)' :
      props.$hasWarning ? 'rgba(241, 196, 15, 0.7)' :
      'rgba(0, 217, 255, 0.3)'};
  }
`;

const FilePreview = styled.div`
  position: relative;
  height: 180px;
  background: #000;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const FileTypeIcon = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;

const FileIndex = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 217, 255, 0.9);
  color: #000;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(231, 76, 60, 0.9);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;

  ${FileCard}:hover & {
    opacity: 1;
  }

  &:hover {
    background: #e74c3c;
  }
`;

const StatusBadge = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;

  ${props => props.$status === 'checking' && `
    background: rgba(0, 217, 255, 0.9);
    color: #000;
  `}

  ${props => props.$status === 'accepted' && `
    background: rgba(46, 204, 113, 0.9);
    color: #fff;
  `}

  ${props => props.$status === 'warning' && `
    background: rgba(241, 196, 15, 0.9);
    color: #000;
  `}

  ${props => (props.$status === 'blocked' || props.$status === 'error') && `
    background: rgba(231, 76, 60, 0.9);
    color: #fff;
  `}

  svg {
    ${props => props.$status === 'checking' && css`
      animation: ${spin} 1s linear infinite;
    `}
  }
`;

const FileWarningBanner = styled.div`
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
`;

const FileMetadata = styled.div`
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MetaField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: ${props => props.$tiny ? '0 0 auto' : props.$small ? '1' : '1'};

  label {
    color: #888;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  input[type="text"], select {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 8px 10px;
    color: #fff;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #00d9ff;
    }

    &::placeholder {
      color: #555;
    }
  }

  select {
    cursor: pointer;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 16px;
    padding-right: 30px;

    option {
      background: #1a1a2e;
      color: #fff;
      padding: 10px;
    }
  }

  ${props => props.$tiny && `
    label {
      flex-direction: row;
      gap: 6px;

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin: 0;
      }
    }
  `}
`;

const MetaFieldRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
`;

const CopyButton = styled.button`
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  font-size: 10px;
  transition: color 0.2s;

  &:hover {
    color: #00d9ff;
  }
`;

const DuplicateSummarySection = styled.div`
  background: rgba(241, 196, 15, 0.1);
  border: 1px solid rgba(241, 196, 15, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;

  ${SectionTitle} {
    color: #f39c12;
  }
`;

const DuplicateSummaryText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin: 0 0 16px 0;
`;

const DuplicateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const DuplicateListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const DuplicateItemName = styled.div`
  font-weight: 500;
  color: #fff;
`;

const DuplicateItemInfo = styled.div`
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
`;

const DismissSummaryButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const ResultSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px 20px;
  border-radius: 10px;
  margin-top: 20px;
  background: ${props => props.$error ? 'rgba(231, 76, 60, 0.15)' :
    props.$hasWarnings ? 'rgba(241, 196, 15, 0.08)' : 'rgba(46, 204, 113, 0.15)'};
  border: 1px solid ${props => props.$error ? 'rgba(231, 76, 60, 0.3)' :
    props.$hasWarnings ? 'rgba(46, 204, 113, 0.3)' : 'rgba(46, 204, 113, 0.3)'};

  > svg {
    color: ${props => props.$error ? '#e74c3c' : '#2ecc71'};
    flex-shrink: 0;
    margin-top: 2px;
  }

  > span {
    color: ${props => props.$error ? '#e74c3c' : '#2ecc71'};
    font-weight: 500;
  }
`;

const ResultContent = styled.div`
  flex: 1;

  > span {
    color: #2ecc71;
    font-weight: 500;
  }
`;

const WarningNote = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: #f39c12;

  svg {
    font-size: 12px;
  }
`;

const DuplicateTag = styled.span`
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  text-transform: uppercase;
`;

const ErrorList = styled.ul`
  margin: 10px 0 0 0;
  padding-left: 20px;
  color: #f39c12;
  font-size: 0.85rem;

  li {
    margin-bottom: 4px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px 25px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const CancelButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  padding: 12px 25px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UploadButton = styled.button`
  background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
  border: none;
  color: #000;
  padding: 12px 30px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  .spin {
    animation: ${spin} 1s linear infinite;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 25px rgba(0, 217, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export default MultiUploadModal;
