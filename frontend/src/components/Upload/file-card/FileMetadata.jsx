/**
 * FileMetadata - Shared metadata form component
 *
 * Single source of truth for metadata form used by both desktop inline
 * and mobile bottom sheet views. Eliminates duplicate form logic.
 *
 * Features:
 * - Responsive input sizing based on variant
 * - Field-level validation display
 * - Copy-to-all functionality
 * - Random name generation
 * - Accessible form controls
 */

import React, { memo, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { FaMagic, FaCopy } from 'react-icons/fa';
import { theme } from '../../../styles/DesignSystem';

const FileMetadata = memo(({
  file,
  validation = {},
  orderedRarities = [],
  onUpdate,
  onBlur,
  onCopyToAll,
  onRegenerateName,
  variant = 'desktop', // 'desktop' | 'mobile'
  disabled = false,
}) => {
  const isMobile = variant === 'mobile';

  // Get validation errors for display
  const nameError = validation.name?.touched && !validation.name?.valid ? validation.name.error : null;
  const seriesError = validation.series?.touched && !validation.series?.valid ? validation.series.error : null;

  const handleChange = useCallback((field, value) => {
    onUpdate(file.id, field, value);
  }, [file.id, onUpdate]);

  const handleBlur = useCallback((field) => {
    if (onBlur) {
      onBlur(file.id, field);
    }
  }, [file.id, onBlur]);

  const handleCopyToAll = useCallback((field) => {
    if (onCopyToAll) {
      onCopyToAll(file.id, field);
    }
  }, [file.id, onCopyToAll]);

  const handleRegenerateName = useCallback(() => {
    if (onRegenerateName) {
      onRegenerateName(file.id);
    }
  }, [file.id, onRegenerateName]);

  return (
    <MetadataForm $variant={variant}>
      {/* Name Field */}
      <Field $hasError={!!nameError}>
        <Label htmlFor={`name-${file.id}`}>
          <LabelText>Name *</LabelText>
          <FieldActions>
            <ActionButton
              type="button"
              onClick={handleRegenerateName}
              title="Generate random name"
              aria-label="Generate random name"
              disabled={disabled}
              $isMobile={isMobile}
            >
              <FaMagic />
              {isMobile && <span>Generate</span>}
            </ActionButton>
          </FieldActions>
        </Label>
        <Input
          id={`name-${file.id}`}
          type="text"
          value={file.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          placeholder="Character name"
          aria-label="Character name"
          aria-required="true"
          aria-invalid={!!nameError}
          aria-describedby={nameError ? `name-error-${file.id}` : undefined}
          $hasError={!!nameError}
          $isMobile={isMobile}
          disabled={disabled}
        />
        {nameError && (
          <FieldError id={`name-error-${file.id}`} role="alert">
            {nameError}
          </FieldError>
        )}
      </Field>

      {/* Series Field */}
      <Field $hasError={!!seriesError}>
        <Label htmlFor={`series-${file.id}`}>
          <LabelText>Series *</LabelText>
          <FieldActions>
            <ActionButton
              type="button"
              onClick={() => handleCopyToAll('series')}
              title="Apply to all files"
              aria-label="Apply series to all files"
              disabled={disabled}
              $isMobile={isMobile}
            >
              <FaCopy />
              {isMobile && <span>Apply to All</span>}
            </ActionButton>
          </FieldActions>
        </Label>
        <Input
          id={`series-${file.id}`}
          type="text"
          value={file.series}
          onChange={(e) => handleChange('series', e.target.value)}
          onBlur={() => handleBlur('series')}
          placeholder="Series name"
          aria-label="Series name"
          aria-required="true"
          aria-invalid={!!seriesError}
          aria-describedby={seriesError ? `series-error-${file.id}` : undefined}
          $hasError={!!seriesError}
          $isMobile={isMobile}
          disabled={disabled}
        />
        {seriesError && (
          <FieldError id={`series-error-${file.id}`} role="alert">
            {seriesError}
          </FieldError>
        )}
      </Field>

      {/* Rarity and R18 Row */}
      <FieldRow>
        <Field $flex>
          <Label htmlFor={`rarity-${file.id}`}>
            <LabelText>Rarity</LabelText>
            <FieldActions>
              <ActionButton
                type="button"
                onClick={() => handleCopyToAll('rarity')}
                title="Apply to all files"
                aria-label="Apply rarity to all files"
                disabled={disabled}
                $isMobile={isMobile}
              >
                <FaCopy />
                {isMobile && <span>Apply to All</span>}
              </ActionButton>
            </FieldActions>
          </Label>
          <Select
            id={`rarity-${file.id}`}
            value={file.rarity}
            onChange={(e) => handleChange('rarity', e.target.value)}
            aria-label="Rarity"
            $isMobile={isMobile}
            disabled={disabled}
          >
            {orderedRarities.map((r) => (
              <option key={r.id || r.name} value={r.name.toLowerCase()}>
                {r.displayName || r.name.charAt(0).toUpperCase() + r.name.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <Field $narrow>
          <CheckboxLabel $isMobile={isMobile}>
            <input
              type="checkbox"
              checked={file.isR18}
              onChange={(e) => handleChange('isR18', e.target.checked)}
              aria-label="Mark as R18 content"
              disabled={disabled}
            />
            <span>R18</span>
          </CheckboxLabel>
        </Field>
      </FieldRow>
    </MetadataForm>
  );
});

FileMetadata.displayName = 'FileMetadata';

// Styled Components
const MetadataForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => (props.$variant === 'mobile' ? theme.spacing.md : theme.spacing.sm)};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: ${(props) => (props.$flex ? 1 : 'none')};

  ${(props) =>
    props.$narrow &&
    css`
      flex: 0 0 auto;
      justify-content: flex-end;
    `}

  ${(props) =>
    props.$hasError &&
    css`
      label {
        color: ${theme.colors.error};
      }
    `}
`;

const FieldRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: flex-end;

  @media (max-width: ${theme.breakpoints.sm}) {
    gap: ${theme.spacing.md};
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.fontSizes.sm};
    text-transform: none;
    color: ${theme.colors.textSecondary};
    margin-bottom: ${theme.spacing.xs};
  }
`;

const LabelText = styled.span``;

const FieldActions = styled.div`
  display: flex;
  gap: 4px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: ${(props) => (props.$isMobile ? theme.colors.primary : theme.colors.textMuted)};
  cursor: pointer;
  padding: 2px;
  font-size: ${(props) => (props.$isMobile ? theme.fontSizes.xs : '10px')};
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

  svg {
    font-size: ${(props) => (props.$isMobile ? '12px' : '10px')};
  }
`;

const inputBaseStyles = css`
  width: 100%;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  color: ${theme.colors.text};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  ${inputBaseStyles}
  padding: ${(props) => (props.$isMobile ? theme.spacing.md : theme.spacing.sm)};
  border-radius: ${(props) => (props.$isMobile ? theme.radius.md : theme.radius.sm)};
  font-size: ${(props) => (props.$isMobile ? theme.fontSizes.base : theme.fontSizes.sm)};

  ${(props) =>
    props.$hasError &&
    css`
      border-color: ${theme.colors.error};

      &:focus {
        border-color: ${theme.colors.error};
        box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
      }
    `}
`;

const Select = styled.select`
  ${inputBaseStyles}
  padding: ${(props) => (props.$isMobile ? theme.spacing.md : theme.spacing.sm)};
  border-radius: ${(props) => (props.$isMobile ? theme.radius.md : theme.radius.sm)};
  font-size: ${(props) => (props.$isMobile ? theme.fontSizes.base : theme.fontSizes.sm)};
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${(props) => (props.$isMobile ? theme.spacing.md : theme.spacing.sm)};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${(props) => (props.$isMobile ? theme.radius.md : theme.radius.sm)};
  cursor: pointer;
  font-size: ${(props) => (props.$isMobile ? theme.fontSizes.base : theme.fontSizes.sm)};
  color: ${theme.colors.text};
  white-space: nowrap;

  input {
    width: ${(props) => (props.$isMobile ? '20px' : '16px')};
    height: ${(props) => (props.$isMobile ? '20px' : '16px')};
  }
`;

const FieldError = styled.span`
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.xs};
  margin-top: 2px;
`;

export default FileMetadata;
