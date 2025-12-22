// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { AUTH_ERROR_EVENT } from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';
import {
  getToken,
  setToken,
  setStoredUser,
  removeStoredUser,
  clearAuthStorage
} from '../utils/authStorage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionExpiredHandled = useRef(false);

  // Refresh user data from the server (forces fresh fetch by clearing auth cache)
  // Returns { success: true, user: userData } on success
  // Returns { success: false, error: string } on failure
  const refreshUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return { success: false, error: 'No authentication token' };
      
      // Clear auth cache to ensure fresh data
      invalidateFor(CACHE_ACTIONS.AUTH_REFRESH);
      
      const response = await api.get('/auth/me');
      
      const newUserData = { ...response.data };
      setCurrentUser(newUserData);
      setStoredUser(newUserData);
      
      return { success: true, user: newUserData };
    } catch (error) {
      console.error('Error refreshing user:', error);
      return { success: false, error: error.response?.data?.error || 'Failed to refresh user data' };
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
        invalidateFor(CACHE_ACTIONS.AUTH_LOGIN);
        
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

  // Listen for global auth errors (token expired during active session)
  useEffect(() => {
    const handleAuthError = (event) => {
      // Prevent handling multiple times
      if (sessionExpiredHandled.current) return;
      sessionExpiredHandled.current = true;
      
      console.warn('Session expired, logging out:', event.detail);
      
      // Clear auth state
      invalidateFor(CACHE_ACTIONS.AUTH_LOGOUT);
      clearAuthStorage();
      setCurrentUser(null);
      setSessionExpired(true);
      
      // Broadcast session expiry to all listeners (e.g., WebSocket connections)
      // This allows components like FishingPage to disconnect gracefully
      window.dispatchEvent(new CustomEvent('session:expired', { 
        detail: { reason: 'token_expired', ...event.detail }
      }));
      
      // Reset flag after a delay to allow re-triggering if needed
      setTimeout(() => {
        sessionExpiredHandled.current = false;
      }, 5000);
    };

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
  }, []);

  const login = async (username, password) => {
    try {
      // Reset local state before login attempt
      setCurrentUser(null);
      removeStoredUser();
      
      const response = await api.post('/auth/login', {
        username,
        password
      });
      
      setToken(response.data.token);
      
      // Clear cache after token is set (new token = new cache namespace)
      // Single invalidation is sufficient since cache is keyed by token hash
      invalidateFor(CACHE_ACTIONS.AUTH_LOGIN);
      
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
      // Reset local state before registration attempt
      setCurrentUser(null);
      removeStoredUser();
      
      const response = await api.post('/auth/signup', {
        username,
        email,
        password
      });
      
      setToken(response.data.token);
      
      // Clear cache after token is set (new token = new cache namespace)
      // Single invalidation is sufficient since cache is keyed by token hash
      invalidateFor(CACHE_ACTIONS.AUTH_LOGIN);
      
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
      // Reset local state before login attempt
      setCurrentUser(null);
      removeStoredUser();
      
      const response = await api.post('/auth/google', { credential });
      
      setToken(response.data.token);
      
      // Clear cache after token is set (new token = new cache namespace)
      // Single invalidation is sufficient since cache is keyed by token hash
      invalidateFor(CACHE_ACTIONS.AUTH_LOGIN);
      
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
    invalidateFor(CACHE_ACTIONS.AUTH_LOGOUT);
    clearAuthStorage();
    setCurrentUser(null);
  };

  // Clear session expired flag when user successfully logs in
  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
    sessionExpiredHandled.current = false;
  }, []);

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
      refreshUser,
      sessionExpired,
      clearSessionExpired
    }}>
      {children}
    </AuthContext.Provider>
  );
};
