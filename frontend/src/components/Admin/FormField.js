/**
 * FormField - Reusable form field component with validation display
 *
 * Provides a consistent, accessible form field experience:
 * - Label with optional required indicator
 * - Input, select, or textarea with proper styling
 * - Real-time validation feedback
 * - Error messages with animations
 * - Helper text support
 * - Loading state for async validation
 * - Character count for text fields
 *
 * @accessibility
 * - Proper label-input association
 * - aria-invalid for error states
 * - aria-describedby for error/helper text
 * - Focus management
 * - Screen reader announcements
 */

import React, { forwardRef, useId, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationCircle, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { theme } from '../../design-system';

// Animation for error shake
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
`;

// Animation for the spinner
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const FormField = forwardRef(({
  // Field configuration
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  autoComplete,

  // Value and state
  value,
  defaultValue,
  error,
  touched = false,
  isValidating = false,
  isValid = false,

  // Options for select
  options = [],

  // Textarea specific
  rows = 4,
  resize = 'vertical',

  // Text field specific
  maxLength,
  showCharCount = false,

  // Helper text
  helperText,

  // Callbacks
  onChange,
  onBlur,
  onFocus,

  // Styling
  size = 'medium',
  fullWidth = true,
  className,

  // Additional props spread to the input
  ...inputProps
}, ref) => {
  // Generate unique IDs for accessibility
  const uniqueId = useId();
  const inputId = `field-${name}-${uniqueId}`;
  const errorId = `error-${name}-${uniqueId}`;
  const helperId = `helper-${name}-${uniqueId}`;

  // Determine if we should show the error
  const showError = touched && error && !isValidating;
  const showSuccess = touched && !error && !isValidating && isValid && value;

  // Character count
  const charCount = useMemo(() => {
    if (!showCharCount || !maxLength) return null;
    const length = typeof value === 'string' ? value.length : 0;
    return { current: length, max: maxLength, isNearLimit: length > maxLength * 0.9 };
  }, [value, maxLength, showCharCount]);

  // Build aria-describedby
  const describedBy = useMemo(() => {
    const ids = [];
    if (showError) ids.push(errorId);
    if (helperText) ids.push(helperId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }, [showError, helperText, errorId, helperId]);

  // Common input props
  const commonProps = {
    ref,
    id: inputId,
    name,
    value,
    defaultValue,
    placeholder,
    disabled,
    readOnly,
    autoComplete,
    onChange,
    onBlur,
    onFocus,
    'aria-invalid': showError ? 'true' : undefined,
    'aria-describedby': describedBy,
    'aria-required': required,
    $size: size,
    $hasError: showError,
    $hasSuccess: showSuccess,
    maxLength,
    ...inputProps
  };

  // Render the appropriate input type
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <StyledSelect {...commonProps}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </StyledSelect>
        );

      case 'textarea':
        return (
          <StyledTextarea
            {...commonProps}
            rows={rows}
            $resize={resize}
          />
        );

      case 'checkbox':
        return (
          <CheckboxWrapper>
            <StyledCheckbox
              {...commonProps}
              type="checkbox"
              checked={value}
            />
            <CheckboxLabel htmlFor={inputId}>
              {label}
              {required && <RequiredStar aria-hidden="true">*</RequiredStar>}
            </CheckboxLabel>
          </CheckboxWrapper>
        );

      default:
        return <StyledInput {...commonProps} type={type} />;
    }
  };

  // Checkbox has different layout
  if (type === 'checkbox') {
    return (
      <FieldContainer className={className} $fullWidth={fullWidth}>
        {renderInput()}
        <AnimatePresence mode="wait">
          {showError && (
            <ErrorMessage
              key="error"
              id={errorId}
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <FaExclamationCircle aria-hidden="true" />
              {error}
            </ErrorMessage>
          )}
        </AnimatePresence>
      </FieldContainer>
    );
  }

  return (
    <FieldContainer className={className} $fullWidth={fullWidth}>
      {/* Label */}
      {label && (
        <LabelRow>
          <Label htmlFor={inputId}>
            {label}
            {required && <RequiredStar aria-hidden="true">*</RequiredStar>}
          </Label>
          {charCount && (
            <CharCount $isNearLimit={charCount.isNearLimit}>
              {charCount.current}/{charCount.max}
            </CharCount>
          )}
        </LabelRow>
      )}

      {/* Input wrapper with status icons */}
      <InputWrapper>
        {renderInput()}

        {/* Status indicators */}
        <StatusIcons>
          <AnimatePresence mode="wait">
            {isValidating && (
              <StatusIcon
                key="validating"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                $color={theme.colors.primary}
              >
                <SpinnerIcon aria-label="Validating..." />
              </StatusIcon>
            )}
            {showSuccess && (
              <StatusIcon
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                $color={theme.colors.success}
              >
                <FaCheckCircle aria-label="Valid" />
              </StatusIcon>
            )}
            {showError && (
              <StatusIcon
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                $color={theme.colors.error}
              >
                <FaExclamationCircle aria-label="Error" />
              </StatusIcon>
            )}
          </AnimatePresence>
        </StatusIcons>
      </InputWrapper>

      {/* Error message */}
      <AnimatePresence mode="wait">
        {showError && (
          <ErrorMessage
            key="error"
            id={errorId}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <FaExclamationCircle aria-hidden="true" />
            {error}
          </ErrorMessage>
        )}
      </AnimatePresence>

      {/* Helper text */}
      {helperText && !showError && (
        <HelperText id={helperId}>
          {helperText}
        </HelperText>
      )}
    </FieldContainer>
  );
});

FormField.displayName = 'FormField';

// ============================================
// STYLED COMPONENTS
// ============================================

const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

const RequiredStar = styled.span`
  color: ${theme.colors.error};
  font-weight: ${theme.fontWeights.bold};
`;

const CharCount = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-family: ${theme.fonts.mono};
  color: ${props => props.$isNearLimit ? theme.colors.warning : theme.colors.textMuted};
  transition: color ${theme.transitions.fast};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

// Size variants
const sizeStyles = {
  small: css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    padding-right: ${theme.spacing.xl};
    font-size: ${theme.fontSizes.sm};
    min-height: 36px;
  `,
  medium: css`
    padding: ${theme.spacing.md};
    padding-right: calc(${theme.spacing.md} + 32px);
    font-size: ${theme.fontSizes.base};
    min-height: 48px;
  `,
  large: css`
    padding: ${theme.spacing.lg};
    padding-right: calc(${theme.spacing.lg} + 32px);
    font-size: ${theme.fontSizes.lg};
    min-height: 56px;
  `
};

