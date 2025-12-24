/**
 * Spinner - Loading spinner component
 *
 * Use for inline loading states and buttons.
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../tokens';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const StyledSpinner = styled.div`
  width: ${props => props.$size || '48px'};
  height: ${props => props.$size || '48px'};
  border: ${props => props.$thickness || '3px'} solid ${props => props.$trackColor || theme.colors.surfaceBorder};
  border-top-color: ${props => props.$color || theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} ${props => props.$speed || '0.8s'} linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.5s;
  }
`;

const InlineSpinner = styled.span`
  display: inline-block;
  width: ${props => props.$size || '20px'};
  height: ${props => props.$size || '20px'};
  border: 2px solid ${props => props.$trackColor || 'rgba(255, 255, 255, 0.3)'};
  border-top-color: ${props => props.$color || 'white'};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.5s;
  }
`;

/**
 * Spinner Component
 *
 * @param {string} size - Spinner size (default: '48px')
 * @param {string} color - Spinner color (default: primary)
 * @param {string} trackColor - Track color
 * @param {string} thickness - Border thickness
 * @param {boolean} inline - Use inline variant for buttons
 */
const Spinner = memo(({
  size,
  color,
  trackColor,
  thickness,
  speed,
  inline = false,
  ...props
}) => {
  if (inline) {
    return (
      <InlineSpinner
        $size={size}
        $color={color}
        $trackColor={trackColor}
        role="status"
        aria-label="Loading"
        {...props}
      />
    );
  }

  return (
    <StyledSpinner
      $size={size}
      $color={color}
      $trackColor={trackColor}
      $thickness={thickness}
      $speed={speed}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
});

Spinner.displayName = 'Spinner';

export default Spinner;
