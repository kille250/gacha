/**
 * Container - Max-width container with responsive padding
 */

import styled from 'styled-components';
import { theme } from '../tokens';

/**
 * Container - Centers content with max-width
 *
 * @prop {string} maxWidth - Maximum width (default: 1400px)
 * @prop {string} padding - Horizontal padding
 */
const Container = styled.div`
  max-width: ${props => props.maxWidth || '1400px'};
  margin: 0 auto;
  padding: 0 ${theme.spacing.md};
  position: relative;

  @media (min-width: ${theme.breakpoints.lg}) {
    padding: 0 ${theme.spacing.xl};
  }
`;

export default Container;
