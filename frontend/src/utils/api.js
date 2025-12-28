import axios from 'axios';
import { getToken, getTokenHash, getStoredUser } from './authStorage';
import { getDeviceHeaders } from './deviceFingerprint';

// Use environment variable for API URL, with fallback for local development
const getApiBase = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (!envUrl) return 'http://localhost:5000';
  
  // If URL already has a dot, it's a full domain
  if (envUrl.includes('.')) {
    return `https://${envUrl}`;
  }
  // Otherwise, it's just the service name - add .onrender.com
  return `https://${envUrl}.onrender.com`;
};

const API_BASE = getApiBase();

export const API_URL = `${API_BASE}/api`;

// Export base URL for WebSocket connections
export const WS_URL = API_BASE;

// Helper to get full URL for uploaded assets (images, videos)
export const getAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `${API_BASE}${path}`;
  if (path.startsWith('image-')) return `${API_BASE}/uploads/characters/${path}`;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

// ===========================================
// REQUEST CACHING & DEDUPLICATION
// ===========================================

const cache = new Map();
const pendingRequests = new Map();

const CACHE_TTL = {
  '/auth/me': 5 * 1000,          // 5 seconds for user data (keep very short to avoid stale points/currency)
  '/banners/user/tickets': 5 * 1000, // 5 seconds for tickets
  '/characters': 60 * 1000,      // 1 minute for characters
  '/banners': 60 * 1000,         // 1 minute for banners
  '/admin/dashboard': 30 * 1000, // 30 seconds for admin dashboard
  '/admin/users': 30 * 1000,     // 30 seconds for users
  '/coupons/admin': 30 * 1000,   // 30 seconds for coupons
  default: 15 * 1000             // 15 seconds default
};

// Cache version - increment when API response format changes
// This ensures stale cached data from old format doesn't cause issues
const CACHE_VERSION = 1;

// NOTE: Visibility-based cache invalidation is handled by cacheManager.js
// with tiered staleness thresholds (30s/2min/5min). Do not duplicate here.

const getCacheTTL = (url) => {
  for (const [key, ttl] of Object.entries(CACHE_TTL)) {
    if (url.includes(key)) return ttl;
  }
  return CACHE_TTL.default;
};

const getCacheKey = (config) => {
  // Include cache version, auth token, and query params in cache key
  // so different users/queries get different cached responses
  // and cache is invalidated on API format changes
  const params = config.params ? JSON.stringify(config.params) : '';
  return `v${CACHE_VERSION}:${config.method || 'get'}:${config.url}:${params}:${getTokenHash()}`;
};

/**
 * Clear cache entries matching a pattern, or all entries if no pattern provided
 * @param {string} [pattern] - Optional pattern to match cache keys
 */
export const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor to add auth token, device headers, and handle caching
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  
  // Add device fingerprint headers for abuse prevention
  const deviceHeaders = getDeviceHeaders();
  config.headers['X-Device-Fingerprint'] = deviceHeaders['X-Device-Fingerprint'];
  config.headers['X-Device-Id'] = deviceHeaders['X-Device-Id'];
  
  // Only cache GET requests
  if (config.method === 'get' || !config.method) {
    const cacheKey = getCacheKey(config);
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      // Return cached response using adapter
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        cached: true
      });
      return config;
    }
    
    // Deduplicate concurrent requests
    if (pendingRequests.has(cacheKey)) {
      config.adapter = () => pendingRequests.get(cacheKey);
      return config;
    }
  }
  
  return config;
});

// Auth error event for global handling (token expiry)
export const AUTH_ERROR_EVENT = 'auth:error';

// CAPTCHA required event for global handling
export const CAPTCHA_REQUIRED_EVENT = 'captcha:required';
export const CAPTCHA_HEADER = 'x-recaptcha-token';
export const CAPTCHA_FALLBACK_TOKEN_HEADER = 'x-captcha-token';
export const CAPTCHA_FALLBACK_ANSWER_HEADER = 'x-captcha-answer';

