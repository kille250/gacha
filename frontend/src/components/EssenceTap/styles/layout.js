/**
 * Layout Styled Components
 *
 * Common layout patterns for Essence Tap components.
 */

import styled from 'styled-components';
import { theme } from '../../../design-system';

/**
 * Main container with standard padding
 */
export const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

/**
 * Section with bottom margin
 */
export const Section = styled.section`
  margin-bottom: ${props => props.$spacing || theme.spacing.xl};
`;

/**
 * Responsive grid layout
 */
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.$columns || 2}, 1fr);
  gap: ${props => props.$gap || theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    grid-template-columns: repeat(${props => props.$mdColumns || props.$columns || 4}, 1fr);
  }
`;

/**
 * Auto-fill grid for cards
 */
export const AutoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${props => props.$minWidth || '250px'}, 1fr));
  gap: ${props => props.$gap || theme.spacing.md};
`;

/**
 * Flexbox row
 */
export const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: ${props => props.$align || 'center'};
  justify-content: ${props => props.$justify || 'flex-start'};
  gap: ${props => props.$gap || theme.spacing.md};
  flex-wrap: ${props => props.$wrap ? 'wrap' : 'nowrap'};
`;

/**
 * Flexbox column
 */
export const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$align || 'stretch'};
  justify-content: ${props => props.$justify || 'flex-start'};
  gap: ${props => props.$gap || theme.spacing.md};
`;

/**
 * Horizontal divider
 */
export const Divider = styled.hr`
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: ${props => props.$spacing || theme.spacing.lg} 0;
`;

/**
 * Scrollable container with hidden scrollbar
 */
export const ScrollContainer = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

/**
 * Centered content wrapper
 */
export const CenteredContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${props => props.$padding || theme.spacing.xl};
`;
