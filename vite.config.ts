import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// SpacetimeDB is proxied through the dev server so phones on the same Wi-Fi
// (including the Expo app) only need to reach port 5173.
const spacetime = { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: true };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { host: true, proxy: { '/v1': spacetime } },
  preview: { host: true, proxy: { '/v1': spacetime } },
});
