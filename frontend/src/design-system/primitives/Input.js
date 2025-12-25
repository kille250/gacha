/**
 * Input - Text input component with validation states
 *
 * WCAG-compliant input component with:
 * - Clear validation states with icons and colors
 * - Proper label association via htmlFor
 * - Error messages linked via aria-describedby
 * - Sufficient touch targets (44px minimum)
 * - High-visibility focus states
 * - Required field indicator
 */

import React, { forwardRef, memo, useId } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { FaCheck, FaExclamationCircle } from 'react-icons/fa';
import { theme } from '../tokens';

// Subtle shake animation for error state
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  width: 100%;
`;

const LabelWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  line-height: ${theme.lineHeights.normal};
`;

const RequiredIndicator = styled.span`
  color: ${theme.colors.error};
  font-weight: ${theme.fontWeights.semibold};
  font-size: ${theme.fontSizes.sm};
`;

const OptionalIndicator = styled.span`
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.regular};
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
  padding-right: ${props => props.$hasRightElement ? '44px' : theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1.5px solid ${props => {
    if (props.$error) return theme.colors.error;
    if (props.$success) return theme.colors.success;
    return theme.colors.surfaceBorder;
  }};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  transition:
    border-color ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.fast} ${theme.easing.easeOut},
    background-color ${theme.timing.fast} ${theme.easing.easeOut};
  min-height: 44px;

  /* Error state animation */
  ${props => props.$showErrorAnimation && css`
    animation: ${shake} 0.4s ease-in-out;
  `}

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  /* Hover state - only on desktop */
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled):not(:focus) {
      border-color: ${props => {
        if (props.$error) return theme.colors.error;
        if (props.$success) return theme.colors.success;
        return theme.colors.glassBorder;
      }};
      background: ${theme.colors.backgroundSecondary};
    }
  }

  /* Focus state - high visibility */
  &:focus {
    outline: none;
    border-color: ${props => {
      if (props.$error) return theme.colors.error;
      if (props.$success) return theme.colors.success;
      return theme.colors.primary;
    }};
    box-shadow: 0 0 0 3px ${props => {
      if (props.$error) return 'rgba(255, 59, 48, 0.25)';
      if (props.$success) return 'rgba(52, 199, 89, 0.25)';
      return 'rgba(0, 113, 227, 0.25)';
    }};
    background: ${theme.colors.backgroundTertiary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${theme.colors.backgroundSecondary};
  }

  /* Size variants - all maintain 44px minimum touch target */
  ${props => props.$size === 'sm' && css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    padding-left: ${props.$hasLeftIcon ? '40px' : theme.spacing.md};
    padding-right: ${props.$hasRightElement ? '40px' : theme.spacing.md};
    font-size: ${theme.fontSizes.sm};
    min-height: 40px;

    @media (pointer: coarse) {
      min-height: 44px;
    }
  `}

  ${props => props.$size === 'lg' && css`
    padding: ${theme.spacing.lg};
    padding-left: ${props.$hasLeftIcon ? '52px' : theme.spacing.lg};
    padding-right: ${props.$hasRightElement ? '52px' : theme.spacing.lg};
    font-size: ${theme.fontSizes.md};
    min-height: 52px;
    border-radius: ${theme.radius.lg};
  `}

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const IconWrapper = styled.span`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => {
    if (props.$error) return theme.colors.error;
    if (props.$success) return theme.colors.success;
    return theme.colors.textSecondary;
  }};
  font-size: 18px;
  pointer-events: none;
  transition: color ${theme.timing.fast} ${theme.easing.easeOut};

  ${props => props.$position === 'left' && css`
    left: ${theme.spacing.md};
  `}

  ${props => props.$position === 'right' && css`
    right: ${theme.spacing.md};
  `}
`;

// Validation icon shown on right side
const ValidationIcon = styled.span`
  position: absolute;
  right: ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: ${props => props.$error ? theme.colors.error : theme.colors.success};
  pointer-events: none;
`;

const HelperTextWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.xs};
  min-height: 20px; /* Prevent layout shift */
`;

const HelperText = styled.span`
  font-size: ${theme.fontSizes.sm};
  line-height: ${theme.lineHeights.normal};
  color: ${props => {
    if (props.$error) return theme.colors.error;
    if (props.$success) return theme.colors.success;
    return theme.colors.textSecondary;
  }};
`;

const CharacterCount = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$overLimit ? theme.colors.error : theme.colors.textMuted};
  margin-left: auto;
  white-space: nowrap;
`;

/**
 * Input Component
 *
 * @param {string} label - Input label (required for accessibility)
 * @param {string} error - Error message to display
 * @param {string} helperText - Helper text below input
 * @param {boolean} success - Show success state
 * @param {'sm' | 'md' | 'lg'} size - Input size
 * @param {React.ReactNode} leftIcon - Icon on the left
 * @param {React.ReactNode} rightIcon - Icon on the right (hidden if validation icons shown)
 * @param {boolean} required - Mark field as required
 * @param {boolean} showOptional - Show "(optional)" for non-required fields
 * @param {number} maxLength - Maximum character length (shows counter)
 * @param {string} value - Controlled input value (for character count)
 */
const Input = memo(forwardRef(function Input({
  label,
  error,
  helperText,
  success,
  size = 'md',
  leftIcon,
  rightIcon,
  required = false,
  showOptional = false,
  maxLength,
  value,
  id,
  className,
  ...props
}, ref) {
  // Use React's useId for stable, SSR-safe IDs
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;

  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;
  const showValidationIcon = hasError || hasSuccess;
  const hasRightElement = rightIcon || showValidationIcon;

  // Character count logic
  const currentLength = typeof value === 'string' ? value.length : 0;
  const showCharCount = maxLength && typeof value === 'string';
  const overLimit = showCharCount && currentLength > maxLength;

  return (
    <InputWrapper className={className}>
      {label && (
        <LabelWrapper>
          <Label htmlFor={inputId}>
            {label}
            {required && <RequiredIndicator aria-hidden="true"> *</RequiredIndicator>}
          </Label>
          {!required && showOptional && (
            <OptionalIndicator>(optional)</OptionalIndicator>
          )}
        </LabelWrapper>
      )}
      <InputContainer>
        {leftIcon && (
          <IconWrapper $position="left" $error={hasError} $success={hasSuccess}>
            {leftIcon}
          </IconWrapper>
        )}
        <StyledInput
          ref={ref}
          id={inputId}
          $size={size}
          $error={hasError}
          $success={hasSuccess}
          $hasLeftIcon={Boolean(leftIcon)}
          $hasRightElement={hasRightElement}
          $showErrorAnimation={hasError}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={(error || helperText || showCharCount) ? helperId : undefined}
          required={required}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        {showValidationIcon ? (
          <ValidationIcon $error={hasError} aria-hidden="true">
            {hasError ? <FaExclamationCircle /> : <FaCheck />}
          </ValidationIcon>
        ) : rightIcon ? (
          <IconWrapper $position="right">{rightIcon}</IconWrapper>
        ) : null}
      </InputContainer>
      <HelperTextWrapper>
        {(error || helperText) && (
          <HelperText
            id={helperId}
            $error={hasError}
            $success={hasSuccess}
            role={hasError ? 'alert' : undefined}
          >
            {error || helperText}
          </HelperText>
        )}
        {showCharCount && (
          <CharacterCount $overLimit={overLimit} aria-live="polite">
            {currentLength}/{maxLength}
          </CharacterCount>
        )}
      </HelperTextWrapper>
    </InputWrapper>
  );
}));

export default Input;
