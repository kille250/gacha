// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      // Verwende lokalen Benutzer aus localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = async (username, password) => {
	try {
	  const response = await axios.post('http://localhost:5000/api/auth/login', {
		username,
		password
	  });
	  
	  localStorage.setItem('token', response.data.token);
	  
	  // Benutzerdaten vom Backend abrufen
	  const userResponse = await axios.get('http://localhost:5000/api/auth/me', {
		headers: {
		  'x-auth-token': response.data.token
		}
	  });
	  
	  // Benutzerobjekt speichern (enthält jetzt auch isAdmin)
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

  // Registrierungsfunktion hinzufügen
  const register = async (username, password) => {
	try {
	  const response = await axios.post('http://localhost:5000/api/auth/signup', {
		username,
		password
	  });
	  
	  localStorage.setItem('token', response.data.token);
	  
	  // Benutzerdaten vom Backend abrufen
	  const userResponse = await axios.get('http://localhost:5000/api/auth/me', {
		headers: {
		  'x-auth-token': response.data.token
		}
	  });
	  
	  // Tatsächliche Benutzerdaten vom Server speichern
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
      register, // Wichtig: register zur Verfügung stellen
      logout,
      setUser: setCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};