// Response interceptor to cache successful responses and handle auth errors
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if ((response.config.method === 'get' || !response.config.method) && !response.cached) {
      const cacheKey = getCacheKey(response.config);
      const ttl = getCacheTTL(response.config.url);
      
      cache.set(cacheKey, {
        data: response.data,
        expiry: Date.now() + ttl
      });
      
      pendingRequests.delete(cacheKey);
    }
    
    return response;
  },
  (error) => {
    if (error.config) {
      const cacheKey = getCacheKey(error.config);
      pendingRequests.delete(cacheKey);
    }
    
    // Handle CAPTCHA requirements
    if (error.response?.status === 403 && error.response?.data?.code === 'CAPTCHA_REQUIRED') {
      // Dispatch event for global CAPTCHA handler
      window.dispatchEvent(new CustomEvent(CAPTCHA_REQUIRED_EVENT, {
        detail: {
          ...error.response.data,
          originalConfig: error.config,
          retry: async (captchaHeaders) => {
            const retryConfig = { ...error.config };
            retryConfig.headers = { ...retryConfig.headers, ...captchaHeaders };
            return api.request(retryConfig);
          }
        }
      }));
    }
    
    // Handle auth errors globally (token expired, invalid, etc.)
    // Skip for auth endpoints to avoid redirect loops
    // Skip for policy denials (403 with POLICY_DENIED) - user is authenticated but not authorized
    // Skip for enforcement blocks (403 with ACCOUNT_BANNED, ACCOUNT_TEMP_BANNED)
    if (error.response?.status === 401 || error.response?.status === 403) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const errorCode = error.response?.data?.code;
      
      // These codes indicate the user IS authenticated but blocked for other reasons
      // Do NOT log them out - just show the error message
      const isNonAuthError = [
        'CAPTCHA_REQUIRED',
        'CAPTCHA_FAILED', 
        'POLICY_DENIED',           // Policy check failed (e.g., account too new)
        'POLICY_ERROR',            // Policy check error
        'ACCOUNT_BANNED',          // Permanent ban
        'ACCOUNT_TEMP_BANNED',     // Temporary ban
        'ENFORCEMENT_ERROR',       // Enforcement middleware error
        'ACCOUNT_LOCKED',          // Too many failed attempts
        'DAILY_LIMIT',             // Daily limit reached
        'RATE_LIMITED',            // Rate limited
        'SENSITIVE_RATE_LIMITED'   // Sensitive action rate limited
      ].includes(errorCode);
      
      // Only trigger logout for actual auth failures (401 or 403 without known non-auth codes)
      if (!isAuthEndpoint && !isNonAuthError && error.response?.status === 401) {
        // Dispatch custom event for AuthContext to handle
        window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { 
          detail: { status: error.response.status, url: error.config?.url }
        }));
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Make a request with CAPTCHA token included
 * Use this for sensitive actions that may require CAPTCHA
 * 
 * @param {Object} config - Axios request config
 * @param {string} recaptchaToken - reCAPTCHA token from executeRecaptcha()
 * @returns {Promise} - Axios response promise
 */
export const requestWithCaptcha = async (config, recaptchaToken) => {
  const headers = { ...config.headers };
  
  if (recaptchaToken) {
    headers[CAPTCHA_HEADER] = recaptchaToken;
  }
  
  return api.request({ ...config, headers });
};

/**
 * Make a request with fallback CAPTCHA (math challenge)
 * 
 * @param {Object} config - Axios request config
 * @param {string} token - Challenge token ID
 * @param {string} answer - User's answer to the challenge
 * @returns {Promise} - Axios response promise
 */
export const requestWithFallbackCaptcha = async (config, token, answer) => {
  const headers = { ...config.headers };
  headers[CAPTCHA_FALLBACK_TOKEN_HEADER] = token;
  headers[CAPTCHA_FALLBACK_ANSWER_HEADER] = answer;
  
  return api.request({ ...config, headers });
};

// ===========================================
// CHARACTER API
// ===========================================

/**
 * Roll a character from the standard gacha
 * NOTE: Cache invalidation is handled by caller using invalidateFor('gacha:roll')
 */
export const rollCharacter = async () => {
  const response = await api.post('/characters/roll');
  // Cache invalidation is now caller's responsibility via invalidateFor('gacha:roll')
  return response.data;
};

/**
 * Roll multiple characters from the standard gacha
 * NOTE: Cache invalidation is handled by caller using invalidateFor('gacha:roll')
 */
export const rollMultipleCharacters = async (count) => {
  const response = await api.post('/characters/roll-multi', { count });
  // Cache invalidation is now caller's responsibility via invalidateFor('gacha:roll')
  return response.data;
};

export const getCollection = async () => {
  const response = await api.get('/characters/collection');
  return response.data;
};

