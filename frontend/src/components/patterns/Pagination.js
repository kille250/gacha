/**
 * Pagination - Page navigation controls
 *
 * Provides previous/next navigation and page info display.
 * Touch-friendly with proper minimum tap target sizes.
 */

import React from 'react';
import styled from 'styled-components';
import { theme } from '../../design-system';

const PaginationContainer = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: all ${theme.transitions.fast};
  min-height: 44px;
  min-width: 44px;

  &:hover:not(:disabled) {
    background: ${theme.colors.surfaceHover};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  min-width: 120px;
  text-align: center;
`;

/**
 * Pagination Component
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current page number (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Page change handler
 * @param {string} props.previousLabel - Label for previous button
 * @param {string} props.nextLabel - Label for next button
 * @param {string} props.pageLabel - Label template for page info (use {current} and {total})
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pageLabel = 'Page {current} of {total}',
}) => {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageInfoText = pageLabel
    .replace('{current}', currentPage)
    .replace('{total}', totalPages);

  return (
    <PaginationContainer aria-label="Pagination">
      <PageButton
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label={previousLabel}
      >
        {previousLabel}
      </PageButton>
      <PageInfo aria-current="page">{pageInfoText}</PageInfo>
      <PageButton
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label={nextLabel}
      >
        {nextLabel}
      </PageButton>
    </PaginationContainer>
  );
};

export default Pagination;
