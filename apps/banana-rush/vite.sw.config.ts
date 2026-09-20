import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: { alias: { '@site': fromHere('./site/src') } },
  publicDir: false,
  build: {
    outDir: fromHere('./dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: fromHere('./site/src/sw/main.worker.ts'),
      output: { entryFileNames: 'sw.js', format: 'iife', inlineDynamicImports: true },
    },
  },
});
