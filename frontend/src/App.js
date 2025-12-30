import React, { useContext, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { RarityProvider } from './context/RarityContext';
import { RecaptchaProvider } from './context/RecaptchaContext';
import { ToastProvider } from './context/ToastContext';
import { AudioProvider } from './engine/audio/AudioProvider';
import { PixiOverlayProvider } from './engine/pixi/PixiOverlayProvider';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { theme } from './design-system';
import { CelebrationProvider, FloatingPointsProvider } from './design-system/effects';
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
import ForcePasswordChangeModal from './components/Auth/ForcePasswordChangeModal';

// ==================== CODE SPLITTING ====================
// Large pages are lazy-loaded to improve initial bundle size and load time
// Critical pages (Login, Gacha) are loaded immediately for best UX

// Pages - Lazy loaded (large or less frequently visited)
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const BannerPage = lazy(() => import('./pages/BannerPage'));
const CouponPage = lazy(() => import('./pages/CouponPage'));
const RollPage = lazy(() => import('./pages/RollPage'));
const FishingPage = lazy(() => import('./pages/FishingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DojoPage = lazy(() => import('./pages/DojoPage'));
const FortuneWheelPage = lazy(() => import('./pages/FortuneWheelPage'));

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
// Suspense fallback component for lazy-loaded pages - Branded experience
const PageLoader = () => (
  <LoaderContainer>
    <LoaderBrand
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <LoaderLogo>✦</LoaderLogo>
      <LoaderRing />
    </LoaderBrand>
    <LoaderText
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      Summoning...
    </LoaderText>
    <LoaderParticles>
      {[...Array(6)].map((_, i) => (
        <LoaderParticle key={i} $delay={i * 0.15} $index={i} />
      ))}
    </LoaderParticles>
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

// Page transition variants - cinematic feel with spring physics and blur
const pageTransitionVariants = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 26,
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Animated page wrapper component
const PageTransition = ({ children }) => (
  <motion.div
    variants={pageTransitionVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
  >
    {children}
  </motion.div>
);

// Global password change handler - shows modal when password change is required
// This ensures the modal appears on ANY page after reload, not just the login page
const GlobalPasswordChangeHandler = () => {
  const { requiresPasswordChange, passwordResetExpiry, clearPasswordChangeRequired, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handlePasswordChangeSuccess = async () => {
    // Refresh user data to clear the requiresPasswordChange flag from backend
    await refreshUser();
    clearPasswordChangeRequired();
    // Navigate to main app if on login page
    navigate('/gacha', { replace: true });
  };

  if (!requiresPasswordChange) return null;

  return (
    <ForcePasswordChangeModal
      onSuccess={handlePasswordChangeSuccess}
      expiresAt={passwordResetExpiry}
    />
  );
};

// Animated Routes wrapper - handles page transitions
// Navigation stability is achieved through MainLayout's internal structure
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

        {/* Protected routes with main navigation layout */}
        <Route path="/gacha" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><GachaPage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/collection" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><CollectionPage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><ProfilePage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/dojo" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><DojoPage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/fortune-wheel" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><FortuneWheelPage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/coupons" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><CouponPage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><SettingsPage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <MainLayout><PageTransition><AdminPage /></PageTransition></MainLayout>
          </ProtectedRoute>
        } />

        {/* Full-screen immersive routes (no navigation) */}
        <Route path="/roll" element={
          <ProtectedRoute><PageTransition><RollPage /></PageTransition></ProtectedRoute>
        } />
        <Route path="/banner/:bannerId" element={
          <ProtectedRoute><PageTransition><BannerPage /></PageTransition></ProtectedRoute>
        } />
        <Route path="/fishing" element={
          <ProtectedRoute><PageTransition><FishingPage /></PageTransition></ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path="/" element={<HomeRedirect />} />
      </Routes>
    </AnimatePresence>
  );
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
            <AudioProvider>
              <PixiOverlayProvider>
              <CelebrationProvider>
              <FloatingPointsProvider>
              <Router>
                <GlobalStyle />
                {/* Global CAPTCHA handler - listens for CAPTCHA_REQUIRED events from API */}
                <GlobalCaptchaHandler />
                {/* Global password change handler - shows modal when password change is required */}
                <GlobalPasswordChangeHandler />
                <AppContainer id="app-shake-container">
                  {/* Skip to content link for accessibility - allows keyboard users to skip navigation */}
                  <a href="#main-content" className="skip-to-content">
                    Skip to main content
                  </a>
                  <Suspense fallback={<PageLoader />}>
                    <AnimatedRoutes />
                  </Suspense>
                </AppContainer>
              </Router>
              </FloatingPointsProvider>
              </CelebrationProvider>
              </PixiOverlayProvider>
            </AudioProvider>
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

// Ambient gradient animation for premium feel
const ambientShift = keyframes`
  0%, 100% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  33% {
    opacity: 0.8;
    transform: translate(2%, -2%) scale(1.02);
  }
  66% {
    opacity: 0.9;
    transform: translate(-1%, 1%) scale(0.98);
  }
`;

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;

  /* Ambient gradient background for premium feel */
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 113, 227, 0.12), transparent 50%),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(88, 86, 214, 0.08), transparent 50%),
      radial-gradient(ellipse 50% 30% at 10% 60%, rgba(175, 82, 222, 0.06), transparent 50%);
    pointer-events: none;
    z-index: 0;
    animation: ${ambientShift} 20s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

`;

// ==================== PAGE LOADER STYLES ====================

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-60px) translateX(var(--float-x, 10px)); opacity: 0; }
`;

const shimmerGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.1);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.2);
  }
`;

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: radial-gradient(ellipse at center, ${theme.colors.backgroundSecondary} 0%, ${theme.colors.background} 70%);
  gap: ${theme.spacing.lg};
  position: relative;
  overflow: hidden;
`;

const LoaderBrand = styled(motion.div)`
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoaderLogo = styled.div`
  font-size: 36px;
  color: ${theme.colors.featured};
  z-index: 2;
  animation: ${pulse} 2s ease-in-out infinite;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
`;

const LoaderRing = styled.div`
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: ${theme.colors.featured};
  border-right-color: ${theme.colors.featured};
  border-radius: 50%;
  animation: ${spin} 1.2s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite, ${shimmerGlow} 2s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    inset: -6px;
    border: 2px solid transparent;
    border-top-color: rgba(255, 215, 0, 0.3);
    border-radius: 50%;
    animation: ${spin} 2s linear infinite reverse;
  }
`;

const LoaderText = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textSecondary};
  letter-spacing: ${theme.letterSpacing.wide};
`;

const LoaderParticles = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`;

const LoaderParticle = styled.div`
  position: absolute;
  width: 4px;
  height: 4px;
  background: ${theme.colors.featured};
  border-radius: 50%;
  bottom: 40%;
  left: ${props => 45 + (props.$index % 3) * 5}%;
  --float-x: ${props => (props.$index % 2 === 0 ? '' : '-')}${props => 10 + props.$index * 5}px;
  animation: ${float} 2.5s ease-out infinite;
  animation-delay: ${props => props.$delay}s;
  opacity: 0;
  box-shadow: 0 0 6px ${theme.colors.featured};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

export default App;
