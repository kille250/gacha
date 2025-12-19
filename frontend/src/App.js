import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import styled, { createGlobalStyle } from 'styled-components';
import { theme } from './styles/DesignSystem';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GachaPage from './pages/GachaPage';
import CollectionPage from './pages/CollectionPage';
import AdminPage from './pages/AdminPage';
import BannerPage from './pages/BannerPage';
import CouponPage from './pages/CouponPage';

// Components
import Navigation from './components/Navigation/Navigation';
import ProtectedRoute from './components/Auth/ProtectedRoute';

const GlobalStyle = createGlobalStyle`
  /* Import SF Pro-like font */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
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
`;

function App() {
  return (
    <AuthProvider>
      <Router>
        <GlobalStyle />
        <AppContainer>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/coupons" element={
              <ProtectedRoute>
                <MainLayout>
                  <Navigation />
                  <PageContent>
                    <CouponPage />
                  </PageContent>
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Navigation />
                    <PageContent>
                      <AdminPage />
                    </PageContent>
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            <Route path="/gacha" element={
              <ProtectedRoute>
                <MainLayout>
                  <Navigation />
                  <PageContent>
                    <GachaPage />
                  </PageContent>
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/collection" element={
              <ProtectedRoute>
                <MainLayout>
                  <Navigation />
                  <PageContent>
                    <CollectionPage />
                  </PageContent>
                </MainLayout>
              </ProtectedRoute>
            } />
            {/* Banner Page - Full screen without navigation */}
            <Route path="/banner/:bannerId" element={
              <ProtectedRoute>
                <BannerPage />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AppContainer>
      </Router>
    </AuthProvider>
  );
}

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainLayout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${theme.colors.background};
`;

const PageContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export default App;
