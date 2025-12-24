/**
 * Spinner - Loading indicator component
 *
 * Provides consistent loading spinners across the app.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../../styles/DesignSystem';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const SpinnerElement = styled.div`
  width: ${props => props.$size};
  height: ${props => props.$size};
  border: ${props => props.$thickness} solid ${props => props.$trackColor};
  border-top-color: ${props => props.$color};
  border-radius: 50%;
  animation: ${spin} ${props => props.$speed} linear infinite;
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
`;

const SpinnerLabel = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

/**
 * Spinner Component
 *
 * @param {Object} props
 * @param {string} props.size - Spinner size (default: '48px')
 * @param {string} props.color - Spinner color (default: primary)
 * @param {string} props.trackColor - Track color (default: surfaceBorder)
 * @param {string} props.thickness - Border thickness (default: '3px')
 * @param {string} props.speed - Animation duration (default: '0.8s')
 * @param {string} props.label - Optional label text below spinner
 */
const Spinner = ({
  size = '48px',
  color = theme.colors.primary,
  trackColor = theme.colors.surfaceBorder,
  thickness = '3px',
  speed = '0.8s',
  label,
  ...props
}) => {
  if (label) {
    return (
      <SpinnerContainer {...props}>
        <SpinnerElement
          $size={size}
          $color={color}
          $trackColor={trackColor}
          $thickness={thickness}
          $speed={speed}
          role="progressbar"
          aria-label={label}
        />
        <SpinnerLabel>{label}</SpinnerLabel>
      </SpinnerContainer>
    );
  }

  return (
    <SpinnerElement
      $size={size}
      $color={color}
      $trackColor={trackColor}
      $thickness={thickness}
      $speed={speed}
      role="progressbar"
      aria-label="Loading"
      {...props}
    />
  );
};

/**
 * InlineSpinner - Small spinner for inline use (buttons, etc.)
 */
export const InlineSpinner = styled.div`
  width: ${props => props.$size || '16px'};
  height: ${props => props.$size || '16px'};
  border: 2px solid ${props => props.$color ? `${props.$color}30` : 'rgba(255, 255, 255, 0.3)'};
  border-top-color: ${props => props.$color || 'currentColor'};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/**
 * PageLoader - Full page loading state
 */
const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${props => props.$fullScreen ? '100vh' : '200px'};
  gap: ${theme.spacing.md};
`;

export const PageLoader = ({ label = 'Loading...', fullScreen = false }) => (
  <LoaderContainer $fullScreen={fullScreen}>
    <Spinner size="48px" />
    <SpinnerLabel>{label}</SpinnerLabel>
  </LoaderContainer>
);

export default Spinner;
