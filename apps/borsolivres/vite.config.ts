import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const LOCAL_API_PORT = 3002;
const LOCAL_SITE_PORT = 5175;

export default defineConfig({
  root: fromHere('./site'),
  publicDir: fromHere('./site/public'),
  resolve: {
    alias: {
      '@site': fromHere('./site/src'),
      '@api': fromHere('./api/src'),
    },
  },
  build: {
    outDir: fromHere('./dist'),
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: LOCAL_SITE_PORT,
    proxy: {
      '/api': `http://localhost:${LOCAL_API_PORT}`,
    },
  },
});
