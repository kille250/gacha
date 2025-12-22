/**
 * Admin Actions Helper Module
 * 
 * Centralizes admin action handlers with built-in cache invalidation.
 * Use these functions instead of calling API + invalidateFor separately to ensure
 * consistent cache behavior and reduce the chance of forgetting invalidation.
 * 
 * USAGE:
 * import { addCharacter, addCoins, toggleAutofish } from '../actions/adminActions';
 * 
 * const result = await addCoins(coinForm, refreshUser, currentUserId);
 */

import api, { createBanner, updateBanner, deleteBanner } from '../utils/api';
import { invalidateFor, CACHE_ACTIONS } from '../cache';

// ===========================================
// CHARACTER ACTIONS
// ===========================================

/**
 * Add a new character with image upload.
 * 
 * @param {FormData} formData - Form data with image and character details
 * @returns {Promise<Object>} Upload result from API
 * @throws {Error} If upload fails
 */
export const addCharacter = async (formData) => {
  const response = await api.post('/admin/characters/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  invalidateFor(CACHE_ACTIONS.ADMIN_CHARACTER_ADD);
  
  return response.data;
};

/**
 * Edit an existing character.
 * Note: The actual edit is handled by the EditCharacterModal component,
 * but this function handles the cache invalidation callback.
 * 
 * @param {Function} onSuccessCallback - Callback to run after invalidation
 * @param {string} message - Success message to pass to callback
 */
export const handleCharacterEditSuccess = (onSuccessCallback, message) => {
  invalidateFor(CACHE_ACTIONS.ADMIN_CHARACTER_EDIT);
  if (onSuccessCallback) {
    onSuccessCallback(message);
  }
};

/**
 * Delete a character.
 * 
 * @param {string} characterId - The character ID to delete
 * @returns {Promise<Object>} Delete result from API
 * @throws {Error} If delete fails
 */
export const deleteCharacter = async (characterId) => {
  const response = await api.delete(`/admin/characters/${characterId}`);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_CHARACTER_DELETE);
  
  return response.data;
};

// ===========================================
// USER ACTIONS
// ===========================================

/**
 * Add coins to a user account.
 * 
 * @param {Object} coinForm - Form data { userId, amount }
 * @param {Function} refreshUser - Function to refresh current user
 * @param {string} currentUserId - Current logged-in user's ID
 * @returns {Promise<Object>} Result from API
 * @throws {Error} If operation fails
 */
export const addCoins = async (coinForm, refreshUser, currentUserId) => {
  const response = await api.post('/admin/add-coins', coinForm);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_USER_COINS);
  
  // Refresh current user if they're the target
  if (String(coinForm.userId) === String(currentUserId)) {
    await refreshUser();
  }
  
  return response.data;
};

/**
 * Toggle autofish permission for a user.
 * 
 * @param {string} userId - The user ID
 * @param {boolean} enabled - Whether to enable or disable
 * @returns {Promise<Object>} Result from API
 * @throws {Error} If operation fails
 */
export const toggleAutofish = async (userId, enabled) => {
  const response = await api.post('/fishing/admin/toggle-autofish', { userId, enabled });
  
  invalidateFor(CACHE_ACTIONS.ADMIN_USER_TOGGLE_AUTOFISH);
  
  return response.data;
};

/**
 * Toggle R18 access for a user.
 * 
 * @param {string} userId - The user ID
 * @param {boolean} enabled - Whether to enable or disable
 * @returns {Promise<Object>} Result from API
 * @throws {Error} If operation fails
 */
export const toggleR18 = async (userId, enabled) => {
  const response = await api.post('/admin/toggle-r18', { userId, enabled });
  
  invalidateFor(CACHE_ACTIONS.ADMIN_USER_TOGGLE_R18);
  
  return response.data;
};

// ===========================================
// BANNER ACTIONS
// ===========================================

/**
 * Add a new banner.
 * 
 * @param {FormData} formData - Banner form data
 * @returns {Promise<Object>} Created banner from API
 * @throws {Error} If creation fails
 */
