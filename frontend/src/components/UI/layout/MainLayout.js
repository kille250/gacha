/**
 * MainLayout - App shell with navigation
 *
 * Wraps pages with the main navigation bar and consistent layout structure.
 * Use for all authenticated pages that need navigation.
 */

import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../styles/DesignSystem';
import Navigation from '../../Navigation/Navigation';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${theme.colors.background};
`;

const PageContent = styled.main.attrs({
  id: 'main-content',
  tabIndex: -1, // Allow programmatic focus for skip link
})`
  flex: 1;
  display: flex;
  flex-direction: column;

  &:focus {
    outline: none; /* Remove focus ring when skip-linked */
  }
`;

/**
 * MainLayout Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 */
const MainLayout = ({ children }) => {
  return (
    <LayoutContainer>
      <Navigation />
      <PageContent>
        {children}
      </PageContent>
    </LayoutContainer>
  );
};

export default MainLayout;
