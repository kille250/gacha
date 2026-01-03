/**
 * Badge Styled Components
 *
 * Labels, tags, and indicator badges for Essence Tap.
 */

import styled, { css } from 'styled-components';
import { theme } from '../../../design-system';

/**
 * Base badge style
 */
const baseBadge = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.radius.sm};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
`;

/**
 * Generic badge
 */
export const Badge = styled.span`
  ${baseBadge}
  background: ${props => props.$background || 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$color || theme.colors.text};
`;

/**
 * Tier badge (Common, Rare, Epic, Legendary, Mythic)
 */
export const TierBadge = styled.span`
  ${baseBadge}
  background: ${props => {
    switch (props.$tier?.toLowerCase()) {
      case 'common': return 'rgba(156, 163, 175, 0.2)';
      case 'uncommon': return 'rgba(34, 197, 94, 0.2)';
      case 'rare': return 'rgba(59, 130, 246, 0.2)';
      case 'epic': return 'rgba(168, 85, 247, 0.2)';
      case 'legendary': return 'rgba(245, 158, 11, 0.2)';
      case 'mythic': return 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$tier?.toLowerCase()) {
      case 'common': return '#9CA3AF';
      case 'uncommon': return '#22C55E';
      case 'rare': return '#3B82F6';
      case 'epic': return '#A855F7';
      case 'legendary': return '#F59E0B';
      case 'mythic': return '#EC4899';
      default: return theme.colors.text;
    }
  }};
  border: 1px solid ${props => {
    switch (props.$tier?.toLowerCase()) {
      case 'common': return 'rgba(156, 163, 175, 0.3)';
      case 'uncommon': return 'rgba(34, 197, 94, 0.3)';
      case 'rare': return 'rgba(59, 130, 246, 0.3)';
      case 'epic': return 'rgba(168, 85, 247, 0.3)';
      case 'legendary': return 'rgba(245, 158, 11, 0.3)';
      case 'mythic': return 'rgba(236, 72, 153, 0.3)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
`;

/**
 * Element badge (Fire, Water, Earth, etc.)
 */
export const ElementBadge = styled.span`
  ${baseBadge}
  background: ${props => {
    switch (props.$element?.toLowerCase()) {
      case 'fire': return 'rgba(239, 68, 68, 0.2)';
      case 'water': return 'rgba(59, 130, 246, 0.2)';
      case 'earth': return 'rgba(139, 69, 19, 0.2)';
      case 'wind': return 'rgba(134, 239, 172, 0.2)';
      case 'lightning': return 'rgba(250, 204, 21, 0.2)';
      case 'ice': return 'rgba(147, 197, 253, 0.2)';
      case 'light': return 'rgba(253, 224, 71, 0.2)';
      case 'dark': return 'rgba(88, 28, 135, 0.2)';
      case 'neutral': return 'rgba(156, 163, 175, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$element?.toLowerCase()) {
      case 'fire': return '#EF4444';
      case 'water': return '#3B82F6';
      case 'earth': return '#B8860B';
      case 'wind': return '#86EFAC';
      case 'lightning': return '#FACC15';
      case 'ice': return '#93C5FD';
      case 'light': return '#FDE047';
      case 'dark': return '#9333EA';
      case 'neutral': return '#9CA3AF';
      default: return theme.colors.text;
    }
  }};
`;

/**
 * Rarity badge alias for TierBadge
 */
export const RarityBadge = TierBadge;

/**
 * Status badge (Active, Inactive, Locked, etc.)
 */
export const StatusBadge = styled.span`
  ${baseBadge}
  background: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'active': return 'rgba(16, 185, 129, 0.2)';
      case 'inactive': return 'rgba(156, 163, 175, 0.2)';
      case 'locked': return 'rgba(239, 68, 68, 0.2)';
      case 'pending': return 'rgba(245, 158, 11, 0.2)';
      case 'completed': return 'rgba(16, 185, 129, 0.2)';
      case 'new': return 'rgba(59, 130, 246, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'active': return '#10B981';
      case 'inactive': return '#9CA3AF';
      case 'locked': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'new': return '#3B82F6';
      default: return theme.colors.text;
    }
  }};
`;

/**
 * Small notification dot
 */
export const NotificationDot = styled.span`
  display: inline-block;
  width: ${props => props.$size || '8px'};
  height: ${props => props.$size || '8px'};
  border-radius: 50%;
  background: ${props => props.$color || '#EF4444'};
  ${props => props.$pulse && `
    animation: pulse 2s infinite;
  `}
`;

/**
 * Count badge (shows number)
 */
export const CountBadge = styled.span`
  ${baseBadge}
  min-width: 20px;
  height: 20px;
  padding: 0 ${theme.spacing.xs};
  border-radius: 10px;
  background: ${props => props.$background || '#EF4444'};
  color: ${props => props.$color || 'white'};
  font-size: ${theme.fontSizes.xs};
`;

/**
 * Bonus badge (shows +X%)
 */
export const BonusBadge = styled.span`
  ${baseBadge}
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.3);
`;
