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

// Track last visibility change for smart cache invalidation
let lastVisibilityChange = Date.now();
const MIN_BACKGROUND_TIME_FOR_CACHE_CLEAR = 30000; // 30 seconds

// Invalidate stale cache when tab becomes visible after being hidden for a while
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const elapsed = Date.now() - lastVisibilityChange;
      // Only invalidate if tab was hidden for > 30 seconds to avoid unnecessary API calls
      if (elapsed > MIN_BACKGROUND_TIME_FOR_CACHE_CLEAR) {
        clearCache('/auth/me');
        clearCache('/banners/user/tickets');
      }
    }
    lastVisibilityChange = Date.now();
  });
}

const getCacheTTL = (url) => {
  for (const [key, ttl] of Object.entries(CACHE_TTL)) {
    if (url.includes(key)) return ttl;
  }
  return CACHE_TTL.default;
};

const getCacheKey = (config) => {
  // Include auth token and query params in cache key so different users/queries get different cached responses
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.method || 'get'}:${config.url}:${params}:${getTokenHash()}`;
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

/**
 * Invalidate all admin-related caches after mutations
 */
export const invalidateAdminCache = () => {
  clearCache('/admin');
  clearCache('/characters');
  clearCache('/banners');
  clearCache('/coupons');
};

/**
 * Invalidate entire cache - call on authentication events (login, logout, registration)
 * This is preferred over clearCache() for auth-related cache clearing.
 */
export const invalidateCache = () => clearCache();

/**
 * Invalidate caches after roll/gacha operations
 * Call this after any roll to ensure consistent state across the app
 */
export const invalidateAfterRoll = () => {
  clearCache('/auth/me');
  clearCache('/characters/collection');
  clearCache('/banners/user/tickets');
};

/**
 * Invalidate caches after dojo operations
 */
export const invalidateAfterDojo = () => {
  clearCache('/dojo');
  clearCache('/auth/me');
};

/**
 * Invalidate caches after fishing operations
 */
export const invalidateAfterFishing = () => {
  clearCache('/fishing');
  clearCache('/auth/me');
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

export const rollCharacter = async () => {
  const response = await api.post('/characters/roll');
  // Invalidate caches - collection (shards/ownership) and user data (points)
  clearCache('/characters/collection');
  clearCache('/auth/me');
  return response.data;
};

export const rollMultipleCharacters = async (count) => {
  const response = await api.post('/characters/roll-multi', { count });
  // Invalidate caches - collection (shards/ownership) and user data (points)
  clearCache('/characters/collection');
  clearCache('/auth/me');
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

export const levelUpCharacter = async (characterId) => {
  const response = await api.post(`/characters/${characterId}/level-up`);
  // Clear cache after successful response
  clearCache('/characters/collection');
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

export const rollOnBanner = async (bannerId, useTicket = false, ticketType = 'roll') => {
  const payload = useTicket ? { useTicket: true, ticketType } : {};
  const response = await api.post(`/banners/${bannerId}/roll`, payload);
  // Invalidate caches - collection (shards/ownership) and user data (points/tickets)
  clearCache('/characters/collection');
  clearCache('/auth/me');
  clearCache('/banners/user/tickets');
  return response.data;
};

export const multiRollOnBanner = async (bannerId, count = 10, useTickets = false, ticketType = 'roll') => {
  const payload = useTickets 
    ? { count, useTickets: true, ticketType } 
    : { count };
  const response = await api.post(`/banners/${bannerId}/roll-multi`, payload);
  // Invalidate caches - collection (shards/ownership) and user data (points/tickets)
  clearCache('/characters/collection');
  clearCache('/auth/me');
  clearCache('/banners/user/tickets');
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

export const deleteBanner = async (bannerId) => {
  const response = await api.delete(`/banners/${bannerId}`);
  // Clear cache after successful response
  clearCache('/banners');
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

export const createRarity = async (rarityData) => {
  const response = await api.post('/rarities', rarityData);
  clearCache('/rarities');
  return response.data;
};

export const updateRarity = async (id, rarityData) => {
  const response = await api.put(`/rarities/${id}`, rarityData);
  clearCache('/rarities');
  return response.data;
};

export const deleteRarity = async (id) => {
  const response = await api.delete(`/rarities/${id}`);
  clearCache('/rarities');
  return response.data;
};

export const resetDefaultRarities = async () => {
  const response = await api.post('/rarities/reset-defaults');
  clearCache('/rarities');
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

export const executeTrade = async (tradeId, quantity = 1) => {
  const response = await api.post('/fishing/trade', { tradeId, quantity });
  // Clear cache after successful response
  clearCache('/fishing/inventory');
  clearCache('/fishing/trading-post');
  return response.data;
};

// Daily Challenges
export const getFishingChallenges = async () => {
  const response = await api.get('/fishing/challenges');
  return response.data;
};

export const claimFishingChallenge = async (challengeId) => {
  const response = await api.post(`/fishing/challenges/${challengeId}/claim`);
  // Clear cache after successful response
  clearCache('/fishing/challenges');
  clearCache('/auth/me');
  return response.data;
};

// Fishing Areas
export const getFishingAreas = async () => {
  const response = await api.get('/fishing/areas');
  return response.data;
};

export const unlockFishingArea = async (areaId) => {
  const response = await api.post(`/fishing/areas/${areaId}/unlock`);
  // Clear cache after successful response to avoid stale data on failure
  clearCache('/fishing/areas');
  clearCache('/auth/me');
  return response.data;
};

export const selectFishingArea = async (areaId) => {
  const response = await api.post(`/fishing/areas/${areaId}/select`);
  // Clear cache after successful response
  clearCache('/fishing/areas');
  clearCache('/fishing/info');
  return response.data;
};

// Fishing Rods
export const getFishingRods = async () => {
  const response = await api.get('/fishing/rods');
  return response.data;
};

export const buyFishingRod = async (rodId) => {
  const response = await api.post(`/fishing/rods/${rodId}/buy`);
  // Clear cache after successful response
  clearCache('/fishing/rods');
  clearCache('/auth/me');
  return response.data;
};

export const equipFishingRod = async (rodId) => {
  const response = await api.post(`/fishing/rods/${rodId}/equip`);
  // Clear cache after successful response
  clearCache('/fishing/rods');
  clearCache('/fishing/info');
  clearCache('/auth/me'); // User stats may be affected
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

export const assignCharacterToDojo = async (characterId, slotIndex) => {
  const response = await api.post('/dojo/assign', { characterId, slotIndex });
  clearCache('/dojo');
  return response.data;
};

export const unassignCharacterFromDojo = async (slotIndex) => {
  const response = await api.post('/dojo/unassign', { slotIndex });
  clearCache('/dojo');
  return response.data;
};

export const claimDojoRewards = async () => {
  const response = await api.post('/dojo/claim');
  clearCache('/dojo');
  clearCache('/auth/me');
  return response.data;
};

export const purchaseDojoUpgrade = async (upgradeType, rarity = null) => {
  const response = await api.post('/dojo/upgrade', { upgradeType, rarity });
  clearCache('/dojo');
  clearCache('/auth/me');
  return response.data;
};

export default api;
