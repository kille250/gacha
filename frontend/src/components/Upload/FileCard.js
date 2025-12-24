/**
 * FileCard - Individual file display with metadata editing
 *
 * Features:
 * - Responsive: inline editing on desktop, bottom sheet on mobile
 * - Status indicators with accessibility
 * - Copy-to-all functionality
 * - Swipe to delete on mobile (future enhancement)
 */
import React, { memo, useState, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTrash,
  FaCopy,
  FaMagic,
  FaTimes,
  FaChevronDown,
} from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';
import MediaPreview from './MediaPreview';
import StatusBadge from './StatusBadge';
import { FILE_STATUS } from '../../hooks/useUploadState';
import DuplicateWarningBanner from '../UI/DuplicateWarningBanner';
import { DUPLICATE_STATUS } from '../../utils/errorHandler';

const FileCard = memo(({
  file,
  index,
  fileStatus,
  fileValidation = {},
  orderedRarities = [],
  onUpdateMetadata,
  onRemove,
  onCopyToAll,
  onRegenerateName,
  onDismissWarning,
  onTouchField,
}) => {
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [confirmCopyField, setConfirmCopyField] = useState(null);
  const status = fileStatus?.status || FILE_STATUS.PENDING;
  const hasWarning = status === FILE_STATUS.WARNING;
  const isBlocked = status === FILE_STATUS.BLOCKED;
  const hasError = status === FILE_STATUS.ERROR;

  // Get validation errors for display
  const nameError = fileValidation.name?.touched && !fileValidation.name?.valid ? fileValidation.name.error : null;
  const seriesError = fileValidation.series?.touched && !fileValidation.series?.valid ? fileValidation.series.error : null;

  const handleChange = useCallback((field, value) => {
    onUpdateMetadata(file.id, field, value);
  }, [file.id, onUpdateMetadata]);

  const handleRemove = useCallback(() => {
    onRemove(file.id);
    setShowMobileSheet(false);
  }, [file.id, onRemove]);

  const handleCopyToAll = useCallback((field) => {
    setConfirmCopyField(field);
  }, []);

  const confirmCopy = useCallback(() => {
    if (confirmCopyField) {
      onCopyToAll(file.id, confirmCopyField);
      setConfirmCopyField(null);
    }
  }, [file.id, onCopyToAll, confirmCopyField]);

  const cancelCopy = useCallback(() => {
    setConfirmCopyField(null);
  }, []);

  const handleBlur = useCallback((field) => {
    if (onTouchField) {
      onTouchField(file.id, field);
    }
  }, [file.id, onTouchField]);

  const handleRegenerateName = useCallback(() => {
    onRegenerateName(file.id);
  }, [file.id, onRegenerateName]);

  const handleDismissWarning = useCallback(() => {
    if (onDismissWarning) {
      onDismissWarning(file.id);
    }
  }, [file.id, onDismissWarning]);

  return (
    <>
      <CardContainer
        $hasWarning={hasWarning}
        $isBlocked={isBlocked}
        $hasError={hasError}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        layout
        role="article"
        aria-label={`File ${index + 1}: ${file.name || 'Unnamed'}, ${file.rarity} rarity`}
      >
        {/* Preview Section */}
        <PreviewSection>
          <MediaPreview
            src={file.preview}
            isVideo={file.isVideo}
            status={status}
            alt={file.name}
          />

          {/* Index badge */}
          <IndexBadge aria-label={`File number ${index + 1}`}>
            {index + 1}
          </IndexBadge>

          {/* Status badge */}
          <StatusBadgeWrapper>
            <StatusBadge
              status={status}
              compact
              title={fileStatus?.error || fileStatus?.message}
            />
          </StatusBadgeWrapper>

          {/* Remove button - visible on hover/focus */}
          <RemoveButton
            onClick={handleRemove}
            aria-label="Remove file"
            title="Remove file"
          >
            <FaTrash />
          </RemoveButton>
        </PreviewSection>

        {/* Warning/Error Banner */}
        {(hasWarning || isBlocked) && fileStatus?.warning && (
          <WarningSection>
            <DuplicateWarningBanner
              status={isBlocked ? DUPLICATE_STATUS.CONFIRMED_DUPLICATE : fileStatus.warning.status}
              explanation={fileStatus.warning.explanation}
              similarity={fileStatus.warning.similarity}
              existingMatch={fileStatus.warning.existingMatch}
              mediaType={file.isVideo ? 'video' : 'image'}
              compact
              onDismiss={hasWarning ? handleDismissWarning : undefined}
              onChangeMedia={isBlocked ? handleRemove : undefined}
            />
          </WarningSection>
        )}

        {isBlocked && fileStatus?.duplicate && (
          <WarningSection>
            <DuplicateWarningBanner
              status={DUPLICATE_STATUS.CONFIRMED_DUPLICATE}
              explanation={fileStatus.duplicate.explanation}
              similarity={fileStatus.duplicate.similarity}
              existingMatch={fileStatus.duplicate.existingMatch}
              mediaType={file.isVideo ? 'video' : 'image'}
              compact
              onChangeMedia={handleRemove}
            />
          </WarningSection>
        )}

        {hasError && fileStatus?.error && (
          <ErrorSection>
            <ErrorText>{fileStatus.error}</ErrorText>
          </ErrorSection>
        )}

        {/* Metadata Section - Desktop inline, Mobile expandable */}
        <MetadataSection>
          {/* Mobile: Tap to expand */}
          <MobileMetaTrigger
            onClick={() => setShowMobileSheet(true)}
            aria-label="Edit metadata"
          >
            <MetaSummary>
              <MetaName>{file.name || 'Tap to edit...'}</MetaName>
              <MetaSeries>{file.series || 'No series'}</MetaSeries>
            </MetaSummary>
            <FaChevronDown />
          </MobileMetaTrigger>

          {/* Desktop: Inline form */}
          <DesktopMetaForm>
            <MetaField $hasError={!!nameError}>
              <MetaLabel>
                Name *
                <FieldActions>
                  <ActionButton
                    onClick={handleRegenerateName}
                    title="Generate random name"
                    aria-label="Generate random name"
                  >
                    <FaMagic />
                  </ActionButton>
                </FieldActions>
              </MetaLabel>
              <MetaInput
                type="text"
                value={file.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="Character name"
                aria-label="Character name"
                aria-required="true"
                aria-invalid={!!nameError}
                $hasError={!!nameError}
              />
              {nameError && <FieldError role="alert">{nameError}</FieldError>}
            </MetaField>

            <MetaField $hasError={!!seriesError}>
              <MetaLabel>
                Series *
                <FieldActions>
                  <ActionButton
                    onClick={() => handleCopyToAll('series')}
                    title="Apply to all files"
                    aria-label="Apply series to all files"
                  >
                    <FaCopy />
                  </ActionButton>
                </FieldActions>
              </MetaLabel>
              <MetaInput
                type="text"
                value={file.series}
                onChange={(e) => handleChange('series', e.target.value)}
                onBlur={() => handleBlur('series')}
                placeholder="Series name"
                aria-label="Series name"
                aria-required="true"
                aria-invalid={!!seriesError}
                $hasError={!!seriesError}
              />
              {seriesError && <FieldError role="alert">{seriesError}</FieldError>}
            </MetaField>

            <MetaRow>
              <MetaField $flex>
                <MetaLabel>
                  Rarity
                  <FieldActions>
                    <ActionButton
                      onClick={() => handleCopyToAll('rarity')}
                      title="Apply to all files"
                      aria-label="Apply rarity to all files"
                    >
                      <FaCopy />
                    </ActionButton>
                  </FieldActions>
                </MetaLabel>
                <MetaSelect
                  value={file.rarity}
                  onChange={(e) => handleChange('rarity', e.target.value)}
                  aria-label="Rarity"
                >
                  {orderedRarities.map(r => (
                    <option key={r.id || r.name} value={r.name.toLowerCase()}>
                      {r.displayName || r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                    </option>
                  ))}
                </MetaSelect>
              </MetaField>

              <MetaField $narrow>
                <CheckboxLabel>
                  <input
                    type="checkbox"
                    checked={file.isR18}
                    onChange={(e) => handleChange('isR18', e.target.checked)}
                    aria-label="Mark as R18 content"
                  />
                  <span>R18</span>
                </CheckboxLabel>
              </MetaField>
            </MetaRow>
          </DesktopMetaForm>
        </MetadataSection>
      </CardContainer>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {showMobileSheet && (
          <MobileSheetOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileSheet(false)}
          >
            <MobileSheet
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SheetHeader>
                <SheetTitle>Edit File {index + 1}</SheetTitle>
                <CloseSheetButton
                  onClick={() => setShowMobileSheet(false)}
                  aria-label="Close"
                >
                  <FaTimes />
                </CloseSheetButton>
              </SheetHeader>

              <SheetPreview>
                <MediaPreview
                  src={file.preview}
                  isVideo={file.isVideo}
                  aspectRatio="16/9"
                  showTypeIcon={false}
                />
              </SheetPreview>

              <SheetForm>
                <SheetField $hasError={!!nameError}>
                  <SheetLabel>
                    Name *
                    <SheetActionButton onClick={handleRegenerateName}>
                      <FaMagic /> Generate
                    </SheetActionButton>
                  </SheetLabel>
                  <SheetInput
                    type="text"
                    value={file.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="Character name"
                    $hasError={!!nameError}
                  />
                  {nameError && <SheetFieldError role="alert">{nameError}</SheetFieldError>}
                </SheetField>

                <SheetField $hasError={!!seriesError}>
                  <SheetLabel>
                    Series *
                    <SheetActionButton onClick={() => handleCopyToAll('series')}>
                      <FaCopy /> Apply to All
                    </SheetActionButton>
                  </SheetLabel>
                  <SheetInput
                    type="text"
                    value={file.series}
                    onChange={(e) => handleChange('series', e.target.value)}
                    onBlur={() => handleBlur('series')}
                    placeholder="Series name"
                    $hasError={!!seriesError}
                  />
                  {seriesError && <SheetFieldError role="alert">{seriesError}</SheetFieldError>}
                </SheetField>

                <SheetRow>
                  <SheetField>
                    <SheetLabel>Rarity</SheetLabel>
                    <SheetSelect
                      value={file.rarity}
                      onChange={(e) => handleChange('rarity', e.target.value)}
                    >
                      {orderedRarities.map(r => (
                        <option key={r.id || r.name} value={r.name.toLowerCase()}>
                          {r.displayName || r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                        </option>
                      ))}
                    </SheetSelect>
                  </SheetField>

                  <SheetCheckbox>
                    <input
                      type="checkbox"
                      checked={file.isR18}
                      onChange={(e) => handleChange('isR18', e.target.checked)}
                    />
                    <span>R18</span>
                  </SheetCheckbox>
                </SheetRow>
              </SheetForm>

              <SheetActions>
                <RemoveFileButton onClick={handleRemove}>
                  <FaTrash /> Remove File
                </RemoveFileButton>
              </SheetActions>
            </MobileSheet>
          </MobileSheetOverlay>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog for Copy to All */}
      <AnimatePresence>
        {confirmCopyField && (
          <ConfirmOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelCopy}
          >
            <ConfirmDialog
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-desc"
            >
              <ConfirmTitle id="confirm-title">Apply to All Files?</ConfirmTitle>
              <ConfirmText id="confirm-desc">
                This will overwrite the <strong>{confirmCopyField}</strong> field for all other files with:{' '}
                <strong>"{file[confirmCopyField]}"</strong>
              </ConfirmText>
              <ConfirmButtons>
                <ConfirmCancelButton onClick={cancelCopy}>
                  Cancel
                </ConfirmCancelButton>
                <ConfirmApplyButton onClick={confirmCopy}>
                  Apply to All
                </ConfirmApplyButton>
              </ConfirmButtons>
            </ConfirmDialog>
          </ConfirmOverlay>
        )}
      </AnimatePresence>
    </>
  );
});

FileCard.displayName = 'FileCard';

// Styled components
const CardContainer = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 2px solid ${props => {
    if (props.$isBlocked || props.$hasError) return 'rgba(255, 59, 48, 0.5)';
    if (props.$hasWarning) return 'rgba(255, 159, 10, 0.5)';
    return theme.colors.surfaceBorder;
  }};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${props => {
      if (props.$isBlocked || props.$hasError) return 'rgba(255, 59, 48, 0.7)';
      if (props.$hasWarning) return 'rgba(255, 159, 10, 0.7)';
      return theme.colors.primary;
    }};
  }
`;

const PreviewSection = styled.div`
  position: relative;
  aspect-ratio: 4/3;

  @media (min-width: ${theme.breakpoints.md}) {
    aspect-ratio: 16/10;
  }
`;

const IndexBadge = styled.div`
  position: absolute;
  bottom: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  width: 28px;
  height: 28px;
  background: ${theme.colors.primary};
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
`;

const StatusBadgeWrapper = styled.div`
  position: absolute;
  bottom: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
`;

const RemoveButton = styled.button`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  width: 32px;
  height: 32px;
  background: rgba(255, 59, 48, 0.9);
  border: none;
  border-radius: ${theme.radius.sm};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${CardContainer}:hover &,
  ${CardContainer}:focus-within & {
    opacity: 1;
  }

  &:hover {
    background: ${theme.colors.error};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid white;
    outline-offset: 2px;
  }

  /* Always visible on touch devices */
  @media (hover: none) {
    opacity: 1;
  }
`;

const WarningSection = styled.div`
  padding: ${theme.spacing.sm};
  background: rgba(0, 0, 0, 0.2);
`;

const ErrorSection = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
`;

const ErrorText = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
`;

const MetadataSection = styled.div`
  padding: ${theme.spacing.md};
`;

// Mobile: Show expandable trigger
const MobileMetaTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  cursor: pointer;
  text-align: left;

  svg {
    color: ${theme.colors.textMuted};
    font-size: 12px;
  }

  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const MetaSummary = styled.div`
  flex: 1;
  min-width: 0;
`;

const MetaName = styled.div`
  font-weight: ${theme.fontWeights.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MetaSeries = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Desktop: Show inline form
const DesktopMetaForm = styled.div`
  display: none;

  @media (min-width: ${theme.breakpoints.md}) {
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.sm};
  }
`;

const MetaField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: ${props => props.$flex ? 1 : 'none'};

  ${props => props.$narrow && css`
    flex: 0 0 auto;
    justify-content: flex-end;
  `}

  ${props => props.$hasError && css`
    label {
      color: ${theme.colors.error};
    }
  `}
`;

const FieldError = styled.span`
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.xs};
  margin-top: 2px;
`;

const MetaLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FieldActions = styled.div`
  display: flex;
  gap: 4px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.textMuted};
  cursor: pointer;
  padding: 2px;
  font-size: 10px;
  transition: color 0.2s ease;

  &:hover {
    color: ${theme.colors.primary};
  }

  &:focus-visible {
    color: ${theme.colors.primary};
    outline: 1px solid ${theme.colors.primary};
    border-radius: 2px;
  }
`;

const inputStyles = css`
  width: 100%;
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.sm};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

