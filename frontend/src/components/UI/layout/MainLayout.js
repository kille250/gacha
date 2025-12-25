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
 * - Suspense boundary for lazy-loaded pages (navigation stays visible during load)
 */

import React, { Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
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

// ==================== PAGE LOADER ====================
// Inline loader that appears within the layout while lazy pages load
// Navigation remains visible, providing continuity and context

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const PageLoaderContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: ${theme.spacing.md};
`;

const PageLoaderSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${theme.colors.surfaceBorder};
  border-top-color: ${theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-top-color: ${theme.colors.primary};
    border-right-color: ${theme.colors.primary};
  }
`;

const PageLoaderText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

/**
 * Fallback component shown while lazy-loaded pages are loading.
 * Keeps navigation visible for better UX continuity.
 */
const PageLoader = () => (
  <PageLoaderContainer>
    <PageLoaderSpinner />
    <PageLoaderText>Loading...</PageLoaderText>
  </PageLoaderContainer>
);

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
        {/* Suspense boundary inside layout keeps navigation visible during lazy page loads */}
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </PageContent>
      {!hideBottomNav && <BottomNav />}
    </LayoutContainer>
  );
};

export default MainLayout;
