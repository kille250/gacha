/**
 * Flex - Flexbox layout primitives
 */

import styled from 'styled-components';
import { theme } from '../tokens';

/**
 * Flex - Basic flex container
 *
 * @prop {string} align - align-items (default: center)
 * @prop {string} justify - justify-content (default: flex-start)
 * @prop {string} gap - gap between items
 * @prop {boolean} wrap - flex-wrap
 * @prop {string} direction - flex-direction
 */
export const Flex = styled.div`
  display: flex;
  align-items: ${props => props.align || 'center'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap || theme.spacing.md};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
  flex-direction: ${props => props.direction || 'row'};
`;

/**
 * Cluster - Horizontal wrapping layout
 *
 * Use for groups of elements that should wrap naturally.
 * @prop {string} gap - Gap between items
 * @prop {string} justify - Main-axis alignment
 */
export const Cluster = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.gap || theme.spacing.sm};
  align-items: center;
  justify-content: ${props => props.justify || 'flex-start'};
`;

/**
 * Center - Centers content both horizontally and vertically
 *
 * @prop {string} maxWidth - Maximum width of centered content
 * @prop {boolean} intrinsic - Center based on content width
 */
export const Center = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${props => props.maxWidth && `max-width: ${props.maxWidth};`}
  ${props => props.intrinsic && 'width: fit-content;'}
  margin-inline: auto;
`;

/**
 * Spacer - Creates space between elements
 */
export const Spacer = styled.div`
  height: ${props => props.y || '0'};
  width: ${props => props.x || '0'};
  flex-shrink: 0;
`;

export default Flex;
