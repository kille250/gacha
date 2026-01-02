/**
 * ElementBadge - Reusable element indicator component
 *
 * Displays a character's element with appropriate icon and color.
 * Supports multiple sizes for different contexts (cards, modals, tooltips).
 *
 * Features:
 * - Three size variants (sm, md, lg)
 * - Accessible with aria-label
 * - Consistent color theming from shared config
 * - Optional backdrop for visibility on any background
 * - Reduced motion support
 */

import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { theme } from '../../design-system';
import {
  IconFlame,
  IconWater,
  IconEarth,
  IconAir,
  IconLight,
  IconDark,
  IconNeutral,
} from '../../constants/icons';
import { CHARACTER_ABILITIES } from '../../config/essenceTapConfig';

// Element icons mapping
const ELEMENT_ICONS = {
  fire: IconFlame,
  water: IconWater,
  earth: IconEarth,
  air: IconAir,
  light: IconLight,
  dark: IconDark,
  neutral: IconNeutral,
};

// Element colors from shared config
const ELEMENT_COLORS = Object.fromEntries(
  Object.entries(CHARACTER_ABILITIES).map(([key, ability]) => [key, ability.color])
);

// Element display names for accessibility
const ELEMENT_NAMES = {
  fire: 'Fire',
  water: 'Water',
  earth: 'Earth',
  air: 'Air',
  light: 'Light',
  dark: 'Dark',
  neutral: 'Neutral',
};

// Size configurations
const SIZES = {
  sm: {
    iconSize: 10,
    padding: '2px',
    badgeSize: '16px',
    fontSize: '8px',
  },
  md: {
    iconSize: 14,
    padding: '4px',
    badgeSize: '24px',
    fontSize: '10px',
  },
  lg: {
    iconSize: 18,
    padding: '6px',
    badgeSize: '32px',
    fontSize: '12px',
  },
};

const BadgeWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radius.full};
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  /* Size variants */
  ${props => {
    const size = SIZES[props.$size] || SIZES.md;
    return css`
      width: ${size.badgeSize};
      height: ${size.badgeSize};
      min-width: ${size.badgeSize};
      min-height: ${size.badgeSize};
    `;
  }}

  /* Background variants */
  ${props => props.$variant === 'filled' && css`
    background: ${props.$color}25;
    border: 1px solid ${props.$color}50;
  `}

  ${props => props.$variant === 'ghost' && css`
    background: transparent;
  `}

  ${props => props.$variant === 'backdrop' && css`
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  `}

  /* Interactive state for clickable badges */
  ${props => props.$interactive && css`
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        transform: scale(1.1);
        box-shadow: 0 0 8px ${props.$color}60;
      }
    }

    &:active {
      transform: scale(0.95);
    }
  `}

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  line-height: 1;

  svg {
    display: block;
  }
`;

const LabelWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${props => SIZES[props.$size]?.padding || '4px'};
  padding: ${props => `${SIZES[props.$size]?.padding || '4px'} ${parseInt(SIZES[props.$size]?.padding || '4') * 2}px`};
  border-radius: ${theme.radius.full};
  background: ${props => props.$color}20;
  border: 1px solid ${props => props.$color}40;
`;

const LabelText = styled.span`
  font-size: ${props => SIZES[props.$size]?.fontSize || '10px'};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$color};
  text-transform: capitalize;
  letter-spacing: 0.02em;
`;

/**
 * ElementBadge Component
 *
 * @param {Object} props
 * @param {string} props.element - Element type (fire, water, earth, air, light, dark, neutral)
 * @param {'sm' | 'md' | 'lg'} props.size - Size variant (default: 'md')
 * @param {'filled' | 'ghost' | 'backdrop'} props.variant - Background variant (default: 'backdrop')
 * @param {boolean} props.showLabel - Whether to show element name text (default: false)
 * @param {boolean} props.interactive - Enable hover/click interactions (default: false)
 * @param {string} props.className - Additional CSS class
 * @param {Function} props.onClick - Click handler (makes badge interactive)
 * @param {string} props.title - Custom tooltip text
 */
const ElementBadge = memo(({
  element = 'neutral',
  size = 'md',
  variant = 'backdrop',
  showLabel = false,
  interactive = false,
  className,
  onClick,
  title,
  ...props
}) => {
  // Normalize element to lowercase
  const normalizedElement = (element || 'neutral').toLowerCase();

  // Get element configuration
  const ElementIcon = ELEMENT_ICONS[normalizedElement] || ELEMENT_ICONS.neutral;
  const color = ELEMENT_COLORS[normalizedElement] || ELEMENT_COLORS.neutral;
  const name = ELEMENT_NAMES[normalizedElement] || 'Neutral';
  const sizeConfig = SIZES[size] || SIZES.md;

  // Build aria-label
  const ariaLabel = `${name} element`;

  // Tooltip text
  const tooltipText = title || name;

  // Render with label if requested
  if (showLabel) {
    return (
      <LabelWrapper
        $size={size}
        $color={color}
        className={className}
        role="img"
        aria-label={ariaLabel}
        title={tooltipText}
        onClick={onClick}
        {...props}
      >
        <IconWrapper $color={color}>
          <ElementIcon size={sizeConfig.iconSize} aria-hidden="true" />
        </IconWrapper>
        <LabelText $size={size} $color={color}>
          {name}
        </LabelText>
      </LabelWrapper>
    );
  }

  // Icon-only badge
  return (
    <BadgeWrapper
      $size={size}
      $variant={variant}
      $color={color}
      $interactive={interactive || !!onClick}
      className={className}
      role="img"
      aria-label={ariaLabel}
      title={tooltipText}
      onClick={onClick}
      {...props}
    >
      <IconWrapper $color={color}>
        <ElementIcon size={sizeConfig.iconSize} aria-hidden="true" />
      </IconWrapper>
    </BadgeWrapper>
  );
});

ElementBadge.displayName = 'ElementBadge';

// Export constants for external use
export { ELEMENT_ICONS, ELEMENT_COLORS, ELEMENT_NAMES };

export default ElementBadge;
