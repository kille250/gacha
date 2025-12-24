/**
 * Container - Content width container with responsive padding
 *
 * Centers content and provides consistent max-width and padding.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../../design-system';

const sizeStyles = {
  sm: css`
    max-width: 640px;
  `,
  md: css`
    max-width: 768px;
  `,
  lg: css`
    max-width: 1024px;
  `,
  xl: css`
    max-width: 1280px;
  `,
  '2xl': css`
    max-width: 1400px;
  `,
  full: css`
    max-width: 100%;
  `
};

const StyledContainer = styled.div`
  width: 100%;
  margin: 0 auto;
  padding: 0 ${theme.spacing.md};

  ${props => sizeStyles[props.$size || '2xl']}

  ${props => props.$noPadding && css`
    padding: 0;
  `}

  @media (min-width: ${theme.breakpoints.lg}) {
    padding: ${props => props.$noPadding ? '0' : `0 ${theme.spacing.xl}`};
  }
`;

/**
 * Container Component
 *
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'} props.size - Max width size
 * @param {boolean} props.noPadding - Remove horizontal padding
 * @param {React.ReactNode} props.children - Container content
 */
const Container = ({
  children,
  size = '2xl',
  noPadding = false,
  as,
  ...props
}) => {
  return (
    <StyledContainer
      as={as}
      $size={size}
      $noPadding={noPadding}
      {...props}
    >
      {children}
    </StyledContainer>
  );
};

export default Container;
