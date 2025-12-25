/**
 * FormField - Enhanced form field with real-time validation feedback
 *
 * A complete form field component that handles label, input, and error display
 * with smooth animations and accessibility features.
 *
 * @accessibility
 * - Proper label-input association
 * - Error announcements via aria-live
 * - Invalid state via aria-invalid
 * - Help text linked via aria-describedby
 *
 * @features
 * - Animated error messages
 * - Success state indicator
 * - Loading state for async validation
 * - Character counter for max length fields
 * - Help text support
 */

import React, { forwardRef, useId } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdError, MdCheckCircle, MdInfo } from 'react-icons/md';
import { theme } from '../tokens';
import { LoadingDots } from './Loading';

const FormField = forwardRef(({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  isValidating,
  helpText,
  required,
  disabled,
  maxLength,
  showCharacterCount,
  successMessage,
  placeholder,
  className,
  as: InputComponent,
  children,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = props.id || `field-${name || generatedId}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const hasError = touched && error;
  const isSuccess = touched && !error && value;
  const showCounter = showCharacterCount && maxLength;

  // Determine which IDs to use for aria-describedby
  const describedByIds = [];
  if (hasError) describedByIds.push(errorId);
  if (helpText) describedByIds.push(helpId);

  const renderInput = () => {
    const inputProps = {
      ref,
      id,
      name,
      type,
      value: value || '',
      onChange,
      onBlur,
      disabled,
      maxLength,
      placeholder,
      'aria-invalid': hasError ? 'true' : undefined,
      'aria-describedby': describedByIds.length > 0 ? describedByIds.join(' ') : undefined,
      'aria-required': required ? 'true' : undefined,
      $hasError: hasError,
      $isSuccess: isSuccess,
      ...props,
    };

    if (InputComponent) {
      return <InputComponent {...inputProps}>{children}</InputComponent>;
    }

    if (type === 'textarea') {
      return <StyledTextarea {...inputProps} />;
    }

    if (type === 'select') {
      return <StyledSelect {...inputProps}>{children}</StyledSelect>;
    }

    return <StyledInput {...inputProps} />;
  };

  return (
    <FieldWrapper className={className}>
      {label && (
        <LabelWrapper>
          <Label htmlFor={id}>
            {label}
            {required && <RequiredMarker aria-hidden="true">*</RequiredMarker>}
          </Label>
          {isValidating && (
            <ValidatingIndicator>
              <LoadingDots size="small" />
            </ValidatingIndicator>
          )}
        </LabelWrapper>
      )}

      <InputWrapper>
        {renderInput()}
        <StateIndicator>
          <AnimatePresence mode="wait">
            {hasError && (
              <IconWrapper
                key="error"
                $variant="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <MdError aria-hidden="true" />
              </IconWrapper>
            )}
            {isSuccess && !isValidating && (
              <IconWrapper
                key="success"
                $variant="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <MdCheckCircle aria-hidden="true" />
              </IconWrapper>
            )}
          </AnimatePresence>
        </StateIndicator>
      </InputWrapper>

      <FeedbackWrapper>
        <AnimatePresence mode="wait">
          {hasError && (
            <ErrorMessage
              key="error"
              id={errorId}
              role="alert"
              aria-live="polite"
              initial={{ opacity: 0, height: 0, y: -5 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <MdError aria-hidden="true" />
              {error}
            </ErrorMessage>
          )}

          {isSuccess && successMessage && (
            <SuccessMessage
              key="success"
              initial={{ opacity: 0, height: 0, y: -5 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <MdCheckCircle aria-hidden="true" />
              {successMessage}
            </SuccessMessage>
          )}
        </AnimatePresence>

        <MetaWrapper>
          {helpText && !hasError && (
            <HelpText id={helpId}>
              <MdInfo aria-hidden="true" />
              {helpText}
            </HelpText>
          )}

          {showCounter && (
            <CharacterCount $warning={(value?.length || 0) > maxLength * 0.9}>
              {value?.length || 0}/{maxLength}
            </CharacterCount>
          )}
        </MetaWrapper>
      </FeedbackWrapper>
    </FieldWrapper>
  );
});

FormField.displayName = 'FormField';

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const LabelWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Label = styled.label`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
`;

const RequiredMarker = styled.span`
  color: ${theme.colors.error};
  margin-left: 2px;
`;

const ValidatingIndicator = styled.span`
  display: flex;
  align-items: center;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const inputStyles = css`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-right: ${theme.spacing['2xl']};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${props => {
    if (props.$hasError) return theme.colors.error;
    if (props.$isSuccess) return theme.colors.success;
    return theme.colors.surfaceBorder;
  }};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  transition: all ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${props => {
      if (props.$hasError) return theme.colors.error;
      return theme.colors.primary;
    }};
    box-shadow: 0 0 0 3px ${props => {
      if (props.$hasError) return 'rgba(255, 59, 48, 0.2)';
      return `${theme.colors.primary}30`;
    }};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${theme.colors.surface};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StyledInput = styled.input`
  ${inputStyles}
`;

const StyledTextarea = styled.textarea`
  ${inputStyles}
  min-height: 100px;
  resize: vertical;
`;

const StyledSelect = styled.select`
  ${inputStyles}
  cursor: pointer;

  &:not(:disabled) {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right ${theme.spacing.md} center;
  }
`;

const StateIndicator = styled.div`
  position: absolute;
  right: ${theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
`;

const IconWrapper = styled(motion.span)`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: ${props => props.$variant === 'error' ? theme.colors.error : theme.colors.success};
`;

const FeedbackWrapper = styled.div`
  min-height: 20px;
`;

const ErrorMessage = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.error};
  overflow: hidden;

  svg {
    flex-shrink: 0;
    font-size: 14px;
  }
`;

const SuccessMessage = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.success};
  overflow: hidden;

  svg {
    flex-shrink: 0;
    font-size: 14px;
  }
`;

const MetaWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${theme.spacing.xs};
`;

const HelpText = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};

  svg {
    font-size: 12px;
  }
`;

const CharacterCount = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$warning ? theme.colors.warning : theme.colors.textMuted};
  margin-left: auto;
`;

export default FormField;
