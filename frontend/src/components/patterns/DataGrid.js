/**
 * DataGrid - Grid layout with built-in loading, empty, and error states
 *
 * Provides a consistent grid display that handles:
 * - Loading state with skeleton placeholders
 * - Empty state with configurable message and action
 * - Error state with retry option
 * - Responsive grid layout
 * - Staggered entrance animations
 *
 * Use this for any grid of items to ensure consistent UX.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { theme, motionVariants } from '../../design-system';
import { EmptyState, ErrorState } from '../UI/feedback';
import { SkeletonGrid } from './SkeletonCard';
import { ICON_EMPTY } from '../../constants/icons';

const GridContainer = styled(motion.div)`
  display: grid;
  gap: ${props => theme.spacing[props.$gap] || props.$gap || theme.spacing.lg};
  grid-template-columns: repeat(${props => props.$columns || 2}, 1fr);

  @media (min-width: ${theme.breakpoints.sm}) {
    grid-template-columns: repeat(${props => props.$columnsSm || props.$columns || 3}, 1fr);
  }

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(${props => props.$columnsMd || props.$columnsSm || 4}, 1fr);
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: repeat(${props => props.$columnsLg || props.$columnsMd || 5}, 1fr);
  }

  @media (min-width: ${theme.breakpoints.xl}) {
    grid-template-columns: repeat(${props => props.$columnsXl || props.$columnsLg || 6}, 1fr);
  }
`;

const AutoGridContainer = styled(motion.div)`
  display: grid;
  gap: ${props => theme.spacing[props.$gap] || props.$gap || theme.spacing.lg};
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(${props => props.$minWidth || '200px'}, 100%), 1fr)
  );
`;

const ResultsInfo = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.md};
`;

/**
 * DataGrid Component
 *
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderItem - Function to render each item
 * @param {Function} props.keyExtractor - Function to extract unique key from item
 * @param {boolean} props.isLoading - Whether data is loading
 * @param {string} props.error - Error message if any
 * @param {Function} props.onRetry - Retry callback for error state
 * @param {Object} props.emptyState - Empty state configuration
 * @param {string} props.emptyState.icon - Icon for empty state
 * @param {string} props.emptyState.title - Title for empty state
 * @param {string} props.emptyState.description - Description for empty state
 * @param {string} props.emptyState.actionLabel - Action button label
 * @param {Function} props.emptyState.onAction - Action button callback
 * @param {number} props.columns - Base number of columns (default: 2)
 * @param {number} props.columnsSm - Columns at sm breakpoint
 * @param {number} props.columnsMd - Columns at md breakpoint
 * @param {number} props.columnsLg - Columns at lg breakpoint
 * @param {number} props.columnsXl - Columns at xl breakpoint
 * @param {string} props.minWidth - Min item width for auto grid (e.g., '200px')
 * @param {string} props.gap - Gap between items (theme key or custom)
 * @param {boolean} props.autoGrid - Use auto-fit grid instead of fixed columns
 * @param {number} props.skeletonCount - Number of skeleton items to show while loading
 * @param {boolean} props.showResultsInfo - Whether to show results count
 * @param {number} props.totalCount - Total count for results info
 * @param {string} props.itemLabel - Label for items (e.g., 'characters')
 * @param {boolean} props.animate - Whether to animate items
 */
const DataGrid = ({
  items = [],
  renderItem,
  keyExtractor = (item, index) => item.id || index,
  isLoading = false,
  error,
  onRetry,
  emptyState = {},
  columns = 2,
  columnsSm,
  columnsMd,
  columnsLg,
  columnsXl,
  minWidth = '200px',
  gap = 'lg',
  autoGrid = false,
  skeletonCount = 12,
  showResultsInfo = false,
  totalCount,
  itemLabel = 'items',
  animate = true,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <SkeletonGrid count={skeletonCount} />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load"
        message={error}
        onRetry={onRetry}
      />
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyState.icon || ICON_EMPTY}
        title={emptyState.title || 'No items found'}
        description={emptyState.description}
        actionLabel={emptyState.actionLabel}
        onAction={emptyState.onAction}
      />
    );
  }

  const Grid = autoGrid ? AutoGridContainer : GridContainer;
  const gridProps = autoGrid
    ? { $minWidth: minWidth, $gap: gap }
    : {
        $columns: columns,
        $columnsSm: columnsSm,
        $columnsMd: columnsMd,
        $columnsLg: columnsLg,
        $columnsXl: columnsXl,
        $gap: gap,
      };

  return (
    <>
      {showResultsInfo && (
        <ResultsInfo>
          Showing {items.length} {totalCount && `of ${totalCount}`} {itemLabel}
        </ResultsInfo>
      )}
      <Grid
        {...gridProps}
        variants={animate ? motionVariants.staggerContainer : undefined}
        initial={animate ? "hidden" : false}
        animate={animate ? "visible" : false}
      >
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item, index)}
            variants={animate ? motionVariants.staggerItem : undefined}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </Grid>
    </>
  );
};

export default DataGrid;
