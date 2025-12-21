import axios from 'axios';

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

// Simple in-memory cache with TTL
const cache = new Map();
const pendingRequests = new Map();

const CACHE_TTL = {
  '/auth/me': 30 * 1000,        // 30 seconds for user data
  '/characters': 60 * 1000,      // 1 minute for characters
  '/banners': 60 * 1000,         // 1 minute for banners
  '/admin/dashboard': 30 * 1000, // 30 seconds for admin dashboard
  '/admin/users': 30 * 1000,     // 30 seconds for users
  '/coupons/admin': 30 * 1000,   // 30 seconds for coupons
  default: 15 * 1000             // 15 seconds default
};

const getCacheTTL = (url) => {
  for (const [key, ttl] of Object.entries(CACHE_TTL)) {
    if (url.includes(key)) return ttl;
  }
  return CACHE_TTL.default;
};

const getCacheKey = (config) => {
  // Include auth token in cache key so different users get different cached responses
  const token = localStorage.getItem('token');
  const tokenHash = token ? token.slice(-8) : 'noauth'; // Use last 8 chars of token as identifier
  return `${config.method || 'get'}:${config.url}:${tokenHash}`;
};

// Clear cache for a specific pattern
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

// Clear all caches (useful after mutations)
export const invalidateCache = () => {
  cache.clear();
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token and handle caching
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  
  // Only cache GET requests
  if (config.method === 'get' || !config.method) {
    const cacheKey = getCacheKey(config);
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      // Return cached response by using adapter
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config,
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

// Response interceptor to cache successful responses
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
      
      // Remove from pending
      pendingRequests.delete(cacheKey);
    }
    
    return response;
  },
  (error) => {
    // Remove from pending on error
    if (error.config) {
      const cacheKey = getCacheKey(error.config);
      pendingRequests.delete(cacheKey);
    }
    return Promise.reject(error);
  }
);

export const rollCharacter = async () => {
  try {
    const response = await api.post('/characters/roll');
    return response.data;
  } catch (error) {
    console.error('Error rolling character:', error);
    throw error;
  }
};

export const getCollection = async () => {
  try {
    const response = await api.get('/characters/collection');
    return response.data;
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
};

// Combined collection data - single request for collection page
export const getCollectionData = async () => {
  try {
    const response = await api.get('/characters/collection-data');
    return response.data;
  } catch (error) {
    console.error('Error fetching collection data:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  const userString = localStorage.getItem('user');
  if (!userString) return null;
  
  try {
    return JSON.parse(userString);
  } catch (err) {
    console.error('Error parsing user from localStorage:', err);
    return null;
  }
};

export const getAllCharacters = async () => {
  const response = await api.get('/characters');
  return response.data;
};

// Get all active banners
export const getActiveBanners = async () => {
  const response = await api.get('/banners');
  return response.data;
};

// Get a single banner by ID
export const getBannerById = async (bannerId) => {
  const response = await api.get(`/banners/${bannerId}`);
  return response.data;
};

// Get pricing configuration for standard pulls
export const getStandardPricing = async () => {
  const response = await api.get('/characters/pricing');
  return response.data;
};

// Get pricing configuration for a specific banner
export const getBannerPricing = async (bannerId) => {
  const response = await api.get(`/banners/${bannerId}/pricing`);
  return response.data;
};

// Get general pricing configuration (base config without banner multiplier)
export const getBasePricing = async () => {
  const response = await api.get('/banners/pricing');
  return response.data;
};

// Roll on a specific banner
export const rollOnBanner = async (bannerId) => {
  const response = await api.post(`/banners/${bannerId}/roll`);
  return response.data;
};

// Multi-roll on a banner
export const multiRollOnBanner = async (bannerId, count = 10) => {
  const response = await api.post(`/banners/${bannerId}/roll-multi`, { count });
  return response.data;
};

// Admin functions
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
  clearCache('/banners');
  const response = await api.delete(`/banners/${bannerId}`);
  return response.data;
};

// Combined admin dashboard - single request instead of 4
export const getAdminDashboard = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

// Get system health status (admin only)
export const getSystemHealth = async () => {
  const response = await api.get('/admin/health');
  return response.data;
};

// Invalidate admin cache after mutations
export const invalidateAdminCache = () => {
  clearCache('/admin');
  clearCache('/characters');
  clearCache('/banners');
  clearCache('/coupons');
};

// =============================================
// FISHING TRADING POST API
// =============================================

// Get user's fish inventory
export const getFishInventory = async () => {
  try {
    const response = await api.get('/fishing/inventory');
    return response.data;
  } catch (error) {
    console.error('Error fetching fish inventory:', error);
    throw error;
  }
};

// Get trading post options
export const getTradingPostOptions = async () => {
  try {
    const response = await api.get('/fishing/trading-post');
    return response.data;
  } catch (error) {
    console.error('Error fetching trading post:', error);
    throw error;
  }
};

// Execute a trade
export const executeTrade = async (tradeId, quantity = 1) => {
  try {
    clearCache('/fishing/inventory');
    clearCache('/fishing/trading-post');
    const response = await api.post('/fishing/trade', { tradeId, quantity });
    return response.data;
  } catch (error) {
    console.error('Error executing trade:', error);
    throw error;
  }
};

export default api;
