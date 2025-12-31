/**
 * Spinner - Premium loading indicator components
 *
 * Provides consistent, visually refined loading spinners across the app.
 *
 * Features:
 * - Standard spinner for general use
 * - Premium spinner with glow effect
 * - Pulsing logo variant
 * - Reduced motion support
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../../design-system';
import { IconSparkleSymbol } from '../../../constants/icons';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Orbital animation for premium spinner
const orbit = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const SpinnerElement = styled.div`
  width: ${props => props.$size};
  height: ${props => props.$size};
  border: ${props => props.$thickness} solid ${props => props.$trackColor};
  border-top-color: ${props => props.$color};
  border-radius: 50%;
  animation: ${spin} ${props => props.$speed} linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: ${pulse} 2s ease-in-out infinite;
    border-top-color: ${props => props.$trackColor};
    background: ${props => props.$color};
    opacity: 0.6;
  }
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

/**
 * PremiumSpinner - Enhanced spinner with orbital effect and glow
 *
 * Used for important loading states where visual polish matters.
 */
const PremiumSpinnerWrapper = styled.div`
  position: relative;
  width: ${props => props.$size || '56px'};
  height: ${props => props.$size || '56px'};
`;

const PremiumOuter = styled.div`
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: ${theme.colors.primary};
  border-radius: 50%;
  animation: ${orbit} 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;

  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: ${theme.colors.primary};
    border-radius: 50%;
    box-shadow: 0 0 12px ${theme.colors.primary}, 0 0 24px ${theme.colors.primary}60;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-top-color: transparent;
    border-color: ${theme.colors.primary}40;

    &::after {
      display: none;
    }
  }
`;

const PremiumInner = styled.div`
  position: absolute;
  inset: 8px;
  border: 2px solid transparent;
  border-bottom-color: ${theme.colors.accent};
  border-radius: 50%;
  animation: ${orbit} 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-bottom-color: transparent;
    border-color: ${theme.colors.accent}40;
  }
`;

const PremiumCenter = styled.div`
  position: absolute;
  inset: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  animation: ${pulse} 2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.8;
  }
`;

export const PremiumSpinner = ({ size = '56px', icon, ...props }) => (
  <PremiumSpinnerWrapper $size={size} {...props}>
    <PremiumOuter />
    <PremiumInner />
    {icon && <PremiumCenter>{icon}</PremiumCenter>}
  </PremiumSpinnerWrapper>
);

/**
 * LogoSpinner - Pulsing logo loader for full-page states
 */
const LogoSpinnerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
`;

const LogoPulse = styled.div`
  font-size: 48px;
  animation: ${pulse} 1.5s ease-in-out infinite;
  filter: drop-shadow(0 0 20px ${theme.colors.primary}40);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.8;
  }
`;

const LoadingBar = styled.div`
  width: 120px;
  height: 3px;
  background: ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent});
    border-radius: inherit;
    animation: ${shimmer} 1.2s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
      width: 100%;
      opacity: 0.5;
    }
  }
`;

export const LogoSpinner = ({ icon = <IconSparkleSymbol size={48} />, label }) => (
  <LogoSpinnerWrapper>
    <LogoPulse>{icon}</LogoPulse>
    <LoadingBar />
    {label && <SpinnerLabel>{label}</SpinnerLabel>}
  </LogoSpinnerWrapper>
);

export default Spinner;