export const getCollectionData = async () => {
  const response = await api.get('/characters/collection-data');
  return response.data;
};

/**
 * Level up a character
 * NOTE: Cache invalidation is handled by caller using invalidateFor('gacha:level_up')
 */
export const levelUpCharacter = async (characterId) => {
  const response = await api.post(`/characters/${characterId}/level-up`);
  // Cache invalidation is now caller's responsibility via invalidateFor('gacha:level_up')
  return response.data;
};

/**
 * Batch level up all upgradable characters (one level each)
 * NOTE: Cache invalidation is handled by caller using invalidateFor('gacha:level_up')
 */
export const levelUpAllCharacters = async () => {
  const response = await api.post('/characters/level-up-all');
  // Cache invalidation is now caller's responsibility via invalidateFor('gacha:level_up')
  return response.data;
};

// Re-export getStoredUser as getCurrentUser for backwards compatibility
export const getCurrentUser = getStoredUser;

export const getAllCharacters = async () => {
  const response = await api.get('/characters');
  return response.data;
};

// ===========================================
// BANNER API
// ===========================================

export const getActiveBanners = async () => {
  const response = await api.get('/banners');
  return response.data;
};

export const getBannerById = async (bannerId) => {
  const response = await api.get(`/banners/${bannerId}`);
  return response.data;
};

export const getStandardPricing = async () => {
  const response = await api.get('/characters/pricing');
  return response.data;
};

export const getBannerPricing = async (bannerId) => {
  const response = await api.get(`/banners/${bannerId}/pricing`);
  return response.data;
};

export const getBasePricing = async () => {
  const response = await api.get('/banners/pricing');
  return response.data;
};

/**
 * Roll on a specific banner
 * NOTE: Cache invalidation is handled by caller using invalidateFor('gacha:roll_banner')
 */
export const rollOnBanner = async (bannerId, useTicket = false, ticketType = 'roll') => {
  const payload = useTicket ? { useTicket: true, ticketType } : {};
  const response = await api.post(`/banners/${bannerId}/roll`, payload);
  // Cache invalidation is now caller's responsibility via invalidateFor('gacha:roll_banner')
  return response.data;
};

/**
 * Multi-roll on a specific banner
 * NOTE: Cache invalidation is handled by caller using invalidateFor('gacha:roll_banner')
 */
export const multiRollOnBanner = async (bannerId, count = 10, useTickets = false, ticketType = 'roll') => {
  const payload = useTickets 
    ? { count, useTickets: true, ticketType } 
    : { count };
  const response = await api.post(`/banners/${bannerId}/roll-multi`, payload);
  // Cache invalidation is now caller's responsibility via invalidateFor('gacha:roll_banner')
  return response.data;
};

// ===========================================
// ADMIN BANNER MANAGEMENT
// ===========================================

