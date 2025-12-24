/**
 * Badge - Small status indicator component
 *
 * Use for status labels, counts, and category indicators.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../../styles/DesignSystem';

const variantStyles = {
  default: css`
    background: ${theme.colors.glass};
    border: 1px solid ${theme.colors.surfaceBorder};
    color: ${theme.colors.textSecondary};
  `,
  primary: css`
    background: rgba(0, 113, 227, 0.15);
    border: 1px solid rgba(0, 113, 227, 0.3);
    color: ${theme.colors.primary};
  `,
  success: css`
    background: rgba(52, 199, 89, 0.15);
    border: 1px solid rgba(52, 199, 89, 0.3);
    color: ${theme.colors.success};
  `,
  warning: css`
    background: rgba(255, 159, 10, 0.15);
    border: 1px solid rgba(255, 159, 10, 0.3);
    color: ${theme.colors.warning};
  `,
  error: css`
    background: rgba(255, 59, 48, 0.15);
    border: 1px solid rgba(255, 59, 48, 0.3);
    color: ${theme.colors.error};
  `,
  info: css`
    background: rgba(90, 200, 250, 0.15);
    border: 1px solid rgba(90, 200, 250, 0.3);
    color: ${theme.colors.info};
  `
};

const sizeStyles = {
  sm: css`
    padding: 2px 6px;
    font-size: ${theme.fontSizes.xs};
  `,
  md: css`
    padding: 4px 10px;
    font-size: ${theme.fontSizes.sm};
  `,
  lg: css`
    padding: 6px 14px;
    font-size: ${theme.fontSizes.base};
  `
};

const StyledBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: ${theme.radius.full};
  font-weight: ${theme.fontWeights.medium};
  white-space: nowrap;

  ${props => variantStyles[props.$variant || 'default']}
  ${props => sizeStyles[props.$size || 'md']}

  ${props => props.$glow && css`
    box-shadow: 0 0 12px currentColor;
  `}
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
`;

/**
 * Badge Component
 *
 * @param {Object} props
 * @param {'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'} props.variant
 * @param {'sm' | 'md' | 'lg'} props.size
 * @param {boolean} props.dot - Show dot indicator
 * @param {boolean} props.glow - Add glow effect
 * @param {React.ReactNode} props.children - Badge content
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  glow = false,
  ...props
}) => {
  return (
    <StyledBadge
      $variant={variant}
      $size={size}
      $glow={glow}
      {...props}
    >
      {dot && <Dot />}
      {children}
    </StyledBadge>
  );
};

/**
 * RarityBadge - Badge with rarity-based coloring
 */
const RarityBadgeStyled = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => props.$color || theme.colors.textSecondary};
  color: white;
  box-shadow: 0 2px 8px ${props => props.$color || theme.colors.textSecondary}60;
`;

export const RarityBadge = ({ rarity, color, children, ...props }) => (
  <RarityBadgeStyled $color={color} {...props}>
    {children || rarity}
  </RarityBadgeStyled>
);

export default Badge;
