/**
 * DropZone - File selection area with drag/drop and file picker
 *
 * Features:
 * - Mobile-first with generous touch targets
 * - Drag & drop support for desktop
 * - Keyboard accessible
 * - Visual feedback for drag state
 * - File type validation
 */
import React, { useState, useRef, useCallback, memo } from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { FaCloudUploadAlt, FaImage, FaVideo } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme } from '../../design-system';

const DropZone = memo(({
  onFilesSelected,
  disabled = false,
  maxFiles = 50,
  currentFileCount = 0,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const remainingSlots = maxFiles - currentFileCount;
  const canAddFiles = remainingSlots > 0 && !disabled;

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAddFiles) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [canAddFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!canAddFiles) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  }, [canAddFiles, onFilesSelected]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

  const handleClick = useCallback(() => {
    if (canAddFiles) {
      fileInputRef.current?.click();
    }
  }, [canAddFiles]);

  const handleKeyDown = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ' ') && canAddFiles) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, [canAddFiles]);

  if (compact) {
    return (
      <CompactDropZone
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        $disabled={!canAddFiles}
        role="button"
        tabIndex={canAddFiles ? 0 : -1}
        aria-label={t('upload.addFiles')}
        aria-disabled={!canAddFiles}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/webm"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
        <FaCloudUploadAlt />
        <span>{t('upload.addFiles')}</span>
      </CompactDropZone>
    );
  }

  return (
    <DropZoneContainer
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      $active={dragActive}
      $disabled={!canAddFiles}
      role="button"
      tabIndex={canAddFiles ? 0 : -1}
      aria-label={t('upload.uploadArea')}
      aria-describedby="dropzone-instructions"
      aria-disabled={!canAddFiles}
      as={motion.div}
      whileHover={canAddFiles ? { scale: 1.01 } : {}}
      whileTap={canAddFiles ? { scale: 0.99 } : {}}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      <UploadIcon $active={dragActive}>
        <FaCloudUploadAlt />
      </UploadIcon>

      <MainText>
        {dragActive ? (
          t('upload.dropFilesHere')
        ) : (
          <>
            <DesktopText>{t('upload.dragDropOrBrowse')}</DesktopText>
            <MobileText>{t('upload.tapToSelect')}</MobileText>
          </>
        )}
      </MainText>

      <SupportedFormats id="dropzone-instructions">
        <FormatItem>
          <FaImage /> {t('upload.imagesFormat')}
        </FormatItem>
        <FormatItem>
          <FaVideo /> {t('upload.videosFormat')}
        </FormatItem>
      </SupportedFormats>

      {remainingSlots < maxFiles && (
        <FileCount>
          {t('upload.slotsRemaining', { remaining: remainingSlots, max: maxFiles })}
        </FileCount>
      )}

      {!canAddFiles && currentFileCount >= maxFiles && (
        <LimitReached>{t('upload.maximumFilesReached')}</LimitReached>
      )}
    </DropZoneContainer>
  );
});

DropZone.displayName = 'DropZone';

// Styled components
const DropZoneContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  min-height: 200px;
  padding: ${theme.spacing.xl};
  border: 2px dashed ${props => props.$active ? theme.colors.primary : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  background: ${props => props.$active
    ? 'rgba(0, 113, 227, 0.1)'
    : 'rgba(255, 255, 255, 0.02)'};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  ${props => !props.$disabled && css`
    &:hover {
      border-color: ${theme.colors.primary};
      background: rgba(0, 113, 227, 0.05);
    }

    &:focus-visible {
      outline: none;
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
    }
  `}

  @media (max-width: ${theme.breakpoints.sm}) {
    min-height: 160px;
    padding: ${theme.spacing.lg};
  }
`;

const CompactDropZone = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px dashed ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  ${props => !props.$disabled && css`
    &:hover {
      border-color: ${theme.colors.primary};
      color: ${theme.colors.primary};
      background: rgba(0, 113, 227, 0.05);
    }

    &:focus-visible {
      outline: none;
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
    }
  `}

  svg {
    font-size: 18px;
  }
`;

const UploadIcon = styled.div`
  font-size: 48px;
  color: ${props => props.$active ? theme.colors.primary : theme.colors.textMuted};
  transition: color 0.2s ease, transform 0.2s ease;

  ${DropZoneContainer}:hover & {
    color: ${theme.colors.primary};
    transform: translateY(-2px);
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 36px;
  }
`;

const MainText = styled.div`
  text-align: center;
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
  }
`;

const DesktopText = styled.span`
  display: none;

  @media (min-width: ${theme.breakpoints.md}) {
    display: inline;
  }
`;

const MobileText = styled.span`
  display: inline;

  @media (min-width: ${theme.breakpoints.md}) {
    display: none;
  }
`;

const SupportedFormats = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.sm};

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
    gap: ${theme.spacing.xs};
  }
`;

const FormatItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  svg {
    font-size: 12px;
  }
`;

const FileCount = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border-radius: ${theme.radius.full};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.xs};
`;

const LimitReached = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: rgba(255, 159, 10, 0.15);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.warning};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
`;

export default DropZone;