// Common input styles
const inputBaseStyles = css`
  width: 100%;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};

  ${props => sizeStyles[props.$size || 'medium']}

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover:not(:focus):not(:disabled) {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primaryMuted};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${theme.colors.surfaceBorder};
  }

  /* Error state */
  ${props => props.$hasError && css`
    border-color: ${theme.colors.error};
    animation: ${shake} 0.3s ease-in-out;

    &:focus {
      border-color: ${theme.colors.error};
      box-shadow: 0 0 0 3px ${theme.colors.errorMuted};
    }
  `}

  /* Success state */
  ${props => props.$hasSuccess && css`
    border-color: ${theme.colors.success};

    &:focus {
      border-color: ${theme.colors.success};
      box-shadow: 0 0 0 3px ${theme.colors.successMuted};
    }
  `}
`;

const StyledInput = styled.input`
  ${inputBaseStyles}
`;

const StyledSelect = styled.select`
  ${inputBaseStyles}
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='rgba(255,255,255,0.6)' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right ${theme.spacing.md} center;
  padding-right: ${theme.spacing['2xl']};

  option {
    background: ${theme.colors.surfaceSolid};
    color: ${theme.colors.text};
    padding: ${theme.spacing.sm};
  }
`;

const StyledTextarea = styled.textarea`
  ${inputBaseStyles}
  resize: ${props => props.$resize};
  min-height: 100px;
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const StyledCheckbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${theme.colors.primary};

  &:focus-visible {
    outline: 2px solid ${theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  cursor: pointer;
`;

const StatusIcons = styled.div`
  position: absolute;
  right: ${theme.spacing.md};
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const StatusIcon = styled(motion.span)`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: ${props => props.$color};
`;

const SpinnerIcon = styled(FaSpinner)`
  animation: ${spin} 1s linear infinite;
`;

const ErrorMessage = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.errorMuted};
  border-radius: ${theme.radius.sm};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  overflow: hidden;

  svg {
    flex-shrink: 0;
    font-size: 12px;
  }
`;

const HelperText = styled.p`
  margin: 0;
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  line-height: 1.4;
`;

// PropTypes
FormField.propTypes = {
  /** Field name (required for form handling) */
  name: PropTypes.string.isRequired,
  /** Label text */
  label: PropTypes.string,
  /** Input type */
  type: PropTypes.oneOf([
    'text', 'email', 'password', 'number', 'tel', 'url',
    'date', 'time', 'datetime-local',
    'select', 'textarea', 'checkbox'
  ]),
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Whether the field is required */
  required: PropTypes.bool,
  /** Whether the field is disabled */
  disabled: PropTypes.bool,
  /** Whether the field is read-only */
  readOnly: PropTypes.bool,
  /** Autocomplete attribute */
  autoComplete: PropTypes.string,
  /** Current field value */
  value: PropTypes.any,
  /** Default value (uncontrolled) */
  defaultValue: PropTypes.any,
  /** Error message to display */
  error: PropTypes.string,
  /** Whether the field has been touched/blurred */
  touched: PropTypes.bool,
  /** Whether async validation is in progress */
  isValidating: PropTypes.bool,
  /** Whether the field value is valid */
  isValid: PropTypes.bool,
  /** Options for select type */
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.any.isRequired,
    label: PropTypes.string.isRequired,
    disabled: PropTypes.bool
  })),
  /** Number of rows for textarea */
  rows: PropTypes.number,
  /** Resize behavior for textarea */
  resize: PropTypes.oneOf(['none', 'vertical', 'horizontal', 'both']),
  /** Maximum character length */
  maxLength: PropTypes.number,
  /** Whether to show character count */
  showCharCount: PropTypes.bool,
  /** Helper text shown below the field */
  helperText: PropTypes.string,
  /** Change handler */
  onChange: PropTypes.func,
  /** Blur handler */
  onBlur: PropTypes.func,
  /** Focus handler */
  onFocus: PropTypes.func,
  /** Field size variant */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /** Whether to take full width */
  fullWidth: PropTypes.bool,
  /** Additional CSS class */
  className: PropTypes.string
};

export default FormField;
