
import axios from 'axios';

// Create an axios instance with the API base URL
// This should be updated to your actual backend URL when deployed
const api = axios.create({
  baseURL: 'http://localhost:4000/api', // Default development server URL
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
