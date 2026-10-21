import axios from 'axios';

/**
 * Central Axios instance.
 *
 * Priority order for the base URL:
 *   1. VITE_API_URL env var (set in .env locally or in Vercel project settings)
 *   2. Hardcoded production fallback — guarantees the deployed frontend always
 *      points to the correct API even if the env var is missing at build time.
 *
 * Local dev: set VITE_API_URL= (empty) in client/.env and use the Vite proxy,
 * OR set VITE_API_URL=http://localhost:3000/api to bypass the proxy entirely.
 */
const PROD_API = 'https://ot-hub-api.vercel.app/api';

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? PROD_API        // deployed but env var missing → use hardcoded URL
    : '/api';         // local dev → use Vite proxy

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ot_hub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — redirect to login on 401 ──────────────────────────
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
