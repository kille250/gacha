/**
 * Grid - Responsive grid layout primitives
 */

import styled from 'styled-components';
import { theme } from '../tokens';

/**
 * Grid - Basic responsive grid
 *
 * @prop {number} columns - Number of columns (default: 1)
 * @prop {number} columnsMd - Columns at md breakpoint
 * @prop {number} columnsLg - Columns at lg breakpoint
 * @prop {string} gap - Gap between items
 */
export const Grid = styled.div`
  display: grid;
  gap: ${props => props.gap || theme.spacing.lg};
  grid-template-columns: repeat(${props => props.columns || 1}, 1fr);

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(${props => props.columnsMd || props.columns || 2}, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(${props => props.columnsLg || props.columnsMd || props.columns || 3}, 1fr);
  }
`;

/**
 * AutoGrid - Responsive auto-fit grid
 *
 * Automatically adjusts columns based on available space.
 * @prop {string} minWidth - Minimum item width (default: 280px)
 * @prop {string} gap - Gap between items
 */
export const AutoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(${props => props.minWidth || '280px'}, 100%), 1fr)
  );
  gap: ${props => props.gap || theme.spacing.lg};
`;

export default Grid;
