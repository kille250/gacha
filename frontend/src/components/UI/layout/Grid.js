/**
 * Grid - Responsive grid layout component
 *
 * Provides flexible grid layouts with responsive column counts.
 */

import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../design-system';

const StyledGrid = styled.div`
  display: grid;
  gap: ${props => props.$gap || theme.spacing.lg};

  /* Default: 1 column on mobile */
  grid-template-columns: repeat(${props => props.$cols || 1}, 1fr);

  /* Small screens */
  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(${props => props.$colsSm || props.$cols || 2}, 1fr);
  }

  /* Medium screens */
  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(${props => props.$colsMd || props.$colsSm || props.$cols || 3}, 1fr);
  }

  /* Large screens */
  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(${props => props.$colsLg || props.$colsMd || props.$colsSm || props.$cols || 4}, 1fr);
  }
`;

/**
 * AutoGrid - Grid with automatic column sizing
 */
const StyledAutoGrid = styled.div`
  display: grid;
  gap: ${props => props.$gap || theme.spacing.lg};
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(${props => props.$minWidth || '280px'}, 100%), 1fr)
  );
`;

/**
 * Grid Component
 *
 * @param {Object} props
 * @param {number} props.cols - Default column count
 * @param {number} props.colsSm - Columns at sm breakpoint
 * @param {number} props.colsMd - Columns at md breakpoint
 * @param {number} props.colsLg - Columns at lg breakpoint
 * @param {string} props.gap - Gap between items
 * @param {React.ReactNode} props.children - Grid items
 */
const Grid = ({
  children,
  cols = 1,
  colsSm,
  colsMd,
  colsLg,
  gap,
  ...props
}) => {
  return (
    <StyledGrid
      $cols={cols}
      $colsSm={colsSm}
      $colsMd={colsMd}
      $colsLg={colsLg}
      $gap={gap}
      {...props}
    >
      {children}
    </StyledGrid>
  );
};

/**
 * AutoGrid Component
 *
 * @param {Object} props
 * @param {string} props.minWidth - Minimum item width
 * @param {string} props.gap - Gap between items
 * @param {React.ReactNode} props.children - Grid items
 */
export const AutoGrid = ({
  children,
  minWidth = '280px',
  gap,
  ...props
}) => {
  return (
    <StyledAutoGrid
      $minWidth={minWidth}
      $gap={gap}
      {...props}
    >
      {children}
    </StyledAutoGrid>
  );
};

export default Grid;
