import axios from 'axios';
import { getToken, getTokenHash, getStoredUser } from './authStorage';

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

// Request interceptor to add auth token and handle caching
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  
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
    
    // Handle auth errors globally (token expired, invalid, etc.)
    // Skip for auth endpoints to avoid redirect loops
    if (error.response?.status === 401 || error.response?.status === 403) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isAuthEndpoint) {
        // Dispatch custom event for AuthContext to handle
        window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { 
          detail: { status: error.response.status, url: error.config?.url }
        }));
      }
    }
    
    return Promise.reject(error);
  }
);

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
