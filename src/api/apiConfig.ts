
import axios from 'axios';

// Determine the API base URL based on environment
const getBaseUrl = () => {
  // If in production, use the production URL
  if (import.meta.env.PROD) {
    return 'https://your-production-api-url.com/api';
  }
  // For local development
  return 'http://localhost:4000/api';
};

// Create an axios instance with the API base URL
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('finpal_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