const MetaInput = styled.input`
  ${inputStyles}

  ${props => props.$hasError && css`
    border-color: ${theme.colors.error};

    &:focus {
      border-color: ${theme.colors.error};
      box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
    }
  `}
`;

const MetaSelect = styled.select`
  ${inputStyles}
  cursor: pointer;
`;

const MetaRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: flex-end;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.sm};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  white-space: nowrap;

  input {
    width: 16px;
    height: 16px;
  }
`;

// Mobile Bottom Sheet
const MobileSheetOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: ${theme.zIndex.modal};
  display: flex;
  align-items: flex-end;

  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const MobileSheet = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.xl} ${theme.radius.xl} 0 0;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const SheetTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
`;

const CloseSheetButton = styled.button`
  width: 36px;
  height: 36px;
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SheetPreview = styled.div`
  padding: ${theme.spacing.md};
`;

const SheetForm = styled.div`
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SheetField = styled.div`
  flex: 1;

  ${props => props.$hasError && css`
    label {
      color: ${theme.colors.error};
    }
  `}
`;

const SheetFieldError = styled.span`
  display: block;
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.xs};
  margin-top: ${theme.spacing.xs};
`;

const SheetLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const SheetActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;

  svg {
    font-size: 10px;
  }
`;

const sheetInputStyles = css`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const SheetInput = styled.input`
  ${sheetInputStyles}

  ${props => props.$hasError && css`
    border-color: ${theme.colors.error};

    &:focus {
      border-color: ${theme.colors.error};
      box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
    }
  `}
`;

const SheetSelect = styled.select`
  ${sheetInputStyles}
  cursor: pointer;
`;

const SheetRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: flex-end;
`;

const SheetCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  white-space: nowrap;

  input {
    width: 20px;
    height: 20px;
  }
`;

const SheetActions = styled.div`
  padding: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

const RemoveFileButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;

  &:hover {
    background: rgba(255, 59, 48, 0.25);
  }
`;

// Confirmation Dialog
const ConfirmOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: ${theme.zIndex.modal + 10};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
`;

const ConfirmDialog = styled(motion.div)`
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  max-width: 400px;
  width: 100%;
  box-shadow: ${theme.shadows.xl};
`;

const ConfirmTitle = styled.h4`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const ConfirmText = styled.p`
  margin: 0 0 ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  line-height: 1.5;

  strong {
    color: ${theme.colors.text};
  }
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  justify-content: flex-end;

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column-reverse;
  }
`;

const ConfirmCancelButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.surfaceHover};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

const ConfirmApplyButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent});
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

export default FileCard;
