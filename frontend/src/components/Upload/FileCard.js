/**
 * FileCard - Individual file display with metadata editing
 *
 * Features:
 * - Responsive: inline editing on desktop, bottom sheet on mobile
 * - Status indicators with accessibility
 * - Copy-to-all functionality with confirmation
 * - Swipe to reveal actions on mobile
 * - Uses shared FileMetadata component
 */
import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrash, FaTimes, FaChevronDown } from 'react-icons/fa';
import { theme } from '../../design-system';
import MediaPreview from './MediaPreview';
import StatusBadge from './StatusBadge';
import { FILE_STATUS } from '../../hooks/useUploadState';
import DuplicateWarningBanner from '../UI/DuplicateWarningBanner';
import { DUPLICATE_STATUS } from '../../utils/errorHandler';
import { isEnabled, FEATURES, prefersReducedMotion } from '../../utils/featureFlags';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useFocusTrap } from '../../hooks/useFocusManagement';
import FileMetadata from './file-card/FileMetadata';
import CopyConfirmDialog from './CopyConfirmDialog';

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
  const [showSwipeActions, setShowSwipeActions] = useState(false);
  const mobileSheetRef = useRef(null);

  // Focus trap for mobile bottom sheet
  const { containerRef: focusTrapRef, handleKeyDown: handleFocusTrapKeyDown } = useFocusTrap(showMobileSheet);

  // Focus first element when sheet opens
  useEffect(() => {
    if (showMobileSheet && mobileSheetRef.current) {
      const firstFocusable = mobileSheetRef.current.querySelector(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])'
      );
      setTimeout(() => firstFocusable?.focus(), 100);
    }
  }, [showMobileSheet]);

  const status = fileStatus?.status || FILE_STATUS.PENDING;
  const hasWarning = status === FILE_STATUS.WARNING;
  const isBlocked = status === FILE_STATUS.BLOCKED;
  const hasError = status === FILE_STATUS.ERROR;
  const reducedMotion = prefersReducedMotion();

  // Swipe gesture for mobile actions
  const { handlers: swipeHandlers, offsetX, isDragging } = useSwipeGesture({
    onSwipeLeft: () => {
      if (isEnabled(FEATURES.SWIPE_TO_DELETE)) {
        setShowSwipeActions(true);
      }
    },
    onSwipeRight: () => {
      setShowSwipeActions(false);
    },
    direction: 'horizontal',
    threshold: 60,
  });

  const handleRemove = useCallback(() => {
    onRemove(file.id);
    setShowMobileSheet(false);
    setShowSwipeActions(false);
  }, [file.id, onRemove]);

  const handleCopyToAll = useCallback((fileId, field) => {
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

  const handleOpenMobileSheet = useCallback(() => {
    if (!showSwipeActions) {
      setShowMobileSheet(true);
    }
  }, [showSwipeActions]);

  const handleCloseMobileSheet = useCallback(() => {
    setShowMobileSheet(false);
  }, []);

  const handleDismissWarning = useCallback(() => {
    if (onDismissWarning) {
      onDismissWarning(file.id);
    }
  }, [file.id, onDismissWarning]);

  // Calculate swipe offset for visual feedback
  const swipeOffset = isDragging ? Math.min(0, offsetX) : (showSwipeActions ? -80 : 0);

  return (
    <>
      <CardWrapper role="listitem">
        {/* Swipe action background */}
        {isEnabled(FEATURES.SWIPE_TO_DELETE) && (
          <SwipeActionBackground $visible={showSwipeActions || isDragging}>
            <SwipeDeleteButton
              onClick={handleRemove}
              aria-label="Delete file"
              $visible={showSwipeActions}
            >
              <FaTrash />
            </SwipeDeleteButton>
          </SwipeActionBackground>
        )}

        <CardContainer
          $hasWarning={hasWarning}
          $isBlocked={isBlocked}
          $hasError={hasError}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={reducedMotion ? false : { opacity: 1, scale: 1 }}
          exit={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          layout={!reducedMotion}
          style={{ transform: `translateX(${swipeOffset}px)` }}
          {...(isEnabled(FEATURES.SWIPE_TO_DELETE) ? swipeHandlers : {})}
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
              type="button"
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
              onClick={handleOpenMobileSheet}
              aria-label="Edit metadata"
              type="button"
            >
              <MetaSummary>
                <MetaName $hasError={!file.name}>
                  {file.name || 'Tap to edit...'}
                </MetaName>
                <MetaSeries>{file.series || 'No series'}</MetaSeries>
              </MetaSummary>
              <FaChevronDown />
            </MobileMetaTrigger>

            {/* Desktop: Inline form using shared FileMetadata */}
            <DesktopMetaForm>
              <FileMetadata
                file={file}
                validation={fileValidation}
                orderedRarities={orderedRarities}
                onUpdate={onUpdateMetadata}
                onBlur={onTouchField}
                onCopyToAll={handleCopyToAll}
                onRegenerateName={onRegenerateName}
                variant="desktop"
              />
            </DesktopMetaForm>
          </MetadataSection>
        </CardContainer>
      </CardWrapper>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {showMobileSheet && (
          <MobileSheetOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseMobileSheet}
          >
            <MobileSheet
              ref={(el) => {
                mobileSheetRef.current = el;
                if (focusTrapRef) focusTrapRef.current = el;
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleFocusTrapKeyDown}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`sheet-title-${file.id}`}
            >
              <SheetHeader>
                <SheetTitle id={`sheet-title-${file.id}`}>Edit File {index + 1}</SheetTitle>
                <CloseSheetButton
                  onClick={handleCloseMobileSheet}
                  aria-label="Close"
                  type="button"
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
                <FileMetadata
                  file={file}
                  validation={fileValidation}
                  orderedRarities={orderedRarities}
                  onUpdate={onUpdateMetadata}
                  onBlur={onTouchField}
                  onCopyToAll={handleCopyToAll}
                  onRegenerateName={onRegenerateName}
                  variant="mobile"
                />
              </SheetForm>

              <SheetActions>
                <RemoveFileButton onClick={handleRemove} type="button">
                  <FaTrash /> Remove File
                </RemoveFileButton>
              </SheetActions>
            </MobileSheet>
          </MobileSheetOverlay>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog for Copy to All */}
      <CopyConfirmDialog
        isOpen={!!confirmCopyField}
        field={confirmCopyField}
        value={file[confirmCopyField]}
        onConfirm={confirmCopy}
        onCancel={cancelCopy}
      />
    </>
  );
});

FileCard.displayName = 'FileCard';

// Styled components
const CardWrapper = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${theme.radius.xl};
`;

const SwipeActionBackground = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80px;
  background: ${theme.colors.error};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.2s ease;

  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const SwipeDeleteButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: ${theme.spacing.md};
  opacity: ${props => props.$visible ? 1 : 0.5};
  transition: opacity 0.2s ease;

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

const CardContainer = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 2px solid ${props => {
    if (props.$isBlocked || props.$hasError) return 'rgba(255, 59, 48, 0.5)';
    if (props.$hasWarning) return 'rgba(255, 159, 10, 0.5)';
    return theme.colors.surfaceBorder;
  }};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: ${props => {
      if (props.$isBlocked || props.$hasError) return 'rgba(255, 59, 48, 0.7)';
      if (props.$hasWarning) return 'rgba(255, 159, 10, 0.7)';
      return theme.colors.primary;
    }};
  }

  &:focus-within {
    border-color: ${theme.colors.primary};
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
  width: 44px;
  height: 44px;
  background: rgba(255, 59, 48, 0.9);
  border: none;
  border-radius: ${theme.radius.md};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
  /* Ensure minimum touch target size for WCAG compliance */
  min-width: 44px;
  min-height: 44px;

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
  color: ${props => props.$hasError ? theme.colors.textMuted : theme.colors.text};
  font-style: ${props => props.$hasError ? 'italic' : 'normal'};
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
    display: block;
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
  /* Safe area insets for iOS devices */
  padding-bottom: env(safe-area-inset-bottom, 16px);
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

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const SheetPreview = styled.div`
  padding: ${theme.spacing.md};
`;

const SheetForm = styled.div`
  padding: ${theme.spacing.md};
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

  &:focus-visible {
    outline: 2px solid ${theme.colors.error};
    outline-offset: 2px;
  }
`;

export default FileCard;
