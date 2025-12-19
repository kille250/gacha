// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh user data from the server
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await api.get('/auth/me');
      
      const newUserData = { ...response.data };
      setCurrentUser(newUserData);
      localStorage.setItem('user', JSON.stringify(newUserData));
      
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      // First load from localStorage for instant display
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      
      // Then fetch fresh data from server
      try {
        const response = await api.get('/auth/me');
        const freshUserData = { ...response.data };
        setCurrentUser(freshUserData);
        localStorage.setItem('user', JSON.stringify(freshUserData));
      } catch (error) {
        console.error('Error fetching fresh user data:', error);
        // If fetch fails but we have stored user, keep using that
      }
      
      setLoading(false);
    };
    
    checkLoggedIn();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      
      // Get user data from backend
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
      const response = await api.post('/auth/signup', {
        username,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      
      // Get user data from backend
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

  const logout = () => {
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
      logout,
      setUser: setCurrentUser,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
