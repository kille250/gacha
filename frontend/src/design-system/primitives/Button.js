/**
 * Button - Unified button component with variants
 *
 * This is the single source of truth for all button styles.
 * Replaces: PrimaryButton, SecondaryButton, GhostButton from DesignSystem.js
 *
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="danger" size="sm" loading>Deleting...</Button>
 */

import React, { forwardRef, memo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../tokens';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const buttonVariants = {
  primary: css`
    background: ${theme.colors.primary};
    color: white;
    box-shadow: 0 4px 14px rgba(0, 113, 227, 0.4);

    /* Only apply hover effects on devices that support hover */
    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.primaryHover};
        box-shadow: 0 6px 20px rgba(0, 113, 227, 0.5);
      }
    }

    &:active:not(:disabled) {
      background: ${theme.colors.primaryActive};
    }
  `,
  secondary: css`
    background: ${theme.colors.glass};
    color: ${theme.colors.text};
    border: 1px solid ${theme.colors.surfaceBorder};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.surfaceHover};
      }
    }
  `,
  ghost: css`
    background: transparent;
    color: ${theme.colors.primary};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: rgba(0, 113, 227, 0.1);
      }
    }
  `,
  danger: css`
    background: ${theme.colors.error};
    color: white;
    box-shadow: 0 4px 14px rgba(255, 59, 48, 0.4);

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: #ff453a;
        box-shadow: 0 6px 20px rgba(255, 59, 48, 0.5);
      }
    }
  `,
  success: css`
    background: ${theme.colors.success};
    color: white;
    box-shadow: 0 4px 14px rgba(52, 199, 89, 0.4);

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: #30d158;
      }
    }
  `,
  warning: css`
    background: ${theme.colors.warning};
    color: white;
    box-shadow: 0 4px 14px rgba(255, 159, 10, 0.4);

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: #ffb340;
      }
    }
  `
};

const buttonSizes = {
  xs: css`
    min-height: 32px;
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};
    border-radius: ${theme.radius.sm};

    @media (pointer: coarse) {
      min-height: 44px;
    }
  `,
  sm: css`
    min-height: 36px;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-size: ${theme.fontSizes.sm};
    border-radius: ${theme.radius.md};

    @media (pointer: coarse) {
      min-height: 44px;
    }
  `,
  md: css`
    min-height: 44px;
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    font-size: ${theme.fontSizes.base};
    border-radius: ${theme.radius.full};
  `,
  lg: css`
    min-height: 52px;
    padding: ${theme.spacing.lg} ${theme.spacing.xl};
    font-size: ${theme.fontSizes.md};
    border-radius: ${theme.radius.full};
  `
};

const LoadingSpinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const StyledButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  font-family: ${theme.fonts.primary};
  font-weight: ${theme.fontWeights.semibold};
  border: none;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  text-decoration: none;
  white-space: nowrap;
  position: relative;

  ${props => buttonVariants[props.$variant || 'primary']}
  ${props => buttonSizes[props.$size || 'md']}

  ${props => props.$fullWidth && css`
    width: 100%;
  `}

  ${props => props.$iconOnly && css`
    padding: 0;
    width: ${props.$size === 'sm' ? '36px' : props.$size === 'lg' ? '52px' : '44px'};
    border-radius: ${theme.radius.full};

    @media (pointer: coarse) {
      width: 44px;
      min-width: 44px;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ButtonContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  opacity: ${props => props.$loading ? 0 : 1};
`;

const LoadingWrapper = styled.span`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Button Component
 *
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'} variant - Button style
 * @param {'xs' | 'sm' | 'md' | 'lg'} size - Button size
 * @param {boolean} fullWidth - Fill container width
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} iconOnly - Icon-only button (square)
 * @param {React.ReactNode} leftIcon - Icon before text
 * @param {React.ReactNode} rightIcon - Icon after text
 * @param {React.ReactNode} children - Button content
 */
const Button = memo(forwardRef(function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  iconOnly = false,
  leftIcon,
  rightIcon,
  disabled = false,
  type = 'button',
  ...props
}, ref) {
  const isDisabled = disabled || loading;

  return (
    <StyledButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $iconOnly={iconOnly}
      disabled={isDisabled}
      whileHover={!isDisabled ? { translateY: -1 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <LoadingWrapper>
          <LoadingSpinner />
        </LoadingWrapper>
      )}
      <ButtonContent $loading={loading}>
        {leftIcon}
        {children}
        {rightIcon}
      </ButtonContent>
    </StyledButton>
  );
}));

// displayName is set by the named function in forwardRef

export default Button;
