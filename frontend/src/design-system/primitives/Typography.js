/**
 * Typography Components
 *
 * Semantic typography components for consistent text styling.
 */

import styled from 'styled-components';
import { theme } from '../tokens';

export const Heading1 = styled.h1`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes['3xl']};
  font-weight: ${theme.fontWeights.bold};
  line-height: ${theme.lineHeights.tight};
  color: ${theme.colors.text};
  letter-spacing: -0.02em;
  margin: 0;

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['4xl']};
  }
`;

export const Heading2 = styled.h2`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.xl};
  font-weight: ${theme.fontWeights.semibold};
  line-height: ${theme.lineHeights.snug};
  color: ${theme.colors.text};
  letter-spacing: -0.01em;
  margin: 0;

  @media (min-width: ${theme.breakpoints.md}) {
    font-size: ${theme.fontSizes['2xl']};
  }
`;

export const Heading3 = styled.h3`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  line-height: ${theme.lineHeights.snug};
  color: ${theme.colors.text};
  margin: 0;
`;

export const Text = styled.p`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.regular};
  line-height: ${theme.lineHeights.relaxed};
  color: ${props => props.secondary ? theme.colors.textSecondary : theme.colors.text};
  margin: 0;
`;

export const Caption = styled.span`
  font-family: ${theme.fonts.primary};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.regular};
  color: ${theme.colors.textTertiary};
`;
