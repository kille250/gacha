/**
 * Button - Unified button component with variants
 *
 * This is the single source of truth for all button styles.
 * Replaces: PrimaryButton, SecondaryButton, GhostButton from DesignSystem.js
 *
 * Updated with:
 * - Improved spring physics for natural motion
 * - Softer shadows using new shadow system
 * - Better focus transitions
 * - Enhanced disabled states
 *
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="danger" size="sm" loading>Deleting...</Button>
 */

import React, { forwardRef, memo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { theme, springs } from '../tokens';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const buttonVariants = {
  primary: css`
    background: ${theme.colors.primary};
    color: white;
    box-shadow: ${theme.shadows.button};

    /* Only apply hover effects on devices that support hover */
    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.primaryHover};
        box-shadow: ${theme.shadows.buttonHover};
      }
    }

    &:active:not(:disabled) {
      background: ${theme.colors.primaryActive};
      box-shadow: ${theme.shadows.buttonPressed};
    }
  `,
  secondary: css`
    background: ${theme.colors.glass};
    color: ${theme.colors.text};
    border: 1px solid ${theme.colors.surfaceBorder};
    box-shadow: ${theme.shadows.xs};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.glassHover};
        border-color: ${theme.colors.glassBorder};
        box-shadow: ${theme.shadows.sm};
      }
    }

    &:active:not(:disabled) {
      background: ${theme.colors.glass};
      box-shadow: none;
    }
  `,
  ghost: css`
    background: transparent;
    color: ${theme.colors.primary};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.primarySubtle};
      }
    }

    &:active:not(:disabled) {
      background: ${theme.colors.primaryMuted};
    }
  `,
  danger: css`
    background: ${theme.colors.error};
    color: white;
    box-shadow: ${theme.shadows.button};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.errorHover};
        box-shadow: ${theme.shadows.buttonHover};
      }
    }

    &:active:not(:disabled) {
      box-shadow: ${theme.shadows.buttonPressed};
    }
  `,
  success: css`
    background: ${theme.colors.success};
    color: white;
    box-shadow: ${theme.shadows.button};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.successHover};
        box-shadow: ${theme.shadows.buttonHover};
      }
    }

    &:active:not(:disabled) {
      box-shadow: ${theme.shadows.buttonPressed};
    }
  `,
  warning: css`
    background: ${theme.colors.warning};
    color: white;
    box-shadow: ${theme.shadows.button};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.warningHover};
        box-shadow: ${theme.shadows.buttonHover};
      }
    }

    &:active:not(:disabled) {
      box-shadow: ${theme.shadows.buttonPressed};
    }
  `,
  accent: css`
    background: ${theme.colors.accent};
    color: white;
    box-shadow: ${theme.shadows.button};

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        background: ${theme.colors.accentHover};
        box-shadow: ${theme.shadows.buttonHover};
      }
    }

    &:active:not(:disabled) {
      box-shadow: ${theme.shadows.buttonPressed};
    }
  `
};

const buttonSizes = {
  xs: css`
    min-height: 32px;
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xs};
    border-radius: ${theme.radius.sm};
    gap: 6px;

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
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    font-size: ${theme.fontSizes.base};
    border-radius: ${theme.radius.lg};
  `,
  lg: css`
    min-height: 52px;
    padding: ${theme.spacing.md} ${theme.spacing.xl};
    font-size: ${theme.fontSizes.md};
    border-radius: ${theme.radius.xl};
  `,
  xl: css`
    min-height: 60px;
    padding: ${theme.spacing.lg} ${theme.spacing['2xl']};
    font-size: ${theme.fontSizes.lg};
    border-radius: ${theme.radius.xl};
  `
};

const LoadingSpinner = styled.span`
  width: ${props => props.$size === 'xs' ? '12px' : props.$size === 'sm' ? '14px' : '18px'};
  height: ${props => props.$size === 'xs' ? '12px' : props.$size === 'sm' ? '14px' : '18px'};
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const StyledButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  font-family: ${theme.fonts.primary};
  font-weight: ${theme.fontWeights.medium};
  line-height: ${theme.lineHeights.ui};
  letter-spacing: ${theme.letterSpacing.normal};
  border: none;
  cursor: pointer;
  transition:
    background-color ${theme.timing.fast} ${theme.easing.easeOut},
    box-shadow ${theme.timing.normal} ${theme.easing.easeOut},
    border-color ${theme.timing.fast} ${theme.easing.easeOut};
  text-decoration: none;
  white-space: nowrap;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  ${props => buttonVariants[props.$variant || 'primary']}
  ${props => buttonSizes[props.$size || 'md']}

  ${props => props.$fullWidth && css`
    width: 100%;
  `}

  ${props => props.$iconOnly && css`
    padding: 0;
    width: ${props.$size === 'xs' ? '32px' : props.$size === 'sm' ? '36px' : props.$size === 'lg' ? '52px' : props.$size === 'xl' ? '60px' : '44px'};
    border-radius: ${theme.radius.full};

    @media (pointer: coarse) {
      width: 44px;
      min-width: 44px;
    }
  `}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none;
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${theme.colors.background},
      0 0 0 4px ${theme.colors.focusRing};
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
  transition: opacity ${theme.timing.fast} ${theme.easing.easeOut};
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
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'accent'} variant - Button style
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl'} size - Button size
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
      whileHover={!isDisabled ? { y: -2 } : undefined}
      whileTap={!isDisabled ? { scale: 0.97, y: 0 } : undefined}
      transition={springs.snappy}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <LoadingWrapper>
          <LoadingSpinner $size={size} />
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
