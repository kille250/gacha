/**
 * Card - Base card component
 *
 * Provides consistent card styling with glass morphism effect.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../styles/DesignSystem';

const StyledCard = styled(motion.div)`
  background: ${theme.colors.surface};
  backdrop-filter: blur(${theme.blur.lg});
  -webkit-backdrop-filter: blur(${theme.blur.lg});
  border-radius: ${theme.radius.xl};
  border: 1px solid ${theme.colors.surfaceBorder};
  box-shadow: ${theme.shadows.md};
  transition: all ${theme.transitions.base};
  overflow: hidden;

  ${props => props.$interactive && css`
    cursor: pointer;

    &:hover {
      border-color: ${theme.colors.glassBorder};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.lg};
    }
  `}

  ${props => props.$selected && css`
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.primary}40;
  `}

  ${props => props.$padding && css`
    padding: ${theme.spacing[props.$padding] || props.$padding};
  `}

  ${props => props.$noBorder && css`
    border: none;
  `}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
`;

const CardTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
`;

const CardBody = styled.div`
  padding: ${theme.spacing.lg};
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.surfaceBorder};
`;

/**
 * Card Component
 *
 * @param {Object} props
 * @param {boolean} props.interactive - Whether card is clickable
 * @param {boolean} props.selected - Whether card is selected
 * @param {string} props.padding - Padding size (sm, md, lg, xl, or custom)
 * @param {boolean} props.noBorder - Remove border
 * @param {React.ReactNode} props.children - Card content
 */
const Card = ({
  children,
  interactive = false,
  selected = false,
  padding,
  noBorder = false,
  as,
  ...props
}) => {
  return (
    <StyledCard
      as={as}
      $interactive={interactive}
      $selected={selected}
      $padding={padding}
      $noBorder={noBorder}
      whileHover={interactive ? { y: -4 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
