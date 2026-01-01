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

import React, { Suspense, useState, useEffect } from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { theme, SkipLink } from '../../../design-system';
import Navigation from '../../Navigation/Navigation';
import { BottomNav } from '../../Navigation';
import { ReturnBonusModal } from '../../GameEnhancements';
import { AnnouncementModal } from '../../Announcements';

/**
 * Global CSS custom properties for navigation heights and page spacing.
 * These update dynamically based on orientation and viewport size,
 * allowing dependent components to stay in sync.
 */
const NavHeightVariables = createGlobalStyle`
  :root {
    /* Default (portrait) values */
    --nav-top-height: ${theme.navHeights.top.default};
    --nav-bottom-height: ${theme.navHeights.bottom.default};

    /* Standard page bottom padding - accounts for bottom nav + safe area + content spacing */
    --page-bottom-padding: calc(var(--nav-bottom-height) + env(safe-area-inset-bottom, 0px) + ${theme.spacing.xl});

    /* Landscape mode - more compact */
    @media (max-width: ${theme.breakpoints.md}) and (orientation: landscape) {
      --nav-top-height: ${theme.navHeights.top.landscape};
      --nav-bottom-height: ${theme.navHeights.bottom.landscape};
    }

    /* Very short viewports - ultra compact */
    @media (max-height: 400px) {
      --nav-top-height: ${theme.navHeights.top.compact};
      --nav-bottom-height: ${theme.navHeights.bottom.compact};
    }
  }
`;

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const PageContent = styled.main.attrs({
  id: 'main-content',
  tabIndex: -1, // Allow programmatic focus for skip link
})`
  flex: 1;
  display: flex;
  flex-direction: column;
  /* Bottom padding accounts for bottom nav + safe area on all screen sizes */
  padding-bottom: var(--page-bottom-padding, ${theme.spacing.xl});

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
const PageLoader = ({ t }) => (
  <PageLoaderContainer>
    <PageLoaderSpinner />
    <PageLoaderText>{t('common.loading')}</PageLoaderText>
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
  const { t } = useTranslation();
  const [showReturnBonus, setShowReturnBonus] = useState(false);

  // Check for return bonus on initial mount (once per session)
  useEffect(() => {
    const hasCheckedReturnBonus = sessionStorage.getItem('returnBonusChecked');
    if (!hasCheckedReturnBonus) {
      // Small delay to let the app settle before showing modal
      const timer = setTimeout(() => {
        setShowReturnBonus(true);
        sessionStorage.setItem('returnBonusChecked', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseReturnBonus = () => {
    setShowReturnBonus(false);
  };

  return (
    <>
      <NavHeightVariables />
      <LayoutContainer>
        <SkipLink href="#main-content">{t('accessibility.skipToMain', 'Skip to main content')}</SkipLink>
        <Navigation />
        <PageContent>
          {/* Suspense boundary inside layout keeps navigation visible during lazy page loads */}
          <Suspense fallback={<PageLoader t={t} />}>
            {children}
          </Suspense>
        </PageContent>
        {!hideBottomNav && <BottomNav />}
      </LayoutContainer>


      {/* Return Bonus Modal - shows welcome back rewards for returning players */}
      <AnimatePresence>
        {showReturnBonus && (
          <ReturnBonusModal onClose={handleCloseReturnBonus} />
        )}
      </AnimatePresence>

      {/* Announcement Modal - for high-priority announcements requiring acknowledgment */}
      <AnnouncementModal />
    </>
  );
};

export default MainLayout;
