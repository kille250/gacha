/**
 * Filter and Tab Styled Components
 *
 * Filter bars, tabs, and selection components.
 */

import styled from 'styled-components';
import { theme } from '../../../design-system';

/**
 * Horizontal filter bar container
 */
export const FilterBar = styled.div`
  display: flex;
  gap: ${props => props.$gap || theme.spacing.sm};
  margin-bottom: ${props => props.$spacing || theme.spacing.md};
  flex-wrap: ${props => props.$wrap ? 'wrap' : 'nowrap'};
  overflow-x: ${props => props.$scrollable ? 'auto' : 'visible'};
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

/**
 * Individual filter button
 */
export const FilterButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.$active
    ? props.$activeBackground || 'rgba(168, 85, 247, 0.2)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active
    ? props.$activeBorderColor || 'rgba(168, 85, 247, 0.4)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.md};
  color: ${props => props.$active
    ? props.$activeColor || '#A855F7'
    : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${props => props.$active ? theme.fontWeights.semibold : theme.fontWeights.normal};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.$active
      ? props.$activeBackground || 'rgba(168, 85, 247, 0.25)'
      : 'rgba(255, 255, 255, 0.1)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * Tab container
 */
export const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: ${props => props.$spacing || theme.spacing.lg};
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

/**
 * Individual tab
 */
export const Tab = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#A855F7' : 'transparent'};
  color: ${props => props.$active ? theme.colors.text : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${props => props.$active ? theme.fontWeights.semibold : theme.fontWeights.normal};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;

  &:hover {
    color: ${theme.colors.text};
    background: rgba(255, 255, 255, 0.05);
  }

  ${props => props.$hasNotification && `
    &::after {
      content: '';
      position: absolute;
      top: ${theme.spacing.sm};
      right: ${theme.spacing.sm};
      width: 6px;
      height: 6px;
      background: #EF4444;
      border-radius: 50%;
    }
  `}
`;

/**
 * Pill-style tabs (for compact spaces)
 */
export const PillTabContainer = styled.div`
  display: inline-flex;
  padding: 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.md};
  gap: 2px;
`;

/**
 * Pill tab
 */
export const PillTab = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.3)' : 'transparent'};
  border: none;
  border-radius: ${theme.radius.sm};
  color: ${props => props.$active ? theme.colors.text : theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${props => props.$active ? theme.fontWeights.semibold : theme.fontWeights.normal};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$active
      ? 'rgba(168, 85, 247, 0.35)'
      : 'rgba(255, 255, 255, 0.1)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * Sort/Order dropdown wrapper
 */
export const SortWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

/**
 * Sort select dropdown
 */
export const SortSelect = styled.select`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: rgba(168, 85, 247, 0.5);
  }

  option {
    background: ${theme.colors.background};
  }
`;

/**
 * Search input for filtering
 */
export const SearchInput = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  width: ${props => props.$width || '200px'};
  transition: all 0.2s ease;

  &::placeholder {
    color: ${theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: rgba(168, 85, 247, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

/**
 * Toggle switch wrapper
 */
export const ToggleWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  cursor: pointer;
`;

/**
 * Toggle switch track
 */
export const ToggleTrack = styled.div`
  position: relative;
  width: 40px;
  height: 22px;
  background: ${props => props.$checked ? '#A855F7' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 11px;
  transition: background 0.2s ease;
`;

/**
 * Toggle switch knob
 */
export const ToggleKnob = styled.div`
  position: absolute;
  top: 2px;
  left: ${props => props.$checked ? '20px' : '2px'};
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: left 0.2s ease;
`;
