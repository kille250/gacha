/**
 * Settings Actions Helper Module
 * 
 * Centralizes settings/profile action handlers with built-in cache invalidation.
 * Use these functions instead of calling API + refreshUser separately to ensure
 * consistent cache behavior and reduce the chance of forgetting invalidation.
 * 
 * USAGE:
 * import { updateEmail, updateUsername, updatePassword, resetAccount } from '../actions/settingsActions';
 * 
 * const result = await updateEmail(email, refreshUser);
 */

import api from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';

// ===========================================
// PROFILE ACTIONS
// ===========================================

/**
 * Update user email address.
 * 
 * @param {string} email - New email address
 * @param {Function} refreshUser - Function to refresh user data
 * @returns {Promise<Object>} Update result from API
 * @throws {Error} If update fails
 */
export const updateEmail = async (email, refreshUser) => {
  const response = await api.put('/auth/profile/email', { 
    email: email.trim().toLowerCase() 
  });
  
  // Refresh user to get updated email
  await refreshUser();
  
  return response.data;
};

/**
 * Update username.
 * 
 * @param {string} username - New username
 * @param {Function} refreshUser - Function to refresh user data
 * @returns {Promise<Object>} Update result from API
 * @throws {Error} If update fails
 */
export const updateUsername = async (username, refreshUser) => {
  const response = await api.put('/auth/profile/username', { 
    username: username.trim() 
  });
  
  // Refresh user to get updated username
  await refreshUser();
  
  return response.data;
};

/**
 * Update or set password.
 * 
 * @param {Object} params
 * @param {string} [params.currentPassword] - Current password (if user has one)
 * @param {string} params.newPassword - New password
 * @param {Function} refreshUser - Function to refresh user data
 * @returns {Promise<Object>} Update result from API
 * @throws {Error} If update fails
 */
export const updatePassword = async ({ currentPassword, newPassword }, refreshUser) => {
  const payload = {
    newPassword
  };
  
  if (currentPassword) {
    payload.currentPassword = currentPassword;
  }
  
  const response = await api.put('/auth/profile/password', payload);
  
  // Refresh user to get updated hasPassword status
  await refreshUser();
  
  return response.data;
};

// ===========================================
// ACCOUNT ACTIONS
// ===========================================

/**
 * Reset user account (dangerous action).
 * This clears all user progress while keeping account credentials.
 * 
 * @param {Object} params
 * @param {string} [params.password] - Password for verification (if user has one)
 * @param {string} params.confirmationText - Required confirmation text "RESET MY ACCOUNT"
 * @param {Function} refreshUser - Function to refresh user data
 * @returns {Promise<Object>} Reset result from API
 * @throws {Error} If reset fails
 */
export const resetAccount = async ({ password, confirmationText }, refreshUser) => {
  const response = await api.post('/auth/reset-account', {
    password: password || undefined,
    confirmationText
  });
  
  // Clear all caches and refresh user after reset
  invalidateFor(CACHE_ACTIONS.AUTH_LOGIN);
  await refreshUser();
  
  return response.data;
};

// NOTE: Use named exports instead of default for better tree-shaking

