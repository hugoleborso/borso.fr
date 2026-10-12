import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const LOCAL_API_PORT = 3001;
const REACT_RUNTIME_PACKAGES =
  /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(?:react|react-dom|scheduler)\//;

function selectVendorChunk(moduleId: string): string | undefined {
  return REACT_RUNTIME_PACKAGES.test(moduleId) ? 'react-runtime' : undefined;
}

export default defineConfig({
  root: fromHere('./site'),
  publicDir: fromHere('./site/public'),
  resolve: {
    alias: {
      '@site': fromHere('./site/src'),
      '@api': fromHere('./api/src'),
      '@domain': fromHere('./domain'),
    },
  },
  build: {
    outDir: fromHere('./dist'),
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: selectVendorChunk } },
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      '/api': `http://localhost:${LOCAL_API_PORT}`,
    },
  },
});
