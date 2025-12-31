/**
 * SearchFilters - Filter controls for Prompt Browser
 *
 * Text search input with debouncing, NSFW dropdown,
 * sort options, and period filter.
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaFilter, FaChevronDown } from 'react-icons/fa';
import { theme } from '../../design-system';
import {
  NSFW_OPTIONS,
  SORT_OPTIONS,
  PERIOD_OPTIONS,
  NSFW_LEVELS
} from '../../constants/civitai';
import { isAgeVerified } from '../../hooks/useCivitaiSearch';

// ===========================================
// STYLED COMPONENTS
// ===========================================

const FiltersContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SearchRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: stretch;

  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: ${theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.sm};
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  padding-left: ${theme.spacing.xl};
  padding-right: ${theme.spacing.xl};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
  transition: all 0.2s ease;

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primaryMuted};
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: ${theme.spacing.sm};
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMuted};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.text};
  }
`;

const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.text};
  }

  svg:last-child {
    transition: transform 0.2s ease;
    transform: rotate(${props => props.$expanded ? '180deg' : '0deg'});
  }
`;

const FilterCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 ${theme.spacing.xs};
  background: ${theme.colors.primary};
  border-radius: ${theme.radius.full};
  color: white;
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
`;

const FiltersPanel = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.backgroundSecondary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  min-width: 150px;

  @media (max-width: ${theme.breakpoints.sm}) {
    flex: 1;
    min-width: calc(50% - ${theme.spacing.sm});
  }
`;

const FilterLabel = styled.label`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SelectWrapper = styled.div`
  position: relative;
`;

const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  padding-right: ${theme.spacing.xl};
  background: ${theme.colors.backgroundTertiary};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  appearance: none;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  &:hover {
    border-color: ${theme.colors.textMuted};
  }
`;

const SelectIcon = styled(FaChevronDown)`
  position: absolute;
  right: ${theme.spacing.sm};
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.textMuted};
  font-size: ${theme.fontSizes.xs};
  pointer-events: none;
`;

const NsfwWarning = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.warningMuted};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.warning};
  font-size: ${theme.fontSizes.xs};
  margin-top: ${theme.spacing.xs};
`;

// ===========================================
// COMPONENT
// ===========================================

function SearchFilters({
  query,
  nsfw,
  sort,
  period,
  onQueryChange,
  onNsfwChange,
  onSortChange,
  onPeriodChange,
  onAgeGateRequired
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Count active filters (non-default values)
  const activeFilterCount = [
    nsfw !== NSFW_LEVELS.NONE,
    sort !== 'Most Reactions',
    period !== 'AllTime'
  ].filter(Boolean).length;

  const handleNsfwChange = useCallback((e) => {
    const newValue = e.target.value;

    // Check if this level requires age verification
    const option = NSFW_OPTIONS.find(opt => opt.value === newValue);
    if (option?.requiresAgeGate && !isAgeVerified()) {
      onAgeGateRequired?.(newValue);
      return;
    }

    onNsfwChange(newValue);
  }, [onNsfwChange, onAgeGateRequired]);

  const handleClearQuery = useCallback(() => {
    onQueryChange('');
  }, [onQueryChange]);

  return (
    <FiltersContainer>
      <SearchRow>
        <SearchInputWrapper>
          <SearchIcon />
          <SearchInput
            type="text"
            placeholder="Search prompts, styles, characters..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search prompts"
          />
          {query && (
            <ClearButton onClick={handleClearQuery} aria-label="Clear search">
              <FaTimes />
            </ClearButton>
          )}
        </SearchInputWrapper>

        <FilterToggle
          onClick={() => setShowFilters(!showFilters)}
          $expanded={showFilters}
          aria-expanded={showFilters}
          aria-controls="filters-panel"
        >
          <FaFilter />
          Filters
          {activeFilterCount > 0 && (
            <FilterCount>{activeFilterCount}</FilterCount>
          )}
          <FaChevronDown />
        </FilterToggle>
      </SearchRow>

      <AnimatePresence>
        {showFilters && (
          <FiltersPanel
            id="filters-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FilterGroup>
              <FilterLabel htmlFor="nsfw-select">Content Filter</FilterLabel>
              <SelectWrapper>
                <Select
                  id="nsfw-select"
                  value={nsfw}
                  onChange={handleNsfwChange}
                >
                  {NSFW_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <SelectIcon />
              </SelectWrapper>
              {(nsfw === NSFW_LEVELS.MATURE || nsfw === NSFW_LEVELS.X) && (
                <NsfwWarning>
                  Adult content enabled
                </NsfwWarning>
              )}
            </FilterGroup>

            <FilterGroup>
              <FilterLabel htmlFor="sort-select">Sort By</FilterLabel>
              <SelectWrapper>
                <Select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value)}
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <SelectIcon />
              </SelectWrapper>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel htmlFor="period-select">Time Period</FilterLabel>
              <SelectWrapper>
                <Select
                  id="period-select"
                  value={period}
                  onChange={(e) => onPeriodChange(e.target.value)}
                >
                  {PERIOD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <SelectIcon />
              </SelectWrapper>
            </FilterGroup>
          </FiltersPanel>
        )}
      </AnimatePresence>
    </FiltersContainer>
  );
}

SearchFilters.propTypes = {
  query: PropTypes.string.isRequired,
  nsfw: PropTypes.string.isRequired,
  sort: PropTypes.string.isRequired,
  period: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  onNsfwChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onPeriodChange: PropTypes.func.isRequired,
  onAgeGateRequired: PropTypes.func
};

export default SearchFilters;
