/**
 * Typography Styled Components
 *
 * Text styles for Essence Tap components.
 */

import styled from 'styled-components';
import { theme } from '../../../design-system';

/**
 * Section title (h3 level)
 */
export const SectionTitle = styled.h3`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin-bottom: ${props => props.$spacing || theme.spacing.md};
`;

/**
 * Section subtitle
 */
export const SectionSubtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${props => props.$spacing || theme.spacing.md};
`;

/**
 * Main title (h2 level)
 */
export const Title = styled.h2`
  font-size: ${props => props.$size || theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color || theme.colors.text};
  margin-bottom: ${props => props.$spacing || theme.spacing.sm};
`;

/**
 * Subtitle text
 */
export const Subtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${props => props.$color || theme.colors.textSecondary};
  margin-bottom: ${props => props.$spacing || theme.spacing.md};
`;

/**
 * Regular text
 */
export const Text = styled.p`
  font-size: ${props => props.$size || theme.fontSizes.base};
  color: ${props => props.$color || theme.colors.text};
  line-height: 1.5;
  margin: 0;
`;

/**
 * Small helper text
 */
export const SmallText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${props => props.$color || theme.colors.textSecondary};
`;

/**
 * Extra small text (for labels, hints)
 */
export const TinyText = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$color || theme.colors.textMuted};
`;

/**
 * Highlighted/accent text
 */
export const HighlightText = styled.span`
  color: ${props => props.$color || '#A855F7'};
  font-weight: ${props => props.$bold ? theme.fontWeights.bold : 'inherit'};
`;

/**
 * Success colored text
 */
export const SuccessText = styled.span`
  color: #10B981;
  font-weight: ${props => props.$bold ? theme.fontWeights.bold : 'inherit'};
`;

/**
 * Warning colored text
 */
export const WarningText = styled.span`
  color: #F59E0B;
  font-weight: ${props => props.$bold ? theme.fontWeights.bold : 'inherit'};
`;

/**
 * Error/danger colored text
 */
export const ErrorText = styled.span`
  color: #EF4444;
  font-weight: ${props => props.$bold ? theme.fontWeights.bold : 'inherit'};
`;

/**
 * Essence colored text (golden)
 */
export const EssenceText = styled.span`
  color: #FFD700;
  font-weight: ${props => props.$bold ? theme.fontWeights.bold : 'inherit'};
`;

/**
 * Prestige colored text (purple)
 */
export const PrestigeText = styled.span`
  color: #A855F7;
  font-weight: ${props => props.$bold ? theme.fontWeights.bold : 'inherit'};
`;
