/**
 * Input - Text input component with validation states
 *
 * Unified input component with consistent styling.
 */

import React, { forwardRef, memo } from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../tokens';

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
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-left: ${props => props.$hasLeftIcon ? '44px' : theme.spacing.md};
  padding-right: ${props => props.$hasRightIcon ? '44px' : theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${props => {
    if (props.$error) return theme.colors.error;
    if (props.$success) return theme.colors.success;
    return theme.colors.surfaceBorder;
  }};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};
  min-height: 44px;

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover:not(:disabled) {
    border-color: ${props => {
      if (props.$error) return theme.colors.error;
      if (props.$success) return theme.colors.success;
      return theme.colors.glassBorder;
    }};
  }

  &:focus {
    outline: none;
    border-color: ${props => {
      if (props.$error) return theme.colors.error;
      if (props.$success) return theme.colors.success;
      return theme.colors.primary;
    }};
    box-shadow: 0 0 0 3px ${props => {
      if (props.$error) return 'rgba(255, 59, 48, 0.2)';
      if (props.$success) return 'rgba(52, 199, 89, 0.2)';
      return 'rgba(0, 113, 227, 0.2)';
    }};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${props => props.$size === 'sm' && css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-size: ${theme.fontSizes.sm};
    min-height: 36px;
  `}

  ${props => props.$size === 'lg' && css`
    padding: ${theme.spacing.lg};
    font-size: ${theme.fontSizes.md};
    min-height: 52px;
  `}
`;

const IconWrapper = styled.span`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textSecondary};
  font-size: 18px;

  ${props => props.$position === 'left' && css`
    left: ${theme.spacing.md};
  `}

  ${props => props.$position === 'right' && css`
    right: ${theme.spacing.md};
  `}
`;

const HelperText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${props => {
    if (props.$error) return theme.colors.error;
    if (props.$success) return theme.colors.success;
    return theme.colors.textSecondary;
  }};
`;

/**
 * Input Component
 *
 * @param {string} label - Input label
 * @param {string} error - Error message
 * @param {string} helperText - Helper text below input
 * @param {boolean} success - Show success state
 * @param {'sm' | 'md' | 'lg'} size - Input size
 * @param {React.ReactNode} leftIcon - Icon on the left
 * @param {React.ReactNode} rightIcon - Icon on the right
 */
const Input = memo(forwardRef(function Input({
  label,
  error,
  helperText,
  success,
  size = 'md',
  leftIcon,
  rightIcon,
  id,
  ...props
}, ref) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;

  return (
    <InputWrapper>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <InputContainer>
        {leftIcon && <IconWrapper $position="left">{leftIcon}</IconWrapper>}
        <StyledInput
          ref={ref}
          id={inputId}
          $size={size}
          $error={hasError}
          $success={hasSuccess}
          $hasLeftIcon={Boolean(leftIcon)}
          $hasRightIcon={Boolean(rightIcon)}
          aria-invalid={hasError}
          aria-describedby={error || helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {rightIcon && <IconWrapper $position="right">{rightIcon}</IconWrapper>}
      </InputContainer>
      {(error || helperText) && (
        <HelperText id={`${inputId}-helper`} $error={hasError} $success={hasSuccess}>
          {error || helperText}
        </HelperText>
      )}
    </InputWrapper>
  );
}));

export default Input;
