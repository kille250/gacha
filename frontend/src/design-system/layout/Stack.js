/**
 * Stack - Vertical spacing layout primitive
 *
 * Use for vertically stacked content with consistent spacing.
 */

import styled from 'styled-components';
import { theme } from '../tokens';

/**
 * Stack Component
 *
 * @prop {string} gap - Spacing between items (default: theme.spacing.md)
 * @prop {string} align - Cross-axis alignment (default: stretch)
 */
const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.gap || theme.spacing.md};
  align-items: ${props => props.align || 'stretch'};
`;

export default Stack;
