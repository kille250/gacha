// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { invalidateCache } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh user data from the server (forces fresh fetch by clearing auth cache)
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Clear auth cache to ensure fresh data
      const { clearCache } = await import('../utils/api');
      clearCache('/auth/me');
      
      const response = await api.get('/auth/me');
      
      const newUserData = { ...response.data };
      setCurrentUser(newUserData);
      localStorage.setItem('user', JSON.stringify(newUserData));
      
      return newUserData;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No token - ensure clean state
        localStorage.removeItem('user');
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      
      // Always fetch fresh data from server when token exists
      // Don't trust localStorage as it might be from a different session
      try {
        // Clear auth cache to ensure we get fresh data on initial load
        invalidateCache();
        
        const response = await api.get('/auth/me');
        const freshUserData = { ...response.data };
        setCurrentUser(freshUserData);
        localStorage.setItem('user', JSON.stringify(freshUserData));
      } catch (error) {
        console.error('Error fetching fresh user data:', error);
        // Token is likely invalid - clear everything
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setCurrentUser(null);
        }
      }
      
      setLoading(false);
    };
    
    checkLoggedIn();
  }, []);

  const login = async (username, password) => {
    try {
      // Clear any existing cached data before login
      invalidateCache();
      setCurrentUser(null);
      localStorage.removeItem('user');
      
      const response = await api.post('/auth/login', {
        username,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      
      // Clear cache again after token is set (new token = new cache namespace)
      invalidateCache();
      
      // Get user data from backend (fresh, uncached)
      const userResponse = await api.get('/auth/me');
      
      const userData = userResponse.data;
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (username, password) => {
    try {
      // Clear any existing cached data before registration
      invalidateCache();
      setCurrentUser(null);
      localStorage.removeItem('user');
      
      const response = await api.post('/auth/signup', {
        username,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      
      // Clear cache after token is set
      invalidateCache();
      
      // Get user data from backend (fresh, uncached)
      const userResponse = await api.get('/auth/me');
      
      const userData = userResponse.data;
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return true;
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const googleLogin = async (credential) => {
    try {
      // Clear any existing cached data before login
      invalidateCache();
      setCurrentUser(null);
      localStorage.removeItem('user');
      
      const response = await api.post('/auth/google', { credential });
      
      localStorage.setItem('token', response.data.token);
      
      // Clear cache after token is set
      invalidateCache();
      
      // Get user data from backend (fresh, uncached)
      const userResponse = await api.get('/auth/me');
      
      const userData = userResponse.data;
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return true;
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.response?.data?.error || 'Google login failed');
      return false;
    }
  };

  const logout = () => {
    // Clear all cached API data first (before removing token)
    invalidateCache();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user: currentUser, 
      loading, 
      error, 
      login, 
      register,
      googleLogin,
      logout,
      setUser: setCurrentUser,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
