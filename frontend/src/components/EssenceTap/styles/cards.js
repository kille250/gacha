/**
 * Card Styled Components
 *
 * Reusable card patterns for Essence Tap components.
 */

import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { theme } from '../../../design-system';

/**
 * Base card with background and border
 */
export const Card = styled.div`
  padding: ${props => props.$padding || theme.spacing.md};
  background: ${props => props.$background || 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$borderColor || 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${props => props.$radius || theme.radius.lg};
`;

/**
 * Stat card for displaying single statistics
 */
export const StatCard = styled(Card)`
  text-align: center;
`;

/**
 * Large value display in stat cards
 */
export const StatValue = styled.div`
  font-size: ${props => props.$size || theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

/**
 * Label for stat values
 */
export const StatLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$color || theme.colors.textSecondary};
`;

/**
 * Interactive card mixin
 */
const interactiveStyles = css`
  cursor: ${props => props.$disabled ? 'default' : 'pointer'};
  transition: all 0.2s ease;

  ${props => !props.$disabled && `
    &:hover {
      transform: translateY(-2px);
      background: ${props.$hoverBackground || 'rgba(255, 255, 255, 0.08)'};
    }
  `}
`;

/**
 * Interactive card that responds to hover/click
 */
export const InteractiveCard = styled(motion.div)`
  padding: ${props => props.$padding || theme.spacing.md};
  background: ${props => {
    if (props.$active) return props.$activeBackground || 'rgba(138, 43, 226, 0.15)';
    if (props.$disabled) return 'rgba(255, 255, 255, 0.02)';
    return props.$background || 'rgba(255, 255, 255, 0.03)';
  }};
  border: 1px solid ${props => {
    if (props.$active) return props.$activeBorderColor || 'rgba(138, 43, 226, 0.4)';
    if (props.$disabled) return 'rgba(255, 255, 255, 0.05)';
    return props.$borderColor || 'rgba(255, 255, 255, 0.1)';
  }};
  border-radius: ${props => props.$radius || theme.radius.lg};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  ${interactiveStyles}
`;

/**
 * Upgrade/Purchase card
 */
export const UpgradeCard = styled(InteractiveCard)`
  background: ${props => {
    if (props.$maxed) return 'rgba(16, 185, 129, 0.1)';
    if (props.$canAfford) return 'rgba(138, 43, 226, 0.15)';
    return 'rgba(255, 255, 255, 0.03)';
  }};
  border-color: ${props => {
    if (props.$maxed) return 'rgba(16, 185, 129, 0.4)';
    if (props.$canAfford) return 'rgba(138, 43, 226, 0.4)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  cursor: ${props => (!props.$maxed && props.$canAfford) ? 'pointer' : 'default'};

  ${props => (!props.$maxed && props.$canAfford) && `
    &:hover {
      background: rgba(138, 43, 226, 0.25);
    }
  `}
`;

/**
 * Upgrade card name/title
 */
export const UpgradeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

/**
 * Upgrade card description
 */
export const UpgradeDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
  min-height: 2.4em;
`;

/**
 * Upgrade card footer (contains cost and level)
 */
export const UpgradeFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

/**
 * Cost display in upgrade cards
 */
export const UpgradeCost = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${props => props.$canAfford ? '#A855F7' : theme.colors.textSecondary};
`;

/**
 * Level indicator in upgrade cards
 */
export const UpgradeLevel = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$maxed ? '#10B981' : theme.colors.textSecondary};
  background: ${props => props.$maxed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.sm};
`;
