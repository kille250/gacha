/**
 * SearchInput - Search input with clear button
 *
 * Provides a search input with icon and clear functionality.
 */

import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { MdSearch, MdClose } from 'react-icons/md';
import { theme } from '../../../styles/DesignSystem';

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textTertiary};
  pointer-events: none;
  font-size: 18px;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-left: 44px;
  padding-right: ${props => props.$hasValue ? '44px' : theme.spacing.md};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  transition: all ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: ${theme.colors.glass};
  border: none;
  border-radius: 50%;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.surfaceHover};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * SearchInput Component
 *
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Called when value changes
 * @param {Function} props.onClear - Called when clear button clicked
 * @param {string} props.placeholder - Placeholder text
 */
const SearchInput = forwardRef(({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  ...props
}, ref) => {
  const hasValue = value && value.length > 0;

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <SearchWrapper>
      <SearchIcon>
        <MdSearch />
      </SearchIcon>
      <StyledInput
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        $hasValue={hasValue}
        aria-label={placeholder}
        {...props}
      />
      {hasValue && (
        <ClearButton
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          <MdClose size={16} />
        </ClearButton>
      )}
    </SearchWrapper>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