export const createBanner = async (formData) => {
  const response = await api.post('/banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateBanner = async (bannerId, formData) => {
  const response = await api.put(`/banners/${bannerId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Delete a banner
 * NOTE: Cache invalidation is handled by caller using invalidateAdminAction('banner_delete')
 */
export const deleteBanner = async (bannerId) => {
  const response = await api.delete(`/banners/${bannerId}`);
  // Cache invalidation is now caller's responsibility via invalidateAdminAction('banner_delete')
  return response.data;
};

// ===========================================
// ADMIN DASHBOARD
// ===========================================

export const getAdminDashboard = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

export const getSystemHealth = async () => {
  const response = await api.get('/admin/health');
  return response.data;
};

/**
 * Get paginated characters for admin management
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} params.limit - Items per page (max 100)
 * @param {string} params.search - Search query for name/series
 * @returns {Promise<{characters: Array, pagination: {page, limit, total, totalPages}}>}
 */
export const getAdminCharacters = async ({ page = 1, limit = 20, search = '' } = {}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', limit);
  if (search) {
    params.append('search', search);
  }
  const response = await api.get(`/admin/characters?${params.toString()}`);
  return response.data;
};

/**
 * Get characters for banner selection modal with server-side search/filtering
 * @param {Object} params - Query parameters
 * @param {string} params.search - Search query for name/series
 * @param {string} params.rarity - Rarity filter (or 'all')
 * @param {string} params.series - Series filter (or 'all')
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} params.limit - Items per page (max 200)
 * @returns {Promise<{characters: Array, series: Array, pagination: Object}>}
 */
export const getCharactersForBanner = async ({ search = '', rarity = '', series = '', page = 1, limit = 100 } = {}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', limit);
  if (search) params.append('search', search);
  if (rarity && rarity !== 'all') params.append('rarity', rarity);
  if (series && series !== 'all') params.append('series', series);
  const response = await api.get(`/admin/characters/for-banner?${params.toString()}`);
  return response.data;
};

// ===========================================
// RARITY CONFIGURATION API
// ===========================================

export const getRarities = async () => {
  const response = await api.get('/rarities');
  return response.data;
};

export const getRarityConfig = async () => {
  const response = await api.get('/rarities/config');
  return response.data;
};

export const getRarityById = async (id) => {
  const response = await api.get(`/rarities/${id}`);
  return response.data;
};

/**
 * Create a new rarity
 * NOTE: Cache invalidation is handled by caller using invalidateAdminAction('rarity_add')
 */
export const createRarity = async (rarityData) => {
  const response = await api.post('/rarities', rarityData);
  // Cache invalidation is now caller's responsibility via invalidateAdminAction('rarity_add')
  return response.data;
};

/**
 * Update a rarity
 * NOTE: Cache invalidation is handled by caller using invalidateAdminAction('rarity_edit')
 */
export const updateRarity = async (id, rarityData) => {
  const response = await api.put(`/rarities/${id}`, rarityData);
  // Cache invalidation is now caller's responsibility via invalidateAdminAction('rarity_edit')
  return response.data;
};

/**
 * Delete a rarity
 * NOTE: Cache invalidation is handled by caller using invalidateAdminAction('rarity_delete')
 */
export const deleteRarity = async (id) => {
  const response = await api.delete(`/rarities/${id}`);
  // Cache invalidation is now caller's responsibility via invalidateAdminAction('rarity_delete')
  return response.data;
};

/**
 * Reset rarities to defaults
 * NOTE: Cache invalidation is handled by caller using invalidateAdminAction('rarity_reset')
 */
export const resetDefaultRarities = async () => {
  const response = await api.post('/rarities/reset-defaults');
  // Cache invalidation is now caller's responsibility via invalidateAdminAction('rarity_reset')
  return response.data;
};

// ===========================================
// FISHING API
// ===========================================

export const getFishInventory = async () => {
  const response = await api.get('/fishing/inventory');
  return response.data;
};

export const getTradingPostOptions = async () => {
  const response = await api.get('/fishing/trading-post');
  return response.data;
};

/**
 * Execute a fish trade
 * NOTE: Cache invalidation is handled by caller using invalidateFishingAction('trade')
 * @param {string} tradeId - The trade to execute
 * @param {number} quantity - Quantity to trade
 */
export const executeTrade = async (tradeId, quantity = 1) => {
  const response = await api.post('/fishing/trade', { tradeId, quantity });
  // Cache invalidation is now caller's responsibility via invalidateFishingAction('trade')
  return response.data;
};

// Daily Challenges
export const getFishingChallenges = async () => {
  const response = await api.get('/fishing/challenges');
  return response.data;
};

/**
 * Claim a fishing challenge reward
 * NOTE: Cache invalidation is handled by caller using invalidateFishingAction('claim_challenge')
 */
export const claimFishingChallenge = async (challengeId) => {
  const response = await api.post(`/fishing/challenges/${challengeId}/claim`);
  // Cache invalidation is now caller's responsibility via invalidateFishingAction('claim_challenge')
  return response.data;
};

// Fishing Areas
export const getFishingAreas = async () => {
  const response = await api.get('/fishing/areas');
  return response.data;
};

/**
 * Unlock a fishing area
 * NOTE: Cache invalidation is handled by caller using invalidateFishingAction('unlock_area')
 */
export const unlockFishingArea = async (areaId) => {
  const response = await api.post(`/fishing/areas/${areaId}/unlock`);
  // Cache invalidation is now caller's responsibility via invalidateFishingAction('unlock_area')
  return response.data;
};

/**
 * Select a fishing area
 * NOTE: Cache invalidation is handled by caller using invalidateFishingAction('select_area')
 */
export const selectFishingArea = async (areaId) => {
  const response = await api.post(`/fishing/areas/${areaId}/select`);
  // Cache invalidation is now caller's responsibility via invalidateFishingAction('select_area')
  return response.data;
};

// Fishing Rods
export const getFishingRods = async () => {
  const response = await api.get('/fishing/rods');
  return response.data;
};

/**
 * Buy a fishing rod
 * NOTE: Cache invalidation is handled by caller using invalidateFishingAction('buy_rod')
 */
export const buyFishingRod = async (rodId) => {
  const response = await api.post(`/fishing/rods/${rodId}/buy`);
  // Cache invalidation is now caller's responsibility via invalidateFishingAction('buy_rod')
  return response.data;
};

/**
 * Equip a fishing rod
 * NOTE: Cache invalidation is handled by caller using invalidateFishingAction('equip_rod')
 */
export const equipFishingRod = async (rodId) => {
  const response = await api.post(`/fishing/rods/${rodId}/equip`);
  // Cache invalidation is now caller's responsibility via invalidateFishingAction('equip_rod')
  return response.data;
};

// Daily Stats & Limits
export const getFishingDailyStats = async () => {
  const response = await api.get('/fishing/daily');
  return response.data;
};

// ===========================================
// DOJO (IDLE GAME) API
// ===========================================

export const getDojoStatus = async () => {
  const response = await api.get('/dojo/status');
  return response.data;
};

// ===========================================
// SECURITY ADMIN API
// ===========================================

export const getSecurityOverview = async () => {
  const response = await api.get('/admin/security/overview');
  return response.data;
};

export const getHighRiskUsers = async (threshold = 50, limit = 50) => {
  const response = await api.get('/admin/security/high-risk', { 
    params: { threshold, limit } 
  });
  return response.data;
};

export const getAuditLog = async (options = {}) => {
  const response = await api.get('/admin/security/audit', { params: options });
  return response.data;
};

export const getUserSecurity = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/security`);
  return response.data;
};

export const restrictUser = async (userId, { restrictionType, duration, reason }) => {
  const response = await api.post(`/admin/users/${userId}/restrict`, {
    restrictionType, duration, reason
  });
  return response.data;
};

export const unrestrictUser = async (userId, reason) => {
  const response = await api.post(`/admin/users/${userId}/unrestrict`, { reason });
  return response.data;
};

export const warnUser = async (userId, reason) => {
  const response = await api.post(`/admin/users/${userId}/warn`, { reason });
  return response.data;
};

export const resetUserWarnings = async (userId) => {
  const response = await api.post(`/admin/users/${userId}/reset-warnings`);
  return response.data;
};

// ===========================================
// ENHANCED USER SECURITY ACTIONS
// ===========================================

export const clearUserDevices = async (userId) => {
  const response = await api.post(`/admin/users/${userId}/clear-devices`);
  return response.data;
};

export const recalculateUserRisk = async (userId) => {
  const response = await api.post(`/admin/users/${userId}/recalculate-risk`);
  return response.data;
};

export const resetUserRisk = async (userId, reason) => {
  const response = await api.post(`/admin/users/${userId}/reset-risk`, { reason });
  return response.data;
};

export const resetUserPassword = async (userId) => {
  const response = await api.post(`/admin/users/${userId}/reset-password`);
  return response.data;
};

export const getPasswordResetHistory = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/password-reset-history`);
  return response.data;
};

export const getUserLinkedAccounts = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/linked-accounts`);
  return response.data;
};

