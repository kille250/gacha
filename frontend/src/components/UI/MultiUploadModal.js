import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCloudUploadAlt, FaTimes, FaImage, FaVideo, FaTrash, FaCopy, FaCheck, FaExclamationTriangle, FaMagic } from 'react-icons/fa';
import { API_URL } from '../../utils/api';

const MultiUploadModal = ({ show, onClose, onSuccess }) => {
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
      throw new Error(result.error || 'Upload failed');
    }
    
    return result;
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    // Validate all files have required fields
    const invalidFiles = files.filter(f => !f.name || !f.series || !f.rarity);
    if (invalidFiles.length > 0) {
      alert(`Please fill in all required fields (Name, Series, Rarity) for ${invalidFiles.length} file(s)`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const token = localStorage.getItem('token');
    const BATCH_SIZE = 10; // Upload 10 files at a time
    const batches = [];
    
    // Split files into batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    let totalCreated = 0;
    const allErrors = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setUploadProgress(Math.round((i / batches.length) * 100));
        
        try {
          const result = await uploadBatch(batch, token);
          totalCreated += result.characters?.length || 0;
          if (result.errors) {
            allErrors.push(...result.errors);
          }
        } catch (batchErr) {
          // Add error for each file in failed batch
          batch.forEach(f => {
            allErrors.push({ filename: f.file.name, error: batchErr.message });
          });
        }
      }

      setUploadProgress(100);
      
      const finalResult = {
        message: `Successfully created ${totalCreated} characters`,
        errors: allErrors.length > 0 ? allErrors : undefined
      };
      
      setUploadResult(finalResult);
      
      // Clean up previews
      files.forEach(f => URL.revokeObjectURL(f.preview));
      setFiles([]);
      
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
    // Clean up previews
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploadResult(null);
    onClose();
  };

  if (!show) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h2><FaCloudUploadAlt /> Multi-Upload Characters</h2>
          <CloseButton onClick={handleClose}><FaTimes /></CloseButton>
        </ModalHeader>

        <ModalBody>
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
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </BulkInput>
              <BulkInput>
                <label>
                  <input 
                    type="checkbox" 
                    checked={bulkIsR18} 
                    onChange={e => setBulkIsR18(e.target.checked)} 
                  />
                  🔞 R18
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
                      </FilePreview>
                      
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
                              <option value="common">Common</option>
                              <option value="uncommon">Uncommon</option>
                              <option value="rare">Rare</option>
                              <option value="epic">Epic</option>
                              <option value="legendary">Legendary</option>
                            </select>
                          </MetaField>
                          
                          <MetaField $tiny>
                            <label>
                              <input
                                type="checkbox"
                                checked={fileData.isR18}
                                onChange={e => updateFileMetadata(fileData.id, 'isR18', e.target.checked)}
                              />
                              🔞
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

          {/* Upload Result */}
          {uploadResult && (
            <ResultSection $error={!!uploadResult.error}>
              {uploadResult.error ? (
                <>
                  <FaExclamationTriangle />
                  <span>Error: {uploadResult.error}</span>
                </>
              ) : (
                <>
                  <FaCheck />
                  <span>{uploadResult.message}</span>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <ErrorList>
                      {uploadResult.errors.map((err, i) => (
                        <li key={i}>{err.filename}: {err.error}</li>
                      ))}
                    </ErrorList>
                  )}
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
              <>Uploading... {uploadProgress}%</>
            ) : (
              <>Upload {files.length} Character{files.length !== 1 ? 's' : ''}</>
            )}
          </UploadButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

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
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.2s;
  
  &:hover {
    border-color: rgba(0, 217, 255, 0.3);
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

const ResultSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px 20px;
  border-radius: 10px;
  margin-top: 20px;
  background: ${props => props.$error ? 'rgba(231, 76, 60, 0.15)' : 'rgba(46, 204, 113, 0.15)'};
  border: 1px solid ${props => props.$error ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.3)'};
  
  svg {
    color: ${props => props.$error ? '#e74c3c' : '#2ecc71'};
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  span {
    color: ${props => props.$error ? '#e74c3c' : '#2ecc71'};
    font-weight: 500;
  }
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

