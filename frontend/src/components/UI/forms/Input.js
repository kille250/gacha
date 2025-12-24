/**
 * Input - Text input component with label and error state
 *
 * Provides consistent form input styling with accessibility.
 */

import React, { forwardRef, memo } from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../../design-system';

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  width: 100%;
`;

const Label = styled.label`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};

  ${props => props.$required && css`
    &::after {
      content: ' *';
      color: ${theme.colors.error};
    }
  `}
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$hasError ? theme.colors.error : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};

  ${props => props.$hasPrefix && css`
    padding-left: 44px;
  `}

  ${props => props.$hasSuffix && css`
    padding-right: 44px;
  `}

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover:not(:disabled) {
    border-color: ${props => props.$hasError ? theme.colors.error : theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.$hasError
      ? 'rgba(255, 59, 48, 0.2)'
      : 'rgba(0, 113, 227, 0.2)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Affix = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 100%;
  color: ${theme.colors.textTertiary};
  pointer-events: none;

  ${props => props.$position === 'prefix' && css`
    left: 0;
  `}

  ${props => props.$position === 'suffix' && css`
    right: 0;
  `}
`;

const HelpText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textTertiary};
`;

const ErrorText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.error};
`;

/**
 * Input Component
 *
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.error - Error message
 * @param {string} props.helpText - Help text below input
 * @param {React.ReactNode} props.prefix - Prefix icon/element
 * @param {React.ReactNode} props.suffix - Suffix icon/element
 * @param {boolean} props.required - Whether input is required
 * @param {string} props.id - Input ID (auto-generated if not provided)
 */
const Input = memo(forwardRef(({
  label,
  error,
  helpText,
  prefix,
  suffix,
  required = false,
  id,
  className,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helpId = helpText ? `${inputId}-help` : undefined;

  return (
    <InputWrapper className={className}>
      {label && (
        <Label htmlFor={inputId} $required={required}>
          {label}
        </Label>
      )}
      <InputContainer>
        {prefix && <Affix $position="prefix">{prefix}</Affix>}
        <StyledInput
          ref={ref}
          id={inputId}
          $hasError={!!error}
          $hasPrefix={!!prefix}
          $hasSuffix={!!suffix}
          aria-invalid={!!error}
          aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
          required={required}
          {...props}
        />
        {suffix && <Affix $position="suffix">{suffix}</Affix>}
      </InputContainer>
      {error && <ErrorText id={errorId} role="alert">{error}</ErrorText>}
      {helpText && !error && <HelpText id={helpId}>{helpText}</HelpText>}
    </InputWrapper>
  );
}));

Input.displayName = 'Input';

export default Input;
