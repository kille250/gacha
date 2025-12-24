import React, { useContext, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { RarityProvider } from './context/RarityContext';
import { RecaptchaProvider } from './context/RecaptchaContext';
import { ToastProvider } from './context/ToastContext';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { theme } from './styles/DesignSystem';
import { initVisibilityHandler, enableCacheDebugging } from './cache';
import { ErrorBoundary, MainLayout } from './components/UI';

// i18n
import './i18n';

// Pages - Eagerly loaded (critical path)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GachaPage from './pages/GachaPage';

// Components
import ProtectedRoute from './components/Auth/ProtectedRoute';
import GlobalCaptchaHandler from './components/UI/GlobalCaptchaHandler';

// ==================== CODE SPLITTING ====================
// Large pages are lazy-loaded to improve initial bundle size and load time
// Critical pages (Login, Gacha) are loaded immediately for best UX

// Pages - Lazy loaded (large or less frequently visited)
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const BannerPage = lazy(() => import('./pages/BannerPage'));
const CouponPage = lazy(() => import('./pages/CouponPage'));
const RollPage = lazy(() => import('./pages/RollPage'));
const FishingPage = lazy(() => import('./pages/FishingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DojoPage = lazy(() => import('./pages/DojoPage'));

// Initialize cache manager visibility handler (runs once on app load)
initVisibilityHandler({
  debug: process.env.NODE_ENV === 'development'
});

// Enable cache debugging in development or when explicitly enabled via localStorage
// In production, run: localStorage.setItem('CACHE_DEBUG', 'true') then refresh
if (process.env.NODE_ENV === 'development' || localStorage.getItem('CACHE_DEBUG') === 'true') {
  enableCacheDebugging();
}

// Google OAuth Client ID from environment variable
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// reCAPTCHA Site Key from environment variable
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

// ==================== PAGE LOADER ====================
// Suspense fallback component for lazy-loaded pages
const PageLoader = () => (
  <LoaderContainer>
    <LoaderSpinner />
    <LoaderText>Loading...</LoaderText>
  </LoaderContainer>
);

// Smart redirect based on auth status
const HomeRedirect = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <PageLoader />;
  }

  return <Navigate to={user ? "/gacha" : "/login"} replace />;
};

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    font-family: ${theme.fonts.primary};
    background: ${theme.colors.background};
    color: ${theme.colors.text};
    line-height: ${theme.lineHeights.normal};
    overflow-x: hidden;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Skip to content link - accessibility */
  .skip-to-content {
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    background: ${theme.colors.primary};
    color: white;
    font-weight: ${theme.fontWeights.semibold};
    font-size: ${theme.fontSizes.sm};
    border-radius: ${theme.radius.md};
    z-index: 10000;
    text-decoration: none;
    transition: top 0.2s ease;

    &:focus {
      top: ${theme.spacing.md};
      outline: 2px solid white;
      outline-offset: 2px;
    }
  }

  /* Selection styling */
  ::selection {
    background: ${theme.colors.primary};
    color: white;
  }

  /* Focus styling */
  :focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundSecondary};
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  /* Link styling */
  a {
    color: ${theme.colors.primary};
    text-decoration: none;
    transition: color ${theme.transitions.fast};

    &:hover {
      color: ${theme.colors.primaryHover};
    }
  }

  /* Button reset */
  button {
    font-family: inherit;
    border: none;
    background: none;
    cursor: pointer;
  }

  /* Input reset */
  input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }

  /* Image defaults */
  img, video {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Smooth scroll */
  @media (prefers-reduced-motion: no-preference) {
    html {
      scroll-behavior: smooth;
    }
  }

  /* Reduced motion support - respect user's accessibility preferences */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Hide reCAPTCHA badge */
  .grecaptcha-badge {
    visibility: hidden !important;
  }
`;

function App() {
  // Wrap with GoogleOAuthProvider only if client ID is configured
  const content = (
    <ErrorBoundary fullScreen>
      <RecaptchaProvider siteKey={RECAPTCHA_SITE_KEY}>
        <AuthProvider>
          <RarityProvider>
            <ToastProvider>
              <Router>
                <GlobalStyle />
                {/* Global CAPTCHA handler - listens for CAPTCHA_REQUIRED events from API */}
                <GlobalCaptchaHandler />
                <AppContainer>
                  {/* Skip to content link for accessibility - allows keyboard users to skip navigation */}
                  <a href="#main-content" className="skip-to-content">
                    Skip to main content
                  </a>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />

                      {/* Protected routes with main navigation layout */}
                      <Route path="/gacha" element={
                        <ProtectedRoute>
                          <MainLayout><GachaPage /></MainLayout>
                        </ProtectedRoute>
                      } />
                      <Route path="/collection" element={
                        <ProtectedRoute>
                          <MainLayout><CollectionPage /></MainLayout>
                        </ProtectedRoute>
                      } />
                      <Route path="/dojo" element={
                        <ProtectedRoute>
                          <MainLayout><DojoPage /></MainLayout>
                        </ProtectedRoute>
                      } />
                      <Route path="/coupons" element={
                        <ProtectedRoute>
                          <MainLayout><CouponPage /></MainLayout>
                        </ProtectedRoute>
                      } />
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <MainLayout><SettingsPage /></MainLayout>
                        </ProtectedRoute>
                      } />
                      <Route path="/admin" element={
                        <ProtectedRoute>
                          <MainLayout><AdminPage /></MainLayout>
                        </ProtectedRoute>
                      } />

                      {/* Full-screen immersive routes (no navigation) */}
                      <Route path="/roll" element={
                        <ProtectedRoute><RollPage /></ProtectedRoute>
                      } />
                      <Route path="/banner/:bannerId" element={
                        <ProtectedRoute><BannerPage /></ProtectedRoute>
                      } />
                      <Route path="/fishing" element={
                        <ProtectedRoute><FishingPage /></ProtectedRoute>
                      } />

                      {/* Default redirect */}
                      <Route path="/" element={<HomeRedirect />} />
                    </Routes>
                  </Suspense>
                </AppContainer>
              </Router>
            </ToastProvider>
          </RarityProvider>
        </AuthProvider>
      </RecaptchaProvider>
    </ErrorBoundary>
  );

  // Wrap with GoogleOAuthProvider if client ID is available
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

// ==================== PAGE LOADER STYLES ====================

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${theme.colors.background};
  gap: ${theme.spacing.md};
`;

const LoaderSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid ${theme.colors.surfaceBorder};
  border-top-color: ${theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoaderText = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export default App;
