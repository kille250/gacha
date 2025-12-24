/**
 * IconButton - Icon-only button with consistent sizing
 *
 * Use for buttons that contain only an icon (no text).
 * Ensures proper touch target size and accessibility.
 */

import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';

const sizeStyles = {
  sm: css`
    /* Minimum 44px for touch accessibility, visual 36px with padding */
    width: 44px;
    height: 44px;
    font-size: 16px;

    /* On devices with precise pointer (mouse), allow smaller */
    @media (hover: hover) and (pointer: fine) {
      width: 36px;
      height: 36px;
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
  flex-shrink: 0;

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

  svg {
    width: 1em;
    height: 1em;
  }
`;

/**
 * IconButton Component
 *
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg'} props.size - Button size (default: 'md')
 * @param {'default' | 'ghost' | 'primary'} props.variant - Button style variant
 * @param {string} props.label - Accessible label (required for icon-only buttons)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {React.ReactNode} props.children - Icon element
 */
const IconButton = forwardRef(({
  children,
  size = 'md',
  variant = 'default',
  label,
  disabled = false,
  type = 'button',
  ...props
}, ref) => {
  return (
    <StyledIconButton
      ref={ref}
      type={type}
      $size={size}
      $variant={variant}
      disabled={disabled}
      aria-label={label}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      {...props}
    >
      {children}
    </StyledIconButton>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
