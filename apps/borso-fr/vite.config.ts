import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: fromHere('./site'),
  publicDir: fromHere('./site/public'),
  build: {
    outDir: fromHere('./dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fromHere('./site/index.html'),
        mom: fromHere('./site/family/mom.html'),
        lesFilles: fromHere('./site/family/les-filles.html'),
        mondrian: fromHere('./site/art/mondrian/index.html'),
        douzeTravaux: fromHere('./site/12-travaux/index.html'),
      },
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
});
