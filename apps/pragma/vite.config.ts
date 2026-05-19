import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const LOCAL_API_PORT = 3001;

export default defineConfig({
  root: fromHere('./site'),
  publicDir: fromHere('./site/public'),
  resolve: {
    alias: {
      '@site': fromHere('./site/src'),
    },
  },
  build: {
    outDir: fromHere('./dist'),
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': `http://localhost:${LOCAL_API_PORT}`,
    },
  },
});
