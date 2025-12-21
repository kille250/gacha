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
  const tokenHash = token ? token.slice(-8) : 'noauth';
  return `${config.method || 'get'}:${config.url}:${tokenHash}`;
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

// Legacy alias for clearCache() - kept for backwards compatibility
export const invalidateCache = () => clearCache();

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
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
      
      pendingRequests.delete(cacheKey);
    }
    
    return response;
  },
  (error) => {
    if (error.config) {
      const cacheKey = getCacheKey(error.config);
      pendingRequests.delete(cacheKey);
    }
    return Promise.reject(error);
  }
);

// ===========================================
// CHARACTER API
// ===========================================

export const rollCharacter = async () => {
  const response = await api.post('/characters/roll');
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

export const getCurrentUser = () => {
  const userString = localStorage.getItem('user');
  if (!userString) return null;
  
  try {
    return JSON.parse(userString);
  } catch {
    return null;
  }
};

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

export const rollOnBanner = async (bannerId) => {
  const response = await api.post(`/banners/${bannerId}/roll`);
  return response.data;
};

export const multiRollOnBanner = async (bannerId, count = 10) => {
  const response = await api.post(`/banners/${bannerId}/roll-multi`, { count });
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
  clearCache('/banners');
  const response = await api.delete(`/banners/${bannerId}`);
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
// FISHING TRADING POST API
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
  clearCache('/fishing/inventory');
  clearCache('/fishing/trading-post');
  const response = await api.post('/fishing/trade', { tradeId, quantity });
  return response.data;
};

export default api;