export const addBanner = async (formData) => {
  const result = await createBanner(formData);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_BANNER_ADD);
  
  return result;
};

/**
 * Update an existing banner.
 * 
 * @param {string} bannerId - The banner ID to update
 * @param {FormData} formData - Updated banner form data
 * @returns {Promise<Object>} Updated banner from API
 * @throws {Error} If update fails
 */
export const editBanner = async (bannerId, formData) => {
  const result = await updateBanner(bannerId, formData);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_BANNER_EDIT);
  
  return result;
};

/**
 * Delete a banner.
 * 
 * @param {string} bannerId - The banner ID to delete
 * @returns {Promise<Object>} Delete result from API
 * @throws {Error} If delete fails
 */
export const removeBanner = async (bannerId) => {
  const result = await deleteBanner(bannerId);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_BANNER_DELETE);
  
  return result;
};

/**
 * Toggle banner featured status.
 * 
 * @param {string} bannerId - The banner ID
 * @param {boolean} featured - Whether to feature the banner
 * @returns {Promise<Object>} Result from API
 * @throws {Error} If operation fails
 */
export const toggleBannerFeatured = async (bannerId, featured) => {
  const response = await api.patch(`/banners/${bannerId}/featured`, { featured });
  
  invalidateFor(CACHE_ACTIONS.ADMIN_BANNER_FEATURED);
  
  return response.data;
};

/**
 * Update banner order.
 * 
 * @param {string[]} bannerOrder - Array of banner IDs in new order
 * @returns {Promise<Object>} Result from API
 * @throws {Error} If operation fails
 */
export const updateBannerOrder = async (bannerOrder) => {
  const response = await api.post('/banners/update-order', { bannerOrder });
  
  invalidateFor(CACHE_ACTIONS.ADMIN_BANNER_REORDER);
  
  return response.data;
};

// ===========================================
// COUPON ACTIONS
// ===========================================

/**
 * Add a new coupon.
 * 
 * @param {Object} formData - Coupon form data
 * @returns {Promise<Object>} Created coupon from API
 * @throws {Error} If creation fails
 */
export const addCoupon = async (formData) => {
  const response = await api.post('/coupons/admin', formData);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_COUPON_ADD);
  
  return response.data;
};

/**
 * Update an existing coupon.
 * 
 * @param {string} couponId - The coupon ID to update
 * @param {Object} formData - Updated coupon form data
 * @returns {Promise<Object>} Updated coupon from API
 * @throws {Error} If update fails
 */
export const editCoupon = async (couponId, formData) => {
  const response = await api.put(`/coupons/admin/${couponId}`, formData);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_COUPON_EDIT);
  
  return response.data;
};

/**
 * Delete a coupon.
 * 
 * @param {string} couponId - The coupon ID to delete
 * @returns {Promise<Object>} Delete result from API
 * @throws {Error} If delete fails
 */
export const removeCoupon = async (couponId) => {
  const response = await api.delete(`/coupons/admin/${couponId}`);
  
  invalidateFor(CACHE_ACTIONS.ADMIN_COUPON_DELETE);
  
  return response.data;
};

// ===========================================
// BULK OPERATIONS
// ===========================================

/**
 * Handle bulk upload success callback.
 * 
 * @param {Function} onSuccessCallback - Callback to run after invalidation
 * @param {Object} result - Upload result
 */
export const handleBulkUploadSuccess = (onSuccessCallback, result) => {
  invalidateFor(CACHE_ACTIONS.ADMIN_BULK_UPLOAD);
  if (onSuccessCallback) {
    onSuccessCallback(result);
  }
};

/**
 * Handle anime import success callback.
 * 
 * @param {Function} onSuccessCallback - Callback to run after invalidation
 * @param {Object} result - Import result
 */
export const handleAnimeImportSuccess = (onSuccessCallback, result) => {
  invalidateFor(CACHE_ACTIONS.ADMIN_ANIME_IMPORT);
  if (onSuccessCallback) {
    onSuccessCallback(result);
  }
};

// NOTE: Use named exports instead of default for better tree-shaking