// ===========================================
// SECURITY CONFIGURATION API
// ===========================================

export const getSecurityConfig = async () => {
  const response = await api.get('/admin/security/config');
  return response.data;
};

export const updateSecurityConfig = async (updates) => {
  const response = await api.put('/admin/security/config', { updates });
  return response.data;
};

// ===========================================
// BULK USER ACTIONS
// ===========================================

export const bulkRestrictUsers = async (userIds, restrictionType, duration, reason) => {
  const response = await api.post('/admin/users/bulk-restrict', {
    userIds, restrictionType, duration, reason
  });
  return response.data;
};

export const bulkUnrestrictUsers = async (userIds, reason) => {
  const response = await api.post('/admin/users/bulk-unrestrict', { userIds, reason });
  return response.data;
};

export const getRestrictedUsers = async (type) => {
  const params = type ? { type } : {};
  const response = await api.get('/admin/users/restricted', { params });
  return response.data;
};

// ===========================================
// RISK SCORE MANAGEMENT
// ===========================================

export const triggerRiskScoreDecay = async (decayPercentage = 0.1) => {
  const response = await api.post('/admin/security/decay-risk-scores', { decayPercentage });
  return response.data;
};

export const getRiskStats = async () => {
  const response = await api.get('/admin/security/risk-stats');
  return response.data;
};

