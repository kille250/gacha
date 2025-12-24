/**
 * IconButton - Icon-only button component
 *
 * Use for toolbar actions, close buttons, etc.
 */

import React, { forwardRef, memo } from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../tokens';

const sizeStyles = {
  xs: css`
    width: 32px;
    height: 32px;
    font-size: 16px;

    @media (pointer: coarse) {
      width: 44px;
      height: 44px;
    }
  `,
  sm: css`
    width: 36px;
    height: 36px;
    font-size: 18px;

    @media (pointer: coarse) {
      width: 44px;
      height: 44px;
    }
  `,
  md: css`
    width: 44px;
    height: 44px;
    font-size: 20px;
  `,
  lg: css`
    width: 52px;
    height: 52px;
    font-size: 24px;
  `
};

const variantStyles = {
  default: css`
    background: ${theme.colors.glass};
    border: 1px solid ${theme.colors.surfaceBorder};
    color: ${theme.colors.text};

    &:hover:not(:disabled) {
      background: ${theme.colors.surfaceHover};
    }
  `,
  ghost: css`
    background: transparent;
    border: none;
    color: ${theme.colors.textSecondary};

    &:hover:not(:disabled) {
      background: ${theme.colors.glass};
      color: ${theme.colors.text};
    }
  `,
  primary: css`
    background: ${theme.colors.primary};
    border: none;
    color: white;

    &:hover:not(:disabled) {
      background: ${theme.colors.primaryHover};
    }
  `,
  danger: css`
    background: transparent;
    border: none;
    color: ${theme.colors.textSecondary};

    &:hover:not(:disabled) {
      background: rgba(255, 59, 48, 0.1);
      color: ${theme.colors.error};
    }
  `
};

const StyledIconButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: ${theme.radius.full};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  ${props => sizeStyles[props.$size || 'md']}
  ${props => variantStyles[props.$variant || 'default']}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * IconButton Component
 *
 * @param {'xs' | 'sm' | 'md' | 'lg'} size - Button size
 * @param {'default' | 'ghost' | 'primary' | 'danger'} variant - Button style
 * @param {string} label - Accessible label (required for a11y)
 * @param {React.ReactNode} children - Icon element
 */
const IconButton = memo(forwardRef(function IconButton({
  children,
  size = 'md',
  variant = 'default',
  label,
  disabled = false,
  type = 'button',
  ...props
}, ref) {
  return (
    <StyledIconButton
      ref={ref}
      type={type}
      $size={size}
      $variant={variant}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      aria-label={label}
      {...props}
    >
      {children}
    </StyledIconButton>
  );
}));

export default IconButton;
