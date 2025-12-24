/**
 * MainLayout - App shell with navigation
 *
 * Wraps pages with the main navigation bar and consistent layout structure.
 * Use for all authenticated pages that need navigation.
 *
 * Features:
 * - Skip link for keyboard accessibility
 * - Top navigation bar (desktop + hamburger menu for mobile)
 * - Bottom navigation bar (mobile only, thumb-friendly)
 * - Safe area padding for notched devices
 */

import React from 'react';
import styled from 'styled-components';
import { theme, SkipLink } from '../../../design-system';
import Navigation from '../../Navigation/Navigation';
import { BottomNav } from '../../Navigation';

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

  /* Add bottom padding on mobile to account for bottom nav */
  @media (max-width: ${theme.breakpoints.md}) {
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }

  &:focus {
    outline: none; /* Remove focus ring when skip-linked */
  }
`;

/**
 * MainLayout Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {boolean} props.hideBottomNav - Hide bottom nav for specific pages
 */
const MainLayout = ({ children, hideBottomNav = false }) => {
  return (
    <LayoutContainer>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <Navigation />
      <PageContent>
        {children}
      </PageContent>
      {!hideBottomNav && <BottomNav />}
    </LayoutContainer>
  );
};

export default MainLayout;
