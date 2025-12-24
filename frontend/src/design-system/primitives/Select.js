/**
 * Select - Dropdown select component
 *
 * Unified select component with consistent styling.
 */

import React, { forwardRef, memo } from 'react';
import styled, { css } from 'styled-components';
import { MdExpandMore } from 'react-icons/md';
import { theme } from '../tokens';

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
  border: 1px solid ${props => props.$error ? theme.colors.error : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  appearance: none;
  min-height: 44px;

  &:hover:not(:disabled) {
    border-color: ${props => props.$error ? theme.colors.error : theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.$error ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.$error ? 'rgba(255, 59, 48, 0.2)' : 'rgba(0, 113, 227, 0.2)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${props => props.$size === 'sm' && css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    padding-right: 36px;
    font-size: ${theme.fontSizes.sm};
    min-height: 36px;
  `}

  ${props => props.$size === 'lg' && css`
    padding: ${theme.spacing.lg};
    padding-right: 52px;
    font-size: ${theme.fontSizes.md};
    min-height: 52px;
  `}

  option {
    background: ${theme.colors.backgroundSecondary};
    color: ${theme.colors.text};
  }
`;

const ChevronIcon = styled.span`
  position: absolute;
  right: ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textSecondary};
  font-size: 20px;
  pointer-events: none;
`;

const HelperText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$error ? theme.colors.error : theme.colors.textSecondary};
`;

/**
 * Select Component
 *
 * @param {string} label - Select label
 * @param {string} error - Error message
 * @param {string} helperText - Helper text below select
 * @param {'sm' | 'md' | 'lg'} size - Select size
 * @param {Array<{value: string, label: string}>} options - Options array
 */
const Select = memo(forwardRef(function Select({
  label,
  error,
  helperText,
  size = 'md',
  options,
  placeholder,
  id,
  children,
  ...props
}, ref) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = Boolean(error);

  return (
    <SelectWrapper>
      {label && <Label htmlFor={selectId}>{label}</Label>}
      <SelectContainer>
        <StyledSelect
          ref={ref}
          id={selectId}
          $size={size}
          $error={hasError}
          aria-invalid={hasError}
          aria-describedby={error || helperText ? `${selectId}-helper` : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options ? options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )) : children}
        </StyledSelect>
        <ChevronIcon>
          <MdExpandMore />
        </ChevronIcon>
      </SelectContainer>
      {(error || helperText) && (
        <HelperText id={`${selectId}-helper`} $error={hasError}>
          {error || helperText}
        </HelperText>
      )}
    </SelectWrapper>
  );
}));

Select.displayName = 'Select';

export default Select;
