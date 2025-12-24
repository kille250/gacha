/**
 * FileCardMetadata - Metadata form for a file card
 *
 * Features:
 * - Desktop inline form
 * - Mobile trigger for bottom sheet
 * - Field-level validation display
 * - Action buttons for each field
 */
import React, { memo, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { FaCopy, FaMagic, FaChevronDown } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';

const FileCardMetadata = memo(({
  file,
  validation = {},
  orderedRarities = [],
  onUpdateMetadata,
  onCopyToAll,
  onRegenerateName,
  onBlur,
  onMobileExpand,
  disabled = false,
}) => {
  const nameError = validation.name?.touched && !validation.name?.valid ? validation.name.error : null;
  const seriesError = validation.series?.touched && !validation.series?.valid ? validation.series.error : null;

  const handleChange = useCallback((field, value) => {
    onUpdateMetadata(file.id, field, value);
  }, [file.id, onUpdateMetadata]);

  const handleBlur = useCallback((field) => {
    if (onBlur) {
      onBlur(file.id, field);
    }
  }, [file.id, onBlur]);

  return (
    <MetadataSection>
      {/* Mobile: Tap to expand */}
      <MobileMetaTrigger
        onClick={onMobileExpand}
        aria-label="Edit metadata"
        disabled={disabled}
      >
        <MetaSummary>
          <MetaName $hasError={!!nameError || !!seriesError}>
            {file.name || 'Tap to edit...'}
          </MetaName>
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
                onClick={() => onRegenerateName(file.id)}
                title="Generate random name"
                aria-label="Generate random name"
                disabled={disabled}
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
            disabled={disabled}
          />
          {nameError && <FieldError role="alert">{nameError}</FieldError>}
        </MetaField>

        <MetaField $hasError={!!seriesError}>
          <MetaLabel>
            Series *
            <FieldActions>
              <ActionButton
                onClick={() => onCopyToAll('series')}
                title="Apply to all files"
                aria-label="Apply series to all files"
                disabled={disabled}
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
            disabled={disabled}
          />
          {seriesError && <FieldError role="alert">{seriesError}</FieldError>}
        </MetaField>

        <MetaRow>
          <MetaField $flex>
            <MetaLabel>
              Rarity
              <FieldActions>
                <ActionButton
                  onClick={() => onCopyToAll('rarity')}
                  title="Apply to all files"
                  aria-label="Apply rarity to all files"
                  disabled={disabled}
                >
                  <FaCopy />
                </ActionButton>
              </FieldActions>
            </MetaLabel>
            <MetaSelect
              value={file.rarity}
              onChange={(e) => handleChange('rarity', e.target.value)}
              aria-label="Rarity"
              disabled={disabled}
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
                disabled={disabled}
              />
              <span>R18</span>
            </CheckboxLabel>
          </MetaField>
        </MetaRow>
      </DesktopMetaForm>
    </MetadataSection>
  );
});

FileCardMetadata.displayName = 'FileCardMetadata';

// Styled components
const MetadataSection = styled.div`
  padding: ${theme.spacing.md};
`;

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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  color: ${props => props.$hasError ? theme.colors.error : 'inherit'};
`;

const MetaSeries = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

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

  &:hover:not(:disabled) {
    color: ${theme.colors.primary};
  }

  &:focus-visible {
    color: ${theme.colors.primary};
    outline: 1px solid ${theme.colors.primary};
    border-radius: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  &:disabled {
    cursor: not-allowed;
  }
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

  &:has(input:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default FileCardMetadata;
