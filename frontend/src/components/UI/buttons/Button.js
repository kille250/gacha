/**
 * Button - Base button component with variants
 *
 * Provides consistent button styling with multiple variants.
 * Use ActionButton for buttons that trigger async operations.
 */

import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../styles/DesignSystem';

const buttonVariants = {
  primary: css`
    background: ${theme.colors.primary};
    color: white;
    box-shadow: 0 4px 14px rgba(0, 113, 227, 0.4);

    &:hover:not(:disabled) {
      background: ${theme.colors.primaryHover};
      box-shadow: 0 6px 20px rgba(0, 113, 227, 0.5);
    }

    &:active:not(:disabled) {
      background: ${theme.colors.primaryActive};
    }
  `,
  secondary: css`
    background: ${theme.colors.glass};
    color: ${theme.colors.text};
    border: 1px solid ${theme.colors.surfaceBorder};

    &:hover:not(:disabled) {
      background: ${theme.colors.surfaceHover};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${theme.colors.primary};

    &:hover:not(:disabled) {
      background: rgba(0, 113, 227, 0.1);
    }
  `,
  danger: css`
    background: ${theme.colors.error};
    color: white;
    box-shadow: 0 4px 14px rgba(255, 59, 48, 0.4);

    &:hover:not(:disabled) {
      background: #ff453a;
      box-shadow: 0 6px 20px rgba(255, 59, 48, 0.5);
    }
  `,
  success: css`
    background: ${theme.colors.success};
    color: white;
    box-shadow: 0 4px 14px rgba(52, 199, 89, 0.4);

    &:hover:not(:disabled) {
      background: #30d158;
    }
  `
};

const buttonSizes = {
  sm: css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-size: ${theme.fontSizes.sm};
    border-radius: ${theme.radius.md};
  `,
  md: css`
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    font-size: ${theme.fontSizes.base};
    border-radius: ${theme.radius.full};
  `,
  lg: css`
    padding: ${theme.spacing.lg} ${theme.spacing.xl};
    font-size: ${theme.fontSizes.md};
    border-radius: ${theme.radius.full};
  `
};

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

  ${props => buttonVariants[props.$variant || 'primary']}
  ${props => buttonSizes[props.$size || 'md']}

  ${props => props.$fullWidth && css`
    width: 100%;
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
`;

/**
 * Button Component
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'success'} props.variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} props.size - Button size
 * @param {boolean} props.fullWidth - Whether button should fill container width
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  ...props
}, ref) => {
  return (
    <StyledButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled}
      whileHover={!disabled ? { translateY: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      {...props}
    >
      {children}
    </StyledButton>
  );
});

Button.displayName = 'Button';

export default Button;
