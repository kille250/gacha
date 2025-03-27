import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import styled, { createGlobalStyle } from 'styled-components';
// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GachaPage from './pages/GachaPage';
import CollectionPage from './pages/CollectionPage';
import AdminPage from './pages/AdminPage';
import BannerPage from './pages/BannerPage';
// Components
import Navigation from './components/Navigation/Navigation';
import ProtectedRoute from './components/Auth/ProtectedRoute';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Poppins', sans-serif;
  }
  
  body {
    background: #f5f5f5;
    overflow-x: hidden; /* Verhindert horizontales Scrollen */
    width: 100%;
    max-width: 100vw;
  }
  
  #root {
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }
  /* Für mobile Endgeräte */
  @media (max-width: 768px) {
    html, body {
      overflow-x: hidden;
    }
  }
  
  /* Add Poppins font */
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
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
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Navigation />
                    <AdminPage />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            <Route path="/gacha" element={
              <ProtectedRoute>
                <MainLayout>
                  <Navigation />
                  <GachaPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/collection" element={
              <ProtectedRoute>
                <MainLayout>
                  <Navigation />
                  <CollectionPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            {/* Add Banner Page Route - Note: No Navigation component as it has its own */}
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
  max-width: 100vw; /* Verhindert horizontales Scrollen */
  overflow-x: hidden; /* Verhindert horizontales Scrollen */
`;

const MainLayout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 100%; /* Wichtig für korrekte Anzeige */
  box-sizing: border-box; /* Wichitg für konsistentes Layout */
`;

export default App;