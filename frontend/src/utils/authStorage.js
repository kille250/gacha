/**
 * authStorage.js - Centralized authentication storage utilities
 * 
 * Consolidates all localStorage access for auth-related data
 * to provide a single source of truth and easier testing/mocking.
 */

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

/**
 * Get the authentication token from storage
 * @returns {string|null} The JWT token or null if not present
 */
export const getToken = () => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
};

/**
 * Set the authentication token in storage
 * @param {string} token - The JWT token to store
 */
export const setToken = (token) => {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
};

/**
 * Remove the authentication token from storage
 */
export const removeToken = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
};

/**
 * Check if user is authenticated (has a token)
 * @returns {boolean} True if token exists
 */
export const hasToken = () => {
  return !!getToken();
};

/**
 * Get the last 8 characters of the token for cache key generation
 * @returns {string} Token hash for cache key or 'noauth'
 */
export const getTokenHash = () => {
  const token = getToken();
  return token ? token.slice(-8) : 'noauth';
};

/**
 * Get the stored user data
 * @returns {Object|null} The user object or null if not present
 */
export const getStoredUser = () => {
  const userString = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userString) return null;
  try {
    return JSON.parse(userString);
  } catch (e) {
    console.error('Failed to parse stored user data:', e);
    return null;
  }
};

/**
 * Set the user data in storage
 * @param {Object} user - The user object to store
 */
export const setStoredUser = (user) => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

/**
 * Remove the stored user data
 */
export const removeStoredUser = () => {
  localStorage.removeItem(STORAGE_KEYS.USER);
};

/**
 * Clear all authentication data from storage
 */
export const clearAuthStorage = () => {
  removeToken();
  removeStoredUser();
};

/**
 * Get user ID from the JWT token (for WebSocket auth)
 * @returns {string|null} User ID or null if not available
 */
export const getUserIdFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.user?.id || null;
  } catch (e) {
    console.error('Failed to parse token for user ID:', e);
    return null;
  }
};

const authStorage = {
  getToken,
  setToken,
  removeToken,
  hasToken,
  getTokenHash,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  clearAuthStorage,
  getUserIdFromToken,
};

export default authStorage;