export const getUserRiskHistory = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/risk-history`);
  return response.data;
};

// ===========================================
// SESSION & DEVICE MANAGEMENT
// ===========================================

export const getUserSessions = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/sessions`);
  return response.data;
};

export const getUserDeviceHistory = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/device-history`);
  return response.data;
};

// ===========================================
// AUTO-ENFORCEMENT EVENTS
// ===========================================

export const getAutoEnforcements = async (options = {}) => {
  const { limit, offset } = options;
  const params = { limit, offset };
  Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
  const response = await api.get('/admin/security/auto-enforcements', { params });
  return response.data;
};

// ===========================================
// SECURITY ALERTS
// ===========================================

export const getSecurityAlerts = async (options = {}) => {
  const { limit, since } = options;
  const params = { limit, since };
  Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
  const response = await api.get('/admin/security/alerts', { params });
  return response.data;
};

// ===========================================
// SESSION MANAGEMENT
// ===========================================

export const forceLogoutUser = async (userId, reason) => {
  const response = await api.post(`/admin/users/${userId}/force-logout`, { reason });
  return response.data;
};

export const bulkForceLogoutUsers = async (userIds, reason) => {
  const response = await api.post('/admin/users/bulk-force-logout', { userIds, reason });
  return response.data;
};

// ===========================================
// AUDIT LOG EXPORT
// ===========================================

export const exportAuditLog = async (options = {}) => {
  const { format = 'json', limit, userId, eventType, severity, startDate, endDate } = options;
  const params = { format, limit, userId, eventType, severity, startDate, endDate };
  
  // Remove undefined params
  Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
  
  const response = await api.get('/admin/security/audit/export', { 
    params,
    responseType: format === 'csv' ? 'blob' : 'json'
  });
  
  return response.data;
};

// ===========================================
// APPEALS ADMIN API
// ===========================================

export const getPendingAppeals = async (options = {}) => {
  const response = await api.get('/appeals/admin/pending', { params: options });
  return response.data;
};

export const getAppealStats = async () => {
  const response = await api.get('/appeals/admin/stats');
  return response.data;
};

export const getAppealDetails = async (appealId) => {
  const response = await api.get(`/appeals/admin/${appealId}`);
  return response.data;
};

export const approveAppeal = async (appealId, notes) => {
  const response = await api.post(`/appeals/admin/${appealId}/approve`, { notes });
  return response.data;
};

export const denyAppeal = async (appealId, notes) => {
  const response = await api.post(`/appeals/admin/${appealId}/deny`, { notes });
  return response.data;
};

export const getDojoAvailableCharacters = async () => {
  const response = await api.get('/dojo/available-characters');
  return response.data;
};

/**
 * Assign a character to a dojo training slot
 * NOTE: Cache invalidation is handled by caller using invalidateDojoAction('assign')
 */
export const assignCharacterToDojo = async (characterId, slotIndex) => {
  const response = await api.post('/dojo/assign', { characterId, slotIndex });
  // Cache invalidation is now caller's responsibility via invalidateDojoAction('assign')
  return response.data;
};

/**
 * Remove a character from a dojo training slot
 * NOTE: Cache invalidation is handled by caller using invalidateDojoAction('unassign')
 */
export const unassignCharacterFromDojo = async (slotIndex) => {
  const response = await api.post('/dojo/unassign', { slotIndex });
  // Cache invalidation is now caller's responsibility via invalidateDojoAction('unassign')
  return response.data;
};

/**
 * Claim accumulated dojo training rewards
 * NOTE: Cache invalidation is handled by caller using invalidateDojoAction('claim')
 */
export const claimDojoRewards = async () => {
  const response = await api.post('/dojo/claim');
  // Cache invalidation is now caller's responsibility via invalidateDojoAction('claim')
  return response.data;
};

/**
 * Purchase a dojo upgrade
 * NOTE: Cache invalidation is handled by caller using invalidateDojoAction('upgrade')
 */
export const purchaseDojoUpgrade = async (upgradeType, rarity = null) => {
  const response = await api.post('/dojo/upgrade', { upgradeType, rarity });
  // Cache invalidation is now caller's responsibility via invalidateDojoAction('upgrade')
  return response.data;
};

export default api;
