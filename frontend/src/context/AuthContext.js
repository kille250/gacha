// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { invalidateCache, clearCache } from '../utils/api';
import {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  clearAuthStorage
} from '../utils/authStorage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh user data from the server (forces fresh fetch by clearing auth cache)
  const refreshUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return null;
      
      // Clear auth cache to ensure fresh data
      clearCache('/auth/me');
      
      const response = await api.get('/auth/me');
      
      const newUserData = { ...response.data };
      setCurrentUser(newUserData);
      setStoredUser(newUserData);
      
      return newUserData;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = getToken();
      
      if (!token) {
        // No token - ensure clean state
        removeStoredUser();
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
        setStoredUser(freshUserData);
      } catch (error) {
        console.error('Error fetching fresh user data:', error);
        // Token is likely invalid - clear everything
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAuthStorage();
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
      removeStoredUser();
      
      const response = await api.post('/auth/login', {
        username,
        password
      });
      
      setToken(response.data.token);
      
      // Clear cache again after token is set (new token = new cache namespace)
      invalidateCache();
      
      // Get user data from backend (fresh, uncached)
      const userResponse = await api.get('/auth/me');
      
      const userData = userResponse.data;
      setCurrentUser(userData);
      setStoredUser(userData);
      
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      // Clear any existing cached data before registration
      invalidateCache();
      setCurrentUser(null);
      removeStoredUser();
      
      const response = await api.post('/auth/signup', {
        username,
        email,
        password
      });
      
      setToken(response.data.token);
      
      // Clear cache after token is set
      invalidateCache();
      
      // Get user data from backend (fresh, uncached)
      const userResponse = await api.get('/auth/me');
      
      const userData = userResponse.data;
      setCurrentUser(userData);
      setStoredUser(userData);
      
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
      removeStoredUser();
      
      const response = await api.post('/auth/google', { credential });
      
      setToken(response.data.token);
      
      // Clear cache after token is set
      invalidateCache();
      
      // Get user data from backend (fresh, uncached)
      const userResponse = await api.get('/auth/me');
      
      const userData = userResponse.data;
      setCurrentUser(userData);
      setStoredUser(userData);
      
      return true;
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.response?.data?.error || 'Google login failed');
      return false;
    }
  };

  const googleRelink = async (credential) => {
    try {
      setError(null);
      const response = await api.post('/auth/google/relink', { credential });
      
      // Refresh user data to get updated Google info
      await refreshUser();
      
      return { success: true, message: response.data.message };
    } catch (err) {
      console.error("Google relink error:", err);
      const errorMessage = err.response?.data?.error || 'Failed to link Google account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const googleUnlink = async () => {
    try {
      setError(null);
      const response = await api.post('/auth/google/unlink');
      
      // Refresh user data to get updated state
      await refreshUser();
      
      return { success: true, message: response.data.message };
    } catch (err) {
      console.error("Google unlink error:", err);
      const errorMessage = err.response?.data?.error || 'Failed to unlink Google account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Clear all cached API data first (before removing token)
    invalidateCache();
    clearAuthStorage();
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
      googleRelink,
      googleUnlink,
      logout,
      setUser: setCurrentUser,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
