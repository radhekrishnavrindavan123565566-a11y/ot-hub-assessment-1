import axios from 'axios';

/**
 * Central Axios instance.
 *
 * - In production / when VITE_API_URL is set, calls go directly to the
 *   deployed backend (e.g. https://ot-hub-api.vercel.app/api).
 * - In local dev without VITE_API_URL, falls back to '/api' so the
 *   Vite dev-server proxy to localhost:3000 still works.
 *
 * All calls automatically attach the JWT and redirect to /login on 401.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
      // Only redirect if not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
