/**
 * AdminSearch - Universal search component for admin tabs
 *
 * Provides a consistent search experience across all admin tabs with:
 * - Debounced input
 * - Clear button
 * - Keyboard shortcuts (Escape to clear)
 * - Accessible labels
 * - Mobile-optimized layout
 *
 * @accessibility
 * - Input has proper labels
 * - Clear button has accessible label
 * - Escape key clears input
 * - Live region announces result counts
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaFilter } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, VisuallyHidden } from '../../design-system';

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  max-width: 400px;

  @media (max-width: ${theme.breakpoints.sm}) {
    max-width: none;
    width: 100%;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  color: ${theme.colors.textMuted};
  font-size: 14px;
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  padding-left: 40px;
  padding-right: ${props => props.$hasValue ? '40px' : theme.spacing.md};
  min-height: 48px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:hover:not(:focus):not(:disabled) {
    border-color: ${theme.colors.glassBorder};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
  }
`;

const ClearButton = styled(motion.button)`
  position: absolute;
  right: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${theme.colors.surface};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${theme.colors.surfaceBorder};
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const FilterButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$hasFilters ? theme.colors.primary : theme.colors.textSecondary};
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;

  @media (max-width: ${theme.breakpoints.md}) {
    display: flex;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const FilterBadge = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: ${theme.colors.primary};
  border-radius: 50%;
`;

const ResultsCount = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  white-space: nowrap;

  @media (max-width: ${theme.breakpoints.sm}) {
    width: 100%;
    text-align: center;
    padding: ${theme.spacing.sm} 0;
  }
`;

/**
 * AdminSearch Component
 *
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Callback when value changes
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.resultsCount - Number of results (optional)
 * @param {string} props.resultsLabel - Label for results count
 * @param {boolean} props.hasFilters - Whether filters are active
 * @param {Function} props.onFilterClick - Callback for mobile filter button
 * @param {number} props.debounceMs - Debounce delay in milliseconds
 */
const AdminSearch = ({
  value,
  onChange,
  placeholder,
  resultsCount,
  resultsLabel,
  hasFilters = false,
  onFilterClick,
  debounceMs = 300,
  ...props
}) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced change handler
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  }, [onChange, debounceMs]);

  // Clear handler
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Keyboard handler
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && localValue) {
      e.preventDefault();
      handleClear();
    }
  }, [localValue, handleClear]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <SearchContainer {...props}>
      <SearchWrapper>
        <label htmlFor="admin-search">
          <VisuallyHidden>
            {placeholder || t('admin.search', 'Search')}
          </VisuallyHidden>
        </label>
        <SearchIcon>
          <FaSearch aria-hidden="true" />
        </SearchIcon>
        <SearchInput
          ref={inputRef}
          id="admin-search"
          type="search"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('admin.search', 'Search...')}
          $hasValue={!!localValue}
          aria-describedby={resultsCount !== undefined ? 'search-results' : undefined}
        />
        <AnimatePresence>
          {localValue && (
            <ClearButton
              onClick={handleClear}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              aria-label={t('admin.clearSearch', 'Clear search')}
              type="button"
            >
              <FaTimes aria-hidden="true" />
            </ClearButton>
          )}
        </AnimatePresence>
      </SearchWrapper>

      {/* Mobile filter button */}
      {onFilterClick && (
        <FilterButton
          onClick={onFilterClick}
          $hasFilters={hasFilters}
          aria-label={t('admin.filters', 'Filters')}
          aria-expanded={hasFilters}
          type="button"
        >
          <FaFilter aria-hidden="true" />
          {hasFilters && <FilterBadge aria-hidden="true" />}
        </FilterButton>
      )}

      {/* Results count */}
      {resultsCount !== undefined && (
        <ResultsCount id="search-results" aria-live="polite" aria-atomic="true">
          {resultsCount} {resultsLabel || t('admin.results', 'results')}
        </ResultsCount>
      )}
    </SearchContainer>
  );
};

AdminSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  resultsCount: PropTypes.number,
  resultsLabel: PropTypes.string,
  hasFilters: PropTypes.bool,
  onFilterClick: PropTypes.func,
  debounceMs: PropTypes.number,
};

export default React.memo(AdminSearch);
