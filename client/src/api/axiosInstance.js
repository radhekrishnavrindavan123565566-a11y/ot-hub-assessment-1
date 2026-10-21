import axios from 'axios';

/**
 * Central Axios instance. All API calls go through here.
 * - Attaches JWT from localStorage automatically
 * - Redirects to /login on 401 responses
 */
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ot_hub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ot_hub_token');
      localStorage.removeItem('ot_hub_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
