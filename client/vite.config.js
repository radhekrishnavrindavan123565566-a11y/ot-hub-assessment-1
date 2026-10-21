import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Only proxy /api to localhost:3000 when VITE_API_URL is NOT set
  // (i.e. pure local development without a deployed backend).
  // When VITE_API_URL is set, axiosInstance calls the full URL directly —
  // no proxy needed.
  const useProxy = !env.VITE_API_URL;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      ...(useProxy && {
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          },
        },
      }),
    },
  };
});
