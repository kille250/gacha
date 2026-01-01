/**
 * Announcement Service
 *
 * API client for announcement-related endpoints.
 * Handles both user-facing and admin operations.
 */

import api from '../utils/api';

// ===========================================
// USER ENDPOINTS
// ===========================================

/**
 * Get all active announcements for the current user
 * @returns {Promise<{announcements: Array, unreadCount: number}>}
 */
export const getAnnouncements = async () => {
  const response = await api.get('/announcements');
  return response.data;
};

/**
 * Get announcements that require acknowledgment but haven't been acknowledged
 * @returns {Promise<{announcements: Array}>}
 */
export const getUnacknowledgedAnnouncements = async () => {
  const response = await api.get('/announcements/unacknowledged');
  return response.data;
};

/**
 * Get a specific announcement by ID
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const getAnnouncement = async (id) => {
  const response = await api.get(`/announcements/${id}`);
  return response.data;
};

/**
 * Mark an announcement as viewed
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const markAnnouncementViewed = async (id) => {
  const response = await api.post(`/announcements/${id}/view`);
  return response.data;
};

/**
 * Acknowledge an announcement
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const acknowledgeAnnouncement = async (id) => {
  const response = await api.post(`/announcements/${id}/acknowledge`);
  return response.data;
};

/**
 * Dismiss an announcement
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const dismissAnnouncement = async (id) => {
  const response = await api.post(`/announcements/${id}/dismiss`);
  return response.data;
};

// ===========================================
// ADMIN ENDPOINTS
// ===========================================

/**
 * Get all announcements (admin view)
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {string} options.type - Filter by type
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Promise<{announcements: Array, pagination: Object}>}
 */
export const getAdminAnnouncements = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.type) params.append('type', options.type);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const response = await api.get(`/announcements/admin/all?${params.toString()}`);
  return response.data;
};

/**
 * Get a specific announcement (admin view)
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const getAdminAnnouncement = async (id) => {
  const response = await api.get(`/announcements/admin/${id}`);
  return response.data;
};

/**
 * Create a new announcement
 * @param {Object} data - Announcement data
 * @returns {Promise<Object>}
 */
export const createAnnouncement = async (data) => {
  const response = await api.post('/announcements/admin', data);
  return response.data;
};

/**
 * Update an existing announcement
 * @param {string} id - Announcement ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>}
 */
export const updateAnnouncement = async (id, data) => {
  const response = await api.put(`/announcements/admin/${id}`, data);
  return response.data;
};

/**
 * Publish an announcement immediately
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const publishAnnouncement = async (id) => {
  const response = await api.post(`/announcements/admin/${id}/publish`);
  return response.data;
};

/**
 * Archive an announcement
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const archiveAnnouncement = async (id) => {
  const response = await api.post(`/announcements/admin/${id}/archive`);
  return response.data;
};

/**
 * Duplicate an announcement
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const duplicateAnnouncement = async (id) => {
  const response = await api.post(`/announcements/admin/${id}/duplicate`);
  return response.data;
};

/**
 * Delete an announcement
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const deleteAnnouncement = async (id) => {
  const response = await api.delete(`/announcements/admin/${id}`);
  return response.data;
};

/**
 * Get statistics for an announcement
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>}
 */
export const getAnnouncementStats = async (id) => {
  const response = await api.get(`/announcements/admin/${id}/stats`);
  return response.data;
};
