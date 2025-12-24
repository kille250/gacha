/**
 * Sidebar & Switcher - Advanced layout primitives
 */

import styled from 'styled-components';
import { theme } from '../tokens';

/**
 * Sidebar - Layout with fixed sidebar and fluid main content
 *
 * Mobile: stacks vertically, Desktop: side-by-side
 * @prop {string} sideWidth - Width of sidebar (default: 280px)
 * @prop {string} gap - Gap between sidebar and content
 * @prop {boolean} reversed - Sidebar on right
 */
export const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.gap || theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: ${props => props.reversed ? 'row-reverse' : 'row'};

    > :first-child {
      flex-basis: ${props => props.sideWidth || '280px'};
      flex-shrink: 0;
    }

    > :last-child {
      flex-grow: 1;
      min-width: 0;
    }
  }
`;

/**
 * Switcher - Switches between horizontal and vertical based on space
 *
 * @prop {string} threshold - Width at which layout switches (default: 600px)
 * @prop {string} gap - Gap between items
 */
export const Switcher = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.gap || theme.spacing.md};

  > * {
    flex-grow: 1;
    flex-basis: calc((${props => props.threshold || '600px'} - 100%) * 999);
  }
`;

/**
 * Cover - Full-height layout with centered principal element
 *
 * @prop {string} minHeight - Minimum height (default: 100vh)
 */
export const Cover = styled.div`
  display: flex;
  flex-direction: column;
  min-height: ${props => props.minHeight || '100vh'};
  padding: ${theme.spacing.lg};

  > * {
    margin-block: ${theme.spacing.lg};
  }

  > :first-child:not([data-cover-center]) {
    margin-block-start: 0;
  }

  > :last-child:not([data-cover-center]) {
    margin-block-end: 0;
  }

  > [data-cover-center] {
    margin-block: auto;
  }
`;

/**
 * Reel - Horizontal scrolling container
 *
 * @prop {string} gap - Gap between items
 * @prop {boolean} noBar - Hide scrollbar
 */
export const Reel = styled.div`
  display: flex;
  gap: ${props => props.gap || theme.spacing.md};
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: ${theme.spacing.md};
  -webkit-overflow-scrolling: touch;

  ${props => props.noBar && `
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `}

  > * {
    scroll-snap-align: start;
    flex-shrink: 0;
  }
`;

const LayoutComponents = { Sidebar, Switcher, Cover, Reel };
export default LayoutComponents;
