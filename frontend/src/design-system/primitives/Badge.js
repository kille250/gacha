/**
 * Badge - Tag/badge component
 *
 * Use for labels, statuses, counts, and rarity indicators.
 */

import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../tokens';

const badgeVariants = {
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
  // Rarity variants
  common: css`
    background: ${theme.colors.rarity.common};
    border: none;
    color: white;
    box-shadow: 0 2px 8px ${theme.colors.rarity.common}60;
  `,
  uncommon: css`
    background: ${theme.colors.rarity.uncommon};
    border: none;
    color: white;
    box-shadow: 0 2px 8px ${theme.colors.rarity.uncommon}60;
  `,
  rare: css`
    background: ${theme.colors.rarity.rare};
    border: none;
    color: white;
    box-shadow: 0 2px 8px ${theme.colors.rarity.rare}60;
  `,
  epic: css`
    background: ${theme.colors.rarity.epic};
    border: none;
    color: white;
    box-shadow: 0 2px 8px ${theme.colors.rarity.epic}60;
  `,
  legendary: css`
    background: ${theme.colors.rarity.legendary};
    border: none;
    color: white;
    box-shadow: 0 2px 8px ${theme.colors.rarity.legendary}60;
  `
};

const badgeSizes = {
  xs: css`
    padding: 2px 6px;
    font-size: 10px;
  `,
  sm: css`
    padding: 4px 8px;
    font-size: ${theme.fontSizes.xs};
  `,
  md: css`
    padding: 4px 12px;
    font-size: ${theme.fontSizes.sm};
  `,
  lg: css`
    padding: 6px 16px;
    font-size: ${theme.fontSizes.base};
  `
};

const StyledBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: ${theme.radius.full};
  font-weight: ${theme.fontWeights.medium};
  text-transform: ${props => props.$uppercase ? 'uppercase' : 'none'};
  letter-spacing: ${props => props.$uppercase ? '0.5px' : 'normal'};
  white-space: nowrap;

  ${props => badgeVariants[props.$variant || 'default']}
  ${props => badgeSizes[props.$size || 'md']}

  ${props => props.$dot && css`
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  `}
`;

/**
 * Badge Component
 *
 * @param {'default' | 'primary' | 'success' | 'warning' | 'error' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'} variant
 * @param {'xs' | 'sm' | 'md' | 'lg'} size
 * @param {boolean} dot - Show status dot
 * @param {boolean} uppercase - Uppercase text
 */
const Badge = memo(({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  uppercase = false,
  ...props
}) => {
  return (
    <StyledBadge
      $variant={variant}
      $size={size}
      $dot={dot}
      $uppercase={uppercase}
      {...props}
    >
      {children}
    </StyledBadge>
  );
});

Badge.displayName = 'Badge';

export default Badge;
