import axios from 'axios';

/**
 * Central Axios instance.
 *
 * BASE_URL resolution (in order):
 *   1. VITE_API_URL from .env (local dev → http://localhost:3000/api)
 *   2. VITE_API_URL from vercel.json build.env (production → https://ot-hub-api.vercel.app/api)
 *
 * Vite bakes import.meta.env.VITE_API_URL into the bundle at build time,
 * so there is no runtime fallback needed — it is always defined.
 */
const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  console.error('[axiosInstance] VITE_API_URL is not set! Check .env or vercel.json build.env');
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ot_hub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ot_hub_token');
      localStorage.removeItem('ot_hub_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
