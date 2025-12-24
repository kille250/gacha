/**
 * Stack - Vertical/horizontal stacking layout
 *
 * Simple flexbox-based layout for stacking elements.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../../styles/DesignSystem';

const StyledStack = styled.div`
  display: flex;
  gap: ${props => theme.spacing[props.$gap] || props.$gap || theme.spacing.md};

  ${props => props.$direction === 'column' ? css`
    flex-direction: column;
    align-items: ${props.$align || 'stretch'};
  ` : css`
    flex-direction: row;
    align-items: ${props.$align || 'center'};
    flex-wrap: ${props.$wrap ? 'wrap' : 'nowrap'};
  `}

  ${props => props.$justify && css`
    justify-content: ${props.$justify};
  `}

  ${props => props.$fullWidth && css`
    width: 100%;
  `}
`;

/**
 * Stack Component
 *
 * @param {Object} props
 * @param {'row' | 'column'} props.direction - Stack direction
 * @param {string} props.gap - Gap between items (theme key or custom)
 * @param {string} props.align - Cross-axis alignment
 * @param {string} props.justify - Main-axis alignment
 * @param {boolean} props.wrap - Allow wrapping (row only)
 * @param {boolean} props.fullWidth - Take full width
 * @param {React.ReactNode} props.children - Stack items
 */
const Stack = ({
  children,
  direction = 'column',
  gap = 'md',
  align,
  justify,
  wrap = false,
  fullWidth = false,
  as,
  ...props
}) => {
  return (
    <StyledStack
      as={as}
      $direction={direction}
      $gap={gap}
      $align={align}
      $justify={justify}
      $wrap={wrap}
      $fullWidth={fullWidth}
      {...props}
    >
      {children}
    </StyledStack>
  );
};

/**
 * HStack - Horizontal stack (convenience component)
 */
export const HStack = (props) => <Stack direction="row" {...props} />;

/**
 * VStack - Vertical stack (convenience component)
 */
export const VStack = (props) => <Stack direction="column" {...props} />;

/**
 * Cluster - Horizontal wrapping cluster
 */
const StyledCluster = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => theme.spacing[props.$gap] || props.$gap || theme.spacing.sm};
  align-items: ${props => props.$align || 'center'};
  justify-content: ${props => props.$justify || 'flex-start'};
`;

export const Cluster = ({
  children,
  gap = 'sm',
  align,
  justify,
  ...props
}) => (
  <StyledCluster
    $gap={gap}
    $align={align}
    $justify={justify}
    {...props}
  >
    {children}
  </StyledCluster>
);

export default Stack;
