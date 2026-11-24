import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: {
    port: 5550,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5551',
      '/webhooks': 'http://127.0.0.1:5551',
    },
  },
  // three.js lives in its own lazily-loaded chunk (Bottle3D), so its size never blocks first paint.
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 1000 },
});
