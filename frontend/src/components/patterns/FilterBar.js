/**
 * FilterBar - Unified filter controls for lists and grids
 *
 * Provides search, filter toggles, and items-per-page controls.
 * Responsive design with collapsible filters on mobile.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import { theme } from '../../styles/DesignSystem';

const ControlsBar = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${theme.breakpoints.md}) {
    flex-direction: column;
  }
`;

const SearchWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  padding: 0 ${theme.spacing.md};
  min-width: 250px;

  &:focus-within {
    border-color: ${theme.colors.primary};
  }
`;

const SearchIcon = styled.span`
  color: ${theme.colors.textTertiary};
  margin-right: ${theme.spacing.sm};
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: ${theme.spacing.md} 0;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.text};
  min-height: 44px;

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:focus {
    outline: none;
  }
`;

const ClearSearch = styled.button`
  color: ${theme.colors.textTertiary};
  padding: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;

  &:hover {
    color: ${theme.colors.text};
  }
`;

const ControlsRight = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.$active ? 'rgba(88, 86, 214, 0.15)' : theme.colors.surface};
  border: 1px solid ${props => props.$active ? theme.colors.accent : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${props => props.$active ? theme.colors.accent : theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  position: relative;
  transition: all ${theme.transitions.fast};
  min-height: 44px;

  &:hover {
    background: ${theme.colors.surfaceHover};
  }
`;

const FilterBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: ${theme.colors.primary};
  border-radius: 50%;
`;

const ItemsSelect = styled.select`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  min-height: 44px;

  option {
    background: ${theme.colors.backgroundSecondary};
  }
`;

const FiltersPanel = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

const FilterGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

const FilterOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const FilterChip = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active
    ? props.$color ? `${props.$color}20` : 'rgba(88, 86, 214, 0.15)'
    : theme.colors.glass};
  border: 1px solid ${props => props.$active
    ? props.$color || theme.colors.accent
    : theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  color: ${props => props.$active
    ? props.$color || theme.colors.accent
    : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  text-transform: capitalize;
  transition: all ${theme.transitions.fast};
  min-height: 36px;

  &:hover {
    background: ${props => props.$color ? `${props.$color}30` : 'rgba(88, 86, 214, 0.2)'};
    border-color: ${props => props.$color || theme.colors.accent};
  }

  @media (hover: none) {
    min-height: 44px;
  }
`;

const ClearFiltersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.full};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  min-height: 36px;

  &:hover {
    background: rgba(255, 59, 48, 0.2);
  }

  @media (hover: none) {
    min-height: 44px;
  }
`;

/**
 * FilterBar Component
 *
 * @param {Object} props
 * @param {string} props.searchValue - Current search value
 * @param {Function} props.onSearchChange - Search change handler
 * @param {string} props.searchPlaceholder - Search placeholder text
 * @param {Array} props.filterGroups - Array of filter group configs
 * @param {boolean} props.hasActiveFilters - Whether any filters are active
 * @param {Function} props.onClearFilters - Clear all filters handler
 * @param {number} props.itemsPerPage - Current items per page
 * @param {Function} props.onItemsPerPageChange - Items per page change handler
 * @param {Array} props.itemsPerPageOptions - Available items per page options
 * @param {string} props.filterLabel - Label for filter toggle
 * @param {string} props.clearLabel - Label for clear filters button
 */
const FilterBar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterGroups = [],
  hasActiveFilters = false,
  onClearFilters,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [24, 48, 96],
  filterLabel = 'Filters',
  clearLabel = 'Clear Filters',
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = useCallback((e) => {
    onSearchChange?.(e.target.value);
  }, [onSearchChange]);

  const clearSearch = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  return (
    <>
      <ControlsBar>
        <SearchWrapper>
          <SearchIcon><FaSearch /></SearchIcon>
          <SearchInput
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
            aria-label={searchPlaceholder}
          />
          {searchValue && (
            <ClearSearch onClick={clearSearch} aria-label="Clear search">
              <FaTimes />
            </ClearSearch>
          )}
        </SearchWrapper>

        <ControlsRight>
          {filterGroups.length > 0 && (
            <FilterToggle
              onClick={() => setShowFilters(!showFilters)}
              $active={showFilters || hasActiveFilters}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
            >
              <FaFilter />
              <span>{filterLabel}</span>
              {hasActiveFilters && <FilterBadge />}
            </FilterToggle>
          )}

          {onItemsPerPageChange && (
            <ItemsSelect
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              aria-label="Items per page"
            >
              {itemsPerPageOptions.map(count => (
                <option key={count} value={count}>{count} per page</option>
              ))}
            </ItemsSelect>
          )}
        </ControlsRight>
      </ControlsBar>

      <AnimatePresence>
        {showFilters && filterGroups.length > 0 && (
          <FiltersPanel
            id="filter-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {filterGroups.map((group) => (
              <FilterGroup key={group.id}>
                <FilterLabel>{group.label}</FilterLabel>
                <FilterOptions>
                  {group.options.map((option) => (
                    <FilterChip
                      key={option.value}
                      $active={group.value === option.value}
                      $color={option.color}
                      onClick={() => group.onChange(option.value)}
                      aria-pressed={group.value === option.value}
                    >
                      {option.label}
                    </FilterChip>
                  ))}
                </FilterOptions>
              </FilterGroup>
            ))}

            {hasActiveFilters && onClearFilters && (
              <ClearFiltersBtn onClick={onClearFilters}>
                <FaTimes /> {clearLabel}
              </ClearFiltersBtn>
            )}
          </FiltersPanel>
        )}
      </AnimatePresence>
    </>
  );
};

export default FilterBar;
