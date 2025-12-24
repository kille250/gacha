/**
 * Select - Dropdown select component
 *
 * Provides consistent select styling with accessibility.
 */

import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import { MdExpandMore } from 'react-icons/md';
import { theme } from '../../../design-system';

const SelectWrapper = styled.div`
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

const SelectContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-right: 44px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.$hasError ? theme.colors.error : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  appearance: none;

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

  option {
    background: ${theme.colors.backgroundSecondary};
    color: ${theme.colors.text};
  }
`;

const IconWrapper = styled.div`
  position: absolute;
  right: ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textTertiary};
  pointer-events: none;
  font-size: 20px;
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
 * Select Component
 *
 * @param {Object} props
 * @param {string} props.label - Select label
 * @param {string} props.error - Error message
 * @param {string} props.helpText - Help text below select
 * @param {boolean} props.required - Whether select is required
 * @param {Array<{value: string, label: string}>} props.options - Select options
 * @param {string} props.placeholder - Placeholder option text
 */
const Select = forwardRef(({
  label,
  error,
  helpText,
  required = false,
  options = [],
  placeholder,
  id,
  className,
  children,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const helpId = helpText ? `${selectId}-help` : undefined;

  return (
    <SelectWrapper className={className}>
      {label && (
        <Label htmlFor={selectId} $required={required}>
          {label}
        </Label>
      )}
      <SelectContainer>
        <StyledSelect
          ref={ref}
          id={selectId}
          $hasError={!!error}
          aria-invalid={!!error}
          aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
          required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children || options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StyledSelect>
        <IconWrapper>
          <MdExpandMore />
        </IconWrapper>
      </SelectContainer>
      {error && <ErrorText id={errorId} role="alert">{error}</ErrorText>}
      {helpText && !error && <HelpText id={helpId}>{helpText}</HelpText>}
    </SelectWrapper>
  );
});

Select.displayName = 'Select';

export default Select;
