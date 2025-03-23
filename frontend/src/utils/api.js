import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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

export const claimCharacter = async (charId) => {
  try {
    const response = await api.post('/characters/claim', { charId });
    return response.data;
  } catch (error) {
    console.error('Error claiming character:', error);
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

export default api;