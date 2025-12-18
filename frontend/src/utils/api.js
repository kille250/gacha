import axios from 'axios';

// Use environment variable for API URL, with fallback for local development
const API_URL = process.env.REACT_APP_API_URL 
  ? `https://${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

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
  try {
    const response = await api.get('/banners');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get a single banner by ID
export const getBannerById = async (bannerId) => {
  try {
    const response = await api.get(`/banners/${bannerId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Roll on a specific banner
export const rollOnBanner = async (bannerId) => {
  try {
    const response = await api.post(`/banners/${bannerId}/roll`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Multi-roll on a banner
export const multiRollOnBanner = async (bannerId, count = 10) => {
  try {
    const response = await api.post(`/banners/${bannerId}/roll-multi`, { count });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Admin functions
export const createBanner = async (formData) => {
  try {
    const response = await api.post('/banners', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateBanner = async (bannerId, formData) => {
  try {
    const response = await api.put(`/banners/${bannerId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteBanner = async (bannerId) => {
  try {
    const response = await api.delete(`/banners/${bannerId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
