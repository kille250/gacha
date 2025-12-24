/**
 * Chip Components
 *
 * Small interactive elements for tags, filters, and status indicators.
 */

import styled from 'styled-components';
import { theme } from '../tokens';

export const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: ${theme.colors.glass};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
`;

export const PrimaryChip = styled(Chip)`
  background: rgba(0, 113, 227, 0.15);
  border-color: rgba(0, 113, 227, 0.3);
  color: ${theme.colors.primary};
`;

export const RarityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => theme.colors.rarity[props.rarity] || theme.colors.rarity.common};
  color: white;
  box-shadow: 0 2px 8px ${props => theme.colors.rarity[props.rarity]}60;
`;
